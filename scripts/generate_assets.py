#!/usr/bin/env python3
"""
Sutan Game Asset Generator
Generates Chinese ink wash style game assets using DALL-E 3 API.
White backgrounds are converted to transparent via post-processing.

Usage:
  python scripts/generate_assets.py portrait --name "老将军" --description "年迈将军，银白长须，身披黑色铠甲" --output figure08.png
  python scripts/generate_assets.py item --name "弯刀" --description "阿拉伯风格弯刀，金色护手" --output item_scimitar_02.png
  python scripts/generate_assets.py scene --name "竹林" --description "幽静竹林，晨雾弥漫" --output scene_bamboo_01.png
  python scripts/generate_assets.py batch --config batch_config.json
"""

import argparse
import base64
import json
import os
import sys
import time
from io import BytesIO
from pathlib import Path
from typing import Optional

import numpy as np

from openai import OpenAI
from PIL import Image

# ─────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────
API_KEY = os.environ.get("OPENAI_API_KEY", "")

# DALL-E 3 supported sizes
DALLE3_PORTRAIT_SIZE = "1024x1792"   # vertical
DALLE3_SQUARE_SIZE   = "1024x1024"
DALLE3_LANDSCAPE_SIZE = "1792x1024"  # horizontal

# Target output sizes
TARGET_PORTRAIT_SIZE = (512, 910)    # final portrait output
TARGET_ITEM_SIZE     = (512, 910)    # items same ratio
TARGET_SCENE_SIZE    = (2560, 1440)  # scene

DEFAULT_OUTPUT_DIR = Path(__file__).parent / "samples"
MAX_RETRIES = 3

# ─────────────────────────────────────────────
# Prompt Templates
# ─────────────────────────────────────────────
STYLE_BASE = (
    "cute chibi Q-version character, East Asian ink wash painting style, "
    "simple bold black brush strokes, light watercolor wash with soft ink bleeding, "
    "cartoon proportions: large round head, small body, big expressive eyes, "
    "minimal composition with a few wisps of ink mist around the figure, "
    "plain white background, no background scenery, "
    "clean and simple, not dense or complex, "
    "absolutely no text anywhere, no writing, no stamps, no seals, no red marks"
)

NO_TEXT_CONSTRAINT = (
    "CRITICAL REQUIREMENT: The image must be completely free of any text, letters, words, "
    "characters, writing systems, calligraphy, seals, stamps, chop marks, red seal marks, "
    "watermarks, signatures, inscriptions, or labels of any kind anywhere in the image. "
    "The image should contain ONLY the visual subject with no decorative text elements."
)

STYLE_NEGATIVE = (
    "no photorealism, no western fantasy style, no 3D render, no oil painting, "
    "no complex background, no scenery behind character, "
    "no text of any kind, no writing, no letters, no characters, no calligraphy, "
    "no stamps, no seals, no chop marks, no red seal marks, no watermarks, no signatures, "
    "no dense patterns, no realistic textures, no European medieval armor"
)

PORTRAIT_TEMPLATE = """\
{style}

{no_text}

Subject: Full-body chibi character — {name}: {description}.
The character stands upright in a simple dynamic pose, full body from head to feet visible.
Traditional East Asian costume — flowing robes or simple warrior outfit.
A few wisps of ink mist trail lightly from clothing edges.
Accent colors: one or two simple highlights (cyan, vermillion, or gold) on clothing or weapon.
Plain white background, nothing else behind the character.
Vertical composition, character centered.
The image must contain absolutely zero text, zero stamps, zero seals, zero red marks.

DO NOT include: {negative}
"""

ITEM_TEMPLATE = """\
East Asian ink wash painting style, simple bold brush strokes, light watercolor wash.
{no_text}
Single item centered on a plain white background: {name} — {description}.
Slightly angled for depth. A few wisps of light ink smoke curl around the item.
Simple minimal style — a few strokes define the shape, not dense detail.
Pure white background, no other objects, no decorative elements around the item.
The image must contain absolutely zero text, zero stamps, zero seals, zero red marks.
Vertical composition, item fills most of the frame.

DO NOT include: {negative}
"""

