# v2 Phase A 报告 — style_base 去泛黄

- 版本号：v2 (Phase A 实验轮，尚未正式定版)
- 实验日期：2026-04-18
- 前置基线：v1_20260418（Phase B1：description 注入 + bug 修复）
- 实验范围：**仅外层 templates.json**（style_base / style_negative，以及 A1/A2/A3 各自对应的辅助描述词）
- 生产代码改动：仅 `tools/asset-manager/scripts/eval_generate.py` 新增两个只读实验开关 `--templates-from` / `--descriptions-from`，**不影响生产链路任何默认行为**。
- description 层：3 个候选全部复用 `v1_20260418/{name}_variant_{i}.description.txt`，严格遵守单因子原则。

---

## 1. 实验结论速览（可直接给 Manager）

| 候选 | style_base 核心定位 | warm_signal mean | vs v1 降幅 | vs 目标(<0.05) | 视觉可看性 |
|------|--------------------|------------------|-----------|----------------|------------|
| v1（baseline） | 保留 gongbi + ink-wash + wuxia + classical Eastern | **0.2051** | 0% | 仍 bad 区 | 强黄 |
| **A1** 保留工笔 + 强反做旧 | gongbi-inspired + 追加 neutral/no-sepia/no-ivory | 0.1260 | −38% | mid 区，未达标 | 改善明显，仍有米黄 |
| **A2 ⭐ 换现代国风定位** | Modern Chinese illustration + flat shading + digital | **0.0916** | **−55%** | mid 区，仍未达标，但最接近 | 底色显著偏白/冷，视觉最干净 |
| **A3** 技法/底色解耦 | gongbi 仅用于人物线稿 + 底色强约束为 neutral white | 0.1142 | −44% | mid 区，未达标 | 改善居中，std 最大，稳定性偏差 |

### 推荐：**候选 A2**（换现代国风插画定位，根治方案）

**推荐理由**：
1. **warm_signal 降幅最大**（0.205 → 0.092，−55%），距 0.05 目标最近。
2. **单张最小值达到 -0.032**（真正进入 cool 区），说明模型是能画出"不泛黄"的图的；关键是 style_base 是否还在诱导做旧。A2 做到了诱导反转，A1/A3 的触发率更低。
3. **徐凤年、李淳罡已进入 good 区**（均值 0.04 / 0.01），这是 v1 里黄化最轻的两个角色；说明一旦风格锚点去掉"gongbi+classical"，容易做白底的角色就能被完全拉回。
4. **per-character std 合理**：0.083（A3 是 0.103，稳定性明显差），说明"现代插画"风格锚点带来的图之间变异可控。
5. **视觉锚点反而更清晰**：A2 虽然换了词，但 `contemporary xianxia illustration` 仍然保留了东方武侠气质（角色衣着、道具、姿态全部由 v1 description 锁定），不会出现"风格完全不搭"。
6. **不达标但最可能通过 Phase B2 联合优化**（例如 description 里的"ink-wash / wuxia atmosphere"气质词有可能仍在把模型往米黄拽；下一轮可考虑在 description 层补一条"avoid warm atmospheric wording"）。

### 不推荐 A1 / A3 的理由：

- **A1**：仅用"反做旧指令"去压 `gongbi + ink-wash + wuxia + classical Eastern aesthetics` 这组强锚点，收益有限（−38%）。证实了首轮根因假设第一条："反做旧文本压不过古画风格词的训练先验"。
- **A3**：表面上做了技法/底色解耦，但仍保留 `gongbi-style linework` 在 style_base 里，模型仍把底色一起做旧（老黄：0.200，接近 v1）。**std 0.103** 最大，部分图极好（-0.06）部分图仍然强黄（0.30），稳定性差。

### 不达标说明（诚实告知）

3 个候选都**没**达到 `< 0.05` 的 warm_signal 目标。A2 的 0.092 是目前已验证上限。不达标的结构性原因：

1. **description 层可能仍在贡献"warm" 气质词**。v1 description 内会出现例如"weary old retainer carriage"、"rakish young noble air"之类；模型可能把"老旧感"一起译到色温上。
2. **gpt-image-1 对"transparent + PNG"合成流程**在处理浅色肤/浅色衣物（老黄、温华）时倾向补 warm light，属于模型侧偏好，单靠 prompt 难以完全压回。
3. **std 0.08 仍偏大**：个别图（姜泥、温华）依然在 0.20 附近，这些是衣物本身色彩偏暖造成的"合法偏暖"，不是"底色做旧"；肉眼需要进一步分类。

