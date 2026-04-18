#!/usr/bin/env python3
"""
B1+ smoke run: 3 characters × 4 variants = 12 images.

- Uses the NEW production templates.json (B1+ already cut in).
- Runs the live v3 slot description pipeline (_generate_descriptions_blocking)
  for each character. No pre-baked descriptions.
- Characters: 徐凤年, 红薯 (nickname of 姜泥 — v3 prompt has proper-noun rules),
  老黄.
- Output: generated/portrait-eval/B1Plus_smoke_3char_<YYYYMMDD>/
- Comparison HTML: generated/portrait-eval/B1Plus_vs_B4Lean_3char_<YYYYMMDD>.html
  Left col = B1+ (this run, 3×4), right col = B4-Lean v2.6 (existing files under
  B4-Lean_20260418/ where available; missing cells rendered as "—").

Fail-fast: any KeyError / ValueError / API error is raised, not swallowed.
"""
from __future__ import annotations

import asyncio
import html
import json
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Tuple

HERE = Path(__file__).resolve()
ASSET_MANAGER_ROOT = HERE.parents[1]
BACKEND_DIR = ASSET_MANAGER_ROOT / "backend"
SCRIPTS_DIR = ASSET_MANAGER_ROOT / "scripts"
PROJECT_ROOT = ASSET_MANAGER_ROOT.parent.parent
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
sys.path.insert(0, str(SCRIPTS_DIR))

from services.characters import _build_custom_prompt, _generate_descriptions_blocking  # noqa: E402
from eval_generate import (  # noqa: E402
    EvalTask, get_openai_client, run_all, OUTPUT_ROOT, log,
)

VERSION = "B1Plus_smoke_3char"
RUN_DATE = datetime.now().strftime("%Y%m%d")
CHARS = ["徐凤年", "红薯", "老黄"]
VARIANTS = [1, 2, 3, 4]

# B4-Lean comparison source (v2.6 prod artifacts). Only 徐凤年 and 姜泥 exist
# there with 2 variants each (see B4-Lean_20260418/ listing).
B4LEAN_DIR = OUTPUT_ROOT / "B4-Lean_20260418"
# Map B1+ character → (B4-Lean character name, available variant range).
B4LEAN_MAP: Dict[str, Tuple[str, List[int]]] = {
    "徐凤年": ("徐凤年", [1, 2]),
    "红薯":   ("姜泥",   [1, 2]),   # 红薯 = 姜泥 canonical name
    "老黄":   ("老黄",   []),        # no B4-Lean artifact
}


def generate_descriptions(client, out_dir: Path) -> Dict[str, List[str]]:
    """Run the v3 slot pipeline for each character; persist description files."""
    by_char: Dict[str, List[str]] = {}
    for name in CHARS:
        log(f"[{name}] generating 4 v3-slot descriptions…")
        # _generate_descriptions_blocking raises on any schema / gender / JSON
        # failure — we let it propagate.
        descs = _generate_descriptions_blocking(client, name, bio="")
        if len(descs) != 4:
            raise RuntimeError(f"[{name}] expected 4 descriptions, got {len(descs)}")
        by_char[name] = descs
        # Persist immediately so a later image failure doesn't lose them.
        for i, d in enumerate(descs, start=1):
            (out_dir / f"{name}_variant_{i}.description.txt").write_text(d, encoding="utf-8")
        log(f"[{name}] ok; anchor preview: {descs[0][:90]}…")
    return by_char


