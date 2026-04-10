import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DiceCheckState } from '../../core/types';
import { CheckResult } from '../../core/types/enums';

type DicePreview = {
  modifier: number;
  dc: number;
  goldenDice: number;
  rerollAvailable: number;
};

type DiceTuple = [number, number, number];

type RerollStageResult = {
  dice_check_state?: DiceCheckState | null;
} | null;

interface UseDiceSessionOptions {
  isPlaying: boolean;
  checkConfig: DiceCheckState['config'] | null;
  resultKey?: string | null;
  getCurrentDiceCheckPreview: () => DicePreview | null;
  executeCurrentSettlement: (options?: {
    choiceIndex?: number;
    goldenDiceUsed?: number;
    externalRoll?: { dice: DiceTuple; sum: number };
  }) => void;
  executeCurrentSettlementWithDice: (dice: DiceTuple, options?: { goldenDiceUsed?: number }) => void;
  rerollCurrentSettlementDice: (baseDice: DiceTuple, options?: { goldenDiceUsed?: number }) => RerollStageResult;
}

export function useDiceSession({
  isPlaying,
  checkConfig,
  resultKey,
  getCurrentDiceCheckPreview,
  executeCurrentSettlement,
  executeCurrentSettlementWithDice,
  rerollCurrentSettlementDice,
}: UseDiceSessionOptions) {
  const [showDiceOverlay, setShowDiceOverlay] = useState(false);
  const [diceOverlaySession, setDiceOverlaySession] = useState(0);
  const [diceFlowPhase, setDiceFlowPhase] = useState<'roll' | 'post-roll' | 'result'>('roll');
  const [selectedGoldenDice, setSelectedGoldenDice] = useState(0);
  const [rolledDice, setRolledDice] = useState<DiceTuple | null>(null);
  const [rerollResult, setRerollResult] = useState<RerollStageResult>(null);
  const [isPendingReroll, setIsPendingReroll] = useState(false);
  const [dicePreview, setDicePreview] = useState<DicePreview | null>(null);

  useEffect(() => {
    if (isPlaying) {
      return;
    }

    setShowDiceOverlay(false);
    setDiceOverlaySession(0);
    setDiceFlowPhase('roll');
    setSelectedGoldenDice(0);
    setRolledDice(null);
    setRerollResult(null);
    setIsPendingReroll(false);
    setDicePreview(null);
  }, [isPlaying]);

  const resetDiceSession = useCallback(() => {
    setShowDiceOverlay(false);
    setDiceFlowPhase('roll');
    setSelectedGoldenDice(0);
    setRolledDice(null);
    setRerollResult(null);
    setIsPendingReroll(false);
    setDicePreview(null);
  }, []);

  const startRoll = useCallback(() => {
    const preview = getCurrentDiceCheckPreview();
    if (!preview) {
      executeCurrentSettlement();
      return false;
    }

    setDicePreview(preview);
    setSelectedGoldenDice(0);
    setRolledDice(null);
    setRerollResult(null);
    setIsPendingReroll(false);
    setDiceFlowPhase('roll');
    setDiceOverlaySession(value => value + 1);
    setShowDiceOverlay(true);
    return true;
  }, [executeCurrentSettlement, getCurrentDiceCheckPreview]);

  const acceptResult = useCallback((dice: DiceTuple, goldenDiceUsed: number) => {
    executeCurrentSettlementWithDice(dice, { goldenDiceUsed });
    setDiceFlowPhase('result');
    setShowDiceOverlay(false);
    setDicePreview(null);
    setIsPendingReroll(false);
  }, [executeCurrentSettlementWithDice]);

  const handleRollComplete = useCallback((result: { dice: DiceTuple }) => {
    if (isPendingReroll && rolledDice) {
      const rerollStageResult = rerollCurrentSettlementDice(rolledDice, {
        goldenDiceUsed: selectedGoldenDice,
      });

      if (!rerollStageResult?.dice_check_state) {
        return;
      }

      const rerolledDice = rerollStageResult.dice_check_state.dice as DiceTuple;
      setRolledDice(rerolledDice);
      setRerollResult(rerollStageResult);
      setIsPendingReroll(false);
      acceptResult(rerolledDice, selectedGoldenDice);
      return;
    }

    setRolledDice(result.dice);
    setRerollResult(null);

    if ((dicePreview?.rerollAvailable ?? 0) > 0) {
      setIsPendingReroll(false);
      setDiceFlowPhase('post-roll');
      return;
    }

    acceptResult(result.dice, selectedGoldenDice);
  }, [acceptResult, dicePreview?.rerollAvailable, isPendingReroll, rerollCurrentSettlementDice, rolledDice, selectedGoldenDice]);

  const handleReroll = useCallback(() => {
    if (!rolledDice) {
      return;
    }

    setIsPendingReroll(true);
    setDiceOverlaySession(value => value + 1);
    setDiceFlowPhase('roll');
  }, [rolledDice]);

  const handleRerollComplete = useCallback(() => {
    if (!rolledDice) {
      return;
    }

    acceptResult(rolledDice, selectedGoldenDice);
  }, [acceptResult, rolledDice, selectedGoldenDice]);

  const handleAcceptResult = useCallback(() => {
    if (!rolledDice) {
      return;
    }

    acceptResult(rolledDice, selectedGoldenDice);
  }, [acceptResult, rolledDice, selectedGoldenDice]);

  const handleDiceOverlayCancel = useCallback(() => {
    resetDiceSession();
    executeCurrentSettlement();
  }, [executeCurrentSettlement, resetDiceSession]);

  const displayedDiceState = useMemo<DiceCheckState | null>(() => {
    const fallbackConfig = {
      attribute: 'combat' as DiceCheckState['config']['attribute'],
      slots: [],
      opponent_value: 0,
      dc: dicePreview?.dc ?? 0,
    };

    if (rerollResult?.dice_check_state) {
      return rerollResult.dice_check_state;
    }

    if (!rolledDice) {
      return null;
    }

    return {
      config: checkConfig ?? fallbackConfig,
      dice: rolledDice,
      modifier: (dicePreview?.modifier ?? 0) + selectedGoldenDice,
      total: rolledDice.reduce((sum, value) => sum + value, 0) + (dicePreview?.modifier ?? 0) + selectedGoldenDice,
      dc_with_offset: dicePreview?.dc ?? 0,
      result: resultKey ?? CheckResult.Failure,
      rerolled_indices: isPendingReroll ? [0, 1, 2] : [],
    };
  }, [checkConfig, dicePreview?.dc, dicePreview?.modifier, isPendingReroll, rerollResult, resultKey, rolledDice, selectedGoldenDice]);

  return {
    dicePreview,
    diceFlowPhase,
    diceOverlaySession,
    displayedDiceState,
    isPendingReroll,
    rolledDice,
    selectedGoldenDice,
    setSelectedGoldenDice,
    showDiceOverlay,
    actions: {
      startRoll,
      handleRollComplete,
      handleReroll,
      handleRerollComplete,
      handleAcceptResult,
      handleDiceOverlayCancel,
      resetDiceSession,
    },
  };
}