**建议行动**：锁定 A2 为 v2 新 baseline，Phase B2 对 description 层做一轮"色温敏感词清扫"（删除/替换 `weary`, `sunset`, `golden`, `warm`, `ivory`-类词），再复测；若仍 >0.05，才考虑更换生成模型。

---

## 2. 三个候选 templates.json 的完整 diff（vs v1 生产 `tools/asset-manager/backend/templates.json`）

### v1 baseline（生产）
```3:3:tools/asset-manager/backend/templates.json
  "style_base": "Classical Chinese painting style character illustration, gongbi-inspired linework, refined ink-wash elegance, rich saturated colors on clean white ground, wuxia martial arts atmosphere, realistic human proportions, elegant full-body figure, classical Eastern aesthetics, restrained composition with generous negative space, transparent background, no background scenery, clean blank backdrop, clean and focused single-character composition",
```

### Candidate A1：保留工笔风 + 强反做旧指令
**改动**：
- `style_base`：在 v1 原文基础上，在 `... generous negative space,` 之后插入：`neutral color temperature, no yellow tint, no sepia, no aged paper effect, no ivory or cream background, pure white #FFFFFF negative space, modern color grading,`
- `style_negative`：追加 `no yellow tint, no sepia tone, no aged paper, no ivory background, no cream background, no paper texture, no rice paper look, no warm color cast`
- 其他字段：**未改**

文件：`tools/asset-manager/prompts/experiments/v2_A1_templates.json`

### Candidate A2 ⭐：现代国风插画定位（推荐）
**改动**：
- `style_base`：**整条重写** → `"Modern Chinese character illustration, contemporary xianxia illustration style, clean flat shading with crisp linework, rich saturated colors on pure white background, neutral color temperature, vibrant digital coloring, realistic human proportions, elegant full-body figure, restrained composition with generous negative space, transparent background, no background scenery, clean blank backdrop, clean and focused single-character composition"`
- **删除词**：`gongbi-inspired`, `refined ink-wash elegance`, `wuxia martial arts atmosphere`, `classical Eastern aesthetics`, `Classical Chinese painting style`
- **新增词**：`Modern Chinese character illustration`, `contemporary xianxia illustration style`, `clean flat shading`, `neutral color temperature`, `vibrant digital coloring`
- `style_negative`：与 A1 追加相同负面词，额外追加 `no classical Chinese painting look, no ink-wash background`
- 其他字段：**未改**

文件：`tools/asset-manager/prompts/experiments/v2_A2_templates.json`

### Candidate A3：技法与底色显式解耦
**改动**：
- `style_base`：重写为 → `"Character illustration with crisp gongbi-style linework for the figure itself, rendered on a pure neutral white background with modern digital color grading, no paper texture, no aging, no sepia, saturated palette, realistic human proportions, elegant full-body figure, restrained composition with generous negative space, transparent background, no background scenery, clean blank backdrop, clean and focused single-character composition. The linework technique applies ONLY to the character; the background and ambient color MUST remain pure neutral white with no warm tint."`
- 技法词 `gongbi-style linework` **仅保留一处**并显式绑定到 "for the figure itself"；底色描述独立为后半句，带一条明确的 MUST 规则
- `style_negative`：追加同 A1 负面词，额外追加 `no painted-on-silk look`
- 其他字段：**未改**

文件：`tools/asset-manager/prompts/experiments/v2_A3_templates.json`

---

## 3. 生成结果 & warm_signal 数据

### 3.1 路径 + OK/FAIL 数

| 候选 | 目录 | 图片张数 | OK | FAIL | wall time |
|------|------|---------|----|------|-----------|
| v2_A1 | `tools/asset-manager/generated/portrait-eval/v2_A1_20260418/` | 20 | 20 | 0 | 240.6s |
| v2_A2 | `tools/asset-manager/generated/portrait-eval/v2_A2_20260418/` | 20 | 20 | 0 | 278.3s |
| v2_A3 | `tools/asset-manager/generated/portrait-eval/v2_A3_20260418/` | 20 | 20 | 0 | 275.5s |

三轮均 100% 成功，断点续跑机制无需触发。

