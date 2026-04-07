# Sutan 设计规范 · Design Tokens

> 主题定位：**水墨北凉** — 雪中悍刀行武侠世界，以水墨宣纸为底色，鎏金朱砂为点睛，兵荒马乱的边塞江湖气质。

---

## 一、界面截图诊断

### 截图 1 — 标题屏 (`TitleScreen`)

**界面描述**：深蓝-黑渐变背景，"SULTAN" 金色大标题（英文，serif字体），4个难度选项按钮（深灰圆角矩形，琥珀色文字）。

**视觉问题**：
1. **游戏名称写死"SULTAN"（英文）**：应为"苏丹"或融合中文题字设计，与雪中悍刀行主题完全脱节。
2. **背景是纯色渐变**：缺乏水墨纸张质感，游戏实际素材有宣纸/水墨风格但标题屏用的是科幻风蓝黑渐变。
3. **字体用 `fontFamily: 'serif'`（硬编码）**：应使用 `--font-display`（Ma Shan Zheng）统一管理。
4. **按钮风格是 Material/Tailwind 默认圆角矩形**：缺乏水墨卷轴感，与其他界面的 SVG 描边按钮风格不统一。
5. **副标题"苏丹的游戏"定位混乱**：苏丹是阿拉伯概念，应改为"北凉·刀行"之类的武侠定位。

---

### 截图 2 — 世界地图 (`WorldMapScreen`)

**界面描述**：宣纸质感背景地图（AI生成水墨风），各地点有水彩图标，顶部HUD（金色数字/文字）。

**视觉问题**：
1. **HUD 顶部栏缺少统一容器**：颜色字体各异（"第/天" 琥珀、"行刑" 红色、"金" 金色、"望" 蓝色），语义颜色不统一。
2. **"望/声望"用蓝色** (`text-blue-200/text-blue-400`)：蓝色与水墨武侠主题不符，应用统一的语义色（如青铜色/群青）。
3. **"结束当日"按钮** 用 `bg-amber-900/50` 内联，与 `Button` 组件风格脱节，没有使用 SVG 描边背景。
4. **地图文字用 `fontFamily: 'serif'`（多处硬编码）**：应统一用 `font-display` token。
5. **地点标签背景** `bg-black/60` vs `bg-black/50`：细节不统一，没有语义化。

---

### 截图 3 — 地点界面 (`LocationScreen`)

**界面描述**：沉浸式场景背景，顶部带标题和返回按钮，下方场景卡片列表（水墨边框）。

**视觉问题**：
1. **场景状态标签用了 `text-blue-300/text-blue-400`**（进行中）：蓝色出现在武侠界面显得格格不入。
2. **"已完成"用 `text-green-600/text-green-700`**：绿色同样不符合水墨武侠调性，应换为水墨青/墨绿。
3. **场景标题 `fontFamily: 'serif'`（硬编码）**：应使用 design token。
4. **`STATUS_CONFIG` 中的颜色字符串（bgColor/borderColor）**：全部硬编码，无法通过 token 统一管理。
5. **顶部 header `bg-black/30 backdrop-blur-sm`**：模糊黑色遮罩与水墨底图搭配过现代，应用半透明宣纸色。

---

### 截图 4 — 结算界面 (`EventSettlementFrame`)

**界面描述**：使用 ui_004 水墨边框背景图，左侧投入卡牌，右侧叙事文字，Q版人物立绘。

**视觉问题**：
1. **整体风格是目前最协调的**：ui_004 水墨边框 + 宣纸底色 + 马善政字体，水墨武侠感强。
2. **分隔线颜色 `bg-amber-700/30`**：直接硬编码，应为 `border-gold-dim/30`。
3. **右侧标题 `text-amber-950`**：颜色值不在 token 系统内，应用 `text-leather` 代替。
4. **内容区 `px-[8%] py-[10%]`**：用百分比内联样式，难以统一。
5. **"点击继续" 按钮** 背景透明，与底图依赖性强但没有明确定义样式 token。

---

### 截图 5 — 卡牌详情 (`CardDetailPanel`)

**界面描述**：宣纸底纹，Q版立绘，属性图标行，标签，边框根据稀有度变色。

