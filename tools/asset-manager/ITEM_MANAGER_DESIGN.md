# 物品管理系统设计方案

## 1. 现有角色管理系统架构概要（当前状态）

### 1.1 整体架构

现有 `tools/asset-manager/` 本质上不是“纯角色立绘工具”，而是一个**以角色为主界面的素材管理平台**：

- **后端**：`backend/main.py`
  - 负责读取/写入 JSON 数据
  - 提供角色 CRUD、描述生成、属性生成、图片生成、部署 API
  - 底层图片生成逻辑复用 `scripts/generate_assets.py`
- **前端**：`frontend/src/*`
  - `App.tsx` 提供应用壳、主导航、数据加载
  - `CharacterList.tsx` 管理左侧角色列表和新增角色
  - `CharacterDetail.tsx` 管理右侧详情页，包含工坊 / 属性 / 部署三大 tab
  - `Gallery.tsx` 管理样本图库展示与选图流程
  - `api.ts` 封装 API 调用
  - `types.ts` 定义前端数据结构
- **数据文件**
  - `scripts/batch_config.json`：角色 variant 级别的绘图描述源数据
  - `scripts/character_profiles.json`：角色游戏属性、小传、待部署立绘选择
  - `src/renderer/data/configs/cards/base_cards.json`：真正写入游戏的数据卡牌配置

### 1.2 当前角色系统的数据流

角色系统实际是三层数据模型：

#### A. 生成层：`batch_config.json`

保存的是“一个角色的多个绘图 variant”。

结构特点：

- 一条记录对应一个 variant
- 主键不是 `id`，而是 `name`
- 每个角色通常 4 条
- 字段主要为：
  - `type: "portrait"`
  - `name`
  - `description`
  - `output`

这层本质上是**AI 绘图输入配置层**。

#### B. 编辑层：`character_profiles.json`

保存的是“角色的游戏属性与部署中间态”。

字段包括：

- `description`：游戏内小传
- `rarity`
- `attributes`
- `special_attributes`
- `tags`
- `equipment_slots`
- `selected_portrait`（部署前选中的立绘）

这层本质上是**角色卡牌编辑层**。

#### C. 运行层：`base_cards.json`

这是游戏真实读取的卡牌配置。

角色卡的结构包括：

- `card_id`
- `name`
- `type: "character"`
- `rarity`
- `description`
- `image`
- `attributes`
- `special_attributes`
- `tags`
- `equipment_slots`

这层本质上是**最终部署层**。

### 1.3 当前角色系统的核心流程

当前角色管理流程可概括为：

1. **创建角色**
   - 输入名字、可选简介
   - 后端用 GPT-5.4 生成 4 条 description
   - 写入 `batch_config.json`
   - 创建样本目录
   - 后台尝试自动生成 profile

2. **编辑/生成 variant**
   - 在 `CharacterDetail.tsx` 的 workshop tab 中查看 4 个 variant
   - description 支持自动保存
   - 支持整体重新生成 4 条 variant

3. **生成图片**
   - 前端调用 `/api/generate`
   - 后端根据 `asset_type` 调用通用 prompt 模板
   - 通过 SSE 返回生成进度
   - 图片保存到 `scripts/samples/portrait_{name}/`

4. **选图**
   - `Gallery.tsx` 展示历史样本
   - 通过 `selected_portrait` 标记“待部署采用图”
   - 同时用哈希比对显示“当前线上图”和“新选图”

5. **编辑角色属性**
   - 在 profile tab 中编辑 rarity、8维属性、special attributes、tags、equipment_slots、小传
   - 也可 AI 自动生成 profile

6. **部署到游戏**
   - 把选中立绘复制到 `src/renderer/assets/portraits/` 与 `public/portraits/`
   - 组装角色卡对象
   - upsert 到 `base_cards.json`
   - 清除 `selected_portrait`

### 1.4 当前架构的优点

- **图片生成引擎已经是通用的**
  - `asset_type` 已支持 `portrait | item | scene`
  - `generate_assets.py` 已有 `ITEM_TEMPLATE` / `SCENE_TEMPLATE`
- **图库、选择、部署预览的产品形态是成熟的**
- **角色的“生成层 / 编辑层 / 运行层”分层很清晰**
- **适合继续扩展成更通用的 asset management platform**