def build_comparison_html(out_dir: Path, manifest: Dict[str, Any]) -> Path:
    """Two-column comparison: B1+ (this run) vs B4-Lean v2.6 (existing files)."""
    b1plus_rel = out_dir.relative_to(ASSET_MANAGER_ROOT / "generated" / "portrait-eval")
    b4lean_rel = B4LEAN_DIR.relative_to(ASSET_MANAGER_ROOT / "generated" / "portrait-eval")

    def load_text(p: Path) -> str:
        try:
            return p.read_text(encoding="utf-8").strip()
        except FileNotFoundError:
            return ""

    def b1plus_cell(name: str, v: int) -> str:
        png = out_dir / f"{name}_variant_{v}.png"
        desc = load_text(out_dir / f"{name}_variant_{v}.description.txt")
        prompt = load_text(out_dir / f"{name}_variant_{v}.prompt.txt")
        if png.exists():
            img_html = f"<img src='{b1plus_rel}/{png.name}' alt='B1+ {name} v{v}'/>"
        else:
            img_html = "<div class='missing'>[no image]</div>"
        prompt_head = prompt[:200] + ("…" if len(prompt) > 200 else "")
        return (
            f"<div class='cell'><div class='label'>B1+ · {html.escape(name)} · v{v}</div>"
            f"{img_html}"
            f"<details open><summary>description</summary><pre>{html.escape(desc)}</pre></details>"
            f"<details><summary>prompt (first 200 chars)</summary><pre>{html.escape(prompt_head)}</pre></details>"
            f"</div>"
        )

    def b4lean_cell(name: str, v: int) -> str:
        mapped_name, available = B4LEAN_MAP[name]
        if v not in available:
            return "<div class='cell empty'>—<br/><span class='tiny'>no B4-Lean artifact</span></div>"
        png = B4LEAN_DIR / f"{mapped_name}_variant_{v}.png"
        desc = load_text(B4LEAN_DIR / f"{mapped_name}_variant_{v}.description.txt")
        prompt = load_text(B4LEAN_DIR / f"{mapped_name}_variant_{v}.prompt.txt")
        if png.exists():
            img_html = f"<img src='{b4lean_rel}/{png.name}' alt='B4-Lean {mapped_name} v{v}'/>"
        else:
            img_html = "<div class='missing'>[no image]</div>"
        prompt_head = prompt[:200] + ("…" if len(prompt) > 200 else "")
        label = f"B4-Lean · {mapped_name}"
        if mapped_name != name:
            label += f" (= {name})"
        return (
            f"<div class='cell'><div class='label'>{html.escape(label)} · v{v}</div>"
            f"{img_html}"
            f"<details><summary>description</summary><pre>{html.escape(desc)}</pre></details>"
            f"<details><summary>prompt (first 200 chars)</summary><pre>{html.escape(prompt_head)}</pre></details>"
            f"</div>"
        )

    rows = ""
    for name in CHARS:
        rows += f"<h2>{html.escape(name)}</h2><table><tr>"
        rows += "<th class='col-head'>B1+ (new prod)</th><th class='col-head'>B4-Lean (v2.6 prod)</th>"
        rows += "</tr>"
        for v in VARIANTS:
            left = b1plus_cell(name, v)
            right = b4lean_cell(name, v)
            rows += f"<tr><td>{left}</td><td>{right}</td></tr>"
        rows += "</table>"

    ok = manifest["counts"]["ok"]
    errored = manifest["counts"]["error"]
    wall = manifest["total_elapsed_sec"]
    meta = (
        f"<div class='meta'>"
        f"<b>version:</b> B1+ (v2.7 prod) vs B4-Lean (v2.6 prod) &nbsp;|&nbsp; "
        f"<b>date:</b> {RUN_DATE} &nbsp;|&nbsp; "
        f"<b>B1+ counts:</b> ok={ok} error={errored} &nbsp;|&nbsp; "
        f"<b>wall:</b> {wall:.1f}s"
        f"</div>"
    )

    doc = f"""<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"/>
<title>Portrait eval — B1+ vs B4-Lean ({RUN_DATE})</title>
<style>
body {{ font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
        margin: 16px; background: #fafafa; color: #222; }}
h1 {{ margin: 0 0 8px 0; font-size: 20px; }}
h2 {{ margin: 18px 0 6px 0; font-size: 16px; color: #444; }}
.meta {{ background: #fff; padding: 8px 14px; border: 1px solid #e0e0e0;
         border-radius: 6px; margin-bottom: 16px; font-size: 13px; }}
table {{ border-collapse: collapse; margin-bottom: 12px; }}
td {{ vertical-align: top; padding: 4px; width: 420px; }}
th.col-head {{ background: #eee; padding: 6px; font-weight: 600; }}
.cell {{ background: #fff; border: 1px solid #ddd; border-radius: 6px; padding: 6px; }}
.cell img {{ width: 100%; height: auto; background: #f0f0f0; border-radius: 4px; }}
.cell.empty {{ color: #aaa; text-align: center; padding: 60px 0; }}
.label {{ font-weight: 600; margin-bottom: 4px; font-size: 13px; }}
.missing {{ color: #b00020; font-size: 12px; padding: 40px 0; text-align: center;
            background: #fff5f5; border: 1px dashed #e0c4c4; border-radius: 4px; }}
.tiny {{ font-size: 11px; color: #aaa; }}
details {{ margin-top: 6px; }}
details > summary {{ cursor: pointer; color: #0366d6; font-size: 12px; }}
pre {{ background: #f6f8fa; padding: 6px; border-radius: 4px;
       font-size: 11px; white-space: pre-wrap; max-height: 200px; overflow: auto; }}
</style></head><body>
<h1>Portrait eval — B1+ vs B4-Lean ({RUN_DATE})</h1>
{meta}
{rows}
</body></html>
"""
    out_path = (ASSET_MANAGER_ROOT / "generated" / "portrait-eval"
                / f"B1Plus_vs_B4Lean_3char_{RUN_DATE}.html")
    out_path.write_text(doc, encoding="utf-8")
    return out_path


