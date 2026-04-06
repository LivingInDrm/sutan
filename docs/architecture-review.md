# Sutan 项目架构审视报告

更新时间：2026-04-06

---

## 1. 当前架构概览

### 1.1 项目分层现状

当前仓库大致可以分为 4 个子系统：

1. **游戏运行时前端**：`src/renderer/`
   - React + Zustand + TypeScript
   - `core/` 承载游戏规则、状态机、结算逻辑
   - `ui/` 承载地图、地点、场景、结算等界面
   - `data/` 承载卡牌、场景、地图 JSON 配置与 Zod schema

2. **桌面壳层**：`src/main/`
   - Electron 主进程入口仍是 JS 文件
   - 与 `package.json` / `docs/dev/architecture.md` 描述存在漂移

3. **素材管理器**：`tools/asset-manager/`
   - 后端为单文件 FastAPI：`backend/main.py`
   - 前端为 React + Vite：`frontend/src/App.tsx` 为主入口
   - 负责人物、物品、地点 icon/backdrop 生成与部署

4. **文档与设计资产**：`docs/`、根目录分析文档、`scripts/*.json`
   - 设计文档较多
   - 但存在“设计已变更、文档未跟进”的明显问题

---

### 1.2 游戏运行时的主要数据流

当前主数据流为：

`TitleScreen -> gameStore.startNewGame -> GameManager -> DayManager / SceneManager / SettlementExecutor -> gameStore.syncState -> UI`

核心特点：

- **游戏核心逻辑主要集中在类对象中**
  - `GameManager`
  - `DayManager`
  - `SceneManager`
  - `SettlementExecutor`
- **Zustand store 既是 UI 状态容器，也是编排器**
  - `gameStore.ts` 负责串联“剧情播放、结算、推进日程、同步 UI”
- **数据主要由 JSON 驱动**
  - 卡牌：`src/renderer/data/configs/cards/base_cards.json`
  - 场景：`src/renderer/data/configs/scenes/*.json`
  - 地图：`src/renderer/data/configs/maps/map_001_beiliang.json`

这是一个“**配置驱动 + 命令式编排**”的架构。优点是原型迭代快；缺点是随着内容量和工具链变大，容易产生：

- 配置契约漂移
- store 过重
- UI 与 domain 互相渗透
- 运行时数据与素材管理数据脱节

---

### 1.3 目录结构与职责评价

#### `src/renderer/`

优点：

- `core / data / ui / stores` 的一级分层方向是对的
- 结算、场景、卡牌等领域已经有基础边界
- `schemas/` 的引入说明项目开始关注运行时数据校验

问题：

- “按技术层分目录”已经出现跨层耦合回流
- `gameStore.ts` 381 行，承载了过多流程编排
- `SceneScreen.tsx` 同时处理资源解析、规则约束、UI 交互
- map/location/scene 三层概念还没有统一成一个稳定的领域模型

#### `tools/asset-manager/`

优点：

- 工具已经能覆盖人物、物品、地点的生成与部署
- 已经开始显式处理 `location_profiles.json -> game map json` 的同步链路

问题：

- 后端 `backend/main.py` 超过 3000 行，已成为典型单体脚本
- 前端 `frontend/src/App.tsx` 超过 500 行，组件化不彻底
- 工具内部仍混用 scene/location 命名
- 部署逻辑编码了多套路径映射规则，且缺少统一契约层

#### `docs/`

优点：

- 文档数量多，说明团队在持续沉淀

问题：

- 文档存在明显过期
- 设计文档、实际代码、资产工具数据结构三者没有形成单一事实源
- 一些历史名词已变更，但文档仍保留旧表述，容易误导后续开发

---

### 1.4 当前最值得肯定的架构基础

尽管技术债不少，但项目并不是“不可收拾”的状态，以下基础值得保留：

1. **场景配置驱动的游戏内容框架已经成型**
   - `Scene -> Stage -> Narrative -> Settlement -> Branch`
2. **核心规则层基本从 React 中抽离**
   - 核心规则大多仍在 `core/`
3. **Zod 校验已部分引入**
   - 说明项目具备向“强契约数据架构”演进的条件
4. **地图 UI、地点 UI、场景 UI 已建立稳定信息层级**
   - WorldMap -> Location -> Scene 的可用性已具雏形
