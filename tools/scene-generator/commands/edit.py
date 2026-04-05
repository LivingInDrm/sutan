"""
edit 命令：结构化编辑场景要素
"""
import json
from typing import Any, Dict

from core.loader import load_scene, save_scene
from core.display import format_scene_detail


def cmd_edit(args):
    """编辑场景要素"""
    scene = load_scene(args.scene_id)
    modified = False

    if args.interactive:
        _interactive_edit(scene)
        save_scene(scene)
        print(f"\n已保存。")
        print(format_scene_detail(scene))
        return

    # ── 顶层元数据 ──
    if args.name is not None:
        scene["name"] = args.name
        modified = True
        print(f"  name -> {args.name}")

    if args.description is not None:
        scene["description"] = args.description
        modified = True
        print(f"  description -> {args.description[:40]}...")

    if args.duration is not None:
        scene["duration"] = args.duration
        modified = True
        print(f"  duration -> {args.duration}")

    if args.type is not None:
        scene["type"] = args.type
        modified = True
        print(f"  type -> {args.type}")

    if args.entry_stage is not None:
        scene["entry_stage"] = args.entry_stage
        modified = True
        print(f"  entry_stage -> {args.entry_stage}")

    if args.background_image is not None:
        scene["background_image"] = args.background_image
        modified = True
        print(f"  background_image -> {args.background_image}")

    # ── Slot 管理 ──
    if args.add_slot is not None:
        slot = _parse_slot(args.add_slot)
        scene.setdefault("slots", []).append(slot)
        modified = True
        print(f"  添加槽位: {slot}")

    if args.remove_slot is not None:
        slots = scene.get("slots", [])
        if 0 <= args.remove_slot < len(slots):
            removed = slots.pop(args.remove_slot)
            modified = True
            print(f"  删除槽位[{args.remove_slot}]: {removed}")
        else:
            print(f"  错误: 槽位索引 {args.remove_slot} 超出范围 (共 {len(slots)} 个)")

    # ── Stage 管理 ──
    if args.add_stage is not None:
        new_stage = {
            "stage_id": args.add_stage,
            "narrative": [
                {"type": "narration", "text": "（待编辑）"}
            ],
            "is_final": True,
        }
        scene.setdefault("stages", []).append(new_stage)
        modified = True
        print(f"  新增 stage: {args.add_stage}")

    if args.remove_stage is not None:
        stages = scene.get("stages", [])
        idx = next((i for i, s in enumerate(stages) if s.get("stage_id") == args.remove_stage), None)
        if idx is not None:
            stages.pop(idx)
            modified = True
            print(f"  删除 stage: {args.remove_stage}")
        else:
            print(f"  错误: stage '{args.remove_stage}' 不存在")

    # ── Stage 内部编辑 ──
    if args.stage is not None:
        stage = _find_stage(scene, args.stage)
        if not stage:
            print(f"  错误: stage '{args.stage}' 不存在")
        else:
            # Stage final
            if args.stage_final is not None:
                stage["is_final"] = args.stage_final == "true"
                modified = True
                print(f"  stage '{args.stage}' is_final -> {stage['is_final']}")

            # Narrative 编辑
            if args.add_narrative is not None:
                node = _create_narrative_node(args.add_narrative)
                stage.setdefault("narrative", []).append(node)
                modified = True
                print(f"  stage '{args.stage}' 添加 {args.add_narrative} 节点")

            if args.remove_narrative is not None:
                narrative = stage.get("narrative", [])
                if 0 <= args.remove_narrative < len(narrative):
                    narrative.pop(args.remove_narrative)
                    modified = True
                    print(f"  stage '{args.stage}' 删除 narrative[{args.remove_narrative}]")
                else:
                    print(f"  错误: narrative 索引 {args.remove_narrative} 超出范围")

            if args.narrative is not None:
                narrative = stage.get("narrative", [])
                if 0 <= args.narrative < len(narrative):
                    node = narrative[args.narrative]
                    if args.text is not None:
                        node["text"] = args.text
                        modified = True
                        print(f"  stage '{args.stage}' narrative[{args.narrative}].text -> {args.text[:40]}...")
                    if args.speaker is not None:
                        node["speaker"] = args.speaker
                        modified = True
                        print(f"  stage '{args.stage}' narrative[{args.narrative}].speaker -> {args.speaker}")
                else:
                    print(f"  错误: narrative 索引 {args.narrative} 超出范围")

            # Settlement 编辑
            settlement = stage.get("settlement")
            if settlement and settlement.get("type") == "dice_check":
                check = settlement.get("check")
                if not check:
                    print(f"  错误: stage '{args.stage}' settlement 缺少 check 字段")
                else:
                    if args.settlement_attribute is not None:
                        check["attribute"] = args.settlement_attribute
                        modified = True
                        print(f"  stage '{args.stage}' check.attribute -> {args.settlement_attribute}")
                    if args.settlement_target is not None:
                        check["target"] = args.settlement_target
                        modified = True
                        print(f"  stage '{args.stage}' check.target -> {args.settlement_target}")
                    if args.settlement_calc_mode is not None:
                        check["calc_mode"] = args.settlement_calc_mode
                        modified = True
                        print(f"  stage '{args.stage}' check.calc_mode -> {args.settlement_calc_mode}")

                # Result branch 编辑
                if args.result_branch is not None:
                    results = settlement.get("results", {})
                    branch = results.get(args.result_branch)
                    if branch:
                        if args.result_narrative is not None:
                            branch["narrative"] = args.result_narrative
                            modified = True
                            print(f"  stage '{args.stage}' results.{args.result_branch}.narrative -> {args.result_narrative[:40]}...")
                        if args.effect_gold is not None:
                            branch.setdefault("effects", {})["gold"] = args.effect_gold
                            modified = True
                            print(f"  stage '{args.stage}' results.{args.result_branch}.effects.gold -> {args.effect_gold}")
                        if args.effect_reputation is not None:
                            branch.setdefault("effects", {})["reputation"] = args.effect_reputation
                            modified = True
                            print(f"  stage '{args.stage}' results.{args.result_branch}.effects.reputation -> {args.effect_reputation}")
                    else:
                        print(f"  错误: results.{args.result_branch} 不存在")

    # ── Unlock conditions ──
    if args.reputation_min is not None:
        scene.setdefault("unlock_conditions", {})["reputation_min"] = args.reputation_min
        modified = True
        print(f"  unlock_conditions.reputation_min -> {args.reputation_min}")

    # ── Absence penalty ──
    if args.absence_narrative is not None or args.absence_reputation is not None:
        penalty = scene.get("absence_penalty") or {"effects": {}, "narrative": ""}
        if args.absence_narrative is not None:
            penalty["narrative"] = args.absence_narrative
            modified = True
            print(f"  absence_penalty.narrative -> {args.absence_narrative[:40]}...")
        if args.absence_reputation is not None:
            penalty["effects"]["reputation"] = args.absence_reputation
            modified = True
            print(f"  absence_penalty.effects.reputation -> {args.absence_reputation}")
        scene["absence_penalty"] = penalty

    if modified:
        path = save_scene(scene)
        print(f"\n  已保存: {path}")
    else:
        print("  未做任何修改。使用 --help 查看可用编辑选项。")


