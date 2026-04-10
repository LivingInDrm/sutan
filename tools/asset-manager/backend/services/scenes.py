import base64
import json
import os
import shutil
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import shared as shared_ctx
from fastapi import HTTPException

from models.types import (
    CreateLocationRequest,
    RegenerateSceneVariantsRequest,
    SceneGeneratePromptsRequest,
    SceneGenerateRequest,
    SelectBackdropRequest,
    SelectSceneIconRequest,
    UpdateSceneRequest,
    UpdateSceneVariantRequest,
)


def _read_workspace_locations_data() -> List[Dict]:
    path = shared_ctx.LOCATIONS_WORKSPACE_PATH
    if not path.exists():
        return []
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []


def _write_workspace_locations_data(records: List[Dict]) -> None:
    shared_ctx.MAPS_WORKSPACE_DIR.mkdir(parents=True, exist_ok=True)
    shared_ctx.LOCATIONS_WORKSPACE_PATH.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")


def _read_workspace_maps_data() -> List[Dict]:
    path = shared_ctx.MAPS_WORKSPACE_DATA_PATH
    if not path.exists():
        return []
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []


def _write_workspace_maps_data(records: List[Dict]) -> None:
    shared_ctx.MAPS_WORKSPACE_DIR.mkdir(parents=True, exist_ok=True)
    shared_ctx.MAPS_WORKSPACE_DATA_PATH.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")


def _read_location_profiles() -> Dict[str, Any]:
    ws_locs = _read_workspace_locations_data()
    ws_maps = _read_workspace_maps_data()
    locs_by_map: Dict[str, List[Dict]] = {}
    for loc in ws_locs:
        locs_by_map.setdefault(loc.get("map_id", ""), []).append(loc)
    pos_by_map: Dict[str, Dict[str, Dict]] = {}
    for ws_map in ws_maps:
        pos_by_map[ws_map.get("map_id", "")] = {
            ref.get("location_id", ""): ref.get("position", {"x": 0.5, "y": 0.5})
            for ref in ws_map.get("location_refs", [])
        }
    result: Dict[str, Any] = {"maps": {}}
    for ws_map in ws_maps:
        map_id = ws_map.get("map_id", "")
        loc_by_id = {loc.get("location_id", ""): loc for loc in locs_by_map.get(map_id, [])}
        full_locs = []
        loc_order = [ref.get("location_id") for ref in ws_map.get("location_refs", [])]
        for loc_id in loc_order:
            loc = loc_by_id.get(loc_id)
            if loc is None:
                continue
            full_loc = dict(loc)
            full_loc["position"] = pos_by_map.get(map_id, {}).get(loc_id, {"x": 0.5, "y": 0.5})
            full_locs.append(full_loc)
        referenced_ids = set(loc_order)
        for loc in locs_by_map.get(map_id, []):
            if loc.get("location_id") not in referenced_ids:
                full_loc = dict(loc)
                full_loc["position"] = {"x": 0.5, "y": 0.5}
                full_locs.append(full_loc)
        result["maps"][map_id] = {
            "map_id": map_id,
            "name": ws_map.get("name", map_id),
            "description": ws_map.get("description", ""),
            "public_subdir": ws_map.get("public_subdir", map_id),
            "background_image": ws_map.get("background_image", ""),
            "meta": ws_map.get("meta", {}),
            "locations": full_locs,
        }
    return result


def _write_location_profiles(data: Dict[str, Any]) -> None:
    new_locs: List[Dict] = []
    new_maps: List[Dict] = []
    for map_id, map_data in data.get("maps", {}).items():
        location_refs = [{"location_id": loc.get("location_id", ""), "position": loc.get("position", {"x": 0.5, "y": 0.5})} for loc in map_data.get("locations", [])]
        new_maps.append({
            "map_id": map_id,
            "name": map_data.get("name", map_id),
            "description": map_data.get("description", ""),
            "background_image": map_data.get("background_image", ""),
            "public_subdir": map_data.get("public_subdir", map_id),
            "location_refs": location_refs,
            "meta": map_data.get("meta", {}),
        })
        for loc in map_data.get("locations", []):
            loc_entry = {k: v for k, v in loc.items() if k != "position"}
            loc_entry["map_id"] = map_id
            new_locs.append(loc_entry)
    _write_workspace_locations_data(new_locs)
    _write_workspace_maps_data(new_maps)


