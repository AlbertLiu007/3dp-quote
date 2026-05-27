import type { ModelMeasurement } from '@/lib/model/model-types';

export type PrintProcess = 'fdm' | 'sla' | 'sls' | 'mjf' | 'slm';

export type MaterialProfile = {
  id: string;
  name: string;
  process: PrintProcess;
  description: string;
  descriptionEn?: string;
  densityGPerCm3: number;
  materialPricePerG: number;
  surfaceAreaPricePerMm2: number;
  supportRate: number;
  failureRate: number;
  postProcessFee: number;
  materialMinimumCharge: number;
  markupRate: number;
  leadTimeDays: number;
  enabled: boolean;
};

export type MaterialOverride = Partial<Omit<MaterialProfile, 'id'>>;

export type MaterialOverrideStore = {
  baseVersion: number;
  overrides: Record<string, MaterialOverride>;
};

export type QuoteInput = {
  measurement: ModelMeasurement;
  material: MaterialProfile;
  quantity: number;
};

export type QuoteResult = {
  estimatedWeightG: number | null;
  surfaceAreaMm2: number | null;
  materialCost: number;
  surfaceAreaCost: number;
  supportCost: number;
  failureBuffer: number;
  postProcessCost: number;
  subtotalCost: number;
  markupAmount: number;
  unitPrice: number;
  finalPrice: number;
};
