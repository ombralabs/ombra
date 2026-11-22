#!/usr/bin/env python3
"""Download a YouTube video using pure Ombra (`ombrabrowser`) — no `yt-dlp` required.

How it works:
1. Launches Ombra stealth Chromium (`launch_context` or `launch_persistent_context`),
   which natively passes YouTube's TLS, fingerprint, V8, and BotGuard/PO-token checks.
2. Opens the watch page and passively observes CDP Network responses (`page.on("response")`)
   without injecting scripts or mutating page prototypes.
3. Decodes YouTube's SABR/UMP media stream (`Content-Type: application/vnd.yt-ump`,
   part 20 `MediaHeader` protobuf + part 21 raw fMP4/WebM `MEDIA` segments) as the
   player buffers through the timeline — with automatic fallback to direct HTTP stream
   downloads (`httpx`) if YouTube serves non-UMP `video/*` / `audio/*` responses.
4. Assembles the captured video and audio tracks and muxes them into `.mp4` via `ffmpeg`
   (or saves the separate tracks if `ffmpeg` is not on `PATH`).

Requirements:
    pip install ombrabrowser
    # Recommended for muxing separate adaptive video + audio into a single .mp4:
    # install ffmpeg on PATH

Examples:
    # Inspect available formats & playability via Ombra without downloading
    python examples/01-youtube-download/youtube_download.py \\
        "https://www.youtube.com/watch?v=jNQXAC9IVRw" --list-formats

    # Download with pure Ombra (headless, ephemeral profile)
    python examples/01-youtube-download/youtube_download.py \\
        "https://www.youtube.com/watch?v=jNQXAC9IVRw" -o ./downloads

    # First-time sign-in with a persistent Ombra profile (for LOGIN_REQUIRED / bot-check IPs)
    python examples/01-youtube-download/youtube_download.py \\
        "https://www.youtube.com/watch?v=jNQXAC9IVRw" \\
        --profile youtube --headed --wait-for-login --humanize -o ./downloads
"""

from __future__ import annotations

import argparse
import contextlib
import gzip
import json
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.parse
from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import httpx
from ombrabrowser import OmbraError, launch_context, launch_persistent_context
from playwright.sync_api import Error as PlaywrightError

VIDEO_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")
INVALID_FILENAME_CHARS_RE = re.compile(r'[<>:"/\\|?*\x00-\x1f]+')

# UMP part types (YouTube SABR / Universal Media Protocol)
UMP_PART_MEDIA_HEADER = 20
UMP_PART_MEDIA = 21
UMP_PART_MEDIA_END = 22
UMP_COMPRESSION_GZIP = 2

DIRECT_DROP_QUERY_KEYS = frozenset({"range", "rn", "rbuf", "ump", "srfvp", "alr"})

QUALITY_TO_YT_LEVEL: dict[str, str] = {
    "2160p": "hd2160",
    "1440p": "hd1440",
    "1080p": "hd1080",
    "720p": "hd720",
    "480p": "large",
    "360p": "medium",
    "240p": "small",
    "144p": "tiny",
}

CONSENT_BUTTON_SELECTORS = (
    'button[aria-label*="Reject all"]',
    'button[aria-label*="Accept all"]',
    'button:has-text("Reject all")',
    'button:has-text("Accept all")',
)


@dataclass(frozen=True)
class FormatInfo:
    """Format metadata extracted from ``ytInitialPlayerResponse.streamingData``."""

    itag: int
    mime_type: str
    quality_label: str | None = None
    width: int | None = None
    height: int | None = None
    bitrate: int | None = None
    content_length: int | None = None

    @property
    def kind(self) -> str:
        if self.mime_type.startswith("video/"):
            return "video"
        if self.mime_type.startswith("audio/"):
            return "audio"
        return "unknown"

    @property
    def container(self) -> str:
        if "webm" in self.mime_type:
            return "webm"
        return "mp4"


@dataclass(frozen=True)
class MediaHeader:
    """Decoded top-level fields of YouTube's UMP ``MediaHeader`` protobuf (part type 20)."""

    header_id: int
    itag: int
    byte_range_start: int = 0
    compression_type: int = 0
    is_init_seg: bool = False
    segment_num: int = 0
    start_ms: int = 0
    segment_length_bytes: int = 0


