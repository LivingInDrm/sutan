import React, { useEffect, useCallback } from 'react';
import type { NarrativeNode, Effects } from '../../../core/types';
import { Button } from '../common/Button';
import { Panel } from '../common/Panel';

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
      <span key="gold" className={effects.gold > 0 ? 'text-yellow-400' : 'text-red-400'}>
        {effects.gold > 0 ? '+' : ''}{effects.gold} Gold
      </span>
    );
  }
  if (effects.reputation) {
    items.push(
      <span key="rep" className={effects.reputation > 0 ? 'text-blue-400' : 'text-red-400'}>
        {effects.reputation > 0 ? '+' : ''}{effects.reputation} Rep
      </span>
    );
  }
  if (items.length === 0) return null;
  return <div className="flex gap-3 text-sm mt-2">{items}</div>;
}

export function NarrativePlayer({ nodes, currentIndex, onAdvance, onChoice }: NarrativePlayerProps) {
  const currentNode = currentIndex < nodes.length ? nodes[currentIndex] : null;
  const isNarrativeComplete = currentIndex >= nodes.length;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      if (currentNode && currentNode.type !== 'choice') {
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

  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] p-6">
      {currentNode.type === 'dialogue' && (
        <div className="w-full max-w-2xl">
          <div className="flex items-start gap-4">
            {currentNode.portrait && (
              <div className="w-20 h-20 bg-ink-light/40 border border-gold-dim/20 rounded-lg
                              flex items-center justify-center text-gold-dim text-xs shrink-0">
                {currentNode.speaker || 'NPC'}
              </div>
            )}
            <div className="flex-1">
              {currentNode.speaker && (
                <div className="text-sm font-bold text-amber-400 mb-1">{currentNode.speaker}</div>
              )}
              <Panel variant="dark">
                <p className="text-parchment-light/80 leading-relaxed">{currentNode.text}</p>
              </Panel>
            </div>
          </div>
          <div className="text-center mt-4">
            <button
              onClick={onAdvance}
              className="text-xs text-gold-dim/60 hover:text-gold animate-pulse"
            >
              Click or press Space to continue
            </button>
          </div>
        </div>
      )}

      {currentNode.type === 'narration' && (
        <div className="w-full max-w-2xl text-center">
          <p className="text-parchment-light/80 leading-relaxed text-lg italic">
            {currentNode.text}
          </p>
          <div className="mt-6">
            <button
              onClick={onAdvance}
              className="text-xs text-gold-dim/60 hover:text-gold animate-pulse"
            >
              Click or press Space to continue
            </button>
          </div>
        </div>
      )}

      {currentNode.type === 'effect' && (
        <div className="w-full max-w-2xl text-center">
          {currentNode.text && (
            <p className="text-parchment-light/80 leading-relaxed mb-3">{currentNode.text}</p>
          )}
          <EffectDisplay effects={currentNode.effects} />
          <div className="mt-4">
            <button
              onClick={onAdvance}
              className="text-xs text-gold-dim/60 hover:text-gold animate-pulse"
            >
              Click or press Space to continue
            </button>
          </div>
        </div>
      )}

      {currentNode.type === 'choice' && (
        <div className="w-full max-w-2xl">
          <p className="text-parchment-light/80 leading-relaxed text-center mb-6">
            {currentNode.text}
          </p>
          <div className="flex flex-col gap-2">
            {currentNode.options.map((option, idx) => (
              <Button
                key={idx}
                variant="secondary"
                leftIcon={<span className="text-gold">&#9670;</span>}
                className="w-full justify-start"
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
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-600">
        {currentIndex + 1} / {nodes.length}
      </div>
    </div>
  );
}
