#!/usr/bin/env python3
"""
Build a side-by-side comparison HTML for portrait eval runs.

Layout:
- Rows = characters × variants (5 × 4 = 20)
- Columns = one per run (e.g. v1, v2_A1, v2_A2, v2_A3)
- Each cell shows the PNG + warm_signal for that image.
- Top section shows summary metrics per run (mean, std, distribution).

Usage:
    python eval_compare_html.py \
        --runs v1_20260418 v2_A1_20260418 v2_A2_20260418 v2_A3_20260418 \
        --labels v1 A1 A2 A3 \
        --out ../generated/portrait-eval/v2_comparison_20260418.html

The HTML lives at --out. Images are referenced by relative paths, so --out should
be somewhere above all run dirs (typically the generated/portrait-eval/ root).
"""
from __future__ import annotations

import argparse
import html
import os
import statistics
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

# Reuse warm_signal computation from sibling script.
HERE = Path(__file__).resolve()
sys.path.insert(0, str(HERE.parent))
from eval_warm_signal import analyze_dir  # type: ignore


def build_html(
    runs: List[Path],
    labels: List[str],
    out_path: Path,
    title: str,
) -> None:
    # 1. compute warm signals per run
    analyses: List[Dict[str, Any]] = [analyze_dir(r) for r in runs]

    # 2. determine character ordering (derive from first run, fallback union)
    char_order: List[str] = []
    seen = set()
    for a in analyses:
        for e in a["entries"]:
            if e["character"] not in seen:
                seen.add(e["character"])
                char_order.append(e["character"])

    # 3. max variants per character
    max_variant = 1
    for a in analyses:
        for e in a["entries"]:
            if e["variant"] > max_variant:
                max_variant = e["variant"]

    # 4. lookup table: (label_idx, character, variant) -> entry
    lookup: Dict[tuple, Dict[str, Any]] = {}
    for i, a in enumerate(analyses):
        for e in a["entries"]:
            lookup[(i, e["character"], e["variant"])] = e

    # 5. build header summary
    summary_rows = ""
    for i, (lab, a) in enumerate(zip(labels, analyses)):
        per_char = "  ".join(f"{c}:{m:.3f}" for c, m in a["per_character_mean"].items())
        badge_cls = "good" if (a["warm_signal_mean"] or 0) < 0.05 else ("mid" if (a["warm_signal_mean"] or 0) < 0.15 else "bad")
        summary_rows += f"""
<tr>
  <td class='lab'>{html.escape(lab)}</td>
  <td class='dir'>{html.escape(a['dir'])}</td>
  <td class='num {badge_cls}'>{a['warm_signal_mean']}</td>
  <td class='num'>{a['warm_signal_std']}</td>
  <td class='num'>{a['warm_signal_median']}</td>
  <td class='num'>{a['warm_signal_min']}</td>
  <td class='num'>{a['warm_signal_max']}</td>
  <td class='num'>{a['n_images']}</td>
  <td class='per-char'>{html.escape(per_char)}</td>
</tr>"""

    # 6. build grid
    header_cells = "<th>char/variant</th>" + "".join(
        f"<th><b>{html.escape(lab)}</b><br/><span class='meta'>{html.escape(a['dir'])}<br/>mean={a['warm_signal_mean']}</span></th>"
        for lab, a in zip(labels, analyses)
    )

    body_rows = ""
    for char in char_order:
        for v in range(1, max_variant + 1):
            body_rows += f"<tr><th class='row-head'>{html.escape(char)}<br/>v{v}</th>"
            for i, (lab, run_dir) in enumerate(zip(labels, runs)):
                e = lookup.get((i, char, v))
                if not e:
                    body_rows += "<td class='cell empty'>—</td>"
                    continue
                rel_img = os.path.relpath(run_dir / e["file"], out_path.parent)
                ws = e["warm_signal"]
                cls = "good" if ws < 0.05 else ("mid" if ws < 0.15 else "bad")
                body_rows += (
                    f"<td class='cell'>"
                    f"<img src='{html.escape(rel_img)}' loading='lazy' alt='{html.escape(char)} v{v} {lab}'/>"
                    f"<div class='badge {cls}'>warm={ws}</div>"
                    f"</td>"
                )
            body_rows += "</tr>\n"

    # 7. histogram rows (text bar chart)
    hist_rows = ""
    max_total = 1
    for a in analyses:
        for b in a["histogram_buckets"]:
            if b["count"] > max_total:
                max_total = b["count"]
    # transpose: bucket × label
    all_buckets = [b["bucket"] for b in analyses[0]["histogram_buckets"]]
    hist_header = "<th>warm_signal bucket</th>" + "".join(f"<th>{html.escape(l)}</th>" for l in labels)
    for bi, bname in enumerate(all_buckets):
        row = f"<tr><th class='buck'>{html.escape(bname)}</th>"
        for a in analyses:
            c = a["histogram_buckets"][bi]["count"]
            w = int(200 * c / max_total) if c else 0
            row += f"<td><div class='bar' style='width:{w}px'>&nbsp;</div><span class='n'>{c}</span></td>"
        row += "</tr>"
        hist_rows += row

    css = """
body { font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
       margin: 16px; background: #fafafa; color: #222; }
h1 { margin: 0 0 8px 0; font-size: 22px; }
h2 { margin: 24px 0 10px 0; font-size: 16px; color: #555; }
table { border-collapse: collapse; margin-bottom: 20px; }
th, td { padding: 6px; vertical-align: top; }
th { background: #eee; font-weight: 600; text-align: center; font-size: 12px; }
td.cell { width: 260px; background: #fff; border: 1px solid #ddd; border-radius: 6px; text-align: center; }
td.cell img { width: 100%; height: auto; background: #f0f0f0; border-radius: 4px; display: block; }
.row-head { width: 70px; font-size: 12px; background: #f4f4f4; }
.label { font-size: 12px; font-weight: 600; margin-top: 4px; }
.badge { display: inline-block; margin-top: 4px; padding: 2px 6px; border-radius: 4px;
         font-size: 11px; font-family: monospace; }
.badge.good { background: #d4edda; color: #155724; }
.badge.mid  { background: #fff3cd; color: #856404; }
.badge.bad  { background: #f8d7da; color: #721c24; }
.num { text-align: right; font-family: monospace; font-size: 12px; padding: 4px 8px; }
.num.good { color: #155724; font-weight: bold; }
.num.mid  { color: #856404; font-weight: bold; }
.num.bad  { color: #721c24; font-weight: bold; }
.per-char { font-family: monospace; font-size: 11px; color: #444; }
.lab { font-weight: bold; }
.dir { font-family: monospace; font-size: 11px; color: #666; }
.summary { background: #fff; border: 1px solid #ddd; }
.summary th, .summary td { border: 1px solid #e0e0e0; }
.hist { background: #fff; border: 1px solid #ddd; }
.hist td .bar { background: #2a6df4; height: 14px; display: inline-block; border-radius: 2px; }
.hist td .n { font-family: monospace; font-size: 11px; margin-left: 6px; }
.hist th.buck { background: #f4f4f4; font-family: monospace; font-size: 11px; text-align: right; }
.meta { font-size: 11px; color: #777; font-weight: 400; }
.legend { font-size: 12px; color: #555; margin: 10px 0; }
.legend b { color: #222; }
"""

    html_doc = f"""<!doctype html>
<html lang='zh-CN'>
<head><meta charset='utf-8'/>
<title>{html.escape(title)}</title>
<style>{css}</style>
</head><body>
<h1>{html.escape(title)}</h1>
<div class='legend'>
  <b>warm_signal</b> = mean of (R − B) / 255 over opaque pixels.
  <span class='badge good'>&lt; 0.05</span> visually neutral (target)
  <span class='badge mid'>0.05 – 0.15</span> noticeable warm cast
  <span class='badge bad'>≥ 0.15</span> clearly yellow/sepia
</div>

<h2>Run summary</h2>
<table class='summary'>
<thead><tr>
  <th>label</th><th>dir</th>
  <th>mean</th><th>std</th><th>median</th><th>min</th><th>max</th>
  <th>n</th><th>per-character mean</th>
</tr></thead>
<tbody>{summary_rows}</tbody>
</table>

<h2>warm_signal distribution (histogram)</h2>
<table class='hist'>
<thead><tr>{hist_header}</tr></thead>
<tbody>{hist_rows}</tbody>
</table>

<h2>Side-by-side images ({len(runs)} columns × {len(char_order) * max_variant} rows)</h2>
<table class='grid'>
<thead><tr>{header_cells}</tr></thead>
<tbody>
{body_rows}
</tbody>
</table>
</body></html>
"""
    out_path.write_text(html_doc, encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--runs", nargs="+", required=True,
                    help="run directories; version tag (under generated/portrait-eval/) or path")
    ap.add_argument("--labels", nargs="+", required=True,
                    help="display labels; same count as --runs")
    ap.add_argument("--out", required=True, help="output HTML path")
    ap.add_argument("--title", default="Portrait eval comparison", help="page title")
    args = ap.parse_args()
    if len(args.runs) != len(args.labels):
        ap.error("--runs and --labels must have the same count")

    eval_root = HERE.parents[1] / "generated" / "portrait-eval"
    run_dirs: List[Path] = []
    for r in args.runs:
        p = Path(r)
        if not p.is_absolute() and not p.exists():
            p = eval_root / r
        if not p.exists():
            ap.error(f"run dir not found: {r}")
        run_dirs.append(p)
    out_path = Path(args.out).resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    build_html(run_dirs, args.labels, out_path, args.title)
    print(f"wrote {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
