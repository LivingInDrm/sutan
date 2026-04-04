import { useEffect, useState } from 'react';
import type { SampleImage } from '../types';
import { api } from '../api';

interface ImageModalProps {
  image: SampleImage;
  characterName: string;
  hasSelected: boolean;
  onClose: () => void;
  onSelect: () => void;
}

export default function ImageModal({
  image,
  characterName,
  hasSelected,
  onClose,
  onSelect,
}: ImageModalProps) {
  const [selecting, setSelecting] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleSetPortrait = async () => {
    if (image.is_selected || image.is_current_in_game) return;

    const confirmed = window.confirm(`设为立绘？\n\n将选定「${image.filename}」作为部署时使用的立绘。`);
    if (!confirmed) return;

    try {
      setSelecting(true);
      await api.selectPortrait(characterName, image.abs_path);
      onSelect();
    } catch (err) {
      console.error('Failed to select portrait:', err);
      alert('选定失败：' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setSelecting(false);
    }
  };

  // Determine badge label for modal image overlay
  const getGameBadge = () => {
    if (image.is_selected) {
      return { label: '已选定', color: '#4a9eff' };
    }
    if (image.is_current_in_game) {
      return {
        label: hasSelected ? '线上版本' : '当前使用',
        color: hasSelected ? '#a0a060' : '#00c896',
      };
    }
    return null;
  };

  const gameBadge = getGameBadge();

  // Button state
  const isDisabled = selecting || image.is_selected;
  const buttonLabel = image.is_selected
    ? '已选定'
    : image.is_current_in_game && !hasSelected
    ? '当前立绘'
    : selecting
    ? '选定中...'
    : '设为立绘';

  const isCurrentGameOnly = image.is_current_in_game && !image.is_selected;

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.headerInfo}>
            <div style={styles.filename}>{image.filename}</div>
            <div style={styles.path}>{image.path}</div>
          </div>
          <button style={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={styles.imageContainer}>
          <img src={image.url} alt={image.filename} style={styles.image} />
          {gameBadge && (
            <div style={styles.gameBadgeOverlay}>
              <div style={{ ...styles.gameBadge, background: gameBadge.color }}>
                <div style={styles.gameBadgeText}>{gameBadge.label}</div>
              </div>
            </div>
          )}
        </div>

        <div style={styles.actions}>
          <button
            style={{
              ...styles.selectButton,
              ...(isDisabled || isCurrentGameOnly ? styles.selectButtonDisabled : {}),
            }}
            onClick={handleSetPortrait}
            disabled={isDisabled || isCurrentGameOnly}
          >
            {selecting ? (
              <>
                <div className="spinner"></div>
                <span>选定中...</span>
              </>
            ) : (
              <>
                <span>{buttonLabel}</span>
                <span style={styles.buttonLabel}>
                  {image.is_selected
                    ? 'SELECTED'
                    : isCurrentGameOnly
                    ? 'CURRENT'
                    : 'SET AS PORTRAIT'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: '0',
    background: 'rgba(0, 0, 0, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(4px)',
    padding: '40px',
  },
  modal: {
    width: '100%',
    maxWidth: '900px',
    maxHeight: '100%',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-accent)',
    boxShadow: '0 0 40px var(--accent-cyan-glow)',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },
  header: {
    padding: '20px 24px',
    borderBottom: '1px solid var(--border-primary)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    background: 'var(--bg-tertiary)',
  },
  headerInfo: {
    flex: '1',
  },
  filename: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginBottom: '4px',
    fontFamily: 'var(--font-mono)',
  },
  path: {
    fontSize: '11px',
    fontWeight: '400',
    color: 'var(--text-tertiary)',
    fontFamily: 'var(--font-mono)',
  },
  closeButton: {
    width: '32px',
    height: '32px',
    background: 'transparent',
    border: '1px solid var(--border-primary)',
    color: 'var(--text-secondary)',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  },
  imageContainer: {
    flex: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    background: 'var(--bg-primary)',
    position: 'relative',
    overflow: 'auto',
  },
  image: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
    border: '1px solid var(--border-primary)',
    boxShadow: 'var(--shadow-lg)',
  },
  gameBadgeOverlay: {
    position: 'absolute',
    top: '40px',
    right: '40px',
  },
  gameBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    color: '#000',
    boxShadow: '0 0 20px rgba(0,0,0,0.3)',
  },
  gameBadgeText: {
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.1em',
  },
  actions: {
    padding: '20px 24px',
    borderTop: '1px solid var(--border-primary)',
    background: 'var(--bg-tertiary)',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  selectButton: {
    padding: '12px 32px',
    background: 'var(--accent-cyan)',
    border: '1px solid var(--accent-cyan)',
    color: 'var(--bg-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontWeight: '700',
    fontSize: '13px',
    cursor: 'pointer',
  },
  selectButtonDisabled: {
    background: 'var(--bg-elevated)',
    borderColor: 'var(--border-primary)',
    color: 'var(--text-tertiary)',
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  buttonLabel: {
    fontSize: '9px',
    opacity: 0.7,
    letterSpacing: '0.05em',
  },
};
