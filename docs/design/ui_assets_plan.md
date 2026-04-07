# UI素材管理方案设计文档

> 游戏风格：Q版卡通水墨风，《雪中悍刀行》武侠题材（北凉边塞）  
> 目标：用AI生成游戏UI素材，复用现有asset-manager素材管理平台

---

## 一、游戏UI结构盘点

### 1.1 界面/页面清单

| 界面 | 文件路径 | 功能说明 |
|------|----------|----------|
| 主标题界面 | `TitleScreen.tsx` | 开始/继续游戏、设置、退出 |
| 世界地图界面 | `WorldMapScreen.tsx` | 全境大地图，区域/据点选择 |
| 地图界面 | `MapScreen.tsx` | 具体地图，地点图标、路线 |
| 地点界面 | `LocationScreen.tsx` | 进入地点，NPC、建筑、可用行动 |
| 场景界面 | `SceneScreen.tsx` | 故事场景，角色立绘+对话叙事 |
| 对话界面 | `DialogScreen.tsx` | NPC对话、选项、叙事文本 |
| 商店界面 | `ShopScreen.tsx` | 卡牌买卖，道具补给 |
| 结算界面 | `SettlementScreen.tsx` | 回合/阶段结算，奖励展示 |

### 1.2 通用布局组件

| 组件 | 文件 | 功能 |
|------|------|------|
| 游戏主布局 | `GameLayout.tsx` | 顶部资源栏 + 主内容区 |
| 书页布局 | `BookLayout.tsx` | 双页书式布局（古籍风格） |
| 资源栏 | `ResourceBar.tsx` | 顶部HUD：金币/声望/行动点等资源 |
| 手牌区域 | `HandArea.tsx` | 底部手牌展示、分类Tab |

### 1.3 当前UI元素全盘点

#### 已有SVG素材（`src/renderer/assets/ui/`）

| 文件名 | 代码引用 | 用途 |
|--------|----------|------|
| Window3.svg | `FrameOrnate` | 华丽装饰边框（主对话框/面板） |
| Window5.svg | `FrameSimple` | 简约边框（次要面板） |
| Window7.svg | `FrameDefault` | 默认边框（通用面板） |
| Button2.svg | `BtnPrimary` | 主行动按钮 |
| Button3.svg | `BtnSecondary` | 次要按钮 |
| Button4.svg | `BtnConfirm` | 确认按钮 |
| Button7.svg | `BtnWide` | 宽幅按钮 |
| Divider1.svg | `DividerLine` | 分割线（横向） |
| Divider2.svg | `DividerAlt` | 分割线变体 |
| Decor3.svg | `DecorStar` | 星形装饰 |
| Decor4.svg | `DecorDiamond` | 菱形装饰 |
| Circle1.svg | `CircleFrame` | 圆形边框（头像/图标用） |

#### 已有纹理素材（`src/renderer/assets/textures/`）

| 文件名 | 用途 |
|--------|------|
| rice-paper-1024.webp | 卡牌详情面板背景纹理（高分辨率） |
| rice-paper-256.webp | 手牌区纸张叠加纹理 |
| ink-wash-256.webp | 手牌区水墨叠加纹理 |

#### 当前以CSS/代码实现的UI元素（尚无素材文件）

这些元素目前由代码（Tailwind + inline style）实现，可升级为AI生成素材：

- **卡牌底框** — CardComponent.tsx 用 CSS 圆角+渐变色模拟（按稀有度变色）
- **稀有度光晕** — CardDetailPanel.tsx 的 box-shadow glow 效果
- **属性标签** — AttrBadge.tsx 纯CSS pill
- **章节标题** — SectionTitle.tsx 文字+下划线
- **地点图标** — 地图POI用 CSS 圆点，无专属素材
- **宝石槽/装备槽** — 小SVG内联画的菱形/方块
- **Tab指示条** — 手牌Tab的激活指示线，纯CSS渐变

---

## 二、UI素材分类需求

### 2.1 素材分类总览