### 1.5 当前架构的耦合点

当前系统虽然底层有通用能力，但上层高度角色定制：

- API 命名几乎全部是 `characters/*`
- 前端类型全部是 `Character*`
- profile 表单只适合角色
- deploy 逻辑写死生成 `type: "character"`
- 图库目录写死 `portrait_{name}`
- 当前“variant”的语义是“角色不同场景立绘描述”

结论：**底层通用，应用层角色耦合较重。**

---

## 2. 角色管理与物品管理的异同分析

### 2.1 数据模型对比

| 维度 | 角色 | 物品 | 结论 |
|---|---|---|---|
| 基础标识 | `name` | `name` | 一致 |
| variant | 4 条不同场景描述 | 建议保留，但语义改为 3~4 条不同视觉方案 | 可复用，不应强行等义 |
| 游戏文案 | 人物小传 | 物品描述 / lore | 一致，但内容风格不同 |
| 核心属性 | 8维基础属性 | `attribute_bonus` / `special_bonus` | 不同，不能共用同一 profile schema |
| 稀有度 | `rarity` | `rarity` | 一致 |
| 标签 | `tags` | `tags` | 一致 |
| 额外字段 | `equipment_slots` | `equipment_type` / `gem_slots` | 不同 |
| 立绘/图片 | 人物立绘 | 物品图 | 一致 |
| 部署目标 | `type: character` | `type: equipment`（或其他 item card type） | 不同 |

### 2.2 角色数据模型的特点

角色是“主体卡”：

- 有完整基础属性
- 有装备槽
- 有人物小传
- 有立绘
- 在游戏里是可被投入场景、参与检定的主卡

### 2.3 物品数据模型的特点

从 `base_cards.json` 看，现有物品主要至少分成几类：

- `equipment`
- `intel`
- `gem`
- 未来可能还有 `consumable`、`book` 等

其中真正最适合先做“物品管理器”的，是 **equipment**，因为它的数据结构最稳定：

- `type: "equipment"`
- `equipment_type`
- `attribute_bonus`
- `special_bonus`
- `gem_slots`
- `tags`

也就是说，**物品不是“有基础属性的角色”，而是“给角色附加效果的卡牌”**。

### 2.4 物品是否也需要 variant？

需要，但不应该照搬角色语义。

角色 variant 的语义是：

- 同一个人物的不同场景 / 动作 / 气质表现

物品 variant 更适合改成：

- 同一个物品的不同视觉设计方案
- 不同角度 / 装饰 / 材质表达
- 不同“传奇感 / 朴素感 / 威压感 / 仙气感”风格

例如“绣冬”的 4 个 variant，不应该是“战斗/日常/情绪/场景”，而应更像：

1. 极简展示版
2. 更强调刀脊与重量感
3. 更强调刀柄纹理与古意
4. 更强调灵气 / 传奇感

所以：

- **物品可以保留 variant 机制**
- **但生成 prompt 规则和文案规范必须单独设计**

### 2.5 物品是否也需要“小传/背景故事”？

建议保留，但分成两个层次理解：

#### 必需字段：游戏描述

对应 `base_cards.json` 的 `description`，长度可以和现在装备卡一致，用于卡牌详情展示。

#### 可选字段：背景故事 / lore

如果用户确实希望管理“物品背景”，建议作为编辑层字段保留，但不一定直接全部写进游戏卡牌：

- `description`：游戏内短文案
- `lore`：更长的物品背景，用于 AI 生成参考或管理端展示

这样比直接把长背景塞进 `description` 更稳。

### 2.6 功能流程对比

#### 角色流程

创建 → 生成 4 条描述 → 生成立绘 → 选中立绘 → 配属性 → 部署到游戏

#### 物品流程（推荐）

创建物品 → 设定类别（equipment_type） → 生成 3~4 条视觉 variant → 生成图片 → 选中图片 → 配置属性加成 / 标签 / gem_slots / lore → 部署到游戏

主要不同点：

1. **物品需要更早确定类别**
   - weapon / armor / accessory / mount
   - 因为会影响 prompt、属性表单、部署结构

2. **物品的 profile 表单与角色完全不同**
   - 角色编辑基础属性
   - 物品编辑 bonus

