import { useEffect, useState } from 'react';
import type { SampleImage } from '../types';
import { api } from '../api';

interface ImageModalProps {
  image: SampleImage;
  characterName: string;
  hasSelected: boolean;
  onClose: () => void;
  onSelect: () => void;
  /** Override the default portrait-select API call with a custom handler */
  onSelectImage?: (image: SampleImage) => Promise<void>;
  /** Label for the select button (default: "设为立绘") */
  selectLabel?: string;
}

export default function ImageModal({
  image,
  characterName,
  hasSelected,
  onClose,
  onSelect,
  onSelectImage,
  selectLabel,
}: ImageModalProps) {
  const [selecting, setSelecting] = useState(false);
  const [hovered, setHovered] = useState(false);

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

    const label = selectLabel || '立绘';
    const confirmed = window.confirm(`设为${label}？\n\n将选定「${image.filename}」作为部署时使用的${label}。`);
    if (!confirmed) return;

    try {
      setSelecting(true);
      if (onSelectImage) {
        await onSelectImage(image);
      } else {
        await api.selectPortrait(characterName, image.abs_path);
      }
      onSelect();
    } catch (err) {
      console.error('Failed to select image:', err);
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
  const defaultLabel = selectLabel || '立绘';
  const buttonLabel = image.is_selected
    ? '已选定'
    : image.is_current_in_game && !hasSelected
    ? `当前${defaultLabel}`
    : selecting
    ? '选定中...'
    : `设为${defaultLabel}`;

  const isCurrentGameOnly = image.is_current_in_game && !image.is_selected;

  const overlayOpacity = hovered ? 1 : 0.3;

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div
        style={styles.modal}
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Image fills entire modal */}
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

        {/* Top overlay: filename + close button */}
        <div style={{ ...styles.headerOverlay, opacity: overlayOpacity }}>
          <div style={styles.headerInfo}>
            <div style={styles.filename}>{image.filename}</div>
            <div style={styles.path}>{image.path}</div>
          </div>
          <button style={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Bottom overlay: action button */}
        <div style={{ ...styles.actionsOverlay, opacity: overlayOpacity }}>
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
                    : 'SET AS IMAGE'}
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
    height: 'calc(100vh - 80px)',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-accent)',
    boxShadow: '0 0 40px var(--accent-cyan-glow)',
    position: 'relative',
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'absolute',
    inset: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-primary)',
  },
  image: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
  },
  gameBadgeOverlay: {
    position: 'absolute',
    top: '60px',
    right: '16px',
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
  headerOverlay: {
    position: 'absolute',
    top: '0',
    left: '0',
    right: '0',
    padding: '10px 16px',
    background: 'rgba(0, 0, 0, 0.65)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
    transition: 'opacity 0.25s ease',
  },
  headerInfo: {
    flex: '1',
    minWidth: 0,
  },
  filename: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    fontFamily: 'var(--font-mono)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  path: {
    fontSize: '10px',
    fontWeight: '400',
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'var(--font-mono)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  closeButton: {
    width: '28px',
    height: '28px',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.3)',
    color: 'rgba(255,255,255,0.8)',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    marginLeft: '12px',
    transition: 'all 0.15s ease',
  },
  actionsOverlay: {
    position: 'absolute',
    bottom: '0',
    left: '0',
    right: '0',
    padding: '10px 16px',
    background: 'rgba(0, 0, 0, 0.65)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 10,
    transition: 'opacity 0.25s ease',
  },
  selectButton: {
    padding: '8px 24px',
    background: 'var(--accent-cyan)',
    border: '1px solid var(--accent-cyan)',
    color: 'var(--bg-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontWeight: '700',
    fontSize: '12px',
    cursor: 'pointer',
  },
  selectButtonDisabled: {
    background: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255,255,255,0.2)',
    color: 'rgba(255,255,255,0.4)',
    cursor: 'not-allowed',
  },
  buttonLabel: {
    fontSize: '9px',
    opacity: 0.7,
    letterSpacing: '0.05em',
  },
};
