#!/usr/bin/env python3
"""批量测试物品 prompt：4 个稀有度 × 各取第一个 variant 生 1 张图。"""

import argparse
import json
import os
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional

import requests


BASE_URL = "http://localhost:8100"
BIO = "长剑"
EQUIPMENT_TYPE = "weapon"
RARITIES = ["common", "rare", "epic", "legendary"]
DEFAULT_ITEM_NAMES = {
    "common": "霜汀",
    "rare": "照雪",
    "epic": "龙脊寒",
    "legendary": "春雷照夜",
}
SAMPLES_DIR = Path(__file__).resolve().parents[3] / "scripts" / "samples"


@dataclass
class VariantResult:
    index: int
    description: str
    image_paths: List[str] = field(default_factory=list)
    error: Optional[str] = None


@dataclass
class ItemResult:
    name: str
    rarity: str
    variants: List[VariantResult] = field(default_factory=list)
    error: Optional[str] = None


def log(message: str) -> None:
    print(message, flush=True)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="批量测试物品创建与生图")
    parser.add_argument("--base-url", default=BASE_URL, help="后端地址")
    parser.add_argument("--bio", default=BIO, help="创建物品时的 bio")
    parser.add_argument("--equipment-type", default=EQUIPMENT_TYPE, help="物品类型")
    parser.add_argument("--name-suffix", default="·测", help="名称冲突时追加后缀前缀")
    parser.add_argument("--common-name", default=DEFAULT_ITEM_NAMES["common"])
    parser.add_argument("--rare-name", default=DEFAULT_ITEM_NAMES["rare"])
    parser.add_argument("--epic-name", default=DEFAULT_ITEM_NAMES["epic"])
    parser.add_argument("--legendary-name", default=DEFAULT_ITEM_NAMES["legendary"])
    return parser.parse_args()


def ensure_openai_key() -> None:
    if os.environ.get("OPENAI_API_KEY", "").strip():
        return
    raise RuntimeError("OPENAI_API_KEY 未设置，无法执行生图。")


def list_items(base_url: str) -> List[dict]:
    response = requests.get(f"{base_url}/api/items", timeout=60)
    response.raise_for_status()
    return response.json()


def unique_name(name: str, existing_names: set[str], suffix: str) -> str:
    if name not in existing_names:
        existing_names.add(name)
        return name
    index = 1
    while True:
        candidate = f"{name}{suffix}{index:02d}"
        if candidate not in existing_names:
            existing_names.add(candidate)
            return candidate
        index += 1


def create_item(base_url: str, name: str, rarity: str, bio: str, equipment_type: str) -> List[dict]:
    response = requests.post(
        f"{base_url}/api/items",
        json={
            "name": name,
            "bio": bio,
            "equipment_type": equipment_type,
            "rarity": rarity,
        },
        timeout=240,
    )
    response.raise_for_status()
    return response.json().get("item", {}).get("variants", [])


def generate_image(base_url: str, name: str, description: str) -> List[str]:
    response = requests.post(
        f"{base_url}/api/item-generate",
        json={
            "asset_type": "item",
            "name": name,
            "description": description,
            "count": 1,
        },
        stream=True,
        timeout=1800,
    )
    response.raise_for_status()

    images: List[str] = []
    for raw_line in response.iter_lines(decode_unicode=True):
        if not raw_line or not raw_line.startswith("data: "):
            continue
        payload = json.loads(raw_line[6:])
        event_type = payload.get("type")
        if event_type == "progress":
            log(f"      [progress] {payload.get('message', '')}")
        elif event_type == "error":
            raise RuntimeError(payload.get("message", "未知 SSE 错误"))
        elif event_type == "done":
            images = [image.get("path", "") for image in payload.get("images", []) if image.get("path")]
    if not images:
        raise RuntimeError("SSE 结束但未返回图片路径")
    return images


def print_summary(results: List[ItemResult], elapsed: float) -> None:
    total_images = sum(len(variant.image_paths) for item in results for variant in item.variants)
    log("")
    log("=" * 72)
    log("汇总")
    log("=" * 72)
    log(f"物品数: {len(results)}")
    log(f"variant 数: {sum(len(item.variants) for item in results)}")
    log(f"成功图片数: {total_images}")
    for item in results:
        log(f"- {item.name} [{item.rarity}]")
        if item.error:
            log(f"  错误: {item.error}")
            continue
        for variant in item.variants:
            log(f"  Variant {variant.index + 1}: {variant.description}")
            if variant.error:
                log(f"    失败: {variant.error}")
            else:
                for path in variant.image_paths:
                    log(f"    图片: {SAMPLES_DIR / path}")
    log(f"总耗时: {elapsed:.1f}s")


def main() -> int:
    args = parse_args()
    ensure_openai_key()

    item_names = {
        "common": args.common_name,
        "rare": args.rare_name,
        "epic": args.epic_name,
        "legendary": args.legendary_name,
    }

    log(f"检查后端: {args.base_url}")
    existing_names = {item.get('name', '') for item in list_items(args.base_url) if item.get('name')}
    log(f"已连接后端，现有物品数: {len(existing_names)}")

    started_at = time.time()
    results: List[ItemResult] = []

    for item_index, rarity in enumerate(RARITIES, start=1):
        name = unique_name(item_names[rarity], existing_names, args.name_suffix)
        item_result = ItemResult(name=name, rarity=rarity)
        results.append(item_result)

        log("")
        log(f"[{item_index}/4] 创建物品 {name} ({rarity})")
        try:
            variants = create_item(args.base_url, name, rarity, args.bio, args.equipment_type)
        except Exception as exc:
            item_result.error = str(exc)
            log(f"  创建失败: {item_result.error}")
            continue

        log(f"  创建成功，variant 数: {len(variants)}")
        for variant in variants:
            item_result.variants.append(
                VariantResult(
                    index=variant.get("index", len(item_result.variants)),
                    description=variant.get("description", ""),
                )
            )

        if item_result.variants:
            first_variant = item_result.variants[0]
            log("    -> 仅对第 1 条 variant 开始生图")
            try:
                first_variant.image_paths = generate_image(args.base_url, name, first_variant.description)
                for path in first_variant.image_paths:
                    log(f"      完成: {SAMPLES_DIR / path}")
            except Exception as exc:
                first_variant.error = str(exc)
                log(f"      失败: {first_variant.error}")

    elapsed = time.time() - started_at
    print_summary(results, elapsed)

    created_items = sum(1 for item in results if not item.error and len(item.variants) == 4)
    created_images = sum(len(variant.image_paths) for item in results for variant in item.variants)
    return 0 if created_items == 4 and created_images == 4 else 1


if __name__ == "__main__":
    sys.exit(main())