3. **物品可能同时关联背景图**
   - 如果用户说的“背景”是背景图而不是 lore，则需要增加 scene 关联能力
   - 这不应混入单物品卡 profile，应该作为“关联素材”管理

### 2.7 游戏数据结构对比

#### 角色卡

- `type: "character"`
- `attributes`
- `special_attributes`
- `equipment_slots`

#### 装备卡

- `type: "equipment"`
- `equipment_type`
- `attribute_bonus`
- `special_bonus`
- `gem_slots`

它们都部署到 `base_cards.json`，但 schema 明显不同。

所以部署逻辑只有一半相同：

**相同部分**

- 预览
- 选图
- 拷贝图片到游戏资源目录
- upsert card entry

**不同部分**

- image 目录不同（`portraits/` vs `items/`）
- card object 结构不同
- card_id 规则不同
- profile 校验不同

### 2.8 UI 结构对比

当前角色详情页 3 个 tab：

- 工坊（workshop）
- 属性（profile）
- 部署（deploy）

这套结构对物品仍然适用，但内容需要替换：

#### 对物品仍然适用的部分

- 左侧列表
- workshop tab
  - variant 选择
  - description 编辑
  - prompt 预览
  - 生成控制
  - 图库
- deploy tab
  - 状态预览
  - JSON 预览
  - 一键部署

#### 需要改造的部分

- profile tab
  - 不再是 8 维属性
  - 改成 rarity / equipment_type / attribute_bonus / special_bonus / gem_slots / tags / 游戏文案 / lore

结论：**3-tab 的信息架构可以复用，但 tab 内表单不能完全一致。**

### 2.9 AI 生成对比

#### 相同点

- 文字生成都是 GPT-5.4 / chat completion
- 图片生成都走 `gpt-image-1`
- 都有模板、SSE 进度、样本库、选图、部署
- 风格应该统一保持当前项目的美术方向
  - Q版
  - 卡通
  - 水墨
  - 透明背景

#### 不同点

- 文本生成 prompt 不同
  - 角色是“固定脸部特征 + 场景动作”
  - 物品应是“固定造型 identity + 不同设计重点”
- profile 生成 prompt 不同
  - 角色生成基础属性
  - 物品生成加成字段和类型字段
- 校验规则不同
  - 角色看总属性区间
  - 物品看 bonus 强度、稀有度匹配、`gem_slots` 合理性

---

## 3. 核心判断：除了 prompt 不同，是否应该完全保持一致？

**结论：不应该“完全一致”。**

更准确的判断是：

- **底层平台能力应该尽量一致**
- **领域模型、表单、部署结构不能强行一致**

可以把两者拆成两层：

### 3.1 应该保持一致的部分

- 应用框架
- 列表 + 详情布局
- workshop 工作流
- 图库与选图机制
- SSE 图片生成机制
- 模板管理机制
- 部署预览与一键部署交互
- 历史记录机制
- 样本目录管理模式

### 3.2 不应该保持一致的部分

- 生成 description 的规则
- profile schema
- AI profile prompt
- 校验规则
- deploy adapter
- 图片目录
- card type / card_id / game data shape

因此答案不是：

- “只换 prompt 就行”

也不是：

- “必须完全独立做一套”

而是：

> **推荐做成同一套素材管理平台下的两个 domain：Character Manager / Item Manager。**

---

## 4. 推荐方案：复用同一套系统，但做“领域适配层”

### 4.1 推荐结论

**推荐复用同一套系统，不建议独立复制一套角色管理器。**

原因：

1. 后端图片生成底座已经支持 `item`
2. UI 信息架构 70% 可复用
3. 图库、选图、部署预览这些通用能力已经做得较完整
4. 如果复制一套，后面模板、历史、选图、部署逻辑会出现双份维护

但复用的方式不是把“角色对象”硬套到“物品对象”上，而是：

> **抽象一个通用 Asset Manager Shell，再由 character/item 各自提供 schema、prompt、deploy adapter。**

### 4.2 为什么不建议完全独立？

如果完全独立复制一套，会短期快，长期会有这些问题：

- 模板管理双份
- 图库逻辑双份
- SSE 生成双份
- 部署预览双份
- 历史记录双份
- Bug 修复要修两次
- 后续再做 scene manager 会出现第三套

### 4.3 什么时候可以接受独立复制？

只有在以下场景下可以接受临时复制：

