# 01 — YouTube Video Download (Pure Ombra + Python SDK)

Downloads a YouTube video using **only [`ombrabrowser`](../../sdks/python/README.md)** — no `yt-dlp`, no external JS runtime, and no separate BotGuard server.

## How it works

1. Launches Ombra stealth Chromium via `launch_context()` (or `launch_persistent_context()` when `--profile` is set).
2. Opens the YouTube watch page inside Ombra's real Chromium engine, dismisses consent prompts, and reads `ytInitialPlayerResponse` metadata.
3. Passively captures YouTube's SABR/UMP media responses (`Content-Type: application/vnd.yt-ump`) via Playwright CDP Network events (`page.on("response")`, without injecting scripts), logs full fragment URLs to `stderr`, decodes UMP `MediaHeader` + `MEDIA` segments into video and audio tracks while stepping the muted player across the buffer, and falls back to direct HTTP `videoplayback` downloads (`httpx`) if non-UMP streams are served.
4. Muxes the captured video and audio tracks into `.mp4` with `ffmpeg` (or saves separate track files if `ffmpeg` is not on `PATH`).

## Prerequisites

```bash
pip install ombrabrowser
```

- **`ffmpeg`** on `PATH` is recommended to mux separate adaptive video and audio tracks into one `.mp4` file.

## Usage

List available formats and inspect playability via Ombra (no download):

```bash
python examples/01-youtube-download/youtube_download.py \
  "https://www.youtube.com/watch?v=jNQXAC9IVRw" \
  --list-formats
```

Download a video using pure Ombra:

```bash
python examples/01-youtube-download/youtube_download.py \
  "https://www.youtube.com/watch?v=jNQXAC9IVRw" \
  -q 720p -o ./downloads
```

If YouTube asks to sign in (`LOGIN_REQUIRED`) on your IP, sign in once inside a persistent Ombra profile and reuse it headlessly on subsequent runs:

```bash
# Step 1: open a visible Ombra window, sign in to YouTube, press Enter
python examples/01-youtube-download/youtube_download.py \
  "https://www.youtube.com/watch?v=jNQXAC9IVRw" \
  --profile youtube --headed --wait-for-login --humanize -o ./downloads

# Step 2: reuse the saved profile headlessly (optionally through a residential proxy)
python examples/01-youtube-download/youtube_download.py \
  "https://www.youtube.com/watch?v=jNQXAC9IVRw" \
  --profile youtube --proxy "socks5://user:pass@proxy-host:1080" -o ./downloads
```

## Logs

- `stderr` prints the full URL of every media fragment request/response (`[fragment:request]`, `[fragment:ump]`, `[fragment:ump-body]`, `[fragment:direct]`, `[fragment:failed]`).
- `stdout` outputs the final JSON summary (title, video ID, playability, saved file paths).

> Use [`youtube_download.py`](youtube_download.py) only for videos you have the right to download and in accordance with YouTube's Terms of Service.
