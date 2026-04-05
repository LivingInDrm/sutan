# 场景资源生成系统设计文档

## 1. 系统概述

场景资源生成系统为苏丹游戏的每个场景提供 **两类图片** 的 AI 生成能力：

| 类型 | 用途 | 尺寸 | 背景 | 构图 |
|------|------|------|------|------|
| **Icon 图** | 地图上叠加的场景图标 | 1024×1024 | 透明 | 正方形，单建筑剪影 |
| **背景图** | 进入场景后的全屏背景 | 1536×1024 | 不透明 | 宽屏 16:9 全景 |

系统复用现有 Asset Manager 的 FastAPI 后端 + React 前端架构，在已有的场景管理 Tab（SceneDetail.tsx）中扩展工坊交互。

### 1.1 数据流图

```
┌──────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│                                                                  │
│  SceneDetail.tsx                                                 │
│  ┌────────────────────────────────────────────────────────┐      │
│  │  工坊 Tab                                              │      │
│  │  ┌──────────────┐                                      │      │
│  │  │ 图片类型切换  │  [图标 ICON] / [背景 BACKDROP]       │      │
│  │  └──────┬───────┘                                      │      │
│  │         │                                              │      │
│  │         ▼                                              │      │
│  │  ┌──────────────┐    ┌───────────────────┐             │      │
│  │  │ 场景描述输入  │───▶│ AI Prompt 生成    │             │      │
│  │  │ (中文)       │    │ POST /api/scene-  │             │      │
│  │  └──────────────┘    │ generate-prompts  │             │      │
│  │                      └───────┬───────────┘             │      │
│  │                              │ 返回 4 条候选           │      │
│  │                              ▼                         │      │
│  │                      ┌───────────────────┐             │      │
│  │                      │ Prompt 候选选择    │             │      │
│  │                      │ (用户选择/编辑)    │             │      │
│  │                      └───────┬───────────┘             │      │
│  │                              │                         │      │
│  │                              ▼                         │      │
│  │                      ┌───────────────────┐             │      │
│  │                      │ 图片生成 (SSE)     │             │      │
│  │                      │ POST /api/scene-  │             │      │
│  │                      │ generate          │             │      │
│  │                      └───────┬───────────┘             │      │
│  │                              │                         │      │
│  │                              ▼                         │      │
│  │                      ┌───────────────────┐             │      │
│  │                      │ 图库 / 选中 / 部署 │             │      │
│  │                      └───────────────────┘             │      │
│  └────────────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Backend (FastAPI)                             │
│                                                                  │
│  ┌─────────────────────┐   ┌────────────────────────────┐        │
│  │ scene_profiles.json │◀─▶│ Scene CRUD APIs             │        │
│  │ (数据持久化)        │   │ GET/PUT /api/scenes/...     │        │
│  └─────────────────────┘   └────────────────────────────┘        │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │ Prompt 生成 API                                         │     │
│  │ POST /api/scene-generate-prompts                        │     │
│  │  - 输入：scene 中文描述 + 图片类型 (icon/backdrop)      │     │
│  │  - LLM (gpt-4.1): 生成 4 条候选英文 prompt             │     │
│  │  - 输出：string[]                                       │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │ 图片生成 API (SSE)                                      │     │
│  │ POST /api/scene-generate                                │     │
│  │  - 输入：prompt + image_type (icon/backdrop)            │     │
│  │  - 根据 image_type 选择系统前缀 + API 参数             │     │
│  │  - gpt-image-1: 生成图片                                │     │
│  │  - 流式返回进度                                         │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │ samples/scene_{id}/                                     │     │
│  │  ├── icon_{ts}_{n}.png     (icon 图样本)                │     │
│  │  └── backdrop_{ts}_{n}.png (背景图样本)                 │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │ maps/{map_id}/                                          │     │
│  │  ├── {scene_id}.png           (已部署 icon)             │     │
│  │  └── {scene_id}_backdrop.png  (已部署背景图)            │     │
│  └─────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Prompt 模板设计

### 2.1 设计原则

沿用角色立绘系统的 `STYLE_BASE + TEMPLATE` 分层设计：

- **标准化系统前缀**：所有场景共享，定义画风约束，尽量精简
- **差异化场景描述**：每个场景独特的 prompt 由 AI 辅助生成，填入模板的 `{prompt}` 占位符

两种图片类型各自有独立的系统前缀和模板。

### 2.2 Icon 图模板

#### 系统前缀（已有，保持不变）

```python
_MAP_STYLE_BASE = (
    "Traditional East Asian ink wash painting (水墨画) style. "
    "East Asian ink wash painting style with vibrant natural color accents, "
    "rich and varied color palette, expressive brushwork, "
    "classical Chinese painting aesthetics. "
    "NO human figures, NO portraits, NO characters, NO people, NO faces, "
    "NO text, NO labels, NO UI elements."
)
```

#### Icon 模板（已有，保持不变）

```python
SCENE_ICON_STYLE = (
    _MAP_STYLE_BASE + " "
    "Single architectural landmark illustration, icon composition, "
    "clear silhouette suitable for overlaying on a map, "
    "centered subject, transparent-compatible edges."
    "\n\n"
    "Subject: {prompt} "
    "Architectural landmark viewed at a slight elevation angle, "
    "well-defined silhouette, fine ink line detail on rooftops and structural elements, "
    "rich color washes to highlight material and atmosphere. "
    "Square icon composition with generous negative space around the subject. "
    "NO human figures, NO text, NO labels."
)
```

#### Icon 生成参数

| 参数 | 值 |
|------|-----|
| model | `gpt-image-1` |
| size | `1024x1024` |
| quality | `high` |
| background | `transparent` |
| output_format | `png` |

### 2.3 背景图模板（新增）

#### 背景图系统前缀

```python
SCENE_BACKDROP_STYLE = (
    _MAP_STYLE_BASE + " "
    "Wide panoramic scene illustration, immersive game background, "
    "atmospheric depth with ink wash gradients, dramatic lighting, "
    "detailed environment with architectural and natural elements, "
    "widescreen 16:9 composition for game scene background use."
    "\n\n"
    "Scene: {prompt} "
    "Panoramic view with rich depth layers — foreground details, "
    "middle-ground focal point, background atmospheric elements. "
    "Cinematic composition with dramatic lighting and mood. "
    "Full opaque background, no transparency. "
    "NO human figures, NO text, NO labels, NO UI elements."
)
```

#### 背景图生成参数

| 参数 | 值 |
|------|-----|
| model | `gpt-image-1` |
| size | `1536x1024` |
| quality | `high` |
| background | `opaque` |
| output_format | `png` |

### 2.4 系统前缀对比

| 维度 | Icon 图 | 背景图 |
|------|---------|--------|
| 画风基底 | `_MAP_STYLE_BASE`（共享） | `_MAP_STYLE_BASE`（共享） |
| 构图指令 | 单建筑图标、正方形、透明边缘 | 宽屏全景、沉浸式背景、纵深层次 |
| 透明背景 | 是 (transparent) | 否 (opaque) |
| 主体描述 | `Subject: {prompt}` — 建筑地标 | `Scene: {prompt}` — 全景场景 |
| 细节要求 | 剪影、负空间、俯视角 | 前景/中景/远景、电影光影、氛围 |

---

## 3. AI Prompt 生成逻辑设计

### 3.1 总体流程

```
中文场景描述 ──▶ LLM (gpt-4.1) ──▶ 4 条候选英文 prompt ──▶ 用户选择 ──▶ 图片生成
```

### 3.2 LLM System Prompt

```python
_SCENE_PROMPT_SYSTEM = """\
你是熟悉中国古典建筑、武侠场景、水墨画风格的视觉提示词专家。

## 任务
根据给定的中文场景描述，生成 4 条不同风格的英文 image generation prompt。

## 图片类型
- 当 image_type 为 "icon" 时：生成适合做地图图标的 prompt（建筑地标、单体建筑剪影）
- 当 image_type 为 "backdrop" 时：生成适合做场景背景的 prompt（宽屏全景、沉浸式场景）

## Prompt 格式规范
每条 prompt 为 50-100 英文单词，描述：
1. 主体建筑/场景的外观特征（形态、材质、结构细节）
2. 色彩倾向（Color palette: ...）
3. 氛围和光影（时间、天气、情绪）
4. 4 条之间应有差异：不同时间段、不同天气、不同角度、不同重点

## 禁止
- 不要包含人物描述
- 不要包含中文
- 不要包含 "text"、"label"、"UI" 等元素（这些由系统前缀处理）
- 不要重复系统前缀已有的风格描述（如 "ink wash painting"）

## 输出格式
严格输出 JSON 数组，包含 4 个英文字符串，不要包含任何其他内容。
"""
```

### 3.3 User Prompt 构造

```python
def _build_scene_prompt_request(
    scene_name: str,
    scene_description: str,
    scene_type: str,
    image_type: str,  # "icon" | "backdrop"
    existing_prompt: str = "",
) -> str:
    """构造 LLM user prompt，用于生成候选 prompt。"""
    type_hint = {
        "icon": "地图图标（单体建筑/地标剪影，正方形构图）",
        "backdrop": "场景背景（宽屏全景画面，沉浸式环境）",
    }.get(image_type, "")

    existing_section = ""
    if existing_prompt.strip():
        existing_section = (
            f"\n当前已有 prompt（可参考但不要简单复制）：\n{existing_prompt}\n"
        )

    return (
        f"场景名称：{scene_name}\n"
        f"场景类型：{scene_type}\n"
        f"场景描述：{scene_description}\n"
        f"目标图片类型：{type_hint}\n"
        f"{existing_section}\n"
        f"请生成 4 条不同角度的英文 prompt，以 JSON 数组格式输出。"
    )
