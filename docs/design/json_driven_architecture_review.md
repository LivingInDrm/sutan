# JSON 驱动架构审查报告

## 1. 审查目标

本报告围绕用户明确的目标架构进行审查：

1. 每一类游戏内容都对应 JSON 文件
2. 游戏运行时直接读取这些 JSON 驱动运行
3. 素材管理器负责创建和修改这些 JSON
4. 游戏与素材管理器通过 JSON 解耦
5. 核心价值是易扩展、低耦合

本次审查聚焦以下内容类型：

- 人物卡
- 装备
- 物品（情报 / 思绪 / 宝石）
- 地点（Location）
- 场景 / 剧情（Scene）
- 地图（Map）
- 任务 / 主线

---

## 2. 当前 JSON 驱动体系全景图

当前项目里已经存在一套“**部分 JSON 驱动**”体系，但它并不是单一、纯粹、彻底解耦的体系，而是混合了以下几种模式：

### 2.1 运行时 JSON

- `src/renderer/data/configs/cards/base_cards.json`
  - 运行时卡牌主表
  - 同时承载人物、装备、情报、宝石、思绪、苏丹卡
- `src/renderer/data/configs/scenes/*.json`
  - 运行时剧情 / 场景数据
- `src/renderer/data/configs/maps/map_001_beiliang.json`
  - 运行时地点 / 地图配置
- `src/renderer/data/configs/achievements.json`
  - 成就配置文件，存在但目前未接入实际运行链路

### 2.2 素材管理器维护的“上游 JSON / 中间 JSON”

- `scripts/character_profiles.json`
  - 人物资料草稿 / 部署前 profile
- `scripts/item_profiles.json`
  - 物品资料草稿 / 部署前 profile
- `scripts/item_batch_config.json`
  - 物品图片变体描述
- `scripts/batch_config.json`
  - 人物图片变体描述
- `scripts/location_profiles.json`
  - 地点 / 地图 / icon / backdrop / scene_ids 的主编辑源
- `scripts/map_manifest.json`
  - map_id 到运行时 map 文件的映射

### 2.3 资源文件

- `src/renderer/assets/portraits/*`
- `src/renderer/assets/items/*`
- `src/renderer/public/maps/*`
- `tools/asset-manager/backend/maps/*`

### 2.4 实际运行链路

#### 人物 / 装备 / 部分物品

```text
素材管理器 profile/json
→ deploy
→ 写入 base_cards.json + 复制图片
→ 游戏从 base_cards.json 模块导入
```

#### 地点 / 地图

```text
location_profiles.json
→ export-runtime-map-data.py 生成 map_001_beiliang.json
→ 游戏从 map_001_beiliang.json 模块导入
```

但素材管理器同时也会**直接修改**运行时 map JSON，因此这里不是单一链路，而是“脚本生成 + 管理器直改”并存。

#### 场景 / 剧情

```text
src/renderer/data/configs/scenes/*.json
→ dataLoader.loadScenesFromDirectory()
→ GameManager / SceneManager
```

这一块运行时读取比较直接，但素材管理器并不直接管理这些 scene JSON 内容。

---

## 3. 每类内容匹配度评估表