- 目标只是 1~2 天做一个内部 MVP
- 确认物品系统很快会被推翻
- 不在意后续重构成本

否则不建议。

---

## 5. 如果复用，建议抽象哪些部分？

### 5.1 抽象为“域配置”的部分

建议引入一个概念：**Asset Domain Config**

每个 domain（character / item / scene）提供自己的配置：

- `domainKey`
- `displayName`
- `listTitle`
- `assetType`
- `sampleFolderResolver`
- `publicImageResolver`
- `variantPromptRules`
- `profileSchema`
- `deployAdapter`
- `defaultCreatePayload`
- `labels`

这样前端和后端都能少写很多 `if character else item`。

### 5.2 后端需要抽象的部分

#### A. 通用图片生成保留

当前 `/api/generate` 已经是通用的，继续保留即可。

#### B. 拆出 domain service

建议按 domain 拆服务，而不是所有逻辑继续堆在 `main.py`：

- `character_service`
- `item_service`
- `shared_generation_service`
- `shared_deploy_service`

#### C. 抽象 deploy adapter

角色 deploy 和物品 deploy 共享外壳，但产物不同：

- 角色：生成 `character` card
- 物品：生成 `equipment` card

因此建议抽象为：

- 通用部署流程
  - 读取 profile
  - 解析选图
  - 复制图片
  - 组装 card entry
  - upsert base_cards
- 域特定 adapter
  - `build_character_card(profile)`
  - `build_item_card(profile)`

#### D. 抽象 JSON 数据源

建议不要继续把物品也塞进 `character_profiles.json` 或继续混在 `batch_config.json` 里。

更稳的做法：

- `scripts/item_batch_config.json`
- `scripts/item_profiles.json`

优点：

- 风险低
- 不影响现有角色功能
- 数据结构清晰
- 方便逐步重构到通用存储

### 5.3 前端需要抽象的部分

#### A. 列表页壳体可复用

`CharacterList.tsx` 的交互模式可以抽象成：

- `AssetList`
  - 列表展示
  - 新建按钮
  - 创建弹窗

但 item 创建弹窗需要多一个字段：

- item category / equipment_type

#### B. 详情页壳体可复用

`CharacterDetail.tsx` 建议拆成：

- `AssetDetailShell`
  - tab header
  - workshop/deploy 通用骨架
- `CharacterProfileEditor`
- `ItemProfileEditor`

否则 `CharacterDetail.tsx` 会继续膨胀。

#### C. Gallery 直接复用

`Gallery.tsx` 几乎可以直接复用，只要把 `characterName` 改成更通用的 `entityName`。

#### D. API 层按 domain 拆

当前 `api.ts` 全是 character API，建议拆为：

- `api/shared.ts`
- `api/characters.ts`
- `api/items.ts`

或者保留一个对象，但按 domain 分区。

---

## 6. 如果独立建设，哪些代码可以直接复制？

如果最终决定先快速独立做一套，建议仅复制这些高复用部分：

### 可直接复制

- `App.tsx` 的应用壳体
- `Gallery.tsx`
- 模板管理页 `TemplateSettings`
- `/api/generate` 的 SSE 图片生成机制
- 历史记录机制
- 样本目录读写逻辑
- 选图逻辑
- deploy preview 的展示方式

### 不应直接复制

- `CharacterProfile` 结构
- `CharacterDetail.tsx` 的 profile tab
- `generate-description` prompt
- `generate-profile` prompt
- `deploy_character` 里组装 `character` card 的逻辑

也就是说，就算走独立方案，也只能复制“壳”和“底座”，不能复制领域模型。

---

## 7. 物品数据模型设计建议

## 7.1 设计原则

物品系统建议也保持三层：

1. **生成层**：管理视觉 variant
2. **编辑层**：管理物品属性和 lore
3. **运行层**：部署到 `base_cards.json`

### 7.2 推荐文件

#### A. 生成层：`scripts/item_batch_config.json`

建议结构：

```json
[
  {
    "type": "item",
    "name": "绣冬",
    "description": "单柄重刀，刀身微弯，冷银刀脊，墨色缠柄，古朴压迫感强",
    "output": "item_绣冬/xiudong_01.png"
  },
  {
    "type": "item",
    "name": "绣冬",
    "description": "重刀造型，刀镡简洁，刀身有水墨暗纹，传奇名刀气质",
    "output": "item_绣冬/xiudong_02.png"
  }
]
```

