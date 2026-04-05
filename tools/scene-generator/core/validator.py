"""
场景 Schema 校验与语义校验
"""
from typing import Any, Dict, List, Tuple

from .config import (
    SCENE_TYPES, SLOT_TYPES, ATTRIBUTES, CALC_MODES,
    CHECK_RESULTS, NARRATIVE_TYPES,
)
from .loader import load_card_ids


class ValidationResult:
    """校验结果"""

    def __init__(self):
        self.errors: List[str] = []
        self.warnings: List[str] = []
        self.info: List[str] = []

    @property
    def is_valid(self) -> bool:
        return len(self.errors) == 0

    def add_error(self, msg: str):
        self.errors.append(msg)

    def add_warning(self, msg: str):
        self.warnings.append(msg)

    def add_info(self, msg: str):
        self.info.append(msg)

    def print_report(self, scene_id: str = ""):
        prefix = f"[{scene_id}] " if scene_id else ""
        if self.is_valid and not self.warnings:
            print(f"  {prefix}校验通过")
        for e in self.errors:
            print(f"  {prefix}[ERROR] {e}")
        for w in self.warnings:
            print(f"  {prefix}[WARN]  {w}")
        for i in self.info:
            print(f"  {prefix}[INFO]  {i}")


def validate_scene(scene: Dict[str, Any], card_ids: Dict[str, str] = None) -> ValidationResult:
    """对场景进行 Schema 合规性 + 语义校验"""
    result = ValidationResult()
    if card_ids is None:
        card_ids = load_card_ids()

    # ── 1. 顶层必填字段 ──
    required_fields = ["scene_id", "name", "description", "background_image",
                       "type", "duration", "slots", "stages", "entry_stage"]
    for f in required_fields:
        if f not in scene:
            result.add_error(f"缺少必填字段: {f}")

    # ── 2. 类型校验 ──
    scene_type = scene.get("type")
    if scene_type and scene_type not in SCENE_TYPES:
        result.add_error(f"无效的 type: {scene_type}, 可选: {SCENE_TYPES}")

    duration = scene.get("duration")
    if duration is not None:
        if not isinstance(duration, int) or duration < 1:
            result.add_error(f"duration 必须为正整数, 当前: {duration}")

    # ── 3. 槽位校验 ──
    slots = scene.get("slots", [])
    for i, slot in enumerate(slots):
        if slot.get("type") not in SLOT_TYPES:
            result.add_error(f"slots[{i}].type 无效: {slot.get('type')}")
        if "required" not in slot:
            result.add_error(f"slots[{i}] 缺少 required 字段")
        if "locked" not in slot:
            result.add_error(f"slots[{i}] 缺少 locked 字段")
        if slot.get("type") == "gold":
            result.add_warning(f"slots[{i}] 使用了 gold 类型，当前运行时不支持")

    # ── 4. Stage 校验 ──
    stages = scene.get("stages", [])
    if not stages:
        result.add_error("stages 不能为空")
        return result

    stage_ids = set()
    stage_map = {}
    for i, stage in enumerate(stages):
        sid = stage.get("stage_id")
        if not sid:
            result.add_error(f"stages[{i}] 缺少 stage_id")
            continue
        if sid in stage_ids:
            result.add_error(f"stage_id 重复: {sid}")
        stage_ids.add(sid)
        stage_map[sid] = stage

    # ── 5. entry_stage 引用校验 ──
    entry_stage = scene.get("entry_stage")
    if entry_stage and entry_stage not in stage_ids:
        result.add_error(f"entry_stage '{entry_stage}' 不存在于 stages 中")

    # ── 6. 各 stage 详细校验 ──
    all_referenced_stages = set()
    has_final = False

    for stage in stages:
        sid = stage.get("stage_id", "?")

        # Narrative 校验
        narrative = stage.get("narrative", [])
        if not narrative:
            result.add_warning(f"stage '{sid}' narrative 为空")

        for ni, node in enumerate(narrative):
            ntype = node.get("type")
            if ntype not in NARRATIVE_TYPES:
                result.add_error(f"stage '{sid}' narrative[{ni}].type 无效: {ntype}")
                continue
            if ntype == "dialogue":
                if not node.get("text"):
                    result.add_error(f"stage '{sid}' narrative[{ni}] dialogue 缺少 text")
            elif ntype == "narration":
                if not node.get("text"):
                    result.add_error(f"stage '{sid}' narrative[{ni}] narration 缺少 text")
            elif ntype == "effect":
                if "effects" not in node:
                    result.add_error(f"stage '{sid}' narrative[{ni}] effect 缺少 effects")
            elif ntype == "choice":
                if not node.get("text"):
                    result.add_error(f"stage '{sid}' narrative[{ni}] choice 缺少 text")
                options = node.get("options", [])
                if not options:
                    result.add_error(f"stage '{sid}' narrative[{ni}] choice 缺少 options")
                for oi, opt in enumerate(options):
                    if not opt.get("label"):
                        result.add_error(f"stage '{sid}' narrative[{ni}].options[{oi}] 缺少 label")
                    ns = opt.get("next_stage")
                    if ns:
                        all_referenced_stages.add(ns)

        # Settlement 校验
        settlement = stage.get("settlement")
        if settlement:
            stype = settlement.get("type")
            if stype == "dice_check":
                _validate_dice_check(settlement, sid, result)
                # 校验 results 中引用的卡牌
                _validate_settlement_effects(settlement.get("results", {}), sid, card_ids, result)
            elif stype == "trade":
                _validate_trade(settlement, sid, card_ids, result)
            elif stype == "choice":
                options = settlement.get("options", [])
                if not options:
                    result.add_error(f"stage '{sid}' settlement choice 缺少 options")
            else:
                result.add_error(f"stage '{sid}' settlement.type 无效: {stype}")

        # Branches 校验
        branches = stage.get("branches", [])
        for bi, branch in enumerate(branches):
            cond = branch.get("condition")
            valid_conditions = CHECK_RESULTS + ["default"]
            if cond not in valid_conditions:
                result.add_error(f"stage '{sid}' branches[{bi}].condition 无效: {cond}")
            ns = branch.get("next_stage")
            if ns:
                all_referenced_stages.add(ns)
            else:
                result.add_error(f"stage '{sid}' branches[{bi}] 缺少 next_stage")

        # is_final 检测
        if stage.get("is_final"):
            has_final = True

    # ── 7. 引用完整性 ──
    for ref in all_referenced_stages:
        if ref not in stage_ids:
            result.add_error(f"引用了不存在的 stage_id: '{ref}'")

    # ── 8. 不可达 stage 检测 ──
    reachable = set()
    if entry_stage:
        _find_reachable(entry_stage, stage_map, reachable)
    unreachable = stage_ids - reachable
    for u in unreachable:
        result.add_warning(f"stage '{u}' 不可达（从 entry_stage 无法到达）")

    # ── 9. 终止条件检测 ──
    if not has_final and not _has_exit_path(entry_stage, stage_map):
        result.add_warning("场景可能没有终止路径（无 is_final=true 的可达 stage）")

    # ── 10. Effects 中的卡牌引用校验 ──
    _validate_all_effects_cards(scene, card_ids, result)

    # ── 11. 语义一致性 ──
    if scene_type == "shop":
        has_trade = any(
            s.get("settlement", {}).get("type") == "trade" for s in stages
        )
        if not has_trade:
            result.add_warning("shop 类型场景没有 trade 结算，语义不一致")

    if scene_type == "challenge":
        has_char_slot = any(s.get("type") == "character" for s in slots)
        if not has_char_slot:
            result.add_warning("challenge 类型场景没有 character 槽位")

    # ── 12. unlock_conditions 校验 ──
    unlock = scene.get("unlock_conditions", {})
    if unlock:
        rep_min = unlock.get("reputation_min")
        if rep_min is not None and (not isinstance(rep_min, int) or rep_min < 0):
            result.add_error(f"unlock_conditions.reputation_min 无效: {rep_min}")

    # ── 13. absence_penalty 校验 ──
    penalty = scene.get("absence_penalty")
    if penalty:
        if "effects" not in penalty:
            result.add_error("absence_penalty 缺少 effects")
        if "narrative" not in penalty:
            result.add_error("absence_penalty 缺少 narrative")

    return result


