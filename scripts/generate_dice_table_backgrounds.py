#!/usr/bin/env python3
import argparse
import base64
import os
from io import BytesIO
from pathlib import Path

from openai import OpenAI
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "src" / "renderer" / "public" / "dice-box"
SIZE = "1024x1024"

STYLE_BASE = (
    "Ancient Chinese tabletop background for 3D dice rolling, cute stylized ink-wash game art, "
    "Chinese wuxia atmosphere inspired by cold northern frontier aesthetics, warm wood and brown tones, "
    "top-down or slight top-down camera, tabletop fills the frame, suitable as a game background, "
    "clean central rolling area, decorative elements only in corners or edges, no clutter, no strong perspective distortion"
)

NO_TEXT = (
    "Absolutely no text, no letters, no Chinese characters, no calligraphy, no seals, no red stamps, "
    "no labels, no logos, no watermark."
)

COMMON_REQUIREMENTS = (
    "Main subject is a wooden table surface with visible natural wood grain, slightly worn ancient texture, "
    "soft ink-wash bloom details, warm lighting, elegant but understated Chinese style. "
    "Keep the middle 60 percent area visually open so rolling dice remain clear and readable. "
    "Do not place objects in the center. "
    "No people, no hands, no dramatic props, no busy composition, no photorealism, no modern objects."
)

PROMPTS = [
    (
        "table-bg-1.png",
        "Variation 1: dark red sandalwood table, minimalist and clean. "
        "Only subtle ink wash shading near the corners, no extra objects."
    ),
    (
        "table-bg-2.png",
        "Variation 2: wooden table with a calligraphy brush and inkstone as small corner accents. "
        "Place them near one edge only, restrained and elegant."
    ),
    (
        "table-bg-3.png",
        "Variation 3: wooden table with a cropped Go board corner and a few black-white stones near the border. "
        "Very subtle, low visual weight, avoid center."
    ),
    (
        "table-bg-4.png",
        "Variation 4: wooden table with bamboo slips or a rolled scroll placed along one side. "
        "Soft scholarly atmosphere, still keeping the center open."
    ),
]


def build_prompt(variation: str) -> str:
    return f"{STYLE_BASE}. {NO_TEXT} {COMMON_REQUIREMENTS} {variation}"


def generate_image(client: OpenAI, prompt: str) -> Image.Image:
    response = client.images.generate(
        model="gpt-image-1",
        prompt=prompt,
        size=SIZE,
        quality="high",
        output_format="png",
        n=1,
    )
    image_data = base64.b64decode(response.data[0].b64_json)
    return Image.open(BytesIO(image_data)).convert("RGBA")


def save_image(image: Image.Image, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    image.save(output_path)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--api-key", default=os.environ.get("OPENAI_API_KEY", ""))
    args = parser.parse_args()

    if not args.api_key:
        raise SystemExit("Missing OpenAI API key. Pass --api-key or set OPENAI_API_KEY.")

    client = OpenAI(api_key=args.api_key)

    for filename, variation in PROMPTS:
        prompt = build_prompt(variation)
        print(f"Generating {filename}...")
        image = generate_image(client, prompt)
        save_image(image, OUTPUT_DIR / filename)
        print(f"Saved {OUTPUT_DIR / filename}")


if __name__ == "__main__":
    main()