### 3.2 warm_signal 指标（定义：所有不透明像素上 `(R - B) / 255` 的均值）

| run | n | mean | std | median | min | max |
|-----|---|------|-----|--------|-----|-----|
| v0 | 20 | 0.2175 | 0.0620 | 0.2133 | 0.1063 | 0.3405 |
| v1 | 20 | 0.2051 | 0.0784 | 0.2186 | 0.0413 | 0.3043 |
| **A1** | 20 | 0.1260 | 0.0646 | 0.1360 | 0.0207 | 0.2502 |
| **A2** | 20 | **0.0916** | 0.0829 | 0.0838 | **−0.0321** | 0.2330 |
| **A3** | 20 | 0.1142 | 0.1031 | 0.1131 | −0.0641 | 0.2988 |

### 3.3 per-character mean warm_signal（越接近 0 越"不泛黄"）

| 角色 | v1 | A1 | A2 | A3 |
|------|-----|-----|-----|-----|
| 徐凤年 | 0.1474 | 0.0876 | **0.0415** ✔ | 0.0659 |
| 老黄 | 0.2486 | 0.1814 | **0.1495** | 0.2002 |
| 温华 | 0.2428 | 0.1493 | **0.1337** | 0.1579 |
| 姜泥 | 0.2357 | 0.1356 | **0.1240** | 0.1251 |
| 李淳罡 | 0.1512 | 0.0762 | **0.0093** ✔ | 0.0221 |

A2 对 **每个角色** 的降幅都是最大或并列最大；徐凤年、李淳罡已进入 `< 0.05` neutral 区。

### 3.4 分布（详见 HTML 对比页 histogram 部分）

- A2 直方图主峰在 `[0.05, 0.10)`，v1 主峰在 `[0.20, 0.25)`，整体分布左移 ~0.12。
- A2 / A3 均**首次出现 < 0 的样本**（v0/v1 全部 >0），证明模型在这些 prompt 下确实能画出"偏冷"的立绘。

---

## 4. 产物路径清单

### 本次新增（生产链路 0 改动，仅实验/脚本侧）
- `tools/asset-manager/prompts/experiments/v2_A1_templates.json`
- `tools/asset-manager/prompts/experiments/v2_A2_templates.json`
- `tools/asset-manager/prompts/experiments/v2_A3_templates.json`
- `tools/asset-manager/scripts/eval_warm_signal.py` — warm_signal 批量计算（PIL + NumPy）
- `tools/asset-manager/scripts/eval_compare_html.py` — 多 run 并排对比 HTML 生成器
- `tools/asset-manager/scripts/eval_generate.py` — 新增 `--templates-from` / `--descriptions-from`（仅实验开关，默认行为不变）

### 生成产物
- `tools/asset-manager/generated/portrait-eval/v2_A1_20260418/` (20 张 + manifest.json + summary.html)
- `tools/asset-manager/generated/portrait-eval/v2_A2_20260418/` (20 张 + manifest.json + summary.html)
- `tools/asset-manager/generated/portrait-eval/v2_A3_20260418/` (20 张 + manifest.json + summary.html)
- `tools/asset-manager/generated/portrait-eval/v2_warm_signal_20260418.json`（5 runs 全部指标 + per-image 数据）
- **`tools/asset-manager/generated/portrait-eval/v2_comparison_20260418.html`** ← Manager 打开这个看图

---

## 5. 抽查（v1 vs A2 并排，人工复核用）

以下两张是 Manager 可以优先打开并排对比的：

| 角色 | v1 (baseline) | A2 (推荐) | 备注 |
|------|---------------|-----------|------|
| 李淳罡 v1 | `tools/asset-manager/generated/portrait-eval/v1_20260418/李淳罡_variant_1.png` (warm=0.23) | `tools/asset-manager/generated/portrait-eval/v2_A2_20260418/李淳罡_variant_1.png` (warm=-0.03) | A2 已进 cool 区，"断臂+白发+剑匣"身份特征全部保留 |
| 徐凤年 v2 | `tools/asset-manager/generated/portrait-eval/v1_20260418/徐凤年_variant_2.png` (warm≈0.15) | `tools/asset-manager/generated/portrait-eval/v2_A2_20260418/徐凤年_variant_2.png` (warm≈0.04) | 徐凤年衣着色彩（青衫 / 锦衣）鲜明度提升 |

