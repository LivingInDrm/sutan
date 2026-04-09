import React from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { DiceD6 } from './DiceD6';

interface DiceSceneProps {
  diceValues: number[];
  rollingFlags: boolean[];
  onDieComplete: (index: number, value: number) => void;
  debugFaceTextures?: boolean[];
}

const POSITIONS: [number, number, number][] = [
  [0, 0.56, 0],
  [-1.5, 0.56, 0.15],
  [1.5, 0.56, -0.15],
];

export function DiceScene({ diceValues, rollingFlags, onDieComplete, debugFaceTextures }: DiceSceneProps) {
  return (
    <div className="h-[560px] w-full overflow-hidden rounded-[28px] border border-white/8 bg-[radial-gradient(circle_at_top,rgba(76,98,138,0.28)_0%,rgba(12,16,27,0.92)_52%,rgba(4,6,12,1)_100%)]">
      <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }}>
        <PerspectiveCamera makeDefault position={[0, 3.6, 7.2]} fov={28} />
        <color attach="background" args={['#05070d']} />
        <fog attach="fog" args={['#05070d', 8, 13]} />
        <ambientLight intensity={1.2} color="#d7d6cf" />
        <directionalLight
          position={[4.5, 8, 5]}
          intensity={2.6}
          color="#fff7e8"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-bias={-0.0002}
        />
        <directionalLight position={[-3, 2, -4]} intensity={0.8} color="#8ab9ff" />
        <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[16, 16]} />
          <shadowMaterial transparent opacity={0.35} />
        </mesh>
        <mesh rotation-x={-Math.PI / 2} position={[0, -0.001, 0]} receiveShadow>
          <planeGeometry args={[16, 16]} />
          <meshStandardMaterial color="#161b25" roughness={0.92} metalness={0.08} />
        </mesh>

        {diceValues.map((dieValue, index) => (
          <DiceD6
            key={index}
            value={dieValue}
            rolling={rollingFlags[index]}
            position={POSITIONS[index]}
            size={0.96}
            delayMs={index * 110}
            debugFaceTextures={debugFaceTextures?.[index] ?? false}
            onRollComplete={value => onDieComplete(index, value)}
          />
        ))}

        <ContactShadows position={[0, 0.02, 0]} opacity={0.55} scale={10} blur={2.5} far={3.5} />
        <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={0.95} maxPolarAngle={1.25} />
      </Canvas>
    </div>
  );
}