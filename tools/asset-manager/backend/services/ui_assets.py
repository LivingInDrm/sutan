import asyncio
import json
import os
import shutil
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import shared as shared_ctx
from fastapi import HTTPException
from fastapi.responses import StreamingResponse

from models.types import (
    CreateUIAssetRequest,
    FreeGenRequest,
    GenerateRequest,
    RegenerateUIAssetVariantsRequest,
    SelectUIAssetImageRequest,
    UIAssetProfileModel,
    UpdateUIAssetVariantRequest,
)


def _read_workspace_ui_assets() -> List[Dict]:
    path = shared_ctx.UI_ASSETS_WORKSPACE_PATH
    if not path.exists():
        return []
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []


def _write_workspace_ui_assets(records: List[Dict]) -> None:
    shared_ctx.UI_ASSETS_WORKSPACE_PATH.parent.mkdir(parents=True, exist_ok=True)
    shared_ctx.UI_ASSETS_WORKSPACE_PATH.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")


def _read_ui_batch_config() -> List[Dict]:
    path = shared_ctx.UI_BATCH_CONFIG_PATH
    if not path.exists():
        return []
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []


def _write_ui_batch_config(data: List[Dict]) -> None:
    shared_ctx.UI_BATCH_CONFIG_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def _ui_asset_folder(asset_id: str) -> Path:
    return shared_ctx.SAMPLES_DIR / f"ui_{asset_id}"


def _free_gen_folder() -> Path:
    return shared_ctx.SAMPLES_DIR / "free-gen"


def _build_ui_prompt(description: str, category: str) -> str:
    template = shared_ctx.UI_CATEGORY_TEMPLATES.get(category, shared_ctx.UI_CATEGORY_TEMPLATES["icon"])
    return template.format(style_base=shared_ctx.UI_STYLE_BASE, description=description)


def _generate_ui_asset_image(client, prompt: str, output_path: Path, dimensions: str = "1024x1024") -> Path:
    return shared_ctx._generate_single_blocking(client, prompt, "item", output_path)


def _generate_free_gen_image(client, prompt: str, output_path: Path, size: str, background: str, quality: str) -> Path:
    return shared_ctx._generate_single_blocking(client, prompt, "item", output_path)


def _next_ui_asset_id() -> str:
    existing_ids = [record.get("asset_id", "") for record in _read_workspace_ui_assets()]
    max_id = 0
    for asset_id in existing_ids:
        if asset_id.startswith("ui_"):
            try:
                max_id = max(max_id, int(asset_id[3:]))
            except ValueError:
                continue
    return f"ui_{max_id + 1:03d}"


def _generate_ui_asset_variants_blocking(client, name: str, category: str, description: str) -> List[str]:
    return [description or f"{name} {category} {index}" for index in range(4)]


def get_ui_assets() -> List[Dict]:
    results = []
    for record in _read_workspace_ui_assets():
        image = record.get("image", "")
        current_image = ""
        if image:
            filename = image.rsplit("/", 1)[-1]
            asset_path = shared_ctx.UI_ASSETS_PUBLIC_DIR / filename
            current_image = f"/ui-assets/{filename}?t={int(asset_path.stat().st_mtime)}" if asset_path.exists() else f"/ui-assets/{filename}"
        results.append({
            "asset_id": record.get("asset_id", ""),
            "name": record.get("name", ""),
            "category": record.get("category", "icon"),
            "description": record.get("description", ""),
            "dimensions": record.get("dimensions", "1024x1024"),
            "current_image": current_image,
            "has_pending_image": bool(record.get("meta", {}).get("selected_asset")),
        })
    return results


async def create_ui_asset(body: CreateUIAssetRequest) -> Dict[str, Any]:
    records = _read_workspace_ui_assets()
    asset_id = _next_ui_asset_id()
    record = {
        "asset_id": asset_id,
        "name": body.name,
        "category": body.category,
        "description": body.description,
        "dimensions": body.dimensions,
        "image": "",
        "meta": {"publish_status": "draft", "asset_candidates": [], "workshop_variants": []},
    }
    records.append(record)
    _write_workspace_ui_assets(records)
    _ui_asset_folder(asset_id).mkdir(parents=True, exist_ok=True)
    return {"success": True, "asset": record}


def get_ui_asset_profile(asset_id: str) -> Dict[str, Any]:
    record = next((record for record in _read_workspace_ui_assets() if record.get("asset_id") == asset_id), None)
    if record is None:
        raise HTTPException(status_code=404, detail=f"UI asset not found: {asset_id}")
    return record


