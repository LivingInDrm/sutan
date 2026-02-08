import React, { useEffect, useCallback } from 'react';
import type { NarrativeNode, Effects } from '../../../core/types';
import { DividerLine } from '../common/svg';

interface NarrativePlayerProps {
  nodes: NarrativeNode[];
  currentIndex: number;
  onAdvance: () => void;
  onChoice: (nextStageId: string, effects?: Effects) => void;
}

function EffectDisplay({ effects }: { effects: Effects }) {
  const items: React.ReactNode[] = [];
  if (effects.gold) {
    items.push(
      <span key="gold" className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${effects.gold > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
        {effects.gold > 0 ? '+' : ''}{effects.gold} 金币
      </span>
    );
  }
  if (effects.reputation) {
    items.push(
      <span key="rep" className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${effects.reputation > 0 ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
        {effects.reputation > 0 ? '+' : ''}{effects.reputation} 声望
      </span>
    );
  }
  if (items.length === 0) return null;
  return <div className="flex gap-2 mt-3">{items}</div>;
}

export function NarrativePlayer({ nodes, currentIndex, onAdvance, onChoice }: NarrativePlayerProps) {
  const currentNode = currentIndex < nodes.length ? nodes[currentIndex] : null;
  const isNarrativeComplete = currentIndex >= nodes.length;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      if (currentNode && currentNode.type !== 'choice') {
        e.preventDefault();
        onAdvance();
      }
    }
  }, [currentNode, onAdvance]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (isNarrativeComplete || !currentNode) {
    return null;
  }

  const showContinue = currentNode.type !== 'choice';

  return (
    <div className="flex flex-col h-full px-8 py-6">
      <div className="flex-1">
        {currentNode.type === 'dialogue' && (
          <div>
            <div className="flex items-start gap-4 mb-4">
              {currentNode.portrait && (
                <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden border-2 border-gold-dim/30 shadow-md">
                  <img
                    src={currentNode.portrait}
                    alt={currentNode.speaker || ''}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
              )}
              <div className="flex-1 pt-1">
                {currentNode.speaker && (
                  <div className="text-sm font-bold text-crimson-dark mb-2 font-[family-name:var(--font-display)]">
                    {currentNode.speaker}
                  </div>
                )}
              </div>
            </div>
            <p className="text-leather leading-relaxed text-[15px]">
              {currentNode.text}
            </p>
          </div>
        )}

        {currentNode.type === 'narration' && (
          <div>
            <p className="text-leather/80 leading-loose text-[15px] italic">
              {currentNode.text}
            </p>
          </div>
        )}

        {currentNode.type === 'effect' && (
          <div>
            {currentNode.text && (
              <p className="text-leather/80 leading-relaxed text-[15px] mb-2">
                {currentNode.text}
              </p>
            )}
            <EffectDisplay effects={currentNode.effects} />
          </div>
        )}

        {currentNode.type === 'choice' && (
          <div>
            <p className="text-leather leading-relaxed text-[15px] mb-6">
              {currentNode.text}
            </p>
            <div className="flex flex-col gap-2">
              {currentNode.options.map((option, idx) => (
                <button
                  key={idx}
                  className="flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg
                             border border-gold-dim/30 bg-leather/5 hover:bg-leather/10
                             transition-colors text-leather text-sm group"
                  onClick={() => {
                    if (option.next_stage) {
                      onChoice(option.next_stage, option.effects);
                    } else {
                      if (option.effects) {
                        onChoice('', option.effects);
                      }
                      onAdvance();
                    }
                  }}
                >
                  <span className="text-gold-dim group-hover:text-gold transition-colors">&#9670;</span>
                  <span className="font-[family-name:var(--font-display)]">{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {showContinue && (
        <div className="shrink-0 pt-4">
          <DividerLine
            className="w-full h-1 text-gold-dim/20 pointer-events-none mb-3"
            preserveAspectRatio="none"
          />
          <button
            onClick={onAdvance}
            className="w-full flex items-center justify-center gap-2 py-2
                       text-xs text-leather/40 hover:text-leather/70 transition-colors"
          >
            <span>点击或按空格继续</span>
            <svg viewBox="0 0 16 16" className="w-3 h-3" fill="currentColor">
              <path d="M6 3l5 5-5 5V3z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
