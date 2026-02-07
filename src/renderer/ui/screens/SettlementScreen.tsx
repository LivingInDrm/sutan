import React from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useUIStore } from '../../stores/uiStore';
import { DiceResult } from '../components/dice/DiceComponent';
import { Panel } from '../components/common/Panel';
import { Button } from '../components/common/Button';

const RESULT_COLORS: Record<string, string> = {
  success: 'text-green-400',
  partial_success: 'text-yellow-400',
  failure: 'text-red-400',
  critical_failure: 'text-red-600',
};

const RESULT_LABELS: Record<string, string> = {
  success: 'SUCCESS',
  partial_success: 'PARTIAL SUCCESS',
  failure: 'FAILURE',
  critical_failure: 'CRITICAL FAILURE',
};

export function SettlementScreen() {
  const lastResults = useGameStore(s => s.lastSettlementResults);
  const setScreen = useUIStore(s => s.setScreen);

  return (
    <div className="h-full p-6 overflow-auto">
      <h2 className="text-xl font-bold text-gold mb-6 text-glow-gold">Settlement Results</h2>

      {lastResults.length === 0 && (
        <div className="text-gold-dim text-center py-12">No settlements to display.</div>
      )}

      <div className="flex flex-col gap-6 max-w-2xl mx-auto">
        {lastResults.map((result, idx) => (
          <Panel key={idx} variant="dark" title={result.scene_id}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-parchment-light">{result.scene_id}</h3>
              <span className="text-xs px-2 py-1 bg-ink-light rounded text-gold-dim">
                {result.settlement_type}
              </span>
            </div>

            <p className="text-sm text-parchment/70 mb-4 italic">"{result.narrative}"</p>

            {result.dice_check_state && (
              <div className="mb-4">
                <div className="mb-2">
                  <DiceResult
                    dice={result.dice_check_state.initial_roll.all_dice}
                    explodedStartIndex={result.dice_check_state.initial_roll.dice.length}
                  />
                </div>
                <div className="text-center mt-3">
                  <span className="text-sm text-gold-dim">
                    Successes: {result.dice_check_state.final_successes} / Target: {result.dice_check_state.config.target}
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
                    Gold: {result.effects_applied.gold > 0 ? '+' : ''}{result.effects_applied.gold}
                  </span>
                )}
                {result.effects_applied.reputation && (
                  <span className={result.effects_applied.reputation > 0 ? 'text-blue-400' : 'text-red-400'}>
                    Rep: {result.effects_applied.reputation > 0 ? '+' : ''}{result.effects_applied.reputation}
                  </span>
                )}
              </div>
            )}
          </Panel>
        ))}
      </div>

      <div className="text-center mt-8">
        <Button variant="primary" size="lg" glow onClick={() => setScreen('map')}>
          Continue
        </Button>
      </div>
    </div>
  );
}
