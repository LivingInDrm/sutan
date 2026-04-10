import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import DiceBox from '@3d-dice/dice-box';
import { DICE_CONFIG } from '../../../core/types/enums';

interface DiceBoxOverlayProps {
  poolSize: number;
  onComplete: (result: { dice: number[]; explodedDice: number[] }) => void;
  visible: boolean;
}

type DiceBoxConstructor = new (selector: string, config: Record<string, unknown>) => DiceBoxInstance;

type DiceBoxInstance = {
  init: () => Promise<void>;
  roll: (notation: string) => Promise<unknown>;
  clear: () => void;
  hide: () => void;
  show: () => void;
  onRollComplete?: (results?: unknown) => void;
};

const RESULT_HOLD_MS = 1200;
const EXPLODED_DELAY_MS = 450;

function extractRollValues(results: unknown): number[] {
  if (!Array.isArray(results)) {
    return [];
  }

  return results
    .map((item) => {
      if (item && typeof item === 'object' && 'value' in item) {
        const value = Number((item as { value?: unknown }).value);
        return Number.isFinite(value) ? value : null;
      }
      return null;
    })
    .filter((value): value is number => value !== null);
}

export function DiceBoxOverlay({
  poolSize,
  onComplete,
  visible,
}: DiceBoxOverlayProps) {
  const reactId = useId();
  const containerId = useMemo(() => `dice-box-canvas-${reactId.replace(/:/g, '-')}`, [reactId]);
  const diceBoxRef = useRef<DiceBoxInstance | null>(null);
  const initializedRef = useRef(false);
  const rollSequenceRef = useRef(0);
  const timeoutRef = useRef<number | null>(null);
  const completionTimeoutRef = useRef<number | null>(null);
  const [phaseLabel, setPhaseLabel] = useState('卦骰将起');
  const collectedDiceRef = useRef<number[]>([]);
  const collectedExplodedDiceRef = useRef<number[]>([]);
  const explodedCountRef = useRef(0);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (completionTimeoutRef.current !== null) {
      window.clearTimeout(completionTimeoutRef.current);
      completionTimeoutRef.current = null;
    }
  }, []);

  const finishOverlay = useCallback(() => {
    clearTimers();
    onComplete({
      dice: collectedDiceRef.current,
      explodedDice: collectedExplodedDiceRef.current,
    });
  }, [clearTimers, onComplete]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    let disposed = false;

    const ensureDiceBox = async () => {
      if (!diceBoxRef.current) {
        const DiceBoxClass = DiceBox as unknown as DiceBoxConstructor;
        const instance = new DiceBoxClass(`#${containerId}`, {
          assetPath: '/dice-box/assets/',
          externalThemes: {
            'chinese-pip': '/dice-box/external-themes/chinese-pip',
            default: '/dice-box/external-themes/default',
          },
          theme: 'chinese-pip',
          offscreen: false,
          throwForce: 9,
        }) as DiceBoxInstance;

        diceBoxRef.current = instance;
      }

      if (!initializedRef.current && diceBoxRef.current) {
        await diceBoxRef.current.init();
        initializedRef.current = true;
      }

      if (!disposed && diceBoxRef.current) {
        diceBoxRef.current.show();
      }
    };

    const playRollSequence = async () => {
      collectedDiceRef.current = [];
      collectedExplodedDiceRef.current = [];
      explodedCountRef.current = 0;

      if (!poolSize) {
        completionTimeoutRef.current = window.setTimeout(() => {
          if (!disposed) {
            finishOverlay();
          }
        }, RESULT_HOLD_MS);
        return;
      }

      const sequenceId = ++rollSequenceRef.current;
      setPhaseLabel('命骰翻滚中');

      const runCompletion = () => {
        completionTimeoutRef.current = window.setTimeout(() => {
          if (rollSequenceRef.current === sequenceId && !disposed) {
            finishOverlay();
          }
        }, RESULT_HOLD_MS);
      };

      const runExplodedPhase = async (nextPoolSize: number) => {
        if (!nextPoolSize || explodedCountRef.current >= DICE_CONFIG.MAX_EXPLODE) {
          setPhaseLabel('命数已定');
          runCompletion();
          return;
        }

        timeoutRef.current = window.setTimeout(() => {
          const activeDiceBox = diceBoxRef.current;
          if (disposed || rollSequenceRef.current !== sequenceId || !activeDiceBox) {
            return;
          }

          setPhaseLabel('爆骰再起');
          activeDiceBox.clear();
          activeDiceBox.onRollComplete = (results) => {
            if (disposed || rollSequenceRef.current !== sequenceId) {
              return;
            }
            const rolledValues = extractRollValues(results);
            const allowedValues = rolledValues.slice(0, Math.max(0, DICE_CONFIG.MAX_EXPLODE - explodedCountRef.current));
            collectedExplodedDiceRef.current.push(...allowedValues);
            explodedCountRef.current += allowedValues.length;
            const chainedExplosions = allowedValues.filter(value => value === DICE_CONFIG.EXPLODE_ON).length;
            void runExplodedPhase(chainedExplosions);
          };
          void activeDiceBox.roll(`${nextPoolSize}d6`);
        }, EXPLODED_DELAY_MS);
      };

      const activeDiceBox = diceBoxRef.current;
      if (!activeDiceBox) {
        return;
      }

      activeDiceBox.onRollComplete = (results) => {
        if (disposed || rollSequenceRef.current !== sequenceId) {
          return;
        }
        const rolledValues = extractRollValues(results).slice(0, poolSize);
        collectedDiceRef.current = rolledValues;
        const initialExplosions = rolledValues.filter(value => value === DICE_CONFIG.EXPLODE_ON).length;
        void runExplodedPhase(initialExplosions);
      };

      await activeDiceBox.roll(`${poolSize}d6`);
    };

    void ensureDiceBox().then(() => {
      if (disposed || !diceBoxRef.current) {
        return;
      }

      clearTimers();
      diceBoxRef.current.clear();
      void playRollSequence();
    });

    return () => {
      disposed = true;
      clearTimers();
      if (diceBoxRef.current) {
        diceBoxRef.current.onRollComplete = undefined;
        diceBoxRef.current.clear();
        diceBoxRef.current.hide();
      }
    };
  }, [clearTimers, containerId, finishOverlay, poolSize, visible]);

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 backdrop-blur-sm">
      <div className="relative h-full w-full">
        <div className="pointer-events-none absolute inset-x-0 top-10 z-10 text-center">
          <div className="mx-auto inline-flex flex-col items-center rounded-full border border-gold-300/25 bg-black/35 px-6 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
            <span className="text-[11px] tracking-[0.3em] text-gold-300/70 font-(family-name:--font-ui)">三维掷骰</span>
            <span className="mt-1 text-lg text-parchment-100 font-(family-name:--font-display)">{phaseLabel}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={finishOverlay}
          className="absolute right-6 top-6 z-10 rounded-full border border-gold-300/30 bg-black/45 px-4 py-2 text-sm text-parchment-100 transition hover:border-gold-300/50 hover:bg-black/60"
        >
          跳过动画
        </button>

        <div className="absolute inset-0 flex items-center justify-center px-8 py-20">
          <div className="relative h-full w-full max-w-6xl overflow-hidden rounded-[28px] border border-gold-300/18 bg-[radial-gradient(circle_at_center,rgba(120,72,28,0.16),rgba(10,6,4,0.9))] shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
            <div id={containerId} className="relative h-full w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}