import React, { useRef, useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { createD20Geometry, getRotationForFace, FACE_NUMBERS } from './D20Geometry';

interface D20MeshProps {
  targetNumber?: number;
  spinning?: boolean;
  spinSpeed?: number;
  scale?: number;
  position?: [number, number, number];
  crystalColor?: string;
  edgeColor?: string;
  onClick?: () => void;
  onRollComplete?: (num: number) => void;
  rolling?: boolean;
}

const ROLL_DURATION = 1.8;

export function D20Mesh({
  targetNumber,
  spinning = false,
  spinSpeed = 0.5,
  scale = 1,
  position = [0, 0, 0],
  crystalColor = '#6a6a8a',
  edgeColor = '#c9a84c',
  onClick,
  onRollComplete,
  rolling = false,
}: D20MeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const edgeRef = useRef<THREE.LineSegments>(null);
  const rollStartRef = useRef(0);
  const rollPhaseRef = useRef<'idle' | 'spinning' | 'settling'>('idle');
  const settleStartRef = useRef(new THREE.Euler(0, 0, 0));
  const settleTargetRef = useRef(new THREE.Euler(0, 0, 0));
  const [hovered, setHovered] = useState(false);

  const geometry = useMemo(() => createD20Geometry(), []);
  const edgeGeometry = useMemo(() => new THREE.EdgesGeometry(geometry, 1), [geometry]);

  const numberTextures = useMemo(() => {
    const textures: THREE.CanvasTexture[] = [];
    for (let i = 0; i < 20; i++) {
      const faceNum = FACE_NUMBERS[i];
      const size = 512;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;

      const grad = ctx.createRadialGradient(
        size / 2, size / 2, 0,
        size / 2, size / 2, size * 0.7
      );
      grad.addColorStop(0, 'rgba(120,110,160,0.35)');
      grad.addColorStop(0.6, 'rgba(80,75,120,0.15)');
      grad.addColorStop(1, 'rgba(40,35,60,0.05)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);

      ctx.strokeStyle = 'rgba(200,180,140,0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(size * 0.5, size * 0.05);
      ctx.lineTo(size * 0.05, size * 0.95);
      ctx.lineTo(size * 0.95, size * 0.95);
      ctx.closePath();
      ctx.stroke();

      ctx.fillStyle = '#e8dcc8';
      ctx.font = `bold ${size * 0.35}px "Georgia", serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.shadowColor = 'rgba(201,168,76,0.8)';
      ctx.shadowBlur = 12;
      ctx.fillText(String(faceNum), size / 2, size * 0.55);
      ctx.shadowColor = 'rgba(201,168,76,0.4)';
      ctx.shadowBlur = 24;
      ctx.fillText(String(faceNum), size / 2, size * 0.55);
      ctx.shadowBlur = 0;

      textures.push(new THREE.CanvasTexture(canvas));
    }
    return textures;
  }, []);

  const faceMaterials = useMemo(() => {
    return numberTextures.map(tex =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(crystalColor),
        metalness: 0.3,
        roughness: 0.2,
        transmission: 0.05,
        thickness: 3.0,
        transparent: true,
        opacity: 0.95,
        map: tex,
        emissiveMap: tex,
        emissive: new THREE.Color('#6a5a80'),
        emissiveIntensity: 0.25,
        envMapIntensity: 2.5,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
        reflectivity: 0.8,
        side: THREE.DoubleSide,
        depthWrite: true,
      })
    );
  }, [numberTextures, crystalColor]);

  useEffect(() => {
    if (rolling) {
      rollPhaseRef.current = 'spinning';
      rollStartRef.current = 0;
    }
  }, [rolling]);

  useEffect(() => {
    if (targetNumber !== undefined && !rolling && !spinning && groupRef.current) {
      const euler = getRotationForFace(targetNumber);
      groupRef.current.rotation.copy(euler);
    }
  }, [targetNumber, rolling, spinning]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    if (rollPhaseRef.current === 'spinning') {
      rollStartRef.current += delta;
      const t = rollStartRef.current;

      const speed = Math.max(0.5, 12 - t * 6);
      groupRef.current.rotation.x += delta * speed * 1.3;
      groupRef.current.rotation.y += delta * speed;
      groupRef.current.rotation.z += delta * speed * 0.7;

      if (t > ROLL_DURATION) {
        rollPhaseRef.current = 'settling';
        settleStartRef.current.copy(groupRef.current.rotation);
        const num = targetNumber ?? FACE_NUMBERS[Math.floor(Math.random() * 20)];
        settleTargetRef.current.copy(getRotationForFace(num));
        rollStartRef.current = 0;
        if (onRollComplete) {
          setTimeout(() => onRollComplete(num), 600);
        }
      }
    } else if (rollPhaseRef.current === 'settling') {
      rollStartRef.current += delta;
      const t = Math.min(rollStartRef.current / 0.6, 1);
      const ease = 1 - Math.pow(1 - t, 3);

      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        settleStartRef.current.x, settleTargetRef.current.x, ease
      );
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        settleStartRef.current.y, settleTargetRef.current.y, ease
      );
      groupRef.current.rotation.z = THREE.MathUtils.lerp(
        settleStartRef.current.z, settleTargetRef.current.z, ease
      );

      if (t >= 1) {
        rollPhaseRef.current = 'idle';
      }
    } else if (spinning) {
      groupRef.current.rotation.y += delta * spinSpeed;
      groupRef.current.rotation.x += delta * spinSpeed * 0.3;
    }

    if (hovered && rollPhaseRef.current === 'idle') {
      const s = scale * (1 + Math.sin(state.clock.elapsedTime * 3) * 0.02);
      groupRef.current.scale.setScalar(s);
    } else if (rollPhaseRef.current === 'idle') {
      groupRef.current.scale.setScalar(scale);
    }
  });

  const handleMeshes = useMemo(() => {
    const meshes: React.ReactNode[] = [];
    const positions = geometry.getAttribute('position');
    const normals = geometry.getAttribute('normal');
    const uvs = geometry.getAttribute('uv');

    for (let i = 0; i < 20; i++) {
      const faceGeo = new THREE.BufferGeometry();
      const facePositions = new Float32Array(9);
      const faceNormals = new Float32Array(9);
      const faceUvs = new Float32Array(6);

      for (let j = 0; j < 3; j++) {
        const srcIdx = i * 3 + j;
        facePositions[j * 3] = positions.getX(srcIdx);
        facePositions[j * 3 + 1] = positions.getY(srcIdx);
        facePositions[j * 3 + 2] = positions.getZ(srcIdx);
        faceNormals[j * 3] = normals.getX(srcIdx);
        faceNormals[j * 3 + 1] = normals.getY(srcIdx);
        faceNormals[j * 3 + 2] = normals.getZ(srcIdx);
        faceUvs[j * 2] = uvs.getX(srcIdx);
        faceUvs[j * 2 + 1] = uvs.getY(srcIdx);
      }

      faceGeo.setAttribute('position', new THREE.Float32BufferAttribute(facePositions, 3));
      faceGeo.setAttribute('normal', new THREE.Float32BufferAttribute(faceNormals, 3));
      faceGeo.setAttribute('uv', new THREE.Float32BufferAttribute(faceUvs, 2));

      meshes.push(
        <mesh key={i} geometry={faceGeo} material={faceMaterials[i]} />
      );
    }
    return meshes;
  }, [geometry, faceMaterials]);

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={onClick}
      onPointerOver={() => { setHovered(true); document.body.style.cursor = onClick ? 'pointer' : 'default'; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
    >
      {handleMeshes}
      <lineSegments ref={edgeRef} geometry={edgeGeometry}>
        <lineBasicMaterial
          color={edgeColor}
          transparent
          opacity={0.7}
          linewidth={2}
        />
      </lineSegments>
      <mesh geometry={geometry}>
        <meshBasicMaterial
          color="#1a1028"
          transparent
          opacity={0.4}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
