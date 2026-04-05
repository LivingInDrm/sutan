# Sutan 场景系统核心要素分析 + 场景生成器设计

## 1. 场景要素完整清单

### 1.1 顶层 Scene 字段

| 字段名 | 类型 | 必填 | 约束 / 取值范围 | 作用 | 示例值 |
|---|---|---:|---|---|---|
| `scene_id` | `string` | 是 | 非空；应全局唯一 | 场景唯一标识，运行时索引、存档、跳转都依赖它 | `scene_006` |
| `name` | `string` | 是 | 非空 | 场景展示名 | `边境破茶摊・剑影初逢` |
| `description` | `string` | 是 | 可空字符串以外任意文本 | 地图 / 列表中的简介 | `朔风卷着沙砾掠过边境小镇外的破茶摊...` |
| `background_image` | `string` | 是 | 非空；未校验文件存在 | 场景背景图资源路径 | `/assets/scenes/scene06.png` |
| `type` | `event \| shop \| challenge` | 是 | `SceneType` 枚举 | 决定场景类别和 UI 标签 | `event` |
| `duration` | `number` | 是 | 整数，`>= 1` | 场景从激活到结算所需天数/回合数 | `3` |
| `slots` | `Slot[]` | 是 | 可为空数组 | 玩家参与该场景时可投入的卡槽定义 | `[{ "type": "character", "required": true, "locked": false }]` |
| `stages` | `Stage[]` | 是 | 至少 1 个 | 场景的阶段流程主体 | 见下文 |
| `entry_stage` | `string` | 是 | 非空；运行时应能匹配到 `stages.stage_id` | 场景起始阶段 | `opening` |
| `unlock_conditions` | `object` | 否 | 结构见下表 | 决定 `activateScene()` 是否成功解锁 | `{ "reputation_min": 20 }` |
| `absence_penalty` | `object \| null` | 否 | 可缺省，可显式为 `null` | 到期未参与时应用的惩罚和文案 | `{ "effects": { "reputation": -5 }, "narrative": "..." }` |

### 1.2 Slot（参与槽位）

| 字段名 | 类型 | 必填 | 约束 / 取值范围 | 作用 | 示例值 |
|---|---|---:|---|---|---|
| `type` | `character \| item \| sultan \| gold` | 是 | `SlotType` 枚举 | 决定该槽允许投入什么类型的资源 | `character` |
| `required` | `boolean` | 是 | `true/false` | 是否必须填入才能确认参与 | `true` |
| `locked` | `boolean` | 是 | `true/false` | 当前 UI 中用于禁用该槽位 | `false` |

补充说明：

- 运行时 `SceneScreen` 只真正支持：
  - `character`：角色卡
  - `item`：装备 / 情报 / 消耗品 / 书籍 / 宝石
  - `sultan`：苏丹卡
- `gold` 虽然在 Schema 中合法，但当前 `SceneScreen` 没有对应投入逻辑。

### 1.3 Stage（阶段）

| 字段名 | 类型 | 必填 | 约束 / 取值范围 | 作用 | 示例值 |
|---|---|---:|---|---|---|
| `stage_id` | `string` | 是 | 非空；场景内应唯一 | 阶段唯一标识，用于跳转、记录结果、恢复进度 | `path_b_rescue` |
| `narrative` | `NarrativeNode[]` | 是 | 可为空数组但实际应至少 1 项 | 阶段叙事内容序列 | 见下文 |
| `settlement` | `Settlement` | 否 | `dice_check / trade / choice` 三选一 | 阶段末触发的结算配置 | 见下文 |
| `branches` | `StageBranch[]` | 否 | 任意长度；运行时按结果匹配 | 结算后跳转到下一个阶段 | `[{ "condition": "success", "next_stage": "path_b_wine" }]` |
| `is_final` | `boolean` | 否 | 默认视为 `false` | 标记是否终结场景 | `true` |

### 1.4 NarrativeNode（叙事节点）

#### a. `dialogue`

| 字段名 | 类型 | 必填 | 约束 | 作用 | 示例值 |
|---|---|---:|---|---|---|
| `type` | `'dialogue'` | 是 | 固定值 | 对话节点类型 | `dialogue` |
| `speaker` | `string` | 否 | 任意文本 | 说话者名称 | `徐凤年` |
| `text` | `string` | 是 | 非空 | 对话正文 | `老子温华，迟早是名动天下的剑客！` |
| `portrait` | `string` | 否 | 任意路径字符串 | 对话头像资源 | `/assets/portraits/figure04.png` |

#### b. `narration`

| 字段名 | 类型 | 必填 | 约束 | 作用 | 示例值 |
|---|---|---:|---|---|---|
| `type` | `'narration'` | 是 | 固定值 | 旁白节点类型 | `narration` |
| `text` | `string` | 是 | 非空 | 旁白正文 | `沙暴来袭，你的队伍能否安全穿越？` |

#### c. `effect`

| 字段名 | 类型 | 必填 | 约束 | 作用 | 示例值 |
|---|---|---:|---|---|---|
| `type` | `'effect'` | 是 | 固定值 | 叙事中途即时生效的效果节点 | `effect` |
| `effects` | `Effects` | 是 | 结构见 Effects 表 | 在阅读到该节点时立即应用效果 | `{ "reputation": 5 }` |
| `text` | `string` | 否 | 任意文本 | 给玩家看的结果说明 | `你的勇气赢得了众人的敬仰。` |

#### d. `choice`

