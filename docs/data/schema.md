# 数据结构定义

本文档定义游戏核心数据的 JSON 结构。枚举值参考 [enums.md](enums.md)。

## 场景数据结构

场景包含结算配置，当场景回合数归零时触发结算。结算结果使用统一的 `effects` 结构。

```json
{
  "scene_id": "scene_001",
  "name": "权力的游戏",
  "description": "宫廷中的政治博弈...",
  "background_image": "scene01.png",
  "type": "event",
  "duration": 3,
  "slots": [
    {
      "type": "character",
      "required": true,
      "locked": false
    },
    {
      "type": "item",
      "required": false,
      "locked": false
    }
  ],
  "settlement": {
    "type": "dice_check",
    "narrative": "结算时的叙事文本...",
    "check": {
      "attribute": "social",
      "calc_mode": "max",
      "target": 8
    },
    "results": {
      "success": {
        "narrative": "成功的叙事...",
        "effects": {
          "gold": 20,
          "reputation": 5,
          "cards_add": ["card_010"]
        }
      },
      "partial_success": {
        "narrative": "险胜的叙事...",
        "effects": {
          "gold": 10,
          "reputation": 2
        }
      },
      "failure": {
        "narrative": "失败的叙事...",
        "effects": {
          "gold": -10,
          "reputation": -3
        }
      },
      "critical_failure": {
        "narrative": "大失败的叙事...",
        "effects": {
          "reputation": -8,
          "cards_remove": ["card_invested_0"]
        }
      }
    }
  },
  "unlock_conditions": {
    "reputation_min": 40,
    "required_tags": ["noble"]
  },
  "absence_penalty": {
    "effects": {
      "reputation": -5
    },
    "narrative": "你缺席了重要的宫廷会议..."
  }
}
```

### 场景字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `scene_id` | string | 是 | 唯一标识 |
| `name` | string | 是 | 显示名称 |
| `description` | string | 是 | 场景描述 |
| `background_image` | string | 是 | 背景图片路径 |
| `type` | enum | 是 | 场景类型，见 enums.md |
| `duration` | int | 是 | 持续回合数 |
| `slots` | array | 是 | 卡槽配置 |
| `settlement` | object | 是 | 结算配置 |
| `unlock_conditions` | object | 否 | 解锁条件 |
| `absence_penalty` | object | 否 | 缺席惩罚，未配置则无惩罚 |

### 卡槽字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | enum | 是 | 卡槽类型 |
| `required` | bool | 是 | 是否必填（红色标识） |
| `locked` | bool | 是 | 是否锁定型（自动获取卡片） |

### effects 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `gold` | int | 金币变化（正增负减） |
| `reputation` | int | 声望变化（正增负减） |
| `cards_add` | string[] | 添加卡牌到手牌 |
| `cards_remove` | string[] | 移除卡牌（`card_invested_N` 表示第N张投入卡） |
| `tags_add` | object | 为指定卡牌添加标签 |
| `tags_remove` | object | 从指定卡牌移除标签 |
| `unlock_scenes` | string[] | 解锁场景 |
| `consume_invested` | bool | 是否消耗所有投入卡 |

---

## 卡牌数据结构

```json
{
  "card_id": "card_001",
  "name": "阿尔图",
  "type": "character",
  "rarity": "silver",
  "description": "你自己，一个卷入苏丹游戏的可悲之人。",
  "image": "card01.png",
  "attributes": {
    "physique": 9,
    "charm": 5,
    "wisdom": 3,
    "combat": 8,
    "social": 4,
    "survival": 3,
    "stealth": 2,
    "magic": 2
  },
  "special_attributes": {
    "support": 2,
    "reroll": 1
  },
  "tags": ["male", "clan", "protagonist"],
  "equipment_slots": 3
}
```

