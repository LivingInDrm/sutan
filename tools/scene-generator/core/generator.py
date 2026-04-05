"""
LLM Prompt 构建与场景生成服务
"""
import json
import re
from typing import Any, Dict, List, Optional

from .config import (
    API_KEY_PATH, LLM_MODEL, LLM_TEMPERATURE, LLM_MAX_TOKENS,
    SCENES_DIR, ATTRIBUTES, CALC_MODES, CHECK_RESULTS,
)
from .loader import load_scene, load_card_ids, load_all_scenes


# ── IP 背景知识 ──
XUEZONG_IP_CONTEXT = """
你在为一款名为"Sutan（苏丹的游戏）"的策略叙事卡牌游戏创作场景内容。
游戏基于《雪中悍刀行》IP，核心世界观要点：

1. **北凉世界观**：故事发生在离阳王朝末期的北凉道，主角是北凉世子徐凤年。
2. **核心人物**：
   - 徐凤年：北凉世子，外示纨绔实则深藏不露，三年游历归来后开始担当大任
   - 徐龙象：徐凤年之弟，天生神力，金刚体魄，心性质朴
   - 徐渭熊：北凉二郡主，冷面将门女，剑术凌厉
   - 老黄（剑九黄）：表面马夫，实为绝顶剑客，忠心护主
   - 温华：嚣张但重义的江湖少年剑客
   - 李淳罡：落魄剑甲，酒鬼但剑道通神
   - 洪洗象：武当掌教，慵懒超然
   - 红薯：王府侍女，绝艳玲珑
   - 徐脂虎：徐家长女，温婉坚韧
   - 徐骁：北凉王，人屠
   - 陈芝豹：白衣兵仙，北凉六义子之首
   - 褚禄山：北凉悍将，外胖内精

3. **世界氛围**：江湖与庙堂交织，武道与权谋并重，轻快中藏深情
4. **语气风格**：文字要有《雪中悍刀行》的味道——对话锋利、旁白有画面感、人物有烟火气

生成时注意：
- 对话要符合角色性格（温华嚣张、老黄憨厚、徐凤年痞中带正）
- 场景发生在北凉道、边境、江湖、宫廷等典型环境
- 判定属性要与故事语义匹配（交涉用social/charm，打斗用combat/physique，追踪用survival/stealth）
"""


def build_scene_schema_summary() -> str:
    """构建 Schema 摘要"""
    return """
## Scene JSON Schema 要求

### 顶层字段
- scene_id: string (唯一标识，如 "scene_007")
- name: string (场景名称)
- description: string (场景描述)
- background_image: string (背景图路径，如 "/assets/scenes/sceneXX.png")
- type: "event" | "shop" | "challenge"
- duration: integer >= 1 (持续天数)
- slots: Slot[] (参与槽位)
- stages: Stage[] (至少1个)
- entry_stage: string (入口阶段ID，必须引用存在的stage_id)
- unlock_conditions?: { reputation_min?: int, required_tags?: string[] }
- absence_penalty?: { effects: Effects, narrative: string } | null

### Slot
- type: "character" | "item" | "sultan"  (不要用 "gold")
- required: boolean
- locked: boolean

### Stage
- stage_id: string (场景内唯一)
- narrative: NarrativeNode[] (叙事节点列表)
- settlement?: Settlement (阶段结算，可选)
- branches?: StageBranch[] (跳转分支，可选)
- is_final?: boolean (是否为终结阶段)

### NarrativeNode (四种类型)
dialogue: { type: "dialogue", speaker?: string, text: string, portrait?: string }
narration: { type: "narration", text: string }
effect:    { type: "effect", effects: Effects, text?: string }
choice:    { type: "choice", text: string, options: [{ label: string, next_stage?: string, effects?: Effects }] }

### Settlement (三种类型，用 type 区分)
dice_check: {
  type: "dice_check",
  narrative?: string,
  check: { attribute: Attribute, calc_mode: CalcMode, target: int >= 1 },
  results: {
    success: { narrative: string, effects: Effects },
    partial_success: { narrative: string, effects: Effects },
    failure: { narrative: string, effects: Effects },
    critical_failure: { narrative: string, effects: Effects }
  }
}
trade: { type: "trade", shop_inventory: string[], allow_sell: boolean, refresh_cycle?: int }
choice: { type: "choice", narrative?: string, options: [{ label: string, effects: Effects }] }

### StageBranch
- condition: "success" | "partial_success" | "failure" | "critical_failure" | "default"
- next_stage: string (必须引用存在的 stage_id)

### Effects
- gold?: int
- reputation?: int
- cards_add?: string[] (必须是合法卡牌ID)
- cards_remove?: string[]
- tags_add?: { card_id: string[] }
- tags_remove?: { card_id: string[] }
- consume_invested?: boolean
- 【不要使用 unlock_scenes，当前运行时未实现】

### Attribute 枚举
physique, charm, wisdom, combat, social, survival, stealth, magic

### CalcMode 枚举
max, sum, min, avg, first, specific
"""


