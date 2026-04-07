# AI辅助游戏 UI/UX 诊断与改进调研报告

> 项目：`sutan`
>  
> 目标：为水墨风武侠卡牌游戏建立一套“截图诊断 → 建议生成 → 人工确认 → 落地修改 → 回归验证”的可复用工作流。
>  
> 调研日期：2026-04-07

---

## 1. 结论先行

### 1.1 核心判断

1. **目前没有一个“上传截图后自动给出靠谱游戏 UI 结论”的单一 AI 工具可以直接替代设计师。**
2. **GPT-4o / Claude 这类多模态模型，适合做“结构化 UI critique（批评式诊断）”，不适合做“像素级质量判定”或“自动替你定最终美术风格”。**
3. **真正实用的方案不是找一个神奇工具，而是把现有栈组合起来：**
   - `Ladle` 负责稳定出图
   - `GPT-4o / Claude` 负责截图诊断
   - `Tailwind token + 共享组件` 负责把建议变成一致实现
   - `Chromatic / Percy / Applitools` 负责回归检查
4. 对 `sutan` 来说，**当前最值得先解决的不是“做更多好看的素材”，而是先解决“风格定义冲突 + token 漏出 + 组件层不统一”**。否则 AI 每次都会给出看起来合理、但互相不一致的建议。

### 1.2 推荐策略

- **P0 推荐**：先上“Ladle 截图 + GPT-4o/Claude 结构化审查 + 人工确认 + 组件级修复”
- **P1 推荐**：再接入 `Chromatic` 或 `Percy` 做 Story 级视觉回归
- **P2 推荐**：最后再考虑 `Attention Insight` 一类注意力/热力工具，作为“信息层级验证”的补充
- **不推荐作为主链路**：`Uizard / Visily` 这类 screenshot-to-mockup 工具，不适合作为 `sutan` 的主方案，它们更适合低保真产品草图，不适合高风格化游戏 UI

---

## 2. 适合本项目的工具清单

> 说明：下面按“对 `sutan` 的实际价值”排序，而不是按市场热度排序。

| 工具 | 链接 | 主要能力 | 适合做什么 | 局限 | 费用/价格信息 | 对 `sutan` 结论 |
|---|---|---|---|---|---|---|
| GPT-4o | https://developers.openai.com/api/docs/models/gpt-4o | 图像+文本输入，多模态推理，适合结构化点评 | 看界面截图，输出“配色/层级/间距/字体/风格一致性”诊断 | 不是像素检测器；易受提示词质量影响；对交互动线判断有限 | 官方文档显示支持 text+image 输入；OpenAI API 定价页提供公开 token 定价 | **强烈推荐，做主分析器** |
| Claude | https://platform.claude.com/docs/en/about-claude/pricing | 多模态理解强，长文本总结和归纳稳 | 对一组界面图做跨页面风格总结、给改版优先级 | 也不是专业 design lint；没有内建视觉回归能力 | 官方公开模型 token 定价；视觉按模型 token 体系计费 | **强烈推荐，适合作第二意见或长报告生成** |
| Design Lint | https://lintyour.design/ | Figma 设计 lint，找缺失样式和不规范样式 | 如果后续把关键页面沉淀到 Figma，可用于查 style 漏洞 | 只覆盖 Figma 设计稿，不直接审查运行中 React UI | 免费、开源 | **推荐作为设计稿补充，不是主链路** |
| Chromatic | https://www.chromatic.com/ | Storybook/Ladle/组件视觉回归、交互测试、审阅流 | 对共享组件、关键状态做 PR 级回归 | 只能告诉你“变了”，不告诉你“审美上是不是更好” | 免费档 5,000 snapshots/月；付费 Starter 起 | **强烈推荐，适合组件化回归** |
| Percy | https://www.browserstack.com/percy | 视觉回归，DOM snapshot，多浏览器 diff | 页面或组件改动后的视觉比对 | 偏 QA，不给审美建议 | 官方提供 free trial，具体价格在 pricing 页 | **推荐，适合页面级回归** |
| Applitools Eyes | https://applitools.com/platform/eyes/ | AI 视觉回归，动态内容处理，跨浏览器 UI 检查 | 后续页面更复杂时做稳定回归 | 更偏测试平台，接入成本高于 Chromatic/Percy | 官方有 free trial；正式价格偏销售报价 | **中期可考虑，当前不是最优先** |
| Attention Insight | https://attentioninsight.com/ | AI 预测注意力热图、清晰度评分、对比分析 | 检查“玩家第一眼看哪”“主要 CTA 是否被看到” | 更适合营销页/页面信息层级，不会直接给你完整游戏风格方案 | 14 天试用；Basic/Pro/Hero 按月收费 | **有价值，但只适合作辅助量化** |
| Uizard | https://uizard.io/ | screenshot-to-mockup、低保真生成、快速原型 | 快速试几版功能布局 | 输出更偏产品原型，不适合高风格化武侠 UI | Free / Pro / Business / Enterprise | **不建议作为主方案** |
| Visily | https://www.visily.ai/pricing/ | AI 界面生成、Figma 导出、原型辅助 | 快速试布局、草图探索 | 同样更偏 SaaS/产品草图，不适合你当前的美术方向 | Starter 免费；Pro/Business/Enterprise | **不建议作为主方案** |
| Game UI Database | https://www.gameuidatabase.com/ | 大量游戏 UI 截图索引、分类、色彩/结构参考 | 做 benchmark、找参考、校准风格 | 不是 AI 工具，不会自动诊断 | 免费 | **强烈推荐，做对标库** |

