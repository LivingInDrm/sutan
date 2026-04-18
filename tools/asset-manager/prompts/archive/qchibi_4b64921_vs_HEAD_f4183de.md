# Q-Chibi 时期 (`4b64921`) vs 当前 HEAD (`f4183de`) 立绘 Prompt 考古对比

> **性质**：只读考古报告。本文档不影响任何现有运行逻辑，仅用于决策参考（是否新建 `v2_QChibi` 回滚实验）。
>
> **对比两端**：
> - **Q 版末态**：`4b64921` (2026-04-04，Q 版最后一个 commit，17.5 h 后即被 `ff42cff` 切到写实)
> - **当前 HEAD**：`f4183de` (2026-04-18，B4-Lean template + v3 slot description)
>
> **关键中间 commit**：
> - `affc5f3` (2026-04-03)：Q 版引入（`scripts/generate_assets.py` 首次出现）
> - `ff42cff` (2026-04-16)：一次性切到写实（gongbi + realistic proportions + full-body）
> - `591f1d1` → `69a70d6`：B4-Lean template 引入并合入生产 `templates.json`
> - `f4183de`：description prompt v3 槽位结构化

---

## 1. Portrait Template 对比（送 gpt-image-1 的图像 prompt）

### 1.1 Q 版 `4b64921` 原文

Q 版**没有 `templates.json` 文件**，所有模板硬编码在 `scripts/generate_assets.py` 的常量中，并在 `tools/asset-manager/backend/main.py` 通过 `ga.PORTRAIT_TEMPLATE` 导入作为 fallback。

#### `STYLE_BASE`（Q 版，约 74 词 / 477 字符）

```
cute chibi Q-version character, East Asian ink wash painting style,
simple bold black brush strokes, vibrant watercolor wash with rich saturated colors and soft ink bleeding,
chibi proportions: large head, small body,
minimal composition with a few wisps of ink mist around the figure,
transparent background, no background scenery,
clean and simple, not dense or complex,
absolutely no text anywhere, no writing, no stamps, no seals, no red marks
```

#### `NO_TEXT_CONSTRAINT`（Q 版，约 60 词 / 395 字符）

```
CRITICAL REQUIREMENT: The image must be completely free of any text, letters, words,
characters, writing systems, calligraphy, seals, stamps, chop marks, red seal marks,
watermarks, signatures, inscriptions, or labels of any kind anywhere in the image.
The image should contain ONLY the visual subject with no decorative text elements.
```

#### `STYLE_NEGATIVE`（Q 版，约 45 词 / 333 字符）

```
no photorealism, no western fantasy style, no 3D render, no oil painting,
no complex background, no scenery behind character,
no text of any kind, no writing, no letters, no characters, no calligraphy,
no stamps, no seals, no chop marks, no red seal marks, no watermarks, no signatures,
no dense patterns, no realistic textures, no European medieval armor
```

#### `PORTRAIT_TEMPLATE`（Q 版，不含 slots 展开约 63 词 / 459 字符）

```
{style}

{no_text}

Subject: Full-body chibi character — {description}.
The character stands upright in a simple dynamic pose, full body from head to feet visible.
Traditional East Asian costume — flowing robes or simple warrior outfit.
A few wisps of ink mist trail lightly from clothing edges.
Rich and vibrant costume colors — each character has their own distinct color palette.
Transparent background, nothing else behind the character.
Vertical composition, character centered.
The image must contain absolutely zero text, zero stamps, zero seals, zero red marks.

DO NOT include: {negative}
```

### 1.2 当前 HEAD 原文（`tools/asset-manager/backend/templates.json`）

#### `style_base`（当前，约 60 词 / 503 字符）

```
Semi-realistic Chinese wuxia character digital painting, cinematic painterly rendering with dramatic soft rim light and volumetric key lighting, detailed fabric textures with believable cloth weight and folds, confident painterly brushwork with crisp character focus, rich deep saturated palette that stays neutral to slightly cool in temperature, realistic human proportions and anatomy, clean transparent background
```

