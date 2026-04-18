#!/usr/bin/env python3
"""
Single-factor experiment: regenerate B4-Lean portraits with model='gpt-image-1.5'.

- Reads prompts verbatim from generated/portrait-eval/B4-Lean_20260418/*.prompt.txt
  (so the only variable vs that run is the model ID).
- Does NOT rebuild descriptions and does NOT re-apply the B4-Lean template.
- Saves to generated/portrait-eval/B4-Lean_gpt-image-1.5_20260418/.
- Concurrency 3, manifest.json with per-task status + elapsed.

If gpt-image-1.5 is not available on the account, this script errors out loudly
(no silent fallback to gpt-image-1).
"""
from __future__ import annotations

import asyncio
import base64
import json
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, List

HERE = Path(__file__).resolve()
ASSET_MANAGER_ROOT = HERE.parents[1]
BACKEND_DIR = ASSET_MANAGER_ROOT / "backend"
SCRIPTS_GA_DIR = ASSET_MANAGER_ROOT.parent.parent / "scripts"
SCRIPTS_DIR = ASSET_MANAGER_ROOT / "scripts"

try:
    from dotenv import load_dotenv
    env_path = BACKEND_DIR / ".env"
    if env_path.exists():
        load_dotenv(env_path)
    else:
        load_dotenv()
except Exception:
    pass

sys.path.insert(0, str(BACKEND_DIR))
sys.path.insert(0, str(SCRIPTS_GA_DIR))
sys.path.insert(0, str(SCRIPTS_DIR))

from PIL import Image  # noqa: E402
import generate_assets as ga  # noqa: E402
from eval_generate import OUTPUT_ROOT, get_openai_client, log  # noqa: E402

MODEL_ID = "gpt-image-1.5"
VERSION_TAG = f"B4-Lean_{MODEL_ID}"
RUN_DATE = "20260418"
SOURCE_DIR = OUTPUT_ROOT / "B4-Lean_20260418"  # prompts + descriptions source
OUT_DIR = OUTPUT_ROOT / f"{VERSION_TAG}_{RUN_DATE}"

CHARS = ["姜泥", "徐凤年", "李淳罡"]
VARIANTS = [1, 2]
SIZE = "1024x1536"
QUALITY = "high"
CONCURRENCY = 3
IMAGE_GENERATION_TIMEOUT_SECONDS = 240


@dataclass
class Task:
    character: str
    variant_index: int
    prompt: str
    png_path: Path
    prompt_path: Path
    desc_path: Path  # copy of description for reference, not regenerated


def generate_image_blocking(client, prompt: str) -> Image.Image:
    """Explicitly call gpt-image-1.5. Any API error propagates (no fallback)."""
    resp = client.images.generate(
        model=MODEL_ID,
        prompt=prompt,
        size=SIZE,
        quality=QUALITY,
        background="transparent",
        output_format="png",
        n=1,
    )
    image_bytes = base64.b64decode(resp.data[0].b64_json)
    return Image.open(BytesIO(image_bytes))


def run_single(client, t: Task) -> Dict[str, Any]:
    if t.png_path.exists():
        return {"status": "skipped", "task": t, "elapsed": 0.0}
    start = time.time()
    try:
        t.png_path.parent.mkdir(parents=True, exist_ok=True)
        # persist the prompt we actually sent (identical to source), for audit.
        t.prompt_path.write_text(t.prompt, encoding="utf-8")
        raw = generate_image_blocking(client, t.prompt)
        processed = ga.post_process(raw, "portrait")
        processed.save(str(t.png_path), format="PNG")
        return {"status": "ok", "task": t, "elapsed": time.time() - start}
    except Exception as exc:
        return {
            "status": "error",
            "task": t,
            "elapsed": time.time() - start,
            "error": f"{type(exc).__name__}: {exc}",
        }


