# v1 Prompts Archive — Phase B1（description 注入角色参考资料）

- 版本号：v1
- 归档日期：2026-04-18
- 对应 Phase：B1（description 层首次真正改动，修 M1 v0 两个硬 bug + 注入原著参考）
- 上一版：[v0](./v0_prompts.md)
- 改动范围：**仅 description 生成链路**。外层样式模板（`style_base` / `portrait_template` / `style_negative` / `no_text_constraint`）**未改**，保留 v0 原样。Phase A（去泛黄）留待下一轮。

---

## 0. 本版要解决的问题（自 v0 HTML 对比结论）

| 现象 | 位置 | 根因 |
|---|---|---|
| **Bug 1**：徐凤年 4 个 variants 的 `description.txt` 字节完全相同 | `scripts/batch_config.json` 中 `徐凤年` 的 4 条 portrait entry 本身就是被重复写入的同一段文字（legacy seed 数据）。v0 eval 以 `reuse_existing=True` 默认路径读取 → 直接透传 4 条相同描述 | 数据缓存被污染 + 生产侧直接复用未做去重校验 |
| **Bug 2**：老黄 description 是中文 + 人设错成"中年汉子" | `batch_config.json` 的 `老黄` 4 条 entry 是 legacy Chinese 文案；且 LLM fallback 路径也存在 2 处弱点：(a) system prompt 没强制 English-only，(b) `_get_existing_examples` 把中文 legacy 条目当 few-shot 喂给 LLM → 生成时漂移到中文 + 无原著 ground truth 就乱编 | system prompt 缺硬规则 + few-shot 被中文条目污染 + 缺 identity grounding |
| 徐凤年 "slightly long face" 乱写 | v0 observed 的面部特征拼凑 | 同上，缺原著 ground truth |

## 1. 本版改动总览

仅 3 处代码变更，全部在 `tools/asset-manager/backend/services/characters.py`：

1. **`_DESCRIPTION_SYSTEM_PROMPT`**：新增 3 块硬规则 + 放宽 Part-2 允许的内容。
2. **新增 `_load_character_refs(name)`**：从 `tools/asset-manager/tests/portrait-eval/test_set.yaml` 读取角色原著参考（3-5 句），作为 `## Character reference` 块注入 user prompt。
3. **`_get_existing_examples`**：过滤掉含中文字符的 legacy 条目（避免中文 few-shot 污染）。
4. **`_generate_descriptions_blocking`**：组装顺序从 `name + bio + peer_examples` → `name + novel_refs + bio + filtered_peer_examples`；max_output_tokens 1000 → 1200（ref block + 4×Part-2 扩宽后略多 token）。

**`_build_custom_prompt` / `PORTRAIT_TEMPLATE` / `templates.json` / `style_base` / faithfulness_line 正则**：0 改动。

---

## 2. Description 生成 system prompt（v1 全文）

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

## Language Requirement (HARD RULE)
- The ENTIRE description output MUST be in natural English ONLY.
- The output MUST NOT contain any Chinese character (no CJK unified ideographs anywhere, including inside phrases or parentheses).
- The output MUST NOT contain the character's Chinese name or any Chinese proper noun.
- If you need to name a weapon, robe, or accessory, use an English word (e.g. "curved saber", "scholar's robe", "jade hairpin"), never a Chinese word or transliteration.

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
- Facial features MUST match the reference excerpts from the original novel (see "Character reference" block below). Do not invent contradictory features (wrong age, wrong face shape, wrong build).

## Part 2: Visual-Body Description
Write concise prompt-friendly English phrases, roughly 24-44 words, focused on visible design only.

This part should cover most of these dimensions:
- body type / build / posture
- hairstyle and hair color
- clothing silhouette, material, and color
- accessories or signature prop / weapon
- full-body pose or action (character-specific, not a generic "stands poised")
- temperament / emotional atmosphere conveyed purely through visible cues
- outfit and prop color scheme
- short identity-atmosphere phrase at the end is allowed (e.g. "rakish young noble air", "weary old retainer carriage"), as long as it is atmosphere, not plot.

## Variant Differentiation Rules (HARD RULE)
The 4 variants MUST be clearly different from each other while still looking like the same person.
The 4 variants MUST NOT share the same Part-2 text. At least the following MUST differ across variants:
- clothing silhouette and dominant color palette
- pose / gesture / body angle (e.g. walking, half-turning, kneeling, lifting a prop, back-facing stance)
- weapon or accessory emphasis
- emotional atmosphere

Across the 4 variants, keep consistent:
- facial-features sentence (Part 1, identical)
- core age impression
- essential identity-defining traits from the novel (e.g. missing arm, white hair, patched robe)

Additional constraints:
- At least 3 of the 4 variants must have clearly different dominant costume colors.
- Do not make all 4 poses simple standing poses; include at least one dynamic pose (e.g. mid-stride, drawing a blade, kneeling, leaning, turning).
- Each variant should feel like a different art direction for the same character, not minor wording changes.

## Identity Grounding (HARD RULE)
When a "Character reference" block is provided below, it is authoritative ground truth from the original novel.
- You MUST respect age range (child / youth / middle-aged / elderly) stated there.
- You MUST respect essential traits such as: missing limb, beard color, signature prop, characteristic garment, characteristic pose.
- You MUST NOT hallucinate attributes that contradict the reference (e.g. do not write "middle-aged man" if reference says "old man with white hair and beard").
- If the reference specifies a signature prop (sword box, wine gourd, biscuit pole, jade hairpin), at least 2 of the 4 variants should surface it visibly.

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
- Do NOT include phrases such as ink wash, watercolor, oil painting, Chinese painting style, gongbi, cel shading, cinematic lighting, soft focus, painterly, highly detailed rendering, wuxia style, or any similar style/medium wording
- Style is controlled externally by the prompt template, not by the character description