#### `no_text_constraint`（当前，约 14 词 / 96 字符）

```
No text, letters, calligraphy, seals, stamps, watermarks, or signatures anywhere in the image.
```

#### `style_negative`（当前，约 80 词 / 516 字符）

```
no chibi, no oversized head, no photorealism, no western fantasy style, no 3D render, no oil painting, no flat shading, no cel-shading, no complex background, no multiple characters, no extra arms, no extra fingers, no cropped feet, no distorted anatomy, no yellow tint, no sepia tone, no warm color cast, no muddy dark palette, no dim gloomy lighting, no blurry eyes, no smeared facial features, no muddy face
```

#### `portrait_template`（当前，不含 slots 展开约 65 词 / 450 字符）

```
{style}

{no_text}

Subject: Full-body jianghu wuxia character portrait — {description}.
{faithfulness_line}
Full body visible from head to feet, vertical composition, character centered with elegant negative space on a clean transparent background.

FACE AND EYES: Render facial features with sharp clarity. Eyes must be clearly defined with visible iris color, catchlight, and lash detail. No smudged, blurred, or muddy faces.

DO NOT include: {negative}
```

其中 `{faithfulness_line}` 由 `services/characters.py::_build_custom_prompt` 根据 description 是否含武器词动态生成：
- 含武器：`"Costume, hairstyle, accessories, and weapons must faithfully follow the character description."`
- 不含武器：`"Costume, hairstyle, and accessories must faithfully follow the character description."`

### 1.3 差异要点（Portrait Template）

| 维度 | Q 版 `4b64921` | 当前 HEAD `f4183de` |
|---|---|---|
| **风格词（决定画面 DNA）** | `cute chibi Q-version`、`East Asian ink wash painting`、`simple bold black brush strokes`、`vibrant watercolor wash`、`chibi proportions: large head, small body` | `Semi-realistic Chinese wuxia digital painting`、`cinematic painterly rendering`、`dramatic soft rim light + volumetric key lighting`、`detailed fabric textures`、`realistic human proportions and anatomy` |
| **比例** | Q 版（大头小身体）— 硬约束 | 写实人体比例 — 硬约束 |
| **笔触/媒介** | 水墨 + 水彩 + 浓墨晕染 | 影视级数字绘画 + painterly brushwork |
| **光照** | 未显式指定（留给水墨风格暗示） | `dramatic soft rim light + volumetric key`（强影视光） |
| **色调** | `vibrant watercolor wash with rich saturated colors`（高饱和、鲜艳） | `rich deep saturated palette, neutral to slightly cool`（深沉、偏冷） |
| **构图氛围** | `minimal composition with a few wisps of ink mist around the figure` | `full body + vertical composition + elegant negative space`（极简肖像 + 留白） |
| **视角/取景** | `stands upright, full body from head to feet` | `Full body visible from head to feet`（均为 full-body，构图一致） |
| **服饰表现** | `Traditional East Asian costume — flowing robes or simple warrior outfit` + `Rich and vibrant costume colors` + `A few wisps of ink mist trail from clothing edges` | 由 description 自身承载；模板额外强调 `faithfulness_line` 忠实原著 |
| **脸部/眼睛专项** | 无专项约束 | 新增 `FACE AND EYES:` 段落，要求 `sharp clarity / visible iris color / catchlight / lash detail`，显式反对 `smudged / blurred / muddy faces` |
| **no-text 强度** | 4 处重复强调（STYLE_BASE / NO_TEXT / PORTRAIT_TEMPLATE 尾句 / STYLE_NEGATIVE），约 395 字符 CRITICAL 段 | 精简为 1 行 14 词 |
| **negative 指向** | 反"photorealism / 3D render / oil painting / western fantasy / European medieval armor" | 反"chibi / oversized head / flat shading / cel-shading / muddy face / warm color cast / dim gloomy lighting" — **几乎是对 Q 版风格的显式否定** |
| **动态指令** | `{description}` + `simple dynamic pose` | `{description}` + `{faithfulness_line}` + 脸眼专项 |