5. **素材管理器已经覆盖实际生产流程**
   - 这为“统一数据源”提供了现实抓手

---

## 2. 发现的问题清单

以下按优先级分为 P0 / P1 / P2。

---

## 3. P0 问题：不改会持续反复踩坑

### P0-1 路径体系仍然分裂，静态资源规则没有被收敛成单一约定

**现象**

- Vite root 是 `src/renderer`，public 目录也在 `src/renderer/public/`
- 但仓库根目录仍保留了 `public/`
- 运行时同时存在：
  - `src/renderer/assets/`
  - `src/renderer/public/maps/`
  - `public/maps/`
- `SceneScreen.tsx` 里既支持 `import.meta.glob('../../assets/scenes/*')`，又对以 `/` 开头的路径直接放行
- 资产工具部署时又额外写入 `src/renderer/public/maps/...`

**影响**

- 这是路径坑反复出现的根源
- 同一个资源到底应放在 `assets`、`src/renderer/public` 还是根 `public`，当前没有唯一答案
- 未来继续加地图、地点、人物、scene backdrop 时，很容易再次出现“本地可用、构建后失效”或“工具部署到了 A，运行时读的是 B”的问题

**证据**

- `vite.config.ts` 指定 `root: 'src/renderer'`
- `src/renderer/ui/screens/SceneScreen.tsx` 同时处理绝对路径和打包资源
- `tools/asset-manager/backend/main.py` 中显式写明“Vite root is src/renderer, so public assets are served from src/renderer/public/”
- 仓库内仍存在根目录 `public/maps/...`

**建议**

1. 制定一条强制规则，并写进文档与脚本：
   - **运行时可热部署资源统一进入 `src/renderer/public/`**
   - **编译时打包资源统一进入 `src/renderer/assets/`**
2. 明确禁止继续向根目录 `public/` 写运行时资源
3. 增加一个统一的资源 URL 解析层，例如：
   - `src/renderer/lib/assetPaths.ts`
   - 统一处理 `portrait / scene background / map icon / backdrop`
4. 对资产工具增加部署后校验：
   - 文件是否存在
   - map JSON 中 URL 是否可访问
   - URL 是否符合约定子目录

---

### P0-2 游戏运行时地图数据与素材管理器地点数据仍是双源架构

**现象**

- 资产管理器主数据源是 `scripts/location_profiles.json`
- 游戏运行时地图数据源是 `src/renderer/data/configs/maps/map_001_beiliang.json`
- 两边都保存地点信息：
  - `location_id / name / position / scene_ids / unlock_conditions`
  - icon / backdrop 路径
- 工具端通过部署接口把一部分字段“同步”到运行时 map JSON

**影响**

- 当前统一了 `scene_profiles -> location_profiles`，但“工具数据源”和“运行时数据源”仍然是两个事实源
- 任一侧字段扩展、重命名、路径调整，都可能导致同步不完整
- 地图 UI、素材管理器、设计文档三方很容易再次出现结构漂移

**证据**

- `tools/asset-manager/backend/main.py`：`LOCATION_PROFILES_PATH = PROJECT_ROOT / "scripts" / "location_profiles.json"`
- `src/renderer/data/configs/maps/map_001_beiliang.json` 独立保存 location 信息
- 部署逻辑通过 `_ASSET_MAP_TO_GAME_FILE`、`_ASSET_MAP_TO_PUBLIC_SUBDIR` 手动映射两套体系

**建议**

1. 尽快选定一个 **唯一主数据源**
   - 推荐：`scripts/location_profiles.json` 作为编辑源
   - `src/renderer/data/configs/maps/*.json` 改为**生成产物**
2. 新增显式生成脚本，例如：
   - `scripts/build-map-configs.ts` 或 `scripts/export-runtime-map-data.py`
3. 运行时 map JSON 禁止人工编辑
4. 为 `location_profiles.json` 补 Zod/JSON Schema，并把生成过程纳入校验
5. 把 map/location/scene 的映射规则从 Python 内嵌字典抽成显式配置文件

---

### P0-3 scene / location / event 三套命名仍未完全收敛，领域语言不稳定

**现象**

- UI 层已经引入 `WorldMapScreen -> LocationScreen -> SceneScreen`
- 但资产工具内部大量函数名仍是 `_read_scene_profiles`、`_write_scene_profiles`
- 文档 `docs/design/scene_resource_generation_system.md` 仍大量使用 `scene_profiles.json`
- 实际上现在“地点（location）”承载地图节点，“场景（scene）”承载可参与剧情，“event”又作为 scene.type 的一个值

