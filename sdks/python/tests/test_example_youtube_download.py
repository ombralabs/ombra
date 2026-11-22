from __future__ import annotations

import gzip
import importlib.util
import shutil
import subprocess
import sys
from pathlib import Path
from types import ModuleType

import pytest

EXAMPLE_PATH = (
    Path(__file__).resolve().parents[3]
    / "examples"
    / "01-youtube-download"
    / "youtube_download.py"
)


def _load_example_module() -> ModuleType:
    spec = importlib.util.spec_from_file_location("ombra_example_youtube_download", EXAMPLE_PATH)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


yt_example = _load_example_module()


def _encode_ump_varint(value: int) -> bytes:
    if value < 128:
        return bytes([value])
    if value < 16_384:
        return bytes([0x80 | (value & 0x3F), value >> 6])
    if value < 2_097_152:
        return bytes([0xC0 | (value & 0x1F), (value >> 5) & 0xFF, value >> 13])
    if value < 268_435_456:
        return bytes(
            [0xE0 | (value & 0x0F), (value >> 4) & 0xFF, (value >> 12) & 0xFF, value >> 20]
        )
    return b"\xf0" + value.to_bytes(4, "little")


def _encode_proto_varint(field_num: int, value: int) -> bytes:
    def _varint(v: int) -> bytes:
        out = bytearray()
        while True:
            b = v & 0x7F
            v >>= 7
            out.append(b | 0x80 if v else b)
            if not v:
                return bytes(out)

    return _varint(field_num << 3) + _varint(value)


def _encode_ump_part(part_type: int, payload: bytes) -> bytes:
    return _encode_ump_varint(part_type) + _encode_ump_varint(len(payload)) + payload


def _build_media_header_bytes(
    *,
    header_id: int,
    itag: int,
    is_init: bool = False,
    segment_num: int = 0,
    byte_range_start: int = 0,
    compression_type: int = 1,
) -> bytes:
    parts = [
        _encode_proto_varint(1, header_id),
        _encode_proto_varint(3, itag),
        _encode_proto_varint(6, byte_range_start),
        _encode_proto_varint(7, compression_type),
    ]
    if is_init:
        parts.append(_encode_proto_varint(8, 1))
    if segment_num:
        parts.append(_encode_proto_varint(9, segment_num))
    return b"".join(parts)


@pytest.mark.parametrize(
    ("raw", "expected_id"),
    [
        ("jNQXAC9IVRw", "jNQXAC9IVRw"),
        ("https://www.youtube.com/watch?v=jNQXAC9IVRw&t=5s", "jNQXAC9IVRw"),
        ("https://youtu.be/jNQXAC9IVRw?si=abc", "jNQXAC9IVRw"),
        ("https://www.youtube.com/shorts/jNQXAC9IVRw", "jNQXAC9IVRw"),
        ("https://m.youtube.com/embed/jNQXAC9IVRw", "jNQXAC9IVRw"),
    ],
)
def test_normalize_youtube_url_accepts_valid_inputs(raw: str, expected_id: str) -> None:
    url, vid = yt_example.normalize_youtube_url(raw)
    assert vid == expected_id
    assert url == f"https://www.youtube.com/watch?v={expected_id}"


@pytest.mark.parametrize(
    "raw",
    [
        "",
        "https://example.com/watch?v=jNQXAC9IVRw",
        "ftp://www.youtube.com/watch?v=jNQXAC9IVRw",
        "https://www.youtube.com/watch?v=short",
    ],
)
def test_normalize_youtube_url_rejects_invalid_inputs(raw: str) -> None:
    with pytest.raises(ValueError):
        yt_example.normalize_youtube_url(raw)


@pytest.mark.parametrize("value", [0, 1, 127, 128, 16_383, 16_384, 2_097_151, 2_097_152, 300_000_000])
def test_ump_varint_roundtrip_all_widths(value: int) -> None:
    encoded = _encode_ump_varint(value)
    decoded = yt_example.read_ump_varint(encoded + b"\xff", 0)
    assert decoded == (value, len(encoded))


