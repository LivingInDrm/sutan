# Sutan 游戏配乐方案调研

## 0. 结论先行

对 `Sutan` 当前版本来说，最稳妥的方案不是“一次性把所有音乐都做完”，而是：

1. **MVP 阶段先用现成授权明确的素材库 + 少量 AI 生成草稿**，快速补齐主界面、地图/江湖、战斗、商店、结算四类 BGM 和一组核心 SFX。
2. **技术上优先采用 `Howler.js + React hooks + Zustand 配置状态`**，因为仓库已经安装了 `howler`，并且项目文档里也预留了 `lib/audio.ts`、`hooks/useAudio.ts` 的架构位置。
3. **音乐资产管理采用“配置化映射”**：`screen/scene/status/event -> cue`，避免把音频逻辑散落在组件中。
4. **长期版本再考虑委托原创或用 AI + 人工后期做主题曲与角色 leitmotif（角色主题动机）**，这样既控制预算，也能逐步形成《雪中悍刀行》改编作品应有的独特气质。

当前仓库的游戏流程主要集中在：

- `src/renderer/ui/screens/TitleScreen.tsx`
- `src/renderer/ui/screens/MapScreen.tsx`
- `src/renderer/ui/screens/SceneScreen.tsx`
- `src/renderer/ui/screens/SettlementScreen.tsx`
- `src/renderer/ui/components/narrative/NarrativePlayer.tsx`
- `src/renderer/data/configs/scenes/*.json`

从这些文件看，游戏已经很适合加入“**界面层 BGM + 场景层 BGM + 交互层 SFX**”三层音频系统。

---

## 1. 音乐素材来源对比

### 1.1 总览表

| 平台/方案 | 类型 | 质量 | 价格 | 授权/商用 | 古风适配度 | 适合 Sutan 的角色 |
|---|---|---|---|---|---|---|
| **Suno** | AI 生成音乐 | 旋律性强、出稿快，适合快速找 mood；长循环和稳定编排仍需人工筛选 | 免费版不可商用；Pro 约 `$8/月`（年付口径），Premier 更高 | 官方帮助中心明确：**付费订阅期间生成的歌曲可商用**，免费计划仅非商用 | 中高，能做“古风/史诗/悲凉/宫廷”方向草稿，但容易偏流行化 | **做 BGM 草稿、主题曲 demo、情绪探索** |
| **Udio** | AI 生成音乐 | 人声与质感通常较好，氛围乐表现也不错；但对“纯游戏循环 BGM”仍需后剪辑 | 免费版有限额；Pro 搜索结果显示约 `$30/月` | 需以官方 Terms 为准；适合视为“**可用于商业项目前先做法务复核**”的候选 | 中高，擅长 cinematic/ambient，但中国古风未必稳定 | **做候选曲、片头/宣传用途探索** |
| **Stable Audio** | AI 生成音乐 | 更偏可控的 instrumental、texture、ambience；适合无歌词 BGM 和环境声底 | Free 不可商用；Creator 付费约 `$11.99/月` 起；Enterprise 更高 | 官方 FAQ/定价页显示：**付费 Creator 及以上可商用**；游戏超过一定规模需 Enterprise | 中，偏氛围与质感，适合做江湖风、风沙、庙堂 tension 底乐 | **做循环底乐、环境氛围层、过渡音频** |
| **OpenGameArt** | 免费/开源资源库 | 参差不齐，但对独立游戏友好 | 免费 | 需逐条看许可证，常见 `CC0`、`CC-BY`、`OGA-BY`、`GPL` | 中，偶尔能找到 RPG/东方/古典风，但需要筛选 | **低预算试作、SFX 补洞** |
| **Freesound** | 免费/开源资源库 | SFX 非常丰富，音乐质量不稳定 | 免费 | 许可证混合：`CC0` 可直接商用，`CC-BY` 需署名，`CC BY-NC` 不能商用 | 音乐低到中；SFX 高 | **事件音效、环境声、UI 声** |
| **Incompetech** | 免费 + 付费免署名 | 音乐质量稳定，偏传统库乐感 | 免费署名；免署名可单独买 License | Creative Commons 可商用但需署名；也可付费购买免署名授权 | 中，偏通用配乐，不一定足够“武侠” | **过渡 BGM、占位素材、工具型配乐** |
| **Pixabay Audio** | 免费资源库 | 入门够用，风格杂 | 免费 | 允许商用，但不能“原样单独再分发” | 低到中 | **占位素材、临时验证** |
| **Mixkit** | 免费资源库 | SFX 和短音乐片段实用 | 免费 | 官方有 item-specific license，需看音乐/音效条款 | 低到中 | **按钮音、过场短音、临时音效** |
| **Artlist** | 付费素材库 | 音乐整体完成度高、后期成熟 | 订阅制，价格随计划变化 | Pro/Business 面向商业项目；需确认是否覆盖游戏分发场景 | 中，偏影视音乐；中国风要靠筛选 | **高质量现成 BGM 候选库** |
| **Epidemic Sound** | 付费素材库 | 氛围、电子、影视风成熟，音效也强 | `Creator $9.99/月`、`Pro $16.99/月`、`Business $29.99/月` 等 | 官方定价说明包含 **Apps & games**，标准订阅有数量限制，超出需 Enterprise | 中，偏国际影视/内容创作风，纯古风资源不一定多 | **商业可用现成库，适合快速上线** |
| **AudioJungle** | 单曲购买/授权 | 质量波动大，但价格灵活、筛选空间大 | 按单曲授权购买 | 官方提供多档 Music License，适合“单项目单曲”采购 | 中，可搜到 oriental/chinese/cinematic 关键词 | **少量关键曲目一次性采购** |
| **委托作曲** | 定制原创 | 最能贴合世界观和角色 | 中到高；独立项目常见按首/按分钟/按包计费 | 合同可明确买断、独占、修改轮次、分发范围 | **高** | **长期最佳方案：主界面主题、结局曲、核心战斗曲** |
| **现成素材** | 商业库/免费库 | 上线快、稳定 | 低到中 | 通常较清晰，但要逐项核对 | 中 | **最适合 MVP** |