**影响**

- 对新开发者极不友好
- 讨论“scene”时，可能指：
  - 地图地点
  - 剧情场景
  - 资源生成对象
  - event 类型
- 这会直接放大接口设计与文档维护成本

**建议**

统一领域语言：

- **Map**：大地图
- **Location**：地图节点 / 地点
- **Scene**：地点下的可参与剧情实例
- **SceneType=event/shop/challenge**：剧情玩法类型

并据此做一次系统性收敛：

1. Python API 函数名从 `scene_profiles` 更名为 `location_profiles`
2. 文档全量修订旧术语
3. 前后端类型名保持一致
4. 新字段命名禁止再混用 scene/location

---

### P0-4 资产部署链路靠“路径映射 + 文件复制 + JSON 改写”硬编码维持，缺少统一契约层

**现象**

- 资产管理器部署逻辑直接写：
  - 复制文件
  - 生成 URL
  - 改写 map JSON
  - 依赖 `_ASSET_MAP_TO_GAME_FILE` / `_ASSET_MAP_TO_PUBLIC_SUBDIR`
- 当前只对 `map_001` 有硬编码映射

**影响**

- 一旦新增地图，必须同时改：
  - location_profiles
  - backend path mapping
  - public 子目录
  - game map config
- 这不是“架构支持扩展”，而是“靠开发者记忆维持一致”
- 后续多地图、多地域内容扩充时，这会成为明显瓶颈

**建议**

1. 引入 `MapManifest` / `RuntimeAssetManifest` 配置
2. 所有部署行为先解析 manifest，再执行复制与导出
3. 不允许在业务逻辑里散落 map_id 到路径的手工映射
4. 每次 deploy 输出结构化结果并做完整性检查

---

### P0-5 核心文档与真实代码结构已经明显漂移，误导风险高

**现象**

- `docs/dev/architecture.md` 描述了大量当前不存在的结构：
  - `src/main/index.ts`
  - `src/main/ipc.ts`
  - `src/main/storage.ts`
  - `src/renderer/hooks/`
  - `stores/middleware/persist.ts`
  - `components/map/`
  - `shared/types.ts`
  - `electron-store`、`Radix UI`
- 实际仓库并不存在这些模块

**影响**

- 文档不再是辅助，而是误导
- 后续重构会基于错误认知做判断
- 新人 onboarding 成本高

**建议**

1. 把 `docs/dev/architecture.md` 视为需要重写，而不是小修
2. 增加“文档状态”标记：草案 / 已验证 / 已过期
3. 重要架构文档必须在 CI 或 PR checklist 中要求更新

---

## 4. P1 问题：会显著影响可维护性

### P1-1 `gameStore.ts` 过重，编排职责和状态职责混在一起

**现象**

- `gameStore.ts` 381 行
- 同时负责：
  - 游戏对象持有
  - 状态同步
  - 结算播放流程
  - 剧情推进
  - 场景完成切换
  - 存档加载

**影响**

- store 已经从“状态容器”演化成“流程控制器”
- 测试困难
- 稍复杂的 UI 交互（跳过动画、断点恢复、结算预览）会继续把它推成巨石模块

**建议**

拆分为至少三层：

1. `gameStore`
   - 只保留基础状态快照与简单动作
2. `settlementPlaybackStore`
   - 只管剧情/结算播放状态机
3. `application services`
   - 如 `src/renderer/core/app/SettlementFlowService.ts`
   - 承担流程编排

---

### P1-2 核心 domain 对象之间是强引用网状关系，边界尚不稳定

**现象**

- `GameManager` 直接 new 出多个 manager/system
- `SettlementExecutor` 同时依赖：
  - `PlayerState`
  - `CardManager`
  - `SceneManager`
  - `EquipmentSystem`
- `DayManager` 又反向编排 scene / think / player / card

**影响**

- 当前还能维护，是因为系统规模尚小
- 一旦加入：
  - 真正商店系统
  - 多地图刷新
  - NPC 关系
  - 持续性状态效果
  - 任务链 / 主线
  这些类之间的修改成本会快速上升

**建议**

向“领域模块 + 应用服务”演进：