```
UI素材
├── A. 界面背景 (Backgrounds)          — 全屏/场景背景图
├── B. 窗口/面板边框 (Frames/Borders)   — 各类对话框、信息面板
├── C. 按钮/控件 (Buttons/Controls)    — 交互控件皮肤
├── D. 卡牌边框/底图 (Card Frames)     — 按稀有度分级的卡牌装饰
├── E. 图标集 (Icons)                  — 资源/属性/类型/地图图标
├── F. 装饰元素 (Decorations)          — 分割线、角落花纹、横幅
└── G. 纹理底图 (Textures)             — 宣纸、水墨、木纹等底纹
```

---

### A. 界面背景（Backgrounds）

**用途**：各主要界面的全屏背景图或半透明背景层。

| 编号 | 名称 | 对应界面 | 尺寸建议 | 优先级 |
|------|------|----------|----------|--------|
| BG-01 | 主标题背景 | TitleScreen | 1920×1080 | P0 |
| BG-02 | 世界地图底图 | WorldMapScreen | 2048×1536 | P0 |
| BG-03 | 北凉城地图底图 | MapScreen (北凉城) | 1600×1200 | P1 |
| BG-04 | 丘塬府地图底图 | MapScreen (丘塬府) | 1600×1200 | P1 |
| BG-05 | 地点入口背景 | LocationScreen | 1920×1080 | P1 |
| BG-06 | 商店场景背景 | ShopScreen | 1920×1080 | P1 |
| BG-07 | 结算界面背景 | SettlementScreen | 1920×1080 | P1 |
| BG-08 | 通用过渡背景 | 各界面切换 | 1920×1080 | P2 |

**估算数量：** ~8张（P0先做2张）

**风格要求：**
- Q版水墨风，横幅构图（16:9）
- 北凉边塞意境：雪山、要塞、大漠、草原
- 留白构图，中心区域需留空用于叠放UI元素
- 颜色：深青墨、故纸黄、北凉银白

---

### B. 窗口/面板边框（Frames/Borders）

**用途**：各类信息面板、对话框、弹出层的边框装饰。

| 编号 | 名称 | 当前对应 | 说明 | 优先级 |
|------|------|----------|------|--------|
| FR-01 | 主对话边框-竖幅 | Window3 (FrameOrnate) | 升级版，更精致的龙纹装饰 | P0 |
| FR-02 | 通用信息边框 | Window7 (FrameDefault) | 升级版，细线卷草纹 | P0 |
| FR-03 | 简约提示边框 | Window5 (FrameSimple) | 升级版，单线细边 | P1 |
| FR-04 | 卡牌详情大面板 | 无现有素材 | 860px宽，横幅双栏，宣纸质感 | P0 |
| FR-05 | 地点信息卡 | 无现有素材 | 地点介绍卡片边框 | P1 |
| FR-06 | 工具提示框 | 无现有素材 | 小型Tooltip边框 | P2 |
| FR-07 | 商店物品格 | 无现有素材 | 商品列表单元格边框 | P2 |
| FR-08 | 结算奖励框 | 无现有素材 | 奖励展示大型边框 | P2 |

**估算数量：** ~8款（含现有3款的升级版）

**风格要求：**
- SVG格式（保持矢量，可任意缩放）
- 水墨线条感，卷草/云纹/回字纹
- 配合宣纸纹理使用，四角可加花纹
- 金色/皮革色主调

---

### C. 按钮/控件（Buttons/Controls）

**用途**：游戏中所有交互控件的视觉皮肤。

| 编号 | 名称 | 当前对应 | 说明 | 优先级 |
|------|------|----------|------|--------|
| BTN-01 | 主行动按钮 | Button2 (BtnPrimary) | 升级：竹简风横条 | P0 |
| BTN-02 | 次要按钮 | Button3 (BtnSecondary) | 升级：细线竹简 | P1 |
| BTN-03 | 确认按钮 | Button4 (BtnConfirm) | 升级：朱砂红印风 | P0 |
| BTN-04 | 宽幅按钮 | Button7 (BtnWide) | 升级：横幅卷轴风 | P1 |
| BTN-05 | 关闭按钮 | 内联SVG | 武侠风×形关闭 | P1 |
| BTN-06 | 返回导航按钮 | 内联SVG | 水墨箭头风格 | P1 |
| BTN-07 | 对话选项按钮 | CSS实现 | 对话选项长条（悬停高亮） | P0 |
| BTN-08 | 图标按钮 | CSS实现 | 资源栏小图标按钮 | P2 |
| BTN-09 | 购买/出售按钮 | CSS实现 | 商店专用（有铜钱图案） | P2 |

