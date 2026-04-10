import argparse
import json
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
THEMES_ROOT = ROOT / "src" / "renderer" / "public" / "dice-box" / "external-themes"
SOURCE_THEME_ROOT = THEMES_ROOT / "chinese-pip"
SOURCE_DIFFUSE = SOURCE_THEME_ROOT / "diffuse-dark.png"
SOURCE_MESH = SOURCE_THEME_ROOT / "default.json"
SOURCE_PACKAGE = SOURCE_THEME_ROOT / "package.json"

ATLAS_SIZE = (1024, 1024)
RED = "#c53030"
BLACK = "#18181b"
SUPERSAMPLE = 4

REPORT_FACE_BBOXES = {
    1: (853, 323, 1019, 486),
    6: (854, 855, 1020, 1020),
    2: (397, 22, 563, 185),
    3: (224, 22, 390, 185),
    4: (854, 497, 1019, 661),
    5: (854, 671, 1019, 835),
}


@dataclass(frozen=True)
class FaceRect:
    left: int
    top: int
    right: int
    bottom: int
    rotation: int

    @property
    def width(self) -> int:
        return self.right - self.left

    @property
    def height(self) -> int:
        return self.bottom - self.top


@dataclass(frozen=True)
class MaterialProfile:
    name: str
    tint: tuple[int, int, int]
    texture_contrast: float
    texture_saturation: float
    texture_brightness: float
    specular_level: int
    specular_variation: int
    normal_strength: float
    bump_level: float
    specular_power: float


FACE_PIPS: dict[int, tuple[str, ...]] = {
    1: ("c",),
    2: ("tl", "br"),
    3: ("tl", "c", "br"),
    4: ("tl", "tr", "bl", "br"),
    5: ("tl", "tr", "c", "bl", "br"),
    6: ("tl", "tr", "ml", "mr", "bl", "br"),
}

ROTATION_NAME_MAP = {
    0: {"tl": "tl", "tr": "tr", "ml": "ml", "mr": "mr", "bl": "bl", "br": "br", "c": "c"},
    1: {"tl": "tr", "tr": "br", "ml": "mr", "mr": "ml", "bl": "tl", "br": "bl", "c": "c"},
    2: {"tl": "br", "tr": "bl", "ml": "mr", "mr": "ml", "bl": "tr", "br": "tl", "c": "c"},
    3: {"tl": "bl", "tr": "tl", "ml": "mr", "mr": "ml", "bl": "br", "br": "tr", "c": "c"},
}

BASE_ANCHOR_POSITIONS = {
    "tl": (0.22, 0.22),
    "tr": (0.78, 0.22),
    "ml": (0.22, 0.5),
    "mr": (0.78, 0.5),
    "bl": (0.22, 0.78),
    "br": (0.78, 0.78),
    "c": (0.5, 0.5),
}

MATERIALS: dict[str, MaterialProfile] = {
    "jade": MaterialProfile("jade", (236, 245, 239), 0.9, 0.7, 1.06, 128, 18, 0.18, 0.28, 24),
    "gold": MaterialProfile("gold", (244, 206, 104), 1.18, 1.12, 1.02, 214, 28, 0.34, 0.4, 54),
    "silver": MaterialProfile("silver", (216, 220, 228), 1.06, 0.25, 1.08, 196, 22, 0.24, 0.34, 42),
}

GEOMETRIC_FACE_TO_D6_VALUE = {
    (0, 1, 0): 1,
    (0, -1, 0): 6,
    (0, 0, 1): 2,
    (0, 0, -1): 5,
    (1, 0, 0): 3,
    (-1, 0, 0): 4,
}
REPORT_FACE_ROTATIONS = {
    1: 180,
    2: 180,
    3: 90,
    4: 270,
    5: 0,
    6: 90,
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate dice-box D6 material atlases from mesh-derived UV rectangles.")
    parser.add_argument("--material", required=True, choices=sorted(MATERIALS.keys()))
    parser.add_argument("--texture", required=True, type=Path)
    parser.add_argument("--output-dir", type=Path, default=THEMES_ROOT)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--validate", action="store_true")
    return parser.parse_args()


def ensure_inputs(texture_path: Path) -> None:
    required = [SOURCE_DIFFUSE, SOURCE_MESH, SOURCE_PACKAGE, texture_path]
    missing = [str(path) for path in required if not path.exists()]
    if missing:
        raise FileNotFoundError(f"Missing required files: {', '.join(missing)}")


def hex_to_rgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[index:index + 2], 16) for index in (0, 2, 4))