```

### 3.4 LLM 调用参数

| 参数 | 值 |
|------|-----|
| model | `gpt-4.1`（可通过 `DESCRIPTION_MODEL` 环境变量覆盖） |
| temperature | `0.9` |
| max_output_tokens | `1500` |
| 输出格式 | JSON 数组，4 个英文字符串 |

---

## 4. 后端 API 设计

### 4.1 现有 API（保持不变）

| Endpoint | Method | 说明 |
|----------|--------|------|
| `/api/scenes` | GET | 获取所有场景（按地图分组） |
| `/api/scenes/{scene_id}` | GET | 获取单个场景 |
| `/api/scenes/{scene_id}` | PUT | 更新场景字段 |
| `/api/scene-samples/{scene_id}` | GET | 获取场景样本图片 |
| `/api/scenes/{scene_id}/select-icon` | POST | 选中图标 |
| `/api/scenes/{scene_id}/deploy` | POST | 部署图标 |
| `/api/scene-generate` | POST | 生成场景图标（SSE） |

### 4.2 新增/修改 API

#### 4.2.1 POST `/api/scene-generate-prompts` — AI 生成候选 Prompt

生成 4 条候选英文 prompt，供用户选择。

**Request:**

```python
class SceneGeneratePromptsRequest(BaseModel):
    scene_id: str
    description: str        # 中文场景描述
    image_type: str = "icon" # "icon" | "backdrop"
