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

IMAGE_GENERATION_TIMEOUT_SECONDS = 180


def _build_custom_prompt(asset_type: str, name: str, description: str) -> str:
    templates = shared_ctx._load_templates()
    weapon_patterns = (
        r"(^|[^a-z])(?:long )?sword([^a-z-]|$)",
        r"(^|[^a-z])blade([^a-z-]|$)",
        r"(^|[^a-z])saber([^a-z-]|$)",
        r"(^|[^a-z])spear([^a-z-]|$)",
        r"(^|[^a-z])staff([^a-z-]|$)",
        r"(^|[^a-z])dagger([^a-z-]|$)",
        r"(^|[^a-z])bow([^a-z-]|$)",
        r"(^|[^a-z])arrows?([^a-z-]|$)",
        r"(^|[^a-z])whip([^a-z-]|$)",
        r"(^|[^a-z])halberd([^a-z-]|$)",
        r"(^|[^a-z])axe([^a-z-]|$)",
        r"(^|[^a-z])hammer([^a-z-]|$)",
        r"(^|[^a-z])fan([^a-z-]|$)",
        r"(^|[^a-z])umbrella([^a-z-]|$)",
        r"(^|[^a-z])weapons?([^a-z-]|$)",
        r"佩剑",
        r"长剑",
        r"短剑",
        r"刀",
        r"长刀",
        r"短刀",
        r"枪",
        r"长枪",
        r"矛",
        r"戟",
        r"弓",
        r"箭",
        r"匕首",
        r"鞭",
        r"斧",
        r"锤",
        r"兵器",
        r"武器",
    )
    has_weapon = any(re.search(pattern, description, re.IGNORECASE) for pattern in weapon_patterns)
    faithfulness_line = (
        "Costume, hairstyle, accessories, and weapons must faithfully follow the character description."
        if has_weapon
        else "Costume, hairstyle, and accessories must faithfully follow the character description."
    )
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
        faithfulness_line=faithfulness_line,
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
                saved_path = await asyncio.wait_for(
                    loop.run_in_executor(None, _generate_single_blocking, client, prompt, body.asset_type, output_path),
                    timeout=IMAGE_GENERATION_TIMEOUT_SECONDS,
                )
                rel_path = saved_path.relative_to(shared_ctx.SAMPLES_DIR)
                generated_images.append({"path": str(rel_path), "url": f"/images/{rel_path.as_posix()}"})
            except asyncio.TimeoutError:
                yield f"data: {json.dumps({'type': 'error', 'error': f'Image generation timed out after {IMAGE_GENERATION_TIMEOUT_SECONDS} seconds', 'message': f'Image generation timed out after {IMAGE_GENERATION_TIMEOUT_SECONDS} seconds', 'current': i, 'total': count})}\n\n"
            except Exception as exc:
                yield f"data: {json.dumps({'type': 'error', 'error': f'Failed to generate image {i}: {exc}', 'message': f'Failed to generate image {i}: {exc}', 'current': i, 'total': count})}\n\n"

        shared_ctx._append_history({"timestamp": datetime.utcnow().isoformat() + "Z", "name": body.name, "asset_type": body.asset_type, "images": generated_images})
        yield f"data: {json.dumps({'type': 'done', 'images': generated_images})}\n\n"
        return

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