### 1.2 具体判断

#### AI 生成音乐

**优点**

- 出稿非常快，适合快速探索“朝堂 / 江湖 / 血战 / 悲凉结局”等情绪方向。
- 适合先做内部版本占位，不会卡死在“没有音乐就无法验证体验”。
- 对 `Sutan` 这种叙事+策略项目，很适合先批量生成 10~20 条草稿，再做 A/B 筛选。

**缺点**

- “中国古风 / 武侠感”并不是所有 AI 模型的强项，容易生成成“中式影视 + 新世纪 + 流行和弦”的混合风。
- 循环点、段落衔接、乐器真实度、旋律记忆点仍然常常需要人工剪辑。
- 授权虽然大体可商用，但**平台条款会变化**，正式上线前必须再次复核。

**对 Sutan 的建议**

- 可以把 AI 当作**方向验证工具**，不是最终唯一来源。
- 优先生成：
  - 宫廷/朝堂低压 BGM
  - 江湖旅途 BGM
  - 战斗紧张 BGM
  - 结局/低声望压迫 BGM

推荐 Prompt 方向示例：

```text
Instrumental wuxia game background music, guqin, xiao flute, pipa, restrained percussion, political tension, ancient court atmosphere, no vocals, loopable, 90 seconds
```

```text
Instrumental Chinese martial arts tavern theme, guzheng, erhu, bamboo flute, dusty border town, bittersweet and adventurous, no vocals, loop-friendly
```

#### 免费/开源音乐库

**优点**

- 成本几乎为零，适合先补齐完整音频系统。
- Freesound 对 SFX 很有价值，尤其是骰子、木牌、翻页、布料、脚步、风声、环境氛围。
- OpenGameArt 对独立游戏相当友好。

**缺点**

