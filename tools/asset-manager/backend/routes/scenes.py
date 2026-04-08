from typing import Any, Dict, List

from fastapi import APIRouter

import shared

router = APIRouter()


@router.get("/api/scenes")
def get_scenes() -> Dict[str, Any]:
    return shared.get_scenes()


@router.get("/api/scenes/{scene_id}")
def get_scene(scene_id: str) -> Dict[str, Any]:
    return shared.get_scene(scene_id)


@router.put("/api/scenes/{scene_id}")
def update_scene(scene_id: str, body: shared.UpdateSceneRequest) -> Dict[str, Any]:
    return shared.update_scene(scene_id, body)


@router.post("/api/maps/{map_id}/locations")
def create_location(map_id: str, body: shared.CreateLocationRequest) -> Dict[str, Any]:
    return shared.create_location(map_id, body)


@router.delete("/api/scenes/{scene_id}")
def delete_scene(scene_id: str) -> Dict[str, Any]:
    return shared.delete_scene(scene_id)


@router.get("/api/scene-samples/{scene_id}")
def get_scene_samples(scene_id: str, image_type: str = "icon") -> List[Dict]:
    return shared.get_scene_samples(scene_id, image_type)


@router.post("/api/scenes/{scene_id}/select-icon")
def select_scene_icon(scene_id: str, body: shared.SelectSceneIconRequest) -> Dict[str, Any]:
    return shared.select_scene_icon(scene_id, body)


@router.post("/api/scenes/{scene_id}/select-backdrop")
def select_scene_backdrop(scene_id: str, body: shared.SelectBackdropRequest) -> Dict[str, Any]:
    return shared.select_scene_backdrop(scene_id, body)


@router.post("/api/scene-generate")
async def generate_scene_images(body: shared.SceneGenerateRequest):
    return await shared.generate_scene_images(body)


@router.post("/api/scenes/{scene_id}/deploy")
def deploy_scene_icon(scene_id: str, image_type: str = "icon") -> Dict[str, Any]:
    return shared.deploy_scene_icon(scene_id, image_type)


@router.post("/api/scene-generate-prompts")
async def generate_scene_prompts(body: shared.SceneGeneratePromptsRequest) -> Dict[str, Any]:
    return await shared.generate_scene_prompts(body)


@router.put("/api/scenes/{scene_id}/icon-variants/{variant_index}")
def update_scene_icon_variant(scene_id: str, variant_index: int, body: shared.UpdateSceneVariantRequest) -> Dict[str, Any]:
    return shared.update_scene_icon_variant(scene_id, variant_index, body)


@router.put("/api/scenes/{scene_id}/backdrop-variants/{variant_index}")
def update_scene_backdrop_variant(scene_id: str, variant_index: int, body: shared.UpdateSceneVariantRequest) -> Dict[str, Any]:
    return shared.update_scene_backdrop_variant(scene_id, variant_index, body)


@router.post("/api/scenes/{scene_id}/regenerate-icon-variants")
async def regenerate_scene_icon_variants(scene_id: str, body: shared.RegenerateSceneVariantsRequest) -> Dict[str, Any]:
    return await shared.regenerate_scene_icon_variants(scene_id, body)


@router.post("/api/scenes/{scene_id}/regenerate-backdrop-variants")
async def regenerate_scene_backdrop_variants(scene_id: str, body: shared.RegenerateSceneVariantsRequest) -> Dict[str, Any]:
    return await shared.regenerate_scene_backdrop_variants(scene_id, body)
