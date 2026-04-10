import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { NarrativeNode, StagePlayback, StageResult } from '../../src/renderer/core/types';
import { useSettlementFlow } from '../../src/renderer/ui/hooks/useSettlementFlow';

describe('useSettlementFlow', () => {
  it('auto triggers dice once when narrative completes', () => {
    const onAutoTriggerDice = vi.fn();
    const playback = {
      stageId: 'stage-1',
      narrative: [{ type: 'narration', text: 'x' }] as NarrativeNode[],
      hasSettlement: true,
      settlementConfig: { type: 'dice_check', check: { attribute: 'combat', slots: [], opponent_value: 0, dc: 10 } },
    } as StagePlayback;

    renderHook(() =>
      useSettlementFlow({
        isPlaying: true,
        currentStagePlayback: playback,
        allStageResults: [],
        narrativeIndex: 1,
        currentStageSettlementResult: null,
        advanceNarrative: vi.fn(),
        advanceAfterSettlement: vi.fn(),
        onAutoTriggerDice,
      }),
    );

    expect(onAutoTriggerDice).toHaveBeenCalledTimes(1);
  });

  it('collects previous stage narrative into history', () => {
    const previousResults = [
      {
        stage_id: 'stage-1',
        narrative_played: [{ type: 'narration', text: 'prev' }],
      },
    ] as StageResult[];

    const { result, rerender } = renderHook(
      ({ playback, results }) =>
        useSettlementFlow({
          isPlaying: true,
          currentStagePlayback: playback,
          allStageResults: results,
          narrativeIndex: 0,
          currentStageSettlementResult: null,
          advanceNarrative: vi.fn(),
          advanceAfterSettlement: vi.fn(),
          onAutoTriggerDice: vi.fn(),
        }),
      {
        initialProps: {
          playback: { stageId: 'stage-1', narrative: [], hasSettlement: false } as StagePlayback,
          results: [] as StageResult[],
        },
      },
    );

    rerender({
      playback: { stageId: 'stage-2', narrative: [], hasSettlement: false } as StagePlayback,
      results: previousResults,
    });

    expect(result.current.fullHistory).toEqual([{ type: 'narration', text: 'prev' }]);
  });
});