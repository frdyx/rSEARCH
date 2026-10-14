import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runResearch } from '../src/runtime.mjs';
import { verifyRuns } from '../src/verifier.mjs';
import { ResearchJobs } from '../src/jobs.mjs';

const fake = fileURLToPath(new URL('../test-support/fake-provider.mjs', import.meta.url));
const dependencies = mode => ({ providerVersion: async () => 'fixture-provider 1.0', invocation: provider => ({ command: process.execPath, args: [fake, provider, mode] }) });
const home = () => mkdtempSync(path.join(tmpdir(), 'rsearch output with spaces '));
const run = (provider, mode = 'ok', extra = {}) => runResearch({ provider, brief: 'Research pagination.', home: home(), ...extra }, dependencies(mode));

for (const provider of ['codex', 'claude']) {
  test(provider + ' completes a dossier and verifies its raw stream', async () => {
    const result = await run(provider);
    assert.equal(result.state, 'completed');
    assert.equal(result.completedRetrievals, 2);
    assert.match(readFileSync(path.join(result.directory, 'dossier.md'), 'utf8'), /cafés and 日本語/);
    assert.equal(verifyRuns([result.directory]).tierCounts.T3_observed, 1);
  });
  for (const mode of ['no-search', 'single', 'failed-search', 'invalid', 'empty', 'exit-failure']) {
    test(provider + ' refuses ' + mode + ' and preserves failure metadata', async () => {
      await assert.rejects(run(provider, mode), error => {
        assert.equal(error.run.state, 'failed');
        assert.notEqual(error.run.verdict, 'RETRIEVAL_VERIFIED');
        assert.throws(() => verifyRuns([error.run.directory]), /unsuccessful/);
        return true;
      });
    });
  }
}
test('Changed findings and changed raw streams cannot pass re-verification', async () => {
  const result = await run('codex');
  const findings = path.join(result.directory, 'findings.json');
  const original = readFileSync(findings, 'utf8');
  writeFileSync(findings, original.replace('cafés', 'altered'));
  assert.throws(() => verifyRuns([result.directory]), /differ/);
  writeFileSync(findings, original);
  writeFileSync(path.join(result.directory, 'provider-stream.jsonl'), '{}\n');
  assert.throws(() => verifyRuns([result.directory]), /digest/);
});
test('Timeout stops a provider and retains diagnostics', async () => {
  await assert.rejects(run('claude', 'slow', { timeoutSeconds: 1 }), error => {
    assert.equal(error.run.verdict, 'TIMEOUT'); return true;
  });
});
test('Cancellation stops a provider and releases the store lock', async () => {
  const controller = new AbortController();
  const store = home();
  const pending = run('codex', 'slow', { signal: controller.signal, home: store });
  setTimeout(() => controller.abort('CANCELLED'), 250);
  await assert.rejects(pending, error => error.run.state === 'cancelled');
  assert.equal((await run('codex', 'ok', { home: store })).state, 'completed');
});
test('One active run per store, with explicit failure instead of another provider', async () => {
  const store = home(); const controller = new AbortController();
  const first = run('codex', 'slow', { home: store, signal: controller.signal });
  await assert.rejects(run('claude', 'ok', { home: store }), /active/);
  controller.abort('CANCELLED');
  await assert.rejects(first);
});
test('Desktop jobs start immediately, restrict reads, and support cancellation', async () => {
  const jobs = new ResearchJobs({ provider: 'claude', home: home(), dependencies: dependencies('slow') });
  const start = performance.now();
  const job = jobs.start({ brief: 'Research pagination.' });
  assert.ok(performance.now() - start < 100);
  assert.equal(jobs.status(job.runId).state, 'running');
  assert.throws(() => jobs.read(job.runId), /no completed/);
  assert.throws(() => jobs.status('../outside'), /Invalid/);
  assert.throws(() => jobs.start({ brief: 'Another run.' }), /already active/);
  jobs.cancel(job.runId);
  await jobs.close();
  assert.equal(jobs.status(job.runId).state, 'cancelled');
});
test('Desktop jobs return completed Markdown and reject unconfigured repositories', async () => {
  const jobs = new ResearchJobs({ provider: 'claude', home: home(), dependencies: dependencies('ok') });
  assert.throws(() => jobs.start({ brief: 'Read this repo.', repo: process.cwd() }), /configured/);
  const job = jobs.start({ brief: 'Research pagination.' });
  await jobs.active.get(job.runId).pending;
  assert.match(jobs.read(job.runId).markdown, /Research dossier/);
  assert.throws(() => jobs.start({ brief: '' }), /Brief/);
});
