#!/usr/bin/env python3
"""
Minimal driver: generate B4-Lean portraits for 3 characters × 2 variants = 6 images.
- Reuses descriptions from v1_20260418 (single-factor experiment).
- Redirects shared_ctx.TEMPLATES_CONFIG_PATH to v2_B4-Lean_templates.json.
- Saves to generated/portrait-eval/B4-Lean_20260418/.
"""
from __future__ import annotations

import asyncio
import json
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from pathlib import Path

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

import shared as shared_ctx  # noqa: E402

# Redirect templates to B4-Lean BEFORE importing services.characters
TEMPLATES_OVERRIDE = ASSET_MANAGER_ROOT / "prompts" / "experiments" / "v2_B4-Lean_templates.json"
assert TEMPLATES_OVERRIDE.exists(), f"missing {TEMPLATES_OVERRIDE}"
shared_ctx.TEMPLATES_CONFIG_PATH = TEMPLATES_OVERRIDE

from services.characters import _build_custom_prompt  # noqa: E402
from eval_generate import (  # noqa: E402
    EvalTask, get_openai_client, run_all, OUTPUT_ROOT, log, build_summary_html,
)

VERSION = "B4-Lean"
RUN_DATE = "20260418"
CHARS = ["姜泥", "徐凤年", "李淳罡"]
VARIANTS = [1, 2]
SOURCE_DESC_DIR = OUTPUT_ROOT / "v1_20260418"


def main() -> int:
    out_dir = OUTPUT_ROOT / f"{VERSION}_{RUN_DATE}"
    out_dir.mkdir(parents=True, exist_ok=True)

    log(f"=== {VERSION} run (6 images) ===")
    log(f"templates -> {TEMPLATES_OVERRIDE}")
    log(f"descriptions source -> {SOURCE_DESC_DIR}")
    log(f"output -> {out_dir}")

    tasks = []
    for c in CHARS:
        for v in VARIANTS:
            desc_path = SOURCE_DESC_DIR / f"{c}_variant_{v}.description.txt"
            desc = desc_path.read_text(encoding="utf-8").strip()
            prompt = _build_custom_prompt("portrait", c, desc)
            base = f"{c}_variant_{v}"
            tasks.append(EvalTask(
                character=c, variant_index=v,
                description=desc, prompt=prompt,
                png_path=out_dir / f"{base}.png",
                desc_path=out_dir / f"{base}.description.txt",
                prompt_path=out_dir / f"{base}.prompt.txt",
            ))

    started = time.time()
    results = asyncio.run(run_all(tasks, quality="high", concurrency=3))
    total_elapsed = time.time() - started

    results_by_task = {(r["task"].character, r["task"].variant_index): r for r in results}

    manifest = {
        "version": VERSION,
        "date": RUN_DATE,
        "quality": "high",
        "concurrency": 3,
        "templates_file": str(TEMPLATES_OVERRIDE.relative_to(ASSET_MANAGER_ROOT)),
        "descriptions_source": str(SOURCE_DESC_DIR.relative_to(ASSET_MANAGER_ROOT)),
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
                "description_file": r["task"].desc_path.name,
                "prompt_file": r["task"].prompt_path.name,
                "status": r["status"],
                "elapsed_sec": round(r.get("elapsed", 0.0), 2),
                "error": r.get("error"),
            }
            for r in results
        ],
    }
    (out_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    summary_path = build_summary_html(
        out_dir, VERSION, RUN_DATE, CHARS, results_by_task, tasks,
        quality="high", concurrency=3, total_elapsed=total_elapsed,
    )
    log(f"summary.html -> {summary_path}")
    log(f"manifest.json -> {out_dir / 'manifest.json'}")
    log(f"ok={manifest['counts']['ok']} skipped={manifest['counts']['skipped']} "
        f"error={manifest['counts']['error']} total={manifest['counts']['total']} "
        f"wall={total_elapsed:.1f}s")
    return 0 if manifest["counts"]["error"] == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
