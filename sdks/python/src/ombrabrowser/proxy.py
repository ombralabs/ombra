"""Proxy parsing, normalization, and loopback relay for authenticated proxies.

Ombra stealth invariant SI-06 forbids proxy credentials in the engine process
command line. Authenticated proxies are served through an in-process loopback
SOCKS5 relay bound to 127.0.0.1 so Chromium only receives
``--proxy-server=socks5://127.0.0.1:<port>``.
"""

from __future__ import annotations

import asyncio
import base64
import contextlib
import socket
import ssl
import struct
import threading
from dataclasses import dataclass
from typing import Any
from urllib.parse import unquote, urlsplit

from .config import logger
from .errors import InvalidOptionError, ProxyError

_CHUNK_SIZE = 64 * 1024
_HANDSHAKE_TIMEOUT = 15.0
_LOOPBACK_PEERS = frozenset({"127.0.0.1", "::1", "::ffff:127.0.0.1"})
_ALLOWED_PROXY_KEYS = frozenset({"type", "host", "port", "username", "password", "server", "bypass"})
_ALLOWED_PROXY_TYPES = frozenset({"http", "https", "socks5", "socks5h"})


@dataclass(frozen=True, repr=False)
class NormalizedProxy:
    """Parsed proxy configuration. Credentials are omitted from __repr__."""

    scheme: str          # "http" | "https" | "socks5" | "socks5h"
    host: str
    port: int
    username: str | None = None
    password: str | None = None
    bypass: str | None = None

    @property
    def has_credentials(self) -> bool:
        return self.username is not None or self.password is not None

    @property
    def server_url(self) -> str:
        """Credential-free server URL safe for CLI flags and logs."""
        host_fmt = f"[{self.host}]" if ":" in self.host else self.host
        return f"{self.scheme}://{host_fmt}:{self.port}"

    def upstream_url_for_geoip(self) -> str:
        """Full URL including credentials for internal GeoIP client use only."""
        from urllib.parse import quote

        host_fmt = f"[{self.host}]" if ":" in self.host else self.host
        if not self.has_credentials:
            return f"{self.scheme}://{host_fmt}:{self.port}"
        user = quote(self.username or "", safe="")
        if self.password is not None:
            pw = quote(self.password, safe="")
            auth = f"{user}:{pw}@"
        else:
            auth = f"{user}@"
        return f"{self.scheme}://{auth}{host_fmt}:{self.port}"

    def secrets(self) -> tuple[str, ...]:
        items: list[str] = []
        if self.username:
            items.append(self.username)
        if self.password:
            items.append(self.password)
        return tuple(items)

    def __repr__(self) -> str:
        return f"NormalizedProxy(scheme={self.scheme!r}, host={self.host!r}, port={self.port!r})"


def parse_proxy(proxy: str | dict[str, Any] | None) -> NormalizedProxy | None:
    """Validate and normalize a proxy string URL or option object."""
    if proxy is None:
        return None
    if isinstance(proxy, str):
        return _parse_proxy_string(proxy)
    if isinstance(proxy, dict):
        return _parse_proxy_dict(proxy)
    raise InvalidOptionError(
        f"proxy must be a string or dict, got {type(proxy).__name__}."
    )


def _parse_proxy_string(raw: str) -> NormalizedProxy:
    text = raw.strip()
    if not text:
        raise InvalidOptionError("proxy string cannot be empty.")
    with_scheme = text if "://" in text else f"http://{text}"
    try:
        parsed = urlsplit(with_scheme)
        port = parsed.port
    except ValueError as exc:
        raise ProxyError("Invalid proxy URL.") from exc

    scheme = parsed.scheme.lower()
    if scheme not in _ALLOWED_PROXY_TYPES:
        raise InvalidOptionError(
            f"Unsupported proxy scheme {scheme!r}; expected http, https, or socks5."
        )
    if not parsed.hostname or port is None or not (1 <= port <= 65535):
        raise ProxyError("Proxy URL must include a valid host and port (1..65535).")

    username = unquote(parsed.username) if parsed.username is not None else None
    password = unquote(parsed.password) if parsed.password is not None else None
    if username == "" and password is None:
        username = None

    return NormalizedProxy(
        scheme="socks5" if scheme == "socks5h" else scheme,
        host=parsed.hostname,
        port=port,
        username=username,
        password=password,
    )