- 风格统一性差。
- 许可证混杂，尤其是 Freesound，必须过滤掉 `NC` 项。
- 很难直接找到高质量、强辨识度的“雪中 + 武侠 + 朝堂权谋”一体化音乐。

**对 Sutan 的建议**

- **免费库优先用于 SFX，不优先承担核心 BGM。**
- 若做 BGM，占位可用；正式版最好替换为付费库或原创。

#### 付费音乐素材库

**优点**

- 质量更稳定，元数据更完整，检索效率高。
- 法务风险通常低于免费混合资源和来路不明的 AI 二创内容。
- 更适合商业项目上线版本。

**缺点**

- 纯“中国风 / 武侠 / 古风”不一定多，需要大量试听。
- 订阅型库要注意“项目发布时间”“是否覆盖游戏/App”“取消订阅后的新项目权利”等细则。

**对 Sutan 的建议**

- 如果预算允许，**优先用付费库解决 MVP 正式商用 BGM**。
- AudioJungle 适合“买少数几首关键曲”。
- Epidemic 更适合“短期高效率铺库”，但要核对游戏数量/发行方式限制。
- Artlist 更像“质量不错但更偏视频创作生态”，若用于游戏，建议先单独确认条款。

#### 自定义委托制作 vs 现成素材

| 维度 | 委托原创 | 现成素材 |
|---|---|---|
| 上线速度 | 慢 | 快 |
| 风格贴合度 | 最高 | 中 |
| 独特性 | 最高 | 低到中 |
| 成本 | 中到高 | 低到中 |
| 可反复修改 | 可谈判 | 基本不可 |
| 法务复杂度 | 合同明确后较清晰 | 依赖平台标准条款 |
| 适合阶段 | 中后期正式版本 | MVP / Alpha / Beta |

**建议结论**

- **MVP：现成素材 + 少量 AI 占位**
- **正式版：核心曲目委托原创，剩余曲目继续用库乐补足**

---

## 2. 游戏音频需求清单

### 2.1 基于当前项目结构的音频分层

建议按 4 层来设计：

1. **系统层 BGM**：主界面、地图、库存、商店、结算总览
2. **场景层 BGM**：场景进入后按场景类型/scene_id 播放
3. **状态层音乐修饰**：低声望、倒计时危险、结局、关键事件
4. **交互层 SFX**：按钮、卡牌、骰子、判定结果、获得/失去资源

### 2.2 推荐 BGM 清单

#### A. 全局/界面类

| 分类 | 触发位置 | 情绪 | 建议时长/形式 | 优先级 |
|---|---|---|---|---|
| 主界面 BGM | `TitleScreen` | 苍凉、宏大、命运感、北椋史诗感 | 90~150 秒循环 | P0 |
| 地图/主循环 BGM | `MapScreen` | 江湖游历、决策前平静、轻度压迫 | 120 秒循环 | P0 |
| 商店 BGM | `scene_shop_001` 或 `ShopScreen` | 市井、交易、轻松但古意 | 60~90 秒循环 | P1 |
| 结算界面 BGM | `SettlementScreen` 总览 | 稍收束、偏叙事感 | 60~90 秒循环 | P1 |
| 背包/牌库 BGM | 后续 inventory | 轻量、不抢注意力 | 45~60 秒循环 | P2 |

#### B. 场景类

| 场景/类型 | 参考现有内容 | 建议音乐方向 | 优先级 |
|---|---|---|---|
| 宫廷/朝堂事件 | `scene_001 权力的游戏` | 低频弦乐 + 箫/古琴，压抑、权谋、冷 | P0 |
| 江湖旅途/边境茶摊 | `scene_006`、`scene_007` | 笛子、古筝、轻打击、风沙感、带人情味 | P0 |
| 挑战/决斗 | `scene_003 决斗场` | 鼓点更强、弦乐推进、紧张 | P0 |
| 沙漠/跋涉 | `scene_002 沙漠穿越` | 环境氛围为主，节奏稀疏，突出荒凉 | P1 |
| 选择型命运事件 | `scene_004 命运的抉择` | 轻悬念、分支前停顿感 | P1 |
| 商店/商旅场景 | `scene_shop_001` | 轻快、民间器乐感 | P1 |

