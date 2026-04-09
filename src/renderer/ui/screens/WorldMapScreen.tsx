import React, { useState } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { useGameStore } from '../../stores/gameStore';
import { SceneStatus } from '../../core/types/enums';
import { dataLoader } from '../../data/loader';
import type { MapConfig, LocationConfig } from '../../core/types';

const mapConfig: MapConfig = dataLoader.getMap('map_001_beiliang') ?? dataLoader.getFirstMap()!;

const AGED_GOLD = '#cda85c';
const LIGHT_GOLD = 'rgba(244,225,178,0.96)';
const PALE_INK = 'rgba(70,48,24,0.9)';

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
        className="absolute bottom-5 left-5 z-20 pointer-events-none min-h-[176px] w-[min(296px,calc(100%-40px))] px-6 pt-5 pb-6"
        style={{
          backgroundImage: 'url(/map-info-sheet.png)',
          backgroundSize: '100% 100%',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div
          className="mb-2 -mt-1 flex h-8 w-[92px] items-center justify-center text-[10px] leading-[1.2] tracking-[0.2em] font-(family-name:--font-ui)"
          style={{
            backgroundImage: 'url(/map-info-title-tag.png)',
            backgroundSize: '100% 100%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            color: LIGHT_GOLD,
            textShadow: '0 1px 2px rgba(31,17,6,0.35)',
            transform: 'translateX(8px)',
          }}
        >
          舆图
        </div>
        <div
          className="text-[21px] leading-[1.12] tracking-[0.05em] font-(family-name:--font-display)"
          style={{ color: AGED_GOLD }}
        >
          {mapConfig.name}
        </div>
        <div
          className="mt-1.5 max-w-[228px] text-[12px] leading-[1.55] tracking-[0.01em] font-(family-name:--font-body)"
          style={{ color: PALE_INK }}
        >
          {mapConfig.description}
        </div>
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
        className="min-h-[40px] min-w-[136px] whitespace-nowrap px-6 py-2.5 text-center text-[15px] leading-[1.15] tracking-[0.08em]
                    font-(family-name:--font-display) transition-all"
        style={{
          backgroundImage: 'url(/map-nameplate.png)',
          backgroundSize: '100% 100%',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          color:
            status === 'available'
              ? 'rgba(247,232,191,0.98)'
              : status === 'all_done'
              ? 'rgba(198,213,204,0.9)'
              : 'rgba(224,204,177,0.82)',
          textShadow: '0 1px 2px rgba(26,13,5,0.42)',
          filter:
            status === 'all_done'
              ? 'saturate(0.78) brightness(1.02)'
              : status === 'none'
              ? 'brightness(0.92)'
              : 'brightness(1.08)',
        }}
      >
        {location.name}
      </div>
    </button>
  );
}