**视觉问题**：
1. **稀有度光晕 glow 用内联 rgba 字符串**：`'0 0 24px rgba(234,179,8,0.25)'` 等无法通过 token 管理。
2. **文字颜色用 `text-leather/65`、`text-leather/45`** 等透明度变体：语义不清晰，应命名为 `text-body`、`text-muted` 等。
3. **背景 `bg-leather/6`、`bg-leather/8`**：魔法数字透明度，无法语义化。
4. **卡牌类型徽章** `bg-gradient-to-r from-yellow-600 to-amber-500`：使用了 Tailwind 默认调色板而非 token。
5. **关闭按钮** `hover:text-crimson`：用到了 crimson token 但没有完整定义 interaction state。

---

### 截图 6 — 卡牌列表 (`CardComponent` 全稀有度)

**界面描述**：4张卡牌横排，gold/silver/copper/stone 稀有度，深色背景。

**视觉问题**：
1. **`RARITY_STYLES` 中用 `border-yellow-400`、`bg-yellow-950/30`**：Tailwind 默认色，不在 token 系统内。
2. **`COMPACT_RARITY` 中大量内联 rgba 字符串**：glow shadow 无法复用。
3. **卡牌描述英文 "A mysterious traveler from distant lands"**：提示数据层面还在用英文占位符。
4. **整体卡面底色太暗**（`bg-black/50` 等），标签 `bg-gray-800` 非 token 颜色。
5. **属性行字体没有使用 display font**，用的是系统默认。

---

## 二、现有 Token 系统分析

### 已定义 Token（`src/renderer/styles/index.css` + `tokens.ts`）

```
颜色:
  --color-leather:        #1a0f0a   (深棕黑，主背景深色)
  --color-leather-light:  #2a1810   (浅一档深棕)
  --color-parchment:      #d4c5a9   (宣纸色，主文字底色)
  --color-parchment-light:#e8dcc8   (浅宣纸，高光)
  --color-gold:           #c9a84c   (主要金色，强调/标题)
  --color-gold-bright:    #f0d060   (亮金，悬停高亮)
  --color-gold-dim:       #8a6d2b   (暗金，边框/次级)
  --color-crimson:        #8b1a1a   (朱砂红，危险/强调)
  --color-crimson-dark:   #6b0f0f   (深朱砂)
  --color-brass:          #b8860b   (黄铜，第三色)
  --color-ink:            #1a1a2e   (墨蓝黑，深色UI)
  --color-ink-light:      #252540   (浅墨蓝)

阴影:
  --shadow-gold-sm/gold/gold-lg: 金色辉光

字体:
  --font-display: 'Ma Shan Zheng', serif   (马善政，展示标题)
```

### 缺失 Token（需补充）

```
语义色（未定义）：
  背景层级: bg-surface-base / bg-surface-raised / bg-surface-overlay
  文字层级: text-primary / text-secondary / text-muted / text-disabled
  交互状态: color-interactive / color-interactive-hover
  状态色: color-success / color-warning / color-danger / color-info
  边框: border-default / border-strong / border-subtle

正文字体（未定义）：
  --font-body: (中文正文字体)
  --font-ui:   (UI标签字体)

间距系统（全靠 Tailwind 默认）
圆角系统（混用 rounded/rounded-lg/rounded-xl/rounded-full）
动效 token（未定义 transition duration/easing）
```

---

## 三、设计方向定位

### 核心视觉语言

**水墨北凉** — 以下四个维度构建统一风格：

| 维度 | 方向 | 关键词 |
|------|------|--------|
| 色彩 | 宣纸褪色调、水墨灰黑、朱砂点缀、旧金铜绿 | 不饱和、有温度、克制 |
| 字体 | 马善政/手写毛笔（标题）+ 宋体/Source Han（正文） | 古典感但可读 |
| 材质 | 宣纸纹、青铜铸造、水墨晕染、木纹竹简 | 有机感、历史感 |
| 动效 | 泼墨扩散、卷轴展开、印章按压 | 慢而有力 |

### 禁止使用

- ❌ 蓝色（`blue-*`）作为主要UI状态色 → 改用青墨、竹青
- ❌ 绿色（`green-*`）作为成功/完成色 → 改用竹绿（`#5a7a3a`）或宣纸暗调
- ❌ 纯黑/纯白 → 用 leather（深棕黑）和 parchment（宣纸白）
- ❌ `Inter`、`Roboto`、`Arial` → 中文场景无意义
- ❌ 紫色渐变、霓虹色 → 与水墨调性冲突
- ❌ `fontFamily: 'serif'`（裸写）→ 必须用 `font-[family-name:var(--font-display)]`

