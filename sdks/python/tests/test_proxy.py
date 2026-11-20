"""Tests for proxy parsing and loopback SOCKS5 relay for authenticated proxies."""

from __future__ import annotations

import base64
import socket
import struct
import threading

import pytest

from ombrabrowser.errors import InvalidOptionError, ProxyError
from ombrabrowser.proxy import LoopbackProxyRelay, parse_proxy, prepare_proxy


def _recv_exact(sock: socket.socket, n: int) -> bytes:
    buf = bytearray()
    while len(buf) < n:
        chunk = sock.recv(n - len(buf))
        if not chunk:
            raise EOFError("unexpected EOF")
        buf.extend(chunk)
    return bytes(buf)


def test_parse_proxy_variants():
    p1 = parse_proxy("http://proxy.internal:8080")
    assert p1 is not None
    assert not p1.has_credentials
    assert p1.server_url == "http://proxy.internal:8080"

    p2 = parse_proxy("socks5://alice:p%40ss%3D1@proxy.internal:1080")
    assert p2 is not None
    assert p2.has_credentials
    assert p2.username == "alice"
    assert p2.password == "p@ss=1"
    assert "alice" not in repr(p2)
    assert "p@ss" not in repr(p2)

    p3 = parse_proxy(
        {
            "type": "https",
            "host": "edge.proxy",
            "port": 8443,
            "username": "u1",
            "password": "s1",
        }
    )
    assert p3 is not None and p3.scheme == "https" and p3.port == 8443

    with pytest.raises(InvalidOptionError):
        parse_proxy({"type": "ftp", "host": "h", "port": 21})
    with pytest.raises(InvalidOptionError):
        parse_proxy({"type": "http", "host": "h", "port": 99999})
    with pytest.raises(ProxyError):
        parse_proxy("http://onlyhost")


def test_unauthenticated_proxy_skips_relay():
    proxy = parse_proxy("socks5://10.0.0.5:1080")
    flags, relay = prepare_proxy(proxy)
    assert relay is None
    assert flags == ["--proxy-server=socks5://10.0.0.5:1080"]


@pytest.mark.parametrize("proxy_input", [
    "socks5h://proxy.internal:1080",
    {"server": "socks5h://proxy.internal:1080", "bypass": "localhost"},
])
def test_socks5h_uses_chromium_compatible_flags(proxy_input):
    proxy = parse_proxy(proxy_input)
    flags, relay = prepare_proxy(proxy)
    assert relay is None
    expected = ["--proxy-server=socks5://proxy.internal:1080"]
    if isinstance(proxy_input, dict):
        expected.append("--proxy-bypass-list=localhost")
    assert flags == expected


@pytest.mark.parametrize("scheme", ["socks5", "socks5h"])
def test_socks_proxy_encoded_credentials_round_trip(scheme):
    proxy = parse_proxy(f"{scheme}://alice%40example:p%40ss%3D1@proxy.internal:1080")
    assert proxy is not None
    assert proxy.scheme == "socks5"
    assert proxy.has_credentials
    assert proxy.username == "alice@example"
    assert proxy.password == "p@ss=1"
    assert proxy.upstream_url_for_geoip() == (
        "socks5://alice%40example:p%40ss%3D1@proxy.internal:1080"
    )
    assert "alice" not in repr(proxy)
    assert "p@ss" not in repr(proxy)