def main() -> int:
    out_dir = OUTPUT_ROOT / f"{VERSION}_{RUN_DATE}"
    out_dir.mkdir(parents=True, exist_ok=True)

    log(f"=== {VERSION} run ({len(CHARS)}×{len(VARIANTS)} images) ===")
    log(f"templates -> (production) {BACKEND_DIR / 'templates.json'}")
    log(f"description pipeline -> v3 slot (live LLM)")
    log(f"output -> {out_dir}")

    client = get_openai_client()

    # Step 1: live descriptions via v3 slot.
    desc_by_char = generate_descriptions(client, out_dir)

    # Step 2: build prompts (reads the new templates.json).
    tasks: List[EvalTask] = []
    for name in CHARS:
        for v in VARIANTS:
            desc = desc_by_char[name][v - 1]
            prompt = _build_custom_prompt("portrait", name, desc)
            base = f"{name}_variant_{v}"
            (out_dir / f"{base}.prompt.txt").write_text(prompt, encoding="utf-8")
            tasks.append(EvalTask(
                character=name, variant_index=v,
                description=desc, prompt=prompt,
                png_path=out_dir / f"{base}.png",
                desc_path=out_dir / f"{base}.description.txt",
                prompt_path=out_dir / f"{base}.prompt.txt",
            ))

    # Step 3: generate images.
    started = time.time()
    results = asyncio.run(run_all(tasks, quality="high", concurrency=4))
    total_elapsed = time.time() - started

    manifest = {
        "version": VERSION,
        "date": RUN_DATE,
        "characters": CHARS,
        "variants_per": len(VARIANTS),
        "quality": "high",
        "concurrency": 4,
        "templates_file": "backend/templates.json (B1+ / v2.7 production)",
        "description_pipeline": "v3_slot live LLM",
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

    # Step 4: comparison HTML.
    cmp_path = build_comparison_html(out_dir, manifest)

    log(f"manifest -> {out_dir / 'manifest.json'}")
    log(f"comparison html -> {cmp_path}")
    log(f"ok={manifest['counts']['ok']} error={manifest['counts']['error']} "
        f"total={manifest['counts']['total']} wall={total_elapsed:.1f}s")
    return 0 if manifest["counts"]["error"] == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
