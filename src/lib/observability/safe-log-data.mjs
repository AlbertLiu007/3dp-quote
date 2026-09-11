const MAX_STRING_LENGTH = 512;
const REDACTED = '[REDACTED]';

const sensitiveKeyFragments = [
  'password',
  'passwd',
  'token',
  'authorization',
  'cookie',
  'secret',
  'phone',
  'email',
  'accesskey',
  'signature',
  'signedurl',
  'filename',
  'requestbody',
];

const prohibitedBusinessKeyFragments = ['model', 'material', 'quote', 'upload', 'imagecontent', 'filecontent'];

function normalizeKey(key) {
  return String(key).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function shouldRedactKey(key) {
  const normalized = normalizeKey(key);
  return [...sensitiveKeyFragments, ...prohibitedBusinessKeyFragments].some((fragment) => normalized.includes(fragment));
}

export function sanitizeLogString(value, maxLength = MAX_STRING_LENGTH) {
  const sanitized = String(value)
    .replace(/[\r\n]/g, (character) => (character === '\r' ? '\\r' : '\\n'))
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, (character) => {
      return `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`;
    });
  return sanitized.length > maxLength ? `${sanitized.slice(0, maxLength)}…` : sanitized;
}

export function redactLogValue(value, seen = new WeakSet()) {
  if (value === null || value === undefined || typeof value === 'boolean' || typeof value === 'number') return value ?? null;
  if (typeof value === 'string') return sanitizeLogString(value);
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Error) return { name: sanitizeLogString(value.name, 80) };
  if (Array.isArray(value)) return value.slice(0, 50).map((entry) => redactLogValue(entry, seen));
  if (typeof value !== 'object') return sanitizeLogString(String(value));
  if (seen.has(value)) return '[CIRCULAR]';

  seen.add(value);
  const output = {};
  for (const [key, entry] of Object.entries(value).slice(0, 100)) {
    const safeKey = sanitizeLogString(key, 80);
    output[safeKey] = shouldRedactKey(key) ? REDACTED : redactLogValue(entry, seen);
  }
  seen.delete(value);
  return output;
}

export { REDACTED };
