# 游戏素材规格文档

## 一、通用规范

### 1.1 文件格式
| 类型 | 格式 | 说明 |
|------|------|------|
| 静态图片 | PNG | 支持透明通道，无损压缩 |
| 背景图片 | JPG/WebP | 不需要透明时使用，文件更小 |
| 矢量图标 | SVG | UI图标优先使用，支持缩放 |
| 序列帧动画 | PNG序列 / WebP | 命名格式：`name_001.png` |
| 音频 | OGG / MP3 | OGG优先（体积小），MP3兼容性好 |
| 背景音乐 | OGG / MP3 | 循环点需无缝衔接 |

### 1.2 命名规范
```
[类别]_[子类别]_[名称]_[变体].[扩展名]

示例：
ui_frame_dialog_gold.png        # UI-边框-对话框-金色
icon_attr_combat.svg            # 图标-属性-战斗
card_char_protagonist_01.png    # 卡牌-角色-主角-变体1
bg_scene_palace.jpg             # 背景-场景-宫殿
sfx_ui_click.ogg                # 音效-UI-点击
bgm_map_explore.ogg             # 背景音乐-地图-探索
```

### 1.3 目录结构
```
assets/
├── ui/
│   ├── frames/          # 边框素材
│   ├── buttons/         # 按钮素材
│   ├── panels/          # 面板背景
│   └── decorations/     # 装饰元素
├── icons/
│   ├── attributes/      # 属性图标
│   ├── functions/       # 功能图标
│   ├── card_types/      # 卡牌类型图标
│   └── status/          # 状态图标
├── cards/
│   ├── characters/      # 角色立绘
│   ├── items/           # 物品插图
│   ├── backs/           # 卡背
│   └── frames/          # 卡牌边框
├── scenes/
│   ├── backgrounds/     # 场景背景
│   └── elements/        # 场景元素
├── map/
│   ├── background/      # 地图底图
│   ├── nodes/           # 节点图标
│   └── decorations/     # 地图装饰
├── effects/
│   ├── particles/       # 粒子特效
│   └── sequences/       # 序列帧动画
├── audio/
│   ├── bgm/             # 背景音乐
│   └── sfx/             # 音效
└── fonts/               # 字体文件
```

---

## 二、UI素材规格

### 2.1 边框素材 (9-slice)

9-slice切片允许边框自由拉伸而不变形。

| 素材名 | 尺寸 | 切片边距 | 用途 |
|--------|------|----------|------|
| `frame_dialog_gold` | 128×128 px | 上下左右各32px | 对话框边框 |
| `frame_dialog_simple` | 96×96 px | 24px | 简单对话框 |
| `frame_panel` | 64×64 px | 16px | 信息面板 |
| `frame_button` | 48×32 px | 12px | 按钮边框 |
| `frame_tooltip` | 32×32 px | 8px | 提示框 |

**9-slice 切片示意：**
```
┌────┬────────────┬────┐
│ TL │     T      │ TR │  ← 角部不拉伸
├────┼────────────┼────┤
│ L  │   CENTER   │ R  │  ← 中心区域拉伸
├────┼────────────┼────┤
│ BL │     B      │ BR │
└────┴────────────┴────┘
```

### 2.2 按钮素材

| 素材名 | 尺寸 | 状态 |
|--------|------|------|
| `btn_confirm_normal` | 120×48 px | 正常 |
| `btn_confirm_hover` | 120×48 px | 悬停 |
| `btn_confirm_pressed` | 120×48 px | 按下 |
| `btn_confirm_disabled` | 120×48 px | 禁用 |
| `btn_cancel_*` | 120×48 px | 同上4种状态 |
| `btn_icon_*` | 48×48 px | 图标按钮 |

### 2.3 背景纹理 (可平铺)

| 素材名 | 尺寸 | 说明 |
|--------|------|------|
| `tex_parchment` | 256×256 px | 羊皮纸，无缝平铺 |
| `tex_leather` | 256×256 px | 皮革，无缝平铺 |
| `tex_wood` | 256×256 px | 木纹，无缝平铺 |
| `tex_metal` | 128×128 px | 金属质感 |

### 2.4 装饰元素

