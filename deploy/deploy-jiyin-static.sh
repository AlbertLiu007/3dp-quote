#!/usr/bin/env bash

set -euo pipefail

readonly DEPLOY_HOST="${DEPLOY_HOST:-8.153.16.140}"
readonly DEPLOY_USER="${DEPLOY_USER:-syntekdeploy}"
readonly DEPLOY_KEY="${DEPLOY_KEY:-/Users/albert/.ssh/codex_syntek_deploy}"
readonly EXPORT_DIR=".next-build"
readonly WEB_DIR="/var/www/syntek-site/quote"
readonly RELEASE_ROOT="/home/syntekdeploy/releases"
readonly RELEASE_ID="$(date +%Y%m%d%H%M%S)"
readonly STAGING_DIR="${RELEASE_ROOT}/quote-${RELEASE_ID}"
readonly ROLLBACK_DIR="${RELEASE_ROOT}/quote-rollback-${RELEASE_ID}"
readonly REMOTE="${DEPLOY_USER}@${DEPLOY_HOST}"

if [[ ! -r "$DEPLOY_KEY" ]]; then
  echo "SSH private key is not readable: $DEPLOY_KEY" >&2
  exit 1
fi

npm ci
npm run typecheck
npm run build

if [[ ! -f "$EXPORT_DIR/index.html" || ! -d "$EXPORT_DIR/_next" ]]; then
  echo "Static export is incomplete: expected $EXPORT_DIR/index.html and $EXPORT_DIR/_next" >&2
  exit 1
fi

for forbidden_path in server cache types node_modules package.json package-lock.json tsconfig.json; do
  if [[ -e "$EXPORT_DIR/$forbidden_path" ]]; then
    echo "Refusing to publish non-static build content: $EXPORT_DIR/$forbidden_path" >&2
    exit 1
  fi
done

ssh -o BatchMode=yes -i "$DEPLOY_KEY" "$REMOTE" \
  "mkdir -p '$RELEASE_ROOT' '$STAGING_DIR'"

rsync -a --delete -e "ssh -o BatchMode=yes -i $DEPLOY_KEY" \
  "$EXPORT_DIR/" "$REMOTE:$STAGING_DIR/"

ssh -o BatchMode=yes -i "$DEPLOY_KEY" "$REMOTE" "
  set -e
  test -f '$STAGING_DIR/index.html'
  test -d '$STAGING_DIR/_next'
  test -d '$WEB_DIR'
  mv '$WEB_DIR' '$ROLLBACK_DIR'
  if ! mv '$STAGING_DIR' '$WEB_DIR'; then
    mv '$ROLLBACK_DIR' '$WEB_DIR'
    exit 1
  fi
  printf 'release=%s\nrollback=%s\n' '$WEB_DIR' '$ROLLBACK_DIR'
"

curl --fail --silent --show-error --location \
  --output /dev/null "https://jiyin3d.com/quote/"

echo "Quote static deployment completed."
echo "Rollback directory: $ROLLBACK_DIR"
