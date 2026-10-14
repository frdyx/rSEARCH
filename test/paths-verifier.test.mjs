import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { isWithin, canonicalPath, resolveCitation, safeOutput, runPath, allowedRepository } from '../src/paths.mjs';
import { gradeFindings, sourceGroup, claimKey } from '../src/verifier.mjs';
import { sampleFinding } from '../test-support/fixtures.mjs';

const root = mkdtempSync(path.join(tmpdir(), 'rsearch-paths-'));
const repo = path.join(root, 'repository with spaces');
mkdirSync(repo);
writeFileSync(path.join(repo, 'README.md'), 'Existing file, no proof of any claim.');
const record = (overrides, provider = 'codex', runId = 'one') => ({ finding: sampleFinding(overrides), provider, runId, repo });

test('Containment rejects parent paths and sibling names with matching prefixes', () => {
  assert.equal(isWithin('/work/repo', '/work/repo-other/file', 'linux'), false);
  assert.equal(isWithin('C:\\Work\\repo', 'C:\\Work\\repo-other\\file', 'win32'), false);
  assert.equal(isWithin('C:\\Work\\repo', 'c:\\work\\REPO\\a', 'win32'), true);
  assert.equal(isWithin(repo, path.join(repo, 'file')), true);
});
test('Artifacts cannot be written into the repository under study', () => {
  assert.throws(() => safeOutput(path.join(repo, 'artifacts'), repo), /outside/);
  assert.throws(() => runPath(root, '../escape'), /Invalid/);
  assert.throws(() => allowedRepository(repo, []), /configured/);
  assert.equal(allowedRepository(repo, [root]), canonicalPath(repo));
});
test('Symlinked output and citations cannot escape path boundaries', t => {
  const outside = path.join(root, 'outside'); mkdirSync(outside); writeFileSync(path.join(outside, 'file.txt'), 'outside');
  try { symlinkSync(outside, path.join(repo, 'linked'), 'junction'); } catch { t.skip('Symlink creation unavailable.'); return; }
  assert.equal(resolveCitation('linked/file.txt', repo), null);
  const alias = path.join(root, 'alias'); symlinkSync(repo, alias, 'junction');
  assert.throws(() => safeOutput(path.join(alias, 'artifacts'), repo), /outside/);
});
test('Windows drive letters and line suffixes are not confused', () => {
  assert.equal(resolveCitation(path.join(repo, 'README.md') + ':12:3', repo), canonicalPath(path.join(repo, 'README.md')));
  assert.equal(resolveCitation('README.md:12', repo), canonicalPath(path.join(repo, 'README.md')));
  assert.equal(resolveCitation('../outside/file.txt', repo), null);
});
test('File existence never validates a fabricated claim or earns T5', () => {
  const dossier = gradeFindings([record({ source_kind: 'local_measurement', source_url: 'README.md', claim: 'This existing file proves an invented assertion.' })]);
  assert.equal(dossier.findings[0].tier, 'T3_observed');
  assert.equal(dossier.findings[0].pathResolved, true);
  assert.equal(dossier.findings[0].demoted, true);
  assert.equal(gradeFindings([record({ source_kind: 'secondary', source_url: 'README.md' })]).findings[0].tier, 'T1_proposed');
});
test('Source groups use public suffixes, not worker labels', () => {
  assert.equal(sourceGroup(sampleFinding({ source_url: 'https://docs.example.co.uk/a' }), null).group, 'example.co.uk');
  const dossier = gradeFindings([record({ source_url: 'https://example.org/docs', independence_group: 'a' }), record({ source_url: 'https://www.example.org/blog', independence_group: 'b' }, 'claude')]);
  assert.equal(dossier.findings[0].tier, 'T3_observed');
  assert.equal(dossier.findings[0].independence_groups.length, 1);
});
test('A second worker on the same provider is not an independent channel', () => {
  const dossier = gradeFindings([record({ source_url: 'https://a.example.org' }), record({ source_url: 'https://other.example.net' }, 'codex', 'two')]);
  assert.equal(dossier.findings[0].tier, 'T3_observed');
  assert.equal(dossier.singleChannel, true);
});
test('Matching claim, distinct provider and origin groups earn T4, never T5', () => {
  const dossier = gradeFindings([record({ source_url: 'https://a.example.org' }), record({ source_url: 'https://other.example.net' }, 'claude', 'two')]);
  assert.equal(dossier.findings[0].tier, 'T4_corroborated');
  assert.equal(dossier.corroboratedCount, 2);
  assert.equal(dossier.singleChannel, false);
});
test('Whole Unicode claims keep separate assertions from lending evidence', () => {
  const prefix = 'a shared introduction '.repeat(20);
  const dossier = gradeFindings([record({ claim: prefix + 'A', source_url: 'https://example.org' }), record({ claim: prefix + 'B', source_url: 'https://example.net' }, 'claude')]);
  assert.equal(dossier.findings[0].tier, 'T3_observed');
  assert.notEqual(claimKey('Årsrapport 日本語'), claimKey('Arsrapport 語日本'));
});
