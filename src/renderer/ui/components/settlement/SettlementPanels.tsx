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
import ricePaperTexture from '../../../assets/textures/rice-paper-1024.webp';

const RESULT_COLORS: Record<string, string> = {
  success: 'text-[#c9a84c]',
  partial_success: 'text-[#b8860b]',
  failure: 'text-[#8b1a1a]',
  critical_failure: 'text-[#6b0f0f]',
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
  suppressResult?: boolean;
  onExecute: () => void;
}

export function SettlementLeftPanel({
  sceneName,
  investedCards,
  hasSettlement,
  isNarrativeComplete,
  settlementResult,
  settlementConfig,
  suppressResult = false,
  onExecute,
}: SettlementLeftPanelProps) {
  const isPlayerChoiceSettlement = settlementConfig?.type === 'player_choice';
  const showCheckPrompt = isNarrativeComplete && hasSettlement && !settlementResult && !isPlayerChoiceSettlement;
  const displaySettlementResult = suppressResult ? null : settlementResult;
  const checkConfig = displaySettlementResult?.dice_check_state?.config;

  return (
    <div className="h-full flex flex-col justify-end">
      <div className="mx-auto w-full max-w-[560px] rounded-t-[20px] border border-gold-500/18 bg-[linear-gradient(180deg,rgba(13,8,6,0.34),rgba(11,7,5,0.78))] px-5 pt-5 pb-5 shadow-[0_-18px_32px_rgba(0,0,0,0.36)] backdrop-blur-[2px]">
        <div className="mb-5 border-b border-gold-300/18 pb-4">
          <div className="text-[10px] text-gold-300/72 mb-1 tracking-[0.24em] font-(family-name:--font-ui)">当前场景</div>
          <div className="text-[20px] font-bold text-parchment-100 mb-2 tracking-[0.06em] font-(family-name:--font-display)">
            {sceneName}
          </div>
          <div className="text-[12px] leading-[1.7] text-parchment-200/70 font-(family-name:--font-body)">
            此卷已入结算，案上所呈与卷中文字将一并定夺后路。
          </div>
        </div>

        {investedCards.length > 0 && (
          <div className="mb-4">
            <div className="text-[10px] text-gold-300/72 mb-2 tracking-[0.22em] font-(family-name:--font-ui)">已呈之牌</div>
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
            <DividerLine className="w-full h-1 text-gold-300/24 pointer-events-none mb-3" preserveAspectRatio="none" />
            <div className="text-center rounded-[8px] border border-gold-300/16 bg-[linear-gradient(180deg,rgba(219,188,120,0.08),rgba(118,89,42,0.16))] px-4 py-4">
              <div className="text-[10px] tracking-[0.24em] text-gold-300/76 mb-2 font-(family-name:--font-ui)">落印前问</div>
              <div className="text-sm text-parchment-100 mb-3 font-(family-name:--font-body)">准备进行鉴定……</div>
              <Button variant="primary" size="lg" glow onClick={onExecute}>
                开始鉴定
              </Button>
            </div>
          </div>
        )}

        {displaySettlementResult && (
          <div className="mt-4">
            <DividerLine className="w-full h-1 text-gold-300/24 pointer-events-none mb-3" preserveAspectRatio="none" />

            {checkConfig && (
              <div className="text-center mb-3">
                <span className="text-[11px] tracking-[0.16em] text-parchment-100 font-(family-name:--font-ui)">
                  {ATTR_LABELS[checkConfig.attribute] || checkConfig.attribute} 鉴定
                </span>
              </div>
            )}

            {displaySettlementResult.dice_check_state && (
              <div className="mb-3">
                <DiceResult
                  dice={displaySettlementResult.dice_check_state.initial_roll.all_dice}
                  explodedStartIndex={displaySettlementResult.dice_check_state.initial_roll.dice.length}
                />
                <div className="text-center mt-2">
                  <span className="text-xs text-parchment-200/82 font-(family-name:--font-body)">
                    成功: {displaySettlementResult.dice_check_state.final_successes} / 目标: {displaySettlementResult.dice_check_state.config.target}
                  </span>
                </div>
              </div>
            )}

            {displaySettlementResult.result_key && (
              <div className={`text-center text-[20px] tracking-[0.08em] font-bold mb-2 font-(family-name:--font-display) ${RESULT_COLORS[displaySettlementResult.result_key] || 'text-parchment-100'}`}>
                {RESULT_LABELS[displaySettlementResult.result_key] || displaySettlementResult.result_key}
              </div>
            )}

            {displaySettlementResult.effects_applied && Object.keys(displaySettlementResult.effects_applied).length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {displaySettlementResult.effects_applied.gold && (
                  <span className={`text-xs px-2 py-0.5 rounded border ${displaySettlementResult.effects_applied.gold > 0 ? 'border-yellow-600/50 text-yellow-700' : 'border-red-500/50 text-red-700'}`}>
                    {displaySettlementResult.effects_applied.gold > 0 ? '+' : ''}{displaySettlementResult.effects_applied.gold} 金币
                  </span>
                )}
                {displaySettlementResult.effects_applied.reputation && (
                  <span className={`text-xs px-2 py-0.5 rounded border ${displaySettlementResult.effects_applied.reputation > 0 ? 'border-cerulean-500/50 text-cerulean-300' : 'border-red-500/50 text-red-700'}`}>
                    {displaySettlementResult.effects_applied.reputation > 0 ? '+' : ''}{displaySettlementResult.effects_applied.reputation} 声望
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export interface SettlementRightPanelProps {
  narrative: NarrativeNode[];
  narrativeIndex: number;
  onAdvance: () => void;
  onChoice: (nextStageId: string, effects?: Effects) => void;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6 py-8">
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-[24px] border border-[#8a6d2b]/50 bg-[linear-gradient(180deg,rgba(236,226,208,0.96),rgba(208,191,160,0.95))] shadow-[0_28px_90px_rgba(16,10,6,0.52),0_10px_24px_rgba(47,31,17,0.22)]"
        style={{
          backgroundImage: `linear-gradient(180deg,rgba(236,226,208,0.96),rgba(208,191,160,0.95)), url(${ricePaperTexture})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,248,235,0.35),transparent_58%),linear-gradient(180deg,rgba(88,57,26,0.06),rgba(88,57,26,0.16))] pointer-events-none" />
        <div className="relative flex flex-col px-6 py-6 sm:px-8 sm:py-7">
          <div className="border-b border-[#8a6d2b]/24 pb-5">
            <div className="text-center text-[10px] tracking-[0.28em] text-[#8a6d2b]/82 font-(family-name:--font-ui)">
              命簿批语
            </div>
            <p className="mt-3 text-center text-[16px] leading-[1.9] tracking-[0.02em] text-[#1a0f0a] font-(family-name:--font-body)">
              {settlement.narrative}
            </p>
          </div>

          <div className="py-4">
            <DividerLine className="h-1 w-full text-[#8a6d2b]/28" preserveAspectRatio="none" />
            <div className="mt-3 text-center text-[11px] tracking-[0.32em] text-[#8a6d2b]/78 font-(family-name:--font-ui)">
              抉择
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {settlement.choices.map((choice, idx) => (
              <button
                key={choice.id}
                type="button"
                onClick={() => onSelect(idx)}
                className={[
                  'group relative flex w-full items-start overflow-hidden border bg-[#d4c5a9]/96 pl-0 pr-5 py-4 text-left transition-all duration-200 active:scale-[0.99]',
                  'border-[#8a6d2b]/45 shadow-[0_8px_18px_rgba(70,42,16,0.14)]',
                  'hover:border-[#c9a84c] hover:bg-[#e8dcc8] hover:shadow-[0_14px_26px_rgba(86,56,22,0.18)]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#d9cab0]',
                ].join(' ')}
              >
                <div className="absolute left-0 top-0 h-full w-[4px] bg-transparent transition-colors duration-200 group-hover:bg-[#8b1a1a] group-focus-visible:bg-[#8b1a1a]" />
                <div className="flex w-full items-start gap-4 pl-5">
                  <div className="min-w-[56px] pt-0.5">
                    <div className="text-[10px] tracking-[0.22em] text-[#8a6d2b]/78 font-(family-name:--font-ui)">第 {idx + 1} 签</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-[18px] leading-[1.5] tracking-[0.02em] text-[#1a0f0a] font-(family-name:--font-body)">
                      {choice.label}
                    </div>
                    {choice.description && (
                      <p className="mt-2 text-[14px] leading-[1.8] tracking-[0.02em] text-[#3d2418]/84 font-(family-name:--font-body)">
                        {choice.description}
                      </p>
                    )}
                    <div className="mt-2 text-[12px] leading-[1.7] tracking-[0.06em] text-[#3d2418]/72 font-(family-name:--font-ui)">
                      朱批既落，改弦无门
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SettlementRightPanel({
  narrative,
  narrativeIndex,
  onAdvance,
  onChoice,
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
        <div className="flex-1 overflow-auto px-7 py-6">
          {allPastNodes.length > 0 && (
            <div className="flex flex-col gap-4 mb-4">
              {allPastNodes.map((node, idx) => (
                <NarrativeNodeView key={`p-${idx}`} node={node} isCurrent={false} />
              ))}
            </div>
          )}
          <p className="border-y border-[#8a6d2b]/18 bg-[linear-gradient(180deg,rgba(118,89,42,0.04),rgba(118,89,42,0.10))] px-4 py-4 text-[#1a0f0a] leading-[1.8] text-[16px] tracking-[0.02em] font-(family-name:--font-body)">
            {settlementResult.narrative}
          </p>
        </div>
        <div className="shrink-0 px-7 pb-4 pt-2">
          <DividerLine className="w-full h-1 text-gold-dim/20 pointer-events-none mb-3" preserveAspectRatio="none" />
          <button
            onClick={onContinue}
            className="w-full flex items-center justify-center gap-2 py-3 text-[13px] tracking-[0.12em] text-[#1a0f0a] hover:text-[#3d2418] transition-colors font-(family-name:--font-ui)"
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
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-auto px-7 py-6">
          {allPastNodes.length > 0 && (
            <div className="flex flex-col gap-4 mb-4">
              {allPastNodes.map((node, idx) => (
                <NarrativeNodeView key={`w-${idx}`} node={node} isCurrent={false} />
              ))}
            </div>
          )}
          <div className="border-y border-[#8a6d2b]/16 bg-[linear-gradient(180deg,rgba(118,89,42,0.03),rgba(118,89,42,0.08))] px-4 py-4">
            <div className="text-[10px] tracking-[0.24em] text-[#8a6d2b]/78 font-(family-name:--font-ui)">卷内批注</div>
            <p className="mt-2 text-[16px] leading-[1.8] tracking-[0.02em] text-[#1a0f0a] font-(family-name:--font-body)">
              前文既定，只待落印定夺。
            </p>
          </div>
        </div>
        <div className="shrink-0 px-7 pb-5 pt-3">
          <p className="text-[#3d2418]/72 text-[14px] italic font-(family-name:--font-body)">等待鉴定……</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto px-7 py-6">
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

export { PlayerChoicePrompt };