### 2.1 工具选型建议

如果只允许选一套最务实的组合：

1. **GPT-4o 或 Claude**：负责诊断
2. **Ladle**：负责稳定截图
3. **Chromatic**：负责组件回归
4. **Game UI Database**：负责参考校准

---

## 3. GPT-4o / Claude 做截图分析，效果如何？

## 3.1 能做好什么

多模态模型在下面这些任务上已经**足够有用**：

- 发现明显的**视觉层级问题**
  - 标题不够突出
  - CTA 与正文抢注意力
  - 同级元素大小和权重不一致
- 发现明显的**风格混杂**
  - 水墨框体里混入现代 Web 按钮感
  - 字体、纹理、阴影语言不统一
- 发现明显的**排版问题**
  - 内边距不一致
  - 组块间距节奏混乱
  - 左右分栏失衡
- 发现明显的**可读性问题**
  - 宣纸底纹压字
  - 金色字在浅底上对比不足
  - 信息密度过大
- 做**跨多张图的共性总结**
  - “地图页和结算页不是一个世界观”
  - “组件风格统一，但页面布局还未统一”

## 3.2 做不好的地方

它们目前不适合直接做下面这些事：

- 像素级规范验证
- 精确替代视觉设计师判断“这个边框是不是更高级”
- 独立推断完整交互流问题
- 单凭一张图就判断真实可用性
- 自动生成能直接上线的高完成度游戏美术方案

### 3.3 实践结论

最合适的定位是：

> **AI 不是“审美终审官”，而是“高质量结构化初审员”。**

最有效的用法不是：

> “你觉得这张图好不好看？”

而是：

> “请按视觉层级、配色一致性、字体系统、间距系统、组件一致性、主题契合度、可读性、交互暗示这 8 项输出问题列表，并给出可执行修改建议。”

---

## 4. 游戏 UI 设计最佳实践

## 4.1 卡牌游戏与高信息密度 UI 的核心原则

综合卡牌设计与游戏 UI 资料，最稳定的一组原则是：

### 原则一：Visibility（可见性）

- 玩家最常看的信息必须最容易看到
- 标题、费用、稀有度、关键数值不能埋进装饰里
- 玩家手持/拖拽/缩放/列表浏览时，仍要能快速识别卡牌

### 原则二：Hierarchy（层级）

- 不是所有元素都同等重要
- 每张卡、每个面板都必须明确：
  - 第一眼看什么
  - 第二眼看什么
  - 第三眼再看什么

### 原则三：Brevity（简洁）

- 高密度游戏 UI 最怕“什么都想说”
- 能用图标/关键词代替的，不要堆完整句
- 能通过 hover/tooltip 显示的，不要常驻

### 原则四：Critical Focus Area（关键视线区保护）

- 游戏 UI 不该遮住玩家真正关心的区域
- 对 `sutan` 来说，关键视线区通常是：
  - 地图中的地点/路径/事件节点
  - 卡牌细节中的卡面主体信息
  - 剧情/结算界面的标题 + 正文 + 主要选项

