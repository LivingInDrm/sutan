"""
validate 命令：校验场景合规性
"""
from core.loader import load_scene, load_all_scenes, load_card_ids
from core.validator import validate_scene


def cmd_validate(args):
    """校验场景"""
    card_ids = load_card_ids()

    if args.scene_id:
        # 校验单个场景
        scene = load_scene(args.scene_id)
        print(f"\n校验场景: {args.scene_id}")
        print(f"{'=' * 50}")
        result = validate_scene(scene, card_ids)
        result.print_report(args.scene_id)
        if result.is_valid:
            print(f"\n  结果: 通过")
        else:
            print(f"\n  结果: 失败 ({len(result.errors)} 错误, {len(result.warnings)} 警告)")
    else:
        # 校验全部场景
        scenes = load_all_scenes()
        if not scenes:
            print("  没有找到任何场景文件。")
            return

        print(f"\n校验全部场景 ({len(scenes)} 个)")
        print(f"{'=' * 50}")
        total_errors = 0
        total_warnings = 0
        for scene in sorted(scenes, key=lambda s: s.get("scene_id", "")):
            sid = scene.get("scene_id", "?")
            result = validate_scene(scene, card_ids)
            total_errors += len(result.errors)
            total_warnings += len(result.warnings)
            status = "PASS" if result.is_valid else "FAIL"
            warn_str = f" ({len(result.warnings)} 警告)" if result.warnings else ""
            print(f"\n  [{status}] {sid}{warn_str}")
            if not result.is_valid or result.warnings:
                result.print_report()

        print(f"\n{'=' * 50}")
        print(f"  总计: {total_errors} 错误, {total_warnings} 警告")
        if total_errors == 0:
            print(f"  全部通过!")
        print()
