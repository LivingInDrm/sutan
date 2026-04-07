import { useState } from 'react';
import type { UIAsset, UIAssetCategory } from '../types';
import { api } from '../api';
import AssetThumbnail from './AssetThumbnail';

interface UIAssetListProps {
  assets: UIAsset[];
  selectedAsset: UIAsset | null;
  onSelectAsset: (asset: UIAsset) => void;
  onAssetCreated: (asset: UIAsset) => void;
}

const CATEGORY_LABELS: Record<UIAssetCategory, { cn: string; en: string; color: string }> = {
  background: { cn: '背景图', en: 'BACKGROUND', color: '#4a9eff' },
  frame:       { cn: '边框',   en: 'FRAME',      color: '#a89cf7' },
  panel:       { cn: '面板',   en: 'PANEL',      color: '#b07ad0' },
  button:      { cn: '按钮',   en: 'BUTTON',     color: '#00c896' },
  'card-border': { cn: '卡牌边框', en: 'CARD BORDER', color: '#f5c842' },
  icon:        { cn: '图标',   en: 'ICON',       color: '#c87040' },
};

const CATEGORY_ORDER: UIAssetCategory[] = ['background', 'frame', 'panel', 'button', 'card-border', 'icon'];

const DIMENSIONS_PRESETS: { label: string; value: string }[] = [
  { label: '1024×1024 (方形)', value: '1024x1024' },
  { label: '1536×1024 (宽屏)', value: '1536x1024' },
  { label: '1024×1536 (竖屏)', value: '1024x1536' },
];