- `scene domain`
- `settlement domain`
- `inventory domain`
- `progression domain`

跨域编排通过 service 完成，而不是在 manager 之间直接互相操作

---

### P1-3 卡牌、场景、地图三类配置的 schema 覆盖不完整

**现象**

- 场景 JSON 通过 `SceneSchema` 校验
- 但 `base_cards.json` 在启动时由 `TitleScreen` 直接 import 使用，没有走统一验证流程
- `map_001_beiliang.json` 也没有对应 schema
- `scripts/location_profiles.json` 更没有强校验

**影响**

- 数据驱动项目最怕“表面有 schema，实际上关键入口没接上”
- 当前 schema 只覆盖了部分内容链路，容易给团队造成“已经安全”的错觉

**建议**

1. 所有运行时数据统一走 loader + schema
2. 新增：
   - `MapSchema`
   - `LocationProfilesSchema`
3. `TitleScreen` 不应直接 import 原始 JSON，而应使用统一数据仓库/loader
4. 构建或启动前增加一次全量数据校验脚本

---

### P1-4 资产管理器后端已成为 3000+ 行单文件单体，修改风险高

**现象**

- `tools/asset-manager/backend/main.py` 超过 3000 行
- 里面混合了：
  - 路径常量
  - 角色逻辑
  - 物品逻辑
  - 地点逻辑
  - 部署逻辑
  - Prompt 组装
  - 读写 JSON
  - SSE

**影响**

- 任意一处修改都容易造成连锁回归
- 逻辑不可复用
- 难以针对 location deploy、item deploy 做独立测试

**建议**

至少拆成：

- `backend/api/characters.py`
- `backend/api/items.py`
- `backend/api/locations.py`
- `backend/services/deploy_service.py`
- `backend/services/profile_store.py`
- `backend/domain/path_manifest.py`

---

### P1-5 资产管理器前端仍偏单页脚本式结构，状态管理隐性复杂

**现象**

- `tools/asset-manager/frontend/src/App.tsx` 569 行
- 维护多个 tab 的加载、选择、刷新、局部更新
- 类型分层已有，但状态管理仍集中在根组件

**影响**

- 再继续加工作坊能力、批量操作、预览 diff、部署校验时，复杂度会继续堆在根组件

**建议**

1. 按 domain 拆出页面容器：
   - `pages/CharactersPage.tsx`
   - `pages/ItemsPage.tsx`
   - `pages/LocationsPage.tsx`
2. 引入轻量查询层（哪怕只是 hooks）
   - `useCharactersQuery`
   - `useItemsQuery`
   - `useLocationsQuery`
3. 把“选中项状态”和“数据加载状态”从根组件拆开

---

### P1-6 运行时 UI 存在两代导航模型并存

**现象**

- `MapScreen.tsx` 仍存在旧的 scene 平铺地图界面
- `WorldMapScreen.tsx + LocationScreen.tsx + SceneScreen.tsx` 是新路径
- `App.tsx` 同时保留了 `map` 与 `world_map`

**影响**

- 代码阅读时难以判断哪个是标准路径
- 后续改动容易漏掉旧页面
- 新旧 UI 逻辑分叉，增加维护成本

**建议**

1. 确认 `MapScreen` 是否仍为正式路径
2. 如果已弃用，尽快归档或删除
3. 给 UI 路由定义单一导航状态图

---

### P1-7 Effect 系统与数据 schema 存在“定义了但未真正落地”的字段

**现象**

- `Effects` 里有 `unlock_scenes`
- schema 也支持
- 但 `EffectApplier` 并未实现该字段

**影响**

- 内容策划会误以为字段可用
- 数据配置与运行逻辑脱节
- 这是典型“静态结构在前，业务语义未闭环”的问题

**建议**

1. 对所有配置字段做“已实现 / 预留”标记
2. 未实现字段不要进入生产 schema，或者在校验阶段报警
3. 建立“数据字段能力清单”

---

### P1-8 命名规范不统一，部分资源文件名与代码命名风格冲突

**现象**

- 资源名同时存在：
  - `figure01.png`
  - `item_scimitar_01.png`
  - `大凉龙雀_1775304857_1.png`
  - `寒玉戒指_1775300250_1.png`
- icon 有：
  - `icon_05_baima.png`
  - `icon_05_baima_yougnu.png`
- 代码层也有中英文混合、scene/location 残留混合

