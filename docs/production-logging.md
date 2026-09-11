# Production logging and audit operations

This document covers the `/quote` application's server-side HTTP endpoint and
the exchange-rate update job. Model parsing, file inspection, material edits,
and quote calculation remain browser-only. They are not sent to this service
and do not produce server-side audit records. The former Umami script and
custom browser behavior events have been removed so page views and quote-tool
interactions are not sent to an analytics service.

## Log contract

The service name is `unionam-quote`. Every application and audit record is one
JSON object on one line and includes:

- `time`, `level`, `service`, `environment`
- `event`, `result`, `request_id`, `duration_ms`, `error_code`
- `log_type` (`application` or `audit`) and sanitized `details`

Production defaults to:

```text
/var/log/unionam/unionam-quote/application.jsonl
```

Create that directory before starting the service and grant only the service
account write access. If the file cannot be written, the logger falls back to
stdout without failing the HTTP request or job. This makes it compatible with
PM2 and systemd stdout/stderr collection as well as file collection.

Supported process configuration:

```bash
NODE_ENV=production
LOG_SERVICE=unionam-quote
APPLICATION_LOG_PATH=/var/log/unionam/unionam-quote/application.jsonl
APPLICATION_LOG_DESTINATION=file
```

`APPLICATION_LOG_DESTINATION` may be `file`, `stdout`, or `both`. Do not put
credentials or business data in these variables.

## Events actually emitted

| Event | Type | When |
| --- | --- | --- |
| `http.request.received` | application | A dynamic application request is accepted and assigned a trusted ID |
| `http.request.completed` | application | Exchange-rate HTTP response succeeds or uses fallback data |
| `http.request.failed` | application | Exchange-rate HTTP response cannot be produced |
| `job.exchange_rate.created` | application | Exchange-rate update process is created |
| `job.exchange_rate.started` | application | Exchange-rate update begins |
| `job.exchange_rate.completed` | application | Exchange-rate update succeeds |
| `job.exchange_rate.failed` | application | Exchange-rate update fails |
| `job.exchange_rate.cancelled` | application | Exchange-rate update receives SIGINT/SIGTERM or is aborted |
| `audit.exchange_rate.changed` | audit | The stored USD/CNY rate actually changes |

There are no login, server authorization, server-side material-price editing,
configuration UI, or data-export features in this project, so no events for
those nonexistent operations are emitted. Browser `localStorage` changes are
intentionally not server audit events.

## Data protection

The recursive sanitizer redacts keys containing, case-insensitively and across
snake/camel/kebab naming: `password`, `passwd`, `token`, `authorization`,
`cookie`, `secret`, `phone`, `email`, `access_key`, `accesskey`, `signature`,
`signed_url`, `filename`, and `request_body`.

As an extra project boundary, keys referring to model, material, quote, upload,
image content, or file content are also redacted. The code never intentionally
logs Authorization/Cookie headers, request bodies, uploaded content, filenames,
signed URLs, environment-variable collections, API payloads, or error messages.
External strings have CR/LF and control characters escaped and are truncated.

Each HTTP request receives a new server-generated UUID. An inbound public
`X-Request-ID` and any attempted internal correlation header are overwritten by
middleware, and the trusted value is returned as `X-Request-ID`. Middleware
request-received records use stdout because the Next.js middleware runtime has
no filesystem access; API completion/failure records use the configured file
with stdout fallback.

## Pre-production commands

Run from the release checkout:

```bash
npm ci
npm test
npm run typecheck
npm run build
```

Prepare the log directory as the intended service account (example only; adapt
the account name to the host):

```bash
sudo install -d -m 0750 -o syntekdeploy -g syntekdeploy /var/log/unionam/unionam-quote
sudo touch /var/log/unionam/unionam-quote/application.jsonl
sudo chown syntekdeploy:syntekdeploy /var/log/unionam/unionam-quote/application.jsonl
sudo chmod 0640 /var/log/unionam/unionam-quote/application.jsonl
```

Start command for a process manager:

```bash
NODE_ENV=production \
APPLICATION_LOG_PATH=/var/log/unionam/unionam-quote/application.jsonl \
APPLICATION_LOG_DESTINATION=file \
npm run start
```

PM2 may run the same `npm run start` command. For systemd, put the variables in
the unit's `Environment=`/`EnvironmentFile=` configuration and use
`ExecStart=/usr/bin/npm run start`; systemd stdout/stderr remains useful as the
automatic fallback. Never log or print the environment file.

The existing `deploy/deploy-jiyin-static.sh` only publishes static browser
files. It cannot run the Next.js exchange-rate route or create application
logs. Do not use it for this server-enabled release. An operator must create a
versioned server release and update the existing `/quote` reverse proxy to the
Next.js listener after backing up and validating the live configuration. That
Nginx/systemd/PM2 work is deliberately outside this repository change.

## Acceptance

After an operator starts the release, use a non-sensitive request:

```bash
curl -i https://jiyin3d.com/quote/api/exchange-rate
```

Confirm that the response has `X-Request-ID`, then validate recent records:

```bash
sudo tail -n 20 /var/log/unionam/unionam-quote/application.jsonl
sudo tail -n 20 /var/log/unionam/unionam-quote/application.jsonl | jq -e -c '
  select(
    has("time") and has("level") and has("service") and
    has("environment") and has("event") and has("result") and
    has("request_id") and has("duration_ms") and has("error_code")
  )'
```

Run the real scheduled job manually only in the approved maintenance procedure:

```bash
npm run exchange-rate:update
```

Verify the `created`, `started`, and `completed` (or `failed`/`cancelled`) job
records and an audit record only when the rate changed. Do not paste production
logs into public tickets because future event details may still be operationally
sensitive even after sanitization.

## Rollback

Keep the previous versioned application directory and process-manager
configuration. To roll back, repoint the process manager to the previous
release, restart it, verify the endpoint and its `X-Request-ID`, then restore
the previous Nginx upstream only if it changed. Do not delete the new release
or its logs until the incident is reviewed.

Repository-level rollback before deployment can be reviewed with:

```bash
git diff -- src/app/api/exchange-rate/route.ts src/lib/observability scripts/update-exchange-rate.mjs src/app/page.tsx package.json docs/production-logging.md deploy/README.md
```

Use the organization's normal revert workflow for the exact release commit;
do not use a destructive working-tree reset.

## LoongCollector / SLS manual work

No SLS, OSS, or LoongCollector setting is changed here. An operator must:

1. Add the file path
   `/var/log/unionam/unionam-quote/application.jsonl` to the appropriate
   LoongCollector configuration (or deliberately collect process stdout).
2. Select one-line JSON parsing; do not configure multiline joining.
3. Map the required top-level fields without copying `details` into labels with
   unbounded cardinality.
4. Set retention, access control, alerting, and index rules under the
   organization's policy.
5. Test collection with synthetic, non-sensitive records and verify that no
   Authorization, Cookie, token, filename, model, material, quote, request body,
   upload, or environment data appears.
6. Avoid duplicate ingestion if both the file and PM2/systemd stdout are
   collected, especially when `APPLICATION_LOG_DESTINATION=both`.
