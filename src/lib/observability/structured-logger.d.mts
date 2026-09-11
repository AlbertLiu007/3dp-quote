export type LogFields = {
  request_id?: string | null;
  duration_ms?: number;
  error_code?: string | null;
  log_type?: 'application' | 'audit';
  details?: Record<string, unknown>;
};

export type StructuredLogger = {
  info(event: string, result: string, fields?: LogFields): Promise<void>;
  warn(event: string, result: string, fields?: LogFields): Promise<void>;
  error(event: string, result: string, fields?: LogFields): Promise<void>;
  audit(event: string, result: string, fields?: LogFields): Promise<void>;
};

export function sanitizeLogString(value: unknown, maxLength?: number): string;
export function redactLogValue(value: unknown, seen?: WeakSet<object>): unknown;
export function createStructuredLogger(options?: {
  service?: string;
  environment?: string;
  logPath?: string;
  destination?: 'file' | 'stdout' | 'both';
  writeLine?: (line: string) => void | Promise<void>;
}): StructuredLogger;

export const applicationLogger: StructuredLogger;
export const DEFAULT_LOG_PATH: string;
export const DEFAULT_SERVICE: string;
export const REDACTED: string;
