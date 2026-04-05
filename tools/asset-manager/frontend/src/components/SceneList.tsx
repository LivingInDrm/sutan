import { useState } from 'react';
import type { Scene, SceneMap } from '../types';
import AssetThumbnail from './AssetThumbnail';

interface SceneListProps {
  maps: Record<string, SceneMap>;
  selectedScene: Scene | null;
  onSelectScene: (scene: Scene) => void;
}

const SCENE_TYPE_COLORS: Record<string, string> = {
  枢纽: '#f5c842',
  主线: '#4a9eff',
  商店: '#4fcfa0',
  战斗: '#ff6060',
  探索: '#c87040',
  功能: '#a89cf7',
};

export default function SceneList({ maps, selectedScene, onSelectScene }: SceneListProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleMap = (mapId: string) => {
    setCollapsed((prev) => ({ ...prev, [mapId]: !prev[mapId] }));
  };

  const mapEntries = Object.entries(maps);

  return (
    <div style={styles.container}>
      {mapEntries.length === 0 && (
        <div style={styles.emptyState}>
          <div style={styles.emptyText}>无场景数据</div>
          <div style={styles.emptyHint}>请检查 scripts/scene_profiles.json</div>
        </div>
      )}

      {mapEntries.map(([mapId, mapData]) => {
        const isCollapsed = collapsed[mapId] ?? false;
        const mapHasPending = mapData.scenes.some((s) => s.has_pending_icon);
        const mapHasIcons = mapData.scenes.filter((s) => s.current_icon).length;
        const totalScenes = mapData.scenes.length;

        return (
          <div key={mapId} style={styles.mapGroup}>
            {/* Map header row */}
            <button
              style={styles.mapHeader}
              onClick={() => toggleMap(mapId)}
            >
              <div style={styles.mapHeaderLeft}>
                <span style={styles.mapCollapseIcon}>
                  {isCollapsed ? '▶' : '▼'}
                </span>
                <div>
                  <div style={styles.mapName}>{mapData.name}</div>
                  <div style={styles.mapMeta}>
                    {mapHasIcons}/{totalScenes} 已生成
                    {mapHasPending && (
                      <span style={styles.pendingBadge}>· 有待部署</span>
                    )}
                  </div>
                </div>
              </div>
              <div style={styles.mapId}>{mapId}</div>
            </button>

            {/* Scene items */}
            {!isCollapsed && (
              <div style={styles.sceneList}>
                {mapData.scenes.map((scene) => {
                  const isSelected = selectedScene?.id === scene.id;
                  const typeColor = SCENE_TYPE_COLORS[scene.type] || '#808080';

                  return (
                    <button
                      key={scene.id}
                      style={{
                        ...styles.sceneCard,
                        ...(isSelected ? styles.sceneCardActive : {}),
                      }}
                      onClick={() => onSelectScene(scene)}
                    >
                      <AssetThumbnail
                        src={scene.current_icon || null}
                        alt={scene.name}
                        isSelected={isSelected}
                        hasPending={scene.has_pending_icon}
                        pendingTitle="有未部署的图标选定"
                      />
                      <div style={styles.sceneContent}>
                        <div style={styles.sceneName}>{scene.name}</div>
                        <div style={styles.sceneMeta}>
                          <span
                            style={{
                              ...styles.sceneType,
                              color: typeColor,
                              borderColor: `${typeColor}50`,
                            }}
                          >
                            {scene.type}
                          </span>
                          {scene.current_icon && (
                            <span style={styles.hasIconDot} title="已有图标">◆</span>
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
            )}
          </div>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: '1',
    overflow: 'auto',
    padding: '8px 0',
  },
  emptyState: {
    padding: '48px 24px',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: '14px',
    color: 'var(--text-tertiary)',
    marginBottom: '8px',
  },
  emptyHint: {
    fontSize: '11px',
    color: 'var(--text-tertiary)',
    opacity: 0.6,
    fontFamily: 'var(--font-mono)',
  },
  mapGroup: {
    marginBottom: '2px',
  },
  mapHeader: {
    width: '100%',
    padding: '10px 14px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-primary)',
    borderLeft: '3px solid var(--border-accent)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 0.15s ease',
  },
  mapHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  mapCollapseIcon: {
    fontSize: '8px',
    color: 'var(--text-tertiary)',
    width: '12px',
    textAlign: 'center' as const,
    flexShrink: 0,
  },
  mapName: {
    fontFamily: 'var(--font-display)',
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginBottom: '2px',
  },
  mapMeta: {
    fontSize: '10px',
    color: 'var(--text-tertiary)',
    fontFamily: 'var(--font-mono)',
  },
  pendingBadge: {
    color: '#f5c842',
    marginLeft: '2px',
  },
  mapId: {
    fontSize: '9px',
    fontWeight: '500',
    color: 'var(--text-tertiary)',
    letterSpacing: '0.06em',
    opacity: 0.5,
    fontFamily: 'var(--font-mono)',
  },
  sceneList: {
    paddingLeft: '0',
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
  },
  sceneCard: {
    width: '100%',
    background: 'var(--bg-tertiary)',
    border: '1px solid transparent',
    borderLeft: '2px solid transparent',
    padding: '0',
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    textAlign: 'left',
    position: 'relative',
    transition: 'all 0.12s ease',
    cursor: 'pointer',
    paddingLeft: '16px',
  },
  sceneCardActive: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-accent)',
    borderLeft: '2px solid var(--border-accent)',
    boxShadow: 'inset 0 0 0 1px var(--border-accent)',
  },
  sceneContent: {
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minWidth: 0,
    padding: '6px 8px 6px 0',
  },
  sceneName: {
    fontFamily: 'var(--font-display)',
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  sceneMeta: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
  },
  sceneType: {
    fontSize: '9px',
    fontWeight: '700',
    letterSpacing: '0.04em',
    padding: '1px 5px',
    border: '1px solid',
    background: 'var(--bg-primary)',
  },
  hasIconDot: {
    fontSize: '6px',
    color: 'var(--success)',
    opacity: 0.8,
  },
  cornerTL: {
    position: 'absolute',
    top: '0',
    left: '0',
    width: '8px',
    height: '8px',
    borderTop: '2px solid var(--border-accent)',
    borderLeft: '2px solid var(--border-accent)',
  },
  cornerBR: {
    position: 'absolute',
    bottom: '0',
    right: '0',
    width: '8px',
    height: '8px',
    borderBottom: '2px solid var(--border-accent)',
    borderRight: '2px solid var(--border-accent)',
  },
};