**决定 "Q 版视觉" 的核心 prompt 元素**（按权重）：
1. `cute chibi Q-version character` + `chibi proportions: large head, small body`（比例锚）
2. `East Asian ink wash painting` + `simple bold black brush strokes` + `watercolor wash with soft ink bleeding`（媒介锚）
3. `vibrant ... rich saturated colors`（色调锚，高饱和）
4. `minimal composition with a few wisps of ink mist around the figure` + `A few wisps of ink mist trail lightly from clothing edges`（氛围锚，水墨烟气）
5. STYLE_NEGATIVE 显式反 `photorealism / 3D render / oil painting`（风格护栏）

---

## 2. Description System Prompt 对比（生成描述文字）

### 2.1 Q 版 `4b64921` 原文（`tools/asset-manager/backend/main.py:600-623`）

- 模型：`DESCRIPTION_MODEL = os.environ.get("DESCRIPTION_MODEL", "gpt-5.4")`
- API：`client.chat.completions.create(...)`（Chat Completions + `messages`）
- temperature: 0.9，max_completion_tokens: 1000

```
你是熟读武侠小说《雪中悍刀行》的文学专家和古风角色绘画提示词专家，对原著中所有角色的外貌、性格、武器、标志性场景有深刻理解。

## 格式规范
每条 description 结构为：「面部特征句。场景/动作/道具描述」

- 面部特征句：描述脸型+眉眼+神态表情，约 10-15 字，以句号"。"结尾
- 4 条 description 的面部特征句必须完全一致（同一角色共享固定面部特征）
- 场景描述：具体场景+动作/姿势+道具/武器+性格标签，中文逗号分隔，约 40-55 字
- 4 条场景描述各不相同，涵盖：战斗、日常、情绪、特殊道具/标志性场景
- 每条 description 总长度约 55-80 字
- 使用精炼的中文词组，中文逗号分隔，不写完整句子

## 禁止一：不得包含人物关系或身份头衔信息
description 只描述视觉内容（外貌、服饰、动作、道具、场景、气质），不得出现人物关系、身份头衔、转世/神格身份、排名标签等，这些对图像生成无帮助。

## 禁止二：不得使用可能产生歧义的专有名词
武器名、招式名、境界名等专有名词需替换为通用视觉描述（如"木马牛"→"一柄古朴长剑"，"两袖青蛇"→"两道青色剑光"）；若专名本身有清晰视觉含义可酌情保留。

## 输出格式
严格输出 JSON 数组，包含 4 个字符串，不要包含任何其他内容。
```

**字符统计**：约 480 中文字符 / 系统消息单条文本。

**User message 拼装**（Q 版）：

```
角色名：{name}
[可选] 角色简介（可选补充，以原著为准）：{bio}
[可选] <few-shot: 最多 3 个其它角色，每角色 2 条现有 description>

请基于《雪中悍刀行》原著中 {name} 的外貌、性格、武器、标志性场景，
生成 4 条不同场景的 description，以 JSON 数组格式输出。
```

**关键机制**：few-shot 示例直接从 `batch_config.json` 的其它角色抓取，没有做中/英文过滤。

### 2.2 当前 HEAD 原文（`tools/asset-manager/backend/services/characters.py:205-282`）

- 模型：`shared_ctx.DESCRIPTION_MODEL`
- API：`client.responses.create(...)`（Responses API + `input`）
- temperature: 0.9，max_output_tokens: 1200

