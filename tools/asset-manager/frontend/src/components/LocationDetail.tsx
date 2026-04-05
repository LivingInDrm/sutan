import { useState, useEffect } from 'react';
import type { Scene, SceneMap, SampleImage, Templates, SceneVariant } from '../types';
import { api } from '../api';
import Gallery from './Gallery';
import WorkshopTab from './WorkshopTab';
import type { WorkshopConfig, WorkshopVariant } from './WorkshopTab';

interface LocationDetailProps {
  scene: Scene;
  mapData: SceneMap;
  templates: Templates | null;
  onUpdate: () => void | Promise<void>;
}

type DetailTab = 'icon-workshop' | 'backdrop-workshop' | 'location-info';

const SCENE_TYPE_COLORS: Record<string, string> = {
  枢纽: '#f5c842',
  主线: '#4a9eff',
  商店: '#4fcfa0',
  战斗: '#ff6060',
  探索: '#c87040',
  功能: '#a89cf7',
};

const ICON_WORKSHOP_CONFIG: WorkshopConfig = {
  generateButtonText: '生成地点图标',
  generateButtonSubtext: '水墨建筑风格 · 1024×1024',
  regeneratePanelTitle: 'AI 重新生成 4 条 VARIANT',
  regeneratePanelSubtitle: '输入地点简介（可选），AI 将重新生成 4 条图标描述变体',
  regeneratePlaceholder: '地点简介（可选，如：北凉王城正门，宏伟城楼，旌旗猎猎...）',
  descriptionPlaceholder: '输入图标描述（英文，如：towering city gate with ornate curved rooftops...）',
};

const BACKDROP_WORKSHOP_CONFIG: WorkshopConfig = {
  generateButtonText: '生成地点背景图',
  generateButtonSubtext: '水墨全景背景 · 1536×1024',
  regeneratePanelTitle: 'AI 重新生成 4 条 VARIANT',
  regeneratePanelSubtitle: '输入地点简介（可选），AI 将重新生成 4 条背景图描述变体',
  regeneratePlaceholder: '地点简介（可选，如：北凉王城正门，宏伟城楼，旌旗猎猎...）',
  descriptionPlaceholder: '输入背景图描述（英文，如：panoramic view of ancient city gates at sunset...）',
};

function toWorkshopVariants(variants: SceneVariant[] | undefined, fallback: string): WorkshopVariant[] {
  if (variants && variants.length > 0) {
    return variants.map((v) => ({ index: v.index, description: v.description }));
  }
  return [{ index: 0, description: fallback }];
}