@dataclass
class AssembledTrack:
    """Reconstructed raw media stream (init segment + ordered media segments) for one ``itag``."""

    itag: int
    init: bytes = b""
    segments: dict[tuple[int, int], bytes] = field(default_factory=dict)

    @property
    def total_bytes(self) -> int:
        return len(self.init) + sum(len(chunk) for chunk in self.segments.values())

    def iter_chunks(self) -> list[bytes]:
        chunks: list[bytes] = []
        if self.init:
            chunks.append(self.init)
        for key in sorted(self.segments):
            chunks.append(self.segments[key])
        return chunks

    def write_to(self, path: Path) -> Path:
        with path.open("wb") as fh:
            for chunk in self.iter_chunks():
                fh.write(chunk)
        return path


@dataclass(frozen=True)
class VideoMetadata:
    """YouTube video metadata observed inside Ombra Chromium."""

    url: str
    video_id: str
    title: str
    channel: str | None
    duration_seconds: float | None
    playability_status: str | None
    playability_reason: str | None
    user_agent: str
    formats: dict[int, FormatInfo]


def normalize_youtube_url(url_or_id: str) -> tuple[str, str]:
    """Normalize a YouTube watch/shorts/youtu.be URL or 11-char video ID."""
    raw = url_or_id.strip()
    if not raw:
        raise ValueError("YouTube URL or video ID must not be empty.")

    if VIDEO_ID_RE.match(raw):
        return f"https://www.youtube.com/watch?v={raw}", raw

    parsed = urllib.parse.urlparse(raw)
    if parsed.scheme not in {"http", "https"}:
        raise ValueError(f"Unsupported URL scheme {parsed.scheme!r}; expected http(s) or video ID.")

    host = (parsed.hostname or "").lower()
    video_id: str | None = None
    if host in {"youtu.be", "www.youtu.be"}:
        segment = parsed.path.strip("/").split("/")[0]
        if segment:
            video_id = segment
    elif host == "youtube.com" or host.endswith(".youtube.com"):
        qs = urllib.parse.parse_qs(parsed.query)
        if qs.get("v"):
            video_id = qs["v"][0]
        else:
            parts = [p for p in parsed.path.split("/") if p]
            if len(parts) >= 2 and parts[0] in {"shorts", "embed", "live", "v"}:
                video_id = parts[1]
    else:
        raise ValueError(f"URL host {host!r} is not a YouTube domain.")

    if not video_id or not VIDEO_ID_RE.match(video_id):
        raise ValueError(f"Could not extract a valid 11-character YouTube video ID from {raw!r}.")

    return f"https://www.youtube.com/watch?v={video_id}", video_id


def sanitize_filename(name: str, *, max_len: int = 120) -> str:
    """Convert an arbitrary video title into a safe cross-platform filename stem."""
    cleaned = INVALID_FILENAME_CHARS_RE.sub(" ", name).strip().strip(".")
    cleaned = re.sub(r"\s+", " ", cleaned)
    if not cleaned:
        return "video"
    return cleaned[:max_len].rstrip(" .")


def read_ump_varint(buf: bytes, pos: int) -> tuple[int, int] | None:
    """Decode one prefix-length UMP varint (1 to 5 bytes) starting at ``pos``.

    Returns ``(value, next_pos)`` or ``None`` if ``buf`` ends mid-varint.
    """
    n = len(buf)
    if pos >= n:
        return None
    first = buf[pos]
    if first < 128:
        return first, pos + 1
    if first < 192:
        if pos + 2 > n:
            return None
        return (first & 0x3F) | (buf[pos + 1] << 6), pos + 2
    if first < 224:
        if pos + 3 > n:
            return None
        return (first & 0x1F) | (buf[pos + 1] << 5) | (buf[pos + 2] << 13), pos + 3
    if first < 240:
        if pos + 4 > n:
            return None
        val = (
            (first & 0x0F)
            | (buf[pos + 1] << 4)
            | (buf[pos + 2] << 12)
            | (buf[pos + 3] << 20)
        )
        return val, pos + 4
    if pos + 5 > n:
        return None
    return int.from_bytes(buf[pos + 1 : pos + 5], "little"), pos + 5