### 原则五：Contextual UI（上下文显示）

- 不要所有信息永远常驻
- 某些说明应在 hover / focus / expanded state 出现
- 页面要有“默认态”和“细节态”

---

## 4.2 中国风 / 水墨武侠 UI 的常见反模式

这类项目最常见的问题不是“不够中国风”，而是**中国风元素过量使用**。

### 反模式一：装饰比信息更抢眼

- 金边、云纹、朱砂、毛笔字都很好
- 但如果所有角、边、标题、按钮都在发光，层级就会塌掉

### 反模式二：把“水墨”理解成“低对比”

- 水墨不等于灰、糊、淡
- 真正的问题通常是：
  - 背景纹理太重
  - 正文字体太细
  - 金字压在浅纹理上

### 反模式三：字体系统失控

- 毛笔字体适合：
  - 页标题
  - 章节名
  - 特殊强调
- 不适合：
  - 大段正文
  - 小尺寸数值
  - 高频功能按钮

### 反模式四：组件语义不清

- 主按钮、次按钮、危险按钮、确认按钮如果都长得“差不多华丽”，玩家很难建立操作预期

### 反模式五：美术语言混杂

- 水墨边框 + 现代蓝紫发光 + 网页琥珀色数字 + 西式 serif，是典型混搭失控

---

## 4.3 小团队最有效的 UI 改进方法论

对独立团队最有用的不是大而全设计系统，而是下面这套“轻量闭环”：

### 方法 1：先收敛视觉语言，再收敛页面

顺序应该是：

1. 先定主题语法
2. 再定 token
3. 再定共享组件
4. 最后再改页面

如果反过来做，会出现：

- 每次修页面都像重新设计
- AI 也会因为缺少基准而输出风格飘移建议

### 方法 2：用“组件状态矩阵”代替拍脑袋调样式

例如按钮不应该只有一个“好不好看”的版本，而应有：

- primary / secondary / danger / confirm
- default / hover / active / disabled / loading
- compact / default / large

### 方法 3：把“审美问题”改写成“可检查规则”

例如：

- “看起来有点乱”  
  → 同层级区块间距是否一致？
- “风格不统一”  
  → 是否存在 token 外颜色 / 字体 / 阴影？
- “没重点”  
  → 页面第一视觉焦点是否唯一？

### 方法 4：每次只解决一个层面的问题

一次改版不要同时改：

- 配色
- 布局
- 字体
- 素材
- 动效

否则很难判断到底哪项变好或变坏。

---

## 5. design system 应该怎么建，才能防止风格不一致？

## 5.1 设计系统最小可行结构

对 `sutan`，不需要一开始就做完整 Figma Design System，可以先做代码侧最小闭环：

### 第一层：Design Tokens

最少包含：

- color
- typography
- spacing
- radius
- shadow/glow
- texture usage
- z-index/elevation

### 第二层：Semantic Tokens

不要只停留在 `gold-500 / space-4`，应补一层语义：

- `color.text.primary`
- `color.text.muted`
- `color.surface.panel`
- `color.surface.parchment`
- `color.action.primary`
- `color.border.ornate`
- `shadow.focus`
- `spacing.section`
- `spacing.cardInset`

### 第三层：Shared Components

优先统一：

- `Button`
- `Panel`
- `DecoratedFrame`
- `SectionTitle`
- `AttrBadge`
- `ResourceBar`
- 卡牌标题区 / 卡牌信息区 / 选项按钮区

### 第四层：Page Recipes

比组件更上一层的页面配方：

- 标题页 recipe
- 地图页 recipe
- 剧情页 recipe
- 结算页 recipe
- 卡牌详情页 recipe

它的价值在于：

- 不同页面仍像同一游戏
- AI 审查时也能按 recipe 对照

---

## 6. 结合 `sutan` 现状的诊断

> 本节基于当前仓库文档与 UI 代码扫描。

## 6.1 当前已有基础

`sutan` 并不是从零开始，已经具备不错的基础设施：

- React + Tailwind
- `Ladle` 已可用于组件展示
- 已有共享组件：
  - `Button`
  - `Panel`
  - `DecoratedFrame`
  - `AttrBadge`
  - `SectionTitle`
