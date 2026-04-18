#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

import requests


WORKSPACE_ROOT = Path(__file__).resolve().parents[3]
ASSET_MANAGER_ROOT = WORKSPACE_ROOT / "tools" / "asset-manager"
BACKEND_ROOT = ASSET_MANAGER_ROOT / "backend"
LOG_DIR = ASSET_MANAGER_ROOT / "test-logs"
LOG_FILE = LOG_DIR / "generate_character_portraits.log"
PID_FILE = LOG_DIR / "backend.pid"
DEFAULT_BASE_URL = "http://127.0.0.1:8100"
REQUEST_TIMEOUT = 60
HEALTH_RETRY_SECONDS = 2
HEALTH_MAX_WAIT_SECONDS = 45
IMAGE_GENERATION_TIMEOUT_SECONDS = 240


@dataclass
class PipelineContext:
    base_url: str
    name: str
    bio: str
    output_dir: Path
    started_backend: bool = False
    backend_pid: Optional[int] = None


def log(message: str) -> None:
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] {message}"
    print(line, flush=True)
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    with LOG_FILE.open("a", encoding="utf-8") as handle:
        handle.write(line + "\n")


def request_json(method: str, url: str, payload: Optional[Dict[str, Any]] = None, timeout: int = REQUEST_TIMEOUT) -> Any:
    data = None
    headers = {"Accept": "application/json"}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = Request(url, data=data, method=method, headers=headers)
    try:
        with urlopen(req, timeout=timeout) as response:
            body = response.read().decode("utf-8")
            return json.loads(body) if body else None
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {url} failed: HTTP {exc.code} {detail}") from exc
    except URLError as exc:
        raise RuntimeError(f"{method} {url} failed: {exc}") from exc


def stream_sse_json(url: str, payload: Dict[str, Any], timeout: int = IMAGE_GENERATION_TIMEOUT_SECONDS) -> List[Dict[str, Any]]:
    events: List[Dict[str, Any]] = []
    try:
        with requests.post(
            url,
            json=payload,
            headers={"Accept": "text/event-stream"},
            stream=True,
            timeout=(REQUEST_TIMEOUT, timeout),
        ) as response:
            response.raise_for_status()
            for raw_line in response.iter_lines(decode_unicode=True):
                if not raw_line or not raw_line.startswith("data:"):
                    continue
                payload_text = raw_line[5:].lstrip()
                if payload_text:
                    events.append(json.loads(payload_text))
    except requests.HTTPError as exc:
        detail = exc.response.text if exc.response is not None else str(exc)
        raise RuntimeError(f"POST {url} failed: {detail}") from exc
    except requests.RequestException as exc:
        raise RuntimeError(f"POST {url} failed: {exc}") from exc
    return events


def check_openai_key() -> None:
    env_path = BACKEND_ROOT / ".env"
    has_env_file = env_path.exists()
    has_process_key = bool(os.environ.get("OPENAI_API_KEY"))
    if not has_env_file and not has_process_key:
        raise RuntimeError("Missing OPENAI_API_KEY: backend .env not found and current process has no OPENAI_API_KEY.")
    log(f"OPENAI_API_KEY source check passed (process={has_process_key}, backend_env={has_env_file}).")


def ensure_output_dir(output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    for png in output_dir.glob("*.png"):
        png.unlink()
    log(f"Prepared output directory: {output_dir}")


def is_backend_healthy(base_url: str) -> bool:
    try:
        result = request_json("GET", f"{base_url}/api/health", timeout=5)
    except Exception:
        return False
    return isinstance(result, dict) and result.get("status") == "ok"


def start_backend_if_needed(ctx: PipelineContext) -> None:
    if is_backend_healthy(ctx.base_url):
        log(f"Backend already healthy at {ctx.base_url}")
        return
    log("Backend not running, starting uvicorn in background.")
    env = os.environ.copy()
    python_path = env.get("PYTHONPATH", "")
    env["PYTHONPATH"] = str(BACKEND_ROOT) if not python_path else f"{BACKEND_ROOT}:{python_path}"
    stdout_handle = LOG_FILE.open("a", encoding="utf-8")
    process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8100"],
        cwd=str(BACKEND_ROOT),
        stdout=stdout_handle,
        stderr=subprocess.STDOUT,
        env=env,
    )
    ctx.started_backend = True
    ctx.backend_pid = process.pid
    PID_FILE.write_text(str(process.pid), encoding="utf-8")
    deadline = time.time() + HEALTH_MAX_WAIT_SECONDS
    while time.time() < deadline:
        if process.poll() is not None:
            raise RuntimeError(f"Backend exited early with code {process.returncode}. Check {LOG_FILE}")
        if is_backend_healthy(ctx.base_url):
            log(f"Started backend PID={process.pid} at {ctx.base_url}")
            return
        time.sleep(HEALTH_RETRY_SECONDS)
    raise RuntimeError(f"Backend did not become healthy within {HEALTH_MAX_WAIT_SECONDS}s. Check {LOG_FILE}")