| 字段名 | 类型 | 必填 | 约束 | 作用 | 示例值 |
|---|---|---:|---|---|---|
| `type` | `'choice'` | 是 | 固定值 | 叙事中的分支选择节点 | `choice` |
| `text` | `string` | 是 | 非空 | 选择提示文案 | `你必须做出选择：` |
| `options` | `NarrativeChoiceOption[]` | 是 | 至少 1 项 | 选择项列表 | 见下表 |

#### NarrativeChoiceOption

| 字段名 | 类型 | 必填 | 约束 | 作用 | 示例值 |
|---|---|---:|---|---|---|
| `label` | `string` | 是 | 非空 | 选项文案 | `走向战斗 - 用武力解决一切` |
| `next_stage` | `string` | 否 | 应引用合法 `stage_id` | 点击后进入下一阶段 | `battle_path` |
| `effects` | `Effects` | 否 | 结构见 Effects 表 | 点击选项后即时应用效果 | `{ "gold": -10 }` |

### 1.5 Settlement（阶段结算）

#### a. `dice_check`

| 字段名 | 类型 | 必填 | 约束 / 取值范围 | 作用 | 示例值 |
|---|---|---:|---|---|---|
| `type` | `'dice_check'` | 是 | 固定值 | 骰池判定结算 | `dice_check` |
| `narrative` | `string` | 否 | 任意文本 | 判定前提示文案 | `进行「魅力」鉴定。` |
| `check.attribute` | `physique/charm/wisdom/combat/social/survival/stealth/magic` | 是 | `Attribute` 枚举 | 骰池计算所依据的属性 | `social` |
| `check.calc_mode` | `max/sum/min/avg/first/specific` | 是 | `CalcMode` 枚举 | 多角色投入时如何从属性中算出基础骰池 | `max` |
| `check.target` | `number` | 是 | 整数，`>= 1` | 成功目标值 | `5` |
| `results.success` | `SettlementResultBranch` | 是 | 必须存在 | 成功分支结果 | 见下表 |
| `results.partial_success` | `SettlementResultBranch` | 是 | 必须存在 | 部分成功分支结果 | 见下表 |
| `results.failure` | `SettlementResultBranch` | 是 | 必须存在 | 失败分支结果 | 见下表 |
| `results.critical_failure` | `SettlementResultBranch` | 是 | 必须存在 | 大失败分支结果 | 见下表 |

#### SettlementResultBranch

| 字段名 | 类型 | 必填 | 约束 | 作用 | 示例值 |
|---|---|---:|---|---|---|
| `narrative` | `string` | 是 | 任意文本 | 该判定结果的结算文案 | `你的代理人在宫廷中游刃有余...` |
| `effects` | `Effects` | 是 | 结构见 Effects 表 | 该结果实际生效内容 | `{ "gold": 20, "reputation": 5 }` |

#### b. `trade`

| 字段名 | 类型 | 必填 | 约束 / 取值范围 | 作用 | 示例值 |
|---|---|---:|---|---|---|
| `type` | `'trade'` | 是 | 固定值 | 商店类结算 | `trade` |
| `shop_inventory` | `string[]` | 是 | 可为空但实际应至少 1 项 | 商店可售物品/卡牌 ID 列表 | `["equip_001", "equip_002"]` |
| `allow_sell` | `boolean` | 是 | `true/false` | 是否允许玩家卖出 | `true` |
| `refresh_cycle` | `number` | 否 | 整数 | 商店刷新周期（天） | `7` |

当前实现现状：

- `trade` 在 `SettlementExecutor` 中只返回 `"交易完成"` 文案，尚未真正处理买卖逻辑。

#### c. `choice`

| 字段名 | 类型 | 必填 | 约束 / 取值范围 | 作用 | 示例值 |
|---|---|---:|---|---|---|
| `type` | `'choice'` | 是 | 固定值 | 结算时让玩家做一个结构化选择 | `choice` |
| `narrative` | `string` | 否 | 任意文本 | 选择前说明文字 | `你要如何处置战利品？` |
| `options` | `ChoiceOption[]` | 是 | 至少 1 项 | 结算选项列表 | 见下表 |

#### ChoiceOption

| 字段名 | 类型 | 必填 | 约束 | 作用 | 示例值 |
|---|---|---:|---|---|---|
| `label` | `string` | 是 | 非空 | 选项名称 | `独吞赏金` |
| `effects` | `Effects` | 是 | 结构见 Effects 表 | 选项对应效果 | `{ "gold": 30, "reputation": -5 }` |

当前现状：

- Schema 支持 `settlement.type = choice`。
- 现有场景中未使用该结算类型。
- `SettlementExecutor.executeChoice()` 只按 `choiceIndex` 选择一项并应用效果，不负责阶段跳转。

### 1.6 StageBranch（阶段跳转）

| 字段名 | 类型 | 必填 | 约束 / 取值范围 | 作用 | 示例值 |
|---|---|---:|---|---|---|
| `condition` | `success \| partial_success \| failure \| critical_failure \| default` | 是 | 骰子结算结果或默认兜底 | 指定跳转条件 | `success` |
| `next_stage` | `string` | 是 | 非空；应引用合法 `stage_id` | 下一阶段 ID | `path_b_wine` |

### 1.7 Effects（效果系统）

