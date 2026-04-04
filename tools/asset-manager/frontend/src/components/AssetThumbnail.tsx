/**
 * AssetThumbnail — shared thumbnail card for CharacterList and ItemList.
 *
 * Follows CharacterList's proven pattern:
 *   - Single <img> with onError that hides the image (no separate placeholder div)
 *   - ACTIVE badge when isSelected
 *   - Orange pending dot badge when hasPending
 */
import React from 'react';

interface AssetThumbnailProps {
  /** Image URL (current_portrait / current_image). Falsy → no <img> rendered. */
  src?: string | null;
  alt: string;
  isSelected: boolean;
  hasPending: boolean;
  pendingTitle?: string;
}

export default function AssetThumbnail({
  src,
  alt,
  isSelected,
  hasPending,
  pendingTitle = '有未部署的图片选定',
}: AssetThumbnailProps) {
  return (
    <div style={styles.container}>
      {src && (
        <img
          src={src}
          alt={alt}
          style={styles.image}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      )}
      {isSelected && <div style={styles.selectedBadge}>ACTIVE</div>}
      {hasPending && (
        <div style={styles.pendingBadge} title={pendingTitle}></div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
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
};
