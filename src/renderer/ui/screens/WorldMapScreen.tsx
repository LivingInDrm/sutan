import React, { useState } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { useGameStore } from '../../stores/gameStore';
import { SceneStatus } from '../../core/types/enums';
import { dataLoader } from '../../data/loader';
import type { MapConfig, LocationConfig } from '../../core/types';

const mapConfig: MapConfig = dataLoader.getMap('map_001_beiliang') ?? dataLoader.getFirstMap()!;

const AGED_GOLD = '#b8860b';

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
  const navigateToLocation = useUIStore(s => s.navigateToLocation);

  const [bgError, setBgError] = useState(false);

  const locations: LocationConfig[] = mapConfig.locations;

  return (
    <div className="h-full w-full relative overflow-hidden bg-leather-900">
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
          className="text-[180px] font-bold text-white/3 select-none font-(family-name:--font-display)"
          style={{ letterSpacing: '0.3em' }}
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
      {/* Map title bottom-left */}
      <div
        className="absolute bottom-6 left-6 z-20 pointer-events-none max-w-[420px] px-5 py-4"
        style={{
          background: [
            'radial-gradient(circle at 14% 18%, rgba(255,250,244,0.34) 0, rgba(255,250,244,0.08) 14%, transparent 30%)',
            'radial-gradient(circle at 86% 72%, rgba(120,86,45,0.12) 0, transparent 32%)',
            'linear-gradient(180deg, rgba(245,240,232,0.96), rgba(232,222,205,0.92))',
          ].join(', '),
          border: '1px solid rgba(184,134,11,0.28)',
          clipPath: 'polygon(2% 3%, 97% 0%, 100% 14%, 98% 100%, 4% 98%, 0% 84%)',
          boxShadow: '0 10px 20px rgba(26,15,10,0.18), inset 0 1px 0 rgba(255,252,246,0.65), inset 0 -12px 18px rgba(120,86,45,0.06)',
          filter: 'drop-shadow(0 3px 6px rgba(60,45,30,0.18))',
        }}
      >
        <div
          className="mb-1 text-[10px] leading-[1.4] tracking-[0.24em] font-(family-name:--font-ui)"
          style={{ color: 'rgba(90,69,38,0.72)' }}
        >
          舆图
        </div>
        <div
          className="text-[24px] leading-[1.15] tracking-[0.06em] font-(family-name:--font-display)"
          style={{ color: AGED_GOLD, textShadow: '0 1px 0 rgba(255,248,235,0.45)' }}
        >
          {mapConfig.name}
        </div>
        <div
          className="mt-1 text-[13px] leading-[1.7] tracking-[0.01em] font-(family-name:--font-body)"
          style={{ color: 'rgba(44,44,44,0.8)' }}
        >
          {mapConfig.description}
        </div>
        <div
          className="absolute inset-x-4 bottom-1 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(184,134,11,0.22), transparent)' }}
        />
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
    ? 'drop-shadow-[0_0_10px_rgba(184,134,11,0.34)]'
    : status === 'all_done'
    ? 'drop-shadow-[0_0_6px_rgba(90,112,106,0.28)]'
    : 'drop-shadow-[0_0_4px_rgba(44,44,44,0.24)]';

  return (
    <button
      onClick={onClick}
      disabled={!isClickable}
      className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 transform flex-col items-center gap-1.5
                 transition-all duration-200 group hover:-translate-y-[calc(50%+2px)] hover:scale-105 hover:brightness-105"
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
            className="flex h-28 w-28 items-center justify-center border"
            style={{
              clipPath: 'polygon(50% 0%, 78% 7%, 96% 26%, 100% 55%, 88% 84%, 59% 100%, 28% 95%, 8% 74%, 0% 44%, 12% 16%)',
              borderColor:
                status === 'available'
                  ? 'rgba(184,134,11,0.62)'
                  : status === 'all_done'
                  ? 'rgba(101,123,117,0.48)'
                  : 'rgba(92,79,64,0.42)',
              background:
                status === 'available'
                  ? 'radial-gradient(circle at 35% 30%, rgba(255,245,220,0.15), transparent 38%), linear-gradient(180deg, rgba(73,53,34,0.95), rgba(44,34,24,0.9))'
                  : status === 'all_done'
                  ? 'radial-gradient(circle at 35% 30%, rgba(184,205,195,0.12), transparent 38%), linear-gradient(180deg, rgba(57,62,58,0.92), rgba(37,43,42,0.88))'
                  : 'radial-gradient(circle at 35% 30%, rgba(120,110,98,0.1), transparent 36%), linear-gradient(180deg, rgba(54,43,34,0.9), rgba(33,28,24,0.88))',
              boxShadow: 'inset 0 1px 0 rgba(255,245,230,0.12), inset 0 -10px 14px rgba(0,0,0,0.16)',
            }}
          >
            <span
              className="text-lg"
              style={{
                color:
                  status === 'available'
                    ? 'rgba(222,196,138,0.96)'
                    : status === 'all_done'
                    ? 'rgba(148,171,162,0.88)'
                    : 'rgba(188,176,160,0.74)',
              }}
            >
              {status === 'available' ? '印' : status === 'all_done' ? '记' : '迹'}
            </span>
          </div>
        )}

        {/* Available indicator ring */}
        {status === 'available' && (
          <>
            <div
              className="absolute inset-[8%] animate-pulse"
              style={{
                borderRadius: '46% 54% 52% 48% / 44% 48% 52% 56%',
                border: '1px solid rgba(184,134,11,0.34)',
                boxShadow: '0 0 18px rgba(184,134,11,0.18), inset 0 0 10px rgba(255,236,188,0.05)',
              }}
            />
            <div
              className="absolute inset-[16%] animate-pulse"
              style={{
                animationDelay: '0.4s',
                borderRadius: '53% 47% 45% 55% / 48% 44% 56% 52%',
                background: 'radial-gradient(circle, rgba(184,134,11,0.12) 0%, rgba(184,134,11,0.04) 28%, transparent 62%)',
                filter: 'blur(6px)',
              }}
            />
          </>
        )}
      </div>

      {/* Name label */}
      <div
        className="min-h-6 whitespace-nowrap rounded-sm px-3 py-1 text-[13px] leading-[1.2] tracking-[0.08em]
                    font-(family-name:--font-display) transition-all"
        style={{
          color:
            status === 'available'
              ? 'rgba(243,228,190,0.96)'
              : status === 'all_done'
              ? 'rgba(162,180,172,0.84)'
              : 'rgba(189,174,155,0.72)',
          border:
            status === 'available'
              ? '1px solid rgba(184,134,11,0.42)'
              : status === 'all_done'
              ? '1px solid rgba(95,120,113,0.34)'
              : '1px solid rgba(107,94,78,0.28)',
          background:
            status === 'available'
              ? 'linear-gradient(180deg, rgba(70,50,32,0.9), rgba(48,35,24,0.88))'
              : status === 'all_done'
              ? 'linear-gradient(180deg, rgba(67,66,58,0.86), rgba(47,52,50,0.84))'
              : 'linear-gradient(180deg, rgba(49,38,30,0.84), rgba(36,30,24,0.82))',
          boxShadow:
            status === 'available'
              ? '0 2px 8px rgba(0,0,0,0.22), 0 0 10px rgba(184,134,11,0.14), inset 0 1px 0 rgba(255,240,204,0.08)'
              : status === 'all_done'
              ? '0 2px 6px rgba(0,0,0,0.18), inset 0 1px 0 rgba(188,205,196,0.05)'
              : '0 2px 5px rgba(0,0,0,0.16)',
          textShadow: status === 'available' ? '0 0 8px rgba(255,236,188,0.18)' : 'none',
          filter: status === 'all_done' ? 'saturate(0.72) brightness(0.9)' : status === 'none' ? 'brightness(0.78)' : 'none',
        }}
      >
        {location.name}
      </div>
    </button>
  );
}