def update_ui_asset_profile(asset_id: str, body: UIAssetProfileModel) -> Dict[str, Any]:
    records = _read_workspace_ui_assets()
    target_idx = next((i for i, record in enumerate(records) if record.get("asset_id") == asset_id), None)
    if target_idx is None:
        raise HTTPException(status_code=404, detail=f"UI asset not found: {asset_id}")
    records[target_idx].update(body.model_dump(exclude_none=True))
    _write_workspace_ui_assets(records)
    return {"success": True, "profile": records[target_idx]}


def get_ui_asset_variants(asset_id: str) -> List[Dict]:
    batch = _read_ui_batch_config()
    return [{"index": i, "description": entry.get("description", ""), "output": entry.get("output", "")} for i, entry in enumerate([entry for entry in batch if entry.get("asset_id") == asset_id])]


def update_ui_asset_variant(asset_id: str, index: int, body: UpdateUIAssetVariantRequest) -> Dict[str, Any]:
    batch = _read_ui_batch_config()
    asset_indices = [i for i, entry in enumerate(batch) if entry.get("asset_id") == asset_id]
    if not asset_indices:
        raise HTTPException(status_code=404, detail=f"UI asset not found: {asset_id}")
    if index < 0 or index >= len(asset_indices):
        raise HTTPException(status_code=400, detail=f"variant_index {index} out of range.")
    batch[asset_indices[index]]["description"] = body.description
    _write_ui_batch_config(batch)
    return {"success": True}


async def regenerate_ui_asset_variants(asset_id: str, body: RegenerateUIAssetVariantsRequest) -> Dict[str, Any]:
    records = _read_workspace_ui_assets()
    record = next((record for record in records if record.get("asset_id") == asset_id), None)
    if record is None:
        raise HTTPException(status_code=404, detail=f"UI asset not found: {asset_id}")
    descriptions = _generate_ui_asset_variants_blocking(None, record.get("name", ""), record.get("category", "icon"), body.description.strip() or record.get("description", ""))
    batch = _read_ui_batch_config()
    asset_indices = [i for i, entry in enumerate(batch) if entry.get("asset_id") == asset_id]
    for variant_idx, global_idx in enumerate(asset_indices[:4]):
        if variant_idx < len(descriptions):
            batch[global_idx]["description"] = descriptions[variant_idx]
    _write_ui_batch_config(batch)
    return {"success": True, "descriptions": descriptions}


def get_ui_asset_samples(asset_id: str) -> List[Dict]:
    folder = _ui_asset_folder(asset_id)
    record = next((record for record in _read_workspace_ui_assets() if record.get("asset_id") == asset_id), None)
    selected_asset: Optional[str] = record.get("meta", {}).get("selected_asset") if record else None
    results = []
    if folder.exists():
        for img_file in sorted(folder.glob("*.png")):
            rel = img_file.relative_to(shared_ctx.SAMPLES_DIR)
            results.append({
                "filename": img_file.name,
                "url": f"/images/{rel.as_posix()}",
                "path": str(rel),
                "abs_path": str(img_file),
                "is_current_in_game": False,
                "is_selected": selected_asset is not None and str(img_file) == selected_asset,
            })
    return results


def select_ui_asset_image(asset_id: str, body: SelectUIAssetImageRequest) -> Dict[str, Any]:
    image_path = Path(body.image_path)
    if not image_path.exists():
        raise HTTPException(status_code=404, detail=f"Image file not found: {body.image_path}")
    records = _read_workspace_ui_assets()
    target_idx = next((i for i, record in enumerate(records) if record.get("asset_id") == asset_id), None)
    if target_idx is None:
        raise HTTPException(status_code=404, detail=f"UI asset not found: {asset_id}")
    records[target_idx].setdefault("meta", {})["selected_asset"] = str(image_path)
    records[target_idx]["meta"]["updated_at"] = datetime.utcnow().isoformat() + "Z"
    _write_workspace_ui_assets(records)
    return {"success": True, "selected_image": str(image_path)}


