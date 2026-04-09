import React from 'react';
import { DiceScene } from '../components/dice/DiceScene';

export function DiceDemoPage() {
  const searchParams = React.useMemo(() => new URLSearchParams(window.location.search), []);
  const faceCheck = searchParams.get('faceCheck');
  const debugUv = searchParams.get('debugUv') === '1';
  const forcedFace = faceCheck ? Math.min(6, Math.max(1, Number(faceCheck) || 1)) : null;
  const [diceCount, setDiceCount] = React.useState(3);
  const [results, setResults] = React.useState<number[]>([]);
  const [targetValues, setTargetValues] = React.useState<number[]>([1, 2, 3]);
  const [rollingFlags, setRollingFlags] = React.useState<boolean[]>([false, false, false]);
  const [lastTriggeredAt, setLastTriggeredAt] = React.useState<number | null>(null);

  React.useEffect(() => {
    document.body.style.overflow = 'auto';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleRoll = React.useCallback((index: number, value: number) => {
    setResults(current => {
      const next = [...current];
      next[index] = value;
      return next;
    });
    setRollingFlags(current => {
      const next = [...current];
      next[index] = false;
      return next;
    });
  }, []);

  const visibleDice = React.useMemo(() => Array.from({ length: diceCount }, (_, index) => index), [diceCount]);
  const displayedDiceCount = forcedFace ? 1 : diceCount;
  const displayedValues = React.useMemo(
    () =>
      forcedFace
        ? [forcedFace]
        : Array.from({ length: displayedDiceCount }, (_, index) => targetValues[index] ?? index + 1),
    [displayedDiceCount, forcedFace, targetValues]
  );
  const displayedRollingFlags = React.useMemo(
    () => (forcedFace ? [false] : Array.from({ length: displayedDiceCount }, (_, index) => rollingFlags[index] ?? false)),
    [displayedDiceCount, forcedFace, rollingFlags]
  );

  const triggerRoll = React.useCallback(() => {
    if (forcedFace) {
      return;
    }
    setResults([]);
    const timestamp = Date.now();
    setLastTriggeredAt(timestamp);
    const nextValues = Array.from({ length: diceCount }, (_, index) => ((((timestamp + index * 37) / 100) | 0) % 6) + 1);
    setTargetValues(current => {
      const fallback = [...current];
      nextValues.forEach((value, index) => {
        fallback[index] = value;
      });
      return fallback;
    });
    setRollingFlags(current => current.map((_, index) => index < diceCount));
  }, [diceCount, forcedFace]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#26334d_0%,#131723_38%,#07090f_100%)] px-6 py-10 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <div className="space-y-3 text-center">
          <div className="inline-flex items-center rounded-full border border-white/15 bg-white/6 px-4 py-1 text-xs tracking-[0.35em] text-white/70 uppercase">
            React Three Fiber Dice Demo
          </div>
          <h1 className="text-4xl font-semibold tracking-[0.08em] text-white">3D 骰子翻滚演示</h1>
          <p className="mx-auto max-w-2xl text-sm leading-7 text-white/70">
            使用 React Three Fiber 与传统骰面贴图实现的真 3D 骰子演示，保留现有控制台布局并提供 1-3 颗骰子的同步掷骰体验。
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
          <aside className="rounded-3xl border border-white/10 bg-white/6 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur">
            <div className="space-y-6">
              <div>
                <div className="mb-2 text-xs tracking-[0.3em] text-white/50 uppercase">控制台</div>
                <div className="text-lg font-medium text-white">快速试掷</div>
              </div>

              <div className="space-y-3">
                <label className="text-sm text-white/70">骰子数量</label>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map(count => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => {
                        if (forcedFace) {
                          return;
                        }
                        setDiceCount(count);
                        setResults([]);
                        setRollingFlags([false, false, false]);
                      }}
                      className={`rounded-2xl border px-3 py-2 text-sm transition ${
                        diceCount === count
                          ? 'border-cyan-300/80 bg-cyan-300/15 text-white shadow-[0_0_24px_rgba(103,232,249,0.18)]'
                          : 'border-white/10 bg-black/20 text-white/70 hover:border-white/25 hover:text-white'
                      }`}
                    >
                      {count} 颗
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={triggerRoll}
                disabled={Boolean(forcedFace)}
                className="w-full rounded-2xl bg-[linear-gradient(135deg,#67e8f9_0%,#2563eb_100%)] px-4 py-3 text-sm font-medium tracking-[0.2em] text-slate-950 uppercase shadow-[0_18px_40px_rgba(37,99,235,0.35)] transition hover:scale-[1.01]"
              >
                {forcedFace ? `面 ${forcedFace} 校验模式` : '掷骰子'}
              </button>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="mb-3 text-xs tracking-[0.3em] text-white/45 uppercase">结果</div>
                <div className="flex flex-wrap gap-2">
                  {results.length === displayedDiceCount && !forcedFace ? (
                    results.map((value, index) => (
                      <span
                        key={`${index}-${value}-${lastTriggeredAt ?? 0}`}
                        className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm text-white/85"
                      >
                        #{index + 1}: {value}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-white/45">
                      {forcedFace ? `当前固定展示 ${forcedFace} 面` : '点击按钮触发一次新的翻滚动画'}
                    </span>
                  )}
                </div>
                <div className="mt-4 text-xs text-white/45">
                  {results.length === displayedDiceCount && !forcedFace
                    ? `总和：${results.reduce((sum, value) => sum + value, 0)}`
                    : forcedFace
                      ? '用于逐面朝向检查'
                      : '等待全部骰子落定'}
                </div>
              </div>

              <div className="text-xs leading-6 text-white/45">
                说明：每颗骰子都是独立的 Three.js 立方体，使用真实贴图、光照与阴影，并通过时间差制造更自然的连续翻滚节奏。
              </div>
            </div>
          </aside>

          <section className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_24px_80px_rgba(0,0,0,0.4)]">
            <div className="flex min-h-[560px] flex-col items-center justify-center rounded-[28px] border border-dashed border-white/10 bg-[radial-gradient(circle_at_center,rgba(103,232,249,0.08)_0%,rgba(6,10,18,0.24)_40%,rgba(3,4,8,0.52)_100%)] p-8">
              <div className="mb-8 text-center">
                <div className="text-sm tracking-[0.3em] text-white/45 uppercase">Preview</div>
                <div className="mt-2 text-xl text-white/90">点击左侧按钮，观察 3D 骰子翻滚</div>
              </div>

              <DiceScene
                diceValues={displayedValues}
                rollingFlags={displayedRollingFlags}
                debugFaceTextures={displayedValues.map(() => debugUv)}
                onDieComplete={handleRoll}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}