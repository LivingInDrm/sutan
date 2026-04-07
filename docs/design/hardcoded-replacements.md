# Sutan · 硬编码替换清单

> 按优先级排序。标注 **P0**（立即修）、**P1**（本周修）、**P2**（下个迭代）。
> 参考设计规范见 `docs/design/design-tokens.md`，Token 配置见 `docs/design/tailwind-theme.js`。

---

## P0 — 系统级问题（影响最广）

### #1 根布局背景色
- **文件**: `src/renderer/ui/layouts/GameLayout.tsx:6`
- **当前**: `className="h-screen w-screen flex flex-col bg-gray-950"`
- **应改为**: `className="h-screen w-screen flex flex-col bg-leather-900"`
- **原因**: 根布局背景直接影响所有界面，`bg-gray-950` 是 Tailwind 默认蓝黑，`bg-leather-900` 才是水墨暖黑

---

### #2 ResourceBar 背景和声望颜色
- **文件**: `src/renderer/ui/components/common/ResourceBar.tsx:13,22,23`
- **当前**:
  ```
  L13: bg-gray-900/90 border-b border-amber-900/40
  L22: text-blue-400 text-xs
  L23: text-blue-300 font-mono font-bold
  ```
- **应改为**:
  ```
  L13: bg-ink/90 border-b border-gold-dim/40
  L22: text-cerulean-300 text-xs
  L23: text-cerulean-300 font-bold
  ```
- **原因**: `text-blue-*` 蓝色与水墨主题不符，声望应用青墨色

---

### #3 MapScreen 废弃旧界面（Legacy Map）
- **文件**: `src/renderer/ui/screens/MapScreen.tsx:39,44,74,89,91,92,98`
- **当前**:
  ```
  L39:  bg-gray-900/60 rounded-lg border border-gray-800
  L44:  text-xs text-gray-500 (DAY label)
  L74:  text-xs text-gray-400 (scene desc)
  L89:  bg-green-950/30 border border-green-800/30
  L91:  text-sm font-bold text-green-300
  L92:  text-xs text-gray-400
  L98:  text-gray-600
  ```
- **应改为**:
  ```
  L39:  bg-ink/60 rounded border border-leather-700/40
  L44:  text-xs text-parchment/40
  L74:  text-xs text-parchment/50
  L89:  bg-bamboo/10 border border-bamboo-700/30 rounded
  L91:  text-sm font-bold text-bamboo-300
  L92:  text-xs text-parchment/50
  L98:  text-parchment/30
  ```
- **原因**: 绿色 → 竹青，灰色 → 宣纸/墨色

---

## P1 — 重要界面（主游戏流程）

### #4 TitleScreen 标题字体和背景
- **文件**: `src/renderer/ui/screens/TitleScreen.tsx:20-49`
- **当前**:
  ```
  L20: bg-gradient-to-b from-gray-950 via-gray-900 to-amber-950/20
  L23: style={{ fontFamily: 'serif', textShadow: '0 0 40px rgba(217,119,6,0.3)' }}
  L39: bg-gray-800/60 border border-amber-900/40 rounded-lg
  L44: text-xs text-gray-400
  L49: text-gray-600 text-xs
  ```
- **应改为**:
  ```
  L20: bg-gradient-to-b from-leather-950 via-leather-900 to-ink-900
  L23: className 加 font-[family-name:var(--font-display)], 移除 fontFamily 并将 textShadow 保留或改为 CSS var
  L39: 使用 <Button variant="primary" size="md"> 组件，删除裸 <button>
  L44: text-xs text-parchment/40
  L49: text-parchment/30 text-xs
  ```
- **原因**: 标题屏是第一印象，用水墨暖黑替代蓝黑，字体必须用 display token

---

### #5 WorldMapScreen 全局硬编码（8处 fontFamily）
- **文件**: `src/renderer/ui/screens/WorldMapScreen.tsx`
- **当前**:
  ```
  L78:  style={{ fontFamily: 'serif', letterSpacing: '0.3em' }}
  L103: style={{ fontFamily: 'serif' }}
  L112: style={{ fontFamily: 'serif' }}
  L122: className="text-blue-200 text-sm"
  L123: className="text-blue-400 mr-1"
  L142: style={{ fontFamily: 'serif' }}
  L223: style={{ fontFamily: 'serif' }}
  L131: className="px-5 py-1.5 bg-amber-900/50 border border-amber-600/40 rounded..."
  ```
- **应改为**:
  ```
  All fontFamily: 'serif' → font-[family-name:var(--font-display)] (className)
  L122: text-cerulean-300 text-sm
  L123: text-cerulean-300 mr-1  (声望图标)
  L131: <Button variant="primary" size="sm">结束当日</Button>
  ```
- **原因**: 8处 fontFamily 硬编码是最大技术债，且蓝色声望值不符合武侠调性

