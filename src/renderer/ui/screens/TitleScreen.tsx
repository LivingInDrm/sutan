import React, { useMemo, useRef, useState } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { useGameStore } from '../../stores/gameStore';
import type { Scene } from '../../core/types';
import { dataLoader } from '../../data/loader';

const baseCards = dataLoader.loadCardsFromDirectory();
const baseScenes: Scene[] = dataLoader.loadScenesFromDirectory();
const DIFFICULTIES = [
  { key: 'easy', label: '简命', desc: '廿一日 · 备银五十', tone: '风雪未紧，尚容你徐徐试笔' },
  { key: 'normal', label: '常命', desc: '十四日 · 备银三十', tone: '刀背催行，需在进退之间守住章法' },
  { key: 'hard', label: '险命', desc: '七日 · 备银十五', tone: '军报急递，稍失一着便惊动满盘' },
  { key: 'nightmare', label: '绝命', desc: '五日 · 备银十两', tone: '命帖如霜，落笔之前已近绝崖' },
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
      <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(rgba(56,32,16,0.9) 0.7px, transparent 0.7px)', backgroundSize: '9px 9px' }} />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,248,235,0.02),rgba(31,17,10,0.08))]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-500/50 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-500/30 to-transparent" />

      <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center justify-center px-6 py-10">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="flex flex-col justify-center text-center lg:text-left">
            <div className="relative mb-6 inline-flex min-h-[60px] self-center lg:self-start items-center pl-5 pr-6">
              <div
                className="absolute inset-y-0 left-0 w-[92px] border border-[#6f4b25]/75 bg-[linear-gradient(180deg,rgba(109,74,33,0.92),rgba(62,39,19,0.94))] shadow-[0_10px_18px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,226,167,0.16),inset_0_-1px_0_rgba(39,20,8,0.45)]"
                style={{ clipPath: 'polygon(10% 0%, 88% 0%, 100% 16%, 94% 100%, 0% 100%, 0% 12%)' }}
              />
              <div className="absolute left-[10px] top-[8px] h-10 w-[18px] bg-[linear-gradient(180deg,rgba(132,22,22,0.95),rgba(98,12,12,0.96))] shadow-[0_4px_10px_rgba(107,15,15,0.35)]" style={{ clipPath: 'polygon(32% 0%,100% 0%,88% 100%,0% 100%)' }} />
              <div className="absolute left-[16px] top-[10px] h-9 w-px bg-parchment-200/35" />
              <div className="relative ml-10 flex items-center gap-3 text-[11px] tracking-[0.32em] text-parchment-300 font-(family-name:--font-display)">
                <span className="h-[18px] w-px bg-gold-400/55" />
                北凉题签
              </div>
            </div>

            <div
              className="relative mb-8 px-7 py-7"
              style={{
                backgroundImage: [
                  'radial-gradient(circle at 18% 28%, rgba(230,216,187,0.08), transparent 26%)',
                  'radial-gradient(circle at 74% 62%, rgba(255,244,214,0.06), transparent 24%)',
                  'linear-gradient(180deg, rgba(22,12,8,0.42), rgba(16,9,7,0.18))',
                ].join(', '),
                boxShadow: 'inset 0 1px 0 rgba(227,192,118,0.08), inset 0 -18px 40px rgba(5,3,2,0.18), 0 18px 34px rgba(0,0,0,0.16)',
              }}
            >
              <div className="pointer-events-none absolute inset-0 opacity-[0.34]" style={{ backgroundImage: 'radial-gradient(rgba(84,58,32,0.58) 0.8px, transparent 0.8px)', backgroundSize: '11px 11px' }} />
              <div className="pointer-events-none absolute inset-x-2 top-1 h-[1px] bg-gradient-to-r from-transparent via-gold-500/28 to-transparent" />
              <div className="pointer-events-none absolute inset-y-2 left-0 w-5 bg-[radial-gradient(circle_at_left,rgba(7,4,3,0.46),transparent_72%)]" />
              <div className="pointer-events-none absolute inset-y-2 right-0 w-5 bg-[radial-gradient(circle_at_right,rgba(7,4,3,0.38),transparent_72%)]" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-[linear-gradient(180deg,transparent,rgba(7,4,3,0.24))]" />
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

            <div
              className="relative mx-auto w-full max-w-xl px-6 pb-5 pt-6 lg:mx-0"
              style={{
                backgroundImage: [
                  'radial-gradient(circle at 16% 20%, rgba(240,229,204,0.10), transparent 18%)',
                  'linear-gradient(180deg, rgba(24,14,10,0.26), rgba(13,8,6,0.08))',
                ].join(', '),
                boxShadow: '0 16px 30px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,236,188,0.08)',
              }}
            >
              <div className="absolute left-2 top-2 h-[88%] w-[2px] bg-[linear-gradient(180deg,rgba(125,90,45,0.18),rgba(125,90,45,0.02))]" />
              <div className="absolute inset-x-5 top-0 h-[1px] bg-gradient-to-r from-transparent via-gold-500/22 to-transparent" />
              <div className="mb-3 flex items-center gap-3">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gold-500/35" />
                <span className="text-[12px] tracking-[0.18em] text-gold-300 font-(family-name:--font-display)">
                  卷首题记
                </span>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gold-500/35" />
              </div>
              <p className="text-[14px] leading-[1.7] tracking-[0.01em] text-parchment-300/88 font-(family-name:--font-body)">
                北凉军报催人，旧事如墨。今夜提笔之前，先在案头命簿上择定一条命数，再将风雪、恩仇与生死一并写入此卷。
              </p>
            </div>
          </section>

          <section
            className="relative mx-auto w-full max-w-[560px] overflow-hidden text-leather-900"
            style={{
              backgroundImage: 'url(/panel-bg.png)',
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
            }}
          >
            <div className="relative m-5 border border-[#8c6728]/15 bg-transparent px-10 pb-10 pt-11 sm:m-6 sm:px-12 sm:pb-12 sm:pt-[3.25rem]">
                <div className="mb-6">
                  <div className="mb-2 text-[10px] tracking-[0.3em] text-gold-500/80 font-(family-name:--font-ui)">
                    卷首小引
                  </div>
                  <h2 className="text-[22px] leading-[1.25] tracking-[0.04em] text-leather-900 font-(family-name:--font-display)">
                    选定命数，提笔入局
                  </h2>
                  <p className="mt-2 text-[14px] leading-[1.7] tracking-[0.01em] text-leather-700/80 font-(family-name:--font-body)">
                    先定命数，再启此卷。若前尘未绝，亦可续写旧文；若另有残卷，可引入案头。
                  </p>
                </div>

                <div className="mb-5">
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold-500/40 to-transparent" />
                    <span className="text-[11px] tracking-[0.22em] text-gold-500/85 font-(family-name:--font-ui)">命牌四签</span>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold-500/40 to-transparent" />
                  </div>
                </div>

                <div className="mb-6 grid gap-3 sm:grid-cols-4">
                  {DIFFICULTIES.map(({ key, label, desc, tone }) => {
                    const selected = key === selectedDifficulty;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedDifficulty(key)}
                        className={[
                          'group relative flex min-h-[220px] w-full flex-col items-center justify-between overflow-hidden border px-3 py-5 text-center transition-all duration-200 active:scale-[0.98]',
                          'shadow-[0_8px_14px_rgba(70,42,16,0.18)]',
                          selected
                            ? 'z-10 -translate-y-1 scale-[1.03] border-gold-300 bg-[linear-gradient(180deg,rgba(244,231,194,0.98),rgba(216,192,145,0.94))] shadow-[0_18px_28px_rgba(69,41,16,0.28),0_0_0_1px_rgba(240,208,96,0.42)]'
                            : 'border-[#9b7a42]/28 bg-[linear-gradient(180deg,rgba(215,198,164,0.82),rgba(184,164,126,0.8))] opacity-[0.76] hover:border-gold-500/60 hover:bg-[linear-gradient(180deg,rgba(228,211,177,0.92),rgba(198,179,141,0.88))] hover:opacity-100',
                        ].join(' ')}
                        style={{
                          clipPath: 'polygon(18% 0%, 82% 0%, 100% 12%, 100% 88%, 82% 100%, 18% 100%, 0% 88%, 0% 12%)',
                        }}
                      >
                        <div className="absolute inset-[7px] border border-[#8c6728]/30" style={{ clipPath: 'polygon(18% 0%, 82% 0%, 100% 12%, 100% 88%, 82% 100%, 18% 100%, 0% 88%, 0% 12%)', boxShadow: selected ? 'inset 0 0 0 1px rgba(240,208,96,0.48)' : 'none' }} />
                        {selected ? (
                          <>
                            <div className="absolute right-1 top-5 h-12 w-3 bg-crimson-500/88 shadow-[0_0_12px_rgba(139,26,26,0.34)]" style={{ clipPath: 'polygon(100% 0,100% 100%,0 90%,0 12%)' }} />
                          </>
                        ) : null}
                        <div className="relative flex h-full flex-col items-center justify-between">
                          <div className="text-[12px] tracking-[0.22em] text-gold-600/90 font-(family-name:--font-ui)">命帖</div>
                          <div className="text-[28px] leading-[1.15] tracking-[0.18em] text-leather-900 font-(family-name:--font-display) [writing-mode:vertical-rl]">
                            {label}
                          </div>
                          <div className="space-y-3">
                            <div className="text-[12px] leading-[1.7] text-leather-700/85 font-(family-name:--font-body)">
                              {tone}
                            </div>
                            <div className="text-[11px] tracking-[0.1em] text-gold-600/85 font-(family-name:--font-ui)">
                              {desc}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mb-6 border-t border-b border-gold-500/18 bg-[linear-gradient(180deg,rgba(118,89,42,0.04),rgba(118,89,42,0.10))] px-4 py-3">
                  <div className="text-[10px] tracking-[0.24em] text-gold-500/75 font-(family-name:--font-ui)">
                    案头记
                  </div>
                  <div className="mt-2 text-[14px] leading-[1.8] tracking-[0.02em] text-leather-800/85 font-(family-name:--font-body)">
                    今定命数：{selectedDifficultyConfig.label} · {game ? '前卷未焚，可续其文' : '案头尚无旧卷'}
                  </div>
                </div>

                <div className="flex flex-col items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleStart(selectedDifficulty)}
                    className="min-h-12 w-full max-w-[280px] border border-gold-300 bg-[linear-gradient(180deg,rgba(201,168,76,0.95),rgba(138,109,43,0.98))] px-6 py-4 text-[18px] leading-[1.2] tracking-[0.12em] text-leather-900 shadow-[var(--shadow-gold)] transition-all duration-200 hover:border-gold-100 hover:shadow-[var(--shadow-gold-lg)] active:scale-[0.97] font-(family-name:--font-display)"
                    style={{ clipPath: 'polygon(4% 0, 96% 0, 100% 50%, 96% 100%, 4% 100%, 0 50%)' }}
                  >
                    启此新卷
                  </button>
                  <button
                    type="button"
                    onClick={handleContinue}
                    disabled={!game}
                    className={[
                      'min-h-12 w-full max-w-[220px] border px-5 py-3 text-[15px] leading-[1.2] tracking-[0.1em] transition-all duration-200 active:scale-[0.97] font-(family-name:--font-display)',
                      game
                        ? 'border-gold-500/55 bg-[linear-gradient(180deg,rgba(68,43,20,0.92),rgba(30,18,11,0.96))] text-gold-300 hover:border-gold-300 hover:text-gold-100'
                        : 'cursor-not-allowed border-gold-500/20 bg-[linear-gradient(180deg,rgba(62,41,24,0.50),rgba(28,18,13,0.58))] text-parchment-500',
                    ].join(' ')}
                    style={{ clipPath: 'polygon(6% 0, 94% 0, 100% 50%, 94% 100%, 6% 100%, 0 50%)' }}
                  >
                    续写前卷
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="border-b border-gold-500/40 px-1 py-1 text-[12px] leading-[1.5] tracking-[0.12em] text-gold-600 transition-all duration-200 hover:border-gold-300 hover:text-gold-400 active:scale-[0.97] font-(family-name:--font-ui)"
                  >
                    引旧卷入案
                  </button>
                  <button
                    type="button"
                    onClick={handleExport}
                    disabled={!game}
                    className={[
                      'border-b px-1 py-1 text-[12px] leading-[1.5] tracking-[0.12em] transition-all duration-200 active:scale-[0.97] font-(family-name:--font-ui)',
                      game
                        ? 'border-gold-500/40 text-gold-600 hover:border-gold-300 hover:text-gold-400'
                        : 'cursor-not-allowed border-gold-500/18 text-parchment-500',
                    ].join(' ')}
                  >
                    誊录此卷
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
                    <span className="text-leather-700/65">旧卷尚在，可续前尘；若有异卷，亦可引入案头。</span>
                  )}
                </div>
            </div>
          </section>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex items-center justify-center gap-4 px-6">
        <div className="h-px w-12 bg-gradient-to-r from-transparent to-gold-500/35" />
        <p className="text-[10px] tracking-[0.24em] text-parchment-400/70 font-(family-name:--font-ui)">
          卷一试刻本
        </p>
        <div className="h-px w-12 bg-gradient-to-l from-transparent to-gold-500/35" />
      </div>
    </div>
  );
}
