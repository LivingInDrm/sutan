# 场景系统 & 结算系统 — 代码实现参考

本文档记录场景系统和结算系统的**代码实现现状**，供后续开发时快速定位和理解。

---

## 一、文件清单

| 文件 | 职责 |
|------|------|
| `core/types/index.ts` | `Scene`, `SceneState`, `Settlement`, `Effects`, `Slot` 等接口定义 |
| `core/types/enums.ts` | `SceneType`, `SceneStatus`, `SlotType`, `CheckResult`, `CalcMode` 等枚举 |
| `core/scene/SceneManager.ts` | 场景生命周期管理（注册、激活、参与、倒计时、完成） |
| `core/scene/SlotSystem.ts` | 卡槽状态管理与校验（放置/移除卡牌、类型匹配） |
| `core/settlement/SettlementExecutor.ts` | 结算调度器，按 `settlement.type` 分发到三种结算逻辑 |
| `core/settlement/DiceChecker.ts` | 骰子检定引擎（投骰、爆骰、重投、金骰子、判定结果） |
| `core/settlement/calcCheckPool.ts` | 骰池大小计算（6 种聚合模式） |
| `core/settlement/EffectApplier.ts` | 效果执行器（金币/声望/卡牌增删/标签/消耗投入卡） |
| `core/game/DayManager.ts` | 每日流程，驱动结算触发 |
| `core/game/GameManager.ts` | 场景注册入口，串联所有子系统 |
| `data/configs/scenes/base_scenes.json` | 具体场景内容数据（JSON 配置） |
| `ui/screens/SceneScreen.tsx` | 场景参与 UI（卡槽展示 + 卡牌选择） |
| `ui/screens/SettlementScreen.tsx` | 结算结果展示 UI |

---

## 二、场景系统

### 2.1 核心数据结构

```typescript
// Scene — 静态配置，来自 JSON
interface Scene {
  scene_id: string;
  name: string;
  description: string;
  background_image: string;
  type: SceneType;           // event | shop | challenge
  duration: number;          // 持续回合数
  slots: Slot[];             // 卡槽配置
  settlement: Settlement;    // 结算配置（联合类型）
  unlock_conditions?: UnlockConditions;
  absence_penalty?: AbsencePenalty | null;
}

// SceneState — 运行时状态
interface SceneState {
  remaining_turns: number;
  invested_cards: string[];  // 已投入的卡牌 ID
  status: SceneStatus;       // available | participated | settling | completed | locked
}

// Slot — 卡槽配置
interface Slot {
  type: SlotType;    // character | item | sultan | gold
  required: boolean;
  locked: boolean;
  card_id?: string;
}
```

### 2.2 SceneManager 关键方法

| 方法 | 说明 |
|------|------|
| `registerScene(scene)` / `registerScenes(scenes)` | 注册场景静态数据到 `Map<string, Scene>` |
| `activateScene(sceneId)` | 检查解锁条件 → 创建 SceneState（Available 或 Locked） |
| `participateScene(sceneId, cardIds)` | 校验状态 + 卡牌未锁定 → 记录投入卡 → 状态改为 Participated |
| `isCardLocked(cardId)` | 遍历所有 Participated/Settling 场景，检查卡牌是否被占用 |
| `getLockedCardIds()` | 返回所有被锁定的卡牌 ID 集合 |
| `decrementRemainingTurns()` | 所有 Participated/Available 场景回合 -1，到 0 转为 Settling，返回到期场景 ID |
| `completeScene(sceneId)` | 状态改为 Completed |
| `removeCompletedScenes()` | 清理所有 Completed 状态的场景 |
| `getExpiredUnparticipatedScenes()` | 获取到期但未投入卡牌的场景（用于缺席惩罚） |
| `loadSceneStates(states)` / `getSceneStatesMap()` | 存档读写支持 |

### 2.3 场景生命周期

```
registerScene()     注册静态数据
       ↓
activateScene()     检查解锁条件 → Available 或 Locked
       ↓
participateScene()  玩家投入卡牌 → Participated
       ↓
decrementRemainingTurns()  每天回合 -1，到 0 → Settling
       ↓
settleScene() / applyAbsencePenalty()  结算
       ↓
completeScene()     → Completed
       ↓
removeCompletedScenes()  从 sceneStates 中移除
```