| 字段名 | 类型 | 必填 | 约束 / 取值范围 | 作用 | 示例值 |
|---|---|---:|---|---|---|
| `gold` | `number` | 否 | 整数 | 修改金币 | `20` |
| `reputation` | `number` | 否 | 整数 | 修改声望 | `-5` |
| `cards_add` | `string[]` | 否 | 卡牌 ID 数组 | 向牌库/手牌新增卡 | `["card_wenhua_sword"]` |
| `cards_remove` | `string[]` | 否 | 卡牌 ID 或 `card_invested_N` 引用 | 移除指定卡 | `["temp_generosity"]` |
| `tags_add` | `Record<string, string[]>` | 否 | key 为卡牌引用 | 给卡加标签 | `{ "card_004": ["知己"] }` |
| `tags_remove` | `Record<string, string[]>` | 否 | key 为卡牌引用 | 移除卡牌标签 | `{ "card_004": ["债主"] }` |
| `unlock_scenes` | `string[]` | 否 | 场景 ID 数组 | 语义上用于解锁后续场景 | `["scene_010"]` |
| `consume_invested` | `boolean` | 否 | `true/false` | 是否消耗本场投入卡 | `true` |

运行时真实支持情况：

- `gold`、`reputation`、`cards_add`、`cards_remove`、`tags_add`、`tags_remove`、`consume_invested` 已实现。
- `unlock_scenes` 目前**仅存在于 Schema 和类型定义中，未在 `EffectApplier` 中处理**，属于“已设计未落地”字段。
- `cards_remove` / `tags_add` / `tags_remove` 支持 `card_invested_0` 这类引用，指向当前场景投入卡。

### 1.8 UnlockConditions（解锁条件）

| 字段名 | 类型 | 必填 | 约束 | 作用 | 示例值 |
|---|---|---:|---|---|---|
| `reputation_min` | `number` | 否 | 整数 | 玩家声望达到阈值才可激活 | `20` |
| `required_tags` | `string[]` | 否 | 标签字符串数组 | 玩家全部卡牌中任一拥有这些标签才解锁 | `["江湖","名剑"]` |

实际逻辑：

- `SceneManager.checkUnlockConditions()` 会遍历 `CardManager.getAllCards()`，只要玩家当前持有的任意卡集合满足全部标签即可。
- 不是“某一张卡同时拥有全部标签”，而是“全局卡池中存在这些标签”。

### 1.9 AbsencePenalty（缺席惩罚）

| 字段名 | 类型 | 必填 | 约束 | 作用 | 示例值 |
|---|---|---:|---|---|---|
| `effects` | `Effects` | 是 | 结构见 Effects 表 | 场景到期但未投入卡时自动应用 | `{ "reputation": -10 }` |
| `narrative` | `string` | 是 | 任意文本 | 缺席结算文案 | `你怯懦地逃避了决斗，名誉扫地。` |

### 1.10 运行时 SceneState（便于设计器理解）

这不是配置 JSON 字段，但会影响设计器如何做校验和预览。

| 字段名 | 类型 | 来源 | 作用 |
|---|---|---|---|
| `remaining_turns` | `number` | `duration` 初始化 | 倒计时到 0 进入结算 |
| `invested_cards` | `string[]` | 玩家参与时写入 | 当前场景锁定的卡牌 |
| `status` | `available/participated/settling/completed/locked` | `SceneManager` | 场景状态机 |
| `current_stage` | `string` | 参与时设为 `entry_stage` | 当前阶段 |
| `stage_results` | `Record<string, CheckResult>` | 结算时记录 | 阶段判定结果历史 |

---

## 2. 场景结构图（文字流程图）

### 2.1 场景从配置到运行的主流程

```text
场景 JSON
  → DataLoader.loadScenesFromDirectory()
  → SceneSchema 校验
  → GameManager.startNewGame()
  → SceneManager.registerScenes()
  → SceneManager.activateScene()
       ├─ 检查 unlock_conditions
       ├─ 通过：status = available
       └─ 不通过：status = locked
  → 玩家在 SceneScreen 选择卡牌并 participate
       ├─ 校验 required slots
       ├─ 校验卡牌未被其他场景锁定
       └─ status = participated, current_stage = entry_stage
  → DayManager.beginSettlement()
       ├─ remaining_turns 递减
       ├─ 到期未参与：applyAbsencePenalty()
       └─ 到期已参与：进入待结算队列
  → SceneRunner.start()
       └─ 从 entry_stage / current_stage 开始逐阶段播放
  → 每个 Stage
       ├─ 播放 narrative 节点
       │    ├─ dialogue / narration：仅展示
       │    ├─ effect：即时应用 Effects
       │    └─ choice：玩家手动选项并跳 next_stage
       ├─ 若存在 settlement：
       │    ├─ dice_check：按属性/模式算骰池 → 判定结果
       │    ├─ trade：商店结算（当前为占位实现）
       │    └─ choice：从 options 选一项应用效果
       ├─ 记录 stage_results / all_stage_results
       └─ 按 branches[result] 或 default 跳到下个阶段
  → 到 final stage 或无可跳转分支
  → SceneManager.completeScene()
  → DayManager.finishSettlement()
       ├─ removeCompletedScenes()
       └─ advanceDay()
```

### 2.2 单个 Stage 的结构关系

```text
Stage
  ├─ stage_id
  ├─ narrative[]
  │    ├─ narration
  │    ├─ dialogue
  │    ├─ effect
  │    └─ choice
  ├─ settlement? 
  │    ├─ dice_check
  │    ├─ trade
  │    └─ choice
  ├─ branches?
  │    ├─ success → next_stage
  │    ├─ partial_success → next_stage
  │    ├─ failure → next_stage
  │    ├─ critical_failure → next_stage
  │    └─ default → next_stage
  └─ is_final?
```

