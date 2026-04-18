import asyncio
import json
import os
import re
import shutil
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import shared as shared_ctx
from fastapi import HTTPException
from fastapi.responses import StreamingResponse

from models.types import (
    CreateItemRequest,
    GenerateRequest,
    ItemProfileModel,
    ItemPromptConfigModel,
    RegenerateItemVariantsRequest,
    SelectItemImageRequest,
    UpdateItemVariantRequest,
)

ITEM_STYLE_B_TEMPLATE = (
    "Professional game equipment illustration: {description}. Rendered in traditional xieyi (写意) ink wash painting style with rich detail and layered textures. "
    "Style: semi-realistic Chinese ink wash (shui mo), expressive brushwork with feibi dry-brush highlights, "
    "ink washes with natural color accents, polished finish with crisp edges. "
    "Chinese ancient wuxia-era design — all equipment shapes, silhouettes, and ornamentation must follow traditional Chinese aesthetics. No Western fantasy elements. "
    "{rarity_palette}"
    "Pure transparent background, PNG with alpha channel. "
    "Display the complete object in full view — do not crop or truncate any part of the item. "
    "For elongated items such as spears, staves, or long swords, fit the entire object within the frame using a slight diagonal composition. "
    "Centered composition, single object displayed on its own, production-ready quality. {no_text}"
)

RARITY_VISUAL_ENHANCEMENTS: Dict[str, Dict[str, str]] = {
    "common": {"rarity_palette": "Color palette: muted taupe, weathered earth, soft chalk white. Simple construction, plain materials, no decorative elements, no glow effects. "},
    "rare": {"rarity_palette": "Color palette: cool cyan-blue, misted ash gray, cold jade tint. Refined craftsmanship with subtle metallic sheen, light engravings, faint cool-toned aura. "},
    "epic": {"rarity_palette": "Color palette: deep violet, ember red, dusky aureate glow. Elaborate ornamental details, inlaid gemstones, visible radiant halo, intricate carvings and filigree. "},
    "legendary": {"rarity_palette": "Color palette: luminous pearl white, flowing iridescence, celestial rosy haze. Supremely ornate, luminous materials with inner glow, ethereal energy streams, supernatural visual impact, every surface richly detailed with mythical motifs. "},
}

DEFAULT_ITEM_PROMPT_CONFIG = {
    "variant_system_prompt": "你是熟读武侠小说《雪中悍刀行》的物品设计专家。",
    "style_template": ITEM_STYLE_B_TEMPLATE,
    "rarity_palettes": {rarity: values["rarity_palette"] for rarity, values in RARITY_VISUAL_ENHANCEMENTS.items()},
}


def _item_folder(name: str) -> Path:
    return shared_ctx.SAMPLES_DIR / f"item_{name}"


def _read_item_batch_config() -> List[Dict]:
    path = shared_ctx.ITEM_BATCH_CONFIG_PATH
    if not path.exists():
        return []
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []


def _write_item_batch_config(data: List[Dict]) -> None:
    shared_ctx.ITEM_BATCH_CONFIG_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def _read_workspace_equipment() -> List[Dict]:
    path = shared_ctx.ITEM_PROFILES_PATH
    if not path.exists():
        return []
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []


def _write_workspace_equipment(records: List[Dict]) -> None:
    shared_ctx.ITEM_PROFILES_PATH.parent.mkdir(parents=True, exist_ok=True)
    shared_ctx.ITEM_PROFILES_PATH.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")


def _read_item_profiles() -> Dict[str, Any]:
    result: Dict[str, Any] = {}
    for record in _read_workspace_equipment():
        name = record.get("name", "")
        if not name:
            continue
        profile: Dict[str, Any] = {
            "type": record.get("type", "equipment"),
            "equipment_type": record.get("equipment_type", "weapon"),
            "rarity": record.get("rarity", "common"),
            "description": record.get("description", ""),
            "lore": record.get("lore", ""),
            "attribute_bonus": record.get("attribute_bonus", {}),
            "special_bonus": record.get("special_bonus", {}),
            "gem_slots": record.get("gem_slots", 0),
            "tags": record.get("tags", []),
        }
        meta = record.get("meta", {})
        if meta.get("selected_asset"):
            profile["selected_image"] = meta["selected_asset"]
        if meta.get("archived"):
            profile["archived"] = True
        result[name] = profile
    return result