| 内容类型 | 运行时 JSON | 素材管理器能否管理 | 游戏能否直接读取 | 匹配度 | 结论 |
|---|---|---:|---:|---|---|
| 人物卡 | `src/renderer/data/configs/cards/base_cards.json` | 能，但先写 `scripts/character_profiles.json`，再 deploy | 能 | ⚠️ 部分匹配 | 有运行时 JSON，也有管理能力，但存在 deploy 步骤、编译期资源依赖、并非纯 runtime JSON |
| 装备 | `src/renderer/data/configs/cards/base_cards.json` | 能，但仅限 item manager 的 equipment 流 | 能 | ⚠️ 部分匹配 | 装备已 JSON 化，但管理链路只覆盖 equipment 子类 |
| 物品（情报 / 思绪 / 宝石） | 仍落在 `base_cards.json` | 基本不能 | 能 | ⚠️ 部分匹配 | 游戏能读，但素材管理器不能系统化管理这些类型 |
| 地点（Location） | `src/renderer/data/configs/maps/map_001_beiliang.json` | 能管理 `location_profiles.json`，并部分同步运行时 map JSON | 能 | ⚠️ 部分匹配 | 有 JSON、有管理器，但存在“上游源 + 生成物 + 直改生成物”多源问题 |
| 场景 / 剧情（Scene） | `src/renderer/data/configs/scenes/*.json` | 不能完整管理，只能管地点关联、icon/backdrop | 能 | ⚠️ 部分匹配 | 运行时 Scene JSON 比较完整，但素材管理器不能管理场景核心内容 |
| 地图（Map） | `src/renderer/data/configs/maps/map_001_beiliang.json` | 部分能 | 能 | ⚠️ 部分匹配 | 只覆盖部分地图链路，且当前实现只绑定单张地图 |
| 任务 / 主线 | 无独立运行时 JSON | 否 | 否 | ❌ 不匹配 | 当前没有真正的 quest / mainline JSON 体系 |

### 总体判断

- **完全匹配：0 项**
- **部分匹配：6 项**
- **不匹配：1 项**

当前项目已经具备“JSON 驱动雏形”，但距离“所有内容统一 JSON 驱动、素材管理器可管理、游戏直接消费、两端彻底解耦”的目标，还有明显差距。

---

## 4. 分类型详细审查

## 4.1 人物卡

### 当前状态

- 运行时落点：
  - `src/renderer/data/configs/cards/base_cards.json`
- 素材管理器上游数据：
  - `scripts/character_profiles.json`
  - `scripts/batch_config.json`
- 图片部署：
  - 复制到 `src/renderer/assets/portraits/`

### 素材管理器能力

- 可以创建角色
- 可以生成和选择立绘
- 可以生成和编辑 profile
- 可以 deploy 到 `base_cards.json`

### 游戏读取情况

- 游戏启动时直接导入 `base_cards.json`
- 人物卡由 `GameManager` / `CardManager` 使用

### Gap

1. **素材管理器并不是直接编辑运行时 JSON**
   - 先写 `character_profiles.json`
   - 再通过 deploy 合并到 `base_cards.json`
2. **人物图片是编译期资源**
   - 部署目标是 `src/renderer/assets/portraits/`
   - 这更像源码资源，不是纯运行时热更新资源
3. **游戏读取 JSON 的方式是模块导入，不是真正运行时从文件系统动态读取**
   - 在打包后的 Electron / Vite 产物中，JSON 更接近“构建输入”而不是“可热替换运行时配置”

### 评估

- **匹配度：⚠️ 部分匹配**

---

## 4.2 装备

### 当前状态

- 运行时落点：
  - `src/renderer/data/configs/cards/base_cards.json`
- 素材管理器上游数据：
  - `scripts/item_profiles.json`
  - `scripts/item_batch_config.json`

### 素材管理器能力

- 能创建 item
- 能生成图片
- 能编辑 profile
- 能 deploy 到 `base_cards.json`

### 游戏读取情况

- 装备和人物一样，统一从 `base_cards.json` 读取
- `EquipmentSystem` 使用卡牌字段中的：
  - `equipment_type`
  - `attribute_bonus`
  - `special_bonus`
  - `gem_slots`

### Gap

1. **item manager 的 deploy 逻辑实际固定写成 `type: "equipment"`**
2. **虽然 profile 中有 `card_type` 字段，但部署时并没有真正按 `card_type` 分发**
3. **图片同样落在编译期资源目录 `src/renderer/assets/items/`**

### 评估

- **匹配度：⚠️ 部分匹配**

---

## 4.3 物品（情报 / 思绪 / 宝石）

### 当前状态

在 `base_cards.json` 中已经存在这些类型：

- `intel`
- `thought`
- `gem`

但它们主要是手工存在于运行时卡牌表中，不属于素材管理器完整管理链路的一部分。

