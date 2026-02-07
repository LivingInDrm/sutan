import React from 'react';
import { useUIStore } from '../../stores/uiStore';
import { DecoratedFrame } from '../components/common/DecoratedFrame';
import { Button } from '../components/common/Button';

export function DialogScreen() {
  const setScreen = useUIStore(s => s.setScreen);

  return (
    <DecoratedFrame variant="default" className="h-full">
      <div className="h-full flex">
        <div className="w-2/5 flex items-center justify-center">
          <div className="w-48 h-64 bg-ink-light/40 border border-gold-dim/20 rounded-lg
                          flex items-center justify-center text-gold-dim">
            Character Portrait
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="flex-1 bg-ink/30 rounded-lg p-6 border border-gold-dim/20 mb-4">
            <p className="text-parchment-light/80 leading-relaxed">
              The dialogue text will appear here during story events and conversations...
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              variant="secondary"
              leftIcon={<span className="text-gold">&#9670;</span>}
              className="w-full justify-start"
            >
              Option A
            </Button>
            <Button
              variant="secondary"
              leftIcon={<span className="text-gold">&#9670;</span>}
              className="w-full justify-start"
            >
              Option B
            </Button>
          </div>

          <div className="mt-4 flex justify-end">
            <Button variant="ghost" onClick={() => setScreen('map')}>
              Back
            </Button>
          </div>
        </div>
      </div>
    </DecoratedFrame>
  );
}
