from typing import Any, Dict, List

from fastapi import APIRouter

from services.characters import (
    CharacterProfileModel,
    CreateCharacterRequest,
    GenerateDescriptionRequest,
    RegenerateVariantsRequest,
    SelectPortraitRequest,
    UpdateVariantRequest,
    archive_character as archive_character_service,
    character_deploy_preview as character_deploy_preview_service,
    create_character as create_character_service,
    deploy_character as deploy_character_service,
    generate_character_profile as generate_character_profile_service,
    generate_description as generate_description_service,
    get_character_profile as get_character_profile_service,
    get_characters as get_characters_service,
    get_samples as get_samples_service,
    regenerate_variants as regenerate_variants_service,
    select_portrait as select_portrait_service,
    update_character_profile as update_character_profile_service,
    update_character_variant as update_character_variant_service,
)

router = APIRouter()


@router.get("/api/characters")
def get_characters() -> List[Dict]:
    return get_characters_service()


@router.get("/api/samples/{character_name}")
def get_samples(character_name: str) -> List[Dict]:
    return get_samples_service(character_name)


@router.post("/api/characters/{character_name}/select-portrait")
def select_portrait_route(character_name: str, body: SelectPortraitRequest) -> Dict[str, Any]:
    return select_portrait_service(character_name, body)


@router.put("/api/characters/{character_name}")
def update_character(character_name: str, body: UpdateVariantRequest) -> Dict[str, Any]:
    return update_character_variant_service(character_name, body)


@router.post("/api/generate-description")
async def generate_description_route(body: GenerateDescriptionRequest) -> Dict[str, Any]:
    return await generate_description_service(body)


@router.post("/api/characters")
async def create_character_route(body: CreateCharacterRequest) -> Dict[str, Any]:
    return await create_character_service(body)


@router.get("/api/characters/{character_name}/profile")
def get_character_profile(character_name: str) -> Dict[str, Any]:
    return get_character_profile_service(character_name)


@router.put("/api/characters/{character_name}/profile")
def update_character_profile_route(character_name: str, body: CharacterProfileModel) -> Dict[str, Any]:
    return update_character_profile_service(character_name, body)


@router.post("/api/characters/{character_name}/generate-profile")
async def generate_character_profile(character_name: str) -> Dict[str, Any]:
    return await generate_character_profile_service(character_name)


@router.post("/api/characters/{character_name}/deploy")
def deploy_character(character_name: str) -> Dict[str, Any]:
    return deploy_character_service(character_name)


@router.get("/api/characters/{character_name}/deploy-preview")
def character_deploy_preview(character_name: str) -> Dict[str, Any]:
    return character_deploy_preview_service(character_name)


@router.post("/api/characters/{character_name}/regenerate-variants")
async def regenerate_variants_route(character_name: str, body: RegenerateVariantsRequest) -> Dict[str, Any]:
    return await regenerate_variants_service(character_name, body)


@router.delete("/api/characters/{character_name}")
def archive_character(character_name: str) -> Dict[str, Any]:
    return archive_character_service(character_name)
