#!/usr/bin/env python3
"""
Build B4 vs B4-Lean side-by-side comparison HTML (no metrics, no face crops).

Layout: 6 rows (3 chars × 2 variants) × 2 columns:
    [B4 full]  [B4-Lean full]

User-driven manual evaluation: no PASS/WARN/FAIL labels, no warm_signal,
no face crops. Just the raw images side-by-side.
"""
from __future__ import annotations

import html
from pathlib import Path

HERE = Path(__file__).resolve()
ASSET_MANAGER_ROOT = HERE.parents[1]
EVAL_ROOT = ASSET_MANAGER_ROOT / "generated" / "portrait-eval"

B4_DIR = EVAL_ROOT / "v2_B4_20260418"
LEAN_DIR = EVAL_ROOT / "B4-Lean_20260418"
OUT_HTML = EVAL_ROOT / "B4_vs_B4-Lean_20260418.html"

CHARS = ["姜泥", "徐凤年", "李淳罡"]
VARIANTS = [1, 2]


def main() -> None:
    rows_html = []
    for c in CHARS:
        for v in VARIANTS:
            b4_rel = (B4_DIR / f"{c}_variant_{v}.png").relative_to(EVAL_ROOT)
            lean_rel = (LEAN_DIR / f"{c}_variant_{v}.png").relative_to(EVAL_ROOT)
            rows_html.append(f"""
<tr>
  <th class='row-head'>{html.escape(c)} · variant {v}</th>
  <td><div class='label'>B4</div><img src='{html.escape(str(b4_rel))}' alt='B4 {html.escape(c)} v{v}'/></td>
  <td><div class='label'>B4-Lean</div><img src='{html.escape(str(lean_rel))}' alt='B4-Lean {html.escape(c)} v{v}'/></td>
</tr>
""")

    doc = f"""<!doctype html>
<html lang="zh-CN"><head><meta charset='utf-8'/>
<title>B4 vs B4-Lean (20260418)</title>
<style>
  body {{ font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
          margin: 16px; background: #fafafa; color: #222; }}
  h1 {{ font-size: 20px; margin: 0 0 8px 0; }}
  .meta-box {{ background: #fff; padding: 10px 14px; border: 1px solid #e0e0e0;
               border-radius: 6px; margin-bottom: 16px; font-size: 13px; }}
  .meta-box div {{ margin: 3px 0; }}
  table {{ border-collapse: collapse; margin-top: 8px; }}
  th, td {{ vertical-align: top; padding: 6px; background: #fff;
            border: 1px solid #ddd; border-radius: 6px; }}
  .row-head {{ width: 140px; font-size: 13px; font-weight: 600;
               background: #f0f0f0; text-align: left; padding: 10px; }}
  td img {{ display: block; width: 380px; height: auto;
            background: #f0f0f0; border-radius: 4px; }}
  .label {{ font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #555; }}
</style></head><body>
<h1>B4 vs B4-Lean — side-by-side (20260418)</h1>
<div class='meta-box'>
  <div><b>Samples:</b> 3 characters × 2 variants = 6 images per run</div>
  <div><b>Descriptions:</b> reused from v1_20260418 (single-factor change: template only)</div>
  <div><b>Templates:</b> B4 = tools/asset-manager/prompts/experiments/v2_B4_templates.json ·
       B4-Lean = tools/asset-manager/prompts/experiments/v2_B4-Lean_templates.json</div>
  <div><b>Evaluation:</b> manual (user). No automated metrics attached.</div>
</div>
<table>
  <thead>
    <tr><th>Row</th><th>B4</th><th>B4-Lean</th></tr>
  </thead>
  <tbody>
    {''.join(rows_html)}
  </tbody>
</table>
</body></html>
"""
    OUT_HTML.write_text(doc, encoding="utf-8")
    print(f"wrote {OUT_HTML}")


if __name__ == "__main__":
    main()
