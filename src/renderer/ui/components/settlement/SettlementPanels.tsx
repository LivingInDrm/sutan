import React from 'react';
import type { NarrativeNode, Effects, Settlement, PlayerChoiceSettlement } from '../../../core/types';
import type { StageSettlementResult } from '../../../core/settlement/SettlementExecutor';
import type { Card } from '../../../core/types';
import { NarrativePlayer, NarrativeNodeView } from '../narrative/NarrativePlayer';
import { DiceResult } from '../dice/DiceComponent';
import { CardComponent } from '../card/CardComponent';
import { Button } from '../common/Button';
import { DividerLine } from '../common/svg';
import { ATTR_LABELS } from '../../constants/labels';

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

export interface SettlementLeftPanelProps {
  sceneName: string;
  investedCards: Card[];
  hasSettlement: boolean;
  isNarrativeComplete: boolean;
  settlementResult: StageSettlementResult | null;
  settlementConfig?: Settlement;
  onExecute: () => void;
}

export function SettlementLeftPanel({
  sceneName,
  investedCards,
  hasSettlement,
  isNarrativeComplete,
  settlementResult,
  settlementConfig,
  onExecute,
}: SettlementLeftPanelProps) {
  const isPlayerChoiceSettlement = settlementConfig?.type === 'player_choice';
  const showCheckPrompt = isNarrativeComplete && hasSettlement && !settlementResult && !isPlayerChoiceSettlement;
  const checkConfig = settlementResult?.dice_check_state?.config;

  return (
    <>
      <div className="text-xs text-black mb-1 tracking-wider">当前场景</div>
      <div className="text-base font-bold text-black mb-4 font-[family-name:var(--font-display)]">
        {sceneName}
      </div>

      {investedCards.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-black mb-2">投入的卡牌</div>
          <div className="flex flex-col gap-2">
            {investedCards.map(card => (
              <CardComponent key={card.card_id} card={card} compact />
            ))}
          </div>
        </div>
      )}

      <div className="flex-1" />

      {showCheckPrompt && (
        <div className="mt-4">
          <DividerLine className="w-full h-1 text-gold-dim/30 pointer-events-none mb-3" preserveAspectRatio="none" />
          <div className="text-center">
            <div className="text-sm text-black mb-3">准备进行鉴定……</div>
            <Button variant="primary" size="lg" glow onClick={onExecute}>
              开始鉴定
            </Button>
          </div>
        </div>
      )}

      {isNarrativeComplete && hasSettlement && !settlementResult && isPlayerChoiceSettlement && (
        <div className="mt-4">
          <DividerLine className="w-full h-1 text-gold-dim/30 pointer-events-none mb-3" preserveAspectRatio="none" />
          <div className="text-center">
            <div className="text-sm text-black mb-2">静观局势，做出抉择</div>
            <div className="text-xs text-black/60">右侧可选择接下来的行动路径</div>
          </div>
        </div>
      )}

      {settlementResult && (
        <div className="mt-4">
          <DividerLine className="w-full h-1 text-gold-dim/30 pointer-events-none mb-3" preserveAspectRatio="none" />

          {checkConfig && (
            <div className="text-center mb-3">
              <span className="text-xs text-black">
                {ATTR_LABELS[checkConfig.attribute] || checkConfig.attribute} 鉴定
              </span>
            </div>
          )}

          {settlementResult.dice_check_state && (
            <div className="mb-3">
              <DiceResult
                dice={settlementResult.dice_check_state.initial_roll.all_dice}
                explodedStartIndex={settlementResult.dice_check_state.initial_roll.dice.length}
              />
              <div className="text-center mt-2">
                <span className="text-xs text-black">
                  成功: {settlementResult.dice_check_state.final_successes} / 目标: {settlementResult.dice_check_state.config.target}
                </span>
              </div>
            </div>
          )}

          {settlementResult.result_key && (
            <div className={`text-center text-lg font-bold mb-2 ${RESULT_COLORS[settlementResult.result_key] || 'text-black'}`}>
              {RESULT_LABELS[settlementResult.result_key] || settlementResult.result_key}
            </div>
          )}

          {settlementResult.effects_applied && Object.keys(settlementResult.effects_applied).length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {settlementResult.effects_applied.gold && (
                <span className={`text-xs px-2 py-0.5 rounded border ${settlementResult.effects_applied.gold > 0 ? 'border-yellow-600/50 text-yellow-700' : 'border-red-500/50 text-red-700'}`}>
                  {settlementResult.effects_applied.gold > 0 ? '+' : ''}{settlementResult.effects_applied.gold} 金币
                </span>
              )}
              {settlementResult.effects_applied.reputation && (
                <span className={`text-xs px-2 py-0.5 rounded border ${settlementResult.effects_applied.reputation > 0 ? 'border-cerulean-500/50 text-cerulean-300' : 'border-red-500/50 text-red-700'}`}>
                  {settlementResult.effects_applied.reputation > 0 ? '+' : ''}{settlementResult.effects_applied.reputation} 声望
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}

export interface SettlementRightPanelProps {
  narrative: NarrativeNode[];
  narrativeIndex: number;
  onAdvance: () => void;
  onChoice: (nextStageId: string, effects?: Effects) => void;
  onPlayerChoiceSelect: (choiceIndex: number) => void;
  settlementResult: StageSettlementResult | null;
  onContinue: () => void;
  isNarrativeComplete: boolean;
  hasSettlement: boolean;
  historyNodes: NarrativeNode[];
  settlementConfig?: Settlement;
}

function PlayerChoicePrompt({
  settlement,
  onSelect,
}: {
  settlement: PlayerChoiceSettlement;
  onSelect: (choiceIndex: number) => void;
}) {
  return (
    <div className="mt-6">
      <div className="mb-5 rounded-xl border border-gold-dim/25 bg-[linear-gradient(180deg,rgba(111,78,55,0.06),rgba(111,78,55,0.02))] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
        <div className="text-[11px] tracking-[0.25em] text-gold-dim/70 mb-2">玩家抉择</div>
        <p className="text-[15px] leading-relaxed text-black">{settlement.narrative}</p>
      </div>
      <div className="flex flex-col gap-3">
        {settlement.choices.map((choice, idx) => (
          <button
            key={choice.id}
            onClick={() => onSelect(idx)}
            className="group w-full rounded-xl border border-gold-dim/30 bg-[linear-gradient(180deg,rgba(245,235,210,0.72),rgba(222,202,160,0.22))] px-5 py-4 text-left shadow-[0_8px_24px_rgba(45,28,12,0.08)] transition-all hover:-translate-y-0.5 hover:border-gold/60 hover:bg-[linear-gradient(180deg,rgba(245,235,210,0.86),rgba(222,202,160,0.34))]"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-gold-dim transition-colors group-hover:text-gold">✦</span>
              <div className="min-w-0 flex-1">
                <div className="font-[family-name:var(--font-display)] text-[15px] text-black">
                  {choice.label}
                </div>
                {choice.description && (
                  <p className="mt-1 text-sm leading-relaxed text-black/65">
                    {choice.description}
                  </p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function SettlementRightPanel({
  narrative,
  narrativeIndex,
  onAdvance,
  onChoice,
  onPlayerChoiceSelect,
  settlementResult,
  onContinue,
  isNarrativeComplete,
  hasSettlement,
  historyNodes,
  settlementConfig,
}: SettlementRightPanelProps) {
  if (!isNarrativeComplete) {
    return (
      <NarrativePlayer
        nodes={narrative}
        currentIndex={narrativeIndex}
        onAdvance={onAdvance}
        onChoice={onChoice}
        historyNodes={historyNodes}
      />
    );
  }

  if (settlementResult) {
    const allPastNodes = [...historyNodes, ...narrative];
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-auto px-8 py-6">
          {allPastNodes.length > 0 && (
            <div className="flex flex-col gap-4 mb-4">
              {allPastNodes.map((node, idx) => (
                <NarrativeNodeView key={`p-${idx}`} node={node} isCurrent={false} />
              ))}
            </div>
          )}
          <p className="text-black leading-relaxed text-[15px] italic">
            {settlementResult.narrative}
          </p>
        </div>
        <div className="shrink-0 px-8 pb-4 pt-2">
          <DividerLine className="w-full h-1 text-gold-dim/20 pointer-events-none mb-3" preserveAspectRatio="none" />
          <button
            onClick={onContinue}
            className="w-full flex items-center justify-center gap-2 py-2
                       text-xs text-black hover:text-gray-800 transition-colors"
          >
            <span>点击继续</span>
            <svg viewBox="0 0 16 16" className="w-3 h-3" fill="currentColor">
              <path d="M6 3l5 5-5 5V3z" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  if (isNarrativeComplete && hasSettlement) {
    const allPastNodes = [...historyNodes, ...narrative];
    const isPlayerChoiceSettlement = settlementConfig?.type === 'player_choice';
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-auto px-8 py-6">
          {allPastNodes.length > 0 && (
            <div className="flex flex-col gap-4 mb-4">
              {allPastNodes.map((node, idx) => (
                <NarrativeNodeView key={`w-${idx}`} node={node} isCurrent={false} />
              ))}
            </div>
          )}
          {isPlayerChoiceSettlement && settlementConfig ? (
            <PlayerChoicePrompt
              settlement={settlementConfig}
              onSelect={onPlayerChoiceSelect}
            />
          ) : (
            <p className="text-black text-sm italic">等待鉴定……</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto px-8 py-6">
        {historyNodes.length > 0 && (
          <div className="flex flex-col gap-4 mb-4">
            {historyNodes.map((node, idx) => (
              <NarrativeNodeView key={`d-${idx}`} node={node} isCurrent={false} />
            ))}
          </div>
        )}
        <p className="text-black text-sm italic">阶段完成</p>
      </div>
    </div>
  );
}
