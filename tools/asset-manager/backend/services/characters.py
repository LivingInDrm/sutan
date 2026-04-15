from __future__ import annotations

import asyncio
import json
import os
import re
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import generate_assets as ga
from fastapi import HTTPException
from fastapi.responses import StreamingResponse
import shared as shared_ctx
from models.types import (
    CharacterProfileModel,
    CreateCharacterRequest,
    GenerateDescriptionRequest,
    GenerateRequest,
    RegenerateVariantsRequest,
    SelectPortraitRequest,
    UpdateVariantRequest,
)


def _build_custom_prompt(asset_type: str, name: str, description: str) -> str:
    templates = shared_ctx._load_templates()
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
    raw_img = ga.generate_image(client, prompt, asset_type)
    processed = ga.post_process(raw_img, asset_type)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    processed.save(str(output_path), format="PNG")
    return output_path


async def generate_images(body: GenerateRequest):
    if body.asset_type not in ("portrait", "item", "scene"):
        raise HTTPException(status_code=400, detail=f"Invalid asset_type: {body.asset_type}")
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY environment variable is not set.")

    async def event_stream():
        from openai import OpenAI

        client = OpenAI(api_key=api_key)
        loop = asyncio.get_running_loop()
        count = max(1, body.count)
        timestamp = int(time.time())
        folder = shared_ctx._character_folder(body.name)
        prompt = _build_custom_prompt(body.asset_type, body.name, body.description)
        generated_images = []

        for i in range(1, count + 1):
            yield f"data: {json.dumps({'type': 'progress', 'message': f'Generating image {i} of {count} for {body.name}…', 'current': i, 'total': count})}\n\n"
            filename = f"{body.name}_{timestamp}_{i}.png"
            output_path = folder / filename
            try:
                saved_path = await loop.run_in_executor(None, _generate_single_blocking, client, prompt, body.asset_type, output_path)
                rel_path = saved_path.relative_to(shared_ctx.SAMPLES_DIR)
                generated_images.append({"path": str(rel_path), "url": f"/images/{rel_path.as_posix()}"})
            except Exception as exc:
                yield f"data: {json.dumps({'type': 'error', 'message': f'Failed to generate image {i}: {exc}', 'current': i, 'total': count})}\n\n"

        shared_ctx._append_history({"timestamp": datetime.utcnow().isoformat() + "Z", "name": body.name, "asset_type": body.asset_type, "images": generated_images})
        yield f"data: {json.dumps({'type': 'done', 'images': generated_images})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


def get_characters() -> List[Dict]:
    items = shared_ctx._read_batch_config()
    groups: Dict[str, List[Dict]] = {}
    for item in items:
        groups.setdefault(item["name"], []).append(item)
    profiles = shared_ctx._read_character_profiles()
    characters = []
    for name, entries in groups.items():
        if profiles.get(name, {}).get("archived"):
            continue
        game_file = shared_ctx._get_game_file(name)
        variants = [{"index": idx, "description": entry.get("description", ""), "output": entry.get("output", "")} for idx, entry in enumerate(entries)]
        current_portrait = ""
        if game_file:
            portrait_path = shared_ctx.PORTRAITS_PUBLIC_DIR / f"{game_file}.png"
            if portrait_path.exists():
                current_portrait = f"/portraits/{game_file}.png?t={int(portrait_path.stat().st_mtime)}"
            else:
                current_portrait = f"/portraits/{game_file}.png"
        profile = profiles.get(name, {})
        characters.append({"name": name, "id": name, "figure_id": name, "current_portrait": current_portrait, "has_pending_portrait": bool(profile.get("selected_portrait")), "variants": variants})
    return characters


def get_samples(character_name: str) -> List[Dict]:
    folder = shared_ctx._character_folder(character_name)
    game_file = shared_ctx._get_game_file(character_name)
    game_portrait_hash = shared_ctx._file_hash(shared_ctx.PORTRAITS_PUBLIC_DIR / f"{game_file}.png") if game_file else None
    selected_portrait = shared_ctx._read_character_profiles().get(character_name, {}).get("selected_portrait")
    results = []
    if folder.exists():
        for img_file in sorted(folder.glob("*.png")):
            rel = img_file.relative_to(shared_ctx.SAMPLES_DIR)
            sample_hash = shared_ctx._file_hash(img_file) if game_portrait_hash else None
            results.append({
                "filename": img_file.name,
                "url": f"/images/{rel.as_posix()}",
                "path": str(rel),
                "abs_path": str(img_file),
                "is_current_in_game": game_portrait_hash is not None and sample_hash == game_portrait_hash,
                "is_selected": selected_portrait is not None and str(img_file) == selected_portrait,
            })
    return results