### 2.3 当前系统里两种分支机制

```text
分支机制 A：叙事 choice 节点
  Narrative.choice.options[].next_stage
  → 由前端交互直接推进 SceneRunner.advanceByChoice()
  → 可附带即时 effects

分支机制 B：settlement 结果分支
  settlement 执行后得到 result_key
  → SceneRunner.advanceAfterSettlement(result_key)
  → 在 branches 中查找相应 condition
```

这意味着设计器必须同时支持：

1. “玩家读剧情时做选择”
2. “玩家完成判定后自动跳转”

---

## 3. 现有场景对比分析

### 3.1 场景实例总览

| 场景 ID | 类型 | 时长 | Stage 数 | 主要机制 | 复杂度判断 |
|---|---|---:|---:|---|---|
| `scene_001` | `event` | 3 | 1 | 单阶段骰检 + 解锁条件 + 缺席惩罚 | 简单 |
| `scene_002` | `challenge` | 2 | 1 | 单阶段骰检，多角色 `min` 计算 | 简单 |
| `scene_003` | `challenge` | 1 | 1 | 单阶段骰检 + 缺席惩罚 | 简单 |
| `scene_004` | `event` | 2 | 3 | 叙事选择分支 + effect 节点 | 中等 |
| `scene_006` | `event` | 3 | 5 | 多阶段骰检 + 多轮分支 + 卡牌/标签演化 | 复杂 |
| `scene_shop_001` | `shop` | 1 | 1 | trade 结算 | 特殊/占位 |

### 3.2 简单场景模式

代表：`scene_001`、`scene_002`、`scene_003`

共同特征：

- 只有 1 个 stage
- stage 即 `entry_stage`
- narrative 通常只有 1 条 narration
- settlement 固定为 `dice_check`
- `branches` 不需要存在，因为 `is_final = true`
- 奖惩集中写在 `results.*.effects`
- 适合“地图事件 / 单次挑战 / 一步式判定”

这种模式的最小可用模板可以概括为：

```text
Scene
  top-level metadata
  slots
  entry_stage = main
  stages = [
    {
      stage_id: main,
      narrative: [narration],
      settlement: dice_check,
      is_final: true
    }
  ]
```

### 3.3 中等复杂场景模式

代表：`scene_004`

特点：

- 没有 `settlement`
- 完全依靠 `narrative.choice` 驱动分支
- 后续阶段使用 `effect` 节点发奖惩
- 适合“剧情抉择型事件”

这暴露出一个关键设计点：

- 场景系统不是“只有判定才有分支”
- narrative 本身已经是一套轻量流程编辑语言

### 3.4 复杂场景模式

代表：`scene_006`

特点：

- 5 个 stage，分成两条主路径（A/B）
- 每条路径内有连续两轮骰检
- 第一轮结果先写入临时卡：`temp_generosity` / `temp_mockery`
- 第二轮再基于前序状态清理临时卡，并生成最终角色卡 `card_wenhua_sword`
- 同时给已有角色或新角色追加标签
- 同一条路径内多个判定结果虽然 narrative 不同，但很多都汇聚到同一后续阶段

这个场景说明系统已经具备以下表达能力：

1. **多轮判定**
2. **分支汇合**
3. **临时状态卡作为记忆载体**
4. **角色关系 / 性格标签沉淀**
5. **强叙事场景链**

### 3.5 简单场景 vs 复杂场景差异

| 维度 | 简单场景 | 复杂场景 |
|---|---|---|
| 阶段数量 | 1 | 3~5+ |
| 分支数量 | 0 | 多层分支、汇合 |
| 结算类型 | 常为单次 `dice_check` | 多次 `dice_check`，可混合 narrative choice |
| 状态记忆 | 基本无 | 通过 `cards_add/remove`、`tags_add` 保留 |
| 奖惩位置 | 最终结算统一发放 | 中途 effect + 最终 settlement 共同构成 |
| 编辑难度 | 低 | 高，需要看流程图 |
| 适合生成方式 | 一次性直出 | 更适合“LLM 初稿 + 人工流程校正” |

### 3.6 现有 Schema / Runtime 的隐性约束与缺口

#### 已形成的隐性约束

1. `entry_stage` 必须能找到对应 `stage_id`
2. `branches.next_stage` / `choice.options.next_stage` 必须能找到对应 `stage_id`
3. `stage_id` 应唯一
4. 至少要有一条可终止路径，否则可能形成无出口流程
5. 如果 `stage.is_final = true`，其 `branches` 实际上不会再生效
6. `required = true` 的槽位在前端必须被填满，玩家才能参与
7. `cards_add` 中引用的卡牌 ID 必须存在于全量卡池数据中，否则运行时会静默不生效
8. `tags_add/remove` 指向的卡牌必须当前存在，否则也会静默不生效

#### Schema 还没覆盖的校验

1. **引用完整性未校验**
   - `entry_stage`
   - `branches.next_stage`
   - `narrative.choice.options.next_stage`
2. **唯一性未校验**
   - `scene_id`
   - `stage_id`
3. **流程闭环未校验**
   - 是否存在不可达 stage
   - 是否存在永远无法结束的环
4. **语义一致性未校验**
   - `shop` 类型理论上应搭配 `trade`
   - `challenge` 类型常需至少一个 `character` 槽
