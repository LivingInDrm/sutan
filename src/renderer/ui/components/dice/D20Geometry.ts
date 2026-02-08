import * as THREE from 'three';

const PHI = (1 + Math.sqrt(5)) / 2;

const RAW_VERTS: [number, number, number][] = [
  [-1,  PHI, 0], [ 1,  PHI, 0], [-1, -PHI, 0], [ 1, -PHI, 0],
  [0, -1,  PHI], [0,  1,  PHI], [0, -1, -PHI], [0,  1, -PHI],
  [ PHI, 0, -1], [ PHI, 0,  1], [-PHI, 0, -1], [-PHI, 0,  1],
];

const FACES: [number, number, number][] = [
  [0,11,5],  [0,5,1],   [0,1,7],   [0,7,10],  [0,10,11],
  [1,5,9],   [5,11,4],  [11,10,2], [10,7,6],  [7,1,8],
  [3,9,4],   [3,4,2],   [3,2,6],   [3,6,8],   [3,8,9],
  [4,9,5],   [2,4,11],  [6,2,10],  [8,6,7],   [9,8,1],
];

const FACE_NUMBERS = [
  20, 1, 13, 8, 15,
  17, 6, 3, 14, 12,
  2, 10, 19, 7, 11,
  5, 18, 16, 4, 9,
];

function computeFaceCenter(v0: THREE.Vector3, v1: THREE.Vector3, v2: THREE.Vector3) {
  return new THREE.Vector3().addVectors(v0, v1).add(v2).divideScalar(3);
}

export function createD20Geometry(): THREE.BufferGeometry {
  const vertices = RAW_VERTS.map(v => new THREE.Vector3(...v).normalize());
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];

  for (const [a, b, c] of FACES) {
    const v0 = vertices[a];
    const v1 = vertices[b];
    const v2 = vertices[c];

    const normal = new THREE.Vector3()
      .crossVectors(
        new THREE.Vector3().subVectors(v1, v0),
        new THREE.Vector3().subVectors(v2, v0)
      )
      .normalize();

    positions.push(v0.x, v0.y, v0.z, v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
    normals.push(normal.x, normal.y, normal.z, normal.x, normal.y, normal.z, normal.x, normal.y, normal.z);
    uvs.push(0.5, 1, 0, 0, 1, 0);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  return geo;
}

export function createD20NumberTexture(
  number: number,
  opts?: { bgColor?: string; textColor?: string; size?: number }
): THREE.CanvasTexture {
  const size = opts?.size ?? 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = opts?.bgColor ?? 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = opts?.textColor ?? '#e8dcc8';
  ctx.font = `bold ${size * 0.45}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(number), size / 2, size / 2);

  return new THREE.CanvasTexture(canvas);
}

export function createD20FaceTextures(): THREE.CanvasTexture[] {
  return FACE_NUMBERS.map(n => createD20NumberTexture(n));
}

export function getD20FaceOrientations(): { faceIndex: number; number: number; normal: THREE.Vector3; center: THREE.Vector3 }[] {
  const vertices = RAW_VERTS.map(v => new THREE.Vector3(...v).normalize());
  return FACES.map(([a, b, c], i) => {
    const v0 = vertices[a];
    const v1 = vertices[b];
    const v2 = vertices[c];
    const normal = new THREE.Vector3()
      .crossVectors(
        new THREE.Vector3().subVectors(v1, v0),
        new THREE.Vector3().subVectors(v2, v0)
      )
      .normalize();
    const center = computeFaceCenter(v0, v1, v2);
    return { faceIndex: i, number: FACE_NUMBERS[i], normal, center };
  });
}

export function getRotationForFace(targetNumber: number, cameraPosition?: [number, number, number]): THREE.Euler {
  const orientations = getD20FaceOrientations();
  const face = orientations.find(f => f.number === targetNumber);
  if (!face) return new THREE.Euler(0, 0, 0);

  const camPos = cameraPosition ?? [0, 2, 4];
  const toCamera = new THREE.Vector3(camPos[0], camPos[1], camPos[2]).normalize();

  const alignQuat = new THREE.Quaternion().setFromUnitVectors(face.normal, toCamera);

  const vertices = RAW_VERTS.map(v => new THREE.Vector3(...v).normalize());
  const faceData = FACES[face.faceIndex];
  const v0 = vertices[faceData[0]].clone();
  const v1 = vertices[faceData[1]].clone();
  const v2 = vertices[faceData[2]].clone();

  const bottomMid = v1.clone().add(v2).multiplyScalar(0.5);
  const textUp = new THREE.Vector3().subVectors(v0, bottomMid).normalize();
  const rotatedTextUp = textUp.clone().applyQuaternion(alignQuat);

  const worldUp = new THREE.Vector3(0, 1, 0);
  const screenUp = worldUp.clone()
    .sub(toCamera.clone().multiplyScalar(worldUp.dot(toCamera)))
    .normalize();

  const projectedTextUp = rotatedTextUp.clone()
    .sub(toCamera.clone().multiplyScalar(rotatedTextUp.dot(toCamera)))
    .normalize();

  const cos = projectedTextUp.dot(screenUp);
  const cross = new THREE.Vector3().crossVectors(projectedTextUp, screenUp);
  const sin = cross.dot(toCamera);
  const angle = Math.atan2(sin, cos);

  const correction = new THREE.Quaternion().setFromAxisAngle(toCamera, angle);
  const finalQuat = correction.multiply(alignQuat);
  return new THREE.Euler().setFromQuaternion(finalQuat);
}

export { FACE_NUMBERS };