**估算数量：** ~9款（含悬停/按下状态变体）

**风格要求：**
- SVG格式，支持颜色主题化（通过CSS currentColor）
- 文字区域留出足够空间
- 悬停态：略发光/印章效果
- 按下态：轻微下沉/颜色加深

---

### D. 卡牌边框/底图（Card Frames）

**用途**：替换/增强现有CSS实现的卡牌视觉。

| 编号 | 名称 | 对应稀有度 | 尺寸 | 优先级 |
|------|------|-----------|------|--------|
| CF-01 | 角色卡边框-石 | Stone | 112×192 | P1 |
| CF-02 | 角色卡边框-铜 | Copper | 112×192 | P1 |
| CF-03 | 角色卡边框-银 | Silver | 112×192 | P1 |
| CF-04 | 角色卡边框-金 | Gold | 112×192 | P0 |
| CF-05 | 装备卡边框-石 | Stone | 112×192 | P2 |
| CF-06 | 装备卡边框-铜 | Copper | 112×192 | P2 |
| CF-07 | 装备卡边框-银 | Silver | 112×192 | P2 |
| CF-08 | 装备卡边框-金 | Gold | 112×192 | P2 |
| CF-09 | 卡牌背面图案 | 通用 | 112×192 | P2 |
| CF-10 | 宝石槽装饰 | 通用 | 24×24 | P2 |
| CF-11 | 装备槽装饰 | 通用 | 24×24 | P2 |

**估算数量：** ~11款

**风格要求：**
- PNG/SVG格式，带透明背景
- 四个角有装饰性花纹，按稀有度繁简有别
- 金卡：龙纹金边；银卡：云纹银边；铜卡：回纹铜边；石卡：简素石边

---

### E. 图标集（Icons）

**用途**：资源栏、属性显示、卡牌类型标注、地图POI。

#### E1. 资源类图标

| 编号 | 图标 | 用于 | 优先级 |
|------|------|------|--------|
| IC-R01 | 金币 | 资源栏/商店 | P0 |
| IC-R02 | 声望 | 资源栏 | P0 |
| IC-R03 | 物资/粮草 | 资源栏 | P1 |
| IC-R04 | 行动点 | 资源栏 | P1 |
| IC-R05 | 情报/线索 | 资源栏 | P2 |

#### E2. 属性类图标（8维）

| 编号 | 属性 | 武侠含义 | 优先级 |
|------|------|----------|--------|
| IC-A01 | 武力(combat) | 刀剑 | P1 |
| IC-A02 | 体魄(physique) | 护甲 | P1 |
| IC-A03 | 智谋(wisdom) | 书卷 | P1 |
| IC-A04 | 社交(social) | 酒杯 | P1 |
| IC-A05 | 魅力(charm) | 玉佩 | P2 |
| IC-A06 | 生存(survival) | 弓箭 | P2 |
| IC-A07 | 支援(support) | 药瓶 | P2 |
| IC-A08 | 复运(reroll) | 八卦 | P2 |

#### E3. 卡牌类型图标

| 编号 | 类型 | 图标方向 | 优先级 |
|------|------|----------|--------|
| IC-T01 | 人物(character) | 人形剪影 | P1 |
| IC-T02 | 装备(equipment) | 宝刀/护甲 | P1 |
| IC-T03 | 物品(intel/consumable) | 卷轴 | P2 |
| IC-T04 | 宝石(gem) | 宝石 | P2 |
| IC-T05 | 思念(thought) | 云朵 | P2 |

#### E4. 地图POI图标

| 编号 | 地点类型 | 图标方向 | 优先级 |
|------|----------|----------|--------|
| IC-M01 | 城池/县城 | 城墙塔楼 | P0 |
| IC-M02 | 村落 | 茅草屋 | P1 |
| IC-M03 | 关隘/要塞 | 关城 | P1 |
| IC-M04 | 山脉 | 山峰 | P1 |
| IC-M05 | 河流/渡口 | 波纹 | P2 |
| IC-M06 | 草场/牧场 | 马蹄 | P2 |
| IC-M07 | 商队/驿站 | 马车 | P2 |