def _find_stage(scene: Dict, stage_id: str) -> Dict:
    """查找指定 stage"""
    for stage in scene.get("stages", []):
        if stage.get("stage_id") == stage_id:
            return stage
    return None


def _parse_slot(slot_str: str) -> Dict:
    """解析槽位字符串 (type:required:locked)"""
    parts = slot_str.split(":")
    if len(parts) != 3:
        raise ValueError(f"槽位格式错误: '{slot_str}'，应为 'type:required:locked'")
    return {
        "type": parts[0],
        "required": parts[1].lower() == "true",
        "locked": parts[2].lower() == "true",
    }


def _create_narrative_node(ntype: str) -> Dict:
    """创建新的叙事节点"""
    if ntype == "dialogue":
        return {"type": "dialogue", "speaker": "（待编辑）", "text": "（待编辑）"}
    elif ntype == "narration":
        return {"type": "narration", "text": "（待编辑）"}
    elif ntype == "effect":
        return {"type": "effect", "effects": {}, "text": "（待编辑）"}
    elif ntype == "choice":
        return {
            "type": "choice",
            "text": "（待编辑）",
            "options": [{"label": "选项1"}],
        }
    raise ValueError(f"未知叙事节点类型: {ntype}")


def _interactive_edit(scene: Dict):
    """交互式编辑模式"""
    print(f"\n交互式编辑: {scene.get('scene_id')}")
    print(f"{'=' * 50}")
    print("输入 'q' 退出, 'show' 查看当前结构, 'help' 查看帮助\n")

    while True:
        try:
            cmd = input("edit> ").strip()
        except EOFError:
            break

        if not cmd:
            continue
        if cmd in ("q", "quit", "exit"):
            break
        if cmd == "show":
            print(format_scene_detail(scene))
            continue
        if cmd == "help":
            _print_interactive_help()
            continue

        parts = cmd.split(maxsplit=1)
        field = parts[0]
        value = parts[1] if len(parts) > 1 else None

        if field == "name" and value:
            scene["name"] = value
            print(f"  name -> {value}")
        elif field == "description" and value:
            scene["description"] = value
            print(f"  description -> {value[:40]}...")
        elif field == "duration" and value:
            try:
                scene["duration"] = int(value)
                print(f"  duration -> {value}")
            except ValueError:
                print("  错误: duration 必须是整数")
        elif field == "type" and value:
            if value in ("event", "shop", "challenge"):
                scene["type"] = value
                print(f"  type -> {value}")
            else:
                print("  错误: type 必须是 event/shop/challenge")
        elif field == "entry_stage" and value:
            scene["entry_stage"] = value
            print(f"  entry_stage -> {value}")
        elif field == "json":
            print(json.dumps(scene, ensure_ascii=False, indent=2))
        elif field == "stages":
            for s in scene.get("stages", []):
                final = " [FINAL]" if s.get("is_final") else ""
                print(f"  {s.get('stage_id')}{final} - {len(s.get('narrative', []))} 叙事节点")
        else:
            print(f"  未知命令: {field}。输入 'help' 查看帮助。")


def _print_interactive_help():
    """打印交互式帮助"""
    print("""
  可用命令:
    name <值>           修改场景名称
    description <值>    修改描述
    duration <数字>     修改持续天数
    type <event|shop|challenge>  修改类型
    entry_stage <id>    修改入口阶段
    stages              列出所有阶段
    show                展示场景结构
    json                输出原始 JSON
    q / quit            退出
""")
