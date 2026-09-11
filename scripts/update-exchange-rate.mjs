import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { LOG_EVENTS } from '../src/lib/observability/events.mjs';
import { applicationLogger } from '../src/lib/observability/structured-logger.mjs';

const outputPath = path.join(process.cwd(), 'data', 'exchange-rate.json');
const apiUrl = process.env.EXCHANGE_RATE_API_URL ?? 'https://open.er-api.com/v6/latest/USD';
const jobId = randomUUID();
const startedAt = performance.now();
const abortController = new AbortController();
let cancelledSignal = null;

function toBeijingIsoString(date = new Date()) {
  const beijing = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  return `${beijing.toISOString().replace('Z', '+08:00')}`;
}

function readCnyRate(payload) {
  const rate = payload?.rates?.CNY ?? payload?.conversion_rates?.CNY;
  return typeof rate === 'number' && Number.isFinite(rate) && rate > 0 ? rate : null;
}

async function readPreviousRate() {
  try {
    const raw = await fs.readFile(outputPath, 'utf8');
    return readCnyRate({ rates: { CNY: JSON.parse(raw)?.rate } });
  } catch {
    return null;
  }
}

function durationMs() {
  return Math.max(0, performance.now() - startedAt);
}

function throwIfCancelled() {
  if (!cancelledSignal) return;
  const error = new Error('Exchange-rate update cancelled.');
  error.name = 'AbortError';
  throw error;
}

function logFields(errorCode = null, details = {}) {
  return {
    request_id: jobId,
    duration_ms: durationMs(),
    error_code: errorCode,
    details: { job_type: 'exchange_rate_update', ...details },
  };
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    cancelledSignal = signal;
    abortController.abort();
  });
}

async function main() {
  await applicationLogger.info(LOG_EVENTS.EXCHANGE_RATE_JOB_CREATED, 'created', logFields());
  await applicationLogger.info(LOG_EVENTS.EXCHANGE_RATE_JOB_STARTED, 'started', logFields());
  const previousRate = await readPreviousRate();
  const response = await fetch(apiUrl, {
    headers: {
      accept: 'application/json',
      'user-agent': 'uniontech-3dp-quote-tool/0.1',
    },
    signal: abortController.signal,
  });

  if (!response.ok) {
    throw new Error(`Exchange-rate API failed: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  throwIfCancelled();
  const rate = readCnyRate(payload);
  if (!rate) {
    throw new Error('Exchange-rate API response does not contain a valid USD/CNY rate.');
  }

  const nextRate = {
    base: 'USD',
    quote: 'CNY',
    rate: Number(rate.toFixed(6)),
    source: apiUrl,
    fetchedAt: toBeijingIsoString(),
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  throwIfCancelled();
  await fs.writeFile(outputPath, `${JSON.stringify(nextRate, null, 2)}\n`);
  if (previousRate !== nextRate.rate) {
    await applicationLogger.audit(LOG_EVENTS.EXCHANGE_RATE_CHANGED, 'success', logFields(null, {
      previous_rate: previousRate,
      current_rate: nextRate.rate,
      currency_pair: 'USD/CNY',
    }));
  }
  await applicationLogger.info(LOG_EVENTS.EXCHANGE_RATE_JOB_COMPLETED, 'success', logFields(null, {
    changed: previousRate !== nextRate.rate,
  }));
}

try {
  await main();
} catch (error) {
  const cancelled = cancelledSignal !== null || error?.name === 'AbortError';
  const event = cancelled ? LOG_EVENTS.EXCHANGE_RATE_JOB_CANCELLED : LOG_EVENTS.EXCHANGE_RATE_JOB_FAILED;
  const errorCode = cancelled ? 'JOB_CANCELLED' : 'EXCHANGE_RATE_UPDATE_FAILED';
  await applicationLogger[cancelled ? 'warn' : 'error'](event, cancelled ? 'cancelled' : 'failure', logFields(errorCode, {
    error_name: error instanceof Error ? error.name : 'UnknownError',
  }));
  process.exitCode = cancelled ? 130 : 1;
}
