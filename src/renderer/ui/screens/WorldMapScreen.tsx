import React, { useState } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { useGameStore } from '../../stores/gameStore';
import { SceneStatus } from '../../core/types/enums';
import { dataLoader } from '../../data/loader';
import type { MapConfig, LocationConfig } from '../../core/types';

const mapConfig: MapConfig = dataLoader.getMap('map_001_beiliang') ?? dataLoader.getFirstMap()!;

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
          className="text-[180px] font-bold text-white/3 select-none font-[family-name:var(--font-display)]"
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
        className="absolute bottom-6 left-6 z-20 pointer-events-none max-w-[420px] rounded-lg border px-4 py-3"
        style={{
          background: 'linear-gradient(180deg, rgba(26,15,10,0.78), rgba(26,26,46,0.52))',
          borderColor: 'rgba(138,109,43,0.32)',
          boxShadow: '0 10px 24px rgba(0,0,0,0.32)',
        }}
      >
        <div className="mb-1 text-[10px] leading-[1.4] tracking-[0.24em] text-gold-500/72 font-[family-name:var(--font-ui)]">当前地图</div>
        <div className="text-[24px] leading-[1.15] tracking-[0.06em] text-gold-300 font-[family-name:var(--font-display)]">
          {mapConfig.name}
        </div>
        <div className="mt-1 text-[13px] leading-[1.7] tracking-[0.01em] text-parchment-300/78 font-[family-name:var(--font-body)]">
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
    ? 'drop-shadow-[0_0_12px_rgba(201,168,76,0.55)]'
    : status === 'all_done'
    ? 'drop-shadow-[0_0_6px_rgba(90,122,58,0.35)]'
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
                          ? 'border-gold-300 bg-gold-600/40'
                          : status === 'all_done'
                          ? 'border-bamboo-300/50 bg-bamboo-900/45'
                          : 'border-parchment-500/30 bg-ink-900/55'
                        }`}
          >
            <span className={`text-lg ${status === 'available' ? 'text-gold-100' : status === 'all_done' ? 'text-bamboo-300' : 'text-parchment-400'}`}>
              {status === 'available' ? '⬡' : status === 'all_done' ? '✓' : '○'}
            </span>
          </div>
        )}

        {/* Available indicator ring */}
        {status === 'available' && (
          <div className={`absolute inset-0 rounded-full border-2 border-gold-300/55 ${pulseClass}`} />
        )}
      </div>

      {/* Name label */}
      <div
        className={`min-h-6 px-3 py-1 rounded-[4px] text-[13px] leading-[1.2] tracking-[0.04em] whitespace-nowrap
                    transition-all font-[family-name:var(--font-display)]
                    ${status === 'available'
                      ? 'text-gold-200 border border-gold-500/40 group-hover:border-gold-300/65'
                      : status === 'all_done'
                      ? 'text-bamboo-300 border border-bamboo-500/30'
                      : 'text-parchment-400 border border-parchment-500/20'
                    }`}
        style={{
          background: status === 'available'
            ? 'linear-gradient(180deg, rgba(26,15,10,0.86), rgba(26,26,46,0.74))'
            : status === 'all_done'
            ? 'linear-gradient(180deg, rgba(26,15,10,0.72), rgba(45,85,85,0.40))'
            : 'linear-gradient(180deg, rgba(26,15,10,0.70), rgba(26,26,46,0.52))',
        }}
      >
        {location.name}
      </div>
    </button>
  );
}
