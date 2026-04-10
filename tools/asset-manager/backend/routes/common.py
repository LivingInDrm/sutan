from fastapi import APIRouter

from shared import (
    FreeGenRequest,
    GenerateRequest,
    TemplatesModel,
    get_history as get_history_service,
    get_templates as get_templates_service,
    health as health_service,
    update_templates as update_templates_service,
)
from services.characters import generate_images as generate_images_service
from services.ui_assets import (
    generate_free_gen_images as generate_free_gen_images_service,
    get_free_gen_samples as get_free_gen_samples_service,
)

router = APIRouter()


@router.get("/api/templates")
def get_templates():
    return get_templates_service()


@router.put("/api/templates")
def update_templates_route(body: TemplatesModel):
    return update_templates_service(body)


@router.post("/api/generate")
async def generate(body: GenerateRequest):
    return await generate_images_service(body)


@router.get("/api/free-gen-samples")
def get_free_gen_samples():
    return get_free_gen_samples_service()


@router.post("/api/free-generate")
async def generate_free(body: FreeGenRequest):
    return await generate_free_gen_images_service(body)


@router.get("/api/history")
def get_history():
    return get_history_service()


@router.get("/api/health")
def health_check():
    return health_service()
