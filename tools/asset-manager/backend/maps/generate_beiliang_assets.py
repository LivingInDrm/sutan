#!/usr/bin/env python3
"""
Generate map assets for Beiliang (北凉) region.

Terrain-specific prompts — NO character/chibi/portrait vocabulary.
"""

import base64
import json
import os
from dataclasses import dataclass
from pathlib import Path

from openai import OpenAI

OUTPUT_DIR = Path(__file__).resolve().parent / "beiliang"

# ─────────────────────────────────────────────
# Prompt constants — terrain & architecture only
# ─────────────────────────────────────────────

# Shared style base for map assets: East Asian ink wash, NO characters
MAP_STYLE_BASE = (
    "Traditional East Asian ink wash painting (水墨画) style. "
    "East Asian ink wash painting style with vibrant natural color accents, rich and varied color palette, "
    "expressive brushwork, classical Chinese painting aesthetics. "
    "NO human figures, NO portraits, NO characters, NO people, NO faces, NO text, NO labels, NO UI elements."
)

# Style for terrain background: bird's-eye map view
TERRAIN_STYLE = (
    MAP_STYLE_BASE + " "
    "Bird's-eye aerial map view (鸟瞰地图视角), top-down perspective, "
    "vast landscape, cartographic illustration style suitable as a game map background."
)

# Style for building icons: single landmark, map icon
ICON_STYLE = (
    MAP_STYLE_BASE + " "
    "Single architectural landmark illustration, icon composition, "
    "clear silhouette suitable for overlaying on a map, "
    "centered subject, transparent-compatible edges."
)


def build_terrain_prompt() -> str:
    """Prompt for the full-width Beiliang terrain background map."""
    return (
        TERRAIN_STYLE + "\n\n"
        "Subject: Northern Liang (北凉) border terrain map background. "
        "Landscape transitions from south to north: "
        "southern rolling hills and mountain ranges with sparse vegetation; "
        "central vast yellow-sand Gobi desert (戈壁) with a winding river valley; "
        "northern snowfields and cold rugged mountain ridges. "
        "Color palette: warm sandy yellow and ochre in the south-center, "
        "cold grey-white in the north, muted earth tones throughout. "
        "Terrain layers clearly distinguished. Wide horizontal panoramic composition (landscape orientation). "
        "NO buildings, NO structures, NO roads, NO text, NO human figures."
    )


def build_icon_prompt(subject_cn: str, subject_en: str, color_hint: str = "") -> str:
    """Prompt for a single architectural/landmark map icon."""
    color_clause = f"Color palette: {color_hint}. " if color_hint else ""
    return (
        ICON_STYLE + "\n\n"
        f"Subject: {subject_cn} — {subject_en}. "
        "Architectural landmark viewed at a slight elevation angle, "
        "well-defined silhouette, fine ink line detail on rooftops and structural elements, "
        "rich color washes to highlight material and atmosphere. "
        f"{color_clause}"
        "Square icon composition with generous negative space around the subject. "
        "NO human figures, NO text, NO labels."
    )


@dataclass
class AssetSpec:
    name: str
    filename: str
    size: str
    background: str
    prompt: str


def load_client() -> OpenAI:
    """Load OpenAI client, preferring /tmp/oai.key then OPENAI_API_KEY env var."""
    key_file = Path("/tmp/oai.key")
    api_key = ""
    if key_file.exists():
        api_key = key_file.read_text().strip()
    if not api_key:
        api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError(
            "OpenAI API key not found. "
            "Put the key in /tmp/oai.key or set the OPENAI_API_KEY environment variable."
        )
    return OpenAI(api_key=api_key)


def generate_with_images(client: OpenAI, prompt: str, size: str, background: str) -> bytes:
    response = client.images.generate(
        model="gpt-image-1",
        prompt=prompt,
        size=size,
        quality="high",
        background=background,
        output_format="png",
        n=1,
    )
    if not response.data or not response.data[0].b64_json:
        raise RuntimeError("Image generation response missing data")
    return base64.b64decode(response.data[0].b64_json)


