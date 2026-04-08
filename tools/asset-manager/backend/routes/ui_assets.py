from typing import Any, Dict, List

from fastapi import APIRouter

import shared

router = APIRouter()


@router.get("/api/ui-assets")
def get_ui_assets() -> List[Dict]:
    return shared.get_ui_assets()


@router.post("/api/ui-assets")
async def create_ui_asset(body: shared.CreateUIAssetRequest) -> Dict[str, Any]:
    return await shared.create_ui_asset(body)


@router.get("/api/ui-assets/{asset_id}/profile")
def get_ui_asset_profile(asset_id: str) -> Dict[str, Any]:
    return shared.get_ui_asset_profile(asset_id)


@router.put("/api/ui-assets/{asset_id}/profile")
def update_ui_asset_profile(asset_id: str, body: shared.UIAssetProfileModel) -> Dict[str, Any]:
    return shared.update_ui_asset_profile(asset_id, body)


@router.get("/api/ui-assets/{asset_id}/variants")
def get_ui_asset_variants(asset_id: str) -> List[Dict]:
    return shared.get_ui_asset_variants(asset_id)


@router.put("/api/ui-assets/{asset_id}/variants/{index}")
def update_ui_asset_variant(asset_id: str, index: int, body: shared.UpdateUIAssetVariantRequest) -> Dict[str, Any]:
    return shared.update_ui_asset_variant(asset_id, index, body)


@router.post("/api/ui-assets/{asset_id}/regenerate-variants")
async def regenerate_ui_asset_variants(asset_id: str, body: shared.RegenerateUIAssetVariantsRequest) -> Dict[str, Any]:
    return await shared.regenerate_ui_asset_variants(asset_id, body)


@router.get("/api/ui-asset-samples/{asset_id}")
def get_ui_asset_samples(asset_id: str) -> List[Dict]:
    return shared.get_ui_asset_samples(asset_id)


@router.post("/api/ui-assets/{asset_id}/select-image")
def select_ui_asset_image(asset_id: str, body: shared.SelectUIAssetImageRequest) -> Dict[str, Any]:
    return shared.select_ui_asset_image(asset_id, body)


@router.post("/api/ui-assets/{asset_id}/deploy")
def deploy_ui_asset(asset_id: str) -> Dict[str, Any]:
    return shared.deploy_ui_asset(asset_id)


@router.post("/api/ui-generate")
async def generate_ui_asset_images(body: shared.GenerateRequest):
    return await shared.generate_ui_asset_images(body)
