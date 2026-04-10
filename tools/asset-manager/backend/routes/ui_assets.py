from typing import Any, Dict, List

from fastapi import APIRouter

from services.ui_assets import (
    CreateUIAssetRequest,
    GenerateRequest,
    RegenerateUIAssetVariantsRequest,
    SelectUIAssetImageRequest,
    UIAssetProfileModel,
    UpdateUIAssetVariantRequest,
    create_ui_asset as create_ui_asset_service,
    deploy_ui_asset as deploy_ui_asset_service,
    generate_ui_asset_images as generate_ui_asset_images_service,
    get_ui_asset_profile as get_ui_asset_profile_service,
    get_ui_asset_samples as get_ui_asset_samples_service,
    get_ui_asset_variants as get_ui_asset_variants_service,
    get_ui_assets as get_ui_assets_service,
    regenerate_ui_asset_variants as regenerate_ui_asset_variants_service,
    select_ui_asset_image as select_ui_asset_image_service,
    update_ui_asset_profile as update_ui_asset_profile_service,
    update_ui_asset_variant as update_ui_asset_variant_service,
)

router = APIRouter()


@router.get("/api/ui-assets")
def get_ui_assets() -> List[Dict]:
    return get_ui_assets_service()


@router.post("/api/ui-assets")
async def create_ui_asset_route(body: CreateUIAssetRequest) -> Dict[str, Any]:
    return await create_ui_asset_service(body)


@router.get("/api/ui-assets/{asset_id}/profile")
def get_ui_asset_profile(asset_id: str) -> Dict[str, Any]:
    return get_ui_asset_profile_service(asset_id)


@router.put("/api/ui-assets/{asset_id}/profile")
def update_ui_asset_profile_route(asset_id: str, body: UIAssetProfileModel) -> Dict[str, Any]:
    return update_ui_asset_profile_service(asset_id, body)


@router.get("/api/ui-assets/{asset_id}/variants")
def get_ui_asset_variants(asset_id: str) -> List[Dict]:
    return get_ui_asset_variants_service(asset_id)


@router.put("/api/ui-assets/{asset_id}/variants/{index}")
def update_ui_asset_variant_route(asset_id: str, index: int, body: UpdateUIAssetVariantRequest) -> Dict[str, Any]:
    return update_ui_asset_variant_service(asset_id, index, body)


@router.post("/api/ui-assets/{asset_id}/regenerate-variants")
async def regenerate_ui_asset_variants_route(asset_id: str, body: RegenerateUIAssetVariantsRequest) -> Dict[str, Any]:
    return await regenerate_ui_asset_variants_service(asset_id, body)


@router.get("/api/ui-asset-samples/{asset_id}")
def get_ui_asset_samples(asset_id: str) -> List[Dict]:
    return get_ui_asset_samples_service(asset_id)


@router.post("/api/ui-assets/{asset_id}/select-image")
def select_ui_asset_image_route(asset_id: str, body: SelectUIAssetImageRequest) -> Dict[str, Any]:
    return select_ui_asset_image_service(asset_id, body)


@router.post("/api/ui-assets/{asset_id}/deploy")
def deploy_ui_asset(asset_id: str) -> Dict[str, Any]:
    return deploy_ui_asset_service(asset_id)


@router.post("/api/ui-generate")
async def generate_ui_asset_images_route(body: GenerateRequest):
    return await generate_ui_asset_images_service(body)
