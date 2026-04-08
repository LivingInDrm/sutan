import React from 'react';
import { useGameStore } from '../../../stores/gameStore';
import { useUIStore } from '../../../stores/uiStore';
import { dataLoader } from '../../../data/loader';
import { Button } from './Button';

export function ResourceBar() {
  const gold = useGameStore(s => s.gold);
  const reputation = useGameStore(s => s.reputation);
  const executionCountdown = useGameStore(s => s.executionCountdown);
  const goldenDice = useGameStore(s => s.goldenDice);
  const thinkCharges = useGameStore(s => s.thinkCharges);
  const currentDay = useGameStore(s => s.currentDay);
  const beginSettlement = useGameStore(s => s.beginSettlement);
  const currentScreen = useUIStore(s => s.currentScreen);
  const setScreen = useUIStore(s => s.setScreen);
  const selectedMapId = useUIStore(s => s.selectedMapId);

  const isWorldMap = currentScreen === 'world_map';
  const currentMap = selectedMapId
    ? dataLoader.getMap(selectedMapId) ?? dataLoader.getFirstMap()
    : dataLoader.getFirstMap();

  const handleNextDay = () => {
    beginSettlement();
    setScreen('settlement');
  };

  const items = [
    {
      key: 'day',
      label: '日数',
      value: `第 ${currentDay} 天`,
      tone: 'text-gold-300',
      valueClass: 'text-gold-100',
    },
    {
      key: 'gold',
      label: '金',
      value: gold,
      tone: 'text-gold-400',
      valueClass: 'text-gold-300',
    },
    {
      key: 'rep',
      label: '声望',
      value: reputation,
      tone: 'text-cerulean-300',
      valueClass: 'text-cerulean-300',
    },
    {
      key: 'exec',
      label: '行刑',
      value: `-${executionCountdown}`,
      tone: 'text-crimson-300',
      valueClass: executionCountdown <= 3 ? 'text-crimson-300 animate-pulse' : 'text-crimson-500',
    },
    {
      key: 'dice',
      label: '金骰',
      value: goldenDice,
      tone: 'text-gold-400',
      valueClass: 'text-gold-300',
    },
    {
      key: 'think',
      label: '筹谋',
      value: thinkCharges,
      tone: 'text-cerulean-300',
      valueClass: 'text-cerulean-300',
    },
  ];

  return (
    <header
      className="relative h-12 shrink-0 border-b flex items-center justify-between gap-4 px-4"
      style={{
        background: 'rgba(26,26,46,0.90)',
        borderBottomColor: 'rgba(138,109,43,0.40)',
      }}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent pointer-events-none" />

      <div className="flex min-w-0 items-center gap-4">
        {isWorldMap && currentMap && (
          <>
            <div className="min-w-0 pr-1">
              <div className="text-[10px] leading-[1.4] tracking-[0.22em] text-gold-500/80 font-(family-name:--font-ui)">
                当前地图
              </div>
              <div className="flex items-baseline gap-2 min-w-0">
                <span className="truncate text-[18px] leading-[1.2] tracking-[0.04em] text-gold-300 font-(family-name:--font-display)">
                  {currentMap.name}
                </span>
                <span className="hidden md:block truncate text-[11px] leading-[1.5] tracking-[0.06em] text-parchment-400/75 font-(family-name:--font-body)">
                  {currentMap.description}
                </span>
              </div>
            </div>
            <div className="h-7 w-px bg-gold-500/35" />
          </>
        )}

        <div className="flex min-w-0 items-center gap-3 md:gap-4">
          {items.map((item, index) => (
            <React.Fragment key={item.key}>
              <div className="flex items-baseline gap-2">
                <span className={`text-[10px] leading-[1.4] tracking-[0.18em] uppercase font-(family-name:--font-ui) ${item.tone}`}>
                  {item.label}
                </span>
                <span className={`text-[14px] leading-[1.2] font-bold font-(family-name:--font-mono) ${item.valueClass}`}>
                  {item.value}
                </span>
              </div>
              {index < items.length - 1 && <div className="h-5 w-px bg-gold-500/25" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {isWorldMap && (
        <div className="shrink-0">
          <Button
            variant="primary"
            size="sm"
            glow
            onClick={handleNextDay}
            className="min-w-[112px] font-(family-name:--font-display) tracking-[0.08em] text-[15px]"
          >
            结束当日
          </Button>
        </div>
      )}
    </header>
  );
}
