import { NextResponse, type NextRequest } from 'next/server';
import { LOG_EVENTS } from '@/lib/observability/events.mjs';
import { redactLogValue, sanitizeLogString } from '@/lib/observability/safe-log-data.mjs';

const service = sanitizeLogString(process.env.LOG_SERVICE ?? 'unionam-quote', 80);
const environment = sanitizeLogString(process.env.NODE_ENV ?? 'development', 80);

function logRequestReceived(request: NextRequest, requestId: string, startedAt: number) {
  try {
    const record = {
      time: new Date().toISOString(),
      level: 'info',
      service,
      environment,
      event: LOG_EVENTS.HTTP_REQUEST_RECEIVED,
      result: 'accepted',
      request_id: requestId,
      duration_ms: Math.max(0, Math.round(performance.now() - startedAt)),
      error_code: null,
      log_type: 'application',
      details: redactLogValue({
        http_method: request.method,
        route: request.nextUrl.pathname,
      }),
    };
    console.log(JSON.stringify(record));
  } catch {
    // Request processing must continue even when stdout logging fails.
  }
}

export function middleware(request: NextRequest) {
  const startedAt = performance.now();
  const requestId = crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-unionam-request-id', requestId);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('X-Request-ID', requestId);
  logRequestReceived(request, requestId, startedAt);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|icon.png|favicon.ico).*)'],
};
