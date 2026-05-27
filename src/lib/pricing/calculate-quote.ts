import type { QuoteInput, QuoteResult } from './pricing-types';

export function calculateQuote({ measurement, material, quantity }: QuoteInput): QuoteResult {
  const safeQuantity = Math.max(1, Math.round(quantity || 1));
  const volumeCm3 = measurement.volumeCm3;
  const estimatedWeightG = volumeCm3 ? volumeCm3 * material.densityGPerCm3 : null;
  const surfaceAreaMm2 = measurement.surfaceAreaMm2;

  const materialCost = estimatedWeightG ? estimatedWeightG * material.materialPricePerG : material.materialMinimumCharge * 0.18;
  const surfaceAreaCost = surfaceAreaMm2 ? surfaceAreaMm2 * material.surfaceAreaPricePerMm2 : 0;
  const supportCost = 0;
  const failureBuffer = (materialCost + surfaceAreaCost) * material.failureRate;
  const postProcessCost = 0;
  const subtotalCost = materialCost + surfaceAreaCost + failureBuffer;
  const markupAmount = subtotalCost * material.markupRate;
  const unitPrice = Math.max(material.materialMinimumCharge, subtotalCost + markupAmount);

  return {
    estimatedWeightG,
    surfaceAreaMm2,
    materialCost,
    surfaceAreaCost,
    supportCost,
    failureBuffer,
    postProcessCost,
    subtotalCost,
    markupAmount,
    unitPrice,
    finalPrice: unitPrice * safeQuantity,
  };
}