def rotate_anchor(anchor: str, rotation_degrees: int) -> str:
    quarter_turns = (rotation_degrees // 90) % 4
    return ROTATION_NAME_MAP[quarter_turns][anchor]


def prepare_texture(texture_path: Path, size: tuple[int, int], profile: MaterialProfile) -> Image.Image:
    texture = Image.open(texture_path).convert("RGBA")
    texture = ImageOps.fit(texture, size, Image.Resampling.LANCZOS, centering=(0.5, 0.5))
    texture = ImageEnhance.Color(texture).enhance(profile.texture_saturation)
    texture = ImageEnhance.Contrast(texture).enhance(profile.texture_contrast)
    texture = ImageEnhance.Brightness(texture).enhance(profile.texture_brightness)
    tint_layer = Image.new("RGBA", size, profile.tint + (255,))
    return Image.blend(texture, tint_layer, 0.18)


def derive_d6_faces() -> dict[int, FaceRect]:
    mesh_data = json.loads(SOURCE_MESH.read_text(encoding="utf-8"))
    d6 = next(mesh for mesh in mesh_data["meshes"] if mesh["name"] == "d6")
    indices = d6["indices"]
    geometric_faces: dict[tuple[int, int, int], dict[str, object]] = {}
    for triangle_offset in range(0, len(indices), 3):
        triangle = indices[triangle_offset:triangle_offset + 3]
        triangle_positions = [
            tuple(d6["positions"][index * 3 + i] for i in range(3))
            for index in triangle
        ]
        ax, ay, az = triangle_positions[0]
        bx, by, bz = triangle_positions[1]
        cx, cy, cz = triangle_positions[2]
        ab = (bx - ax, by - ay, bz - az)
        ac = (cx - ax, cy - ay, cz - az)
        normal = (
            ab[1] * ac[2] - ab[2] * ac[1],
            ab[2] * ac[0] - ab[0] * ac[2],
            ab[0] * ac[1] - ab[1] * ac[0],
        )
        axis_index = max(range(3), key=lambda axis: abs(normal[axis]))
        face_key = [0, 0, 0]
        face_key[axis_index] = 1 if normal[axis_index] > 0 else -1
        face_entry = geometric_faces.setdefault(tuple(face_key), {"vertex_indices": set()})
        face_entry["vertex_indices"].update(triangle)

    faces: dict[int, FaceRect] = {}
    for face_key in geometric_faces:
        face_value = GEOMETRIC_FACE_TO_D6_VALUE[face_key]
        left, top, right, bottom = REPORT_FACE_BBOXES[face_value]
        faces[face_value] = FaceRect(
            left=left,
            top=top,
            right=right,
            bottom=bottom,
            rotation=REPORT_FACE_ROTATIONS[face_value],
        )
    return faces


def validate_face_rects_against_report(faces: dict[int, FaceRect]) -> dict[int, dict[str, object]]:
    validation: dict[int, dict[str, object]] = {}
    for face_value, rect in sorted(faces.items()):
        expected = REPORT_FACE_BBOXES[face_value]
        actual = (rect.left, rect.top, rect.right, rect.bottom)
        validation[face_value] = {
            "expected": expected,
            "actual": actual,
            "matches": all(abs(a - e) <= 1 for a, e in zip(actual, expected)),
            "rotation": rect.rotation,
        }
    return validation


def create_face_tile(face_value: int, rotation_degrees: int, size: tuple[int, int]) -> Image.Image:
    width, height = size
    supersampled_size = (width * SUPERSAMPLE, height * SUPERSAMPLE)
    tile = Image.new("RGBA", supersampled_size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(tile)
    pip_color = RED if face_value in {1, 4} else BLACK
    pip_rgb = hex_to_rgb(pip_color)
    pip_radius = max(10, int(min(supersampled_size) * 0.11))
    for anchor in FACE_PIPS[face_value]:
        x_ratio, y_ratio = BASE_ANCHOR_POSITIONS[rotate_anchor(anchor, rotation_degrees)]
        center_x = int(supersampled_size[0] * x_ratio)
        center_y = int(supersampled_size[1] * y_ratio)
        draw.ellipse(
            (center_x - pip_radius, center_y - pip_radius, center_x + pip_radius, center_y + pip_radius),
            fill=(*pip_rgb, 255),
        )
    return tile.resize(size, Image.Resampling.LANCZOS)


def create_material_diffuse_atlas(texture_path: Path, profile: MaterialProfile, faces: dict[int, FaceRect]) -> Image.Image:
    atlas = prepare_texture(texture_path, ATLAS_SIZE, profile)
    for face_value, rect in sorted(faces.items()):
        atlas.alpha_composite(create_face_tile(face_value, rect.rotation, (rect.width, rect.height)), (rect.left, rect.top))
    return atlas


def count_face_pips(atlas: Image.Image, faces: dict[int, FaceRect]) -> dict[int, dict[str, int]]:
    counts: dict[int, dict[str, int]] = {}
    for face_value, rect in sorted(faces.items()):
        crop = atlas.crop((rect.left, rect.top, rect.right, rect.bottom)).convert("RGBA")
        pixels = crop.load()
        width, height = crop.size
        visited: set[tuple[int, int]] = set()
        red_components = 0
        black_components = 0
        for y in range(height):
            for x in range(width):
                if (x, y) in visited:
                    continue
                red_match = pixels[x, y][0] > 140 and pixels[x, y][1] < 120 and pixels[x, y][2] < 120 and pixels[x, y][3] > 120
                black_match = pixels[x, y][0] < 70 and pixels[x, y][1] < 70 and pixels[x, y][2] < 70 and pixels[x, y][3] > 120
                if not red_match and not black_match:
                    continue
                visited.add((x, y))
                stack = [(x, y)]
                component_size = 0
                while stack:
                    current_x, current_y = stack.pop()
                    component_size += 1
                    for next_x, next_y in (
                        (current_x + 1, current_y),
                        (current_x - 1, current_y),
                        (current_x, current_y + 1),
                        (current_x, current_y - 1),
                    ):
                        if not (0 <= next_x < width and 0 <= next_y < height):
                            continue
                        if (next_x, next_y) in visited:
                            continue
                        next_pixel = pixels[next_x, next_y]
                        next_red = next_pixel[0] > 140 and next_pixel[1] < 120 and next_pixel[2] < 120 and next_pixel[3] > 120
                        next_black = next_pixel[0] < 70 and next_pixel[1] < 70 and next_pixel[2] < 70 and next_pixel[3] > 120
                        if (red_match and next_red) or (black_match and next_black):
                            visited.add((next_x, next_y))
                            stack.append((next_x, next_y))
                if component_size >= 24:
                    if red_match:
                        red_components += 1
                    else:
                        black_components += 1
        counts[face_value] = {"red": red_components, "black": black_components}
    return counts


def grayscale_from_texture(texture_path: Path, size: tuple[int, int], contrast: float) -> Image.Image:
    texture = Image.open(texture_path).convert("L")
    texture = ImageOps.fit(texture, size, Image.Resampling.LANCZOS, centering=(0.5, 0.5))
    return ImageEnhance.Contrast(texture).enhance(contrast)


def generate_normal(texture_path: Path, profile: MaterialProfile) -> Image.Image:
    gray = grayscale_from_texture(texture_path, ATLAS_SIZE, 1.25)
    blurred = gray.filter(ImageFilter.GaussianBlur(radius=2))
    shifted_x_plus = ImageChops.offset(blurred, 1, 0)
    shifted_x_minus = ImageChops.offset(blurred, -1, 0)
    shifted_y_plus = ImageChops.offset(blurred, 0, 1)
    shifted_y_minus = ImageChops.offset(blurred, 0, -1)
    normal = Image.new("RGB", ATLAS_SIZE)
    for y in range(ATLAS_SIZE[1]):
        for x in range(ATLAS_SIZE[0]):
            dx = (shifted_x_plus.getpixel((x, y)) - shifted_x_minus.getpixel((x, y))) / 255.0
            dy = (shifted_y_plus.getpixel((x, y)) - shifted_y_minus.getpixel((x, y))) / 255.0
            nx = int(max(0, min(255, 128 + dx * 127 * profile.normal_strength)))
            ny = int(max(0, min(255, 128 + dy * 127 * profile.normal_strength)))
            normal.putpixel((x, y), (nx, ny, 255))
    return normal


def generate_specular(texture_path: Path, profile: MaterialProfile) -> Image.Image:
    gray = grayscale_from_texture(texture_path, ATLAS_SIZE, 1.4)
    specular = Image.new("L", ATLAS_SIZE)
    for y in range(ATLAS_SIZE[1]):
        for x in range(ATLAS_SIZE[0]):
            luminance = gray.getpixel((x, y))
            value = int(max(0, min(255, profile.specular_level + ((luminance - 128) * profile.specular_variation / 128.0))))
            specular.putpixel((x, y), value)
    return specular.filter(ImageFilter.GaussianBlur(radius=1))


def build_theme_config(profile: MaterialProfile) -> dict:
    return {
        "name": f"{profile.name.capitalize()} Pip",
        "systemName": f"{profile.name}-pip",
        "author": "Verdent",
        "version": 0.1,
        "meshFile": "default.json",
        "material": {
            "type": "color",
            "diffuseTexture": {"light": "diffuse-light.png", "dark": "diffuse-dark.png"},
            "diffuseLevel": 1,
            "bumpTexture": "normal.png",
            "bumpLevel": 0.5,
            "specularTexture": "specular.jpg",
            "specularPower": 1,
        },
        "diceAvailable": ["d4", "d6", "d8", "d10", "d12", "d20", "d100"],
    }


def write_theme_files(output_root: Path, profile: MaterialProfile, diffuse: Image.Image, normal: Image.Image, specular: Image.Image) -> None:
    theme_root = output_root / f"{profile.name}-pip"
    theme_root.mkdir(parents=True, exist_ok=True)
    diffuse.save(theme_root / "diffuse-dark.png")
    diffuse.save(theme_root / "diffuse-light.png")
    normal.save(theme_root / "normal.png")
    specular.save(theme_root / "specular.jpg", quality=95)
    (theme_root / "theme.config.json").write_text(json.dumps(build_theme_config(profile), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (theme_root / "default.json").write_bytes(SOURCE_MESH.read_bytes())
    (theme_root / "package.json").write_bytes(SOURCE_PACKAGE.read_bytes())


def run() -> None:
    args = parse_args()
    ensure_inputs(args.texture)
    faces = derive_d6_faces()

    if args.dry_run:
        print(json.dumps({
            "material": args.material,
            "texture": str(args.texture),
            "faces": {face: face_rect.__dict__ for face, face_rect in sorted(faces.items())},
            "reportValidation": validate_face_rects_against_report(faces),
        }, indent=2))
        return

    profile = MATERIALS[args.material]
    diffuse = create_material_diffuse_atlas(args.texture, profile, faces)
    if args.validate:
        print(json.dumps({
            "faces": {face: rect.__dict__ for face, rect in sorted(faces.items())},
            "reportValidation": validate_face_rects_against_report(faces),
            "pipCounts": count_face_pips(diffuse, faces),
        }, indent=2))
    normal = generate_normal(args.texture, profile)
    specular = generate_specular(args.texture, profile)
    write_theme_files(args.output_dir, profile, diffuse, normal, specular)


if __name__ == "__main__":
    run()