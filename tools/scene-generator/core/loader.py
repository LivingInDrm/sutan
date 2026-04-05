"""
场景 JSON 加载、保存与卡牌数据读取
"""
import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from .config import SCENES_DIR, CARDS_PATH


def load_scene(scene_id: str) -> Dict[str, Any]:
    """加载指定 scene_id 的场景 JSON"""
    path = SCENES_DIR / f"{scene_id}.json"
    if not path.exists():
        raise FileNotFoundError(f"场景文件不存在: {path}")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_scene(scene: Dict[str, Any], scene_id: Optional[str] = None) -> Path:
    """保存场景 JSON 到输出目录"""
    sid = scene_id or scene.get("scene_id", "scene_unknown")
    SCENES_DIR.mkdir(parents=True, exist_ok=True)
    path = SCENES_DIR / f"{sid}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(scene, f, ensure_ascii=False, indent=2)
    return path


def list_scene_files() -> List[Path]:
    """列出所有场景 JSON 文件"""
    if not SCENES_DIR.exists():
        return []
    return sorted(SCENES_DIR.glob("scene_*.json")) + sorted(SCENES_DIR.glob("scene_shop_*.json"))


def load_all_scenes() -> List[Dict[str, Any]]:
    """加载所有场景"""
    scenes = []
    seen = set()
    for p in SCENES_DIR.glob("*.json"):
        if p.stem.startswith("scene_") and p.name not in seen:
            seen.add(p.name)
            with open(p, "r", encoding="utf-8") as f:
                scenes.append(json.load(f))
    return scenes


def load_card_ids() -> Dict[str, str]:
    """加载所有合法的卡牌 ID -> name 映射"""
    if not CARDS_PATH.exists():
        return {}
    with open(CARDS_PATH, "r", encoding="utf-8") as f:
        cards = json.load(f)
    return {c["card_id"]: c.get("name", c["card_id"]) for c in cards}


def load_cards_data() -> List[Dict[str, Any]]:
    """加载完整卡牌数据"""
    if not CARDS_PATH.exists():
        return []
    with open(CARDS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)