| 素材名 | 尺寸 | 说明 |
|--------|------|------|
| `deco_corner_gold` | 64×64 px | 金色角花 (4个方向各1个或旋转使用) |
| `deco_divider` | 256×16 px | 分隔线 |
| `deco_gear_*` | 32-64 px | 齿轮装饰 |
| `deco_rope` | 32×256 px | 绳索边框 (可平铺) |

---

## 三、图标素材规格

### 3.1 属性图标

| 图标名 | 尺寸 | 文件名 |
|--------|------|--------|
| 体魄 | 32×32 px | `icon_attr_physique.svg` |
| 魅力 | 32×32 px | `icon_attr_charm.svg` |
| 智慧 | 32×32 px | `icon_attr_wisdom.svg` |
| 战斗 | 32×32 px | `icon_attr_combat.svg` |
| 社交 | 32×32 px | `icon_attr_social.svg` |
| 生存 | 32×32 px | `icon_attr_survival.svg` |
| 隐匿 | 32×32 px | `icon_attr_stealth.svg` |
| 魔力 | 32×32 px | `icon_attr_magic.svg` |
| 支持 | 32×32 px | `icon_attr_support.svg` |
| 重投 | 32×32 px | `icon_attr_reroll.svg` |

**设计要求：**
- 风格统一，线条粗细一致
- 单色设计，方便着色
- 在16px下仍可辨认

### 3.2 功能图标

| 图标名 | 尺寸 | 文件名 |
|--------|------|--------|
| 金币 | 32×32 px | `icon_func_gold.svg` |
| 声望 | 32×32 px | `icon_func_reputation.svg` |
| 处刑日 | 32×32 px | `icon_func_execution.svg` |
| 回溯 | 32×32 px | `icon_func_rewind.svg` |
| 俺寻思 | 32×32 px | `icon_func_think.svg` |
| 金骰子 | 32×32 px | `icon_func_golden_dice.svg` |

### 3.3 UI操作图标

| 图标名 | 尺寸 | 文件名 |
|--------|------|--------|
| 确认 | 24×24 px | `icon_ui_confirm.svg` |
| 取消 | 24×24 px | `icon_ui_cancel.svg` |
| 关闭 | 24×24 px | `icon_ui_close.svg` |
| 暂停 | 24×24 px | `icon_ui_pause.svg` |
| 自动 | 24×24 px | `icon_ui_auto.svg` |
| 帮助 | 24×24 px | `icon_ui_help.svg` |
| 设置 | 24×24 px | `icon_ui_settings.svg` |
| 存档 | 24×24 px | `icon_ui_save.svg` |

### 3.4 地图节点图标

| 图标名 | 尺寸 | 文件名 |
|--------|------|--------|
| 战斗 | 48×48 px | `icon_node_combat.png` |
| 商店 | 48×48 px | `icon_node_shop.png` |
| 事件 | 48×48 px | `icon_node_event.png` |
| 休息 | 48×48 px | `icon_node_rest.png` |
| 任务 | 48×48 px | `icon_node_quest.png` |
| 未知 | 48×48 px | `icon_node_unknown.png` |

---

## 四、卡牌素材规格

### 4.1 卡牌尺寸

**基准尺寸（游戏内显示）：**
| 场景 | 宽度 | 高度 | 比例 |
|------|------|------|------|
| 手牌栏缩略图 | 80 px | 120 px | 2:3 |
| 场景中展示 | 160 px | 240 px | 2:3 |
| 详情弹窗 | 320 px | 480 px | 2:3 |

**原始素材尺寸（用于导出）：**
| 素材类型 | 尺寸 | 说明 |
|----------|------|------|
| 角色立绘 | 512×768 px | 2:3比例，PNG透明背景 |
| 物品插图 | 256×256 px | 正方形，居中构图 |
| 卡牌边框 | 320×480 px | 含透明区域用于叠加插图 |
| 卡背 | 320×480 px | 完整不透明 |

### 4.2 卡牌边框

| 稀有度 | 文件名 | 主色调 |
|--------|--------|--------|
| 金 | `card_frame_gold.png` | #FFD700 金色 |
| 银 | `card_frame_silver.png` | #C0C0C0 银色 |
| 铜 | `card_frame_copper.png` | #B87333 铜色 |
| 石 | `card_frame_stone.png` | #808080 灰色 |

