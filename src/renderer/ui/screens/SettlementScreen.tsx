import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useUIStore } from '../../stores/uiStore';
import { Panel } from '../components/common/Panel';
import { Button } from '../components/common/Button';
import { EventSettlementFrame } from '../components/settlement/EventSettlementFrame';
import { PlayerChoicePrompt, SettlementLeftPanel, SettlementRightPanel } from '../components/settlement/SettlementPanels';
import { DiceResult } from '../components/dice/DiceComponent';
import type { Card, NarrativeNode, SettlementResult } from '../../core/types';
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
                  dice={result.dice_check_state.initial_roll.all_dice}
                  explodedStartIndex={result.dice_check_state.initial_roll.dice.length}
                />
                <div className="text-center mt-3">
                  <span className="text-sm text-gold-dim">
                    成功: {result.dice_check_state.final_successes} / 目标: {result.dice_check_state.config.target}
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
  const getCurrentDiceCheckPreview = useGameStore(s => s.getCurrentDiceCheckPreview);
  const advanceAfterSettlement = useGameStore(s => s.advanceAfterSettlement);
  const game = useGameStore(s => s.game);

  const { isPlaying, currentStagePlayback, narrativeIndex, currentStageSettlementResult } = settlement;

  const [historyNodes, setHistoryNodes] = useState<NarrativeNode[]>([]);
  const [showDiceOverlay, setShowDiceOverlay] = useState(false);
  const [pendingDicePoolSize, setPendingDicePoolSize] = useState(0);
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
      setPendingDicePoolSize(0);
      prevStageIdRef.current = null;
      prevSettlementNarrativeRef.current = null;
    }
  }, [isPlaying]);

  const handleExecuteSettlement = useCallback(() => {
    const preview = getCurrentDiceCheckPreview();
    if (preview) {
      setPendingDicePoolSize(preview.poolSize);
      setShowDiceOverlay(true);
    }
  }, [getCurrentDiceCheckPreview]);

  const handleDiceOverlayComplete = useCallback((result: { dice: number[]; explodedDice: number[] }) => {
    executeCurrentSettlementWithDice(result.dice, result.explodedDice);
    setShowDiceOverlay(false);
  }, [executeCurrentSettlementWithDice]);

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
      {showDiceOverlay && pendingDicePoolSize > 0 && (
        <DiceBoxOverlay
          poolSize={pendingDicePoolSize}
          onComplete={handleDiceOverlayComplete}
          visible={showDiceOverlay}
        />
      )}
    </>
  );
}