5. **未实现字段未告警**
   - `unlock_scenes`
   - `gold` 类型 slot

---

## 4. 场景生命周期与依赖关系分析

### 4.1 SceneManager：加载与状态管理

职责拆解：

1. `registerScene/registerScenes`
   - 把配置层 Scene 注册到内存 Map
2. `activateScene`
   - 检查解锁条件
   - 初始化 `SceneState`
   - 状态设为 `available` 或 `locked`
3. `participateScene`
   - 玩家选卡进入场景
   - 写入 `invested_cards`
   - `current_stage = entry_stage`
   - 状态变为 `participated`
4. `decrementRemainingTurns`
   - 每天结算时递减剩余回合
   - 到 0 则转为 `settling`
5. `completeScene/removeCompletedScenes`
   - 结算完成后标记并清除
6. `recordStageResult`
   - 存储每个阶段的骰检结果

关键结论：

- Scene 配置本身是“静态蓝图”
- SceneState 是“动态运行态”
- 设计器不能只生成 JSON，还要能模拟 SceneState 的推进过程，才能辅助人工校验流程

### 4.2 DayManager：日推进与触发结算

日推进链路：

1. `executeDawn()`
   - 重置每日资源
   - 通过 `refreshScenes()` 激活尚未存在 state 的场景
2. `beginSettlement()`
   - 所有 `available / participated` 场景 `remaining_turns - 1`
   - 到期未参加的场景走 `absence_penalty`
   - 到期已参加的场景进入待结算列表
3. `finishSettlement()`
   - 删除已完成场景
   - 推进天数

设计含义：

- `duration` 不是“故事内部阶段数”，而是“地图悬挂时间”
- 场景的故事 stage 流程和全局天数推进是两套维度

### 4.3 SettlementExecutor：执行判定

#### `dice_check`

执行链：

1. 取投入角色卡
2. 用 `calcCheckPool()` 按 `attribute + calc_mode` 计算基础骰池
3. 装备系统给角色追加属性加值
4. 投入的非角色物品卡也可以通过 `attribute_bonus` 继续加骰池
5. 计算 `reroll` 特殊属性
6. 调用 `DiceChecker.performFullCheck()`
7. 根据 `result` 命中 `results[result]`
8. 应用 effects
9. 返回 narrative + effects + dice 状态

关键设计含义：

- LLM 生成器不能只写故事，还必须理解属性、calc_mode、目标值与角色构成之间的平衡
- 场景难度实际上由 `attribute + calc_mode + target + slots` 共同决定

#### `trade`

- 当前是占位实现
- 说明生成器可以支持该结构，但人工编辑器应明确标注“运行时功能未完全落地”

#### `choice`

- 结构已存在
- 执行只应用选中项 effects
- 未负责像 narrative choice 那样推进到某个 stage

这意味着设计器需要把两类 choice 清晰区分：

1. **剧情选择（Narrative Choice）**：会跳 stage
2. **结算选择（Settlement Choice）**：只产出结果

### 4.4 EffectApplier：效果落地

已实现的效果：

- 金币变化
- 声望变化
- 新卡加入
- 卡牌删除
- 标签增删
- 消耗投入卡

未实现但 Schema 已暴露：

- `unlock_scenes`

设计含义：

- 编辑器需要对“可配置但未生效”的字段做醒目标记
- LLM prompt 里也应限制，默认不要生成 `unlock_scenes`，除非后端先补完运行时支持

---

## 5. 要素之间的依赖关系

### 5.1 结构依赖

| A 字段 | 依赖 B 字段 | 依赖关系 |
|---|---|---|
| `entry_stage` | `stages[].stage_id` | 必须引用存在的阶段 |
| `branches[].next_stage` | `stages[].stage_id` | 必须引用存在的阶段 |
| `narrative.choice.options[].next_stage` | `stages[].stage_id` | 若存在则必须引用存在的阶段 |
| `scene_id` | 全局场景集合 | 应避免重复，否则运行时 Map 覆盖 |
| `stage_id` | 单场景内部 | 应避免重复，否则 `SceneRunner` Map 覆盖 |

### 5.2 类型依赖

| 字段 | 依赖项 | 说明 |
|---|---|---|
| `slots[].type = character` | 玩家卡类型 | 前端只允许角色卡投入 |
| `slots[].type = item` | 玩家卡类型 | 前端只允许装备/情报/消耗品/书/宝石投入 |
| `settlement.type = dice_check` | `check` + `results` | 两者必须完整出现 |
| `settlement.type = trade` | `shop_inventory` + `allow_sell` | 商店结构必须完整 |
| `settlement.type = choice` | `options` | 至少 1 个选项 |

### 5.3 平衡性依赖

| 要素 | 互相约束关系 |
|---|---|
| `slots` × `check.calc_mode` | 多角色槽位才有 `sum / min / avg / first / specific` 的实际意义 |
| `check.attribute` × 场景主题 | 应与故事语义一致，例如交涉用 `social/charm`，追踪可用 `survival/stealth` |
| `check.target` × `duration` | 高奖励高目标的场景可以搭配更长悬挂时间，给玩家准备空间 |
| `effects.gold/reputation` × `scene.type` | `challenge` 倾向更高风险回报，`event` 倾向剧情收益，`shop` 通常不直接发金币 |
| `cards_add/cards_remove` × 卡池数据 | 所有卡牌 ID 必须在全量卡数据中存在，否则不会生效 |

### 5.4 运行时依赖

