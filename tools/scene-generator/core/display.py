"""
场景可视化展示 — 人类可读格式
"""
from typing import Any, Dict, List

# ─── Unicode 符号常量 ───────────────────────────────────────────
_SEP = "━" * 50
_NARR = "📖"
_DIAL = "🗣"
_EFCT = "✨"
_CHEK = "⚔️ "
_CHOI = "🔀"
_END  = "🏁"

# 结果分支标签
_RESULT_LABELS = {
    "success":          ("✅", "大成功/成功"),
    "partial_success":  ("✔️ ", "部分成功"),
    "failure":          ("✖️ ", "失败"),
    "critical_failure": ("💀", "大失败"),
}

# 属性中文名
_ATTR_CN = {
    "physique": "体魄", "charm": "魅力", "wisdom": "智识",
    "combat": "武艺", "social": "社交", "survival": "求生",
    "stealth": "潜行", "magic": "秘术",
}


# ═══════════════════════════════════════════════════════════
# 公开接口
# ═══════════════════════════════════════════════════════════

def format_scene_summary(scene: Dict[str, Any]) -> str:
    """格式化场景简要信息（用于 list 命令）"""
    sid = scene.get("scene_id", "?")
    name = scene.get("name", "?")
    stype = scene.get("type", "?")
    duration = scene.get("duration", "?")
    stages = scene.get("stages", [])
    slots = scene.get("slots", [])

    slot_desc = _format_slots_brief(slots)
    unlock = _format_unlock_brief(scene.get("unlock_conditions"))

    return (
        f"  {sid:20s} | {name:20s} | {stype:10s} | {duration}天 "
        f"| {len(stages)}阶段 | {slot_desc}{unlock}"
    )


def format_scene_detail(scene: Dict[str, Any], brief: bool = False) -> str:
    """格式化场景详细结构（用于 show 命令）
    
    Args:
        scene: 场景数据字典
        brief: True 则显示简略格式（旧行为），False 则显示完整内容
    """
    if brief:
        return _format_brief(scene)
    return _format_full(scene)


# ═══════════════════════════════════════════════════════════
# 完整格式（默认）
# ═══════════════════════════════════════════════════════════

def _format_full(scene: Dict[str, Any]) -> str:
    """完整展示场景所有叙事内容"""
    lines = []
    sid = scene.get("scene_id", "?")
    name = scene.get("name", "?")
    desc = scene.get("description", "")
    stype = scene.get("type", "?")
    duration = scene.get("duration", "?")
    slots = scene.get("slots", [])
    stages = scene.get("stages", [])
    entry = scene.get("entry_stage", "?")

    # ── 场景头部 ────────────────────────────────────────────
    lines.append(f"📜 {sid} — {name}")
    lines.append(f"   类型: {stype} | 持续: {duration}天")
    if desc:
        lines.append(f"   简介: {desc}")
    lines.append(f"   槽位: {_format_slots_detail(slots)}")
    lines.append(f"   入口: {entry}")

    unlock = scene.get("unlock_conditions")
    if unlock:
        parts = []
        if unlock.get("reputation_min") is not None:
            parts.append(f"声望≥{unlock['reputation_min']}")
        if unlock.get("required_tags"):
            parts.append(f"标签: {','.join(unlock['required_tags'])}")
        if parts:
            lines.append(f"   解锁: {' + '.join(parts)}")

    penalty = scene.get("absence_penalty")
    if penalty:
        eff_str = _format_effects_brief(penalty.get("effects", {}))
        pen_narr = penalty.get("narrative", "")
        lines.append(f"   缺席: {eff_str}")
        if pen_narr:
            lines.append(f"         「{pen_narr}」")

    # ── 按流程顺序渲染每个 Stage ─────────────────────────────
    stage_map = {s.get("stage_id"): s for s in stages}
    rendered: set = set()

    _render_full_stage_tree(entry, stage_map, lines, rendered)

    # 渲染不可达 stage
    for s in stages:
        if s.get("stage_id") not in rendered:
            lines.append("")
            lines.append(f"⚠️  [不可达 Stage]")
            _render_full_stage_tree(s["stage_id"], stage_map, lines, rendered)

    return "\n".join(lines)


