"""GeoIP regressions with external HTTP/database boundaries stubbed."""

from __future__ import annotations

import errno
import os
import sys
import types
from contextlib import contextmanager
from pathlib import Path

import httpx
import pytest

from ombrabrowser import geoip
from ombrabrowser.errors import ProxyError


@pytest.fixture
def fake_geoip_database(monkeypatch):
    class Reader:
        def __init__(self, path):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def city(self, ip):
            return types.SimpleNamespace(
                location=types.SimpleNamespace(time_zone="Europe/Paris"),
                country=types.SimpleNamespace(iso_code="FR"),
            )

    database = types.ModuleType("geoip2.database")
    database.Reader = Reader
    package = types.ModuleType("geoip2")
    package.database = database
    monkeypatch.setitem(sys.modules, "geoip2", package)
    monkeypatch.setitem(sys.modules, "geoip2.database", database)
    monkeypatch.setattr(geoip, "_ensure_geoip_db", lambda: Path("fake.mmdb"))


@pytest.mark.parametrize("proxy_url", ["http://8.8.8.8:8080", None])
def test_failed_exit_probes_never_return_gateway(monkeypatch, fake_geoip_database, proxy_url):
    def fail_probe(*args, **kwargs):
        raise httpx.ConnectError("probe unavailable")

    monkeypatch.setattr(httpx, "get", fail_probe)
    with pytest.raises(ProxyError, match="could not discover egress IP"):
        geoip.resolve_proxy_geo_with_ip(proxy_url)


def test_successful_exit_probe_preserves_geoip_tuple(monkeypatch, fake_geoip_database):
    monkeypatch.setattr(httpx, "get", lambda *args, **kwargs: httpx.Response(
        200, text="1.1.1.1\n", request=httpx.Request("GET", "https://example.test")
    ))
    assert geoip.resolve_proxy_geo_with_ip("http://8.8.8.8:8080") == (
        "Europe/Paris", "fr-FR", "1.1.1.1"
    )


@pytest.mark.parametrize("failure", ["connect", "status", "body", None])
def test_database_download_owns_temporary_resources(tmp_path, monkeypatch, failure):
    dest = tmp_path / "geoip" / "city.mmdb"
    dest.parent.mkdir()
    dest.write_bytes(b"previous database")
    temporary = []
    real_mkstemp = geoip.tempfile.mkstemp

    def record_mkstemp(**kwargs):
        fd, name = real_mkstemp(**kwargs)
        temporary.append((fd, Path(name)))
        return fd, name

    @contextmanager
    def stream(*args, **kwargs):
        if failure == "connect":
            raise httpx.ConnectError("connection failed")
        response = httpx.Response(
            503 if failure == "status" else 200,
            request=httpx.Request("GET", geoip.GEOIP_DB_URL),
        )

        def chunks(**kwargs):
            yield b"new database"
            if failure == "body":
                raise httpx.ReadError("interrupted")

        response.iter_bytes = chunks
        yield response

    monkeypatch.setattr(geoip.tempfile, "mkstemp", record_mkstemp)
    monkeypatch.setattr(httpx, "stream", stream)
    try:
        if failure:
            with pytest.raises(httpx.HTTPError):
                geoip._download_geoip_db(dest)
        else:
            geoip._download_geoip_db(dest)
        assert dest.read_bytes() == (b"previous database" if failure else b"new database")
        assert len(temporary) == 1
        fd, path = temporary[0]
        assert not path.exists()
        with pytest.raises(OSError) as error:
            os.fstat(fd)
        assert error.value.errno == errno.EBADF
    finally:
        # Keep the RED run from leaking the descriptor it detects.
        for fd, path in temporary:
            try:
                os.close(fd)
            except OSError:
                pass
            path.unlink(missing_ok=True)