### 2.4 解锁条件检查

`checkUnlockConditions(scene)` 检查两项：
1. `reputation_min` — 玩家声望是否达标
2. `required_tags` — 玩家手牌中是否存在包含指定标签的卡牌

### 2.5 SlotSystem

独立的卡槽管理类，提供更细粒度的卡槽操作（`placeCard` / `removeCard` / `areRequiredSlotsFilled` / `lockAllCards`）。
注意：**当前 SceneScreen.tsx 没有使用 SlotSystem**，而是自己在组件内管理 `selectedCards` 状态，SlotSystem 的使用率较低。

### 2.6 解耦程度

**已解耦的部分：**
- SceneManager 不包含任何具体场景内容，纯生命周期管理
- 所有具体场景通过 `base_scenes.json` 配置，新增/修改场景不需要改代码
- UI 层（SceneScreen）数据驱动，不硬编码场景内容

**未解耦 / 硬编码的部分：**
- `Settlement` 类型是联合类型 `DiceCheckSettlement | TradeSettlement | ChoiceSettlement`，新增结算类型需改类型定义 + SettlementExecutor
- `SlotType` 枚举固定为 `character | item | sultan | gold`，新增卡槽类型需改枚举和校验逻辑
- SceneScreen 对不同结算类型没有差异化 UI（商店/选择场景和检定场景共用同一套卡槽交互）

---

## 三、结算系统

### 3.1 触发流程

```
DayManager.nextDay()
  ├→ executeSettlement()
  │    ├→ sceneManager.decrementRemainingTurns()     // 回合 -1，返回到期场景 ID
  │    ├→ 遍历未参与到期场景:
  │    │    └→ settlementExecutor.applyAbsencePenalty(sceneId)
  │    ├→ 遍历已参与到期场景:
  │    │    └→ settlementExecutor.settleScene(sceneId)
  │    └→ sceneManager.removeCompletedScenes()
  ├→ executeDawn()       // 新一天黎明阶段
  └→ startAction()       // 进入行动阶段
```

### 3.2 SettlementExecutor.settleScene()

根据 `scene.settlement.type` 分发：

| type | 调用方法 | 说明 |
|------|---------|------|
| `dice_check` | `settleDiceCheck()` | 骰子检定 → 4 档结果 → 应用 effects |
| `trade` | `settleTrade()` | **当前是空壳**，只返回叙事文本 |
| `choice` | `settleChoice()` | 根据 choiceIndex 选取选项 → 应用 effects |

### 3.3 骰子检定详细流程 (dice_check)

```
1. 从 investedCardIds 中筛选角色卡
2. calcCheckPool(cards, attribute, calc_mode) → 基础骰池
3. 叠加装备属性加成 (equipmentSystem.getAttributeBonus)
4. 叠加物品卡属性加成 (item.attribute_bonus)
5. 骰池上限 = min(poolSize, 20)
6. 计算总 reroll 次数（卡牌 reroll 特殊属性 + 装备 reroll 加成）
7. DiceChecker.performFullCheck(poolSize, config, reroll, rerollIndices, goldenDice)
   ├→ rollDice(): 投 poolSize 个 D10，处理爆炸骰(掷出10再投一次)
   ├→ reroll(): 对指定索引的失败骰重投
   ├→ applyGoldenDice(): successes += goldenDiceUsed
   └→ determineResult(): 对比 target 判定 4 档结果
8. 应用结果分支的 effects
```

### 3.4 骰子规则常量 (DICE_CONFIG)

```typescript
SIDES: 10            // D10
SUCCESS_THRESHOLD: 7  // >= 7 为成功
EXPLODE_ON: 10        // 掷出 10 爆炸（再投一次，可连锁）
MAX_POOL: 20          // 骰池上限
MAX_EXPLODE: 20       // 爆炸骰上限
```

### 3.5 检定结果判定 (determineResult)

```
successes >= target                          → Success
successes == 0                               → CriticalFailure
target > 2 && successes >= target - 2        → PartialSuccess
其他                                         → Failure
```

### 3.6 骰池聚合模式 (CalcMode)