def parse_proto_varints(buf: bytes) -> dict[int, int]:
    """Read top-level varint fields from a protobuf message, skipping other wire types."""
    out: dict[int, int] = {}
    i = 0
    n = len(buf)
    while i < n:
        tag = 0
        shift = 0
        while i < n:
            byte = buf[i]
            i += 1
            tag |= (byte & 0x7F) << shift
            if not (byte & 0x80):
                break
            shift += 7
        field_num = tag >> 3
        wire_type = tag & 7
        if wire_type == 0:  # varint
            val = 0
            shift = 0
            while i < n:
                byte = buf[i]
                i += 1
                val |= (byte & 0x7F) << shift
                if not (byte & 0x80):
                    break
                shift += 7
            out[field_num] = val
        elif wire_type == 2:  # length-delimited
            length = 0
            shift = 0
            while i < n:
                byte = buf[i]
                i += 1
                length |= (byte & 0x7F) << shift
                if not (byte & 0x80):
                    break
                shift += 7
            i += length
        elif wire_type == 1:  # 64-bit fixed
            i += 8
        elif wire_type == 5:  # 32-bit fixed
            i += 4
        else:
            break
    return out


def parse_media_header(payload: bytes) -> MediaHeader | None:
    """Parse a UMP ``MediaHeader`` protobuf payload (part type 20)."""
    fields = parse_proto_varints(payload)
    header_id = fields.get(1)
    itag = fields.get(3)
    if header_id is None or itag is None:
        return None
    return MediaHeader(
        header_id=header_id,
        itag=itag,
        byte_range_start=fields.get(6, 0),
        compression_type=fields.get(7, 0),
        is_init_seg=bool(fields.get(8, 0)),
        segment_num=fields.get(9, 0),
        start_ms=fields.get(11, 0),
        segment_length_bytes=fields.get(14, 0),
    )


class UmpTrackCollector:
    """Reassemble video and audio tracks from one or more ``application/vnd.yt-ump`` bodies.

    Chunks are buffered per ``header_id`` first so a segment split across multiple
    ``MEDIA`` parts is joined accurately, while re-transmitted init or media segments
    under a new ``header_id`` are deduplicated cleanly.
    """

    def __init__(self) -> None:
        self._headers: dict[int, MediaHeader] = {}
        self._pending: dict[int, bytearray] = {}
        self._tracks: dict[int, AssembledTrack] = {}

    def feed(self, data: bytes) -> None:
        """Parse all complete UMP parts from ``data``."""
        pos = 0
        n = len(data)
        while pos < n:
            type_dec = read_ump_varint(data, pos)
            if type_dec is None:
                break
            part_type, pos = type_dec
            size_dec = read_ump_varint(data, pos)
            if size_dec is None:
                break
            part_size, pos = size_dec
            if pos + part_size > n:
                break
            part = data[pos : pos + part_size]
            pos += part_size

            if part_type == UMP_PART_MEDIA_HEADER:
                header = parse_media_header(part)
                if header is not None:
                    self._flush_header(header.header_id)
                    self._headers[header.header_id] = header
                    self._pending[header.header_id] = bytearray()
                    self._tracks.setdefault(header.itag, AssembledTrack(itag=header.itag))
            elif part_type == UMP_PART_MEDIA and part:
                hid_dec = read_ump_varint(part, 0)
                if hid_dec is None:
                    continue
                hid, data_offset = hid_dec
                if hid in self._pending and data_offset < len(part):
                    self._pending[hid].extend(part[data_offset:])
            elif part_type == UMP_PART_MEDIA_END and part:
                hid_dec = read_ump_varint(part, 0)
                if hid_dec is not None:
                    self._flush_header(hid_dec[0])

        self.flush()

    def _flush_header(self, header_id: int) -> None:
        header = self._headers.pop(header_id, None)
        buf = self._pending.pop(header_id, None)
        if header is None or not buf:
            return
        payload = bytes(buf)
        if header.compression_type == UMP_COMPRESSION_GZIP:
            payload = gzip.decompress(payload)
        track = self._tracks.setdefault(header.itag, AssembledTrack(itag=header.itag))
        if header.is_init_seg:
            track.init = payload
        else:
            key = (header.segment_num, header.byte_range_start)
            track.segments[key] = payload

    def flush(self) -> None:
        for hid in list(self._pending):
            self._flush_header(hid)

    @property
    def tracks(self) -> dict[int, AssembledTrack]:
        self.flush()
        return self._tracks


