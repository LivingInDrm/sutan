# 苏丹游戏 - 设计文档

## 一句话概述

卡牌+roguelike，在处刑日前脱手苏丹卡、或完成主线剧情。

---

## 快速索引

| 你想了解 | 去哪看 |
|----------|--------|
| 每日流程、胜负条件 | [core/game_loop.md](core/game_loop.md) |
| 检定骰子怎么投 | [core/dice_check.md](core/dice_check.md) |
| 结算时发生什么 | [core/settlement.md](core/settlement.md) |
| 稀有度/属性有哪些 | [data/enums.md](data/enums.md) |
| 场景/卡牌 JSON 怎么写 | [data/schema.md](data/schema.md) |
| 数值平衡、难度 | [data/balance.md](data/balance.md) |
| 各类卡牌设计 | [content/cards.md](content/cards.md) |
| 场景参与、锁定 | [content/scenes.md](content/scenes.md) |
| 声望、俺寻思、成就 | [content/features.md](content/features.md) |
| UI 布局 | [ui/layout.md](ui/layout.md) |
| 美术风格 | [ui/visual_style.md](ui/visual_style.md) |
| 设计变更记录 | [dev/changelog.md](dev/changelog.md) |

---

## 目录结构

```
docs/
├── README.md                    # 本文件：概览 + 索引
├── core/                        # 核心规则（程序实现依据）
│   ├── game_loop.md            # 核心循环：每日流程、胜负条件
│   ├── dice_check.md           # 检定机制：骰子规则、重投、金骰子
│   └── settlement.md           # 结算系统：流程、effects、缺席处理
├── data/                        # 数据规格（枚举、Schema、数值）
│   ├── enums.md                # 枚举定义：稀有度、属性、各类型key
│   ├── schema.md               # 数据结构：场景/卡牌/存档 JSON
│   └── balance.md              # 数值设计：属性范围、经济、难度曲线
├── content/                     # 内容设计（策划填充）
│   ├── cards.md                # 卡牌设计：各类型卡牌规则、标签系统
│   ├── scenes.md               # 场景设计：卡槽、参与机制、锁定规则
│   └── features.md             # 功能系统：声望、俺寻思、成就
├── ui/                          # UI/美术规格
│   ├── visual_style.md         # 视觉风格：美术主题、配色、质感
│   └── layout.md               # UI布局：各界面布局规范
├── images/                      # 图片资源
└── dev/                         # 开发相关
    └── changelog.md            # 设计变更日志
```

---

## 术语表

| 术语 | 含义 |
|------|------|
| 处刑日 | 倒计时归零时检查苏丹卡，有则失败 |
| 苏丹卡 | 持有风险卡，处刑日前必须脱手 |
| 俺寻思 | 对卡牌触发思考事件的功能 |
| effects | 结算效果的统一数据结构 |
| 检定池 | 投骰数量，由属性+加成计算 |
| 爆骰 | 骰出10时额外投1颗骰子 |
| 重投 | 对失败骰子重新投掷的机会 |
| 金骰子 | 消耗后直接+1成功的稀有资源 |

---

## 核心循环简图

```
[游戏开始]
     ↓
┌─────────────────┐
│   【黎明阶段】   │ ← 刷新场景、处刑日-1、重置俺寻思
└────────┬────────┘
         ↓
┌─────────────────┐
│   【行动阶段】   │ ← 参与场景、管理卡牌、俺寻思、购物
└────────┬────────┘
         ↓
    [下一天]
         ↓
┌─────────────────┐
│   【结算阶段】   │ ← 到期场景检定→应用effects→归还卡牌
└────────┬────────┘
         ↓
   [胜利/失败?]
    ↓N      ↓Y
  循环    [结局]
```

---

## 文档维护规则

1. **枚举变更**：修改 `data/enums.md` 后，需全局搜索并同步
2. **Schema变更**：修改 `data/schema.md` 后，需通知程序
3. **数值调整**：仅修改 `data/balance.md`，其他文档引用此处
4. **变更记录**：所有重要修改需记录到 `dev/changelog.md`

---

## 参考图索引

| 图片 | 描述 | 文档引用 |
|------|------|----------|
| scene01-03 | 场景界面 | ui/layout.md, content/scenes.md |
| card01-09 | 各类卡牌 | content/cards.md |
| map01 | 大地图 | ui/layout.md |
| settlement01-04 | 结算界面 | ui/layout.md, core/settlement.md |
| dialog01-03 | 对话界面 | ui/layout.md |
| feature | 功能区 | ui/layout.md, content/features.md |
| achievements | 成就界面 | ui/layout.md, content/features.md |
