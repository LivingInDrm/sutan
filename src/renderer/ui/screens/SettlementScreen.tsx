import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useUIStore } from '../../stores/uiStore';
import { NarrativePlayer, NarrativeNodeView } from '../components/narrative/NarrativePlayer';
import { DiceResult } from '../components/dice/DiceComponent';
import { CardComponent } from '../components/card/CardComponent';
import { Panel } from '../components/common/Panel';
import { Button } from '../components/common/Button';
import { BookLayout } from '../layouts/BookLayout';
import { DividerLine } from '../components/common/svg';
import { ATTR_LABELS } from '../constants/labels';
import type { Card, NarrativeNode, SettlementResult } from '../../core/types';
import type { StageSettlementResult } from '../../core/settlement/SettlementExecutor';

const RESULT_COLORS: Record<string, string> = {
  success: 'text-green-400',
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

function SettlementLeftPanel({
  sceneName,
  investedCards,
  hasSettlement,
  isNarrativeComplete,
  settlementResult,
  onExecute,
}: {
  sceneName: string;
  investedCards: Card[];
  hasSettlement: boolean;
  isNarrativeComplete: boolean;
  settlementResult: StageSettlementResult | null;
  onExecute: () => void;
}) {
  const showCheckPrompt = isNarrativeComplete && hasSettlement && !settlementResult;
  const checkConfig = settlementResult?.dice_check_state?.config;

  return (
    <>
      <div className="text-xs text-gold-dim/70 mb-1 tracking-wider">当前场景</div>
      <div className="text-base font-bold text-gold mb-4 font-[family-name:var(--font-display)]">
        {sceneName}
      </div>

      {investedCards.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-gold-dim/60 mb-2">投入的卡牌</div>
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
            <div className="text-sm text-gold-dim mb-3">准备进行鉴定……</div>
            <Button variant="primary" size="lg" glow onClick={onExecute}>
              开始鉴定
            </Button>
          </div>
        </div>
      )}

      {settlementResult && (
        <div className="mt-4">
          <DividerLine className="w-full h-1 text-gold-dim/30 pointer-events-none mb-3" preserveAspectRatio="none" />

          {checkConfig && (
            <div className="text-center mb-3">
              <span className="text-xs text-gold-dim/70">
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
                <span className="text-xs text-gold-dim">
                  成功: {settlementResult.dice_check_state.final_successes} / 目标: {settlementResult.dice_check_state.config.target}
                </span>
              </div>
            </div>
          )}

          {settlementResult.result_key && (
            <div className={`text-center text-lg font-bold mb-2 ${RESULT_COLORS[settlementResult.result_key] || 'text-gold-dim'}`}>
              {RESULT_LABELS[settlementResult.result_key] || settlementResult.result_key}
            </div>
          )}

          {settlementResult.effects_applied && Object.keys(settlementResult.effects_applied).length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {settlementResult.effects_applied.gold && (
                <span className={`text-xs px-2 py-0.5 rounded ${settlementResult.effects_applied.gold > 0 ? 'bg-yellow-900/40 text-yellow-400' : 'bg-red-900/40 text-red-400'}`}>
                  {settlementResult.effects_applied.gold > 0 ? '+' : ''}{settlementResult.effects_applied.gold} 金币
                </span>
              )}
              {settlementResult.effects_applied.reputation && (
                <span className={`text-xs px-2 py-0.5 rounded ${settlementResult.effects_applied.reputation > 0 ? 'bg-blue-900/40 text-blue-400' : 'bg-red-900/40 text-red-400'}`}>
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

function SettlementRightPanel({
  narrative,
  narrativeIndex,
  onAdvance,
  onChoice,
  settlementResult,
  onContinue,
  isNarrativeComplete,
  hasSettlement,
  historyNodes,
}: {
  narrative: NarrativeNode[];
  narrativeIndex: number;
  onAdvance: () => void;
  onChoice: (nextStageId: string, effects?: import('../../core/types').Effects) => void;
  settlementResult: StageSettlementResult | null;
  onContinue: () => void;
  isNarrativeComplete: boolean;
  hasSettlement: boolean;
  historyNodes: NarrativeNode[];
}) {
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
          <p className="text-leather leading-relaxed text-[15px] italic">
            {settlementResult.narrative}
          </p>
        </div>
        <div className="shrink-0 px-8 pb-4 pt-2">
          <DividerLine className="w-full h-1 text-gold-dim/20 pointer-events-none mb-3" preserveAspectRatio="none" />
          <button
            onClick={onContinue}
            className="w-full flex items-center justify-center gap-2 py-2
                       text-xs text-leather/40 hover:text-leather/70 transition-colors"
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
        <div className="flex-1 overflow-auto px-8 py-6">
          {allPastNodes.length > 0 && (
            <div className="flex flex-col gap-4 mb-4">
              {allPastNodes.map((node, idx) => (
                <NarrativeNodeView key={`w-${idx}`} node={node} isCurrent={false} />
              ))}
            </div>
          )}
          <p className="text-leather/50 text-sm italic">等待鉴定……</p>
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
        <p className="text-leather/50 text-sm italic">阶段完成</p>
      </div>
    </div>
  );
}

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
                  <span className={result.effects_applied.reputation > 0 ? 'text-blue-400' : 'text-red-400'}>
                    声望: {result.effects_applied.reputation > 0 ? '+' : ''}{result.effects_applied.reputation}
                  </span>
                )}
              </div>
            )}
          </Panel>
        ))}
      </div>

      <div className="text-center mt-8">
        <Button variant="primary" size="lg" glow onClick={() => setScreen('map')}>
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
  const advanceAfterSettlement = useGameStore(s => s.advanceAfterSettlement);
  const game = useGameStore(s => s.game);

  const { isPlaying, currentStagePlayback, narrativeIndex, currentStageSettlementResult } = settlement;

  const [historyNodes, setHistoryNodes] = useState<NarrativeNode[]>([]);
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
      prevStageIdRef.current = null;
      prevSettlementNarrativeRef.current = null;
    }
  }, [isPlaying]);

  if (!isPlaying) {
    return <SummaryView results={lastResults} />;
  }

  const narrative = currentStagePlayback?.narrative || [];
  const isNarrativeComplete = narrativeIndex >= narrative.length;
  const hasSettlement = currentStagePlayback?.hasSettlement || false;

  const scene = settlement.currentRunner
    ? game?.sceneManager.getScene(settlement.currentRunner.sceneId)
    : null;
  const sceneName = scene?.name || '';

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
      onExecute={() => executeCurrentSettlement()}
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
    />
  );

  return (
    <BookLayout
      leftContent={leftContent}
      rightContent={rightContent}
      rightTitle={sceneName}
    />
  );
}
