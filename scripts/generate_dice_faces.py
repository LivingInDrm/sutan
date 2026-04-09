from pathlib import Path
import shutil

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
PUBLIC_DIR = ROOT / "src" / "renderer" / "public"
ASSETS_DIR = ROOT / "src" / "renderer" / "assets" / "dice"
BASE_TEXTURE = PUBLIC_DIR / "dice-face.png"
SIZE = 512
RED = "#c53030"
BLACK = "#18181b"
THEME_ROOT = Path("/tmp/dice-box/demo/react-project/public/external-themes/chinese-pip")
SOURCE_THEME_ROOT = Path("/tmp/dice-box-themes/themes/default")
DEMO_DEFAULT_THEME_ROOT = Path("/tmp/dice-box/demo/react-project/public/external-themes/default")
DEBUG_COLORS = {
    "tl": "#f97316",
    "tr": "#22c55e",
    "bl": "#3b82f6",
    "br": "#eab308",
}


POSITIONS = {
    "tl": (0.28, 0.28),
    "tr": (0.72, 0.28),
    "ml": (0.28, 0.5),
    "mr": (0.72, 0.5),
    "bl": (0.28, 0.72),
    "br": (0.72, 0.72),
    "c": (0.5, 0.5),
}


FACES = {
    1: ["c"],
    2: ["tl", "br"],
    3: ["tl", "c", "br"],
    4: ["tl", "tr", "bl", "br"],
    5: ["tl", "tr", "c", "bl", "br"],
    6: ["tl", "tr", "ml", "mr", "bl", "br"],
}

D6_ATLAS_RECTS = {
    1: (831, 2, 998, 167),
    2: (831, 182, 998, 348),
    3: (831, 352, 998, 518),
    4: (831, 522, 998, 688),
    5: (217, 816, 384, 982),
    6: (385, 816, 553, 982),
}

D6_ROTATIONS = {
    1: 0,
    2: 90,
    3: -90,
    4: 180,
    5: -90,
    6: 90,
}

ROTATION_NAME_MAP = {
    0: {
        "tl": "tl",
        "tr": "tr",
        "ml": "ml",
        "mr": "mr",
        "bl": "bl",
        "br": "br",
        "c": "c",
    },
    1: {
        "tl": "tr",
        "tr": "br",
        "ml": "mr",
        "mr": "ml",
        "bl": "tl",
        "br": "bl",
        "c": "c",
    },
    2: {
        "tl": "br",
        "tr": "bl",
        "ml": "mr",
        "mr": "ml",
        "bl": "tr",
        "br": "tl",
        "c": "c",
    },
    3: {
        "tl": "bl",
        "tr": "tl",
        "ml": "mr",
        "mr": "ml",
        "bl": "br",
        "br": "tr",
        "c": "c",
    },
}


def hex_to_rgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[index:index + 2], 16) for index in (0, 2, 4))


def build_background() -> Image.Image:
    base = Image.open(BASE_TEXTURE).convert("RGBA").resize((SIZE, SIZE))
    overlay = Image.new("RGBA", (SIZE, SIZE), (245, 236, 214, 255))
    return Image.alpha_composite(base, overlay)


def build_theme_background() -> Image.Image:
    base = Image.open(BASE_TEXTURE).convert("RGBA")
    crop = base.crop((192, 192, 832, 832))
    return crop.resize((1024, 1024), Image.Resampling.LANCZOS)


def draw_pip(mask_draw: ImageDraw.ImageDraw, center: tuple[float, float], radius: float) -> None:
    x, y = center
    mask_draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=255)


def create_face(face_value: int) -> None:
    background = build_background()
    pip_color = RED if face_value in {1, 4} else BLACK
    pip_rgb = hex_to_rgb(pip_color)

    shadow_layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow_layer)
    inner_shadow_layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    inner_shadow_draw = ImageDraw.Draw(inner_shadow_layer)
    highlight_layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    highlight_draw = ImageDraw.Draw(highlight_layer)
    pip_layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    pip_draw = ImageDraw.Draw(pip_layer)

    radius = SIZE * 0.082
    for key in FACES[face_value]:
        px = POSITIONS[key][0] * SIZE
        py = POSITIONS[key][1] * SIZE
        shadow_draw.ellipse(
            (px - radius, py - radius + 7, px + radius, py + radius + 7),
            fill=(70, 46, 30, 72),
        )
        inner_shadow_draw.ellipse(
            (px - radius + 4, py - radius + 5, px + radius - 2, py + radius + 1),
            fill=(72, 44, 24, 96),
        )
        highlight_draw.ellipse(
            (px - radius - 2, py - radius - 4, px + radius - 8, py + radius - 10),
            fill=(255, 255, 255, 40),
        )
        pip_draw.ellipse(
            (px - radius, py - radius, px + radius, py + radius),
            fill=(*pip_rgb, 255),
        )

    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(8))
    inner_shadow_layer = inner_shadow_layer.filter(ImageFilter.GaussianBlur(3))
    highlight_layer = highlight_layer.filter(ImageFilter.GaussianBlur(5))

    result = Image.alpha_composite(background, shadow_layer)
    result = Image.alpha_composite(result, pip_layer)
    result = Image.alpha_composite(result, inner_shadow_layer)
    result = Image.alpha_composite(result, highlight_layer)

    output = PUBLIC_DIR / f"dice-face-{face_value}.png"
    result.save(output)