### 卡牌字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `card_id` | string | 是 | 唯一标识 |
| `name` | string | 是 | 显示名称 |
| `type` | enum | 是 | 卡牌类型 |
| `rarity` | enum | 是 | 稀有度 |
| `description` | string | 是 | 卡牌描述 |
| `image` | string | 是 | 卡牌图片路径 |
| `attributes` | object | 人物卡必填 | 8项基础属性 |
| `special_attributes` | object | 否 | 特殊属性 |
| `tags` | string[] | 否 | 标签列表 |
| `equipment_slots` | int | 人物卡必填 | 装备槽数量 |

**苏丹卡判定**：通过 `type: "sultan"` 标识，见 [enums.md](enums.md) 的 `card_type` 枚举。

### 装备卡额外字段

```json
{
  "card_id": "equip_001",
  "type": "equipment",
  "equipment_type": "weapon",
  "attribute_bonus": {
    "combat": 5
  },
  "special_bonus": {
    "reroll": 1
  },
  "gem_slots": 2
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `equipment_type` | enum | 装备类型 |
| `attribute_bonus` | object | 属性加成 |
| `special_bonus` | object | 特殊属性加成 |
| `gem_slots` | int | 宝石镶嵌孔数 |

---

## 存档数据结构

```json
{
  "save_id": "save_001",
  "timestamp": "2026-02-05T14:30:00",
  "game_state": {
    "current_day": 7,
    "execution_countdown": 8,
    "gold": 45,
    "reputation": 62,
    "rewind_charges": 2,
    "golden_dice": 3,
    "think_charges": 3
  },
  "cards": {
    "hand": ["card_001", "card_005", "card_012"],
    "equipped": {
      "card_001": ["equip_004", "equip_007"]
    },
    "locked_in_scenes": {
      "scene_003": ["card_005"]
    },
    "think_used_today": ["card_001"]
  },
  "scenes": {
    "active": ["scene_003", "scene_005"],
    "completed": ["scene_001", "scene_002"],
    "scene_states": {
      "scene_003": {
        "remaining_turns": 2,
        "invested_cards": ["card_005"]
      }
    }
  },
  "achievements_unlocked": ["ach_001", "ach_003"],
  "npc_relations": {
    "npc_001": 75,
    "npc_002": 30
  }
}
```

### 存档字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `save_id` | string | 存档唯一标识 |
| `timestamp` | string | 存档时间（ISO 8601） |
| `game_state` | object | 游戏状态 |
| `cards` | object | 卡牌状态 |
| `scenes` | object | 场景状态 |
| `achievements_unlocked` | string[] | 已解锁成就 |
| `npc_relations` | object | NPC好感度 |

### game_state 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `current_day` | int | 当前天数 |
| `execution_countdown` | int | 处刑日倒计时 |
| `gold` | int | 金币数量 |
| `reputation` | int | 声望值（0-100） |
| `rewind_charges` | int | 时间回溯次数 |
| `golden_dice` | int | 金骰子数量 |
| `think_charges` | int | 今日剩余俺寻思次数 |

### cards 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `hand` | string[] | 手牌中的卡牌ID |
| `equipped` | object | 装备关系：角色ID -> 装备ID[] |
| `locked_in_scenes` | object | 锁定在场景中的卡：场景ID -> 卡牌ID[] |
| `think_used_today` | string[] | 今日已使用俺寻思的卡牌ID |

---

## 商店场景特殊结构

商店是特殊场景，`duration = 1` 表示当天参与当天结算。

```json
{
  "scene_id": "scene_shop_001",
  "name": "装备商人",
  "type": "shop",
  "duration": 1,
  "settlement": {
    "type": "trade",
    "shop_inventory": ["card_101", "card_102", "card_103"],
    "allow_sell": true,
    "refresh_cycle": 7
  },
  "absence_penalty": null
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `shop_inventory` | string[] | 商店库存卡牌ID |
| `allow_sell` | bool | 是否允许玩家出售卡牌 |
| `refresh_cycle` | int | 刷新周期（天） |
