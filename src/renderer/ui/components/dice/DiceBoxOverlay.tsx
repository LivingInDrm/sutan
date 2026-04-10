import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import DiceBox from '@3d-dice/dice-box';
import { DICE_CONFIG } from '../../../core/types/enums';
import { RandomManager } from '../../../lib/random';

interface DiceBoxOverlayProps {
  poolSize: number;
  onComplete: (result: { dice: number[]; explodedDice: number[] }) => void;
  onCancel?: () => void;
  fallbackSeed?: string;
  visible: boolean;
  resultSummaryText?: string | null;
  resultLabelText?: string | null;
  onPhaseChange?: (phase: DicePhase) => void;
}

type DicePhase = 'ready' | 'rolling' | 'finished';

type DiceBoxConstructor = new (selectorOrConfig: string | Record<string, unknown>, config?: Record<string, unknown>) => DiceBoxInstance;

type DiceBoxInstance = {
  init: () => Promise<void>;
  roll: (notation: string, options?: Record<string, unknown>) => Promise<unknown>;
  updateConfig?: (config: Record<string, unknown>) => void;
  hide?: () => void;
  show?: () => void;
  onRollComplete?: (results?: unknown) => void;
};

const EXPLODED_DELAY_MS = 450;
const INIT_TIMEOUT_MS = 5000;
const MAX_OVERLAY_LIFETIME_MS = 20000;

function createFallbackRoll(poolSize: number, seed?: string): { dice: number[]; explodedDice: number[] } {
  const rng = new RandomManager(seed);
  const diceCount = Math.min(poolSize, DICE_CONFIG.MAX_POOL);
  const dice: number[] = [];

  for (let index = 0; index < diceCount; index += 1) {
    dice.push(rng.rollD6());
  }

  const explodedDice: number[] = [];
  let explosionsToProcess = dice.filter((value) => value === DICE_CONFIG.EXPLODE_ON).length;
  let totalExplosions = 0;

  while (explosionsToProcess > 0 && totalExplosions < DICE_CONFIG.MAX_EXPLODE) {
    const batch = Math.min(explosionsToProcess, DICE_CONFIG.MAX_EXPLODE - totalExplosions);
    let newExplosions = 0;

    for (let index = 0; index < batch; index += 1) {
      const roll = rng.rollD6();
      explodedDice.push(roll);
      totalExplosions += 1;
      if (roll === DICE_CONFIG.EXPLODE_ON) {
        newExplosions += 1;
      }
    }

    explosionsToProcess = newExplosions;
  }

  return { dice, explodedDice };
}

function extractRollValues(results: unknown): number[] {
  if (!Array.isArray(results)) {
    return [];
  }

  const values: number[] = [];

  for (const group of results) {
    if (group && typeof group === 'object' && 'rolls' in group) {
      const rolls = (group as { rolls?: unknown[] }).rolls;
      if (Array.isArray(rolls)) {
        for (const roll of rolls) {
          if (roll && typeof roll === 'object' && 'value' in roll) {
            const value = Number((roll as { value?: unknown }).value);
            if (Number.isFinite(value)) {
              values.push(value);
            }
          }
        }
      }
    }
  }

  return values;
}

