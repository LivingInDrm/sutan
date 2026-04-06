# 数据结构对齐方案：素材管理器与游戏运行时

## 1. 背景与目标

当前仓库里，素材管理器工作区与游戏运行时的数据并非同构：

- 工作区主要编辑：
  - `scripts/character_profiles.json`
  - `scripts/item_profiles.json`
  - `scripts/location_profiles.json`
- 运行时主要消费：
  - `src/renderer/data/configs/cards/characters.json`
  - `src/renderer/data/configs/cards/equipment.json`
  - `src/renderer/data/configs/cards/special.json`
  - `src/renderer/data/configs/scenes/scene_*.json`
  - `src/renderer/data/configs/maps/map_*.json`

现状导致：

- 同一类内容在两套文件之间存在字段重命名、结构重组、路径重写。
- deploy 不只是“发布”，还承担“转换器”的职责。
- 工作区与运行时很难保证长期一致。
- 素材管理器里“scene”实际编辑的是**地图地点/location**，而运行时 `configs/scenes/*.json` 表示**事件/关卡 scene**，两者语义并不一致。

本方案的目标是把角色、物品、地点三类素材统一成：

1. **工作区和运行时使用完全相同的核心 schema**
2. **文件名和文件划分完全一致，只是目录不同**
3. **deploy 只做过滤 + 复制，不做结构转换**
4. **工作区允许额外管理字段，但不污染运行时核心结构**

---

## 2. 现状分析

## 2.1 角色：`character_profiles.json` vs `cards/characters.json`

### 2.1.1 工作区文件

文件：`scripts/character_profiles.json`

顶层结构：

- 顶层为对象
- key = 角色名
- value = 角色 profile 对象

工作区角色字段集合：

| 字段 | 类型 | 说明 |
|---|---|---|
| `description` | string | 人物小传 |
| `rarity` | string | 稀有度 |
| `attributes` | object | 八维属性 |
| `special_attributes` | object | 特殊属性 |
| `tags` | string[] | 标签 |
| `equipment_slots` | number | 装备槽 |

`attributes` 子字段：

- `physique`
- `charm`
- `wisdom`
- `combat`
- `social`
- `survival`
- `stealth`
- `magic`

`special_attributes` 子字段：

- `support`
- `reroll`

### 2.1.2 运行时文件

文件：`src/renderer/data/configs/cards/characters.json`

顶层结构：

- 顶层为数组
- 每个元素是一张角色卡对象

运行时角色字段集合：

| 字段 | 类型 | 说明 |
|---|---|---|
| `card_id` | string | 卡牌唯一 ID |
| `name` | string | 角色名 |
| `type` | string | 固定为 `character` |
| `rarity` | string | 稀有度 |
| `description` | string | 人物描述 |
| `image` | string | 角色立绘路径 |
| `attributes` | object | 八维属性 |
| `special_attributes` | object | 特殊属性 |
| `tags` | string[] | 标签 |
| `equipment_slots` | number | 装备槽 |

### 2.1.3 字段对比

| 工作区字段 | 运行时对应字段 | 是否同名 | 差异说明 |
|---|---|---|---|
| 顶层 key（角色名） | `name` | 否 | 工作区用对象 key，运行时用显式字段 |
| 无 | `card_id` | 否 | 运行时新增唯一 ID |
| 无 | `type` | 否 | 运行时固定写死为 `character` |
| `description` | `description` | 是 | 一致 |
| `rarity` | `rarity` | 是 | 一致 |
| `attributes` | `attributes` | 是 | 一致 |
| `special_attributes` | `special_attributes` | 是 | 一致 |
| `tags` | `tags` | 是 | 一致 |
| `equipment_slots` | `equipment_slots` | 是 | 一致 |
| 无 | `image` | 否 | 运行时需要发布后的立绘 URL |

### 2.1.4 结论

角色数据已经有一半核心字段对齐，但仍有三个关键断点：

1. **顶层组织不一致**：对象 map vs 数组
2. **身份字段不一致**：工作区没有 `card_id`、`type`
3. **资源字段不一致**：工作区没有运行时可直接消费的 `image`

换句话说，角色是“字段大体相近，但容器结构与发布字段不一致”。

---

## 2.2 物品：`item_profiles.json` vs `cards/equipment.json`

### 2.2.1 工作区文件

文件：`scripts/item_profiles.json`

顶层结构：

- 顶层为对象
- key = 物品名
- value = 物品 profile 对象

工作区物品字段集合：

| 字段 | 类型 | 说明 |
|---|---|---|
| `card_type` | string | 当前值为 `equipment` |
| `equipment_type` | string | 装备类型 |
| `rarity` | string | 稀有度 |
| `description` | string | 游戏内描述 |
| `lore` | string | 背景文本 |
| `attribute_bonus` | object | 属性加成 |
| `special_bonus` | object | 特殊加成 |
| `gem_slots` | number | 宝石槽 |
| `tags` | string[] | 标签 |

`attribute_bonus` 当前出现过的子字段：

- `physique`
- `charm`
- `wisdom`
- `combat`
- `stealth`
- `magic`

`special_bonus` 当前出现过的子字段：

- `support`
- `reroll`

### 2.2.2 运行时文件

文件：`src/renderer/data/configs/cards/equipment.json`

顶层结构：

- 顶层为数组
- 每个元素是一张装备卡对象

运行时物品字段集合：

