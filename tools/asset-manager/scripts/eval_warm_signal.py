#!/usr/bin/env python3
"""
Warm-signal measurement for portrait eval images.

Definition of `warm_signal`:
    For each non-transparent pixel, compute (R - B) / 255.0.
    Positive → warm (yellow/orange cast); negative → cool (blue cast).
    We average over all opaque pixels (alpha > 0), yielding a scalar in [-1, 1].
    v0/v1 baselines show ~0.18-0.20 (clearly warm/yellow).
    Target: < 0.05 (visually neutral).

Additionally reports:
    - warm_signal_mean, std, min, max across the run
    - per-image warm_signal
    - per-character breakdown
    - histogram-ready buckets

Usage:
    python eval_warm_signal.py --dirs v0_20260418 v1_20260418 v2_A1_20260418 v2_A2_20260418 v2_A3_20260418
    python eval_warm_signal.py --all   # scan everything under generated/portrait-eval/
    python eval_warm_signal.py --dirs v1_20260418 --out warm_signal_v1.json

Outputs a JSON file with the summary + per-image entries.
"""
from __future__ import annotations

import argparse
import json
import statistics
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve()
ASSET_MANAGER_ROOT = HERE.parents[1]
EVAL_ROOT = ASSET_MANAGER_ROOT / "generated" / "portrait-eval"


def compute_warm_signal(png_path: Path) -> Dict[str, float]:
    """Return {warm_signal, opaque_pixel_count, red_mean, blue_mean} for one image."""
    img = Image.open(png_path).convert("RGBA")
    arr = np.asarray(img, dtype=np.float32)
    rgb = arr[..., :3]
    alpha = arr[..., 3]
    mask = alpha > 0
    if not mask.any():
        return {"warm_signal": 0.0, "opaque_pixels": 0, "red_mean": 0.0, "blue_mean": 0.0}
    r = rgb[..., 0][mask]
    g = rgb[..., 1][mask]
    b = rgb[..., 2][mask]
    warm = float(((r - b) / 255.0).mean())
    return {
        "warm_signal": round(warm, 6),
        "opaque_pixels": int(mask.sum()),
        "red_mean": round(float(r.mean()), 3),
        "green_mean": round(float(g.mean()), 3),
        "blue_mean": round(float(b.mean()), 3),
    }


def analyze_dir(run_dir: Path) -> Dict[str, Any]:
    """Analyze every *_variant_*.png in a run directory."""
    pngs = sorted(run_dir.glob("*_variant_*.png"))
    entries: List[Dict[str, Any]] = []
    for p in pngs:
        # Filename pattern: {name}_variant_{i}.png
        stem = p.stem  # e.g. "徐凤年_variant_1"
        try:
            char, vpart = stem.rsplit("_variant_", 1)
            variant = int(vpart)
        except ValueError:
            continue
        metrics = compute_warm_signal(p)
        entries.append({
            "character": char,
            "variant": variant,
            "file": p.name,
            **metrics,
        })
    signals = [e["warm_signal"] for e in entries]
    by_char: Dict[str, List[float]] = {}
    for e in entries:
        by_char.setdefault(e["character"], []).append(e["warm_signal"])

    summary: Dict[str, Any] = {
        "dir": run_dir.name,
        "n_images": len(entries),
        "warm_signal_mean": round(float(np.mean(signals)), 4) if signals else None,
        "warm_signal_std": round(float(np.std(signals)), 4) if signals else None,
        "warm_signal_min": round(min(signals), 4) if signals else None,
        "warm_signal_max": round(max(signals), 4) if signals else None,
        "warm_signal_median": round(float(statistics.median(signals)), 4) if signals else None,
        "per_character_mean": {
            char: round(float(np.mean(vs)), 4) for char, vs in by_char.items()
        },
        "histogram_buckets": bucketize(signals),
        "entries": entries,
    }
    return summary


def bucketize(signals: List[float]) -> List[Dict[str, Any]]:
    """Bucket signals into 0.05-wide bins from -0.05 to 0.35."""
    edges = [-0.05, 0.0, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35]
    counts = [0] * (len(edges) + 1)  # one bin below lowest, and one above highest
    for s in signals:
        placed = False
        for i, e in enumerate(edges):
            if s < e:
                counts[i] += 1
                placed = True
                break
        if not placed:
            counts[-1] += 1
    labels = [f"<{edges[0]}"]
    for i in range(len(edges) - 1):
        labels.append(f"[{edges[i]}, {edges[i+1]})")
    labels.append(f">={edges[-1]}")
    return [{"bucket": lab, "count": c} for lab, c in zip(labels, counts)]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dirs", nargs="*", help="version tags under generated/portrait-eval/, e.g. v1_20260418")
    ap.add_argument("--all", action="store_true", help="scan every subdirectory under generated/portrait-eval/")
    ap.add_argument("--out", default=None, help="write combined JSON to this path (default: print to stdout)")
    args = ap.parse_args()

    dirs: List[Path]
    if args.all:
        dirs = sorted([p for p in EVAL_ROOT.iterdir() if p.is_dir()])
    elif args.dirs:
        dirs = []
        for tag in args.dirs:
            p = Path(tag)
            if not p.is_absolute() and not p.exists():
                p = EVAL_ROOT / tag
            if not p.exists():
                print(f"warn: {tag} not found, skipping", file=sys.stderr)
                continue
            dirs.append(p)
    else:
        ap.error("provide --dirs or --all")

    summaries = [analyze_dir(d) for d in dirs]
    payload = {"runs": summaries}

    if args.out:
        Path(args.out).write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"wrote {args.out}")
    else:
        # Compact stdout: table-like summary
        for s in summaries:
            print(f"\n=== {s['dir']} ===")
            print(f"  n={s['n_images']}  mean={s['warm_signal_mean']}  std={s['warm_signal_std']}  "
                  f"median={s['warm_signal_median']}  min={s['warm_signal_min']}  max={s['warm_signal_max']}")
            for char, mean in s["per_character_mean"].items():
                print(f"    {char}: {mean}")
        if not args.out:
            print("\n(use --out path.json to save full payload)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