| 字段 | 运行时依赖 |
|---|---|
| `required_tags` | `CardManager.getAllCards()` 当前拥有的卡牌集合 |
| `cards_add` | `SettlementExecutor.setCardDataResolver()` 是否可解析卡数据 |
| `tags_add/remove` | 目标卡是否仍在牌库中 |
| `consume_invested` | 玩家是否确实投入了卡 |
| `absence_penalty` | 场景到期时 `invested_cards.length === 0` |

### 5.5 推荐补充的生成器级校验规则

生成器应额外实现以下校验，不仅依赖现有 Zod Schema：

1. 引用完整性校验
2. 阶段可达性校验
3. 死循环/无出口校验
4. 场景 ID / 阶段 ID 唯一性校验
5. `cards_add/remove` / `tags_add/remove` 对卡牌 ID 的存在性校验
6. `shop` 与 `trade`、`challenge` 与角色槽位的语义一致性校验
7. 高奖励/低目标等明显失衡配置告警

---

## 6. 场景生成器设计方案

### 6.1 产品定位

目标不是“让策划手写 JSON”，而是：

> 用 LLM 快速生成可运行的场景初稿，再由策划/作者通过结构化界面修正故事节奏、判定难度、奖励和分支逻辑，最终导出标准场景 JSON。

推荐产品名：**Scene Studio** 或 **场景工坊**

### 6.2 核心工作流

```text
用户输入主题 / 背景描述
  → 选择场景类型、目标复杂度、预期奖励级别
  → LLM 生成 Scene Draft（结构化 JSON）
  → Schema 校验
  → 引用/流程/卡牌ID/平衡性二次校验
  → 若失败：自动修复或提示用户
  → 进入可视化编辑器
  → 人工逐项调整
  → 实时预览最终 JSON
  → 保存为 scene_xxx.json 到配置目录
```

### 6.3 LLM 生成流程设计

#### 输入

建议结构化输入表单：

| 输入项 | 必填 | 说明 |
|---|---:|---|
| 场景主题 | 是 | 如“徐凤年在江湖遇到一个武林高手挑战” |
| 背景设定补充 | 否 | 时间、地点、相关人物、氛围 |
| 场景类型 | 是 | `event / challenge / shop` |
| 目标复杂度 | 是 | 简单 / 中等 / 复杂 |
| 预期时长 | 是 | 地图停留 `duration` |
| 是否多阶段 | 否 | 帮助限制输出规模 |
| 预期奖励倾向 | 否 | 金币 / 声望 / 招募角色 / 标签关系 |
| 可用角色/物品范围 | 否 | 限定可引用卡牌 |

#### LLM 上下文包

LLM 不应只吃自由文本，还要同时注入：

1. **SceneSchema 摘要**
2. **枚举约束**
3. **现有优秀场景样例**
   - 简单模板：`scene_001`
   - 叙事分支模板：`scene_004`
   - 复杂多阶段模板：`scene_006`
4. **雪中悍刀行 / 当前项目 IP 设定摘要**
5. **卡牌 ID 白名单**
6. **设计规则**
   - 不生成未实现字段
   - 不引用不存在卡牌
   - 阶段必须可达
   - 最终必须有出口

#### 输出格式

强烈建议让模型输出**严格 JSON**，不要输出 Markdown 包裹或解释文本。

推荐两段式生成：

1. **Outline 阶段**
   - 先生成阶段树
   - 明确各阶段主题、判定属性、结果流向
2. **Compile 阶段**
   - 再生成完整 Scene JSON

这样比“一步直出完整 JSON”更稳定。

#### 生成后自动处理

生成后执行四层处理：

1. `SceneSchema.parse()`：基础结构校验
2. `semanticValidateScene(scene)`：补充语义校验
3. `autoRepairScene(scene)`：自动修常见问题
   - 丢失 `is_final`
   - `next_stage` 指错
   - 缺少某个 `results.*`
4. 产出 `warnings[]`
   - 使用了未落地字段
   - 奖励过高
   - 引用卡牌风险

### 6.4 Prompt 设计建议

建议采用“系统规则 + 结构模板 + 样例约束 + 用户需求”四段式 Prompt。

#### System Prompt 要点

1. 你要生成 **可被 Sutan 引擎直接加载** 的 Scene JSON
2. 必须符合给定 Schema
3. 不得输出不存在的枚举值
4. 不得引用不存在的 `stage_id` / `card_id`
5. 不得默认使用 `unlock_scenes`
6. 优先生成：
   - 语义合理的属性判定
   - 可读的多阶段叙事
   - 不失控的奖惩数值

#### Few-shot 样例策略

- 给 1 个简单样例
- 给 1 个 choice 分支样例
- 给 1 个多阶段强叙事样例

不要把所有现有场景全文塞给模型；建议提炼为：

- 结构样例
- 风格样例
- 数值样例

#### 推荐模型输出协议

```json
{
  "analysis": {
    "theme": "...",
    "complexity": "simple|medium|complex",
    "stage_plan": [...]
  },
  "scene": {
    "...": "strict scene json"
  },
  "warnings": []
}
```

前端真正保存时只取 `scene`。

### 6.5 人工调整界面设计

#### 核心原则

1. **结构化编辑，不直接裸改 JSON**
2. **流程优先**，先看 stage graph，再看字段细节
3. **即时校验**，编辑时就提示错误
4. **JSON 实时预览**，但 JSON 只做结果视图

#### 推荐界面布局

