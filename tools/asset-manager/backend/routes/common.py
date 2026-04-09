from fastapi import APIRouter

import shared

router = APIRouter()


@router.get("/api/templates")
def get_templates():
    return shared.get_templates()


@router.put("/api/templates")
def update_templates(body: shared.TemplatesModel):
    return shared.update_templates(body)


@router.post("/api/generate")
async def generate(body: shared.GenerateRequest):
    return await shared.generate_images(body)


@router.get("/api/free-gen-samples")
def get_free_gen_samples():
    return shared.get_free_gen_samples()


@router.post("/api/free-generate")
async def generate_free(body: shared.FreeGenRequest):
    return await shared.generate_free_gen_images(body)


@router.get("/api/history")
def get_history():
    return shared.get_history()


@router.get("/api/health")
def health_check():
    return shared.health_check()