### 素材管理器能力

- **情报（intel）**：没有专门管理能力
- **思绪（thought）**：没有专门管理能力
- **宝石（gem）**：没有专门管理能力

当前 item manager 的整体心智模型仍是“装备管理器”，不是“统一物品管理器”。

### 游戏读取情况

- 游戏层可以从 `base_cards.json` 读取并识别这些类型
- `SceneScreen` 的 item slot 也允许：
  - `equipment`
  - `intel`
  - `consumable`
  - `book`
  - `gem`

### Gap

1. **这些类型虽然已经 JSON 化，但没有素材管理器 CRUD**
2. **运行时已经允许的 `consumable` / `book`，当前 `base_cards.json` 里几乎没有实际体系**
3. **“物品”这一大类并未形成统一 schema、统一管理、统一部署**

### 评估

- **匹配度：⚠️ 部分匹配**

---

## 4.4 地点（Location）

### 当前状态

- 编辑源：
  - `scripts/location_profiles.json`
- 运行时 map JSON：
  - `src/renderer/data/configs/maps/map_001_beiliang.json`

地点信息包括：

- `location_id`
- `name`
- `icon_image`
- `backdrop_image`
- `position`
- `scene_ids`
- `unlock_conditions`

### 素材管理器能力

- 能查看地点列表
- 能编辑名称、描述、坐标、关联 `scene_ids`
- 能生成 / 选择 / deploy icon 与 backdrop
- 能同步部分运行时地图数据

### 游戏读取情况

- `WorldMapScreen` 和 `LocationScreen` 直接使用 map JSON

### Gap

1. **真正编辑源不是运行时 map JSON，而是 `location_profiles.json`**
2. **同时又存在对生成物 `map_001_beiliang.json` 的直接修改**
   - 更新坐标 / scene_ids 时，素材管理器会直改运行时 map JSON
   - deploy backdrop/icon 时，也会直改运行时 map JSON
3. **这意味着 map JSON 不是纯生成产物，也不是唯一事实源**
4. **地图当前明显是单地图思维**
   - UI 中直接 import `map_001_beiliang.json`
   - `selectedMapId` 默认写死 `map_001_beiliang`

### 评估

- **匹配度：⚠️ 部分匹配**

---

## 4.5 场景 / 剧情（Scene）

### 当前状态

运行时场景 JSON 体系已经存在：

- `src/renderer/data/configs/scenes/scene_001.json`
- `src/renderer/data/configs/scenes/scene_002.json`
- `src/renderer/data/configs/scenes/scene_003.json`
- `src/renderer/data/configs/scenes/scene_004.json`
- `src/renderer/data/configs/scenes/scene_006.json`
- `src/renderer/data/configs/scenes/scene_007.json`
- `src/renderer/data/configs/scenes/scene_shop_001.json`

Scene JSON 已经包含核心运行字段：

- `scene_id`
- `name`
- `description`
- `background_image`
- `type`
- `duration`
- `slots`
- `stages`
- `entry_stage`
- `unlock_conditions`
- `absence_penalty`

### 素材管理器能力

素材管理器目前能管理的是：

- 地点上的 scene 关联关系（`scene_ids`）
- scene icon / backdrop 资源
- location_profiles 里的 scene 元信息

但**不能完整管理真正运行时的 scene JSON 内容**，尤其不能系统化管理：

- `stages`
- `narrative`
- `settlement`
- `branches`
- `unlock_conditions`
- `absence_penalty`

### 游戏读取情况

- 游戏通过 `dataLoader.loadScenesFromDirectory()` 加载 `configs/scenes/*.json`
- `SceneManager` / `SceneRunner` 直接消费这些 JSON

### Gap

1. **Scene 运行时 JSON 与素材管理器的“地点管理”是两套数据面**
2. **素材管理器管理的是地点素材，不是剧情逻辑**
3. **新增一个真正可运行的 scene，不可能只靠当前素材管理器完成**
   - 仍需手写 / 外部工具生成 `src/renderer/data/configs/scenes/*.json`