#### C. 状态类

| 状态 | 触发条件建议 | 音乐策略 | 优先级 |
|---|---|---|---|
| 紧张状态 | `executionCountdown <= 3` 或声望持续过低 | 在当前 BGM 上叠一层低频 drone / 警示纹理，或切危险版 BGM | P1 |
| 繁荣/高声望 | 声望高、连续成功结算 | 切更开阔、更明亮的地图 BGM 变体 | P2 |
| 场景成功 | 骰检成功后 | 不切完整曲，只加 success sting | P0 |
| 场景失败/大失败 | 骰检失败后 | 短挫败音 + 低沉尾音 | P0 |
| 结局 | 游戏结束 | 独立 ending cue | P1 |

### 2.3 SFX 需求清单

#### 核心交互 SFX

| 音效 | 触发 | 说明 | 优先级 |
|---|---|---|---|
| 按钮 hover/click | 全局按钮 | 轻木质/金属 UI 音，避免现代电子感 | P0 |
| 翻页/展开 | `BookLayout`、对话推进 | 强化古卷/书册感 | P0 |
| 卡牌选中 | `CardComponent` 点击 | 轻脆、近身、可重复不烦 | P0 |
| 卡牌投入槽位 | `SceneScreen` 双击/投入 | 比普通点击更重，带“落牌”感 | P0 |
| 卡牌移除/返回手牌 | 取消或重选 | 较轻 | P1 |
| 场景进入 | 进入 `SceneScreen` | 短过门 | P1 |
| 场景完成 | 结算完成 | 收束感短音 | P1 |

#### 判定/结果 SFX

| 音效 | 触发 | 说明 | 优先级 |
|---|---|---|---|
| 骰子滚动 | 开始鉴定 | 可考虑连续滚动 + 落点收束 | P0 |
| 成功提示 | `success` / `partial_success` | 成功可更明亮，大成功更强 | P0 |
| 失败提示 | `failure` / `critical_failure` | 低音、短促、不拖长 | P0 |
| 获得金币 | 金币增加 | 轻金属/铜钱音色 | P0 |
| 失去金币 | 金币减少 | 反向/闷响 | P0 |
| 声望变化 | 声望加减 | 正向可用堂鼓/玉佩，负向用低沉擦弦 | P1 |
| 获得卡牌 | `cards_add` | 抽卡或纸片落入藏匣感 | P1 |
| 失去卡牌 | `cards_remove` | 焚毁/撤回/离散质感 | P1 |

#### 环境/过渡 SFX

| 音效 | 触发 | 说明 | 优先级 |
|---|---|---|---|
| 场景切换 | screen 切换 | 短淡入过门 | P1 |
| 日结算开始 | 点击 `Next Day` | 仪式感较强的短音 | P0 |
| 对话推进 | `NarrativePlayer` 继续 | 极轻，避免密集时刺耳 | P1 |
| 选择确认 | narrative choice | 比普通按钮音稍重 | P0 |
| 危险提醒 | 倒计时低 | 可周期触发但必须非常克制 | P2 |

### 2.4 最小可交付音频包

如果只做 **首版上线音频 MVP**，建议最少准备：

- BGM 5 首
  - 主界面 1
  - 地图/江湖 1
  - 朝堂/事件 1
  - 战斗/挑战 1
  - 商店/轻松 1
- SFX 12~16 个
  - button hover/click
  - page turn
  - card select/place/remove
  - dice start/result
  - success/failure
  - gain/loss gold
  - confirm/cancel
  - transition/day settlement

---

## 3. 技术方案推荐

## 3.1 方案比较

