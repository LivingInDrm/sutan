#!/usr/bin/env python3

import hashlib
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
SCRIPTS_DIR = PROJECT_ROOT / "scripts"
BACKEND_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS_DIR))
sys.path.insert(0, str(BACKEND_DIR))
sys.modules["shared"] = sys.modules[__name__]

import generate_assets as ga

from dotenv import load_dotenv
from fastapi import HTTPException

load_dotenv()

SAMPLES_DIR = PROJECT_ROOT / "scripts" / "samples"
PORTRAITS_SRC_DIR = PROJECT_ROOT / "src" / "renderer" / "assets" / "portraits"
PORTRAITS_PUBLIC_DIR = PROJECT_ROOT / "public" / "portraits"
BATCH_CONFIG_PATH = PROJECT_ROOT / "scripts" / "batch_config.json"
CHARACTER_PROFILES_PATH = PROJECT_ROOT / "scripts" / "data" / "cards" / "characters.json"
CARDS_DIR = PROJECT_ROOT / "src" / "renderer" / "data" / "configs" / "cards"
CHARACTERS_CARDS_PATH = CARDS_DIR / "characters.json"
EQUIPMENT_CARDS_PATH = CARDS_DIR / "equipment.json"
SPECIAL_CARDS_PATH = CARDS_DIR / "special.json"
WORKSPACE_SPECIAL_PATH = PROJECT_ROOT / "scripts" / "data" / "cards" / "special.json"
TEMPLATES_CONFIG_PATH = BACKEND_DIR / "templates.json"
HISTORY_PATH = BACKEND_DIR / "history.json"
ITEM_BATCH_CONFIG_PATH = PROJECT_ROOT / "scripts" / "item_batch_config.json"
ITEM_PROFILES_PATH = PROJECT_ROOT / "scripts" / "data" / "cards" / "equipment.json"
ITEMS_SRC_DIR = PROJECT_ROOT / "src" / "renderer" / "assets" / "items"
ITEMS_PUBLIC_DIR = PROJECT_ROOT / "public" / "items"
ITEM_PROMPT_CONFIG_PATH = PROJECT_ROOT / "item_prompt_config.json"
MAPS_WORKSPACE_DIR = PROJECT_ROOT / "scripts" / "data" / "maps"
MAPS_DIR = BACKEND_DIR / "maps"
LOCATIONS_WORKSPACE_PATH = MAPS_WORKSPACE_DIR / "locations.json"
MAPS_WORKSPACE_DATA_PATH = MAPS_WORKSPACE_DIR / "maps.json"
GAME_MAPS_CONFIG_DIR = PROJECT_ROOT / "src" / "renderer" / "data" / "configs" / "maps"
RUNTIME_LOCATIONS_PATH = GAME_MAPS_CONFIG_DIR / "locations.json"
RUNTIME_MAPS_PATH = GAME_MAPS_CONFIG_DIR / "maps.json"
GAME_PUBLIC_MAPS_DIR = PROJECT_ROOT / "src" / "renderer" / "public" / "maps"
UI_ASSETS_WORKSPACE_PATH = PROJECT_ROOT / "scripts" / "data" / "ui" / "ui_assets.json"
UI_BATCH_CONFIG_PATH = PROJECT_ROOT / "scripts" / "ui_batch_config.json"
UI_ASSETS_SRC_DIR = PROJECT_ROOT / "src" / "renderer" / "assets" / "ui" / "generated"
UI_ASSETS_PUBLIC_DIR = PROJECT_ROOT / "public" / "ui-assets"
SCENE_ICON_STYLE = (
    "Traditional East Asian ink wash painting (水墨画) style. "
    "East Asian ink wash painting style with vibrant natural color accents, rich and varied color palette, "
    "expressive brushwork, classical Chinese painting aesthetics. "
    "NO human figures, NO portraits, NO characters, NO people, NO faces, NO text, NO labels, NO UI elements. "
    "Single architectural landmark illustration, icon composition, "
    "clear silhouette suitable for overlaying on a map, "
    "centered subject, transparent-compatible edges.\n\n"
    "Subject: {prompt} "
    "Architectural landmark viewed at a slight elevation angle, "
    "well-defined silhouette, fine ink line detail on rooftops and structural elements, "
    "rich color washes to highlight material and atmosphere. "
    "Square icon composition with generous negative space around the subject. "
    "Transparent background, PNG with alpha channel."
)
SCENE_BACKDROP_STYLE = (
    "Traditional East Asian ink wash painting (水墨画) style. "
    "East Asian ink wash painting style with vibrant natural color accents, rich and varied color palette, "
    "expressive brushwork, classical Chinese painting aesthetics. "
    "NO human figures, NO portraits, NO characters, NO people, NO faces, NO text, NO labels, NO UI elements.\n\n"
    "Subject: {prompt} "
    "Wide environmental backdrop, cinematic landscape composition, layered depth, "
    "detailed architecture and terrain, atmospheric perspective, rich ink wash color rendering. "
    "Horizontal composition, production-ready game backdrop."
)
UI_STYLE_BASE = (
    "水墨风格，武侠题材，中国传统水墨画质感。"
    "主色调：淡墨灰(#3a3a3a)为主线条色，暖白宣纸(#f5f0e8)为底色，朱砂红(#c14443)为点缀色。"
    "线条规范：细墨线勾勒，线条均匀流畅，装饰从简不繁复，留白为主。"
    "质感统一：轻度宣纸纹理，淡墨渲染，不要浓重泼墨效果，笔触温润色调淡雅。"
    "NO text, NO labels, NO watermarks, NO signatures, NO characters, NO human figures."
)
UI_CATEGORY_TEMPLATES: Dict[str, str] = {
    "background": (
        "{style_base} 场景背景图，全幅构图，横向宽屏比例，层次丰富，意境深远，适合作为游戏界面背景。"
        "Subject: {description}. Wide panoramic composition, layered atmospheric depth, traditional Chinese landscape aesthetics."
    ),
    "frame": (
        "{style_base} 边框/画框装饰素材，边缘有精美墨线装饰，四角精美纹样，中心区域透明，适合叠加在内容上方。"
        "Subject: {description}. Decorative border frame with ornate corner accents, ink-drawn patterns on edges, center area transparent, suitable as an overlay border. Transparent background, PNG with alpha channel."
    ),
    "panel": (
        "{style_base} 完整UI面板素材，四周有精美墨线边缘装饰，中间填充宣纸卷轴质感底色，不要镂空。适合作为对话框、商店、结算等界面容器。"
        "Subject: {description}. Complete UI panel with ornate ink-drawn border decorations, center filled with aged parchment/scroll texture, NOT hollow, NOT empty center. Exterior area outside panel is transparent. PNG with alpha channel."
    ),
    "button": (
        "{style_base} 可点击按钮素材，强调质感与可交互感，形态完整，边缘清晰，适合游戏UI按钮使用。"
        "Subject: {description}. UI button element with clear clickable affordance, tactile texture, subtle ink outline, centered composition. Pure transparent background, PNG with alpha channel."
    ),
    "card-border": (
        "{style_base} 卡牌边框装饰，古风简约纹样，四角有点缀装饰，适合作为角色/物品卡牌的外框装饰。"
        "Subject: {description}. Card border decoration with clean traditional patterns in corners, elegant ink-drawn accents, inner area transparent for card content. Pure transparent background, PNG with alpha channel."
    ),
    "icon": (
        "{style_base} UI图标素材，单一主体，造型简洁明确，适合在界面中快速识别。"
        "Subject: {description}. Single icon element, clean silhouette, centered composition, minimal yet expressive, suitable for UI icon use. Pure transparent background, PNG with alpha channel."
    ),
}