**图标规格：** 32×32 ~ 64×64，PNG透明背景，水墨勾线风格

**估算数量：** ~25个图标

---

### F. 装饰元素（Decorations）

**用途**：分割线、标题装饰、角落花纹、横幅。

| 编号 | 名称 | 当前对应 | 说明 | 优先级 |
|------|------|----------|------|--------|
| DC-01 | 横向分割线-细 | Divider1 | 升级：水墨笔触感 | P1 |
| DC-02 | 横向分割线-卷草 | Divider2 | 升级：卷草纹中段 | P1 |
| DC-03 | 标题装饰-左 | 无 | 章节标题左侧装饰 | P1 |
| DC-04 | 标题装饰-右 | 无 | 章节标题右侧装饰 | P1 |
| DC-05 | 角落花纹-左上 | 无 | 面板四角装饰 | P2 |
| DC-06 | 角落花纹-右上 | 无 | 面板四角装饰 | P2 |
| DC-07 | 标题横幅背景 | 无 | 界面标题/地名横幅 | P1 |
| DC-08 | 星形装饰 | Decor3 | 升级：更精致的水墨星 | P2 |
| DC-09 | 菱形装饰 | Decor4 | 升级：菱形花纹 | P2 |
| DC-10 | 圆形边框 | Circle1 | 升级：更精致头像框 | P1 |
| DC-11 | 印章/朱砂印 | 无 | 章节/重要信息装饰 | P2 |
| DC-12 | 水墨飞溅 | 无 | 过渡/特效装饰 | P3 |

**估算数量：** ~12款

---

### G. 纹理底图（Textures）

**用途**：面板背景叠加纹理，增强手绘质感。

| 编号 | 名称 | 当前状态 | 建议规格 | 优先级 |
|------|------|----------|----------|--------|
| TX-01 | 宣纸纹理-主 | rice-paper-1024.webp | 升级更精细 | P1 |
| TX-02 | 宣纸纹理-小 | rice-paper-256.webp | 当前可用 | — |
| TX-03 | 水墨晕染底 | ink-wash-256.webp | 当前可用 | — |
| TX-04 | 绢帛纹理 | 无 | 512×512 | P2 |
| TX-05 | 木纹纹理 | 无 | 512×512（商店用） | P2 |
| TX-06 | 青瓷纹理 | 无 | 512×512（高级面板） | P3 |
| TX-07 | 做旧羊皮 | 无 | 512×512（地图背景） | P2 |

**估算数量：** ~5款新增

---

## 三、素材优先级汇总

| 优先级 | 类别 | 数量 | 理由 |
|--------|------|------|------|
| **P0** | BG-01主标题背景、BG-02世界地图 | 2 | 首屏体验，立竿见影 |
| **P0** | FR-01对话边框、FR-04卡牌详情大面板 | 2 | 最高频使用界面 |
| **P0** | BTN-01主行动按钮、BTN-03确认按钮、BTN-07对话选项 | 3 | 核心交互控件 |
| **P0** | CF-04金色角色卡边框 | 1 | 最醒目的卡牌品质 |
| **P0** | IC-R01金币、IC-R02声望图标 | 2 | 资源栏常驻显示 |
| **P0** | IC-M01城池地图图标 | 1 | 地图必用 |
| **P1** | 剩余背景（5张）+边框（5款）+按钮（5款） | ~15 | 完整游戏体验 |
| **P2+** | 卡牌全套边框、属性图标全套、装饰元素 | ~30 | 精致化阶段 |

**P0总数：11个素材，建议第一批生成**

---

## 四、素材管理器扩展方案

### 4.1 方案选择：新增"UI工坊" Tab

**推荐方案：在现有`asset-manager`中新增第四个域 `ui`，采用Tab式扩展。**

不新建独立工具，原因：
- 生成引擎（gpt-image-1 + SSE）已通用化
- 图库/选图/部署流程已成熟
- 模板管理机制可直接复用
- `WorkshopTab.tsx` 已抽象为通用组件，只需传入不同配置