```

```json
{
  "scene_id": "map_001_scene_001",
  "description": "北凉王府主城，政治中枢。承接每日议事、人物互动、主线分派。",
  "image_type": "icon"
}
```

**Response:**

```json
{
  "prompts": [
    "Grand princely fortress palace on a rocky mountain ridge, sweeping curved roof eaves with golden glazed tiles, imposing crimson gate towers flanked by stone guardian lions, fortress walls of dark grey stone. Color palette: vermillion red, burnished gold, slate grey. Atmosphere: dawn light with golden rays illuminating the eastern facades, morning mist rising from the valleys below.",
    "Majestic warlord compound viewed from slight elevation, multi-tiered roof complex with upturned eaves, watchtower rising above inner courtyards, massive wooden gates with iron studs. Color palette: deep teal, warm amber, oxidized bronze. Atmosphere: overcast sky with dramatic cloud formations, banners fluttering in mountain wind.",
    "Ancient mountain palace with cascading terraces and defensive walls, ornate bracket systems on eave structures, stone stairways leading to the main hall. Color palette: cool grey stone, bright vermillion pillars, jade green roof tiles. Atmosphere: autumn twilight with golden-orange sky, falling leaves drifting across the courtyards.",
    "Fortified palace complex perched on a cliff edge, curved rooftop silhouettes against the sky, layered defensive walls with battlements, ceremonial gate with carved stone archway. Color palette: weathered brown stone, faded crimson paint, moss green accents. Atmosphere: snowy winter scene, frost covering rooftops, bare trees in the courtyard."
  ]
}
```

**实现逻辑：**

```python
@app.post("/api/scene-generate-prompts")
async def generate_scene_prompts(body: SceneGeneratePromptsRequest) -> Dict[str, Any]:
    """AI 生成 4 条候选 prompt。"""
    client = _get_openai_client()
    loop = asyncio.get_running_loop()

    # 从 scene_profiles 中获取场景信息
    profiles = _read_scene_profiles()
    scene = _find_scene_by_id(profiles, body.scene_id)
    if scene is None:
        raise HTTPException(status_code=404, detail=f"Scene not found: {body.scene_id}")

    scene_name = scene.get("name", "")
    scene_type = scene.get("type", "")
    existing_prompt = scene.get("prompt", "") if body.image_type == "icon" \
        else scene.get("backdrop_prompt", "")

    user_msg = _build_scene_prompt_request(
        scene_name=scene_name,
        scene_description=body.description,
        scene_type=scene_type,
        image_type=body.image_type,
        existing_prompt=existing_prompt,
    )

    def _call_llm():
        response = client.responses.create(
            model=DESCRIPTION_MODEL,
            instructions=_SCENE_PROMPT_SYSTEM,
            input=user_msg,
            temperature=0.9,
            max_output_tokens=1500,
        )
        content = response.output_text.strip()
        if content.startswith("```"):
            content = re.sub(r"^```[^\n]*\n?", "", content)
            content = re.sub(r"\n?```$", "", content)
        prompts = json.loads(content)
        if not isinstance(prompts, list) or len(prompts) < 4:
            raise ValueError(f"Unexpected LLM response: {content}")
        return prompts[:4]

    try:
        prompts = await loop.run_in_executor(None, _call_llm)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AI prompt generation failed: {exc}")

    return {"prompts": prompts}