| 字段 | 类型 | 说明 |
|---|---|---|
| `card_id` | string | 卡牌唯一 ID |
| `name` | string | 物品名 |
| `type` | string | 固定为 `equipment` |
| `rarity` | string | 稀有度 |
| `description` | string | 游戏内描述 |
| `image` | string | 物品图路径 |
| `equipment_type` | string | 装备类型 |
| `attribute_bonus` | object | 属性加成 |
| `special_bonus` | object | 特殊加成 |
| `gem_slots` | number | 宝石槽 |
| `tags` | string[] | 标签 |

### 2.2.3 字段对比

| 工作区字段 | 运行时对应字段 | 是否同名 | 差异说明 |
|---|---|---|---|
| 顶层 key（物品名） | `name` | 否 | 工作区用对象 key，运行时用显式字段 |
| `card_type` | `type` | 否 | 语义相同但字段名不同 |
| 无 | `card_id` | 否 | 运行时新增唯一 ID |
| `equipment_type` | `equipment_type` | 是 | 一致 |
| `rarity` | `rarity` | 是 | 一致 |
| `description` | `description` | 是 | 一致 |
| `attribute_bonus` | `attribute_bonus` | 是 | 一致 |
| `special_bonus` | `special_bonus` | 是 | 一致 |
| `gem_slots` | `gem_slots` | 是 | 一致 |
| `tags` | `tags` | 是 | 一致 |
| `lore` | 无 | 否 | 工作区独有，deploy 时被丢弃 |
| 无 | `image` | 否 | 运行时独有，deploy 时生成 |

### 2.2.4 结论

物品比角色多两个额外问题：

1. `card_type` 与运行时 `type` 命名不一致
2. `lore` 是工作区独有字段，运行时 schema 不承认，deploy 时被直接丢弃

因此物品是“字段本体较接近，但命名、容器和附加文案未统一”。

---

## 2.3 地点：`location_profiles.json` vs `configs/scenes/*.json`

### 2.3.1 先说明一个关键事实：二者并不是同一层概念

这是当前系统里最重要的结构问题。

`scripts/location_profiles.json` 里的“scenes”实际上是：

- 地图上的地点
- 运行时 map 里的 location
- 字段里也使用 `position`、`scene_ids`、`icon_path`、`backdrop_path`

而 `src/renderer/data/configs/scenes/scene_*.json` 实际表示：

- 可进入的事件 / 挑战 / 商店内容
- 包含 `stages`、`slots`、`settlement`
- 属于 gameplay scene，而不是地图 location

所以这里并非简单的“字段不一致”，而是**实体模型不一致**。

### 2.3.2 工作区地点文件

文件：`scripts/location_profiles.json`

顶层结构：

- 顶层对象
- 主体为 `maps`
- `maps[map_id].scenes[]` 存放地图地点

工作区地图/地点结构：

| 层级 | 字段 | 说明 |
|---|---|---|
| map | `name` | 地图名称 |
| map | `terrain` | 地形素材信息 |
| map | `scenes` | 地点列表，命名上误导，语义其实是 location |

工作区地点字段集合：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | 地点 ID，实际是 `location_id` |
| `name` | string | 地点名称 |
| `map_id` | string | 所属地图 |
| `type` | string | 地点类别，中文枚举 |
| `description` | string | 地点描述 |
| `prompt` | string | icon 生成 prompt |
| `icon_path` | string | 已部署 icon 文件路径 |
| `backdrop_prompt` | string | backdrop 生成 prompt |
| `backdrop_variants` | array | backdrop 文案变体 |
| `icon_variants` | array | icon 文案变体 |
| `backdrop_path` | string | 已部署 backdrop 文件路径 |
| `position` | object | 地图坐标 |
| `scene_ids` | string[] | 关联运行时 scene 列表 |
| `unlock_conditions` | object | 解锁条件 |

map 级别还存在：

| 字段 | 类型 | 说明 |
|---|---|---|
| `terrain.prompt` | string | 地图底图 prompt |
| `terrain.icon_path` | string | 地图底图素材路径 |

### 2.3.3 运行时 scene 文件

目录：`src/renderer/data/configs/scenes/`

运行时 scene 字段集合：

| 字段 | 类型 | 说明 |
|---|---|---|
| `scene_id` | string | scene ID |
| `name` | string | scene 名称 |
| `description` | string | scene 描述 |
| `background_image` | string | 背景图 |
| `type` | string | `event / challenge / shop` |
| `duration` | number | 持续回合 |
| `slots` | array | 投入卡槽 |
| `entry_stage` | string | 初始 stage |
| `stages` | array | stage 流程 |
| `unlock_conditions` | object | 解锁条件 |
| `absence_penalty` | object/null | 缺席惩罚 |

### 2.3.4 字段对比