def select_portrait(character_name: str, body: SelectPortraitRequest) -> Dict[str, Any]:
    portrait_path = Path(body.portrait_path)
    if not portrait_path.exists():
        raise HTTPException(status_code=404, detail=f"Portrait file not found: {body.portrait_path}")
    profiles = shared_ctx._read_character_profiles()
    profiles.setdefault(character_name, {})["selected_portrait"] = str(portrait_path)
    shared_ctx._write_character_profiles(profiles)
    return {"success": True, "selected_portrait": str(portrait_path)}


def update_character_variant(character_name: str, body: UpdateVariantRequest) -> Dict[str, Any]:
    items = shared_ctx._read_batch_config()
    existing_names = {item.get("name") for item in items}
    if character_name not in existing_names:
        raise HTTPException(status_code=404, detail=f"Unknown character: {character_name}")
    char_entries_indices = [i for i, item in enumerate(items) if item.get("name") == character_name]
    if body.variant_index < 0 or body.variant_index >= len(char_entries_indices):
        raise HTTPException(status_code=400, detail=f"variant_index {body.variant_index} out of range; {character_name} has {len(char_entries_indices)} variant(s).")
    items[char_entries_indices[body.variant_index]]["description"] = body.description
    shared_ctx._write_batch_config(items)
    return {"success": True, "message": f"Updated {character_name} variant {body.variant_index} description in batch_config.json."}


_DESCRIPTION_SYSTEM_PROMPT = """你是熟读武侠小说《雪中悍刀行》的文学专家和古风角色绘画提示词专家，对原著中所有角色的外貌、性格、武器、标志性场景有深刻理解。

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
武器名、招式名、境界名等专有名词需替换为通用视觉描述；若专名本身有清晰视觉含义可酌情保留。

## 输出格式
严格输出 JSON 数组，包含 4 个字符串，不要包含任何其他内容。
"""


def _get_existing_examples(name: str) -> str:
    items = shared_ctx._read_batch_config()
    grouped: Dict[str, List[str]] = {}
    for item in items:
        candidate_name = item.get("name", "")
        if candidate_name == name:
            continue
        desc = item.get("description", "").strip()
        if desc:
            grouped.setdefault(candidate_name, []).append(desc)
    if not grouped:
        return ""
    lines = ["\n以下是已有角色的 description 示例（每个角色取 2 条），请严格模仿此风格和格式：\n"]
    for char_name in list(grouped.keys())[:3]:
        for desc in grouped[char_name][:2]:
            lines.append(f"角色 {char_name}：\"{desc}\"")
        lines.append("")
    return "\n".join(lines).rstrip()


def _generate_descriptions_blocking(client, name: str, bio: str) -> List[str]:
    existing_examples = _get_existing_examples(name)
    bio_section = f"角色简介（可选补充，以原著为准）：{bio}\n" if bio.strip() else ""
    user_msg = f"角色名：{name}\n{bio_section}{existing_examples}\n\n请基于《雪中悍刀行》原著中 {name} 的外貌、性格、武器、标志性场景，生成 4 条不同场景的 description，以 JSON 数组格式输出。"
    response = client.responses.create(model=shared_ctx.DESCRIPTION_MODEL, instructions=_DESCRIPTION_SYSTEM_PROMPT, input=user_msg, temperature=0.9, max_output_tokens=1000)
    content = response.output_text.strip()
    if content.startswith("```"):
        content = re.sub(r"^```[^\n]*\n?", "", content)
        content = re.sub(r"\n?```$", "", content)
    descriptions: List[str] = json.loads(content)
    if not isinstance(descriptions, list) or len(descriptions) < 4:
        raise ValueError(f"Unexpected LLM response: {content}")
    return descriptions[:4]