| 方案 | 优点 | 缺点 | 是否推荐 |
|---|---|---|---|
| **原生 Web Audio API** | 最灵活，可做精细混音、分析、调度 | 封装成本高，团队要自己处理 preload、sprite、fade、unlock 等 | 可做底层，但不建议直接裸用 |
| **Howler.js** | API 简洁，跨浏览器成熟，支持 sprite、loop、fade、音量、mute；项目已安装依赖 | 高级音乐系统能力不如专业中间件 | **推荐** |
| **Tone.js** | 音乐生成、时序和合成能力强 | 更适合程序化音乐/节拍器，不是简单游戏 BGM 播放的首选 | 不作为主方案 |

### 推荐结论

对 `Sutan` 而言，**首选 `Howler.js`**：

- 仓库已经安装 `howler`
- 架构文档已有 `lib/audio.ts`、`hooks/useAudio.ts` 预留
- 目前需求以 **BGM 播放、循环、淡入淡出、SFX 管理** 为主，不需要 Tone.js 的复杂编曲能力

---

## 3.2 推荐架构

### 目录建议

```text
src/renderer/
  assets/
    audio/
      bgm/
        title_theme.ogg
        map_wander.ogg
        court_intrigue.ogg
        battle_tension.ogg
        market_light.ogg
      sfx/
        ui_click.ogg
        ui_hover.ogg
        card_place.ogg
        card_select.ogg
        page_turn.ogg
        dice_roll.ogg
        result_success.ogg
        result_failure.ogg
  lib/
    audio/
      audioManager.ts
      bgmRegistry.ts
      sfxRegistry.ts
  hooks/
    useAudio.ts
  stores/
    audioStore.ts
  data/
    configs/
      audio/
        bgm_map.json
```

### 配置设计建议

```ts
export type BgmCue =
  | 'title'
  | 'map_default'
  | 'map_danger'
  | 'scene_court'
  | 'scene_jianghu'
  | 'scene_battle'
  | 'scene_shop'
  | 'settlement'
  | 'ending';

export interface AudioSceneMapping {
  screen?: Record<string, BgmCue>;
  sceneType?: Record<string, BgmCue>;
  sceneId?: Record<string, BgmCue>;
  state?: {
    lowCountdown?: BgmCue;
    lowReputation?: BgmCue;
  };
}
```

推荐映射策略：

1. **优先 sceneId**
2. 其次 **scene.type**
3. 最后 fallback 到 **screen 默认 BGM**

这样后续新增 `scene_008`、`scene_009` 时只改配置，不改播放器逻辑。

---

## 3.3 React 集成最佳实践

### 核心原则

1. **音频播放不要散落在每个组件内部**
2. 使用 **全局 AudioManager 单例**
3. 组件只负责“发出音频意图”，不直接 new `Howl`
4. BGM 和 SFX 分层管理
5. 所有音量、静音、当前 cue 都放到全局 store

### 适合当前项目的职责划分

| 层 | 职责 |
|---|---|
| `audioManager.ts` | Howler 实例生命周期、淡入淡出、切歌、缓存 |
| `audioStore.ts` | `masterVolume`、`bgmVolume`、`sfxVolume`、`muted`、`currentCue` |
| `useAudio.ts` | React 侧调用封装 |
| Screen/Component | 只调用 `playBgm('map_default')`、`playSfx('card_place')` |

### 代码架构示例