```
You write English visual descriptions of characters from the wuxia
novel 《雪中悍刀行》, used directly as image-generation prompts.

# INPUT
You will receive: character name (and optionally a brief bio).
No novel excerpts will be provided.

# YOUR TASK
《雪中悍刀行》is a widely-known wuxia novel. Recall what you know
about this character from the novel — gender, age range, build,
face, hair, signature weapons or items, distinguishing marks,
and temperament. Use that knowledge as ground truth.

For details the novel does not specify (eye color, exact costume
color, specific pose), imagine reasonably while staying consistent
with the character's canonical temperament and the Northern Liang
wuxia setting.

Then output 4 visual variants of the same character.

# OUTPUT FORMAT
JSON array of 4 objects. Each object has exactly these fields:

{
  "gender":  "male" | "female",
  "face":    "5-8 words: face shape, age, expression",
  "eyes":    "5-7 words: shape, color, gaze quality",
  "hair":    "3-5 words: style, color",
  "build":   "3-5 words: body type, posture",
  "costume": "6-10 words: silhouette, material, dominant color",
  "prop":    "3-6 words: weapon or signature item, generic English",
  "pose":    "4-8 words: full-body action",
  "mood":    "2-4 words: atmosphere phrase"
}

# IDENTITY ANCHORS (same across all 4 variants)
gender, face, eyes, hair, build  →  must be byte-identical in all 4

# VARIANT DIFFERENTIATION (must differ across all 4)
costume (different dominant colors), prop emphasis, pose, mood.
At least one variant must be a dynamic pose (mid-stride, drawing
blade, turning, kneeling), not a standing pose.

# HARD RULES

1. English only. No Chinese characters anywhere in the output.

2. NEVER literally translate or transliterate Chinese proper nouns.
   These are NAMES, not descriptions:
   - 风马牛 is a sword → write "curved saber", NEVER "wind horse cow"
   - 梅子酒 is a spear → write "long spear", NEVER "plum wine"
   - 老黄 is a person → write "old retainer", NEVER "old yellow"
   - 绣冬 / 春雷 are sabers → write "saber", not literal meaning
   When in doubt, use a plain English category word for the object.

3. Gender must be visually clear:
   - male: emphasize build, bearing, masculine silhouette
   - female: emphasize grace, refined features, feminine silhouette
   Do NOT write gender-neutral descriptions.

4. Stay faithful to canonical character identity:
   - Use known novel facts for age, build, gender, signature items,
     and distinguishing marks.
   - For unspecified details, imagine consistently — never invent
     traits that contradict canon.
   - All 4 variants must depict the same canonical person.

5. NO art-style words (ink wash, painterly, cinematic, watercolor,
   gongbi, cel shading, soft focus). Style is set by external template.

6. NO scene words (riverbank, mountain, courtyard, snow, forest,
   tavern, battlefield). Background will be transparent.

7. NO plot, lore, titles, ranks, or relationships. Only what is
   visible on a transparent background.

Return ONLY the JSON array, no extra text.
```

**字符统计**：约 2000 英文字符 / 系统段文本（比 Q 版长约 4×）。

**User message 拼装**（当前）：

```
<full system prompt inlined into user input>

Character name (for your internal identification only;
DO NOT write this name in the output): {name}
[可选] Optional additional bio (secondary, consistent with canon): {bio}
Return ONLY the JSON array of 4 slot objects as specified.
```

**few-shot 示例**已**不再拼入** LLM 调用（`_get_existing_examples` 函数依然存在，但在 `_generate_descriptions_blocking` 的 user_msg 组装中已不引用；见 `services/characters.py:340-360`）。仅保留了对中文 description 的过滤逻辑作为历史防御。

### 2.3 差异要点（Description System Prompt）

