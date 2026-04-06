import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Item, ItemProfile, ItemDeployPreview } from '../types';
import { api } from '../api';
import WorkshopTab from './WorkshopTab';
import type { WorkshopConfig, WorkshopVariant } from './WorkshopTab';
import Gallery from './Gallery';

interface ItemDetailProps {
  item: Item;
  onUpdate: () => void | Promise<void>;
}

type DetailTab = 'workshop' | 'profile' | 'deploy';

const EQUIPMENT_TYPE_OPTIONS = ['weapon', 'armor', 'accessory', 'mount'];
const EQUIPMENT_TYPE_LABELS: Record<string, string> = {
  weapon: '武器',
  armor: '甲胄',
  accessory: '饰品/法器',
  mount: '坐骑',
};

const RARITY_LABELS: Record<string, string> = {
  gold: '金 · GOLD',
  silver: '银 · SILVER',
  copper: '铜 · COPPER',
  stone: '石 · STONE',
  divine: '神 · DIVINE',
};

const RARITY_COLORS: Record<string, string> = {
  gold: '#f5c842',
  silver: '#b0b8c8',
  copper: '#c87040',
  stone: '#808080',
  divine: '#c8a8ff',
};

const ATTRIBUTE_KEYS = ['physique', 'charm', 'wisdom', 'combat', 'social', 'survival', 'stealth', 'magic'];
const ATTRIBUTE_LABELS: Record<string, string> = {
  physique: '体魄',
  charm: '魅力',
  wisdom: '智谋',
  combat: '武力',
  social: '交际',
  survival: '生存',
  stealth: '隐匿',
  magic: '灵力',
};

const DEFAULT_PROFILE: ItemProfile = {
  type: 'equipment',
  equipment_type: 'weapon',
  rarity: 'copper',
  description: '',
  lore: '',
  attribute_bonus: {},
  special_bonus: {},
  gem_slots: 0,
  tags: [],
};

const WORKSHOP_CONFIG: WorkshopConfig = {
  generateButtonText: '生成物品图片',
  generateButtonSubtext: '水墨风格',
  regeneratePanelTitle: 'AI 重新生成 VARIANT DESCRIPTIONS',
  regeneratePanelSubtitle: '输入物品简介，AI 将重新生成所有 variant descriptions 并覆盖现有内容',
  regeneratePlaceholder: '物品简介（可选，如：古老的天阶神剑，剑身流光溢彩...）',
  descriptionPlaceholder: '输入物品的视觉描述...',
};

/** Rarity-based visual enhancement phrases (must mirror backend RARITY_VISUAL_ENHANCEMENTS) */
const RARITY_ENHANCEMENTS: Record<string, { descSuffix: string; styleAddition: string }> = {
  stone: {
    descSuffix: '',
    styleAddition:
      'Muted earthy tones — dark charcoal ink with faint ochre and stone-gray washes, ' +
      'rough unfinished texture, minimal color, rustic and unadorned appearance. ',
  },
  copper: {
    descSuffix: ', showing warm bronze and copper tones',
    styleAddition:
      'Warm copper-brown and bronze color washes, earthy amber hues with reddish-brown tints, ' +
      'aged patina effect, modest craftsmanship rendered in warm ink tones. ',
  },
  silver: {
    descSuffix: ', refined craftsmanship visible in every detail',
    styleAddition:
      'Cool silver-blue color palette, pale cyan and steel-gray ink washes, ' +
      'subtle ornamental patterns, polished metallic sheen rendered with cool-toned highlights, ' +
      'exquisite workmanship with precise crisp ink strokes. ',
  },
  gold: {
    descSuffix: ', adorned with ornate engravings and radiant golden accents',
    styleAddition:
      'Rich warm golden-yellow and amber color washes, vivid jewel-tone accents (deep red, emerald green, sapphire blue), ' +
      'ornate engravings with golden ink-wash luminescence, ' +
      'luxurious masterwork quality with warm glowing highlights and rich color contrast. ',
  },
  divine: {
    descSuffix: ', emanating sacred divine aura with ethereal celestial light',
    styleAddition:
      'Vivid multicolor celestial palette — glowing azure, violet, and gold radiating outward, ' +
      'intense luminous color contrasts with sacred white-gold light beams, ' +
      'intricate ancient runes shimmering in vibrant hues, ' +
      'celestial energy wisps in brilliant blues and purples surrounding the object, ' +
      'transcendent divine presence expressed through dramatic color and light. ',
  },
};

