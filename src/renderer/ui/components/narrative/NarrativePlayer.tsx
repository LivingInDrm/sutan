import React, { useEffect, useCallback, useRef } from 'react';
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
  return <div className="flex gap-2 mt-1">{items}</div>;
}

function NarrativeNodeView({ node, isCurrent }: { node: NarrativeNode; isCurrent: boolean }) {
  const opacity = isCurrent ? '' : 'opacity-60';

  if (node.type === 'dialogue') {
    return (
      <div className={opacity}>
        <div className="flex items-start gap-3 mb-1">
          {node.portrait && (
            <div className="w-10 h-10 shrink-0 rounded overflow-hidden border border-gold-dim/30 shadow-sm">
              <img src={node.portrait} alt={node.speaker || ''} className="w-full h-full object-cover object-top" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            {node.speaker && (
              <div className="text-xs font-bold text-crimson-dark mb-0.5 font-[family-name:var(--font-display)]">
                {node.speaker}
              </div>
            )}
            <p className="text-leather leading-relaxed text-[15px]">{node.text}</p>
          </div>
        </div>
      </div>
    );
  }

  if (node.type === 'narration') {
    return (
      <div className={opacity}>
        <p className="text-leather/80 leading-loose text-[15px] italic">{node.text}</p>
      </div>
    );
  }

  if (node.type === 'effect') {
    return (
      <div className={opacity}>
        {node.text && <p className="text-leather/80 leading-relaxed text-[15px] mb-1">{node.text}</p>}
        <EffectDisplay effects={node.effects} />
      </div>
    );
  }

  return null;
}

export function NarrativePlayer({ nodes, currentIndex, onAdvance, onChoice }: NarrativePlayerProps) {
  const currentNode = currentIndex < nodes.length ? nodes[currentIndex] : null;
  const isNarrativeComplete = currentIndex >= nodes.length;
  const bottomRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentIndex]);

  if (isNarrativeComplete || !currentNode) {
    return null;
  }

  const visibleNodes = nodes.slice(0, currentIndex + 1);
  const showContinue = currentNode.type !== 'choice';
  const isChoice = currentNode.type === 'choice';

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto px-8 py-6">
        <div className="flex flex-col gap-4">
          {visibleNodes.map((node, idx) => {
            const isCurrent = idx === currentIndex;
            if (node.type === 'choice' && isCurrent) return null;
            return <NarrativeNodeView key={idx} node={node} isCurrent={isCurrent} />;
          })}
        </div>

        {isChoice && (
          <div className="mt-6">
            <p className="text-leather leading-relaxed text-[15px] mb-4">{currentNode.text}</p>
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

        <div ref={bottomRef} />
      </div>

      {showContinue && (
        <div className="shrink-0 px-8 pb-4 pt-2">
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
