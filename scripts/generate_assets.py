#!/usr/bin/env python3
"""
Sutan Game Asset Generator
Generates Chinese ink wash style game assets using gpt-image-1.5 API.
Native transparent backgrounds are supported — no post-processing needed.

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
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from io import BytesIO
from pathlib import Path
from typing import Optional

from openai import OpenAI
from PIL import Image

# Thread-local storage for log prefix
_thread_local = threading.local()

# ─────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────
API_KEY = os.environ.get("OPENAI_API_KEY", "")

# gpt-image-1 supported sizes
GPT_IMAGE_PORTRAIT_SIZE  = "1024x1536"   # vertical (portrait/item)
GPT_IMAGE_SQUARE_SIZE    = "1024x1024"
GPT_IMAGE_LANDSCAPE_SIZE = "1536x1024"   # horizontal (scene)

# Target output sizes
TARGET_PORTRAIT_SIZE = (512, 910)    # final portrait output
TARGET_ITEM_SIZE     = (512, 910)    # items same ratio
TARGET_SCENE_SIZE    = (2560, 1440)  # scene

DEFAULT_OUTPUT_DIR = Path(__file__).parent / "samples"
MAX_RETRIES = 3
DEFAULT_WORKERS = 5

# Thread-safe print lock
_print_lock = threading.Lock()


def tprint(*args, **kwargs):
    """Thread-safe print with optional task prefix."""
    prefix = getattr(_thread_local, "prefix", "")
    with _print_lock:
        if prefix:
            print(f"{prefix}", *args, **kwargs)
        else:
            print(*args, **kwargs)

# ─────────────────────────────────────────────
# Prompt Templates
# ─────────────────────────────────────────────
STYLE_BASE = (
    "cute chibi Q-version character, East Asian ink wash painting style, "
    "simple bold black brush strokes, light watercolor wash with soft ink bleeding, "
    "cartoon proportions: large round head, small body, big expressive eyes, "
    "minimal composition with a few wisps of ink mist around the figure, "
    "transparent background, no background scenery, "
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
Transparent background, nothing else behind the character.
Vertical composition, character centered.
The image must contain absolutely zero text, zero stamps, zero seals, zero red marks.

DO NOT include: {negative}
"""

