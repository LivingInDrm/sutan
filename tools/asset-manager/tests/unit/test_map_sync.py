import json


def test_deploy_scene_icon_updates_runtime_and_copies_map_asset(shared_module, tmp_path):
    shared = shared_module
    source = tmp_path / "map-icon.png"
    source.write_bytes(b"map-icon")

    shared._write_workspace_locations_data([
        {
            "location_id": "loc_001",
            "map_id": "map_a",
            "name": "主城",
            "scene_ids": ["scene-a"],
            "unlock_conditions": {},
            "meta": {"selected_icon": str(source), "publish_status": "ready"},
        },
        {
            "location_id": "loc_draft",
            "map_id": "map_a",
            "name": "草稿点",
            "scene_ids": [],
            "unlock_conditions": {},
            "meta": {"publish_status": "draft"},
        },
    ])
    shared._write_workspace_maps_data([
        {
            "map_id": "map_a",
            "name": "北凉",
            "public_subdir": "beiliang",
            "location_refs": [
                {"location_id": "loc_001", "position": {"x": 0.1, "y": 0.2}},
                {"location_id": "loc_draft", "position": {"x": 0.3, "y": 0.4}},
            ],
            "meta": {},
        }
    ])

    result = shared.deploy_scene_icon("loc_001")
    runtime_locations = json.loads(shared.RUNTIME_LOCATIONS_PATH.read_text(encoding="utf-8"))
    runtime_maps = json.loads(shared.RUNTIME_MAPS_PATH.read_text(encoding="utf-8"))
    copied_file = shared.GAME_PUBLIC_MAPS_DIR / "beiliang" / "loc_001.png"

    assert result["success"] is True
    assert result["game_map_updated"] is True
    assert runtime_locations == [
        {
            "location_id": "loc_001",
            "name": "主城",
            "scene_ids": ["scene-a"],
            "unlock_conditions": {},
            "icon_image": "/maps/beiliang/loc_001.png",
        }
    ]
    assert runtime_maps == [
        {
            "map_id": "map_a",
            "name": "北凉",
            "description": "",
            "background_image": "",
            "location_refs": [{"location_id": "loc_001", "position": {"x": 0.1, "y": 0.2}}],
        }
    ]
    assert copied_file.read_bytes() == b"map-icon"