- 已有 token 文件：
  - `src/renderer/ui/theme/tokens.ts`
  - `src/renderer/styles/index.css`
- 已有 UI 素材管理方案文档
- 已有截图与参考图文档

这意味着：**你缺的不是“基础能力”，而是“把能力串成稳定流程”。**

## 6.2 当前最明显的问题

### 问题一：视觉方向文档存在冲突

仓库内有明显冲突：

- `docs/ui/visual_style.md` 仍描述为  
  **“阿拉伯/中东风格 + 暗黑奇幻 + 蒸汽朋克”**
- `docs/design/ui_assets_plan.md` 已明确转向  
  **“Q版卡通水墨风，《雪中悍刀行》武侠题材”**

这会直接导致：

- 设计建议无基准
- AI 分析时无法判断“什么算风格一致”
- 页面可能局部沿用旧方向，局部进入新方向

### 问题二：token 已有，但风格仍大量直接写死

代码扫描显示：

- UI 目录下约 **42** 个 TS/TSX UI 文件
- Story 文件约 **13** 个
- 存在约 **66** 处 `style={{ ... }}` 内联样式
- 存在约 **94** 处十六进制颜色直接出现
- 至少 **8** 处直接写 `fontFamily: 'serif'`

这意味着当前问题不是“没有 token”，而是：

- **token 没有成为唯一真相源**
- 页面和 story 里仍存在风格逃逸

### 问题三：组件统一度优于页面统一度

共享组件本身已经开始收敛，但页面层仍有很多局部手写：

- `WorldMapScreen`
- `LocationScreen`
- `TitleScreen`
- `HandArea`
- 一些 Dice playground / story

这类页面容易出现：

- 额外渐变
- 临时字体
- 临时 glow
- 页面自己定义的色板

### 问题四：缺少“截图级审查”的固定流程

当前有组件故事和文档，但缺少固定链路：

- 谁截图
- 用哪套 prompt 审查
- 结果怎么落成 action items
- 如何验证修改没破坏别的页面

这就是为什么当前工作流更像“人工来回调”，而不是“半自动闭环”。

---

## 7. 对 `sutan` 的具体建议

## 7.1 最值得先解决的三个问题

### P0-1：先统一视觉宪法

先做一件很小但收益极高的事：

> **把 `docs/ui/visual_style.md` 与当前“水墨武侠”方向重新统一。**

明确写清：

- 世界观关键词
- 允许的颜色家族
- 标题/正文/数字分别用什么字体
- 哪些页面可以用重装饰，哪些页面必须克制
- 允许的 glow/shadow 上限

这是所有后续 AI 诊断的“准绳”。

### P0-2：先收紧 token 出口

目标不是立刻重构所有页面，而是先规定：

- 新增 UI 不允许再写 token 外颜色
- 主页面字体不允许直接写 `'serif'`
- 共享 glow/shadow 必须走统一命名
- 关键页面先做一次“去硬编码”整理

### P0-3：把审查从“主观感觉”改成“固定 rubric”

建议把 AI 审查固定成 8 个维度：

1. 主题契合度
2. 视觉层级
3. 信息密度
4. 配色与对比度
5. 间距一致性
6. 字体系统
7. 组件一致性
8. 交互暗示明确性

输出格式统一为：

- 问题
- 严重程度
- 修改建议
- 建议修改位置
- 是否适合自动化执行

---

## 7.2 推荐的 AI 辅助工作流

下面这套是针对 `sutan` 当前栈可直接落地的方案。

### 阶段 A：建立“可审查截图源”

#### 步骤 A1：选 5 个核心审查对象

优先：

1. `TitleScreen`
2. `WorldMapScreen`
3. `SceneScreen`
4. `SettlementScreen`
5. `CardDetailPanel`

这 5 个对象已经足以覆盖：

- 页面级风格
- 卡牌级风格
- 文本可读性
- 高密度信息布局

#### 步骤 A2：为每个对象补齐稳定状态

在 `Ladle` 中保证每个对象至少有：

- default
- dense content
- hover/selected
- empty / loading（如适用）

目的不是给玩家看，而是给 AI 审查和回归测试看。

### 阶段 B：AI 截图诊断

#### 步骤 B1：固定 prompt 模板

推荐 prompt 结构：