| 维度 | Q 版 `4b64921` | 当前 HEAD `f4183de` |
|---|---|---|
| **输出语言** | 中文词组 + 中文逗号 | **仅英文**；`_CJK_RE` 正则显式拦截中文 |
| **输出结构** | 每条一条字符串（"面部句。场景句"） | 每条一个 **9 槽 JSON dict**（gender/face/eyes/hair/build/costume/prop/pose/mood） |
| **锚（anchor）与变（variant）** | 锚只有"面部特征句"约 10-15 字；约束"4 条面部特征句完全一致"但无槽位 | 锚 = gender+face+eyes+hair+build（5 槽 byte-identical）；变 = costume+prop+pose+mood（4 槽必须差异化） |
| **装配方式** | LLM 直接输出拼好的字符串 | LLM 输出 9 槽 dict → Python `_assemble_slot_description()` 确定性拼成 `"<gender> character. <face> <eyes> <hair> <build>. Wearing <costume>, holding <prop>. <pose>, <mood>."` |
| **gender 强制** | 无；仅"角色性别"出现在 `_PROFILE_SYSTEM_PROMPT`（另一条链路） | **强制**：`_VALID_GENDERS = ("male", "female")`；变体级校验 `if gender not in _VALID_GENDERS: raise ValueError`；显式禁止 gender-neutral |
| **专名反例** | 泛化原则："武器名、招式名、境界名需替换为通用视觉描述"，仅"木马牛→长剑、两袖青蛇→剑光"2 例 | **具体反例枚举**：风马牛/梅子酒/老黄/绣冬/春雷 5 个具体名字 → 显式给出正确英文替换 |
| **novel_refs 依赖** | 依赖 few-shot examples 从 batch_config 抓取；外部 novel excerpts 可选 | **显式去除**："No novel excerpts will be provided. Recall what you know from the novel as ground truth" |
| **动态姿态要求** | "4 条场景各不相同，涵盖：战斗、日常、情绪、特殊道具" | "At least one variant must be a dynamic pose (mid-stride, drawing blade, turning, kneeling)" |
| **art-style 排除** | 无明确禁词（描述自身可带"水墨"等） | **显式禁止** art-style 词（`ink wash, painterly, cinematic, watercolor, gongbi, cel shading, soft focus`），统一由外部 template 控制 |
| **scene 词排除** | 鼓励"具体场景"（战斗、日常、特殊场景） | **显式禁止** scene 词（`riverbank, mountain, courtyard, snow, forest, tavern, battlefield`）—— 因背景必须透明 |
| **失败行为** | JSON 解析/长度不足 → 抛 `ValueError`；无 schema 级校验 | JSON 解析 + 数组校验 + 4 长度 + dict 类型 + 9 槽齐备 + 非空 + gender 合法 6 层 fail-fast |
| **OpenAI API** | Chat Completions (`messages=[system, user]`) | Responses API (`input=user_msg`)，system 提示内联到 user 输入 |
| **few-shot** | 拼入最多 3 角色 × 2 条现有 description | **已从 LLM 输入中移除**；过滤函数仅保留为 dead/defensive code |

---

## 3. Variant 结构对比

### 3.1 Q 版 `4b64921`：plain string list

数据形态（`scripts/batch_config.json` 每条 entry）：

```json
{
  "type": "portrait",
  "name": "徐龙象",
  "description": "方圆脸，浓眉小眼，憨厚表情。壮硕少年武者，天蓝色厚重战袍，手持铁枪，豪迈站姿，身旁趴着一只黑虎，天生神力的憨厚少年，虎背熊腰气势如山",
  "output": "portrait_徐龙象/xulong_01.png"
}
```

4 个 variant = 4 条这样的 entry（`name` 重复、`output` 递增）。

- 无 slot 字段
- 无 gender/face/eyes/hair/build 拆分
- "byte-identical 锚"仅靠 prompt 约束"面部特征句必须完全一致"+ LLM 自律实现（无机械保证）
- 前端 `UpdateVariantRequest` 的 payload 仅 `{variant_index, description}` 一个整字符串

### 3.2 当前 HEAD：9 槽 JSON dict + 确定性装配

LLM 返回：

```json
[
  {
    "gender":  "male",
    "face":    "...",
    "eyes":    "...",
    "hair":    "...",
    "build":   "...",
    "costume": "...",
    "prop":    "...",
    "pose":    "...",
    "mood":    "..."
  },
  { ... },
  { ... },
  { ... }
]
```

Python `_assemble_slot_description(slot)` 装配（`services/characters.py:297-311`）：