---

## 四、完整 Design Token 方案

### 4.1 颜色系统

#### 基础色板（Raw Palette）

```
墨（ink）系列 — 深色背景、暗部：
  ink-950: #0a0a12   极深墨黑
  ink-900: #1a1a2e   墨蓝黑（现有 ink）
  ink-800: #252540   浅墨蓝（现有 ink-light）
  ink-700: #363655   更浅墨蓝

皮革（leather）系列 — 主背景暗调：
  leather-950: #0e0806  极深棕黑
  leather-900: #1a0f0a  深棕（现有 leather）
  leather-800: #2a1810  棕（现有 leather-light）
  leather-700: #3d2418  中棕
  leather-600: #5a3520  浅棕

宣纸（parchment）系列 — 浅色底、文字：
  parchment-50:  #f5f0e8   极浅宣纸白
  parchment-100: #ede5d4   浅宣纸
  parchment-200: #e8dcc8   宣纸（现有 parchment-light）
  parchment-300: #d4c5a9   标准宣纸（现有 parchment）
  parchment-400: #c4b594   深宣纸
  parchment-500: #b0a07e   旧纸黄

金（gold）系列 — 强调色：
  gold-100: #f0d060   亮金（现有 gold-bright）
  gold-200: #e8c44c   金黄
  gold-300: #c9a84c   标准金（现有 gold）
  gold-400: #b8860b   黄铜（现有 brass）
  gold-500: #8a6d2b   暗金（现有 gold-dim）
  gold-600: #6a5020   更暗金

朱砂（crimson）系列 — 危险/紧迫：
  crimson-300: #d44040  亮朱砂
  crimson-500: #8b1a1a  标准朱砂（现有 crimson）
  crimson-700: #6b0f0f  深朱砂（现有 crimson-dark）
  crimson-900: #3d0808  极深朱砂

竹青（bamboo）系列 — 成功/完成（替代 green）：
  bamboo-300: #8ab06a  浅竹绿
  bamboo-500: #5a7a3a  标准竹青
  bamboo-700: #3d5525  深竹青
  bamboo-900: #1e2d10  极深竹青

青墨（cerulean）系列 — 信息/进行中（替代 blue）：
  cerulean-300: #5a8080 浅青墨
  cerulean-500: #2d5555 标准青墨
  cerulean-700: #1a3535 深青墨
```

#### 语义色（Semantic Tokens）

```
背景层级：
  bg-game:          leather-900  (#1a0f0a)   游戏主背景
  bg-surface:       leather-800  (#2a1810)   面板/卡片背景
  bg-surface-raised: leather-700 (#3d2418)   悬浮/高层面板
  bg-overlay:       parchment-300 (#d4c5a9)  宣纸底弹窗

文字层级：
  text-primary:     parchment-200 (#e8dcc8)  主要文字（在深色背景上）
  text-secondary:   parchment-400 (#c4b594)  次要文字
  text-muted:       parchment-500/50%        弱化文字
  text-disabled:    parchment-500/30%        禁用文字
  text-on-paper:    leather-900   (#1a0f0a)  宣纸上的文字（深色）
  text-on-paper-secondary: leather-700/65%  宣纸上次要文字

交互色：
  color-primary:    gold-300      (#c9a84c)  主要交互/强调
  color-primary-hover: gold-100  (#f0d060)  悬停态
  color-primary-dim: gold-500    (#8a6d2b)  暗态/未激活

状态色：
  color-danger:     crimson-500  (#8b1a1a)   危险/行刑倒计时
  color-danger-bright: crimson-300 (#d44040) 醒目危险
  color-success:    bamboo-500   (#5a7a3a)   完成/已参与
  color-success-bright: bamboo-300 (#8ab06a) 亮完成
  color-info:       cerulean-500 (#2d5555)   进行中/信息
  color-info-bright: cerulean-300 (#5a8080)  亮信息
  color-warning:    gold-400     (#b8860b)   警告（用金铜）

边框：
  border-default:   gold-500/30%  (#8a6d2b 30%) 标准边框
  border-strong:    gold-300/50%  (#c9a84c 50%) 强调边框
  border-subtle:    leather-700/40% 极淡边框
  border-paper:     parchment-400/40% 宣纸内边框
```

### 4.2 字体系统