| `location_profiles.json` 地点字段 | `configs/scenes/*.json` 对应字段 | 是否同构 | 说明 |
|---|---|---|---|
| `id` | `scene_id` | 否 | 都是 ID，但实体不同：location vs gameplay scene |
| `name` | `name` | 部分 | 都有名字，但对象不是同一类内容 |
| `description` | `description` | 部分 | 都是描述，但语义不同 |
| `type` | `type` | 否 | 工作区是中文地点分类；运行时是 `event/shop/challenge` |
| `map_id` | 无 | 否 | scene 文件没有地图归属 |
| `position` | 无 | 否 | scene 文件没有地图坐标 |
| `scene_ids` | 无 | 否 | 它自己就是 scene，不会再引用 scene_ids |
| `icon_path` | 无 | 否 | scene 文件不存 icon 发布路径 |
| `backdrop_path` | `background_image` | 否 | 一个是后台文件路径，一个是运行时 URL |
| `prompt` | 无 | 否 | 工作区管理字段 |
| `backdrop_prompt` | 无 | 否 | 工作区管理字段 |
| `icon_variants` | 无 | 否 | 工作区管理字段 |
| `backdrop_variants` | 无 | 否 | 工作区管理字段 |
| `unlock_conditions` | `unlock_conditions` | 部分 | 字段名相同，但语义上下文不同 |
| 无 | `duration` | 否 | 运行时 scene 专有 |
| 无 | `slots` | 否 | 运行时 scene 专有 |
| 无 | `entry_stage` | 否 | 运行时 scene 专有 |
| 无 | `stages` | 否 | 运行时 scene 专有 |
| 无 | `absence_penalty` | 否 | 运行时 scene 专有 |

### 2.3.5 结论

这里不是“字段多几个少几个”的问题，而是：

- `location_profiles.json` 管的是 **地图地点**
- `configs/scenes/*.json` 管的是 **事件/关卡流程**

因此如果目标是“工作区和运行时 schema 完全一致”，那么：

- `location_profiles.json` 不应该去对齐 `configs/scenes/*.json`
- 它应该对齐的是 **`configs/maps/*.json` 里的 `locations[]`**

这也是地图已经成功单一事实源，而 scene 仍然是另一套系统的根本原因。

---

## 2.4 地点：`location_profiles.json` vs `configs/maps/*.json`

由于上面发现概念不对应，这里必须补一张真正有意义的对比表。

### 2.4.1 运行时 map 文件

文件：`src/renderer/data/configs/maps/map_001_beiliang.json`

运行时地图字段：

| 层级 | 字段 | 说明 |
|---|---|---|
| map | `map_id` | 运行时地图 ID |
| map | `name` | 地图名称 |
| map | `description` | 地图描述 |
| map | `background_image` | 地图底图 URL |
| map | `locations` | 地点列表 |

运行时 location 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `location_id` | string | 地点 ID |
| `name` | string | 地点名称 |
| `icon_image` | string | icon URL |
| `backdrop_image` | string | backdrop URL |
| `position` | object | 坐标 |
| `scene_ids` | string[] | 关联 runtime scene |
| `unlock_conditions` | object | 解锁条件 |

### 2.4.2 字段对比

| 工作区字段 | 运行时字段 | 是否同名 | 差异说明 |
|---|---|---|---|
| `maps[map_id]` | 单个 map JSON 文件 | 否 | 一个文件中存多个 map，一个 map 一个文件 |
| 工作区 map key `map_001` | `map_id: map_001_beiliang` | 否 | 通过 manifest 做 ID 映射 |
| `name` | `name` | 是/近似 | 工作区 map 名称与 manifest 名称共同决定 |
| `terrain.icon_path` | `background_image` | 否 | 文件路径转 URL |
| `scenes[]` | `locations[]` | 否 | 命名不一致，但实体接近 |
| `id` | `location_id` | 否 | 同义重命名 |
| `name` | `name` | 是 | 一致 |
| `position` | `position` | 是 | 一致 |
| `scene_ids` | `scene_ids` | 是 | 一致 |
| `unlock_conditions` | `unlock_conditions` | 是 | 一致 |
| `icon_path` | `icon_image` | 否 | 文件路径转 URL |
| `backdrop_path` | `backdrop_image` | 否 | 文件路径转 URL |
| `map_id` | 无 | 否 | 运行时 location 不重复存 map_id |
| `type` | 无 | 否 | 地点类别在运行时 map 不消费 |
| `description` | 无 | 否 | 地点描述在运行时 map 不消费 |
| `prompt` | 无 | 否 | 工作区管理字段 |
| `backdrop_prompt` | 无 | 否 | 工作区管理字段 |
| `icon_variants` | 无 | 否 | 工作区管理字段 |
| `backdrop_variants` | 无 | 否 | 工作区管理字段 |

### 2.4.3 结论

地图是“**概念基本一致，但存在命名、拆文件和路径层面的转换**”。

这正是现阶段最接近目标架构的一部分。

---

## 3. `main.py` 中 deploy / 同步逻辑分析

核心文件：`tools/asset-manager/backend/main.py`

## 3.1 角色 deploy：`/api/characters/{character_name}/deploy`

当前流程：

1. 从 `scripts/character_profiles.json` 读角色 profile
2. 通过 `_get_game_file()` / `_next_figure_id()` 决定运行时立绘文件名 `figureNN`
3. 若存在 `selected_portrait`，复制到：
   - `src/renderer/assets/portraits/{figureNN}.png`
   - `public/portraits/{figureNN}.png`
4. 构造运行时卡牌对象 `card_entry`
5. upsert 到 `src/renderer/data/configs/cards/characters.json`
6. 清理 profile 中的 `selected_portrait`

### 角色 deploy 的结构转换点

| 转换点 | 当前做法 |
|---|---|
| 顶层对象 key → 数组元素 | `character_name` 变成 `name` 字段 |
| 自动补 `card_id` | 生成 `card_{character_name}`，更新时尽量保留旧值 |
| 自动补 `type` | 强制写 `character` |
| 自动补 `image` | `/assets/portraits/{figureNN}.png` |
| 图像命名转换 | 角色名不直接作为图片名，而转成 `figureNN` |
| 工作区状态字段清理 | `selected_portrait` deploy 后删除 |