```

#### 4.2.2 修改 POST `/api/scene-generate` — 支持双图片类型

在现有的 SSE 生成接口上扩展，增加 `image_type` 参数。

**修改 Request Model:**

```python
class SceneGenerateRequest(BaseModel):
    scene_id: str
    prompt: str
    count: int = 1
    image_type: str = "icon"  # 新增：  "icon" | "backdrop"
```

**实现修改要点：**

```python
async def event_stream():
    ...
    if body.image_type == "backdrop":
        # 背景图：使用 SCENE_BACKDROP_STYLE，1536x1024，opaque
        full_prompt = SCENE_BACKDROP_STYLE.format(prompt=body.prompt)
        gen_params = {
            "size": "1536x1024",
            "background": "opaque",
        }
        filename_prefix = "backdrop"
    else:
        # Icon 图：使用 SCENE_ICON_STYLE，1024x1024，transparent
        full_prompt = SCENE_ICON_STYLE.format(prompt=body.prompt)
        gen_params = {
            "size": "1024x1024",
            "background": "transparent",
        }
        filename_prefix = "icon"

    for i in range(1, count + 1):
        filename = f"{filename_prefix}_{body.scene_id}_{timestamp}_{i}.png"
        output_path = folder / filename
        ...
```

**生成函数修改：**

```python
def _generate_scene_image(client, prompt: str, output_path: Path,
                          size: str = "1024x1024",
                          background: str = "transparent") -> Path:
    """统一的场景图片生成函数，支持 icon 和 backdrop 两种参数。"""
    import base64 as _base64
    response = client.images.generate(
        model="gpt-image-1",
        prompt=prompt,
        size=size,
        quality="high",
        background=background,
        output_format="png",
        n=1,
    )
    if not response.data or not response.data[0].b64_json:
        raise RuntimeError("Image generation response missing data")
    image_bytes = _base64.b64decode(response.data[0].b64_json)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(image_bytes)
    return output_path
