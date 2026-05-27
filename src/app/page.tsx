'use client';

import { CheckCircle2, ChevronDown, Copy, FileUp, Globe2, Languages, RotateCcw } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import type * as THREE from 'three';
import { ThreeModelViewer } from '@/components/model-viewer/three-model-viewer';
import { useLanguage } from '@/lib/i18n/use-language';
import { measureModel } from '@/lib/model/model-measure';
import { parseModelBuffer } from '@/lib/model/parse-model';
import { getModelFormat, type ModelMeasurement, type ParsedModel } from '@/lib/model/model-types';
import { calculateQuote } from '@/lib/pricing/calculate-quote';
import { cnyToUsd, fallbackExchangeRate, usdToCny, type ExchangeRate } from '@/lib/pricing/exchange-rate';
import { mergeMaterials, resetMaterialOverrides, saveMaterialOverride } from '@/lib/pricing/material-store';
import type { MaterialProfile, QuoteResult } from '@/lib/pricing/pricing-types';
import { generateSalesCopy } from '@/lib/sales-copy/generate-sales-copy';

function formatNumber(value: number | null | undefined, language: 'zh' | 'en', fallback: string, digits = 1) {
  if (value === null || value === undefined || !Number.isFinite(value)) return fallback;
  return value.toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function formatMoney(valueCny: number, language: 'zh' | 'en') {
  if (language === 'en') {
    return `$${cnyToUsd(valueCny).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
  }
  return `￥${Math.round(valueCny).toLocaleString('zh-CN')}`;
}

function displayCurrencyValue(valueCny: number, language: 'zh' | 'en', rate: number) {
  return language === 'en' ? Number(cnyToUsd(valueCny, rate).toFixed(4)) : valueCny;
}

function inputCurrencyValue(value: number, language: 'zh' | 'en', rate: number) {
  return language === 'en' ? usdToCny(value, rate) : value;
}

function formatFileSize(bytes: number | null) {
  if (!bytes || !Number.isFinite(bytes)) return '--';
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function readFileWithProgress(file: File, onProgress: (percent: number) => void) {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress(Math.min(60, Math.max(1, Math.round((event.loaded / event.total) * 60))));
    };
    reader.onload = () => {
      onProgress(60);
      if (reader.result instanceof ArrayBuffer) resolve(reader.result);
      else reject(new Error('File reading failed.'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('File reading failed.'));
    reader.readAsArrayBuffer(file);
  });
}

function waitForPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function EditableNumber({
  label,
  value,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid min-w-0 gap-1 text-xs font-medium text-slate-500">
      <span>{label}</span>
      <div className="flex h-10 w-full min-w-0 items-center rounded-md border border-slate-200 bg-white px-1.5">
        <input
          type="number"
          value={value}
          step="0.01"
          onChange={(event) => onChange(Number(event.target.value))}
          className="min-w-0 flex-1 border-0 bg-transparent text-sm font-semibold text-slate-900 outline-none"
        />
        <span className="shrink-0 text-[11px] text-slate-400">{suffix}</span>
      </div>
    </label>
  );
}

export default function HomePage() {
  const { language, setLanguage, t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [materials, setMaterials] = useState<MaterialProfile[]>(() => mergeMaterials());
  const [selectedMaterialId, setSelectedMaterialId] = useState(materials[0]?.id ?? '');
  const [quantity, setQuantity] = useState(1);
  const [parsedModel, setParsedModel] = useState<ParsedModel | null>(null);
  const [currentFile, setCurrentFile] = useState<{ name: string; size: number } | null>(null);
  const [modelObject, setModelObject] = useState<THREE.Object3D | null>(null);
  const [measurement, setMeasurement] = useState<ModelMeasurement | null>(null);
  const [status, setStatus] = useState<string>(t.initialStatus);
  const [progressPercent, setProgressPercent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [materialOpen, setMaterialOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate>(fallbackExchangeRate);

  const selectedMaterial = materials.find((material) => material.id === selectedMaterialId) ?? materials[0];

  useEffect(() => {
    if (!modelObject && !error && progressPercent === null) setStatus(t.initialStatus);
  }, [error, modelObject, progressPercent, t.initialStatus]);

  useEffect(() => {
    let cancelled = false;
    async function loadExchangeRate() {
      try {
        const response = await fetch('/api/exchange-rate', { cache: 'no-store' });
        if (!response.ok) throw new Error('exchange rate fetch failed');
        const data = (await response.json()) as ExchangeRate;
        if (!cancelled && data?.rate > 0) setExchangeRate(data);
      } catch {
        if (!cancelled) setExchangeRate(fallbackExchangeRate);
      }
    }
    void loadExchangeRate();
    return () => {
      cancelled = true;
    };
  }, []);

  const quote = useMemo<QuoteResult | null>(() => {
    if (!measurement || !selectedMaterial) return null;
    return calculateQuote({ measurement, material: selectedMaterial, quantity });
  }, [measurement, quantity, selectedMaterial]);

  const salesCopy = useMemo(() => {
    if (!parsedModel || !measurement || !quote || !selectedMaterial) return null;
    return generateSalesCopy({
      fileName: parsedModel.fileName,
      measurement,
      material: selectedMaterial,
      quote,
      quantity,
      language,
      usdToCnyRate: exchangeRate.rate,
    });
  }, [exchangeRate.rate, language, measurement, parsedModel, quantity, quote, selectedMaterial]);

  const quoteFormula = useMemo(() => {
    if (!quote || !selectedMaterial) {
      return {
        material: t.materialFormulaEmpty,
        surface: t.surfaceFormulaEmpty,
        subtotal: t.subtotalFormulaEmpty,
        final: t.finalFormulaEmpty,
      };
    }
    const materialUnitPrice = language === 'en' ? cnyToUsd(selectedMaterial.materialPricePerG, exchangeRate.rate) : selectedMaterial.materialPricePerG;
    const surfaceUnitPrice = language === 'en' ? cnyToUsd(selectedMaterial.surfaceAreaPricePerMm2, exchangeRate.rate) : selectedMaterial.surfaceAreaPricePerMm2;
    return {
      material: t.materialFormula(
        quote.estimatedWeightG ? quote.estimatedWeightG.toFixed(1) : t.fallback,
        Number(materialUnitPrice.toFixed(4)),
        formatMoney(quote.materialCost, language),
      ),
      surface: t.surfaceFormula(
        quote.surfaceAreaMm2 ? formatNumber(quote.surfaceAreaMm2, language, t.fallback, 0) : t.fallback,
        Number(surfaceUnitPrice.toFixed(6)),
        formatMoney(quote.surfaceAreaCost, language),
      ),
      subtotal: t.subtotalFormula(
        formatMoney(quote.materialCost, language),
        formatMoney(quote.surfaceAreaCost, language),
        formatMoney(quote.failureBuffer, language),
        formatMoney(quote.subtotalCost, language),
      ),
      final: t.finalFormula(
        formatMoney(selectedMaterial.materialMinimumCharge, language),
        formatMoney(quote.subtotalCost, language),
        Math.round(selectedMaterial.markupRate * 100),
        quantity,
        formatMoney(quote.finalPrice, language),
      ),
    };
  }, [exchangeRate.rate, language, quantity, quote, selectedMaterial, t]);

  async function handleFile(file: File) {
    setError(null);
    setCopied(false);
    setCurrentFile({ name: file.name, size: file.size });
    setProgressPercent(1);
    setStatus(t.importing);
    try {
      const format = getModelFormat(file.name);
      const buffer = await readFileWithProgress(file, (percent) => {
        setProgressPercent(percent);
        setStatus(t.importingWithPercent(percent));
      });
      setProgressPercent(70);
      setStatus(t.parsing);
      await waitForPaint();
      const object = await parseModelBuffer(buffer, format);
      const parsed = { fileName: file.name, format, object };
      setProgressPercent(90);
      setStatus(t.measuring);
      await waitForPaint();
      const measured = measureModel(parsed.object);
      setParsedModel(parsed);
      setModelObject(parsed.object);
      setMeasurement(measured);
      setProgressPercent(100);
      setStatus(t.completed);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t.modelParseFailed);
      setProgressPercent(null);
      setStatus(t.parseFailed);
    }
  }

  function updateMaterial(patch: Partial<MaterialProfile>) {
    if (!selectedMaterial) return;
    const nextMaterials = saveMaterialOverride(selectedMaterial.id, patch);
    setMaterials(nextMaterials);
  }

  async function copySalesCopy() {
    if (!salesCopy) return;
    await navigator.clipboard.writeText(`${salesCopy.shortMessage}\n${salesCopy.riskNote}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1480px] px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-4">
              <Image src="/brand/unionam-logo.png" alt="UnionAM" width={186} height={56} priority className="h-10 w-auto" />
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-lg font-black tracking-normal">{t.appTitle}</div>
                </div>
                <div className="mt-0.5 text-xs font-medium text-slate-500">{t.appSubtitle}</div>
              </div>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setLanguageOpen((value) => !value)}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-[#0b4f9c] px-3 text-sm font-black text-white shadow-sm transition hover:bg-[#083f7e]"
              >
                <Globe2 className="h-4 w-4" />
                <span>{language === 'zh' ? '中文' : 'English'}</span>
                <ChevronDown className={`h-4 w-4 transition ${languageOpen ? 'rotate-180' : ''}`} />
              </button>
              {languageOpen ? (
                <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-36 rounded-md border border-slate-200 bg-white p-2 shadow-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setLanguage('zh');
                      setLanguageOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-bold ${language === 'zh' ? 'text-[#0b4f9c]' : 'text-slate-950 hover:bg-slate-50'}`}
                  >
                    <Languages className="h-4 w-4" />
                    中文
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLanguage('en');
                      setLanguageOpen(false);
                    }}
                    className={`mt-1 flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-bold ${language === 'en' ? 'text-[#0b4f9c]' : 'text-slate-950 hover:bg-slate-50'}`}
                  >
                    <Languages className="h-4 w-4" />
                    English
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1480px] items-start gap-4 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_430px]">
        <section className="grid gap-2">
          <div className="flex h-10 items-center text-xl font-black text-[#0b4f9c]">{t.freeQuoteTool}</div>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div
            className="relative h-[58vh] min-h-[460px] border-b border-slate-200 bg-[linear-gradient(180deg,#f8fafc,#eef4f7)]"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const file = event.dataTransfer.files.item(0);
              if (file) void handleFile(file);
            }}
          >
            {modelObject ? (
              <ThreeModelViewer object={modelObject} color="#cdeef6" labels={t} />
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-5 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white/60 text-center transition hover:border-cyan-500 hover:bg-cyan-50/50"
              >
                <FileUp className="h-12 w-12 text-cyan-700" />
                <span className="mt-4 text-xl font-black text-slate-900">{t.dropTitle}</span>
                <span className="mt-2 max-w-md text-sm font-medium leading-6 text-slate-500">{t.dropSubtitle}</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" className="hidden" onChange={(event) => event.target.files?.[0] && void handleFile(event.target.files[0])} />
            <div className="absolute left-4 top-4 min-w-56 rounded-md border border-white/70 bg-white/90 px-3 py-2 text-xs font-bold text-slate-700 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <span>{status}</span>
                {progressPercent !== null ? <span className="shrink-0 text-cyan-700">{progressPercent}%</span> : null}
              </div>
              {progressPercent !== null && progressPercent < 100 ? (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-cyan-500 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-4 left-4 inline-flex h-10 items-center gap-2 rounded-md bg-[#0b4f9c] px-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#083f7e]"
            >
              <FileUp className="h-4 w-4" />
              {t.selectModel}
            </button>
          </div>

          <div className="border-b border-slate-100 px-4 pt-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-500">{t.fileName}</div>
                <div className="mt-1 truncate text-sm font-black text-slate-950">{currentFile?.name ?? parsedModel?.fileName ?? '--'}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-xs font-bold text-slate-500">{t.fileSize}</div>
                <div className="mt-1 text-sm font-black text-slate-950">{formatFileSize(currentFile?.size ?? null)}</div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr]">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-bold text-slate-500">{t.dimensions}</div>
              <div className="mt-2 text-lg font-black">{measurement ? `${formatNumber(measurement.dimensionsMm.x, language, t.fallback)} × ${formatNumber(measurement.dimensionsMm.y, language, t.fallback)} × ${formatNumber(measurement.dimensionsMm.z, language, t.fallback)} mm` : '--'}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-bold text-slate-500">{t.volume}</div>
              <div className="mt-2 text-lg font-black">{measurement ? `${formatNumber(measurement.volumeCm3, language, t.fallback, 2)} cm³` : '--'}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-bold text-slate-500">{t.surfaceArea}</div>
              <div className="mt-2 text-lg font-black">{measurement?.surfaceAreaMm2 ? `${formatNumber(measurement.surfaceAreaMm2, language, t.fallback, 0)} mm²` : '--'}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-bold text-slate-500">{t.triangles}</div>
              <div className="mt-2 text-lg font-black">{measurement ? measurement.triangleCount.toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US') : '--'}</div>
            </div>
          </div>
          {error ? <div className="mx-4 mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</div> : null}
          </div>
        </section>

        <aside className="grid content-start gap-2">
          <div className="flex h-10 items-center justify-end">
            <div className="inline-flex items-center gap-2 rounded-md border border-cyan-500 bg-cyan-50 px-3 py-2 text-xs font-bold text-[#0b4f9c]">
              <CheckCircle2 className="h-4 w-4" />
              {t.localPrivacy}
            </div>
          </div>
          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-black uppercase text-slate-500">{t.estimatedQuote}</div>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div className="text-4xl font-black tracking-normal text-slate-950">{quote ? formatMoney(quote.finalPrice, language) : (language === 'zh' ? '￥--' : '$--')}</div>
              <label className="grid gap-1 text-xs font-bold text-slate-500">
                {t.quantity}
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(event) => setQuantity(Math.max(1, Number(event.target.value)))}
                  className="h-9 w-20 rounded-md border border-slate-200 px-2 text-sm font-black text-slate-900 outline-none"
                />
              </label>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md bg-slate-50 p-3">
                <div className="font-bold text-slate-500">{t.unitPrice}</div>
                <div className="mt-1 text-base font-black">{quote ? formatMoney(quote.unitPrice, language) : '--'}</div>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <div className="font-bold text-slate-500">{t.weight}</div>
                <div className="mt-1 text-base font-black">{quote?.estimatedWeightG ? `${formatNumber(quote.estimatedWeightG, language, t.fallback)} g` : '--'}</div>
              </div>
            </div>
            {language === 'en' ? (
              <div className="mt-2 text-[11px] font-medium text-slate-400">
                1 USD = {exchangeRate.rate.toFixed(4)} CNY
                {exchangeRate.isFallback ? ' (fallback)' : exchangeRate.fetchedAt ? ` · updated ${exchangeRate.fetchedAt}` : ''}
              </div>
            ) : null}
            <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs font-medium leading-5 text-slate-500">
              <div className="mb-1 font-black text-slate-700">{t.formula}</div>
              <div>{quoteFormula.material}</div>
              <div>{quoteFormula.surface}</div>
              <div>{quoteFormula.subtotal}</div>
              <div className="mt-1">{quoteFormula.final}</div>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-black">{t.materialPlan}</div>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMaterialOpen((value) => !value)}
                className="flex min-h-16 w-full items-center justify-between gap-3 rounded-lg border border-cyan-500 bg-cyan-50 px-3 py-2 text-left"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-black text-slate-950">
                    {selectedMaterial ? `${selectedMaterial.name} - ${selectedMaterial.process.toUpperCase()}` : t.selectMaterial}
                  </div>
                  <div className="mt-1 line-clamp-1 text-xs font-medium text-slate-500" title={selectedMaterial ? (language === 'en' ? selectedMaterial.descriptionEn ?? selectedMaterial.description : selectedMaterial.description) : undefined}>
                    {selectedMaterial ? (language === 'en' ? selectedMaterial.descriptionEn ?? selectedMaterial.description : selectedMaterial.description) : t.selectMaterialHint}
                  </div>
                </div>
                <div className="ml-auto flex shrink-0 items-center gap-2">
                  <span className="min-w-16 text-right text-base font-black text-slate-950">{quote ? formatMoney(quote.finalPrice, language) : '--'}</span>
                  <ChevronDown className={`h-4 w-4 text-slate-500 transition ${materialOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>
              {materialOpen ? (
                <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-72 overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-xl">
                  {materials
                    .filter((material) => material.enabled)
                    .map((material) => {
                      const previewQuote = measurement ? calculateQuote({ measurement, material, quantity }) : null;
                      return (
                        <button
                          key={material.id}
                          type="button"
                          onClick={() => {
                            setSelectedMaterialId(material.id);
                            setMaterialOpen(false);
                          }}
                          className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left transition hover:bg-slate-50 ${material.id === selectedMaterial?.id ? 'bg-cyan-50' : ''}`}
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-black text-slate-950">{material.name} - {material.process.toUpperCase()}</div>
                            <div className="mt-1 line-clamp-1 text-xs font-medium text-slate-500" title={language === 'en' ? material.descriptionEn ?? material.description : material.description}>
                              {language === 'en' ? material.descriptionEn ?? material.description : material.description}
                            </div>
                          </div>
                          <div className="ml-auto min-w-16 shrink-0 text-right text-base font-black text-slate-950">{previewQuote ? formatMoney(previewQuote.finalPrice, language) : '--'}</div>
                        </button>
                      );
                    })}
                </div>
              ) : null}
            </div>
            {selectedMaterial ? (
              <div className="mt-4 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-2 gap-y-3 border-t border-slate-200 pt-4">
                <EditableNumber label={t.density} value={selectedMaterial.densityGPerCm3} suffix="g/cm³" onChange={(value) => updateMaterial({ densityGPerCm3: value })} />
                <EditableNumber label={t.materialPricePerG} value={displayCurrencyValue(selectedMaterial.materialPricePerG, language, exchangeRate.rate)} suffix={language === 'zh' ? '元/g' : 'USD/g'} onChange={(value) => updateMaterial({ materialPricePerG: inputCurrencyValue(value, language, exchangeRate.rate) })} />
                <EditableNumber label={t.surfaceAreaPrice} value={displayCurrencyValue(selectedMaterial.surfaceAreaPricePerMm2, language, exchangeRate.rate)} suffix={language === 'zh' ? '元/mm²' : 'USD/mm²'} onChange={(value) => updateMaterial({ surfaceAreaPricePerMm2: inputCurrencyValue(value, language, exchangeRate.rate) })} />
                <EditableNumber label={t.materialMinimumCharge} value={displayCurrencyValue(selectedMaterial.materialMinimumCharge, language, exchangeRate.rate)} suffix={language === 'zh' ? '元' : 'USD'} onChange={(value) => updateMaterial({ materialMinimumCharge: inputCurrencyValue(value, language, exchangeRate.rate) })} />
                <EditableNumber label={t.loss} value={Number((selectedMaterial.failureRate * 100).toFixed(2))} suffix="%" onChange={(value) => updateMaterial({ failureRate: value / 100 })} />
                <EditableNumber label={t.markupRate} value={Number((selectedMaterial.markupRate * 100).toFixed(2))} suffix="%" onChange={(value) => updateMaterial({ markupRate: value / 100 })} />
                <button
                  type="button"
                  onClick={() => {
                    const nextMaterials = resetMaterialOverrides();
                    setMaterials(nextMaterials);
                    setSelectedMaterialId(nextMaterials[0]?.id ?? '');
                  }}
                  className="col-span-2 inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[#0b4f9c]/25 text-sm font-bold text-[#0b4f9c] transition hover:bg-[#0b4f9c]/5"
                >
                  <RotateCcw className="h-4 w-4" />
                  {t.resetMaterial}
                </button>
              </div>
            ) : null}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-black">{t.salesCopy}</div>
              <button
                type="button"
                disabled={!salesCopy}
                onClick={() => void copySalesCopy()}
                className="inline-flex h-8 items-center gap-1 rounded-md bg-[#0b4f9c] px-2 text-xs font-bold text-white transition hover:bg-[#083f7e] disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Copy className="h-3.5 w-3.5" />
                {copied ? t.copied : t.copy}
              </button>
            </div>
            <div className="min-h-32 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-medium leading-7 text-slate-700">
              {salesCopy ? (
                <>
                  <p>{salesCopy.shortMessage}</p>
                  <p className="mt-3 text-xs leading-6 text-slate-500">{salesCopy.riskNote}</p>
                </>
              ) : (
                <span className="text-slate-400">{t.salesCopyPlaceholder}</span>
              )}
            </div>
          </section>
        </aside>
      </div>

    </main>
  );
}