## 3.2 物品 deploy：`/api/items/{item_name}/deploy`

当前流程：

1. 从 `scripts/item_profiles.json` 读取 profile
2. 若存在 `selected_image`，复制到：
   - `src/renderer/assets/items/{原文件名}`
   - `public/items/{原文件名}`
3. 构造运行时卡牌对象 `card_entry`
4. upsert 到 `src/renderer/data/configs/cards/equipment.json`
5. 清理 `selected_image`

### 物品 deploy 的结构转换点

| 转换点 | 当前做法 |
|---|---|
| 顶层对象 key → 数组元素 | `item_name` 变成 `name` 字段 |
| `card_type` → `type` | deploy 时硬编码成 `equipment`，并不读取 `card_type` |
| 自动补 `card_id` | `_item_to_card_id()` 生成 |
| 自动补 `image` | `/assets/items/{filename}` |
| 丢弃字段 | `lore` 不写入运行时 |
| 工作区状态字段清理 | `selected_image` deploy 后删除 |

## 3.3 地图 / 地点 deploy：`/api/scenes/{scene_id}/deploy`

这里的接口名叫 scene，但实际部署的是 **location icon/backdrop**。

### icon deploy

1. 读取 `location_profiles.json`
2. 找到某个 location（字段叫 `scene`，实际是 location）
3. 复制已选 icon 到 `tools/asset-manager/backend/maps/{map_id}/`
4. 更新工作区的 `icon_path`
5. 复制到 `public/maps/{subdir}/{scene_id}.png`
6. 更新运行时 `configs/maps/{map}.json` 里的 `icon_image`

### backdrop deploy

1. 读取 `location_profiles.json`
2. 复制 backdrop 到 `tools/asset-manager/backend/maps/{map_id}/{scene_id}_backdrop.png`
3. 更新工作区 `backdrop_path`
4. 复制到 `public/maps/{map_id}/`
5. 更新运行时 `configs/maps/{map}.json` 里的 `backdrop_image`

### 地图 / 地点转换点

| 转换点 | 当前做法 |
|---|---|
| `id` → `location_id` | 运行时 map JSON 中改名 |
| `icon_path` → `icon_image` | 文件路径变成运行时 URL |
| `backdrop_path` → `backdrop_image` | 文件路径变成运行时 URL |
| map key → runtime map file | 通过 `_ASSET_MAP_TO_GAME_FILE` / manifest 映射 |
| scene 列表 → locations 列表 | 工作区叫 `scenes`，运行时叫 `locations` |

## 3.4 其他同步逻辑

除了 deploy，本文件还在多个写操作中直接同步运行时 map JSON：

- `PUT /api/scenes/{scene_id}`
  - 改 `name / position / scene_ids / unlock_conditions` 时同步到 `configs/maps/*.json`
- `POST /api/maps/{map_id}/locations`
  - 同时写工作区和运行时 map JSON
- `DELETE /api/scenes/{scene_id}`
  - 同时删工作区和运行时 map JSON

这意味着地图部分其实已经在“趋向单一事实源”，但仍未彻底完成，因为：

- 仍然存在两份结构不完全相同的数据
- 仍然要做字段转换和路径转换

---

## 4. 所有格式转换点汇总

## 4.1 数据结构转换

| 来源 | 目标 | 转换内容 |
|---|---|---|
| `character_profiles.json` | `cards/characters.json` | 对象 map → 数组；补 `card_id/type/image/name` |
| `item_profiles.json` | `cards/equipment.json` | 对象 map → 数组；`card_type` → `type`；补 `card_id/image/name`；丢弃 `lore` |
| `location_profiles.json` | `configs/maps/*.json` | `maps` 集合 → 单 map 文件；`scenes` → `locations`；`id` → `location_id`；路径字段转 URL |

## 4.2 文件名 / 路径转换

| 类型 | 当前转换 |
|---|---|
| 角色立绘 | 角色名不会成为最终图片名，而是映射到 `figureNN.png` |
| 地图 ID | `map_001` 通过 manifest 变为 `map_001_beiliang.json` |
| 地图 icon URL | `tools/asset-manager/backend/maps/...` 转 `/maps/...` |
| 地图 backdrop URL | `backdrop_path` 转 `/maps/...` |

## 4.3 工作流状态字段清理

| 字段 | 位置 | 行为 |
|---|---|---|
| `selected_portrait` | 角色 profile | deploy 后删除 |
| `selected_image` | 物品 profile | deploy 后删除 |
| `selected_icon` | 地点 | deploy 后删除 |
| `selected_backdrop` | 地点 | deploy 后删除 |

这些字段本质上属于**工作区中间态**，不应该混入运行时主数据。

---

## 5. 地图为何已接近“成功案例”

## 5.1 成功点

地图相对成功，体现在以下方面：

1. **运行时按单文件加载**
   - `src/renderer/data/loader.ts` 通过 `./configs/maps/*.json` 动态读取
   - 一个 map 一个文件，易于扩展

2. **运行时有独立 schema**
   - `MapSchema` / `LocationConfigSchema` 已稳定

3. **工作区的 location 已能驱动运行时 map**
   - `scripts/export-runtime-map-data.py` 从 `location_profiles.json` 生成 runtime map
   - `main.py` 的 location 编辑接口也会同步 runtime map JSON