**Tab结构调整：**
```
现有: Characters | Items | Scenes
扩展: Characters | Items | Scenes | UI素材
```

### 4.2 UI域的数据架构（三层模型）

**遵循现有的生成层/编辑层/运行层分层架构：**

#### 生成层：`scripts/ui_batch_config.json`

```json
[
  {
    "type": "ui",
    "ui_category": "button",
    "name": "BTN-01-主行动按钮",
    "description": "水墨竹简风横条按钮，暖黄皮革色，两端竹节装饰，扁平感，SVG兼容",
    "output": "ui_button/btn_primary_v1.png",
    "spec": { "width": 200, "height": 48, "format": "png", "transparent": true }
  },
  {
    "type": "ui",
    "ui_category": "background",
    "name": "BG-01-主标题背景",
    "description": "北凉边塞全景，水墨风，雪峰、要塞、荒原，16:9横幅，暗色调，中心留白",
    "output": "ui_background/title_bg_v1.png",
    "spec": { "width": 1920, "height": 1080, "format": "png", "transparent": false }
  }
]
```

#### 编辑层：`scripts/ui_profiles.json`

```json
{
  "BTN-01-主行动按钮": {
    "ui_category": "button",
    "ui_subcategory": "action",
    "status": "approved",
    "target_path": "src/renderer/assets/ui/Button2.svg",
    "deploy_type": "replace",
    "notes": "替换现有Button2.svg，需保持SVG viewBox兼容",
    "selected_image": "/absolute/path/to/sample.png",
    "tags": ["button", "primary", "action"]
  }
}
```

#### 运行层：直接写入游戏UI资源目录

- `src/renderer/assets/ui/*.svg` — SVG素材（编译时打包）
- `src/renderer/assets/textures/*.webp` — 纹理贴图
- `src/renderer/public/ui-assets/` — 可热更新的UI素材（大图背景等）

### 4.3 前端扩展点

**新增文件：**
```
tools/asset-manager/frontend/src/
├── components/
│   ├── UIAssetList.tsx        # 左侧UI素材列表（按类别分组）
│   ├── UIAssetDetail.tsx      # 右侧详情（工坊+属性+部署）
│   └── UIAssetProfileEditor.tsx  # UI素材属性编辑表单
├── api/
│   └── uiAssets.ts            # UI素材专属API调用
└── types/
    └── uiAssets.ts            # UI素材类型定义
```

**`App.tsx` Tab扩展（最小侵入）：**
```tsx
// 现有
const TABS = ['characters', 'items', 'scenes'];
// 扩展为
const TABS = ['characters', 'items', 'scenes', 'ui'];
```

**`UIAssetList.tsx` 特性：**
- 左侧按 `ui_category` 折叠分组（背景/边框/按钮/卡牌/图标/装饰/纹理）
- 每类显示已完成数/总数（如"按钮 3/9"）
- 支持按优先级筛选（P0/P1/P2）
- 支持按状态筛选（待生成/已生成/已部署）

### 4.4 后端扩展点

**新增API端点（与现有风格一致）：**

```python
# 在 backend/main.py 中新增：

# 读取UI素材列表
GET /api/ui-assets

# 新建UI素材记录
POST /api/ui-assets

# 获取某素材详情
GET /api/ui-assets/{name}

# 更新编辑层数据（profile）
PUT /api/ui-assets/{name}/profile

# AI生成图片（复用现有 /api/generate）
POST /api/generate  # asset_type="ui" 已支持，只需确认模板

# 选图
POST /api/ui-assets/{name}/select-image

# 部署到游戏
POST /api/ui-assets/{name}/deploy
```

**新增数据文件路径常量：**
```python
UI_BATCH_CONFIG_PATH = PROJECT_ROOT / "scripts" / "ui_batch_config.json"
UI_PROFILES_PATH = PROJECT_ROOT / "scripts" / "data" / "ui_profiles.json"
UI_ASSETS_SRC_DIR = PROJECT_ROOT / "src" / "renderer" / "assets" / "ui"
UI_TEXTURES_SRC_DIR = PROJECT_ROOT / "src" / "renderer" / "assets" / "textures"
UI_PUBLIC_DIR = PROJECT_ROOT / "src" / "renderer" / "public" / "ui-assets"
```