export default function LocationDetail({ scene, mapData, templates, onUpdate }: LocationDetailProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('icon-workshop');
  const [editingPosition, setEditingPosition] = useState(false);
  const [posX, setPosX] = useState<string>(String(scene.position?.x ?? ''));
  const [posY, setPosY] = useState<string>(String(scene.position?.y ?? ''));
  const [editingSceneIds, setEditingSceneIds] = useState(false);
  const [sceneIdsText, setSceneIdsText] = useState((scene.scene_ids ?? []).join(', '));
  const [savingRuntime, setSavingRuntime] = useState(false);

  // Reset tab and runtime fields on scene change
  useEffect(() => {
    setActiveTab('icon-workshop');
    setPosX(String(scene.position?.x ?? ''));
    setPosY(String(scene.position?.y ?? ''));
    setSceneIdsText((scene.scene_ids ?? []).join(', '));
    setEditingPosition(false);
    setEditingSceneIds(false);
  }, [scene.id]);

  const typeColor = SCENE_TYPE_COLORS[scene.type] || '#808080';

  // Assemble prompt from templates
  const assembleIconPrompt = (description: string): string => {
    if (!templates?.scene_icon_style) return description;
    return templates.scene_icon_style.replace('{prompt}', description);
  };

  const assembleBackdropPrompt = (description: string): string => {
    if (!templates?.scene_backdrop_style) return description;
    return templates.scene_backdrop_style.replace('{prompt}', description);
  };

  const iconVariants = toWorkshopVariants(scene.icon_variants, scene.prompt || '');
  const backdropVariants = toWorkshopVariants(scene.backdrop_variants, scene.backdrop_prompt || '');

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerInfo}>
          <div style={styles.mapTag}>{mapData.name}</div>
          <h2 style={styles.title}>{scene.name}</h2>
          <div style={styles.headerMeta}>
            <span
              style={{
                ...styles.typeChip,
                color: typeColor,
                borderColor: `${typeColor}60`,
                background: `${typeColor}12`,
              }}
            >
              {scene.type}
            </span>
            <span style={styles.sceneId}>{scene.id}</span>
          </div>
        </div>

        {/* Current icon preview */}
        <div style={styles.iconPreview}>
          {scene.current_icon ? (
            <img src={scene.current_icon} alt={scene.name} style={styles.iconImg} />
          ) : (
            <div style={styles.iconPlaceholder}>
              <span style={styles.iconPlaceholderText}>无图标</span>
            </div>
          )}
          {scene.has_pending_icon && (
            <div style={styles.pendingBadge}>待部署</div>
          )}
        </div>

        {/* Tab switcher */}
        <div style={styles.tabs}>
          {([
            ['icon-workshop', '地点图标工坊', 'ICON WORKSHOP'],
            ['backdrop-workshop', '地点背景图工坊', 'BACKDROP WORKSHOP'],
            ['location-info', '地点信息', 'LOCATION INFO'],
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

      {/* Content */}
      <div style={styles.content}>
        {/* ─── ICON WORKSHOP ─────────────────────────────────────────────── */}
        {activeTab === 'icon-workshop' && (
          <WorkshopTab
            entityName={`${scene.id}:icon`}
            variants={iconVariants}
            config={ICON_WORKSHOP_CONFIG}
            assemblePrompt={assembleIconPrompt}
            onSaveDescription={async (variantIndex, description) => {
              await api.updateSceneIconVariant(scene.id, variantIndex, description);
            }}
            onRegenerateVariants={async (bio) => {
              if (!bio.trim() && !scene.description?.trim()) {
                throw new Error('请先填写场景描述，或在简介输入框中提供场景简介');
              }
              return api.regenerateSceneIconVariants(scene.id, bio);
            }}
            onGenerateImages={async (_variantIndex, description, count, onProgress) => {
              await api.generateSceneIcon(
                { scene_id: scene.id, prompt: description, count, image_type: 'icon' },
                onProgress,
              );
            }}
            onLoadSamples={() => api.getSceneSamples(scene.id, 'icon')}
            onVariantsRegenerated={async () => {
              await onUpdate();
            }}
            galleryRenderer={({ samples, onRefresh }) => (
              <SceneGallery
                samples={samples}
                scene={scene}
                imageType="icon"
                onRefresh={onRefresh}
                onUpdate={onUpdate}
              />
            )}
          />
        )}

        {/* ─── BACKDROP WORKSHOP ─────────────────────────────────────────── */}
        {activeTab === 'backdrop-workshop' && (
          <WorkshopTab
            entityName={`${scene.id}:backdrop`}
            variants={backdropVariants}
            config={BACKDROP_WORKSHOP_CONFIG}
            assemblePrompt={assembleBackdropPrompt}
            onSaveDescription={async (variantIndex, description) => {
              await api.updateSceneBackdropVariant(scene.id, variantIndex, description);
            }}
            onRegenerateVariants={async (bio) => {
              if (!bio.trim() && !scene.description?.trim()) {
                throw new Error('请先填写场景描述，或在简介输入框中提供场景简介');
              }
              return api.regenerateSceneBackdropVariants(scene.id, bio);
            }}
            onGenerateImages={async (_variantIndex, description, count, onProgress) => {
              await api.generateSceneIcon(
                { scene_id: scene.id, prompt: description, count, image_type: 'backdrop' },
                onProgress,
              );
            }}
            onLoadSamples={() => api.getSceneSamples(scene.id, 'backdrop')}
            onVariantsRegenerated={async () => {
              await onUpdate();
            }}
            galleryRenderer={({ samples, onRefresh }) => (
              <SceneGallery
                samples={samples}
                scene={scene}
                imageType="backdrop"
                onRefresh={onRefresh}
                onUpdate={onUpdate}
              />
            )}
          />
        )}

        {/* ─── LOCATION INFO TAB ─────────────────────────────────────────── */}
        {activeTab === 'location-info' && (
          <div style={styles.terrainView}>
            {/* Position */}
            <section style={styles.section}>
              <div style={styles.sectionHeader}>
                <div style={styles.sectionTitle}>地图坐标 POSITION</div>
                <div style={styles.sectionHint}>{mapData.name}</div>
              </div>
              {editingPosition ? (
                <div style={infoStyles.editRow}>
                  <label style={infoStyles.fieldLabel}>X</label>
                  <input
                    type="number" step="0.01" min="0" max="1"
                    value={posX}
                    onChange={(e) => setPosX(e.target.value)}
                    style={infoStyles.inputField}
                  />
                  <label style={infoStyles.fieldLabel}>Y</label>
                  <input
                    type="number" step="0.01" min="0" max="1"
                    value={posY}
                    onChange={(e) => setPosY(e.target.value)}
                    style={infoStyles.inputField}
                  />
                  <button
                    style={infoStyles.saveBtn}
                    disabled={savingRuntime}
                    onClick={async () => {
                      setSavingRuntime(true);
                      try {
                        await api.updateScene(scene.id, {
                          position: { x: parseFloat(posX), y: parseFloat(posY) },
                        });
                        setEditingPosition(false);
                        await onUpdate();
                      } finally {
                        setSavingRuntime(false);
                      }
                    }}
                  >
                    {savingRuntime ? '保存中...' : '保存'}
                  </button>
                  <button style={infoStyles.cancelBtn} onClick={() => {
                    setPosX(String(scene.position?.x ?? ''));
                    setPosY(String(scene.position?.y ?? ''));
                    setEditingPosition(false);
                  }}>取消</button>
                </div>
              ) : (
                <div style={infoStyles.displayRow}>
                  <span style={infoStyles.fieldValue}>
                    x: {scene.position?.x ?? '未设置'} &nbsp;&nbsp; y: {scene.position?.y ?? '未设置'}
                  </span>
                  <button style={infoStyles.editBtn} onClick={() => setEditingPosition(true)}>编辑</button>
                </div>
              )}
            </section>

            {/* Scene IDs */}
            <section style={styles.section}>
              <div style={styles.sectionHeader}>
                <div style={styles.sectionTitle}>关联事件 SCENE IDs</div>
                <div style={styles.sectionHint}>{(scene.scene_ids ?? []).length} 个事件</div>
              </div>
              {editingSceneIds ? (
                <div style={infoStyles.editCol}>
                  <div style={infoStyles.fieldHint}>输入 scene_id，多个用英文逗号分隔 (如 scene_001, scene_007)</div>
                  <input
                    type="text"
                    value={sceneIdsText}
                    onChange={(e) => setSceneIdsText(e.target.value)}
                    style={infoStyles.inputFieldWide}
                    placeholder="scene_001, scene_007"
                  />
                  <div style={infoStyles.editRow}>
                    <button
                      style={infoStyles.saveBtn}
                      disabled={savingRuntime}
                      onClick={async () => {
                        setSavingRuntime(true);
                        try {
                          const ids = sceneIdsText
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean);
                          await api.updateScene(scene.id, { scene_ids: ids });
                          setEditingSceneIds(false);
                          await onUpdate();
                        } finally {
                          setSavingRuntime(false);
                        }
                      }}
                    >
                      {savingRuntime ? '保存中...' : '保存并同步到地图'}
                    </button>
                    <button style={infoStyles.cancelBtn} onClick={() => {
                      setSceneIdsText((scene.scene_ids ?? []).join(', '));
                      setEditingSceneIds(false);
                    }}>取消</button>
                  </div>
                </div>
              ) : (
                <div style={infoStyles.displayRow}>
                  <div style={infoStyles.tagList}>
                    {(scene.scene_ids ?? []).length === 0
                      ? <span style={infoStyles.emptyHint}>暂无关联事件</span>
                      : (scene.scene_ids ?? []).map((sid) => (
                          <span key={sid} style={infoStyles.tag}>{sid}</span>
                        ))
                    }
                  </div>
                  <button style={infoStyles.editBtn} onClick={() => setEditingSceneIds(true)}>编辑</button>
                </div>
              )}
            </section>

            {/* Map overview */}
            <section style={styles.section}>
              <div style={styles.sectionHeader}>
                <div style={styles.sectionTitle}>地图地点总览 MAP OVERVIEW</div>
                <div style={styles.sectionHint}>{mapData.scenes.length} 个地点</div>
              </div>
              <div style={styles.overviewGrid}>
                {mapData.scenes.map((s) => {
                  const tc = SCENE_TYPE_COLORS[s.type] || '#808080';
                  return (
                    <div key={s.id} style={styles.overviewItem}>
                      <div style={{ ...styles.overviewTypeDot, background: tc }} />
                      <div style={styles.overviewName}>{s.name}</div>
                      <div style={styles.overviewType}>{s.type}</div>
                      <div style={styles.overviewStatus}>{s.current_icon ? '✓' : '○'}</div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Inner gallery component ──────────────────────────────────────────────────

interface SceneGalleryProps {
  samples: SampleImage[];
  scene: Scene;
  imageType: 'icon' | 'backdrop';
  onRefresh: () => void;
  onUpdate: () => void | Promise<void>;
}

function SceneGallery({ samples, scene, imageType, onRefresh, onUpdate }: SceneGalleryProps) {
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSelectImage = async (img: SampleImage) => {
    try {
      if (imageType === 'backdrop') {
        await api.selectSceneBackdrop(scene.id, img.abs_path);
      } else {
        await api.selectSceneIcon(scene.id, img.abs_path);
      }
      onRefresh();
      onUpdate();
    } catch (err) {
      console.error('Failed to select scene image', err);
    }
  };

  const handleDeploy = async () => {
    try {
      setIsDeploying(true);
      setDeployResult(null);
      await api.deploySceneIcon(scene.id, imageType);
      setDeployResult({
        success: true,
        message: imageType === 'backdrop' ? '地点背景图已部署成功！' : '地点图标已部署成功！',
      });
      onRefresh();
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

  const hasPending = imageType === 'backdrop' ? scene.has_pending_backdrop : scene.has_pending_icon;
  const deployHintText = imageType === 'backdrop'
    ? '已选定背景图，点击「部署」将背景图写入游戏地图文件夹'
    : '已选定图标，点击「部署」将图标写入游戏地图文件夹';
  const deployBtnText = imageType === 'backdrop' ? '部署背景图到游戏' : '部署图标到游戏';
  const deployBtnSub = imageType === 'backdrop' ? 'DEPLOY BACKDROP' : 'DEPLOY TO GAME';

  return (
    <div>
      <Gallery
        images={samples}
        characterName={scene.name}
        onSelect={onRefresh}
        onSelectImage={handleSelectImage}
        selectLabel={imageType === 'backdrop' ? '选为背景图' : '选为地点图标'}
      />

      {/* Deploy pending icon or backdrop */}
      {hasPending && (
        <div style={deployStyles.deploySection}>
          <div style={deployStyles.deployHint}>
            {deployHintText}
          </div>
          {deployResult && (
            <div style={{
              ...deployStyles.deployResult,
              color: deployResult.success ? 'var(--success)' : 'var(--error)',
              borderColor: deployResult.success ? 'var(--success)' : 'var(--error)',
            }}>
              {deployResult.success ? '✓ ' : '⚠ '}{deployResult.message}
            </div>
          )}
          <button
            style={deployStyles.deployBtn}
            onClick={handleDeploy}
            disabled={isDeploying}
          >
            {isDeploying ? (
              <><div className="spinner"></div><span>部署中...</span></>
            ) : (
              <>
                <span>{deployBtnText}</span>
                <span style={deployStyles.deployBtnSub}>{deployBtnSub}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-primary)',
  },
  header: {
    padding: '24px 32px',
    borderBottom: '1px solid var(--border-primary)',
    background: 'var(--bg-secondary)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '24px',
    flexWrap: 'wrap',
  },
  headerInfo: {
    flex: '1',
    minWidth: '200px',
  },
  mapTag: {
    fontSize: '9px',
    fontWeight: '600',
    letterSpacing: '0.1em',
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase' as const,
    marginBottom: '6px',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '28px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginBottom: '8px',
  },
  headerMeta: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  typeChip: {
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.04em',
    padding: '3px 8px',
    border: '1px solid',
  },
  sceneId: {
    fontSize: '10px',
    fontWeight: '400',
    color: 'var(--text-tertiary)',
    fontFamily: 'var(--font-mono)',
    opacity: 0.6,
  },
  iconPreview: {
    position: 'relative',
    width: '80px',
    flexShrink: 0,
  },
  iconImg: {
    width: '80px',
    height: '80px',
    objectFit: 'contain',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-primary)',
  },
  iconPlaceholder: {
    width: '80px',
    height: '80px',
    background: 'var(--bg-tertiary)',
    border: '1px dashed var(--border-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPlaceholderText: {
    fontSize: '10px',
    color: 'var(--text-tertiary)',
    opacity: 0.5,
  },
  pendingBadge: {
    position: 'absolute',
    bottom: '-8px',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '9px',
    fontWeight: '700',
    color: '#f5c842',
    background: 'var(--bg-primary)',
    border: '1px solid #f5c842',
    padding: '1px 6px',
    whiteSpace: 'nowrap',
  },
  tabs: {
    display: 'flex',
    gap: '6px',
    alignSelf: 'flex-end',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  tab: {
    padding: '8px 16px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-primary)',
    color: 'var(--text-secondary)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '2px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  tabActive: {
    background: 'var(--bg-elevated)',
    borderColor: 'var(--border-accent)',
    color: 'var(--text-accent)',
  },
  tabLabel: {
    fontSize: '8px',
    fontWeight: '400',
    letterSpacing: '0.05em',
    opacity: 0.6,
  },
  content: {
    flex: '1',
    overflow: 'auto',
  },
  // Terrain tab
  terrainView: {
    padding: '28px 36px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  section: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-primary)',
    padding: '20px 24px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '14px',
    paddingBottom: '10px',
    borderBottom: '1px solid var(--border-subtle)',
  },
  sectionTitle: {
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.1em',
    color: 'var(--text-accent)',
  },
  sectionHint: {
    fontSize: '10px',
    color: 'var(--text-tertiary)',
    opacity: 0.7,
  },
  terrainImgWrapper: {
    marginBottom: '16px',
    textAlign: 'center' as const,
  },
  terrainImg: {
    maxWidth: '100%',
    maxHeight: '320px',
    objectFit: 'contain',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-primary)',
  },
  terrainEmpty: {
    padding: '48px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '16px',
    background: 'var(--bg-tertiary)',
    border: '1px dashed var(--border-primary)',
  },
  terrainEmptyIcon: {
    fontSize: '24px',
    color: 'var(--text-tertiary)',
    opacity: 0.4,
  },
  terrainEmptyText: {
    fontSize: '13px',
    color: 'var(--text-tertiary)',
  },
  terrainEmptyHint: {
    fontSize: '10px',
    color: 'var(--text-tertiary)',
    opacity: 0.6,
    fontFamily: 'var(--font-mono)',
  },
  terrainPromptSection: {
    marginTop: '14px',
    padding: '12px 14px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-subtle)',
  },
  terrainPromptLabel: {
    fontSize: '10px',
    fontWeight: '600',
    letterSpacing: '0.06em',
    color: 'var(--text-tertiary)',
    marginBottom: '8px',
    textTransform: 'uppercase' as const,
  },
  terrainPromptText: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    lineHeight: '1.6',
    fontFamily: 'var(--font-mono)',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  terrainPathSection: {
    marginTop: '12px',
  },
  terrainPathLabel: {
    fontSize: '10px',
    fontWeight: '600',
    letterSpacing: '0.06em',
    color: 'var(--text-tertiary)',
    marginBottom: '4px',
    textTransform: 'uppercase' as const,
  },
  terrainPathValue: {
    fontSize: '12px',
    color: 'var(--text-tertiary)',
    fontFamily: 'var(--font-mono)',
    opacity: 0.7,
  },
  overviewGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  overviewItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '6px 8px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-subtle)',
  },
  overviewTypeDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  overviewName: {
    flex: '1',
    fontSize: '13px',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-display)',
  },
  overviewType: {
    fontSize: '10px',
    color: 'var(--text-tertiary)',
    width: '40px',
    textAlign: 'right' as const,
  },
  overviewStatus: {
    fontSize: '12px',
    color: 'var(--text-tertiary)',
    width: '16px',
    textAlign: 'center' as const,
  },
};

const deployStyles: Record<string, React.CSSProperties> = {
  deploySection: {
    marginTop: '16px',
    padding: '16px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-primary)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  deployHint: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    lineHeight: '1.5',
  },
  deployResult: {
    fontSize: '13px',
    fontWeight: '500',
    padding: '10px 14px',
    border: '1px solid',
    background: 'var(--bg-tertiary)',
  },
  deployBtn: {
    padding: '14px 28px',
    background: 'var(--accent-cyan)',
    border: '1px solid var(--accent-cyan)',
    color: 'var(--bg-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontWeight: '700',
    fontSize: '14px',
    cursor: 'pointer',
    flexDirection: 'column',
  },
  deployBtnSub: {
    fontSize: '9px',
    fontWeight: '400',
    letterSpacing: '0.05em',
    opacity: 0.7,
  },
};

const infoStyles: Record<string, React.CSSProperties> = {
  displayRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    padding: '8px 0',
  },
  fieldValue: {
    fontSize: '13px',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
  },
  editRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap' as const,
    padding: '8px 0',
  },
  editCol: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    padding: '8px 0',
  },
  fieldLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--text-tertiary)',
    letterSpacing: '0.05em',
  },
  fieldHint: {
    fontSize: '11px',
    color: 'var(--text-tertiary)',
    opacity: 0.8,
  },
  inputField: {
    width: '80px',
    padding: '6px 8px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-primary)',
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontFamily: 'var(--font-mono)',
  },
  inputFieldWide: {
    width: '100%',
    padding: '8px 10px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-primary)',
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontFamily: 'var(--font-mono)',
  },
  saveBtn: {
    padding: '6px 16px',
    background: 'var(--accent-cyan)',
    border: '1px solid var(--accent-cyan)',
    color: 'var(--bg-primary)',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  cancelBtn: {
    padding: '6px 12px',
    background: 'transparent',
    border: '1px solid var(--border-primary)',
    color: 'var(--text-secondary)',
    fontSize: '12px',
    cursor: 'pointer',
  },
  editBtn: {
    padding: '4px 12px',
    background: 'transparent',
    border: '1px solid var(--border-primary)',
    color: 'var(--text-tertiary)',
    fontSize: '11px',
    cursor: 'pointer',
    flexShrink: 0,
  },
  tagList: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap' as const,
  },
  tag: {
    padding: '3px 10px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-primary)',
    color: 'var(--text-secondary)',
    fontSize: '11px',
    fontFamily: 'var(--font-mono)',
  },
  emptyHint: {
    fontSize: '12px',
    color: 'var(--text-tertiary)',
    opacity: 0.6,
  },
};
