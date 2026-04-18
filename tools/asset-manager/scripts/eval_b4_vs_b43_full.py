#!/usr/bin/env python3
"""
Merge B4 / B4.3 full warm_signal (9 chars × 2 variant × 2 version = 36 rows),
and build a 18-row × 3-col HTML comparison page (description / B4 / B4.3).

Old 5 characters reuse existing v2_B4_20260418 + B4.3_20260418 (variants 1-2 only).
New 4 characters use B4_extended_20260418 + B4.3_extended_20260418.
"""
from __future__ import annotations

import html
import json
import statistics
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve()
ROOT = HERE.parents[1]
EVAL = ROOT / "generated" / "portrait-eval"

OLD_CHARS = ["徐凤年", "老黄", "温华", "姜泥", "李淳罡"]
NEW_CHARS = ["南宫仆射", "轩辕青锋", "褚禄山", "陈芝豹"]
ALL_CHARS = OLD_CHARS + NEW_CHARS  # order matters for tables

# (char, variant) -> (b4_dir, b4.3_dir)
def dirs_for(char: str) -> Tuple[Path, Path]:
    if char in OLD_CHARS:
        return EVAL / "v2_B4_20260418", EVAL / "B4.3_20260418"
    return EVAL / "B4_extended_20260418", EVAL / "B4.3_extended_20260418"


def warm_signal(png: Path) -> float:
    img = Image.open(png).convert("RGBA")
    arr = np.asarray(img, dtype=np.float32)
    rgb = arr[..., :3]
    alpha = arr[..., 3]
    mask = alpha > 0
    if not mask.any():
        return 0.0
    r = rgb[..., 0][mask]
    b = rgb[..., 2][mask]
    return float(((r - b) / 255.0).mean())


def build_rows() -> Tuple[List[Dict], Dict[str, Dict[str, float]], Dict[str, float]]:
    rows: List[Dict] = []
    # per_char[char] = {"B4": [v1,v2], "B4.3": [v1,v2]}
    per_char: Dict[str, Dict[str, List[float]]] = {c: {"B4": [], "B4.3": []} for c in ALL_CHARS}

    for char in ALL_CHARS:
        b4_dir, b43_dir = dirs_for(char)
        for v in (1, 2):
            b4_png = b4_dir / f"{char}_variant_{v}.png"
            b43_png = b43_dir / f"{char}_variant_{v}.png"
            if not b4_png.exists():
                raise FileNotFoundError(b4_png)
            if not b43_png.exists():
                raise FileNotFoundError(b43_png)
            w_b4 = warm_signal(b4_png)
            w_b43 = warm_signal(b43_png)
            rows.append({
                "character": char,
                "variant": v,
                "group": "old" if char in OLD_CHARS else "new",
                "B4": {
                    "png": str(b4_png.relative_to(EVAL)),
                    "warm_signal": round(w_b4, 6),
                },
                "B4.3": {
                    "png": str(b43_png.relative_to(EVAL)),
                    "warm_signal": round(w_b43, 6),
                },
                "delta_B4.3_minus_B4": round(w_b43 - w_b4, 6),
            })
            per_char[char]["B4"].append(w_b4)
            per_char[char]["B4.3"].append(w_b43)

    per_char_mean: Dict[str, Dict[str, float]] = {}
    for c, d in per_char.items():
        per_char_mean[c] = {
            "B4_mean": round(float(np.mean(d["B4"])), 6),
            "B4.3_mean": round(float(np.mean(d["B4.3"])), 6),
            "delta_mean": round(float(np.mean(d["B4.3"]) - np.mean(d["B4"])), 6),
        }

    all_b4 = [r["B4"]["warm_signal"] for r in rows]
    all_b43 = [r["B4.3"]["warm_signal"] for r in rows]
    global_mean = {
        "B4_mean": round(float(np.mean(all_b4)), 6),
        "B4.3_mean": round(float(np.mean(all_b43)), 6),
        "delta_mean": round(float(np.mean(all_b43) - np.mean(all_b4)), 6),
        "B4_std": round(float(np.std(all_b4)), 6),
        "B4.3_std": round(float(np.std(all_b43)), 6),
        "n_rows": len(rows),
        "n_images": 2 * len(rows),
    }
    return rows, per_char_mean, global_mean