def deploy_ui_asset(asset_id: str) -> Dict[str, Any]:
    records = _read_workspace_ui_assets()
    target_idx = next((i for i, record in enumerate(records) if record.get("asset_id") == asset_id), None)
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
            shared_ctx.UI_ASSETS_SRC_DIR.mkdir(parents=True, exist_ok=True)
            shared_ctx.UI_ASSETS_PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
            shutil.copy2(str(selected_file), str(shared_ctx.UI_ASSETS_SRC_DIR / img_filename))
            shutil.copy2(str(selected_file), str(shared_ctx.UI_ASSETS_PUBLIC_DIR / img_filename))
            record["image"] = f"/assets/ui/generated/{img_filename}"
            image_copied = True
            image_source_filename = img_filename
        meta.pop("selected_asset", None)
    meta["publish_status"] = "published"
    meta["updated_at"] = datetime.utcnow().isoformat() + "Z"
    records[target_idx] = record
    _write_workspace_ui_assets(records)
    return {"success": True, "asset_id": asset_id, "image_copied": image_copied, "image_source_filename": image_source_filename}


async def generate_ui_asset_images(body: GenerateRequest):
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY environment variable is not set.")

    async def event_stream():
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        loop = asyncio.get_running_loop()
        count = max(1, body.count)
        timestamp = int(time.time())
        folder = _ui_asset_folder(body.name)
        folder.mkdir(parents=True, exist_ok=True)
        record = next((record for record in _read_workspace_ui_assets() if record.get("asset_id") == body.name), None)
        if record is None:
            raise HTTPException(status_code=404, detail=f"UI asset not found: {body.name}")
        prompt = _build_ui_prompt(body.description, record.get("category", "icon"))
        generated_images = []
        for i in range(1, count + 1):
            yield f"data: {json.dumps({'type': 'progress', 'message': f'Generating UI asset image {i} of {count}…', 'current': i, 'total': count})}\n\n"
            output_path = folder / f"{body.name}_{timestamp}_{i}.png"
            try:
                saved_path = await loop.run_in_executor(None, _generate_ui_asset_image, client, prompt, output_path, record.get("dimensions", "1024x1024"))
                rel_path = saved_path.relative_to(shared_ctx.SAMPLES_DIR)
                generated_images.append({"path": str(rel_path), "url": f"/images/{rel_path.as_posix()}"})
            except Exception as exc:
                yield f"data: {json.dumps({'type': 'error', 'message': f'Failed to generate image {i}: {exc}', 'current': i, 'total': count})}\n\n"
        shared_ctx._append_history({"timestamp": datetime.utcnow().isoformat() + "Z", "name": body.name, "asset_type": "ui", "images": generated_images})
        yield f"data: {json.dumps({'type': 'done', 'images': generated_images})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


def get_free_gen_samples() -> List[Dict]:
    folder = _free_gen_folder()
    results = []
    if folder.exists():
        for img_file in sorted(folder.glob("*.png"), key=lambda path: path.stat().st_mtime, reverse=True):
            rel = img_file.relative_to(shared_ctx.SAMPLES_DIR)
            results.append({"filename": img_file.name, "url": f"/images/{rel.as_posix()}", "path": str(rel), "abs_path": str(img_file), "is_current_in_game": False, "is_selected": False})
    return results


async def generate_free_gen_images(body: FreeGenRequest):
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY environment variable is not set.")
    if not body.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt must not be empty.")

    async def event_stream():
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        loop = asyncio.get_running_loop()
        count = body.count if body.count in {1, 2, 4} else 1
        timestamp = int(time.time())
        folder = _free_gen_folder()
        folder.mkdir(parents=True, exist_ok=True)
        generated_images = []
        for i in range(1, count + 1):
            yield f"data: {json.dumps({'type': 'progress', 'message': f'Generating free image {i} of {count}…', 'current': i, 'total': count})}\n\n"
            output_path = folder / f"free_gen_{timestamp}_{i}.png"
            try:
                saved_path = await loop.run_in_executor(None, _generate_free_gen_image, client, body.prompt, output_path, body.size, body.background, body.quality)
                rel_path = saved_path.relative_to(shared_ctx.SAMPLES_DIR)
                generated_images.append({"filename": saved_path.name, "path": str(rel_path), "url": f"/images/{rel_path.as_posix()}", "abs_path": str(saved_path), "is_current_in_game": False, "is_selected": False})
            except Exception as exc:
                yield f"data: {json.dumps({'type': 'error', 'message': f'Failed to generate image {i}: {exc}', 'current': i, 'total': count})}\n\n"
        shared_ctx._append_history({
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "name": "free-gen",
            "asset_type": "free-gen",
            "prompt": body.prompt,
            "size": body.size,
            "background": body.background,
            "quality": body.quality,
            "images": [{"path": image["path"], "url": image["url"]} for image in generated_images],
        })
        yield f"data: {json.dumps({'type': 'done', 'images': generated_images})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")