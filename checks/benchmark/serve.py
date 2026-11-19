#!/usr/bin/env python3
"""Local static server for the Ombra fingerprint probe.

Binds to 127.0.0.1 only. The probe is at /.
"""

from __future__ import annotations

import argparse
import http.server
import os
import socketserver
import sys
import webbrowser
from functools import partial
from pathlib import Path

ROOT = Path(__file__).resolve().parent / "probe"


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        super().end_headers()

    def log_message(self, fmt: str, *args: object) -> None:
        # Keep the terminal quiet; uncomment for debugging.
        pass


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


def main() -> int:
    parser = argparse.ArgumentParser(description="Serve the Ombra fingerprint probe on localhost.")
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", "8787")))
    parser.add_argument("--root", default=str(ROOT))
    parser.add_argument("--no-open", action="store_true", help="do not open the browser")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    if not (root / "index.html").exists():
        print(f"error: probe/index.html not found under {root}", file=sys.stderr)
        return 1

    handler = partial(Handler, directory=str(root))
    server = None
    port = args.port
    for candidate in range(args.port, args.port + 20):
        try:
            server = Server(("127.0.0.1", candidate), handler)
            port = candidate
            break
        except OSError:
            continue
    if server is None:
        print(f"error: cannot bind 127.0.0.1:{args.port}..{args.port + 19}", file=sys.stderr)
        return 1

    url = f"http://127.0.0.1:{port}/"
    print("Ombra checks — local fingerprint probe")
    print(f"  root: {root}")
    print(f"  url:  {url}")
    print("  bind: 127.0.0.1 only; no network requests are made by the checker")
    print("  stop: Ctrl+C")
    if not args.no_open:
        try:
            webbrowser.open(url)
        except Exception:
            pass

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
