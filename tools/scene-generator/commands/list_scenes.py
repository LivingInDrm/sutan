"""
list 命令：列出所有场景概览
"""
from core.loader import load_all_scenes
from core.display import format_scene_summary


def cmd_list(args):
    """列出所有场景"""
    scenes = load_all_scenes()
    if not scenes:
        print("  没有找到任何场景文件。")
        return

    print(f"\n{'=' * 100}")
    print(f"  Sutan 场景列表 ({len(scenes)} 个)")
    print(f"{'=' * 100}")
    print(f"  {'ID':20s} | {'名称':20s} | {'类型':10s} | 时长  | 阶段 | 槽位与条件")
    print(f"  {'-' * 95}")
    for scene in sorted(scenes, key=lambda s: s.get("scene_id", "")):
        print(format_scene_summary(scene))
    print()