4. **scene 背景图路径体系也不统一**
   - 有的 Scene 用 `/maps/map_001/*.png`
   - 有的 Scene 用编译期资源名（如 `shop01.png`）

### 评估

- **匹配度：⚠️ 部分匹配**

---

## 4.6 地图（Map）

### 当前状态

地图运行时文件存在：

- `src/renderer/data/configs/maps/map_001_beiliang.json`

同时有 map 级映射文件：

- `scripts/map_manifest.json`

### 素材管理器能力

- 能依据 map manifest 找到 map 对应运行时文件
- 能部署 icon / backdrop 到 map 公共资源目录
- 能维护地点数据

### 游戏读取情况

- 地图数据被 UI 静态导入使用
- 并未形成“按 map_id 动态发现所有地图 JSON”的统一机制

### Gap

1. **地图是存在 JSON 的，但消费方式仍然是写死单文件 import**
2. **多地图扩展仍需改代码，不是纯加 JSON 即可生效**
3. **地图运行时配置与地图素材部署存在双重路径约定**
   - `src/renderer/data/configs/maps/*.json`
   - `src/renderer/public/maps/*`

### 评估

- **匹配度：⚠️ 部分匹配**

---

## 4.7 任务 / 主线

### 当前状态

当前**没有独立的任务 / 主线 JSON 体系**。

已有的相关痕迹包括：

- `GameEndReason.MainlineVictory` 枚举
- `achievements.json`
- Scene 内的 `unlock_conditions`
- Scene 的分支 / 结算 / `unlock_scenes`

但这些都不是“任务系统 / 主线系统”的完整 JSON 方案。

### 素材管理器能力

- 无

### 游戏读取情况

- 无独立 quest/mainline 读取逻辑
- `achievements.json` 虽存在，但目前未见实际运行时接入链路

### 评估

- **匹配度：❌ 不匹配**

---

## 5. 解耦程度分析

## 5.1 素材管理器和游戏运行时，是否真正通过 JSON 解耦？

### 结论

**部分解耦，但不干净，也不彻底。**

当前不是“游戏只认 JSON、素材管理器只产 JSON”的纯边界，而是：

- 有些内容通过 JSON 连接
- 有些内容通过 deploy 过程连接
- 有些内容通过源码目录 / 编译期资源连接
- 有些内容通过脚本生成 + 直接回写生成物连接

这意味着当前更像：

> “以 JSON 为中心的半解耦系统”

而不是：

> “统一运行时 JSON 驱动系统”

---

## 5.2 当前存在的隐式依赖

### 1. 路径硬编码依赖

- `TitleScreen` 直接 import `base_cards.json`
- `WorldMapScreen` / `LocationScreen` 直接 import `map_001_beiliang.json`
- `uiStore` 默认写死 `selectedMapId: 'map_001_beiliang'`

这说明新增 map 不是“放一个 JSON 就行”，还要改代码。

### 2. 编译期资源依赖

- 角色与装备图片部署到 `src/renderer/assets/*`
- 游戏中的这些资源路径使用 `/assets/...`

这说明角色 / 装备并不是纯运行时内容，而是依附于前端打包产物。

### 3. 中间态 profile 依赖

- 角色和装备先写 profile JSON，再 deploy 到运行时 JSON
- 素材管理器不是直接维护最终运行时数据

### 4. 生成物回写依赖

- `location_profiles.json` 是地点主源
- 但素材管理器又会直接改 `map_001_beiliang.json`

这让“谁是真正 source of truth”变得模糊。

### 5. Scene 双层数据面依赖

- 运行时剧情逻辑在 `configs/scenes/*.json`
- 素材管理器维护的是 `location_profiles.json` 中的地点 scene 关联与图片

即“剧情逻辑”和“地点挂载关系”没有统一在一个场景内容模型里。

---

## 5.3 新增一个角色 / 地点 / 场景，是否只需在素材管理器操作就能直接在游戏中生效？

### 新增角色