说明：

- 仍然按“每条 variant 一条记录”
- 建议默认生成 3~4 条
- `type` 明确是 `item`
- `output` 放到 `scripts/samples/item_{name}/`

#### B. 编辑层：`scripts/item_profiles.json`

推荐以“装备卡”为第一期目标，结构如下：

```json
{
  "绣冬": {
    "card_type": "equipment",
    "equipment_type": "weapon",
    "rarity": "silver",
    "description": "南宫仆射佩刀，钝锋重刀，力沉势稳可镇千军。",
    "lore": "可选，更长的物品背景，用于管理端展示或 AI 参考。",
    "attribute_bonus": {
      "combat": 7,
      "physique": 5
    },
    "special_bonus": {
      "support": 2
    },
    "gem_slots": 1,
    "tags": ["weapon", "legendary", "paired"],
    "selected_image": "/absolute/path/to/sample.png"
  }
}
```

字段说明：

- `card_type`
  - 第一阶段建议固定为 `equipment`
  - 后续可扩展 `intel` / `gem` / `consumable`
- `equipment_type`
  - `weapon | armor | accessory | mount`
- `description`
  - 游戏内短文案
- `lore`
  - 可选长背景
- `attribute_bonus`
  - 对角色属性的加成
- `special_bonus`
  - 对 `support/reroll` 的加成
- `gem_slots`
  - 宝石槽
- `selected_image`
  - 待部署选中图片

#### C. 运行层：`base_cards.json`

部署后结构应与游戏现有装备卡保持一致：

```json
{
  "card_id": "equip_xiudong",
  "name": "绣冬",
  "type": "equipment",
  "rarity": "silver",
  "description": "南宫仆射佩刀，钝锋重刀，力沉势稳可镇千军。",
  "image": "/assets/items/item_scimitar_01.png",
  "equipment_type": "weapon",
  "attribute_bonus": {
    "combat": 7,
    "physique": 5
  },
  "special_bonus": {
    "support": 2
  },
  "gem_slots": 1,
  "tags": ["weapon", "legendary", "paired"]
}
```

### 7.3 是否需要“背景图”数据模型？

如果用户的“背景”指的是**背景故事**，上面的 `lore` 就足够。

如果用户的“背景”指的是**物品展示背景图 / 关联 scene 图**，建议不要塞进 item profile 主结构，而是采用关联资源：

- `scripts/item_scene_config.json` 或单独 `scene_batch_config.json`
- 每个 item 可选关联一个或多个 `scene` asset

原因：

- 物品图是透明背景单体素材
- scene 图是 16:9 背景资源
- 两者尺寸、prompt、用途都不同
- 强行放在一个 profile 里会把数据模型搞乱

所以建议：

- **item manager 管 item**
- **scene/background manager 管背景**
- 二者用关联字段连接

---

## 8. 物品 UI 设计建议

### 8.1 信息架构建议

物品系统仍建议保留 3 个 tab：

1. **工坊**
2. **属性**
3. **部署**

这是可复用现有认知成本最低的方案。

### 8.2 物品工坊 tab

与角色工坊基本一致：

- variant 选择
- variant description 编辑
- assembled prompt 预览
- 批量生成控制
- sample gallery
- 选图

差异点：

- 标题从“角色工坊”改为“物品工坊”
- variant 说明文案改为“视觉方案 / 设计方向”

### 8.3 物品属性 tab

建议表单字段：

- 基础信息
  - 名称
  - `card_type`
  - `equipment_type`
  - `rarity`
- 效果信息
  - `attribute_bonus`
  - `special_bonus`
  - `gem_slots`
- 文案信息
  - `description`
  - `lore`
- 标签
  - `tags`

### 8.4 物品部署 tab

可几乎完全复用角色部署 tab 的交互：

- 当前是否已部署
- 是否有 profile
- 是否有图片
- 当前游戏文件名
- 将写入的 JSON preview
- 一键部署按钮

---

## 9. AI 生成方案建议

### 9.1 图片生成

这部分和角色管理系统可以几乎完全一致：

- 都调用 `/api/generate`
- 都通过 `asset_type=item`
- 都使用 `gpt-image-1`
- 都保留当前项目风格：
  - Q版 / 卡通 / 水墨
  - 简洁笔触
  - 高饱和彩墨
  - 透明背景