def _parse_proxy_dict(data: dict[str, Any]) -> NormalizedProxy:
    unknown = set(data) - _ALLOWED_PROXY_KEYS
    if unknown:
        raise InvalidOptionError(
            f"Unknown proxy option(s): {', '.join(sorted(unknown))}.",
            details={"unknown_keys": sorted(unknown)},
        )

    bypass = data.get("bypass")
    if bypass is not None and not isinstance(bypass, str):
        raise InvalidOptionError("proxy.bypass must be a string.")

    # Support both contract schema ({type, host, port, ...}) and Playwright dict ({server, ...}).
    if "server" in data:
        if any(k in data for k in ("type", "host", "port")):
            raise InvalidOptionError(
                "proxy cannot combine Playwright 'server' with contract 'type'/'host'/'port'."
            )
        server = data.get("server")
        if not isinstance(server, str) or not server.strip():
            raise InvalidOptionError("proxy.server must be a non-empty string.")
        base = _parse_proxy_string(server)
        username = data.get("username", base.username)
        password = data.get("password", base.password)
    else:
        for required in ("type", "host", "port"):
            if required not in data:
                raise InvalidOptionError(f"proxy object is missing required field {required!r}.")
        scheme = data["type"]
        if not isinstance(scheme, str) or scheme.lower() not in {"http", "https", "socks5"}:
            raise InvalidOptionError(
                f"proxy.type must be 'http', 'https', or 'socks5', got {scheme!r}."
            )
        host = data["host"]
        if not isinstance(host, str) or not host.strip():
            raise InvalidOptionError("proxy.host must be a non-empty string.")
        port = data["port"]
        if isinstance(port, bool) or not isinstance(port, int) or not (1 <= port <= 65535):
            raise InvalidOptionError("proxy.port must be an integer between 1 and 65535.")
        base = NormalizedProxy(scheme=scheme.lower(), host=host.strip(), port=port)
        username = data.get("username")
        password = data.get("password")

    if username is not None and not isinstance(username, str):
        raise InvalidOptionError("proxy.username must be a string.")
    if password is not None and not isinstance(password, str):
        raise InvalidOptionError("proxy.password must be a string.")

    if base.scheme in {"socks5", "socks5h"}:
        if username and len(username.encode("utf-8")) > 255:
            raise ProxyError("SOCKS5 proxy username exceeds 255 bytes.")
        if password and len(password.encode("utf-8")) > 255:
            raise ProxyError("SOCKS5 proxy password exceeds 255 bytes.")

    return NormalizedProxy(
        scheme=base.scheme,
        host=base.host,
        port=base.port,
        username=username,
        password=password,
        bypass=bypass,
    )