```
标题字体（展示）：
  --font-display: 'Ma Shan Zheng', 'STKaiti', 'KaiTi', serif
  用途：地名、场景名、标题、按钮文字
  特点：毛笔楷书，有力度感

正文字体：
  --font-body: 'Source Han Serif CN', 'Noto Serif SC', 'SimSun', serif
  用途：场景描述、叙事文字、卡牌说明
  特点：宋体衬线，可读性强，古典感

UI 字体：
  --font-ui: 'Source Han Sans CN', 'Noto Sans SC', 'PingFang SC', sans-serif
  用途：状态标签、数值显示、图例说明
  特点：黑体无衬线，小尺寸清晰

等宽字体（数值）：
  --font-mono: 'Source Code Pro', 'Consolas', monospace
  用途：骰子结果、数值计算展示

字号规范：
  text-hero:    48-72px  游戏标题
  text-h1:      28-36px  界面主标题（地名）
  text-h2:      20-24px  场景名、弹窗标题
  text-h3:      16-18px  面板标题
  text-body:    14px     正文描述
  text-sm:      12px     次要说明、标签
  text-xs:      10-11px  状态提示、图例

行高规范：
  leading-tight:   1.4   标题
  leading-normal:  1.6   UI文字
  leading-relaxed: 1.8   正文描述（适合中文阅读）
  leading-loose:   2.0   叙事段落

字间距：
  tracking-tight:  -0.02em  数值展示
  tracking-normal: 0        正文
  tracking-wide:   0.1em    UI标签
  tracking-widest: 0.3em    装饰性标题
```

### 4.3 间距系统

```
基础单位：4px

组件内间距：
  space-1:  4px   内部微间距
  space-2:  8px   元素间最小间距
  space-3:  12px  常用内边距
  space-4:  16px  标准内边距
  space-5:  20px  宽松内边距
  space-6:  24px  section间距
  space-8:  32px  大区域间距

圆角规范（武侠风应减少圆角，方中带圆）：
  rounded-none: 0      方角（竹简、印章）
  rounded-sm:   2px    微圆（徽章、标签）
  rounded:      4px    标准（卡牌、面板）
  rounded-md:   6px    中等（按钮、输入）
  rounded-lg:   8px    大（弹窗容器）
  ※ 避免使用 rounded-xl (12px) 以上，会显得过于现代
  ※ 避免 rounded-full 除了圆形宝石槽

容器尺寸：
  卡牌(compact): w-28 h-48  (112×192px)
  卡牌(standard): w-48      (192px)
  面板最小宽: 280px
  弹窗最大宽: 860px
  HUD高度: 48px
  手牌区高度: 200-240px
```

### 4.4 阴影系统

```
墨色投影（暗色界面用）：
  shadow-ink-sm:  0 2px 8px rgba(0,0,0,0.3)
  shadow-ink:     0 4px 16px rgba(0,0,0,0.4)
  shadow-ink-lg:  0 8px 32px rgba(0,0,0,0.5)

金色辉光（强调/激活态）：
  shadow-gold-sm: 0 0 8px rgba(201,168,76,0.2)
  shadow-gold:    0 0 20px rgba(201,168,76,0.3)
  shadow-gold-lg: 0 0 40px rgba(201,168,76,0.4)

稀有度辉光：
  shadow-rarity-gold:   0 0 16px rgba(234,179,8,0.25), 0 0 32px rgba(234,179,8,0.10)
  shadow-rarity-silver: 0 0 14px rgba(156,163,175,0.20)
  shadow-rarity-copper: 0 0 12px rgba(180,83,9,0.18)
  shadow-rarity-stone:  0 0 8px rgba(120,113,108,0.12)

危险辉光：
  shadow-danger:  0 0 16px rgba(139,26,26,0.3)
  shadow-danger-bright: 0 0 20px rgba(212,64,64,0.4)
```

### 4.5 动效规范

```
基础时长：
  duration-fast:    150ms  悬停反馈
  duration-normal:  250ms  状态切换
  duration-slow:    400ms  面板进入
  duration-story:   600ms  叙事节拍

缓动曲线：
  ease-out-back:  [0.34, 1.56, 0.64, 1]  弹性弹出（卡牌出现）
  ease-in-out:    [0.4, 0, 0.2, 1]       平滑切换
  ease-spring:    [0.22, 1, 0.36, 1]     弹簧效果（已用于 CardDetailPanel）

水墨特效建议：
  骰子投掷: 泼墨扩散 + 涟漪
  卡牌进场: 从水墨晕染中显现
  场景切换: 水墨遮幕扫过
  结算结果: 印章按下效果
```

