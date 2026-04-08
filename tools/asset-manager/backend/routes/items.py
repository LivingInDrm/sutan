from typing import Any, Dict, List

from fastapi import APIRouter

import shared

router = APIRouter()


@router.get("/api/items")
def get_items() -> List[Dict]:
    return shared.get_items()


@router.post("/api/items")
async def create_item(body: shared.CreateItemRequest) -> Dict[str, Any]:
    return await shared.create_item(body)


@router.get("/api/items/{item_name}/variants")
def get_item_variants(item_name: str) -> List[Dict]:
    return shared.get_item_variants(item_name)


@router.put("/api/items/{item_name}/variants/{index}")
def update_item_variant(item_name: str, index: int, body: shared.UpdateItemVariantRequest) -> Dict[str, Any]:
    return shared.update_item_variant(item_name, index, body)


@router.post("/api/items/{item_name}/regenerate-variants")
async def regenerate_item_variants(item_name: str, body: shared.RegenerateItemVariantsRequest) -> Dict[str, Any]:
    return await shared.regenerate_item_variants(item_name, body)


@router.get("/api/items/{item_name}/profile")
def get_item_profile(item_name: str) -> Dict[str, Any]:
    return shared.get_item_profile(item_name)


@router.put("/api/items/{item_name}/profile")
def update_item_profile(item_name: str, body: shared.ItemProfileModel) -> Dict[str, Any]:
    return shared.update_item_profile(item_name, body)


@router.post("/api/items/{item_name}/generate-profile")
async def generate_item_profile(item_name: str) -> Dict[str, Any]:
    return await shared.generate_item_profile(item_name)


@router.get("/api/item-samples/{item_name}")
def get_item_samples(item_name: str) -> List[Dict]:
    return shared.get_item_samples(item_name)


@router.post("/api/items/{item_name}/select-image")
def select_item_image(item_name: str, body: shared.SelectItemImageRequest) -> Dict[str, Any]:
    return shared.select_item_image(item_name, body)


@router.get("/api/items/{item_name}/deploy-preview")
def item_deploy_preview(item_name: str) -> Dict[str, Any]:
    return shared.item_deploy_preview(item_name)


@router.post("/api/items/{item_name}/deploy")
def deploy_item(item_name: str) -> Dict[str, Any]:
    return shared.deploy_item(item_name)


@router.delete("/api/items/{item_name}")
def archive_item(item_name: str) -> Dict[str, Any]:
    return shared.archive_item(item_name)


@router.post("/api/item-generate")
async def generate_item_images(body: shared.GenerateRequest):
    return await shared.generate_item_images(body)


@router.get("/api/item-prompt-config")
def get_item_prompt_config() -> Dict[str, Any]:
    return shared.get_item_prompt_config()


@router.put("/api/item-prompt-config")
def update_item_prompt_config(body: shared.ItemPromptConfigModel) -> Dict[str, Any]:
    return shared.update_item_prompt_config(body)


@router.post("/api/item-prompt-config/reset")
def reset_item_prompt_config() -> Dict[str, Any]:
    return shared.reset_item_prompt_config()
