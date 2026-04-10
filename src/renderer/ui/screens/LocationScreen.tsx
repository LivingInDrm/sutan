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

const STATUS_CONFIG: Record<SceneStatusLabel, {
  label: string;
  titleColor: string;
  accentLine: string;
  badgeClassName: string;
  clickable: boolean;
  cardTone: string;
  cardStyle: React.CSSProperties;
}> = {
  available: {
    label: '可参与',
    titleColor: 'text-leather-900',
    accentLine: 'rgba(139,26,26,0.52)',
    badgeClassName: 'border-crimson-700/35 bg-[linear-gradient(180deg,rgba(150,126,90,0.24),rgba(108,72,42,0.18))] text-crimson-700',
    clickable: true,
    cardTone: 'available',
    cardStyle: {
      borderColor: 'rgba(106,80,32,0.58)',
      background: 'linear-gradient(180deg, rgba(239,230,209,0.98), rgba(223,209,181,0.96))',
      boxShadow: '0 12px 26px rgba(0,0,0,0.18), inset 0 0 0 1px rgba(245,240,232,0.26)',
    },
  },
  participated: {
    label: '进行中',
    titleColor: 'text-leather-900',
    accentLine: 'rgba(45,85,85,0.44)',
    badgeClassName: 'border-cerulean-500/30 bg-[linear-gradient(180deg,rgba(78,106,104,0.12),rgba(52,78,76,0.16))] text-cerulean-500',
    clickable: false,
    cardTone: 'participated',
    cardStyle: {
      borderColor: 'rgba(110,96,67,0.48)',
      background: 'linear-gradient(180deg, rgba(227,220,203,0.95), rgba(204,194,171,0.93))',
      boxShadow: '0 10px 22px rgba(0,0,0,0.16), inset 0 0 0 1px rgba(245,240,232,0.16)',
    },
  },
  completed: {
    label: '已完成',
    titleColor: 'text-leather-900',
    accentLine: 'rgba(90,122,58,0.42)',
    badgeClassName: 'border-bamboo-700/30 bg-[linear-gradient(180deg,rgba(109,129,80,0.12),rgba(76,98,56,0.18))] text-bamboo-500',
    clickable: false,
    cardTone: 'completed',
    cardStyle: {
      borderColor: 'rgba(106,96,67,0.46)',
      background: 'linear-gradient(180deg, rgba(226,219,199,0.94), rgba(202,194,171,0.92))',
      boxShadow: '0 10px 22px rgba(0,0,0,0.16), inset 0 0 0 1px rgba(245,240,232,0.14)',
    },
  },
  locked: {
    label: '未解锁',
    titleColor: 'text-parchment-400/70',
    accentLine: 'rgba(80,54,40,0.32)',
    badgeClassName: 'border-leather-500/28 bg-[linear-gradient(180deg,rgba(58,37,28,0.48),rgba(35,21,16,0.68))] text-parchment-500/72',
    clickable: false,
    cardTone: 'locked',
    cardStyle: {
      borderColor: 'rgba(80,54,40,0.54)',
      background: 'linear-gradient(180deg, rgba(66,42,32,0.92), rgba(36,22,17,0.97))',
      boxShadow: '0 8px 18px rgba(0,0,0,0.26), inset 0 0 0 1px rgba(196,181,148,0.06)',
    },
  },
};