```ts
import { Howl, Howler } from 'howler';

type CueName = 'title' | 'map_default' | 'scene_battle';
type SfxName = 'ui_click' | 'card_place' | 'dice_roll';

const bgmSources: Record<CueName, string> = {
  title: '/assets/audio/bgm/title_theme.ogg',
  map_default: '/assets/audio/bgm/map_wander.ogg',
  scene_battle: '/assets/audio/bgm/battle_tension.ogg',
};

const sfxSources: Record<SfxName, string> = {
  ui_click: '/assets/audio/sfx/ui_click.ogg',
  card_place: '/assets/audio/sfx/card_place.ogg',
  dice_roll: '/assets/audio/sfx/dice_roll.ogg',
};

class AudioManager {
  private bgmCache = new Map<CueName, Howl>();
  private sfxCache = new Map<SfxName, Howl>();
  private currentBgm: { cue: CueName; howl: Howl } | null = null;

  setMasterVolume(volume: number) {
    Howler.volume(volume);
  }

  setMuted(muted: boolean) {
    Howler.mute(muted);
  }

  playSfx(name: SfxName, volume = 1) {
    const howl = this.getSfx(name);
    howl.volume(volume);
    howl.play();
  }

  async playBgm(cue: CueName, options?: { fadeMs?: number; volume?: number }) {
    const next = this.getBgm(cue);
    const targetVolume = options?.volume ?? 1;
    const fadeMs = options?.fadeMs ?? 600;

    if (this.currentBgm?.cue === cue) return;

    if (this.currentBgm) {
      const current = this.currentBgm.howl;
      const from = current.volume();
      current.fade(from, 0, fadeMs);
      window.setTimeout(() => current.stop(), fadeMs);
    }

    next.volume(0);
    next.play();
    next.fade(0, targetVolume, fadeMs);
    this.currentBgm = { cue, howl: next };
  }

  private getBgm(cue: CueName) {
    const cached = this.bgmCache.get(cue);
    if (cached) return cached;
    const howl = new Howl({ src: [bgmSources[cue]], loop: true, preload: true });
    this.bgmCache.set(cue, howl);
    return howl;
  }

  private getSfx(name: SfxName) {
    const cached = this.sfxCache.get(name);
    if (cached) return cached;
    const howl = new Howl({ src: [sfxSources[name]], preload: true });
    this.sfxCache.set(name, howl);
    return howl;
  }
}

export const audioManager = new AudioManager();
```

### Hook 使用示例

```ts
import { useEffect } from 'react';
import { audioManager } from '../lib/audio/audioManager';

export function useScreenBgm(cue: 'title' | 'map_default' | 'scene_battle' | 'scene_shop') {
  useEffect(() => {
    void audioManager.playBgm(cue, { fadeMs: 500, volume: 0.7 });
  }, [cue]);
}
```

### 在当前项目中的接入点建议

| 文件 | 建议接入 |
|---|---|
| `src/renderer/ui/screens/TitleScreen.tsx` | 进入时播放 `title` |
| `src/renderer/ui/screens/MapScreen.tsx` | 播放 `map_default`；倒计时危险时切 `map_danger` |
| `src/renderer/ui/screens/SceneScreen.tsx` | 可不切，等真正进入结算叙事时再切场景音乐 |
| `src/renderer/ui/screens/SettlementScreen.tsx` | 按 `sceneId/sceneType` 切到 `scene_court` / `scene_battle` / `scene_jianghu` |
| `src/renderer/ui/components/narrative/NarrativePlayer.tsx` | `onAdvance`、`onChoice` 时打轻量 SFX |
| `src/renderer/ui/components/card/CardComponent.tsx` | 选牌/双击投入时打牌面音 |

---

## 3.4 BGM 循环、淡入淡出与场景切换

### 推荐策略

- **同屏内不频繁切歌**，以免叙事被打断。
- 以 **screen / settlement stage 起点** 为切换时机，不要在 narrative 每行文本都切。
- 所有切歌都做 `400~800ms` crossfade。
- 重要结果只打 **sting**，不要切完整 BGM。

### 具体规则

1. `Title -> Map`：淡出主界面，淡入地图
2. `Map -> Settlement(scene_003)`：淡入战斗 BGM
3. `Map -> Settlement(scene_001)`：淡入朝堂 BGM
4. `Settlement -> Map`：回到地图默认 BGM
5. `executionCountdown <= 3`：若仍在地图，切危险版地图 BGM 或叠加危险 ambient

### 为什么不建议“一场景多首歌频繁切换”

- 当前项目场景文本推进很快，频繁切歌的收益不高。
- 现阶段更重要的是**整体氛围建立**，不是电影级分镜配乐。
- 先保证稳定、克制、不吵，是比“复杂 adaptive music”更有价值的。

