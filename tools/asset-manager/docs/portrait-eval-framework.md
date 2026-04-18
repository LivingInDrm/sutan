# 立绘评估框架（Portrait Evaluation Framework）

## 背景
立绘生成当前有两类问题：
1. **图像层**：整体偏暖、泛黄。
2. **描述/识别层**：角色辨识度差，例如徐凤年脸偏长。

继续"改 prompt → 生图 → 肉眼看"的闭环太慢且主观，因此把评估工程化：固定测试集 + 固定评分维度 + 版本化 prompt 归档。

---

## 目录结构
```
tools/asset-manager/
├── tests/portrait-eval/
│   ├── test_set.yaml          # 固定测试集（5 角色 × 4 variants + 原著参考）
│   └── score_template.md      # 每轮填一份评分表
├── prompts/versions/
│   ├── v0_prompts.md          # 基线（不改）
│   ├── v1_prompts.md          # Phase A 改 style_base 后归档
│   └── ...                    # 每版本一份
├── scripts/
│   └── eval_generate.py       # 批量生成脚本
├── generated/portrait-eval/
│   └── {version}_{YYYYMMDD}/  # 每轮一目录：20 张 png + description.txt + prompt.txt + summary.html + manifest.json + score.md
└── docs/
    └── portrait-eval-framework.md   # 本文
```

---

## 固定测试集
位置：`tests/portrait-eval/test_set.yaml`。

覆盖 5 个代表性角色：
| 角色     | Archetype            | 评估重点 |
|----------|----------------------|----------|
| 徐凤年   | 主角 + 贵气公子       | 贵气不奢、脸型、色温 |
| 老黄     | 老者 + 随从           | 苍老但不猥琐、剑客气质 |
| 温华     | 江湖少年              | 清瘦、执拗、不过度仙气 |
| 姜泥     | 少女                  | 少女感不萝莉化、隐忍 |
| 李淳罡   | 剑圣                  | 剑神威仪、独臂特征 |

每角色 4 variants，总共 20 张图。

每角色还带 3-5 条 `novel_refs`（原著面部/服饰摘录），M1 阶段不接入生成链路，作为 Phase B（description 层）可控改动时的 ground truth 参考。

---

## 评分维度
详见 `score_template.md`，7 个维度：
- 色温 / 泛黄（1-5）
- 风格一致性（1-5）
- 气质辨识度（1-5）
- 面部准确度（1-5）
- 服饰匹配度（1-5）
- 姿态表现力（1-5）
- 技术合格（P/F，用于缺脚/多指/出现文字/有背景 等硬失败）

每轮 20 行表格 + 7 维均分 + 定性观察（特别注明"description 层问题 / 图像层问题"）。

---

## 迭代顺序（Road map）
```
M1           Phase A            Phase B             Phase C
基线归档  →  改 style_base  →  改 description  →   可选：外层 + 描述联合微调
                ↓ 目标             ↓ 目标
            消除泛黄/色偏       提高角色辨识度
                                （脸型、气质、服饰）
```
**单变量原则**：每版只动一层（外层 OR 描述 system prompt），避免混淆归因。

---

## 使用方法

### 跑一轮（高质量）
```bash
cd tools/asset-manager
# 预估耗时 5-10 分钟，成本 ~$0.8-$1.0（20 张 1024x1536 高质量图）
python3 scripts/eval_generate.py --version v0
```

### 快速预览（低分辨率，便宜）
```bash
python3 scripts/eval_generate.py --version v1 --low-res
# quality=low，成本/耗时下降到约 1/5，适合 prompt 快速迭代
```

### 其他参数
- `--concurrency 4`：并发数，默认 4。OpenAI 速率受限时可降到 2。
- `--date 20260417`：覆盖日期戳（默认当天）。
- `--no-reuse`：不复用 `batch_config.json` 已有 description，全部重跑 LLM（Phase B 改 description system prompt 后必须加）。

### 断点续跑
脚本按 `{name}_variant_{N}.png` 判断是否已完成。中途失败直接重跑同一条命令即可，已产出的会 skip。

### 提交新版本 prompt
1. 在 `prompts/versions/` 下新建 `vN_prompts.md`，**完整拷贝**改动后的 `style_base` / `_DESCRIPTION_SYSTEM_PROMPT` / 相关 user prompt；顶部写明：
   - 版本号 + 日期
   - 相对上版的变化点（要 diff 级别，不要空话）
   - 预期解决什么问题、不动哪些层
2. 同步修改生产代码 (`templates.json` 或 `services/characters.py`)。
3. 跑 `python3 scripts/eval_generate.py --version vN [--no-reuse]`。
4. 把生成目录 `generated/portrait-eval/vN_*/` 里的 `summary.html` 打开对比，并填写 `score.md`（从 `score_template.md` 复制）。
5. Git commit：prompts/ 改动 + 生产代码改动 + generated/ 目录（png + score.md）。

---

## 输出产物（每轮）
`generated/portrait-eval/{version}_{YYYYMMDD}/` 下：
- `{name}_variant_{N}.png`：最终立绘
- `{name}_variant_{N}.description.txt`：LLM 产出的纯 description（不含外层模板）。用于判断"是不是 description 层就已经错了"。
- `{name}_variant_{N}.prompt.txt`：外层模板拼装后、送入 gpt-image-1 的最终 prompt。
- `manifest.json`：机读的 run 记录（version / date / 每条 task 耗时与状态）。
- `{version}_{YYYYMMDD}_summary.html`：4 行 × 5 列 网格，每格图下方折叠显示 description 与 prompt，便于肉眼对齐。
- `score.md`：按 `score_template.md` 手填的评分表 + 定性观察。

---

## 归因小贴士
- 打开 `summary.html` 逐格看图。
- 如果 `description.txt` 里已经出现错误信息（比如脸的描述不对、服饰与原著不符、混入了 style 词汇），那是 **description 层**问题 → Phase B 改 system prompt。
- 如果 description 读起来合理、但出图仍泛黄 / 风格漂移 / 脸型异常，那是 **图像层 / style_base 问题** → Phase A 改外层模板或 faithfulness_line。
- 每条评分备注必须二选一写 "desc 层 / 图像层"，便于下版本定向攻击。

---

## 已知约束（P0）
- 风格词只在外层 `style_base` / `portrait_template`。description 层**不得出现** ink wash / painting / cinematic lighting 之类 style wording。
- description 文本中**不出现角色中文名**。
- M1 阶段脚本**不修改**任何生产 prompt，只原样归档并跑基线。
