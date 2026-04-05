#!/usr/bin/env python3
"""
Sutan Scene Generator CLI
独立的场景生成器工具，支持 LLM 生成、结构化编辑、校验和查看。
"""

import argparse
import sys
from pathlib import Path

# Ensure local modules importable
sys.path.insert(0, str(Path(__file__).resolve().parent))

from commands.generate import cmd_generate
from commands.list_scenes import cmd_list
from commands.show import cmd_show
from commands.edit import cmd_edit
from commands.validate import cmd_validate


def main():
    parser = argparse.ArgumentParser(
        prog="scene_gen",
        description="Sutan 场景生成器 — 生成、编辑、校验场景 JSON",
    )
    sub = parser.add_subparsers(dest="command", help="可用子命令")

    # ── generate ──
    p_gen = sub.add_parser("generate", help="根据 prompt 生成新场景")
    p_gen.add_argument("prompt", help="启发性 prompt，描述场景主题/情节")
    p_gen.add_argument("--scene-id", help="指定 scene_id（覆盖已有场景）")
    p_gen.add_argument("--type", choices=["event", "shop", "challenge"], default="event", help="场景类型")
    p_gen.add_argument("--complexity", choices=["simple", "medium", "complex"], default="medium", help="目标复杂度")
    p_gen.add_argument("--duration", type=int, default=3, help="场景持续天数")

    # ── list ──
    sub.add_parser("list", help="列出所有场景概览")

    # ── show ──
    p_show = sub.add_parser("show", help="以人类可读格式展示场景结构")
    p_show.add_argument("scene_id", help="场景 ID")
    p_show.add_argument("--brief", action="store_true", help="显示简略格式（仅流程图摘要）")

    # ── edit ──
    p_edit = sub.add_parser("edit", help="编辑场景要素")
    p_edit.add_argument("scene_id", help="场景 ID")
    p_edit.add_argument("--name", help="修改场景名称")
    p_edit.add_argument("--description", help="修改场景描述")
    p_edit.add_argument("--duration", type=int, help="修改持续天数")
    p_edit.add_argument("--type", choices=["event", "shop", "challenge"], help="修改场景类型")
    p_edit.add_argument("--entry-stage", help="修改入口阶段")
    p_edit.add_argument("--background-image", help="修改背景图")
    # Slot 管理
    p_edit.add_argument("--add-slot", help="添加槽位 (格式: type:required:locked, 如 character:true:false)")
    p_edit.add_argument("--remove-slot", type=int, help="删除第 N 个槽位 (0-based)")
    # Stage 管理
    p_edit.add_argument("--stage", help="要编辑的 stage_id")
    p_edit.add_argument("--add-stage", help="新增 stage (格式: stage_id)")
    p_edit.add_argument("--remove-stage", help="删除指定 stage")
    p_edit.add_argument("--stage-final", choices=["true", "false"], help="设置 stage 是否为终点")
    # Narrative 编辑
    p_edit.add_argument("--narrative", type=int, help="要编辑的 narrative 节点索引 (0-based)")
    p_edit.add_argument("--text", help="修改文本内容")
    p_edit.add_argument("--speaker", help="修改说话者")
    p_edit.add_argument("--add-narrative", choices=["dialogue", "narration", "effect", "choice"], help="添加叙事节点类型")
    p_edit.add_argument("--remove-narrative", type=int, help="删除第 N 个叙事节点")
    # Settlement 编辑
    p_edit.add_argument("--settlement-attribute", choices=[
        "physique", "charm", "wisdom", "combat", "social", "survival", "stealth", "magic"
    ], help="修改判定属性")
    p_edit.add_argument("--settlement-target", type=int, help="修改判定目标值")
    p_edit.add_argument("--settlement-calc-mode", choices=["max", "sum", "min", "avg", "first", "specific"],
                        help="修改骰池计算模式")
    # Effects 编辑
    p_edit.add_argument("--result-branch", choices=["success", "partial_success", "failure", "critical_failure"],
                        help="要编辑的结果分支")
    p_edit.add_argument("--result-narrative", help="修改结果分支叙事文本")
    p_edit.add_argument("--effect-gold", type=int, help="修改金币效果")
    p_edit.add_argument("--effect-reputation", type=int, help="修改声望效果")
    # Unlock conditions
    p_edit.add_argument("--reputation-min", type=int, help="修改解锁声望门槛")
    # Absence penalty
    p_edit.add_argument("--absence-narrative", help="修改缺席叙事文本")
    p_edit.add_argument("--absence-reputation", type=int, help="修改缺席声望惩罚")
    # Interactive mode
    p_edit.add_argument("--interactive", action="store_true", help="进入交互式编辑模式")

    # ── validate ──
    p_val = sub.add_parser("validate", help="校验场景 JSON 合规性")
    p_val.add_argument("scene_id", nargs="?", help="要校验的场景 ID（不填则校验全部）")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    try:
        if args.command == "generate":
            cmd_generate(args)
        elif args.command == "list":
            cmd_list(args)
        elif args.command == "show":
            cmd_show(args)
        elif args.command == "edit":
            cmd_edit(args)
        elif args.command == "validate":
            cmd_validate(args)
    except KeyboardInterrupt:
        print("\n操作已取消。")
        sys.exit(1)
    except Exception as e:
        print(f"\n错误: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