def _validate_dice_check(settlement: Dict, sid: str, result: ValidationResult):
    """校验 dice_check settlement"""
    check = settlement.get("check")
    if not check:
        result.add_error(f"stage '{sid}' dice_check 缺少 check 配置")
        return
    if check.get("attribute") not in ATTRIBUTES:
        result.add_error(f"stage '{sid}' check.attribute 无效: {check.get('attribute')}")
    if check.get("calc_mode") not in CALC_MODES:
        result.add_error(f"stage '{sid}' check.calc_mode 无效: {check.get('calc_mode')}")
    target = check.get("target")
    if not isinstance(target, int) or target < 1:
        result.add_error(f"stage '{sid}' check.target 必须为正整数: {target}")

    results = settlement.get("results", {})
    for key in CHECK_RESULTS:
        if key not in results:
            result.add_error(f"stage '{sid}' dice_check 缺少 results.{key}")
        else:
            branch = results[key]
            if "narrative" not in branch:
                result.add_error(f"stage '{sid}' results.{key} 缺少 narrative")
            if "effects" not in branch:
                result.add_error(f"stage '{sid}' results.{key} 缺少 effects")


def _validate_trade(settlement: Dict, sid: str, card_ids: Dict[str, str], result: ValidationResult):
    """校验 trade settlement"""
    inv = settlement.get("shop_inventory")
    if inv is None:
        result.add_error(f"stage '{sid}' trade 缺少 shop_inventory")
    elif inv:
        for item_id in inv:
            if item_id not in card_ids:
                result.add_warning(f"stage '{sid}' shop_inventory 引用了未知卡牌: {item_id}")
    if "allow_sell" not in settlement:
        result.add_error(f"stage '{sid}' trade 缺少 allow_sell")