_DESCRIPTION_SYSTEM_PROMPT = """You are a literary expert on the wuxia novel 雪中悍刀行 and an expert at writing direct-to-image character descriptions for classical Chinese character illustrations. You understand each character's appearance, temperament, weapons, and iconic traits in the original work.

The descriptions you write will be inserted directly into an image generation prompt as the Subject field. Write image-ready visual instructions, not readable copy, plot summary, or literary prose.

## Core Goal
Generate 4 full-body character description variants that:
- preserve the same character identity across all variants
- are immediately usable for image generation without any rewrite layer
- emphasize visual attributes, pose, clothing, props, mood, and costume color design
- avoid background-dependent wording because the final image uses a transparent background
- contain only character appearance information; style is controlled externally

## Language Requirement (HARD RULE)
- The ENTIRE description output MUST be in natural English ONLY.
- The output MUST NOT contain any Chinese character (no CJK unified ideographs anywhere, including inside phrases or parentheses).
- The output MUST NOT contain the character's Chinese name or any Chinese proper noun.
- If you need to name a weapon, robe, or accessory, use an English word (e.g. "curved saber", "scholar's robe", "jade hairpin"), never a Chinese word or transliteration.

## Required Structure
Each description must be exactly two parts:
1. A facial-features sentence.
2. A visual-body sentence fragment after that.

Format:
"[facial-features sentence]. [visual-body description]"

## Part 1: Facial Features
- Must be natural English, about 8-16 words
- Must describe face shape, eyes or brows, age impression, and expression
- Must end with a period
- Must be exactly identical across all 4 variants for the same character
- This is the identity anchor and should help keep the face consistent
- Facial features MUST match the reference excerpts from the original novel (see "Character reference" block below). Do not invent contradictory features (wrong age, wrong face shape, wrong build).

## Part 2: Visual-Body Description
Write concise prompt-friendly English phrases, roughly 24-44 words, focused on visible design only.

This part should cover most of these dimensions:
- body type / build / posture
- hairstyle and hair color
- clothing silhouette, material, and color
- accessories or signature prop / weapon
- full-body pose or action (character-specific, not a generic "stands poised")
- temperament / emotional atmosphere conveyed purely through visible cues
- outfit and prop color scheme
- short identity-atmosphere phrase at the end is allowed (e.g. "rakish young noble air", "weary old retainer carriage"), as long as it is atmosphere, not plot.

## Variant Differentiation Rules (HARD RULE)
The 4 variants MUST be clearly different from each other while still looking like the same person.
The 4 variants MUST NOT share the same Part-2 text. At least the following MUST differ across variants:
- clothing silhouette and dominant color palette
- pose / gesture / body angle (e.g. walking, half-turning, kneeling, lifting a prop, back-facing stance)
- weapon or accessory emphasis
- emotional atmosphere

Across the 4 variants, keep consistent:
- facial-features sentence (Part 1, identical)
- core age impression
- essential identity-defining traits from the novel (e.g. missing arm, white hair, patched robe)

Additional constraints:
- At least 3 of the 4 variants must have clearly different dominant costume colors.
- Do not make all 4 poses simple standing poses; include at least one dynamic pose (e.g. mid-stride, drawing a blade, kneeling, leaning, turning).
- Each variant should feel like a different art direction for the same character, not minor wording changes.

## Identity Grounding (HARD RULE)
When a "Character reference" block is provided below, it is authoritative ground truth from the original novel.
- You MUST respect age range (child / youth / middle-aged / elderly) stated there.
- You MUST respect essential traits such as: missing limb, beard color, signature prop, characteristic garment, characteristic pose.
- You MUST NOT hallucinate attributes that contradict the reference (e.g. do not write "middle-aged man" if reference says "old man with white hair and beard").
- If the reference specifies a signature prop (sword box, wine gourd, biscuit pole, jade hairpin), at least 2 of the 4 variants should surface it visibly.

## Background and Scene Restrictions
- Do not describe specific environments or locations such as riverbank, snow ferry crossing, mountain, courtyard, battlefield, tavern, forest, or street
- Do not write cinematic scene sentences
- Do not mention background objects, weather, architecture, or landscape
- Replace scene wording with atmosphere wording, for example: "lonely, wind-worn bearing" instead of "standing by a river in the wind"
- The character must read as complete on a transparent background

## Writing Style Restrictions
- Use visual description, not narrative sentences
- Avoid story beats, plot progression, and lore explanation
- Do not include relationships, titles, ranks, reincarnation identity, divine identity, or other non-visual lore labels
- Avoid ambiguous proper nouns for techniques, realms, or named moves unless the name itself creates a direct visual image
- Prefer concrete visible nouns and adjectives over abstract praise
- Keep descriptions compact, specific, and image-oriented
- Do NOT include any art style, rendering technique, lighting style, camera language, or medium descriptions
- Do NOT include phrases such as ink wash, watercolor, oil painting, Chinese painting style, gongbi, cel shading, cinematic lighting, soft focus, painterly, highly detailed rendering, wuxia style, or any similar style/medium wording
- Style is controlled externally by the prompt template, not by the character description

## Output Format
Return a JSON array with exactly 4 English strings and no extra text.
"""