### 4.6 组件规范

#### 按钮

```
主要按钮 (Button primary):
  背景: SVG 描边背景（现有 BtnPrimary SVG）
  文字颜色: gold (#c9a84c) → hover: gold-bright (#f0d060)
  ※ 不要用实色填充背景，保持水墨镂空感

次要按钮 (Button secondary):
  背景: SVG 描边背景（现有 BtnSecondary SVG）
  文字颜色: gold-dim (#8a6d2b)

幽灵按钮 (ghost):
  无背景，文字 gold，hover 文字 gold-bright
  可加下划线装饰

图标按钮 (icon):
  圆形 SVG 边框（现有 CircleFrame）
  尺寸: sm=32px, md=40px, lg=48px

※ 直接用 <button> 标签时必须遵守以下限制：
  - 仅限调试/快速原型
  - 生产代码必须用 Button 组件

禁止的按钮写法:
  ❌ bg-gray-800/60 border border-amber-900/40 rounded-lg  (TitleScreen)
  ❌ bg-amber-900/40 border border-amber-600/40 rounded-lg (WorldMapScreen)
  → 都应替换为 <Button> 组件
```

#### 卡片/面板

```
信息面板 (Panel dark):
  背景: bg-ink/90 + backdrop-blur-sm
  边框: border border-gold-dim/30
  圆角: rounded-lg (8px)

宣纸面板 (Panel parchment):
  背景: bg-parchment-texture（渐变宣纸）
  文字: text-on-paper (leather)
  边框: border border-parchment-400/40

悬浮面板 (glass):
  背景: bg-leather/60 + backdrop-blur-md
  边框: border border-gold-dim/20

弹窗容器:
  最大宽: 860px
  边框: 根据稀有度/主题变色
  阴影: shadow-ink-lg + 主题辉光
  圆角: rounded-xl (现有) → 建议改为 rounded-lg

※ 所有面板不要用 rounded-2xl 以上
```

#### 状态标签

```
可参与:   bg-gold/10    border-gold-dim/40    text-gold
进行中:   bg-cerulean/10 border-cerulean-500/30 text-cerulean-300
已完成:   bg-bamboo/10  border-bamboo-700/30  text-bamboo-300
未解锁:   bg-leather/20 border-leather-700/20 text-muted
危险/警告: bg-crimson/10 border-crimson/30    text-crimson
```

#### HUD 资源栏

```
容器: bg-black/70 to-transparent 渐变 (保持现有)
天数: 字体 font-display, 颜色 text-gold
行刑倒计时: 字体 font-display, 正常 text-gold, ≤3天 text-danger animate-pulse
金: 颜色 text-gold, 标签 text-gold-dim/60
声望: 颜色 text-cerulean-300 (替换 text-blue-200)
数值: 字体 font-mono 或 font-display
```

---

## 五、截图对应的风格问题汇总

| 问题 | 当前 | 应改为 | 涉及文件 |
|------|------|--------|---------|
| 标题英文 SULTAN | `text-7xl text-amber-400 font-bold` | `font-display` + 中文题字 | TitleScreen |
| 标题 fontFamily 硬编码 | `fontFamily: 'serif'` | `font-display` CSS类 | 全局8处 |
| 声望用蓝色 | `text-blue-200/text-blue-400` | `text-cerulean-300` | WorldMapScreen, LocationScreen, ResourceBar |
| 完成状态用绿色 | `text-green-300/green-800/30` | `text-bamboo-300/bamboo-700/30` | MapScreen, LocationScreen |
| 按钮不用Button组件 | 裸 `<button>` 硬编码 | `<Button variant="primary">` | TitleScreen, WorldMapScreen |
| 卡牌稀有度边框非token | `border-yellow-400/gray-300` | `border-rarity-gold/silver` | CardComponent |
| 状态标签蓝绿混用 | `border-blue-500/30 text-blue-400` | `border-cerulean-500/30 text-cerulean-300` | LocationScreen |
| 卡牌描述英文 | "A mysterious traveler..." | 实际中文数据 | 数据层 |
| 结算标题颜色 | `text-amber-950` | `text-leather` (token) | EventSettlementFrame |
| 卡牌辉光内联rgba | `0 0 24px rgba(234,179,8,0.25)` | `shadow-rarity-gold` token | CardComponent, CardDetailPanel |
