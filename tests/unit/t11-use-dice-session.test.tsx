import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { DiceCheckState } from '../../src/renderer/core/types';
import { CheckResult } from '../../src/renderer/core/types/enums';
import { useDiceSession } from '../../src/renderer/ui/hooks/useDiceSession';

const checkConfig: DiceCheckState['config'] = {
  attribute: 'combat',
  slots: [],
  opponent_value: 0,
  dc: 10,
};

describe('useDiceSession', () => {
  it('opens overlay when preview exists', () => {
    const hook = renderHook(() =>
      useDiceSession({
        isPlaying: true,
        checkConfig,
        resultKey: null,
        getCurrentDiceCheckPreview: () => ({ modifier: 2, dc: 10, goldenDice: 1, rerollAvailable: 1 }),
        executeCurrentSettlement: vi.fn(),
        executeCurrentSettlementWithDice: vi.fn(),
        rerollCurrentSettlementDice: vi.fn(),
      }),
    );

    act(() => {
      hook.result.current.actions.startRoll();
    });

    expect(hook.result.current.showDiceOverlay).toBe(true);
    expect(hook.result.current.diceFlowPhase).toBe('roll');
    expect(hook.result.current.dicePreview?.dc).toBe(10);
  });

  it('moves to post-roll then accepts result', () => {
    const executeCurrentSettlementWithDice = vi.fn();
    const hook = renderHook(() =>
      useDiceSession({
        isPlaying: true,
        checkConfig,
        resultKey: CheckResult.Success,
        getCurrentDiceCheckPreview: () => ({ modifier: 1, dc: 9, goldenDice: 0, rerollAvailable: 1 }),
        executeCurrentSettlement: vi.fn(),
        executeCurrentSettlementWithDice,
        rerollCurrentSettlementDice: vi.fn(),
      }),
    );

    act(() => {
      hook.result.current.actions.startRoll();
      hook.result.current.actions.handleRollComplete({ dice: [3, 3, 3] });
    });

    expect(hook.result.current.diceFlowPhase).toBe('post-roll');

    act(() => {
      hook.result.current.actions.handleAcceptResult();
    });

    expect(executeCurrentSettlementWithDice).toHaveBeenCalledWith([3, 3, 3], { goldenDiceUsed: 0 });
    expect(hook.result.current.showDiceOverlay).toBe(false);
  });
});