**影响**

- 自动化脚本难以做稳定推断
- review 与查找成本上升
- 文件名难以预测，路径错误更容易发生

**建议**

统一命名规范：

- 运行时资源文件名统一 ASCII kebab/snake 风格
- 展示文案保留中文，文件名不承载自然语言
- 生成器输出文件采用稳定命名策略，不带时间戳进入运行时目录

---

### P1-9 测试覆盖对“数据正确性”和“路径正确性”支持不足

**现象**

- 仓库有 Vitest，但当前更偏 UI/单元基础
- 资产工具只有 E2E 截图与 Python 测试痕迹
- 缺少针对以下高风险点的自动校验：
  - 所有地图资源路径是否存在
  - 所有卡牌 image 是否可解析
  - 场景引用的 stage / branch / portrait 是否有效
  - location_profiles 与 map runtime 导出是否一致

**影响**

- 大量问题只能靠运行时手动踩出来

**建议**

增加“架构守卫型测试”：

1. 配置完整性测试
2. 资源存在性测试
3. 导出产物一致性测试
4. deploy 后 smoke check

---

## 5. P2 问题：锦上添花的优化

### P2-1 建议把运行时配置抽象成只读内容仓库

可以新增 `content registry`，统一提供：

- cards
- scenes
- maps
- locations
- asset URLs

让 UI 和 Core 不再各自零散读 JSON。

---

### P2-2 事件总线使用缺少约束，长期看容易成为隐式耦合点

`eventBus` 现在规模还不大，但建议尽早规范：

- 事件名枚举化
- payload 类型化
- 标注哪些事件用于 UI，哪些用于领域逻辑

---

### P2-3 可以为地图/地点/场景增加显式 read model

例如：

- `MapViewModel`
- `LocationViewModel`
- `SceneSummaryViewModel`

把 UI 派生逻辑从组件中移出，减少 `WorldMapScreen` / `LocationScreen` 内联计算。

---

### P2-4 建议建立“架构决策记录（ADR）”

至少把这些历史决定记下来：

- 为什么 Vite root 放在 `src/renderer`
- 为什么运行时 public 放在 `src/renderer/public`
- location_profiles 是编辑源还是运行时源
- map icon / backdrop 的正式目录约定
- scene 与 location 的领域定义

这样可以显著减少未来重复讨论与重复踩坑。

---

## 6. 推荐的改进执行顺序

### 第一阶段：先消除重复踩坑源（P0，建议立即做）

1. **统一静态资源路径规则**
   - 定义唯一 public/assets 约定
   - 清理根目录 `public/` 的残留职责
   - 增加统一资源路径解析工具

2. **统一 location 主数据源**
   - 决定 `location_profiles.json` 是否为唯一编辑源
   - 把运行时 map JSON 改为导出产物

3. **收敛命名体系**
   - scene / location / event 统一术语
   - 清理工具函数名与文档旧称谓

4. **重写架构文档**
   - 修正 `docs/dev/architecture.md`
   - 标注已废弃结构与当前真实结构

---

### 第二阶段：提升维护性（P1）

5. **拆分 asset-manager backend/main.py**
6. **拆分 asset-manager frontend/App.tsx**
7. **拆分 gameStore 的编排职责**
8. **为 map / location_profiles / cards 接入统一 schema 验证**
9. **补齐配置能力与实现能力的一致性校验**

---

### 第三阶段：提高长期演进上限（P2）

10. 建立内容仓库 / registry
11. 建立事件总线类型约束
12. 引入 ADR 与架构守卫测试

---

## 7. 总结判断

这个项目当前的主要问题，不是“核心代码完全失控”，而是：

1. **编辑源与运行时源分裂**
2. **路径规则没有制度化**
3. **命名体系在多个迭代中发生漂移**
4. **工具链和游戏运行时之间缺少单一契约**
5. **文档已经落后于真实实现**

如果只做功能迭代、不先解决 P0，后续大概率会继续重复出现：

- 静态资源路径错位
- 地图/地点数据不同步
- 命名理解偏差
- deploy 成功但运行时不生效
- 文档和代码各说各话

从架构角度看，**最值得优先投入的不是“再扩一批内容”，而是先把“路径、数据源、术语、导出链路”四件事彻底收敛**。这会显著提升后续每一次内容扩展、工具扩展和 UI 重构的确定性。