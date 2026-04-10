import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useUIStore } from '../../stores/uiStore';
import { Panel } from '../components/common/Panel';
import { Button } from '../components/common/Button';
import { EventSettlementFrame } from '../components/settlement/EventSettlementFrame';
import { PlayerChoicePrompt, SettlementLeftPanel, SettlementRightPanel } from '../components/settlement/SettlementPanels';
import { DiceResult } from '../components/dice/DiceComponent';
import type { Card, NarrativeNode, SettlementResult, DiceCheckState } from '../../core/types';
import { CheckResult } from '../../core/types/enums';
import { getSceneBackdropUrl } from '../../lib/assetPaths';
import { DiceBoxOverlay } from '../components/dice/DiceBoxOverlay';
import { ATTR_LABELS } from '../constants/labels';

const RESULT_COLORS: Record<string, string> = {
  success: 'text-bamboo-300',
  partial_success: 'text-yellow-400',
  failure: 'text-red-400',
  critical_failure: 'text-red-600',
};

const RESULT_LABELS: Record<string, string> = {
  success: '大成功',
  partial_success: '部分成功',
  failure: '失败',
  critical_failure: '大失败',
};

function SummaryView({ results }: { results: SettlementResult[] }) {
  const setScreen = useUIStore(s => s.setScreen);

  return (
    <div className="h-full p-6 overflow-auto">
      <h2 className="text-xl font-bold text-gold mb-6 text-glow-gold">结算总览</h2>

      {results.length === 0 && (
        <div className="text-gold-dim text-center py-12">无结算结果。</div>
      )}

      <div className="flex flex-col gap-6 max-w-2xl mx-auto">
        {results.map((result, idx) => (
          <Panel key={idx} variant="dark" title={result.scene_id}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-parchment-light">{result.scene_id}</h3>
              <span className="text-xs px-2 py-1 bg-ink-light rounded text-gold-dim">
                {result.settlement_type}
              </span>
            </div>

            <p className="text-sm text-parchment/70 mb-4 italic">{result.narrative}</p>

            {result.dice_check_state && (
              <div className="mb-4">
                <DiceResult
                  dice={result.dice_check_state.dice}
                  explodedStartIndex={3}
                  successThreshold={7}
                />
                <div className="text-center mt-3">
                  <span className="text-sm text-gold-dim">
                    {result.dice_check_state.dice.join(' + ')} {result.dice_check_state.modifier >= 0 ? '+' : '-'} {Math.abs(result.dice_check_state.modifier)} = {result.dice_check_state.total} / DC {result.dice_check_state.dc_with_offset}
                  </span>
                </div>
              </div>
            )}

            {result.result_key && (
              <div className={`text-center text-lg font-bold ${RESULT_COLORS[result.result_key] || 'text-gold-dim'}`}>
                {RESULT_LABELS[result.result_key] || result.result_key}
              </div>
            )}

            {Object.keys(result.effects_applied).length > 0 && (
              <div className="mt-3 p-2 bg-ink-light/40 rounded text-xs">
                {result.effects_applied.gold && (
                  <span className={`mr-3 ${result.effects_applied.gold > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                    金币: {result.effects_applied.gold > 0 ? '+' : ''}{result.effects_applied.gold}
                  </span>
                )}
                {result.effects_applied.reputation && (
                  <span className={result.effects_applied.reputation > 0 ? 'text-cerulean-300' : 'text-red-400'}>
                    声望: {result.effects_applied.reputation > 0 ? '+' : ''}{result.effects_applied.reputation}
                  </span>
                )}
              </div>
            )}
          </Panel>
        ))}
      </div>

      <div className="text-center mt-8">
        <Button variant="primary" size="lg" glow onClick={() => setScreen('world_map')}>
          继续
        </Button>
      </div>
    </div>
  );
}

export function SettlementScreen() {
  const settlement = useGameStore(s => s.settlement);
  const lastResults = useGameStore(s => s.lastSettlementResults);
  const advanceNarrative = useGameStore(s => s.advanceNarrative);
  const handleNarrativeChoice = useGameStore(s => s.handleNarrativeChoice);
  const executeCurrentSettlement = useGameStore(s => s.executeCurrentSettlement);
  const executeCurrentSettlementWithDice = useGameStore(s => s.executeCurrentSettlementWithDice);
  const rerollCurrentSettlementDice = useGameStore(s => s.rerollCurrentSettlementDice);
  const getCurrentDiceCheckPreview = useGameStore(s => s.getCurrentDiceCheckPreview);
  const advanceAfterSettlement = useGameStore(s => s.advanceAfterSettlement);
  const game = useGameStore(s => s.game);

  const { isPlaying, currentStagePlayback, narrativeIndex, currentStageSettlementResult } = settlement;

  const [historyNodes, setHistoryNodes] = useState<NarrativeNode[]>([]);
  const [showDiceOverlay, setShowDiceOverlay] = useState(false);
  const [dicePreview, setDicePreview] = useState<{ modifier: number; dc: number; goldenDice: number; rerollAvailable: number } | null>(null);
  const [diceFlowPhase, setDiceFlowPhase] = useState<'pre-roll' | 'roll' | 'post-roll' | 'result'>('pre-roll');
  const [selectedGoldenDice, setSelectedGoldenDice] = useState(0);
  const [rolledDice, setRolledDice] = useState<[number, number, number] | null>(null);
  const [rerollResult, setRerollResult] = useState<ReturnType<typeof rerollCurrentSettlementDice>>(null);
  const [diceOverlaySession, setDiceOverlaySession] = useState(0);
  const [isPendingReroll, setIsPendingReroll] = useState(false);
  const prevStageIdRef = useRef<string | null>(null);
  const prevSettlementNarrativeRef = useRef<string | null>(null);

  const currentStageId = currentStagePlayback?.stageId ?? null;

  useEffect(() => {
    if (currentStageId && currentStageId !== prevStageIdRef.current) {
      if (prevStageIdRef.current !== null) {
        const prevNarrative = prevStageIdRef.current;
        setHistoryNodes(prev => {
          const newHistory = [...prev];
          const prevPlayback = settlement.currentRunner?.allStageResults.find(
            r => r.stage_id === prevNarrative
          );
          if (prevPlayback) {
            for (const node of prevPlayback.narrative_played) {
              newHistory.push(node);
            }
          }
          return newHistory;
        });
      }
      prevStageIdRef.current = currentStageId;
    }
  }, [currentStageId]);

  useEffect(() => {
    if (currentStageSettlementResult?.narrative && currentStageSettlementResult.narrative !== prevSettlementNarrativeRef.current) {
      prevSettlementNarrativeRef.current = currentStageSettlementResult.narrative;
    }
  }, [currentStageSettlementResult]);

  useEffect(() => {
    if (!isPlaying) {
      setHistoryNodes([]);
      setShowDiceOverlay(false);
      setDicePreview(null);
      setDiceFlowPhase('pre-roll');
      setSelectedGoldenDice(0);
      setRolledDice(null);
      setRerollResult(null);
      setIsPendingReroll(false);
      setDiceOverlaySession(0);
      prevStageIdRef.current = null;
      prevSettlementNarrativeRef.current = null;
    }
  }, [isPlaying]);

  const handleExecuteSettlement = useCallback(() => {
    const preview = getCurrentDiceCheckPreview();
    console.log('[SettlementScreen] handleExecuteSettlement', {
      preview,
      modifier: preview?.modifier ?? 0,
    });
    if (preview) {
      setDicePreview(preview);
      setSelectedGoldenDice(0);
      setRolledDice(null);
      setRerollResult(null);
      setIsPendingReroll(false);
      setDiceFlowPhase(preview.goldenDice > 0 ? 'pre-roll' : 'roll');
      setDiceOverlaySession(1);
      setShowDiceOverlay(true);
      return;
    }
    executeCurrentSettlement();
  }, [executeCurrentSettlement, getCurrentDiceCheckPreview]);

  const handleDiceOverlayComplete = useCallback((result: { dice: [number, number, number] }) => {
    console.log('[SettlementScreen] handleDiceOverlayComplete', result);
    if (isPendingReroll && rolledDice) {
      const rerollStageResult = rerollCurrentSettlementDice(rolledDice, {
        goldenDiceUsed: selectedGoldenDice,
      });

      if (!rerollStageResult?.dice_check_state) {
        return;
      }

      setRolledDice(rerollStageResult.dice_check_state.dice);
      setRerollResult(rerollStageResult);
      setIsPendingReroll(false);

      try {
        executeCurrentSettlementWithDice(rerollStageResult.dice_check_state.dice, { goldenDiceUsed: selectedGoldenDice });
        setDiceFlowPhase('result');
        setShowDiceOverlay(false);
        setDicePreview(null);
      } catch (error) {
        console.error('[SettlementScreen] reroll settlement failed', error);
      }
      return;
    }

    setRolledDice(result.dice);
    setRerollResult(null);
    if ((dicePreview?.rerollAvailable ?? 0) > 0) {
      setIsPendingReroll(false);
      setDiceFlowPhase('post-roll');
      return;
    }
    try {
      executeCurrentSettlementWithDice(result.dice, { goldenDiceUsed: selectedGoldenDice });
      setDiceFlowPhase('result');
      setShowDiceOverlay(false);
      setDicePreview(null);
    } catch (error) {
      console.error('[SettlementScreen] executeCurrentSettlementWithDice failed', error);
      setShowDiceOverlay(false);
      setDicePreview(null);
      executeCurrentSettlement({
        goldenDiceUsed: selectedGoldenDice,
        externalRoll: {
          dice: result.dice,
          sum: result.dice.reduce((sum, value) => sum + value, 0),
        },
      });
    }
  }, [dicePreview?.rerollAvailable, executeCurrentSettlement, executeCurrentSettlementWithDice, isPendingReroll, rerollCurrentSettlementDice, rolledDice, selectedGoldenDice]);

  const handleDiceOverlayCancel = useCallback(() => {
    console.log('[SettlementScreen] handleDiceOverlayCancel');
    setShowDiceOverlay(false);
    setDicePreview(null);
    setDiceFlowPhase('pre-roll');
    setSelectedGoldenDice(0);
    setRolledDice(null);
    setRerollResult(null);
    setIsPendingReroll(false);
    executeCurrentSettlement();
  }, [executeCurrentSettlement]);

  const displayedDiceState = useMemo<DiceCheckState | null>(() => {
    const fallbackConfig = {
      attribute: 'combat' as DiceCheckState['config']['attribute'],
      slots: [],
      opponent_value: 0,
      dc: dicePreview?.dc ?? 0,
    };

    return rerollResult?.dice_check_state ?? (rolledDice ? {
      config: currentStagePlayback?.settlementConfig?.type === 'dice_check'
        ? currentStagePlayback.settlementConfig.check
        : fallbackConfig,
      dice: rolledDice,
      modifier: (dicePreview?.modifier ?? 0) + selectedGoldenDice,
      total: rolledDice.reduce((sum, value) => sum + value, 0) + (dicePreview?.modifier ?? 0) + selectedGoldenDice,
      dc_with_offset: dicePreview?.dc ?? 0,
      result: currentStageSettlementResult?.result_key ?? CheckResult.Failure,
      rerolled_indices: isPendingReroll ? [0, 1, 2] : [],
    } : null);
  }, [currentStagePlayback?.settlementConfig, currentStageSettlementResult?.result_key, dicePreview?.dc, dicePreview?.modifier, isPendingReroll, rerollResult, rolledDice, selectedGoldenDice]);

  const diceCheckAttributeLabel = useMemo(() => {
    const checkConfig = currentStagePlayback?.settlementConfig?.type === 'dice_check'
      ? currentStagePlayback.settlementConfig.check
      : null;

    if (!checkConfig) {
      return '鉴定';
    }

    return `${ATTR_LABELS[checkConfig.attribute] || checkConfig.attribute}鉴定`;
  }, [currentStagePlayback?.settlementConfig]);

  const handleConfirmGoldenDice = useCallback(() => {
    setIsPendingReroll(false);
    setDiceOverlaySession(value => value + 1);
    setDiceFlowPhase('roll');
  }, []);

  const handleConfirmReroll = useCallback(() => {
    if (!rolledDice) {
      return;
    }
    setIsPendingReroll(true);
    setDiceOverlaySession(value => value + 1);
    setDiceFlowPhase('roll');
  }, [rolledDice]);

  if (!isPlaying) {
    return <SummaryView results={lastResults} />;
  }

  const narrative = currentStagePlayback?.narrative || [];
  const isNarrativeComplete = narrativeIndex >= narrative.length;
  const hasSettlement = currentStagePlayback?.hasSettlement || false;
  const shouldShowPlayerChoicePrompt = isNarrativeComplete
    && hasSettlement
    && !currentStageSettlementResult
    && currentStagePlayback?.settlementConfig?.type === 'player_choice';

  const scene = settlement.currentRunner
    ? game?.sceneManager.getScene(settlement.currentRunner.sceneId)
    : null;
  const sceneName = scene?.name || '';
  const backgroundImageUrl = getSceneBackdropUrl(scene?.background_image) ?? undefined;

  const sceneState = settlement.currentRunner
    ? game?.sceneManager.getSceneState(settlement.currentRunner.sceneId)
    : null;
  const investedCards: Card[] = sceneState?.invested_cards
    ? sceneState.invested_cards
        .map(id => game?.cardManager.getCard(id)?.data)
        .filter(Boolean) as Card[]
    : [];

  const fullHistory = [...historyNodes];
  if (prevSettlementNarrativeRef.current && currentStageSettlementResult === null) {
    fullHistory.push({ type: 'narration', text: prevSettlementNarrativeRef.current } as NarrativeNode);
  }

  const leftContent = (
    <SettlementLeftPanel
      sceneName={sceneName}
      investedCards={investedCards}
      hasSettlement={hasSettlement}
      isNarrativeComplete={isNarrativeComplete}
      settlementResult={currentStageSettlementResult}
      settlementConfig={currentStagePlayback?.settlementConfig}
      suppressResult={showDiceOverlay}
      onExecute={handleExecuteSettlement}
    />
  );

  const rightContent = (
    <SettlementRightPanel
      narrative={narrative}
      narrativeIndex={narrativeIndex}
      onAdvance={advanceNarrative}
      onChoice={handleNarrativeChoice}
      settlementResult={currentStageSettlementResult}
      onContinue={advanceAfterSettlement}
      isNarrativeComplete={isNarrativeComplete}
      hasSettlement={hasSettlement}
      historyNodes={fullHistory}
      settlementConfig={currentStagePlayback?.settlementConfig}
    />
  );

  return (
    <>
      <EventSettlementFrame
        leftContent={leftContent}
        rightContent={rightContent}
        rightTitle={sceneName}
        backgroundImageUrl={backgroundImageUrl}
      />
      {shouldShowPlayerChoicePrompt && currentStagePlayback?.settlementConfig?.type === 'player_choice' && (
        <PlayerChoicePrompt
          settlement={currentStagePlayback.settlementConfig}
          onSelect={(choiceIndex) => executeCurrentSettlement({ choiceIndex })}
        />
      )}
      {showDiceOverlay && (
        <>
          {diceFlowPhase === 'pre-roll' && dicePreview ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 backdrop-blur-sm px-4 py-4 sm:px-6">
              <Panel variant="dark" title="命骰判定" className="flex max-h-[min(92vh,760px)] w-full max-w-xl flex-col overflow-hidden rounded-[24px] border-[#8a6d2b]/35 bg-[linear-gradient(180deg,rgba(20,12,8,0.94),rgba(12,8,6,0.98))]">
                <div className="flex flex-1 flex-col gap-4 p-1">
                  <div className="rounded-[16px] border border-gold-300/18 bg-[linear-gradient(180deg,rgba(201,168,76,0.08),rgba(26,15,10,0.3))] p-4 text-parchment-100">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="text-[18px] tracking-[0.04em] text-parchment-100 font-(family-name:--font-display)">
                        {diceCheckAttributeLabel}
                      </div>
                      <div className="text-[15px] text-gold font-(family-name:--font-display)">
                        修正 {dicePreview.modifier >= 0 ? '+' : '-'}{Math.abs(dicePreview.modifier)}
                        {selectedGoldenDice > 0 ? ` +${selectedGoldenDice}` : ''}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between rounded-[12px] bg-black/18 px-3 py-2 text-sm font-(family-name:--font-body)">
                      <span className="text-gold-dim">难度 DC</span>
                      <span className="text-lg text-gold">{dicePreview.dc}</span>
                    </div>
                  </div>

                  {dicePreview.goldenDice > 0 ? (
                    <div className="rounded-[16px] border border-gold-300/14 bg-ink-light/20 p-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="text-[10px] tracking-[0.24em] text-gold-300/72 font-(family-name:--font-ui)">金骰选择</div>
                        <div className="text-sm text-gold-dim font-(family-name:--font-body)">可用 {dicePreview.goldenDice}</div>
                      </div>
                      <div className="mb-3 text-[15px] text-parchment-100 font-(family-name:--font-display)">使用金骰：{selectedGoldenDice}</div>
                      <div className="flex items-center gap-3">
                        <Button variant="secondary" size="sm" onClick={() => setSelectedGoldenDice(value => Math.max(0, value - 1))}>减一枚</Button>
                        <input
                          type="range"
                          min={0}
                          max={dicePreview.goldenDice}
                          value={selectedGoldenDice}
                          onChange={(event) => setSelectedGoldenDice(Number(event.target.value))}
                          className="flex-1 accent-gold"
                        />
                        <Button variant="secondary" size="sm" onClick={() => setSelectedGoldenDice(value => Math.min(dicePreview.goldenDice, value + 1))}>添一枚</Button>
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-auto flex justify-end gap-3 pt-2">
                    <Button variant="ghost" size="sm" onClick={handleDiceOverlayCancel}>退卷</Button>
                    <Button variant="primary" size="sm" glow onClick={handleConfirmGoldenDice}>掷骰子</Button>
                  </div>
                </div>
              </Panel>
            </div>
          ) : null}
          {(diceFlowPhase === 'roll' || diceFlowPhase === 'post-roll') && (
            <DiceBoxOverlay
              key={diceOverlaySession}
              fallbackSeed={game?.rng.seed}
              onComplete={handleDiceOverlayComplete}
              onCancel={handleDiceOverlayCancel}
              visible={showDiceOverlay && diceFlowPhase === 'roll'}
              resultSummaryText={dicePreview ? `3d6 ${(dicePreview.modifier + selectedGoldenDice) >= 0 ? '+' : '-'} ${Math.abs(dicePreview.modifier + selectedGoldenDice)} vs DC ${dicePreview.dc}` : null}
            />
          )}
          {diceFlowPhase === 'post-roll' && displayedDiceState && dicePreview ? (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/72 backdrop-blur-sm px-6">
              <Panel variant="dark" title="收骰再断" className="w-full max-w-2xl rounded-[24px] border-[#8a6d2b]/35 bg-[linear-gradient(180deg,rgba(20,12,8,0.94),rgba(12,8,6,0.98))]">
                <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="space-y-4">
                    <div className="text-sm text-gold-dim font-(family-name:--font-body)">可用重投次数：{dicePreview.rerollAvailable}</div>
                    <div className="rounded-[16px] border border-gold-300/20 bg-ink-light/30 p-4 text-center">
                      <DiceResult
                        dice={displayedDiceState.dice}
                        rerolledIndices={displayedDiceState.rerolled_indices ?? []}
                        explodedStartIndex={3}
                        successThreshold={7}
                      />
                      <div className="mt-3 text-sm text-parchment-100 font-(family-name:--font-body)">
                        {displayedDiceState.dice.join(' + ')} {displayedDiceState.modifier >= 0 ? '+' : '-'} {Math.abs(displayedDiceState.modifier)} = {displayedDiceState.total} / DC {displayedDiceState.dc_with_offset}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-[18px] border border-gold-300/14 bg-[linear-gradient(180deg,rgba(201,168,76,0.07),rgba(26,15,10,0.24))] p-5">
                    <div className="text-[10px] tracking-[0.28em] text-gold-300/74 font-(family-name:--font-ui)">重投批注</div>
                    <div className="mt-3 text-[14px] leading-[1.9] text-parchment-100 font-(family-name:--font-body)">
                      若要再搏一次，需将三枚命骰尽数重掷。若就此收骰，便按当前结果落印。
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          executeCurrentSettlementWithDice(displayedDiceState.dice, { goldenDiceUsed: selectedGoldenDice });
                          setShowDiceOverlay(false);
                          setDicePreview(null);
                          setDiceFlowPhase('result');
                          setIsPendingReroll(false);
                        }}
                      >
                        就此落印
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        glow
                        onClick={handleConfirmReroll}
                      >
                        全部重投（剩余{dicePreview.rerollAvailable}次）
                      </Button>
                    </div>
                  </div>
                </div>
              </Panel>
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