_CJK_RE = re.compile(r"[\u4e00-\u9fff]")


def _contains_chinese(text: str) -> bool:
    return bool(_CJK_RE.search(text or ""))


# Path to the fixed portrait-eval test set that carries novel_refs for each character.
# Living at tools/asset-manager/tests/portrait-eval/test_set.yaml; this file is at
# tools/asset-manager/backend/services/characters.py → relative ../../tests/portrait-eval/test_set.yaml
_TEST_SET_PATH = Path(__file__).resolve().parent.parent.parent / "tests" / "portrait-eval" / "test_set.yaml"


def _load_character_refs(name: str) -> List[str]:
    """Return up to 5 novel reference excerpts for `name` from the portrait-eval test_set.yaml.

    Returns empty list if the file or the character entry is missing. We purposely
    read this file at call time (cheap, small file) so edits to test_set.yaml take
    effect without a server restart.
    """
    try:
        import yaml  # local import: only needed when descriptions are re-generated
    except ImportError:
        return []
    try:
        if not _TEST_SET_PATH.exists():
            return []
        with _TEST_SET_PATH.open("r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}
        for cfg in data.get("characters", []) or []:
            if cfg.get("name") == name:
                refs = cfg.get("novel_refs") or []
                return [r.strip() for r in refs if isinstance(r, str) and r.strip()][:5]
    except Exception:
        return []
    return []


def _get_existing_examples(name: str) -> str:
    items = shared_ctx._read_batch_config()
    grouped: Dict[str, List[str]] = {}
    for item in items:
        candidate_name = item.get("name", "")
        if candidate_name == name:
            continue
        desc = item.get("description", "").strip()
        if not desc:
            continue
        # Skip poisoned legacy rows that contain Chinese characters — feeding them as
        # few-shot examples makes the LLM drift into Chinese output (Bug 2 cause).
        if _contains_chinese(desc):
            continue
        grouped.setdefault(candidate_name, []).append(desc)
    if not grouped:
        return ""
    lines = ["\nHere are existing English character description examples (up to 2 per character). Follow the same style and format closely:\n"]
    for char_name in list(grouped.keys())[:3]:
        for desc in grouped[char_name][:2]:
            lines.append(f"Character {char_name}: \"{desc}\"")
        lines.append("")
    return "\n".join(lines).rstrip()


def _generate_descriptions_blocking(client, name: str, bio: str) -> List[str]:
    existing_examples = _get_existing_examples(name)
    # Phase B1: inject authoritative character reference from test_set.yaml so the LLM
    # has ground truth for age, signature props, and iconic traits instead of
    # hallucinating (e.g. "middle-aged man" for 老黄, who is an old white-bearded
    # retainer with a heavy sword box).
    novel_refs = _load_character_refs(name)
    ref_section = ""
    if novel_refs:
        ref_lines = [
            "## Character reference (original-novel excerpts, authoritative ground truth)",
            "Use these excerpts to decide age, build, hairstyle, signature garments and props, and characteristic atmosphere.",
            "Translate visual cues into English; do NOT quote any Chinese text back in your output.",
        ]
        for ref in novel_refs:
            ref_lines.append(f"- {ref}")
        ref_section = "\n".join(ref_lines) + "\n"
    bio_section = f"Optional additional bio (secondary, use only if not contradicting the reference above): {bio}\n" if bio.strip() else ""
    user_msg = (
        f"{_DESCRIPTION_SYSTEM_PROMPT}\n\n"
        f"Character name (for your internal identification only; DO NOT write this name in the output): {name}\n"
        f"{ref_section}"
        f"{bio_section}"
        f"{existing_examples}\n\n"
        f"Based on the Character reference above (authoritative) and the original novel, generate 4 full-body description variants for this character. "
        "Remember: English only, no Chinese characters, no Chinese name string, no style/medium words, and the 4 Part-2 texts must be clearly different. "
        "Return a JSON array of exactly 4 strings."
    )
    response = client.responses.create(model=shared_ctx.DESCRIPTION_MODEL, input=user_msg, temperature=0.9, max_output_tokens=1200)
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