def build_few_shot_examples(complexity: str) -> str:
    """根据复杂度选择 few-shot 样例"""
    examples = []

    # 总是包含简单样例
    try:
        simple = load_scene("scene_001")
        examples.append(("简单场景示例（单阶段骰检）", simple))
    except Exception:
        pass

    # 中等/复杂包含 scene_006
    if complexity in ("medium", "complex"):
        try:
            complex_ex = load_scene("scene_006")
            examples.append(("复杂场景示例（多阶段、多分支、卡牌演化）", complex_ex))
        except Exception:
            pass

    if not examples:
        return ""

    parts = ["## 参考样例\n"]
    for label, scene in examples:
        parts.append(f"### {label}\n```json\n{json.dumps(scene, ensure_ascii=False, indent=2)}\n```\n")
    return "\n".join(parts)


def build_card_whitelist() -> str:
    """构建合法卡牌 ID 白名单"""
    card_ids = load_card_ids()
    if not card_ids:
        return ""
    lines = ["## 合法卡牌 ID 白名单（effects 中引用的卡牌必须在此列表中）\n"]
    for cid, name in sorted(card_ids.items()):
        lines.append(f"- {cid}: {name}")
    return "\n".join(lines)


def _next_scene_id() -> str:
    """自动生成下一个 scene_id"""
    existing = set()
    if SCENES_DIR.exists():
        for f in SCENES_DIR.glob("scene_*.json"):
            # 提取数字部分
            stem = f.stem
            if stem.startswith("scene_") and not stem.startswith("scene_shop"):
                try:
                    num = int(stem.replace("scene_", "").lstrip("0") or "0")
                    existing.add(num)
                except ValueError:
                    pass
    next_num = max(existing, default=0) + 1
    return f"scene_{next_num:03d}"


