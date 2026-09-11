export const LOG_EVENTS: Readonly<{
  HTTP_REQUEST_RECEIVED: 'http.request.received';
  HTTP_REQUEST_COMPLETED: 'http.request.completed';
  HTTP_REQUEST_FAILED: 'http.request.failed';
  EXCHANGE_RATE_JOB_CREATED: 'job.exchange_rate.created';
  EXCHANGE_RATE_JOB_STARTED: 'job.exchange_rate.started';
  EXCHANGE_RATE_JOB_COMPLETED: 'job.exchange_rate.completed';
  EXCHANGE_RATE_JOB_FAILED: 'job.exchange_rate.failed';
  EXCHANGE_RATE_JOB_CANCELLED: 'job.exchange_rate.cancelled';
  EXCHANGE_RATE_CHANGED: 'audit.exchange_rate.changed';
}>;