def _validate_settlement_effects(results: Dict, sid: str, card_ids: Dict[str, str], result: ValidationResult):
    """校验 settlement results 中的效果引用"""
    for key, branch in results.items():
        effects = branch.get("effects", {})
        _check_effects_cards(effects, f"stage '{sid}' results.{key}", card_ids, result)


def _check_effects_cards(effects: Dict, context: str, card_ids: Dict[str, str], result: ValidationResult):
    """检查 effects 中引用的卡牌是否存在"""
    for card_id in effects.get("cards_add", []):
        if card_id not in card_ids:
            result.add_warning(f"{context} effects.cards_add 引用未知卡牌: {card_id}")
    for card_id in effects.get("cards_remove", []):
        # card_invested_N 是合法的运行时引用
        if card_id.startswith("card_invested_"):
            continue
        if card_id not in card_ids:
            result.add_warning(f"{context} effects.cards_remove 引用未知卡牌: {card_id}")
    for card_id in list(effects.get("tags_add", {}).keys()) + list(effects.get("tags_remove", {}).keys()):
        if card_id.startswith("card_invested_"):
            continue
        if card_id not in card_ids:
            result.add_warning(f"{context} effects.tags 引用未知卡牌: {card_id}")
    if effects.get("unlock_scenes"):
        result.add_info(f"{context} 使用了 unlock_scenes（当前运行时未实现）")


def _validate_all_effects_cards(scene: Dict, card_ids: Dict[str, str], result: ValidationResult):
    """遍历场景所有效果节点，校验卡牌引用"""
    for stage in scene.get("stages", []):
        sid = stage.get("stage_id", "?")
        for ni, node in enumerate(stage.get("narrative", [])):
            if node.get("type") == "effect":
                _check_effects_cards(
                    node.get("effects", {}),
                    f"stage '{sid}' narrative[{ni}]",
                    card_ids, result
                )
            elif node.get("type") == "choice":
                for oi, opt in enumerate(node.get("options", [])):
                    if "effects" in opt:
                        _check_effects_cards(
                            opt["effects"],
                            f"stage '{sid}' narrative[{ni}].options[{oi}]",
                            card_ids, result
                        )

    # absence_penalty effects
    penalty = scene.get("absence_penalty")
    if penalty and isinstance(penalty, dict):
        _check_effects_cards(
            penalty.get("effects", {}),
            "absence_penalty",
            card_ids, result
        )


def _find_reachable(stage_id: str, stage_map: Dict, visited: set):
    """DFS 查找可达 stage"""
    if stage_id in visited or stage_id not in stage_map:
        return
    visited.add(stage_id)
    stage = stage_map[stage_id]

    # branches
    for branch in stage.get("branches", []):
        ns = branch.get("next_stage")
        if ns:
            _find_reachable(ns, stage_map, visited)

    # narrative choice options
    for node in stage.get("narrative", []):
        if node.get("type") == "choice":
            for opt in node.get("options", []):
                ns = opt.get("next_stage")
                if ns:
                    _find_reachable(ns, stage_map, visited)


def _has_exit_path(entry: str, stage_map: Dict, visited: set = None) -> bool:
    """检查是否存在终止路径"""
    if visited is None:
        visited = set()
    if not entry or entry not in stage_map:
        return False
    if entry in visited:
        return False
    visited.add(entry)

    stage = stage_map[entry]
    if stage.get("is_final"):
        return True

    # Check branches
    branches = stage.get("branches", [])
    if not branches:
        # No branches and not final
        # Check narrative choices
        for node in stage.get("narrative", []):
            if node.get("type") == "choice":
                for opt in node.get("options", []):
                    ns = opt.get("next_stage")
                    if ns and _has_exit_path(ns, stage_map, visited):
                        return True
        # No branches, no choices, might be implicitly final
        return True  # Single stage without branches treated as final

    for branch in branches:
        ns = branch.get("next_stage")
        if ns and _has_exit_path(ns, stage_map, visited):
            return True

    return False
