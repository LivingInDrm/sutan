import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { NarrativeNode, StagePlayback, StageResult } from '../../core/types';

interface UseSettlementFlowOptions {
  isPlaying: boolean;
  currentStagePlayback: StagePlayback | null;
  allStageResults: StageResult[];
  narrativeIndex: number;
  currentStageSettlementResult: { narrative?: string | null } | null;
  advanceNarrative: () => void;
  advanceAfterSettlement: () => void;
  onAutoTriggerDice: () => void;
}

export function useSettlementFlow({
  isPlaying,
  currentStagePlayback,
  allStageResults,
  narrativeIndex,
  currentStageSettlementResult,
  advanceNarrative,
  advanceAfterSettlement,
  onAutoTriggerDice,
}: UseSettlementFlowOptions) {
  const [historyNodes, setHistoryNodes] = useState<NarrativeNode[]>([]);
  const prevStageIdRef = useRef<string | null>(null);
  const prevSettlementNarrativeRef = useRef<string | null>(null);
  const autoTriggeredStageIdRef = useRef<string | null>(null);

  const currentStageId = currentStagePlayback?.stageId ?? null;
  const narrative = currentStagePlayback?.narrative || [];
  const hasSettlement = currentStagePlayback?.hasSettlement || false;
  const isNarrativeComplete = narrativeIndex >= narrative.length;

  useEffect(() => {
    if (currentStageId && currentStageId !== prevStageIdRef.current) {
      if (prevStageIdRef.current !== null) {
        const previousStageResult = allStageResults.find(stage => stage.stage_id === prevStageIdRef.current);
        if (previousStageResult) {
          setHistoryNodes(prev => [...prev, ...previousStageResult.narrative_played]);
        }
      }
      prevStageIdRef.current = currentStageId;
    }
  }, [allStageResults, currentStageId]);

  useEffect(() => {
    if (currentStageSettlementResult?.narrative && currentStageSettlementResult.narrative !== prevSettlementNarrativeRef.current) {
      prevSettlementNarrativeRef.current = currentStageSettlementResult.narrative;
    }
  }, [currentStageSettlementResult]);

  useEffect(() => {
    if (isPlaying) {
      return;
    }

    setHistoryNodes([]);
    prevStageIdRef.current = null;
    prevSettlementNarrativeRef.current = null;
    autoTriggeredStageIdRef.current = null;
  }, [isPlaying]);

  useEffect(() => {
    if (!currentStageId || !isNarrativeComplete || currentStageSettlementResult || !hasSettlement) {
      return;
    }

    if (currentStagePlayback?.settlementConfig?.type !== 'dice_check') {
      autoTriggeredStageIdRef.current = null;
      return;
    }

    if (autoTriggeredStageIdRef.current === currentStageId) {
      return;
    }

    autoTriggeredStageIdRef.current = currentStageId;
    onAutoTriggerDice();
  }, [currentStageId, currentStagePlayback?.settlementConfig?.type, currentStageSettlementResult, hasSettlement, isNarrativeComplete, onAutoTriggerDice]);

  const fullHistory = useMemo(() => {
    const combined = [...historyNodes];
    if (prevSettlementNarrativeRef.current && currentStageSettlementResult === null) {
      combined.push({ type: 'narration', text: prevSettlementNarrativeRef.current } as NarrativeNode);
    }
    return combined;
  }, [currentStageSettlementResult, historyNodes]);

  const executeSettlement = useCallback(() => {
    onAutoTriggerDice();
  }, [onAutoTriggerDice]);

  const acceptResult = useCallback(() => {
    advanceAfterSettlement();
  }, [advanceAfterSettlement]);

  return {
    currentStageId,
    fullHistory,
    hasSettlement,
    historyNodes,
    isNarrativeComplete,
    narrative,
    actions: {
      advanceNarrative,
      executeSettlement,
      acceptResult,
    },
    setHistoryNodes,
  };
}