async def generate_description(body: GenerateDescriptionRequest) -> Dict[str, Any]:
    client = shared_ctx._get_openai_client()
    loop = asyncio.get_running_loop()
    try:
        descriptions = await loop.run_in_executor(None, _generate_descriptions_blocking, client, body.name, body.bio)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {exc}")
    if body.variant_index is not None:
        return {"descriptions": [descriptions[body.variant_index % 4]]}
    return {"descriptions": descriptions}


_PROFILE_SYSTEM_PROMPT = """你是《雪中悍刀行》专家，为角色生成游戏属性和人物小传。"""


def _generate_profile_blocking(client, name: str, reference_cards: List[Dict]) -> Dict[str, Any]:
    ref_text = ""
    if reference_cards:
        ref_lines = ["以下是现有角色的属性作为参考："]
        for card in reference_cards[:5]:
            ref_lines.append(f"- {card['name']} ({card.get('rarity','?')}): 属性={card.get('attributes', {})}, tags={card.get('tags', [])}")
        ref_text = "\n".join(ref_lines)
    response = client.responses.create(model=shared_ctx.DESCRIPTION_MODEL, instructions=_PROFILE_SYSTEM_PROMPT, input=f"角色名：{name}\n{ref_text}\n\n请基于《雪中悍刀行》原著中 {name} 的性格、能力、背景，生成符合稀有度规则的游戏属性和人物小传（50-100字）。", temperature=0.7, max_output_tokens=800)
    content = response.output_text.strip()
    if content.startswith("```"):
        content = re.sub(r"^```[^\n]*\n?", "", content)
        content = re.sub(r"\n?```$", "", content)
    return json.loads(content)


async def create_character(body: CreateCharacterRequest) -> Dict[str, Any]:
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="Character name must not be empty.")
    existing = shared_ctx._read_batch_config()
    if body.name in {item.get("name") for item in existing}:
        raise HTTPException(status_code=409, detail=f"Character '{body.name}' already exists.")
    folder_name = f"portrait_{body.name}"
    client = shared_ctx._get_openai_client()
    loop = asyncio.get_running_loop()
    try:
        descriptions = await loop.run_in_executor(None, _generate_descriptions_blocking, client, body.name, body.bio)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {exc}")
    new_entries = [{"type": "portrait", "name": body.name, "description": desc, "output": f"{folder_name}/{body.name}_{i:02d}.png"} for i, desc in enumerate(descriptions, start=1)]
    (shared_ctx.SAMPLES_DIR / folder_name).mkdir(parents=True, exist_ok=True)
    shared_ctx._write_batch_config(existing + new_entries)
    character = {"name": body.name, "id": body.name, "figure_id": body.name, "current_portrait": "", "variants": [{"index": i, "description": entry["description"], "output": entry["output"]} for i, entry in enumerate(new_entries)]}
    try:
        profile = await loop.run_in_executor(None, _generate_profile_blocking, client, body.name, shared_ctx._read_runtime_cards())
        profiles = shared_ctx._read_character_profiles()
        profiles[body.name] = profile
        shared_ctx._write_character_profiles(profiles)
    except Exception:
        pass
    return {"success": True, "character": character}


def get_character_profile(character_name: str) -> Dict[str, Any]:
    profile = shared_ctx._read_character_profiles().get(character_name)
    if profile is None:
        return {
            "description": "",
            "rarity": "copper",
            "attributes": {"physique": 5, "charm": 5, "wisdom": 5, "combat": 5, "social": 5, "survival": 5, "stealth": 5, "magic": 5},
            "special_attributes": {"support": 0, "reroll": 0},
            "tags": [],
            "equipment_slots": 1,
        }
    return profile


def update_character_profile(character_name: str, body: CharacterProfileModel) -> Dict[str, Any]:
    profiles = shared_ctx._read_character_profiles()
    existing = profiles.get(character_name, {})
    existing.update(body.model_dump(exclude_none=True))
    profiles[character_name] = existing
    shared_ctx._write_character_profiles(profiles)
    return {"success": True, "profile": profiles[character_name]}


async def generate_character_profile(character_name: str) -> Dict[str, Any]:
    client = shared_ctx._get_openai_client()
    loop = asyncio.get_running_loop()
    try:
        profile = await loop.run_in_executor(None, _generate_profile_blocking, client, character_name, shared_ctx._read_base_cards())
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {exc}")
    profiles = shared_ctx._read_character_profiles()
    profiles[character_name] = profile
    shared_ctx._write_character_profiles(profiles)
    return {"success": True, "profile": profile}