4. **运行时真正只消费 map JSON**
   - UI 层通过 `dataLoader.getMap()` 使用 `configs/maps/*.json`

## 5.2 还没有完全成功的地方

地图仍不算最终形态，因为还有三类转换：

1. **文件拆分不同**
   - 工作区：一个 `location_profiles.json` 里放全部地图
   - 运行时：每个地图一个 `map_*.json`

2. **schema 不同**
   - 工作区：`id/icon_path/backdrop_path/scenes`
   - 运行时：`location_id/icon_image/backdrop_image/locations`

3. **命名映射仍存在**
   - `map_001` ↔ `map_001_beiliang`
   - `scene` ↔ `location`

## 5.3 地图模式能否复制到角色和物品

可以复制，但要复制的是**原则**，不是复制现有 `location_profiles.json` 这套命名。

应复制的原则：

1. **运行时按目录自动加载**
2. **一个逻辑分片一个 JSON 文件**
3. **工作区与运行时文件同名同结构**
4. **发布只做筛选与复制**

不应复制的部分：

1. `scenes` 这个错误命名
2. `id/location_id`、`icon_path/icon_image` 这种双命名
3. 一份大 JSON 再导出成多个 runtime JSON 的模式

结论：**地图的目录加载模式可复用，但当前 map 数据本身也仍需再对齐一次。**

---

## 6. 统一方案设计

## 6.1 总体原则

建议把“工作区数据”和“运行时数据”统一成：

- **相同文件名**
- **相同文件拆分**
- **相同核心字段**
- 工作区只允许增加一个统一的管理字段容器，例如 `meta`
- deploy 只根据 `meta.publish_status` 过滤，并复制文件与资源

也就是：

- 运行时 schema = 工作区 schema 去掉管理字段
- 或者运行时 loader 直接忽略 `meta`

推荐后者：**运行时兼容 `meta`，但只读取核心字段**

这样 deploy 就不再需要“删字段/改字段名/重组数组”。

---

## 6.2 文件命名方案

### 结论

统一使用**运行时命名**，不要继续沿用 `*_profiles.json`。

推荐目录与文件名：

### 工作区

```text
scripts/data/
  cards/
    characters.json
    equipment.json
    special.json
  maps/
    map_001_beiliang.json
  scenes/
    scene_001.json
    scene_002.json
    ...
```

### 运行时

```text
src/renderer/data/configs/
  cards/
    characters.json
    equipment.json
    special.json
  maps/
    map_001_beiliang.json
  scenes/
    scene_001.json
    scene_002.json
    ...
```

### 为什么不用 `character_profiles.json`

因为目标是“文件名、文件划分完全相同，只是目录不同”。

若继续保留 `*_profiles.json`：

- 工作区叫 profile
- 运行时叫 cards/configs

这会天然保留“双轨命名”，后续仍会诱发转换。

因此建议直接以**运行时文件名为标准命名**，让工作区去对齐运行时，而不是相反。

---

## 6.3 文件划分方案

## 6.3.1 角色与物品

角色和物品继续保持当前运行时划分即可：

- `cards/characters.json`
- `cards/equipment.json`
- `cards/special.json`

原因：

1. 运行时 loader 已支持 `cards/*.json` 聚合
2. 当前项目规模下，一个类型一个文件足够
3. 与用户提出的“文件名与划分完全相同”目标最贴近

不建议此阶段再细拆成“一个角色一个文件”或“一个物品一个文件”，因为这不是当前问题的关键，且会引入额外迁移成本。

## 6.3.2 地图与 scene

建议明确拆成两类：

- `maps/*.json`：地图 + 地点/location
- `scenes/*.json`：事件/挑战/商店 scene

也就是说：

- 原 `location_profiles.json` 迁移为若干 `maps/map_*.json`
- 不再把地图地点叫做 `scenes`

这是整个对齐方案里最关键的一步。

---

## 6.4 统一 schema 设计

## 6.4.1 角色卡 schema

建议工作区与运行时统一使用以下核心结构：

| 字段 | 是否运行时需要 | 说明 |
|---|---|---|
| `card_id` | 是 | 稳定唯一 ID |
| `name` | 是 | 名称 |
| `type` | 是 | `character` |
| `rarity` | 是 | 稀有度 |
| `description` | 是 | 描述 |
| `image` | 是 | 已发布资源 URL |
| `attributes` | 是 | 八维属性 |
| `special_attributes` | 是 | 特殊属性 |
| `tags` | 是 | 标签 |
| `equipment_slots` | 是 | 装备槽 |
| `meta` | 否（运行时可忽略） | 工作区管理字段 |

推荐 `meta` 内容：

| 字段 | 说明 |
|---|---|
| `publish_status` | `draft / ready / published / archived` |
| `selected_asset` | 当前选中的样图路径 |
| `asset_candidates` | 候选图片列表 |
| `workshop_variants` | 文案/提示词变体 |
| `updated_at` | 更新时间 |

这样：

- 核心结构与运行时完全一致
- 管理字段统一收口在 `meta`
- 不再把 `selected_portrait` 直接挂在根字段

## 6.4.2 物品卡 schema

建议统一成：