def _render_full_stage_tree(stage_id: str, stage_map: Dict, lines: List[str],
                             rendered: set):
    """递归渲染 Stage 完整内容树"""
    if stage_id in rendered:
        return
    if stage_id not in stage_map:
        lines.append(f"\n   ⚠️  Stage「{stage_id}」未定义")
        return

    rendered.add(stage_id)
    stage = stage_map[stage_id]
    narrative = stage.get("narrative", [])
    settlement = stage.get("settlement")
    branches = stage.get("branches", [])
    is_final = stage.get("is_final", False)

    # Stage 分隔线 + 标题
    lines.append("")
    lines.append(_SEP)
    final_mark = f"  {_END} [终结]" if is_final else ""
    lines.append(f"   [{stage_id}]{final_mark}")
    lines.append(_SEP)

    # ── 叙事节点 ─────────────────────────────────────────────
    for node in narrative:
        ntype = node.get("type", "?")
        if ntype == "narration":
            lines.append(f"   {_NARR} {node.get('text', '')}")
        elif ntype == "dialogue":
            speaker = node.get("speaker", "?")
            text = node.get("text", "")
            lines.append(f"   {_DIAL} {speaker}：{text}")
        elif ntype == "effect":
            eff = _format_effects_brief(node.get("effects", {}))
            lines.append(f"   {_EFCT} [效果] {eff}")
        elif ntype == "choice":
            lines.append(f"   {_CHOI} [玩家选择]")
            for opt in node.get("options", []):
                label = opt.get("label", "?")
                ns = opt.get("next_stage", "无")
                eff = _format_effects_brief(opt.get("effects", {})) if opt.get("effects") else ""
                eff_str = f"  效果: {eff}" if eff else ""
                lines.append(f"   │  ├─ 「{label}」{eff_str}  → [{ns}]")

    # ── 结算（dice_check / trade / choice）────────────────────
    if settlement:
        stype = settlement.get("type")
        lines.append("")

        if stype == "dice_check":
            check = settlement.get("check", {})
            attr_raw = check.get("attribute", "?")
            attr_cn = _ATTR_CN.get(attr_raw, attr_raw)
            mode = check.get("calc_mode", "?")
            target = check.get("target", "?")
            check_narr = settlement.get("narrative", "")
            lines.append(f"   {_CHEK} 判定：{attr_cn}({mode}) target={target}")
            if check_narr:
                lines.append(f"   │   {check_narr}")

            # 构建 branch_map
            branch_map = {b["condition"]: b.get("next_stage") for b in branches}
            results = settlement.get("results", {})

            for rkey in ["success", "partial_success", "failure", "critical_failure"]:
                rb = results.get(rkey)
                if rb is None:
                    continue
                icon, label_cn = _RESULT_LABELS[rkey]
                ns = branch_map.get(rkey, branch_map.get("default", ""))
                ns_str = f"  → [{ns}]" if ns else ""
                lines.append(f"   ├─ {icon} {label_cn}:{ns_str}")
                rb_narr = rb.get("narrative", "")
                if rb_narr:
                    lines.append(f"   │    📖 {rb_narr}")
                rb_eff = rb.get("effects", {})
                if rb_eff:
                    lines.append(f"   │    {_EFCT} {_format_effects_brief(rb_eff)}")

        elif stype == "trade":
            inv = settlement.get("shop_inventory", [])
            lines.append(f"   🛒 [商店] 商品: {len(inv)}件 | 允许出售: {settlement.get('allow_sell')}")
            for item in inv:
                if isinstance(item, dict):
                    name = item.get("name", item.get("card_id", "?"))
                    qty = item.get("quantity", 1)
                    price = item.get("price", "?")
                    lines.append(f"   │  ├─ {name} × {qty}  价格: {price}金")
                else:
                    lines.append(f"   │  ├─ {item}")

        elif stype == "choice":
            options = settlement.get("options", [])
            lines.append(f"   {_CHOI} [结算选择]")
            for opt in options:
                label = opt.get("label", "?")
                eff = _format_effects_brief(opt.get("effects", {}))
                ns = opt.get("next_stage", "")
                ns_str = f"  → [{ns}]" if ns else ""
                lines.append(f"   │  ├─ 「{label}」  效果: {eff}{ns_str}")

    # ── 递归渲染子 Stage ──────────────────────────────────────
    # 从 branches 中收集跳转目标（按 condition 顺序去重）
    seen_next: list = []
    for b in branches:
        ns = b.get("next_stage")
        if ns and ns not in seen_next:
            seen_next.append(ns)

    # 从 narrative 中的 choice 节点收集跳转目标
    for node in narrative:
        if node.get("type") == "choice":
            for opt in node.get("options", []):
                ns = opt.get("next_stage")
                if ns and ns not in seen_next:
                    seen_next.append(ns)

    for ns in seen_next:
        if ns not in rendered:
            _render_full_stage_tree(ns, stage_map, lines, rendered)