## Output Format
Return a JSON array with exactly 4 English strings and no extra text.
```

### Diff 摘要（v1 对比 v0 system prompt）
- **新增**：`## Language Requirement (HARD RULE)`（强制 English-only + 禁 CJK + 禁 Chinese name）
- **新增**：`## Identity Grounding (HARD RULE)`（引用 Character reference 块为 authoritative）
- **强化**：`## Variant Differentiation Rules` 升级为 HARD RULE，新增 "MUST NOT share the same Part-2 text" + "include at least one dynamic pose"
- **放宽**：Part 2 字数 22-40 → 24-44；新增允许一条"identity-atmosphere phrase"（为 P0 松绑：落成"rakish young noble air"这类气质尾缀）
- **强化**：style 黑名单扩充 `gongbi` / `wuxia style`（v0 虽然在原文里有 gongbi 这个词，但 description 里从未允许；v1 显式列入）
- **强化**：Part 1 新增"MUST match reference excerpts"一条，锁死面部特征来源

---

## 3. User Message 拼装（v1 新版）

```
{SYSTEM_PROMPT}

Character name (for your internal identification only; DO NOT write this name in the output): {name}

## Character reference (original-novel excerpts, authoritative ground truth)
Use these excerpts to decide age, build, hairstyle, signature garments and props, and characteristic atmosphere.
Translate visual cues into English; do NOT quote any Chinese text back in your output.
- {novel_ref_1}
- {novel_ref_2}
- {novel_ref_3}
- {novel_ref_4}
- {novel_ref_5}

Optional additional bio (secondary, use only if not contradicting the reference above): {bio}    # 仅当 bio 非空时出现

Here are existing English character description examples (up to 2 per character). Follow the same style and format closely:

Character {peer_name}: "{peer_desc}"
...                                                                                             # 只保留纯英文的 peer examples

Based on the Character reference above (authoritative) and the original novel, generate 4 full-body description variants for this character. Remember: English only, no Chinese characters, no Chinese name string, no style/medium words, and the 4 Part-2 texts must be clearly different. Return a JSON array of exactly 4 strings.
```

### 和 v0 User Message 的差异
- **新增** `Character reference` 块（由 `tools/asset-manager/tests/portrait-eval/test_set.yaml:novel_refs` 注入，最多 5 条）
- **新增** "DO NOT write this name in the output" 显式告知 name 仅用于识别
- **修改** few-shot peer examples：过滤掉含中文字符的 legacy 条目（避免中文污染）
- **新增** 末尾再提醒一次 English / 4 条必须不同

### LLM 参数
```
model = $DESCRIPTION_MODEL (default: gpt-5.4)
temperature = 0.9
max_output_tokens = 1200   # v0 是 1000
```

---

## 4. 外层样式模板（A 区）
**未改。** 完整内容见 [v0_prompts.md §A](./v0_prompts.md#a-外层样式模板来源toolsasset-managerbackendtemplatesjson)。

---

## 5. P0 约束变化说明
- **保留** 的 P0：description 不出现 CJK 字符、不出现中文角色名字符串、不出现风格/medium 词。
- **松绑** 的 P0：description 现在允许：
  - 身份气质尾缀（"rakish young noble air"、"weary old retainer carriage"）
  - 英文材质/服饰名（"jade hairpin"、"sheepskin cloak"）
  - 标志性英文道具名（"curved saber"、"sword case"、"wine gourd"）
  - 角色专属姿态动词（"kneeling"、"mid-stride"、"half-turning"）
  - **条件**：必须是原著 reference 支持的，且不得以 Chinese 书写。

---

## 6. 期望在 v1 baseline 里看到
1. 徐凤年 4 条 description 互不相同，且去掉 "slightly long face" 这种 legacy 漂移。
2. 老黄 description 全英文，且面部老迈、头发白、腰间/背上有剑匣。
3. 李淳罡 至少 2 条带 "one-armed / empty sleeve" 表述。
4. 温华 保留"断臂"（test_set.yaml 对温华没说断臂 — v0 里 variant 2/4 写断臂是 GPT 串了 novel_refs；v1 注入"笑起来咧嘴露齿"+"补丁青布短袍"+"木剑/竹剑"后，预期这个幻觉消失；但若仍零星出现，可以 Phase B2 再处理）。
5. 姜泥 保持 v0 的"粗布素裙 + 婢女气质"，并加入"亡国不甘"的气质尾缀。
6. 图像层面（warm_signal）**不应该** 有结构性变化：本次只改了 description 的文字。若 PIL 对比采到 warm_signal 有>3% 绝对变化，说明 description 文字变化间接影响了生成 — 需要在 Phase A 判断。

---

## 7. 版本登记索引（累计）

| 版本 | 日期 | 主要改动 | 对应 Phase |
|------|------|---------|-----------|
| v0 | 2026-04-17 | 基线归档，未改动 | M1 |
| v1 | 2026-04-18 | description 注入角色参考资料；English-only 硬规则；修 Bug 1（徐凤年同文） + Bug 2（老黄中文/人设错）；过滤中文 few-shot | B1 |