def save_bytes(path: Path, image_bytes: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(image_bytes)


def build_specs() -> list[AssetSpec]:
    return [
        AssetSpec(
            name="北凉道与边塞地形背景",
            filename="terrain_bg.png",
            size="1536x1024",
            background="opaque",
            prompt=build_terrain_prompt(),
        ),
        AssetSpec(
            name="清凉山王府",
            filename="icon_01_qingliangshan.png",
            size="1024x1024",
            background="transparent",
            prompt=build_icon_prompt(
                "清凉山王府",
                "grand princely palace compound on a mountain ridge, "
                "sweeping curved roof eaves, fortress walls, imposing gate towers",
                color_hint=(
                    "vermillion red gates and columns, golden glazed roof tiles, "
                    "dark grey stone fortress walls, deep teal accents on eave brackets"
                ),
            ),
        ),
        AssetSpec(
            name="听潮亭",
            filename="icon_02_tingchaoting.png",
            size="1024x1024",
            background="transparent",
            prompt=build_icon_prompt(
                "听潮亭",
                "elegant waterside pavilion on stilts over water, "
                "octagonal or square roof, carved wooden railings, calm water reflections",
                color_hint=(
                    "teal-green roof tiles, warm brown wooden pillars and railings, "
                    "azure blue calm water with soft reflections"
                ),
            ),
        ),
        AssetSpec(
            name="陵州城市集",
            filename="icon_03_lingzhou.png",
            size="1024x1024",
            background="transparent",
            prompt=build_icon_prompt(
                "陵州城市集",
                "bustling market street with merchant stalls, "
                "cloth awnings, wooden shop signs, goods on display, city gate arch in background",
                color_hint=(
                    "bright red hanging lanterns, colorful cloth awnings in blue green and yellow, "
                    "warm golden-amber tones on wooden shopfronts"
                ),
            ),
        ),
        AssetSpec(
            name="芦苇荡渡口",
            filename="icon_04_luweidang.png",
            size="1024x1024",
            background="transparent",
            prompt=build_icon_prompt(
                "芦苇荡渡口",
                "river ferry dock surrounded by tall reed marshes, "
                "wooden flat-bottomed boat moored at a simple pier, misty water atmosphere",
                color_hint=(
                    "emerald green reeds and marsh grasses, dark brown weathered wooden boat and pier, "
                    "misty pale blue-grey water surface"
                ),
            ),
        ),
        AssetSpec(
            name="白马游弩校场",
            filename="icon_05_baima.png",
            size="1024x1024",
            background="transparent",
            prompt=build_icon_prompt(
                "白马游弩校场",
                "military training ground, archery range with straw targets, "
                "banners and pennants on poles, wooden practice dummies, fence perimeter",
                color_hint=(
                    "military olive-green banners and pennants, sandy earth-yellow ground, "
                    "red bullseye targets, dark brown wooden fence and dummies"
                ),
            ),
        ),
        AssetSpec(
            name="龙睛郡牧场",
            filename="icon_06_longjing.png",
            size="1024x1024",
            background="transparent",
            prompt=build_icon_prompt(
                "龙睛郡牧场",
                "open grassland ranch with wooden fence enclosures, "
                "stable building with thatched roof, horses grazing in a paddock",
                color_hint=(
                    "lush vivid green pasture grass, warm brown wooden fences and stable, "
                    "soft blue sky hints in the background"
                ),
            ),
        ),
        AssetSpec(
            name="幽州马市",
            filename="icon_07_youzhou.png",
            size="1024x1024",
            background="transparent",
            prompt=build_icon_prompt(
                "幽州马市",
                "horse trading market, canvas tent stalls and canopies, "
                "wooden hitching posts, open-air bazaar atmosphere",
                color_hint=(
                    "warm brown and tan canvas tents, ochre dry ground, "
                    "colorful textiles and trade goods in red blue and orange"
                ),
            ),
        ),
        AssetSpec(
            name="北凉暗驿",
            filename="icon_08_anji.png",
            size="1024x1024",
            background="transparent",
            prompt=build_icon_prompt(
                "北凉暗驿",
                "remote wilderness waystation, small single-story lodge "
                "with a tiled or thatched roof, lone signpost, surrounded by barren landscape",
                color_hint=(
                    "dark muted grey and brown tones, dim amber lamplight glowing from a window, "
                    "desolate pale earth and dusty ground"
                ),
            ),
        ),
        AssetSpec(
            name="流州边关",
            filename="icon_09_liuzhou.png",
            size="1024x1024",
            background="transparent",
            prompt=build_icon_prompt(
                "流州边关",
                "frontier pass with tall battlemented city walls, "
                "beacon fire tower (烽火台) with smoke signal, arched gate opening",
                color_hint=(
                    "grey-white weathered stone walls, vivid orange-red beacon fire smoke rising, "
                    "dark green moss patches on ancient stone"
                ),
            ),
        ),
        AssetSpec(
            name="葫芦口前哨",
            filename="icon_10_hulukou.png",
            size="1024x1024",
            background="transparent",
            prompt=build_icon_prompt(
                "葫芦口前哨",
                "military outpost camp, cluster of canvas campaign tents, "
                "battle standards and war banners on poles, simple wooden palisade wall",
                color_hint=(
                    "military brown and khaki canvas tents, crimson red war banners and battle standards, "
                    "yellow sandy ground, dark brown wooden palisade"
                ),
            ),
        ),
    ]


# ─────────────────────────────────────────────
# Validation: ensure no *positive* character-drawing instructions
# (negation phrases like "NO characters" are fine and expected)
# ─────────────────────────────────────────────

# Keywords that should NEVER appear in a positive drawing context.
# Each entry is a phrase that only makes sense as a positive instruction.
FORBIDDEN_POSITIVE_PATTERNS = [
    "cute chibi",
    "chibi proportions",
    "Q版人物",
    "Q版角色",
    "卡通人物",
    "character portrait",
    "character standing",
    "anime character",
    "manga character",
    "kawaii",
    "chibi",          # "chibi" by itself is always a character style cue
    "人物立绘",
    "角色立绘",
]

# Single words that are only harmful if NOT preceded by "NO" / "无" / "不"
FORBIDDEN_SINGLE_WORDS = [
    # These appear in the old STYLE_BASE positively, but not in our new prompts.
    # We'll do a smarter context check below.
]


def validate_prompt(prompt: str, name: str) -> None:
    """
    Check that the prompt contains no positive character-drawing instructions.
    Negation phrases (e.g. "NO characters", "NO portraits", "NO human figures")
    are explicitly allowed and intentional.
    """
    found = []
    pl = prompt.lower()
    for pattern in FORBIDDEN_POSITIVE_PATTERNS:
        if pattern.lower() in pl:
            found.append(pattern)
    if found:
        raise ValueError(
            f"[ABORT] Prompt for '{name}' contains forbidden positive-character keywords: {found}\n"
            f"Prompt:\n{prompt}"
        )


def main() -> int:
    PROJECT_ROOT = Path(__file__).resolve().parents[4]
    client = load_client()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    specs = build_specs()

    # ── Filter: only regenerate the 10 building icons, skip terrain_bg ───────
    icon_specs = [s for s in specs if s.filename.startswith("icon_")]

    # ── P0: Print and validate all prompts BEFORE any API calls ──────────────
    print("=" * 70)
    print("PROMPT VALIDATION — checking for forbidden character keywords")
    print(f"  [INFO] Skipping terrain_bg — only regenerating {len(icon_specs)} building icons")
    print("=" * 70)
    for spec in icon_specs:
        print(f"\n[{spec.filename}]")
        print(spec.prompt)
        print("-" * 40)
        validate_prompt(spec.prompt, spec.name)
        print(f"  OK — no forbidden keywords found")
    print("\n" + "=" * 70)
    print("All prompts validated. Proceeding with image generation...")
    print("=" * 70 + "\n")

    # ── Generate images ───────────────────────────────────────────────────────
    results = []
    for spec in icon_specs:
        print(f"Generating {spec.filename} ({spec.name}) ...")
        try:
            image_bytes = generate_with_images(client, spec.prompt, spec.size, spec.background)
            save_path = OUTPUT_DIR / spec.filename
            save_bytes(save_path, image_bytes)
            results.append({"name": spec.name, "file": str(save_path.relative_to(PROJECT_ROOT))})
            print(f"  Saved -> {save_path}")
        except Exception as exc:
            print(f"  ERROR: {exc}")
            results.append({"name": spec.name, "error": str(exc)})

    print("\n" + "=" * 70)
    print("Generation complete:")
    print(json.dumps(results, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
