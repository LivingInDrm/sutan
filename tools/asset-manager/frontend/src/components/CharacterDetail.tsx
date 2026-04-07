import { useState, useEffect } from 'react';
import type { Character, Templates, CharacterProfile, DeployPreview } from '../types';
import { api } from '../api';
import Gallery from './Gallery';
import WorkshopTab from './WorkshopTab';
import type { WorkshopConfig } from './WorkshopTab';

interface CharacterDetailProps {
  character: Character;
  templates: Templates | null;
  onUpdate: () => void | Promise<void>;
}

type DetailTab = 'workshop' | 'profile' | 'deploy';

const ATTR_LABELS: Record<string, string> = {
  physique: '体魄',
  charm: '魅力',
  wisdom: '智慧',
  combat: '武力',
  social: '社交',
  survival: '生存',
  stealth: '潜行',
  magic: '法术',
};

const RARITY_LABELS: Record<string, string> = {
  gold: '金 · GOLD',
  silver: '银 · SILVER',
  copper: '铜 · COPPER',
  stone: '石 · STONE',
};

const RARITY_COLORS: Record<string, string> = {
  gold: '#f5c842',
  silver: '#b0b8c8',
  copper: '#c87040',
  stone: '#808080',
};

const DEFAULT_PROFILE: CharacterProfile = {
  description: '',
  rarity: 'copper',
  attributes: {
    physique: 5, charm: 5, wisdom: 5, combat: 5,
    social: 5, survival: 5, stealth: 5, magic: 5,
  },
  special_attributes: { support: 0, reroll: 0 },
  tags: [],
  equipment_slots: 1,
};

const WORKSHOP_CONFIG: WorkshopConfig = {
  generateButtonText: '生成立绘',
  regeneratePanelTitle: 'AI 重新生成 4 条 VARIANT',
  regeneratePanelSubtitle: '输入角色简介，AI 将重新生成 4 条 variant description 并覆盖现有内容',
  regeneratePlaceholder: '角色简介（可选，如：北凉世子，武功绝顶，外表纨绔内心坚毅...）',
  descriptionPlaceholder: '输入角色描述...',
};