async def run_all(tasks: List[Task]) -> List[Dict[str, Any]]:
    client = get_openai_client()
    loop = asyncio.get_running_loop()
    sem = asyncio.Semaphore(CONCURRENCY)
    results: List[Dict[str, Any]] = []

    with ThreadPoolExecutor(max_workers=CONCURRENCY) as pool:
        async def bound(t: Task):
            async with sem:
                log(f"→ [{MODEL_ID}] start {t.character} v{t.variant_index}")
                r = await loop.run_in_executor(pool, run_single, client, t)
                if r["status"] == "ok":
                    log(f"  ✓ {t.character} v{t.variant_index} saved in {r['elapsed']:.1f}s → {t.png_path.name}")
                elif r["status"] == "skipped":
                    log(f"  · skip {t.character} v{t.variant_index} (already exists)")
                else:
                    log(f"  ✗ {t.character} v{t.variant_index} FAILED in {r['elapsed']:.1f}s: {r.get('error')}")
                results.append(r)

        await asyncio.gather(*(bound(t) for t in tasks))
    return results


def main() -> int:
    if not SOURCE_DIR.exists():
        log(f"FATAL: source dir missing: {SOURCE_DIR}")
        return 3

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    log(f"=== {VERSION_TAG} run (6 images) ===")
    log(f"model       → {MODEL_ID}")
    log(f"prompts src → {SOURCE_DIR}")
    log(f"output      → {OUT_DIR}")

    tasks: List[Task] = []
    for c in CHARS:
        for v in VARIANTS:
            base = f"{c}_variant_{v}"
            src_prompt = SOURCE_DIR / f"{base}.prompt.txt"
            if not src_prompt.exists():
                log(f"FATAL: prompt file missing: {src_prompt}")
                return 3
            prompt_text = src_prompt.read_text(encoding="utf-8")
            tasks.append(Task(
                character=c,
                variant_index=v,
                prompt=prompt_text,
                png_path=OUT_DIR / f"{base}.png",
                prompt_path=OUT_DIR / f"{base}.prompt.txt",
                desc_path=OUT_DIR / f"{base}.description.txt",
            ))
            # optional: copy description for traceability (don't regenerate)
            src_desc = SOURCE_DIR / f"{base}.description.txt"
            if src_desc.exists() and not (OUT_DIR / f"{base}.description.txt").exists():
                (OUT_DIR / f"{base}.description.txt").write_text(
                    src_desc.read_text(encoding="utf-8"), encoding="utf-8"
                )

    started = time.time()
    results = asyncio.run(run_all(tasks))
    total_elapsed = time.time() - started

    manifest = {
        "version": VERSION_TAG,
        "date": RUN_DATE,
        "model": MODEL_ID,
        "size": SIZE,
        "quality": QUALITY,
        "concurrency": CONCURRENCY,
        "prompts_source": str(SOURCE_DIR.relative_to(ASSET_MANAGER_ROOT)),
        "total_elapsed_sec": round(total_elapsed, 2),
        "counts": {
            "ok": sum(1 for r in results if r["status"] == "ok"),
            "skipped": sum(1 for r in results if r["status"] == "skipped"),
            "error": sum(1 for r in results if r["status"] == "error"),
            "total": len(results),
        },
        "tasks": [
            {
                "character": r["task"].character,
                "variant": r["task"].variant_index,
                "png": r["task"].png_path.name,
                "prompt_file": r["task"].prompt_path.name,
                "description_file": r["task"].desc_path.name,
                "status": r["status"],
                "elapsed_sec": round(r.get("elapsed", 0.0), 2),
                "error": r.get("error"),
            }
            for r in results
        ],
    }
    (OUT_DIR / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    log(f"manifest.json → {OUT_DIR / 'manifest.json'}")
    log(f"ok={manifest['counts']['ok']} skipped={manifest['counts']['skipped']} "
        f"error={manifest['counts']['error']} total={manifest['counts']['total']} "
        f"wall={total_elapsed:.1f}s")
    return 0 if manifest["counts"]["error"] == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
