import React from 'react';
import { useGameStore } from '../../../stores/gameStore';
import { useUIStore } from '../../../stores/uiStore';
import { gameContentProvider } from '../../../app/bootstrap';
import { Button } from './Button';

export function ResourceBar() {
  const gold = useGameStore(s => s.gold());
  const reputation = useGameStore(s => s.reputation());
  const executionCountdown = useGameStore(s => s.executionCountdown());
  const goldenDice = useGameStore(s => s.goldenDice());
  const thinkCharges = useGameStore(s => s.thinkCharges());
  const currentDay = useGameStore(s => s.currentDay());
  const beginSettlement = useGameStore(s => s.beginSettlement);
  const currentScreen = useUIStore(s => s.currentScreen);
  const setScreen = useUIStore(s => s.setScreen);
  const selectedMapId = useUIStore(s => s.selectedMapId);

  const isWorldMap = currentScreen === 'world_map';
  const currentMap = selectedMapId
    ? gameContentProvider.getMap(selectedMapId) ?? gameContentProvider.getFirstMap()
    : gameContentProvider.getFirstMap();

  const handleNextDay = () => {
    beginSettlement();
    setScreen('settlement');
  };

  const items = [
    {
      key: 'day',
      label: '日数',
      value: `第 ${currentDay} 天`,
    },
    {
      key: 'gold',
      label: '金',
      value: gold,
    },
    {
      key: 'rep',
      label: '声望',
      value: reputation,
    },
    {
      key: 'exec',
      label: '行刑',
      value: `-${executionCountdown}`,
    },
    {
      key: 'dice',
      label: '金骰',
      value: goldenDice,
    },
    {
      key: 'think',
      label: '筹谋',
      value: thinkCharges,
    },
  ];

  return (
    <header
      className="relative h-14 shrink-0 flex items-center justify-between gap-4 px-5"
      style={{
        backgroundImage: 'url(/resource-strip-bg.png)',
        backgroundSize: '100% 100%',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div
        className="absolute inset-x-4 top-[10px] h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(212,181,108,0.72), transparent)' }}
      />
      <div
        className="absolute inset-x-4 bottom-[10px] h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(120,86,33,0.48), transparent)' }}
      />

      <div className="flex min-w-0 items-center gap-4">
        {isWorldMap && currentMap && (
          <>
            <div className="min-w-0 pr-1">
              <div className="flex items-baseline gap-2 min-w-0">
                <span
                  className="shrink-0 text-[10px] leading-[1.4] tracking-[0.2em] font-(family-name:--font-ui)"
                  style={{ color: 'rgba(231,205,141,0.86)' }}
                >
                  舆图
                </span>
                <span
                  className="truncate text-[18px] leading-[1.2] tracking-[0.04em] font-(family-name:--font-display)"
                  style={{ color: 'rgba(247,230,191,0.96)', textShadow: '0 1px 2px rgba(34,19,7,0.45)' }}
                >
                  {currentMap.name}
                </span>
              </div>
            </div>
            <div className="h-8 w-px" style={{ background: 'rgba(205,168,92,0.7)' }} />
          </>
        )}

        <div className="flex min-w-0 items-center gap-3 md:gap-4">
          {items.map((item, index) => (
            <React.Fragment key={item.key}>
              <div className="flex items-baseline gap-2">
                <span
                  className="text-[10px] leading-[1.4] tracking-[0.18em] uppercase font-(family-name:--font-ui)"
                  style={{ color: 'rgba(226,198,133,0.86)' }}
                >
                  {item.label}
                </span>
                <span
                  className={`text-[14px] leading-[1.2] font-bold font-(family-name:--font-mono) ${item.key === 'exec' && executionCountdown <= 3 ? 'animate-pulse' : ''}`}
                  style={{
                    color:
                      item.key === 'rep'
                        ? 'rgba(188,214,211,0.92)'
                        : item.key === 'exec'
                        ? executionCountdown <= 3
                          ? 'rgba(244,161,142,0.96)'
                          : 'rgba(215,136,119,0.88)'
                        : 'rgba(247,232,191,0.98)',
                  }}
                >
                  {item.value}
                </span>
              </div>
              {index < items.length - 1 && <div className="h-5 w-px" style={{ background: 'rgba(205,168,92,0.52)' }} />}
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
