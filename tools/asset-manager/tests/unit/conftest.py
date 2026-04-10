import importlib
import importlib.util
import json
import os
import sys
import types
from pathlib import Path

import pytest


def _write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


@pytest.fixture
def shared_module(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    asset_manager_root = Path(__file__).resolve().parents[2]
    project_root = tmp_path / "project"
    scripts_dir = project_root / "scripts"
    data_cards_dir = scripts_dir / "data" / "cards"
    data_maps_dir = scripts_dir / "data" / "maps"
    data_ui_dir = scripts_dir / "data" / "ui"

    for directory in [
        data_cards_dir,
        data_maps_dir,
        data_ui_dir,
        project_root / "src" / "renderer" / "assets" / "portraits",
        project_root / "src" / "renderer" / "assets" / "items",
        project_root / "src" / "renderer" / "assets" / "ui" / "generated",
        project_root / "src" / "renderer" / "data" / "configs" / "cards",
        project_root / "src" / "renderer" / "data" / "configs" / "maps",
        project_root / "src" / "renderer" / "public" / "maps",
        project_root / "public" / "portraits",
        project_root / "public" / "items",
        project_root / "public" / "ui-assets",
        project_root / "scripts" / "samples",
    ]:
        directory.mkdir(parents=True, exist_ok=True)

    _write_json(data_cards_dir / "special.json", [])
    _write_json(data_cards_dir / "characters.json", [])
    _write_json(data_cards_dir / "equipment.json", [])
    _write_json(data_maps_dir / "locations.json", [])
    _write_json(data_maps_dir / "maps.json", [])
    _write_json(data_ui_dir / "ui_assets.json", [])

    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    if str(scripts_dir) not in sys.path:
        sys.path.insert(0, str(scripts_dir))

    stub_generate_assets = types.SimpleNamespace(
        STYLE_BASE="",
        NO_TEXT_CONSTRAINT="",
        STYLE_NEGATIVE="",
        PORTRAIT_TEMPLATE="{prompt}",
        ITEM_TEMPLATE="{prompt}",
        SCENE_TEMPLATE="{prompt}",
    )
    sys.modules["generate_assets"] = stub_generate_assets

    module_name = "asset_manager_shared_under_test"
    if module_name in sys.modules:
        del sys.modules[module_name]
    shared_path = asset_manager_root / "backend" / "shared.py"
    spec = importlib.util.spec_from_file_location(module_name, shared_path)
    assert spec and spec.loader
    shared = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = shared
    spec.loader.exec_module(shared)

    monkeypatch.setattr(shared, "PROJECT_ROOT", project_root)
    monkeypatch.setattr(shared, "SCRIPTS_DIR", scripts_dir)
    monkeypatch.setattr(shared, "SAMPLES_DIR", project_root / "scripts" / "samples")
    monkeypatch.setattr(shared, "PORTRAITS_SRC_DIR", project_root / "src" / "renderer" / "assets" / "portraits")
    monkeypatch.setattr(shared, "PORTRAITS_PUBLIC_DIR", project_root / "public" / "portraits")
    monkeypatch.setattr(shared, "CHARACTER_PROFILES_PATH", data_cards_dir / "characters.json")
    monkeypatch.setattr(shared, "CARDS_DIR", project_root / "src" / "renderer" / "data" / "configs" / "cards")
    monkeypatch.setattr(shared, "CHARACTERS_CARDS_PATH", project_root / "src" / "renderer" / "data" / "configs" / "cards" / "characters.json")
    monkeypatch.setattr(shared, "EQUIPMENT_CARDS_PATH", project_root / "src" / "renderer" / "data" / "configs" / "cards" / "equipment.json")
    monkeypatch.setattr(shared, "SPECIAL_CARDS_PATH", project_root / "src" / "renderer" / "data" / "configs" / "cards" / "special.json")
    monkeypatch.setattr(shared, "WORKSPACE_SPECIAL_PATH", data_cards_dir / "special.json")
    monkeypatch.setattr(shared, "ITEM_PROFILES_PATH", data_cards_dir / "equipment.json")
    monkeypatch.setattr(shared, "ITEMS_SRC_DIR", project_root / "src" / "renderer" / "assets" / "items")
    monkeypatch.setattr(shared, "ITEMS_PUBLIC_DIR", project_root / "public" / "items")
    monkeypatch.setattr(shared, "MAPS_WORKSPACE_DIR", data_maps_dir)
    monkeypatch.setattr(shared, "LOCATIONS_WORKSPACE_PATH", data_maps_dir / "locations.json")
    monkeypatch.setattr(shared, "MAPS_WORKSPACE_DATA_PATH", data_maps_dir / "maps.json")
    monkeypatch.setattr(shared, "GAME_MAPS_CONFIG_DIR", project_root / "src" / "renderer" / "data" / "configs" / "maps")
    monkeypatch.setattr(shared, "RUNTIME_LOCATIONS_PATH", project_root / "src" / "renderer" / "data" / "configs" / "maps" / "locations.json")
    monkeypatch.setattr(shared, "RUNTIME_MAPS_PATH", project_root / "src" / "renderer" / "data" / "configs" / "maps" / "maps.json")
    monkeypatch.setattr(shared, "GAME_PUBLIC_MAPS_DIR", project_root / "src" / "renderer" / "public" / "maps")
    monkeypatch.setattr(shared, "UI_ASSETS_WORKSPACE_PATH", data_ui_dir / "ui_assets.json")
    monkeypatch.setattr(shared, "UI_ASSETS_SRC_DIR", project_root / "src" / "renderer" / "assets" / "ui" / "generated")
    monkeypatch.setattr(shared, "UI_ASSETS_PUBLIC_DIR", project_root / "public" / "ui-assets")

    for module_name in list(sys.modules):
        if module_name == "shared" or module_name.startswith("services") or module_name.startswith("routes"):
            del sys.modules[module_name]
    sys.modules["shared"] = shared
    importlib.invalidate_caches()

    return shared