# 技术架构文档

本文档定义苏丹游戏的技术架构、模块划分和技术栈选择。

---

## 技术栈

```
├── 框架层
│   ├── Electron (桌面容器)
│   ├── React 18 + TypeScript
│   └── Vite (构建工具)
│
├── 状态层
│   ├── Zustand (游戏状态)
│   └── Zustand persist (存档中间件)
│
├── 交互层
│   ├── @dnd-kit/core (拖放系统)
│   └── Framer Motion (动画)
│
├── 渲染层
│   ├── Tailwind CSS (原子化样式)
│   ├── SVG (地图渲染)
│   └── GSAP (骰子动画)
│
├── 数据层
│   ├── JSON (配置数据)
│   ├── Zod (数据校验)
│   ├── seedrandom (可控随机)
│   └── electron-store / fs (持久化)
│
└── 辅助层
    ├── Howler.js (音频)
    ├── mitt (事件总线)
    └── Radix UI (无样式基础组件)
```

---

## 架构总览

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Electron 主进程                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │
│  │  窗口管理        │  │  文件系统 (fs)   │  │  electron-store │      │
│  │  应用生命周期    │  │  存档读写        │  │  设置持久化     │      │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘      │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ IPC
┌──────────────────────────────▼──────────────────────────────────────┐
│                         Electron 渲染进程                            │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                      UI Layer (React)                          │ │
│  │   Screens / Components / Hooks                                 │ │
│  └──────────────────────────┬─────────────────────────────────────┘ │
│                             │                                        │
│  ┌──────────────────────────▼─────────────────────────────────────┐ │
│  │                   Zustand Store (状态层)                        │ │
│  │   gameStore: 游戏状态 + actions                                 │ │
│  │   uiStore: UI状态 (模态框、动画队列)                            │ │
│  └──────────────────────────┬─────────────────────────────────────┘ │
│                             │                                        │
│  ┌──────────────────────────▼─────────────────────────────────────┐ │
│  │                    Core Layer (纯逻辑)                          │ │
│  │   GameManager / CardSystem / SceneSystem / SettlementSystem    │ │
│  └──────────────────────────┬─────────────────────────────────────┘ │
│                             │                                        │
│  ┌──────────────────────────▼─────────────────────────────────────┐ │
│  │                    Data Layer (数据)                            │ │
│  │   JSON configs / Zod schemas / DataLoader                      │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 模块划分

### Core Layer（核心逻辑层）

纯 TypeScript 逻辑，不依赖任何 UI 框架，方便测试和复用。

| 模块 | 职责 |
|------|------|
| `game/GameManager` | 游戏主控：初始化、存档、胜负判定 |
| `game/DayManager` | 每日循环：黎明→行动→结算流程 |
| `game/TimeManager` | 时间回溯、处刑日倒计时 |
| `card/CardManager` | 卡牌增删查、手牌管理 |
| `card/EquipmentSystem` | 装备穿脱、加成计算 |
| `scene/SceneManager` | 场景生命周期、解锁、刷新 |
| `scene/SlotSystem` | 卡槽投入、锁定、归还 |
| `settlement/SettlementExecutor` | 结算调度：检定/交易/选择 |
| `settlement/DiceChecker` | 骰子检定：投骰、爆骰、重投、金骰子 |
| `settlement/EffectApplier` | effects 应用：资源变化、卡牌操作 |
| `player/PlayerState` | 金币、声望、金骰子、回溯次数 |
| `player/ThinkSystem` | 俺寻思机制 |

### Data Layer（数据层）

| 模块 | 职责 |
|------|------|
| `schemas/` | Zod 校验 schema，运行时类型安全 |
| `loader.ts` | JSON 配置加载、缓存 |
| `configs/` | 卡牌、场景等 JSON 配置文件 |

### UI Layer（呈现层）

| 模块 | 职责 |
|------|------|
| `screens/MapScreen` | 大地图：节点、路径、时间罗盘 |
| `screens/SceneScreen` | 场景界面：左侧场景+卡槽，右侧对话 |
| `screens/SettlementScreen` | 结算界面：骰子动画、结果展示 |
| `screens/DialogScreen` | 对话界面：选项、立绘 |
| `components/card/` | 卡牌渲染、卡槽、卡组 |
| `components/dice/` | 骰子动画、结果展示 |
| `components/map/` | 地图节点、时间罗盘 |
| `components/common/` | 通用组件：按钮、对话框、资源栏 |

### Stores（状态层）

| Store | 职责 |
|-------|------|
| `gameStore` | 游戏核心状态，调用 Core 方法，persist 存档 |
| `uiStore` | UI 状态：当前界面、模态框、动画队列 |

---

## 目录结构