def _write_item_profiles(data: Dict[str, Any]) -> None:
    records = _read_workspace_equipment()
    records_by_name: Dict[str, Dict] = {record.get("name"): record for record in records if record.get("name")}
    for name, profile in data.items():
        record = records_by_name.get(name)
        if record is None:
            safe_id = re.sub(r"[^\w]", "_", name)
            record = {"card_id": f"equip_{safe_id}", "name": name, "type": "equipment", "image": ""}
            records.append(record)
            records_by_name[name] = record
        for key in ("equipment_type", "rarity", "description", "lore", "attribute_bonus", "special_bonus", "gem_slots", "tags"):
            if key in profile:
                record[key] = profile[key]
        if "type" in profile:
            record["type"] = profile["type"]
        meta = record.setdefault("meta", {"publish_status": "draft", "asset_candidates": [], "workshop_variants": []})
        meta["selected_asset"] = profile.get("selected_image", "")
        meta["updated_at"] = datetime.utcnow().isoformat() + "Z"
    _write_workspace_equipment(list(records_by_name.values()))


def _item_to_card_id(name: str) -> str:
    safe = re.sub(r"[^\w]", "_", name, flags=re.ASCII)
    if not safe or safe.startswith("_"):
        safe = f"item_{abs(hash(name)) % 10000}"
    return f"equip_{safe}"


def _load_item_prompt_config() -> Dict[str, Any]:
    templates = shared_ctx._load_templates()
    config = {
        "variant_system_prompt": DEFAULT_ITEM_PROMPT_CONFIG["variant_system_prompt"],
        "style_template": templates.get("item_template") or DEFAULT_ITEM_PROMPT_CONFIG["style_template"],
        "rarity_palettes": dict(DEFAULT_ITEM_PROMPT_CONFIG["rarity_palettes"]),
    }
    path = shared_ctx.ITEM_PROMPT_CONFIG_PATH
    if path.exists():
        try:
            persisted = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(persisted.get("variant_system_prompt"), str):
                config["variant_system_prompt"] = persisted["variant_system_prompt"]
            if isinstance(persisted.get("style_template"), str):
                config["style_template"] = persisted["style_template"]
            if isinstance(persisted.get("rarity_palettes"), dict):
                for rarity in config["rarity_palettes"]:
                    if isinstance(persisted["rarity_palettes"].get(rarity), str):
                        config["rarity_palettes"][rarity] = persisted["rarity_palettes"][rarity]
        except (json.JSONDecodeError, OSError):
            pass
    return config


def _save_item_prompt_config(config: Dict[str, Any]) -> Dict[str, Any]:
    normalized = {
        "variant_system_prompt": config.get("variant_system_prompt", DEFAULT_ITEM_PROMPT_CONFIG["variant_system_prompt"]),
        "style_template": config.get("style_template", DEFAULT_ITEM_PROMPT_CONFIG["style_template"]),
        "rarity_palettes": {
            rarity: config.get("rarity_palettes", {}).get(rarity, DEFAULT_ITEM_PROMPT_CONFIG["rarity_palettes"][rarity])
            for rarity in DEFAULT_ITEM_PROMPT_CONFIG["rarity_palettes"]
        },
    }
    shared_ctx.ITEM_PROMPT_CONFIG_PATH.write_text(json.dumps(normalized, ensure_ascii=False, indent=2), encoding="utf-8")
    return normalized


def _reset_item_prompt_config() -> Dict[str, Any]:
    return _save_item_prompt_config(DEFAULT_ITEM_PROMPT_CONFIG)


def _build_item_prompt(description: str, rarity: str = "rare") -> str:
    templates = shared_ctx._load_templates()
    prompt_config = _load_item_prompt_config()
    template = prompt_config.get("style_template") or templates.get("item_template") or ITEM_STYLE_B_TEMPLATE
    return template.format(
        description=description,
        rarity_palette=prompt_config.get("rarity_palettes", {}).get(rarity) or RARITY_VISUAL_ENHANCEMENTS.get(rarity, RARITY_VISUAL_ENHANCEMENTS["rare"])["rarity_palette"],
        no_text=templates.get("no_text_constraint", shared_ctx.ga.NO_TEXT_CONSTRAINT),
    )


def get_items() -> List[Dict]:
    records = _read_workspace_equipment()
    profiles = _read_item_profiles()
    items = []
    for record in records:
        name = record.get("name", "")
        if not name or profiles.get(name, {}).get("archived"):
            continue
        current_image = ""
        image = record.get("image", "")
        if image:
            img_filename = image.rsplit("/", 1)[-1]
            img_path = shared_ctx.ITEMS_PUBLIC_DIR / img_filename
            current_image = f"/items/{img_filename}?t={int(img_path.stat().st_mtime)}" if img_path.exists() else f"/items/{img_filename}"
        batch = _read_item_batch_config()
        variants = [{"index": i, "description": entry.get("description", ""), "output": entry.get("output", "")} for i, entry in enumerate([entry for entry in batch if entry.get("name") == name])]
        items.append({"name": name, "id": name, "current_image": current_image, "has_pending_image": bool(profiles.get(name, {}).get("selected_image")), "variants": variants})
    return items