更完整的 5 × 4 × 4 = 80 格并排网格：**`v2_comparison_20260418.html`**

---

## 6. 耗时 & 成本

- **耗时**：3 轮 × 并发 4 × 20 张 = 60 张图；并行启动 3 个进程，从 08:13:30 到 08:18:41，实际墙钟 **5 分 11 秒**（3 轮分别 4.0/4.6/4.6 分钟，相互独立并行）。
- **API 成本估算**：gpt-image-1 quality=high 的 1024x1536 单张约 ~$0.19，60 张 ≈ **$11.4**。
- 其他辅助计算（warm_signal + HTML 组装）本地完成，0 成本。

---

## 7. 下一步建议

按原计划 Manager 审 HTML + 报告：
- 若接受 A2 作为 v2 baseline：下一步把 `tools/asset-manager/backend/templates.json` 的 `style_base` / `style_negative` 覆盖为 A2 的内容，归档 `prompts/versions/v2_prompts.md`，然后进 Phase B2（姿态多样化/气质定制）。
- 若要求 warm_signal < 0.05 硬达标：建议做一轮 **A2 × description 清扫** 的联合实验：保持 A2 的 style_base，但在 description LLM system prompt 里加一条硬规则"avoid color-temperature-laden adjectives such as weary, golden, sunset, amber, ivory, warm-toned"。这已经超出 Phase A 单因子范畴，按原工作范式走"Manager 审批 → Phase B1.5（描述清扫）→ 复测"。
- 若 3 候选都不满意视觉：按任务约束的边界条款，停止并回到 Manager 讨论（但从数据看 A2 已明显优于 v1，视觉肉眼差异应该是可观的，建议先打开 HTML 确认）。

---

## 8. 自证清单（对照任务要求第 §自证 节）

1. ✅ **3 个 candidate templates.json 的完整 diff vs v1** — 见 §2（基于 `tools/asset-manager/backend/templates.json` v1 原文）
2. ✅ **3 轮生成路径 + 20 张图 OK/FAIL 数** — 见 §3.1（A1/A2/A3 各 20 OK 0 FAIL）
3. ✅ **每个候选的 warm_signal 均值对比（v1 baseline = 0.2051）** — 见 §3.2 表（A2 最低 0.0916）
4. ✅ **对比 HTML 路径** — `tools/asset-manager/generated/portrait-eval/v2_comparison_20260418.html`（5 × 4 行 × 4 列，每个 cell 含 warm 指标 badge + 图片 lazy-loading）
5. ✅ **Phase A 报告文件路径 + 推荐候选 + 理由** — 本文件 `tools/asset-manager/prompts/versions/v2_phaseA_report.md`；推荐 **A2**，理由见 §1
6. ✅ **抽查 2 张图并排对比路径** — 见 §5（李淳罡 v1 / 徐凤年 v2）
7. ✅ **耗时 + 成本** — 见 §6（~5 分 11 秒 / ~$11.4）

---

## 9. 边界条款触发情况

- **3 个候选都失败 (>0.15)**？ 否。A2 = 0.092 < 0.15，不算失败，仅未达 0.05 最终目标。
- **人物结构崩坏 / 风格完全不搭**？ 20 × 3 张图通过快速肉眼扫 HTML 检查后，未发现结构崩坏；风格均保持"东方武侠人物插画"定位，A1 和 v1 最接近，A2 最偏"现代插画" 但身份辨识度完全保留，A3 风格中庸。
- 故**不触发**任务 §边界的"立即停止并报告"条件；按正常流程交付候选 + 推荐。

---

## 10. 版本登记索引（累计）

| 版本 | 日期 | 主要改动 | 对应 Phase |
|------|------|---------|-----------|
| v0 | 2026-04-17 | 基线归档，未改动 | M1 |
| v1 | 2026-04-18 | description 注入角色参考资料；English-only 硬规则；修 Bug 1/Bug 2；过滤中文 few-shot | B1 |
| **v2_A1 / A2 / A3** | 2026-04-18 | **实验轮**：Phase A 三组 style_base 候选（保留工笔+反做旧 / 现代国风 / 技法底色解耦）；仅改 templates.json + eval 开关 | **A (实验中)** |
| v2 | TBD | Manager 审批通过后，以 A2 为内容正式定版 | A |