**部署逻辑（`deploy_ui_asset`）：**
```python
def deploy_ui_asset(name: str):
    profile = _read_ui_profile(name)
    selected = profile.get("selected_image")
    target = profile.get("target_path")
    deploy_type = profile.get("deploy_type", "copy")
    
    if deploy_type == "replace":
        # 替换现有SVG（需要格式转换或直接覆盖PNG）
        shutil.copy(selected, PROJECT_ROOT / target)
    elif deploy_type == "add_new":
        # 写入新文件名
        dest = _resolve_next_filename(target)
        shutil.copy(selected, dest)
    elif deploy_type == "public":
        # 部署到public热更新目录
        shutil.copy(selected, UI_PUBLIC_DIR / profile["public_path"])
    
    # 更新profile状态
    profile["status"] = "deployed"
    _write_ui_profile(name, profile)
```

---

## 五、AI生成Prompt模板设计

### 5.1 基础系统提示（全局）

```
你是一个Q版卡通水墨风格的游戏UI设计师，专注于《雪中悍刀行》武侠题材。

## 美术风格规范
- 风格：Q版卡通 + 中国水墨 + 武侠意境（北凉边塞）
- 笔触：毛笔勾线，略带晕染，非写实
- 色调：故纸黄(#C8A86B) / 墨黑(#1a1207) / 北凉银白(#EAE0C8) / 朱砂红(#8B2020)
- 金属质感：錾金效果，非光泽金属
- 背景：PNG素材使用透明背景；背景图使用深色水墨渐变

## 输出技术要求
- 格式：PNG，高分辨率
- 透明背景（除背景图外）
- 简洁轮廓，适合游戏UI叠加
- 避免过于写实的3D效果
```

### 5.2 各类别Prompt模板

#### A. 界面背景模板

```
{system_prompt}

## 当前任务：游戏界面背景图
- 场景主题：{scene_name}
- 构图：16:9横幅，{composition_note}
- 必须元素：{required_elements}
- 氛围：{atmosphere}
- 技术要求：
  - 不透明背景
  - 中心区域留空（用于叠放UI面板）
  - 边缘可有水墨渐变装饰
  - 整体偏暗，避免抢占UI视觉焦点

## 变体描述
{description}
```

**变体示例（主标题背景 BG-01）：**
```json
[
  { "variant": 1, "description": "北凉边关，正面视角，铁门关高耸，远处雪峰，黄昏余晖，温暖雪地" },
  { "variant": 2, "description": "大漠孤烟，正面视角，荒原戈壁，孤树枯枝，冬日苍天，寒意肃杀" },
  { "variant": 3, "description": "北凉王府，俯瞰视角，大殿屋脊、重檐飞角，水墨晕染，留白大气" },
  { "variant": 4, "description": "战后雪原，侧面视角，残旗断矛，飘雪飞扬，沉重苍凉，史诗感强" }
]
```

---

#### B. 窗口/面板边框模板

```
{system_prompt}

## 当前任务：UI边框/面板素材
- 素材类型：{frame_type}（对话框/信息面板/卡牌边框）
- 尺寸比例：{aspect_ratio}
- 边框风格：{border_style}（卷草纹/回字纹/云纹/龙纹）
- 内容区：中心透明，四边为装饰边框
- 装饰级别：{decoration_level}（简/中/繁）

## 变体描述
{description}
```

**变体示例（卡牌详情大面板 FR-04）：**
```json
[
  { "variant": 1, "description": "宽幅横向面板，宣纸底，四角有金色云纹，顶部细线分割，古朴中正" },
  { "variant": 2, "description": "宽幅横向面板，绢帛底，四角龙纹盘绕，侧边有竹节装饰，华丽庄重" },
  { "variant": 3, "description": "宽幅横向面板，皮革纹底，铜钉边角，军旅风格，北凉铁军气质" }
]
```

---

#### C. 按钮/控件模板

```
{system_prompt}

## 当前任务：UI按钮素材
- 按钮类型：{button_type}（主行动/次要/确认/对话选项）
- 尺寸：{width}×{height}px
- 状态：{state}（normal/hover/pressed 三态，作为同一素材的变体生成）
- 风格：{button_style}（竹简/卷轴/印章/石碑）
- 文字区域：中央留出明显文字区

## 变体描述
{description}
```

