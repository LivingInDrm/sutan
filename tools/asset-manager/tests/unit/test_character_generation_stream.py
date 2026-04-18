import asyncio
import importlib
import json
import sys
from pathlib import Path


def _load_characters_module():
    backend_dir = Path(__file__).resolve().parents[2] / "backend"
    if str(backend_dir) not in sys.path:
        sys.path.insert(0, str(backend_dir))
    return importlib.import_module("services.characters")


class _DoneReader:
    def __init__(self, chunks):
        self._chunks = chunks
        self._index = 0

    async def read(self):
        if self._index >= len(self._chunks):
            return {"done": True, "value": None}
        value = self._chunks[self._index]
        self._index += 1
        return {"done": False, "value": value}


async def _collect_streaming_body(response):
    chunks = []
    async for chunk in response.body_iterator:
      chunks.append(chunk.decode() if isinstance(chunk, bytes) else chunk)
    return "".join(chunks)


def test_generate_images_emits_error_field_on_failure(shared_module, monkeypatch):
    characters = _load_characters_module()
    monkeypatch.setattr(characters, "_build_custom_prompt", lambda *args: "prompt")

    def _boom(*args, **kwargs):
        raise RuntimeError("upstream failed")

    monkeypatch.setattr(characters, "_generate_single_blocking", _boom)

    body = characters.GenerateRequest(asset_type="portrait", name="测试角色", description="desc", count=1)
    response = asyncio.run(characters.generate_images(body))

    payload = asyncio.run(_collect_streaming_body(response))
    events = [line[6:] for line in payload.splitlines() if line.startswith("data: ")]
    error_event = next(json.loads(event) for event in events if json.loads(event)["type"] == "error")

    assert error_event["error"] == "Failed to generate image 1: upstream failed"
    assert error_event["message"] == "Failed to generate image 1: upstream failed"


def test_generate_images_emits_timeout_error(shared_module, monkeypatch):
    characters = _load_characters_module()
    monkeypatch.setattr(characters, "_build_custom_prompt", lambda *args: "prompt")

    async def _timeout(awaitable, timeout):
        raise asyncio.TimeoutError()

    monkeypatch.setattr(asyncio, "wait_for", _timeout)

    def _never_returns(*args, **kwargs):
        return None

    monkeypatch.setattr(characters, "_generate_single_blocking", _never_returns)

    body = characters.GenerateRequest(asset_type="portrait", name="测试角色", description="desc", count=1)
    response = asyncio.run(characters.generate_images(body))

    payload = asyncio.run(_collect_streaming_body(response))
    events = [line[6:] for line in payload.splitlines() if line.startswith("data: ")]
    error_event = next(json.loads(event) for event in events if json.loads(event)["type"] == "error")

    assert "timed out" in error_event["error"]