/** Build the full assembled prompt for an item description, with rarity-layered visual enhancement */
function buildItemPrompt(description: string, rarity: string = 'silver'): string {
  if (!description) return '（请先选择或编辑一个 variant description）';
  const enh = RARITY_ENHANCEMENTS[rarity] ?? RARITY_ENHANCEMENTS['silver'];
  return (
    `Game equipment illustration icon: ${description}${enh.descSuffix}. Rendered in traditional xieyi (写意) ink wash painting style. ` +
    `Style: semi-realistic Chinese ink wash (shui mo), expressive brushwork with feibi dry-brush highlights, ` +
    `ink washes with natural color accents, traditional Chinese painting aesthetics, elegant restraint. ` +
    `${enh.styleAddition}` +
    `Pure transparent background, PNG with alpha channel. ` +
    `Display the complete object in full view — do not crop or truncate any part of the item. ` +
    `For elongated items such as spears, staves, or long swords, fit the entire object within the frame using a slight diagonal composition. ` +
    `Centered composition, single object displayed on its own. ` +
    `CRITICAL REQUIREMENT: The image must be completely free of any text, letters, words, characters, writing systems, ` +
    `calligraphy, seals, stamps, chop marks, red seal marks, watermarks, signatures, inscriptions, or labels of any kind.`
  );
}