def build_html(rows: List[Dict], per_char_mean: Dict, global_mean: Dict) -> str:
    # read description text for each (char, variant) — same description for B4 vs B4.3
    def desc_text(char: str, v: int) -> str:
        b4_dir, _ = dirs_for(char)
        p = b4_dir / f"{char}_variant_{v}.description.txt"
        return p.read_text(encoding="utf-8").strip()

    # Build per-character summary table
    summary_tbl = "<table class='summary'><thead><tr><th>character</th><th>group</th><th>B4 mean</th><th>B4.3 mean</th><th>Δ (B4.3 − B4)</th></tr></thead><tbody>"
    for c in ALL_CHARS:
        m = per_char_mean[c]
        grp = "old" if c in OLD_CHARS else "new"
        d = m["delta_mean"]
        cls = "pos" if d > 0.015 else ("neg" if d < -0.015 else "")
        summary_tbl += (
            f"<tr><td>{html.escape(c)}</td><td class='grp-{grp}'>{grp}</td>"
            f"<td>{m['B4_mean']:+.4f}</td><td>{m['B4.3_mean']:+.4f}</td>"
            f"<td class='{cls}'>{d:+.4f}</td></tr>"
        )
    g = global_mean
    summary_tbl += (
        f"<tr class='total'><td colspan='2'><b>global (n={g['n_rows']} rows)</b></td>"
        f"<td>{g['B4_mean']:+.4f}</td><td>{g['B4.3_mean']:+.4f}</td>"
        f"<td>{g['delta_mean']:+.4f}</td></tr>"
    )
    summary_tbl += "</tbody></table>"

    # 18-row comparison table
    body = ""
    for r in rows:
        char = r["character"]
        v = r["variant"]
        grp = r["group"]
        desc = desc_text(char, v)
        b4_png = r["B4"]["png"]
        b43_png = r["B4.3"]["png"]
        w_b4 = r["B4"]["warm_signal"]
        w_b43 = r["B4.3"]["warm_signal"]
        delta = r["delta_B4.3_minus_B4"]
        dcls = "pos" if delta > 0.015 else ("neg" if delta < -0.015 else "")
        body += f"""
<tr class='row-{grp}'>
  <td class='label'>
    <div class='charname'>{html.escape(char)} <span class='tag tag-{grp}'>{grp}</span></div>
    <div class='vname'>variant {v}</div>
    <div class='metrics'>
      B4 warm: <b>{w_b4:+.4f}</b><br/>
      B4.3 warm: <b>{w_b43:+.4f}</b><br/>
      Δ = <b class='{dcls}'>{delta:+.4f}</b>
    </div>
    <details><summary>description</summary><pre>{html.escape(desc)}</pre></details>
  </td>
  <td class='img'><img src='{html.escape(b4_png)}' alt='B4 {char} v{v}'/></td>
  <td class='img'><img src='{html.escape(b43_png)}' alt='B4.3 {char} v{v}'/></td>
</tr>"""

    return f"""<!doctype html>
<html lang='zh-CN'><head><meta charset='utf-8'/>
<title>B4 vs B4.3 full comparison (9 chars × 2 variants)</title>
<style>
body {{ font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif; margin: 16px; background: #fafafa; color: #222; }}
h1 {{ margin: 0 0 6px 0; font-size: 20px; }}
h2 {{ margin: 18px 0 6px 0; font-size: 16px; }}
.meta {{ font-size: 13px; color: #555; margin-bottom: 12px; }}
table.summary {{ border-collapse: collapse; margin-bottom: 16px; font-size: 13px; background:#fff; }}
table.summary th, table.summary td {{ border:1px solid #ddd; padding: 6px 10px; text-align: center; }}
table.summary th {{ background:#eee; }}
table.summary .total {{ background:#fff7e6; font-weight: 600; }}
.grp-old {{ color:#555; }}
.grp-new {{ color:#b64b00; font-weight: 600; }}
.pos {{ color:#b00020; font-weight: 600; }}
.neg {{ color:#0a5a2a; font-weight: 600; }}
table.compare {{ border-collapse: collapse; width: 100%; background: #fff; }}
table.compare th {{ background:#eee; padding: 8px; border:1px solid #ddd; font-size: 13px; }}
table.compare td {{ border:1px solid #ddd; vertical-align: top; padding: 8px; }}
td.label {{ width: 260px; font-size: 12px; }}
td.label .charname {{ font-weight: 600; font-size: 14px; }}
td.label .vname {{ color: #666; margin-bottom: 6px; }}
td.label .metrics {{ background:#f7f7f7; padding:6px; border-radius:4px; margin-bottom:6px; font-size: 12px; }}
.tag {{ font-size: 11px; padding: 1px 6px; border-radius: 8px; margin-left: 4px; vertical-align: middle; }}
.tag-old {{ background:#e0e0e0; color:#555; }}
.tag-new {{ background:#ffe2cc; color:#b64b00; }}
td.img {{ width: 360px; }}
td.img img {{ width: 100%; height: auto; display: block; background: linear-gradient(45deg,#eee 25%,transparent 25%,transparent 75%,#eee 75%),
                                                        linear-gradient(45deg,#eee 25%,transparent 25%,transparent 75%,#eee 75%);
              background-size: 16px 16px; background-position: 0 0, 8px 8px; border-radius: 4px; }}
.row-new td.label {{ background:#fff7f0; }}
details > summary {{ cursor:pointer; color:#0366d6; font-size: 12px; margin-top: 4px; }}
pre {{ background:#f6f8fa; padding:6px; border-radius:4px; font-size:11px; white-space: pre-wrap; max-height: 180px; overflow:auto; }}
</style></head><body>
<h1>B4 vs B4.3 — 扩角色集全量对比 (9 chars × 2 variants, 2026-04-18)</h1>
<div class='meta'>
  老 5 角色复用 v2_B4_20260418 / B4.3_20260418，新 4 角色用 B4_extended_20260418 / B4.3_extended_20260418。
  严格单因子：B4 vs B4.3 共用同一 description，仅 template 不同（B4.3 多一句 "Tang-Song era jianghu attire..."，
  背景文案 "pure white background" → "clean transparent background"）。
  <b>warm_signal</b> = mean((R−B)/255) on opaque pixels；越正越偏黄/暖，越负越偏冷。
</div>
<h2>每角色 warm_signal 均值 + Δ</h2>
{summary_tbl}
<h2>18 行对比网格 (description / B4 / B4.3)</h2>
<table class='compare'>
<thead><tr><th>description / 指标</th><th>B4 (pure white background)</th><th>B4.3 (Tang-Song anchored)</th></tr></thead>
<tbody>{body}</tbody></table>
</body></html>
"""