def normalize_direct_stream_url(url: str) -> str:
    """Strip ephemeral playback range/UMP parameters from a direct ``videoplayback`` URL."""
    parsed = urllib.parse.urlparse(url)
    params = urllib.parse.parse_qsl(parsed.query, keep_blank_values=True)
    kept = [(k, v) for k, v in params if k not in DIRECT_DROP_QUERY_KEYS]
    return urllib.parse.urlunparse(parsed._replace(query=urllib.parse.urlencode(kept)))


def select_best_tracks(
    tracks: Mapping[int, AssembledTrack],
    formats: Mapping[int, FormatInfo],
    *,
    max_height: int | None = None,
) -> tuple[AssembledTrack | None, AssembledTrack | None]:
    """Pick the best captured video and audio tracks."""
    video_candidates: list[tuple[tuple[int, int, int], AssembledTrack]] = []
    audio_candidates: list[tuple[tuple[int, int, int], AssembledTrack]] = []

    for itag, track in tracks.items():
        if track.total_bytes == 0:
            continue
        fmt = formats.get(itag)
        kind = fmt.kind if fmt else "unknown"
        if kind == "video":
            height = fmt.height or 0 if fmt else 0
            if max_height is not None and height > max_height:
                continue
            has_init = 1 if track.init else 0
            # Prefer tracks that have an init segment, higher resolution, and more captured data.
            video_candidates.append(((has_init, height, track.total_bytes), track))
        elif kind == "audio":
            has_init = 1 if track.init else 0
            prefer_mp4 = 1 if (fmt and fmt.container == "mp4") else 0
            audio_candidates.append(((has_init, prefer_mp4, track.total_bytes), track))

    # If max_height filtered out every captured video track, fall back to all captured video tracks.
    if not video_candidates and max_height is not None:
        return select_best_tracks(tracks, formats, max_height=None)

    best_video = max(video_candidates, key=lambda item: item[0])[1] if video_candidates else None
    best_audio = max(audio_candidates, key=lambda item: item[0])[1] if audio_candidates else None
    return best_video, best_audio


def mux_or_save_tracks(
    *,
    video_path: Path | None,
    audio_path: Path | None,
    video_container: str,
    audio_container: str,
    output_dir: Path,
    file_stem: str,
    ffmpeg_bin: str | None = None,
) -> list[Path]:
    """Mux captured video and audio with ``ffmpeg`` into ``.mp4``, or save tracks separately."""
    output_dir.mkdir(parents=True, exist_ok=True)
    ffmpeg = ffmpeg_bin if ffmpeg_bin is not None else shutil.which("ffmpeg")

    if video_path and audio_path and ffmpeg:
        output_mp4 = output_dir / f"{file_stem}.mp4"
        audio_codec = "copy" if audio_container == "mp4" else "aac"
        cmd = [
            ffmpeg,
            "-y",
            "-loglevel",
            "error",
            "-i",
            str(video_path),
            "-i",
            str(audio_path),
            "-c:v",
            "copy",
            "-c:a",
            audio_codec,
            "-movflags",
            "+faststart",
            str(output_mp4),
        ]
        proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
        if proc.returncode == 0 and output_mp4.is_file():
            return [output_mp4]
        # Fallback to Matroska (.mkv) lossless copy if MP4 does not accept the captured video codec.
        output_mkv = output_dir / f"{file_stem}.mkv"
        mkv_cmd = [
            ffmpeg,
            "-y",
            "-loglevel",
            "error",
            "-i",
            str(video_path),
            "-i",
            str(audio_path),
            "-c",
            "copy",
            str(output_mkv),
        ]
        mkv_proc = subprocess.run(mkv_cmd, capture_output=True, text=True, check=False)
        if mkv_proc.returncode == 0 and output_mkv.is_file():
            return [output_mkv]
        raise RuntimeError(f"ffmpeg mux failed: {proc.stderr.strip() or mkv_proc.stderr.strip()}")

    saved: list[Path] = []
    if video_path:
        dest = output_dir / f"{file_stem}.video.{video_container}"
        shutil.copy2(video_path, dest)
        saved.append(dest)
    if audio_path:
        dest = output_dir / f"{file_stem}.audio.{audio_container}"
        shutil.copy2(audio_path, dest)
        saved.append(dest)
    return saved


