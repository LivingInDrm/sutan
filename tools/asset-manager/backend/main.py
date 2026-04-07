#!/usr/bin/env python3
"""
FastAPI backend for Sutan Asset Manager
Reuses core logic from scripts/generate_assets.py
"""

import asyncio
import hashlib
import json
import os
import re
import shutil
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

# ─────────────────────────────────────────────
# Path setup — add project root to sys.path so we can import generate_assets
# ─────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent  # .../sutan
SCRIPTS_DIR = PROJECT_ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS_DIR))

import generate_assets as ga  # noqa: E402 – must come after sys.path insert

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# ─────────────────────────────────────────────
# Directory constants
# ─────────────────────────────────────────────
SAMPLES_DIR = PROJECT_ROOT / "scripts" / "samples"
PORTRAITS_SRC_DIR = PROJECT_ROOT / "src" / "renderer" / "assets" / "portraits"
PORTRAITS_PUBLIC_DIR = PROJECT_ROOT / "public" / "portraits"
BATCH_CONFIG_PATH = PROJECT_ROOT / "scripts" / "batch_config.json"
# NOTE (Phase 1 naming): CHARACTER_PROFILES_PATH now points to the unified
# workspace file under scripts/data/cards/ (array format).
# The file is the "workspace" for the asset-manager; it is NOT the same as the
# runtime cards loaded by the game.  Deploy copies filtered records from here
# to src/renderer/data/configs/cards/characters.json (the runtime).
CHARACTER_PROFILES_PATH = PROJECT_ROOT / "scripts" / "data" / "cards" / "characters.json"
CARDS_DIR = PROJECT_ROOT / "src" / "renderer" / "data" / "configs" / "cards"
CHARACTERS_CARDS_PATH = CARDS_DIR / "characters.json"
EQUIPMENT_CARDS_PATH = CARDS_DIR / "equipment.json"
SPECIAL_CARDS_PATH = CARDS_DIR / "special.json"
WORKSPACE_SPECIAL_PATH = PROJECT_ROOT / "scripts" / "data" / "cards" / "special.json"
BACKEND_DIR = Path(__file__).resolve().parent
TEMPLATES_CONFIG_PATH = BACKEND_DIR / "templates.json"
HISTORY_PATH = BACKEND_DIR / "history.json"


def _sync_special_workspace() -> None:
    """Sync special cards from workspace (scripts/data/cards/special.json) to runtime (src/renderer/data/configs/cards/special.json)."""
    try:
        special_records = _read_cards_file(WORKSPACE_SPECIAL_PATH)
        _write_cards_file(SPECIAL_CARDS_PATH, special_records)
    except Exception as exc:
        print(f"[WARN] _sync_special_workspace failed: {exc}")

# Mapping from character name → game portrait filename stem (e.g. "figure01")
# Only needed for the replace-to-game feature; new characters won't have a game file until manually assigned.
def _build_name_to_game_file() -> Dict[str, str]:
    """Dynamically build name→figureNN mapping from card files."""
    mapping: Dict[str, str] = {}
    try:
        cards = _read_runtime_cards()
        for c in cards:
            if c.get("type") == "character" and c.get("image"):
                # image is like "/assets/portraits/figure03.png"
                stem = c["image"].rsplit("/", 1)[-1].replace(".png", "")
                mapping[c["name"]] = stem
    except Exception:
        pass
    # Fallback for original 7 if card files are missing
    fallback = {
        "徐龙象": "figure01", "徐渭熊": "figure02", "徐凤年": "figure03",
        "温华": "figure04", "红薯": "figure05", "洪洗象": "figure06", "老黄": "figure07",
    }
    for k, v in fallback.items():
        if k not in mapping:
            mapping[k] = v
    return mapping


def _get_game_file(name: str) -> str:
    """Get the game figureNN filename for a character."""
    return _build_name_to_game_file().get(name, "")