def main() -> int:
    rows, per_char_mean, global_mean = build_rows()
    payload = {
        "version": "B4 vs B4.3 full (9 chars × 2 variants × 2 versions = 36 rows)",
        "date": "20260418",
        "characters": {
            "old_5": OLD_CHARS,
            "new_4": NEW_CHARS,
        },
        "sources": {
            "old_B4": "v2_B4_20260418",
            "old_B4.3": "B4.3_20260418",
            "new_B4": "B4_extended_20260418",
            "new_B4.3": "B4.3_extended_20260418",
        },
        "global_mean": global_mean,
        "per_character_mean": per_char_mean,
        "rows": rows,
    }
    out_json = EVAL / "B4_vs_B4.3_warm_signal_full_20260418.json"
    out_json.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {out_json}")

    out_html = EVAL / "B4_vs_B4.3_full_20260418.html"
    out_html.write_text(build_html(rows, per_char_mean, global_mean), encoding="utf-8")
    print(f"wrote {out_html}")

    # Stdout summary
    print("\n=== per-character mean ===")
    for c in ALL_CHARS:
        m = per_char_mean[c]
        grp = "old" if c in OLD_CHARS else "new"
        print(f"  {c:8s} [{grp}]  B4={m['B4_mean']:+.4f}  B4.3={m['B4.3_mean']:+.4f}  Δ={m['delta_mean']:+.4f}")
    g = global_mean
    print(f"\n=== global (n={g['n_rows']}) ===")
    print(f"  B4 mean={g['B4_mean']:+.4f} std={g['B4_std']:.4f}")
    print(f"  B4.3 mean={g['B4.3_mean']:+.4f} std={g['B4.3_std']:.4f}")
    print(f"  Δ mean={g['delta_mean']:+.4f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