def _log(message: str) -> None:
    print(message, file=sys.stderr, flush=True)


def _download_direct_stream(
    url: str,
    dest: Path,
    *,
    user_agent: str,
    proxy: str | None = None,
    chunk_bytes: int = 2 * 1024 * 1024,
) -> Path:
    """Download a direct non-UMP googlevideo URL in chunks via ``httpx``."""
    clean_url = normalize_direct_stream_url(url)
    _log(f"[fragment:direct-download] GET {clean_url}")
    headers = {"User-Agent": user_agent} if user_agent else {}
    with (
        httpx.Client(
            follow_redirects=True,
            timeout=30.0,
            headers=headers,
            proxy=proxy,
        ) as client,
        client.stream("GET", clean_url) as resp,
    ):
        resp.raise_for_status()
        with dest.open("wb") as fh:
            for chunk in resp.iter_bytes(chunk_size=chunk_bytes):
                fh.write(chunk)
    _log(f"[fragment:direct-saved] bytes={dest.stat().st_size} url={clean_url}")
    return dest


def _dismiss_consent_dialog(page: Any) -> None:
    for selector in CONSENT_BUTTON_SELECTORS:
        locator = page.locator(selector)
        if locator.count() > 0:
            with contextlib.suppress(PlaywrightError):
                locator.first.click(timeout=3_000)
                page.wait_for_timeout(1_000)
                return


def _read_video_metadata(page: Any, watch_url: str, video_id: str) -> VideoMetadata:
    raw = page.evaluate(
        """() => {
            const pr = window.ytInitialPlayerResponse || {};
            const vd = pr.videoDetails || {};
            const ps = pr.playabilityStatus || {};
            const sd = pr.streamingData || {};
            const all = [...(sd.formats || []), ...(sd.adaptiveFormats || [])];
            const rawLen = vd.lengthSeconds ? Number(vd.lengthSeconds) : null;
            return {
                title: vd.title || document.title.replace(/\\s*-\\s*YouTube$/, "") || null,
                channel: vd.author || null,
                durationSeconds: Number.isFinite(rawLen) ? rawLen : null,
                playabilityStatus: ps.status || null,
                playabilityReason: ps.reason || null,
                userAgent: navigator.userAgent,
                formats: all.map(f => ({
                    itag: f.itag,
                    mimeType: f.mimeType || "",
                    qualityLabel: f.qualityLabel || null,
                    width: f.width || null,
                    height: f.height || null,
                    bitrate: f.bitrate || null,
                    contentLength: f.contentLength ? Number(f.contentLength) : null,
                })),
            };
        }"""
    )
    formats: dict[int, FormatInfo] = {}
    for item in raw.get("formats") or []:
        itag = item.get("itag")
        if isinstance(itag, int) and itag not in formats:
            formats[itag] = FormatInfo(
                itag=itag,
                mime_type=str(item.get("mimeType") or ""),
                quality_label=item.get("qualityLabel"),
                width=item.get("width"),
                height=item.get("height"),
                bitrate=item.get("bitrate"),
                content_length=item.get("contentLength"),
            )
    return VideoMetadata(
        url=watch_url,
        video_id=video_id,
        title=raw.get("title") or video_id,
        channel=raw.get("channel"),
        duration_seconds=raw.get("durationSeconds"),
        playability_status=raw.get("playabilityStatus"),
        playability_reason=raw.get("playabilityReason"),
        user_agent=raw.get("userAgent") or "",
        formats=formats,
    )