```
<gender> character. <face> <eyes> <hair> <build>. Wearing <costume>, holding <prop>. <pose>, <mood>.
```

- **锚机制**：锚块 (gender/face/eyes/hair/build) 由 LLM 承诺 byte-identical，然后 Python 以**相同槽值**拼接，得到真正 byte-identical 的锚句子（anchor sentence）
- **落地存储**：`batch_config.json` 的 entry 依然只保留**装配后的 description 字符串**（保持与 Q 版同样的持久层形态，节省迁移成本）
- **槽 dict 本身不持久化**（从 LLM 输入 → 装配 → 字符串 → 落盘，一次性消费）

### 3.3 当时的 variant fields 答案

**Q 版 `4b64921` 时点根本没有 slot 结构**：

| Slot 字段 | `4b64921` 是否存在 | 首次引入 commit |
|---|---|---|
| `gender`  | 否（仅 `_PROFILE_SYSTEM_PROMPT` tag 里有） | `f4183de` |
| `face`    | 否（"面部特征句"是一个完整句子，未拆分） | `f4183de` |
| `eyes`    | 否（混在"面部特征句"里） | `f4183de` |
| `hair`    | 否 | `f4183de` |
| `build`   | 否 | `f4183de` |
| `costume` | 否（散在"场景描述"） | `f4183de` |
| `prop`    | 否 | `f4183de` |
| `pose`    | 否 | `f4183de` |
| `mood`    | 否 | `f4183de` |

所有 9 槽都是 **当前 HEAD (`f4183de`) 的新增**。

---

## 4. 关键差异总结（Top 5）

1. **风格锚整体翻转**：Q 版核心是 `cute chibi Q-version + ink wash + watercolor + large head small body`；当前是 `Semi-realistic wuxia digital painting + cinematic + realistic proportions`。两套风格在 `STYLE_NEGATIVE` 层面互斥（当前明确 `no chibi, no oversized head`，Q 版明确 `no photorealism, no 3D render`）。
2. **Description 产物从 "中文自由句" → "英文 9 槽 dict"**：Q 版 LLM 直接吐中文成品字符串，锚靠自律；当前 LLM 吐英文 slot dict，锚靠 5 槽 byte-identical 校验 + Python 确定性装配，结构化且可机械验证。
3. **Gender 从可选 → 硬强制**：Q 版 description prompt 不强制 gender（仅 `_PROFILE_SYSTEM_PROMPT` 的 tag 里有）；当前 6 层 fail-fast 校验之一即 `gender ∈ {male, female}`。
4. **Few-shot 依赖去除 + 中文污染防御**：Q 版把 batch_config 其它角色 description 作为 few-shot 拼入；当前彻底移除（原因：中文 few-shot 会让 LLM 漂移回中文输出，即代码注释中的 "Bug 2 cause"）。
5. **Art-style 词的所有权边界**：Q 版 description 允许写"水墨""剑光"等风格词（与 template 风格词叠加强化）；当前明确 description **不得**含 `ink wash/painterly/cinematic/watercolor/gongbi/cel shading/soft focus` 等词，统一交由 template 控制 —— 解耦"角色身份信息" vs "画面风格"。

---

## 5. 回滚选项 C 可行性评估：新建 `v2_QChibi` 实验

### 5.1 目标

新建一套**独立**的 template + description prompt 专用于 Q 版风格实验，**不动现有 B4-Lean 生产链路**。

### 5.2 需要从 `4b64921` 抄回的字段

| 来源 | 内容 | 目标位置 |
|---|---|---|
| `scripts/generate_assets.py`（4b64921）`STYLE_BASE` | 77 词 chibi + ink wash 风格串 | 新建 `tools/asset-manager/prompts/versions/v2_QChibi_prompts.md` + `templates_v2_qchibi.json` 的 `style_base` |
| 同上 `NO_TEXT_CONSTRAINT` | CRITICAL 段 | 同上 `no_text_constraint` |
| 同上 `STYLE_NEGATIVE` | 反 photorealism/3D/oil/European armor | 同上 `style_negative` |
| 同上 `PORTRAIT_TEMPLATE` | 含 `Full-body chibi character — {description}` + `A few wisps of ink mist trail from clothing edges` | 同上 `portrait_template` |
| `main.py`（4b64921）`_DESCRIPTION_SYSTEM_PROMPT` | 中文系统 prompt 原文 | 新建 `description_system_prompt_qchibi` 常量 |

