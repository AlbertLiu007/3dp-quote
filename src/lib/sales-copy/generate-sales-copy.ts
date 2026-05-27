import type { ModelMeasurement } from '@/lib/model/model-types';
import type { MaterialProfile, QuoteResult } from '@/lib/pricing/pricing-types';
import type { Language } from '@/lib/i18n/dictionaries';
import { cnyToUsd } from '@/lib/pricing/exchange-rate';

function formatMoney(value: number, language: Language, usdToCnyRate?: number) {
  if (language === 'en') return `$${cnyToUsd(value, usdToCnyRate).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
  return `￥${Math.round(value).toLocaleString('zh-CN')}`;
}

function formatDimension(value: number) {
  return value >= 100 ? value.toFixed(0) : value.toFixed(1);
}

export function generateSalesCopy(input: {
  fileName: string;
  measurement: ModelMeasurement;
  material: MaterialProfile;
  quote: QuoteResult;
  quantity: number;
  language: Language;
  usdToCnyRate?: number;
}) {
  const { fileName, measurement, material, quote, quantity, language, usdToCnyRate } = input;
  const dimensions = `${formatDimension(measurement.dimensionsMm.x)} × ${formatDimension(measurement.dimensionsMm.y)} × ${formatDimension(measurement.dimensionsMm.z)} mm`;
  const weightText =
    language === 'zh'
      ? quote.estimatedWeightG
        ? `预估重量约 ${quote.estimatedWeightG.toFixed(1)}g`
        : '体积需要人工复核'
      : quote.estimatedWeightG
        ? `estimated weight is about ${quote.estimatedWeightG.toFixed(1)}g`
        : 'volume needs manual review';
  const priceText =
    language === 'zh'
      ? quantity > 1
        ? `总价 ${formatMoney(quote.finalPrice, language)}，单件约 ${formatMoney(quote.unitPrice, language)}`
        : `报价 ${formatMoney(quote.unitPrice, language)}`
      : quantity > 1
        ? `total price is ${formatMoney(quote.finalPrice, language, usdToCnyRate)}, about ${formatMoney(quote.unitPrice, language, usdToCnyRate)} per unit`
        : `quote is ${formatMoney(quote.unitPrice, language, usdToCnyRate)}`;

  if (language === 'en') {
    return {
      shortMessage: `Hello, the quote for ${fileName} is ready: dimensions are about ${dimensions}. Recommended material/process: ${material.name}/${material.process.toUpperCase()}; ${weightText}; ${priceText}; normal lead time is about ${material.leadTimeDays} days.`,
      detailedMessage: `Hello, the model has been parsed and quoted locally. Its dimensions are about ${dimensions}, with ${measurement.triangleCount.toLocaleString('en-US')} triangles. Recommended process: ${material.name}/${material.process.toUpperCase()}. ${material.descriptionEn ?? material.description} ${weightText}; ${priceText}; normal lead time is about ${material.leadTimeDays} days. For higher strength, heat resistance, or finer surface quality, you can compare other material options.`,
      riskNote: measurement.volumeCm3
        ? 'Volume is estimated from the mesh. If the model has broken faces, openings, or non-solid geometry, the final quote should be manually reviewed.'
        : 'A reliable volume could not be calculated. Please check whether the model is closed before confirming the quote.',
    };
  }

  return {
    shortMessage: `您好，${fileName} 已完成报价：尺寸约 ${dimensions}，推荐 ${material.name}/${material.process.toUpperCase()}，${weightText}，${priceText}，正常交期约 ${material.leadTimeDays} 天。`,
    detailedMessage: `您好，模型已完成本机解析和报价。该模型尺寸约 ${dimensions}，三角面片数 ${measurement.triangleCount.toLocaleString('zh-CN')}，建议使用 ${material.name}/${material.process.toUpperCase()} 工艺。${material.description} ${weightText}，${priceText}，正常交期约 ${material.leadTimeDays} 天。如需更高强度、耐温或更细腻表面，也可以继续切换材料方案对比。`,
    riskNote: measurement.volumeCm3
      ? '体积为网格估算值；若模型存在破面、开口或非实体结构，最终报价建议人工复核。'
      : '当前模型未能得到可靠体积，建议人工检查模型是否封闭后再确认报价。',
  };
}