---

### #6 LocationScreen 状态颜色混乱
- **文件**: `src/renderer/ui/screens/LocationScreen.tsx`
- **当前**:
  ```
  L44-45: STATUS_CONFIG participated: color: 'text-blue-300', bgColor: 'bg-blue-900/10', borderColor: 'border-blue-700/30'
  L51-52: STATUS_CONFIG completed: color: 'text-gray-500', bgColor: 'bg-gray-900/20', borderColor: 'border-gray-700/20'
  L57-58: STATUS_CONFIG locked: color: 'text-gray-600', bgColor: 'bg-gray-950/20', borderColor: 'border-gray-800/20'
  L131: style={{ fontFamily: 'serif', textShadow: '0 0 20px rgba(217,119,6,0.5)' }}
  L208: style={{ fontFamily: 'serif' }}
  L239-243: 多个 border-blue-500/30, text-blue-400/80, border-green-700/30, text-green-600/70
  ```
- **应改为**:
  ```
  participated: color: 'text-cerulean-300', bgColor: 'bg-cerulean-900/10', borderColor: 'border-cerulean-500/30'
  completed:    color: 'text-bamboo-300',   bgColor: 'bg-bamboo-900/20',    borderColor: 'border-bamboo-700/30'
  locked:       color: 'text-parchment/30', bgColor: 'bg-leather-950/20',  borderColor: 'border-leather-700/20'
  L131: 移除 style 中 fontFamily，添加 font-[family-name:var(--font-display)] class
  L239-243: 对应改为 cerulean/bamboo token
  ```

---

### #7 CardComponent 稀有度样式脱离 token 系统
- **文件**: `src/renderer/ui/components/card/CardComponent.tsx`
- **当前**:
  ```
  L8-11:  RARITY_STYLES 用 border-yellow-400, bg-yellow-950/30, border-gray-300, bg-gray-900/40 等
  L14-18: RARITY_BADGE 用 bg-yellow-500 text-yellow-950, bg-gray-300 text-gray-900 等
  L29-55: COMPACT_RARITY 内联 rgba glow strings
  L156:   text-xs text-gray-400
  L159:   text-xs text-gray-400
  L165:   text-gray-500
  L175:   text-[9px] px-1 py-0.5 bg-gray-800 rounded text-gray-400
  ```
- **应改为**:
  ```
  RARITY_STYLES: 改用 rarityConfig（见 tailwind-theme.js）的 border/bg token
  COMPACT_RARITY glow: 改为 style={{ boxShadow: 'var(--shadow-rarity-gold)' }}
  L156: text-xs text-parchment/50
  L159: text-xs text-parchment/50
  L165: text-parchment/40
  L175: text-[9px] px-1 py-0.5 bg-ink/60 rounded text-parchment/40
  ```

---

### #8 CardDetailPanel 稀有度辉光内联 rgba
- **文件**: `src/renderer/ui/components/card/CardDetailPanel.tsx:17-42`
- **当前**:
  ```
  gold.glow:   '0 0 24px rgba(234,179,8,0.25), 0 0 48px rgba(234,179,8,0.10)'
  silver.glow: '0 0 20px rgba(156,163,175,0.20), 0 0 40px rgba(156,163,175,0.08)'
  copper.glow: '0 0 16px rgba(180,83,9,0.18), 0 0 32px rgba(180,83,9,0.06)'
  stone.glow:  '0 0 12px rgba(120,113,108,0.12)'
  L94: style={{ boxShadow: `${accent.glow}, 0 32px 64px -12px rgba(0,0,0,0.5)` }}
  ```
- **应改为**:
  ```
  gold.glow:   'var(--shadow-rarity-gold)'
  silver.glow: 'var(--shadow-rarity-silver)'
  copper.glow: 'var(--shadow-rarity-copper)'
  stone.glow:  'var(--shadow-rarity-stone)'
  L94: style={{ boxShadow: `${accent.glow}, var(--shadow-ink-lg)` }}
  ```

---

### #9 SettlementScreen 成功/失败颜色
- **文件**: `src/renderer/ui/screens/SettlementScreen.tsx`
- **当前**: `success: 'text-green-400'` / `failure: 'text-red-400'`
- **应改为**: `success: 'text-bamboo-300'` / `failure: 'text-crimson'`

---

### #10 SettlementPanels 成功色
- **文件**: `src/renderer/ui/components/settlement/SettlementPanels.tsx`
- **当前**: `success: 'text-green-400'`
- **应改为**: `success: 'text-bamboo-300'`

---

## P2 — 次要/可接受技术债

### #11 EventSettlementFrame 颜色细节
- **文件**: `src/renderer/ui/components/settlement/EventSettlementFrame.tsx:128,135`
- **当前**:
  - L128: `bg-amber-700/30` (分隔线)
  - L135: `text-amber-950` (右侧标题)
