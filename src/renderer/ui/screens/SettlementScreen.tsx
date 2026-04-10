import React, { useMemo } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { EventSettlementFrame } from '../components/settlement/EventSettlementFrame';
import { PlayerChoicePrompt, SettlementLeftPanel, SettlementRightPanel } from '../components/settlement/SettlementPanels';
import { SettlementDiceRerollModal, SettlementSummaryView } from '../components/settlement/SettlementPanels';
import type { Card } from '../../core/types';
import { getSceneBackdropUrl } from '../../lib/assetPaths';
import { DiceBoxOverlay } from '../components/dice/DiceBoxOverlay';
import { ATTR_LABELS } from '../constants/labels';
import { useDiceSession } from '../hooks/useDiceSession';
import { useSettlementFlow } from '../hooks/useSettlementFlow';

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
    return <SettlementSummaryView results={lastResults} />;
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
            <SettlementDiceRerollModal
              diceState={diceSession.displayedDiceState}
              rerollAvailable={diceSession.dicePreview.rerollAvailable}
              onAccept={diceSession.actions.handleAcceptResult}
              onReroll={diceSession.actions.handleReroll}
            />
          ) : null}
        </>
      )}
    </>
  );
}