```

#### 4.2.3 修改 PUT `/api/scenes/{scene_id}` — 支持背景图字段

**修改 Request Model:**

```python
class UpdateSceneRequest(BaseModel):
    description: Optional[str] = None
    prompt: Optional[str] = None                # icon prompt
    backdrop_prompt: Optional[str] = None       # 新增：背景图 prompt
    name: Optional[str] = None
```

**修改处理逻辑：**

```python
if body.backdrop_prompt is not None:
    scene["backdrop_prompt"] = body.backdrop_prompt
```

#### 4.2.4 修改 POST `/api/scenes/{scene_id}/select-icon` — 支持背景图选择

**修改 Request Model:**

```python
class SelectSceneIconRequest(BaseModel):
    image_path: str
    image_type: str = "icon"   # 新增：  "icon" | "backdrop"
```

**修改处理逻辑：**

```python
if body.image_type == "backdrop":
    scene["selected_backdrop"] = str(image_path)
else:
    scene["selected_icon"] = str(image_path)
```

#### 4.2.5 修改 POST `/api/scenes/{scene_id}/deploy` — 支持背景图部署

**修改 Request Model:**

```python
class DeploySceneRequest(BaseModel):
    image_type: str = "icon"   # "icon" | "backdrop"
```

**修改处理逻辑：**

```python
if body.image_type == "backdrop":
    selected = scene.get("selected_backdrop")
    filename = f"{scene_id}_backdrop.png"
    field_name = "backdrop_path"
    clear_field = "selected_backdrop"
else:
    selected = scene.get("selected_icon")
    filename = selected_path.name
    field_name = "icon_path"
    clear_field = "selected_icon"
```

#### 4.2.6 修改 GET `/api/scene-samples/{scene_id}` — 区分图片类型

**添加查询参数：**

```python
@app.get("/api/scene-samples/{scene_id}")
def get_scene_samples(scene_id: str, image_type: str = "all") -> List[Dict]:
```

**修改文件筛选逻辑：**

```python
if folder.exists():
    for img_file in sorted(folder.glob("*.png")):
        # 根据 image_type 过滤
        if image_type == "icon" and not img_file.name.startswith(("icon_", scene_id)):
            continue
        if image_type == "backdrop" and not img_file.name.startswith("backdrop_"):
            continue
        ...
        results.append({
            "filename": img_file.name,
            "url": f"/images/{rel.as_posix()}",
            "path": str(rel),
            "abs_path": str(img_file),
            "is_current_in_game": is_current,
            "is_selected": is_selected,
            "image_type": "backdrop" if img_file.name.startswith("backdrop_") else "icon",
        })
```

### 4.3 API 总览

| Endpoint | Method | 变更类型 | 说明 |
|----------|--------|----------|------|
| `/api/scene-generate-prompts` | POST | **新增** | AI 生成 4 条候选 prompt |
| `/api/scene-generate` | POST | **修改** | 增加 `image_type` 参数 |
| `/api/scenes/{scene_id}` | PUT | **修改** | 增加 `backdrop_prompt` 字段 |
| `/api/scenes/{scene_id}/select-icon` | POST | **修改** | 增加 `image_type` 参数 |
| `/api/scenes/{scene_id}/deploy` | POST | **修改** | 增加 `image_type` 参数 |
| `/api/scene-samples/{scene_id}` | GET | **修改** | 增加 `image_type` 查询参数 |

---

## 5. 前端交互流程设计

### 5.1 SceneDetail 工坊 Tab 改造

工坊 Tab 从当前的「单一 prompt 编辑 + 直接生成」升级为「双模式 + AI 辅助 prompt 生成」流程。

#### 5.1.1 图片类型切换

在工坊 Tab 顶部增加图片类型切换器，类似现有的 Tab 切换器样式：

```
┌──────────────────────────────────────────────────────┐
│  场景描述 DESCRIPTION                                │
│  ┌─────────────────────────────────────────────────┐ │
│  │  [游戏设计说明 textarea]                         │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  ┌────────────┐ ┌─────────────┐                      │
│  │ ◆ 图标     │ │ ◇ 场景背景  │    ← 图片类型切换    │
│  │   ICON     │ │   BACKDROP  │                      │
│  └────────────┘ └─────────────┘                      │
│                                                      │
│  生成 PROMPT  [当前模式: ICON]                        │
│  ┌─────────────────────────────────────────────────┐ │
│  │  [prompt textarea — 当前选中的 prompt]           │ │
│  └─────────────────────────────────────────────────┘ │
│  ✦ 系统将自动附加「水墨建筑图标风格」前缀             │
│                                                      │
│  ┌───────────────────────────────────────┐            │
│  │  ✦ AI 生成候选 Prompt                 │            │
│  │    基于场景描述自动生成               │            │
│  └───────────────────────────────────────┘            │
│                                                      │
│  [保存修改]                                           │
│                                                      │
│  AI 生成图片 GENERATE [类型: ICON]                    │
│  数量 [1] [2] [3]                                    │
│  ┌───────────────────────────────────────┐            │
│  │  ✦ AI 生成场景图标                    │            │
│  │    水墨建筑风格                       │            │
│  └───────────────────────────────────────┘            │
└──────────────────────────────────────────────────────┘
```

#### 5.1.2 交互流程

**流程 A：AI 辅助 Prompt 生成（推荐路径）**

```
1. 用户查看/编辑「场景描述」(中文)
2. 用户选择图片类型：[图标] 或 [场景背景]
3. 点击「✦ AI 生成候选 Prompt」
4. 前端调用 POST /api/scene-generate-prompts
5. 展示 4 条候选 prompt 卡片
6. 用户点击选中一条 → 自动填入 prompt textarea
7. 用户可微调 prompt 文本
8. 点击「✦ AI 生成图片」→ SSE 流式生成
9. 生成完成后自动切换到图库 tab
```

**流程 B：手动编辑 Prompt（直接路径）**

```
1. 用户直接编辑 prompt textarea
2. 选择图片类型和数量
3. 点击「✦ AI 生成图片」
   （与现有流程一致）
