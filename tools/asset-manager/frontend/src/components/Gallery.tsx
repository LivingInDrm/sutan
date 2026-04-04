import { useState } from 'react';
import type { SampleImage } from '../types';
import ImageModal from './ImageModal';

interface GalleryProps {
  images: SampleImage[];
  characterName: string;
  onSelect: () => void;
  /** Override the default portrait-select API with a custom handler */
  onSelectImage?: (image: SampleImage) => Promise<void>;
  /** Label for the select button in the modal (default: "立绘") */
  selectLabel?: string;
}

export default function Gallery({
  images,
  characterName,
  onSelect,
  onSelectImage,
  selectLabel,
}: GalleryProps) {
  const [selectedImage, setSelectedImage] = useState<SampleImage | null>(null);

  const hasSelected = images.some((img) => img.is_selected);

  if (images.length === 0) {
    return (
      <div style={styles.empty}>
        <div style={styles.emptyIcon}>□</div>
        <div style={styles.emptyText}>NO SAMPLES FOUND</div>
        <div style={styles.emptySubtext}>Generate some images to populate the gallery</div>
      </div>
    );
  }

  const getBadgeInfo = (img: SampleImage): { label: string; style: React.CSSProperties } | null => {
    if (img.is_selected) {
      return { label: '已选定', style: styles.selectedBadge };
    }
    if (img.is_current_in_game) {
      return {
        label: hasSelected ? '线上版本' : '当前使用',
        style: hasSelected ? styles.onlineBadge : styles.currentBadge,
      };
    }
    return null;
  };

  const getCardBorderStyle = (img: SampleImage): React.CSSProperties => {
    if (img.is_selected) return styles.imageCardSelected;
    if (img.is_current_in_game) return hasSelected ? styles.imageCardOnline : styles.imageCardCurrent;
    return {};
  };

  return (
    <>
      <div style={styles.gallery}>
        <div style={styles.header}>
          <div style={styles.title}>SAMPLE GALLERY</div>
          <div style={styles.count}>{images.length} IMAGES</div>
        </div>
        <div style={styles.grid}>
          {images.map((image) => {
            const badge = getBadgeInfo(image);
            const cardBorder = getCardBorderStyle(image);
            return (
              <div
                key={image.filename}
                style={{ ...styles.imageCard, ...cardBorder }}
                onClick={() => setSelectedImage(image)}
              >
                <div style={styles.imageWrapper}>
                  <img
                    src={image.url}
                    alt={image.filename}
                    style={styles.image}
                    loading="lazy"
                  />
                  <div style={styles.overlay}>
                    <button style={styles.viewButton}>VIEW</button>
                  </div>
                  {badge && (
                    <div style={badge.style}>
                      <div style={styles.badgeText}>{badge.label}</div>
                    </div>
                  )}
                </div>
                <div style={styles.imageInfo}>
                  <div style={styles.imageName}>{image.filename}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedImage && (
        <ImageModal
          image={selectedImage}
          characterName={characterName}
          hasSelected={hasSelected}
          onClose={() => setSelectedImage(null)}
          onSelect={() => {
            setSelectedImage(null);
            onSelect();
          }}
          onSelectImage={onSelectImage}
          selectLabel={selectLabel}
        />
      )}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  gallery: {
    width: '100%',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '1px solid var(--border-primary)',
  },
  title: {
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.1em',
    color: 'var(--text-accent)',
  },
  count: {
    fontSize: '10px',
    fontWeight: '400',
    color: 'var(--text-tertiary)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '20px',
  },
  imageCard: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-primary)',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  imageCardCurrent: {
    border: '2px solid #00c896',
    boxShadow: '0 0 12px rgba(0, 200, 150, 0.3)',
  },
  imageCardSelected: {
    border: '2px solid #4a9eff',
    boxShadow: '0 0 12px rgba(74, 158, 255, 0.3)',
  },
  imageCardOnline: {
    border: '2px solid #a0a060',
    boxShadow: '0 0 8px rgba(160, 160, 96, 0.2)',
  },
  imageWrapper: {
    position: 'relative',
    width: '100%',
    paddingTop: '150%',
    background: 'var(--bg-tertiary)',
    overflow: 'hidden',
  },
  image: {
    position: 'absolute',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  overlay: {
    position: 'absolute',
    inset: '0',
    background: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: '0',
    transition: 'opacity 0.2s ease',
  },
  viewButton: {
    padding: '8px 16px',
    background: 'var(--accent-cyan)',
    border: '1px solid var(--accent-cyan)',
    color: 'var(--bg-primary)',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.05em',
  },
  // Badge styles
  currentBadge: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    background: '#00c896',
    color: '#000',
  },
  selectedBadge: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    background: '#4a9eff',
    color: '#000',
  },
  onlineBadge: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    background: '#a0a060',
    color: '#000',
  },
  badgeText: {
    fontSize: '9px',
    fontWeight: '700',
    letterSpacing: '0.05em',
  },
  imageInfo: {
    padding: '12px',
    background: 'var(--bg-tertiary)',
    borderTop: '1px solid var(--border-subtle)',
  },
  imageName: {
    fontSize: '10px',
    fontWeight: '400',
    color: 'var(--text-secondary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    padding: '80px 40px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-primary)',
  },
  emptyIcon: {
    fontSize: '64px',
    color: 'var(--border-primary)',
    fontWeight: '300',
  },
  emptyText: {
    fontSize: '12px',
    fontWeight: '600',
    letterSpacing: '0.1em',
    color: 'var(--text-tertiary)',
  },
  emptySubtext: {
    fontSize: '11px',
    color: 'var(--text-tertiary)',
    opacity: 0.6,
  },
};

// Add hover effect via inline style manipulation
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    [style*="imageCard"]:hover {
      border-color: var(--border-accent) !important;
      transform: translateY(-2px);
    }
    [style*="imageCard"]:hover [style*="overlay"] {
      opacity: 1 !important;
    }
  `;
  document.head.appendChild(styleSheet);
}