def cleanup_existing_character(ctx: PipelineContext) -> None:
    encoded = quote(ctx.name, safe="")
    try:
        request_json("DELETE", f"{ctx.base_url}/api/characters/{encoded}", timeout=REQUEST_TIMEOUT)
        log(f"Archived existing character: {ctx.name}")
    except RuntimeError as exc:
        if "HTTP 404" in str(exc):
            log(f"No existing character to archive: {ctx.name}")
            return
        raise


def create_character(ctx: PipelineContext) -> None:
    try:
        result = request_json(
            "POST",
            f"{ctx.base_url}/api/characters",
            payload={"name": ctx.name, "bio": ctx.bio},
            timeout=180,
        )
        variants = result.get("character", {}).get("variants", [])
        if len(variants) != 4:
            raise RuntimeError(f"Expected 4 variants after character creation, got {len(variants)}")
        log(f"Created character {ctx.name} with 4 variants.")
    except RuntimeError as exc:
        if "HTTP 409" not in str(exc):
            raise
        log(f"Character {ctx.name} already exists, reusing it for generation.")


def generate_descriptions(ctx: PipelineContext) -> List[str]:
    encoded = quote(ctx.name, safe="")
    result = request_json(
        "POST",
        f"{ctx.base_url}/api/characters/{encoded}/regenerate-variants",
        payload={"bio": ctx.bio},
        timeout=180,
    )
    descriptions = result.get("descriptions", [])
    if len(descriptions) != 4:
        raise RuntimeError(f"Expected 4 regenerated descriptions, got {len(descriptions)}")
    log(f"Generated 4 descriptions for {ctx.name}.")
    return descriptions


def generate_images(ctx: PipelineContext, descriptions: List[str]) -> List[Dict[str, Any]]:
    all_images: List[Dict[str, Any]] = []
    for index, description in enumerate(descriptions, start=1):
        log(f"Generating image for variant {index}/4")
        events = stream_sse_json(
            f"{ctx.base_url}/api/generate",
            payload={"asset_type": "portrait", "name": ctx.name, "description": description, "count": 1},
            timeout=IMAGE_GENERATION_TIMEOUT_SECONDS,
        )
        done_event = None
        for event in events:
            event_type = event.get("type")
            if event_type == "progress":
                log(f"SSE progress variant {index}: {event.get('message')}")
            elif event_type == "error":
                raise RuntimeError(f"Image generation failed for variant {index}: {event.get('message')}")
            elif event_type == "done":
                done_event = event
        if not done_event:
            raise RuntimeError(f"No done event received for variant {index}")
        images = done_event.get("images", [])
        if len(images) != 1:
            raise RuntimeError(f"Expected 1 image for variant {index}, got {len(images)}")
        all_images.extend(images)
        log(f"Variant {index} image generated: {images[0]['path']}")
    if len(all_images) != 4:
        raise RuntimeError(f"Expected 4 generated images total, got {len(all_images)}")
    return all_images


def collect_results(ctx: PipelineContext, images: List[Dict[str, Any]]) -> List[Path]:
    saved_paths: List[Path] = []
    for index, image in enumerate(images, start=1):
        source_path = WORKSPACE_ROOT / "scripts" / "samples" / image["path"]
        if not source_path.exists():
            raise RuntimeError(f"Generated image not found on disk: {source_path}")
        target_path = ctx.output_dir / f"{ctx.name}_variant_{index}.png"
        shutil.copy2(source_path, target_path)
        saved_paths.append(target_path)
        log(f"Saved variant {index} image to {target_path}")
    return saved_paths


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate character portraits through the asset-manager backend.")
    parser.add_argument("--name", required=True, help="Character name")
    parser.add_argument("--bio", default="", help="Optional character bio")
    parser.add_argument("--output", required=True, help="Directory to save 4 generated portraits")
    parser.add_argument("--base-url", default=os.environ.get("ASSET_MANAGER_BASE_URL", DEFAULT_BASE_URL), help="Asset manager backend base URL")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    LOG_FILE.write_text("", encoding="utf-8")
    ctx = PipelineContext(
        base_url=args.base_url,
        name=args.name,
        bio=args.bio,
        output_dir=Path(args.output).expanduser(),
    )
    try:
        log("Step 1/6: validating environment")
        check_openai_key()
        ensure_output_dir(ctx.output_dir)

        log("Step 2/6: ensuring backend availability")
        start_backend_if_needed(ctx)

        log("Step 3/6: cleaning previous character artifacts")
        cleanup_existing_character(ctx)

        log("Step 4/6: creating character")
        create_character(ctx)

        log("Step 5/6: generating descriptions")
        descriptions = generate_descriptions(ctx)

        log("Step 6/6: generating images and saving outputs")
        images = generate_images(ctx, descriptions)
        collect_results(ctx, images)
        log("Pipeline completed successfully.")
        return 0
    except Exception as exc:
        log(f"Pipeline failed: {exc}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())