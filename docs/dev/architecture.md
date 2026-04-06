# 素探 (Sutan) — 架构文档

> **状态**：反映代码库实际结构（2025-Q2）。本文件由人工维护，修改代码后请同步更新。
> 上次更新：scripts/export-runtime-map-data.py 与 map_manifest.json 引入后。

---

## 1. 项目概览

素探是一款基于 Electron + React + Vite 的桌面卡牌策略游戏。
整体分三层：

```
┌─────────────────────────────────────────────┐
│           Electron Shell (main process)      │
│   electron/main.ts · electron/preload.ts     │
│   (打开窗口、加载 renderer、关闭时保存)       │
├─────────────────────────────────────────────┤
│            Game Renderer (renderer process)  │
│   React + Vite SPA                          │
│   src/renderer/                             │
├─────────────────────────────────────────────┤
│         Asset Manager Tool (独立进程)        │
│   FastAPI + React SPA                       │
│   tools/asset-manager/                      │
└─────────────────────────────────────────────┘
```

---

## 2. 目录结构（实际存在）

```
sutan/
├── electron/
│   ├── main.ts                   # Electron 主进程入口
│   └── preload.ts                # contextBridge 暴露 electronAPI
│
├── src/renderer/                 # Vite root（所有 renderer 路径从此开始）
│   ├── main.tsx                  # React 入口
│   ├── App.tsx                   # 路由/屏幕切换（由 uiStore.screen 驱动）
│   │
│   ├── core/                     # 纯业务逻辑，无 React 依赖
│   │   ├── card/
│   │   │   ├── CardInstance.ts   # 卡牌运行时实例
│   │   │   ├── CardManager.ts    # 卡组管理
│   │   │   └── EquipmentSystem.ts
│   │   ├── game/
│   │   │   ├── GameManager.ts    # 游戏主状态机
│   │   │   ├── DayManager.ts     # 天数/时间推进
│   │   │   └── TimeManager.ts
│   │   ├── player/
│   │   │   ├── PlayerState.ts    # 玩家属性（HP/金币/…）
│   │   │   └── ThinkSystem.ts    # 思考点机制
│   │   ├── scene/
│   │   │   ├── SceneManager.ts   # 场景加载/切换
│   │   │   ├── SceneRunner.ts    # 场景流程执行（stage 顺序）
│   │   │   └── SlotSystem.ts     # 卡牌槽位系统
│   │   ├── settlement/
│   │   │   ├── DiceChecker.ts    # 骰子结算
│   │   │   ├── EffectApplier.ts  # 效果应用
│   │   │   ├── SettlementExecutor.ts
│   │   │   └── calcCheckPool.ts
│   │   └── types/
│   │       ├── index.ts          # 全局 TypeScript 类型定义
│   │       └── enums.ts          # 枚举（SceneType、CardType…）
│   │
│   ├── data/
│   │   ├── loader.ts             # JSON 配置加载入口（懒加载）
│   │   ├── schemas/index.ts      # Zod schema 验证
│   │   └── configs/              # 游戏运行时 JSON（⚠️ 部分由脚本生成）
│   │       ├── cards/
│   │       │   └── base_cards.json
│   │       ├── maps/
│   │       │   └── map_001_beiliang.json   # ⚠️ 由 scripts/export-runtime-map-data.py 生成
│   │       ├── scenes/           # 各剧情场景配置（scene_001…）
│   │       └── achievements.json
│   │
│   ├── stores/
│   │   ├── gameStore.ts          # Zustand — 核心游戏状态
│   │   └── uiStore.ts            # Zustand — UI 状态（当前屏幕、弹窗…）
│   │
│   ├── lib/
│   │   ├── assetPaths.ts         # 统一资源 URL 解析工具（⭐ 所有路径拼接从这里走）
│   │   ├── events.ts             # mitt 事件总线
│   │   └── random.ts             # 伪随机（seedrandom 包装）
│   │
│   ├── ui/
│   │   ├── screens/              # 全屏视图（由 uiStore.screen 切换）
│   │   │   ├── TitleScreen.tsx
│   │   │   ├── WorldMapScreen.tsx    # 大地图（MapScreen → WorldMapScreen）
│   │   │   ├── MapScreen.tsx         # 地图容器（含导航逻辑）
│   │   │   ├── LocationScreen.tsx    # 地点详情
│   │   │   ├── SceneScreen.tsx       # 剧情/战斗场景
│   │   │   ├── DialogScreen.tsx      # 对话框
│   │   │   ├── SettlementScreen.tsx  # 结算
│   │   │   └── ShopScreen.tsx
│   │   ├── components/           # 可复用 UI 组件
│   │   │   ├── card/             # CardComponent, CardDetailPanel, SlotComponent
│   │   │   ├── common/           # Button, Panel, AttrBadge, DecoratedFrame…
│   │   │   ├── dice/             # D20 骰子 3D 组件（react-three-fiber）
│   │   │   ├── hand/             # HandArea（卡手区域）
│   │   │   └── narrative/        # NarrativePlayer（旁白/台词播放）
│   │   ├── layouts/
│   │   │   ├── BookLayout.tsx    # 书页双栏布局
│   │   │   └── GameLayout.tsx    # 游戏主布局框架
│   │   ├── constants/
│   │   │   └── labels.ts         # 中文标签常量
│   │   └── theme/
│   │       └── tokens.ts         # 设计 token（颜色、字体）
│   │
│   ├── assets/                   # 编译期打包资源（Vite 处理，hash 命名）
│   │   ├── portraits/            # 角色立绘 figure01–16.png（卡牌图）
│   │   ├── scenes/               # 场景背景图（scene_xxx.png/jpg/webp）
│   │   ├── items/                # 道具图标
│   │   ├── maps/                 # 地图编译资源（目前为空/待迁移）
│   │   ├── fonts/                # 字体文件
│   │   ├── textures/             # 材质（bronze, rice-paper…）
│   │   └── ui/                   # UI 装饰图案
│   │
│   └── public/                   # 热部署运行时资源（不经 Vite hash 处理）
│       └── maps/
│           ├── beiliang/         # 北凉道地图图标 & terrain_bg.png
│           └── map_001/          # 地点 icon/backdrop（已部署）
│
├── scripts/                      # 数据管理脚本
│   ├── location_profiles.json    # ⭐ 唯一编辑源：地点/地图主数据
│   ├── map_manifest.json         # ⭐ 地图ID→运行时文件映射（部署契约）
│   └── export-runtime-map-data.py # 从 location_profiles 生成 map JSON
│
├── tools/asset-manager/          # 独立资产管理工具（开发期使用）
│   ├── backend/
│   │   └── main.py               # FastAPI 后端（角色/场景图片生成/部署）
│   └── frontend/                 # React SPA（图片工坊 UI）
│
├── public/                       # 根目录 public（⚠️ 游戏运行时不引用）
│   │                             # 仅 asset-manager backend 自身的预览服务使用
│   ├── portraits/                # 工具预览用立绘（非游戏运行时）
│   └── items/                    # 工具预览用道具图
│
├── docs/
│   ├── architecture-review.md    # P0 问题清单（历史评审）
│   ├── dev/
│   │   └── architecture.md       # ← 本文件
│   └── design/                   # 功能设计文档
│
├── electron-builder.json         # 打包配置
├── vite.config.ts                # Vite 配置（root=src/renderer）
├── tailwind.config.js
└── package.json
```

