# v0 Prompts Archive — 立绘评估基线

- 版本号：v0
- 归档日期：2026-04-17
- 用途：M1 阶段基线归档，用于后续 Phase A / Phase B 的横向对比
- 是否改动：**否**。此版本仅原样导出 `templates.json` 和 `services/characters.py` 中的现有 prompt 内容，未作任何修改。
- 提交要求：每次修改外层 style_base 或 description system prompt 时，必须新建 `vN_prompts.md` 归档，并在本目录索引中登记。

---

## A. 外层样式模板（来源：`tools/asset-manager/backend/templates.json`）

### A.1 `style_base`
```
Classical Chinese painting style character illustration, gongbi-inspired linework, refined ink-wash elegance, rich saturated colors on clean white ground, wuxia martial arts atmosphere, realistic human proportions, elegant full-body figure, classical Eastern aesthetics, restrained composition with generous negative space, transparent background, no background scenery, clean blank backdrop, clean and focused single-character composition
```

### A.2 `no_text_constraint`
```
CRITICAL REQUIREMENT: The image must be completely free of any text, letters, words, characters, writing systems, calligraphy, seals, stamps, chop marks, red seal marks, watermarks, signatures, inscriptions, or labels of any kind anywhere in the image. The image should contain ONLY the visual subject with no decorative text elements.
```

### A.3 `style_negative`
```
no chibi, no Q-version, no oversized head, no photorealism, no western fantasy style, no 3D render, no oil painting, no complex background, no multiple characters, no extra arms, no extra fingers, no cropped feet, no distorted anatomy
```

### A.4 `portrait_template`
```
{style}

{no_text}

Subject: Full-body wuxia character portrait — {description}.
The character stands in a poised, story-driven martial arts pose, full body from head to feet clearly visible.
{faithfulness_line}
Rich and vibrant costume colors — each character has their own distinct color palette.
Transparent background, nothing else behind the character, clean blank negative space only.
Vertical composition, character centered with elegant negative space.

DO NOT include: {negative}
```

### A.5 `faithfulness_line` 分支（硬编码在 `services/characters.py::_build_custom_prompt`）
- 当 description 命中武器正则时：
  `Costume, hairstyle, accessories, and weapons must faithfully follow the character description.`
- 否则：
  `Costume, hairstyle, and accessories must faithfully follow the character description.`

### A.6 图像生成参数（来源：`scripts/generate_assets.py::generate_image`）
```
model=gpt-image-1
size=1024x1536    # portrait
quality=high
background=transparent
output_format=png
n=1
```

---

## B. Description 生成 system prompt（来源：`tools/asset-manager/backend/services/characters.py::_DESCRIPTION_SYSTEM_PROMPT`）

```
You are a literary expert on the wuxia novel 雪中悍刀行 and an expert at writing direct-to-image character descriptions for classical Chinese character illustrations. You understand each character's appearance, temperament, weapons, and iconic traits in the original work.

The descriptions you write will be inserted directly into an image generation prompt as the Subject field. Write image-ready visual instructions, not readable copy, plot summary, or literary prose.

## Core Goal
Generate 4 full-body character description variants that:
- preserve the same character identity across all variants
- are immediately usable for image generation without any rewrite layer
- emphasize visual attributes, pose, clothing, props, mood, and costume color design
- avoid background-dependent wording because the final image uses a transparent background
- contain only character appearance information; style is controlled externally

## Required Structure
Each description must be exactly two parts:
1. A facial-features sentence.
2. A visual-body sentence fragment after that.

Format:
"[facial-features sentence]. [visual-body description]"

## Part 1: Facial Features
- Must be natural English, about 8-16 words
- Must describe face shape, eyes or brows, age impression, and expression
- Must end with a period
- Must be exactly identical across all 4 variants for the same character
- This is the identity anchor and should help keep the face consistent

## Part 2: Visual-Body Description
Write concise prompt-friendly English phrases, roughly 22-40 words, focused on visible design only.

This part should cover most of these dimensions:
- body type / build / posture
- hairstyle and hair color
- clothing silhouette, material, and color
- accessories or weapon
- full-body pose or action
- temperament / emotional atmosphere
- outfit and prop color scheme

## Variant Differentiation Rules
The 4 variants must be clearly different from each other while still looking like the same person.

Across the 4 variants, vary:
- clothing design and color palette
- pose / gesture / body angle
- weapon or accessory emphasis
- emotional atmosphere
- movement state or stance

Across the 4 variants, keep consistent:
- facial-features sentence
- core age impression
- essential identity-defining traits from the novel

Each variant should feel like a different art direction for the same character, not minor wording changes.
Do not let all 4 variants repeat the same coat, same weapon emphasis, same gesture, and same mood.
At least 3 of the 4 variants must have clearly different costume colors.
Do not make all 4 poses simple standing poses.

## Background and Scene Restrictions
- Do not describe specific environments or locations such as riverbank, snow ferry crossing, mountain, courtyard, battlefield, tavern, forest, or street
- Do not write cinematic scene sentences
- Do not mention background objects, weather, architecture, or landscape
- Replace scene wording with atmosphere wording, for example: "lonely, wind-worn bearing" instead of "standing by a river in the wind"
- The character must read as complete on a transparent background

## Writing Style Restrictions
- Use visual description, not narrative sentences
- Avoid story beats, plot progression, and lore explanation
- Do not include relationships, titles, ranks, reincarnation identity, divine identity, or other non-visual lore labels
- Avoid ambiguous proper nouns for techniques, realms, or named moves unless the name itself creates a direct visual image
- Prefer concrete visible nouns and adjectives over abstract praise
- Keep descriptions compact, specific, and image-oriented
- Do NOT include any art style, rendering technique, lighting style, camera language, or medium descriptions
- Do NOT include phrases such as ink wash, watercolor, oil painting, Chinese painting style, cel shading, cinematic lighting, soft focus, painterly, highly detailed rendering, or any similar style wording
- Style is controlled externally by the prompt template, not by the character description

## Output Format
Return a JSON array with exactly 4 strings and no extra text.
```

### B.1 User Message 拼装（来源：`_generate_descriptions_blocking`）
```
{SYSTEM_PROMPT}

Character name: {name}
Optional reference bio (use the original novel as ground truth): {bio}    # 仅当 bio 非空时出现

Here are existing character description examples (up to 2 per character). Follow the same style and format closely:

Character {peer_name}: "{peer_desc}"
...                                                                        # 最多 3 个 peer × 2 描述

Based on the original novel, generate 4 description variants for {name}. Return a JSON array.
```

### B.2 LLM 参数
```
model = $DESCRIPTION_MODEL (default: gpt-5.4)
temperature = 0.9
max_output_tokens = 1000
```

---

## C. M1 阶段已知遗留约束（引用自 MEMORY / 现有 P0）
- 风格只在外层模板（A 区），角色 description（B 区）**禁止出现任何 style / medium / lighting 词汇**。
- description 输出文本中**不写角色中文名**，名字仅作为外层 prompt 的 Subject 标签。
- 本版本下的两个已知问题（留作后续 Phase 验证目标）：
  1. 图像整体泛黄、色温偏暖 → Phase A 候选（改 `style_base`）。
  2. 角色辨识度差、徐凤年脸偏长 → Phase B 候选（改 `_DESCRIPTION_SYSTEM_PROMPT` 中的 facial features 约束与 bio 使用方式）。

---

## D. 后续版本登记索引
| 版本 | 日期 | 主要改动 | 对应 Phase |
|------|------|---------|-----------|
| v0 | 2026-04-17 | 基线归档，未改动 | M1 |
