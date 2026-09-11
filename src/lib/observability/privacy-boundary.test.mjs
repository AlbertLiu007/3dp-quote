import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

const clientFiles = ['src/app/layout.tsx', 'src/app/page.tsx', 'packages/shared-ui/src/tool-header.tsx', 'src/lib/tool-navigation.ts'];

test('does not load analytics or emit browser behavior telemetry', async () => {
  const contents = await Promise.all(clientFiles.map((file) => fs.readFile(file, 'utf8')));
  const source = contents.join('\n');

  assert.doesNotMatch(source, /umami|analytics|sendBeacon|trackEvent|data-website-id/i);
  const fetchCalls = [...source.matchAll(/fetch\(([^\n]+?)(?:,|\))/g)].map((match) => match[1]);
  assert.deepEqual(fetchCalls, ["'/quote/api/exchange-rate'"]);
});