---

## 3. 数据流

### 3.1 核心游戏数据流

```
data/configs/
  cards/base_cards.json      ──┐
  maps/map_001_beiliang.json ──┤ loader.ts (懒加载 + Zod 校验)
  scenes/scene_xxx.json      ──┘
         │
         ▼
   core/ 业务逻辑层
   (GameManager / SceneRunner / CardManager)
         │
         ▼
   Zustand Stores
   (gameStore / uiStore)
         │
         ▼
   React UI (screens / components)
```

### 3.2 地图数据主数据源

```
scripts/location_profiles.json          ← 唯一编辑源
         │
         │  scripts/export-runtime-map-data.py
         │  (读 map_manifest.json 获取映射)
         ▼
src/renderer/data/configs/maps/
  map_001_beiliang.json                 ← 生成产物，禁止手动编辑
         │
         ▼
   WorldMapScreen / LocationScreen      ← 运行时读取
```

### 3.3 资源部署链路

```
tools/asset-manager/backend/main.py
  ├── 读 scripts/map_manifest.json     → 获取 map_id 映射
  ├── 生成图片 → tools/asset-manager/backend/maps/{map_id}/
  ├── 部署 icon/backdrop
  │     → src/renderer/public/maps/{public_subdir}/   (热部署，/maps/... URL)
  └── 更新 src/renderer/data/configs/maps/map_001_beiliang.json
```

---

## 4. 资源路径规则（唯一约定）

