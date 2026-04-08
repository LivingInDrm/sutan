import { useState } from 'react';
import type { Item, ItemPromptRarity } from '../types';
import { api } from '../api';
import AssetThumbnail from './AssetThumbnail';

interface ItemListProps {
  items: Item[];
  selectedItem: Item | null;
  onSelectItem: (item: Item) => void;
  onItemCreated: (item: Item) => void;
}

const EQUIPMENT_TYPE_LABELS: Record<string, string> = {
  weapon: '武器',
  armor: '甲胄',
  accessory: '饰品',
  mount: '坐骑',
};

const RARITY_OPTIONS = [
  { value: 'common', label: '平凡' },
  { value: 'rare', label: '稀有' },
  { value: 'epic', label: '精英' },
  { value: 'legendary', label: '传奇' },
];

const RARITY_COLORS: Record<string, string> = {
  common: '#a0978a',
  rare: '#5ab4c8',
  epic: '#c060e0',
  legendary: '#f0a030',
};

export default function ItemList({
  items,
  selectedItem,
  onSelectItem,
  onItemCreated,
}: ItemListProps) {
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBio, setNewBio] = useState('');
  const [newEquipType, setNewEquipType] = useState('weapon');
  const [newRarity, setNewRarity] = useState<ItemPromptRarity>('common');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newName.trim()) {
      setCreateError('请输入物品名称');
      return;
    }
    try {
      setIsCreating(true);
      setCreateError(null);
      const item = await api.createItem({
        name: newName.trim(),
        bio: newBio.trim(),
        equipment_type: newEquipType,
        rarity: newRarity,
      });
      onItemCreated(item);
      setShowModal(false);
      setNewName('');
      setNewBio('');
      setNewEquipType('weapon');
      setNewRarity('common');
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setShowModal(false);
    setNewName('');
    setNewBio('');
    setNewEquipType('weapon');
    setNewRarity('common');
    setCreateError(null);
  };

  return (
    <>
      <div style={styles.list}>
        {items.map((item) => {
          const isSelected = selectedItem?.id === item.id;
          const rarityColor = RARITY_COLORS[item.rarity] || '#808080';
          return (
            <button
              key={item.id}
              style={{
                ...styles.card,
                ...(isSelected ? styles.cardActive : {}),
              }}
              onClick={() => onSelectItem(item)}
            >
              <AssetThumbnail
                src={item.current_image || null}
                alt={item.name}
                isSelected={isSelected}
                hasPending={item.has_pending_image}
                pendingTitle="有未部署的图片选定"
              />
              <div style={styles.cardContent}>
                <div style={styles.cardName}>{item.name}</div>
                <div style={styles.cardMeta}>
                  <span style={styles.cardEquipType}>
                    {EQUIPMENT_TYPE_LABELS[item.equipment_type] || item.equipment_type}
                  </span>
                  {item.rarity && (
                    <span style={{ ...styles.cardRarity, color: rarityColor }}>
                      {item.rarity.toUpperCase()}
                    </span>
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

      {/* Add Item Button */}
      <div style={styles.addButtonWrapper}>
        <button style={styles.addButton} onClick={() => setShowModal(true)}>
          <span style={styles.addIcon}>+</span>
          <div>
            <div style={styles.addLabel}>新增物品</div>
            <div style={styles.addSublabel}>ADD ITEM</div>
          </div>
        </button>
      </div>

      {/* New Item Modal */}
      {showModal && (
        <div style={styles.modalOverlay} onClick={handleClose}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalTitle}>NEW ITEM</div>
              <div style={styles.modalSubtitle}>新增物品</div>
              <button style={styles.closeBtn} onClick={handleClose}>✕</button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>
                  物品名称 <span style={styles.fieldRequired}>*</span>
                </label>
                <input
                  style={styles.fieldInput}
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !isCreating && handleCreate()}
                  placeholder="如：青鸾刀、玄铁重剑、寒玉戒指..."
                  autoFocus
                  disabled={isCreating}
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>
                  装备类型 <span style={styles.fieldOptional}>必选</span>
                </label>
                <select
                  style={styles.fieldSelect}
                  value={newEquipType}
                  onChange={(e) => setNewEquipType(e.target.value)}
                  disabled={isCreating}
                >
                  <option value="weapon">武器</option>
                  <option value="armor">甲胄</option>
                  <option value="accessory">饰品/法器</option>
                  <option value="mount">坐骑</option>
                </select>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>
                  稀有度 <span style={styles.fieldOptional}>必选</span>
                </label>
                <select
                  style={styles.fieldSelect}
                  value={newRarity}
                  onChange={(e) => setNewRarity(e.target.value as ItemPromptRarity)}
                  disabled={isCreating}
                >
                  {RARITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>
                  补充描述 <span style={styles.fieldOptional}>可选</span>
                </label>
                <textarea
                  style={styles.fieldTextarea}
                  value={newBio}
                  onChange={(e) => setNewBio(e.target.value)}
                  placeholder="可选，描述物品的外观、来历或特性，AI 将参考此内容生成描述"
                  rows={4}
                  disabled={isCreating}
                />
              </div>

              <div style={styles.modalHint}>
                ✦ AI 将自动为该物品生成 variant descriptions，并写入配置
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
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  card: {
    width: '100%',
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
  },
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
    padding: '4px 0',
  },
  cardName: {
    fontFamily: 'var(--font-display)',
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  cardMeta: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  cardEquipType: {
    fontSize: '10px',
    fontWeight: '600',
    color: 'var(--text-accent)',
    letterSpacing: '0.05em',
    padding: '2px 6px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-accent)',
  },
  cardRarity: {
    fontSize: '9px',
    fontWeight: '700',
    letterSpacing: '0.08em',
  },
  cornerTL: {
    position: 'absolute',
    top: '0',
    left: '0',
    width: '12px',
    height: '12px',
    borderTop: '2px solid var(--border-accent)',
    borderLeft: '2px solid var(--border-accent)',
  },
  cornerBR: {
    position: 'absolute',
    bottom: '0',
    right: '0',
    width: '12px',
    height: '12px',
    borderBottom: '2px solid var(--border-accent)',
    borderRight: '2px solid var(--border-accent)',
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
    width: '480px',
    maxWidth: '90vw',
    background: 'var(--bg-secondary)',
    border: '1px solid #7c6af5',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
  },
  modalHeader: {
    padding: '24px 24px 20px',
    borderBottom: '1px solid var(--border-primary)',
    background: 'var(--bg-tertiary)',
    position: 'relative',
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