1. 项目背景：水墨武侠卡牌游戏
2. 当前页面目标：例如“地图浏览”“剧情阅读”“卡牌详情决策”
3. 审查维度：8 项 rubric
4. 输出要求：
   - 先列问题
   - 再给修改建议
   - 最后按 ROI 排序

#### 步骤 B2：要求 AI 输出结构化 JSON

建议格式：

```json
{
  "screen": "WorldMapScreen",
  "summary": "一句话总结",
  "issues": [
    {
      "severity": "high",
      "category": "hierarchy",
      "problem": "页面第一视觉焦点不明确",
      "evidence": "时间、标题、地图节点都在抢眼",
      "suggestion": "降低顶部标题对比度，强化当前地点态，压低背景亮部",
      "targets": ["src/renderer/ui/screens/WorldMapScreen.tsx"],
      "auto_fix_candidate": true
    }
  ]
}
```

这样后续才能：

- 直接转 issue
- 转成 agent 任务
- 人工筛选后执行

### 阶段 C：人工设计确认

不要让 AI 直接改所有建议。

每轮只选：

- **1 个页面级问题**
- **1 个组件级问题**
- **1 个 token 级问题**

这样收益最高，也最容易回滚。

### 阶段 D：自动执行

对可自动化的建议，优先改：

- token
- 共享组件
- 页面 spacing
- 页面 typography

不要优先让 AI 直接生成整页新视觉稿。

### 阶段 E：回归验证

至少做两层：

1. **AI 二次审查**
   - 看问题是否改善
2. **视觉回归**
   - `Chromatic` 或 `Percy`
   - 看有没有误伤其他状态

---

## 8. 为什么这个工作流对 `sutan` 的投入产出比最高？

## 8.1 低投入点

你已经有：

- React
- Tailwind
- Ladle
- 共享组件
- 文档体系

因此不需要：

- 先搭完整 Figma 流程
- 先做企业级设计系统
- 先引入复杂无代码平台

## 8.2 高产出点

这套工作流的高 ROI 在于：

- 把“感觉不对”翻译成“可执行问题”
- 把一次性修补变成可复用规则
- 把审美讨论沉淀进 token / component / recipe

## 8.3 不建议走的路线

### 路线一：直接依赖 screenshot-to-design 工具出新稿

问题：

- 很可能失去已有代码结构优势
- 输出偏通用产品 UI
- 不适合高风格化水墨武侠方向

### 路线二：一开始就重做完整设计系统

问题：

- 过重
- 容易停在文档而不落地
- 小团队维护成本高

### 路线三：只做视觉回归，不做审美诊断

问题：

- 只能知道“变了没有”
- 不能知道“为什么不好看”

---

## 9. 同类项目与参考资源

## 9.1 参考方向

### 1）Game UI Database

- 价值最高的不是“照抄”，而是：
  - 看不同卡牌/策略/叙事游戏如何分层
  - 看 HUD / 地图 / 详情页如何分配注意力
  - 看不同风格游戏如何控制装饰量

### 2）卡牌设计方法论

重点参考原则：

- Visibility
- Hierarchy
- Brevity

这些原则对数字卡牌和实体卡牌都成立。

### 3）独立团队常用方法

独立团队通常不是靠大而全系统，而是靠：

- benchmark 板
- story/state 截图
- 周期性 critique
- 小步改版
- 共享组件收敛

这与 `sutan` 当前情况高度匹配。

## 9.2 可借鉴但不应直接照搬的资源

- Figma 社区 UI kits
- itch.io GUI 资源包
- 通用 fantasy UI pack

它们的价值主要是：

- 看结构
- 看层级
- 看按钮状态矩阵

不建议直接拿来做最终风格，因为很容易变成“泛 fantasy UI”而不是“水墨武侠”。

---

## 10. 建议的执行路线图

## 10.1 第 1 周：建立审查基线

### 目标

让团队第一次拥有“稳定截图 + 结构化审查结果”。

### 行动

1. 统一 `docs/ui/visual_style.md` 到水墨武侠方向
2. 为 5 个核心页面/组件整理 Ladle story
3. 产出第一批截图
4. 用 GPT-4o / Claude 跑第一轮结构化审查
5. 把问题整理成 P0/P1/P2 列表

## 10.2 第 2 周：先收 token 和组件

### 目标