def deploy_character(character_name: str) -> Dict[str, Any]:
    ws_records = shared_ctx._read_workspace_characters()
    target_idx = next((i for i, record in enumerate(ws_records) if record.get("name") == character_name), None)
    if target_idx is None:
        raise HTTPException(status_code=404, detail=f"Character '{character_name}' not found in workspace.")
    record = ws_records[target_idx]
    meta = record.setdefault("meta", {})
    portrait_copied = False
    portrait_source_filename = None
    current_image = record.get("image", "")
    game_file = current_image.rsplit("/", 1)[-1].replace(".png", "") if current_image else shared_ctx._next_figure_id()
    if not current_image:
        record["image"] = f"/assets/portraits/{game_file}.png"
    selected_portrait_path = meta.get("selected_asset", "")
    if selected_portrait_path:
        selected_portrait_file = Path(selected_portrait_path)
        if selected_portrait_file.exists():
            shared_ctx.PORTRAITS_SRC_DIR.mkdir(parents=True, exist_ok=True)
            shared_ctx.PORTRAITS_PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
            target_src = shared_ctx.PORTRAITS_SRC_DIR / f"{game_file}.png"
            target_public = shared_ctx.PORTRAITS_PUBLIC_DIR / f"{game_file}.png"
            target_src.write_bytes(selected_portrait_file.read_bytes())
            target_public.write_bytes(selected_portrait_file.read_bytes())
            portrait_copied = True
            portrait_source_filename = selected_portrait_file.name
        meta.pop("selected_asset", None)
    meta["publish_status"] = "published"
    meta["updated_at"] = datetime.utcnow().isoformat() + "Z"
    ws_records[target_idx] = record
    shared_ctx._write_workspace_characters(ws_records)
    runtime_records = []
    for ws_record in ws_records:
        ws_meta = ws_record.get("meta", {})
        publish_status = ws_meta.get("publish_status", "")
        if publish_status in ("published", "ready") or not publish_status:
            runtime_records.append({k: v for k, v in ws_record.items() if k != "meta"})
    shared_ctx._write_runtime_cards(runtime_records + [card for card in shared_ctx._read_runtime_cards() if card.get("type") != "character"])
    return {"success": True, "character_name": character_name, "game_file": game_file, "portrait_copied": portrait_copied, "portrait_source_filename": portrait_source_filename}


def character_deploy_preview(character_name: str) -> Dict[str, Any]:
    ws_records = shared_ctx._read_workspace_characters()
    record = next((item for item in ws_records if item.get("name") == character_name), None)
    if record is None:
        raise HTTPException(status_code=404, detail=f"Character '{character_name}' not found in workspace.")
    meta = record.get("meta", {})
    selected_asset = meta.get("selected_asset", "")
    game_file = record.get("image", "").rsplit("/", 1)[-1].replace(".png", "") if record.get("image") else ""
    return {"character_name": character_name, "selected_asset": selected_asset, "current_image": record.get("image", ""), "game_file": game_file}


async def regenerate_variants(character_name: str, body: RegenerateVariantsRequest) -> Dict[str, Any]:
    items = shared_ctx._read_batch_config()
    char_entries_indices = [i for i, item in enumerate(items) if item.get("name") == character_name]
    if not char_entries_indices:
        raise HTTPException(status_code=404, detail=f"Unknown character: {character_name}")
    client = shared_ctx._get_openai_client()
    loop = asyncio.get_running_loop()
    try:
        descriptions = await loop.run_in_executor(None, _generate_descriptions_blocking, client, character_name, body.bio)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {exc}")
    for idx, global_idx in enumerate(char_entries_indices[:4]):
        if idx < len(descriptions):
            items[global_idx]["description"] = descriptions[idx]
    shared_ctx._write_batch_config(items)
    return {"success": True, "descriptions": descriptions}


def archive_character(character_name: str) -> Dict[str, Any]:
    profiles = shared_ctx._read_character_profiles()
    existing = profiles.get(character_name, {})
    existing["archived"] = True
    profiles[character_name] = existing
    shared_ctx._write_character_profiles(profiles)
    return {"success": True}