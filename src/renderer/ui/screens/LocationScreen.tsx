import React from 'react';
import { useUIStore } from '../../stores/uiStore';
import { useGameStore } from '../../stores/gameStore';
import { SceneStatus } from '../../core/types/enums';
import { dataLoader } from '../../data/loader';
import type { Scene, MapConfig, LocationConfig } from '../../core/types';

const mapConfig: MapConfig = dataLoader.getMap('map_001_beiliang') ?? dataLoader.getFirstMap()!;

const SCENE_TYPE_LABELS: Record<string, string> = {
  event: '事件',
  shop: '商铺',
  challenge: '挑战',
};

type SceneStatusLabel = 'available' | 'participated' | 'completed' | 'locked';

function getSceneStatusLabel(
  sceneId: string,
  game: ReturnType<typeof useGameStore.getState>['game'],
): SceneStatusLabel {
  if (!game) return 'locked';
  const state = game.sceneManager.getSceneState(sceneId);
  if (!state) return 'locked';
  switch (state.status) {
    case SceneStatus.Available: return 'available';
    case SceneStatus.Participated: return 'participated';
    case SceneStatus.Completed: return 'completed';
    case SceneStatus.Settling: return 'participated';
    default: return 'locked';
  }
}

const STATUS_CONFIG: Record<SceneStatusLabel, { label: string; color: string; bgColor: string; borderColor: string; clickable: boolean }> = {
  available: {
    label: '可参与',
    color: 'text-amber-300',
    bgColor: 'bg-amber-900/20 hover:bg-amber-900/35',
    borderColor: 'border-amber-600/40 hover:border-amber-400/60',
    clickable: true,
  },
  participated: {
    label: '进行中',
    color: 'text-blue-300',
    bgColor: 'bg-blue-900/10',
    borderColor: 'border-blue-700/30',
    clickable: false,
  },
  completed: {
    label: '已完成',
    color: 'text-gray-500',
    bgColor: 'bg-gray-900/20',
    borderColor: 'border-gray-700/20',
    clickable: false,
  },
  locked: {
    label: '未解锁',
    color: 'text-gray-600',
    bgColor: 'bg-gray-950/20',
    borderColor: 'border-gray-800/20',
    clickable: false,
  },
};