**边框结构：**
```
┌─────────────────────┐
│ [稀有度徽章]        │ ← 左上角，独立素材叠加
├─────────────────────┤
│                     │
│   [插图区域]        │ ← 透明，用于放置立绘/物品图
│   (200×280 px)      │
│                     │
├─────────────────────┤
│ [属性区域]          │ ← 半透明底色
├─────────────────────┤
│ [标签区域]          │
└─────────────────────┘
```

### 4.3 角色立绘规范

| 要求 | 规格 |
|------|------|
| 尺寸 | 512×768 px |
| 格式 | PNG (透明背景) |
| 构图 | 半身像或全身像，人物居中 |
| 留白 | 上方留10%空间给稀有度徽章 |
| 风格 | 手绘/厚涂，阿拉伯风格服饰 |

**命名规则：**
```
card_char_[角色ID]_[变体].png

示例：
card_char_protagonist_01.png    # 主角-变体1
card_char_sultan_angry.png      # 苏丹-愤怒状态
card_char_merchant_01.png       # 商人
card_char_beast_lion.png        # 野兽-狮子
```

### 4.4 物品插图规范

| 要求 | 规格 |
|------|------|
| 尺寸 | 256×256 px |
| 格式 | PNG (透明背景) |
| 构图 | 物品居中，占画面60-80% |
| 风格 | 与角色风格统一 |

**命名规则：**
```
card_item_[类型]_[物品ID].png

示例：
card_item_weapon_scimitar.png   # 武器-弯刀
card_item_armor_leather.png     # 防具-皮甲
card_item_accessory_ring.png    # 饰品-戒指
card_item_consumable_potion.png # 消耗品-药水
card_item_book_rain.png         # 书籍-雨之子
card_item_gem_diamond.png       # 宝石-钻石
```

---

## 五、场景素材规格

### 5.1 场景背景

| 要求 | 规格 |
|------|------|
| 尺寸 | 1920×1080 px (16:9) |
| 格式 | JPG (质量85%) 或 WebP |
| 风格 | 阿拉伯建筑、沙漠、集市等 |

**命名规则：**
```
bg_scene_[场景类型]_[编号].jpg

示例：
bg_scene_palace_01.jpg          # 宫殿场景1
bg_scene_market_01.jpg          # 集市场景
bg_scene_desert_01.jpg          # 沙漠场景
bg_scene_shop_equipment.jpg     # 装备商店
```

### 5.2 大地图

| 素材 | 尺寸 | 说明 |
|------|------|------|
| 地图底图 | 2560×1440 px | 可滚动，沙漠/古地图风格 |
| 节点底座 | 64×64 px | 金色圆形徽章 |
| 路径线 | 可平铺 | 虚线或实线 |
| 装饰物 | 各异 | 建筑剪影、骆驼、棕榈树等 |

---

## 六、动画素材规格

### 6.1 骰子动画

| 素材 | 规格 | 说明 |
|------|------|------|
| D10骰子面 | 10张，64×64 px | 1-10点数 |
| 滚动序列帧 | 30帧，64×64 px | 命名：`dice_roll_001.png` ~ `dice_roll_030.png` |
| 爆骰特效 | 20帧，128×128 px | 金色闪光 |

### 6.2 卡牌特效

| 素材 | 规格 | 说明 |
|------|------|------|
| 卡牌获得 | 15帧，256×256 px | 光芒扩散 |
| 卡牌升级 | 20帧，256×256 px | 向上箭头+光效 |
| 检定成功 | 15帧，128×128 px | 绿色对勾+粒子 |
| 检定失败 | 15帧，128×128 px | 红色叉+粒子 |

---

## 七、音频素材规格

### 7.1 背景音乐

| 文件名 | 时长 | BPM | 说明 |
|--------|------|-----|------|
| `bgm_title.ogg` | 2-3分钟 | 80-100 | 主菜单，神秘氛围 |
| `bgm_map_explore.ogg` | 3-4分钟 | 90-110 | 地图探索，轻松冒险 |
| `bgm_scene_tension.ogg` | 2-3分钟 | 100-120 | 紧张场景 |
| `bgm_shop.ogg` | 2-3分钟 | 80-100 | 商店，轻快 |
| `bgm_battle.ogg` | 2-3分钟 | 120-140 | 战斗检定 |
| `bgm_victory.ogg` | 30-60秒 | - | 胜利结局 |
| `bgm_defeat.ogg` | 30-60秒 | - | 失败结局 |