function getUnlockHint(scene: Scene | undefined): string[] {
  if (!scene?.unlock_conditions) return [];
  const hints: string[] = [];
  const { reputation_min, required_tags, required_cards, required_items, day_range } = scene.unlock_conditions;
  if (reputation_min !== undefined) hints.push(`需要声望 ≥ ${reputation_min}`);
  if (required_tags && required_tags.length > 0) hints.push(`需要标签：${required_tags.join('、')}`);
  if (required_cards && required_cards.length > 0) hints.push(`需要角色卡：${required_cards.join('、')}`);
  if (required_items && required_items.length > 0) hints.push(`需要装备：${required_items.join('、')}`);
  if (day_range) hints.push(`出现时间：第 ${day_range[0]}-${day_range[1]} 天`);
  return hints;
}

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
      <div className="h-full flex items-center justify-center bg-leather-900">
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
    location.scene_ids
      .filter(sceneId => {
        const state = game?.sceneManager.getSceneState(sceneId);
        return state !== undefined && state.status !== SceneStatus.Completed;
      })
      .map(sceneId => ({
        scene: game?.sceneManager.getScene(sceneId),
        sceneId,
        status: getSceneStatusLabel(sceneId, game),
      }));

  const hasAvailable = sceneEntries.some(e => e.status === 'available');

  return (
    <div
      className="h-full flex flex-col relative overflow-hidden"
    >
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top,rgba(14,8,6,0.08),rgba(14,8,6,0.34)_52%,rgba(14,8,6,0.58)_100%)]" />
      <div className="absolute inset-0 z-0 bg-[linear-gradient(180deg,rgba(12,7,5,0.28)_0%,rgba(12,7,5,0.18)_24%,rgba(12,7,5,0.52)_100%)]" />
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
      <div className="relative z-10 shrink-0 px-6 pt-5 pb-4">
        <div className="mx-auto max-w-4xl overflow-hidden rounded-xl border border-gold-500/20 bg-[linear-gradient(180deg,rgba(21,12,8,0.62),rgba(13,8,6,0.34))] shadow-[0_8px_32px_rgba(0,0,0,0.24)] backdrop-blur-[2px]">
          <div className="h-px bg-gradient-to-r from-transparent via-gold-300/55 to-transparent" />
          <div className="px-6 pt-5 pb-4">
        <button
          onClick={navigateToWorldMap}
          className="mb-4 inline-flex items-center gap-2 text-[11px] tracking-[0.16em] text-parchment-300/70 transition-colors hover:text-gold-100 font-(family-name:--font-ui)"
        >
          <span>←</span>
          <span>归返北凉舆图</span>
        </button>

        <h1
          className="mb-2 text-[36px] font-bold text-gold-300 tracking-[0.08em] font-(family-name:--font-display)"
          style={{ textShadow: '0 0 20px rgba(201,168,76,0.22)' }}
        >
          {location.name}
        </h1>

            <div className="mb-3 flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-gold-500/0 via-gold-500/35 to-gold-500/10" />
              <span className="text-[10px] tracking-[0.28em] text-gold-400/75 font-(family-name:--font-ui)">地卷目录</span>
              <div className="h-px flex-1 bg-gradient-to-l from-gold-500/0 via-gold-500/35 to-gold-500/10" />
            </div>

            {hasAvailable ? (
              <p className="text-[14px] leading-[1.7] text-parchment-200/76 font-(family-name:--font-body)">此地风波未歇，可拣一卷先看。</p>
            ) : (
              <p className="text-[14px] leading-[1.7] text-parchment-400/70 font-(family-name:--font-body)">此地卷册暂静，暂无可即刻落笔之事。</p>
            )}
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-gold-500/25 to-transparent" />
        </div>
      </div>

      {/* Scene List */}
      <div className="relative z-10 flex-1 overflow-y-auto px-6 pb-6 pt-3">
        {sceneEntries.length === 0 && (
          <div className="mx-auto mt-8 max-w-3xl rounded-xl border border-gold-500/20 bg-[linear-gradient(180deg,rgba(234,224,205,0.9),rgba(206,188,154,0.88))] px-8 py-10 text-center text-leather-700/78 shadow-[0_8px_24px_rgba(0,0,0,0.18)] font-(family-name:--font-body)">此地暂无卷宗待阅。</div>
        )}

        <div className="mx-auto flex max-w-4xl flex-col gap-4">
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
  const isLocked = status === 'locked';
  const isAvailable = status === 'available';
  const unlockHints = getUnlockHint(scene);

  const content = (
    <div
      className={`group relative w-full overflow-hidden border transition-all duration-200 ${
        config.clickable
          ? 'cursor-pointer hover:-translate-y-1'
          : 'cursor-default'
      }`}
      style={{
        borderRadius: isLocked ? '14px 10px 12px 8px' : '10px 14px 12px 9px',
        filter: isLocked ? 'grayscale(0.18) saturate(0.72) brightness(0.84)' : 'none',
        ...config.cardStyle,
      }}
      onClick={config.clickable ? onSelect : undefined}
      role={config.clickable ? 'button' : undefined}
    >
      <div className="absolute inset-0 pointer-events-none opacity-[0.24]" style={{ backgroundImage: 'radial-gradient(rgba(122,88,48,0.18) 0.8px, transparent 0.8px)', backgroundSize: '12px 12px' }} />
      <div className="absolute inset-0 pointer-events-none opacity-[0.16]" style={{ backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.24) 0%, transparent 32%, rgba(80,54,40,0.12) 100%)' }} />
      <div className="absolute left-4 right-4 top-[14px] h-px pointer-events-none" style={{ background: `linear-gradient(90deg, transparent, ${config.accentLine}, transparent)` }} />
      <div className="absolute bottom-[10px] left-6 right-6 h-px pointer-events-none bg-[linear-gradient(90deg,rgba(106,80,32,0.04),rgba(106,80,32,0.34),rgba(106,80,32,0.04))]" />
      <div className="absolute inset-y-5 left-4 w-px pointer-events-none bg-[linear-gradient(180deg,rgba(106,80,32,0.04),rgba(106,80,32,0.42),rgba(106,80,32,0.04))]" />
      <div className="absolute right-4 top-4 h-8 w-8 pointer-events-none rounded-full border border-crimson-700/15 bg-[radial-gradient(circle,rgba(139,26,26,0.16)_0%,rgba(139,26,26,0.05)_48%,transparent_72%)]" />
      <div className="absolute left-[22px] top-[18px] h-3 w-12 pointer-events-none bg-[linear-gradient(90deg,rgba(139,26,26,0.22),rgba(139,26,26,0.02))]" />
      <div className="relative flex items-start justify-between gap-4 px-7 py-6">
        <div className="flex-1 min-w-0">
          <div className="mb-3 flex items-center gap-2">
            {scene ? (
              <>
                <span className={`text-[10px] tracking-[0.22em] uppercase font-(family-name:--font-ui) ${isLocked ? 'text-parchment-500/58' : 'text-leather-700/68'}`}>
                  {SCENE_TYPE_LABELS[scene.type] || scene.type}
                </span>
                <span className={isLocked ? 'text-parchment-500/30' : 'text-gold-600/35'}>·</span>
                <span className={`text-[10px] tracking-[0.12em] font-(family-name:--font-ui) ${isLocked ? 'text-parchment-500/50' : 'text-leather-700/56'}`}>历时 {scene.duration} 回合</span>
              </>
            ) : (
              <span className="text-[10px] tracking-[0.16em] text-parchment-500/60 font-(family-name:--font-ui)">卷宗未明</span>
            )}
          </div>

          <div
            className={`mb-3 text-[22px] leading-[1.2] tracking-[0.05em] font-bold font-(family-name:--font-display) ${config.titleColor}`}
            style={{ textShadow: isLocked ? 'none' : '0 1px 0 rgba(245,240,232,0.24)' }}
          >
            {scene?.name ?? sceneId}
          </div>

          {scene && (
            <p className={`max-w-[42rem] text-[14px] leading-[1.76] line-clamp-2 font-(family-name:--font-body) ${isLocked ? 'text-parchment-400/60' : 'text-leather-800/80'}`}>
              {scene.description}
            </p>
          )}

          {isLocked && unlockHints.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {unlockHints.map((hint) => (
                <span
                  key={hint}
                  className="border border-leather-500/55 bg-leather-950/26 px-2.5 py-1 text-[10px] leading-[1.45] tracking-[0.08em] text-parchment-400/72 font-(family-name:--font-ui)"
                  style={{ borderRadius: '8px 4px 7px 3px' }}
                >
                  {hint}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0 flex min-w-[144px] flex-col items-end gap-3 pt-1">
          <span
            className={`border px-3 py-1 text-[10px] tracking-[0.18em] font-(family-name:--font-ui) ${config.badgeClassName}`}
            style={{ borderRadius: '10px 4px 10px 4px' }}
          >
            {config.label}
          </span>

          {status === 'available' && (
            <span className="text-[12px] tracking-[0.14em] text-crimson-700/78 font-(family-name:--font-display)">提卷入局 →</span>
          )}

          {status === 'locked' && (
            <span className="text-[12px] tracking-[0.18em] text-parchment-500/58 font-(family-name:--font-ui)">封卷待启</span>
          )}
        </div>
      </div>
    </div>
  );

  return content;
}
