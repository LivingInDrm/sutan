from typing import Any, Dict, List

from fastapi import APIRouter

import shared

router = APIRouter()


@router.get("/api/characters")
def get_characters() -> List[Dict]:
    return shared.get_characters()


@router.get("/api/samples/{character_name}")
def get_samples(character_name: str) -> List[Dict]:
    return shared.get_samples(character_name)


@router.post("/api/characters/{character_name}/select-portrait")
def select_portrait(character_name: str, body: shared.SelectPortraitRequest) -> Dict[str, Any]:
    return shared.select_portrait(character_name, body)


@router.put("/api/characters/{character_name}")
def update_character(character_name: str, body: shared.UpdateVariantRequest) -> Dict[str, Any]:
    return shared.update_character(character_name, body)


@router.post("/api/generate-description")
async def generate_description(body: shared.GenerateDescriptionRequest) -> Dict[str, Any]:
    return await shared.generate_description(body)


@router.post("/api/characters")
async def create_character(body: shared.CreateCharacterRequest) -> Dict[str, Any]:
    return await shared.create_character(body)


@router.get("/api/characters/{character_name}/profile")
def get_character_profile(character_name: str) -> Dict[str, Any]:
    return shared.get_character_profile(character_name)


@router.put("/api/characters/{character_name}/profile")
def update_character_profile(character_name: str, body: shared.CharacterProfileModel) -> Dict[str, Any]:
    return shared.update_character_profile(character_name, body)


@router.post("/api/characters/{character_name}/generate-profile")
async def generate_character_profile(character_name: str) -> Dict[str, Any]:
    return await shared.generate_character_profile(character_name)


@router.post("/api/characters/{character_name}/deploy")
def deploy_character(character_name: str) -> Dict[str, Any]:
    return shared.deploy_character(character_name)


@router.get("/api/characters/{character_name}/deploy-preview")
def character_deploy_preview(character_name: str) -> Dict[str, Any]:
    return shared.character_deploy_preview(character_name)


@router.post("/api/characters/{character_name}/regenerate-variants")
async def regenerate_variants(character_name: str, body: shared.RegenerateVariantsRequest) -> Dict[str, Any]:
    return await shared.regenerate_variants(character_name, body)


@router.delete("/api/characters/{character_name}")
def archive_character(character_name: str) -> Dict[str, Any]:
    return shared.archive_character(character_name)