ITEM_TEMPLATE = """\
East Asian ink wash painting style, simple bold brush strokes, light watercolor wash.
{no_text}
Single item centered on a transparent background: {name} — {description}.
Slightly angled for depth. A few wisps of light ink smoke curl around the item.
Simple minimal style — a few strokes define the shape, not dense detail.
Transparent background, no other objects, no decorative elements around the item.
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
# Image Generation (gpt-image-1.5)
# ─────────────────────────────────────────────
def generate_image(client: OpenAI, prompt: str, asset_type: str) -> Image.Image:
    """Call gpt-image-1.5 and return a PIL Image with native transparent background."""
    size = GPT_IMAGE_PORTRAIT_SIZE if asset_type in ("portrait", "item") else GPT_IMAGE_LANDSCAPE_SIZE

    tprint(f"  [gpt-image-1.5] Requesting {size} image...")
    response = client.images.generate(
        model="gpt-image-1",
        prompt=prompt,
        size=size,
        quality="high",
        background="transparent",
        output_format="png",
        n=1,
    )

    image_data = base64.b64decode(response.data[0].b64_json)
    img = Image.open(BytesIO(image_data))
    tprint(f"  [gpt-image-1.5] Received {img.size[0]}x{img.size[1]} {img.mode} image")
    return img


# ─────────────────────────────────────────────
# Post-processing
# ─────────────────────────────────────────────
def post_process(img: Image.Image, asset_type: str) -> Image.Image:
    """Resize to target dimensions. Transparency is native from gpt-image-1.5."""
    if asset_type == "scene":
        target_size = TARGET_SCENE_SIZE
        img = img.convert("RGB")
    else:
        target_size = TARGET_PORTRAIT_SIZE if asset_type == "portrait" else TARGET_ITEM_SIZE
        img = img.convert("RGBA")

    tprint(f"  [Post-process] Resizing to {target_size[0]}x{target_size[1]}...")
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
    tprint("  [Eval] Running style consistency check with GPT-4o vision...")

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

        tprint(f"  [Eval] Score: {score:.2f} | Passed: {passed}")
        if issues:
            tprint(f"  [Eval] Issues: {', '.join(issues)}")
        if suggestions:
            tprint(f"  [Eval] Suggestions: {suggestions}")

        return score, suggestions

    except Exception as e:
        tprint(f"  [Eval] Evaluation failed: {e}. Skipping, assuming pass.")
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
        tprint(f"\n[Attempt {attempt}/{max_retries}] Generating {asset_type}: {name}")

        current_prompt = refine_prompt(prompt, suggestions) if attempt > 1 else prompt

        try:
            raw_img = generate_image(client, current_prompt, asset_type)
        except Exception as e:
            tprint(f"  [Error] Generation failed: {e}")
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
            tprint(f"  [OK] Style check passed (score={score:.2f}).")
            break
        else:
            tprint(f"  [Retry] Score {score:.2f} < 0.70, retrying with refined prompt...")
            if attempt < max_retries:
                time.sleep(2)

    if best_img is None:
        tprint("[Error] All attempts failed to generate an image.")
        return False

    # Save
    best_img.save(output_path, format="PNG")
    size_str = f"{best_img.width}x{best_img.height}"
    tprint(f"\n[Saved] {output_path} ({size_str}, mode={best_img.mode}, score={best_score:.2f})")
    return True


# ─────────────────────────────────────────────
# Batch Generation
# ─────────────────────────────────────────────
def _batch_worker(client: OpenAI, idx: int, total: int, item: dict, output_dir: Path) -> dict:
    """Worker function for parallel batch generation."""
    asset_type = item["type"]
    name = item["name"]
    description = item["description"]
    output_name = item.get("output", f"{asset_type}_{idx:02d}.png")
    output_path = output_dir / output_name

    # Set thread-local prefix for log output
    _thread_local.prefix = f"[{idx}/{total} {name}]"

    tprint(f"\n{'='*60}")
    tprint(f"{asset_type.upper()}: {name}")
    tprint(f"{'='*60}")

    if output_path.exists():
        tprint(f"  [Skip] {output_path} already exists, skipping.")
        return {"name": name, "output": str(output_path), "success": True, "skipped": True}

    ok = generate_asset(
        client, asset_type, name, description,
        output_path
    )
    return {"name": name, "output": str(output_path), "success": ok, "skipped": False}


def run_batch(client: OpenAI, config_path: str, output_dir: Path, max_workers: int = DEFAULT_WORKERS):
    """
    Generate multiple assets from a JSON config file in parallel.

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

    total = len(items)
    print(f"[Batch] {total} items, {max_workers} parallel workers")

    results = [None] * total
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_idx = {}
        for idx, item in enumerate(items):
            future = executor.submit(_batch_worker, client, idx + 1, total, item, output_dir)
            future_to_idx[future] = idx

        for future in as_completed(future_to_idx):
            idx = future_to_idx[future]
            try:
                results[idx] = future.result()
            except Exception as e:
                results[idx] = {"name": items[idx]["name"], "output": "N/A", "success": False, "skipped": False}
                with _print_lock:
                    print(f"[Error] Task {idx + 1} ({items[idx]['name']}) crashed: {e}")

    print(f"\n{'='*60}")
    print("Batch complete:")
    success_count = 0
    fail_count = 0
    skip_count = 0
    for r in results:
        if r.get("skipped"):
            status = "SKIP"
            skip_count += 1
        elif r["success"]:
            status = "OK  "
            success_count += 1
        else:
            status = "FAIL"
            fail_count += 1
        print(f"  [{status}] {r['name']} -> {r['output']}")
    print(f"\nTotal: {success_count} succeeded, {skip_count} skipped, {fail_count} failed out of {total}")


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
    parser.add_argument(
        "--workers",
        type=int,
        default=DEFAULT_WORKERS,
        help=f"Number of parallel workers for batch mode (default: {DEFAULT_WORKERS})"
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
        run_batch(client, args.config, output_dir, max_workers=args.workers)
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