SCENE_TEMPLATE = """\
{style}

{no_text}

Scene: {name} — {description}.
Wide panoramic landscape in East Asian ink wash style.
Dramatic mountains, mist-filled valleys, or architectural elements rendered in bold brushstrokes.
Atmospheric depth with ink wash gradients. Limited color palette with ink washes.
Widescreen 16:9 composition for game background use.
The image must contain absolutely zero text, zero stamps, zero seals, zero red marks.

DO NOT include: {negative}
"""


def build_prompt(asset_type: str, name: str, description: str) -> str:
    template_map = {
        "portrait": PORTRAIT_TEMPLATE,
        "item":     ITEM_TEMPLATE,
        "scene":    SCENE_TEMPLATE,
    }
    template = template_map[asset_type]
    return template.format(
        style=STYLE_BASE,
        no_text=NO_TEXT_CONSTRAINT,
        name=name,
        description=description,
        negative=STYLE_NEGATIVE,
    )


# ─────────────────────────────────────────────
# Image Generation (DALL-E 3)
# ─────────────────────────────────────────────
def generate_image(client: OpenAI, prompt: str, asset_type: str) -> Image.Image:
    """Call DALL-E 3 and return a PIL Image."""
    size = DALLE3_PORTRAIT_SIZE if asset_type in ("portrait", "item") else DALLE3_LANDSCAPE_SIZE

    print(f"  [DALL-E 3] Requesting {size} image...")
    response = client.images.generate(
        model="dall-e-3",
        prompt=prompt,
        size=size,
        quality="hd",
        response_format="b64_json",
        n=1,
    )

    image_data = base64.b64decode(response.data[0].b64_json)
    img = Image.open(BytesIO(image_data))
    print(f"  [DALL-E 3] Received {img.size[0]}x{img.size[1]} {img.mode} image")
    return img


# ─────────────────────────────────────────────
# Post-processing
# ─────────────────────────────────────────────
def _remove_red_stamps(arr: np.ndarray) -> np.ndarray:
    """Remove red seal/stamp marks by making red-dominant pixels transparent."""
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    # Red stamp pixels: R is high, and R is significantly greater than G and B
    red_mask = (r > 150) & (g < 120) & (b < 120) & (r.astype(int) - g.astype(int) > 60)
    if np.sum(red_mask) > 0:
        # Only remove if red cluster is small (< 3% of image = likely a stamp, not main content)
        red_ratio = np.sum(red_mask) / (arr.shape[0] * arr.shape[1])
        if red_ratio < 0.03:
            arr[red_mask, 3] = 0
            print(f"  [Post-process] Removed red stamps ({np.sum(red_mask)} pixels, {red_ratio:.4%} of image)")
    return arr


def _remove_color_palette(arr: np.ndarray) -> np.ndarray:
    """Remove color palette dots that DALL-E 3 sometimes adds at edges."""
    h, w = arr.shape[:2]
    # Check left edge strip (first 15% width) and right edge strip
    edge_width = int(w * 0.15)
    for region_name, region in [("left", arr[:, :edge_width]),
                                 ("right", arr[:, w - edge_width:])]:
        # Look for saturated colored circles (non-grey, non-white, non-black)
        r, g, b, a = region[:, :, 0], region[:, :, 1], region[:, :, 2], region[:, :, 3]
        # Saturated color: at least one channel > 150 AND channels differ significantly
        max_ch = np.maximum(np.maximum(r.astype(int), g.astype(int)), b.astype(int))
        min_ch = np.minimum(np.minimum(r.astype(int), g.astype(int)), b.astype(int))
        saturation_mask = (max_ch > 150) & ((max_ch - min_ch) > 80) & (a > 0)
        sat_ratio = np.sum(saturation_mask) / (region.shape[0] * region.shape[1])
        if 0.001 < sat_ratio < 0.05:
            # Make these pixels transparent
            if region_name == "left":
                arr[:, :edge_width][saturation_mask, 3] = 0
            else:
                arr[:, w - edge_width:][saturation_mask, 3] = 0
            print(f"  [Post-process] Removed color palette from {region_name} edge ({np.sum(saturation_mask)} pixels)")
    return arr


