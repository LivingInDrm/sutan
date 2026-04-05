import React, { useState } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { useGameStore } from '../../stores/gameStore';
import { SceneStatus } from '../../core/types/enums';
import mapConfig from '../../data/configs/maps/map_001_beiliang.json';

interface LocationConfig {
  location_id: string;
  name: string;
  icon_image: string;
  position: { x: number; y: number };
  scene_ids: string[];
  unlock_conditions: Record<string, unknown>;
}

function getLocationStatus(
  location: LocationConfig,
  game: ReturnType<typeof useGameStore.getState>['game'],
): 'available' | 'all_done' | 'none' {
  if (!game) return 'none';
  let hasAvailable = false;
  let hasAny = false;
  for (const sceneId of location.scene_ids) {
    const state = game.sceneManager.getSceneState(sceneId);
    if (!state) continue;
    hasAny = true;
    if (state.status === SceneStatus.Available) {
      hasAvailable = true;
    }
  }
  if (!hasAny) return 'none';
  if (hasAvailable) return 'available';
  return 'all_done';
}

export function WorldMapScreen() {
  const game = useGameStore(s => s.game);
  const currentDay = useGameStore(s => s.currentDay);
  const executionCountdown = useGameStore(s => s.executionCountdown);
  const gold = useGameStore(s => s.gold);
  const reputation = useGameStore(s => s.reputation);
  const navigateToLocation = useUIStore(s => s.navigateToLocation);
  const beginSettlement = useGameStore(s => s.beginSettlement);
  const setScreen = useUIStore(s => s.setScreen);

  const [bgError, setBgError] = useState(false);

  const handleNextDay = () => {
    beginSettlement();
    setScreen('settlement');
  };

  const locations: LocationConfig[] = mapConfig.locations as LocationConfig[];

  return (
    <div className="h-screen w-screen relative overflow-hidden bg-gray-950">
      {/* Map Background */}
      {!bgError ? (
        <img
          src={mapConfig.background_image}
          alt={mapConfig.name}
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setBgError(true)}
        />
      ) : (
        /* Fallback: 北凉风格水墨渐变 */
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse at 30% 60%, rgba(101,67,33,0.4) 0%, transparent 50%),
              radial-gradient(ellipse at 70% 30%, rgba(70,90,70,0.3) 0%, transparent 50%),
              linear-gradient(160deg, #0a0f0a 0%, #1a1f12 30%, #111810 60%, #0d1209 100%)
            `,
          }}
        />
      )}


      {/* Map name watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span
          className="text-[180px] font-bold text-white/3 select-none"
          style={{ fontFamily: 'serif', letterSpacing: '0.3em' }}
        >
          北凉
        </span>
      </div>

      {/* Location Icons */}
      {locations.map((loc) => {
        const status = getLocationStatus(loc, game);
        return (
          <LocationIcon
            key={loc.location_id}
            location={loc}
            status={status}
            onClick={() => navigateToLocation(loc.location_id)}
          />
        );
      })}

      {/* Top HUD */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-3
                      bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
        <div className="flex items-center gap-5">
          <div className="text-center">
            <div className="text-xs text-amber-400/60 tracking-widest">第</div>
            <div className="text-2xl font-bold text-amber-300" style={{ fontFamily: 'serif' }}>
              {currentDay}
            </div>
            <div className="text-xs text-amber-400/60 tracking-widest">天</div>
          </div>
          <div className="h-8 w-px bg-amber-800/40" />
          <div className="text-center">
            <div className="text-xs text-red-400/60 tracking-widest">行刑</div>
            <div className={`text-2xl font-bold ${executionCountdown <= 3 ? 'text-red-400 animate-pulse' : 'text-amber-300'}`}
                 style={{ fontFamily: 'serif' }}>
              -{executionCountdown}
            </div>
            <div className="text-xs text-red-400/60 tracking-widest">天</div>
          </div>
          <div className="h-8 w-px bg-amber-800/40" />
          <div className="flex items-center gap-3">
            <span className="text-amber-200 text-sm">
              <span className="text-amber-500 mr-1">金</span>{gold}
            </span>
            <span className="text-blue-200 text-sm">
              <span className="text-blue-400 mr-1">望</span>{reputation}
            </span>
          </div>
        </div>

        <div className="pointer-events-auto">
          <button
            onClick={handleNextDay}
            className="px-5 py-1.5 bg-amber-900/50 border border-amber-600/40 rounded
                       text-amber-200 text-sm hover:bg-amber-800/60 transition-all font-bold tracking-wider"
          >
            结束当日
          </button>
        </div>
      </div>

      {/* Map title bottom-left */}
      <div className="absolute bottom-6 left-6 z-20 pointer-events-none">
        <div className="text-xs text-amber-500/40 tracking-widest mb-1">当前地图</div>
        <div className="text-lg font-bold text-amber-400/70" style={{ fontFamily: 'serif' }}>
          {mapConfig.name}
        </div>
        <div className="text-xs text-amber-300/40 mt-0.5">{mapConfig.description}</div>
      </div>
    </div>
  );
}

function LocationIcon({
  location,
  status,
  onClick,
}: {
  location: LocationConfig;
  status: 'available' | 'all_done' | 'none';
  onClick: () => void;
}) {
  const [imgError, setImgError] = useState(false);

  const isClickable = true; // always clickable to view scene list

  const glowClass = status === 'available'
    ? 'drop-shadow-[0_0_12px_rgba(255,200,50,0.8)]'
    : status === 'all_done'
    ? 'drop-shadow-[0_0_6px_rgba(100,200,100,0.4)]'
    : '';

  const pulseClass = status === 'available' ? 'animate-pulse' : '';

  return (
    <button
      onClick={onClick}
      disabled={!isClickable}
      className="absolute z-10 flex flex-col items-center gap-1.5 group transform -translate-x-1/2 -translate-y-1/2
                 hover:scale-110 transition-transform duration-200"
      style={{
        left: `${location.position.x * 100}%`,
        top: `${location.position.y * 100}%`,
      }}
    >
      {/* Icon */}
      <div className={`relative ${glowClass}`}>
        {!imgError ? (
          <img
            src={location.icon_image}
            alt={location.name}
            className="w-28 h-28 object-contain"
            onError={() => setImgError(true)}
          />
        ) : (
          /* Fallback icon */
          <div
            className={`w-28 h-28 rounded-full border-2 flex items-center justify-center
                        ${status === 'available'
                          ? 'border-amber-400 bg-amber-900/60'
                          : status === 'all_done'
                          ? 'border-gray-500 bg-gray-800/60'
                          : 'border-gray-600 bg-gray-900/60'
                        }`}
          >
            <span className="text-lg">
              {status === 'available' ? '⬡' : status === 'all_done' ? '✓' : '○'}
            </span>
          </div>
        )}

        {/* Available indicator ring */}
        {status === 'available' && (
          <div className={`absolute inset-0 rounded-full border-2 border-amber-400/50 ${pulseClass}`} />
        )}
      </div>

      {/* Name label */}
      <div
        className={`px-2 py-0.5 rounded text-xs font-bold tracking-wide whitespace-nowrap
                    backdrop-blur-sm transition-all
                    ${status === 'available'
                      ? 'bg-black/60 text-amber-300 border border-amber-500/30 group-hover:border-amber-400/60'
                      : 'bg-black/50 text-gray-400 border border-gray-700/30'
                    }`}
        style={{ fontFamily: 'serif' }}
      >
        {location.name}
      </div>
    </button>
  );
}
