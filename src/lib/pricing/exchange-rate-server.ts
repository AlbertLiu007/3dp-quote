import fs from 'node:fs/promises';
import path from 'node:path';
import { fallbackExchangeRate, type ExchangeRate } from './exchange-rate';

const exchangeRatePath = path.join(process.cwd(), 'data', 'exchange-rate.json');

function isValidExchangeRate(value: unknown): value is ExchangeRate {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<ExchangeRate>;
  return entry.base === 'USD' && entry.quote === 'CNY' && typeof entry.rate === 'number' && Number.isFinite(entry.rate) && entry.rate > 0;
}

export async function readExchangeRate(): Promise<ExchangeRate> {
  try {
    const raw = await fs.readFile(exchangeRatePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (isValidExchangeRate(parsed)) return parsed;
  } catch {
    // Use fallback below.
  }
  return fallbackExchangeRate;
}