def create_debug_face(face_value: int) -> None:
    background = build_background()
    draw = ImageDraw.Draw(background)
    font = ImageFont.load_default()
    center = SIZE / 2
    margin = 70

    draw.line((center, margin, center, SIZE - margin), fill="#111827", width=8)
    draw.line((margin, center, SIZE - margin, center), fill="#111827", width=8)
    draw.polygon(
        [
            (center, margin - 18),
            (center - 22, margin + 24),
            (center + 22, margin + 24),
        ],
        fill="#dc2626",
    )
    draw.text((center - 10, margin + 34), "UP", fill="#dc2626", font=font)
    draw.text((center - 6, center - 8), str(face_value), fill="#111827", font=font)

    for key, color in DEBUG_COLORS.items():
        px = POSITIONS[key][0] * SIZE
        py = POSITIONS[key][1] * SIZE
        draw.ellipse((px - 28, py - 28, px + 28, py + 28), fill=color)
        draw.text((px - 10, py - 8), key.upper(), fill="#ffffff", font=font)

    output = PUBLIC_DIR / f"dice-face-debug-{face_value}.png"
    background.save(output)


def rotate_position(key: str, quarter_turns: int) -> str:
    return ROTATION_NAME_MAP[quarter_turns % 4][key]


def create_d6_pip_positions(face_value: int, rotation_degrees: int) -> list[str]:
    quarter_turns = (rotation_degrees // 90) % 4
    return [rotate_position(key, quarter_turns) for key in FACES[face_value]]


def build_face_tile(face_value: int, rotation_degrees: int, size: tuple[int, int]) -> Image.Image:
    width, height = size
    tile = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(tile)
    radius = 10
    pip_color = RED if face_value in {1, 4} else BLACK
    for key in create_d6_pip_positions(face_value, rotation_degrees):
        px = POSITIONS[key][0] * width
        py = POSITIONS[key][1] * height
        draw.ellipse((px - radius, py - radius, px + radius, py + radius), fill=hex_to_rgb(pip_color) + (255,))
    return tile


def create_d6_diffuse_atlas() -> Image.Image:
    atlas = build_theme_background()
    for face_value, rect in D6_ATLAS_RECTS.items():
        left, top, right, bottom = rect
        tile = build_face_tile(face_value, D6_ROTATIONS[face_value], (right - left, bottom - top))
        atlas.alpha_composite(tile, (left, top))
    return atlas


def create_flat_normal(size: int = 1024) -> Image.Image:
    return Image.new("RGB", (size, size), (128, 128, 255))


def export_chinese_pip_theme() -> None:
    THEME_ROOT.mkdir(parents=True, exist_ok=True)
    atlas = create_d6_diffuse_atlas()
    atlas.save(THEME_ROOT / "diffuse-dark.png")
    atlas.save(THEME_ROOT / "diffuse-light.png")
    create_flat_normal().save(THEME_ROOT / "normal.png")
    for filename in ("default.json", "theme.config.json", "package.json", "specular.jpg"):
        source = SOURCE_THEME_ROOT / filename
        if not source.exists():
            source = DEMO_DEFAULT_THEME_ROOT / filename
        if source.exists():
            shutil.copy2(source, THEME_ROOT / filename)


def main() -> None:
    for face_value in range(1, 7):
        create_face(face_value)
        create_debug_face(face_value)
        shutil.copy2(PUBLIC_DIR / f"dice-face-{face_value}.png", ASSETS_DIR / f"dice-face-{face_value}.png")
    export_chinese_pip_theme()


if __name__ == "__main__":
    main()