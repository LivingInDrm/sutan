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
CHARACTER_PROFILES_PATH = PROJECT_ROOT / "scripts" / "character_profiles.json"
BASE_CARDS_PATH = PROJECT_ROOT / "src" / "renderer" / "data" / "configs" / "cards" / "base_cards.json"
BACKEND_DIR = Path(__file__).resolve().parent
TEMPLATES_CONFIG_PATH = BACKEND_DIR / "templates.json"
HISTORY_PATH = BACKEND_DIR / "history.json"

# Mapping from character name → game portrait filename stem (e.g. "figure01")
# Only needed for the replace-to-game feature; new characters won't have a game file until manually assigned.
def _build_name_to_game_file() -> Dict[str, str]:
    """Dynamically build name→figureNN mapping from base_cards.json."""
    mapping: Dict[str, str] = {}
    try:
        cards = _read_base_cards()
        for c in cards:
            if c.get("type") == "character" and c.get("image"):
                # image is like "/assets/portraits/figure03.png"
                stem = c["image"].rsplit("/", 1)[-1].replace(".png", "")
                mapping[c["name"]] = stem
    except Exception:
        pass
    # Fallback for original 7 if base_cards.json is missing
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
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="OPENAI_API_KEY environment variable is not set.",
        )
    from openai import OpenAI
    return OpenAI(api_key=api_key)


