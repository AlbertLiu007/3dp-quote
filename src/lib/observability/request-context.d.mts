export type TrustedRequestContext = {
  requestId: string;
  method: string;
  startedAt: number;
};

export function createTrustedRequestContext(request: Request, trustedRequestId?: string | null): TrustedRequestContext;
export function requestDurationMs(context: TrustedRequestContext): number;