def _buffer_entire_video(
    page: Any,
    *,
    quality: str | None,
    max_wait_s: float,
) -> dict[str, Any]:
    """Start muted playback and step ``currentTime`` along the buffer until duration is covered."""
    yt_quality = QUALITY_TO_YT_LEVEL.get(quality.lower()) if quality else None
    page.evaluate(
        """(ytQuality) => {
            const player = document.querySelector('#movie_player');
            if (ytQuality && player && typeof player.setPlaybackQualityRange === 'function') {
                player.setPlaybackQualityRange(ytQuality, ytQuality);
            }
            const video = document.querySelector('video');
            if (video) {
                video.muted = true;
                video.playbackRate = 2.0;
                video.play().catch(() => {});
            }
        }""",
        yt_quality,
    )

    last_buffered_end = 0.0
    stalled_ticks = 0
    max_ticks = max(5, int(max_wait_s))
    last_state: dict[str, Any] = {}

    for _ in range(max_ticks):
        state = page.evaluate(
            """() => {
                const video = document.querySelector('video');
                if (!video) return {ready: false};
                const ranges = [];
                for (let i = 0; i < video.buffered.length; i++) {
                    ranges.push([video.buffered.start(i), video.buffered.end(i)]);
                }
                const dur = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : null;
                return {
                    ready: dur !== null,
                    duration: dur,
                    currentTime: video.currentTime,
                    paused: video.paused,
                    buffered: ranges,
                };
            }"""
        )
        last_state = state
        duration = state.get("duration")
        ranges = state.get("buffered") or []
        buffered_end = max((end for _, end in ranges), default=0.0)

        if duration and buffered_end >= duration - 0.5:
            # Give in-flight final UMP responses a moment to finish writing.
            page.wait_for_timeout(1_500)
            return state

        if buffered_end > last_buffered_end + 0.5:
            last_buffered_end = buffered_end
            stalled_ticks = 0
            # Advance playhead near the buffered frontier so YouTube fetches the next SABR window.
            if duration and buffered_end > state.get("currentTime", 0.0) + 2.0:
                seek_target = min(max(0.0, buffered_end - 1.0), max(0.0, duration - 0.25))
                page.evaluate(
                    "(t) => { const v = document.querySelector('video'); if (v) v.currentTime = t; }",
                    seek_target,
                )
        else:
            stalled_ticks += 1
            if state.get("paused"):
                page.evaluate("() => { const v = document.querySelector('video'); if (v) v.play().catch(() => {}); }")
            if stalled_ticks >= 20 and buffered_end > 0:
                break

        page.wait_for_timeout(1_000)

    return last_state