```

#### 5.1.3 候选 Prompt 展示 UI

```
┌──────────────────────────────────────────────────────┐
│  ✦ AI 候选 PROMPT CANDIDATES                         │
│                                                      │
│  ┌──────────────────────────────────────────────────┐│
│  │  #1  [选择]                                      ││
│  │  Grand princely fortress palace on a rocky       ││
│  │  mountain ridge, sweeping curved roof eaves...   ││
│  └──────────────────────────────────────────────────┘│
│  ┌──────────────────────────────────────────────────┐│
│  │  #2  [选择]                                      ││
│  │  Majestic warlord compound viewed from slight    ││
│  │  elevation, multi-tiered roof complex...         ││
│  └──────────────────────────────────────────────────┘│
│  ┌──────────────────────────────────────────────────┐│
│  │  #3  [选择]                                      ││
│  │  Ancient mountain palace with cascading          ││
│  │  terraces and defensive walls...                 ││
│  └──────────────────────────────────────────────────┘│
│  ┌──────────────────────────────────────────────────┐│
│  │  #4  [选择]                                      ││
│  │  Fortified palace complex perched on a cliff     ││
│  │  edge, curved rooftop silhouettes...             ││
│  └──────────────────────────────────────────────────┘│
│                                                      │
│  [重新生成候选]                                       │
└──────────────────────────────────────────────────────┘
```

选中某条后，该卡片高亮（`borderColor: var(--border-accent)`），prompt 自动填入 textarea。

#### 5.1.4 状态管理

新增前端状态：

```typescript
// 图片类型切换
const [imageType, setImageType] = useState<'icon' | 'backdrop'>('icon');

// AI 候选 prompt
const [promptCandidates, setPromptCandidates] = useState<string[]>([]);
const [selectedCandidateIndex, setSelectedCandidateIndex] = useState<number | null>(null);
const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
const [promptGenerateError, setPromptGenerateError] = useState<string | null>(null);
```

当切换 `imageType` 时：
- 加载对应类型的已保存 prompt：`scene.prompt`（icon）或 `scene.backdrop_prompt`（backdrop）
- 清空候选列表
- 更新生成按钮文案

### 5.2 前端 API 扩展

在 `api.ts` 中新增/修改：

```typescript
// 新增类型
export interface SceneGeneratePromptsRequest {
  scene_id: string;
  description: string;
  image_type: 'icon' | 'backdrop';
}

