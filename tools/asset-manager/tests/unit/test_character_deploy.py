import json


def test_deploy_character_updates_runtime_and_copies_portrait(shared_module, tmp_path):
    shared = shared_module
    source = tmp_path / "hero.png"
    source.write_bytes(b"hero-image")

    shared._write_workspace_characters([
        {
            "name": "测试角色",
            "type": "character",
            "image": "",
            "description": "desc",
            "meta": {"selected_asset": str(source), "publish_status": "draft"},
        }
    ])

    result = shared.deploy_character("测试角色")

    runtime_cards = json.loads(shared.CHARACTERS_CARDS_PATH.read_text(encoding="utf-8"))
    workspace_cards = shared._read_workspace_characters()
    deployed_image = runtime_cards[0]["image"]
    game_file = deployed_image.rsplit("/", 1)[-1]
    portrait_src = shared.PORTRAITS_SRC_DIR / game_file
    portrait_public = shared.PORTRAITS_PUBLIC_DIR / game_file

    assert result["success"] is True
    assert result["portrait_copied"] is True
    assert runtime_cards[0]["name"] == "测试角色"
    assert runtime_cards[0]["type"] == "character"
    assert runtime_cards[0]["description"] == "desc"
    assert deployed_image.startswith("/assets/portraits/figure")
    assert deployed_image.endswith(".png")
    assert workspace_cards[0]["meta"]["publish_status"] == "published"
    assert "selected_asset" not in workspace_cards[0]["meta"]
    assert portrait_src.read_bytes() == b"hero-image"
    assert portrait_public.read_bytes() == b"hero-image"


def test_deploy_character_missing_source_does_not_crash(shared_module):
    shared = shared_module
    missing_path = shared.PROJECT_ROOT / "missing" / "ghost.png"
    shared._write_workspace_characters([
        {
            "name": "无图角色",
            "type": "character",
            "image": "/assets/portraits/existing.png",
            "description": "desc",
            "meta": {"selected_asset": str(missing_path)},
        }
    ])

    result = shared.deploy_character("无图角色")
    runtime_cards = json.loads(shared.CHARACTERS_CARDS_PATH.read_text(encoding="utf-8"))

    assert result["success"] is True
    assert result["portrait_copied"] is False
    assert runtime_cards[0]["image"] == "/assets/portraits/existing.png"
    assert not (shared.PORTRAITS_SRC_DIR / "existing.png").exists()