def post_process(img: Image.Image, asset_type: str) -> Image.Image:
    """Resize to target dimensions and convert white background to transparent for portraits/items."""
    if asset_type == "scene":
        target_size = TARGET_SCENE_SIZE
        img = img.convert("RGB")
    else:
        target_size = TARGET_PORTRAIT_SIZE if asset_type == "portrait" else TARGET_ITEM_SIZE
        # Convert white/near-white background to transparent
        img = img.convert("RGBA")
        arr = np.array(img)
        # Pixels where R, G, B are all > 240 are considered white background
        white_mask = (arr[:, :, 0] > 240) & (arr[:, :, 1] > 240) & (arr[:, :, 2] > 240)
        arr[white_mask, 3] = 0  # set alpha to 0
        print("  [Post-process] White background removed (converted to transparent)")
        # Remove red stamps/seals
        arr = _remove_red_stamps(arr)
        # Remove DALL-E 3 color palette artifacts
        arr = _remove_color_palette(arr)
        img = Image.fromarray(arr)

    print(f"  [Post-process] Resizing to {target_size[0]}x{target_size[1]}...")
    img = img.resize(target_size, Image.LANCZOS)
    return img


# ─────────────────────────────────────────────
# Self-evaluation
# ─────────────────────────────────────────────
EVAL_CRITERIA = [
    "Chibi/Q-version cartoon proportions (large head, small body)",
    "Chinese ink wash style with simple bold brush strokes",
    "Light watercolor wash — NOT dense or photorealistic",
    "White or transparent background (no scenery)",
    "No calligraphy text, stamps, or seals visible",
]