```
src/
├── main/                       # Electron 主进程
│   ├── index.ts               # 入口，窗口创建
│   ├── ipc.ts                 # IPC handlers
│   └── storage.ts             # electron-store 封装
│
├── renderer/                   # Electron 渲染进程
│   ├── index.html
│   ├── main.tsx               # React 入口
│   │
│   ├── core/                  # 核心逻辑 (纯TS，无UI依赖)
│   │   ├── game/
│   │   │   ├── GameManager.ts
│   │   │   ├── DayManager.ts
│   │   │   └── TimeManager.ts
│   │   ├── card/
│   │   │   ├── CardManager.ts
│   │   │   └── EquipmentSystem.ts
│   │   ├── scene/
│   │   │   ├── SceneManager.ts
│   │   │   └── SlotSystem.ts
│   │   ├── settlement/
│   │   │   ├── SettlementExecutor.ts
│   │   │   ├── DiceChecker.ts
│   │   │   └── EffectApplier.ts
│   │   ├── player/
│   │   │   ├── PlayerState.ts
│   │   │   └── ThinkSystem.ts
│   │   └── types/
│   │       └── index.ts
│   │
│   ├── data/                  # 数据层
│   │   ├── schemas/           # Zod schemas
│   │   │   ├── card.schema.ts
│   │   │   └── scene.schema.ts
│   │   ├── loader.ts          # 数据加载器
│   │   └── configs/           # JSON 配置
│   │       ├── cards/
│   │       └── scenes/
│   │
│   ├── stores/                # Zustand stores
│   │   ├── gameStore.ts       # 游戏状态
│   │   ├── uiStore.ts         # UI状态
│   │   └── middleware/
│   │       └── persist.ts     # 存档中间件
│   │
│   ├── ui/                    # React 组件
│   │   ├── screens/
│   │   │   ├── MapScreen.tsx
│   │   │   ├── SceneScreen.tsx
│   │   │   ├── SettlementScreen.tsx
│   │   │   └── DialogScreen.tsx
│   │   ├── components/
│   │   │   ├── card/
│   │   │   ├── dice/
│   │   │   ├── map/
│   │   │   └── common/
│   │   └── layouts/
│   │       └── GameLayout.tsx
│   │
│   ├── hooks/                 # React hooks
│   │   ├── useGame.ts
│   │   ├── useDragDrop.ts
│   │   └── useAudio.ts
│   │
│   ├── lib/                   # 工具封装
│   │   ├── audio.ts           # Howler 封装
│   │   ├── random.ts          # seedrandom 封装
│   │   └── events.ts          # mitt 实例
│   │
│   └── styles/
│       └── index.css          # Tailwind 入口
│
├── assets/                    # 静态资源
│   ├── images/
│   ├── audio/
│   └── fonts/
│
└── shared/                    # 主进程/渲染进程共享类型
    └── types.ts
```

---

## 数据流

```
用户操作 (点击/拖放)
       │
       ▼
┌─────────────────┐
│  React 组件     │  调用 store action
└───────┬─────────┘
        │
        ▼
┌─────────────────┐
│  Zustand Store  │  调用 Core 方法
│  gameStore      │
└───────┬─────────┘
        │
        ▼
┌─────────────────┐
│  Core Layer     │  执行业务逻辑
│  (纯函数/类)     │  返回新状态
└───────┬─────────┘
        │
        ▼
┌─────────────────┐
│  Zustand Store  │  更新状态
│  set(newState)  │  触发订阅
└───────┬─────────┘
        │
        ▼
┌─────────────────┐
│  React 组件     │  自动重渲染
└─────────────────┘
```

---

## 层间通信

UI Layer 直接持有 Core 引用，通过 Zustand Store 桥接：

```typescript
// Core 暴露接口
class GameManager {
  state: GameState;
  
  nextDay(): SettlementResult[] { ... }
  participateScene(sceneId: string, cards: string[]): void { ... }
  rollDice(): DiceResult { ... }
  useReroll(diceIndices: number[]): DiceResult { ... }
}

// Zustand Store
const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      game: new GameManager(),
      
      nextDay: () => {
        const results = get().game.nextDay();
        set({ ... });
        return results;
      },
    }),
    { name: 'sultan-save' }
  )
);

// React 组件
function MapScreen() {
  const { game, nextDay } = useGameStore();
  
  return (
    <div>
      <span>Day {game.state.currentDay}</span>
      <button onClick={nextDay}>下一天</button>
    </div>
  );
}
```

---

## 关键设计点

| 关注点 | 方案 |
|--------|------|
| **存档** | Zustand persist → electron-store，自动序列化 |
| **可控随机** | seedrandom，存档保存 seed，回溯时恢复 |
| **骰子动画** | GSAP Timeline，动画结束后再更新状态 |
| **拖放** | @dnd-kit 处理交互，Core 校验合法性 |
| **检定暂停** | uiStore 维护 `pendingDiceCheck` 状态机 |
| **音频** | Howler sprite 模式，一个文件多音效 |
| **热更新配置** | JSON 外置，Zod 运行时校验 |

---

## 设计原则

1. **Core 不知道 UI 存在**：Core 层纯逻辑，不引入 React/DOM 依赖
2. **UI 只读 Core 状态**：UI 通过调用 Store 方法触发逻辑，监听状态变化更新视图
3. **检定过程可暂停**：骰子检定需要玩家交互（重投、金骰子），Core 提供状态机，UI 控制推进节奏
4. **结算是原子操作**：`SettlementExecutor` 封装完整结算流程，保证数据一致性
5. **配置与逻辑分离**：卡牌、场景等数据用 JSON 配置，支持热更新和 MOD