# ═══════════════════════════════════════════════════════════
# 简略格式（--brief / 旧行为）
# ═══════════════════════════════════════════════════════════

def _format_brief(scene: Dict[str, Any]) -> str:
    """格式化场景详细结构 - 简略版（旧 show 行为）"""
    lines = []
    sid = scene.get("scene_id", "?")
    name = scene.get("name", "?")
    desc = scene.get("description", "")
    stype = scene.get("type", "?")
    duration = scene.get("duration", "?")
    slots = scene.get("slots", [])
    stages = scene.get("stages", [])
    entry = scene.get("entry_stage", "?")

    # Header
    lines.append(f"{'=' * 60}")
    lines.append(f"  {sid} -- {name}")
    lines.append(f"{'=' * 60}")
    lines.append(f"  类型: {stype} | 持续: {duration}天")
    lines.append(f"  描述: {_truncate(desc, 60)}")
    lines.append(f"  槽位: {_format_slots_detail(slots)}")
    lines.append(f"  入口: {entry}")
    lines.append(f"  背景: {scene.get('background_image', '?')}")

    # Unlock conditions
    unlock = scene.get("unlock_conditions")
    if unlock:
        parts = []
        if unlock.get("reputation_min") is not None:
            parts.append(f"声望>={unlock['reputation_min']}")
        if unlock.get("required_tags"):
            parts.append(f"标签: {','.join(unlock['required_tags'])}")
        if parts:
            lines.append(f"  解锁: {' + '.join(parts)}")

    # Absence penalty
    penalty = scene.get("absence_penalty")
    if penalty:
        effects = penalty.get("effects", {})
        eff_parts = _format_effects_brief(effects)
        lines.append(f"  缺席: {eff_parts} | {_truncate(penalty.get('narrative', ''), 40)}")

    lines.append("")
    lines.append("  流程图:")

    # Build stage map
    stage_map = {s.get("stage_id"): s for s in stages}

    # Render flow from entry_stage
    rendered: set = set()
    _render_brief_stage_tree(entry, stage_map, lines, rendered, indent=3)

    # Render unreachable stages
    for s in stages:
        sid_s = s.get("stage_id")
        if sid_s not in rendered:
            lines.append("")
            lines.append(f"{'  ' * 3}[!不可达] {sid_s}")
            _render_brief_stage_tree(sid_s, stage_map, lines, rendered, indent=4)

    return "\n".join(lines)


def _render_brief_stage_tree(stage_id: str, stage_map: Dict, lines: List[str],
                              rendered: set, indent: int = 3):
    """递归渲染 stage 流程树（简略版）"""
    if stage_id in rendered or stage_id not in stage_map:
        if stage_id in rendered:
            lines.append(f"{'  ' * indent}[{stage_id}] (已展示)")
        return

    rendered.add(stage_id)
    stage = stage_map[stage_id]
    prefix = "  " * indent

    narrative = stage.get("narrative", [])
    settlement = stage.get("settlement")
    is_final = stage.get("is_final", False)

    narr_desc = _describe_narrative(narrative)
    final_mark = " -> [END]" if is_final else ""
    lines.append(f"{prefix}[{stage_id}] -- {narr_desc}{final_mark}")

    # Show narrative choices
    for node in narrative:
        if node.get("type") == "choice":
            for opt in node.get("options", []):
                label = _truncate(opt.get("label", "?"), 30)
                ns = opt.get("next_stage")
                eff = _format_effects_brief(opt.get("effects", {})) if opt.get("effects") else ""
                eff_str = f" {eff}" if eff else ""
                lines.append(f"{prefix}  |- 选择: {label}{eff_str} -> [{ns or '无跳转'}]")

    # Show settlement
    if settlement:
        stype = settlement.get("type")
        if stype == "dice_check":
            check = settlement.get("check", {})
            attr = check.get("attribute", "?")
            target = check.get("target", "?")
            mode = check.get("calc_mode", "?")
            lines.append(f"{prefix}  [判定] {attr}({mode}) target={target}")

            results = settlement.get("results", {})
            branches = stage.get("branches", [])
            branch_map = {b["condition"]: b["next_stage"] for b in branches}

            for rkey in ["success", "partial_success", "failure", "critical_failure"]:
                rb = results.get(rkey, {})
                eff = _format_effects_brief(rb.get("effects", {}))
                ns = branch_map.get(rkey, branch_map.get("default"))
                ns_str = f" -> [{ns}]" if ns else ""
                rkey_cn = {"success": "成功", "partial_success": "部分成功",
                            "failure": "失败", "critical_failure": "大失败"}.get(rkey, rkey)
                lines.append(f"{prefix}  |  {rkey_cn}: {eff}{ns_str}")

        elif stype == "trade":
            inv = settlement.get("shop_inventory", [])
            lines.append(f"{prefix}  [商店] 商品: {len(inv)}件 | 允许出售: {settlement.get('allow_sell')}")

        elif stype == "choice":
            options = settlement.get("options", [])
            lines.append(f"{prefix}  [结算选择] {len(options)}个选项")
            for opt in options:
                eff = _format_effects_brief(opt.get("effects", {}))
                lines.append(f"{prefix}  |  {opt.get('label', '?')}: {eff}")

    # Recurse into branches
    branches = stage.get("branches", [])
    for branch in branches:
        ns = branch.get("next_stage")
        if ns and ns not in rendered:
            _render_brief_stage_tree(ns, stage_map, lines, rendered, indent)

    # Recurse into narrative choice targets
    for node in narrative:
        if node.get("type") == "choice":
            for opt in node.get("options", []):
                ns = opt.get("next_stage")
                if ns and ns not in rendered:
                    _render_brief_stage_tree(ns, stage_map, lines, rendered, indent)


