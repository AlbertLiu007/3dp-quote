# jiyin3d.com quote deployment

The quote application is exported as static browser assets under `/quote`.
Application source code and build dependencies must never be copied below the
Nginx web root `/var/www/syntek-site`.

## Directory policy

- Source checkout (optional on the server): `/home/syntekdeploy/apps/quote-app`
- Static production files: `/var/www/syntek-site/quote`
- Release and rollback directories: `/home/syntekdeploy/releases`
- Forbidden legacy source URL: `/quote-app` and every child path

Only the contents of the configured Next.js static export directory
`.next-build/` may be placed in
`/var/www/syntek-site/quote`. Never copy the repository root, `src`, `packages`,
`node_modules`, `package.json`, lock files, TypeScript configuration, `.git`, or
`.next*` build caches into the web root.

## Deploy static output

Run from the repository root on the trusted deployment workstation:

```bash
bash deploy/deploy-jiyin-static.sh
```

The script runs a clean dependency install, type check, and production export.
It verifies that `.next-build/` contains an exported `index.html` and browser
assets, and rejects server, cache, type, dependency, package, lock, and
TypeScript configuration content. It uploads only that validated static output
to a staging release outside the web root, then switches the static directory
and retains the previous release for rollback.

The SSH settings can be overridden without editing the script:

```bash
DEPLOY_HOST=8.153.16.140 \
DEPLOY_USER=syntekdeploy \
DEPLOY_KEY=/path/to/private-key \
bash deploy/deploy-jiyin-static.sh
```

## Nginx source-path block

The two locations in `jiyin3d-quote-source-block.conf` must be inside the HTTPS
`server` block for `jiyin3d.com`, before its generic `location /` fallback. They
return 404 for `/quote-app` and all descendants without blocking JSON,
JavaScript, source maps, WASM, or other legitimate `/quote/` assets.

Always back up the active config, run `nginx -t`, and only then reload Nginx.

## Rollback

Each successful deployment prints an exact rollback directory. To roll back,
move the current `/var/www/syntek-site/quote` aside and move that rollback
directory back into place. Keep both directories until the rollback has been
verified.
