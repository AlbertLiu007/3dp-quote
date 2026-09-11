export function sanitizeLogString(value: unknown, maxLength?: number): string;
export function redactLogValue(value: unknown, seen?: WeakSet<object>): unknown;
export const REDACTED: string;
