import fs from 'node:fs/promises';
import path from 'node:path';
import { redactLogValue, REDACTED, sanitizeLogString } from './safe-log-data.mjs';

const DEFAULT_SERVICE = 'unionam-quote';
const DEFAULT_LOG_PATH = `/var/log/unionam/${DEFAULT_SERVICE}/application.jsonl`;

function normalizeDestination(value, environment) {
  if (value === 'file' || value === 'stdout' || value === 'both') return value;
  return environment === 'production' ? 'file' : 'stdout';
}

async function appendLine(logPath, line) {
  await fs.mkdir(path.dirname(logPath), { recursive: true, mode: 0o750 });
  await fs.appendFile(logPath, `${line}\n`, { encoding: 'utf8', mode: 0o640 });
}

function writeStdout(line) {
  process.stdout.write(`${line}\n`);
}

export function createStructuredLogger(options = {}) {
  const service = sanitizeLogString(options.service ?? process.env.LOG_SERVICE ?? DEFAULT_SERVICE, 80);
  const environment = sanitizeLogString(options.environment ?? process.env.NODE_ENV ?? 'development', 80);
  const logPath = options.logPath ?? process.env.APPLICATION_LOG_PATH ?? DEFAULT_LOG_PATH;
  const destination = normalizeDestination(options.destination ?? process.env.APPLICATION_LOG_DESTINATION, environment);
  const writeLine = options.writeLine;

  async function emit(level, event, result, fields = {}) {
    try {
      const record = {
        time: new Date().toISOString(),
        level,
        service,
        environment,
        event: sanitizeLogString(event, 120),
        result: sanitizeLogString(result, 80),
        request_id: fields.request_id ? sanitizeLogString(fields.request_id, 128) : null,
        duration_ms: Number.isFinite(fields.duration_ms) ? Math.max(0, Math.round(fields.duration_ms)) : 0,
        error_code: fields.error_code ? sanitizeLogString(fields.error_code, 120) : null,
        log_type: fields.log_type === 'audit' ? 'audit' : 'application',
        details: redactLogValue(fields.details ?? {}),
      };
      const line = JSON.stringify(record);

      if (writeLine) {
        await writeLine(line);
        return;
      }

      if (destination === 'stdout') {
        writeStdout(line);
        return;
      }

      try {
        await appendLine(logPath, line);
        if (destination === 'both') writeStdout(line);
      } catch {
        writeStdout(line);
      }
    } catch {
      // Observability must never interrupt core business logic.
    }
  }

  return {
    info: (event, result, fields) => emit('info', event, result, fields),
    warn: (event, result, fields) => emit('warn', event, result, fields),
    error: (event, result, fields) => emit('error', event, result, fields),
    audit: (event, result, fields = {}) => emit('info', event, result, { ...fields, log_type: 'audit' }),
  };
}

export const applicationLogger = createStructuredLogger();
export { DEFAULT_LOG_PATH, DEFAULT_SERVICE, redactLogValue, REDACTED, sanitizeLogString };
