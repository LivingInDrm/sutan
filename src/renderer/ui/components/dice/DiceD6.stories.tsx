import type { Story } from '@ladle/react';
import React, { useState } from 'react';
import { DiceScene } from './DiceScene';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { DiceD6 } from './DiceD6';

const Wrap = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-[#0b0e16] p-6">{children}</div>
);

export const FaceAlignmentCheck: Story = () => {
  const [diceValues, setDiceValues] = useState([1, 3, 2]);
  const [rollingFlags, setRollingFlags] = useState([false, false, false]);

  return (
    <Wrap>
      <div className="mx-auto max-w-5xl">
        <DiceScene
          diceValues={diceValues}
          rollingFlags={rollingFlags}
          onDieComplete={(index, value) => {
            setRollingFlags(flags => flags.map((flag, flagIndex) => (flagIndex === index ? false : flag)));
            setDiceValues(values => values.map((current, valueIndex) => (valueIndex === index ? value : current)));
          }}
        />
        <div className="mt-4 flex gap-3">
          {[1, 2, 3, 4, 5, 6].map(face => (
            <button
              key={face}
              className="rounded border border-white/20 px-4 py-2 text-white"
              onClick={() => setDiceValues([face, ((face + 1) % 6) + 1, ((face + 2) % 6) + 1])}
            >
              显示 {face}
            </button>
          ))}
          <button
            className="rounded border border-amber-300/40 px-4 py-2 text-amber-200"
            onClick={() => setRollingFlags([true, true, true])}
          >
            Roll
          </button>
        </div>
      </div>
    </Wrap>
  );
};

export const FaceUvDebug: Story = () => {
  const [value, setValue] = useState(1);

  return (
    <Wrap>
      <div className="mx-auto max-w-5xl">
        <div className="h-[560px] w-full overflow-hidden rounded-[28px] border border-white/8 bg-[radial-gradient(circle_at_top,rgba(76,98,138,0.28)_0%,rgba(12,16,27,0.92)_52%,rgba(4,6,12,1)_100%)]">
          <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }}>
            <PerspectiveCamera makeDefault position={[0, 2.4, 5.8]} fov={24} />
            <color attach="background" args={['#05070d']} />
            <ambientLight intensity={1.2} color="#d7d6cf" />
            <directionalLight position={[4.5, 8, 5]} intensity={2.6} color="#fff7e8" castShadow />
            <directionalLight position={[-3, 2, -4]} intensity={0.8} color="#8ab9ff" />
            <DiceD6 value={value} position={[0, 0.7, 0]} size={1.2} debugFaceTextures />
            <OrbitControls enablePan={false} />
          </Canvas>
        </div>
        <div className="mt-4 flex gap-3">
          {[1, 2, 3, 4, 5, 6].map(face => (
            <button
              key={face}
              className="rounded border border-white/20 px-4 py-2 text-white"
              onClick={() => setValue(face)}
            >
              调试面 {face}
            </button>
          ))}
        </div>
      </div>
    </Wrap>
  );
};