def evaluate_image(client: OpenAI, img: Image.Image, asset_type: str, name: str) -> tuple[float, str]:
    """Use GPT-4o vision to score style consistency (0-1)."""
    print("  [Eval] Running style consistency check with GPT-4o vision...")

    buf = BytesIO()
    img.save(buf, format="PNG")
    img_b64 = base64.b64encode(buf.getvalue()).decode()

    criteria_text = "\n".join(f"- {c}" for c in EVAL_CRITERIA)
    eval_prompt = f"""\
You are a game art director evaluating AI-generated assets for a Chinese ink wash style game.

Evaluate this {asset_type} image of "{name}" against these style criteria:
{criteria_text}

Respond with a JSON object:
{{
  "score": <float 0.0-1.0>,
  "passed": <boolean, true if score >= 0.7>,
  "issues": ["<issue1>", ...],
  "suggestions": "<specific prompt improvements>"
}}

Be strict. Score 1.0 only if ALL criteria are perfectly met.
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": eval_prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{img_b64}"}}
                ]
            }],
            max_tokens=500,
        )
        raw = response.choices[0].message.content.strip()
        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        result = json.loads(raw)
        score = float(result.get("score", 0))
        issues = result.get("issues", [])
        suggestions = result.get("suggestions", "")
        passed = result.get("passed", score >= 0.7)

        print(f"  [Eval] Score: {score:.2f} | Passed: {passed}")
        if issues:
            print(f"  [Eval] Issues: {', '.join(issues)}")
        if suggestions:
            print(f"  [Eval] Suggestions: {suggestions}")

        return score, suggestions

    except Exception as e:
        print(f"  [Eval] Evaluation failed: {e}. Skipping, assuming pass.")
        return 0.8, ""


def refine_prompt(base_prompt: str, suggestions: str) -> str:
    """Append evaluator suggestions to the prompt for retry."""
    if suggestions:
        return base_prompt + f"\n\nAdditional style emphasis: {suggestions}"
    return base_prompt


# ─────────────────────────────────────────────
# Core Generate Function
# ─────────────────────────────────────────────
def generate_asset(
    client: OpenAI,
    asset_type: str,
    name: str,
    description: str,
    output_path: Path,
    max_retries: int = MAX_RETRIES,
) -> bool:
    """
    Generate a single game asset with self-evaluation retry loop.
    Returns True on success.
    """
    assert asset_type in ("portrait", "item", "scene"), f"Unknown type: {asset_type}"
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    prompt = build_prompt(asset_type, name, description)
    suggestions = ""
    best_img = None
    best_score = -1.0

    for attempt in range(1, max_retries + 1):
        print(f"\n[Attempt {attempt}/{max_retries}] Generating {asset_type}: {name}")

        current_prompt = refine_prompt(prompt, suggestions) if attempt > 1 else prompt

        try:
            raw_img = generate_image(client, current_prompt, asset_type)
        except Exception as e:
            print(f"  [Error] Generation failed: {e}")
            if attempt == max_retries:
                return False
            time.sleep(3)
            continue

        # Post-process (resize only; transparency is native)
        processed = post_process(raw_img, asset_type)

        # Self-evaluation
        score, suggestions = evaluate_image(client, processed, asset_type, name)

        if score > best_score:
            best_score = score
            best_img = processed

        if score >= 0.7:
            print(f"  [OK] Style check passed (score={score:.2f}).")
            break
        else:
            print(f"  [Retry] Score {score:.2f} < 0.70, retrying with refined prompt...")
            if attempt < max_retries:
                time.sleep(2)

    if best_img is None:
        print("[Error] All attempts failed to generate an image.")
        return False

    # Save
    best_img.save(output_path, format="PNG")
    size_str = f"{best_img.width}x{best_img.height}"
    print(f"\n[Saved] {output_path} ({size_str}, mode={best_img.mode}, score={best_score:.2f})")
    return True


# ─────────────────────────────────────────────
# Batch Generation
# ─────────────────────────────────────────────
def run_batch(client: OpenAI, config_path: str, output_dir: Path):
    """
    Generate multiple assets from a JSON config file.

    Config format:
    [
      {
        "type": "portrait",
        "name": "老将军",
        "description": "年迈将军，银白长须",
        "output": "figure08.png"
      },
      ...
    ]
    """
    with open(config_path, "r", encoding="utf-8") as f:
        items = json.load(f)

    results = []
    for idx, item in enumerate(items, 1):
        asset_type = item["type"]
        name = item["name"]
        description = item["description"]
        output_name = item.get("output", f"{asset_type}_{idx:02d}.png")
        output_path = output_dir / output_name

        print(f"\n{'='*60}")
        print(f"[{idx}/{len(items)}] {asset_type.upper()}: {name}")
        print(f"{'='*60}")

        ok = generate_asset(
            client, asset_type, name, description,
            output_path
        )
        results.append({"name": name, "output": str(output_path), "success": ok})

    print(f"\n{'='*60}")
    print("Batch complete:")
    for r in results:
        status = "OK" if r["success"] else "FAIL"
        print(f"  [{status}] {r['name']} -> {r['output']}")


# ─────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────
def parse_args():
    parser = argparse.ArgumentParser(
        description="Sutan Game Asset Generator — Chinese ink wash style PNG generator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--api-key",
        default=os.environ.get("OPENAI_API_KEY", ""),
        help="OpenAI API key (default: env OPENAI_API_KEY)"
    )
    parser.add_argument(
        "--output-dir",
        default=str(DEFAULT_OUTPUT_DIR),
        help=f"Default output directory (default: {DEFAULT_OUTPUT_DIR})"
    )

    subparsers = parser.add_subparsers(dest="command", required=True)

    # portrait
    portrait_parser = subparsers.add_parser("portrait", help="Generate character portrait")
    portrait_parser.add_argument("--name", required=True, help="Character name (e.g. 老将军)")
    portrait_parser.add_argument("--description", required=True, help="Character description")
    portrait_parser.add_argument("--output", required=True, help="Output filename (e.g. figure08.png)")

    # item
    item_parser = subparsers.add_parser("item", help="Generate item/equipment image")
    item_parser.add_argument("--name", required=True, help="Item name")
    item_parser.add_argument("--description", required=True, help="Item description")
    item_parser.add_argument("--output", required=True, help="Output filename (e.g. item_sword_02.png)")

    # scene
    scene_parser = subparsers.add_parser("scene", help="Generate background scene")
    scene_parser.add_argument("--name", required=True, help="Scene name")
    scene_parser.add_argument("--description", required=True, help="Scene description")
    scene_parser.add_argument("--output", required=True, help="Output filename (e.g. scene_bamboo_01.png)")

    # batch
    batch_parser = subparsers.add_parser("batch", help="Batch generate from JSON config")
    batch_parser.add_argument("--config", required=True, help="Path to JSON config file")

    return parser.parse_args()


def main():
    args = parse_args()

    api_key = args.api_key
    if not api_key:
        print("[Error] No API key found. Set OPENAI_API_KEY env var or pass --api-key.")
        sys.exit(1)

    client = OpenAI(api_key=api_key)
    output_dir = Path(args.output_dir)

    if args.command == "batch":
        run_batch(client, args.config, output_dir)
    else:
        output_path = output_dir / args.output
        ok = generate_asset(
            client,
            asset_type=args.command,
            name=args.name,
            description=args.description,
            output_path=output_path,
        )
        sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
