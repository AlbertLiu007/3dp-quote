import { NextResponse } from 'next/server';
import { readExchangeRate } from '@/lib/pricing/exchange-rate-server';
import { LOG_EVENTS } from '@/lib/observability/events.mjs';
import { createTrustedRequestContext, requestDurationMs } from '@/lib/observability/request-context.mjs';
import { applicationLogger } from '@/lib/observability/structured-logger.mjs';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const context = createTrustedRequestContext(request, request.headers.get('x-unionam-request-id'));

  try {
    const rate = await readExchangeRate();
    const result = rate.isFallback ? 'fallback' : 'success';
    await (rate.isFallback ? applicationLogger.warn : applicationLogger.info)(LOG_EVENTS.HTTP_REQUEST_COMPLETED, result, {
      request_id: context.requestId,
      duration_ms: requestDurationMs(context),
      error_code: rate.isFallback ? 'EXCHANGE_RATE_FALLBACK' : null,
      details: {
        http_method: context.method,
        route: '/quote/api/exchange-rate',
        status_code: 200,
      },
    });
    return NextResponse.json(rate, { headers: { 'X-Request-ID': context.requestId } });
  } catch {
    await applicationLogger.error(LOG_EVENTS.HTTP_REQUEST_FAILED, 'failure', {
      request_id: context.requestId,
      duration_ms: requestDurationMs(context),
      error_code: 'EXCHANGE_RATE_READ_FAILED',
      details: {
        http_method: context.method,
        route: '/quote/api/exchange-rate',
        status_code: 500,
      },
    });
    return NextResponse.json(
      { error: 'exchange_rate_unavailable', request_id: context.requestId },
      { status: 500, headers: { 'X-Request-ID': context.requestId } },
    );
  }
}
