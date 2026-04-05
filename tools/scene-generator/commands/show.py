"""
show 命令：以人类可读格式展示场景结构
"""
from core.loader import load_scene
from core.display import format_scene_detail


def cmd_show(args):
    """展示场景详情"""
    scene = load_scene(args.scene_id)
    brief = getattr(args, "brief", False)
    print(f"\n{format_scene_detail(scene, brief=brief)}\n")