**变体示例（主行动按钮 BTN-01）：**
```json
[
  { "variant": 1, "description": "竹简横条，暖黄底，两端竹节收口，水墨质感，normal态" },
  { "variant": 2, "description": "竹简横条，暖金底，两端竹节收口，轻微发光晕，hover态" },
  { "variant": 3, "description": "竹简横条，深褐底，两端竹节收口，略微下沉感，pressed态" },
  { "variant": 4, "description": "宽卷轴风，皮革底，展开卷轴两端，有绳索细节，alternative风格" }
]
```

---

#### D. 图标集模板

```
{system_prompt}

## 当前任务：UI图标素材（单个）
- 图标类型：{icon_type}（资源/属性/类型/地图POI）
- 画布尺寸：{canvas_size}px（透明背景）
- 图标风格：水墨勾线，小尺寸下仍清晰辨识
- 内容含义：{icon_meaning}
- 参考物象：{reference_object}（可选）

## 变体描述
{description}
```

**变体示例（金币图标 IC-R01）：**
```json
[
  { "variant": 1, "description": "铜钱造型，圆形方孔，水墨笔触，正面视角，暖金色" },
  { "variant": 2, "description": "金锭造型，马蹄形，水墨笔触，三分之二侧视，金色光泽" },
  { "variant": 3, "description": "铜钱+币堆组合，从上方俯视，写意笔触，多层叠放" }
]
```

---

#### E. 装饰元素模板

```
{system_prompt}

## 当前任务：UI装饰素材
- 装饰类型：{decor_type}（分割线/角落花纹/标题装饰）
- 方向/形状：{shape}（横向/竖向/角落L形/中心花）
- 宽高比：{aspect_ratio}
- 花纹主题：{pattern}（卷草纹/云纹/回字纹/竹节/流水）
- 密度：{density}（稀疏/适中/繁密）

## 变体描述
{description}
```

---

### 5.3 Prompt组装规则

UI素材的prompt组装方式与角色/物品有所不同，建议后端按如下逻辑拼装：

```python
UI_PROMPT_TEMPLATES = {
    "background": (
        "Chinese ink wash watercolor style game background, Q-version cartoon wuxia theme, "
        "Northern Liang borderland atmosphere (Xue Zhong Han Dao Xing). "
        "Horizontal 16:9 composition, dark ink tones, spacious center for UI overlay. "
        "{description}. "
        "High resolution, no UI elements, pure scenic background."
    ),
    "frame": (
        "Chinese ink wash style UI frame/border element, Q-version cartoon wuxia theme, "
        "transparent background PNG, {frame_style} pattern decoration, "
        "hollow center for content, {decoration_level} detail level. "
        "{description}. "
        "Clean edges, suitable for game UI, no text."
    ),
    "button": (
        "Chinese ink wash style UI button element, Q-version cartoon wuxia theme, "
        "transparent background PNG, {button_style} visual style, "
        "flat design with text area in center. "
        "{description}. "
        "Width {width}px height {height}px, clean silhouette."
    ),
    "icon": (
        "Chinese ink brush style icon, Q-version cartoon wuxia theme, "
        "transparent background PNG, {canvas_size}px canvas, "
        "representing {icon_meaning}. "
        "{description}. "
        "Simple, recognizable silhouette, works at small sizes."
    ),
    "decoration": (
        "Chinese ink wash decorative UI element, Q-version cartoon wuxia theme, "
        "transparent background PNG, {decor_type} shape, "
        "{pattern} pattern motif. "
        "{description}. "
        "Clean vector-friendly linework, no fill gradients."
    ),
    "texture": (
        "Seamless tileable texture for Chinese game UI, "
        "{texture_type} material ({texture_description}). "
        "Subtle, non-distracting, suitable for panel backgrounds. "
        "512×512px, neutral tones."
    ),
}
```

---

## 六、部署流程设计

### 6.1 UI素材的部署路径规则

不同类型的UI素材部署目标不同：

