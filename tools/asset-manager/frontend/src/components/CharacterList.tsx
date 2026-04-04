import { useState } from 'react';
import type { Character } from '../types';
import { api } from '../api';

interface CharacterListProps {
  characters: Character[];
  selectedCharacter: Character | null;
  onSelectCharacter: (character: Character) => void;
  onCharacterCreated: (character: Character) => void;
}

export default function CharacterList({
  characters,
  selectedCharacter,
  onSelectCharacter,
  onCharacterCreated,
}: CharacterListProps) {
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBio, setNewBio] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newName.trim()) {
      setCreateError('请输入角色名');
      return;
    }
    try {
      setIsCreating(true);
      setCreateError(null);
      const character = await api.createCharacter({ name: newName.trim(), bio: newBio.trim() });
      onCharacterCreated(character);
      setShowModal(false);
      setNewName('');
      setNewBio('');
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
    setCreateError(null);
  };

  return (
    <>
      <div style={styles.list}>
        {characters.map((character) => {
          const isSelected = selectedCharacter?.id === character.id;
          return (
            <button
              key={character.id}
              style={{
                ...styles.card,
                ...(isSelected ? styles.cardActive : {}),
              }}
              onClick={() => onSelectCharacter(character)}
            >
              <div style={styles.cardImage}>
                <img
                  src={character.current_portrait || `/portraits/${character.figure_id}.png`}
                  alt={character.name}
                  style={styles.image}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                {isSelected && <div style={styles.selectedBadge}>ACTIVE</div>}
                {character.has_pending_portrait && (
                  <div style={styles.pendingBadge} title="有未部署的立绘选定"></div>
                )}
              </div>
              <div style={styles.cardContent}>
                <div style={styles.cardName}>{character.name}</div>
                <div style={styles.cardMeta}>
                  <span style={styles.cardId}>{character.figure_id}</span>
                  <span style={styles.cardVariants}>
                    {character.variants.length} VAR
                  </span>
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

      {/* Add Character Button */}
      <div style={styles.addButtonWrapper}>
        <button style={styles.addButton} onClick={() => setShowModal(true)}>
          <span style={styles.addIcon}>+</span>
          <div>
            <div style={styles.addLabel}>新增角色</div>
            <div style={styles.addSublabel}>ADD CHARACTER</div>
          </div>
        </button>
      </div>

      {/* New Character Modal */}
      {showModal && (
        <div style={styles.modalOverlay} onClick={handleClose}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalTitle}>NEW CHARACTER</div>
              <div style={styles.modalSubtitle}>新增角色</div>
              <button style={styles.closeBtn} onClick={handleClose}>✕</button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>角色名 <span style={styles.fieldRequired}>*</span></label>
                <input
                  style={styles.fieldInput}
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="如：叶二娘、李淳罡..."
                  disabled={isCreating}
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>角色简介 <span style={styles.fieldOptional}>可选</span></label>
                <textarea
                  style={styles.fieldTextarea}
                  value={newBio}
                  onChange={(e) => setNewBio(e.target.value)}
                  placeholder="可选，补充模型可能不了解的特征（如外貌细节、特殊道具等），留空则由 AI 根据原著自行理解"
                  rows={4}
                  disabled={isCreating}
                />
              </div>

              <div style={styles.modalHint}>
                ✦ AI 将自动为该角色生成 4 个不同场景的 description，并写入 batch_config.json
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
                  <>
                    <span>✦ AI 生成 & 创建</span>
                  </>
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
  },
  cardActive: {
    background: 'var(--bg-elevated)',
    borderColor: 'var(--border-accent)',
    boxShadow: 'inset 0 0 0 1px var(--border-accent)',
  },
  cardImage: {
    width: '80px',
    height: '100px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-subtle)',
    borderLeft: 'none',
    borderTop: 'none',
    borderBottom: 'none',
    overflow: 'hidden',
    position: 'relative',
    flexShrink: 0,
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  selectedBadge: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    padding: '2px 6px',
    background: 'var(--accent-cyan)',
    color: 'var(--bg-primary)',
    fontSize: '8px',
    fontWeight: '700',
    letterSpacing: '0.05em',
  },
  pendingBadge: {
    position: 'absolute',
    bottom: '6px',
    right: '6px',
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: '#f97316',
    boxShadow: '0 0 6px rgba(249,115,22,0.8)',
    border: '1.5px solid rgba(0,0,0,0.4)',
  },
  cardContent: {
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minWidth: 0,
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
    gap: '12px',
    alignItems: 'center',
  },
  cardId: {
    fontSize: '10px',
    fontWeight: '400',
    color: 'var(--text-tertiary)',
    letterSpacing: '0.02em',
  },
  cardVariants: {
    fontSize: '9px',
    fontWeight: '600',
    color: 'var(--text-accent)',
    letterSpacing: '0.05em',
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