- **不能算完全可以**
- 当前需要：
  1. 在素材管理器生成角色资料 / 立绘
  2. 执行 deploy
  3. 依赖 `base_cards.json` 与编译期资源目录
- 在开发态可能重载后可见，但在理想架构标准下，这不属于“纯运行时 JSON 生效”

### 新增地点

- **部分可以**
- 地点数据可在素材管理器编辑，并写回 `location_profiles.json`
- 但运行时 map JSON 还涉及生成与同步问题
- 且地图消费代码存在固定 map 依赖

### 新增场景

- **基本不可以**
- 当前素材管理器不能创建完整可运行的 `scene_xxx.json`
- 只能管理地点挂接关系和图片资源

### 新增装备

- **部分可以**
- 仅限 equipment 流

### 新增情报 / 思绪 / 宝石

- **基本不可以**
- 需要手动改 `base_cards.json`

---

## 6. 核心 Gap 清单

## P0：架构级核心 Gap

### P0-1. 游戏并不是“真正运行时直接读 JSON 文件”

当前 cards / scenes / map 配置都主要通过前端模块导入进入游戏。

这意味着：

- 它们更像“源码配置”
- 而不是“游戏运行时外部数据”

这和目标架构存在本质差异。

### P0-2. Scene 没有纳入素材管理器完整管理范围

剧情最核心的逻辑层：

- `stages`
- `narrative`
- `settlement`
- `branch`

当前不在素材管理器里。

### P0-3. 任务 / 主线没有独立 JSON 体系

用户要求的“任务 / 主线”目前基本空缺。

### P0-4. Map / Location 存在多事实源

- `location_profiles.json`
- `map_001_beiliang.json`
- `map_manifest.json`

而且生成物会被再次直接修改，破坏了单向生成链。

---

## P1：内容类型覆盖不足

### P1-1. Item manager 实际只覆盖 equipment

虽然 runtime card type 有：

- `equipment`
- `intel`
- `consumable`
- `book`
- `thought`
- `gem`

但管理器并没有统一覆盖这些类型。

### P1-2. 地图扩展能力不够 JSON 化

当前多地图仍不是“只加 JSON + 资源就自动生效”。

### P1-3. Scene 资源路径体系不统一

有的走 `/maps/...`
有的走编译期 `assets/scenes`

这让 Scene 的部署方式不一致。

---

## P2：工程一致性问题

### P2-1. `achievements.json` 已存在但未融入整体体系

这说明项目里已有“额外 JSON 配置类型”，但没有形成统一内容模型。

### P2-2. root `public/` 与 `src/renderer/public/` / `src/renderer/assets/` 并存

资源部署边界仍有历史包袱，容易制造隐式依赖和误判。

---

## 7. 改进建议（按优先级排序）

## P0 建议：先把“运行时 JSON”定义清楚

### 建议 1：建立统一内容仓库目录

建议把所有真正驱动游戏的内容统一收敛成一套运行时内容目录，例如：

```text
content/
  cards/
    characters.json
    equipments.json
    intel.json
    thoughts.json
    gems.json
  scenes/
    scene_001.json
    scene_002.json
  maps/
    map_001.json
  quests/
    mainline_001.json
    sidequests.json
```

或者继续保留 `src/renderer/data/configs/`，但要保证它们是唯一运行时事实源，不再混用 profile/生成物/直改。

### 建议 2：游戏改为“运行时读取内容目录”，不要直接把 JSON 当构建期源码模块

目标应该是：

- 游戏启动时扫描 / 加载 JSON 内容目录
- 而不是通过 TS `import ...json` 把它们打进包里

这样才能真正实现：

- 内容热更新
- 素材管理器与游戏解耦
- 打包后仍能扩内容

### 建议 3：Scene 进入统一内容模型

把当前 Scene 拆成两层或统一成一层，但必须有明确主源：

- `scene runtime logic`
- `scene visual/meta`

理想上都应纳入 scene JSON 中，由素材管理器编辑。

### 建议 4：新增 quests / mainline JSON 体系