export function DiceBoxOverlay({
  poolSize,
  onComplete,
  onCancel,
  fallbackSeed,
  visible,
  resultSummaryText,
  resultLabelText,
  onPhaseChange,
}: DiceBoxOverlayProps) {
  const reactId = useId();
  const containerId = useMemo(() => `dice-box-canvas-${reactId.replace(/:/g, '-')}`, [reactId]);
  const diceBoxRef = useRef<DiceBoxInstance | null>(null);
  const initializedRef = useRef(false);
  const initPromiseRef = useRef<Promise<void> | null>(null);
  const startedVisibleRef = useRef(false);
  const rollSequenceRef = useRef(0);
  const timeoutRef = useRef<number | null>(null);
  const initTimeoutRef = useRef<number | null>(null);
  const hardTimeoutRef = useRef<number | null>(null);
  const [phase, setPhase] = useState<DicePhase>('ready');
  const [displayResult, setDisplayResult] = useState<{ dice: number[]; explodedDice: number[] } | null>(null);
  const collectedDiceRef = useRef<number[]>([]);
  const collectedExplodedDiceRef = useRef<number[]>([]);
  const explodedCountRef = useRef(0);
  const onCompleteRef = useRef(onComplete);
  const onCancelRef = useRef(onCancel);
  const onPhaseChangeRef = useRef(onPhaseChange);

  onCompleteRef.current = onComplete;
  onCancelRef.current = onCancel;
  onPhaseChangeRef.current = onPhaseChange;

  useEffect(() => {
    onPhaseChangeRef.current?.(phase);
  }, [phase]);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (initTimeoutRef.current !== null) {
      window.clearTimeout(initTimeoutRef.current);
      initTimeoutRef.current = null;
    }
    if (hardTimeoutRef.current !== null) {
      window.clearTimeout(hardTimeoutRef.current);
      hardTimeoutRef.current = null;
    }
  }, []);

  const safeHide = useCallback(() => {
    diceBoxRef.current?.hide?.();
  }, []);

  const safeShow = useCallback(() => {
    diceBoxRef.current?.show?.();
  }, []);

  const finishOverlay = useCallback(() => {
    clearTimers();
    setDisplayResult({
      dice: [...collectedDiceRef.current],
      explodedDice: [...collectedExplodedDiceRef.current],
    });
    setPhase('finished');
    console.log('[DiceBoxOverlay] finish', {
      dice: collectedDiceRef.current,
      explodedDice: collectedExplodedDiceRef.current,
    });
  }, [clearTimers]);

  const playRollSequence = useCallback(async () => {
    collectedDiceRef.current = [];
    collectedExplodedDiceRef.current = [];
    explodedCountRef.current = 0;
    setPhase('rolling');
    console.log('[DiceBoxOverlay] rolling', { poolSize });

    if (!poolSize) {
      finishOverlay();
      return;
    }

    const sequenceId = ++rollSequenceRef.current;

    const runExplodedPhase = async (nextPoolSize: number) => {
      if (!nextPoolSize || explodedCountRef.current >= DICE_CONFIG.MAX_EXPLODE) {
        if (rollSequenceRef.current === sequenceId) {
          finishOverlay();
        }
        return;
      }

      timeoutRef.current = window.setTimeout(() => {
        const activeDiceBox = diceBoxRef.current;
        if (rollSequenceRef.current !== sequenceId || !activeDiceBox) {
          return;
        }

        activeDiceBox.onRollComplete = (results) => {
          if (rollSequenceRef.current !== sequenceId) {
            return;
          }
          const rolledValues = extractRollValues(results);
          console.log('[DiceBoxOverlay] roll complete', rolledValues);
          const allowedValues = rolledValues.slice(0, Math.max(0, DICE_CONFIG.MAX_EXPLODE - explodedCountRef.current));
          collectedExplodedDiceRef.current.push(...allowedValues);
          explodedCountRef.current += allowedValues.length;
          const chainedExplosions = allowedValues.filter(value => value === DICE_CONFIG.EXPLODE_ON).length;
          void runExplodedPhase(chainedExplosions);
        };
        void activeDiceBox.roll(`${nextPoolSize}d6`, { theme: 'jade-pip' });
      }, EXPLODED_DELAY_MS);
    };

    const activeDiceBox = diceBoxRef.current;
    if (!activeDiceBox) {
      return;
    }

    activeDiceBox.onRollComplete = (results) => {
      if (rollSequenceRef.current !== sequenceId) {
        return;
      }
      const rolledValues = extractRollValues(results).slice(0, poolSize);
      console.log('[DiceBoxOverlay] roll complete', rolledValues);
      collectedDiceRef.current = rolledValues;
      const initialExplosions = rolledValues.filter(value => value === DICE_CONFIG.EXPLODE_ON).length;
      void runExplodedPhase(initialExplosions);
    };

    await activeDiceBox.roll(`${poolSize}d6`, { theme: 'jade-pip' });
  }, [finishOverlay, poolSize]);

  const confirmOverlay = useCallback(() => {
    if (phase !== 'finished') {
      return;
    }
    clearTimers();
    onCompleteRef.current({
      dice: collectedDiceRef.current,
      explodedDice: collectedExplodedDiceRef.current,
    });
  }, [clearTimers, phase]);

  const cancelOverlay = useCallback(() => {
    clearTimers();
    onCancelRef.current?.();
  }, [clearTimers]);

  const fallbackComplete = useCallback(() => {
    clearTimers();
    const fallbackRoll = createFallbackRoll(poolSize, fallbackSeed);
    console.log('[DiceBoxOverlay] fallback triggered', fallbackRoll);
    onCompleteRef.current(fallbackRoll);
  }, [clearTimers, fallbackSeed, poolSize]);

  useEffect(() => {
    startedVisibleRef.current = false;
    setPhase('ready');
    setDisplayResult(null);
  }, [poolSize]);

  useEffect(() => {
    if (!visible) {
      startedVisibleRef.current = false;
      setPhase('ready');
      setDisplayResult(null);
      return;
    }
    console.log('[DiceBoxOverlay] overlay mounted', { containerId, poolSize, visible });

    let disposed = false;

    const ensureDiceBox = async () => {
      if (!diceBoxRef.current) {
        console.log('[DiceBoxOverlay] init start', { containerId });
        const DiceBoxClass = DiceBox as unknown as DiceBoxConstructor;
        const instance = new DiceBoxClass({
          container: `#${containerId}`,
          assetPath: '/dice-box/assets/',
          externalThemes: {
            'jade-pip': '/dice-box/external-themes/jade-pip',
            'gold-pip': '/dice-box/external-themes/gold-pip',
            'silver-pip': '/dice-box/external-themes/silver-pip',
            'chinese-pip': '/dice-box/external-themes/chinese-pip',
          },
          theme: 'jade-pip',
          offscreen: false,
          throwForce: 9,
          onRollComplete: () => {},
        }) as DiceBoxInstance;

        diceBoxRef.current = instance;
      }

      if (!initializedRef.current && diceBoxRef.current) {
        if (!initPromiseRef.current) {
          initPromiseRef.current = diceBoxRef.current.init()
            .then(() => {
              initializedRef.current = true;
              const canvas = document.querySelector<HTMLCanvasElement>(`#${containerId} canvas`);
              if (canvas) {
                canvas.style.width = '100%';
                canvas.style.height = '100%';
                canvas.style.background = 'transparent';
              }
              window.dispatchEvent(new Event('resize'));
              console.log('[DiceBoxOverlay] init success', { containerId });
            })
            .finally(() => {
              initPromiseRef.current = null;
            });
        }
        await initPromiseRef.current;
      }

      if (!disposed && diceBoxRef.current) {
        safeShow();
      }
    };

    initTimeoutRef.current = window.setTimeout(() => {
      if (disposed) {
        return;
      }
      console.error('[DiceBoxOverlay] init timeout');
      fallbackComplete();
    }, INIT_TIMEOUT_MS);

    hardTimeoutRef.current = window.setTimeout(() => {
      if (disposed) {
        return;
      }
      console.error('[DiceBoxOverlay] overlay lifetime timeout');
      fallbackComplete();
    }, MAX_OVERLAY_LIFETIME_MS);

    void ensureDiceBox()
      .then(() => {
        if (disposed || !diceBoxRef.current || startedVisibleRef.current) {
          return;
        }
        startedVisibleRef.current = true;
      })
      .catch((error) => {
        console.error('[DiceBoxOverlay] init fail', error);
        console.error('[DiceBoxOverlay] failed to initialize dice box', error);
        if (!disposed) {
          fallbackComplete();
        }
      });

    return () => {
      disposed = true;
      clearTimers();
      if (!visible) {
        return;
      }
      if (diceBoxRef.current) {
        diceBoxRef.current.onRollComplete = undefined;
        safeHide();
        diceBoxRef.current = null;
        initializedRef.current = false;
        initPromiseRef.current = null;
      }
    };
  }, [clearTimers, containerId, fallbackComplete, safeHide, safeShow, visible]);

  const handleTableClick = useCallback(() => {
    if (phase === 'ready') {
      clearTimers();
      hardTimeoutRef.current = window.setTimeout(() => {
        console.error('[DiceBoxOverlay] roll timeout');
        fallbackComplete();
      }, MAX_OVERLAY_LIFETIME_MS);
      void playRollSequence();
      return;
    }

    if (phase === 'finished') {
      confirmOverlay();
    }
  }, [clearTimers, confirmOverlay, fallbackComplete, phase, playRollSequence]);

  const headerText = useMemo(() => {
    if (phase === 'rolling') {
      return '命骰翻滚中';
    }
    if (phase === 'finished') {
      return resultLabelText ?? '命数已定';
    }
    return '点击掷骰';
  }, [phase, resultLabelText]);

  const resolvedSummaryText = useMemo(() => {
    if (resultSummaryText) {
      return resultSummaryText;
    }
    if (!displayResult) {
      return null;
    }
    const successes = [...displayResult.dice, ...displayResult.explodedDice].filter((value) => value >= 5).length;
    return `成功: ${successes}`;
  }, [displayResult, resultSummaryText]);

  const footerText = useMemo(() => {
    if (phase === 'rolling') {
      return null;
    }
    if (phase === 'finished') {
      return '点击继续';
    }
    return '点击桌面掷骰';
  }, [phase]);

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 backdrop-blur-sm">
      <div className="relative h-full w-full">
        <div className="absolute inset-0 flex items-center justify-center px-8 py-20">
          <div
            role="button"
            tabIndex={0}
            onClick={handleTableClick}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleTableClick();
              }
            }}
            className="relative z-10 h-full w-full max-w-6xl overflow-hidden rounded-[28px] border border-gold-300/18 shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
            style={{
              backgroundImage: 'url(/dice-box/table-bg-4.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div className="pointer-events-none absolute inset-x-0 top-10 z-10 text-center">
              <div className="mx-auto inline-flex flex-col items-center rounded-full border border-gold-300/25 bg-black/35 px-6 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                <span className="text-[11px] tracking-[0.3em] text-gold-300/70 font-(family-name:--font-ui)">三维掷骰</span>
                <span className="mt-1 text-lg text-parchment-100 font-(family-name:--font-display)">{headerText}</span>
                {phase === 'finished' && resolvedSummaryText ? (
                  <span className="mt-1 text-sm text-gold-200/90 font-(family-name:--font-body)">{resolvedSummaryText}</span>
                ) : null}
              </div>
            </div>

            {footerText ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-10 z-10 text-center">
                <div className="mx-auto inline-flex items-center rounded-full border border-gold-300/22 bg-black/30 px-5 py-2 text-sm text-parchment-100">
                  {footerText}
                </div>
              </div>
            ) : null}

            <div id={containerId} className={`relative h-full w-full ${phase === 'ready' ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`} />

            {phase === 'finished' ? (
              <button
                type="button"
                onClick={confirmOverlay}
                className="absolute bottom-8 right-8 z-20 rounded-full border border-gold-300/40 bg-black/55 px-5 py-2 text-sm text-parchment-100 transition hover:border-gold-300/65 hover:bg-black/70"
              >
                确认
              </button>
            ) : null}

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                cancelOverlay();
              }}
              className="absolute right-6 top-6 z-20 rounded-full border border-gold-300/30 bg-black/45 px-4 py-2 text-sm text-parchment-100 transition hover:border-gold-300/50 hover:bg-black/60"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}