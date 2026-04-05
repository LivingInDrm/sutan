"""
generate 命令：根据 prompt 生成新场景
"""
from core.generator import generate_scene, repair_scene
from core.validator import validate_scene
from core.loader import save_scene, load_card_ids
from core.display import format_scene_detail


def cmd_generate(args):
    """生成新场景"""
    print(f"\n场景生成器")
    print(f"{'=' * 40}")
    print(f"  Prompt: {args.prompt}")
    print(f"  类型: {args.type} | 复杂度: {args.complexity} | 持续: {args.duration}天")
    if args.scene_id:
        print(f"  Scene ID: {args.scene_id}")
    print()

    # 1. 调用 LLM 生成
    scene = generate_scene(
        prompt=args.prompt,
        scene_id=args.scene_id,
        scene_type=args.type,
        complexity=args.complexity,
        duration=args.duration,
    )
    print(f"  生成完成: {scene.get('scene_id')} - {scene.get('name', '?')}")

    # 2. 校验
    card_ids = load_card_ids()
    max_retries = 2
    for attempt in range(max_retries + 1):
        result = validate_scene(scene, card_ids)

        if result.is_valid:
            break

        if attempt < max_retries:
            print(f"\n  校验发现 {len(result.errors)} 个错误，尝试自动修复 ({attempt + 1}/{max_retries})...")
            result.print_report(scene.get("scene_id", ""))
            scene = repair_scene(scene, result.errors)
            # 确保 scene_id 保持
            if args.scene_id:
                scene["scene_id"] = args.scene_id
        else:
            print(f"\n  自动修复失败，仍有 {len(result.errors)} 个错误:")
            result.print_report(scene.get("scene_id", ""))

    # 3. 保存
    path = save_scene(scene)
    print(f"\n  已保存: {path}")

    # 4. 展示结果
    if result.warnings:
        print(f"\n  警告 ({len(result.warnings)}):")
        for w in result.warnings:
            print(f"    [WARN] {w}")

    print(f"\n{format_scene_detail(scene)}")
    print(f"\n完成!")