# ─────────────────────────────────────────────
# App setup
# ─────────────────────────────────────────────
app = FastAPI(title="Sutan Asset Manager API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure directories exist before mounting
SAMPLES_DIR.mkdir(parents=True, exist_ok=True)
PORTRAITS_SRC_DIR.mkdir(parents=True, exist_ok=True)
PORTRAITS_PUBLIC_DIR.mkdir(parents=True, exist_ok=True)

# Static file mounts
app.mount("/images", StaticFiles(directory=str(SAMPLES_DIR)), name="images")
app.mount("/portraits", StaticFiles(directory=str(PORTRAITS_PUBLIC_DIR)), name="portraits")


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────
def _read_batch_config() -> List[Dict]:
    with open(BATCH_CONFIG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _write_batch_config(data: List[Dict]) -> None:
    with open(BATCH_CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _character_folder(name: str) -> Path:
    """Return the samples subfolder for a character: portrait_{name}."""
    return SAMPLES_DIR / f"portrait_{name}"


def _read_history() -> List[Dict]:
    if not HISTORY_PATH.exists():
        return []
    try:
        with open(HISTORY_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return []


def _append_history(entry: Dict) -> None:
    history = _read_history()
    history.insert(0, entry)
    history = history[:50]  # keep last 50
    with open(HISTORY_PATH, "w", encoding="utf-8") as f:
        json.dump(history, f, ensure_ascii=False, indent=2)


def _load_templates() -> Dict[str, str]:
    """Load templates from templates.json if it exists, otherwise fall back to generate_assets defaults."""
    if TEMPLATES_CONFIG_PATH.exists():
        try:
            with open(TEMPLATES_CONFIG_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            pass
    return {
        "style_base": ga.STYLE_BASE,
        "no_text_constraint": ga.NO_TEXT_CONSTRAINT,
        "style_negative": ga.STYLE_NEGATIVE,
        "portrait_template": ga.PORTRAIT_TEMPLATE,
        "item_template": ga.ITEM_TEMPLATE,
        "scene_template": ga.SCENE_TEMPLATE,
    }


def _save_templates(data: Dict[str, str]) -> None:
    with open(TEMPLATES_CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _get_openai_client():
    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="OPENAI_API_KEY environment variable is not set.",
        )
    from openai import OpenAI
    return OpenAI(api_key=api_key)


def _read_workspace_characters() -> List[Dict]:
    """Read unified workspace characters.json (array format)."""
    if not CHARACTER_PROFILES_PATH.exists():
        return []
    try:
        with open(CHARACTER_PROFILES_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return []


def _write_workspace_characters(records: List[Dict]) -> None:
    """Write unified workspace characters.json (array format)."""
    CHARACTER_PROFILES_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(CHARACTER_PROFILES_PATH, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)


def _read_character_profiles() -> Dict[str, Any]:
    """Read workspace characters.json and return as name→profile map for internal use.

    The profile dict contains: description, rarity, attributes, special_attributes,
    tags, equipment_slots.  meta.selected_asset is surfaced as selected_portrait
    so existing endpoint logic works unchanged.

    NOTE (Phase 1): This workspace file (scripts/data/cards/characters.json) is the
    asset-manager workspace.  It is distinct from the runtime file at
    src/renderer/data/configs/cards/characters.json which the game loads.
    Deploy copies filtered records (without meta) from workspace → runtime.
    """
    records = _read_workspace_characters()
    result: Dict[str, Any] = {}
    for record in records:
        name = record.get("name", "")
        if not name:
            continue
        profile: Dict[str, Any] = {
            "description":       record.get("description", ""),
            "rarity":            record.get("rarity", "copper"),
            "attributes":        record.get("attributes", {}),
            "special_attributes": record.get("special_attributes", {}),
            "tags":              record.get("tags", []),
            "equipment_slots":   record.get("equipment_slots", 1),
        }
        # Translate meta.selected_asset → selected_portrait for existing code paths
        meta = record.get("meta", {})
        if meta.get("selected_asset"):
            profile["selected_portrait"] = meta["selected_asset"]
        if meta.get("archived"):
            profile["archived"] = True
        result[name] = profile
    return result


def _write_character_profiles(data: Dict[str, Any]) -> None:
    """Persist character profiles (name→profile map) back to workspace array format.

    Preserves all fields in existing records (card_id, image, meta.publish_status,
    etc.) that are not part of the editable profile dict.
    Syncs selected_portrait → meta.selected_asset (empty string = cleared).
    """
    records = _read_workspace_characters()
    records_by_name: Dict[str, Dict] = {
        r.get("name"): r for r in records if r.get("name")
    }

    for name, profile in data.items():
        if name in records_by_name:
            record = records_by_name[name]
        else:
            # Brand-new character not yet in workspace — create a stub record
            safe_id = re.sub(r"[^\w]", "_", name)
            record = {
                "card_id": f"card_{safe_id}",
                "name":    name,
                "type":    "character",
                "image":   "",
            }
            records.append(record)
            records_by_name[name] = record

        # Update editable card fields from profile
        for key in ("description", "rarity", "attributes", "special_attributes",
                    "tags", "equipment_slots"):
            if key in profile:
                record[key] = profile[key]

        # Sync meta
        if "meta" not in record:
            record["meta"] = {
                "publish_status":    "draft",
                "asset_candidates":  [],
                "workshop_variants": [],
            }
        # Always sync selected_asset — absence of selected_portrait means it was cleared
        record["meta"]["selected_asset"] = profile.get("selected_portrait", "")
        record["meta"]["updated_at"] = datetime.utcnow().isoformat() + "Z"

    _write_workspace_characters(list(records_by_name.values()))


def _file_hash(path: Path) -> Optional[str]:
    """Compute MD5 hash of file content; returns None if file does not exist."""
    if not path.exists():
        return None
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def _read_cards_file(path: Path) -> List[Dict]:
    """Read a single cards JSON file (array of card objects)."""
    if not path.exists():
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return []


def _write_cards_file(path: Path, data: List[Dict]) -> None:
    """Write a list of card objects to a single JSON file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _read_runtime_cards() -> List[Dict]:
    """Read all cards from the split card files (characters + equipment + special)."""
    all_cards: List[Dict] = []
    all_cards.extend(_read_cards_file(CHARACTERS_CARDS_PATH))
    all_cards.extend(_read_cards_file(EQUIPMENT_CARDS_PATH))
    all_cards.extend(_read_cards_file(SPECIAL_CARDS_PATH))
    return all_cards


def _write_runtime_cards(data: List[Dict]) -> None:
    """Split cards by type and write to the appropriate files."""
    characters: List[Dict] = []
    equipment: List[Dict] = []
    special: List[Dict] = []
    for card in data:
        runtime_type = card.get("type", "")
        if runtime_type == "character":
            characters.append(card)
        elif runtime_type == "equipment":
            equipment.append(card)
        else:
            special.append(card)
    _write_cards_file(CHARACTERS_CARDS_PATH, characters)
    _write_cards_file(EQUIPMENT_CARDS_PATH, equipment)
    _write_cards_file(SPECIAL_CARDS_PATH, special)


def _next_figure_id() -> str:
    """Return the next available figureNN id not yet used."""
    used = set(_build_name_to_game_file().values())
    for i in range(1, 100):
        candidate = f"figure{i:02d}"
        if candidate not in used:
            return candidate
    raise RuntimeError("No available figure IDs")


# ─────────────────────────────────────────────
# Pydantic models
# ─────────────────────────────────────────────
class TemplatesModel(BaseModel):
    style_base: str
    no_text_constraint: str
    style_negative: str
    portrait_template: str
    item_template: str
    scene_template: str


class GenerateRequest(BaseModel):
    asset_type: str  # portrait | item | scene
    name: str
    description: str
    count: int = 1


class UpdateVariantRequest(BaseModel):
    variant_index: int
    description: str


class GenerateDescriptionRequest(BaseModel):
    name: str                   # character name (e.g. 徐凤年)
    bio: str = ""               # optional character background; model uses original novel knowledge if empty
    variant_index: Optional[int] = None  # if provided, regenerate only that variant


class CreateCharacterRequest(BaseModel):
    name: str       # character name
    bio: str = ""   # optional character background; model uses original novel knowledge if empty


class CharacterAttributesModel(BaseModel):
    physique: int = 5
    charm: int = 5
    wisdom: int = 5
    combat: int = 5
    social: int = 5
    survival: int = 5
    stealth: int = 5
    magic: int = 5


class CharacterProfileModel(BaseModel):
    description: Optional[str] = None
    rarity: Optional[str] = None  # gold | silver | copper | stone
    attributes: Optional[Dict[str, int]] = None
    special_attributes: Optional[Dict[str, int]] = None
    tags: Optional[List[str]] = None
    equipment_slots: Optional[int] = None


class SelectPortraitRequest(BaseModel):
    portrait_path: str  # absolute path to the sample image


class RegenerateVariantsRequest(BaseModel):
    bio: str = ""


# ─────────────────────────────────────────────
# 1. GET /api/characters
# ─────────────────────────────────────────────
@app.get("/api/characters")
def get_characters() -> List[Dict]:
    """
    Read batch_config.json, group entries by character name, and return structured data.
    The character name is used as the primary identifier (figure_id).
    NAME_TO_GAME_FILE provides the game portrait filename for characters that have one.
    """
    items = _read_batch_config()

    # Group by name, preserving insertion order
    groups: Dict[str, List[Dict]] = {}
    for item in items:
        name = item["name"]
        groups.setdefault(name, []).append(item)

    # Read profiles once for has_pending_portrait check
    profiles = _read_character_profiles()

    characters = []
    for name, entries in groups.items():
        # Skip archived characters
        if profiles.get(name, {}).get("archived"):
            continue
        game_file = _get_game_file(name)

        variants = []
        for idx, entry in enumerate(entries):
            variants.append(
                {
                    "index": idx,
                    "description": entry.get("description", ""),
                    "output": entry.get("output", ""),
                }
            )

        # Build current_portrait URL with mtime cache-buster
        current_portrait = ""
        if game_file:
            portrait_path = PORTRAITS_PUBLIC_DIR / f"{game_file}.png"
            if portrait_path.exists():
                mtime = int(portrait_path.stat().st_mtime)
                current_portrait = f"/portraits/{game_file}.png?t={mtime}"
            else:
                current_portrait = f"/portraits/{game_file}.png"

        # has_pending_portrait: profile has selected_portrait not yet deployed
        profile = profiles.get(name, {})
        has_pending_portrait = bool(profile.get("selected_portrait"))

        characters.append(
            {
                "name": name,
                "id": name,
                "figure_id": name,  # name is the stable identifier; game file is separate
                "current_portrait": current_portrait,
                "has_pending_portrait": has_pending_portrait,
                "variants": variants,
            }
        )

    return characters


# ─────────────────────────────────────────────
# 2. GET /api/templates
# ─────────────────────────────────────────────
@app.get("/api/templates")
def get_templates() -> Dict[str, str]:
    result = _load_templates()
    # Append scene style template strings (read-only, derived from code constants)
    result["scene_icon_style"] = SCENE_ICON_STYLE
    result["scene_backdrop_style"] = SCENE_BACKDROP_STYLE
    return result


# ─────────────────────────────────────────────
# 3. PUT /api/templates
# ─────────────────────────────────────────────
@app.put("/api/templates")
def update_templates(body: TemplatesModel) -> Dict[str, Any]:
    data = body.model_dump()
    _save_templates(data)
    return {"success": True, "message": "Templates saved."}


# ─────────────────────────────────────────────
# 4. POST /api/generate  (SSE)
# ─────────────────────────────────────────────
def _build_custom_prompt(asset_type: str, name: str, description: str) -> str:
    """Build prompt using template strings from templates.json (or defaults)."""
    templates = _load_templates()
    template_map = {
        "portrait": templates.get("portrait_template", ga.PORTRAIT_TEMPLATE),
        "item": templates.get("item_template", ga.ITEM_TEMPLATE),
        "scene": templates.get("scene_template", ga.SCENE_TEMPLATE),
    }
    template = template_map.get(asset_type, ga.PORTRAIT_TEMPLATE)
    return template.format(
        style=templates.get("style_base", ga.STYLE_BASE),
        no_text=templates.get("no_text_constraint", ga.NO_TEXT_CONSTRAINT),
        name=name,
        description=description,
        negative=templates.get("style_negative", ga.STYLE_NEGATIVE),
    )


def _generate_single_blocking(client, prompt: str, asset_type: str, output_path: Path):
    """Blocking call: generate + post-process + save one image. Returns the saved path."""
    raw_img = ga.generate_image(client, prompt, asset_type)
    processed = ga.post_process(raw_img, asset_type)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    processed.save(str(output_path), format="PNG")
    return output_path


@app.post("/api/generate")
async def generate_images(body: GenerateRequest):
    """
    Generate `count` images using SSE to stream progress back to the client.
    """
    # Validate asset_type early (before streaming starts)
    if body.asset_type not in ("portrait", "item", "scene"):
        raise HTTPException(status_code=400, detail=f"Invalid asset_type: {body.asset_type}")

    # Check API key early
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY environment variable is not set.")

    async def event_stream():
        from openai import OpenAI

        client = OpenAI(api_key=api_key)
        loop = asyncio.get_running_loop()
        count = max(1, body.count)
        timestamp = int(time.time())
        if body.asset_type == "item":
            folder = _item_folder(body.name)
            folder.mkdir(parents=True, exist_ok=True)
        else:
            folder = _character_folder(body.name)
        prompt = _build_custom_prompt(body.asset_type, body.name, body.description)

        generated_images = []

        for i in range(1, count + 1):
            progress_event = json.dumps(
                {
                    "type": "progress",
                    "message": f"Generating image {i} of {count} for {body.name}…",
                    "current": i,
                    "total": count,
                }
            )
            yield f"data: {progress_event}\n\n"

            filename = f"{body.name}_{timestamp}_{i}.png"
            output_path = folder / filename

            try:
                saved_path = await loop.run_in_executor(
                    None,
                    _generate_single_blocking,
                    client,
                    prompt,
                    body.asset_type,
                    output_path,
                )
                # URL-relative path under /images/
                rel_path = saved_path.relative_to(SAMPLES_DIR)
                generated_images.append(
                    {
                        "path": str(rel_path),
                        "url": f"/images/{rel_path.as_posix()}",
                    }
                )
            except Exception as exc:
                error_event = json.dumps(
                    {
                        "type": "error",
                        "message": f"Failed to generate image {i}: {exc}",
                        "current": i,
                        "total": count,
                    }
                )
                yield f"data: {error_event}\n\n"

        # Save to history
        history_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "name": body.name,
            "asset_type": body.asset_type,
            "images": generated_images,
        }
        _append_history(history_entry)

        done_event = json.dumps({"type": "done", "images": generated_images})
        yield f"data: {done_event}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# ─────────────────────────────────────────────
# 5. GET /api/samples/{character_name}
# ─────────────────────────────────────────────
@app.get("/api/samples/{character_name}")
def get_samples(character_name: str) -> List[Dict]:
    """
    Return all sample images for a given character name.
    Looks in scripts/samples/portrait_{character_name}/.
    Each image includes is_current_in_game (hash match with game portrait)
    and is_selected (path matches profile.selected_portrait).
    """
    folder = _character_folder(character_name)

    # Compute hash of current game portrait for comparison
    game_file = _get_game_file(character_name)
    game_portrait_hash: Optional[str] = None
    if game_file:
        game_portrait_path = PORTRAITS_PUBLIC_DIR / f"{game_file}.png"
        game_portrait_hash = _file_hash(game_portrait_path)

    # Get selected_portrait from profile
    profiles = _read_character_profiles()
    profile = profiles.get(character_name, {})
    selected_portrait: Optional[str] = profile.get("selected_portrait")

    results = []
    if folder.exists():
        for img_file in sorted(folder.glob("*.png")):
            rel = img_file.relative_to(SAMPLES_DIR)
            sample_hash = _file_hash(img_file) if game_portrait_hash else None
            is_current = game_portrait_hash is not None and sample_hash == game_portrait_hash
            is_selected = selected_portrait is not None and str(img_file) == selected_portrait
            results.append(
                {
                    "filename": img_file.name,
                    "url": f"/images/{rel.as_posix()}",
                    "path": str(rel),
                    "abs_path": str(img_file),
                    "is_current_in_game": is_current,
                    "is_selected": is_selected,
                }
            )
    return results


# ─────────────────────────────────────────────
# 6. POST /api/characters/{character_name}/select-portrait
# ─────────────────────────────────────────────
@app.post("/api/characters/{character_name}/select-portrait")
def select_portrait(character_name: str, body: SelectPortraitRequest) -> Dict[str, Any]:
    """
    Mark a sample image as the selected portrait for the next deploy.
    Saves selected_portrait (absolute path) to workspace characters.json.
    Does NOT copy anything to the game directory.
    """
    portrait_path = Path(body.portrait_path)
    if not portrait_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Portrait file not found: {body.portrait_path}",
        )

    profiles = _read_character_profiles()
    if character_name not in profiles:
        profiles[character_name] = {}
    profiles[character_name]["selected_portrait"] = str(portrait_path)
    _write_character_profiles(profiles)

    return {"success": True, "selected_portrait": str(portrait_path)}


# ─────────────────────────────────────────────
# 7. GET /api/history
# ─────────────────────────────────────────────
@app.get("/api/history")
def get_history() -> List[Dict]:
    """Return up to the last 50 generation history entries."""
    return _read_history()


# ─────────────────────────────────────────────
# 8. PUT /api/characters/{character_name}
# ─────────────────────────────────────────────
@app.put("/api/characters/{character_name}")
def update_character_variant(character_name: str, body: UpdateVariantRequest) -> Dict[str, Any]:
    """
    Update the description of a specific variant (by index) for the given character name.
    Persists the change to batch_config.json.
    character_name is URL-encoded on the client side.
    """
    items = _read_batch_config()

    # Validate character exists
    existing_names = {item.get("name") for item in items}
    if character_name not in existing_names:
        raise HTTPException(status_code=404, detail=f"Unknown character: {character_name}")

    # Collect all entries for this character (preserving global order)
    char_entries_indices = [i for i, item in enumerate(items) if item.get("name") == character_name]

    if body.variant_index < 0 or body.variant_index >= len(char_entries_indices):
        raise HTTPException(
            status_code=400,
            detail=(
                f"variant_index {body.variant_index} out of range; "
                f"{character_name} has {len(char_entries_indices)} variant(s)."
            ),
        )

    global_idx = char_entries_indices[body.variant_index]
    items[global_idx]["description"] = body.description
    _write_batch_config(items)

    return {
        "success": True,
        "message": (
            f"Updated {character_name} variant {body.variant_index} description in batch_config.json."
        ),
    }


# ─────────────────────────────────────────────
# 9. POST /api/generate-description
# ─────────────────────────────────────────────
# Model for text generation (NOT image generation) — configurable via env var
DESCRIPTION_MODEL = os.environ.get("DESCRIPTION_MODEL", "gpt-5.4")

_DESCRIPTION_SYSTEM_PROMPT = """\
你是熟读武侠小说《雪中悍刀行》的文学专家和古风角色绘画提示词专家，对原著中所有角色的外貌、性格、武器、标志性场景有深刻理解。

## 格式规范
每条 description 结构为：「面部特征句。场景/动作/道具描述」

- 面部特征句：描述脸型+眉眼+神态表情，约 10-15 字，以句号"。"结尾
- 4 条 description 的面部特征句必须完全一致（同一角色共享固定面部特征）
- 场景描述：具体场景+动作/姿势+道具/武器+性格标签，中文逗号分隔，约 40-55 字
- 4 条场景描述各不相同，涵盖：战斗、日常、情绪、特殊道具/标志性场景
- 每条 description 总长度约 55-80 字
- 使用精炼的中文词组，中文逗号分隔，不写完整句子

## 禁止一：不得包含人物关系或身份头衔信息
description 只描述视觉内容（外貌、服饰、动作、道具、场景、气质），不得出现人物关系、身份头衔、转世/神格身份、排名标签等，这些对图像生成无帮助。

## 禁止二：不得使用可能产生歧义的专有名词
武器名、招式名、境界名等专有名词需替换为通用视觉描述（如"木马牛"→"一柄古朴长剑"，"两袖青蛇"→"两道青色剑光"）；若专名本身有清晰视觉含义可酌情保留。

## 输出格式
严格输出 JSON 数组，包含 4 个字符串，不要包含任何其他内容。
"""


def _get_existing_examples(name: str) -> str:
    """Fetch few-shot examples from batch_config.json (excluding the target character).

    Returns up to 3 characters, with up to 2 description samples each.
    """
    items = _read_batch_config()
    # Group all descriptions by character name
    grouped: Dict[str, List[str]] = {}
    for item in items:
        n = item.get("name", "")
        if n == name:
            continue
        desc = item.get("description", "").strip()
        if desc:
            grouped.setdefault(n, []).append(desc)

    if not grouped:
        return ""

    lines = ["\n以下是已有角色的 description 示例（每个角色取 2 条），请严格模仿此风格和格式：\n"]
    for char_name in list(grouped.keys())[:3]:
        descs = grouped[char_name][:2]
        for desc in descs:
            lines.append(f"角色 {char_name}：\"{desc}\"")
        lines.append("")  # blank line between characters
    return "\n".join(lines).rstrip()


def _generate_descriptions_blocking(client, name: str, bio: str) -> List[str]:
    """Call LLM to generate 4 description variants for a character. Blocking."""
    existing_examples = _get_existing_examples(name)

    # Build bio section: optional supplement
    if bio.strip():
        bio_section = (
            f"角色简介（可选补充，以原著为准）：{bio}\n"
        )
    else:
        bio_section = ""

    user_msg = (
        f"角色名：{name}\n"
        f"{bio_section}"
        f"{existing_examples}\n\n"
        f"请基于《雪中悍刀行》原著中 {name} 的外貌、性格、武器、标志性场景，"
        f"生成 4 条不同场景的 description，以 JSON 数组格式输出。"
    )
    response = client.responses.create(
        model=DESCRIPTION_MODEL,
        instructions=_DESCRIPTION_SYSTEM_PROMPT,
        input=user_msg,
        temperature=0.9,
        max_output_tokens=1000,
    )
    content = response.output_text.strip()
    # Strip markdown code fences if present
    if content.startswith("```"):
        content = re.sub(r"^```[^\n]*\n?", "", content)
        content = re.sub(r"\n?```$", "", content)
    descriptions: List[str] = json.loads(content)
    if not isinstance(descriptions, list) or len(descriptions) < 4:
        raise ValueError(f"Unexpected LLM response: {content}")
    return descriptions[:4]


@app.post("/api/generate-description")
async def generate_description(body: GenerateDescriptionRequest) -> Dict[str, Any]:
    """
    Call LLM to generate description(s) for a character.
    Returns a list of 4 descriptions (or 1 if variant_index is specified).
    Model defaults to gpt-5.4; override via DESCRIPTION_MODEL env var.
    """
    client = _get_openai_client()
    loop = asyncio.get_running_loop()
    try:
        descriptions = await loop.run_in_executor(
            None, _generate_descriptions_blocking, client, body.name, body.bio
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {exc}")

    if body.variant_index is not None:
        # Return only the requested variant
        idx = body.variant_index % 4
        return {"descriptions": [descriptions[idx]]}
    return {"descriptions": descriptions}


# ─────────────────────────────────────────────
# 10. POST /api/characters  (create new character)
# ─────────────────────────────────────────────
@app.post("/api/characters")
async def create_character(body: CreateCharacterRequest) -> Dict[str, Any]:
    """
    Create a new character: call AI for 4 descriptions, write to batch_config.json,
    create portrait_{name} folder, and return the new character data.
    """
    # Validate name not empty
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="Character name must not be empty.")

    # Check name uniqueness
    existing = _read_batch_config()
    existing_names = {item.get("name") for item in existing}
    if body.name in existing_names:
        raise HTTPException(status_code=409, detail=f"Character '{body.name}' already exists.")

    # Folder and output paths use portrait_{name} convention
    folder_name = f"portrait_{body.name}"

    # Generate descriptions via AI
    client = _get_openai_client()
    loop = asyncio.get_running_loop()
    try:
        descriptions = await loop.run_in_executor(
            None, _generate_descriptions_blocking, client, body.name, body.bio
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {exc}")

    # Build 4 batch_config entries
    new_entries = []
    for i, desc in enumerate(descriptions, start=1):
        new_entries.append(
            {
                "type": "portrait",
                "name": body.name,
                "description": desc,
                "output": f"{folder_name}/{body.name}_{i:02d}.png",
            }
        )

    # Create the samples folder for this character
    (SAMPLES_DIR / folder_name).mkdir(parents=True, exist_ok=True)

    # Append to batch_config.json
    all_items = existing + new_entries
    _write_batch_config(all_items)

    # Build response character object (name is the identifier)
    variants = [
        {"index": i, "description": e["description"], "output": e["output"]}
        for i, e in enumerate(new_entries)
    ]
    character = {
        "name": body.name,
        "id": body.name,
        "figure_id": body.name,
        "current_portrait": "",
        "variants": variants,
    }

    # Auto-generate profile in background (non-blocking best-effort)
    try:
        reference_cards = _read_runtime_cards()
        profile = await loop.run_in_executor(
            None, _generate_profile_blocking, client, body.name, reference_cards
        )
        profiles = _read_character_profiles()
        profiles[body.name] = profile
        _write_character_profiles(profiles)
    except Exception:
        pass  # Profile generation failure should not block character creation

    return {"success": True, "character": character}


# ─────────────────────────────────────────────
# 11. GET /api/characters/{character_name}/profile
# ─────────────────────────────────────────────
@app.get("/api/characters/{character_name}/profile")
def get_character_profile(character_name: str) -> Dict[str, Any]:
    """Return the character profile (attributes + bio) from workspace characters.json."""
    profiles = _read_character_profiles()
    profile = profiles.get(character_name)
    if profile is None:
        # Return empty default profile
        return {
            "description": "",
            "rarity": "copper",
            "attributes": {
                "physique": 5, "charm": 5, "wisdom": 5, "combat": 5,
                "social": 5, "survival": 5, "stealth": 5, "magic": 5,
            },
            "special_attributes": {"support": 0, "reroll": 0},
            "tags": [],
            "equipment_slots": 1,
        }
    return profile


# ─────────────────────────────────────────────
# 12. PUT /api/characters/{character_name}/profile
# ─────────────────────────────────────────────
@app.put("/api/characters/{character_name}/profile")
def update_character_profile(character_name: str, body: CharacterProfileModel) -> Dict[str, Any]:
    """Partially update a character's profile in workspace characters.json."""
    profiles = _read_character_profiles()
    existing = profiles.get(character_name, {})
    update_data = body.model_dump(exclude_none=True)
    existing.update(update_data)
    profiles[character_name] = existing
    _write_character_profiles(profiles)
    return {"success": True, "profile": profiles[character_name]}


# ─────────────────────────────────────────────
# 13. POST /api/characters/{character_name}/generate-profile
# ─────────────────────────────────────────────
_PROFILE_SYSTEM_PROMPT = """\
你是《雪中悍刀行》专家，为角色生成游戏属性和人物小传。

## 稀有度属性总和上限
- gold: 36-60（属性总和在此范围）
- silver: 21-35
- copper: 11-20
- stone: 5-10

## 8项属性说明（每项1-10分）
- physique（体魄）：体力与生命力
- charm（魅力）：外貌与人格魅力
- wisdom（智慧）：智力与谋略
- combat（武力）：战斗能力
- social（社交）：人际关系与口才
- survival（生存）：野外与危机处理
- stealth（潜行）：隐匿与暗器
- magic（法术）：法力与修炼

## 标签选项（从以下选择，可多选）
角色性别: male, female
职业特征: warrior, swordsman, merchant, scholar, rogue, wanderer, exile, clan, traveler, mage
身份特征: protagonist, antagonist, mentor, ally

## 特殊属性
- support（支援）：-3 到 5，支援能力
- reroll（重骰）：0 到 5，重新投骰概率

## 装备槽
1-4，视角色强度决定

## 输出格式
严格输出 JSON 对象，包含以下字段，不含任何其他内容：
{
  "description": "50-100字人物小传",
  "rarity": "gold|silver|copper|stone",
  "attributes": {"physique":N, "charm":N, "wisdom":N, "combat":N, "social":N, "survival":N, "stealth":N, "magic":N},
  "special_attributes": {"support":N, "reroll":N},
  "tags": ["tag1", "tag2"],
  "equipment_slots": N
}
"""


def _generate_profile_blocking(client, name: str, reference_cards: List[Dict]) -> Dict[str, Any]:
    """Call LLM to generate a character profile. Blocking."""
    ref_text = ""
    if reference_cards:
        ref_lines = ["以下是现有角色的属性作为参考："]
        for card in reference_cards[:5]:
            ref_lines.append(
                f"- {card['name']} ({card.get('rarity','?')}): "
                f"属性={card.get('attributes', {})}, tags={card.get('tags', [])}"
            )
        ref_text = "\n".join(ref_lines)

    user_msg = (
        f"角色名：{name}\n"
        f"{ref_text}\n\n"
        f"请基于《雪中悍刀行》原著中 {name} 的性格、能力、背景，"
        f"生成符合稀有度规则的游戏属性和人物小传（50-100字）。"
    )

    response = client.responses.create(
        model=DESCRIPTION_MODEL,
        instructions=_PROFILE_SYSTEM_PROMPT,
        input=user_msg,
        temperature=0.7,
        max_output_tokens=800,
    )
    content = response.output_text.strip()
    if content.startswith("```"):
        content = re.sub(r"^```[^\n]*\n?", "", content)
        content = re.sub(r"\n?```$", "", content)
    profile: Dict[str, Any] = json.loads(content)
    return profile


@app.post("/api/characters/{character_name}/generate-profile")
async def generate_character_profile(character_name: str) -> Dict[str, Any]:
    """AI-generate a default profile for a character and save to workspace characters.json."""
    client = _get_openai_client()
    reference_cards = _read_base_cards()
    loop = asyncio.get_running_loop()
    try:
        profile = await loop.run_in_executor(
            None, _generate_profile_blocking, client, character_name, reference_cards
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {exc}")

    profiles = _read_character_profiles()
    profiles[character_name] = profile
    _write_character_profiles(profiles)
    return {"success": True, "profile": profile}


# ─────────────────────────────────────────────
# 14. POST /api/characters/{character_name}/deploy
# ─────────────────────────────────────────────
@app.post("/api/characters/{character_name}/deploy")
def deploy_character(character_name: str) -> Dict[str, Any]:
    """
    Deploy a character to the game (Phase 4 — simplified filter + copy):
    1. Read workspace record directly
    2. If meta.selected_asset is set, copy portrait to game directories
    3. Ensure image path is set (auto-assign figureNN if needed)
    4. Mark publish_status = published, save workspace
    5. Write ALL published characters (strip meta) to runtime characters.json
    """
    ws_records = _read_workspace_characters()
    target_idx = next(
        (i for i, r in enumerate(ws_records) if r.get("name") == character_name), None
    )
    if target_idx is None:
        raise HTTPException(
            status_code=404,
            detail=f"Character '{character_name}' not found in workspace.",
        )

    record = ws_records[target_idx]
    meta = record.setdefault("meta", {})

    portrait_copied = False
    portrait_source_filename = None

    # Determine game_file from existing image, or auto-assign
    current_image = record.get("image", "")
    if current_image:
        game_file = current_image.rsplit("/", 1)[-1].replace(".png", "")
    else:
        game_file = _next_figure_id()
        record["image"] = f"/assets/portraits/{game_file}.png"

    portrait_dest_src = PORTRAITS_SRC_DIR / f"{game_file}.png"
    portrait_dest_public = PORTRAITS_PUBLIC_DIR / f"{game_file}.png"

    # Handle selected portrait (stored in meta.selected_asset)
    selected_portrait_path = meta.get("selected_asset", "")
    if selected_portrait_path:
        selected_portrait_file = Path(selected_portrait_path)
        if selected_portrait_file.exists():
            PORTRAITS_SRC_DIR.mkdir(parents=True, exist_ok=True)
            PORTRAITS_PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
            shutil.copy2(str(selected_portrait_file), str(portrait_dest_src))
            shutil.copy2(str(selected_portrait_file), str(portrait_dest_public))
            portrait_copied = True
            portrait_source_filename = selected_portrait_file.name
        meta.pop("selected_asset", None)

    # Mark as published
    meta["publish_status"] = "published"
    meta["updated_at"] = datetime.utcnow().isoformat() + "Z"
    ws_records[target_idx] = record

    # Save workspace
    _write_workspace_characters(ws_records)

    # Write ALL published characters (strip meta) to runtime characters.json
    published_records = [
        {k: v for k, v in r.items() if k != "meta"}
        for r in ws_records
        if r.get("meta", {}).get("publish_status") in ("published", "ready")
        and r.get("image")
    ]
    _write_cards_file(CHARACTERS_CARDS_PATH, published_records)
    _sync_special_workspace()

    card_entry = {k: v for k, v in record.items() if k != "meta"}
    return {
        "success": True,
        "game_file": game_file,
        "portrait_copied": portrait_copied,
        "portrait_source_filename": portrait_source_filename,
        "card_entry": card_entry,
    }


# ─────────────────────────────────────────────
# 15. GET /api/characters/{character_name}/deploy-preview
# ─────────────────────────────────────────────
@app.get("/api/characters/{character_name}/deploy-preview")
def deploy_preview(character_name: str) -> Dict[str, Any]:
    """Return a preview of what deploy would write, without actually writing."""
    profiles = _read_character_profiles()
    profile = profiles.get(character_name)

    game_file = _get_game_file(character_name)
    cards = _read_base_cards()
    is_deployed = any(c.get("name") == character_name for c in cards)
    has_profile = profile is not None
    has_portrait = False

    char_folder = _character_folder(character_name)
    if char_folder.exists():
        has_portrait = len(list(char_folder.glob("*.png"))) > 0

    preview_card = None
    if profile:
        resolved_game_file = game_file or "figureXX (auto-assign)"
        preview_card = {
            "card_id": f"card_{character_name}",
            "name": character_name,
            "type": "character",
            "rarity": profile.get("rarity", "copper"),
            "description": profile.get("description", ""),
            "image": f"/assets/portraits/{resolved_game_file}.png",
            "attributes": profile.get("attributes", {}),
            "special_attributes": profile.get("special_attributes", {}),
            "tags": profile.get("tags", []),
            "equipment_slots": profile.get("equipment_slots", 1),
        }

    # Compute portrait_change info
    selected_portrait: Optional[str] = profile.get("selected_portrait") if profile else None
    if selected_portrait:
        portrait_change = {
            "has_change": True,
            "current_game_file": f"{game_file}.png" if game_file else None,
            "selected_portrait_filename": Path(selected_portrait).name,
        }
    else:
        portrait_change = {
            "has_change": False,
            "current_game_file": f"{game_file}.png" if game_file else None,
            "selected_portrait_filename": None,
        }

    return {
        "character_name": character_name,
        "is_deployed": is_deployed,
        "has_profile": has_profile,
        "has_portrait": has_portrait,
        "game_file": game_file,
        "preview_card": preview_card,
        "portrait_change": portrait_change,
    }


# ─────────────────────────────────────────────
# 16. POST /api/characters/{character_name}/regenerate-variants
# ─────────────────────────────────────────────
@app.post("/api/characters/{character_name}/regenerate-variants")
async def regenerate_variants(character_name: str, body: RegenerateVariantsRequest) -> Dict[str, Any]:
    """
    Regenerate all 4 variant descriptions for an existing character using AI.
    Accepts an optional bio as input, then overwrites all 4 variants in batch_config.json.
    """
    items = _read_batch_config()
    existing_names = {item.get("name") for item in items}
    if character_name not in existing_names:
        raise HTTPException(status_code=404, detail=f"Unknown character: {character_name}")

    client = _get_openai_client()
    loop = asyncio.get_running_loop()
    try:
        descriptions = await loop.run_in_executor(
            None, _generate_descriptions_blocking, client, character_name, body.bio
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {exc}")

    # Update all variants in batch_config.json
    char_entries_indices = [i for i, item in enumerate(items) if item.get("name") == character_name]
    for variant_idx, global_idx in enumerate(char_entries_indices[:4]):
        if variant_idx < len(descriptions):
            items[global_idx]["description"] = descriptions[variant_idx]
    _write_batch_config(items)

    return {"success": True, "descriptions": descriptions}


# ─────────────────────────────────────────────
# 17. DELETE /api/characters/{character_name} — soft-delete / archive
# ─────────────────────────────────────────────
@app.delete("/api/characters/{character_name}")
def archive_character(character_name: str) -> Dict[str, Any]:
    """Soft-delete a character by setting meta.archived = true in workspace.
    The character is hidden from the list but not removed from disk."""
    records = _read_workspace_characters()
    found = False
    for record in records:
        if record.get("name") == character_name:
            record.setdefault("meta", {})["archived"] = True
            found = True
    if not found:
        raise HTTPException(status_code=404, detail=f"Character not found: {character_name}")
    _write_workspace_characters(records)
    return {"success": True, "character": character_name, "archived": True}


# ─────────────────────────────────────────────
# Health check
# ─────────────────────────────────────────────
@app.get("/api/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


# ═════════════════════════════════════════════════════════════════
# ITEM MANAGER API
# ═════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────
# Item constants
# ─────────────────────────────────────────────
ITEM_BATCH_CONFIG_PATH = PROJECT_ROOT / "scripts" / "item_batch_config.json"
# NOTE (Phase 1 naming): ITEM_PROFILES_PATH now points to the unified
# workspace file scripts/data/cards/equipment.json (array format).
# Like CHARACTER_PROFILES_PATH, this is the asset-manager workspace and is
# distinct from the runtime src/renderer/data/configs/cards/equipment.json.
ITEM_PROFILES_PATH = PROJECT_ROOT / "scripts" / "data" / "cards" / "equipment.json"
ITEMS_SRC_DIR = PROJECT_ROOT / "src" / "renderer" / "assets" / "items"
ITEMS_PUBLIC_DIR = PROJECT_ROOT / "public" / "items"

# Style B xieyi ink wash item template (写意水墨半写实)
ITEM_STYLE_B_TEMPLATE = (
    "Game equipment illustration icon: {description}. Rendered in traditional xieyi (写意) ink wash painting style. "
    "Style: semi-realistic Chinese ink wash (shui mo), expressive brushwork with feibi dry-brush highlights, "
    "ink washes with natural color accents, traditional Chinese painting aesthetics, elegant restraint. "
    "{rarity_style}"
    "Pure transparent background, PNG with alpha channel. "
    "Display the complete object in full view — do not crop or truncate any part of the item. "
    "For elongated items such as spears, staves, or long swords, fit the entire object within the frame using a slight diagonal composition. "
    "Centered composition, single object displayed on its own. {no_text}"
)

# Rarity-layered visual enhancements for item prompts
# Each entry has:
#   desc_suffix  – appended right after the item description (before "Rendered in…")
#   style_addition – inserted into the Style section (after "elegant restraint.")
RARITY_VISUAL_ENHANCEMENTS: Dict[str, Dict[str, str]] = {
    "stone": {
        "desc_suffix": "",
        "style_addition": (
            "Muted earthy tones — dark charcoal ink with faint ochre and stone-gray washes, "
            "rough unfinished texture, minimal color, rustic and unadorned appearance. "
        ),
    },
    "copper": {
        "desc_suffix": ", showing warm bronze and copper tones",
        "style_addition": (
            "Warm copper-brown and bronze color washes, earthy amber hues with reddish-brown tints, "
            "aged patina effect, modest craftsmanship rendered in warm ink tones. "
        ),
    },
    "silver": {
        "desc_suffix": ", refined craftsmanship visible in every detail",
        "style_addition": (
            "Cool silver-blue color palette, pale cyan and steel-gray ink washes, "
            "subtle ornamental patterns, polished metallic sheen rendered with cool-toned highlights, "
            "exquisite workmanship with precise crisp ink strokes. "
        ),
    },
    "gold": {
        "desc_suffix": ", adorned with ornate engravings and radiant golden accents",
        "style_addition": (
            "Rich warm golden-yellow and amber color washes, vivid jewel-tone accents (deep red, emerald green, sapphire blue), "
            "ornate engravings with golden ink-wash luminescence, "
            "luxurious masterwork quality with warm glowing highlights and rich color contrast. "
        ),
    },
    "divine": {
        "desc_suffix": ", emanating sacred divine aura with ethereal celestial light",
        "style_addition": (
            "Vivid multicolor celestial palette — glowing azure, violet, and gold radiating outward, "
            "intense luminous color contrasts with sacred white-gold light beams, "
            "intricate ancient runes shimmering in vibrant hues, "
            "celestial energy wisps in brilliant blues and purples surrounding the object, "
            "transcendent divine presence expressed through dramatic color and light. "
        ),
    },
}

# Ensure item directories exist
ITEMS_SRC_DIR.mkdir(parents=True, exist_ok=True)
ITEMS_PUBLIC_DIR.mkdir(parents=True, exist_ok=True)

# Mount item static files
app.mount("/items", StaticFiles(directory=str(ITEMS_PUBLIC_DIR)), name="item_assets")


# ─────────────────────────────────────────────
# Item helpers
# ─────────────────────────────────────────────
def _item_folder(name: str) -> Path:
    """Return the samples subfolder for an item: item_{name}."""
    return SAMPLES_DIR / f"item_{name}"


def _read_item_batch_config() -> List[Dict]:
    if not ITEM_BATCH_CONFIG_PATH.exists():
        return []
    try:
        with open(ITEM_BATCH_CONFIG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return []


def _write_item_batch_config(data: List[Dict]) -> None:
    with open(ITEM_BATCH_CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _read_workspace_equipment() -> List[Dict]:
    """Read unified workspace equipment.json (array format)."""
    if not ITEM_PROFILES_PATH.exists():
        return []
    try:
        with open(ITEM_PROFILES_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return []


def _write_workspace_equipment(records: List[Dict]) -> None:
    """Write unified workspace equipment.json (array format)."""
    ITEM_PROFILES_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(ITEM_PROFILES_PATH, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)


def _read_item_profiles() -> Dict[str, Any]:
    """Read workspace equipment.json and return as name→profile map for internal use.

    Profile dict has: type (= 'equipment'), equipment_type, rarity,
    description, lore, attribute_bonus, special_bonus, gem_slots, tags.
    meta.selected_asset is surfaced as selected_image so existing code paths work.
    """
    records = _read_workspace_equipment()
    result: Dict[str, Any] = {}
    for record in records:
        name = record.get("name", "")
        if not name:
            continue
        profile: Dict[str, Any] = {
            "type":          record.get("type", "equipment"),
            "equipment_type": record.get("equipment_type", "weapon"),
            "rarity":        record.get("rarity", "copper"),
            "description":   record.get("description", ""),
            "lore":          record.get("lore", ""),
            "attribute_bonus": record.get("attribute_bonus", {}),
            "special_bonus": record.get("special_bonus", {}),
            "gem_slots":     record.get("gem_slots", 0),
            "tags":          record.get("tags", []),
        }
        # Translate meta.selected_asset → selected_image for existing code paths
        meta = record.get("meta", {})
        if meta.get("selected_asset"):
            profile["selected_image"] = meta["selected_asset"]
        if meta.get("archived"):
            profile["archived"] = True
        result[name] = profile
    return result


def _write_item_profiles(data: Dict[str, Any]) -> None:
    """Persist item profiles (name→profile map) back to workspace array format.

    Preserves all fields in existing records (card_id, image, type, meta.publish_status,
    etc.) that are not part of the editable profile dict.
    Syncs selected_image → meta.selected_asset (empty string = cleared).
    """
    records = _read_workspace_equipment()
    records_by_name: Dict[str, Dict] = {
        r.get("name"): r for r in records if r.get("name")
    }

    for name, profile in data.items():
        if name in records_by_name:
            record = records_by_name[name]
        else:
            # Brand-new item not yet in workspace — create a stub record
            safe_id = re.sub(r"[^\w]", "_", name)
            record = {
                "card_id":        f"equip_{safe_id}",
                "name":           name,
                "type":           "equipment",
                "image":          "",
            }
            records.append(record)
            records_by_name[name] = record

        # Update editable card fields from profile
        for key in ("equipment_type", "rarity", "description", "lore",
                    "attribute_bonus", "special_bonus", "gem_slots", "tags"):
            if key in profile:
                record[key] = profile[key]
        if "type" in profile:
            record["type"] = profile["type"]

        # Sync meta
        if "meta" not in record:
            record["meta"] = {
                "publish_status":    "draft",
                "asset_candidates":  [],
                "workshop_variants": [],
            }
        # Always sync selected_asset — absence of selected_image means it was cleared
        record["meta"]["selected_asset"] = profile.get("selected_image", "")
        record["meta"]["updated_at"] = datetime.utcnow().isoformat() + "Z"

    _write_workspace_equipment(list(records_by_name.values()))


def _item_to_card_id(name: str) -> str:
    """Generate card_id from item name using simple ASCII transliteration."""
    import unicodedata
    # Use the name directly with prefix, replacing non-ascii with underscores
    safe = re.sub(r'[^\w]', '_', name, flags=re.ASCII)
    if not safe or safe.startswith('_'):
        safe = f"item_{abs(hash(name)) % 10000}"
    return f"equip_{safe}"


def _build_item_prompt(description: str, rarity: str = "silver") -> str:
    """Build Style B xieyi item prompt with rarity-based visual enhancement."""
    templates = _load_templates()
    no_text = templates.get("no_text_constraint", ga.NO_TEXT_CONSTRAINT)
    enh = RARITY_VISUAL_ENHANCEMENTS.get(rarity, RARITY_VISUAL_ENHANCEMENTS["silver"])
    desc_with_suffix = f"{description}{enh['desc_suffix']}"
    rarity_style = enh["style_addition"]
    return ITEM_STYLE_B_TEMPLATE.format(
        description=desc_with_suffix,
        rarity_style=rarity_style,
        no_text=no_text,
    )


# ─────────────────────────────────────────────
# Item Pydantic models
# ─────────────────────────────────────────────
class CreateItemRequest(BaseModel):
    name: str
    bio: str = ""
    equipment_type: str = "weapon"  # weapon | armor | accessory | mount


class UpdateItemVariantRequest(BaseModel):
    variant_index: int
    description: str


class RegenerateItemVariantsRequest(BaseModel):
    bio: str = ""


class ItemProfileModel(BaseModel):
    type: Optional[str] = None
    equipment_type: Optional[str] = None
    rarity: Optional[str] = None
    description: Optional[str] = None
    lore: Optional[str] = None
    attribute_bonus: Optional[Dict[str, int]] = None
    special_bonus: Optional[Dict[str, int]] = None
    gem_slots: Optional[int] = None
    tags: Optional[List[str]] = None


class SelectItemImageRequest(BaseModel):
    image_path: str


# ─────────────────────────────────────────────
# Item AI prompts
# ─────────────────────────────────────────────
_ITEM_VARIANT_SYSTEM_PROMPT = """\
你是熟读武侠小说《雪中悍刀行》的物品设计专家，同时是一位精通传统水墨意象的视觉描述师。

## 任务
为给定物品生成 4 条不同视觉方向的 description，用于传统写意水墨风格绘画提示词。

## 核心规范
- 每条 description 描述同一物品的不同视觉重点/设计方向
- 4 条 description 保持同一物品的核心 identity 一致（材质、轮廓、标志性装饰）
- 4 条各自强调不同侧重：
  1. 极简展示版（材质和形状的精炼描述）
  2. 强调质感与重量感（细节、材料纹路）
  3. 强调传奇感与气场（历史感、名器气质）
  4. 强调灵气与古意（仙韵、岁月痕迹、水墨意境）
- 每条约 20-50 字，中文，精炼词组为主，勿写完整句子
- 描述的是视觉内容，不含人物关系或身份信息

## 输出格式
严格输出 JSON 数组，包含 4 个字符串，不含任何其他内容。
"""


def _generate_item_descriptions_blocking(client, name: str, equipment_type: str, bio: str) -> List[str]:
    """Call LLM to generate 4 item visual variant descriptions. Blocking."""
    eq_type_cn = {
        "weapon": "武器",
        "armor": "甲胄",
        "accessory": "饰品/法器",
        "mount": "坐骑/特殊道具",
    }.get(equipment_type, equipment_type)

    bio_section = f"补充描述：{bio}\n" if bio.strip() else ""

    user_msg = (
        f"物品名：{name}\n"
        f"类型：{eq_type_cn}\n"
        f"{bio_section}"
        f"请基于《雪中悍刀行》世界观（如物品在原著中存在），"
        f"为该物品生成 4 条不同视觉方向的水墨风格 description，以 JSON 数组格式输出。"
    )
    response = client.responses.create(
        model=DESCRIPTION_MODEL,
        instructions=_ITEM_VARIANT_SYSTEM_PROMPT,
        input=user_msg,
        temperature=0.9,
        max_output_tokens=800,
    )
    content = response.output_text.strip()
    if content.startswith("```"):
        content = re.sub(r"^```[^\n]*\n?", "", content)
        content = re.sub(r"\n?```$", "", content)
    descriptions: List[str] = json.loads(content)
    if not isinstance(descriptions, list) or len(descriptions) < 4:
        raise ValueError(f"Unexpected LLM response: {content}")
    return descriptions[:4]


_ITEM_PROFILE_SYSTEM_PROMPT = """\
你是《雪中悍刀行》世界观专家，为游戏物品（装备卡）生成属性配置和文案。

## 稀有度与加成强度对照
- gold: 每项加成上限 8-12，gem_slots 2-3
- silver: 每项加成上限 4-7，gem_slots 1-2
- copper: 每项加成上限 2-3，gem_slots 0-1
- stone: 每项加成上限 1，gem_slots 0

## 属性加成说明（attribute_bonus）
可选属性：physique, charm, wisdom, combat, social, survival, stealth, magic
- weapon: 主要加 combat，少量 physique
- armor: 主要加 physique/survival，少量 combat
- accessory: 主要加 charm/social/wisdom，少量其他
- mount: 主要加 survival/social，少量 combat

## 特殊加成（special_bonus）
可选字段：support（-3 到 5），reroll（0 到 5）
只有特别强大或特殊的物品才有此加成。

## 标签参考
weapon, armor, accessory, mount, legendary, ancient, magical, paired, rare

## 输出格式
严格输出 JSON 对象，包含以下字段，不含任何其他内容：
{
  "type": "equipment",
  "equipment_type": "weapon|armor|accessory|mount",
  "rarity": "gold|silver|copper|stone",
  "description": "20-60字游戏内文案",
  "lore": "可选，50-100字背景故事",
  "attribute_bonus": {"combat": N, ...},
  "special_bonus": {},
  "gem_slots": N,
  "tags": ["tag1", "tag2"]
}
"""


def _generate_item_profile_blocking(client, name: str, equipment_type: str, bio: str, reference_cards: List[Dict]) -> Dict[str, Any]:
    """Call LLM to generate item profile. Blocking."""
    ref_text = ""
    if reference_cards:
        equip_cards = [c for c in reference_cards if c.get("type") == "equipment"][:5]
        if equip_cards:
            ref_lines = ["以下是现有装备卡的属性作为参考："]
            for card in equip_cards:
                ref_lines.append(
                    f"- {card['name']} ({card.get('rarity','?')} {card.get('equipment_type','')}): "
                    f"bonus={card.get('attribute_bonus', {})}"
                )
            ref_text = "\n".join(ref_lines)

    eq_type_cn = {
        "weapon": "武器", "armor": "甲胄", "accessory": "饰品/法器", "mount": "坐骑",
    }.get(equipment_type, equipment_type)

    bio_section = f"补充描述：{bio}\n" if bio.strip() else ""

    user_msg = (
        f"物品名：{name}\n"
        f"物品类型：{eq_type_cn}（{equipment_type}）\n"
        f"{bio_section}"
        f"{ref_text}\n\n"
        f"请基于《雪中悍刀行》世界观，为该物品生成游戏属性配置。"
    )
    response = client.responses.create(
        model=DESCRIPTION_MODEL,
        instructions=_ITEM_PROFILE_SYSTEM_PROMPT,
        input=user_msg,
        temperature=0.7,
        max_output_tokens=600,
    )
    content = response.output_text.strip()
    if content.startswith("```"):
        content = re.sub(r"^```[^\n]*\n?", "", content)
        content = re.sub(r"\n?```$", "", content)
    profile: Dict[str, Any] = json.loads(content)
    return profile


# ─────────────────────────────────────────────
# Item generate endpoint patch:
# Override the generate folder resolution for items.
# (The main /api/generate already exists; we patch by adding an item-samples endpoint.)
# ─────────────────────────────────────────────

# ─────────────────────────────────────────────
# I1. GET /api/items
# ─────────────────────────────────────────────
@app.get("/api/items")
def get_items() -> List[Dict]:
    """List all items from item_batch_config.json, grouped by name."""
    entries = _read_item_batch_config()
    profiles = _read_item_profiles()

    groups: Dict[str, List[Dict]] = {}
    for entry in entries:
        name = entry["name"]
        groups.setdefault(name, []).append(entry)

    items = []
    for name, item_entries in groups.items():
        profile = profiles.get(name, {})
        # Skip archived items
        if profile.get("archived"):
            continue
        has_pending_image = bool(profile.get("selected_image"))

        folder = _item_folder(name)
        current_image = ""
        cards = _read_runtime_cards()
        card = next((c for c in cards if c.get("name") == name and c.get("type") == "equipment"), None)
        if card and card.get("image"):
            img_filename = card["image"].rsplit("/", 1)[-1]
            img_path = ITEMS_PUBLIC_DIR / img_filename
            if img_path.exists():
                mtime = int(img_path.stat().st_mtime)
                current_image = f"/items/{img_filename}?t={mtime}"

        # Fallback 1: use selected_image (pending deploy) as thumbnail
        if not current_image and profile.get("selected_image"):
            sel_path = Path(profile["selected_image"])
            try:
                rel = sel_path.relative_to(SAMPLES_DIR)
                current_image = f"/images/{rel.as_posix()}"
            except ValueError:
                pass

        # Fallback 2: use first generated sample image as thumbnail
        if not current_image:
            sample_folder = _item_folder(name)
            if sample_folder.exists():
                sample_files = sorted(sample_folder.glob("*.png"))
                if sample_files:
                    rel = sample_files[0].relative_to(SAMPLES_DIR)
                    current_image = f"/images/{rel.as_posix()}"

        variants = [
            {"index": i, "description": e.get("description", ""), "output": e.get("output", "")}
            for i, e in enumerate(item_entries)
        ]

        items.append({
            "name": name,
            "id": name,
            "equipment_type": profile.get("equipment_type", "weapon"),
            "rarity": profile.get("rarity", "copper"),
            "current_image": current_image,
            "has_pending_image": has_pending_image,
            "variants": variants,
        })

    return items


# ─────────────────────────────────────────────
# I2. POST /api/items
# ─────────────────────────────────────────────
@app.post("/api/items")
async def create_item(body: CreateItemRequest) -> Dict[str, Any]:
    """Create a new item: generate 4 variant descriptions + profile."""
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="Item name must not be empty.")

    existing = _read_item_batch_config()
    existing_names = {e.get("name") for e in existing}
    if body.name in existing_names:
        raise HTTPException(status_code=409, detail=f"Item '{body.name}' already exists.")

    folder_name = f"item_{body.name}"

    # Generate descriptions via AI
    client = _get_openai_client()
    loop = asyncio.get_running_loop()
    try:
        descriptions = await loop.run_in_executor(
            None, _generate_item_descriptions_blocking, client, body.name, body.equipment_type, body.bio
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {exc}")

    # Build batch config entries
    new_entries = []
    for i, desc in enumerate(descriptions, start=1):
        new_entries.append({
            "type": "item",
            "name": body.name,
            "description": desc,
            "output": f"{folder_name}/{body.name}_{i:02d}.png",
        })

    # Create item samples folder
    (SAMPLES_DIR / folder_name).mkdir(parents=True, exist_ok=True)

    # Append to item_batch_config.json
    all_entries = existing + new_entries
    _write_item_batch_config(all_entries)

    # Auto-generate profile in background
    try:
        reference_cards = _read_runtime_cards()
        profile = await loop.run_in_executor(
            None, _generate_item_profile_blocking, client, body.name, body.equipment_type, body.bio, reference_cards
        )
        profiles = _read_item_profiles()
        profiles[body.name] = profile
        _write_item_profiles(profiles)
    except Exception:
        # Profile generation failure should not block item creation; write default profile
        profiles = _read_item_profiles()
        profiles[body.name] = {
            "type": "equipment",
            "equipment_type": body.equipment_type,
            "rarity": "copper",
            "description": "",
            "lore": "",
            "attribute_bonus": {},
            "special_bonus": {},
            "gem_slots": 0,
            "tags": [],
        }
        _write_item_profiles(profiles)

    variants = [
        {"index": i, "description": e["description"], "output": e["output"]}
        for i, e in enumerate(new_entries)
    ]
    item = {
        "name": body.name,
        "id": body.name,
        "equipment_type": body.equipment_type,
        "rarity": "copper",
        "current_image": "",
        "has_pending_image": False,
        "variants": variants,
    }
    return {"success": True, "item": item}


# ─────────────────────────────────────────────
# I3. GET /api/items/{item_name}/variants
# ─────────────────────────────────────────────
@app.get("/api/items/{item_name}/variants")
def get_item_variants(item_name: str) -> List[Dict]:
    """Get all variant descriptions for an item."""
    entries = _read_item_batch_config()
    item_entries = [e for e in entries if e.get("name") == item_name]
    if not item_entries:
        raise HTTPException(status_code=404, detail=f"Item not found: {item_name}")
    return [
        {"index": i, "description": e.get("description", ""), "output": e.get("output", "")}
        for i, e in enumerate(item_entries)
    ]


# ─────────────────────────────────────────────
# I4. PUT /api/items/{item_name}/variants/{index}
# ─────────────────────────────────────────────
@app.put("/api/items/{item_name}/variants/{index}")
def update_item_variant(item_name: str, index: int, body: UpdateItemVariantRequest) -> Dict[str, Any]:
    """Update a single variant description."""
    entries = _read_item_batch_config()
    existing_names = {e.get("name") for e in entries}
    if item_name not in existing_names:
        raise HTTPException(status_code=404, detail=f"Item not found: {item_name}")

    item_indices = [i for i, e in enumerate(entries) if e.get("name") == item_name]
    if body.variant_index < 0 or body.variant_index >= len(item_indices):
        raise HTTPException(status_code=400, detail=f"variant_index {body.variant_index} out of range.")

    global_idx = item_indices[body.variant_index]
    entries[global_idx]["description"] = body.description
    _write_item_batch_config(entries)
    return {"success": True}


# ─────────────────────────────────────────────
# I5. POST /api/items/{item_name}/regenerate-variants
# ─────────────────────────────────────────────
@app.post("/api/items/{item_name}/regenerate-variants")
async def regenerate_item_variants(item_name: str, body: RegenerateItemVariantsRequest) -> Dict[str, Any]:
    """Regenerate all 4 variant descriptions for an item."""
    entries = _read_item_batch_config()
    existing_names = {e.get("name") for e in entries}
    if item_name not in existing_names:
        raise HTTPException(status_code=404, detail=f"Item not found: {item_name}")

    # Get equipment_type from profile
    profiles = _read_item_profiles()
    profile = profiles.get(item_name, {})
    equipment_type = profile.get("equipment_type", "weapon")

    client = _get_openai_client()
    loop = asyncio.get_running_loop()
    try:
        descriptions = await loop.run_in_executor(
            None, _generate_item_descriptions_blocking, client, item_name, equipment_type, body.bio
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {exc}")

    item_indices = [i for i, e in enumerate(entries) if e.get("name") == item_name]
    for variant_idx, global_idx in enumerate(item_indices[:4]):
        if variant_idx < len(descriptions):
            entries[global_idx]["description"] = descriptions[variant_idx]
    _write_item_batch_config(entries)
    return {"success": True, "descriptions": descriptions}


# ─────────────────────────────────────────────
# I6. GET /api/items/{item_name}/profile
# ─────────────────────────────────────────────
@app.get("/api/items/{item_name}/profile")
def get_item_profile(item_name: str) -> Dict[str, Any]:
    """Return the item profile from workspace equipment.json."""
    profiles = _read_item_profiles()
    profile = profiles.get(item_name)
    if profile is None:
        return {
            "type": "equipment",
            "equipment_type": "weapon",
            "rarity": "copper",
            "description": "",
            "lore": "",
            "attribute_bonus": {},
            "special_bonus": {},
            "gem_slots": 0,
            "tags": [],
        }
    return profile


# ─────────────────────────────────────────────
# I7. PUT /api/items/{item_name}/profile
# ─────────────────────────────────────────────
@app.put("/api/items/{item_name}/profile")
def update_item_profile(item_name: str, body: ItemProfileModel) -> Dict[str, Any]:
    """Update an item's profile."""
    profiles = _read_item_profiles()
    existing = profiles.get(item_name, {})
    update_data = body.model_dump(exclude_none=True)
    if "type" in update_data and update_data["type"] != "equipment":
        raise HTTPException(status_code=400, detail="Item type must be 'equipment'.")
    existing.update(update_data)
    profiles[item_name] = existing
    _write_item_profiles(profiles)
    return {"success": True, "profile": profiles[item_name]}


# ─────────────────────────────────────────────
# I8. POST /api/items/{item_name}/generate-profile
# ─────────────────────────────────────────────
@app.post("/api/items/{item_name}/generate-profile")
async def generate_item_profile(item_name: str) -> Dict[str, Any]:
    """AI-generate a default profile for an item."""
    profiles = _read_item_profiles()
    profile = profiles.get(item_name, {})
    equipment_type = profile.get("equipment_type", "weapon")

    client = _get_openai_client()
    reference_cards = _read_runtime_cards()
    loop = asyncio.get_running_loop()
    try:
        new_profile = await loop.run_in_executor(
            None, _generate_item_profile_blocking, client, item_name, equipment_type, "", reference_cards
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {exc}")

    # Preserve selected_image if it exists
    if "selected_image" in profile:
        new_profile["selected_image"] = profile["selected_image"]

    profiles[item_name] = new_profile
    _write_item_profiles(profiles)
    return {"success": True, "profile": new_profile}


# ─────────────────────────────────────────────
# I9. GET /api/item-samples/{item_name}
# ─────────────────────────────────────────────
@app.get("/api/item-samples/{item_name}")
def get_item_samples(item_name: str) -> List[Dict]:
    """Return all sample images for a given item name from item_{item_name}/ folder."""
    folder = _item_folder(item_name)

    # Get selected_image from profile
    profiles = _read_item_profiles()
    profile = profiles.get(item_name, {})
    selected_image: Optional[str] = profile.get("selected_image")

    # Compute hash of current game item for comparison
    cards = _read_runtime_cards()
    card = next((c for c in cards if c.get("name") == item_name and c.get("type") == "equipment"), None)
    game_item_hash: Optional[str] = None
    if card and card.get("image"):
        img_filename = card["image"].rsplit("/", 1)[-1]
        game_item_path = ITEMS_PUBLIC_DIR / img_filename
        game_item_hash = _file_hash(game_item_path)

    results = []
    if folder.exists():
        for img_file in sorted(folder.glob("*.png")):
            rel = img_file.relative_to(SAMPLES_DIR)
            sample_hash = _file_hash(img_file) if game_item_hash else None
            is_current = game_item_hash is not None and sample_hash == game_item_hash
            is_selected = selected_image is not None and str(img_file) == selected_image
            results.append({
                "filename": img_file.name,
                "url": f"/images/{rel.as_posix()}",
                "path": str(rel),
                "abs_path": str(img_file),
                "is_current_in_game": is_current,
                "is_selected": is_selected,
            })
    return results


# ─────────────────────────────────────────────
# I10. POST /api/items/{item_name}/select-image
# ─────────────────────────────────────────────
@app.post("/api/items/{item_name}/select-image")
def select_item_image(item_name: str, body: SelectItemImageRequest) -> Dict[str, Any]:
    """Mark a sample image as the selected image for the next deploy."""
    image_path = Path(body.image_path)
    if not image_path.exists():
        raise HTTPException(status_code=404, detail=f"Image file not found: {body.image_path}")

    profiles = _read_item_profiles()
    if item_name not in profiles:
        profiles[item_name] = {}
    profiles[item_name]["selected_image"] = str(image_path)
    _write_item_profiles(profiles)
    return {"success": True, "selected_image": str(image_path)}


# ─────────────────────────────────────────────
# I11. GET /api/items/{item_name}/deploy-preview
# ─────────────────────────────────────────────
@app.get("/api/items/{item_name}/deploy-preview")
def item_deploy_preview(item_name: str) -> Dict[str, Any]:
    """Return a preview of what deploy would write for an item."""
    profiles = _read_item_profiles()
    profile = profiles.get(item_name)

    cards = _read_runtime_cards()
    is_deployed = any(c.get("name") == item_name and c.get("type") == "equipment" for c in cards)
    has_profile = profile is not None

    item_folder = _item_folder(item_name)
    has_image = item_folder.exists() and len(list(item_folder.glob("*.png"))) > 0

    preview_card = None
    if profile:
        card_id = _item_to_card_id(item_name)
        # Check if already deployed to preserve card_id
        existing = next((c for c in cards if c.get("name") == item_name and c.get("type") == "equipment"), None)
        if existing:
            card_id = existing.get("card_id", card_id)

        selected_image = profile.get("selected_image")
        img_filename = ""
        if selected_image:
            img_filename = Path(selected_image).name
        else:
            # Use currently deployed image if any
            if existing and existing.get("image"):
                img_filename = existing["image"].rsplit("/", 1)[-1]

        preview_card = {
            "card_id": card_id,
            "name": item_name,
            "type": "equipment",
            "rarity": profile.get("rarity", "copper"),
            "description": profile.get("description", ""),
            "image": f"/assets/items/{img_filename}" if img_filename else "/assets/items/(pending)",
            "equipment_type": profile.get("equipment_type", "weapon"),
            "attribute_bonus": profile.get("attribute_bonus", {}),
            "special_bonus": profile.get("special_bonus", {}),
            "gem_slots": profile.get("gem_slots", 0),
            "tags": profile.get("tags", []),
        }

    selected_image = profile.get("selected_image") if profile else None
    if selected_image:
        image_change = {
            "has_change": True,
            "selected_image_filename": Path(selected_image).name,
        }
    else:
        image_change = {
            "has_change": False,
            "selected_image_filename": None,
        }

    return {
        "item_name": item_name,
        "is_deployed": is_deployed,
        "has_profile": has_profile,
        "has_image": has_image,
        "preview_card": preview_card,
        "image_change": image_change,
    }


# ─────────────────────────────────────────────
# I12. POST /api/items/{item_name}/deploy
# ─────────────────────────────────────────────
@app.post("/api/items/{item_name}/deploy")
def deploy_item(item_name: str) -> Dict[str, Any]:
    """
    Deploy an item to the game (Phase 4 — simplified filter + copy):
    1. Read workspace record directly
    2. If meta.selected_asset is set, copy image to game directories
    3. Mark publish_status = published, save workspace
    4. Write ALL published equipment (strip meta) to runtime equipment.json
    """
    ws_records = _read_workspace_equipment()
    target_idx = next(
        (i for i, r in enumerate(ws_records) if r.get("name") == item_name), None
    )
    if target_idx is None:
        raise HTTPException(
            status_code=404,
            detail=f"Item '{item_name}' not found in workspace.",
        )

    record = ws_records[target_idx]
    meta = record.setdefault("meta", {})

    image_copied = False
    image_source_filename = None

    # Handle selected image (stored in meta.selected_asset)
    selected_image_path = meta.get("selected_asset", "")
    if selected_image_path:
        selected_image_file = Path(selected_image_path)
        if selected_image_file.exists():
            img_filename = selected_image_file.name
            dest_src = ITEMS_SRC_DIR / img_filename
            dest_public = ITEMS_PUBLIC_DIR / img_filename
            ITEMS_SRC_DIR.mkdir(parents=True, exist_ok=True)
            ITEMS_PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
            shutil.copy2(str(selected_image_file), str(dest_src))
            shutil.copy2(str(selected_image_file), str(dest_public))
            record["image"] = f"/assets/items/{img_filename}"
            image_copied = True
            image_source_filename = img_filename
        meta.pop("selected_asset", None)

    # Mark as published
    meta["publish_status"] = "published"
    meta["updated_at"] = datetime.utcnow().isoformat() + "Z"
    ws_records[target_idx] = record

    # Save workspace
    _write_workspace_equipment(ws_records)

    # Write ALL published equipment (strip meta) to runtime equipment.json
    published_records = [
        {k: v for k, v in r.items() if k != "meta"}
        for r in ws_records
        if r.get("meta", {}).get("publish_status") in ("published", "ready")
    ]
    _write_cards_file(EQUIPMENT_CARDS_PATH, published_records)
    _sync_special_workspace()

    card_entry = {k: v for k, v in record.items() if k != "meta"}
    return {
        "success": True,
        "image_copied": image_copied,
        "image_source_filename": image_source_filename,
        "card_entry": card_entry,
    }


# ─────────────────────────────────────────────
# I13x. DELETE /api/items/{item_name} — soft-delete / archive
# ─────────────────────────────────────────────
@app.delete("/api/items/{item_name}")
def archive_item(item_name: str) -> Dict[str, Any]:
    """Soft-delete an item by setting meta.archived = true in workspace.
    The item is hidden from the list but not removed from disk."""
    records = _read_workspace_equipment()
    found = False
    for record in records:
        if record.get("name") == item_name:
            record.setdefault("meta", {})["archived"] = True
            found = True
    if not found:
        raise HTTPException(status_code=404, detail=f"Item not found: {item_name}")
    _write_workspace_equipment(records)
    return {"success": True, "item": item_name, "archived": True}


# ─────────────────────────────────────────────
# I13. POST /api/item-generate  (SSE, Style B)
# ─────────────────────────────────────────────
@app.post("/api/item-generate")
async def generate_item_images(body: GenerateRequest):
    """
    Generate item images using Style B (xieyi ink wash) prompt template.
    Saves to item_{name} folder. Streams SSE progress.
    """
    if body.asset_type != "item":
        raise HTTPException(status_code=400, detail="This endpoint only supports asset_type=item")

    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY environment variable is not set.")

    async def event_stream():
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        loop = asyncio.get_running_loop()
        count = max(1, body.count)
        timestamp = int(time.time())
        folder = _item_folder(body.name)
        folder.mkdir(parents=True, exist_ok=True)

        # Look up item rarity from profile (default to "silver" if not found)
        profiles = _read_item_profiles()
        item_rarity = profiles.get(body.name, {}).get("rarity", "silver")

        # Build Style B prompt with rarity enhancement
        prompt = _build_item_prompt(body.description, rarity=item_rarity)

        generated_images = []

        for i in range(1, count + 1):
            progress_event = json.dumps({
                "type": "progress",
                "message": f"Generating item image {i} of {count} for {body.name}…",
                "current": i,
                "total": count,
            })
            yield f"data: {progress_event}\n\n"

            filename = f"{body.name}_{timestamp}_{i}.png"
            output_path = folder / filename

            try:
                saved_path = await loop.run_in_executor(
                    None,
                    _generate_single_blocking,
                    client,
                    prompt,
                    "item",
                    output_path,
                )
                rel_path = saved_path.relative_to(SAMPLES_DIR)
                generated_images.append({
                    "path": str(rel_path),
                    "url": f"/images/{rel_path.as_posix()}",
                })
            except Exception as exc:
                error_event = json.dumps({
                    "type": "error",
                    "message": f"Failed to generate image {i}: {exc}",
                    "current": i,
                    "total": count,
                })
                yield f"data: {error_event}\n\n"

        history_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "name": body.name,
            "asset_type": "item",
            "images": generated_images,
        }
        _append_history(history_entry)

        done_event = json.dumps({"type": "done", "images": generated_images})
        yield f"data: {done_event}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# ═════════════════════════════════════════════════════════════════
# SCENE MANAGER API
# ═════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────
# Scene constants
# ─────────────────────────────────────────────
MAPS_WORKSPACE_DIR = PROJECT_ROOT / "scripts" / "data" / "maps"  # Phase-5 workspace split files
MAPS_DIR = BACKEND_DIR / "maps"  # tools/asset-manager/backend/maps/{map_id}/

# Phase-5 workspace split files
LOCATIONS_WORKSPACE_PATH = MAPS_WORKSPACE_DIR / "locations.json"
MAPS_WORKSPACE_DATA_PATH = MAPS_WORKSPACE_DIR / "maps.json"

# Game runtime paths (for deploy sync)
GAME_MAPS_CONFIG_DIR = PROJECT_ROOT / "src" / "renderer" / "data" / "configs" / "maps"
# Phase-5 runtime split files
RUNTIME_LOCATIONS_PATH = GAME_MAPS_CONFIG_DIR / "locations.json"
RUNTIME_MAPS_PATH = GAME_MAPS_CONFIG_DIR / "maps.json"
# Vite root is src/renderer, so public assets are served from src/renderer/public/
# Rule: runtime hot-deploy resources → src/renderer/public/  (NEVER root public/)
GAME_PUBLIC_MAPS_DIR = PROJECT_ROOT / "src" / "renderer" / "public" / "maps"

# ─────────────────────────────────────────────
# Scene / map icon prompt style constants
# Mirrors generate_beiliang_assets.py exactly:
#   MAP_STYLE_BASE + " " + ICON_STYLE_SUFFIX + "\n\n" + Subject + details
# ─────────────────────────────────────────────
_MAP_STYLE_BASE = (
    "Traditional East Asian ink wash painting (水墨画) style. "
    "East Asian ink wash painting style with vibrant natural color accents, rich and varied color palette, "
    "expressive brushwork, classical Chinese painting aesthetics. "
    "NO human figures, NO portraits, NO characters, NO people, NO faces, NO text, NO labels, NO UI elements."
)

# Scene icon style prompt template (map building/location icons — NOT character style)
# Structure exactly matches ICON_STYLE in generate_beiliang_assets.py:
#   {MAP_STYLE_BASE} {icon_style_suffix}\n\nSubject: {prompt} {details}
SCENE_ICON_STYLE = (
    _MAP_STYLE_BASE + " "
    "Single architectural landmark illustration, icon composition, "
    "clear silhouette suitable for overlaying on a map, "
    "centered subject, transparent-compatible edges."
    "\n\n"
    "Subject: {prompt} "
    "Architectural landmark viewed at a slight elevation angle, "
    "well-defined silhouette, fine ink line detail on rooftops and structural elements, "
    "rich color washes to highlight material and atmosphere. "
    "Square icon composition with generous negative space around the subject. "
    "NO human figures, NO text, NO labels."
)

# Scene backdrop style prompt template (wide panoramic scene backgrounds)
# Used for generating 1536×1024 widescreen background images for game scenes.
SCENE_BACKDROP_STYLE = (
    _MAP_STYLE_BASE + " "
    "Wide panoramic landscape backdrop, cinematic widescreen composition (1536×1024), "
    "suitable as an atmospheric full-screen scene background, "
    "horizon line at upper third, rich layered depth with foreground details and atmospheric distance haze."
    "\n\n"
    "Scene: {prompt} "
    "Horizontal panoramic landscape layout, wide cinematic composition, "
    "rich environmental storytelling with architectural or natural features, "
    "atmospheric ink washes with vivid natural color accents, "
    "layered depth: detailed foreground, atmospheric midground, hazy background. "
    "Suitable as a full-screen widescreen background for game scenes. "
    "NO human figures, NO text, NO labels, NO UI elements."
)

# Ensure maps directory exists and mount as static files
MAPS_DIR.mkdir(parents=True, exist_ok=True)
GAME_PUBLIC_MAPS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/maps", StaticFiles(directory=str(MAPS_DIR)), name="map_assets")
# Phase-4: also serve deployed game map assets (icons/backdrops) from the game's public dir
app.mount("/game-maps", StaticFiles(directory=str(GAME_PUBLIC_MAPS_DIR)), name="game_map_assets")


# ─────────────────────────────────────────────
# Scene helpers
# ─────────────────────────────────────────────

def _read_workspace_locations_data() -> List[Dict]:
    """Read scripts/data/maps/locations.json (array of workspace location records)."""
    if not LOCATIONS_WORKSPACE_PATH.exists():
        return []
    try:
        with open(LOCATIONS_WORKSPACE_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return []


def _write_workspace_locations_data(records: List[Dict]) -> None:
    """Write scripts/data/maps/locations.json."""
    MAPS_WORKSPACE_DIR.mkdir(parents=True, exist_ok=True)
    with open(LOCATIONS_WORKSPACE_PATH, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)


def _read_workspace_maps_data() -> List[Dict]:
    """Read scripts/data/maps/maps.json (array of workspace map records)."""
    if not MAPS_WORKSPACE_DATA_PATH.exists():
        return []
    try:
        with open(MAPS_WORKSPACE_DATA_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return []


def _write_workspace_maps_data(records: List[Dict]) -> None:
    """Write scripts/data/maps/maps.json."""
    MAPS_WORKSPACE_DIR.mkdir(parents=True, exist_ok=True)
    with open(MAPS_WORKSPACE_DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)


def _read_location_profiles() -> Dict[str, Any]:
    """Read locations.json + maps.json into {"maps": {map_id: map_data}}.

    Builds the same internal format as before so all downstream code is unchanged:
      {"maps": {map_id: {map_id, name, description, background_image, meta, locations: [...]}}}

    Position for each location comes from maps.json location_refs (position is map-specific).
    Location order follows the order in location_refs.
    """
    ws_locs = _read_workspace_locations_data()
    ws_maps = _read_workspace_maps_data()

    # Group locations by map_id
    locs_by_map: Dict[str, List[Dict]] = {}
    for loc in ws_locs:
        mid = loc.get("map_id", "")
        locs_by_map.setdefault(mid, []).append(loc)

    # Build position lookup: {map_id: {location_id: position}}
    pos_by_map: Dict[str, Dict[str, Dict]] = {}
    for ws_map in ws_maps:
        mid = ws_map.get("map_id", "")
        pos_by_map[mid] = {
            ref.get("location_id", ""): ref.get("position", {"x": 0.5, "y": 0.5})
            for ref in ws_map.get("location_refs", [])
        }

    result: Dict[str, Any] = {"maps": {}}
    for ws_map in ws_maps:
        mid = ws_map.get("map_id", "")
        pos_lookup = pos_by_map.get(mid, {})

        # Build ordered full location list following location_refs order
        loc_order = [ref.get("location_id") for ref in ws_map.get("location_refs", [])]
        loc_by_id: Dict[str, Dict] = {
            loc.get("location_id", ""): loc
            for loc in locs_by_map.get(mid, [])
        }
        full_locs = []
        for loc_id in loc_order:
            loc = loc_by_id.get(loc_id)
            if loc is None:
                continue
            full_loc = dict(loc)
            full_loc["position"] = pos_lookup.get(loc_id, {"x": 0.5, "y": 0.5})
            full_locs.append(full_loc)
        # Append any locations not referenced in location_refs (safety fallback)
        referenced_ids = set(loc_order)
        for loc in locs_by_map.get(mid, []):
            if loc.get("location_id") not in referenced_ids:
                full_loc = dict(loc)
                full_loc["position"] = {"x": 0.5, "y": 0.5}
                full_locs.append(full_loc)

        result["maps"][mid] = {
            "map_id": mid,
            "name": ws_map.get("name", mid),
            "description": ws_map.get("description", ""),
            "public_subdir": ws_map.get("public_subdir", mid),
            "background_image": ws_map.get("background_image", ""),
            "meta": ws_map.get("meta", {}),
            "locations": full_locs,
        }

    return result


def _write_location_profiles(data: Dict[str, Any]) -> None:
    """Split internal {"maps": {map_id: map_data}} back to locations.json + maps.json.

    For each location in the internal format:
    - position → maps.json location_refs
    - all other fields (+ map_id) → locations.json
    """
    new_locs: List[Dict] = []
    new_maps: List[Dict] = []

    for map_id, map_data in data.get("maps", {}).items():
        # Build maps.json entry: map metadata + location_refs (carrying positions)
        location_refs = [
            {
                "location_id": loc.get("location_id", ""),
                "position": loc.get("position", {"x": 0.5, "y": 0.5}),
            }
            for loc in map_data.get("locations", [])
        ]
        new_maps.append({
            "map_id": map_id,
            "name": map_data.get("name", map_id),
            "description": map_data.get("description", ""),
            "background_image": map_data.get("background_image", ""),
            "location_refs": location_refs,
            "meta": map_data.get("meta", {}),
        })

        # Build locations.json entries: location data without position, with map_id
        for loc in map_data.get("locations", []):
            loc_entry = {k: v for k, v in loc.items() if k != "position"}
            loc_entry["map_id"] = map_id
            new_locs.append(loc_entry)

    _write_workspace_locations_data(new_locs)
    _write_workspace_maps_data(new_maps)


def _deploy_map_to_runtime(map_id: str) -> bool:
    """Write ALL workspace maps/locations to runtime locations.json + maps.json.

    Phase-5: runtime uses two flat files:
      - locations.json: all published locations (no meta, no map_id, no position)
      - maps.json: all maps (no meta, location_refs with position for published locs only)

    Filtering rule: include location if publish_status is 'published' or 'ready',
    OR if publish_status is unset (legacy / not yet classified = include).
    Only exclude locations explicitly marked 'draft'.
    """
    ws_locs = _read_workspace_locations_data()
    ws_maps = _read_workspace_maps_data()

    # Build published locations: strip meta and map_id, collect their IDs
    runtime_locs: List[Dict] = []
    published_loc_ids: set = set()
    for loc in ws_locs:
        loc_meta = loc.get("meta", {})
        publish_status = loc_meta.get("publish_status", "")
        # Include if published/ready, or if publish_status is unset (legacy locations)
        if publish_status in ("published", "ready") or not publish_status:
            runtime_loc = {k: v for k, v in loc.items() if k not in ("meta", "map_id")}
            runtime_locs.append(runtime_loc)
            published_loc_ids.add(loc.get("location_id", ""))

    # Build runtime maps: strip meta, filter location_refs to only published
    runtime_maps: List[Dict] = []
    for ws_map in ws_maps:
        runtime_map = {k: v for k, v in ws_map.items() if k != "meta"}
        runtime_map["location_refs"] = [
            ref for ref in ws_map.get("location_refs", [])
            if ref.get("location_id") in published_loc_ids
        ]
        runtime_maps.append(runtime_map)

    # Write runtime files
    GAME_MAPS_CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    try:
        with open(RUNTIME_LOCATIONS_PATH, "w", encoding="utf-8") as f:
            json.dump(runtime_locs, f, ensure_ascii=False, indent=2)
        with open(RUNTIME_MAPS_PATH, "w", encoding="utf-8") as f:
            json.dump(runtime_maps, f, ensure_ascii=False, indent=2)
        return True
    except OSError:
        return False


def _scene_samples_folder(scene_id: str) -> Path:
    """Return the samples subfolder for a location.

    Uses the location_id directly (e.g. 'location_001/').
    """
    new_folder = SAMPLES_DIR / scene_id
    return new_folder


def _find_scene_by_id(profiles: Dict[str, Any], scene_id: str) -> Optional[Dict[str, Any]]:
    """Find a location dict by its location_id from location profiles data."""
    for map_id, map_data in profiles.get("maps", {}).items():
        for scene in map_data.get("locations", []):
            if scene.get("location_id") == scene_id:
                return scene
    return None


def _find_scene_and_map(profiles: Dict[str, Any], scene_id: str):
    """Return (map_id, location_dict) or (None, None)."""
    for map_id, map_data in profiles.get("maps", {}).items():
        for scene in map_data.get("locations", []):
            if scene.get("location_id") == scene_id:
                return map_id, scene
    return None, None


def _location_to_api_scene(map_id: str, loc: Dict[str, Any]) -> Dict[str, Any]:
    """Convert a workspace location dict to the API-facing location dict."""
    meta = loc.get("meta", {})
    return {
        "map_id": map_id,
        "type": meta.get("type", ""),
        "description": meta.get("description", ""),
        "icon_prompt": meta.get("icon_prompt", ""),
        "icon_image": loc.get("icon_image", ""),
        "backdrop_prompt": meta.get("backdrop_prompt", ""),
        "backdrop_image": loc.get("backdrop_image", ""),
        "icon_variants": meta.get("icon_variants", []),
        "backdrop_variants": meta.get("backdrop_variants", []),
        "selected_icon": meta.get("selected_icon", ""),
        "selected_backdrop": meta.get("selected_backdrop", ""),
        "location_id": loc.get("location_id", ""),
        "name": loc.get("name", ""),
        "position": loc.get("position", {}),
        "scene_ids": loc.get("scene_ids", []),
        "unlock_conditions": loc.get("unlock_conditions", {}),
    }


def _with_scene_variants(scene: Dict[str, Any]) -> Dict[str, Any]:
    """Return a copy of the API scene dict with icon_variants and backdrop_variants defaulted."""
    result = dict(scene)
    if not result.get("icon_variants"):
        result["icon_variants"] = [{"index": 0, "description": result.get("icon_prompt", "")}]
    if not result.get("backdrop_variants"):
        result["backdrop_variants"] = [{"index": 0, "description": result.get("backdrop_prompt", "")}]
    return result


def _build_scene_prompt(raw_prompt: str, image_type: str = "icon") -> str:
    """Build the full generation prompt for a scene icon or backdrop."""
    if image_type == "backdrop":
        return SCENE_BACKDROP_STYLE.format(prompt=raw_prompt)
    return SCENE_ICON_STYLE.format(prompt=raw_prompt)


def _generate_scene_icon_direct(client, prompt: str, output_path: Path) -> Path:
    """Generate a scene icon using the same API params as generate_beiliang_assets.py.

    Exact match to generate_with_images() in generate_beiliang_assets.py:
      model=gpt-image-1, size=1024x1024, quality=high, background=transparent,
      output_format=png, n=1. Saves raw PNG bytes — no resize, no RGB conversion.
    """
    import base64 as _base64
    response = client.images.generate(
        model="gpt-image-1",
        prompt=prompt,
        size="1024x1024",
        quality="high",
        background="transparent",
        output_format="png",
        n=1,
    )
    if not response.data or not response.data[0].b64_json:
        raise RuntimeError("Image generation response missing data")
    image_bytes = _base64.b64decode(response.data[0].b64_json)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(image_bytes)
    return output_path


def _generate_scene_backdrop_direct(client, prompt: str, output_path: Path) -> Path:
    """Generate a scene backdrop (1536x1024, opaque) using gpt-image-1."""
    import base64 as _base64
    response = client.images.generate(
        model="gpt-image-1",
        prompt=prompt,
        size="1536x1024",
        quality="high",
        background="opaque",
        output_format="png",
        n=1,
    )
    if not response.data or not response.data[0].b64_json:
        raise RuntimeError("Image generation response missing data")
    image_bytes = _base64.b64decode(response.data[0].b64_json)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(image_bytes)
    return output_path


def _scene_icon_url(scene: Dict[str, Any]) -> str:
    """Return the URL for the scene's deployed icon, served by the asset manager backend.

    icon_image stores a game URL like "/maps/beiliang/location_001.png".
    """
    icon_image_path = scene.get("icon_image", "")
    if not icon_image_path:
        return ""

    if icon_image_path.startswith("/maps/"):
        rel = icon_image_path[len("/maps/"):]  # strip leading "/maps/"
        local_file = GAME_PUBLIC_MAPS_DIR / rel
        if local_file.exists():
            mtime = int(local_file.stat().st_mtime)
            return f"/game-maps/{rel}?t={mtime}"
        return f"/game-maps/{rel}"
    return ""


# ─────────────────────────────────────────────
# Scene Pydantic models
# ─────────────────────────────────────────────
class LocationPosition(BaseModel):
    x: float
    y: float


class UpdateSceneRequest(BaseModel):
    description: Optional[str] = None
    icon_prompt: Optional[str] = None
    name: Optional[str] = None
    backdrop_prompt: Optional[str] = None
    # Location runtime fields (sync to game map config on save)
    position: Optional[LocationPosition] = None
    scene_ids: Optional[List[str]] = None
    unlock_conditions: Optional[Dict[str, Any]] = None


class SelectSceneIconRequest(BaseModel):
    image_path: str


class SelectBackdropRequest(BaseModel):
    image_path: str


class CreateLocationRequest(BaseModel):
    location_id: str           # e.g. "location_011"
    name: str                  # display name in Chinese
    description: str = ""
    type: str = ""
    position: Optional[LocationPosition] = None
    scene_ids: List[str] = []
    unlock_conditions: Dict[str, Any] = {}
    icon_prompt: str = ""
    backdrop_prompt: str = ""


class SceneGenerateRequest(BaseModel):
    location_id: str
    icon_prompt: str
    count: int = 1
    image_type: str = "icon"  # "icon" | "backdrop"


class SceneGeneratePromptsRequest(BaseModel):
    location_id: str
    image_type: str = "icon"  # "icon" | "backdrop"


class UpdateSceneVariantRequest(BaseModel):
    description: str


class RegenerateSceneVariantsRequest(BaseModel):
    bio: str = ""


# ─────────────────────────────────────────────
# S1. GET /api/scenes — all scenes grouped by map
# ─────────────────────────────────────────────
@app.get("/api/scenes")
def get_scenes() -> Dict[str, Any]:
    """Return all scenes grouped by map, with current_icon URLs."""
    profiles = _read_location_profiles()
    result: Dict[str, Any] = {"maps": {}}

    for map_id, map_data in profiles.get("maps", {}).items():
        # Build terrain entry from map-level meta (Phase-3 format)
        meta = map_data.get("meta", {})
        terrain_icon_path = meta.get("terrain_icon_path", "")
        terrain_icon_url = ""
        if terrain_icon_path.startswith("/maps/"):
            rel = terrain_icon_path[len("/maps/"):]
            local_file = GAME_PUBLIC_MAPS_DIR / rel
            if local_file.exists():
                terrain_icon_url = f"/game-maps/{rel}?t={int(local_file.stat().st_mtime)}"
            else:
                terrain_icon_url = f"/game-maps/{rel}"

        # Build scene entries from locations[] (Phase-3)
        scene_list = []
        for loc in map_data.get("locations", []):
            api_scene = _location_to_api_scene(map_id, loc)
            loc_meta = loc.get("meta", {})

            # Check for selected_icon (pending deploy)
            selected_icon = loc_meta.get("selected_icon", "")
            current_icon = _scene_icon_url(loc)

            # If no deployed icon, try pending selected
            if not current_icon and selected_icon:
                sel_path = Path(selected_icon)
                if sel_path.exists():
                    try:
                        rel = sel_path.relative_to(SAMPLES_DIR)
                        current_icon = f"/images/{rel.as_posix()}"
                    except ValueError:
                        pass

            # Fallback: first sample image
            if not current_icon:
                folder = _scene_samples_folder(loc.get("location_id", ""))
                if folder.exists():
                    files = sorted(folder.glob("*.png"))
                    if files:
                        rel = files[0].relative_to(SAMPLES_DIR)
                        current_icon = f"/images/{rel.as_posix()}"

            scene_list.append({
                **_with_scene_variants(api_scene),
                "current_icon": current_icon,
                "has_pending_icon": bool(loc_meta.get("selected_icon")),
                "has_pending_backdrop": bool(loc_meta.get("selected_backdrop")),
            })

        result["maps"][map_id] = {
            "id": map_id,
            "name": map_data.get("name", map_id),
            "terrain": {
                "prompt": meta.get("terrain_prompt", ""),
                "icon_image": terrain_icon_path,
                "current_icon": terrain_icon_url,
            },
            "scenes": scene_list,
        }

    return result


# ─────────────────────────────────────────────
# S2. GET /api/scenes/{scene_id}
# ─────────────────────────────────────────────
@app.get("/api/scenes/{scene_id}")
def get_scene(scene_id: str) -> Dict[str, Any]:
    """Return a single scene by ID."""
    profiles = _read_location_profiles()
    map_id, loc = _find_scene_and_map(profiles, scene_id)
    if loc is None:
        raise HTTPException(status_code=404, detail=f"Scene not found: {scene_id}")
    api_scene = _location_to_api_scene(map_id or "", loc)
    current_icon = _scene_icon_url(loc)
    loc_meta = loc.get("meta", {})
    return {
        **_with_scene_variants(api_scene),
        "current_icon": current_icon,
        "has_pending_icon": bool(loc_meta.get("selected_icon")),
        "has_pending_backdrop": bool(loc_meta.get("selected_backdrop")),
    }


# ─────────────────────────────────────────────
# S3. PUT /api/scenes/{scene_id} — update scene fields
# ─────────────────────────────────────────────
@app.put("/api/scenes/{scene_id}")
def update_scene(scene_id: str, body: UpdateSceneRequest) -> Dict[str, Any]:
    """Update location description, prompts, name, position, scene_ids, or unlock_conditions."""
    profiles = _read_location_profiles()
    updated = False
    map_id_found = None
    for _map_id, map_data in profiles.get("maps", {}).items():
        for loc in map_data.get("locations", []):
            if loc.get("location_id") == scene_id:
                meta = loc.setdefault("meta", {})
                if body.description is not None:
                    meta["description"] = body.description
                if body.icon_prompt is not None:
                    meta["icon_prompt"] = body.icon_prompt
                if body.name is not None:
                    loc["name"] = body.name
                if body.backdrop_prompt is not None:
                    meta["backdrop_prompt"] = body.backdrop_prompt
                if body.position is not None:
                    loc["position"] = {"x": body.position.x, "y": body.position.y}
                if body.scene_ids is not None:
                    loc["scene_ids"] = body.scene_ids
                if body.unlock_conditions is not None:
                    loc["unlock_conditions"] = body.unlock_conditions
                updated = True
                map_id_found = _map_id
                break
        if updated:
            break

    if not updated:
        raise HTTPException(status_code=404, detail=f"Scene not found: {scene_id}")

    _write_location_profiles(profiles)

    # Sync all runtime fields to game map config (regenerate split runtime files)
    _runtime_fields_changed = (
        body.position is not None
        or body.scene_ids is not None
        or body.name is not None
        or body.unlock_conditions is not None
    )
    if _runtime_fields_changed and map_id_found:
        _deploy_map_to_runtime(map_id_found)  # Non-fatal if fails

    workspace_loc = _find_scene_by_id(profiles, scene_id)
    api_scene = _location_to_api_scene(map_id_found or "", workspace_loc) if workspace_loc else {}
    return {"success": True, "scene": api_scene}


# ─────────────────────────────────────────────
# S3b. POST /api/maps/{map_id}/locations — create new location
# ─────────────────────────────────────────────
@app.post("/api/maps/{map_id}/locations")
def create_location(map_id: str, body: CreateLocationRequest) -> Dict[str, Any]:
    """
    Create a new location in both workspace (scripts/data/maps/) and runtime (map JSON).
    This is the single operation needed to add a new map location — no scripts needed.
    """
    # Validate location_id uniqueness across all maps
    profiles = _read_location_profiles()
    for _mid, map_data in profiles.get("maps", {}).items():
        for loc in map_data.get("locations", []):
            if loc.get("location_id") == body.location_id:
                raise HTTPException(
                    status_code=409,
                    detail=f"Location '{body.location_id}' already exists.",
                )

    # Ensure the map exists in workspace; create if needed (Phase-3 format)
    if map_id not in profiles.setdefault("maps", {}):
        profiles["maps"][map_id] = {
            "map_id": map_id,
            "name": map_id,
            "description": "",
            "background_image": "",
            "meta": {"terrain_prompt": "", "terrain_icon_path": ""},
            "locations": [],
        }

    pos = {"x": body.position.x, "y": body.position.y} if body.position else {"x": 0.5, "y": 0.5}

    # Build workspace entry (Phase-3 format)
    new_location: Dict[str, Any] = {
        "location_id": body.location_id,
        "name": body.name,
        "icon_image": "",
        "backdrop_image": "",
        "position": pos,
        "scene_ids": body.scene_ids,
        "unlock_conditions": body.unlock_conditions,
        "meta": {
            "type": body.type,
            "description": body.description,
            "icon_prompt": body.icon_prompt,
            "backdrop_prompt": body.backdrop_prompt,
            "icon_variants": [],
            "backdrop_variants": [],
        },
    }
    profiles["maps"][map_id]["locations"].append(new_location)
    _write_location_profiles(profiles)

    # Regenerate split runtime files (locations.json + maps.json)
    game_map_updated = _deploy_map_to_runtime(map_id)

    api_scene = _location_to_api_scene(map_id, new_location)
    return {
        "success": True,
        "location_id": body.location_id,
        "game_map_updated": game_map_updated,
        "scene": api_scene,
    }


# ─────────────────────────────────────────────
# S3c. DELETE /api/scenes/{scene_id} — remove a location
# ─────────────────────────────────────────────
@app.delete("/api/scenes/{scene_id}")
def delete_scene(scene_id: str) -> Dict[str, Any]:
    """
    Remove a location from both workspace (scripts/data/maps/) and runtime (map JSON).
    Assets (icons, backdrops) are NOT deleted from disk.
    """
    profiles = _read_location_profiles()
    map_id_found = None
    for _map_id, map_data in profiles.get("maps", {}).items():
        locs = map_data.get("locations", [])
        for i, loc in enumerate(locs):
            if loc.get("location_id") == scene_id:
                locs.pop(i)
                map_id_found = _map_id
                break
        if map_id_found:
            break

    if not map_id_found:
        raise HTTPException(status_code=404, detail=f"Scene not found: {scene_id}")

    _write_location_profiles(profiles)

    # Regenerate split runtime files (locations.json + maps.json)
    game_map_updated = _deploy_map_to_runtime(map_id_found)

    return {"success": True, "scene_id": scene_id, "game_map_updated": game_map_updated}


# ─────────────────────────────────────────────
# S4. GET /api/scene-samples/{scene_id}
# ─────────────────────────────────────────────
@app.get("/api/scene-samples/{scene_id}")
def get_scene_samples(scene_id: str, image_type: Optional[str] = None) -> List[Dict]:
    """Return sample images for a given scene from location_{scene_id}/ folder.
    
    Optional query param image_type: "icon" | "backdrop"
    - "icon": only files matching icon_*.png pattern
    - "backdrop": only files matching backdrop_*.png pattern
    - None/omitted: all files
    """
    profiles = _read_location_profiles()
    scene = _find_scene_by_id(profiles, scene_id)
    if scene is None:
        raise HTTPException(status_code=404, detail=f"Scene not found: {scene_id}")

    folder = _scene_samples_folder(scene_id)

    # Determine which selected/deployed values to compare (Phase-3: from loc.meta)
    loc_meta = scene.get("meta", {})
    if image_type == "backdrop":
        selected_item: Optional[str] = loc_meta.get("selected_backdrop")
        deployed_path_str = scene.get("backdrop_image", "")
    else:
        selected_item = loc_meta.get("selected_icon")
        deployed_path_str = scene.get("icon_image", "")

    # Check if there's a deployed image to compare hash
    deployed_hash: Optional[str] = None
    if deployed_path_str:
        abs_deployed = PROJECT_ROOT / deployed_path_str if not Path(deployed_path_str).is_absolute() else Path(deployed_path_str)
        deployed_hash = _file_hash(abs_deployed)

    results = []
    if folder.exists():
        for img_file in sorted(folder.glob("*.png")):
            fname = img_file.name
            if image_type == "icon":
                if not fname.startswith("icon_"):
                    continue
            elif image_type == "backdrop":
                if not fname.startswith("backdrop_"):
                    continue

            rel = img_file.relative_to(SAMPLES_DIR)
            sample_hash = _file_hash(img_file) if deployed_hash else None
            is_current = deployed_hash is not None and sample_hash == deployed_hash
            is_selected = selected_item is not None and str(img_file) == selected_item
            results.append({
                "filename": fname,
                "url": f"/images/{rel.as_posix()}",
                "path": str(rel),
                "abs_path": str(img_file),
                "is_current_in_game": is_current,
                "is_selected": is_selected,
            })
    return results


# ─────────────────────────────────────────────
# S5. POST /api/scenes/{scene_id}/select-icon
# ─────────────────────────────────────────────
@app.post("/api/scenes/{scene_id}/select-icon")
def select_scene_icon(scene_id: str, body: SelectSceneIconRequest) -> Dict[str, Any]:
    """Mark a sample image as the selected icon for deploy."""
    image_path = Path(body.image_path)
    if not image_path.exists():
        raise HTTPException(status_code=404, detail=f"Image file not found: {body.image_path}")

    profiles = _read_location_profiles()
    updated = False
    for _map_id, map_data in profiles.get("maps", {}).items():
        for loc in map_data.get("locations", []):
            if loc.get("location_id") == scene_id:
                loc.setdefault("meta", {})["selected_icon"] = str(image_path)
                updated = True
                break
        if updated:
            break

    if not updated:
        raise HTTPException(status_code=404, detail=f"Scene not found: {scene_id}")

    _write_location_profiles(profiles)
    return {"success": True, "selected_icon": str(image_path)}


# ─────────────────────────────────────────────
# S5b. POST /api/scenes/{scene_id}/select-backdrop
# ─────────────────────────────────────────────
@app.post("/api/scenes/{scene_id}/select-backdrop")
def select_scene_backdrop(scene_id: str, body: SelectBackdropRequest) -> Dict[str, Any]:
    """Mark a sample image as the selected backdrop for deploy."""
    image_path = Path(body.image_path)
    if not image_path.exists():
        raise HTTPException(status_code=404, detail=f"Image file not found: {body.image_path}")

    profiles = _read_location_profiles()
    updated = False
    for _map_id, map_data in profiles.get("maps", {}).items():
        for loc in map_data.get("locations", []):
            if loc.get("location_id") == scene_id:
                loc.setdefault("meta", {})["selected_backdrop"] = str(image_path)
                updated = True
                break
        if updated:
            break

    if not updated:
        raise HTTPException(status_code=404, detail=f"Scene not found: {scene_id}")

    _write_location_profiles(profiles)
    return {"success": True, "selected_backdrop": str(image_path)}


# ─────────────────────────────────────────────
# S6. POST /api/scene-generate — SSE, generate scene icon or backdrop
# ─────────────────────────────────────────────
@app.post("/api/scene-generate")
async def generate_scene_icon(body: SceneGenerateRequest):
    """Generate scene icon or backdrop using map style prompts. Streams SSE progress."""
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY environment variable is not set.")

    profiles = _read_location_profiles()
    scene = _find_scene_by_id(profiles, body.location_id)
    if scene is None:
        raise HTTPException(status_code=404, detail=f"Scene not found: {body.location_id}")

    image_type = body.image_type if body.image_type in ("icon", "backdrop") else "icon"

    async def event_stream():
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        loop = asyncio.get_running_loop()
        count = max(1, body.count)
        timestamp = int(time.time())
        folder = _scene_samples_folder(body.location_id)
        folder.mkdir(parents=True, exist_ok=True)

        prompt = _build_scene_prompt(body.icon_prompt, image_type)
        generated_images = []

        for i in range(1, count + 1):
            type_label = "backdrop" if image_type == "backdrop" else "icon"
            progress_event = json.dumps({
                "type": "progress",
                "message": f"Generating scene {type_label} {i} of {count} for {body.location_id}…",
                "current": i,
                "total": count,
            })
            yield f"data: {progress_event}\n\n"

            # Use prefix to distinguish icon vs backdrop files
            if image_type == "backdrop":
                filename = f"backdrop_{body.location_id}_{timestamp}_{i}.png"
                gen_fn = _generate_scene_backdrop_direct
            else:
                filename = f"icon_{body.location_id}_{timestamp}_{i}.png"
                gen_fn = _generate_scene_icon_direct

            output_path = folder / filename

            try:
                saved_path = await loop.run_in_executor(
                    None,
                    gen_fn,
                    client,
                    prompt,
                    output_path,
                )
                rel_path = saved_path.relative_to(SAMPLES_DIR)
                generated_images.append({
                    "path": str(rel_path),
                    "url": f"/images/{rel_path.as_posix()}",
                })
            except Exception as exc:
                error_event = json.dumps({
                    "type": "error",
                    "message": f"Failed to generate icon {i}: {exc}",
                    "current": i,
                    "total": count,
                })
                yield f"data: {error_event}\n\n"

        history_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "name": body.location_id,
            "asset_type": "scene",
            "images": generated_images,
        }
        _append_history(history_entry)

        done_event = json.dumps({"type": "done", "images": generated_images})
        yield f"data: {done_event}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# ─────────────────────────────────────────────
# S7. POST /api/scenes/{scene_id}/deploy — deploy selected icon or backdrop
# ─────────────────────────────────────────────
@app.post("/api/scenes/{scene_id}/deploy")
def deploy_scene_icon(scene_id: str, image_type: str = "icon") -> Dict[str, Any]:
    """
    Deploy the selected icon or backdrop for a location (Phase 4 — simplified filter + copy).
    Query param: image_type = "icon" (default) | "backdrop"

    icon flow:
      1. Copy selected_icon to public/maps/{public_subdir}/{scene_id}.png
      2. Update workspace icon_image = game URL (e.g. /maps/beiliang/location_001.png)
      3. Clear meta.selected_icon
      4. Write full workspace map (strip meta, filter) to runtime map JSON

    backdrop flow:
      1. Copy selected_backdrop to public/maps/{maps_dir_id}/{scene_id}_backdrop.png
      2. Update workspace backdrop_image = game URL
      3. Clear meta.selected_backdrop
      4. Write full workspace map (strip meta, filter) to runtime map JSON
    """
    profiles = _read_location_profiles()
    map_id, scene = _find_scene_and_map(profiles, scene_id)
    if scene is None:
        raise HTTPException(status_code=404, detail=f"Scene not found: {scene_id}")

    # Resolve public_subdir dynamically from map data
    map_data = profiles["maps"].get(map_id, {})
    public_subdir = map_data.get("public_subdir", map_id)

    scene_meta = scene.setdefault("meta", {})

    if image_type == "backdrop":
        selected_backdrop = scene_meta.get("selected_backdrop")
        if not selected_backdrop:
            raise HTTPException(status_code=400, detail="No backdrop selected for deploy.")

        selected_path = Path(selected_backdrop)
        if not selected_path.exists():
            raise HTTPException(status_code=404, detail=f"Selected backdrop file not found: {selected_backdrop}")

        # Copy to game public dir
        filename = f"{scene_id}_backdrop.png"
        game_public_dir = GAME_PUBLIC_MAPS_DIR / public_subdir
        game_public_dir.mkdir(parents=True, exist_ok=True)
        dest = game_public_dir / filename
        shutil.copy2(str(selected_path), str(dest))

        backdrop_game_url = f"/maps/{public_subdir}/{filename}"
        scene["backdrop_image"] = backdrop_game_url
        scene_meta.pop("selected_backdrop", None)

        _write_location_profiles(profiles)

        # Write full workspace map to runtime (strip meta, filter)
        game_map_updated = _deploy_map_to_runtime(map_id)

        return {
            "success": True,
            "scene_id": scene_id,
            "image_type": "backdrop",
            "backdrop_game_url": backdrop_game_url,
            "deployed_to": str(dest),
            "game_map_updated": game_map_updated,
        }
    else:
        # Default: icon
        selected_icon = scene_meta.get("selected_icon")
        if not selected_icon:
            raise HTTPException(status_code=400, detail="No icon selected for deploy.")

        selected_path = Path(selected_icon)
        if not selected_path.exists():
            raise HTTPException(status_code=404, detail=f"Selected icon file not found: {selected_icon}")

        # Copy to game public dir
        game_public_dir = GAME_PUBLIC_MAPS_DIR / public_subdir
        game_public_dir.mkdir(parents=True, exist_ok=True)
        public_icon_filename = f"{scene_id}.png"
        dest = game_public_dir / public_icon_filename
        shutil.copy2(str(selected_path), str(dest))

        icon_game_url = f"/maps/{public_subdir}/{public_icon_filename}"
        scene["icon_image"] = icon_game_url
        scene_meta.pop("selected_icon", None)

        _write_location_profiles(profiles)

        # Write full workspace map to runtime (strip meta, filter)
        game_map_updated = _deploy_map_to_runtime(map_id)

        return {
            "success": True,
            "scene_id": scene_id,
            "image_type": "icon",
            "game_icon_url": icon_game_url,
            "deployed_to": str(dest),
            "game_map_updated": game_map_updated,
        }


# ─────────────────────────────────────────────
# S8. POST /api/scene-generate-prompts — AI generate 4 candidate prompts
# ─────────────────────────────────────────────

_SCENE_ICON_PROMPT_SYSTEM = """\
You are an expert AI art director for a Chinese ink wash painting style game set in the world of the Wuxia novel "雪中悍刀行" (A Sword in the Snow).

Your task: generate 4 candidate English image prompts for a game scene icon (map building/location illustration).

## Style Requirements
- All prompts must describe a "Top-down map icon" (bird's-eye view architectural landmark illustration)
- Chinese ink wash painting style, centered subject, clear silhouette, transparent background
- NO human figures, NO characters, NO people, NO text, NO labels
- Each prompt should be 50-100 English words
- Each prompt describes a different visual angle, time of day, weather, or architectural emphasis
- Focus on the scene's key architectural or landscape features

## Output Format
Output strictly as a JSON array of 4 English strings, nothing else.
"""

_SCENE_BACKDROP_PROMPT_SYSTEM = """\
You are an expert AI art director for a Chinese ink wash painting style game set in the world of the Wuxia novel "雪中悍刀行" (A Sword in the Snow).

Your task: generate 4 candidate English image prompts for a game scene backdrop (widescreen panoramic background image, 1536×1024).

## Style Requirements
- All prompts must describe a "Wide panoramic landscape" for use as a cinematic game scene background
- Chinese ink wash painting style, horizontal composition, rich layered depth
- NO human figures, NO characters, NO people, NO text, NO labels, NO UI elements
- Each prompt should be 60-120 English words
- Each prompt describes a different atmosphere, time of day, season, or mood
- Include foreground details and atmospheric background haze for cinematic depth

## Output Format
Output strictly as a JSON array of 4 English strings, nothing else.
"""


def _generate_scene_prompts_blocking(client, scene_description: str, scene_name: str, image_type: str) -> List[str]:
    """Call LLM to generate 4 candidate prompts for a scene. Blocking."""
    system_prompt = _SCENE_BACKDROP_PROMPT_SYSTEM if image_type == "backdrop" else _SCENE_ICON_PROMPT_SYSTEM
    type_label = "backdrop (widescreen background)" if image_type == "backdrop" else "icon (map illustration)"

    user_msg = (
        f"Scene name: {scene_name}\n"
        f"Scene description (Chinese): {scene_description}\n\n"
        f"Generate 4 candidate English prompts for a {type_label} of this scene. "
        f"Each prompt should capture a different visual angle or atmosphere. "
        f"Output as a JSON array of 4 strings."
    )

    response = client.responses.create(
        model=DESCRIPTION_MODEL,
        instructions=system_prompt,
        input=user_msg,
        temperature=0.9,
        max_output_tokens=1200,
    )
    content = response.output_text.strip()
    if content.startswith("```"):
        content = re.sub(r"^```[^\n]*\n?", "", content)
        content = re.sub(r"\n?```$", "", content)
    prompts: List[str] = json.loads(content)
    if not isinstance(prompts, list) or len(prompts) < 4:
        raise ValueError(f"Unexpected LLM response: {content}")
    return prompts[:4]


@app.post("/api/scene-generate-prompts")
async def generate_scene_prompts(body: SceneGeneratePromptsRequest) -> Dict[str, Any]:
    """
    Generate 4 candidate image prompts for a scene icon or backdrop using AI (GPT-5.4).
    Reads the location's Chinese description from workspace map data and generates
    4 diverse English prompts suitable for image generation.
    """
    profiles = _read_location_profiles()
    scene = _find_scene_by_id(profiles, body.location_id)
    if scene is None:
        raise HTTPException(status_code=404, detail=f"Scene not found: {body.location_id}")

    scene_description = scene.get("meta", {}).get("description", "")
    scene_name = scene.get("name", body.location_id)

    if not scene_description.strip():
        raise HTTPException(
            status_code=400,
            detail="Location has no description. Please add a description first."
        )

    image_type = body.image_type if body.image_type in ("icon", "backdrop") else "icon"

    client = _get_openai_client()
    loop = asyncio.get_running_loop()
    try:
        prompts = await loop.run_in_executor(
            None,
            _generate_scene_prompts_blocking,
            client,
            scene_description,
            scene_name,
            image_type,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AI prompt generation failed: {exc}")

    return {"prompts": prompts, "location_id": body.location_id, "image_type": image_type}


# ─────────────────────────────────────────────
# S9. PUT /api/scenes/{scene_id}/icon-variants/{variant_index}
# ─────────────────────────────────────────────
@app.put("/api/scenes/{scene_id}/icon-variants/{variant_index}")
def update_scene_icon_variant(scene_id: str, variant_index: int, body: UpdateSceneVariantRequest) -> Dict[str, Any]:
    """Update the description of a specific icon variant for a scene."""
    profiles = _read_location_profiles()
    scene = _find_scene_by_id(profiles, scene_id)
    if scene is None:
        raise HTTPException(status_code=404, detail=f"Scene not found: {scene_id}")

    variants = scene.get("meta", {}).get("icon_variants")
    if not variants:
        variants = [{"index": 0, "description": scene.get("meta", {}).get("icon_prompt", "")}]
        scene.setdefault("meta", {})["icon_variants"] = variants

    # Find by index or extend the list
    found = False
    for v in variants:
        if v.get("index") == variant_index:
            v["description"] = body.description
            found = True
            break
    if not found:
        variants.append({"index": variant_index, "description": body.description})

    _write_location_profiles(profiles)
    return {"success": True, "scene_id": scene_id, "variant_index": variant_index}


# ─────────────────────────────────────────────
# S10. PUT /api/scenes/{scene_id}/backdrop-variants/{variant_index}
# ─────────────────────────────────────────────
@app.put("/api/scenes/{scene_id}/backdrop-variants/{variant_index}")
def update_scene_backdrop_variant(scene_id: str, variant_index: int, body: UpdateSceneVariantRequest) -> Dict[str, Any]:
    """Update the description of a specific backdrop variant for a scene."""
    profiles = _read_location_profiles()
    scene = _find_scene_by_id(profiles, scene_id)
    if scene is None:
        raise HTTPException(status_code=404, detail=f"Scene not found: {scene_id}")

    variants = scene.get("meta", {}).get("backdrop_variants")
    if not variants:
        variants = [{"index": 0, "description": scene.get("meta", {}).get("backdrop_prompt", "")}]
        scene.setdefault("meta", {})["backdrop_variants"] = variants

    found = False
    for v in variants:
        if v.get("index") == variant_index:
            v["description"] = body.description
            found = True
            break
    if not found:
        variants.append({"index": variant_index, "description": body.description})

    _write_location_profiles(profiles)
    return {"success": True, "scene_id": scene_id, "variant_index": variant_index}


# ─────────────────────────────────────────────
# S11. POST /api/scenes/{scene_id}/regenerate-icon-variants
# ─────────────────────────────────────────────
@app.post("/api/scenes/{scene_id}/regenerate-icon-variants")
async def regenerate_scene_icon_variants(scene_id: str, body: RegenerateSceneVariantsRequest) -> Dict[str, Any]:
    """AI-generate 4 icon variant descriptions for a scene and save them."""
    profiles = _read_location_profiles()
    scene = _find_scene_by_id(profiles, scene_id)
    if scene is None:
        raise HTTPException(status_code=404, detail=f"Scene not found: {scene_id}")

    scene_description = body.bio.strip() or scene.get("meta", {}).get("description", "")
    scene_name = scene.get("name", scene_id)

    if not scene_description:
        raise HTTPException(status_code=400, detail="No description available. Please provide a bio or add a scene description first.")

    client = _get_openai_client()
    loop = asyncio.get_running_loop()
    try:
        prompts = await loop.run_in_executor(
            None,
            _generate_scene_prompts_blocking,
            client,
            scene_description,
            scene_name,
            "icon",
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AI variant generation failed: {exc}")

    new_variants = [{"index": i, "description": desc} for i, desc in enumerate(prompts)]
    scene.setdefault("meta", {})["icon_variants"] = new_variants
    _write_location_profiles(profiles)

    return {"descriptions": prompts, "scene_id": scene_id}


# ─────────────────────────────────────────────
# S12. POST /api/scenes/{scene_id}/regenerate-backdrop-variants
# ─────────────────────────────────────────────
@app.post("/api/scenes/{scene_id}/regenerate-backdrop-variants")
async def regenerate_scene_backdrop_variants(scene_id: str, body: RegenerateSceneVariantsRequest) -> Dict[str, Any]:
    """AI-generate 4 backdrop variant descriptions for a scene and save them."""
    profiles = _read_location_profiles()
    scene = _find_scene_by_id(profiles, scene_id)
    if scene is None:
        raise HTTPException(status_code=404, detail=f"Scene not found: {scene_id}")

    scene_description = body.bio.strip() or scene.get("meta", {}).get("description", "")
    scene_name = scene.get("name", scene_id)

    if not scene_description:
        raise HTTPException(status_code=400, detail="No description available. Please provide a bio or add a scene description first.")

    client = _get_openai_client()
    loop = asyncio.get_running_loop()
    try:
        prompts = await loop.run_in_executor(
            None,
            _generate_scene_prompts_blocking,
            client,
            scene_description,
            scene_name,
            "backdrop",
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AI variant generation failed: {exc}")

    new_variants = [{"index": i, "description": desc} for i, desc in enumerate(prompts)]
    scene.setdefault("meta", {})["backdrop_variants"] = new_variants
    _write_location_profiles(profiles)

    return {"descriptions": prompts, "scene_id": scene_id}


# ═════════════════════════════════════════════════════════════════
# UI ASSET MANAGER API
# ═════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────
# UI Asset constants
# ─────────────────────────────────────────────
UI_ASSETS_WORKSPACE_PATH = PROJECT_ROOT / "scripts" / "data" / "ui" / "ui_assets.json"
UI_BATCH_CONFIG_PATH = PROJECT_ROOT / "scripts" / "ui_batch_config.json"
UI_ASSETS_SRC_DIR = PROJECT_ROOT / "src" / "renderer" / "assets" / "ui" / "generated"
UI_ASSETS_PUBLIC_DIR = PROJECT_ROOT / "public" / "ui-assets"

# Ensure directories exist and mount static files
UI_ASSETS_SRC_DIR.mkdir(parents=True, exist_ok=True)
UI_ASSETS_PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/ui-assets", StaticFiles(directory=str(UI_ASSETS_PUBLIC_DIR)), name="ui_assets")

# ─────────────────────────────────────────────
# UI Asset prompt style templates
# ─────────────────────────────────────────────
# UI_STYLE_BASE: shared base style for all UI assets
UI_STYLE_BASE = (
    "水墨风格，武侠题材，中国传统水墨画质感。"
    "主色调：淡墨灰(#3a3a3a)为主线条色，暖白宣纸(#f5f0e8)为底色，朱砂红(#c14443)为点缀色。"
    "线条规范：细墨线勾勒，线条均匀流畅，装饰从简不繁复，留白为主。"
    "质感统一：轻度宣纸纹理，淡墨渲染，不要浓重泼墨效果，笔触温润色调淡雅。"
    "NO text, NO labels, NO watermarks, NO signatures, NO characters, NO human figures."
)

# Per-category prompt templates
UI_CATEGORY_TEMPLATES: Dict[str, str] = {
    "background": (
        "{style_base} "
        "场景背景图，全幅构图，横向宽屏比例，层次丰富，意境深远，适合作为游戏界面背景。"
        "Subject: {description}. "
        "Wide panoramic composition, layered atmospheric depth, traditional Chinese landscape aesthetics."
    ),
    "frame": (
        "{style_base} "
        "边框/画框装饰素材，边缘有精美墨线装饰，四角精美纹样，中心区域透明，适合叠加在内容上方。"
        "Subject: {description}. "
        "Decorative border frame with ornate corner accents, ink-drawn patterns on edges, "
        "center area transparent, suitable as an overlay border. "
        "Transparent background, PNG with alpha channel."
    ),
    "panel": (
        "{style_base} "
        "完整UI面板素材，四周有精美墨线边缘装饰，中间填充宣纸卷轴质感底色，不要镂空。"
        "适合作为对话框、商店、结算等界面容器。"
        "Subject: {description}. "
        "Complete UI panel with ornate ink-drawn border decorations, "
        "center filled with aged parchment/scroll texture, NOT hollow, NOT empty center. "
        "Exterior area outside panel is transparent. PNG with alpha channel."
    ),
    "button": (
        "{style_base} "
        "可点击按钮素材，强调质感与可交互感，形态完整，边缘清晰，适合游戏UI按钮使用。"
        "Subject: {description}. "
        "UI button element with clear clickable affordance, tactile texture, "
        "subtle ink outline, centered composition. "
        "Pure transparent background, PNG with alpha channel."
    ),
    "card-border": (
        "{style_base} "
        "卡牌边框装饰，古风简约纹样，四角有点缀装饰，适合作为角色/物品卡牌的外框装饰。"
        "Subject: {description}. "
        "Card border decoration with clean traditional patterns in corners, "
        "elegant ink-drawn accents, inner area transparent for card content. "
        "Pure transparent background, PNG with alpha channel."
    ),
    "icon": (
        "{style_base} "
        "UI图标素材，单一主体，造型简洁明确，适合在界面中快速识别。"
        "Subject: {description}. "
        "Single icon element, clean silhouette, centered composition, "
        "minimal yet expressive, suitable for UI icon use. "
        "Pure transparent background, PNG with alpha channel."
    ),
}

# ─────────────────────────────────────────────
# UI Asset helpers
# ─────────────────────────────────────────────
def _read_workspace_ui_assets() -> List[Dict]:
    """Read scripts/data/ui/ui_assets.json (array of workspace UI asset records)."""
    if not UI_ASSETS_WORKSPACE_PATH.exists():
        return []
    try:
        with open(UI_ASSETS_WORKSPACE_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return []


def _write_workspace_ui_assets(records: List[Dict]) -> None:
    """Write scripts/data/ui/ui_assets.json."""
    UI_ASSETS_WORKSPACE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(UI_ASSETS_WORKSPACE_PATH, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)


def _read_ui_batch_config() -> List[Dict]:
    if not UI_BATCH_CONFIG_PATH.exists():
        return []
    try:
        with open(UI_BATCH_CONFIG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return []


def _write_ui_batch_config(data: List[Dict]) -> None:
    with open(UI_BATCH_CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _ui_asset_folder(asset_id: str) -> Path:
    """Return the samples subfolder for a UI asset: ui_{asset_id}/"""
    return SAMPLES_DIR / f"ui_{asset_id}"


def _build_ui_prompt(description: str, category: str) -> str:
    """Build the full generation prompt for a UI asset based on its category."""
    template = UI_CATEGORY_TEMPLATES.get(category, UI_CATEGORY_TEMPLATES["icon"])
    return template.format(
        style_base=UI_STYLE_BASE,
        description=description,
    )


def _generate_ui_asset_image(client, prompt: str, output_path: Path, size: str = "1024x1024") -> Path:
    """Generate a UI asset image with configurable size.

    Supports gpt-image-1 sizes: 1024x1024, 1536x1024, 1024x1536, auto.
    """
    import base64 as _base64
    # Validate size - gpt-image-1 only supports specific sizes
    valid_sizes = {"1024x1024", "1536x1024", "1024x1536", "auto"}
    if size not in valid_sizes:
        size = "auto"
    response = client.images.generate(
        model="gpt-image-1",
        prompt=prompt,
        size=size,
        quality="high",
        background="transparent",
        output_format="png",
        n=1,
    )
    if not response.data or not response.data[0].b64_json:
        raise RuntimeError("Image generation response missing data")
    image_bytes = _base64.b64decode(response.data[0].b64_json)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(image_bytes)
    return output_path


def _next_ui_asset_id() -> str:
    """Return the next available ui_NNN id."""
    records = _read_workspace_ui_assets()
    existing_ids = {r.get("asset_id", "") for r in records}
    for i in range(1, 1000):
        candidate = f"ui_{i:03d}"
        if candidate not in existing_ids:
            return candidate
    raise RuntimeError("No available UI asset IDs")


# ─────────────────────────────────────────────
# UI Asset Pydantic models
# ─────────────────────────────────────────────
class CreateUIAssetRequest(BaseModel):
    name: str
    category: str  # background | frame | button | card-border | icon
    dimensions: str = "1024x1024"
    description: str = ""  # free-text user description used as basis for AI generation


class UpdateUIAssetVariantRequest(BaseModel):
    variant_index: int
    description: str


class RegenerateUIAssetVariantsRequest(BaseModel):
    description: str = ""


class UIAssetProfileModel(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    dimensions: Optional[str] = None
    description: Optional[str] = None


class SelectUIAssetImageRequest(BaseModel):
    image_path: str


# ─────────────────────────────────────────────
# UI Asset AI prompts
# ─────────────────────────────────────────────
_UI_ASSET_VARIANT_SYSTEM_PROMPT = """\
你是一位精通水墨风格UI设计的提示词专家，擅长为武侠题材游戏界面素材生成英文图像生成提示词。

## 任务
为给定UI素材生成 4 条不同视觉方向的英文 description（即图像生成提示词的主体描述部分）。
这些描述将被拼装到完整的 prompt 中，用于 gpt-image-1 生成图像。

## 核心规范
- 每条 description 描述同一素材的不同视觉重点/设计方向
- 4 条各自强调不同侧重（如：简洁版、繁复华丽版、冷色系版、暖色系版）
- 每条约 20-50 个英文单词，精炼词组为主，勿写完整句子
- 使用古风、水墨风格的英文描述词汇
- 描述的是视觉内容，强调形态、质感、色彩，不含游戏规则信息

## 输出格式
严格输出 JSON 数组，包含 4 个英文字符串，不含任何其他内容。
"""


def _generate_ui_asset_variants_blocking(client, name: str, category: str, description: str) -> List[str]:
    """Call LLM to generate 4 UI asset variant descriptions (English). Blocking."""
    category_cn = {
        "background": "背景图",
        "frame": "边框装饰",
        "panel": "完整面板",
        "button": "按钮",
        "card-border": "卡牌边框",
        "icon": "UI图标",
    }.get(category, category)

    desc_section = f"用户描述：{description}\n" if description.strip() else ""

    user_msg = (
        f"素材名称：{name}\n"
        f"素材类型：{category_cn}（{category}）\n"
        f"{desc_section}"
        f"请为该UI素材生成 4 条不同视觉方向的英文 description，以 JSON 数组格式输出。"
    )
    response = client.responses.create(
        model=DESCRIPTION_MODEL,
        instructions=_UI_ASSET_VARIANT_SYSTEM_PROMPT,
        input=user_msg,
        temperature=0.9,
        max_output_tokens=800,
    )
    content = response.output_text.strip()
    if content.startswith("```"):
        content = re.sub(r"^```[^\n]*\n?", "", content)
        content = re.sub(r"\n?```$", "", content)
    descriptions: List[str] = json.loads(content)
    if not isinstance(descriptions, list) or len(descriptions) < 4:
        raise ValueError(f"Unexpected LLM response: {content}")
    return descriptions[:4]


# ─────────────────────────────────────────────
# UI1. GET /api/ui-assets
# ─────────────────────────────────────────────
@app.get("/api/ui-assets")
def get_ui_assets() -> List[Dict]:
    """List all UI assets from workspace, grouped with their variants."""
    records = _read_workspace_ui_assets()
    batch = _read_ui_batch_config()

    # Group batch config entries by asset_id
    batch_by_id: Dict[str, List[Dict]] = {}
    for entry in batch:
        aid = entry.get("asset_id", "")
        batch_by_id.setdefault(aid, []).append(entry)

    result = []
    for record in records:
        asset_id = record.get("asset_id", "")
        meta = record.get("meta", {})
        entries = batch_by_id.get(asset_id, [])

        variants = [
            {"index": i, "description": e.get("description", ""), "output": e.get("output", "")}
            for i, e in enumerate(entries)
        ]

        # Build current_image URL
        current_image = ""
        selected_asset = meta.get("selected_asset", "")
        if selected_asset:
            sel_path = Path(selected_asset)
            try:
                rel = sel_path.relative_to(SAMPLES_DIR)
                current_image = f"/images/{rel.as_posix()}"
            except ValueError:
                pass

        # Fallback: use first sample
        if not current_image:
            folder = _ui_asset_folder(asset_id)
            if folder.exists():
                files = sorted(folder.glob("*.png"))
                if files:
                    rel = files[0].relative_to(SAMPLES_DIR)
                    current_image = f"/images/{rel.as_posix()}"

        # Check deployed image
        deploy_filename = record.get("image", "")
        if deploy_filename:
            img_name = deploy_filename.rsplit("/", 1)[-1]
            img_path = UI_ASSETS_PUBLIC_DIR / img_name
            if img_path.exists():
                mtime = int(img_path.stat().st_mtime)
                current_image = f"/ui-assets/{img_name}?t={mtime}"

        result.append({
            "asset_id": asset_id,
            "id": asset_id,
            "name": record.get("name", ""),
            "category": record.get("category", "icon"),
            "dimensions": record.get("dimensions", "1024x1024"),
            "description": record.get("description", ""),
            "current_image": current_image,
            "has_pending_image": bool(meta.get("selected_asset")),
            "publish_status": meta.get("publish_status", "draft"),
            "variants": variants,
        })

    return result


# ─────────────────────────────────────────────
# UI2. POST /api/ui-assets  (create)
# ─────────────────────────────────────────────
@app.post("/api/ui-assets")
async def create_ui_asset(body: CreateUIAssetRequest) -> Dict[str, Any]:
    """Create a new UI asset: generate 4 variant descriptions via AI, save to workspace."""
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="UI asset name must not be empty.")

    valid_categories = {"background", "frame", "panel", "button", "card-border", "icon"}
    if body.category not in valid_categories:
        raise HTTPException(status_code=400, detail=f"Invalid category: {body.category}. Must be one of {valid_categories}.")

    asset_id = _next_ui_asset_id()
    folder_name = f"ui_{asset_id}"

    # Generate variant descriptions via AI
    client = _get_openai_client()
    loop = asyncio.get_running_loop()
    try:
        descriptions = await loop.run_in_executor(
            None, _generate_ui_asset_variants_blocking, client, body.name, body.category, body.description
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {exc}")

    # Build batch config entries
    new_entries = []
    for i, desc in enumerate(descriptions, start=1):
        new_entries.append({
            "type": "ui",
            "asset_id": asset_id,
            "name": body.name,
            "category": body.category,
            "description": desc,
            "output": f"{folder_name}/{asset_id}_{i:02d}.png",
        })

    # Create samples folder
    (SAMPLES_DIR / folder_name).mkdir(parents=True, exist_ok=True)

    # Append to batch config
    existing_batch = _read_ui_batch_config()
    _write_ui_batch_config(existing_batch + new_entries)

    # Create workspace record
    new_record = {
        "asset_id": asset_id,
        "name": body.name,
        "category": body.category,
        "dimensions": body.dimensions,
        "description": body.description,
        "image": "",
        "meta": {
            "publish_status": "draft",
            "selected_asset": "",
            "asset_candidates": [],
            "workshop_variants": [],
            "created_at": datetime.utcnow().isoformat() + "Z",
            "updated_at": datetime.utcnow().isoformat() + "Z",
        },
    }
    records = _read_workspace_ui_assets()
    records.append(new_record)
    _write_workspace_ui_assets(records)

    variants = [
        {"index": i, "description": e["description"], "output": e["output"]}
        for i, e in enumerate(new_entries)
    ]
    asset = {
        "asset_id": asset_id,
        "id": asset_id,
        "name": body.name,
        "category": body.category,
        "dimensions": body.dimensions,
        "description": body.description,
        "current_image": "",
        "has_pending_image": False,
        "publish_status": "draft",
        "variants": variants,
    }
    return {"success": True, "asset": asset}


# ─────────────────────────────────────────────
# UI3. GET /api/ui-assets/{asset_id}/profile
# ─────────────────────────────────────────────
@app.get("/api/ui-assets/{asset_id}/profile")
def get_ui_asset_profile(asset_id: str) -> Dict[str, Any]:
    """Return the UI asset profile from workspace."""
    records = _read_workspace_ui_assets()
    record = next((r for r in records if r.get("asset_id") == asset_id), None)
    if record is None:
        raise HTTPException(status_code=404, detail=f"UI asset not found: {asset_id}")
    return {
        "name": record.get("name", ""),
        "category": record.get("category", "icon"),
        "dimensions": record.get("dimensions", "1024x1024"),
        "description": record.get("description", ""),
    }


# ─────────────────────────────────────────────
# UI4. PUT /api/ui-assets/{asset_id}/profile
# ─────────────────────────────────────────────
@app.put("/api/ui-assets/{asset_id}/profile")
def update_ui_asset_profile(asset_id: str, body: UIAssetProfileModel) -> Dict[str, Any]:
    """Update a UI asset's profile fields in workspace."""
    records = _read_workspace_ui_assets()
    target_idx = next((i for i, r in enumerate(records) if r.get("asset_id") == asset_id), None)
    if target_idx is None:
        raise HTTPException(status_code=404, detail=f"UI asset not found: {asset_id}")

    record = records[target_idx]
    update_data = body.model_dump(exclude_none=True)
    for key, val in update_data.items():
        record[key] = val
    record.setdefault("meta", {})["updated_at"] = datetime.utcnow().isoformat() + "Z"
    records[target_idx] = record
    _write_workspace_ui_assets(records)
    return {"success": True, "profile": {k: record.get(k) for k in ("name", "category", "dimensions", "description")}}


# ─────────────────────────────────────────────
# UI5. GET /api/ui-assets/{asset_id}/variants
# ─────────────────────────────────────────────
@app.get("/api/ui-assets/{asset_id}/variants")
def get_ui_asset_variants(asset_id: str) -> List[Dict]:
    """Get all variant descriptions for a UI asset."""
    batch = _read_ui_batch_config()
    entries = [e for e in batch if e.get("asset_id") == asset_id]
    if not entries:
        raise HTTPException(status_code=404, detail=f"UI asset not found: {asset_id}")
    return [
        {"index": i, "description": e.get("description", ""), "output": e.get("output", "")}
        for i, e in enumerate(entries)
    ]


# ─────────────────────────────────────────────
# UI6. PUT /api/ui-assets/{asset_id}/variants/{index}
# ─────────────────────────────────────────────
@app.put("/api/ui-assets/{asset_id}/variants/{index}")
def update_ui_asset_variant(asset_id: str, index: int, body: UpdateUIAssetVariantRequest) -> Dict[str, Any]:
    """Update a single variant description for a UI asset."""
    batch = _read_ui_batch_config()
    asset_indices = [i for i, e in enumerate(batch) if e.get("asset_id") == asset_id]
    if not asset_indices:
        raise HTTPException(status_code=404, detail=f"UI asset not found: {asset_id}")
    if body.variant_index < 0 or body.variant_index >= len(asset_indices):
        raise HTTPException(status_code=400, detail=f"variant_index {body.variant_index} out of range.")
    global_idx = asset_indices[body.variant_index]
    batch[global_idx]["description"] = body.description
    _write_ui_batch_config(batch)
    return {"success": True}


# ─────────────────────────────────────────────
# UI7. POST /api/ui-assets/{asset_id}/regenerate-variants
# ─────────────────────────────────────────────
@app.post("/api/ui-assets/{asset_id}/regenerate-variants")
async def regenerate_ui_asset_variants(asset_id: str, body: RegenerateUIAssetVariantsRequest) -> Dict[str, Any]:
    """Regenerate all 4 variant descriptions for a UI asset via AI."""
    records = _read_workspace_ui_assets()
    record = next((r for r in records if r.get("asset_id") == asset_id), None)
    if record is None:
        raise HTTPException(status_code=404, detail=f"UI asset not found: {asset_id}")

    name = record.get("name", "")
    category = record.get("category", "icon")
    description = body.description.strip() or record.get("description", "")

    client = _get_openai_client()
    loop = asyncio.get_running_loop()
    try:
        descriptions = await loop.run_in_executor(
            None, _generate_ui_asset_variants_blocking, client, name, category, description
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {exc}")

    batch = _read_ui_batch_config()
    asset_indices = [i for i, e in enumerate(batch) if e.get("asset_id") == asset_id]
    for variant_idx, global_idx in enumerate(asset_indices[:4]):
        if variant_idx < len(descriptions):
            batch[global_idx]["description"] = descriptions[variant_idx]
    _write_ui_batch_config(batch)
    return {"success": True, "descriptions": descriptions}


# ─────────────────────────────────────────────
# UI8. GET /api/ui-asset-samples/{asset_id}
# ─────────────────────────────────────────────
@app.get("/api/ui-asset-samples/{asset_id}")
def get_ui_asset_samples(asset_id: str) -> List[Dict]:
    """Return all sample images for a UI asset."""
    folder = _ui_asset_folder(asset_id)

    records = _read_workspace_ui_assets()
    record = next((r for r in records if r.get("asset_id") == asset_id), None)
    selected_asset: Optional[str] = record.get("meta", {}).get("selected_asset") if record else None

    results = []
    if folder.exists():
        for img_file in sorted(folder.glob("*.png")):
            rel = img_file.relative_to(SAMPLES_DIR)
            is_selected = selected_asset is not None and str(img_file) == selected_asset
            is_current = False  # no "game version" concept for UI assets (deploy = is_current)
            results.append({
                "filename": img_file.name,
                "url": f"/images/{rel.as_posix()}",
                "path": str(rel),
                "abs_path": str(img_file),
                "is_current_in_game": is_current,
                "is_selected": is_selected,
            })
    return results


# ─────────────────────────────────────────────
# UI9. POST /api/ui-assets/{asset_id}/select-image
# ─────────────────────────────────────────────
@app.post("/api/ui-assets/{asset_id}/select-image")
def select_ui_asset_image(asset_id: str, body: SelectUIAssetImageRequest) -> Dict[str, Any]:
    """Mark a sample image as selected for next deploy."""
    image_path = Path(body.image_path)
    if not image_path.exists():
        raise HTTPException(status_code=404, detail=f"Image file not found: {body.image_path}")

    records = _read_workspace_ui_assets()
    target_idx = next((i for i, r in enumerate(records) if r.get("asset_id") == asset_id), None)
    if target_idx is None:
        raise HTTPException(status_code=404, detail=f"UI asset not found: {asset_id}")

    records[target_idx].setdefault("meta", {})["selected_asset"] = str(image_path)
    records[target_idx]["meta"]["updated_at"] = datetime.utcnow().isoformat() + "Z"
    _write_workspace_ui_assets(records)
    return {"success": True, "selected_image": str(image_path)}


# ─────────────────────────────────────────────
# UI10. POST /api/ui-assets/{asset_id}/deploy
# ─────────────────────────────────────────────
@app.post("/api/ui-assets/{asset_id}/deploy")
def deploy_ui_asset(asset_id: str) -> Dict[str, Any]:
    """
    Deploy a UI asset to game directories:
    1. Copy selected image to src/renderer/assets/ui/generated/ and public/ui-assets/
    2. Mark publish_status = published
    3. Save workspace
    """
    records = _read_workspace_ui_assets()
    target_idx = next((i for i, r in enumerate(records) if r.get("asset_id") == asset_id), None)
    if target_idx is None:
        raise HTTPException(status_code=404, detail=f"UI asset not found: {asset_id}")

    record = records[target_idx]
    meta = record.setdefault("meta", {})

    image_copied = False
    image_source_filename = None

    selected_image_path = meta.get("selected_asset", "")
    if selected_image_path:
        selected_file = Path(selected_image_path)
        if selected_file.exists():
            img_filename = selected_file.name
            dest_src = UI_ASSETS_SRC_DIR / img_filename
            dest_public = UI_ASSETS_PUBLIC_DIR / img_filename
            UI_ASSETS_SRC_DIR.mkdir(parents=True, exist_ok=True)
            UI_ASSETS_PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
            shutil.copy2(str(selected_file), str(dest_src))
            shutil.copy2(str(selected_file), str(dest_public))
            record["image"] = f"/assets/ui/generated/{img_filename}"
            image_copied = True
            image_source_filename = img_filename
        meta.pop("selected_asset", None)

    meta["publish_status"] = "published"
    meta["updated_at"] = datetime.utcnow().isoformat() + "Z"
    records[target_idx] = record
    _write_workspace_ui_assets(records)

    return {
        "success": True,
        "asset_id": asset_id,
        "image_copied": image_copied,
        "image_source_filename": image_source_filename,
    }


# ─────────────────────────────────────────────
# UI11. POST /api/ui-generate  (SSE)
# ─────────────────────────────────────────────
@app.post("/api/ui-generate")
async def generate_ui_asset_images(body: GenerateRequest):
    """
    Generate UI asset images using the category-specific prompt template.
    Saves to ui_{asset_id} folder. Streams SSE progress.
    body.name = asset_id (used as folder key)
    body.asset_type = "ui" (validated here)
    body.description = the variant description
    """
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY environment variable is not set.")

    # Look up category from workspace
    records = _read_workspace_ui_assets()
    record = next((r for r in records if r.get("asset_id") == body.name), None)
    if record is None:
        raise HTTPException(status_code=404, detail=f"UI asset not found: {body.name}")

    category = record.get("category", "icon")
    dimensions = record.get("dimensions", "1024x1024")

    async def event_stream():
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        loop = asyncio.get_running_loop()
        count = max(1, body.count)
        timestamp = int(time.time())
        folder = _ui_asset_folder(body.name)
        folder.mkdir(parents=True, exist_ok=True)

        prompt = _build_ui_prompt(body.description, category)
        generated_images = []

        for i in range(1, count + 1):
            progress_event = json.dumps({
                "type": "progress",
                "message": f"Generating UI asset image {i} of {count}…",
                "current": i,
                "total": count,
            })
            yield f"data: {progress_event}\n\n"

            filename = f"{body.name}_{timestamp}_{i}.png"
            output_path = folder / filename

            try:
                saved_path = await loop.run_in_executor(
                    None,
                    _generate_ui_asset_image,
                    client,
                    prompt,
                    output_path,
                    dimensions,
                )
                rel_path = saved_path.relative_to(SAMPLES_DIR)
                generated_images.append({
                    "path": str(rel_path),
                    "url": f"/images/{rel_path.as_posix()}",
                })
            except Exception as exc:
                error_event = json.dumps({
                    "type": "error",
                    "message": f"Failed to generate image {i}: {exc}",
                    "current": i,
                    "total": count,
                })
                yield f"data: {error_event}\n\n"

        history_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "name": body.name,
            "asset_type": "ui",
            "images": generated_images,
        }
        _append_history(history_entry)

        done_event = json.dumps({"type": "done", "images": generated_images})
        yield f"data: {done_event}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")




# ─────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn

    _sync_special_workspace()
    uvicorn.run("main:app", host="0.0.0.0", port=8100, reload=True)