| 素材类型 | 部署目标 | 更新方式 |
|----------|----------|----------|
| 按钮/边框SVG | `src/renderer/assets/ui/` | 替换现有文件 or 新增 |
| 纹理贴图 | `src/renderer/assets/textures/` | 替换现有 or 新增 |
| 背景大图 | `src/renderer/public/ui-assets/` | 直接写入（可热更新） |
| 图标PNG | `src/renderer/assets/ui/icons/` | 新增 |
| 卡牌边框 | `src/renderer/assets/ui/cards/` | 新增 |

### 6.2 部署后的游戏集成

**新增SVG素材的集成方式：**
1. 生成PNG后，由设计师（或脚本）转换为SVG（trace）
2. 在 `src/renderer/ui/components/common/svg/index.ts` 中注册导出
3. 在对应组件中替换现有引用

**直接替换现有素材：**
1. 新生成的PNG直接覆盖 `src/renderer/assets/ui/` 中对应文件
2. 无需代码改动（webpack/vite会重新打包）

**新增背景图：**
1. 部署到 `src/renderer/public/ui-assets/bg_{name}.webp`
2. 在对应Screen组件中更新 `backgroundImage` 引用路径
3. 路径遵循现有 `assetPaths.ts` 规范

### 6.3 部署checklist

```
UI素材部署流程：
□ 1. 在UI工坊中选定最终图片（selected_image）
□ 2. 确认 profile 填写完整（target_path / deploy_type / format）
□ 3. 点击"预览部署"查看 target 路径和文件名
□ 4. 确认无冲突后，点击"一键部署"
□ 5. 系统执行：
   □ 复制文件到目标路径
   □ 更新 ui_profiles.json 状态 → "deployed"
   □ 若是SVG替换，检查viewBox兼容性警告
□ 6. 刷新游戏预览验证效果
```

---

## 七、实施路线图

### Phase 0：基础设施（复用现有，无代码改动）
- [x] 确认 `asset_type="ui"` 在现有generate API中可用
- [ ] 创建 `scripts/ui_batch_config.json`（11个P0素材的描述配置）
- [ ] 创建 `scripts/data/ui_profiles.json`（P0素材部署配置）
- [ ] 手动调用 `/api/generate` 测试生成P0素材

> **可以不等工具改造，先用脚本批量生成P0素材验证效果！**

### Phase 1：UI工坊Tab（约3~5天）
- [ ] 后端：新增`/api/ui-assets` CRUD API
- [ ] 后端：新增 `deploy_ui_asset` 部署逻辑
- [ ] 前端：新增 `UIAssetList.tsx` 带类别折叠
- [ ] 前端：新增 `UIAssetDetail.tsx`（工坊+属性+部署）
- [ ] 前端：在 `App.tsx` 中挂载第四个Tab

### Phase 2：批量生成P0素材（约2天）
- [ ] 在UI工坊中创建11个P0素材记录
- [ ] 为每个素材生成4个variant
- [ ] 选图并部署P0素材到游戏
- [ ] 在游戏中替换对应UI元素引用

### Phase 3：P1素材补全（约1周）
- [ ] 覆盖所有P1素材（~15个）
- [ ] 完善属性图标套装
- [ ] 地图POI图标全套

### Phase 4：精品化（按需）
- [ ] P2+素材（卡牌边框全套、装饰元素全套）
- [ ] 素材版本管理（多版本对比）
- [ ] 素材预览在游戏中的实时预览

---

## 八、关键决策记录

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 新增Tab vs 独立工具 | 新增Tab | 复用成熟的生成/图库/部署基础设施 |
| SVG vs PNG | 主要用PNG，必要时手动转SVG | gpt-image-1只能生成PNG；SVG需后期处理 |
| 热更新 vs 编译打包 | 背景大图走public/热更新；小素材走编译 | 大图需快速迭代；小SVG稳定后编译更优 |
| 集中管理 vs 分散 | 集中在ui_batch_config + ui_profiles | 与现有角色/物品体系保持一致 |
| 优先级策略 | P0先跑通11个，验证风格 | 避免大批量生成后风格不统一 |

---

*文档版本：v1.0*  
*创建日期：2026-04-06*  
*参考代码：`src/renderer/ui/` + `tools/asset-manager/`*
