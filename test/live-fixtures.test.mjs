import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseStream } from '../src/providers.mjs';
import { validateFindings } from '../src/schema.mjs';
for (const provider of ['codex', 'claude']) test('Sanitized real ' + provider + ' smoke retains completed activity and a valid payload', () => {
  const url = new URL('./fixtures/live-' + provider + '.jsonl', import.meta.url);
  const metadata = JSON.parse(readFileSync(new URL('./fixtures/live-' + provider + '.jsonl.metadata.json', import.meta.url), 'utf8'));
  const parsed = parseStream(provider, readFileSync(url, 'utf8'));
  assert.equal(parsed.retrievals.length, metadata.completedRetrievals);
  assert.ok(parsed.retrievals.length >= 2);
  assert.equal(validateFindings(parsed.payload).findings.length, 2);
});
