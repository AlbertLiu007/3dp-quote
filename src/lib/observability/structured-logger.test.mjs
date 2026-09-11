import assert from 'node:assert/strict';
import test from 'node:test';
import { LOG_EVENTS } from './events.mjs';
import { createTrustedRequestContext } from './request-context.mjs';
import { createStructuredLogger, redactLogValue, REDACTED, sanitizeLogString } from './structured-logger.mjs';

test('writes one-line JSON with the required application fields', async () => {
  const lines = [];
  const logger = createStructuredLogger({ environment: 'test', writeLine: (line) => lines.push(line) });

  await logger.info(LOG_EVENTS.HTTP_REQUEST_COMPLETED, 'success', {
    request_id: 'request-1',
    duration_ms: 12.6,
    details: { status_code: 200 },
  });

  assert.equal(lines.length, 1);
  assert.equal(lines[0].includes('\n'), false);
  const record = JSON.parse(lines[0]);
  for (const key of ['time', 'level', 'service', 'environment', 'event', 'result', 'request_id', 'duration_ms', 'error_code']) {
    assert.ok(Object.hasOwn(record, key), `missing required key: ${key}`);
  }
  assert.equal(record.service, 'unionam-quote');
  assert.equal(record.duration_ms, 13);
});

test('creates a trusted request id instead of accepting the public header', () => {
  const attackerValue = 'attacker-controlled-id';
  const first = createTrustedRequestContext(new Request('https://example.test/quote/api/exchange-rate', {
    headers: { 'x-request-id': attackerValue },
  }));
  const second = createTrustedRequestContext(new Request('https://example.test/quote/api/exchange-rate', {
    headers: { 'x-request-id': attackerValue },
  }));

  assert.notEqual(first.requestId, attackerValue);
  assert.notEqual(first.requestId, second.requestId);
  assert.match(first.requestId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
});

test('recursively redacts secrets and prohibited business data', () => {
  const sanitized = redactLogValue({
    password: 'p',
    nested: {
      access_key: 'ak',
      authorization: 'Bearer token',
      cookie: 'session=1',
      emailAddress: 'person@example.test',
      phone: '123',
      signature: 'sig',
      modelFileName: 'customer-part.stl',
      quoteResult: 999,
      safe: 'visible',
    },
  });

  assert.equal(sanitized.password, REDACTED);
  assert.equal(sanitized.nested.access_key, REDACTED);
  assert.equal(sanitized.nested.authorization, REDACTED);
  assert.equal(sanitized.nested.cookie, REDACTED);
  assert.equal(sanitized.nested.emailAddress, REDACTED);
  assert.equal(sanitized.nested.phone, REDACTED);
  assert.equal(sanitized.nested.signature, REDACTED);
  assert.equal(sanitized.nested.modelFileName, REDACTED);
  assert.equal(sanitized.nested.quoteResult, REDACTED);
  assert.equal(sanitized.nested.safe, 'visible');
});

test('escapes log injection characters and limits external strings', () => {
  const value = sanitizeLogString(`line1\r\nline2\u0000${'x'.repeat(700)}`);
  assert.equal(value.includes('\r'), false);
  assert.equal(value.includes('\n'), false);
  assert.equal(value.includes('\u0000'), false);
  assert.match(value, /line1\\r\\nline2\\u0000/);
  assert.ok(value.length <= 513);
});

test('logging failures are swallowed and key events remain registered', async () => {
  const logger = createStructuredLogger({
    environment: 'test',
    writeLine: () => {
      throw new Error('collector unavailable');
    },
  });

  await assert.doesNotReject(() => logger.error(LOG_EVENTS.EXCHANGE_RATE_JOB_FAILED, 'failure'));
  assert.deepEqual(new Set(Object.values(LOG_EVENTS)), new Set([
    'http.request.received',
    'http.request.completed',
    'http.request.failed',
    'job.exchange_rate.created',
    'job.exchange_rate.started',
    'job.exchange_rate.completed',
    'job.exchange_rate.failed',
    'job.exchange_rate.cancelled',
    'audit.exchange_rate.changed',
  ]));
});