优先修“会污染所有页面”的问题。

### 行动

1. 清理最明显的硬编码颜色/字体/阴影
2. 给 `Button / Panel / DecoratedFrame` 补语义层级
3. 固化主标题、正文、数字、标签的 typography recipe
4. 让 AI 再审一次

## 10.3 第 3 周：接入视觉回归

### 目标

把“改坏了别的地方”这个风险降下来。

### 行动

1. 组件级接入 `Chromatic`
2. 或页面级接入 `Percy`
3. 把关键 story 设为回归基线

---

## 11. 行动项优先级排序

## P0（立刻做）

1. **统一视觉规范文档到“水墨武侠”**
2. **为 5 个核心页面/组件建立可复现截图基线**
3. **制定 AI 审查 prompt + JSON 输出 schema**
4. **把 AI 问题分类到 token / component / page 三层**
5. **优先清理页面中的硬编码字体、颜色、阴影出口**

## P1（很值得做）

6. **补齐页面 recipe：标题页 / 地图页 / 剧情页 / 结算页 / 卡牌详情页**
7. **接入 Chromatic 或 Percy 做视觉回归**
8. **建立 benchmark 板：Game UI Database + 项目自有截图对照**
9. **补一份“中文风格字体使用规范”**

## P2（有余力再做）

10. **引入 Attention Insight 做注意力热图辅助验证**
11. **把关键页面同步到 Figma，再用 Design Lint 审设计稿**
12. **探索 AI 辅助生成更多 UI 素材，但只在 token/recipe 稳定后进行**

---

## 12. 最终推荐方案

如果只选一个“既实用又不重”的方案，我的建议是：

### 推荐方案：`Ladle + GPT-4o/Claude + 共享组件整改 + Chromatic`

#### 具体步骤

1. 从 `Ladle` 导出关键页面/组件截图
2. 用固定 rubric 让 GPT-4o 或 Claude 输出结构化问题清单
3. 人工只挑 2~3 个高 ROI 问题
4. 优先在 token / shared component 层修
5. 用 `Chromatic` 做 story 级回归
6. 每周重复一次

#### 为什么最适合 `sutan`

- 利用现有技术栈
- 不依赖大团队
- 既能提升审美一致性，也能减少回归风险
- 可以逐步迭代，不需要一次性大投入

---

## 13. 附：对 `sutan` 当前阶段的直白建议

如果只能给一句最务实的话：

> **先别继续“凭感觉修页面”，先把风格规则统一、把截图审查跑起来、把共享组件收紧。**

因为当前最贵的问题不是“单个界面不好看”，而是：

> **每改一个界面，都可能在发明一套新的风格。**

而 AI 最能帮你的地方，恰恰就是：

> **把这种“说不清的不对劲”变成有条理的、可执行的修改清单。**

---

## 14. 参考来源

- OpenAI GPT-4o model docs: https://developers.openai.com/api/docs/models/gpt-4o
- OpenAI API Pricing: https://openai.com/api/pricing/
- Anthropic Claude Pricing: https://platform.claude.com/docs/en/about-claude/pricing
- Nielsen Norman Group, AI UX-Design Tools Are Not Ready for Primetime: https://www.nngroup.com/articles/ai-design-tools-not-ready/
- Design Lint: https://lintyour.design/
- Chromatic: https://www.chromatic.com/
- Chromatic Pricing: https://www.chromatic.com/pricing
- Percy: https://www.browserstack.com/percy
- Applitools Eyes: https://applitools.com/platform/eyes/
- Applitools Pricing: https://applitools.com/platform-pricing/
- Attention Insight: https://attentioninsight.com/
- Attention Insight Pricing: https://attentioninsight.com/billing-plans/
- Uizard: https://uizard.io/
- Uizard Pricing: https://uizard.io/pricing/
- Uizard Screenshot Scanner: https://uizard.io/screenshot-scanner/
- Visily Pricing: https://www.visily.ai/pricing/
- Game UI Database: https://www.gameuidatabase.com/
- GDKeys, The Card Games UI Design of Fairtravel Battle: https://gdkeys.com/the-card-games-ui-design-of-fairtravel-battle/
- Daniel Solis, Three Principles of Card Design: https://danielsolisblog.blogspot.com/2024/02/three-principles-of-card-design.html