def _read_batch_config() -> List[Dict]:
    with open(BATCH_CONFIG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _write_batch_config(data: List[Dict]) -> None:
    with open(BATCH_CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _character_folder(name: str) -> Path:
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
    history = history[:50]
    with open(HISTORY_PATH, "w", encoding="utf-8") as f:
        json.dump(history, f, ensure_ascii=False, indent=2)


def _load_templates() -> Dict[str, str]:
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
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY environment variable is not set.")
    from openai import OpenAI
    return OpenAI(api_key=api_key)


def _read_workspace_characters() -> List[Dict]:
    if not CHARACTER_PROFILES_PATH.exists():
        return []
    try:
        with open(CHARACTER_PROFILES_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return []


def _write_workspace_characters(records: List[Dict]) -> None:
    CHARACTER_PROFILES_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(CHARACTER_PROFILES_PATH, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)


def _read_character_profiles() -> Dict[str, Any]:
    records = _read_workspace_characters()
    result: Dict[str, Any] = {}
    for record in records:
        name = record.get("name", "")
        if not name:
            continue
        profile: Dict[str, Any] = {
            "description": record.get("description", ""),
            "rarity": record.get("rarity", "copper"),
            "attributes": record.get("attributes", {}),
            "special_attributes": record.get("special_attributes", {}),
            "tags": record.get("tags", []),
            "equipment_slots": record.get("equipment_slots", 1),
        }
        meta = record.get("meta", {})
        if meta.get("selected_asset"):
            profile["selected_portrait"] = meta["selected_asset"]
        if meta.get("archived"):
            profile["archived"] = True
        result[name] = profile
    return result


def _write_character_profiles(data: Dict[str, Any]) -> None:
    records = _read_workspace_characters()
    records_by_name: Dict[str, Dict] = {r.get("name"): r for r in records if r.get("name")}
    for name, profile in data.items():
        if name in records_by_name:
            record = records_by_name[name]
        else:
            safe_id = re.sub(r"[^\w]", "_", name)
            record = {"card_id": f"card_{safe_id}", "name": name, "type": "character", "image": ""}
            records.append(record)
            records_by_name[name] = record
        for key in ("description", "rarity", "attributes", "special_attributes", "tags", "equipment_slots"):
            if key in profile:
                record[key] = profile[key]
        if "meta" not in record:
            record["meta"] = {"publish_status": "draft", "asset_candidates": [], "workshop_variants": []}
        record["meta"]["selected_asset"] = profile.get("selected_portrait", "")
        record["meta"]["updated_at"] = datetime.utcnow().isoformat() + "Z"
    _write_workspace_characters(list(records_by_name.values()))


def _file_hash(path: Path) -> Optional[str]:
    if not path.exists():
        return None
    digest = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _read_cards_file(path: Path) -> List[Dict]:
    if not path.exists():
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return []


def _write_cards_file(path: Path, data: List[Dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _read_runtime_cards() -> List[Dict]:
    all_cards: List[Dict] = []
    all_cards.extend(_read_cards_file(CHARACTERS_CARDS_PATH))
    all_cards.extend(_read_cards_file(EQUIPMENT_CARDS_PATH))
    all_cards.extend(_read_cards_file(SPECIAL_CARDS_PATH))
    return all_cards


def _write_runtime_cards(data: List[Dict]) -> None:
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


def _sync_special_workspace() -> None:
    try:
        special_records = _read_cards_file(WORKSPACE_SPECIAL_PATH)
        _write_cards_file(SPECIAL_CARDS_PATH, special_records)
    except Exception as exc:
        print(f"[WARN] _sync_special_workspace failed: {exc}")


def _build_name_to_game_file() -> Dict[str, str]:
    mapping: Dict[str, str] = {}
    try:
        cards = _read_runtime_cards()
        for card in cards:
            if card.get("type") == "character" and card.get("image"):
                stem = card["image"].rsplit("/", 1)[-1].replace(".png", "")
                mapping[card["name"]] = stem
    except Exception:
        pass
    fallback = {
        "徐龙象": "figure01",
        "徐渭熊": "figure02",
        "徐凤年": "figure03",
        "温华": "figure04",
        "红薯": "figure05",
        "洪洗象": "figure06",
        "老黄": "figure07",
    }
    for key, value in fallback.items():
        if key not in mapping:
            mapping[key] = value
    return mapping


def _get_game_file(name: str) -> str:
    return _build_name_to_game_file().get(name, "")


def _next_figure_id() -> str:
    used = set(_build_name_to_game_file().values())
    for i in range(1, 100):
        candidate = f"figure{i:02d}"
        if candidate not in used:
            return candidate
    raise RuntimeError("No available figure IDs")


def _read_base_cards() -> List[Dict]:
    return _read_runtime_cards()


def _generate_single_blocking(client, prompt: str, asset_type: str, output_path: Path):
    raw_img = ga.generate_image(client, prompt, asset_type)
    processed = ga.post_process(raw_img, asset_type)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    processed.save(str(output_path), format="PNG")
    return output_path


from models.types import *


def get_templates() -> Dict[str, str]:
    return _load_templates()


def update_templates(body: TemplatesModel) -> Dict[str, Any]:
    data = body.model_dump()
    _save_templates(data)
    return {"success": True, "message": "Templates saved."}


def get_history() -> List[Dict]:
    return _read_history()


def health() -> Dict[str, str]:
    return {"status": "ok"}


DESCRIPTION_MODEL = os.environ.get("DESCRIPTION_MODEL", "gpt-5.4")


from services.characters import *
from services.items import *
from services.scenes import *
from services.ui_assets import *

from services.items import _read_workspace_equipment, _write_workspace_equipment
from services.scenes import _read_workspace_locations_data, _write_workspace_locations_data, _read_workspace_maps_data, _write_workspace_maps_data
from services.ui_assets import _read_workspace_ui_assets, _write_workspace_ui_assets