至少补齐：

- 主线节点
- 任务条件
- 任务奖励
- 任务状态推进
- 与 scene / location / card 的引用关系

---

## P1 建议：统一素材管理器的数据面

### 建议 5：把角色 / 装备 / intel / thought / gem 全部纳入统一卡牌 schema

不要让 item manager 继续停留在“装备管理器”。

建议将 card 内容拆成：

- 卡牌通用字段
- 各类型扩展字段

并让素材管理器按 `card_type` 真正部署，而不是写死 `equipment`。

### 建议 6：取消 Location 的多事实源

二选一：

1. **`location_profiles.json` 是唯一主源，运行时 map JSON 只生成、不回写**
2. **直接让素材管理器编辑运行时 map JSON，自身不再维护平行 location_profiles**

从当前项目状态看，建议采用：

> `location_profiles.json` 作为唯一主源，`map_*.json` 完全由脚本生成，任何 UI 操作都只写主源。

### 建议 7：统一 Scene 资源路径

Scene 背景要么统一走：

- `public` 运行时资源

要么统一走：

- `assets` 编译期资源

如果目标是“内容扩展友好”，更建议 Scene 背景也改为运行时资源路径。

---

## P2 建议：补齐内容治理能力

### 建议 8：为每类 JSON 建 schema + 校验 + 引用检查

例如：

- scene 引用的 card_id 是否存在
- location 引用的 scene_id 是否存在
- quest 引用的 scene_id / location_id 是否存在
- map 里的 location_id 是否唯一

### 建议 9：建立“内容构建 / 校验 / 导出”单向流水线

理想流程：

```text
素材管理器编辑内容 JSON
→ 内容校验
→ 生成运行时索引
→ 游戏读取
```

而不是多个工具分别直接改不同目标文件。

### 建议 10：补一份正式的内容层架构文档

建议单独定义：

- card schema
- scene schema
- location/map schema
- quest schema
- asset path contract
- source of truth 规则

---

## 8. 面向理想状态的目标架构建议

如果要达到用户描述的理想状态，建议把目标明确为：

### 8.1 单一事实源

每类内容只有一个主 JSON 来源：

- Characters
- Items
- Locations
- Scenes
- Maps
- Quests

### 8.2 游戏只消费运行时内容仓库

游戏不关心素材管理器内部 profile、batch config、临时样本目录。

游戏只认：

- 内容 JSON
- 资源 URL

### 8.3 素材管理器只负责内容生产，不负责把业务逻辑散落写到多个目标文件

素材管理器应该输出统一内容层，而不是：

- 这里写 profile
- 那里写 runtime
- 另一处再复制图片
- 再去补一份 map 生成物

### 8.4 新增内容只需“编辑内容 + 放资源”

理想状态下：

- 新增角色：只需在素材管理器创建角色并发布
- 新增地点：只需在素材管理器编辑 location/map 内容并发布
- 新增场景：只需在素材管理器编辑 scene JSON 并发布
- 新增任务：只需新增 quest JSON

游戏不需要再改代码。

---

## 9. 最终结论

当前项目**已经有明显的 JSON 驱动基础**，尤其是：

- 卡牌运行时表
- Scene 运行时 JSON
- Map 运行时 JSON
- Location 编辑源

但从“用户期待的理想架构”来看，当前状态仍然是：

> **JSON 驱动雏形成立，但统一性不足、边界不清、解耦不彻底。**

最关键的三个缺口是：

1. **游戏对 JSON 的消费仍偏构建期，而不是真正运行时内容读取**
2. **Scene 与 Quest 没有完整纳入素材管理器统一内容管理**
3. **Location / Map 存在多事实源与同步写入问题**

如果按优先级推进，建议先解决：

- **P0：统一运行时内容源**
- **P0：把 Scene / Quest 纳入同一内容模型**
- **P1：让 item manager 真正覆盖所有物品类型**

做到这一步后，项目才会真正接近“**游戏直接基于 JSON 运行，与素材管理器解耦**”这一目标。