| 字段 | 是否运行时需要 | 说明 |
|---|---|---|
| `card_id` | 是 | 稳定唯一 ID |
| `name` | 是 | 名称 |
| `type` | 是 | `equipment` |
| `rarity` | 是 | 稀有度 |
| `description` | 是 | 游戏内描述 |
| `image` | 是 | 已发布资源 URL |
| `equipment_type` | 是 | 装备类型 |
| `attribute_bonus` | 是 | 属性加成 |
| `special_bonus` | 是 | 特殊加成 |
| `gem_slots` | 是 | 宝石槽 |
| `tags` | 是 | 标签 |
| `lore` | 建议是 | 可保留到运行时 schema，即使暂时不用 |
| `meta` | 否（运行时可忽略） | 工作区管理字段 |

关键建议：

- 不再使用 `card_type`
- 统一只保留 `type`
- `lore` 不必再丢弃，可直接成为统一 schema 一部分

即使当前运行时不用 `lore`，保留也不妨碍 loader，只需 schema 放宽即可。

## 6.4.3 地图 / 地点 schema

建议直接以当前 runtime `MapSchema` 为骨架，把工作区统一过去。

### 统一后的 map 文件

```text
{
  "map_id": "map_001_beiliang",
  "name": "北凉道",
  "description": "清凉山到葫芦口一线，铁血家国之地",
  "background_image": "/maps/beiliang/terrain_bg.png",
  "locations": [
    {
      "location_id": "location_001",
      "name": "清凉山王府",
      "icon_image": "/maps/beiliang/location_001.png",
      "backdrop_image": "/maps/map_001_beiliang/location_001_backdrop.png",
      "position": { "x": 0.62, "y": 0.55 },
      "scene_ids": ["scene_006", "scene_001"],
      "unlock_conditions": {},
      "meta": {
        "type": "hub",
        "description": "...",
        "icon_prompt": "...",
        "backdrop_prompt": "...",
        "icon_variants": [],
        "backdrop_variants": [],
        "selected_icon": "...",
        "selected_backdrop": "...",
        "publish_status": "published"
      }
    }
  ],
  "meta": {
    "terrain_prompt": "...",
    "terrain_asset_path": "...",
    "publish_status": "published"
  }
}
```

关键点：

- 统一使用 `locations`，不再使用 `scenes`
- 统一使用 `location_id`，不再使用 `id`
- 统一使用 `icon_image/backdrop_image`，不再使用 `icon_path/backdrop_path`
- 地点分类、提示词、变体、选中草稿等管理字段全部进入 `meta`

## 6.4.4 runtime scene schema

`configs/scenes/*.json` 本身已经是 runtime scene 定义，应保持独立，不与 location 混用。

如果后续也要接入素材管理器，则建议新增一个**真正对应 runtime scene 的工作区目录**：

```text
scripts/data/scenes/scene_001.json
```

而不是继续把 location 误称为 scene。

---

## 6.5 工作区额外管理字段如何处理

## 6.5.1 统一原则

所有工作区额外信息都放进 `meta`，不散落在根字段。

### 推荐管理字段容器

| 统一字段 | 作用 |
|---|---|
| `meta.publish_status` | 控制是否发布 |
| `meta.selected_asset` / `meta.selected_icon` / `meta.selected_backdrop` | 当前选中的草稿资源 |
| `meta.asset_candidates` | 候选图片 |
| `meta.workshop_variants` | 文案/提示词候选 |
| `meta.last_generated_at` | 最近生成时间 |
| `meta.editor_notes` | 备注 |

## 6.5.2 为什么不用继续把这些字段放在根对象

如果继续把 `selected_image`、`selected_portrait`、`icon_variants`、`backdrop_variants` 混在根字段：

- 工作区 schema 和运行时 schema 永远看起来不同
- deploy 就总会有“删根字段”的冲动
- 后续任何新管理字段都会继续扩散

把管理字段集中到 `meta` 后：

- 统一 schema 更清晰
- runtime loader 可以显式忽略 `meta`
- deploy 只需要过滤 `publish_status`

---

## 6.6 Deploy 流程如何简化

## 6.6.1 目标流程

deploy 应只做两件事：

1. **过滤**
   - 只复制 `meta.publish_status in ['ready', 'published']` 且资源完整的条目
2. **复制**
   - JSON 原样复制
   - 资源文件按既定路径复制

不再做：

- 字段重命名
- 容器重组
- map_id 映射
- 类型字段硬编码
- card_id 临时生成

## 6.6.2 对角色和物品的要求

要实现 deploy 只复制，角色和物品必须在工作区内就已经具备：

- `card_id`
- `type`
- `image`

也就是说，**“选中某张图”是工作区中间态，但“最终发布图路径”必须预先写回统一数据文件。**

推荐做法：

- 编辑时：
  - `meta.selected_asset` 指向样图
- 点击“设为发布版本”时：
  - 把正式发布目标路径写入 `image`
  - 同时保留 `meta.selected_asset`
- deploy 时：
  - 复制 `image` 指向的资源到运行时资源目录
  - 复制 JSON 文件本身

## 6.6.3 对地图的要求

地图也同理：

- 工作区 map JSON 内直接使用运行时字段：
  - `background_image`
  - `locations[].icon_image`
  - `locations[].backdrop_image`
- `meta.selected_*` 只是草稿态，不参与运行时消费

这样 deploy 不再需要：

- `icon_path -> icon_image`
- `backdrop_path -> backdrop_image`
- `id -> location_id`
- `scenes -> locations`

---

## 6.7 游戏 loader 需要做什么适配

## 6.7.1 最小适配

