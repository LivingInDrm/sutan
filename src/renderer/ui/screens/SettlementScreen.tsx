import React, { useMemo } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useUIStore } from '../../stores/uiStore';
import { Panel } from '../components/common/Panel';
import { Button } from '../components/common/Button';
import { EventSettlementFrame } from '../components/settlement/EventSettlementFrame';
import { PlayerChoicePrompt, SettlementLeftPanel, SettlementRightPanel } from '../components/settlement/SettlementPanels';
import { DiceResult } from '../components/dice/DiceComponent';
import type { Card, SettlementResult } from '../../core/types';
import { getSceneBackdropUrl } from '../../lib/assetPaths';
import { DiceBoxOverlay } from '../components/dice/DiceBoxOverlay';
import { ATTR_LABELS } from '../constants/labels';
import { useDiceSession } from '../hooks/useDiceSession';
import { useSettlementFlow } from '../hooks/useSettlementFlow';

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
  const checkConfig = currentStagePlayback?.settlementConfig?.type === 'dice_check'
    ? currentStagePlayback.settlementConfig.check
    : null;
  const diceSession = useDiceSession({
    isPlaying,
    checkConfig,
    resultKey: currentStageSettlementResult?.result_key,
    getCurrentDiceCheckPreview,
    executeCurrentSettlement,
    executeCurrentSettlementWithDice,
    rerollCurrentSettlementDice,
  });
  const settlementFlow = useSettlementFlow({
    isPlaying,
    currentStagePlayback,
    allStageResults: settlement.currentRunner?.allStageResults ?? [],
    narrativeIndex,
    currentStageSettlementResult,
    advanceNarrative,
    advanceAfterSettlement,
    onAutoTriggerDice: diceSession.actions.startRoll,
  });

  const diceCheckAttributeLabel = useMemo(() => {
    const checkConfig = currentStagePlayback?.settlementConfig?.type === 'dice_check'
      ? currentStagePlayback.settlementConfig.check
      : null;

    if (!checkConfig) {
      return '鉴定';
    }

    return `${ATTR_LABELS[checkConfig.attribute] || checkConfig.attribute}鉴定`;
  }, [currentStagePlayback?.settlementConfig]);

  if (!isPlaying) {
    return <SummaryView results={lastResults} />;
  }

  const narrative = settlementFlow.narrative;
  const isNarrativeComplete = settlementFlow.isNarrativeComplete;
  const hasSettlement = settlementFlow.hasSettlement;
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

  const leftContent = (
    <SettlementLeftPanel
      sceneName={sceneName}
      investedCards={investedCards}
      hasSettlement={hasSettlement}
      isNarrativeComplete={isNarrativeComplete}
      settlementResult={currentStageSettlementResult}
      settlementConfig={currentStagePlayback?.settlementConfig}
      suppressResult={diceSession.showDiceOverlay}
      onExecute={settlementFlow.actions.executeSettlement}
    />
  );

  const rightContent = (
    <SettlementRightPanel
      narrative={narrative}
      narrativeIndex={narrativeIndex}
      onAdvance={settlementFlow.actions.advanceNarrative}
      onChoice={handleNarrativeChoice}
      settlementResult={currentStageSettlementResult}
      onContinue={settlementFlow.actions.acceptResult}
      isNarrativeComplete={isNarrativeComplete}
      hasSettlement={hasSettlement}
      historyNodes={settlementFlow.fullHistory}
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
      {diceSession.showDiceOverlay && (
        <>
          {(diceSession.diceFlowPhase === 'roll' || diceSession.diceFlowPhase === 'post-roll') && (
            <DiceBoxOverlay
              key={diceSession.diceOverlaySession}
              fallbackSeed={game?.rng.seed}
              onComplete={diceSession.actions.handleRollComplete}
              onCancel={diceSession.actions.handleDiceOverlayCancel}
              visible={diceSession.showDiceOverlay && diceSession.diceFlowPhase === 'roll'}
              checkTitle={diceCheckAttributeLabel}
              checkModifier={diceSession.dicePreview?.modifier ?? 0}
              checkDc={diceSession.dicePreview?.dc}
              availableGoldenDice={diceSession.dicePreview?.goldenDice ?? 0}
              selectedGoldenDice={diceSession.selectedGoldenDice}
              onGoldenDiceChange={diceSession.setSelectedGoldenDice}
              resultSummaryText={diceSession.dicePreview ? `3d6 ${(diceSession.dicePreview.modifier + diceSession.selectedGoldenDice) >= 0 ? '+' : '-'} ${Math.abs(diceSession.dicePreview.modifier + diceSession.selectedGoldenDice)} vs DC ${diceSession.dicePreview.dc}` : null}
            />
          )}
          {diceSession.diceFlowPhase === 'post-roll' && diceSession.displayedDiceState && diceSession.dicePreview ? (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/72 backdrop-blur-sm px-6">
              <Panel variant="dark" title="收骰再断" className="w-full max-w-2xl rounded-[24px] border-[#8a6d2b]/35 bg-[linear-gradient(180deg,rgba(20,12,8,0.94),rgba(12,8,6,0.98))]">
                <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="space-y-4">
                    <div className="text-sm text-gold-dim font-(family-name:--font-body)">可用重投次数：{diceSession.dicePreview.rerollAvailable}</div>
                    <div className="rounded-[16px] border border-gold-300/20 bg-ink-light/30 p-4 text-center">
                      <DiceResult
                        dice={diceSession.displayedDiceState.dice}
                        rerolledIndices={diceSession.displayedDiceState.rerolled_indices ?? []}
                        explodedStartIndex={3}
                        successThreshold={7}
                      />
                      <div className="mt-3 text-sm text-parchment-100 font-(family-name:--font-body)">
                        {diceSession.displayedDiceState.dice.join(' + ')} {diceSession.displayedDiceState.modifier >= 0 ? '+' : '-'} {Math.abs(diceSession.displayedDiceState.modifier)} = {diceSession.displayedDiceState.total} / DC {diceSession.displayedDiceState.dc_with_offset}
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
                        onClick={diceSession.actions.handleAcceptResult}
                      >
                        就此落印
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        glow
                        onClick={diceSession.actions.handleReroll}
                      >
                        全部重投（剩余{diceSession.dicePreview.rerollAvailable}次）
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