export default function UIAssetList({
  assets,
  selectedAsset,
  onSelectAsset,
  onAssetCreated,
}: UIAssetListProps) {
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<UIAssetCategory>('icon');
  const [newDimensions, setNewDimensions] = useState('1024x1024');
  const [newDescription, setNewDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Track which category groups are collapsed
  const [collapsed, setCollapsed] = useState<Set<UIAssetCategory>>(new Set());

  const toggleCollapse = (cat: UIAssetCategory) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      setCreateError('请输入素材名称');
      return;
    }
    try {
      setIsCreating(true);
      setCreateError(null);
      const asset = await api.createUIAsset({
        name: newName.trim(),
        category: newCategory,
        dimensions: newDimensions,
        description: newDescription.trim(),
      });
      onAssetCreated(asset);
      handleClose();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setShowModal(false);
    setNewName('');
    setNewCategory('icon');
    setNewDimensions('1024x1024');
    setNewDescription('');
    setCreateError(null);
  };

  // Group assets by category
  const grouped = CATEGORY_ORDER.reduce<Record<UIAssetCategory, UIAsset[]>>(
    (acc, cat) => {
      acc[cat] = assets.filter((a) => a.category === cat);
      return acc;
    },
    { background: [], frame: [], panel: [], button: [], 'card-border': [], icon: [] },
  );

  return (
    <>
      <div style={styles.list}>
        {CATEGORY_ORDER.map((cat) => {
          const group = grouped[cat];
          if (group.length === 0) return null;
          const catInfo = CATEGORY_LABELS[cat];
          const isCollapsed = collapsed.has(cat);

          return (
            <div key={cat} style={styles.group}>
              {/* Category header */}
              <button style={styles.groupHeader} onClick={() => toggleCollapse(cat)}>
                <div style={styles.groupHeaderLeft}>
                  <div style={{ ...styles.groupDot, background: catInfo.color }} />
                  <span style={styles.groupLabelCn}>{catInfo.cn}</span>
                  <span style={{ ...styles.groupLabelEn, color: catInfo.color }}>{catInfo.en}</span>
                </div>
                <div style={styles.groupHeaderRight}>
                  <span style={styles.groupCount}>{group.length}</span>
                  <span style={styles.collapseIcon}>{isCollapsed ? '▶' : '▼'}</span>
                </div>
              </button>

              {/* Asset cards */}
              {!isCollapsed && group.map((asset) => {
                const isSelected = selectedAsset?.asset_id === asset.asset_id;
                return (
                  <button
                    key={asset.asset_id}
                    style={{
                      ...styles.card,
                      ...(isSelected ? styles.cardActive : {}),
                    }}
                    onClick={() => onSelectAsset(asset)}
                  >
                    <AssetThumbnail
                      src={asset.current_image || null}
                      alt={asset.name}
                      isSelected={isSelected}
                      hasPending={asset.has_pending_image}
                      pendingTitle="有未部署的图片选定"
                    />
                    <div style={styles.cardContent}>
                      <div style={styles.cardName}>{asset.name}</div>
                      <div style={styles.cardMeta}>
                        <span style={{ ...styles.categoryBadge, borderColor: catInfo.color, color: catInfo.color }}>
                          {catInfo.cn}
                        </span>
                        <span style={styles.cardDimensions}>{asset.dimensions}</span>
                        {asset.publish_status === 'published' && (
                          <span style={styles.publishedBadge}>已发布</span>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <>
                        <div style={styles.cornerTL}></div>
                        <div style={styles.cornerBR}></div>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}

        {assets.length === 0 && (
          <div style={styles.emptyList}>
            <div style={styles.emptyListIcon}>◻</div>
            <div style={styles.emptyListText}>暂无 UI 素材</div>
            <div style={styles.emptyListSub}>点击下方按钮创建第一个</div>
          </div>
        )}
      </div>

      {/* Add Button */}
      <div style={styles.addButtonWrapper}>
        <button style={styles.addButton} onClick={() => setShowModal(true)}>
          <span style={styles.addIcon}>+</span>
          <div>
            <div style={styles.addLabel}>新增 UI 素材</div>
            <div style={styles.addSublabel}>ADD UI ASSET</div>
          </div>
        </button>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div style={styles.modalOverlay} onClick={handleClose}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalTitle}>NEW UI ASSET</div>
              <div style={styles.modalSubtitle}>新增 UI 素材</div>
              <button style={styles.closeBtn} onClick={handleClose}>✕</button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>
                  素材名称 <span style={styles.fieldRequired}>*</span>
                </label>
                <input
                  style={styles.fieldInput}
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !isCreating && handleCreate()}
                  placeholder="如：主界面背景、角色卡边框、功能按钮..."
                  autoFocus
                  disabled={isCreating}
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>
                  素材类型 <span style={styles.fieldRequired}>必选</span>
                </label>
                <div style={styles.categoryGrid}>
                  {CATEGORY_ORDER.map((cat) => {
                    const info = CATEGORY_LABELS[cat];
                    const active = newCategory === cat;
                    return (
                      <button
                        key={cat}
                        style={{
                          ...styles.categoryBtn,
                          borderColor: active ? info.color : 'var(--border-primary)',
                          color: active ? info.color : 'var(--text-tertiary)',
                          background: active ? 'var(--bg-elevated)' : 'var(--bg-tertiary)',
                        }}
                        onClick={() => setNewCategory(cat)}
                        disabled={isCreating}
                      >
                        <div style={styles.categoryBtnCn}>{info.cn}</div>
                        <div style={styles.categoryBtnEn}>{info.en}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>
                  尺寸规格 <span style={styles.fieldOptional}>可选</span>
                </label>
                <select
                  style={styles.fieldSelect}
                  value={newDimensions}
                  onChange={(e) => setNewDimensions(e.target.value)}
                  disabled={isCreating}
                >
                  {DIMENSIONS_PRESETS.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>
                  补充描述 <span style={styles.fieldOptional}>可选</span>
                </label>
                <textarea
                  style={styles.fieldTextarea}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="可选，描述素材的风格、用途或特殊要求，AI 将参考此内容生成描述"
                  rows={3}
                  disabled={isCreating}
                />
              </div>

              <div style={styles.modalHint}>
                ✦ AI 将自动为该素材生成 4 个 variant descriptions，用于生成不同风格的图片
              </div>

              {createError && (
                <div style={styles.modalError}>⚠ {createError}</div>
              )}
            </div>

            <div style={styles.modalFooter}>
              <button style={styles.cancelBtn} onClick={handleClose} disabled={isCreating}>
                取消
              </button>
              <button
                style={styles.createBtn}
                onClick={handleCreate}
                disabled={isCreating || !newName.trim()}
              >
                {isCreating ? (
                  <>
                    <div className="spinner"></div>
                    <span>AI 生成中...</span>
                  </>
                ) : (
                  <span>✦ AI 生成 & 创建</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  list: {
    flex: '1',
    overflow: 'auto',
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  group: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  groupHeader: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-subtle)',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.12s ease',
    marginBottom: '2px',
  },
  groupHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  groupDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  groupLabelCn: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  groupLabelEn: {
    fontSize: '9px',
    fontWeight: '700',
    letterSpacing: '0.08em',
  },
  groupHeaderRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  groupCount: {
    fontSize: '10px',
    color: 'var(--text-tertiary)',
    fontFamily: 'var(--font-mono)',
  },
  collapseIcon: {
    fontSize: '9px',
    color: 'var(--text-tertiary)',
  },
  card: {
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-primary)',
    padding: '0',
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    textAlign: 'left',
    position: 'relative',
    transition: 'all 0.15s ease',
    cursor: 'pointer',
    marginLeft: '12px',
    width: 'calc(100% - 12px)',
  } as React.CSSProperties,
  cardActive: {
    background: 'var(--bg-elevated)',
    borderColor: 'var(--border-accent)',
    boxShadow: 'inset 0 0 0 1px var(--border-accent)',
  },
  cardContent: {
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    minWidth: 0,
    padding: '4px 4px 4px 0',
  },
  cardName: {
    fontFamily: 'var(--font-display)',
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  cardMeta: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  categoryBadge: {
    fontSize: '9px',
    fontWeight: '700',
    letterSpacing: '0.05em',
    padding: '2px 6px',
    border: '1px solid',
    background: 'transparent',
  },
  cardDimensions: {
    fontSize: '9px',
    color: 'var(--text-tertiary)',
    fontFamily: 'var(--font-mono)',
  },
  publishedBadge: {
    fontSize: '9px',
    fontWeight: '700',
    color: '#00c896',
    letterSpacing: '0.03em',
  },
  cornerTL: {
    position: 'absolute',
    top: '0',
    left: '0',
    width: '10px',
    height: '10px',
    borderTop: '2px solid var(--border-accent)',
    borderLeft: '2px solid var(--border-accent)',
  },
  cornerBR: {
    position: 'absolute',
    bottom: '0',
    right: '0',
    width: '10px',
    height: '10px',
    borderBottom: '2px solid var(--border-accent)',
    borderRight: '2px solid var(--border-accent)',
  },
  emptyList: {
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '60px 20px',
    color: 'var(--text-tertiary)',
  },
  emptyListIcon: {
    fontSize: '48px',
    opacity: 0.3,
  },
  emptyListText: {
    fontSize: '12px',
    fontWeight: '600',
    letterSpacing: '0.08em',
  },
  emptyListSub: {
    fontSize: '11px',
    opacity: 0.6,
  },
  // Add button
  addButtonWrapper: {
    padding: '12px',
    borderTop: '1px solid var(--border-primary)',
    flexShrink: 0,
  },
  addButton: {
    width: '100%',
    padding: '12px 16px',
    background: 'transparent',
    border: '1px dashed #7c6af5',
    color: '#a89cf7',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  addIcon: {
    fontSize: '20px',
    fontWeight: '300',
    color: '#7c6af5',
    lineHeight: '1',
  },
  addLabel: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#a89cf7',
  },
  addSublabel: {
    fontSize: '9px',
    fontWeight: '400',
    letterSpacing: '0.05em',
    color: '#7c6af5',
    opacity: 0.7,
  },
  // Modal
  modalOverlay: {
    position: 'fixed',
    inset: '0',
    background: 'rgba(0,0,0,0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(4px)',
  },
  modal: {
    width: '520px',
    maxWidth: '92vw',
    maxHeight: '88vh',
    background: 'var(--bg-secondary)',
    border: '1px solid #7c6af5',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
    overflowY: 'auto',
  },
  modalHeader: {
    padding: '24px 24px 20px',
    borderBottom: '1px solid var(--border-primary)',
    background: 'var(--bg-tertiary)',
    position: 'relative',
    flexShrink: 0,
  },
  modalTitle: {
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.15em',
    color: '#a89cf7',
    marginBottom: '2px',
  },
  modalSubtitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '22px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  closeBtn: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-tertiary)',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  modalBody: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    overflow: 'auto',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  fieldLabel: {
    fontSize: '10px',
    fontWeight: '600',
    letterSpacing: '0.08em',
    color: 'var(--text-tertiary)',
  },
  fieldRequired: {
    color: 'var(--error)',
  },
  fieldOptional: {
    color: 'var(--text-tertiary)',
    fontSize: '9px',
    fontWeight: '400',
    letterSpacing: '0.05em',
    marginLeft: '4px',
  },
  fieldInput: {
    width: '100%',
    padding: '10px 12px',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-primary)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    fontFamily: 'var(--font-display)',
    boxSizing: 'border-box',
  },
  fieldSelect: {
    width: '100%',
    padding: '10px 12px',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-primary)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    fontFamily: 'var(--font-display)',
    boxSizing: 'border-box',
    cursor: 'pointer',
  },
  fieldTextarea: {
    width: '100%',
    padding: '10px 12px',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-primary)',
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontFamily: 'var(--font-mono)',
    lineHeight: '1.6',
    resize: 'vertical' as const,
    boxSizing: 'border-box',
  },
  categoryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },
  categoryBtn: {
    padding: '10px 6px',
    background: 'var(--bg-tertiary)',
    border: '1px solid',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    transition: 'all 0.12s ease',
  },
  categoryBtnCn: {
    fontSize: '12px',
    fontWeight: '600',
  },
  categoryBtnEn: {
    fontSize: '8px',
    letterSpacing: '0.05em',
    opacity: 0.7,
  },
  modalHint: {
    fontSize: '12px',
    color: '#7c6af5',
    padding: '10px 12px',
    background: 'rgba(124,106,245,0.08)',
    border: '1px solid rgba(124,106,245,0.2)',
  },
  modalError: {
    fontSize: '12px',
    color: 'var(--error)',
    padding: '8px 12px',
    background: 'rgba(255,80,80,0.08)',
    border: '1px solid rgba(255,80,80,0.2)',
  },
  modalFooter: {
    padding: '16px 24px',
    borderTop: '1px solid var(--border-primary)',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    flexShrink: 0,
  },
  cancelBtn: {
    padding: '10px 20px',
    background: 'transparent',
    border: '1px solid var(--border-primary)',
    color: 'var(--text-tertiary)',
    fontSize: '13px',
    cursor: 'pointer',
  },
  createBtn: {
    padding: '10px 24px',
    background: '#4a3fa0',
    border: '1px solid #7c6af5',
    color: '#e0d9ff',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
};