def _read_character_profiles() -> Dict[str, Any]:
    if not CHARACTER_PROFILES_PATH.exists():
        return {}
    try:
        with open(CHARACTER_PROFILES_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return {}


def _write_character_profiles(data: Dict[str, Any]) -> None:
    with open(CHARACTER_PROFILES_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _file_hash(path: Path) -> Optional[str]:
    """Compute MD5 hash of file content; returns None if file does not exist."""
    if not path.exists():
        return None
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def _read_base_cards() -> List[Dict]:
    if not BASE_CARDS_PATH.exists():
        return []
    try:
        with open(BASE_CARDS_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return []


def _write_base_cards(data: List[Dict]) -> None:
    with open(BASE_CARDS_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


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
    return _load_templates()


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
    Saves selected_portrait (absolute path) to character_profiles.json.
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
    response = client.chat.completions.create(
        model=DESCRIPTION_MODEL,
        messages=[
            {"role": "system", "content": _DESCRIPTION_SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
        temperature=0.9,
        max_completion_tokens=1000,
    )
    content = response.choices[0].message.content.strip()
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
    Model defaults to gpt-4.1; override via DESCRIPTION_MODEL env var.
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
        reference_cards = _read_base_cards()
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
    """Return the character profile (attributes + bio) from character_profiles.json."""
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
    """Partially update a character's profile in character_profiles.json."""
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

    response = client.chat.completions.create(
        model=DESCRIPTION_MODEL,
        messages=[
            {"role": "system", "content": _PROFILE_SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
        temperature=0.7,
        max_completion_tokens=800,
    )
    content = response.choices[0].message.content.strip()
    if content.startswith("```"):
        content = re.sub(r"^```[^\n]*\n?", "", content)
        content = re.sub(r"\n?```$", "", content)
    profile: Dict[str, Any] = json.loads(content)
    return profile


@app.post("/api/characters/{character_name}/generate-profile")
async def generate_character_profile(character_name: str) -> Dict[str, Any]:
    """AI-generate a default profile for a character and save to character_profiles.json."""
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
    Deploy a character to the game:
    1. Read profile from character_profiles.json
    2. Determine portrait file (NAME_TO_GAME_FILE or auto-assign)
    3. If selected_portrait is set, copy it to game directories; otherwise keep existing
    4. Upsert entry in base_cards.json
    5. Clear selected_portrait from profile
    """
    profiles = _read_character_profiles()
    profile = profiles.get(character_name)
    if not profile:
        raise HTTPException(
            status_code=404,
            detail=f"No profile found for '{character_name}'. Generate a profile first.",
        )

    # Determine or auto-assign game file
    game_file = _get_game_file(character_name)
    portrait_copied = False
    portrait_source = None
    portrait_source_filename = None

    if not game_file:
        # Auto-assign next available figure ID and persist to in-memory map
        game_file = _next_figure_id()
        _build_name_to_game_file()  # auto-refreshes from base_cards.json

    portrait_dest_src = PORTRAITS_SRC_DIR / f"{game_file}.png"
    portrait_dest_public = PORTRAITS_PUBLIC_DIR / f"{game_file}.png"

    # Use selected_portrait if specified; otherwise keep existing game portrait
    selected_portrait_path = profile.get("selected_portrait")
    if selected_portrait_path:
        selected_portrait_file = Path(selected_portrait_path)
        if selected_portrait_file.exists():
            PORTRAITS_SRC_DIR.mkdir(parents=True, exist_ok=True)
            PORTRAITS_PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
            shutil.copy2(str(selected_portrait_file), str(portrait_dest_src))
            shutil.copy2(str(selected_portrait_file), str(portrait_dest_public))
            portrait_source = selected_portrait_file
            portrait_source_filename = selected_portrait_file.name
            portrait_copied = True
        # Clear selected_portrait after deploy (regardless of whether file existed)
        profiles[character_name].pop("selected_portrait", None)
        _write_character_profiles(profiles)
    # else: no selected portrait — keep existing game portrait unchanged

    # Build card entry
    card_image = f"/assets/portraits/{game_file}.png"
    card_entry = {
        "card_id": f"card_{character_name}",
        "name": character_name,
        "type": "character",
        "rarity": profile.get("rarity", "copper"),
        "description": profile.get("description", ""),
        "image": card_image,
        "attributes": profile.get("attributes", {}),
        "special_attributes": profile.get("special_attributes", {}),
        "tags": profile.get("tags", []),
        "equipment_slots": profile.get("equipment_slots", 1),
    }

    # Upsert in base_cards.json
    cards = _read_base_cards()
    existing_idx = next((i for i, c in enumerate(cards) if c.get("name") == character_name), None)
    if existing_idx is not None:
        # Preserve existing card_id
        card_entry["card_id"] = cards[existing_idx].get("card_id", card_entry["card_id"])
        cards[existing_idx] = card_entry
        action = "updated"
    else:
        cards.append(card_entry)
        action = "added"

    _write_base_cards(cards)

    return {
        "success": True,
        "action": action,
        "game_file": game_file,
        "portrait_copied": portrait_copied,
        "portrait_source": str(portrait_source) if portrait_source else None,
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
ITEM_PROFILES_PATH = PROJECT_ROOT / "scripts" / "item_profiles.json"
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


def _read_item_profiles() -> Dict[str, Any]:
    if not ITEM_PROFILES_PATH.exists():
        return {}
    try:
        with open(ITEM_PROFILES_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return {}


def _write_item_profiles(data: Dict[str, Any]) -> None:
    with open(ITEM_PROFILES_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


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
    card_type: Optional[str] = None
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
    response = client.chat.completions.create(
        model=DESCRIPTION_MODEL,
        messages=[
            {"role": "system", "content": _ITEM_VARIANT_SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
        temperature=0.9,
        max_completion_tokens=800,
    )
    content = response.choices[0].message.content.strip()
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
  "card_type": "equipment",
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
    response = client.chat.completions.create(
        model=DESCRIPTION_MODEL,
        messages=[
            {"role": "system", "content": _ITEM_PROFILE_SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
        temperature=0.7,
        max_completion_tokens=600,
    )
    content = response.choices[0].message.content.strip()
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
        has_pending_image = bool(profile.get("selected_image"))

        folder = _item_folder(name)
        current_image = ""
        # Try to find deployed image from base_cards
        cards = _read_base_cards()
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
        reference_cards = _read_base_cards()
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
            "card_type": "equipment",
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
    """Return the item profile from item_profiles.json."""
    profiles = _read_item_profiles()
    profile = profiles.get(item_name)
    if profile is None:
        return {
            "card_type": "equipment",
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
    reference_cards = _read_base_cards()
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
    cards = _read_base_cards()
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

    cards = _read_base_cards()
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
    Deploy an item to the game:
    1. Read profile from item_profiles.json
    2. If selected_image is set, copy it to game item directories
    3. Upsert entry in base_cards.json
    4. Clear selected_image from profile
    """
    profiles = _read_item_profiles()
    profile = profiles.get(item_name)
    if not profile:
        raise HTTPException(
            status_code=404,
            detail=f"No profile found for '{item_name}'. Generate a profile first.",
        )

    image_copied = False
    image_source_filename = None
    img_filename = ""

    selected_image_path = profile.get("selected_image")
    if selected_image_path:
        selected_image_file = Path(selected_image_path)
        if selected_image_file.exists():
            # Use original filename
            img_filename = selected_image_file.name
            dest_src = ITEMS_SRC_DIR / img_filename
            dest_public = ITEMS_PUBLIC_DIR / img_filename
            ITEMS_SRC_DIR.mkdir(parents=True, exist_ok=True)
            ITEMS_PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
            shutil.copy2(str(selected_image_file), str(dest_src))
            shutil.copy2(str(selected_image_file), str(dest_public))
            image_copied = True
            image_source_filename = img_filename
        # Clear selected_image after deploy
        profiles[item_name].pop("selected_image", None)
        _write_item_profiles(profiles)
    else:
        # Use existing game image if already deployed
        cards = _read_base_cards()
        existing = next((c for c in cards if c.get("name") == item_name and c.get("type") == "equipment"), None)
        if existing and existing.get("image"):
            img_filename = existing["image"].rsplit("/", 1)[-1]

    # Build card entry
    card_id = _item_to_card_id(item_name)
    cards = _read_base_cards()
    existing = next((c for c in cards if c.get("name") == item_name and c.get("type") == "equipment"), None)
    if existing:
        card_id = existing.get("card_id", card_id)

    card_entry = {
        "card_id": card_id,
        "name": item_name,
        "type": "equipment",
        "rarity": profile.get("rarity", "copper"),
        "description": profile.get("description", ""),
        "image": f"/assets/items/{img_filename}" if img_filename else "",
        "equipment_type": profile.get("equipment_type", "weapon"),
        "attribute_bonus": profile.get("attribute_bonus", {}),
        "special_bonus": profile.get("special_bonus", {}),
        "gem_slots": profile.get("gem_slots", 0),
        "tags": profile.get("tags", []),
    }

    # Upsert in base_cards.json
    existing_idx = next((i for i, c in enumerate(cards) if c.get("name") == item_name and c.get("type") == "equipment"), None)
    if existing_idx is not None:
        cards[existing_idx] = card_entry
        action = "updated"
    else:
        cards.append(card_entry)
        action = "added"

    _write_base_cards(cards)

    return {
        "success": True,
        "action": action,
        "image_copied": image_copied,
        "image_source_filename": image_source_filename,
        "card_entry": card_entry,
    }


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


# ─────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