---

## 3.5 音量控制和静音

推荐至少提供 4 个设置项：

- `masterVolume`
- `bgmVolume`
- `sfxVolume`
- `muted`

建议持久化到：

- `localStorage`
- 后续如果有 Electron 本地存档，可同步保存到本地设置

推荐默认值：

- `masterVolume = 0.85`
- `bgmVolume = 0.55`
- `sfxVolume = 0.85`

原因：

- 叙事策略游戏里，BGM 通常应低于 SFX 与文本注意力权重。

---

## 3.6 音频文件格式选择

| 格式 | 优点 | 缺点 | 用途建议 |
|---|---|---|---|
| `mp3` | 兼容性好 | 循环点精确度和压缩音质一般 | 备选，不作为首选 |
| `ogg` | 体积与音质平衡更适合游戏，循环效果通常更好 | 某些老旧环境兼容性略差，但现代 Electron/Web 基本足够 | **BGM 首选** |
| `wav` | 无损、瞬态好 | 体积大 | **SFX 源文件/短音效** |

### 对 Sutan 的推荐

- **BGM 发布格式：`ogg`**
- **SFX 发布格式：优先 `ogg`，极短且要求瞬态的可保留 `wav`**
- 统一保留源文件工程格式，发布时转码

### 体积建议

- 单首 BGM 尽量控制在 `2~5MB`
- 首版总音频体积尽量控制在 `30~50MB` 内

---

## 3.7 Electron 环境下的注意点

虽然 `Sutan` 跑在 Electron 中，但音频层本质仍然是 Web 音频生态，重点是：

1. **首个用户交互后再确保音频上下文解锁**
2. 进入主界面即可 preload 首批 BGM/SFX
3. 不要一次性 preload 全量音频
4. 避免为每次点击临时创建新的 `Howl`
5. 场景多时采用缓存池

### 额外建议

- 切换页面时使用同一 AudioManager，避免组件销毁时误停全局 BGM
- 若后续引入更多环境音，可增加 `ambience` 独立音轨

---

## 4. 实施路线图

## 4.1 阶段划分

### Phase 0：调性验证（1~2 天）

目标：快速回答“古风/武侠音频方向是否匹配现在 UI 和文本”

任务：

- 收集 10~20 条候选 BGM
  - AI 生成 5~8 条
  - 免费库/付费库试听 5~10 条
- 收集 15 个候选 SFX
- 选出 1 套 MVP 音频包

产出：

- 一个内部音频 moodboard
- 一份候选授权清单

### Phase 1：MVP 接入（2~4 天）

目标：让游戏“有完整音频反馈”

内容：

- 接入 `Howler.js` 音频管理层
- 完成全局设置：
  - 静音
  - 主音量
  - BGM 音量
  - SFX 音量
- 接 5 首 BGM
- 接 12~16 个核心 SFX
- 完成 screen / sceneType 映射

上线标准：

- 从 `Title -> Map -> Scene -> Settlement -> Map` 有连续、稳定、不突兀的音频体验

### Phase 2：内容细化（3~7 天）

目标：让不同场景真正有辨识度

内容：

- 按 `scene_id` 精细映射 BGM
- 为 `scene_001`、`scene_003`、`scene_006`、`scene_007` 增加专属 cue
- 增加状态音乐：
  - 低倒计时
  - 高/低声望
- 补充资源变化音效

### Phase 3：品质提升（长期）

目标：形成 Sutan 自己的声音品牌

内容：

- 委托原创主主题曲
- 增加角色主题动机
- 设计更细的结果 stinger
- 如有需要，再做 adaptive layers

---

## 4.2 音频资源组织与管理建议

### 资源命名建议

```text
bgm_title_theme_v1.ogg
bgm_map_wander_v1.ogg
bgm_scene_court_intrigue_v1.ogg
bgm_scene_battle_duel_v1.ogg
bgm_scene_jianghu_border_v1.ogg

sfx_ui_click_01.ogg
sfx_ui_hover_01.ogg
sfx_card_select_01.ogg
sfx_card_place_01.ogg
sfx_dice_roll_01.ogg
sfx_result_success_01.ogg
sfx_result_failure_01.ogg
```