// 修改现有类型
export interface SceneGenerateRequest {
  scene_id: string;
  prompt: string;
  count: number;
  image_type: 'icon' | 'backdrop';  // 新增
}

// 新增 API 方法
async generateScenePrompts(request: SceneGeneratePromptsRequest): Promise<string[]> {
  const response = await fetch('/api/scene-generate-prompts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail || 'Failed to generate prompts');
  }
  const data = await response.json();
  return data.prompts as string[];
},

// 修改 updateScene — 增加 backdrop_prompt
async updateScene(sceneId: string, data: {
  description?: string;
  prompt?: string;
  backdrop_prompt?: string;  // 新增
  name?: string;
}): Promise<{ scene: Scene }> { ... },

// 修改 getSceneSamples — 增加 image_type 过滤
async getSceneSamples(sceneId: string, imageType?: string): Promise<SampleImage[]> {
  const params = imageType ? `?image_type=${imageType}` : '';
  const response = await fetch(`/api/scene-samples/${encodeURIComponent(sceneId)}${params}`);
  ...
},

// 修改 selectSceneIcon — 增加 image_type
async selectSceneIcon(sceneId: string, imagePath: string, imageType: string = 'icon'): Promise<void> {
  const response = await fetch(`/api/scenes/${encodeURIComponent(sceneId)}/select-icon`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_path: imagePath, image_type: imageType }),
  });
  ...
},

