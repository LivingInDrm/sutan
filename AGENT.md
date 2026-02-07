# Agent 开发备忘

## 素材处理规范

### 图片压缩

所有游戏素材图片（立绘、物品等）统一压缩到 **512x910 (4x清晰度)**，保留 RGBA 透明通道。

**命令：**
```bash
# 单张处理
sips -Z 910 input.png --out output.png

# 批量处理目录下所有 PNG
cd <目标目录> && for f in *.png; do sips -Z 910 "$f" --out "$f"; done
```

`-Z 910` 表示按最长边等比缩放到 910px，宽度自动计算（原始 1152x2048 → 512x910）。

### 素材目录结构

```
src/renderer/assets/
  portraits/     # 人物立绘（角色卡用）
  items/         # 物品图片（装备/消耗品/宝石等）
  textures/      # 背景纹理（rice-paper, ink-wash, silk, bronze）
  ui/            # UI 框架素材（SVG）
```

### 命名规范

- 人物立绘：`figure01.png`, `figure02.png`, ...
- 物品图片：`item_<类型>_<编号>.png`，如 `item_sword_01.png`, `item_scimitar_01.png`
- 纹理：`<材质>-<分辨率>.webp`，如 `rice-paper-512.webp`

### 卡牌数据配置

卡牌数据定义在 `src/renderer/data/configs/cards/base_cards.json`，通过 `image` 字段指定图片路径（方案A：写完整相对路径）。

## 组件开发规范

### 共享常量

属性标签、图标、卡牌类型等映射定义在 `src/renderer/ui/constants/labels.ts`，新增属性或类型时在此文件统一维护。

### 可复用 UI 组件

| 组件 | 路径 | 说明 |
|------|------|------|
| AttrBadge | `components/common/AttrBadge.tsx` | 属性徽章，支持 default/bonus/compact 三种变体 |
| SectionTitle | `components/common/SectionTitle.tsx` | 段落标题 + 金色分隔线 |
| DecoratedFrame | `components/common/DecoratedFrame.tsx` | 装饰边框（ornate/default/simple） |
| Panel | `components/common/Panel.tsx` | 面板容器（dark/parchment/glass） |
| Button | `components/common/Button.tsx` | 按钮 |

### Design Tokens

定义在 `src/renderer/styles/index.css` 和 `src/renderer/ui/theme/tokens.ts`，核心色系：leather、gold、ink、parchment、crimson。
