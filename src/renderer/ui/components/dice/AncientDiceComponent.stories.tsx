import React from 'react';
import { AncientDice, AncientDiceResult } from './AncientDiceComponent';

export default {
  title: 'UI/Dice/AncientDiceComponent',
};

export const SingleStates = () => (
  <div className="flex min-h-screen items-center justify-center bg-stone-950 px-8 py-12">
    <div className="flex flex-wrap items-center justify-center gap-6">
      <AncientDice value={8} isSuccess />
      <AncientDice value={4} isSuccess={false} delay={0.1} />
      <AncientDice value={10} isSuccess isExploded delay={0.2} />
    </div>
  </div>
);

export const DicePool = () => (
  <div className="flex min-h-screen items-center justify-center bg-stone-950 px-8 py-12">
    <AncientDiceResult dice={[8, 3, 10, 7, 2]} explodedStartIndex={2} successThreshold={7} />
  </div>
);

export const RerolledDicePool = () => (
  <div className="flex min-h-screen items-center justify-center bg-stone-950 px-8 py-12">
    <AncientDiceResult
      dice={[6, 9, 4, 10, 7]}
      explodedStartIndex={3}
      successThreshold={7}
      rerolledIndices={[1, 4]}
    />
  </div>
);