def _deploy_map_to_runtime(map_id: str) -> bool:
    ws_locs = _read_workspace_locations_data()
    ws_maps = _read_workspace_maps_data()
    runtime_locs: List[Dict] = []
    published_loc_ids: set = set()
    for loc in ws_locs:
        publish_status = loc.get("meta", {}).get("publish_status", "")
        if publish_status in ("published", "ready") or not publish_status:
            runtime_locs.append({k: v for k, v in loc.items() if k not in ("meta", "map_id")})
            published_loc_ids.add(loc.get("location_id", ""))
    runtime_maps: List[Dict] = []
    for ws_map in ws_maps:
        runtime_map = {k: v for k, v in ws_map.items() if k not in ("meta", "public_subdir")}
        runtime_map["description"] = runtime_map.get("description", "")
        runtime_map["background_image"] = runtime_map.get("background_image", "")
        runtime_map["location_refs"] = [ref for ref in ws_map.get("location_refs", []) if ref.get("location_id") in published_loc_ids]
        runtime_maps.append(runtime_map)
    shared_ctx.GAME_MAPS_CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    try:
        shared_ctx.RUNTIME_LOCATIONS_PATH.parent.mkdir(parents=True, exist_ok=True)
        shared_ctx.RUNTIME_MAPS_PATH.parent.mkdir(parents=True, exist_ok=True)
        shared_ctx.RUNTIME_LOCATIONS_PATH.write_text(json.dumps(runtime_locs, ensure_ascii=False, indent=2), encoding="utf-8")
        shared_ctx.RUNTIME_MAPS_PATH.write_text(json.dumps(runtime_maps, ensure_ascii=False, indent=2), encoding="utf-8")
        return True
    except OSError:
        return False


def _scene_samples_folder(scene_id: str) -> Path:
    return shared_ctx.SAMPLES_DIR / scene_id


def _find_scene_by_id(profiles: Dict[str, Any], scene_id: str) -> Optional[Dict[str, Any]]:
    for _, map_data in profiles.get("maps", {}).items():
        for scene in map_data.get("locations", []):
            if scene.get("location_id") == scene_id:
                return scene
    return None


def _find_scene_and_map(profiles: Dict[str, Any], scene_id: str):
    for map_id, map_data in profiles.get("maps", {}).items():
        for scene in map_data.get("locations", []):
            if scene.get("location_id") == scene_id:
                return map_id, scene
    return None, None


def _location_to_api_scene(map_id: str, loc: Dict[str, Any]) -> Dict[str, Any]:
    meta = loc.get("meta", {})
    return {
        "map_id": map_id,
        "type": meta.get("type", ""),
        "description": meta.get("description", ""),
        "icon_prompt": meta.get("icon_prompt", ""),
        "icon_image": loc.get("icon_image", ""),
        "backdrop_prompt": meta.get("backdrop_prompt", ""),
        "backdrop_image": loc.get("backdrop_image", ""),
        "icon_variants": meta.get("icon_variants", []),
        "backdrop_variants": meta.get("backdrop_variants", []),
        "selected_icon": meta.get("selected_icon", ""),
        "selected_backdrop": meta.get("selected_backdrop", ""),
        "location_id": loc.get("location_id", ""),
        "name": loc.get("name", ""),
        "position": loc.get("position", {}),
        "scene_ids": loc.get("scene_ids", []),
        "unlock_conditions": loc.get("unlock_conditions", {}),
    }


def _with_scene_variants(scene: Dict[str, Any]) -> Dict[str, Any]:
    result = dict(scene)
    if not result.get("icon_variants"):
        result["icon_variants"] = [{"index": 0, "description": result.get("icon_prompt", "")}]
    if not result.get("backdrop_variants"):
        result["backdrop_variants"] = [{"index": 0, "description": result.get("backdrop_prompt", "")}]
    return result


def _build_scene_prompt(raw_prompt: str, image_type: str = "icon") -> str:
    return shared_ctx.SCENE_BACKDROP_STYLE.format(prompt=raw_prompt) if image_type == "backdrop" else shared_ctx.SCENE_ICON_STYLE.format(prompt=raw_prompt)


def _generate_scene_icon_direct(client, prompt: str, output_path: Path) -> Path:
    response = client.images.generate(model="gpt-image-1", prompt=prompt, size="1024x1024", quality="high", background="transparent", output_format="png", n=1)
    if not response.data or not response.data[0].b64_json:
        raise RuntimeError("Image generation response missing data")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(base64.b64decode(response.data[0].b64_json))
    return output_path


def _generate_scene_backdrop_direct(client, prompt: str, output_path: Path) -> Path:
    response = client.images.generate(model="gpt-image-1", prompt=prompt, size="1536x1024", quality="high", background="opaque", output_format="png", n=1)
    if not response.data or not response.data[0].b64_json:
        raise RuntimeError("Image generation response missing data")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(base64.b64decode(response.data[0].b64_json))
    return output_path