```text
左侧：场景基础信息面板
  - scene_id / name / description / type / duration / background
  - unlock_conditions / absence_penalty

中间：Stage Flow Canvas
  - 卡片式 stage 节点
  - 箭头连接 branches / choice next_stage
  - 节点内显示 narrative 摘要 + settlement 摘要

右侧：属性编辑器
  - 当前选中 stage / narrative / settlement / branch 的表单

底部抽屉：JSON Preview + Warnings + Export
```

#### 编辑器模块拆分

##### A. 场景元信息编辑器

- `scene_id`
- `name`
- `description`
- `background_image`
- `type`
- `duration`
- `entry_stage`

##### B. 槽位编辑器

- 增删 slot
- 选择 `type`
- 切换 `required`
- 切换 `locked`
- 显示“当前 UI 是否支持该 slot 类型”

##### C. Stage 流程编辑器

每个 Stage 卡片展示：

- `stage_id`
- 是否 final
- narrative 节点数
- settlement 类型
- 出边数

支持操作：

- 新增 stage
- 复制 stage
- 删除 stage
- 拖拽调整布局
- 连接到下一阶段

##### D. Narrative 编辑器

针对每个节点提供不同表单：

- `dialogue`：speaker / text / portrait
- `narration`：text
- `effect`：effects + text
- `choice`：text + option 列表 + next_stage

并支持：

- 节点排序
- 节点复制
- 节点类型切换

##### E. Settlement 编辑器

###### dice_check

- 判定属性下拉框
- calc_mode 下拉框
- target 数值输入
- 四种结果卡片并排编辑
  - narrative
  - effects

###### trade

- 商品 ID 多选
- allow_sell 开关
- refresh_cycle 输入
- 标注“当前运行时为占位能力”

###### choice

- narrative
- options 列表
- 每个 option 的 label + effects

##### F. Effects 编辑器

结构化子表单：

- 金币变化
- 声望变化
- 新增卡牌（白名单选择器）
- 删除卡牌（白名单或 invested 引用）
- 标签增删（目标卡 + tag 多输入）
- consume_invested 开关

并在 UI 上隐藏或弱化：

- `unlock_scenes`（除非后端先实现）

##### G. 校验与预览

三类反馈：

1. **Error**
   - 无法导出
2. **Warning**
   - 可以导出但建议修正
3. **Info**
   - 平衡性提示

例如：

- `entry_stage` 不存在
- `path_b_wine` 不可达
- `cards_add` 中 `card_xxx` 不存在
- `shop` 场景未使用 `trade`
- 使用了当前运行时未支持的 `unlock_scenes`

### 6.6 实时 JSON 预览与导出

推荐导出流程：

1. 前端维护内部 Draft State
2. 通过 `compileDraftToSceneJson(draft)` 输出标准 JSON
3. 调 `SceneSchema.parse()`
4. 调语义校验器
5. 通过后：
   - 预览 JSON
   - 一键导出到 `src/renderer/data/configs/scenes/`

导出命名建议：

- 手动输入 `scene_id`
- 默认文件名自动映射为 `${scene_id}.json`
- 若沿用当前仓库习惯，也可提供模板建议：
  - `scene_007.json`
  - `scene_shop_002.json`

---

## 7. 技术架构建议

### 7.1 工具放在 asset-manager 里还是独立？

#### 结论

**短期建议放在现有内容管理体系下，作为独立的 Scene Studio 模块；不要和“素材资源管理”强绑定。**

#### 原因

场景生成器管理的不是单纯资产，而是：

- 流程结构
- 叙事文本
- 判定逻辑
- 数值平衡
- 卡牌引用关系

它更像“内容编辑器 / 剧情关卡编辑器”，而不是图片或物品素材管理器。

#### 推荐落点

如果后续项目会形成完整后台工具，建议做成：

```text
Content Studio
  ├─ Character Manager
  ├─ Item Manager
  ├─ Scene Studio
  └─ Prompt Templates / Validation Tools
```

如果当前只做一个快速落地版本，建议：

- 在现有 Electron/React 工程中新增一个独立 screen / route
- 与 asset-manager 共用 UI 组件和风格，但功能上独立

#### 不推荐方案

- 把场景编辑器塞进纯素材管理页的 tab 里

因为这会把“内容逻辑编辑”和“资源文件管理”混在一起，复杂场景会很难维护。

### 7.2 前端组件方案

基于当前栈：`React + Zustand + Tailwind`

建议继续沿用，不额外引入大型表单框架。

推荐组件层次：

```text
src/renderer/ui/screens/SceneStudioScreen.tsx
src/renderer/ui/components/scene-studio/
  ├─ SceneMetadataForm.tsx
  ├─ SlotEditor.tsx
  ├─ StageGraphCanvas.tsx
  ├─ StageCard.tsx
  ├─ NarrativeListEditor.tsx
  ├─ NarrativeNodeEditor.tsx
  ├─ SettlementEditor.tsx
  ├─ EffectsEditor.tsx
  ├─ ValidationPanel.tsx
  └─ JsonPreviewPanel.tsx
```

交互库建议：

- 画布与拖拽连线：优先用轻量方案
  - 可先基于现有 `@dnd-kit` 做卡片排序
  - 若要节点连线图，建议引入 `reactflow`
- 表单状态：本地 Zustand store 或组件内 reducer
- 预览：代码高亮可简单用 `<pre>`

### 7.3 后端 / 模型建议

#### 模型层建议

采用两层模型调用：

1. **生成模型**
   - 负责按主题产出场景草稿
