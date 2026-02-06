# 结算系统

本文档定义场景结算的完整流程。数据结构参考 [../data/schema.md](../data/schema.md)。

## 结算触发条件

- 场景 `remaining_turns` 从 1 变为 0 时触发
- 玩家点击"下一天"后，当天结算所有到期场景

---

## 结算原子性顺序

```
1. [锁定结算对象]：场景、投入卡、随机种子
       ↓
2. [显示结算叙事文本]
       ↓
3. [执行检定]（若需要）
   → 初投 → 爆骰 → 玩家重投 → 玩家消耗金骰子 → 确认成功数
       ↓
4. [确定结果分支]：success / partial_success / failure / critical_failure
       ↓
5. [应用效果]（effects）：
   - 资源变化（gold、reputation等，正负均可）
   - 卡牌操作（生成、移除、升级、添加标签）
   - 消耗投入卡（若脚本配置）
   - 其他效果（解锁场景、触发事件等）
       ↓
6. [解除锁定]：将未被消耗/移除的投入卡归还玩家
       ↓
7. [场景处理]：从地图移除或重置
```

---

## 结算类型

### 检定结算（dice_check）

基于骰子检定判定成功/失败，详见 [dice_check.md](dice_check.md)。

```json
{
  "settlement": {
    "type": "dice_check",
    "check": {
      "attribute": "social",
      "calc_mode": "max",
      "target": 8
    },
    "results": { ... }
  }
}
```

### 交易结算（trade）

商店场景的结算，无检定，纯交易行为。

```json
{
  "settlement": {
    "type": "trade",
    "shop_inventory": ["card_101", "card_102"],
    "allow_sell": true
  }
}
```

### 选择结算（choice）

提供多个选项，玩家选择后直接应用对应 effects。

```json
{
  "settlement": {
    "type": "choice",
    "options": [
      {
        "label": "战斗",
        "effects": { "reputation": 5, "gold": -10 }
      },
      {
        "label": "和平",
        "effects": { "reputation": -5, "gold": 20 }
      }
    ]
  }
}
```

---

## 缺席处理规则

当场景到期且玩家未参与时：

- **配置了 `absence_penalty`**：执行其 effects 并显示叙事
- **未配置**：场景直接消失，不产生任何效果

```json
{
  "absence_penalty": {
    "effects": {
      "reputation": -5
    },
    "narrative": "你缺席了重要的宫廷会议..."
  }
}
```

---

## effects 字段详解

| 字段 | 类型 | 说明 |
|------|------|------|
| `gold` | int | 金币变化（正增负减） |
| `reputation` | int | 声望变化（正增负减） |
| `cards_add` | string[] | 添加卡牌到手牌 |
| `cards_remove` | string[] | 移除卡牌 |
| `tags_add` | object | 为指定卡牌添加标签 |
| `tags_remove` | object | 从指定卡牌移除标签 |
| `unlock_scenes` | string[] | 解锁场景 |
| `consume_invested` | bool | 是否消耗所有投入卡 |

### 特殊标记

- `card_invested_0`：第一张投入卡
- `card_invested_1`：第二张投入卡
- 以此类推

---

## 结算界面布局

- **左右分屏设计**：左侧交互区（约40-45%）+ 右侧文本区（约55-60%）
- **视觉风格**：深色皮革背景、羊皮纸纹理、金色齿轮装饰、蒸汽朋克风格边框

### 右侧文本区

- **标题栏**：金色边框，显示场景名称
- **叙事文本**：大段羊皮纸背景的结算描述
- **选项区**：菱形符号（◆）标识的可选项（若有）
- **底部操作栏**：确认按钮、AUTO自动按钮
- **资源显示**：金币、护盾等当前资源

---

## 结算UI示例

### 检定结算
- 显示骰子数字和成功门槛
- 成功后获得卡牌奖励，失败则受到惩罚

### 奖励选择结算
- 检定成功后，从多张卡牌中选择奖励
- 卡牌横向或网格排列展示
- 新卡牌标记"新出現！"
- 卡牌属性升级（+1标识）

### 分支选择结算
- 提供对立选项（战斗/和平、风险/保守）
- 两个菱形选项并列
- 不同选项导向不同结果和奖惩

### 交易结算
- 商店场景的结算
- 用资源换取物品/服务
- 显示消耗和收益
- 多个商品卡可选