export default function ItemDetail({ item, onUpdate }: ItemDetailProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('workshop');

  // Variants state (loaded from API, passed to WorkshopTab)
  const [variants, setVariants] = useState<WorkshopVariant[]>([]);

  // Profile state
  const [profile, setProfile] = useState<ItemProfile>(DEFAULT_PROFILE);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isGeneratingProfile, setIsGeneratingProfile] = useState(false);
  const [attrBonusInput, setAttrBonusInput] = useState<Record<string, string>>({});
  const [specialBonusInput, setSpecialBonusInput] = useState<Record<string, string>>({});
  const [tagInput, setTagInput] = useState('');

  // Deploy state
  const [deployPreview, setDeployPreview] = useState<ItemDeployPreview | null>(null);
  const [loadingDeployPreview, setLoadingDeployPreview] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<{ success: boolean; message: string } | null>(null);

  // ─── Load variants from API ───────────────────────────────────────────────
  const loadVariants = useCallback(async () => {
    try {
      const data = await api.getItemVariants(item.name);
      setVariants(data.map((v) => ({ index: v.index, description: v.description })));
    } catch (err) {
      console.error('Failed to load item variants', err);
    }
  }, [item.name]);

  // ─── Load profile ─────────────────────────────────────────────────────────
  const loadProfile = useCallback(async () => {
    try {
      setLoadingProfile(true);
      const data = await api.getItemProfile(item.name);
      setProfile(data);
      const ab: Record<string, string> = {};
      Object.entries(data.attribute_bonus || {}).forEach(([k, v]) => { ab[k] = String(v); });
      setAttrBonusInput(ab);
      const sb: Record<string, string> = {};
      Object.entries(data.special_bonus || {}).forEach(([k, v]) => { sb[k] = String(v); });
      setSpecialBonusInput(sb);
    } catch (err) {
      console.error('Failed to load item profile', err);
    } finally {
      setLoadingProfile(false);
    }
  }, [item.name]);

  // ─── Load deploy preview ──────────────────────────────────────────────────
  const loadDeployPreview = useCallback(async () => {
    try {
      setLoadingDeployPreview(true);
      setDeployResult(null);
      const data = await api.getItemDeployPreview(item.name);
      setDeployPreview(data);
    } catch (err) {
      console.error('Failed to load item deploy preview', err);
    } finally {
      setLoadingDeployPreview(false);
    }
  }, [item.name]);

  // ─── Reset on item switch ─────────────────────────────────────────────────
  useEffect(() => {
    setVariants([]);
    setProfileSaved(false);
    setProfileError(null);
    setDeployResult(null);
    setDeployPreview(null);
  }, [item.name]);

  // ─── Initial data load ────────────────────────────────────────────────────
  useEffect(() => {
    loadVariants();
  }, [item.name, loadVariants]);

  // ─── Tab-specific data load ───────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'profile') loadProfile();
    if (activeTab === 'deploy') loadDeployPreview();
  }, [activeTab, loadProfile, loadDeployPreview]);

  // ─── Profile handlers ─────────────────────────────────────────────────────
  const handleAttrBonusChange = (key: string, value: string) => {
    setAttrBonusInput((prev) => ({ ...prev, [key]: value }));
    const num = parseInt(value, 10);
    if (!isNaN(num)) {
      setProfile((prev) => {
        const ab = { ...prev.attribute_bonus };
        if (num === 0) delete ab[key];
        else ab[key] = num;
        return { ...prev, attribute_bonus: ab };
      });
    }
  };

  const handleSpecialBonusChange = (key: string, value: string) => {
    setSpecialBonusInput((prev) => ({ ...prev, [key]: value }));
    const num = parseInt(value, 10);
    if (!isNaN(num)) {
      setProfile((prev) => {
        const sb = { ...prev.special_bonus };
        if (num === 0) delete sb[key];
        else sb[key] = num;
        return { ...prev, special_bonus: sb };
      });
    }
  };

  const handleTagAdd = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !profile.tags.includes(tag)) {
      setProfile((p) => ({ ...p, tags: [...p.tags, tag] }));
    }
    setTagInput('');
  };

  const handleTagRemove = (tag: string) => {
    setProfile((p) => ({ ...p, tags: p.tags.filter((t) => t !== tag) }));
  };

  const handleSaveProfile = async () => {
    try {
      setIsSavingProfile(true);
      setProfileError(null);
      const updated = await api.updateItemProfile(item.name, profile);
      setProfile(updated);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
      onUpdate();
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleGenerateProfile = async () => {
    try {
      setIsGeneratingProfile(true);
      setProfileError(null);
      const generated = await api.generateItemProfile(item.name);
      setProfile(generated);
      const ab: Record<string, string> = {};
      Object.entries(generated.attribute_bonus || {}).forEach(([k, v]) => { ab[k] = String(v); });
      setAttrBonusInput(ab);
      const sb: Record<string, string> = {};
      Object.entries(generated.special_bonus || {}).forEach(([k, v]) => { sb[k] = String(v); });
      setSpecialBonusInput(sb);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'AI 生成失败');
    } finally {
      setIsGeneratingProfile(false);
    }
  };

  // ─── Deploy handler ───────────────────────────────────────────────────────
  const handleDeploy = async () => {
    try {
      setIsDeploying(true);
      setDeployResult(null);
      const result = await api.deployItem(item.name);
      setDeployResult({
        success: true,
        message: `部署成功！物品已${result.action === 'updated' ? '更新' : '新增'}到游戏数据。`,
      });
      await loadDeployPreview();
      onUpdate();
    } catch (err) {
      setDeployResult({
        success: false,
        message: err instanceof Error ? err.message : '部署失败',
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const rarityColor = RARITY_COLORS[profile.rarity] || '#808080';

  // Memoized assemblePrompt that reflects the current profile.rarity —
  // so the ASSEMBLED PROMPT preview in WorkshopTab updates as rarity changes.
  const assembleItemPrompt = useMemo(
    () => (description: string) => buildItemPrompt(description, profile.rarity),
    [profile.rarity],
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>{item.name}</h2>
          <div style={styles.subtitle}>
            {EQUIPMENT_TYPE_LABELS[item.equipment_type] || item.equipment_type}
          </div>
        </div>

        <div style={styles.tabs}>
          {([
            ['workshop', '物品工坊', 'WORKSHOP'],
            ['profile', '物品属性', 'PROFILE'],
            ['deploy', '部署', 'DEPLOY'],
          ] as [DetailTab, string, string][]).map(([key, label, sublabel]) => (
            <button
              key={key}
              style={{
                ...styles.tab,
                ...(activeTab === key ? styles.tabActive : {}),
              }}
              onClick={() => setActiveTab(key)}
            >
              <span>{label}</span>
              <span style={styles.tabLabel}>{sublabel}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={styles.content}>
        {/* ─── WORKSHOP TAB ──────────────────────────────────────────────── */}
        {activeTab === 'workshop' && (
          <WorkshopTab
            entityName={item.name}
            variants={variants}
            config={WORKSHOP_CONFIG}
            assemblePrompt={assembleItemPrompt}
            onSaveDescription={async (variantIndex, description) => {
              await api.updateItemVariant(item.name, variantIndex, description);
            }}
            onRegenerateVariants={async (bio) => {
              return api.regenerateItemVariants(item.name, bio);
            }}
            onGenerateImages={async (_variantIndex, description, count, onProgress) => {
              await api.generateItemImages(
                { asset_type: 'item', name: item.name, description, count },
                onProgress,
              );
            }}
            onLoadSamples={() => api.getItemSamples(item.name)}
            onVariantsRegenerated={(descriptions) => {
              // Update local variants state with new descriptions
              setVariants((prev) =>
                prev.map((v, i) => ({
                  ...v,
                  description: descriptions[i] ?? v.description,
                })),
              );
              onUpdate();
            }}
            galleryRenderer={({ samples, onRefresh }) => (
              <Gallery
                images={samples}
                characterName={item.name}
                onSelect={onRefresh}
                onSelectImage={async (img) => {
                  await api.selectItemImage(item.name, img.abs_path);
                  onRefresh();
                  onUpdate();
                }}
                selectLabel="物品图"
              />
            )}
          />
        )}

        {/* ─── PROFILE TAB ─────────────────────────────────────────────── */}
        {activeTab === 'profile' && (
          <div style={styles.profileView}>
            {loadingProfile ? (
              <div style={styles.loadingState}>
                <div className="spinner"></div>
                <div style={styles.loadingText}>LOADING PROFILE...</div>
              </div>
            ) : (
              <>
                {/* Profile Actions Bar */}
                <div style={styles.profileActionsBar}>
                  <div style={styles.profileActionsRight}>
                    <button
                      style={styles.aiProfileBtn}
                      onClick={handleGenerateProfile}
                      disabled={isGeneratingProfile}
                    >
                      {isGeneratingProfile ? (
                        <><div className="spinner"></div><span>AI 生成中...</span></>
                      ) : (
                        <span>✦ AI 重新生成</span>
                      )}
                    </button>
                    <button
                      style={{
                        ...styles.saveProfileBtn,
                        ...(profileSaved ? styles.saveProfileBtnSuccess : {}),
                      }}
                      onClick={handleSaveProfile}
                      disabled={isSavingProfile}
                    >
                      {isSavingProfile ? (
                        <><div className="spinner"></div><span>保存中...</span></>
                      ) : profileSaved ? (
                        <span>✓ 已保存</span>
                      ) : (
                        <span>保存属性</span>
                      )}
                    </button>
                  </div>
                </div>

                {profileError && (
                  <div style={styles.profileError}>⚠ {profileError}</div>
                )}

                {/* Equipment Type */}
                <section style={styles.profileSection}>
                  <div style={styles.sectionHeader}>
                    <div style={styles.sectionTitle}>装备类型 EQUIPMENT TYPE</div>
                  </div>
                  <div style={styles.equipTypeGrid}>
                    {EQUIPMENT_TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        style={{
                          ...styles.equipTypeBtn,
                          ...(profile.equipment_type === opt ? styles.equipTypeBtnActive : {}),
                        }}
                        onClick={() => setProfile((p) => ({ ...p, equipment_type: opt }))}
                      >
                        {EQUIPMENT_TYPE_LABELS[opt]}
                      </button>
                    ))}
                  </div>
                </section>

                {/* Rarity */}
                <section style={styles.profileSection}>
                  <div style={styles.sectionHeader}>
                    <div style={styles.sectionTitle}>稀有度 RARITY</div>
                    <div style={{ ...styles.rarityBadge, color: rarityColor, borderColor: rarityColor }}>
                      {RARITY_LABELS[profile.rarity] || profile.rarity}
                    </div>
                  </div>
                  <div style={styles.rarityGrid}>
                    {(['divine', 'gold', 'silver', 'copper', 'stone'] as const).map((r) => (
                      <button
                        key={r}
                        style={{
                          ...styles.rarityBtn,
                          borderColor: profile.rarity === r ? RARITY_COLORS[r] : 'var(--border-primary)',
                          color: profile.rarity === r ? RARITY_COLORS[r] : 'var(--text-tertiary)',
                          background: profile.rarity === r ? 'var(--bg-elevated)' : 'var(--bg-tertiary)',
                        }}
                        onClick={() => setProfile((p) => ({ ...p, rarity: r }))}
                      >
                        {RARITY_LABELS[r]}
                      </button>
                    ))}
                  </div>
                </section>

                {/* Attribute Bonus */}
                <section style={styles.profileSection}>
                  <div style={styles.sectionHeader}>
                    <div style={styles.sectionTitle}>属性加成 ATTRIBUTE BONUS</div>
                  </div>
                  <div style={styles.attrGrid}>
                    {ATTRIBUTE_KEYS.map((key) => (
                      <div key={key} style={styles.attrRow}>
                        <div style={styles.attrLabel}>
                          <span style={styles.attrLabelCn}>{ATTRIBUTE_LABELS[key]}</span>
                          <span style={styles.attrLabelEn}>{key.toUpperCase()}</span>
                        </div>
                        <input
                          type="number"
                          value={attrBonusInput[key] ?? ''}
                          onChange={(e) => handleAttrBonusChange(key, e.target.value)}
                          placeholder="0"
                          min={-5}
                          max={15}
                          style={styles.attrInput}
                        />
                      </div>
                    ))}
                  </div>
                </section>

                {/* Special Bonus */}
                <section style={styles.profileSection}>
                  <div style={styles.sectionHeader}>
                    <div style={styles.sectionTitle}>特殊加成 SPECIAL BONUS</div>
                  </div>
                  <div style={styles.specialAttrGrid}>
                    {(['support', 'reroll'] as const).map((key) => (
                      <div key={key} style={styles.attrRow}>
                        <div style={styles.attrLabel}>
                          <span style={styles.attrLabelCn}>{key === 'support' ? '支援' : '重骰'}</span>
                          <span style={styles.attrLabelEn}>{key.toUpperCase()}</span>
                        </div>
                        <input
                          type="number"
                          value={specialBonusInput[key] ?? ''}
                          onChange={(e) => handleSpecialBonusChange(key, e.target.value)}
                          placeholder="0"
                          min={-5}
                          max={10}
                          style={styles.attrInput}
                        />
                      </div>
                    ))}
                    <div style={styles.attrRow}>
                      <div style={styles.attrLabel}>
                        <span style={styles.attrLabelCn}>宝石槽</span>
                        <span style={styles.attrLabelEn}>GEM SLOTS</span>
                      </div>
                      <input
                        type="number"
                        value={profile.gem_slots ?? 0}
                        onChange={(e) =>
                          setProfile((p) => ({
                            ...p,
                            gem_slots: Math.min(5, Math.max(0, Number(e.target.value))),
                          }))
                        }
                        min={0}
                        max={5}
                        style={styles.attrInput}
                      />
                    </div>
                  </div>
                </section>

                {/* Tags */}
                <section style={styles.profileSection}>
                  <div style={styles.sectionHeader}>
                    <div style={styles.sectionTitle}>标签 TAGS</div>
                  </div>
                  <div style={styles.tagList}>
                    {profile.tags.map((tag) => (
                      <span key={tag} style={styles.tag}>
                        {tag}
                        <button style={styles.tagRemove} onClick={() => handleTagRemove(tag)}>×</button>
                      </span>
                    ))}
                  </div>
                  <div style={styles.tagInputRow}>
                    <input
                      style={styles.tagInput}
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleTagAdd()}
                      placeholder="输入标签后回车添加 (如: weapon, legendary, ancient...)"
                    />
                    <button style={styles.tagAddBtn} onClick={handleTagAdd}>添加</button>
                  </div>
                  <div style={styles.tagHint}>
                    常用: weapon armor accessory mount legendary rare ancient cursed blessed fire ice
                  </div>
                </section>

                {/* Description */}
                <section style={styles.profileSection}>
                  <div style={styles.sectionHeader}>
                    <div style={styles.sectionTitle}>物品描述 DESCRIPTION</div>
                    <div style={styles.sectionMeta}>游戏内展示文字</div>
                  </div>
                  <textarea
                    style={{ ...styles.textarea, minHeight: '80px' }}
                    value={profile.description}
                    onChange={(e) => setProfile((p) => ({ ...p, description: e.target.value }))}
                    placeholder="游戏内展示的物品描述..."
                  />
                </section>

                {/* Lore */}
                <section style={styles.profileSection}>
                  <div style={styles.sectionHeader}>
                    <div style={styles.sectionTitle}>背景故事 LORE</div>
                    <div style={styles.sectionMeta}>物品传说</div>
                  </div>
                  <textarea
                    style={{ ...styles.textarea, minHeight: '100px' }}
                    value={profile.lore}
                    onChange={(e) => setProfile((p) => ({ ...p, lore: e.target.value }))}
                    placeholder="物品的历史背景和传说..."
                  />
                </section>
              </>
            )}
          </div>
        )}

        {/* ─── DEPLOY TAB ──────────────────────────────────────────────── */}
        {activeTab === 'deploy' && (
          <div style={styles.deployView}>
            {loadingDeployPreview ? (
              <div style={styles.loadingState}>
                <div className="spinner"></div>
                <div style={styles.loadingText}>LOADING DEPLOY STATUS...</div>
              </div>
            ) : (
              <>
                {deployPreview && (
                  <section style={styles.deployStatusSection}>
                    <div style={styles.sectionHeader}>
                      <div style={styles.sectionTitle}>DEPLOY STATUS</div>
                    </div>
                    <div style={styles.deployStatusGrid}>
                      <div style={styles.deployStatusItem}>
                        <div style={styles.deployStatusLabel}>游戏状态</div>
                        <div style={{
                          ...styles.deployStatusValue,
                          color: deployPreview.is_deployed ? 'var(--success)' : 'var(--text-tertiary)',
                        }}>
                          {deployPreview.is_deployed ? '✓ 已部署' : '○ 未部署'}
                        </div>
                      </div>
                      <div style={styles.deployStatusItem}>
                        <div style={styles.deployStatusLabel}>物品属性</div>
                        <div style={{
                          ...styles.deployStatusValue,
                          color: deployPreview.has_profile ? 'var(--success)' : 'var(--error)',
                        }}>
                          {deployPreview.has_profile ? '✓ 已配置' : '✗ 未配置'}
                        </div>
                      </div>
                      <div style={styles.deployStatusItem}>
                        <div style={styles.deployStatusLabel}>图片素材</div>
                        <div style={{
                          ...styles.deployStatusValue,
                          color: deployPreview.has_image ? 'var(--success)' : 'var(--text-tertiary)',
                        }}>
                          {deployPreview.has_image ? '✓ 有素材' : '○ 无素材'}
                        </div>
                      </div>
                    </div>

                    <div style={styles.imageChangeRow}>
                      {deployPreview.image_change?.has_change ? (
                        <div style={styles.imageChangeAlert}>
                          <span style={styles.imageChangeIcon}>⇄</span>
                          <span>
                            待部署图片：{' '}
                            <strong style={{ color: '#4a9eff' }}>
                              {deployPreview.image_change.selected_image_filename}
                            </strong>
                          </span>
                        </div>
                      ) : (
                        <div style={styles.imageChangeNeutral}>
                          <span>○ 图片保持不变（无选定的新图片）</span>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {deployPreview?.preview_card && (
                  <section style={styles.section}>
                    <div style={styles.sectionHeader}>
                      <div style={styles.sectionTitle}>PREVIEW · 将写入 equipment.json</div>
                    </div>
                    <div style={styles.promptPreview}>
                      <pre style={styles.promptText}>
                        {JSON.stringify(deployPreview.preview_card, null, 2)}
                      </pre>
                    </div>
                  </section>
                )}

                {deployPreview && !deployPreview.has_profile && (
                  <div style={styles.deployWarning}>
                    ⚠ 物品尚未配置属性，请先前往「物品属性」tab 配置或 AI 生成属性。
                  </div>
                )}

                {deployResult && (
                  <div style={{
                    ...styles.deployResult,
                    borderColor: deployResult.success ? 'var(--success)' : 'var(--error)',
                    color: deployResult.success ? 'var(--success)' : 'var(--error)',
                  }}>
                    {deployResult.success ? '✓ ' : '⚠ '}{deployResult.message}
                  </div>
                )}

                <section style={styles.section}>
                  <div style={styles.deployBtnRow}>
                    <button
                      style={{
                        ...styles.deployBtn,
                        opacity: deployPreview?.has_profile ? 1 : 0.5,
                      }}
                      onClick={handleDeploy}
                      disabled={isDeploying || !deployPreview?.has_profile}
                    >
                      {isDeploying ? (
                        <><div className="spinner"></div><span>部署中...</span></>
                      ) : (
                        <>
                          <span>{deployPreview?.is_deployed ? '更新部署' : '一键部署到游戏'}</span>
                          <span style={styles.buttonLabel}>DEPLOY TO GAME</span>
                        </>
                      )}
                    </button>
                    <button
                      style={styles.refreshBtn}
                      onClick={loadDeployPreview}
                      disabled={loadingDeployPreview}
                    >
                      刷新状态
                    </button>
                  </div>
                </section>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-primary)',
  },
  header: {
    padding: '32px 40px',
    borderBottom: '1px solid var(--border-primary)',
    background: 'var(--bg-secondary)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '32px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '11px',
    fontWeight: '400',
    color: 'var(--text-tertiary)',
    letterSpacing: '0.05em',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  tab: {
    padding: '10px 20px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-primary)',
    color: 'var(--text-secondary)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '2px',
    cursor: 'pointer',
  },
  tabActive: {
    background: 'var(--bg-elevated)',
    borderColor: 'var(--border-accent)',
    color: 'var(--text-accent)',
  },
  tabLabel: {
    fontSize: '9px',
    fontWeight: '400',
    letterSpacing: '0.05em',
    opacity: 0.6,
  },
  content: {
    flex: '1',
    overflow: 'auto',
  },
  profileView: {
    padding: '32px 40px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  deployView: {
    padding: '32px 40px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  section: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-primary)',
    padding: '24px',
  },
  profileSection: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-primary)',
    padding: '20px 24px',
  },
  deployStatusSection: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-primary)',
    padding: '20px 24px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid var(--border-subtle)',
  },
  sectionTitle: {
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.1em',
    color: 'var(--text-accent)',
  },
  sectionMeta: {
    fontSize: '10px',
    fontWeight: '400',
    color: 'var(--text-tertiary)',
  },
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    padding: '80px 40px',
  },
  loadingText: {
    fontSize: '11px',
    fontWeight: '500',
    letterSpacing: '0.1em',
    color: 'var(--text-tertiary)',
  },
  // ── Profile tab ──
  profileActionsBar: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: '12px 0',
  },
  profileActionsRight: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  aiProfileBtn: {
    padding: '10px 20px',
    background: '#4a3fa0',
    border: '1px solid #7c6af5',
    color: '#e0d9ff',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontWeight: '600',
    fontSize: '13px',
    cursor: 'pointer',
  },
  saveProfileBtn: {
    padding: '10px 20px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-accent)',
    color: 'var(--text-accent)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontWeight: '600',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  saveProfileBtnSuccess: {
    borderColor: 'var(--success)',
    color: 'var(--success)',
  },
  profileError: {
    padding: '12px 16px',
    background: 'rgba(255,80,80,0.08)',
    border: '1px solid var(--error)',
    color: 'var(--error)',
    fontSize: '13px',
  },
  equipTypeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '10px',
  },
  equipTypeBtn: {
    padding: '10px 12px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-primary)',
    color: 'var(--text-tertiary)',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  equipTypeBtnActive: {
    background: 'var(--bg-elevated)',
    borderColor: 'var(--border-accent)',
    color: 'var(--text-accent)',
  },
  rarityBadge: {
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.05em',
    padding: '4px 10px',
    border: '1px solid',
  },
  rarityGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '10px',
  },
  rarityBtn: {
    padding: '10px 12px',
    background: 'var(--bg-tertiary)',
    border: '1px solid',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    letterSpacing: '0.03em',
  },
  attrGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  specialAttrGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  attrRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  attrLabel: {
    width: '80px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  attrLabelCn: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  attrLabelEn: {
    fontSize: '9px',
    letterSpacing: '0.08em',
    color: 'var(--text-tertiary)',
  },
  attrInput: {
    width: '72px',
    padding: '6px 8px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-primary)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    fontWeight: '700',
    textAlign: 'center' as const,
    fontFamily: 'var(--font-mono)',
  },
  tagList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '12px',
    minHeight: '32px',
  },
  tag: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-accent)',
    color: 'var(--text-accent)',
    fontSize: '12px',
    fontFamily: 'var(--font-mono)',
  },
  tagRemove: {
    background: 'none',
    border: 'none',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '0',
    lineHeight: '1',
  },
  tagInputRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '8px',
  },
  tagInput: {
    flex: '1',
    padding: '8px 12px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-primary)',
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontFamily: 'var(--font-mono)',
  },
  tagAddBtn: {
    padding: '8px 16px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-accent)',
    color: 'var(--text-accent)',
    fontSize: '13px',
    cursor: 'pointer',
  },
  tagHint: {
    fontSize: '10px',
    color: 'var(--text-tertiary)',
    lineHeight: '1.6',
    letterSpacing: '0.03em',
  },
  textarea: {
    width: '100%',
    marginBottom: '0',
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
    lineHeight: '1.6',
    boxSizing: 'border-box',
  },
  // ── Deploy tab ──
  deployStatusGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
  },
  deployStatusItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  deployStatusLabel: {
    fontSize: '10px',
    fontWeight: '600',
    letterSpacing: '0.08em',
    color: 'var(--text-tertiary)',
  },
  deployStatusValue: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-mono)',
  },
  imageChangeRow: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid var(--border-subtle)',
  },
  imageChangeAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    background: 'rgba(74, 158, 255, 0.08)',
    border: '1px solid rgba(74, 158, 255, 0.35)',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    lineHeight: '1.5',
  },
  imageChangeIcon: {
    fontSize: '18px',
    color: '#4a9eff',
    flexShrink: 0,
  },
  imageChangeNeutral: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-tertiary)',
    fontSize: '12px',
  },
  deployWarning: {
    padding: '14px 18px',
    background: 'rgba(255, 180, 0, 0.08)',
    border: '1px solid rgba(255, 180, 0, 0.4)',
    color: '#f5c842',
    fontSize: '13px',
    lineHeight: '1.5',
  },
  deployResult: {
    padding: '14px 18px',
    background: 'var(--bg-secondary)',
    border: '1px solid',
    fontSize: '13px',
    fontWeight: '500',
    lineHeight: '1.5',
  },
  deployBtnRow: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
  },
  deployBtn: {
    flex: '1',
    padding: '16px 32px',
    background: 'var(--accent-cyan)',
    border: '1px solid var(--accent-cyan)',
    color: 'var(--bg-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    fontWeight: '700',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'opacity 0.2s ease',
  },
  refreshBtn: {
    padding: '16px 20px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-primary)',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    cursor: 'pointer',
  },
  buttonLabel: {
    fontSize: '9px',
    opacity: 0.6,
    letterSpacing: '0.05em',
  },
  promptPreview: {
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-subtle)',
    padding: '16px',
    maxHeight: '200px',
    overflow: 'auto',
    marginTop: '12px',
  },
  promptText: {
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    lineHeight: '1.6',
    color: 'var(--text-secondary)',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
};