- **应改为**:
  - L128: `bg-gold-dim/30`
  - L135: `text-leather-900`（使用 token）

---

### #12 Button 组件 drop-shadow rgba 内联
- **文件**: `src/renderer/ui/components/common/Button.tsx:59,103`
- **当前**: `drop-shadow-[0_0_8px_rgba(201,168,76,0.3)]`
- **应改为**: `drop-shadow-[0_0_8px_rgb(var(--color-gold)/0.3)]`
- **原因**: 使用 CSS 变量引用而不是硬编码 hex，便于主题切换

---

### #13 DecoratedFrame drop-shadow
- **文件**: `src/renderer/ui/components/common/DecoratedFrame.tsx:29`
- **当前**: `drop-shadow-[0_0_12px_rgba(201,168,76,0.4)]`
- **应改为**: `drop-shadow-[0_0_12px_rgb(var(--color-gold)/0.4)]`

---

### #14 HandArea 内联渐变 rgba
- **文件**: `src/renderer/ui/components/hand/HandArea.tsx:97,198,202,313,327`
- **当前**: 多处 `rgba(212,197,169,...)` 渐变（即 parchment 色）
- **应改为**: `rgba(var(--color-parchment),...)`（Tailwind v4 CSS var 形式）

---

### #15 WorldMapScreen 地图 fallback 背景内联
- **文件**: `src/renderer/ui/screens/WorldMapScreen.tsx:64-68`
- **当前**: 内联 `radial-gradient(ellipse at 30% 60%, rgba(101,67,33,0.4)...)` + `linear-gradient`
- **应改为**: 提取为 CSS class `.bg-beiliang-fallback` 写入 index.css

---

### #16 SceneScreen 背景覆盖层
- **文件**: `src/renderer/ui/screens/SceneScreen.tsx:168-169`
- **当前**:
  ```
  bg-gradient-to-b from-black/30 via-black/20 to-black/60
  bg-black/25
  ```
- **应改为**: 使用 `from-leather-950/30 via-transparent to-leather-950/60`

---

### #17 DiceCheckPlayground 故事内联颜色
- **文件**: `src/renderer/ui/components/dice/DiceCheckPlayground.stories.tsx:207-209`
- **当前**: `"0 0 20px rgba(74,222,128,0.4)"` / `"0 0 20px rgba(239,68,68,0.4)"`
- **应改为**: `var(--shadow-rarity-stone)` 或提取为 token（stories 文件低优先级）

---

### #18 D20Mesh 内联颜色
- **文件**: `src/renderer/ui/components/dice/D20Mesh.tsx:27-28,62-68,77,82,85`
- **当前**: `crystalColor = '#6a6a8a'`, `edgeColor = '#c9a84c'` 等
- **应改为**: 提取 default 值用 CSS var: `crystalColor = 'var(--color-ink-light)'`, `edgeColor = 'var(--color-gold)'`

---

### #19 NarrativePlayer 属性颜色
- **文件**: `src/renderer/ui/components/narrative/NarrativePlayer.tsx`
- **当前**: 叙事组件中有 `bg-blue-100 text-blue-800`（属性展示）
- **应改为**: `bg-cerulean/10 text-cerulean-700`

---

### #20 ShopScreen 占位色
- **文件**: `src/renderer/ui/screens/ShopScreen.tsx:21,37`
- **当前**:
  - L21: `bg-gray-800/60 ... text-gray-600`
  - L37: `text-gray-600 text-center py-8`
- **应改为**:
  - L21: `bg-ink-800/60 ... text-parchment/30`
  - L37: `text-parchment/30`

---

## 汇总统计

| 类别 | 数量 | 优先级 |
|------|------|--------|
| `fontFamily: 'serif'` 硬编码 | 8处 | P1 |
| `text-blue-*/bg-blue-*` → cerulean | 7处 | P0-P1 |
| `text-green-*/bg-green-*` → bamboo | 5处 | P1 |
| `text-gray-*/bg-gray-*` → token | 12处 | P0-P2 |
| 内联 `rgba()` glow/shadow | 10处 | P1-P2 |
| 裸 `<button>` 未用组件 | 3处 | P1 |
| `text-amber-*` 非 token | 8处 | P2 |

**最优先修复路径（一个 PR 就能显著提升一致性）**：
1. 全局替换 `fontFamily: 'serif'` → `font-[family-name:var(--font-display)]`（8处，sed 可批量）
2. 全局替换 `text-blue-` → `text-cerulean-300`（5处声望相关）
3. 全局替换 `text-green-` → `text-bamboo-`（5处完成状态）
4. `GameLayout` 根背景 `bg-gray-950` → `bg-leather-900`
5. `CardComponent` RARITY_STYLES 用 rarityConfig token