def _scene_icon_url(scene: Dict[str, Any]) -> str:
    icon_image_path = scene.get("icon_image", "")
    if not icon_image_path or not icon_image_path.startswith("/maps/"):
        return ""
    rel = icon_image_path[len("/maps/"):]
    local_file = shared_ctx.GAME_PUBLIC_MAPS_DIR / rel
    if local_file.exists():
        return f"/game-maps/{rel}?t={int(local_file.stat().st_mtime)}"
    return f"/game-maps/{rel}"


def get_scenes() -> Dict[str, Any]:
    profiles = _read_location_profiles()
    result: Dict[str, Any] = {"maps": {}}
    for map_id, map_data in profiles.get("maps", {}).items():
        result["maps"][map_id] = {
            "map_id": map_id,
            "name": map_data.get("name", map_id),
            "description": map_data.get("description", ""),
            "public_subdir": map_data.get("public_subdir", map_id),
            "background_image": map_data.get("background_image", ""),
            "locations": [_with_scene_variants({**_location_to_api_scene(map_id, loc), "current_icon": _scene_icon_url(loc)}) for loc in map_data.get("locations", [])],
        }
    return result


def get_scene(scene_id: str) -> Dict[str, Any]:
    profiles = _read_location_profiles()
    map_id, scene = _find_scene_and_map(profiles, scene_id)
    if scene is None:
        raise HTTPException(status_code=404, detail=f"Scene not found: {scene_id}")
    return _with_scene_variants(_location_to_api_scene(map_id, scene))


def update_scene(scene_id: str, body: UpdateSceneRequest) -> Dict[str, Any]:
    profiles = _read_location_profiles()
    map_id, scene = _find_scene_and_map(profiles, scene_id)
    if scene is None:
        raise HTTPException(status_code=404, detail=f"Scene not found: {scene_id}")
    update_data = body.model_dump(exclude_none=True)
    scene.update({k: v for k, v in update_data.items() if k in ("name", "scene_ids", "unlock_conditions")})
    scene.setdefault("meta", {}).update({k: v for k, v in update_data.items() if k in ("description", "icon_prompt", "backdrop_prompt")})
    if "position" in update_data and update_data["position"] is not None:
        scene["position"] = update_data["position"]
    maps = profiles["maps"][map_id]["locations"]
    for idx, existing in enumerate(maps):
        if existing.get("location_id") == scene_id:
            maps[idx] = scene
            break
    _write_location_profiles(profiles)
    return {"success": True, "scene": _with_scene_variants(_location_to_api_scene(map_id, scene))}


def create_location(map_id: str, body: CreateLocationRequest) -> Dict[str, Any]:
    profiles = _read_location_profiles()
    if map_id not in profiles.get("maps", {}):
        profiles.setdefault("maps", {})[map_id] = {"map_id": map_id, "name": map_id, "description": "", "public_subdir": map_id, "background_image": "", "meta": {}, "locations": []}
    location = {
        "location_id": body.location_id,
        "name": body.name,
        "map_id": map_id,
        "scene_ids": body.scene_ids,
        "unlock_conditions": body.unlock_conditions,
        "position": body.position.model_dump() if body.position else {"x": 0.5, "y": 0.5},
        "meta": {"description": body.description, "type": body.type, "icon_prompt": body.icon_prompt, "backdrop_prompt": body.backdrop_prompt, "publish_status": "draft"},
    }
    profiles["maps"][map_id]["locations"].append(location)
    _write_location_profiles(profiles)
    return {"success": True, "scene": _with_scene_variants(_location_to_api_scene(map_id, location))}


def delete_scene(scene_id: str) -> Dict[str, Any]:
    profiles = _read_location_profiles()
    map_id, scene = _find_scene_and_map(profiles, scene_id)
    if scene is None:
        raise HTTPException(status_code=404, detail=f"Scene not found: {scene_id}")
    profiles["maps"][map_id]["locations"] = [loc for loc in profiles["maps"][map_id]["locations"] if loc.get("location_id") != scene_id]
    _write_location_profiles(profiles)
    return {"success": True}


def get_scene_samples(scene_id: str, image_type: str = "icon") -> List[Dict]:
    folder = _scene_samples_folder(scene_id)
    profiles = _read_location_profiles()
    scene = _find_scene_by_id(profiles, scene_id)
    selected_key = "selected_backdrop" if image_type == "backdrop" else "selected_icon"
    selected_image = scene.get("meta", {}).get(selected_key) if scene else None
    results = []
    if folder.exists():
        pattern = "*_backdrop_*.png" if image_type == "backdrop" else "*_icon_*.png"
        for img_file in sorted(folder.glob(pattern)):
            rel = img_file.relative_to(shared_ctx.SAMPLES_DIR)
            results.append({"filename": img_file.name, "url": f"/images/{rel.as_posix()}", "path": str(rel), "abs_path": str(img_file), "is_current_in_game": False, "is_selected": selected_image is not None and str(img_file) == selected_image})
    return results