class LoopbackProxyRelay:
    """In-memory loopback SOCKS5 relay for authenticated upstream proxies."""

    def __init__(self, upstream: NormalizedProxy) -> None:
        self._upstream = upstream
        self._user_bytes = (upstream.username or "").encode("utf-8")
        self._pass_bytes = (upstream.password or "").encode("utf-8")
        self._basic_auth = base64.b64encode(
            self._user_bytes + b":" + self._pass_bytes
        ).decode("ascii")
        self._ssl_ctx = ssl.create_default_context() if upstream.scheme == "https" else None
        self._loop: asyncio.AbstractEventLoop | None = None
        self._thread: threading.Thread | None = None
        self._url: str | None = None
        self._start_error: BaseException | None = None

    @property
    def url(self) -> str:
        if not self._url:
            raise ProxyError("Loopback proxy relay has not started.")
        return self._url

    def start(self, timeout: float = 5.0) -> str:
        """Start the relay bound to 127.0.0.1:0 and return socks5://127.0.0.1:<port>."""
        ready = threading.Event()

        def _run() -> None:
            loop = asyncio.new_event_loop()
            loop.set_debug(False)
            self._loop = loop
            asyncio.set_event_loop(loop)
            try:
                server = loop.run_until_complete(
                    asyncio.start_server(self._handle_client, "127.0.0.1", 0)
                )
                sock = server.sockets[0]
                port = sock.getsockname()[1]
                self._url = f"socks5://127.0.0.1:{port}"
            except BaseException as exc:
                self._start_error = exc
                ready.set()
                loop.close()
                return

            ready.set()
            try:
                loop.run_forever()
            finally:
                server.close()
                pending = asyncio.all_tasks(loop)
                for task in pending:
                    task.cancel()
                with contextlib.suppress(Exception):
                    loop.run_until_complete(
                        asyncio.gather(server.wait_closed(), *pending, return_exceptions=True)
                    )
                with contextlib.suppress(Exception):
                    loop.run_until_complete(asyncio.sleep(0.02))
                loop.close()

        self._thread = threading.Thread(target=_run, name="ombra-proxy-relay", daemon=True)
        self._thread.start()
        if not ready.wait(timeout):
            self.stop()
            raise ProxyError("Loopback proxy relay timed out while starting.")
        if self._start_error is not None:
            raise ProxyError(
                f"Failed to start loopback proxy relay: {type(self._start_error).__name__}",
                secrets=self._upstream.secrets(),
            ) from self._start_error
        return self.url

    def stop(self) -> None:
        """Stop the loopback listener and join the background relay thread."""
        loop = self._loop
        thread = self._thread
        if loop is not None and not loop.is_closed():
            with contextlib.suppress(RuntimeError):
                loop.call_soon_threadsafe(loop.stop)
        if thread is not None and thread.is_alive():
            thread.join(timeout=5.0)
        self._thread = None

    async def _handle_client(
        self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter
    ) -> None:
        up_writer: asyncio.StreamWriter | None = None
        try:
            peer = writer.get_extra_info("peername")
            if isinstance(peer, tuple) and peer and peer[0] not in _LOOPBACK_PEERS:
                return

            async def _handshake() -> tuple[bool, asyncio.StreamReader | None, asyncio.StreamWriter | None]:
                nonlocal up_writer
                _, n_methods = await reader.readexactly(2)
                await reader.readexactly(n_methods)
                # Loopback relay requires no auth from the local browser process.
                writer.write(b"\x05\x00")
                await writer.drain()

                _, cmd, _, atyp = await reader.readexactly(4)
                if atyp == 1:
                    host = socket.inet_ntoa(await reader.readexactly(4))
                elif atyp == 3:
                    name_len = (await reader.readexactly(1))[0]
                    host = (await reader.readexactly(name_len)).decode("utf-8", errors="replace")
                elif atyp == 4:
                    raw_ip6 = await reader.readexactly(16)
                    host = f"[{socket.inet_ntop(socket.AF_INET6, raw_ip6)}]"
                else:
                    writer.write(b"\x05\x08\x00\x01" + bytes(6))
                    await writer.drain()
                    return False, None, None
                port = struct.unpack("!H", await reader.readexactly(2))[0]

                if cmd != 1:  # CONNECT only
                    writer.write(b"\x05\x07\x00\x01" + bytes(6))
                    await writer.drain()
                    return False, None, None

                up_r, up_w = await asyncio.open_connection(
                    self._upstream.host,
                    self._upstream.port,
                    ssl=self._ssl_ctx,
                    server_hostname=self._upstream.host if self._ssl_ctx else None,
                )
                up_writer = up_w

                if self._upstream.scheme in {"socks5", "socks5h"}:
                    ok_up = await self._socks5_upstream_connect(up_r, up_w, atyp, host, port)
                else:
                    ok_up = await self._http_upstream_connect(up_r, up_w, host, port)

                writer.write(b"\x05" + (b"\x00" if ok_up else b"\x05") + b"\x00\x01" + bytes(6))
                await writer.drain()
                return ok_up, up_r, up_w

            ok, up_reader, up_writer = await asyncio.wait_for(
                _handshake(), timeout=_HANDSHAKE_TIMEOUT
            )
            if not ok or up_reader is None or up_writer is None:
                return

            await asyncio.gather(
                _pipe(reader, up_writer),
                _pipe(up_reader, writer),
            )
        except (
            asyncio.TimeoutError,
            asyncio.IncompleteReadError,
            asyncio.LimitOverrunError,
            ConnectionError,
            OSError,
        ):
            pass
        except Exception as exc:  # noqa: BLE001 - never log credentials or upstream host details
            logger.debug("Proxy relay stream ended with %s", type(exc).__name__)
        finally:
            for stream in (writer, up_writer):
                if stream is not None:
                    with contextlib.suppress(Exception):
                        stream.close()

    async def _http_upstream_connect(
        self,
        up_reader: asyncio.StreamReader,
        up_writer: asyncio.StreamWriter,
        host: str,
        port: int,
    ) -> bool:
        auth_line = (
            f"Proxy-Authorization: Basic {self._basic_auth}\r\n"
            if self._upstream.has_credentials
            else ""
        )
        req = f"CONNECT {host}:{port} HTTP/1.1\r\nHost: {host}:{port}\r\n{auth_line}\r\n"
        up_writer.write(req.encode("ascii"))
        await up_writer.drain()
        head = await up_reader.readuntil(b"\r\n\r\n")
        status_parts = head.split(b"\r\n", 1)[0].split(b" ")
        return len(status_parts) >= 2 and status_parts[1] == b"200"

    async def _socks5_upstream_connect(
        self,
        up_reader: asyncio.StreamReader,
        up_writer: asyncio.StreamWriter,
        atyp: int,
        host: str,
        port: int,
    ) -> bool:
        method = 2 if self._upstream.has_credentials else 0
        up_writer.write(bytes((5, 1, method)))
        await up_writer.drain()
        if await up_reader.readexactly(2) != bytes((5, method)):
            return False

        if method == 2:
            auth_pkt = (
                bytes((1, len(self._user_bytes)))
                + self._user_bytes
                + bytes((len(self._pass_bytes),))
                + self._pass_bytes
            )
            up_writer.write(auth_pkt)
            await up_writer.drain()
            if await up_reader.readexactly(2) != b"\x01\x00":
                return False

        if atyp == 3:
            host_bytes = host.encode("utf-8")
            addr = bytes((len(host_bytes),)) + host_bytes
        elif atyp == 1:
            addr = socket.inet_aton(host)
        else:
            addr = socket.inet_pton(socket.AF_INET6, host.strip("[]"))

        up_writer.write(b"\x05\x01\x00" + bytes((atyp,)) + addr + struct.pack("!H", port))
        await up_writer.drain()
        _, rep, _, b_atyp = await up_reader.readexactly(4)
        if b_atyp == 1:
            await up_reader.readexactly(4)
        elif b_atyp == 4:
            await up_reader.readexactly(16)
        elif b_atyp == 3:
            b_len = (await up_reader.readexactly(1))[0]
            await up_reader.readexactly(b_len)
        await up_reader.readexactly(2)
        return rep == 0


async def _pipe(reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
    try:
        while data := await reader.read(_CHUNK_SIZE):
            writer.write(data)
            await writer.drain()
    except (ConnectionError, OSError):
        pass
    finally:
        with contextlib.suppress(OSError, RuntimeError):
            writer.write_eof()


def prepare_proxy(
    proxy: NormalizedProxy | None,
) -> tuple[list[str], LoopbackProxyRelay | None]:
    """Build Chromium proxy flags, starting a loopback relay when credentials exist."""
    if proxy is None:
        return [], None

    relay: LoopbackProxyRelay | None = None
    if proxy.has_credentials:
        relay = LoopbackProxyRelay(proxy)
        relay_url = relay.start()
        flags = [f"--proxy-server={relay_url}"]
    else:
        flags = [f"--proxy-server={proxy.server_url}"]

    if proxy.bypass:
        flags.append(f"--proxy-bypass-list={proxy.bypass}")
    return flags, relay
