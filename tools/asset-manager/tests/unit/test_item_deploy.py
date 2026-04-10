import json


def test_deploy_item_updates_runtime_and_copies_assets(shared_module, tmp_path):
    shared = shared_module
    source = tmp_path / "sword.png"
    source.write_bytes(b"item-image")

    shared._write_workspace_equipment([
        {
            "name": "青锋剑",
            "type": "equipment",
            "equipment_type": "weapon",
            "meta": {"selected_asset": str(source), "publish_status": "draft"},
        }
    ])

    result = shared.deploy_item("青锋剑")
    runtime_equipment = json.loads(shared.EQUIPMENT_CARDS_PATH.read_text(encoding="utf-8"))
    runtime_special = json.loads(shared.SPECIAL_CARDS_PATH.read_text(encoding="utf-8"))

    assert result["success"] is True
    assert result["image_copied"] is True
    assert runtime_equipment == [
        {
            "name": "青锋剑",
            "type": "equipment",
            "equipment_type": "weapon",
            "image": "/assets/items/sword.png",
        }
    ]
    assert runtime_special == []
    assert (shared.ITEMS_SRC_DIR / "sword.png").read_bytes() == b"item-image"
    assert (shared.ITEMS_PUBLIC_DIR / "sword.png").read_bytes() == b"item-image"


def test_deploy_item_missing_source_does_not_crash(shared_module):
    shared = shared_module
    shared._write_workspace_equipment([
        {
            "name": "残缺甲",
            "type": "equipment",
            "equipment_type": "armor",
            "image": "/assets/items/old.png",
            "meta": {"selected_asset": str(shared.PROJECT_ROOT / "missing" / "old.png")},
        }
    ])

    result = shared.deploy_item("残缺甲")
    runtime_equipment = json.loads(shared.EQUIPMENT_CARDS_PATH.read_text(encoding="utf-8"))

    assert result["success"] is True
    assert result["image_copied"] is False
    assert runtime_equipment[0]["image"] == "/assets/items/old.png"