def test_ump_collector_reassembles_deduplicates_and_decompresses() -> None:
    init_bytes = b"\x00\x00\x00\x18ftypdashINIT"
    seg1_a = b"MOOF1_PART_A"
    seg1_b = b"MOOF1_PART_B"
    seg2_raw = b"MOOF2_COMPRESSED_PAYLOAD"
    seg2_gz = gzip.compress(seg2_raw)

    stream = b"".join(
        [
            # Init segment sent twice under different header_ids -> must not duplicate.
            _encode_ump_part(20, _build_media_header_bytes(header_id=1, itag=137, is_init=True)),
            _encode_ump_part(21, _encode_ump_varint(1) + init_bytes),
            _encode_ump_part(22, _encode_ump_varint(1)),
            _encode_ump_part(20, _build_media_header_bytes(header_id=2, itag=137, is_init=True)),
            _encode_ump_part(21, _encode_ump_varint(2) + init_bytes),
            _encode_ump_part(22, _encode_ump_varint(2)),
            # Segment 2 arrives before segment 1, compressed with GZIP.
            _encode_ump_part(
                20,
                _build_media_header_bytes(
                    header_id=4, itag=137, segment_num=2, byte_range_start=500, compression_type=2
                ),
            ),
            _encode_ump_part(21, _encode_ump_varint(4) + seg2_gz),
            _encode_ump_part(22, _encode_ump_varint(4)),
            # Segment 1 split across two MEDIA parts.
            _encode_ump_part(
                20,
                _build_media_header_bytes(header_id=3, itag=137, segment_num=1, byte_range_start=100),
            ),
            _encode_ump_part(21, _encode_ump_varint(3) + seg1_a),
            _encode_ump_part(21, _encode_ump_varint(3) + seg1_b),
            _encode_ump_part(22, _encode_ump_varint(3)),
            # Audio track (itag=140).
            _encode_ump_part(20, _build_media_header_bytes(header_id=5, itag=140, is_init=True)),
            _encode_ump_part(21, _encode_ump_varint(5) + b"AUDIO_INIT"),
            _encode_ump_part(20, _build_media_header_bytes(header_id=6, itag=140, segment_num=1)),
            _encode_ump_part(21, _encode_ump_varint(6) + b"AUDIO_SEG1"),
        ]
    )

    collector = yt_example.UmpTrackCollector()
    collector.feed(stream)
    tracks = collector.tracks

    assert b"".join(tracks[137].iter_chunks()) == init_bytes + seg1_a + seg1_b + seg2_raw
    assert b"".join(tracks[140].iter_chunks()) == b"AUDIO_INITAUDIO_SEG1"


def test_select_best_tracks_respects_max_height() -> None:
    formats = {
        137: yt_example.FormatInfo(137, 'video/mp4; codecs="avc1"', "1080p", 1920, 1080),
        136: yt_example.FormatInfo(136, 'video/mp4; codecs="avc1"', "720p", 1280, 720),
        140: yt_example.FormatInfo(140, 'audio/mp4; codecs="mp4a"', None, None, None),
        251: yt_example.FormatInfo(251, 'audio/webm; codecs="opus"', None, None, None),
    }
    tracks = {
        137: yt_example.AssembledTrack(137, init=b"init", segments={(1, 0): b"v" * 500}),
        136: yt_example.AssembledTrack(136, init=b"init", segments={(1, 0): b"v" * 300}),
        140: yt_example.AssembledTrack(140, init=b"init", segments={(1, 0): b"a" * 100}),
        251: yt_example.AssembledTrack(251, init=b"init", segments={(1, 0): b"a" * 200}),
    }

    best_v, best_a = yt_example.select_best_tracks(tracks, formats)
    assert best_v is not None and best_v.itag == 137
    assert best_a is not None and best_a.itag == 140  # prefers MP4 audio container

    capped_v, _ = yt_example.select_best_tracks(tracks, formats, max_height=720)
    assert capped_v is not None and capped_v.itag == 136


def test_normalize_direct_stream_url_strips_ephemeral_params() -> None:
    raw = (
        "https://rr1---sn-test.googlevideo.com/videoplayback"
        "?itag=137&clen=1000&range=0-999&rn=4&rbuf=100&ump=1&srfvp=1&sig=abc"
    )
    cleaned = yt_example.normalize_direct_stream_url(raw)
    assert "itag=137" in cleaned
    assert "sig=abc" in cleaned
    for dropped in ("range=", "rn=", "rbuf=", "ump=", "srfvp="):
        assert dropped not in cleaned


def test_sanitize_filename_and_fallback_save_without_ffmpeg(tmp_path: Path) -> None:
    assert yt_example.sanitize_filename('Me/at:the*zoo? "2005"') == "Me at the zoo 2005"

    v_src = tmp_path / "src_v.mp4"
    a_src = tmp_path / "src_a.mp4"
    v_src.write_bytes(b"VIDEO")
    a_src.write_bytes(b"AUDIO")

    out_dir = tmp_path / "out"
    saved = yt_example.mux_or_save_tracks(
        video_path=v_src,
        audio_path=a_src,
        video_container="mp4",
        audio_container="mp4",
        output_dir=out_dir,
        file_stem="Demo [jNQXAC9IVRw]",
        ffmpeg_bin="",
    )
    assert [p.name for p in saved] == [
        "Demo [jNQXAC9IVRw].video.mp4",
        "Demo [jNQXAC9IVRw].audio.mp4",
    ]


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg not installed")
def test_mux_real_ffmpeg_tracks(tmp_path: Path) -> None:
    v_src = tmp_path / "v.mp4"
    a_src = tmp_path / "a.mp4"
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-loglevel",
            "error",
            "-f",
            "lavfi",
            "-i",
            "color=c=blue:s=160x120:d=1",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "frag_keyframe+empty_moov",
            str(v_src),
        ],
        check=True,
    )
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-loglevel",
            "error",
            "-f",
            "lavfi",
            "-i",
            "sine=frequency=440:duration=1",
            "-c:a",
            "aac",
            "-movflags",
            "frag_keyframe+empty_moov",
            str(a_src),
        ],
        check=True,
    )

    out_dir = tmp_path / "muxed"
    saved = yt_example.mux_or_save_tracks(
        video_path=v_src,
        audio_path=a_src,
        video_container="mp4",
        audio_container="mp4",
        output_dir=out_dir,
        file_stem="Test [jNQXAC9IVRw]",
    )
    assert len(saved) == 1
    assert saved[0].suffix == ".mp4"
    assert saved[0].stat().st_size > 1_000