角色与物品：

- `data/loader.ts` 目前已支持从 `cards/*.json` 聚合加载
- 若工作区文件完全对齐，只需继续沿用现有 runtime loader，不需大改

地图：

- `MapSchema` / `LocationConfigSchema` 增加可选 `meta`
- loader 忽略 `meta`

scene：

- `SceneSchema` 若后续也进入统一工作区，可同样增加可选 `meta`

## 6.7.2 schema 层建议

建议在 zod schema 中统一允许：

- `meta: z.record(z.string(), z.unknown()).optional()`

好处：

- 运行时对工作区附加字段天然兼容
- 无需在 deploy 时剥离字段

---

## 6.8 素材管理器后端需要改什么

## 6.8.1 数据读写路径

后端应从：

- `scripts/character_profiles.json`
- `scripts/item_profiles.json`
- `scripts/location_profiles.json`

迁移到：

- `scripts/data/cards/characters.json`
- `scripts/data/cards/equipment.json`
- `scripts/data/maps/map_*.json`
- 后续可选：`scripts/data/scenes/scene_*.json`

## 6.8.2 后端接口语义

建议区分两类对象：

1. **cards**
   - 角色 / 物品
2. **locations**
   - 地图地点
3. **scenes**
   - 真正 runtime scene

不要继续用 scene 接口操作 location。

例如：

- `/api/locations/{location_id}`
- `/api/maps/{map_id}/locations`

优于当前的：

- `/api/scenes/{scene_id}`

## 6.8.3 deploy 逻辑

后端 deploy 应改成：

- 扫描工作区目录
- 过滤可发布条目
- 复制 JSON 到运行时目录
- 复制资源文件到运行时资源目录

而不是当前的“读 profile 再重组 card_entry”模式。

---

## 7. 中间态与发布态如何共存

这是方案里必须回答的问题：**description 没写完、图片未选定时，不能进入游戏。**

## 7.1 建议使用发布状态机

推荐字段：

| 状态 | 含义 |
|---|---|
| `draft` | 草稿，绝不发布 |
| `ready` | 已达到发布最低条件，可发布 |
| `published` | 已发布版本 |
| `archived` | 下线但保留 |

字段位置：

- `meta.publish_status`

## 7.2 发布校验

deploy 前做完整性检查：

### 角色

- `card_id` 非空
- `name` 非空
- `type === 'character'`
- `image` 非空
- `description` 非空
- `attributes` 完整

### 物品

- `card_id` 非空
- `type === 'equipment'`
- `image` 非空
- `equipment_type` 非空

### 地点

- `location_id` 非空
- `icon_image` 非空
- `position` 完整
- 若需要 backdrop，则 `backdrop_image` 非空

### scene

- `scene_id`
- `type`
- `duration`
- `slots`
- `stages`

## 7.3 为什么不能靠 deploy 时“转换 + 补默认值”

因为这会把“未完成内容”伪装成“可运行内容”。

例如：

- 没选图时生成空 `image`
- 没写卡 ID 时 deploy 自动补

这会让工作区始终不是最终真相，仍然依赖 deploy 修补数据。

---

## 8. 推荐的统一目录结构

## 8.1 工作区

```text
scripts/data/
  cards/
    characters.json
    equipment.json
    special.json
  maps/
    map_001_beiliang.json
  scenes/
    scene_001.json
    scene_002.json
    scene_003.json
    scene_004.json
    scene_006.json
    scene_007.json
    scene_shop_001.json
```

## 8.2 运行时

```text
src/renderer/data/configs/
  cards/
    characters.json
    equipment.json
    special.json
  maps/
    map_001_beiliang.json
  scenes/
    scene_001.json
    scene_002.json
    scene_003.json
    scene_004.json
    scene_006.json
    scene_007.json
    scene_shop_001.json
```

## 8.3 资源目录

保持目录不同，但路径规则固定：

### 工作区资源

```text
tools/asset-manager/backend/workspace-assets/
  portraits/
  items/
  maps/
```

### 运行时资源

```text
src/renderer/assets/
  portraits/
  items/
public/
  maps/
```

重点不是两边目录相同，而是**数据文件里引用的最终发布路径规则固定**。

---

## 9. 分阶段实施步骤

## Phase 1：命名与模型澄清

目标：先把错误概念纠正，不改大逻辑。

需要做的事：

1. 明确文档和代码中：
   - location ≠ runtime scene
2. 后端接口命名从 scene/location 混用改为清晰语义
3. 在设计层面冻结目标目录结构：
   - `scripts/data/cards`
   - `scripts/data/maps`
   - `scripts/data/scenes`

产出：

- 架构文档
- 命名规范

## Phase 2：角色与物品 schema 对齐

目标：让 cards 工作区文件与 runtime cards 文件同构。

需要做的事：

1. 工作区角色文件改为 `scripts/data/cards/characters.json`
2. 工作区物品文件改为 `scripts/data/cards/equipment.json`
3. 顶层改为数组，与 runtime 一致
4. 统一保留：
   - `card_id`
   - `name`
   - `type`
   - `image`
5. 管理字段移动到 `meta`
6. `lore` 纳入统一 schema

产出：

- 角色、物品不再需要 deploy 时重组对象

## Phase 3：地图文件彻底对齐

目标：让工作区 map 文件与 runtime map 文件同构。

需要做的事：

