from typing import Any, Dict, List

from fastapi import APIRouter

from services.scenes import (
    CreateLocationRequest,
    RegenerateSceneVariantsRequest,
    SceneGeneratePromptsRequest,
    SceneGenerateRequest,
    SelectBackdropRequest,
    SelectSceneIconRequest,
    UpdateSceneRequest,
    UpdateSceneVariantRequest,
    create_location as create_location_service,
    delete_scene as delete_scene_service,
    deploy_scene_icon as deploy_scene_icon_service,
    generate_scene_images as generate_scene_images_service,
    generate_scene_prompts as generate_scene_prompts_service,
    get_scene as get_scene_service,
    get_scene_samples as get_scene_samples_service,
    get_scenes as get_scenes_service,
    regenerate_scene_backdrop_variants as regenerate_scene_backdrop_variants_service,
    regenerate_scene_icon_variants as regenerate_scene_icon_variants_service,
    select_scene_backdrop as select_scene_backdrop_service,
    select_scene_icon as select_scene_icon_service,
    update_scene as update_scene_service,
    update_scene_backdrop_variant as update_scene_backdrop_variant_service,
    update_scene_icon_variant as update_scene_icon_variant_service,
)

router = APIRouter()


@router.get("/api/scenes")
def get_scenes() -> Dict[str, Any]:
    return get_scenes_service()


@router.get("/api/scenes/{scene_id}")
def get_scene(scene_id: str) -> Dict[str, Any]:
    return get_scene_service(scene_id)


@router.put("/api/scenes/{scene_id}")
def update_scene_route(scene_id: str, body: UpdateSceneRequest) -> Dict[str, Any]:
    return update_scene_service(scene_id, body)


@router.post("/api/maps/{map_id}/locations")
def create_location_route(map_id: str, body: CreateLocationRequest) -> Dict[str, Any]:
    return create_location_service(map_id, body)


@router.delete("/api/scenes/{scene_id}")
def delete_scene(scene_id: str) -> Dict[str, Any]:
    return delete_scene_service(scene_id)


@router.get("/api/scene-samples/{scene_id}")
def get_scene_samples(scene_id: str, image_type: str = "icon") -> List[Dict]:
    return get_scene_samples_service(scene_id, image_type)


@router.post("/api/scenes/{scene_id}/select-icon")
def select_scene_icon_route(scene_id: str, body: SelectSceneIconRequest) -> Dict[str, Any]:
    return select_scene_icon_service(scene_id, body)


@router.post("/api/scenes/{scene_id}/select-backdrop")
def select_scene_backdrop_route(scene_id: str, body: SelectBackdropRequest) -> Dict[str, Any]:
    return select_scene_backdrop_service(scene_id, body)


@router.post("/api/scene-generate")
async def generate_scene_images_route(body: SceneGenerateRequest):
    return await generate_scene_images_service(body)


@router.post("/api/scenes/{scene_id}/deploy")
def deploy_scene_icon(scene_id: str, image_type: str = "icon") -> Dict[str, Any]:
    return deploy_scene_icon_service(scene_id, image_type)


@router.post("/api/scene-generate-prompts")
async def generate_scene_prompts_route(body: SceneGeneratePromptsRequest) -> Dict[str, Any]:
    return await generate_scene_prompts_service(body)


@router.put("/api/scenes/{scene_id}/icon-variants/{variant_index}")
def update_scene_icon_variant_route(scene_id: str, variant_index: int, body: UpdateSceneVariantRequest) -> Dict[str, Any]:
    return update_scene_icon_variant_service(scene_id, variant_index, body)


@router.put("/api/scenes/{scene_id}/backdrop-variants/{variant_index}")
def update_scene_backdrop_variant_route(scene_id: str, variant_index: int, body: UpdateSceneVariantRequest) -> Dict[str, Any]:
    return update_scene_backdrop_variant_service(scene_id, variant_index, body)


@router.post("/api/scenes/{scene_id}/regenerate-icon-variants")
async def regenerate_scene_icon_variants_route(scene_id: str, body: RegenerateSceneVariantsRequest) -> Dict[str, Any]:
    return await regenerate_scene_icon_variants_service(scene_id, body)


@router.post("/api/scenes/{scene_id}/regenerate-backdrop-variants")
async def regenerate_scene_backdrop_variants_route(scene_id: str, body: RegenerateSceneVariantsRequest) -> Dict[str, Any]:
    return await regenerate_scene_backdrop_variants_service(scene_id, body)