export function LocationScreen() {
  const game = useGameStore(s => s.game);
  const selectedLocationId = useUIStore(s => s.selectedLocationId);
  const navigateToWorldMap = useUIStore(s => s.navigateToWorldMap);
  const selectScene = useUIStore(s => s.selectScene);
  const setScreen = useUIStore(s => s.setScreen);

  const locations: LocationConfig[] = mapConfig.locations;
  const location = locations.find(l => l.location_id === selectedLocationId);

  if (!location) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-950">
        <div className="text-amber-400/60">未找到场景地点</div>
        <button
          onClick={navigateToWorldMap}
          className="ml-4 text-amber-400 hover:text-amber-200"
        >
          返回地图
        </button>
      </div>
    );
  }

  const handleSceneClick = (sceneId: string) => {
    selectScene(sceneId);
    setScreen('scene');
  };

  const sceneEntries: Array<{ scene: Scene | undefined; sceneId: string; status: SceneStatusLabel }> =
    location.scene_ids.map(sceneId => ({
      scene: game?.sceneManager.getScene(sceneId),
      sceneId,
      status: getSceneStatusLabel(sceneId, game),
    }));

  const hasAvailable = sceneEntries.some(e => e.status === 'available');

  return (
    <div
      className="h-full flex flex-col relative overflow-hidden"
    >
      {/* Backdrop background image */}
      {location.backdrop_image && (
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${location.backdrop_image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}
      {/* Header */}
      <div className="relative z-10 shrink-0 px-6 pt-6 pb-4 border-b border-amber-900/30 bg-black/30 backdrop-blur-sm">
        <button
          onClick={navigateToWorldMap}
          className="flex items-center gap-1.5 text-xs text-amber-400/60 hover:text-amber-400/90
                     transition-colors mb-4"
        >
          <span>←</span>
          <span>返回北凉道大地图</span>
        </button>

        <h1
          className="text-3xl font-bold text-amber-400 tracking-widest mb-1"
          style={{ fontFamily: 'serif', textShadow: '0 0 20px rgba(217,119,6,0.5)' }}
        >
          {location.name}
        </h1>

        {hasAvailable ? (
          <p className="text-xs text-amber-300/60 mt-1">选择一个剧情参与</p>
        ) : (
          <p className="text-xs text-gray-400/60 mt-1">此地暂无可参与的剧情</p>
        )}
      </div>

      {/* Scene List */}
      <div className="relative z-10 flex-1 overflow-y-auto px-6 py-5">
        {sceneEntries.length === 0 && (
          <div className="text-center text-gray-300/60 py-12">此地暂无剧情</div>
        )}

        <div className="flex flex-col gap-3 max-w-2xl mx-auto">
          {sceneEntries.map(({ scene, sceneId, status }) => {
            const cfg = STATUS_CONFIG[status];
            return (
              <SceneCard
                key={sceneId}
                scene={scene}
                sceneId={sceneId}
                status={status}
                config={cfg}
                onSelect={() => handleSceneClick(sceneId)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SceneCard({
  scene,
  sceneId,
  status,
  config,
  onSelect,
}: {
  scene: Scene | undefined;
  sceneId: string;
  status: SceneStatusLabel;
  config: typeof STATUS_CONFIG[SceneStatusLabel];
  onSelect: () => void;
}) {
  const content = (
    <div
      className={`w-full text-left p-4 rounded-lg border transition-all duration-200
                  ${config.bgColor} ${config.borderColor}
                  ${config.clickable ? 'cursor-pointer' : 'cursor-default'}`}
      onClick={config.clickable ? onSelect : undefined}
      role={config.clickable ? 'button' : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            {scene ? (
              <>
                <span className="text-[10px] text-amber-600/60 tracking-widest uppercase">
                  {SCENE_TYPE_LABELS[scene.type] || scene.type}
                </span>
                <span className="text-amber-800/40">·</span>
                <span className="text-[10px] text-amber-700/50">{scene.duration} 回合</span>
              </>
            ) : (
              <span className="text-[10px] text-gray-700 tracking-widest">未知剧情</span>
            )}
          </div>

          <div
            className={`text-base font-bold mb-1.5 tracking-wide ${config.color}`}
            style={{ fontFamily: 'serif' }}
          >
            {scene?.name ?? sceneId}
          </div>

          {scene && (
            <p className="text-xs text-gray-400/70 leading-relaxed line-clamp-2">
              {scene.description}
            </p>
          )}

          {/* Unlock conditions hint */}
          {status === 'locked' && scene?.unlock_conditions && (
            <div className="mt-2 text-[10px] text-gray-600">
              {scene.unlock_conditions.reputation_min !== undefined && (
                <span>需要声望 ≥ {scene.unlock_conditions.reputation_min}</span>
              )}
              {scene.unlock_conditions.required_tags && (scene.unlock_conditions.required_tags as string[]).length > 0 && (
                <span className="ml-2">
                  需要：{(scene.unlock_conditions.required_tags as string[]).join('、')}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 flex flex-col items-end gap-1.5">
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full border
                        ${status === 'available'
                          ? 'border-amber-500/40 text-amber-400 bg-amber-900/20'
                          : status === 'participated'
                          ? 'border-blue-500/30 text-blue-400/80 bg-blue-900/10'
                          : status === 'completed'
                          ? 'border-green-700/30 text-green-600/70 bg-green-950/10'
                          : 'border-gray-700/30 text-gray-600 bg-gray-900/10'
                        }`}
          >
            {config.label}
          </span>

          {status === 'available' && (
            <span className="text-[10px] text-amber-500/50 tracking-wider">点击参与 →</span>
          )}

          {status === 'locked' && (
            <span className="text-base text-gray-700">🔒</span>
          )}
        </div>
      </div>
    </div>
  );

  return content;
}
