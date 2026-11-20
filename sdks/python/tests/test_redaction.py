"""Credential-safe errors and download diagnostics use only fake secrets."""

from contextlib import contextmanager
from pathlib import Path

import httpx
import pytest

from ombrabrowser.binary import _http_download_file
from ombrabrowser.errors import DownloadFailedError


@pytest.mark.parametrize("userinfo", ["fake-user:fake-password", ":fake-password", "fake-user:", "fake-user"])
def test_error_masks_url_credentials(userinfo: str):
    url = f"https://{userinfo}@mirror.invalid/engine.zip"
    error = DownloadFailedError(f"Failed downloading {url}", details={"urls": [url]})

    for diagnostic in (str(error), repr(error), repr(error.details)):
        assert "fake-user" not in diagnostic
        assert "fake-password" not in diagnostic
        assert "mirror.invalid/engine.zip" in diagnostic


@pytest.mark.parametrize("userinfo", ["fake-user:fake-password", ":fake-password"])
def test_download_info_log_masks_url_credentials(
    userinfo: str, tmp_path: Path, monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
):
    url = f"https://{userinfo}@mirror.invalid/engine.zip"

    @contextmanager
    def stream(method, request_url, **kwargs):
        assert method == "GET" and request_url == url
        yield httpx.Response(200, content=b"engine", request=httpx.Request(method, request_url))

    monkeypatch.setattr(httpx, "stream", stream)
    destination = tmp_path / "engine.zip"
    with caplog.at_level("INFO", logger="ombrabrowser"):
        _http_download_file(url, destination, expected_size=6)

    assert destination.read_bytes() == b"engine"
    assert "mirror.invalid/engine.zip" in caplog.text
    assert "fake-user" not in caplog.text
    assert "fake-password" not in caplog.text
