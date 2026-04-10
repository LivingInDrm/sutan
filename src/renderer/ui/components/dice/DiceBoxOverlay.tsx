import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import DiceBox from '@3d-dice/dice-box';
import { DICE_CONFIG } from '../../../core/types/enums';
import { RandomManager } from '../../../lib/random';
import { Button } from '../common/Button';
import { DividerLine } from '../common/svg';
import ricePaperTexture from '../../../assets/textures/rice-paper-1024.webp';

interface DiceBoxOverlayProps {
  onComplete: (result: { dice: [number, number, number] }) => void;
  onCancel?: () => void;
  fallbackSeed?: string;
  visible: boolean;
  checkTitle?: string | null;
  checkModifier?: number;
  checkDc?: number;
  availableGoldenDice?: number;
  selectedGoldenDice?: number;
  onGoldenDiceChange?: (value: number) => void;
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

const INIT_TIMEOUT_MS = 5000;

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
  onComplete,
  onCancel,
  visible,
  checkTitle,
  checkModifier = 0,
  checkDc,
  availableGoldenDice = 0,
  selectedGoldenDice = 0,
  onGoldenDiceChange,
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
  const initTimeoutRef = useRef<number | null>(null);
  const [phase, setPhase] = useState<DicePhase>('ready');
  const [displayResult, setDisplayResult] = useState<{ dice: [number, number, number] } | null>(null);
  const collectedDiceRef = useRef<[number, number, number]>([1, 1, 1]);
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
    if (initTimeoutRef.current !== null) {
      window.clearTimeout(initTimeoutRef.current);
      initTimeoutRef.current = null;
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
    } as { dice: [number, number, number] });
    setPhase('finished');
    console.log('[DiceBoxOverlay] finish', {
      dice: collectedDiceRef.current,
    });
  }, [clearTimers]);

  const playRollSequence = useCallback(async () => {
    collectedDiceRef.current = [1, 1, 1];
    setPhase('rolling');
    console.log('[DiceBoxOverlay] rolling');

    const sequenceId = ++rollSequenceRef.current;

    const activeDiceBox = diceBoxRef.current;
    if (!activeDiceBox) {
      return;
    }

    activeDiceBox.onRollComplete = (results) => {
      if (rollSequenceRef.current !== sequenceId) {
        return;
      }
      const rolledValues = extractRollValues(results).slice(0, DICE_CONFIG.DICE_COUNT);
      console.log('[DiceBoxOverlay] roll complete', rolledValues);
      collectedDiceRef.current = [
        rolledValues[0] ?? 1,
        rolledValues[1] ?? 1,
        rolledValues[2] ?? 1,
      ];
      finishOverlay();
    };

    await activeDiceBox.roll(`${DICE_CONFIG.DICE_COUNT}d6`, { theme: 'jade-pip' });
  }, [finishOverlay]);

  const confirmOverlay = useCallback(() => {
    if (phase !== 'finished') {
      return;
    }
    clearTimers();
    onCompleteRef.current({
      dice: collectedDiceRef.current,
    });
  }, [clearTimers, phase]);

  const cancelOverlay = useCallback(() => {
    clearTimers();
    onCancelRef.current?.();
  }, [clearTimers]);

  useEffect(() => {
    startedVisibleRef.current = false;
    setPhase('ready');
    setDisplayResult(null);
  }, []);

  useEffect(() => {
    if (!visible) {
      startedVisibleRef.current = false;
      setPhase('ready');
      setDisplayResult(null);
      return;
    }
    console.log('[DiceBoxOverlay] overlay mounted', { containerId, visible });

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
      clearTimers();
    }, INIT_TIMEOUT_MS);

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
          clearTimers();
          setPhase('ready');
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
  }, [clearTimers, containerId, safeHide, safeShow, visible]);

  const handleTableClick = useCallback(() => {
    if (phase === 'ready') {
      if (availableGoldenDice > 0 && selectedGoldenDice > availableGoldenDice) {
        return;
      }
      clearTimers();
      void playRollSequence();
      return;
    }

    if (phase === 'finished') {
      confirmOverlay();
    }
  }, [availableGoldenDice, clearTimers, confirmOverlay, phase, playRollSequence, selectedGoldenDice]);

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
    return `结果：${displayResult.dice.join(' + ')} = ${displayResult.dice.reduce((sum, value) => sum + value, 0)}`;
  }, [displayResult, resultSummaryText]);

  const modifierText = useMemo(() => {
    const totalModifier = checkModifier + selectedGoldenDice;
    return `${totalModifier >= 0 ? '+' : '-'}${Math.abs(totalModifier)}`;
  }, [checkModifier, selectedGoldenDice]);

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
    <div className="fixed inset-0 z-50 bg-[rgba(7,5,4,0.84)] backdrop-blur-[3px]">
      <div className="relative flex h-full w-full items-center justify-center px-4 py-6">
        <div className="relative w-full max-w-6xl overflow-hidden rounded-[28px] border border-[#8a6d2b]/32 bg-[linear-gradient(180deg,rgba(20,12,8,0.92),rgba(12,8,6,0.98))] shadow-[0_34px_110px_rgba(0,0,0,0.58)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(201,168,76,0.08),transparent_36%),radial-gradient(circle_at_bottom,rgba(139,26,26,0.08),transparent_30%)]" />
          <div className="relative grid min-h-[78vh] grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div
              className="relative overflow-hidden border-b border-[#8a6d2b]/20 lg:border-b-0 lg:border-r lg:border-r-[#8a6d2b]/20"
              style={{
                backgroundImage: `linear-gradient(180deg,rgba(236,226,208,0.96),rgba(208,191,160,0.95)), url(${ricePaperTexture})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,247,230,0.24),rgba(118,89,42,0.12))]" />
              <div className="relative flex h-full flex-col px-6 py-7">
                <div>
                  <div className="text-[10px] tracking-[0.32em] text-[#8a6d2b]/80 font-(family-name:--font-ui)">案上命筹</div>
                  <h2 className="mt-3 text-[28px] tracking-[0.08em] text-[#1a0f0a] font-(family-name:--font-display)">骰子既出，命数自明</h2>
                </div>
                <div className="py-5">
                  <DividerLine className="h-1 w-full text-[#8a6d2b]/24" preserveAspectRatio="none" />
                </div>
                <div className="space-y-4">
                  <div className="rounded-[16px] border border-[#8a6d2b]/24 bg-[rgba(255,248,235,0.38)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-[10px] tracking-[0.24em] text-[#8a6d2b]/75 font-(family-name:--font-ui)">判定</div>
                        <div className="mt-2 text-[18px] leading-[1.5] text-[#1a0f0a] font-(family-name:--font-display)">
                          {checkTitle ?? '命骰判定'}
                        </div>
                      </div>
                      {typeof checkDc === 'number' ? (
                        <div className="rounded-[12px] border border-[#8a6d2b]/16 bg-[rgba(118,89,42,0.08)] px-3 py-2 text-right">
                          <div className="text-[10px] tracking-[0.2em] text-[#8a6d2b]/72 font-(family-name:--font-ui)">DC</div>
                          <div className="mt-1 text-[22px] text-[#1a0f0a] font-(family-name:--font-display)">{checkDc}</div>
                        </div>
                      ) : null}
                    </div>
                    <div className="mt-3 flex items-center justify-between rounded-[12px] bg-[rgba(118,89,42,0.08)] px-3 py-2 text-[13px] text-[#3d2418]/82 font-(family-name:--font-body)">
                      <span>修正值</span>
                      <span className="text-[16px] text-[#1a0f0a] font-(family-name:--font-display)">{modifierText}</span>
                    </div>
                  </div>
                  <div className="rounded-[16px] border border-[#8a6d2b]/24 bg-[rgba(255,248,235,0.38)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
                    <div className="text-[10px] tracking-[0.24em] text-[#8a6d2b]/75 font-(family-name:--font-ui)">判辞</div>
                    <div className="mt-2 text-[14px] leading-[1.8] text-[#1a0f0a] font-(family-name:--font-body)">
                      {resolvedSummaryText ?? '三枚六面命骰落案，以总数对应卷中定下的门槛。'}
                    </div>
                  </div>
                  {availableGoldenDice > 0 ? (
                    <div className="rounded-[16px] border border-[#8a6d2b]/20 bg-[rgba(118,89,42,0.08)] px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-[10px] tracking-[0.24em] text-[#8a6d2b]/75 font-(family-name:--font-ui)">金骰加注</div>
                          <div className="mt-2 text-[16px] text-[#1a0f0a] font-(family-name:--font-display)">已用 {selectedGoldenDice} / {availableGoldenDice}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onGoldenDiceChange?.(Math.max(0, selectedGoldenDice - 1))}
                          >
                            -
                          </Button>
                          <div className="min-w-[2rem] text-center text-[18px] text-[#1a0f0a] font-(family-name:--font-display)">
                            {selectedGoldenDice}
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onGoldenDiceChange?.(Math.min(availableGoldenDice, selectedGoldenDice + 1))}
                          >
                            +
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  <div className="rounded-[16px] border border-[#8a6d2b]/20 bg-[rgba(118,89,42,0.08)] px-4 py-4">
                    <div className="text-[10px] tracking-[0.24em] text-[#8a6d2b]/75 font-(family-name:--font-ui)">此刻状态</div>
                    <div className="mt-3 text-[18px] tracking-[0.06em] text-[#1a0f0a] font-(family-name:--font-display)">
                      {phase === 'ready' ? '掷前蓄势' : phase === 'rolling' ? '木案翻滚' : '收骰待断'}
                    </div>
                    <div className="mt-2 text-[13px] leading-[1.8] text-[#3d2418]/78 font-(family-name:--font-body)">
                      {footerText ?? '请静候命骰停定。'}
                    </div>
                  </div>
                </div>
                <div className="mt-auto pt-6">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={cancelOverlay}
                    className="!justify-start !px-0 text-[#3d2418]"
                  >
                    退卷
                  </Button>
                </div>
              </div>
            </div>

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
              className="relative z-10 min-h-[52vh] overflow-hidden bg-[radial-gradient(circle_at_top,rgba(58,36,24,0.42),rgba(12,8,6,0.92))]"
              style={{
                backgroundImage: 'url(/dice-box/table-bg-4.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(8,5,4,0.7),rgba(8,5,4,0.2)_24%,rgba(8,5,4,0.78))]" />
              <div className="pointer-events-none absolute inset-x-6 top-5 flex items-center justify-between rounded-[18px] border border-[#c9a84c]/20 bg-[rgba(12,8,6,0.58)] px-4 py-3 backdrop-blur-[2px]">
                <div>
                  <div className="text-[10px] tracking-[0.28em] text-[#c9a84c]/78 font-(family-name:--font-ui)">三维掷骰</div>
                  <div className="mt-1 text-[18px] text-[#f5f0e8] font-(family-name:--font-display)">{headerText}</div>
                </div>
                {displayResult && phase === 'finished' ? (
                  <div className="text-right">
                    <div className="text-[10px] tracking-[0.24em] text-[#c9a84c]/70 font-(family-name:--font-ui)">命数</div>
                    <div className="mt-1 text-[24px] text-[#f5f0e8] font-(family-name:--font-display)">
                      {displayResult.dice.join(' · ')}
                    </div>
                  </div>
                ) : null}
              </div>

              <div id={containerId} className={`relative h-full w-full ${phase === 'ready' ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`} />

              {phase === 'finished' && displayResult ? (
                <div className="absolute inset-x-0 bottom-0 flex justify-center px-6 pb-6">
                  <div className="w-full max-w-2xl rounded-[24px] border border-[#c9a84c]/34 bg-[linear-gradient(180deg,rgba(18,10,7,0.9),rgba(30,18,12,0.96))] px-5 py-5 shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-md">
                    <div className="text-center">
                      <div className="text-[10px] tracking-[0.3em] text-[#c9a84c]/78 font-(family-name:--font-ui)">
                        {resultLabelText ?? '掷骰已定'}
                      </div>
                      <div className="mt-2 text-[24px] text-[#f5f0e8] font-(family-name:--font-display)">
                        {displayResult.dice.join(' · ')}
                      </div>
                      {resolvedSummaryText ? (
                        <div className="mt-2 text-[13px] leading-[1.8] text-[#d4c5a9]/84 font-(family-name:--font-body)">
                          {resolvedSummaryText}
                        </div>
                      ) : null}
                    </div>
                    <div className="mt-5 flex justify-center gap-3">
                      <Button variant="ghost" size="sm" onClick={cancelOverlay}>退卷</Button>
                      <Button variant="primary" size="sm" glow onClick={confirmOverlay}>收骰定夺</Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}