from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class TemplatesModel(BaseModel):
    style_base: str
    no_text_constraint: str
    style_negative: str
    portrait_template: str
    item_template: str
    scene_template: str


class GenerateRequest(BaseModel):
    asset_type: str
    name: str
    description: str
    count: int = 1


class FreeGenRequest(BaseModel):
    prompt: str
    size: str = "1024x1024"
    background: str = "auto"
    quality: str = "high"
    count: int = 1


class UpdateVariantRequest(BaseModel):
    variant_index: int
    description: str


class GenerateDescriptionRequest(BaseModel):
    name: str
    bio: str = ""
    variant_index: Optional[int] = None


class CreateCharacterRequest(BaseModel):
    name: str
    bio: str = ""


class CharacterAttributesModel(BaseModel):
    physique: int = 5
    charm: int = 5
    wisdom: int = 5
    combat: int = 5
    social: int = 5
    survival: int = 5
    stealth: int = 5
    magic: int = 5


class CharacterProfileModel(BaseModel):
    description: Optional[str] = None
    rarity: Optional[str] = None
    attributes: Optional[Dict[str, int]] = None
    special_attributes: Optional[Dict[str, int]] = None
    tags: Optional[List[str]] = None
    equipment_slots: Optional[int] = None


class SelectPortraitRequest(BaseModel):
    portrait_path: str


class RegenerateVariantsRequest(BaseModel):
    bio: str = ""


class CreateItemRequest(BaseModel):
    name: str
    bio: str = ""
    equipment_type: str = "weapon"
    rarity: str = "common"


class UpdateItemVariantRequest(BaseModel):
    variant_index: int
    description: str


class RegenerateItemVariantsRequest(BaseModel):
    bio: str = ""


class ItemProfileModel(BaseModel):
    type: Optional[str] = None
    equipment_type: Optional[str] = None
    rarity: Optional[str] = None
    description: Optional[str] = None
    lore: Optional[str] = None
    attribute_bonus: Optional[Dict[str, int]] = None
    special_bonus: Optional[Dict[str, int]] = None
    gem_slots: Optional[int] = None
    tags: Optional[List[str]] = None


class SelectItemImageRequest(BaseModel):
    image_path: str


class ItemPromptConfigModel(BaseModel):
    variant_system_prompt: str
    style_template: str
    rarity_palettes: Dict[str, str]


class LocationPosition(BaseModel):
    x: float
    y: float


class UpdateSceneRequest(BaseModel):
    description: Optional[str] = None
    icon_prompt: Optional[str] = None
    name: Optional[str] = None
    backdrop_prompt: Optional[str] = None
    position: Optional[LocationPosition] = None
    scene_ids: Optional[List[str]] = None
    unlock_conditions: Optional[Dict[str, Any]] = None


class SelectSceneIconRequest(BaseModel):
    image_path: str


class SelectBackdropRequest(BaseModel):
    image_path: str


class CreateLocationRequest(BaseModel):
    location_id: str
    name: str
    description: str = ""
    type: str = ""
    position: Optional[LocationPosition] = None
    scene_ids: List[str] = []
    unlock_conditions: Dict[str, Any] = {}
    icon_prompt: str = ""
    backdrop_prompt: str = ""


class SceneGenerateRequest(BaseModel):
    location_id: str
    icon_prompt: str
    count: int = 1
    image_type: str = "icon"


class SceneGeneratePromptsRequest(BaseModel):
    location_id: str
    image_type: str = "icon"


class UpdateSceneVariantRequest(BaseModel):
    description: str


class RegenerateSceneVariantsRequest(BaseModel):
    bio: str = ""


class CreateUIAssetRequest(BaseModel):
    name: str
    category: str = "icon"
    description: str = ""
    dimensions: str = "1024x1024"


class UpdateUIAssetVariantRequest(BaseModel):
    variant_index: int
    description: str


class RegenerateUIAssetVariantsRequest(BaseModel):
    description: str = ""


class UIAssetProfileModel(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    dimensions: Optional[str] = None
    image: Optional[str] = None
    tags: Optional[List[str]] = None


class SelectUIAssetImageRequest(BaseModel):
    image_path: str