// 修改 deploySceneIcon — 增加 image_type
async deploySceneIcon(sceneId: string, imageType: string = 'icon'): Promise<any> {
  const response = await fetch(`/api/scenes/${encodeURIComponent(sceneId)}/deploy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_type: imageType }),
  });
  ...
},
```

### 5.3 TypeScript 类型扩展

在 `types.ts` 中修改：

```typescript
export interface Scene {
  id: string;
  name: string;
  map_id: string;
  type: string;
  description: string;
  prompt: string;                   // icon prompt
  backdrop_prompt: string;          // 新增：背景图 prompt
  icon_path: string;
  backdrop_path: string;            // 新增：背景图部署路径
  current_icon: string;
  current_backdrop: string;         // 新增：当前背景图 URL
  has_pending_icon: boolean;
  has_pending_backdrop: boolean;    // 新增
  selected_icon?: string;
  selected_backdrop?: string;       // 新增
}

export interface SceneGenerateRequest {
  scene_id: string;
  prompt: string;
  count: number;
  image_type: 'icon' | 'backdrop'; // 新增
}

// 新增
export interface SceneGeneratePromptsRequest {
  scene_id: string;
  description: string;
  image_type: 'icon' | 'backdrop';
}

// SampleImage 扩展
export interface SampleImage {
  filename: string;
  url: string;
  path: string;
  abs_path: string;
  is_current_in_game: boolean;
  is_selected: boolean;
  image_type: 'icon' | 'backdrop'; // 新增
}
```

---

## 6. 与现有系统的集成方案

### 6.1 后端集成

#### 代码位置

所有修改集中在 `tools/asset-manager/backend/main.py`，遵循现有的模块化结构：

| 区域 | 新增内容 |
|------|---------|
| Prompt 常量区域 (~L2050) | 新增 `SCENE_BACKDROP_STYLE` 常量 |
| Scene helpers 区域 (~L2085) | 新增 `_build_scene_backdrop_prompt()` 函数 |
| Scene helpers 区域 | 修改 `_generate_scene_icon_direct()` → 重命名为 `_generate_scene_image()` 并参数化 |
| Pydantic models 区域 (~L2180) | 修改现有 models，新增 `SceneGeneratePromptsRequest` |
| Scene API 区域 (~L2200) | 新增 `/api/scene-generate-prompts` endpoint |
| Scene API 区域 | 修改现有 endpoints 支持 `image_type` |

#### 向后兼容

- 所有新增字段均有默认值（`image_type="icon"`），现有前端调用不受影响
- `scene_profiles.json` 中新增字段为可选，不影响现有数据读取
- 文件命名约定：`icon_` 前缀 vs `backdrop_` 前缀，现有 `{scene_id}_{ts}_{n}.png` 命名的图片自动归类为 icon

### 6.2 前端集成

#### 组件修改

| 文件 | 修改范围 |
|------|---------|
| `types.ts` | 扩展 Scene、SceneGenerateRequest 类型 |
| `api.ts` | 新增 `generateScenePrompts`，修改现有 API 签名 |
| `SceneDetail.tsx` | 工坊 Tab 大幅改造（图片类型切换 + AI prompt 候选） |
| `SceneList.tsx` | 列表项增加背景图状态指示（可选） |

#### 不需要修改的组件

- `WorkshopTab.tsx` — 场景工坊不使用这个共享组件（场景的工坊逻辑较特殊，不适合用 variant-based 的 WorkshopTab）
- `Gallery.tsx` — 复用现有图库组件，无需修改
- 角色管理相关组件 — 完全独立，无影响

### 6.3 文件存储约定

```
scripts/samples/
└── scene_{scene_id}/
    ├── icon_{scene_id}_{timestamp}_{n}.png        # icon 图样本
    ├── backdrop_{scene_id}_{timestamp}_{n}.png     # 背景图样本
    └── {scene_id}_{timestamp}_{n}.png              # 旧格式 icon（向后兼容）

tools/asset-manager/backend/maps/
└── {map_id}/
    ├── terrain.png
    ├── {scene_id}.png                              # 已部署 icon
    └── {scene_id}_backdrop.png                     # 已部署背景图
```

---

## 7. scene_profiles.json 数据结构扩展

### 7.1 现有结构（不变）

```json
{
  "maps": {
    "map_001": {
      "name": "北凉道与边塞",
      "terrain": {
        "prompt": "...",
        "icon_path": "tools/asset-manager/backend/maps/map_001/terrain.png"
      },
      "scenes": [
        {
          "id": "map_001_scene_001",
          "name": "清凉山王府",
          "map_id": "map_001",
          "type": "枢纽",
          "description": "北凉王府主城，政治中枢...",
          "prompt": "Top-down map icon of ancient Chinese warlord's...",
          "icon_path": "tools/asset-manager/backend/maps/map_001/scene_001.png"
        }
      ]
    }
  }
}
```

### 7.2 扩展字段

每个 scene 对象新增以下可选字段：

```json
{
  "id": "map_001_scene_001",
  "name": "清凉山王府",
  "map_id": "map_001",
  "type": "枢纽",
  "description": "北凉王府主城，政治中枢...",

  "prompt": "Top-down map icon of ...",
  "icon_path": "tools/asset-manager/backend/maps/map_001/scene_001.png",
  "selected_icon": null,

  "backdrop_prompt": "Grand princely fortress palace...",
  "backdrop_path": "tools/asset-manager/backend/maps/map_001/map_001_scene_001_backdrop.png",
  "selected_backdrop": null
}
```

#### 新增字段说明

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `backdrop_prompt` | `string` | `""` | 背景图生成 prompt（英文） |
| `backdrop_path` | `string` | `""` | 已部署背景图的相对路径 |
| `selected_backdrop` | `string \| null` | `null` | 待部署的背景图样本绝对路径 |
| `selected_icon` | `string \| null` | `null` | 待部署的 icon 样本绝对路径（已有，此处明确） |

### 7.3 向后兼容性

- 所有新增字段为可选（不存在时视为空字符串/null）
- 后端读取时使用 `.get("field", default)` 安全访问
- 不需要数据迁移脚本——旧数据自然缺失这些字段，读取时返回默认值

---

## 8. 实施优先级建议

| 阶段 | 内容 | 依赖 |
|------|------|------|
| P0 | 背景图 prompt 模板 + `_generate_scene_image()` 参数化 | 无 |
| P0 | 修改 `/api/scene-generate` 支持 `image_type` | 上述 |
| P0 | 修改 `scene_profiles.json` 读写支持新字段 | 无 |
| P1 | 新增 `/api/scene-generate-prompts` AI 候选 API | 无 |
| P1 | 前端图片类型切换 UI | P0 |
| P1 | 前端 AI 候选 prompt 展示/选择 UI | P1 API |
| P2 | 修改 select-icon / deploy 支持 `image_type` | P0 |
| P2 | 图库按 image_type 过滤 | P0 |
| P2 | SceneList 背景图状态指示 | P0 |
