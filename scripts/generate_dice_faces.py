from pathlib import Path

from PIL import Image, ImageDraw, ImageOps


ROOT = Path(__file__).resolve().parents[1]
PUBLIC_DIR = ROOT / "src" / "renderer" / "public"
BASE_TEXTURE = PUBLIC_DIR / "dice-face.png"
SIZE = 512
RED = "#c53030"
BLACK = "#18181b"
SUPERSAMPLE = 4

POSITIONS = {
    "tl": (0.22, 0.22),
    "tr": (0.78, 0.22),
    "ml": (0.22, 0.5),
    "mr": (0.78, 0.5),
    "bl": (0.22, 0.78),
    "br": (0.78, 0.78),
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


def hex_to_rgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[index:index + 2], 16) for index in (0, 2, 4))


def build_background() -> Image.Image:
    base = Image.open(BASE_TEXTURE).convert("RGBA")
    return ImageOps.fit(base, (SIZE, SIZE), Image.Resampling.LANCZOS)


def create_face(face_value: int) -> None:
    background = build_background()
    supersampled = background.resize((SIZE * SUPERSAMPLE, SIZE * SUPERSAMPLE), Image.Resampling.LANCZOS)
    draw = ImageDraw.Draw(supersampled)
    pip_color = RED if face_value in {1, 4} else BLACK
    pip_rgb = hex_to_rgb(pip_color)
    radius = int(SIZE * SUPERSAMPLE * 0.11)
    for key in FACES[face_value]:
        x = int(POSITIONS[key][0] * SIZE * SUPERSAMPLE)
        y = int(POSITIONS[key][1] * SIZE * SUPERSAMPLE)
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(*pip_rgb, 255))
    supersampled.resize((SIZE, SIZE), Image.Resampling.LANCZOS).save(PUBLIC_DIR / f"dice-face-{face_value}.png")


def main() -> None:
    for face_value in range(1, 7):
        create_face(face_value)


if __name__ == "__main__":
    main()