// Keep pricing internally in CNY; convert display/input values in English mode.
// The server updates this daily from a public exchange-rate API; this value is the safe fallback.
export const FALLBACK_USD_TO_CNY_RATE = 6.7873;

export type ExchangeRate = {
  base: 'USD';
  quote: 'CNY';
  rate: number;
  source: string;
  fetchedAt: string;
  isFallback?: boolean;
};

export const fallbackExchangeRate: ExchangeRate = {
  base: 'USD',
  quote: 'CNY',
  rate: FALLBACK_USD_TO_CNY_RATE,
  source: 'fallback',
  fetchedAt: '2026-05-27T08:00:00+08:00',
  isFallback: true,
};

export function cnyToUsd(value: number, rate = FALLBACK_USD_TO_CNY_RATE) {
  return value / rate;
}

export function usdToCny(value: number, rate = FALLBACK_USD_TO_CNY_RATE) {
  return value * rate;
}
