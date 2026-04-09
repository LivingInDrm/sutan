import React, { useMemo, useRef, useState } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { useGameStore } from '../../stores/gameStore';
import type { Scene } from '../../core/types';
import { dataLoader } from '../../data/loader';

const baseCards = dataLoader.loadCardsFromDirectory();
const baseScenes: Scene[] = dataLoader.loadScenesFromDirectory();
const DIFFICULTIES = [
  { key: 'easy', label: '简单', desc: '21天 / 50金币', tone: '宽缓开局，适合初入北凉' },
  { key: 'normal', label: '普通', desc: '14天 / 30金币', tone: '刀锋将近，进退需有章法' },
  { key: 'hard', label: '困难', desc: '7天 / 15金币', tone: '军报催命，一步错则满盘惊' },
  { key: 'nightmare', label: '噩梦', desc: '5天 / 10金币', tone: '命悬北凉，落子皆是绝路' },
] as const;

export function TitleScreen() {
  const setScreen = useUIStore(s => s.setScreen);
  const startNewGame = useGameStore(s => s.startNewGame);
  const game = useGameStore(s => s.game);
  const exportSave = useGameStore(s => s.exportSave);
  const importSave = useGameStore(s => s.importSave);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('normal');
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleStart = (difficulty: string) => {
    startNewGame(difficulty, baseCards, baseScenes);
    setScreen('world_map');
  };

  const handleContinue = () => {
    if (!game) return;
    setScreen('world_map');
  };

  const handleExport = () => {
    const saveJson = exportSave();
    if (!saveJson) return;

    const blob = new Blob([saveJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'sutan-save.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const saveJson = await file.text();
      importSave(saveJson, baseCards, baseScenes);
      setImportError(null);
      setScreen('world_map');
    } catch {
      setImportError('存档残缺或笔墨错乱，未能入卷。');
    } finally {
      event.target.value = '';
    }
  };

  const selectedDifficultyConfig = useMemo(
    () => DIFFICULTIES.find(item => item.key === selectedDifficulty) ?? DIFFICULTIES[1],
    [selectedDifficulty],
  );

  return (
    <div
      className="relative h-screen w-screen overflow-hidden bg-leather-900 text-parchment-200"
      style={{
        backgroundImage: [
          'url(/title-bg.png)',
          'radial-gradient(circle at 50% 42%, rgba(10,8,6,0) 0%, rgba(10,8,6,0.03) 46%, rgba(10,8,6,0.18) 100%)',
        ].join(', '),
        backgroundSize: 'cover, cover',
        backgroundPosition: 'center, center',
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(14,8,6,0.02),rgba(14,8,6,0.12))]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-500/50 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-500/30 to-transparent" />

      <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center justify-center px-6 py-10">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="flex flex-col justify-center text-center lg:text-left">
            <div className="mb-6 inline-flex self-center lg:self-start items-center gap-3 rounded-full border border-gold-500/35 bg-ink-900/35 px-4 py-2 text-[10px] tracking-[0.28em] text-parchment-400 shadow-[var(--shadow-ink-sm)] backdrop-blur-[2px] font-(family-name:--font-ui)">
              <span className="h-1.5 w-1.5 rounded-full bg-crimson-500/80" />
              北凉旧卷
            </div>

            <div className="mb-8 rounded-2xl bg-black/16 px-6 py-6 shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-sm">
              <p className="mb-3 text-[12px] tracking-[0.32em] text-gold-500/80 font-(family-name:--font-ui)">
                风沙入卷 · 墨痕未干
              </p>
              <h1
                className="mb-5 text-[56px] leading-[1.08] tracking-[0.12em] text-gold-300 font-(family-name:--font-display)"
                style={{ textShadow: 'var(--shadow-gold-lg)' }}
              >
                雪中悍刀行
              </h1>
              <p className="mx-auto max-w-[28ch] text-[16px] leading-[1.8] tracking-[0.02em] text-parchment-200/88 font-(family-name:--font-body) lg:mx-0">
                北凉军报催人，江湖旧事如墨晕铺开。拈一枚棋子，选一条命路，在风雪压城前写下你的卷末批语。
              </p>
            </div>

            <div className="mx-auto lg:mx-0 w-full max-w-xl rounded-xl border border-gold-500/25 bg-[linear-gradient(180deg,rgba(18,10,7,0.28),rgba(18,10,7,0.14))] p-5 shadow-[var(--shadow-ink)] backdrop-blur-sm">
              <div className="mb-3 flex items-center gap-3">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gold-500/35" />
                <span className="text-[12px] tracking-[0.18em] text-gold-300 font-(family-name:--font-display)">
                  卷首题记
                </span>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gold-500/35" />
              </div>
              <p className="text-[14px] leading-[1.7] tracking-[0.01em] text-parchment-300/88 font-(family-name:--font-body)">
                主标题、材质、金线与按钮均遵循水墨北凉规范：深皮革为底，宣纸为雾，旧金为笔锋，朱砂仅作点睛。
              </p>
            </div>
          </section>

          <section className="relative mx-auto w-full max-w-[560px]">
            <div
              className="relative overflow-hidden rounded-xl border border-gold-500/35 bg-parchment-300/88 text-leather-900 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
              style={{
                backgroundImage: 'linear-gradient(180deg, rgba(245,240,232,0.92), rgba(212,197,169,0.88))',
              }}
            >
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-gold-300/80 to-transparent" />
              <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-gold-500/35 to-transparent" />
              <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-gold-500/35 to-transparent" />

              <div className="relative p-6 sm:p-8">
                <div className="mb-6">
                  <div className="mb-2 text-[10px] tracking-[0.3em] text-gold-500/80 font-(family-name:--font-ui)">
                    标题画面
                  </div>
                  <h2 className="text-[22px] leading-[1.25] tracking-[0.04em] text-leather-900 font-(family-name:--font-display)">
                    选定命数，提笔入局
                  </h2>
                  <p className="mt-2 text-[14px] leading-[1.7] tracking-[0.01em] text-leather-700/80 font-(family-name:--font-body)">
                    先择难度，再启程；若旧卷尚在，可续写前文，亦可导入或导出存档。
                  </p>
                </div>

                <div className="mb-6 space-y-3">
                  {DIFFICULTIES.map(({ key, label, desc, tone }) => {
                    const selected = key === selectedDifficulty;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedDifficulty(key)}
                        className={[
                          'group w-full rounded-lg border px-4 py-4 text-left transition-all duration-200 active:scale-[0.97]',
                          'min-h-12 shadow-[0_2px_8px_rgba(0,0,0,0.18)]',
                          selected
                            ? 'border-gold-300 bg-[linear-gradient(180deg,rgba(240,208,96,0.20),rgba(201,168,76,0.10))] -translate-y-[1px]'
                            : 'border-gold-500/30 bg-[linear-gradient(180deg,rgba(245,240,232,0.50),rgba(212,197,169,0.28))] hover:border-gold-300/70 hover:bg-[linear-gradient(180deg,rgba(245,240,232,0.72),rgba(212,197,169,0.38))] hover:-translate-y-[2px]',
                        ].join(' ')}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-[18px] leading-[1.25] tracking-[0.02em] text-leather-900 font-(family-name:--font-display)">
                              {label}
                            </div>
                            <div className="mt-1 text-[14px] leading-[1.7] tracking-[0.01em] text-leather-700/85 font-(family-name:--font-body)">
                              {tone}
                            </div>
                          </div>
                          <div className="shrink-0 pt-1 text-right">
                            <div className="text-[12px] leading-[1.5] tracking-[0.08em] text-gold-500 font-(family-name:--font-ui)">
                              {desc}
                            </div>
                            <div className={`mt-2 h-2 w-2 rounded-full ${selected ? 'bg-gold-300 shadow-[var(--shadow-gold-sm)]' : 'bg-gold-500/35'}`} />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mb-5 rounded-lg border border-gold-500/20 bg-[linear-gradient(180deg,rgba(61,36,24,0.04),rgba(61,36,24,0.09))] px-4 py-3">
                  <div className="text-[10px] tracking-[0.24em] text-gold-500/75 font-(family-name:--font-ui)">
                    当前卷宗
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-[18px] leading-[1.25] tracking-[0.02em] text-leather-900 font-(family-name:--font-display)">
                        {selectedDifficultyConfig.label}
                      </div>
                      <div className="mt-1 text-[12px] leading-[1.5] tracking-[0.08em] text-leather-700/70 font-(family-name:--font-ui)">
                        {selectedDifficultyConfig.desc}
                      </div>
                    </div>
                    <div className="text-[12px] leading-[1.5] tracking-[0.08em] text-gold-500 font-(family-name:--font-ui)">
                      {game ? '已有旧卷可续' : '尚无旧卷'}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => handleStart(selectedDifficulty)}
                    className="min-h-12 rounded-lg border border-gold-300 bg-[linear-gradient(180deg,rgba(201,168,76,0.92),rgba(138,109,43,0.96))] px-5 py-3 text-[16px] leading-[1.2] tracking-[0.08em] text-leather-900 shadow-[var(--shadow-gold)] transition-all duration-200 hover:-translate-y-[2px] hover:border-gold-100 hover:shadow-[var(--shadow-gold-lg)] active:scale-[0.97] font-(family-name:--font-display)"
                  >
                    新开一卷
                  </button>
                  <button
                    type="button"
                    onClick={handleContinue}
                    disabled={!game}
                    className={[
                      'min-h-12 rounded-lg border px-5 py-3 text-[16px] leading-[1.2] tracking-[0.08em] transition-all duration-200 active:scale-[0.97] font-(family-name:--font-display)',
                      game
                        ? 'border-gold-500/55 bg-leather-900/92 text-gold-300 hover:-translate-y-[2px] hover:border-gold-300 hover:text-gold-100'
                        : 'cursor-not-allowed border-gold-500/20 bg-leather-900/55 text-parchment-500',
                    ].join(' ')}
                  >
                    继续旧卷
                  </button>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="min-h-12 rounded-lg border border-gold-500/40 bg-leather-900/8 px-5 py-3 text-[12px] leading-[1.5] tracking-[0.12em] text-gold-500 transition-all duration-200 hover:-translate-y-[2px] hover:border-gold-300 hover:text-gold-300 active:scale-[0.97] font-(family-name:--font-ui)"
                  >
                    导入存档
                  </button>
                  <button
                    type="button"
                    onClick={handleExport}
                    disabled={!game}
                    className={[
                      'min-h-12 rounded-lg border px-5 py-3 text-[12px] leading-[1.5] tracking-[0.12em] transition-all duration-200 active:scale-[0.97] font-(family-name:--font-ui)',
                      game
                        ? 'border-gold-500/40 bg-leather-900/8 text-gold-500 hover:-translate-y-[2px] hover:border-gold-300 hover:text-gold-300'
                        : 'cursor-not-allowed border-gold-500/18 bg-leather-900/4 text-parchment-500',
                    ].join(' ')}
                  >
                    导出存档
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={handleImportFile}
                />

                <div className="mt-4 min-h-5 text-[12px] leading-[1.5] tracking-[0.01em] font-(family-name:--font-body)">
                  {importError ? (
                    <span className="text-crimson-500">{importError}</span>
                  ) : (
                    <span className="text-leather-700/65">支持继续游戏、导入导出存档，不改动原有流程。</span>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex items-center justify-center gap-4 px-6">
        <div className="h-px w-12 bg-gradient-to-r from-transparent to-gold-500/35" />
        <p className="text-[10px] tracking-[0.24em] text-parchment-400/70 font-(family-name:--font-ui)">
          v0.1.0 · 开发版
        </p>
        <div className="h-px w-12 bg-gradient-to-l from-transparent to-gold-500/35" />
      </div>
    </div>
  );
}
