from typing import Any, Dict, List

from fastapi import APIRouter

from services.items import (
    CreateItemRequest,
    GenerateRequest,
    ItemProfileModel,
    ItemPromptConfigModel,
    RegenerateItemVariantsRequest,
    SelectItemImageRequest,
    UpdateItemVariantRequest,
    archive_item as archive_item_service,
    create_item as create_item_service,
    deploy_item as deploy_item_service,
    generate_item_images as generate_item_images_service,
    generate_item_profile as generate_item_profile_service,
    get_item_profile as get_item_profile_service,
    get_item_prompt_config as get_item_prompt_config_service,
    get_item_samples as get_item_samples_service,
    get_item_variants as get_item_variants_service,
    get_items as get_items_service,
    item_deploy_preview as item_deploy_preview_service,
    regenerate_item_variants as regenerate_item_variants_service,
    reset_item_prompt_config as reset_item_prompt_config_service,
    select_item_image as select_item_image_service,
    update_item_profile as update_item_profile_service,
    update_item_prompt_config as update_item_prompt_config_service,
    update_item_variant as update_item_variant_service,
)

router = APIRouter()


@router.get("/api/items")
def get_items() -> List[Dict]:
    return get_items_service()


@router.post("/api/items")
async def create_item_route(body: CreateItemRequest) -> Dict[str, Any]:
    return await create_item_service(body)


@router.get("/api/items/{item_name}/variants")
def get_item_variants(item_name: str) -> List[Dict]:
    return get_item_variants_service(item_name)


@router.put("/api/items/{item_name}/variants/{index}")
def update_item_variant_route(item_name: str, index: int, body: UpdateItemVariantRequest) -> Dict[str, Any]:
    return update_item_variant_service(item_name, index, body)


@router.post("/api/items/{item_name}/regenerate-variants")
async def regenerate_item_variants_route(item_name: str, body: RegenerateItemVariantsRequest) -> Dict[str, Any]:
    return await regenerate_item_variants_service(item_name, body)


@router.get("/api/items/{item_name}/profile")
def get_item_profile(item_name: str) -> Dict[str, Any]:
    return get_item_profile_service(item_name)


@router.put("/api/items/{item_name}/profile")
def update_item_profile_route(item_name: str, body: ItemProfileModel) -> Dict[str, Any]:
    return update_item_profile_service(item_name, body)


@router.post("/api/items/{item_name}/generate-profile")
async def generate_item_profile(item_name: str) -> Dict[str, Any]:
    return await generate_item_profile_service(item_name)


@router.get("/api/item-samples/{item_name}")
def get_item_samples(item_name: str) -> List[Dict]:
    return get_item_samples_service(item_name)


@router.post("/api/items/{item_name}/select-image")
def select_item_image_route(item_name: str, body: SelectItemImageRequest) -> Dict[str, Any]:
    return select_item_image_service(item_name, body)


@router.get("/api/items/{item_name}/deploy-preview")
def item_deploy_preview(item_name: str) -> Dict[str, Any]:
    return item_deploy_preview_service(item_name)


@router.post("/api/items/{item_name}/deploy")
def deploy_item(item_name: str) -> Dict[str, Any]:
    return deploy_item_service(item_name)


@router.delete("/api/items/{item_name}")
def archive_item(item_name: str) -> Dict[str, Any]:
    return archive_item_service(item_name)


@router.post("/api/item-generate")
async def generate_item_images_route(body: GenerateRequest):
    return await generate_item_images_service(body)


@router.get("/api/item-prompt-config")
def get_item_prompt_config() -> Dict[str, Any]:
    return get_item_prompt_config_service()


@router.put("/api/item-prompt-config")
def update_item_prompt_config_route(body: ItemPromptConfigModel) -> Dict[str, Any]:
    return update_item_prompt_config_service(body)


@router.post("/api/item-prompt-config/reset")
def reset_item_prompt_config() -> Dict[str, Any]:
    return reset_item_prompt_config_service()