# ═══════════════════════════════════════════════════════════
# 私有辅助函数
# ═══════════════════════════════════════════════════════════

def _format_slots_brief(slots: List[Dict]) -> str:
    """简要格式化槽位"""
    if not slots:
        return "无槽位"
    parts = []
    type_count: Dict[str, int] = {}
    for s in slots:
        t = s.get("type", "?")
        type_count[t] = type_count.get(t, 0) + 1
    for t, c in type_count.items():
        type_cn = {"character": "角色", "item": "物品", "sultan": "苏丹", "gold": "金币"}.get(t, t)
        parts.append(f"{type_cn}x{c}")
    return " ".join(parts)


def _format_slots_detail(slots: List[Dict]) -> str:
    """详细格式化槽位"""
    if not slots:
        return "无"
    parts = []
    for s in slots:
        t = s.get("type", "?")
        type_cn = {"character": "角色", "item": "物品", "sultan": "苏丹", "gold": "金币"}.get(t, t)
        req = "必填" if s.get("required") else "可选"
        lock = " 锁定" if s.get("locked") else ""
        parts.append(f"[{type_cn}/{req}{lock}]")
    return " ".join(parts)


def _format_unlock_brief(unlock: Dict = None) -> str:
    """简要格式化解锁条件"""
    if not unlock:
        return ""
    parts = []
    if unlock.get("reputation_min") is not None:
        parts.append(f"声望>={unlock['reputation_min']}")
    if unlock.get("required_tags"):
        parts.append(f"标签:{','.join(unlock['required_tags'])}")
    return f" | 解锁: {' + '.join(parts)}" if parts else ""


def _format_effects_brief(effects: Dict) -> str:
    """简要格式化效果"""
    if not effects:
        return "(无效果)"
    parts = []
    if effects.get("gold"):
        g = effects["gold"]
        parts.append(f"金{g:+d}")
    if effects.get("reputation"):
        r = effects["reputation"]
        parts.append(f"声望{r:+d}")
    if effects.get("cards_add"):
        parts.append(f"+卡:{','.join(effects['cards_add'])}")
    if effects.get("cards_remove"):
        parts.append(f"-卡:{','.join(effects['cards_remove'])}")
    if effects.get("tags_add"):
        for cid, tags in effects["tags_add"].items():
            parts.append(f"标签+{cid}:{','.join(tags)}")
    if effects.get("tags_remove"):
        for cid, tags in effects["tags_remove"].items():
            parts.append(f"标签-{cid}:{','.join(tags)}")
    if effects.get("consume_invested"):
        parts.append("消耗投入卡")
    if effects.get("unlock_scenes"):
        parts.append(f"解锁场景:{','.join(effects['unlock_scenes'])}")
    return " | ".join(parts) if parts else "(无效果)"


def _describe_narrative(narrative: List[Dict]) -> str:
    """描述叙事节点组成（简略版用）"""
    if not narrative:
        return "空叙事"
    type_count: Dict[str, int] = {}
    for n in narrative:
        t = n.get("type", "?")
        type_count[t] = type_count.get(t, 0) + 1
    parts = []
    for t, c in type_count.items():
        type_cn = {"dialogue": "对话", "narration": "旁白", "effect": "效果", "choice": "选择"}.get(t, t)
        parts.append(f"{type_cn}x{c}")
    return "+".join(parts)


def _truncate(text: str, max_len: int = 50) -> str:
    """截断文本"""
    if len(text) <= max_len:
        return text
    return text[:max_len - 3] + "..."
