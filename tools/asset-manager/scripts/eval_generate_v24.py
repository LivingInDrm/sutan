#!/usr/bin/env python3
"""
v2.4 portrait eval driver: 扩展到 9 角色 × 2 variants，支持 B4.3 vs B4.4 单因子对照。

区别于 eval_generate.py:
  - 读取 test_set_extended.yaml（9 角色，每角色 2 variants）
  - 老角色（5 个）的 description 从已有 v1_20260418 目录读取（与 B4.3 所用完全一致，保证单因子）
  - 新角色（4 个）的 description 从 scripts/batch_config.json variant 1/2 读取
  - 支持 --templates-from 覆盖 templates
  - 支持 --only-new 只跑新角色（B4.3 extended 时用）

输出目录同 eval_generate.py 约定：generated/portrait-eval/{version}_{date}/
"""
from __future__ import annotations

import argparse
import asyncio
import base64
import html
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import datetime
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml

HERE = Path(__file__).resolve()
ASSET_MANAGER_ROOT = HERE.parents[1]
TOOLS_ROOT = ASSET_MANAGER_ROOT.parent
PROJECT_ROOT = TOOLS_ROOT.parent
BACKEND_DIR = ASSET_MANAGER_ROOT / "backend"
SCRIPTS_GA_DIR = PROJECT_ROOT / "scripts"

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

from PIL import Image  # noqa: E402
import generate_assets as ga  # noqa: E402
import shared as shared_ctx  # noqa: E402
from services.characters import _build_custom_prompt  # noqa: E402

TEST_SET_PATH = ASSET_MANAGER_ROOT / "tests" / "portrait-eval" / "test_set_extended.yaml"
OUTPUT_ROOT = ASSET_MANAGER_ROOT / "generated" / "portrait-eval"
LOG_DIR = ASSET_MANAGER_ROOT / "test-logs"
LOG_FILE = LOG_DIR / "eval_generate_v24.log"
BATCH_CONFIG_PATH = PROJECT_ROOT / "scripts" / "batch_config.json"
LEGACY_DESC_DIR = OUTPUT_ROOT / "v1_20260418"  # 老角色 descriptions 单一来源

GPT_IMAGE_PORTRAIT_SIZE = "1024x1536"

OLD_CHARS = {"徐凤年", "老黄", "温华", "姜泥", "李淳罡"}


def log(msg: str) -> None:
    ts = time.strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line, flush=True)
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    with LOG_FILE.open("a", encoding="utf-8") as f:
        f.write(line + "\n")


@dataclass
class EvalTask:
    character: str
    variant_index: int
    description: str
    prompt: str
    png_path: Path
    desc_path: Path
    prompt_path: Path


def get_openai_client():
    key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not key:
        raise RuntimeError("OPENAI_API_KEY is not set.")
    from openai import OpenAI
    return OpenAI(api_key=key)