**格式要求：**
- OGG Vorbis，质量6-8
- 采样率：44100 Hz
- 立体声
- 循环音乐需设置无缝循环点

### 7.2 音效

| 文件名 | 时长 | 说明 |
|--------|------|------|
| `sfx_ui_click.ogg` | <0.3s | 按钮点击 |
| `sfx_ui_confirm.ogg` | <0.5s | 确认操作 |
| `sfx_ui_cancel.ogg` | <0.3s | 取消操作 |
| `sfx_ui_hover.ogg` | <0.2s | 悬停提示 |
| `sfx_card_flip.ogg` | <0.5s | 卡牌翻转 |
| `sfx_card_place.ogg` | <0.3s | 卡牌放置 |
| `sfx_card_draw.ogg` | <0.3s | 抽卡 |
| `sfx_dice_roll.ogg` | 1-2s | 骰子滚动 |
| `sfx_dice_stop.ogg` | <0.3s | 骰子停止 |
| `sfx_check_success.ogg` | <1s | 检定成功 |
| `sfx_check_fail.ogg` | <1s | 检定失败 |
| `sfx_gold_gain.ogg` | <0.5s | 获得金币 |
| `sfx_gold_spend.ogg` | <0.5s | 消耗金币 |
| `sfx_achievement.ogg` | 1-2s | 成就解锁 |
| `sfx_day_pass.ogg` | <1s | 时间流逝 |
| `sfx_notification.ogg` | <0.5s | 通知提示 |

**格式要求：**
- OGG Vorbis，质量5-7
- 采样率：44100 Hz
- 单声道或立体声
- 音量标准化到 -6dB

---

## 八、字体规格

### 8.1 推荐字体

| 用途 | 中文字体 | 英文字体 | 备选 |
|------|----------|----------|------|
| 标题 | 思源宋体 Heavy | Cinzel | 方正清刻本悦宋 |
| 正文 | 思源黑体 Regular | Lato | 苹方 |
| 数字 | DIN Alternate | Oswald | Roboto Mono |

### 8.2 字体文件

```
fonts/
├── SourceHanSerifSC-Heavy.otf    # 标题中文
├── SourceHanSansSC-Regular.otf   # 正文中文
├── Cinzel-Bold.ttf               # 标题英文
├── Lato-Regular.ttf              # 正文英文
└── DINAlternate-Bold.ttf         # 数字
```

**注意：使用前确认字体授权！**
- 思源字体：SIL Open Font License (免费商用)
- Google Fonts：大部分免费商用
- 其他字体需购买授权

---

## 九、交付检查清单

### 9.1 静态素材检查
- [ ] 尺寸符合规格
- [ ] 命名符合规范
- [ ] PNG透明通道正确
- [ ] 无白边/黑边
- [ ] 压缩后文件大小合理

### 9.2 动画素材检查
- [ ] 序列帧编号连续
- [ ] 帧率标注（通常24fps或30fps）
- [ ] 循环动画首尾衔接

### 9.3 音频素材检查
- [ ] 格式正确（OGG优先）
- [ ] 音量标准化
- [ ] 无爆音/底噪
- [ ] BGM循环点无缝

---

## 十、素材清单汇总

| 类别 | 数量 | 优先级 |
|------|------|--------|
| UI边框/纹理 | ~20件 | P1 |
| 属性/功能图标 | ~30个 | P1 |
| UI操作图标 | ~10个 | P1 |
| 卡牌边框 | 4套 | P1 |
| 角色立绘 | 50-80张 | P1 |
| 物品插图 | 80-100张 | P2 |
| 场景背景 | 20-30张 | P2 |
| 地图素材 | ~15件 | P2 |
| 动画特效 | ~10组 | P3 |
| BGM | 7-10首 | P2 |
| 音效 | 20-30个 | P2 |
| 字体 | 3-5套 | P1 |

**总计：约 250-350 件素材**
