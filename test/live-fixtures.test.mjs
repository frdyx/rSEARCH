import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseStream } from '../src/providers.mjs';
import { validateFindings } from '../src/schema.mjs';
import { gradeFindings } from '../src/verifier.mjs';
for (const provider of ['codex', 'claude']) test('Sanitized real ' + provider + ' smoke retains completed activity and a valid payload', () => {
  const url = new URL('./fixtures/live-' + provider + '.jsonl', import.meta.url);
  const metadata = JSON.parse(readFileSync(new URL('./fixtures/live-' + provider + '.jsonl.metadata.json', import.meta.url), 'utf8'));
  const parsed = parseStream(provider, readFileSync(url, 'utf8'));
  assert.equal(parsed.retrievals.length, metadata.completedRetrievals);
  assert.ok(parsed.retrievals.length >= 2);
  assert.equal(validateFindings(parsed.payload).findings.length, 2);
});

test('Sanitized full Claude Desktop run preserves 14 retrievals, 11 findings and confidence demotions', () => {
  const metadata = JSON.parse(readFileSync(new URL('./fixtures/live-claude-desktop.jsonl.metadata.json', import.meta.url), 'utf8'));
  const parsed = parseStream('claude', readFileSync(new URL('./fixtures/live-claude-desktop.jsonl', import.meta.url), 'utf8'));
  assert.equal(parsed.retrievals.length, metadata.completedRetrievals);
  assert.equal(parsed.retrievals.length, 14);
  assert.deepEqual(parsed.errors, []);
  const payload = validateFindings(parsed.payload);
  assert.equal(payload.findings.length, metadata.findingCount);
  assert.equal(payload.findings.length, 11);
  const dossier = gradeFindings(payload.findings.map(finding => ({ finding, provider: 'claude', runId: 'recorded-desktop-run', repo: null })));
  assert.deepEqual(dossier.tierCounts, { T3_observed: 11 });
  assert.equal(dossier.demotedCount, 3);
  assert.equal(dossier.corroboratedCount, 0);
});

test('Sanitized full Codex Desktop run preserves seven retrievals and 11 observed findings', () => {
  const metadata = JSON.parse(readFileSync(new URL('./fixtures/live-codex-desktop.jsonl.metadata.json', import.meta.url), 'utf8'));
  const parsed = parseStream('codex', readFileSync(new URL('./fixtures/live-codex-desktop.jsonl', import.meta.url), 'utf8'));
  assert.equal(parsed.retrievals.length, metadata.completedRetrievals);
  assert.equal(parsed.retrievals.length, 7);
  assert.deepEqual(parsed.errors, []);
  const payload = validateFindings(parsed.payload);
  assert.equal(payload.findings.length, metadata.findingCount);
  assert.equal(payload.findings.length, 11);
  const dossier = gradeFindings(payload.findings.map(finding => ({ finding, provider: 'codex', runId: 'recorded-codex-desktop-run', repo: null })));
  assert.deepEqual(dossier.tierCounts, { T3_observed: 11 });
  assert.equal(dossier.demotedCount, 0);
  assert.equal(dossier.corroboratedCount, 0);
  assert.equal(dossier.singleChannel, true);
});