### 推荐原则

- 文件名体现 **类型 + 用途 + 版本**
- 不在组件里硬编码文件路径
- 所有音频路径统一从 registry 导出

---

## 4.3 配置化设计建议

### 方案 A：按 screen + sceneType 映射

适合 MVP，维护简单：

```json
{
  "screen": {
    "title": "title",
    "map": "map_default",
    "shop": "scene_shop"
  },
  "sceneType": {
    "event": "scene_jianghu",
    "challenge": "scene_battle",
    "shop": "scene_shop"
  }
}
```

### 方案 B：按 sceneId 精细映射

适合后期内容增长：

```json
{
  "sceneId": {
    "scene_001": "scene_court",
    "scene_003": "scene_battle",
    "scene_006": "scene_jianghu",
    "scene_007": "scene_jianghu"
  }
}
```

### 最佳实践

**MVP 先上 A，第二阶段叠加 B。**

这样实现成本低，也足够应对当前 7 个场景配置文件。

---

## 5. 推荐方案总结

## 5.1 最适合 Sutan 当前阶段的组合

### 推荐组合

- **音乐来源**
  - MVP：`Epidemic / AudioJungle / OpenGameArt` + 少量 `Suno/Stable Audio` 草稿
  - 正式版：核心曲目委托原创，其他继续用商用库

- **技术方案**
  - `Howler.js` 作为播放核心
  - React 中通过 `useScreenBgm` / `useAudio`
  - Zustand 持有音量和静音状态
  - `screen/scene/status/event -> cue` 配置驱动

- **资源格式**
  - BGM：`ogg`
  - SFX：`ogg` 为主，少量 `wav`

### 为什么这是最优解

因为它同时满足：

1. **上线快**：项目已经有 `howler` 依赖，技术接入成本低
2. **预算可控**：不用一开始就投入整套原创 OST
3. **风格可迭代**：先用库乐和 AI 验证，再逐步替换成定制曲
4. **适配当前项目结构**：`TitleScreen`、`MapScreen`、`SettlementScreen`、`NarrativePlayer` 已经天然对应音频触发点

## 5.2 实际推荐执行顺序

如果马上进入开发，建议按这个顺序做：

1. 先找齐 **5 首 BGM + 12 个 SFX**
2. 先实现 **AudioManager / audioStore / useAudio**
3. 先接入：
   - `TitleScreen`
   - `MapScreen`
   - `SettlementScreen`
   - `NarrativePlayer`
4. 再做 `sceneId` 精细映射
5. 最后再决定哪些曲目需要委托原创替换

## 5.3 最终建议

### 若预算有限

采用：

- **Howler.js**
- **Epidemic / AudioJungle / OpenGameArt / Freesound**
- **AI 仅做草稿和占位**

### 若希望做出明显差异化

采用：

- **Howler.js + 配置化映射**
- **MVP 用现成素材**
- **主界面主题、战斗主题、结局主题委托原创**

### 一句话结论

**Sutan 最适合的不是“全 AI 配乐”或“全原创配乐”，而是“现成素材快速上线 + 核心曲目后续原创化”的混合方案。**

---

## 6. 附：落地时的授权注意事项

正式商用前建议建立一个 `AUDIO_LICENSES.md` 或表格，至少记录：

- 文件名
- 来源平台
- 作者/条目链接
- 下载日期
- 授权类型
- 是否需署名
- 订阅购买账号
- 适用项目范围
- 备注

尤其是以下情况必须谨慎：

- Freesound 的 `CC BY-NC`
- OpenGameArt 上带传染性条款的资源
- AI 平台条款更新
- 订阅平台对“游戏 / App / 项目数量 / 取消订阅后的新项目”限制

对上线版本而言，**“授权清晰”优先级高于“听起来更炫”**。