async def create_item(body: CreateItemRequest) -> Dict[str, Any]:
    records = _read_workspace_equipment()
    if body.name in {record.get("name") for record in records}:
        raise HTTPException(status_code=409, detail=f"Item '{body.name}' already exists.")
    record = {
        "card_id": _item_to_card_id(body.name),
        "name": body.name,
        "type": "equipment",
        "equipment_type": body.equipment_type,
        "rarity": body.rarity,
        "image": "",
        "meta": {"publish_status": "draft", "asset_candidates": [], "workshop_variants": []},
    }
    records.append(record)
    _write_workspace_equipment(records)
    (_item_folder(body.name)).mkdir(parents=True, exist_ok=True)
    return {"success": True, "item": record}


def get_item_variants(item_name: str) -> List[Dict]:
    batch = _read_item_batch_config()
    return [{"index": i, "description": entry.get("description", ""), "output": entry.get("output", "")} for i, entry in enumerate([entry for entry in batch if entry.get("name") == item_name])]


def update_item_variant(item_name: str, index: int, body: UpdateItemVariantRequest) -> Dict[str, Any]:
    batch = _read_item_batch_config()
    item_indices = [i for i, entry in enumerate(batch) if entry.get("name") == item_name]
    if not item_indices:
        raise HTTPException(status_code=404, detail=f"Item not found: {item_name}")
    if index < 0 or index >= len(item_indices):
        raise HTTPException(status_code=400, detail=f"variant_index {index} out of range.")
    batch[item_indices[index]]["description"] = body.description
    _write_item_batch_config(batch)
    return {"success": True}


async def regenerate_item_variants(item_name: str, body: RegenerateItemVariantsRequest) -> Dict[str, Any]:
    return {"success": True, "descriptions": []}


def get_item_profile(item_name: str) -> Dict[str, Any]:
    return _read_item_profiles().get(item_name, {"type": "equipment", "equipment_type": "weapon", "rarity": "common", "description": "", "lore": "", "attribute_bonus": {}, "special_bonus": {}, "gem_slots": 0, "tags": []})


def update_item_profile(item_name: str, body: ItemProfileModel) -> Dict[str, Any]:
    profiles = _read_item_profiles()
    profile = profiles.get(item_name, {})
    profile.update(body.model_dump(exclude_none=True))
    profiles[item_name] = profile
    _write_item_profiles(profiles)
    return {"success": True, "profile": profiles[item_name]}


async def generate_item_profile(item_name: str) -> Dict[str, Any]:
    return {"success": True, "profile": get_item_profile(item_name)}


def get_item_samples(item_name: str) -> List[Dict]:
    folder = _item_folder(item_name)
    selected_image = _read_item_profiles().get(item_name, {}).get("selected_image")
    current_image_path = next((record.get("image", "") for record in _read_workspace_equipment() if record.get("name") == item_name), "")
    current_filename = current_image_path.rsplit("/", 1)[-1] if current_image_path else ""
    game_item_path = shared_ctx.ITEMS_PUBLIC_DIR / current_filename if current_filename else None
    current_hash = shared_ctx._file_hash(game_item_path) if game_item_path and game_item_path.exists() else None
    results = []
    if folder.exists():
        for img_file in sorted(folder.glob("*.png")):
            rel = img_file.relative_to(shared_ctx.SAMPLES_DIR)
            results.append({
                "filename": img_file.name,
                "url": f"/images/{rel.as_posix()}",
                "path": str(rel),
                "abs_path": str(img_file),
                "is_current_in_game": current_hash is not None and shared_ctx._file_hash(img_file) == current_hash,
                "is_selected": selected_image is not None and str(img_file) == selected_image,
            })
    return results


def select_item_image(item_name: str, body: SelectItemImageRequest) -> Dict[str, Any]:
    image_path = Path(body.image_path)
    if not image_path.exists():
        raise HTTPException(status_code=404, detail=f"Image file not found: {body.image_path}")
    profiles = _read_item_profiles()
    profiles.setdefault(item_name, {})["selected_image"] = str(image_path)
    _write_item_profiles(profiles)
    return {"success": True, "selected_image": str(image_path)}


