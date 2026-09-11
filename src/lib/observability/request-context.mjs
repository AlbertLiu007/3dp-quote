import { randomUUID } from 'node:crypto';

const trustedRequestIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createTrustedRequestContext(request, trustedRequestId = null) {
  return {
    requestId: trustedRequestIdPattern.test(trustedRequestId ?? '') ? trustedRequestId : randomUUID(),
    method: request.method,
    startedAt: performance.now(),
  };
}

export function requestDurationMs(context) {
  return Math.max(0, performance.now() - context.startedAt);
}