| 资源类型 | 存储位置 | 运行时 URL | 是否热部署 |
|---------|---------|-----------|----------|
| 角色立绘 (卡牌) | `src/renderer/assets/portraits/figureNN.png` | `/assets/portraits/figureNN.png`（Vite hash 后） | 否（需重编译） |
| 场景背景图 | `src/renderer/assets/scenes/*.{png,jpg,webp}` | `import.meta.glob` 导入 | 否 |
| 地图图标/背景 | `src/renderer/public/maps/{subdir}/` | `/maps/{subdir}/filename.png` | **是** |
| 地图地形底图 | `src/renderer/public/maps/{subdir}/terrain_bg.png` | `/maps/{subdir}/terrain_bg.png` | **是** |
| UI 纹理/装饰 | `src/renderer/assets/textures/` | Vite 编译 hash | 否 |

> **规则**：根目录 `public/` 仅供 asset-manager 工具自身预览，**游戏运行时不引用**。
> 所有路径解析通过 `src/renderer/lib/assetPaths.ts` 统一处理。

---

## 5. 术语表（统一命名体系）

| 术语 | 含义 | 对应文件/类型 |
|------|------|-------------|
| **Map**（大地图） | 可探索的地理区域（北凉道） | `map_001_beiliang.json` |
| **Location**（地点） | 大地图上的可交互节点 | `location.location_id` |
| **Scene**（剧情实例） | 在地点内触发的具体剧情/战斗 | `scene_xxx.json`, `SceneRunner` |
| **SceneType** | 场景类型枚举 | `event` / `shop` / `challenge` |
| **location_profiles.json** | 资产工具侧的主数据 | `scripts/location_profiles.json` |
| **map_manifest.json** | 地图 ID → 运行时文件映射契约 | `scripts/map_manifest.json` |

---

## 6. 状态管理

### 6.1 gameStore（Zustand）

主要字段（简化）：
- `player: PlayerState` — 玩家属性（HP / 金币 / 思考点 / 属性值）
- `hand: CardInstance[]` — 当前手牌
- `currentScene: Scene | null` — 当前激活场景
- `currentMapId / currentLocationId` — 地图导航状态
- `dayCount` — 天数

### 6.2 uiStore（Zustand）

- `screen: ScreenName` — 当前全屏视图
- `modalStack: ModalState[]` — 弹窗层叠栈
- `selectedCard: CardInstance | null`

---

## 7. 关键技术栈

| 层 | 技术 |
|----|------|
| 桌面壳 | Electron |
| 构建 | Vite + @vitejs/plugin-react |
| UI 框架 | React 18 + TypeScript |
| 样式 | Tailwind CSS v4 |
| 状态管理 | Zustand |
| 动画 | Framer Motion + GSAP |
| 3D（骰子） | react-three-fiber + drei |
| 数据校验 | Zod |
| 事件总线 | mitt |
| 随机 | seedrandom |
| 音效 | Howler.js |
| 组件预览 | Ladle（.stories.tsx） |
| 单元测试 | Vitest + @testing-library/react |
| 资产工具后端 | FastAPI（Python 3.11+） |

---

## 8. 开发工作流

### 启动游戏（开发模式）
```bash
npm run dev        # Vite dev server（port 5173）
npm run electron   # 同时启动 Electron（若有）
```

### 启动资产管理工具
```bash
cd tools/asset-manager/backend
python main.py
# 前端：cd tools/asset-manager/frontend && npm run dev
```

### 从 location_profiles.json 重新生成地图配置
```bash
python scripts/export-runtime-map-data.py
# 验证一致性：
python scripts/export-runtime-map-data.py --check
```

### 新增地图
1. 在 `scripts/map_manifest.json` 添加新 map 条目
2. 在 `scripts/location_profiles.json` 添加对应 map 数据
3. 运行 `scripts/export-runtime-map-data.py` 生成运行时 JSON
4. 资产图片部署到 `src/renderer/public/maps/{new_subdir}/`

---

## 9. 非存在模块说明（勿添加）

下列模块在早期设计中提及但**当前不存在**，请勿在代码中引用：
- `src/main/` 目录（无独立主进程 TS 源码目录，主进程文件在 `electron/`）
- `electron-store` 包（未使用，状态暂不持久化到磁盘）
- `Radix UI` 组件库（未安装）
- `hooks/` 目录（无独立 hooks 目录）
- `stores/middleware/persist.ts`
- `components/map/` 目录
- `shared/types.ts`