### 5.3 改动面（增量，不覆盖现有）

最小可行方案：

1. **新增文件**（2 个）：
   - `tools/asset-manager/backend/templates_v2_qchibi.json`（Q 版 4 键完整复制）
   - `tools/asset-manager/prompts/versions/v2_QChibi_prompts.md`（归档 prompt 全文 + 出处 commit）
2. **新增函数**（建议全部放在 `services/characters.py` 同级，不 override 现有）：
   - `_QCHIBI_DESCRIPTION_SYSTEM_PROMPT`（直接复制 Q 版中文 prompt 原文）
   - `_generate_descriptions_blocking_qchibi()`（返回 4 条中文字符串，不做 slot 装配）
   - `_build_custom_prompt_qchibi(asset_type, name, description)`（用 `templates_v2_qchibi.json` 做 format；因 Q 版 template **不含** `{faithfulness_line}` 占位符，**不要传该参数**）
3. **新增路由（可选）**：
   - `POST /api/characters/{name}/generate-description?variant=v2_qchibi`
   - `POST /api/characters/{name}/generate?variant=v2_qchibi`
   - 或者先不暴露 API，仅用离线脚本 `scripts/portrait_eval_qchibi.py` 跑样本对比

### 5.4 兼容性风险点

| 风险 | 说明 | 缓解 |
|---|---|---|
| **templates.format() 占位符不匹配** | Q 版模板不含 `{faithfulness_line}`；B4-Lean 调用路径会传该参数。若共用 `_build_custom_prompt`，Q 版会抛 `KeyError: 'faithfulness_line'`（实际是 silently 忽略，但反过来若混用 B4 模板到 Q 版流程会缺 key） | 独立 `_build_custom_prompt_qchibi` 函数，槽集合与 Q 版对齐 |
| **batch_config.json 中英文混存** | 当前 `_get_existing_examples` 过滤中文 description；Q 版产出的中文会被"污染标记"过滤。但由于 v3 pipeline 已不使用 few-shot，本身无害 | 无需处理 |
| **description 字段持久层歧义** | 同一 `batch_config.json` 里既有英文 slot-assembled 串又有 Q 版中文串，会让未来的 portrait-eval 混淆 | 新增 `variant_style` 字段标记（`v2_qchibi` / `b4_lean`）；或用独立的 `batch_config_qchibi.json` |
| **gpt-image-1 成本** | 单角色 4 图 × 1024x1536 high quality，每角色 ~$0.64（参考当前） | 先跑 3 角色 (12 图) 做 AB，约 ~$2 |
| **OpenAI API 版本差异** | Q 版用 Chat Completions API，当前用 Responses API。完全复刻需用回 Chat Completions | 实现时统一用 Responses API（将 Q 版 prompt 原文作为 `input`），功能等价 |

### 5.5 工作量估算

- **纯代码**：新建 2 文件 + 3 函数 + 1 路由 ≈ **200 行新增代码**
- **无破坏性改动**：现有 B4-Lean 链路 0 修改
- **测试**：3 角色 × 4 variants = 12 图对比出图即可初步判定

### 5.6 结论

**可行性：高**。Q 版 prompt 原文已完整保存在 git 历史中（`4b64921:scripts/generate_assets.py` + `4b64921:tools/asset-manager/backend/main.py`），迁移为 `v2_QChibi` 实验分支无需任何逆向工程，主要工作是**确保新路径与现有 B4-Lean 路径完全隔离**（不共用模板文件、不共用 format 占位符、不共用 description 持久层字段）。