export default function CharacterDetail({
  character,
  templates,
  onUpdate,
}: CharacterDetailProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('workshop');

  // Profile tab state
  const [profile, setProfile] = useState<CharacterProfile>(DEFAULT_PROFILE);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isAiProfileGenerating, setIsAiProfileGenerating] = useState(false);
  const [tagInput, setTagInput] = useState('');

  // Deploy tab state
  const [deployPreview, setDeployPreview] = useState<DeployPreview | null>(null);
  const [loadingDeployPreview, setLoadingDeployPreview] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  useEffect(() => {
    // Reset state when switching character
    setProfileSaved(false);
    setProfileError(null);
    setDeployResult(null);
    setDeployPreview(null);
  }, [character.name]);

  useEffect(() => {
    if (activeTab === 'profile') {
      loadProfile();
    } else if (activeTab === 'deploy') {
      loadDeployPreview();
    }
  }, [activeTab, character.name]);

  const loadProfile = async () => {
    try {
      setLoadingProfile(true);
      const p = await api.getCharacterProfile(character.name);
      setProfile(p);
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const loadDeployPreview = async () => {
    try {
      setLoadingDeployPreview(true);
      setDeployResult(null);
      const preview = await api.getDeployPreview(character.name);
      setDeployPreview(preview);
    } catch (err) {
      console.error('Failed to load deploy preview:', err);
    } finally {
      setLoadingDeployPreview(false);
    }
  };

  // Profile handlers
  const handleAttrChange = (key: string, value: number) => {
    setProfile((p) => ({
      ...p,
      attributes: { ...p.attributes, [key]: value },
    }));
  };

  const handleSpecialAttrChange = (key: 'support' | 'reroll', value: number) => {
    setProfile((p) => ({
      ...p,
      special_attributes: { ...p.special_attributes, [key]: value },
    }));
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
      setSavingProfile(true);
      setProfileError(null);
      const updated = await api.updateCharacterProfile(character.name, profile);
      setProfile(updated);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAiProfileGenerate = async () => {
    try {
      setIsAiProfileGenerating(true);
      setProfileError(null);
      const generated = await api.generateCharacterProfile(character.name);
      setProfile(generated);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'AI 生成失败');
    } finally {
      setIsAiProfileGenerating(false);
    }
  };

  const handleDeploy = async () => {
    try {
      setIsDeploying(true);
      setDeployResult(null);
      const result = await api.deployCharacter(character.name);
      setDeployResult({
        success: true,
        message: `部署成功！角色已${result.action === 'updated' ? '更新' : '新增'}到游戏数据。${result.portrait_copied ? ` 立绘已从「${result.portrait_source_filename}」复制。` : ' 立绘保持不变。'}`,
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

  const handleArchive = async () => {
    if (!window.confirm(`确认归档「${character.name}」？归档后角色将从列表中隐藏，数据保留。`)) return;
    try {
      setIsArchiving(true);
      setArchiveError(null);
      await api.archiveCharacter(character.name);
      await onUpdate();
    } catch (err) {
      setArchiveError(err instanceof Error ? err.message : '归档失败');
    } finally {
      setIsArchiving(false);
    }
  };

  // Build assembled prompt from templates
  const assemblePrompt = (description: string): string => {
    if (!templates) return description;
    return (templates.portrait_template || '')
      .replace('{style}', templates.style_base || '')
      .replace('{no_text}', templates.no_text_constraint || '')
      .replace('{name}', character.name)
      .replace('{description}', description)
      .replace('{negative}', templates.style_negative || '');
  };

  const rarityColor = RARITY_COLORS[profile.rarity] || '#808080';
  const attrTotal = Object.values(profile.attributes).reduce((a, b) => a + b, 0);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>{character.name}</h2>
          <div style={styles.subtitle}>ID: {character.figure_id}</div>
        </div>

        <div style={styles.tabs}>
          {([
            ['workshop', '角色工坊', 'WORKSHOP'],
            ['profile', '角色属性', 'PROFILE'],
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
        {activeTab === 'workshop' && (
          <WorkshopTab
            entityName={character.name}
            variants={character.variants}
            config={WORKSHOP_CONFIG}
            assemblePrompt={assemblePrompt}
            onSaveDescription={async (variantIndex, description) => {
              await api.updateCharacter(character.figure_id, { variant_index: variantIndex, description });
            }}
            onRegenerateVariants={async (bio) => {
              return api.regenerateVariants(character.name, bio);
            }}
            onGenerateImages={async (_variantIndex, description, count, onProgress) => {
              await api.generate(
                { asset_type: 'portrait', name: character.name, description, count },
                onProgress,
              );
            }}
            onLoadSamples={() => api.getSamples(character.name)}
            onVariantsRegenerated={async () => {
              await onUpdate();
            }}
            galleryRenderer={({ samples, onRefresh }) => (
              <Gallery
                images={samples}
                characterName={character.name}
                onSelect={onRefresh}
              />
            )}
          />
        )}

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
                  <div style={styles.profileAttrTotal}>
                    属性总和: <span style={{ color: rarityColor, fontWeight: 700 }}>{attrTotal}</span>
                  </div>
                  <div style={styles.profileActionsRight}>
                    <button
                      style={styles.aiProfileBtn}
                      onClick={handleAiProfileGenerate}
                      disabled={isAiProfileGenerating}
                    >
                      {isAiProfileGenerating ? (
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
                      disabled={savingProfile}
                    >
                      {savingProfile ? (
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

                {/* Rarity */}
                <section style={styles.profileSection}>
                  <div style={styles.sectionHeader}>
                    <div style={styles.sectionTitle}>稀有度 RARITY</div>
                    <div style={{ ...styles.rarityBadge, color: rarityColor, borderColor: rarityColor }}>
                      {RARITY_LABELS[profile.rarity] || profile.rarity}
                    </div>
                  </div>
                  <div style={styles.rarityGrid}>
                    {(['gold', 'silver', 'copper', 'stone'] as const).map((r) => (
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
                  <div style={styles.rarityHint}>
                    gold: 36-60 &nbsp;|&nbsp; silver: 21-35 &nbsp;|&nbsp; copper: 11-20 &nbsp;|&nbsp; stone: 5-10
                  </div>
                </section>

                {/* 8 Attributes */}
                <section style={styles.profileSection}>
                  <div style={styles.sectionHeader}>
                    <div style={styles.sectionTitle}>属性 ATTRIBUTES</div>
                    <div style={styles.sectionMeta}>总和 {attrTotal}</div>
                  </div>
                  <div style={styles.attrGrid}>
                    {Object.entries(ATTR_LABELS).map(([key, label]) => {
                      const val = profile.attributes[key as keyof typeof profile.attributes] ?? 5;
                      return (
                        <div key={key} style={styles.attrRow}>
                          <div style={styles.attrLabel}>
                            <span style={styles.attrLabelCn}>{label}</span>
                            <span style={styles.attrLabelEn}>{key.toUpperCase()}</span>
                          </div>
                          <input
                            type="range"
                            min={1}
                            max={10}
                            value={val}
                            onChange={(e) => handleAttrChange(key, Number(e.target.value))}
                            style={styles.attrSlider}
                          />
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={val}
                            onChange={(e) => handleAttrChange(key, Math.min(10, Math.max(1, Number(e.target.value))))}
                            style={styles.attrInput}
                          />
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Special Attributes */}
                <section style={styles.profileSection}>
                  <div style={styles.sectionHeader}>
                    <div style={styles.sectionTitle}>特殊属性 SPECIAL</div>
                  </div>
                  <div style={styles.specialAttrGrid}>
                    <div style={styles.attrRow}>
                      <div style={styles.attrLabel}>
                        <span style={styles.attrLabelCn}>支援</span>
                        <span style={styles.attrLabelEn}>SUPPORT</span>
                      </div>
                      <input
                        type="number"
                        min={-3}
                        max={5}
                        value={profile.special_attributes.support}
                        onChange={(e) => handleSpecialAttrChange('support', Number(e.target.value))}
                        style={styles.attrInput}
                      />
                    </div>
                    <div style={styles.attrRow}>
                      <div style={styles.attrLabel}>
                        <span style={styles.attrLabelCn}>重骰</span>
                        <span style={styles.attrLabelEn}>REROLL</span>
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={5}
                        value={profile.special_attributes.reroll}
                        onChange={(e) => handleSpecialAttrChange('reroll', Number(e.target.value))}
                        style={styles.attrInput}
                      />
                    </div>
                    <div style={styles.attrRow}>
                      <div style={styles.attrLabel}>
                        <span style={styles.attrLabelCn}>装备槽</span>
                        <span style={styles.attrLabelEn}>EQ SLOTS</span>
                      </div>
                      <input
                        type="number"
                        min={1}
                        max={4}
                        value={profile.equipment_slots}
                        onChange={(e) => setProfile((p) => ({ ...p, equipment_slots: Math.min(4, Math.max(1, Number(e.target.value))) }))}
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
                      placeholder="输入标签后回车添加 (如: male, warrior...)"
                    />
                    <button style={styles.tagAddBtn} onClick={handleTagAdd}>添加</button>
                  </div>
                  <div style={styles.tagHint}>
                    常用: male female warrior swordsman merchant scholar rogue wanderer exile clan protagonist antagonist mentor ally
                  </div>
                </section>

                {/* Bio / Description */}
                <section style={styles.profileSection}>
                  <div style={styles.sectionHeader}>
                    <div style={styles.sectionTitle}>人物小传 BIOGRAPHY</div>
                    <div style={styles.sectionMeta}>游戏内展示文字 50-100字</div>
                  </div>
                  <textarea
                    style={{ ...styles.textarea, minHeight: '100px' }}
                    value={profile.description}
                    onChange={(e) => setProfile((p) => ({ ...p, description: e.target.value }))}
                    placeholder="角色的游戏内背景故事简介..."
                  />
                </section>
              </>
            )}
          </div>
        )}

        {activeTab === 'deploy' && (
          <div style={styles.deployView}>
            {loadingDeployPreview ? (
              <div style={styles.loadingState}>
                <div className="spinner"></div>
                <div style={styles.loadingText}>LOADING DEPLOY STATUS...</div>
              </div>
            ) : (
              <>
                {/* Status Banner */}
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
                        <div style={styles.deployStatusLabel}>角色属性</div>
                        <div style={{
                          ...styles.deployStatusValue,
                          color: deployPreview.has_profile ? 'var(--success)' : 'var(--error)',
                        }}>
                          {deployPreview.has_profile ? '✓ 已配置' : '✗ 未配置'}
                        </div>
                      </div>
                      <div style={styles.deployStatusItem}>
                        <div style={styles.deployStatusLabel}>立绘素材</div>
                        <div style={{
                          ...styles.deployStatusValue,
                          color: deployPreview.has_portrait ? 'var(--success)' : 'var(--text-tertiary)',
                        }}>
                          {deployPreview.has_portrait ? '✓ 有素材' : '○ 无素材'}
                        </div>
                      </div>
                      <div style={styles.deployStatusItem}>
                        <div style={styles.deployStatusLabel}>立绘文件</div>
                        <div style={styles.deployStatusValue}>
                          {deployPreview.game_file || '(自动分配)'}
                        </div>
                      </div>
                    </div>

                    {/* Portrait change info */}
                    <div style={styles.portraitChangeRow}>
                      {deployPreview.portrait_change?.has_change ? (
                        <div style={styles.portraitChangeAlert}>
                          <span style={styles.portraitChangeIcon}>⇄</span>
                          <span>
                            立绘将从{' '}
                            <strong>{deployPreview.portrait_change.current_game_file || '(当前)'}</strong>
                            {' '}更换为{' '}
                            <strong style={{ color: '#4a9eff' }}>
                              {deployPreview.portrait_change.selected_portrait_filename}
                            </strong>
                          </span>
                        </div>
                      ) : (
                        <div style={styles.portraitChangeNeutral}>
                          <span>○ 立绘保持不变（无选定的新立绘）</span>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* Preview JSON */}
                {deployPreview?.preview_card && (
                  <section style={styles.section}>
                    <div style={styles.sectionHeader}>
                      <div style={styles.sectionTitle}>PREVIEW · 将写入 characters.json</div>
                    </div>
                    <div style={styles.promptPreview}>
                      <pre style={styles.promptText}>
                        {JSON.stringify(deployPreview.preview_card, null, 2)}
                      </pre>
                    </div>
                  </section>
                )}

                {!deployPreview?.has_profile && (
                  <div style={styles.deployWarning}>
                    ⚠ 角色尚未配置属性，请先前往「角色属性」tab 配置或 AI 生成属性。
                  </div>
                )}

                {/* Deploy Result */}
                {deployResult && (
                  <div style={{
                    ...styles.deployResult,
                    borderColor: deployResult.success ? 'var(--success)' : 'var(--error)',
                    color: deployResult.success ? 'var(--success)' : 'var(--error)',
                  }}>
                    {deployResult.success ? '✓ ' : '⚠ '}{deployResult.message}
                  </div>
                )}

                {/* Deploy Button */}
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
                          <span>一键部署到游戏</span>
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

                {/* Archive Section */}
                <section style={{ ...styles.section, marginTop: '8px' }}>
                  <div style={styles.sectionHeader}>
                    <div style={{ ...styles.sectionTitle, color: 'var(--error)', opacity: 0.7 }}>DANGER ZONE · 危险操作</div>
                  </div>
                  {archiveError && (
                    <div style={{ color: 'var(--error)', fontSize: '12px', marginBottom: '8px' }}>{archiveError}</div>
                  )}
                  <button
                    style={styles.archiveBtn}
                    onClick={handleArchive}
                    disabled={isArchiving}
                  >
                    {isArchiving ? '归档中...' : '归档此角色 ARCHIVE'}
                  </button>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '6px', opacity: 0.7 }}>
                    归档后角色从列表隐藏，数据保留在工作区
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
  // ── Profile tab styles ──
  profileActionsBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
  },
  profileAttrTotal: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
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
  rarityBadge: {
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.05em',
    padding: '4px 10px',
    border: '1px solid',
  },
  rarityGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '10px',
    marginBottom: '10px',
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
  rarityHint: {
    fontSize: '10px',
    color: 'var(--text-tertiary)',
    letterSpacing: '0.03em',
  },
  attrGrid: {
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
  attrSlider: {
    flex: '1',
    accentColor: 'var(--accent-cyan)',
  },
  attrInput: {
    width: '56px',
    padding: '6px 8px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-primary)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    fontWeight: '700',
    textAlign: 'center' as const,
    fontFamily: 'var(--font-mono)',
  },
  specialAttrGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
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
    minHeight: '120px',
    marginBottom: '0',
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
    lineHeight: '1.6',
    boxSizing: 'border-box',
  },
  // ── Deploy tab styles ──
  deployStatusGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
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
  archiveBtn: {
    padding: '10px 20px',
    background: 'transparent',
    border: '1px solid var(--error)',
    color: 'var(--error)',
    fontSize: '12px',
    letterSpacing: '0.05em',
    cursor: 'pointer',
    opacity: 0.8,
  },
  portraitChangeRow: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid var(--border-subtle)',
  },
  portraitChangeAlert: {
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
  portraitChangeIcon: {
    fontSize: '18px',
    color: '#4a9eff',
    flexShrink: 0,
  },
  portraitChangeNeutral: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-tertiary)',
    fontSize: '12px',
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
  buttonLabel: {
    fontSize: '9px',
    opacity: 0.6,
    letterSpacing: '0.05em',
  },
};