def item_deploy_preview(item_name: str) -> Dict[str, Any]:
    records = _read_workspace_equipment()
    record = next((entry for entry in records if entry.get("name") == item_name), None)
    if record is None:
        raise HTTPException(status_code=404, detail=f"Item not found: {item_name}")
    return {"name": item_name, "selected_asset": record.get("meta", {}).get("selected_asset", ""), "current_image": record.get("image", "")}


def deploy_item(item_name: str) -> Dict[str, Any]:
    records = _read_workspace_equipment()
    target_idx = next((i for i, record in enumerate(records) if record.get("name") == item_name), None)
    if target_idx is None:
        raise HTTPException(status_code=404, detail=f"Item not found: {item_name}")
    record = records[target_idx]
    meta = record.setdefault("meta", {})
    image_copied = False
    image_source_filename = None
    selected_image_path = meta.get("selected_asset", "")
    if selected_image_path:
        selected_file = Path(selected_image_path)
        if selected_file.exists():
            img_filename = selected_file.name
            shared_ctx.ITEMS_SRC_DIR.mkdir(parents=True, exist_ok=True)
            shared_ctx.ITEMS_PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
            shutil.copy2(str(selected_file), str(shared_ctx.ITEMS_SRC_DIR / img_filename))
            shutil.copy2(str(selected_file), str(shared_ctx.ITEMS_PUBLIC_DIR / img_filename))
            record["image"] = f"/assets/items/{img_filename}"
            image_copied = True
            image_source_filename = img_filename
        meta.pop("selected_asset", None)
    meta["publish_status"] = "published"
    meta["updated_at"] = datetime.utcnow().isoformat() + "Z"
    records[target_idx] = record
    _write_workspace_equipment(records)
    runtime_equipment = []
    for ws_record in records:
        publish_status = ws_record.get("meta", {}).get("publish_status", "")
        if publish_status in ("published", "ready") or not publish_status:
            runtime_equipment.append({k: v for k, v in ws_record.items() if k != "meta"})
    shared_ctx.EQUIPMENT_CARDS_PATH.parent.mkdir(parents=True, exist_ok=True)
    shared_ctx.EQUIPMENT_CARDS_PATH.write_text(json.dumps(runtime_equipment, ensure_ascii=False, indent=2), encoding="utf-8")
    special_records = []
    if shared_ctx.WORKSPACE_SPECIAL_PATH.exists():
        try:
            special_records = json.loads(shared_ctx.WORKSPACE_SPECIAL_PATH.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            special_records = []
    shared_ctx.SPECIAL_CARDS_PATH.parent.mkdir(parents=True, exist_ok=True)
    shared_ctx.SPECIAL_CARDS_PATH.write_text(json.dumps(special_records, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"success": True, "item_name": item_name, "image_copied": image_copied, "image_source_filename": image_source_filename}


def archive_item(item_name: str) -> Dict[str, Any]:
    profiles = _read_item_profiles()
    profile = profiles.get(item_name, {})
    profile["archived"] = True
    profiles[item_name] = profile
    _write_item_profiles(profiles)
    return {"success": True}


async def generate_item_images(body: GenerateRequest):
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
        prompt = _build_item_prompt(body.description)
        generated_images = []
        for i in range(1, count + 1):
            yield f"data: {json.dumps({'type': 'progress', 'message': f'Generating item image {i} of {count}…', 'current': i, 'total': count})}\\n\\n"
            filename = f"{body.name}_{timestamp}_{i}.png"
            output_path = folder / filename
            try:
                saved_path = await loop.run_in_executor(None, shared_ctx._generate_single_blocking, client, prompt, "item", output_path)
                rel_path = saved_path.relative_to(shared_ctx.SAMPLES_DIR)
                generated_images.append({"path": str(rel_path), "url": f"/images/{rel_path.as_posix()}"})
            except Exception as exc:
                yield f"data: {json.dumps({'type': 'error', 'message': f'Failed to generate image {i}: {exc}', 'current': i, 'total': count})}\\n\\n"
        shared_ctx._append_history({"timestamp": datetime.utcnow().isoformat() + "Z", "name": body.name, "asset_type": "item", "images": generated_images})
        yield f"data: {json.dumps({'type': 'done', 'images': generated_images})}\\n\\n"
        return

    return StreamingResponse(event_stream(), media_type="text/event-stream")


def get_item_prompt_config() -> Dict[str, Any]:
    return _load_item_prompt_config()


def update_item_prompt_config(body: ItemPromptConfigModel) -> Dict[str, Any]:
    return _save_item_prompt_config(body.model_dump())


def reset_item_prompt_config() -> Dict[str, Any]:
    return _reset_item_prompt_config()