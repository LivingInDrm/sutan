def test_deploy_ui_asset_updates_workspace_and_copies_files(shared_module, tmp_path):
    shared = shared_module
    source = tmp_path / "panel.png"
    source.write_bytes(b"ui-image")

    shared._write_workspace_ui_assets([
        {
            "asset_id": "ui_001",
            "name": "主面板",
            "image": "",
            "meta": {"selected_asset": str(source), "publish_status": "draft"},
        }
    ])

    result = shared.deploy_ui_asset("ui_001")
    workspace_assets = shared._read_workspace_ui_assets()

    assert result["success"] is True
    assert result["image_copied"] is True
    assert workspace_assets[0]["image"] == "/assets/ui/generated/panel.png"
    assert workspace_assets[0]["meta"]["publish_status"] == "published"
    assert "selected_asset" not in workspace_assets[0]["meta"]
    assert (shared.UI_ASSETS_SRC_DIR / "panel.png").read_bytes() == b"ui-image"
    assert (shared.UI_ASSETS_PUBLIC_DIR / "panel.png").read_bytes() == b"ui-image"


def test_deploy_ui_asset_missing_source_does_not_crash(shared_module):
    shared = shared_module
    shared._write_workspace_ui_assets([
        {
            "asset_id": "ui_404",
            "name": "缺失素材",
            "image": "/assets/ui/generated/existing.png",
            "meta": {"selected_asset": str(shared.PROJECT_ROOT / "missing" / "ui.png")},
        }
    ])

    result = shared.deploy_ui_asset("ui_404")
    workspace_assets = shared._read_workspace_ui_assets()

    assert result["success"] is True
    assert result["image_copied"] is False
    assert workspace_assets[0]["image"] == "/assets/ui/generated/existing.png"