def generate_scene(
    prompt: str,
    scene_id: Optional[str] = None,
    scene_type: str = "event",
    complexity: str = "medium",
    duration: int = 3,
) -> Dict[str, Any]:
    """调用 LLM 生成场景 JSON"""
    import openai

    # 读取 API Key
    if not API_KEY_PATH.exists():
        raise FileNotFoundError(f"API key 文件不存在: {API_KEY_PATH}")
    api_key = API_KEY_PATH.read_text().strip()
    if not api_key:
        raise ValueError("API key 为空")

    client = openai.OpenAI(api_key=api_key)

    # 自动生成 scene_id
    if not scene_id:
        scene_id = _next_scene_id()

    # 构建 system prompt
    system_prompt = f"""你是 Sutan 游戏的场景设计师。你的任务是根据用户的描述生成一个完整的、可被游戏引擎直接加载的 Scene JSON。

{XUEZONG_IP_CONTEXT}

{build_scene_schema_summary()}

{build_card_whitelist()}

## 生成规则

1. 必须输出**严格合法的 JSON**，不要包裹在 markdown 代码块中
2. scene_id 使用: {scene_id}
3. 场景类型: {scene_type}
4. 持续天数: {duration}
5. 复杂度要求: {complexity}
   - simple: 1个stage，单次骰检，直接终结
   - medium: 2-3个stage，1-2次判定或选择分支
   - complex: 3-5个stage，多轮判定，分支汇合，卡牌/标签演化
6. entry_stage 必须引用存在的 stage_id
7. 所有 branches.next_stage 和 choice.options.next_stage 必须引用存在的 stage_id
8. 每条路径必须最终到达 is_final=true 的 stage
9. effects 中的 cards_add/cards_remove/tags_add/tags_remove 引用的卡牌必须在白名单中
10. 不要使用 unlock_scenes 字段
11. check.target 通常在 3-6 之间，不要太高也不要太低
12. 奖惩数值要合理：金币通常 ±5~30，声望通常 ±2~10
13. 对话要有雪中悍刀行的味道，有画面感

## 输出格式

直接输出 Scene JSON 对象，不要有任何其他文字。
"""

    # 构建 user prompt
    user_prompt = f"""请根据以下描述生成一个{complexity}复杂度的{scene_type}类型场景：

{prompt}

{build_few_shot_examples(complexity)}

请直接输出完整的 Scene JSON。"""

    print(f"  正在调用 {LLM_MODEL} 生成场景...")

    response = client.chat.completions.create(
        model=LLM_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=LLM_TEMPERATURE,
        max_completion_tokens=LLM_MAX_TOKENS,
    )

    content = response.choices[0].message.content.strip()

    # 尝试解析 JSON（处理可能的 markdown 包裹）
    scene = _parse_json_response(content)

    # 确保 scene_id 正确
    scene["scene_id"] = scene_id

    return scene


def repair_scene(scene: Dict[str, Any], errors: List[str]) -> Dict[str, Any]:
    """调用 LLM 修复场景中的错误"""
    import openai

    api_key = API_KEY_PATH.read_text().strip()
    client = openai.OpenAI(api_key=api_key)

    system_prompt = f"""你是一个 JSON 修复工具。你需要修复场景 JSON 中的错误。

{build_scene_schema_summary()}

{build_card_whitelist()}

## 修复规则
1. 只修复指出的错误，不要改变正确的内容
2. 直接输出修复后的完整 JSON，不要其他文字
"""

    user_prompt = f"""以下场景 JSON 有错误，请修复：

### 错误列表
{chr(10).join(f"- {e}" for e in errors)}

### 原始 JSON
```json
{json.dumps(scene, ensure_ascii=False, indent=2)}
```

请输出修复后的完整 JSON。"""

    print("  正在修复...")
    response = client.chat.completions.create(
        model=LLM_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.2,
        max_completion_tokens=LLM_MAX_TOKENS,
    )

    content = response.choices[0].message.content.strip()
    return _parse_json_response(content)


def _parse_json_response(content: str) -> Dict[str, Any]:
    """解析 LLM 返回的 JSON（处理 markdown 包裹等情况）"""
    # 直接尝试解析
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        pass

    # 尝试提取 markdown 代码块中的 JSON
    patterns = [
        r'```json\s*\n(.*?)\n```',
        r'```\s*\n(.*?)\n```',
    ]
    for pattern in patterns:
        match = re.search(pattern, content, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                continue

    # 尝试找到第一个 { 和最后一个 }
    start = content.find("{")
    end = content.rfind("}")
    if start != -1 and end != -1:
        try:
            return json.loads(content[start:end + 1])
        except json.JSONDecodeError:
            pass

    raise ValueError(f"无法从 LLM 响应中解析 JSON。响应前200字符:\n{content[:200]}")