def select_scene_icon(scene_id: str, body: SelectSceneIconRequest) -> Dict[str, Any]:
    profiles = _read_location_profiles()
    map_id, scene = _find_scene_and_map(profiles, scene_id)
    if scene is None:
        raise HTTPException(status_code=404, detail=f"Scene not found: {scene_id}")
    image_path = Path(body.image_path)
    if not image_path.exists():
        raise HTTPException(status_code=404, detail=f"Image file not found: {body.image_path}")
    scene.setdefault("meta", {})["selected_icon"] = str(image_path)
    scene["meta"]["updated_at"] = datetime.utcnow().isoformat() + "Z"
    _write_location_profiles(profiles)
    return {"success": True, "selected_image": str(image_path)}


def select_scene_backdrop(scene_id: str, body: SelectBackdropRequest) -> Dict[str, Any]:
    profiles = _read_location_profiles()
    _, scene = _find_scene_and_map(profiles, scene_id)
    if scene is None:
        raise HTTPException(status_code=404, detail=f"Scene not found: {scene_id}")
    image_path = Path(body.image_path)
    if not image_path.exists():
        raise HTTPException(status_code=404, detail=f"Image file not found: {body.image_path}")
    scene.setdefault("meta", {})["selected_backdrop"] = str(image_path)
    scene["meta"]["updated_at"] = datetime.utcnow().isoformat() + "Z"
    _write_location_profiles(profiles)
    return {"success": True, "selected_image": str(image_path)}


async def generate_scene_images(body: SceneGenerateRequest):
    return {"success": True}


def deploy_scene_icon(scene_id: str, image_type: str = "icon") -> Dict[str, Any]:
    profiles = _read_location_profiles()
    if not profiles.get("maps"):
        profiles = _read_location_profiles()
    map_id, scene = _find_scene_and_map(profiles, scene_id)
    if scene is None:
        raise HTTPException(status_code=404, detail=f"Scene not found: {scene_id}")
    map_data = profiles["maps"][map_id]
    public_subdir = map_data.get("public_subdir", map_id)
    meta = scene.setdefault("meta", {})
    selected_key = "selected_backdrop" if image_type == "backdrop" else "selected_icon"
    field_name = "backdrop_image" if image_type == "backdrop" else "icon_image"
    selected_asset_path = meta.get(selected_key, "")
    asset_copied = False
    target_rel = ""
    if selected_asset_path:
        selected_file = Path(selected_asset_path)
        if selected_file.exists():
            ext = selected_file.suffix or ".png"
            filename = f"{scene_id}{ext}"
            game_public_dir = shared_ctx.GAME_PUBLIC_MAPS_DIR / public_subdir
            game_public_dir.mkdir(parents=True, exist_ok=True)
            shutil.copy2(str(selected_file), str(game_public_dir / filename))
            target_rel = f"/maps/{public_subdir}/{filename}"
            scene[field_name] = target_rel
            asset_copied = True
        meta.pop(selected_key, None)
    meta["publish_status"] = "published"
    meta["updated_at"] = datetime.utcnow().isoformat() + "Z"
    _write_location_profiles(profiles)
    game_map_updated = _deploy_map_to_runtime(map_id)
    return {"success": True, "scene_id": scene_id, "image_type": image_type, "image_copied": asset_copied, "game_map_updated": game_map_updated, "target_path": target_rel}


def _generate_scene_prompts_blocking(client, location_name: str, scene_type: str, image_type: str) -> List[str]:
    return [f"{location_name} {scene_type} {image_type} {index}" for index in range(4)]


async def generate_scene_prompts(body: SceneGeneratePromptsRequest) -> Dict[str, Any]:
    return {"success": True, "prompts": []}


def update_scene_icon_variant(scene_id: str, variant_index: int, body: UpdateSceneVariantRequest) -> Dict[str, Any]:
    return {"success": True}


def update_scene_backdrop_variant(scene_id: str, variant_index: int, body: UpdateSceneVariantRequest) -> Dict[str, Any]:
    return {"success": True}


async def regenerate_scene_icon_variants(scene_id: str, body: RegenerateSceneVariantsRequest) -> Dict[str, Any]:
    return {"success": True, "descriptions": []}


async def regenerate_scene_backdrop_variants(scene_id: str, body: RegenerateSceneVariantsRequest) -> Dict[str, Any]:
    return {"success": True, "descriptions": []}