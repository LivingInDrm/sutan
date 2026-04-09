import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBox, useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import face1 from '../../../assets/dice/dice-face-1.png';
import face2 from '../../../assets/dice/dice-face-2.png';
import face3 from '../../../assets/dice/dice-face-3.png';
import face4 from '../../../assets/dice/dice-face-4.png';
import face5 from '../../../assets/dice/dice-face-5.png';
import face6 from '../../../assets/dice/dice-face-6.png';

export interface DiceD6Props {
  value?: number;
  onRollComplete?: (value: number) => void;
  size?: number;
  rolling?: boolean;
  position?: [number, number, number];
  delayMs?: number;
  debugFaceTextures?: boolean;
}

const FACE_ROTATIONS: Record<number, THREE.Euler> = {
  1: new THREE.Euler(0, 0, 0),
  2: new THREE.Euler(-Math.PI / 2, 0, 0),
  3: new THREE.Euler(0, 0, Math.PI / 2),
  4: new THREE.Euler(0, 0, -Math.PI / 2),
  5: new THREE.Euler(Math.PI / 2, 0, 0),
  6: new THREE.Euler(Math.PI, 0, 0),
};

const FACE_ORDER = [4, 3, 1, 6, 2, 5] as const;
const ROLL_SECONDS = 1.9;
const FACE_VECTORS: Record<number, THREE.Vector3> = {
  1: new THREE.Vector3(0, 0, 1),
  2: new THREE.Vector3(0, 1, 0),
  3: new THREE.Vector3(-1, 0, 0),
  4: new THREE.Vector3(1, 0, 0),
  5: new THREE.Vector3(0, -1, 0),
  6: new THREE.Vector3(0, 0, -1),
};

function getTargetValue(value?: number) {
  if (value && value >= 1 && value <= 6) {
    return value;
  }
  return (Math.floor(Math.random() * 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6;
}

export function DiceD6({
  value,
  onRollComplete,
  size = 1,
  rolling = false,
  position = [0, 0, 0],
  delayMs = 0,
  debugFaceTextures = false,
}: DiceD6Props) {
  const edgeRadius = Math.min(size * 0.08, size * 0.18);
  const bodyMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#f3ebd8',
        roughness: 0.68,
        metalness: 0.04,
      }),
    []
  );
  const textures = useTexture([
    face4,
    face3,
    face1,
    face6,
    face2,
    face5,
  ]);
  const groupRef = useRef<THREE.Group>(null);
  const progressRef = useRef(0);
  const startRotationRef = useRef(new THREE.Euler(0, 0, 0));
  const targetRotationRef = useRef(new THREE.Euler(0, 0, 0));
  const targetValueRef = useRef<number>(value ?? 1);
  const rollingRef = useRef(false);
  const startedRef = useRef(false);
  const delayRef = useRef(0);

  useEffect(() => {
    textures.forEach((texture, index) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
      texture.needsUpdate = true;
    });
  }, [textures]);

  useEffect(() => {
    if (!groupRef.current) {
      return;
    }

    if (rolling) {
      progressRef.current = 0;
      startedRef.current = false;
      delayRef.current = delayMs / 1000;
      rollingRef.current = true;
      startRotationRef.current.copy(groupRef.current.rotation);
      const nextValue = getTargetValue(value);
      targetValueRef.current = nextValue;

      const targetRotation = FACE_ROTATIONS[nextValue];
      targetRotationRef.current.set(
        targetRotation.x + Math.PI * (6 + Math.floor(Math.random() * 4)),
        targetRotation.y + Math.PI * (7 + Math.floor(Math.random() * 4)),
        targetRotation.z + Math.PI * (5 + Math.floor(Math.random() * 4))
      );
      return;
    }

    if (!rollingRef.current && value && FACE_ROTATIONS[value]) {
      groupRef.current.rotation.copy(FACE_ROTATIONS[value]);
      groupRef.current.position.set(position[0], position[1], position[2]);
    }
  }, [delayMs, position, rolling, value]);

  useEffect(() => {
    return () => {
      bodyMaterial.dispose();
    };
  }, [bodyMaterial]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) {
      return;
    }

    if (!rollingRef.current) {
      group.position.x = THREE.MathUtils.lerp(group.position.x, position[0], 0.12);
      group.position.y = THREE.MathUtils.lerp(group.position.y, position[1], 0.12);
      group.position.z = THREE.MathUtils.lerp(group.position.z, position[2], 0.12);
      return;
    }

    if (!startedRef.current) {
      delayRef.current -= delta;
      if (delayRef.current > 0) {
        group.position.set(position[0], position[1] + 1.8, position[2]);
        return;
      }
      startedRef.current = true;
    }

    progressRef.current = Math.min(progressRef.current + delta / ROLL_SECONDS, 1);
    const t = progressRef.current;
    const eased = 1 - Math.pow(1 - t, 4);

    group.rotation.x = THREE.MathUtils.lerp(startRotationRef.current.x, targetRotationRef.current.x, eased);
    group.rotation.y = THREE.MathUtils.lerp(startRotationRef.current.y, targetRotationRef.current.y, eased);
    group.rotation.z = THREE.MathUtils.lerp(startRotationRef.current.z, targetRotationRef.current.z, eased);

    const horizontalDrift = Math.sin(t * Math.PI * 2.1) * 0.12;
    const depthDrift = Math.cos(t * Math.PI * 1.7) * 0.08;
    const bounceEnvelope = Math.pow(1 - t, 1.5);
    const arcHeight = Math.sin(t * Math.PI) * 1.6;
    const rebound = Math.abs(Math.sin(t * Math.PI * 6)) * 0.22 * bounceEnvelope;

    group.position.x = position[0] + horizontalDrift;
    group.position.z = position[2] + depthDrift;
    group.position.y = position[1] + arcHeight + rebound;

    if (t >= 1) {
      rollingRef.current = false;
      group.rotation.copy(FACE_ROTATIONS[targetValueRef.current]);
      group.position.set(position[0], position[1], position[2]);
      onRollComplete?.(targetValueRef.current);
    }
  });

  const pipPlanes = useMemo(() => {
    const inset = size * 0.495;
    const planeSize = size * 0.82;
    return FACE_ORDER.map((faceValue, index) => {
      const rotation = FACE_ROTATIONS[faceValue];
      const normal = FACE_VECTORS[faceValue].clone();
      const positionVector = normal.multiplyScalar(inset);
      return (
        <mesh
          key={`pip-plane-${faceValue}`}
          position={[positionVector.x, positionVector.y, positionVector.z]}
          rotation={[rotation.x, rotation.y, rotation.z]}
          renderOrder={index + 1}
        >
          <planeGeometry args={[planeSize, planeSize]} />
          <meshStandardMaterial
            map={textures[index]}
            transparent
            polygonOffset
            polygonOffsetFactor={-2}
            polygonOffsetUnits={-2}
            roughness={0.7}
            metalness={0.02}
            color={debugFaceTextures ? '#ffffff' : '#f3ebd8'}
          />
        </mesh>
      );
    });
  }, [debugFaceTextures, size, textures]);

  return (
    <group ref={groupRef as React.RefObject<THREE.Group>}>
      <RoundedBox
        args={[size, size, size]}
        castShadow
        receiveShadow
        material={bodyMaterial}
        radius={edgeRadius}
        smoothness={4}
      />
      {pipPlanes}
    </group>
  );
}