import React from 'react';
import { AncientDice, AncientDiceResult } from './AncientDiceComponent';

export default {
  title: 'UI/Dice/AncientDiceComponent',
};

export const FacesOneToSix = () => (
  <div className="flex min-h-screen items-center justify-center bg-stone-950 px-8 py-12">
    <div className="flex flex-wrap items-center justify-center gap-6">
      {[1, 2, 3, 4, 5, 6].map((value, index) => (
        <AncientDice key={value} value={value} isSuccess={value >= 4} delay={index * 0.06} />
      ))}
    </div>
  </div>
);

export const MixedDicePool = () => (
  <div className="flex min-h-screen items-center justify-center bg-stone-950 px-8 py-12">
    <AncientDiceResult dice={[1, 3, 4, 6, 2]} explodedStartIndex={5} successThreshold={4} />
  </div>
);

export const RerollAndExplode = () => (
  <div className="flex min-h-screen items-center justify-center bg-stone-950 px-8 py-12">
    <AncientDiceResult
      dice={[2, 5, 6, 1, 4, 6]}
      explodedStartIndex={3}
      successThreshold={4}
      rerolledIndices={[0, 4]}
    />
  </div>
);