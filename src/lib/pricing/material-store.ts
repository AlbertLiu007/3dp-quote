'use client';

import { defaultMaterials, materialCatalogVersion } from './material-defaults';
import type { MaterialOverride, MaterialOverrideStore, MaterialProfile } from './pricing-types';

const STORAGE_KEY = '3dp-auto-quote.material-overrides.v1';

const emptyStore: MaterialOverrideStore = {
  baseVersion: materialCatalogVersion,
  overrides: {},
};

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function loadMaterialOverrideStore(): MaterialOverrideStore {
  if (!canUseStorage()) return emptyStore;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyStore;

  try {
    const parsed = JSON.parse(raw) as MaterialOverrideStore;
    if (parsed.baseVersion !== materialCatalogVersion) {
      saveMaterialOverrideStore(emptyStore);
      return emptyStore;
    }
    return {
      baseVersion: parsed.baseVersion ?? materialCatalogVersion,
      overrides: parsed.overrides ?? {},
    };
  } catch {
    return emptyStore;
  }
}

export function saveMaterialOverrideStore(store: MaterialOverrideStore) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function mergeMaterials(store: MaterialOverrideStore = loadMaterialOverrideStore()): MaterialProfile[] {
  return defaultMaterials.map((material) => ({
    ...material,
    ...(store.overrides[material.id] ?? {}),
    id: material.id,
  }));
}

export function saveMaterialOverride(materialId: string, override: MaterialOverride) {
  const store = loadMaterialOverrideStore();
  const nextOverride = {
    ...(store.overrides[materialId] ?? {}),
    ...override,
  };
  const nextStore = {
    ...store,
    overrides: {
      ...store.overrides,
      [materialId]: nextOverride,
    },
  };
  saveMaterialOverrideStore(nextStore);
  return mergeMaterials(nextStore);
}

export function resetMaterialOverrides() {
  saveMaterialOverrideStore(emptyStore);
  return mergeMaterials(emptyStore);
}