def download_youtube_video(
    url_or_id: str,
    *,
    output_dir: str | Path = ".",
    quality: str | None = None,
    max_height: int | None = None,
    profile: str | None = None,
    proxy: str | None = None,
    headless: bool = True,
    humanize: bool = False,
    wait_for_login: bool = False,
    binary_path: str | None = None,
    timeout_ms: int = 45_000,
    max_wait_s: float = 120.0,
    list_formats: bool = False,
    target_url_override: str | None = None,
) -> tuple[VideoMetadata, list[Path]]:
    """Capture and download a YouTube video using pure Ombra Chromium (zero ``yt-dlp``)."""
    watch_url, video_id = normalize_youtube_url(url_or_id)
    navigate_url = target_url_override or watch_url

    launch_kwargs: dict[str, Any] = {
        "headless": headless,
        "timeout_ms": timeout_ms,
    }
    if proxy:
        launch_kwargs["proxy"] = proxy
    if humanize:
        launch_kwargs["humanize"] = True
    if binary_path:
        launch_kwargs["binary_path"] = binary_path

    if profile:
        context = launch_persistent_context(profile=profile, **launch_kwargs)
    else:
        context = launch_context(**launch_kwargs)

    ump_responses: list[Any] = []
    direct_urls: dict[int, str] = {}

    try:
        page = context.pages[0] if context.pages else context.new_page()

        def on_request(request: Any) -> None:
            if "videoplayback" in request.url:
                _log(f"[fragment:request] {request.method} {request.url}")

        def on_request_failed(request: Any) -> None:
            if "videoplayback" in request.url:
                _log(f"[fragment:failed] {request.method} {request.failure} {request.url}")

        def on_response(response: Any) -> None:
            ct = (response.headers.get("content-type") or "").lower()
            is_videoplayback = "videoplayback" in response.url
            if response.status not in (200, 206):
                if is_videoplayback:
                    _log(
                        f"[fragment:http] {response.request.method} {response.status} "
                        f"{ct or '-'} {response.url}"
                    )
                return
            if "vnd.yt-ump" in ct:
                _log(f"[fragment:ump] {response.request.method} {response.status} {ct} {response.url}")
                ump_responses.append(response)
            elif is_videoplayback and ct.startswith(("video/", "audio/")):
                _log(
                    f"[fragment:direct] {response.request.method} {response.status} "
                    f"{ct} {response.url}"
                )
                qs = urllib.parse.parse_qs(urllib.parse.urlparse(response.url).query)
                raw_itag = qs.get("itag", [""])[0]
                if raw_itag.isdigit():
                    direct_urls.setdefault(int(raw_itag), response.url)

        page.on("request", on_request)
        page.on("requestfailed", on_request_failed)
        page.on("response", on_response)
        page.goto(navigate_url, wait_until="domcontentloaded", timeout=timeout_ms)
        page.wait_for_timeout(1_500)
        _dismiss_consent_dialog(page)

        if wait_for_login:
            if headless:
                raise ValueError("--wait-for-login requires --headed so you can sign in interactively.")
            print(
                "Sign in to YouTube in the Ombra window, then press Enter here to continue...",
                file=sys.stderr,
            )
            input()
            page.goto(navigate_url, wait_until="domcontentloaded", timeout=timeout_ms)
            page.wait_for_timeout(1_500)

        meta = _read_video_metadata(page, watch_url, video_id)
        if list_formats:
            return meta, []

        if meta.playability_status and meta.playability_status != "OK":
            reason = meta.playability_reason or meta.playability_status
            raise RuntimeError(
                f"YouTube reported playability={meta.playability_status!r} ({reason}). "
                "Try --profile youtube --headed --wait-for-login and/or a residential --proxy."
            )

        page.wait_for_selector("video", state="attached", timeout=20_000)
        _buffer_entire_video(page, quality=quality, max_wait_s=max_wait_s)

        collector = UmpTrackCollector()
        for resp in ump_responses:
            with contextlib.suppress(PlaywrightError):
                body = resp.body()
                _log(f"[fragment:ump-body] bytes={len(body)} url={resp.url}")
                collector.feed(body)
        captured_tracks = collector.tracks
    finally:
        context.close()

    stem = f"{sanitize_filename(meta.title)} [{meta.video_id}]"
    effective_max_height = max_height
    if effective_max_height is None and quality and quality.lower().endswith("p"):
        with contextlib.suppress(ValueError):
            effective_max_height = int(quality[:-1])

    best_video, best_audio = select_best_tracks(
        captured_tracks,
        meta.formats,
        max_height=effective_max_height,
    )

    with tempfile.TemporaryDirectory(prefix="ombra-yt-") as tmp_dir:
        tmp = Path(tmp_dir)
        video_file: Path | None = None
        audio_file: Path | None = None
        video_container = "mp4"
        audio_container = "mp4"

        if best_video is not None:
            v_fmt = meta.formats.get(best_video.itag)
            video_container = v_fmt.container if v_fmt else "mp4"
            video_file = best_video.write_to(tmp / f"video_{best_video.itag}.{video_container}")

        if best_audio is not None:
            a_fmt = meta.formats.get(best_audio.itag)
            audio_container = a_fmt.container if a_fmt else "mp4"
            audio_file = best_audio.write_to(tmp / f"audio_{best_audio.itag}.{audio_container}")

        # Fallback: if no UMP streams were captured but direct HTTP videoplayback URLs were seen.
        if video_file is None and audio_file is None and direct_urls:
            for itag, stream_url in direct_urls.items():
                fmt = meta.formats.get(itag)
                kind = fmt.kind if fmt else "video"
                container = fmt.container if fmt else "mp4"
                if kind == "video" and video_file is None:
                    video_container = container
                    video_file = _download_direct_stream(
                        stream_url,
                        tmp / f"direct_video_{itag}.{container}",
                        user_agent=meta.user_agent,
                        proxy=proxy,
                    )
                elif kind == "audio" and audio_file is None:
                    audio_container = container
                    audio_file = _download_direct_stream(
                        stream_url,
                        tmp / f"direct_audio_{itag}.{container}",
                        user_agent=meta.user_agent,
                        proxy=proxy,
                    )

        if video_file is None and audio_file is None:
            raise RuntimeError(
                "No video/audio media segments were captured from the YouTube player. "
                "Ensure googlevideo.com is reachable (pass --proxy if your ISP throttles YouTube) "
                "or retry with --headed to inspect playback."
            )

        saved_paths = mux_or_save_tracks(
            video_path=video_file,
            audio_path=audio_file,
            video_container=video_container,
            audio_container=audio_container,
            output_dir=Path(output_dir),
            file_stem=stem,
        )

    return meta, saved_paths