1. 把 `location_profiles.json` 拆成 `scripts/data/maps/map_*.json`
2. `scenes` 改名为 `locations`
3. `id` 改 `location_id`
4. `icon_path/backdrop_path` 改为 `icon_image/backdrop_image`
5. 管理字段放进 `meta`
6. 删除 map manifest 对结构层的影响，仅保留资源目录配置用途

产出：

- map deploy 只需复制 JSON 与图片

## Phase 4：deploy 简化为过滤复制

目标：完全取消结构转换。

需要做的事：

1. 后端 deploy 读取工作区统一目录
2. 只筛选 `meta.publish_status` 为可发布的条目
3. 原样复制 JSON 文件到 runtime
4. 复制引用到的资源文件
5. 删除旧的 profile-to-config 转换逻辑

产出：

- deploy 变成可预期、可审计的发布步骤

## Phase 5：scene 工作区接入（可选）

目标：如果需要，也让 runtime `scenes/*.json` 有对称工作区。

需要做的事：

1. 新增 `scripts/data/scenes/*.json`
2. 允许 `SceneSchema` 包含 `meta`
3. 若有 scene 编辑器，则直接编辑该目录

产出：

- cards / maps / scenes 三套数据都实现双目录同构

---

## 10. 风险点

## 10.1 `card_id` 稳定性风险

当前角色和物品 deploy 都会在一定程度上“自动生成或保留 card_id”。

一旦迁移到统一 schema，必须提前确定：

- `card_id` 是否作为长期稳定主键
- 是否允许根据名称重新生成

建议：

- 迁移阶段固化已有 `card_id`
- 后续新增内容创建时立即分配，不在 deploy 时生成

## 10.2 图片路径迁移风险

当前角色图片使用 `figureNN.png`，而物品直接使用原文件名。

如果统一 schema 强调 `image` 为最终发布路径，需要决定：

- 角色是否继续保留 `figureNN` 命名
- 还是改为与内容 ID 对应

建议：

- 短期保留既有命名，避免资源大迁移
- 但把这个命名在工作区里显式写进 `image`

## 10.3 地图 ID 映射风险

现在存在：

- 工作区 `map_001`
- 运行时 `map_001_beiliang`

这会导致“同一个 map 两套 ID”。

建议：

- 统一以运行时 ID 为准：`map_001_beiliang`
- 不再保留结构层的 manifest 映射

## 10.4 前端编辑器适配成本

素材管理器前端当前大量依赖：

- `selected_portrait`
- `selected_image`
- `icon_variants`
- `backdrop_variants`
- `has_pending_*`

这些逻辑迁移到 `meta` 后，需要同步改前端类型与接口。

但这是一次性成本，收益是长期结构清晰。

## 10.5 runtime schema 放宽的边界

若让 runtime schema 允许 `meta`，需要注意：

- 不要在 gameplay 逻辑里误用 `meta`
- loader / selectors 要只读核心字段

建议：

- 明确把 `meta` 视为“非运行时逻辑字段”
- gameplay 层不依赖它

---

## 11. 最终建议

## 11.1 推荐决策

1. **统一采用运行时命名**
   - 用 `characters.json / equipment.json / map_*.json / scene_*.json`
   - 不再新增 `*_profiles.json`

2. **统一采用运行时文件划分**
   - cards 按类型分文件
   - maps 一个地图一个文件
   - scenes 一个 scene 一个文件

3. **工作区与运行时共享同一核心 schema**
   - 工作区扩展字段统一收口到 `meta`

4. **地图地点与 gameplay scene 彻底分离命名**
   - location 归 `maps/*.json`
   - scene 归 `scenes/*.json`

5. **deploy 简化为过滤 + 复制**
   - 不再做字段重命名、结构转换、ID 映射生成

## 11.2 回答问题清单

### 文件应该怎么命名？

统一用运行时名字：

- `characters.json`
- `equipment.json`
- `special.json`
- `map_001_beiliang.json`
- `scene_001.json`

不建议继续用 `character_profiles.json` / `item_profiles.json` / `location_profiles.json`。

### 文件划分应该怎么统一？

- 角色：一个文件 `cards/characters.json`
- 物品：一个文件 `cards/equipment.json`
- 特殊卡：一个文件 `cards/special.json`
- 地图：一个 map 一个 `maps/map_*.json`
- scene：一个 scene 一个 `scenes/scene_*.json`

### 工作区额外管理字段如何处理？

统一放在 `meta`：

- `meta.publish_status`
- `meta.selected_*`
- `meta.*_variants`
- `meta.asset_candidates`
- `meta.editor_notes`

### deploy 流程怎么简化？

- 校验可发布条目
- 过滤 `publish_status`
- 原样复制 JSON
- 复制 JSON 引用的资源文件

### 游戏 loader 需要做什么适配？

- schema 增加可选 `meta`
- loader 忽略 `meta`
- 其他逻辑基本不变

### 素材管理器后端需要改什么？

- 改读写目录
- 停止 profile → runtime 的结构重组
- 用 `meta` 表达工作区中间态
- 把 location 与 scene 接口语义拆清楚

---

## 12. 一句话总结

当前真正的问题不是“几个字段没对上”，而是：

- 角色/物品存在 profile 与 runtime card 双结构
- 地图地点与 runtime scene 混淆了实体模型

正确的对齐方向是：

**以运行时目录与 schema 为标准，把工作区升级为同构数据源；工作区额外状态统一进入 `meta`；deploy 退化为过滤复制。**