def load_test_set() -> Dict[str, Any]:
    with TEST_SET_PATH.open("r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def resolve_old_char_desc(name: str, variant: int) -> str:
    p = LEGACY_DESC_DIR / f"{name}_variant_{variant}.description.txt"
    if not p.exists():
        raise FileNotFoundError(f"missing legacy description: {p}")
    return p.read_text(encoding="utf-8").strip()


def resolve_new_char_desc(name: str, variant: int) -> str:
    """Pick the nth portrait entry for `name` from batch_config.json."""
    with BATCH_CONFIG_PATH.open("r", encoding="utf-8") as f:
        data = json.load(f)
    items = [x for x in data if x.get("name") == name and x.get("type") == "portrait"]
    if len(items) < variant:
        raise RuntimeError(f"batch_config has only {len(items)} portraits for {name}, need {variant}")
    return (items[variant - 1].get("description") or "").strip()


def generate_image_blocking(client, prompt: str, quality: str) -> Image.Image:
    resp = client.images.generate(
        model="gpt-image-1",
        prompt=prompt,
        size=GPT_IMAGE_PORTRAIT_SIZE,
        quality=quality,
        background="transparent",
        output_format="png",
        n=1,
    )
    image_bytes = base64.b64decode(resp.data[0].b64_json)
    return Image.open(BytesIO(image_bytes))


def run_single_task(client, task: EvalTask, quality: str) -> Dict[str, Any]:
    if task.png_path.exists():
        return {"status": "skipped", "task": task, "elapsed": 0.0}
    start = time.time()
    try:
        task.desc_path.parent.mkdir(parents=True, exist_ok=True)
        task.desc_path.write_text(task.description, encoding="utf-8")
        task.prompt_path.write_text(task.prompt, encoding="utf-8")
        raw_img = generate_image_blocking(client, task.prompt, quality=quality)
        processed = ga.post_process(raw_img, "portrait")
        processed.save(str(task.png_path), format="PNG")
        return {"status": "ok", "task": task, "elapsed": time.time() - start}
    except Exception as exc:
        return {"status": "error", "task": task, "elapsed": time.time() - start, "error": str(exc)}


async def run_all(tasks: List[EvalTask], quality: str, concurrency: int) -> List[Dict[str, Any]]:
    client = get_openai_client()
    loop = asyncio.get_running_loop()
    sem = asyncio.Semaphore(concurrency)
    results: List[Dict[str, Any]] = []

    with ThreadPoolExecutor(max_workers=concurrency) as pool:
        async def bound_run(t: EvalTask):
            async with sem:
                log(f"→ start {t.character} variant {t.variant_index}")
                result = await loop.run_in_executor(pool, run_single_task, client, t, quality)
                if result["status"] == "ok":
                    log(f"  ✓ {t.character} v{t.variant_index} saved in {result['elapsed']:.1f}s")
                elif result["status"] == "skipped":
                    log(f"  · skip {t.character} v{t.variant_index}")
                else:
                    log(f"  ✗ {t.character} v{t.variant_index} FAILED: {result.get('error')}")
                results.append(result)

        await asyncio.gather(*(bound_run(t) for t in tasks))
    return results


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--version", required=True)
    p.add_argument("--date", default=None)
    p.add_argument("--concurrency", type=int, default=4)
    p.add_argument("--low-res", action="store_true")
    p.add_argument("--templates-from", default=None,
                   help="override templates.json for this run only")
    p.add_argument("--only-new", action="store_true",
                   help="skip old characters (used for B4.3 extended)")
    p.add_argument("--only-chars", default=None,
                   help="comma-separated character subset to run (overrides --only-new)")
    return p.parse_args()


def main() -> int:
    args = parse_args()
    run_date = args.date or datetime.now().strftime("%Y%m%d")
    out_dir = OUTPUT_ROOT / f"{args.version}_{run_date}"
    out_dir.mkdir(parents=True, exist_ok=True)

    if args.templates_from:
        tpath = Path(args.templates_from).resolve()
        if not tpath.exists():
            log(f"FATAL: --templates-from not found: {tpath}")
            return 3
        shared_ctx.TEMPLATES_CONFIG_PATH = tpath
        log(f"templates override → {tpath}")

    test_set = load_test_set()
    characters_cfg = test_set["characters"]
    variants_per = int(test_set.get("variants_per_character", 2))

    if args.only_chars:
        subset = {x.strip() for x in args.only_chars.split(",") if x.strip()}
        characters_cfg = [c for c in characters_cfg if c["name"] in subset]
    elif args.only_new:
        characters_cfg = [c for c in characters_cfg if c["name"] not in OLD_CHARS]

    character_names = [c["name"] for c in characters_cfg]
    log(f"=== v2.4 portrait eval run ===")
    log(f"version={args.version} date={run_date} concurrency={args.concurrency} low_res={args.low_res}")
    log(f"characters={character_names} variants_per={variants_per}")
    log(f"output_dir={out_dir}")

    tasks: List[EvalTask] = []
    for cfg in characters_cfg:
        name = cfg["name"]
        for v in range(1, variants_per + 1):
            if name in OLD_CHARS:
                desc = resolve_old_char_desc(name, v)
            else:
                desc = resolve_new_char_desc(name, v)
            prompt = _build_custom_prompt("portrait", name, desc)
            base = f"{name}_variant_{v}"
            tasks.append(EvalTask(
                character=name,
                variant_index=v,
                description=desc,
                prompt=prompt,
                png_path=out_dir / f"{base}.png",
                desc_path=out_dir / f"{base}.description.txt",
                prompt_path=out_dir / f"{base}.prompt.txt",
            ))

    quality = "low" if args.low_res else "high"
    started = time.time()
    results = asyncio.run(run_all(tasks, quality=quality, concurrency=args.concurrency))
    total_elapsed = time.time() - started

    manifest = {
        "version": args.version,
        "date": run_date,
        "quality": quality,
        "concurrency": args.concurrency,
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
                "png": str(r["task"].png_path.relative_to(out_dir)),
                "description_file": str(r["task"].desc_path.relative_to(out_dir)),
                "prompt_file": str(r["task"].prompt_path.relative_to(out_dir)),
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
    log(f"manifest → {out_dir / 'manifest.json'}")
    log(f"ok={manifest['counts']['ok']} skipped={manifest['counts']['skipped']} error={manifest['counts']['error']} total={manifest['counts']['total']} wall={total_elapsed:.1f}s")
    return 0 if manifest["counts"]["error"] == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
