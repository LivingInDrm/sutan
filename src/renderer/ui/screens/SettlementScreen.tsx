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
  const [selectedRerollIndices, setSelectedRerollIndices] = useState<number[]>([]);
  const [rerollResult, setRerollResult] = useState<ReturnType<typeof rerollCurrentSettlementDice>>(null);
  const [diceOverlaySession, setDiceOverlaySession] = useState(0);
  const [pendingRerollIndices, setPendingRerollIndices] = useState<number[] | null>(null);
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
      setSelectedRerollIndices([]);
      setRerollResult(null);
      setPendingRerollIndices(null);
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
      setSelectedRerollIndices([]);
      setRerollResult(null);
      setPendingRerollIndices(null);
      setDiceFlowPhase(preview.goldenDice > 0 ? 'pre-roll' : 'roll');
      setDiceOverlaySession(1);
      setShowDiceOverlay(true);
      return;
    }
    executeCurrentSettlement();
  }, [executeCurrentSettlement, getCurrentDiceCheckPreview]);

  const handleDiceOverlayComplete = useCallback((result: { dice: [number, number, number] }) => {
    console.log('[SettlementScreen] handleDiceOverlayComplete', result);
    if (pendingRerollIndices && rolledDice) {
      const rerollStageResult = rerollCurrentSettlementDice(rolledDice, pendingRerollIndices, {
        goldenDiceUsed: selectedGoldenDice,
      });

      if (!rerollStageResult?.dice_check_state) {
        return;
      }

      setRolledDice(rerollStageResult.dice_check_state.dice);
      setRerollResult(rerollStageResult);
      setSelectedRerollIndices([]);
      setPendingRerollIndices(null);

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
    setSelectedRerollIndices([]);
    setRerollResult(null);
    if ((dicePreview?.rerollAvailable ?? 0) > 0) {
      setPendingRerollIndices(null);
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
  }, [dicePreview?.rerollAvailable, executeCurrentSettlement, executeCurrentSettlementWithDice, pendingRerollIndices, rerollCurrentSettlementDice, rolledDice, selectedGoldenDice]);

  const handleDiceOverlayCancel = useCallback(() => {
    console.log('[SettlementScreen] handleDiceOverlayCancel');
    setShowDiceOverlay(false);
    setDicePreview(null);
    setDiceFlowPhase('pre-roll');
    setSelectedGoldenDice(0);
    setRolledDice(null);
    setSelectedRerollIndices([]);
    setRerollResult(null);
    setPendingRerollIndices(null);
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
      rerolled_indices: selectedRerollIndices,
    } : null);
  }, [currentStagePlayback?.settlementConfig, currentStageSettlementResult?.result_key, dicePreview?.dc, dicePreview?.modifier, rerollResult, rolledDice, selectedGoldenDice, selectedRerollIndices]);

  const toggleRerollSelection = useCallback((index: number) => {
    const limit = dicePreview?.rerollAvailable ?? 0;
    setSelectedRerollIndices(prev => {
      if (prev.includes(index)) {
        return prev.filter(item => item !== index);
      }
      if (prev.length >= limit) {
        return prev;
      }
      return [...prev, index].sort((a, b) => a - b);
    });
  }, [dicePreview?.rerollAvailable]);

  const handleConfirmGoldenDice = useCallback(() => {
    setPendingRerollIndices(null);
    setDiceOverlaySession(value => value + 1);
    setDiceFlowPhase('roll');
  }, []);

  const handleConfirmReroll = useCallback(() => {
    if (!rolledDice || selectedRerollIndices.length === 0) {
      return;
    }
    setPendingRerollIndices(selectedRerollIndices);
    setDiceOverlaySession(value => value + 1);
    setDiceFlowPhase('roll');
  }, [rolledDice, selectedRerollIndices]);

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
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 backdrop-blur-sm px-6">
              <Panel variant="dark" title="命骰判定" className="w-full max-w-xl">
                <div className="space-y-5">
                  <div className="rounded-xl border border-gold-300/20 bg-ink-light/40 p-4 text-sm text-parchment-100">
                    <div>判定修正：<span className="text-gold">{dicePreview.modifier >= 0 ? '+' : '-'}{Math.abs(dicePreview.modifier)}</span></div>
                    <div>难度 DC：<span className="text-gold">{dicePreview.dc}</span></div>
                    <div>现有金骰：<span className="text-gold">{dicePreview.goldenDice}</span></div>
                    <div className="text-gold-dim mt-1">每消耗 1 个金骰 = modifier +1</div>
                  </div>
                  <div>
                    <div className="mb-2 text-sm text-gold-dim">使用金骰：{selectedGoldenDice}</div>
                    <div className="flex items-center gap-3">
                      <Button variant="secondary" size="sm" onClick={() => setSelectedGoldenDice(value => Math.max(0, value - 1))}>-</Button>
                      <input
                        type="range"
                        min={0}
                        max={dicePreview.goldenDice}
                        value={selectedGoldenDice}
                        onChange={(event) => setSelectedGoldenDice(Number(event.target.value))}
                        className="flex-1 accent-gold"
                      />
                      <Button variant="secondary" size="sm" onClick={() => setSelectedGoldenDice(value => Math.min(dicePreview.goldenDice, value + 1))}>+</Button>
                    </div>
                    <div className="mt-2 text-xs text-gold-dim">当前总 modifier：{dicePreview.modifier >= 0 ? '+' : '-'}{Math.abs(dicePreview.modifier)} {selectedGoldenDice > 0 ? `+ ${selectedGoldenDice}` : ''}</div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button variant="ghost" size="sm" onClick={handleDiceOverlayCancel}>取消</Button>
                    <Button variant="primary" size="sm" glow onClick={handleConfirmGoldenDice}>进入掷骰</Button>
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
              <Panel variant="dark" title="选择要重投的骰子" className="w-full max-w-xl">
                <div className="space-y-5">
                  <div className="text-sm text-gold-dim">可用重投次数：{dicePreview.rerollAvailable}</div>
                  <div className="flex justify-center gap-4">
                    {displayedDiceState.dice.map((value, index) => {
                      const selected = selectedRerollIndices.includes(index);
                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => toggleRerollSelection(index)}
                          className={`h-14 w-14 rounded-xl border-2 text-lg font-bold transition ${selected ? 'border-cerulean-300 bg-cerulean-900/30 text-cerulean-100' : 'border-gold-300/30 bg-ink-light/40 text-parchment-100 hover:border-gold-300/60'}`}
                        >
                          {value}
                        </button>
                      );
                    })}
                  </div>
                  <div className="rounded-xl border border-gold-300/20 bg-ink-light/30 p-4 text-center">
                    <DiceResult
                      dice={displayedDiceState.dice}
                      rerolledIndices={displayedDiceState.rerolled_indices ?? []}
                      explodedStartIndex={3}
                      successThreshold={7}
                    />
                    <div className="mt-3 text-sm text-parchment-100">
                      {displayedDiceState.dice.join(' + ')} {displayedDiceState.modifier >= 0 ? '+' : '-'} {Math.abs(displayedDiceState.modifier)} = {displayedDiceState.total} / DC {displayedDiceState.dc_with_offset}
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        executeCurrentSettlementWithDice(displayedDiceState.dice, { goldenDiceUsed: selectedGoldenDice });
                        setShowDiceOverlay(false);
                        setDicePreview(null);
                        setDiceFlowPhase('result');
                        setPendingRerollIndices(null);
                      }}
                    >
                      跳过重投
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      glow
                      disabled={selectedRerollIndices.length === 0}
                      onClick={handleConfirmReroll}
                    >
                      确认重投 ({selectedRerollIndices.length}/{dicePreview.rerollAvailable})
                    </Button>
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
