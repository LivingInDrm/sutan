#!/usr/bin/env python3
"""
M1 立绘评估批量生成脚本。

用法：
  python eval_generate.py --version v0 [--low-res] [--concurrency 4] [--date 20260417]

特性：
- 从 tools/asset-manager/tests/portrait-eval/test_set.yaml 读取 5 角色 × 4 variants。
- 复用 backend 的 `_build_custom_prompt` 和 `_generate_descriptions_blocking`（不改任何现有 prompt）。
- 输出到 tools/asset-manager/generated/portrait-eval/{version}_{YYYYMMDD}/
  每个 variant 产出 3 个文件：
      {name}_variant_{N}.png
      {name}_variant_{N}.description.txt   # LLM 产出的 description 原文（不含外层模板）
      {name}_variant_{N}.prompt.txt        # 最终 assembled prompt（外层 style_base + description）
- --low-res 把 `quality` 切到 "low"，成本/耗时显著下降，用于快速预览。
- 异步并发（asyncio + thread pool），默认并发 4。
- 断点续跑：已有 {name}_variant_{N}.png 的任务自动跳过。
- 完成后生成 {version}_{YYYYMMDD}_summary.html（4 行 × 5 列 网格 + 折叠 description / prompt 面板）。

**严格约束**：本脚本不修改任何生产 prompt 或模板，只读取并组合。
"""
from __future__ import annotations

import argparse
import asyncio
import base64
import html
import json
import os
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import datetime
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml

# Resolve paths: this script lives at tools/asset-manager/scripts/eval_generate.py
HERE = Path(__file__).resolve()
ASSET_MANAGER_ROOT = HERE.parents[1]
TOOLS_ROOT = ASSET_MANAGER_ROOT.parent
PROJECT_ROOT = TOOLS_ROOT.parent
BACKEND_DIR = ASSET_MANAGER_ROOT / "backend"
SCRIPTS_GA_DIR = PROJECT_ROOT / "scripts"

# Load .env from backend/.env if present (so OPENAI_API_KEY is picked up).
try:
    from dotenv import load_dotenv
    env_path = BACKEND_DIR / ".env"
    if env_path.exists():
        load_dotenv(env_path)
    else:
        load_dotenv()
except Exception:
    pass

# Make backend modules importable (shared, services.*, generate_assets).
sys.path.insert(0, str(BACKEND_DIR))
sys.path.insert(0, str(SCRIPTS_GA_DIR))

from PIL import Image  # noqa: E402
import generate_assets as ga  # noqa: E402
import shared as shared_ctx  # noqa: E402
from services.characters import _build_custom_prompt, _generate_descriptions_blocking  # noqa: E402

TEST_SET_PATH = ASSET_MANAGER_ROOT / "tests" / "portrait-eval" / "test_set.yaml"
OUTPUT_ROOT = ASSET_MANAGER_ROOT / "generated" / "portrait-eval"
LOG_DIR = ASSET_MANAGER_ROOT / "test-logs"
LOG_FILE = LOG_DIR / "eval_generate.log"

GPT_IMAGE_PORTRAIT_SIZE = "1024x1536"
IMAGE_GENERATION_TIMEOUT_SECONDS = 240


# ──────────────────────────────── logging ────────────────────────────────
def log(msg: str) -> None:
    ts = time.strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line, flush=True)
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    with LOG_FILE.open("a", encoding="utf-8") as f:
        f.write(line + "\n")


# ──────────────────────────────── data ────────────────────────────────
@dataclass
class EvalTask:
    character: str
    variant_index: int          # 1-based
    description: str            # LLM-produced raw description text
    prompt: str                 # assembled final prompt
    png_path: Path
    desc_path: Path
    prompt_path: Path