2. **校验/修复模型**
   - 负责根据错误信息修复 JSON

如果只接一个模型，也建议做两次调用。

#### 模型类型建议

- 主模型：偏强结构化输出能力的通用 LLM
- 温度低一些（`0.2 ~ 0.5`）
- 使用 JSON schema / function calling 模式优先

#### 服务端职责

新增一个轻量内容服务层，职责：

1. 聚合 Prompt 上下文
2. 调用 LLM
3. 执行 SceneSchema 校验
4. 执行语义校验
5. 自动修复
6. 返回 Draft + warnings

即使工具是 Electron 本地应用，也建议把“生成”和“校验”逻辑封到独立 service，而不是散落在 UI 组件里。

### 7.4 Prompt 工程建议

Prompt 组成建议：

1. **Schema 摘要**
2. **枚举白名单**
3. **风格约束**
   - 符合雪中 IP 语气
   - 保持角色关系自然
4. **平衡约束**
   - 简单事件奖励不要过高
   - 复杂场景允许角色招募
5. **运行时约束**
   - 不要使用 `unlock_scenes`
   - `trade` 仅在商店类型使用
6. **输出约束**
   - 只输出合法 JSON

### 7.5 建议新增的代码层能力

为了让生成器真正可靠，建议在项目里新增：

#### a. 场景语义校验器

例如：

- `src/renderer/data/validators/sceneSemanticValidator.ts`

职责：

- 引用完整性
- 可达性
- 唯一性
- 卡牌存在性
- 未实现字段告警

#### b. 场景草稿编译器

- `src/renderer/tools/scene-studio/compileSceneDraft.ts`

职责：

- 把 UI Draft State 编译成标准 `Scene`

#### c. LLM 场景生成服务

- `src/renderer/tools/scene-studio/sceneGenerationService.ts`

职责：

- Prompt 组装
- 样例选择
- 调模型
- 错误修复重试

#### d. 场景导出服务

- `src/renderer/tools/scene-studio/exportSceneConfig.ts`

职责：

- 生成 JSON
- 格式化
- 写入目标目录

---

## 8. 实现路线图

### Phase 0：补齐校验基础（强烈建议先做）

目标：把“能生成”变成“生成后不炸”

1. 新增 `sceneSemanticValidator`
2. 校验：
   - `entry_stage`、`next_stage` 引用
   - `stage_id` 唯一性
   - 不可达 stage
   - 无终点流程
   - 卡牌引用合法性
3. 给现有场景跑一遍 validator，修出基线

### Phase 1：手工结构化编辑器

目标：即使没有 LLM，也能更高效编辑场景

1. 新增 `SceneStudioScreen`
2. 支持：
   - 场景元数据编辑
   - slot 编辑
   - stage 列表编辑
   - narrative/settlement/effects 编辑
   - JSON 预览
   - 导出

这是最重要的一步，因为 LLM 只是提效器，编辑器才是落地保障。

### Phase 2：流程图可视化

目标：解决复杂场景难以理解的问题

1. 引入 stage graph 视图
2. 显示：
   - stage 节点
   - narrative choice 跳转
   - settlement branches 跳转
3. 支持点选节点编辑

### Phase 3：接入 LLM 初稿生成

目标：从“人工搭建”升级到“AI 起草”

1. 设计输入表单
2. 实现 `sceneGenerationService`
3. 生成后自动校验
4. 失败时自动修复 1~2 轮
5. 成功后进入编辑器

### Phase 4：高级辅助能力

目标：让策划迭代更快

可追加：

1. 一键“改成更复杂版本”
2. 一键“改成更偏社交 / 战斗 /江湖奇遇”
3. 数值平衡建议
4. 角色关系一致性检查
5. 批量生成多个候选场景

### Phase 5：运行时联调与回归

目标：保证导出的场景能被游戏正常跑通

1. 导出后自动执行 `SceneSchema` 校验
2. 自动跑一轮“模拟结算”
3. 对复杂场景生成 stage coverage 报告
4. 把新场景挂进游戏测试入口做 smoke test

---

## 9. 推荐的生成器最小可用方案（MVP）

如果要最小成本落地，建议只做这些：

### 必做

1. Scene 结构化编辑器
2. SceneSchema 校验
3. 语义校验器
4. JSON 预览
5. 导出到 `src/renderer/data/configs/scenes/`
6. LLM 根据主题生成“简单/中等场景”初稿

### 暂缓

1. 全自动复杂场景生成
2. 商店真实交易逻辑生成
3. `unlock_scenes` 相关配置
4. 多人协作/版本管理 UI

---

## 10. 最终建议总结

### 对当前场景系统的判断

当前系统本质上已经是一套轻量的“剧情流程 DSL”：

- Scene = 顶层容器
- Stage = 流程节点
- NarrativeNode = 叙事指令
- Settlement = 判定/结算指令
- Branch = 跳转边
- Effects = 世界状态修改指令

它已经足够支撑：

- 单次事件
- 多阶段奇遇
- 强叙事招募事件
- 轻量商店

但要支撑稳定的 AI 生成，必须补齐：

1. 语义校验
2. 引用校验
3. 未实现字段告警
4. 结构化编辑器

### 对生成器落地方式的判断

最佳路径不是“直接让 LLM 写文件”，而是：

> LLM 产出结构化草稿 → 校验/修复 → 人工可视化编辑 → 导出配置

这是最适合当前 Sutan 场景系统成熟度的方案。