这里是**最适合共用的部分**。

### 9.2 物品 variant 文本生成

建议为物品单独设计 LLM 输出规则，不要复用角色那套“脸型 + 场景”的 system prompt。

推荐物品生成规则：

- 同一物品 3~4 条 variant 要保持核心 identity 一致
  - 材质
  - 轮廓
  - 标志性装饰
- 不同 variant 改变强调重点
  - 材质细节
  - 传奇感
  - 威压感
  - 灵气 / 古意
- 输出仍然是 JSON 数组

### 9.3 物品属性 AI 生成

建议增加一套 `generate-item-profile` prompt，输出：

- `rarity`
- `equipment_type`
- `description`
- `lore`
- `attribute_bonus`
- `special_bonus`
- `gem_slots`
- `tags`

同时要增加规则，例如：

- stone / copper / silver / gold 对应 bonus 强度区间
- `gem_slots` 上限建议随 rarity 变化
- `equipment_type` 影响推荐 bonus 分布

例如：

- weapon：更偏 `combat`
- armor：更偏 `physique` / `survival`
- accessory：更偏 `charm` / `social` / `wisdom`
- mount：更偏 `survival` / `social` / `combat`

---

## 10. 最终推荐方案

### 10.1 最推荐的落地方向

**做一个“共享底座 + character/item 两个 domain”的统一素材管理系统。**

不是简单“复制角色管理器一份”，也不是“只改 prompt”。

最合理的拆法是：

- **共享层**
  - 生成引擎
  - 图库
  - 模板管理
  - 选图
  - 部署预览
  - 历史记录
  - 页面骨架
- **角色层**
  - 角色 variant 规则
  - 角色 profile schema
  - 角色 deploy adapter
- **物品层**
  - 物品 variant 规则
  - 物品 profile schema
  - 物品 deploy adapter

### 10.2 面向当前项目的实际建议

按风险和收益排序，我建议：

#### Phase 1：先做 equipment manager

只覆盖：

- `type: equipment`
- `equipment_type`
- `attribute_bonus`
- `special_bonus`
- `gem_slots`

原因：

- 与现有 `base_cards.json` 最匹配
- 需求最明确
- 能快速验证物品管理产品形态

#### Phase 2：再扩展其他 item card type

扩展：

- `intel`
- `gem`
- `consumable`
- `book`

#### Phase 3：再接 scene/background manager

把“背景图”能力做成第三个 domain，而不是硬塞进 item manager。

---

## 11. 预估工作量

### 方案 A：推荐方案（共享底座 + item domain）

#### 后端

- item 数据文件与 service 设计：0.5 天
- item API（list/create/profile/deploy/preview/select）：1 天
- item AI 文本生成（variant + profile）：0.5~1 天
- deploy adapter / 图片目录 / base_cards upsert：0.5 天

#### 前端

- 抽象通用壳体 / 列表 / detail shell：1 天
- item list + item detail + item profile form：1~1.5 天
- 复用 gallery / deploy preview / template 管理：0.5 天

#### 联调与验证

- 联调、边界处理、数据修复、手工验证：0.5~1 天

### 总计

**约 4 ~ 6 个工作日**

这是相对稳妥、可长期维护的方案。

### 方案 B：快速 MVP（独立复制一套）

- 复制角色管理器前后端壳体：0.5~1 天
- 改 item profile / deploy / prompt：1 天
- 联调修补：0.5~1 天

### 总计

**约 2 ~ 3 个工作日**

但后续重构成本更高，不推荐作为正式方案。

---

## 12. 最终结论

一句话总结：

> **物品管理和角色管理，不应该“除了 prompt 不同以外完全保持一致”；正确做法是复用同一套平台能力，但为物品建立独立的数据模型、表单和部署适配层。**

更具体地说：

- **图片生成流程可以高度一致**
- **图库、选图、部署预览可以直接复用**
- **3-tab 结构可以保留**
- **但 profile schema、文本生成规则、deploy card 结构必须独立**

因此本项目最推荐的方向是：

> **在现有角色管理器基础上演进为统一 Asset Manager，先新增 Item Manager（equipment 优先），后续再视需求扩展 Scene/Background Manager。**