def load_test_set() -> Dict[str, Any]:
    with TEST_SET_PATH.open("r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def get_openai_client():
    key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not key:
        raise RuntimeError("OPENAI_API_KEY is not set. Populate backend/.env or export it.")
    from openai import OpenAI
    return OpenAI(api_key=key)


# ──────────────────────────────── description resolution ────────────────────────────────
def resolve_descriptions(
    client,
    character_name: str,
    count: int = 4,
    reuse_existing: bool = True,
) -> List[str]:
    """Return 4 description strings for `character_name`.

    Strategy:
      1. If `reuse_existing` and batch_config.json already has >=4 variants for the
         character, reuse them as-is (this matches `characters.py` behaviour because
         `regenerate_variants` also reads from batch_config when generating images).
      2. Otherwise, call the existing `_generate_descriptions_blocking` to produce 4.
    """
    if reuse_existing:
        try:
            items = shared_ctx._read_batch_config()
            existing = [
                item.get("description", "")
                for item in items
                if item.get("name") == character_name and item.get("type") == "portrait"
            ]
            existing = [d for d in existing if d.strip()]
            if len(existing) >= count:
                log(f"[{character_name}] reused {count} existing descriptions from batch_config.json")
                return existing[:count]
        except Exception as exc:
            log(f"[{character_name}] could not read existing descriptions: {exc}; falling back to LLM.")
    # Fall back to LLM generation (uses current _DESCRIPTION_SYSTEM_PROMPT unchanged).
    log(f"[{character_name}] generating {count} descriptions via LLM ({shared_ctx.DESCRIPTION_MODEL})…")
    descs = _generate_descriptions_blocking(client, character_name, bio="")
    return descs[:count]


# ──────────────────────────────── image generation ────────────────────────────────
def generate_image_blocking(client, prompt: str, quality: str) -> Image.Image:
    """Call gpt-image-1 directly so we can choose quality=low for cheap preview runs."""
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
    """Blocking worker. Returns a status dict."""
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
        elapsed = time.time() - start
        return {"status": "ok", "task": task, "elapsed": elapsed}
    except Exception as exc:
        elapsed = time.time() - start
        return {"status": "error", "task": task, "elapsed": elapsed, "error": str(exc)}


async def run_all(
    tasks: List[EvalTask],
    quality: str,
    concurrency: int,
) -> List[Dict[str, Any]]:
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
                    log(f"  ✓ {t.character} v{t.variant_index} saved in {result['elapsed']:.1f}s → {t.png_path.name}")
                elif result["status"] == "skipped":
                    log(f"  · skip {t.character} v{t.variant_index} (already exists)")
                else:
                    log(f"  ✗ {t.character} v{t.variant_index} FAILED in {result['elapsed']:.1f}s: {result.get('error')}")
                results.append(result)

        await asyncio.gather(*(bound_run(t) for t in tasks))
    return results


# ──────────────────────────────── summary html ────────────────────────────────
def build_summary_html(
    out_dir: Path,
    version: str,
    run_date: str,
    characters: List[str],
    results_by_task: Dict[tuple, Dict[str, Any]],
    tasks: List[EvalTask],
    quality: str,
    concurrency: int,
    total_elapsed: float,
) -> Path:
    """Render a 4×N grid HTML (rows = variants 1-4, columns = characters)."""
    # Build lookup: (character, variant) -> task + status
    grid_cols = len(characters)
    grid_rows = max(t.variant_index for t in tasks)

    def cell_html(character: str, variant: int) -> str:
        task = next(
            (t for t in tasks if t.character == character and t.variant_index == variant),
            None,
        )
        if task is None:
            return "<td class='cell empty'>—</td>"
        rel_png = task.png_path.name
        desc = task.description
        prompt = task.prompt
        status_info = results_by_task.get((character, variant), {})
        status = status_info.get("status", "unknown")
        err_html = ""
        if status == "error":
            err_html = f"<div class='err'>ERROR: {html.escape(status_info.get('error',''))}</div>"
        elapsed = status_info.get("elapsed", 0.0)
        img_html = (
            f"<img src='{html.escape(rel_png)}' alt='{html.escape(character)} v{variant}'/>"
            if task.png_path.exists()
            else "<div class='missing'>[no image]</div>"
        )
        return f"""
<td class='cell'>
  <div class='label'>{html.escape(character)} · variant {variant} <span class='meta'>({status}, {elapsed:.1f}s)</span></div>
  {img_html}
  {err_html}
  <details><summary>description</summary><pre>{html.escape(desc)}</pre></details>
  <details><summary>final prompt</summary><pre>{html.escape(prompt)}</pre></details>
</td>"""

    header_row = "<tr><th></th>" + "".join(f"<th>{html.escape(c)}</th>" for c in characters) + "</tr>"
    body_rows = ""
    for v in range(1, grid_rows + 1):
        body_rows += f"<tr><th class='row-head'>variant {v}</th>"
        for c in characters:
            body_rows += cell_html(c, v)
        body_rows += "</tr>"

    ok = sum(1 for r in results_by_task.values() if r.get("status") == "ok")
    skipped = sum(1 for r in results_by_task.values() if r.get("status") == "skipped")
    errored = sum(1 for r in results_by_task.values() if r.get("status") == "error")

    meta_html = f"""
<div class='meta-box'>
  <div><b>version:</b> {html.escape(version)}</div>
  <div><b>date:</b> {html.escape(run_date)}</div>
  <div><b>quality:</b> {html.escape(quality)}</div>
  <div><b>concurrency:</b> {concurrency}</div>
  <div><b>total tasks:</b> {len(tasks)} (ok={ok}, skipped={skipped}, error={errored})</div>
  <div><b>wall time:</b> {total_elapsed:.1f}s</div>
  <div><b>prompt archive:</b> tools/asset-manager/prompts/versions/{html.escape(version)}_prompts.md</div>
</div>
"""

    html_doc = f"""<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"/>
<title>Portrait eval {html.escape(version)} ({html.escape(run_date)})</title>
<style>
  body {{ font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
          margin: 16px; background: #fafafa; color: #222; }}
  h1 {{ margin: 0 0 8px 0; font-size: 20px; }}
  .meta-box {{ background: #fff; padding: 10px 14px; border: 1px solid #e0e0e0;
               border-radius: 6px; margin-bottom: 16px; font-size: 13px; }}
  .meta-box div {{ display: inline-block; margin-right: 18px; }}
  table {{ border-collapse: collapse; }}
  th, td {{ vertical-align: top; padding: 6px; }}
  th {{ background: #eee; font-weight: 600; text-align: center; }}
  .row-head {{ width: 70px; writing-mode: horizontal-tb; }}
  td.cell {{ width: 340px; background: #fff; border: 1px solid #ddd;
             border-radius: 6px; }}
  td.cell img {{ width: 100%; height: auto; background: #f0f0f0; border-radius: 4px; }}
  .label {{ font-size: 13px; font-weight: 600; margin-bottom: 4px; }}
  .meta {{ color: #888; font-weight: 400; font-size: 11px; }}
  details {{ margin-top: 6px; }}
  details > summary {{ cursor: pointer; color: #0366d6; font-size: 12px; }}
  pre {{ background: #f6f8fa; padding: 8px; border-radius: 4px;
         font-size: 11px; white-space: pre-wrap; max-height: 240px; overflow: auto; }}
  .err {{ color: #b00020; font-size: 12px; margin-top: 4px; }}
  .missing {{ color: #b00020; font-size: 12px; padding: 40px 0; text-align: center;
              background: #fff5f5; border: 1px dashed #e0c4c4; border-radius: 4px; }}
  .empty {{ color: #aaa; text-align: center; }}
</style></head><body>
<h1>Portrait eval — {html.escape(version)} ({html.escape(run_date)})</h1>
{meta_html}
<table>
  <thead>{header_row}</thead>
  <tbody>{body_rows}</tbody>
</table>
</body></html>
"""
    out_path = out_dir / f"{version}_{run_date}_summary.html"
    out_path.write_text(html_doc, encoding="utf-8")
    return out_path


# ──────────────────────────────── main ────────────────────────────────
def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--version", required=True, help="version tag, e.g. v0, v1, v1a")
    p.add_argument("--low-res", action="store_true", help="use quality=low for cheap/fast preview")
    p.add_argument("--concurrency", type=int, default=4, help="image generation concurrency (default 4)")
    p.add_argument("--date", default=None, help="override YYYYMMDD stamp (default: today)")
    p.add_argument("--no-reuse", action="store_true",
                   help="do not reuse existing descriptions from batch_config.json; re-ask the LLM")
    p.add_argument("--templates-from", default=None,
                   help="path to an alternative templates.json (temporarily overrides the production one "
                        "by redirecting shared_ctx.TEMPLATES_CONFIG_PATH for this run only)")
    p.add_argument("--descriptions-from", default=None,
                   help="reuse descriptions from a previous eval run directory. Value can be either a "
                        "version tag like 'v1_20260418' (resolved under generated/portrait-eval/) or an "
                        "absolute/relative path to that directory. For each character/variant we read "
                        "'{name}_variant_{i}.description.txt'. If set, LLM description generation is "
                        "skipped entirely (single-factor experiment mode).")
    return p.parse_args()


def _resolve_descriptions_dir(value: str) -> Path:
    """Accept either a version tag (resolved under OUTPUT_ROOT) or a path."""
    p = Path(value)
    if p.is_absolute() and p.exists():
        return p
    # Relative path from cwd?
    if p.exists():
        return p.resolve()
    # Treat as version tag under OUTPUT_ROOT.
    candidate = OUTPUT_ROOT / value
    if candidate.exists():
        return candidate
    raise FileNotFoundError(
        f"--descriptions-from: could not resolve '{value}'. Tried as path and as "
        f"'{OUTPUT_ROOT / value}'."
    )


def load_descriptions_from_dir(
    descriptions_dir: Path,
    characters_cfg: List[Dict[str, Any]],
    variants_per: int,
) -> Dict[str, List[str]]:
    """Read {name}_variant_{i}.description.txt for each character/variant."""
    out: Dict[str, List[str]] = {}
    for cfg in characters_cfg:
        name = cfg["name"]
        descs: List[str] = []
        for i in range(1, variants_per + 1):
            p = descriptions_dir / f"{name}_variant_{i}.description.txt"
            if not p.exists():
                raise FileNotFoundError(
                    f"descriptions-from: missing file {p}. Cannot run single-factor experiment."
                )
            descs.append(p.read_text(encoding="utf-8").strip())
        out[name] = descs
        log(f"[{name}] loaded {len(descs)} descriptions from {descriptions_dir}")
    return out


def main() -> int:
    args = parse_args()
    run_date = args.date or datetime.now().strftime("%Y%m%d")
    out_dir = OUTPUT_ROOT / f"{args.version}_{run_date}"
    out_dir.mkdir(parents=True, exist_ok=True)

    # --- Optional: redirect templates.json for this run only (Phase A experiments) ---
    templates_override_path: Optional[Path] = None
    if args.templates_from:
        templates_override_path = Path(args.templates_from).resolve()
        if not templates_override_path.exists():
            log(f"FATAL: --templates-from path not found: {templates_override_path}")
            return 3
        # shared._load_templates() reads from shared.TEMPLATES_CONFIG_PATH directly;
        # redirecting that module-level variable is the lightest-touch injection.
        shared_ctx.TEMPLATES_CONFIG_PATH = templates_override_path
        log(f"templates override → {templates_override_path}")

    test_set = load_test_set()
    characters_cfg = test_set["characters"]
    character_names = [c["name"] for c in characters_cfg]
    variants_per = int(test_set.get("variants_per_character", 4))

    log(f"=== portrait eval run ===")
    log(f"version={args.version} date={run_date} low_res={args.low_res} concurrency={args.concurrency}")
    log(f"characters={character_names} variants_per={variants_per}")
    log(f"output_dir={out_dir}")
    if args.descriptions_from:
        log(f"descriptions_from={args.descriptions_from}")
    if templates_override_path:
        log(f"templates_from={templates_override_path}")

    # Step 1: resolve descriptions for every character (sequential; cheap compared to image gen).
    client = get_openai_client()
    descriptions_by_char: Dict[str, List[str]] = {}
    if args.descriptions_from:
        descriptions_dir = _resolve_descriptions_dir(args.descriptions_from)
        descriptions_by_char = load_descriptions_from_dir(
            descriptions_dir, characters_cfg, variants_per
        )
    else:
        for cfg in characters_cfg:
            name = cfg["name"]
            try:
                descriptions_by_char[name] = resolve_descriptions(
                    client, name, count=variants_per, reuse_existing=not args.no_reuse
                )
            except Exception as exc:
                log(f"[{name}] FAILED to resolve descriptions: {exc}")
                raise

    # Step 2: build tasks.
    tasks: List[EvalTask] = []
    for cfg in characters_cfg:
        name = cfg["name"]
        descs = descriptions_by_char[name]
        for i, desc in enumerate(descs, start=1):
            prompt = _build_custom_prompt("portrait", name, desc)
            base = f"{name}_variant_{i}"
            tasks.append(EvalTask(
                character=name,
                variant_index=i,
                description=desc,
                prompt=prompt,
                png_path=out_dir / f"{base}.png",
                desc_path=out_dir / f"{base}.description.txt",
                prompt_path=out_dir / f"{base}.prompt.txt",
            ))

    # Step 3: run image generation (async + thread pool).
    quality = "low" if args.low_res else "high"
    started = time.time()
    results = asyncio.run(run_all(tasks, quality=quality, concurrency=args.concurrency))
    total_elapsed = time.time() - started

    results_by_task = {(r["task"].character, r["task"].variant_index): r for r in results}

    # Step 4: manifest + summary.
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

    summary_path = build_summary_html(
        out_dir, args.version, run_date,
        character_names, results_by_task, tasks,
        quality=quality, concurrency=args.concurrency,
        total_elapsed=total_elapsed,
    )
    log(f"summary.html → {summary_path}")
    log(f"manifest.json → {out_dir / 'manifest.json'}")
    log(f"ok={manifest['counts']['ok']} skipped={manifest['counts']['skipped']} error={manifest['counts']['error']} total={manifest['counts']['total']} wall={total_elapsed:.1f}s")
    return 0 if manifest["counts"]["error"] == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