| 模式 | 计算方式 | 策略含义 |
|------|---------|---------|
| `max` | 取所有角色该属性最大值 | 精英策略，一个强角色就够 |
| `sum` | 所有角色该属性求和 | 人海策略，投入越多越好 |
| `min` | 取最小值 | 木桶效应，短板角色会拖后腿 |
| `avg` | 取平均值(向下取整) | 均衡策略 |
| `first` | 取第一个角色 | 单挑型，只看第一个卡槽 |
| `specific` | 取指定卡槽索引的角色 | 特定角色检定 |

### 3.7 EffectApplier 效果执行

```typescript
apply(effects: Effects, investedCardIds: string[]): void
```

按顺序执行：
1. `effects.gold` → `playerState.changeGold()`
2. `effects.reputation` → `playerState.changeReputation()`
3. `effects.cards_add` → 通过 `cardDataResolver` 获取卡牌数据并 `cardManager.addCard()`
4. `effects.cards_remove` → 移除卡牌，支持 `card_invested_N` 引用语法
5. `effects.tags_add` → 给指定卡牌添加标签
6. `effects.tags_remove` → 给指定卡牌移除标签
7. `effects.consume_invested` → 消耗所有投入的卡牌

**卡牌引用语法：** `card_invested_0` 表示第一张投入卡，`card_invested_1` 表示第二张，以此类推。在 `resolveCardReference()` 中通过正则解析。

### 3.8 缺席惩罚

当场景到期但玩家未投入卡牌时：
- 有 `absence_penalty` 配置 → 应用其 effects 并显示叙事
- 无配置 → 直接 `completeScene()`，无负面效果

### 3.9 待实现 / 已知不完整

| 项目 | 状态 |
|------|------|
| `trade` 结算 | 空壳实现，只返回文本，未实现实际交易逻辑 |
| `effects.unlock_scenes` | 类型中定义了，EffectApplier 未实现 |
| 结算类型插件化 | 当前 switch 硬编码，无法纯配置扩展新结算类型 |
| SceneScreen 未使用 SlotSystem | UI 组件自行管理卡槽状态，SlotSystem 闲置 |
| 结算过程的玩家交互 | SettlementExecutor 支持 rerollIndices/goldenDiceUsed 参数，但 UI 层暂未实现交互式重投界面 |

---

## 四、数据流概览

```
[base_scenes.json]
       │
       │ GameManager.startNewGame(cards, scenes)
       ▼
SceneManager.registerScenes()    ← 注册静态 Scene 数据
SceneManager.activateScene()     ← 创建 SceneState，检查解锁
       │
       │ 玩家在 SceneScreen 选择卡牌并确认
       ▼
SceneManager.participateScene()  ← 记录投入卡，状态 → Participated
       │
       │ 玩家点击"下一天"
       ▼
DayManager.nextDay()
  → DayManager.executeSettlement()
    → SceneManager.decrementRemainingTurns()  ← 回合 -1
    → SettlementExecutor.settleScene()        ← 结算
      → DiceChecker / EffectApplier           ← 执行具体逻辑
    → SceneManager.completeScene()            ← 标记完成
    → SceneManager.removeCompletedScenes()    ← 清理
  → DayManager.executeDawn()                  ← 刷新场景
```

---

## 五、关键代码索引

| 需求 | 定位 |
|------|------|
| 新增一个场景 | `data/configs/scenes/base_scenes.json` 添加 JSON 条目 |
| 修改骰子规则 | `core/types/enums.ts` → `DICE_CONFIG` |
| 修改检定判定阈值 | `core/settlement/DiceChecker.ts` → `determineResult()` |
| 添加新的 effects 类型 | `core/types/index.ts` → `Effects` 接口 + `core/settlement/EffectApplier.ts` → `apply()` |
| 添加新的结算类型 | `core/types/index.ts` → `Settlement` 联合类型 + `core/settlement/SettlementExecutor.ts` → `settleScene()` |
| 添加新的卡槽类型 | `core/types/enums.ts` → `SlotType` + `core/scene/SlotSystem.ts` → `isCardTypeValid()` |
| 修改解锁条件逻辑 | `core/scene/SceneManager.ts` → `checkUnlockConditions()` |
| 场景 UI 交互 | `ui/screens/SceneScreen.tsx` |
| 结算结果展示 | `ui/screens/SettlementScreen.tsx` |
| 每日结算触发 | `core/game/DayManager.ts` → `executeSettlement()` |
| 存档/读档场景状态 | `SceneManager.getSceneStatesMap()` / `loadSceneStates()` |
