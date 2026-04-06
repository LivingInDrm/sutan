"""
路径与常量配置
"""
from pathlib import Path

# Project paths
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
SCENES_DIR = PROJECT_ROOT / "src" / "renderer" / "data" / "configs" / "scenes"
CARDS_DIR = PROJECT_ROOT / "src" / "renderer" / "data" / "configs" / "cards"
SCHEMAS_PATH = PROJECT_ROOT / "src" / "renderer" / "data" / "schemas" / "index.ts"
API_KEY_PATH = Path("/tmp/oai.key")

# Scene types
SCENE_TYPES = ["event", "shop", "challenge"]
SLOT_TYPES = ["character", "item", "sultan", "gold"]
ATTRIBUTES = ["physique", "charm", "wisdom", "combat", "social", "survival", "stealth", "magic"]
CALC_MODES = ["max", "sum", "min", "avg", "first", "specific"]
CHECK_RESULTS = ["success", "partial_success", "failure", "critical_failure"]
NARRATIVE_TYPES = ["dialogue", "narration", "effect", "choice"]

# LLM config
LLM_MODEL = "gpt-5.4"
LLM_TEMPERATURE = 0.4
LLM_MAX_TOKENS = 8192