def test_loopback_relay_http_connect_with_credentials():
    seen_headers: list[str] = []

    upstream = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    upstream.bind(("127.0.0.1", 0))
    upstream.listen(2)
    up_port = upstream.getsockname()[1]

    def serve_http_proxy() -> None:
        conn, _ = upstream.accept()
        with conn:
            data = b""
            while b"\r\n\r\n" not in data:
                data += conn.recv(4096)
            seen_headers.append(data.decode("ascii"))
            expected = base64.b64encode(b"user1:pass1").decode("ascii")
            assert f"Proxy-Authorization: Basic {expected}" in seen_headers[-1]
            conn.sendall(b"HTTP/1.1 200 Connection Established\r\n\r\n")
            payload = conn.recv(4096)
            conn.sendall(b"echo:" + payload)

    t = threading.Thread(target=serve_http_proxy, daemon=True)
    t.start()

    proxy = parse_proxy(f"http://user1:pass1@127.0.0.1:{up_port}")
    flags, relay = prepare_proxy(proxy)
    assert relay is not None
    try:
        assert len(flags) == 1
        assert flags[0].startswith("--proxy-server=socks5://127.0.0.1:")
        assert "user1" not in flags[0]
        assert "pass1" not in flags[0]

        relay_port = int(flags[0].rsplit(":", 1)[1])
        with socket.create_connection(("127.0.0.1", relay_port), timeout=5) as cli:
            cli.sendall(b"\x05\x01\x00")
            assert _recv_exact(cli, 2) == b"\x05\x00"
            target = b"example.com"
            cli.sendall(b"\x05\x01\x00\x03" + bytes([len(target)]) + target + struct.pack("!H", 443))
            rep = _recv_exact(cli, 10)
            assert rep[1] == 0x00
            cli.sendall(b"ping")
            assert _recv_exact(cli, 9) == b"echo:ping"
    finally:
        relay.stop()
        upstream.close()


@pytest.mark.parametrize("scheme", ["socks5", "socks5h"])
def test_loopback_relay_socks5_with_rfc1929_auth(scheme):
    upstream = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    upstream.bind(("127.0.0.1", 0))
    upstream.listen(2)
    up_port = upstream.getsockname()[1]

    def serve_socks5_proxy() -> None:
        conn, _ = upstream.accept()
        with conn:
            ver, n = _recv_exact(conn, 2)
            methods = _recv_exact(conn, n)
            assert ver == 5 and 2 in methods
            conn.sendall(b"\x05\x02")
            aver, ulen = _recv_exact(conn, 2)
            assert aver == 1
            user = _recv_exact(conn, ulen)
            plen = _recv_exact(conn, 1)[0]
            pw = _recv_exact(conn, plen)
            assert user == b"socks_u" and pw == b"socks_p"
            conn.sendall(b"\x01\x00")
            _, cmd, _, atyp = _recv_exact(conn, 4)
            assert cmd == 1 and atyp == 3
            hlen = _recv_exact(conn, 1)[0]
            _host = _recv_exact(conn, hlen)
            _port = _recv_exact(conn, 2)
            conn.sendall(b"\x05\x00\x00\x01\x00\x00\x00\x00\x00\x00")
            data = conn.recv(4096)
            conn.sendall(b"ok:" + data)

    t = threading.Thread(target=serve_socks5_proxy, daemon=True)
    t.start()

    proxy = parse_proxy(f"{scheme}://socks_u:socks_p@127.0.0.1:{up_port}")
    relay = LoopbackProxyRelay(proxy)
    relay_url = relay.start()
    try:
        assert "socks_u" not in relay_url
        assert "socks_p" not in relay_url
        relay_port = int(relay_url.rsplit(":", 1)[1])
        with socket.create_connection(("127.0.0.1", relay_port), timeout=5) as cli:
            cli.sendall(b"\x05\x01\x00")
            assert _recv_exact(cli, 2) == b"\x05\x00"
            target = b"example.org"
            cli.sendall(b"\x05\x01\x00\x03" + bytes([len(target)]) + target + struct.pack("!H", 80))
            rep = _recv_exact(cli, 10)
            assert rep[1] == 0x00
            cli.sendall(b"hello")
            assert _recv_exact(cli, 8) == b"ok:hello"
    finally:
        relay.stop()
        upstream.close()


def test_loopback_relay_handshake_timeout(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr("ombrabrowser.proxy._HANDSHAKE_TIMEOUT", 0.15)
    proxy = parse_proxy("socks5://u:p@127.0.0.1:9")
    relay = LoopbackProxyRelay(proxy)
    relay_url = relay.start()
    try:
        relay_port = int(relay_url.rsplit(":", 1)[1])
        with socket.create_connection(("127.0.0.1", relay_port), timeout=2) as cli:
            cli.settimeout(2)
            # Send incomplete greeting and verify relay closes stalled client cleanly.
            cli.sendall(b"\x05")
            assert cli.recv(16) == b""
    finally:
        relay.stop()