def _parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Download a YouTube video using pure Ombra Python SDK (no yt-dlp)."
    )
    parser.add_argument("url", help="YouTube video URL or 11-character video ID")
    parser.add_argument(
        "-o",
        "--output-dir",
        default=".",
        help="Directory where the downloaded file(s) will be saved (default: current directory)",
    )
    parser.add_argument(
        "-q",
        "--quality",
        choices=sorted(QUALITY_TO_YT_LEVEL.keys(), key=lambda s: int(s[:-1]), reverse=True),
        help="Preferred YouTube player quality hint (e.g. 1080p, 720p, 480p)",
    )
    parser.add_argument(
        "--max-height",
        type=int,
        help="Maximum video height in pixels when selecting captured tracks",
    )
    parser.add_argument(
        "--profile",
        help="Named persistent Ombra profile (reuses YouTube session/login across runs)",
    )
    parser.add_argument(
        "--proxy",
        help="Proxy URL passed to Ombra's loopback relay (e.g. socks5://user:pass@host:1080)",
    )
    parser.add_argument(
        "--headed",
        action="store_true",
        help="Launch Ombra with a visible browser window instead of headless mode",
    )
    parser.add_argument(
        "--wait-for-login",
        action="store_true",
        help="Pause after opening YouTube in --headed mode so you can sign in manually",
    )
    parser.add_argument(
        "--humanize",
        action="store_true",
        help="Enable Ombra native humanized input simulation",
    )
    parser.add_argument(
        "--binary-path",
        help="Explicit path to a local Ombra Chromium binary",
    )
    parser.add_argument(
        "--max-wait-s",
        type=float,
        default=120.0,
        help="Maximum seconds to wait for Ombra's player to buffer the full video (default: 120)",
    )
    parser.add_argument(
        "--list-formats",
        action="store_true",
        help="Print video metadata and available YouTube formats via Ombra without downloading",
    )
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = _parse_args(argv)
    try:
        meta, saved_paths = download_youtube_video(
            args.url,
            output_dir=args.output_dir,
            quality=args.quality,
            max_height=args.max_height,
            profile=args.profile,
            proxy=args.proxy,
            headless=not args.headed,
            humanize=args.humanize,
            wait_for_login=args.wait_for_login,
            binary_path=args.binary_path,
            max_wait_s=args.max_wait_s,
            list_formats=args.list_formats,
        )
    except (OmbraError, PlaywrightError, httpx.HTTPError, ValueError, RuntimeError, OSError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    summary: dict[str, Any] = {
        "video_id": meta.video_id,
        "title": meta.title,
        "channel": meta.channel,
        "duration_seconds": meta.duration_seconds,
        "playability": meta.playability_status,
    }
    if args.list_formats:
        summary["formats"] = [
            {
                "itag": fmt.itag,
                "kind": fmt.kind,
                "quality": fmt.quality_label,
                "mime_type": fmt.mime_type,
                "content_length": fmt.content_length,
            }
            for fmt in sorted(meta.formats.values(), key=lambda f: (f.kind, -(f.height or 0), f.itag))
        ]
    else:
        summary["files"] = [str(p) for p in saved_paths]
        if len(saved_paths) > 1 and shutil.which("ffmpeg") is None:
            print(
                "Note: ffmpeg not found on PATH; saved separate video/audio tracks. "
                f"Merge with: ffmpeg -i \"{saved_paths[0]}\" -i \"{saved_paths[1]}\" -c copy output.mp4",
                file=sys.stderr,
            )

    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
