import type * as THREE from 'three';

export type ModelFormat = 'stl' | 'obj' | 'ply' | '3mf' | 'glb' | 'gltf' | 'step' | 'stp' | 'iges' | 'igs';

export type ParsedModel = {
  fileName: string;
  format: ModelFormat;
  object: THREE.Object3D;
};

export type ModelMeasurement = {
  dimensionsMm: {
    x: number;
    y: number;
    z: number;
  };
  volumeMm3: number | null;
  volumeCm3: number | null;
  surfaceAreaMm2: number | null;
  triangleCount: number;
  meshCount: number;
  boundingBoxVolumeMm3: number;
};

export function getModelFormat(fileName: string): ModelFormat {
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (
    extension === 'stl' ||
    extension === 'obj' ||
    extension === 'ply' ||
    extension === '3mf' ||
    extension === 'glb' ||
    extension === 'gltf' ||
    extension === 'step' ||
    extension === 'stp' ||
    extension === 'iges' ||
    extension === 'igs'
  ) {
    return extension;
  }
  throw new Error('暂不支持该模型格式。请使用 STL、OBJ、PLY、3MF、GLB、STEP 或 IGES 文件。');
}

export function isCadModelFormat(format: string): format is Extract<ModelFormat, 'step' | 'stp' | 'iges' | 'igs'> {
  return ['step', 'stp', 'iges', 'igs'].includes(format.toLowerCase());
}

export function normalizeCadFormat(format: ModelFormat) {
  if (format === 'stp') return 'step';
  if (format === 'igs') return 'iges';
  return format;
}
