import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { getDomain } from 'tldts';
import { resolveCitation, safeOutput } from './paths.mjs';
import { parseStream, MIN_RETRIEVALS } from './providers.mjs';
import { validateFindings } from './schema.mjs';

const tierOrder = ['T0_hypothetical', 'T1_proposed', 'T2_inferred', 'T3_observed', 'T4_corroborated', 'T5_verified'];
const hash = text => createHash('sha256').update(text).digest('hex');
export const claimKey = claim => claim.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

export function sourceGroup(finding, repo) {
  if (finding.source_kind === 'local_measurement') {
    const resolved = resolveCitation(finding.source_url, repo);
    return { group: resolved ? 'local-repository:' + hash(repo).slice(0,12) : null, pathResolved: Boolean(resolved) };
  }
  try {
    const url = new URL(finding.source_url);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return { group: null, pathResolved: false };
    return { group: getDomain(url.hostname, { allowPrivateDomains: true }) || url.hostname.toLowerCase(), pathResolved: false };
  } catch { return { group: null, pathResolved: false }; }
}

export function gradeFindings(records) {
  const groupsByClaim = new Map();
  for (const record of records) {
    const key = claimKey(record.finding.claim);
    const source = sourceGroup(record.finding, record.repo);
    if (!groupsByClaim.has(key)) groupsByClaim.set(key, []);
    groupsByClaim.get(key).push({ ...record, ...source });
  }
  const findings = records.map(record => {
    const sameClaim = groupsByClaim.get(claimKey(record.finding.claim));
    const sources = sameClaim.filter(r => r.group);
    const origins = [...new Set(sources.map(r => r.group))];
    const channels = [...new Set(sources.map(r => r.provider))];
    const source = sourceGroup(record.finding, record.repo);
    // Different run IDs alone are not independent channels. Local files are not a web channel.
    const external = sources.filter(r => !r.group.startsWith('local-repository:'));
    const externalOrigins = new Set(external.map(r => r.group));
    const externalChannels = new Set(external.map(r => r.provider));
    const tier = !source.group ? 'T1_proposed' : externalOrigins.size >= 2 && externalChannels.size >= 2 ? 'T4_corroborated' : 'T3_observed';
    return {
      ...record.finding, provider: record.provider, runId: record.runId,
      tier, derived_group: source.group, pathResolved: source.pathResolved,
      independence_groups: origins, evidence_channels: channels,
      demoted: tierOrder.indexOf(tier) < tierOrder.indexOf(record.finding.proposed_tier),
      tier_reason: tier === 'T4_corroborated' ? 'Matching claim across different provider channels and source-origin groups; semantic independence still requires review.'
        : tier === 'T1_proposed' ? 'No usable source origin was established.'
          : source.pathResolved ? 'The cited file exists; this is not validation of the claim or a verified measurement.'
            : 'Cited evidence without independent-channel corroboration. Retrieval activity does not establish citation support.'
    };
  });
  const tierCounts = {};
  for (const finding of findings) tierCounts[finding.tier] = (tierCounts[finding.tier] || 0) + 1;
  return {
    schema: 'rsearch.dossier/2', findingCount: findings.length, tierCounts,
    singleChannel: new Set(records.map(r => r.provider)).size < 2,
    corroboratedCount: tierCounts.T4_corroborated || 0,
    demotedCount: findings.filter(f => f.demoted).length,
    limitations: ['Retrieval logs establish activity, not the truth of claims or citation support.', 'Source-origin groups approximate shared origins using registrable domains.', 'T5_verified is never assigned automatically in v0.2.0.'],
    findings
  };
}

function md(value) { return String(value).replace(/\r?\n/g, ' ').replace(/([\\`*_<>])/g, '\\$1'); }
export function renderDossier(dossier) {
  const lines = ['# Research dossier', '', `${dossier.findingCount} findings · ${dossier.corroboratedCount} corroborated candidates · ${dossier.demotedCount} confidence proposals lowered`, '',
    '> Retrieval activity is recorded. Citation support and semantic independence still need review.', ''];
  if (dossier.singleChannel) lines.push('**Single-channel research:** these findings must not be described as independently confirmed.', '');
  for (const f of dossier.findings) {
    lines.push('## ' + md(f.claim), '', '**Evidence level:** `' + f.tier + '`', '', '- Source: ' + md(f.source_url), '- Channel: ' + f.provider,
      '- Source group: ' + md(f.derived_group || 'none'), '- Why: ' + md(f.tier_reason), '- Falsified by: ' + md(f.falsifier));
    for (const limitation of f.limitations || []) lines.push('- Limit: ' + md(limitation));
    lines.push('');
  }
  lines.push('## Reading the evidence', '', ...dossier.limitations.map(s => '- ' + s), '');
  return lines.join('\n');
}

export function loadVerifiedRun(directory) {
  const meta = JSON.parse(readFileSync(path.join(directory, 'run.json'), 'utf8'));
  if (meta.verdict !== 'RETRIEVAL_VERIFIED') throw new Error('Refusing to grade an unsuccessful research run.');
  const raw = readFileSync(path.join(directory, 'provider-stream.jsonl'), 'utf8');
  if (meta.streamSha256 !== hash(raw)) throw new Error('The provider stream differs from its recorded digest.');
  const parsed = parseStream(meta.provider, raw);
  if (parsed.errors.length || parsed.retrievals.length < MIN_RETRIEVALS || parsed.retrievals.length !== meta.completedRetrievals) throw new Error('Retrieval evidence does not pass the gate.');
  const payload = validateFindings(parsed.payload);
  const saved = JSON.parse(readFileSync(path.join(directory, 'findings.json'), 'utf8'));
  if (JSON.stringify(saved) !== JSON.stringify(payload)) throw new Error('Saved findings differ from the provider payload.');
  return { meta, records: payload.findings.map(finding => ({ finding, provider: meta.provider, runId: meta.id, repo: meta.repo })) };
}

export function verifyRuns(directories, output = directories[0]) {
  const unique = [...new Set(directories.map(d => path.resolve(d)))];
  const runs = unique.map(loadVerifiedRun);
  for (const run of runs) safeOutput(output, run.meta.repo);
  const dossier = gradeFindings(runs.flatMap(r => r.records));
  dossier.provenance = runs.map(r => ({ runId: r.meta.id, provider: r.meta.provider, providerVersion: r.meta.providerVersion, completedRetrievals: r.meta.completedRetrievals, streamSha256: r.meta.streamSha256 }));
  writeFileSync(path.join(output, 'dossier.json'), JSON.stringify(dossier, null, 2) + '\n');
  writeFileSync(path.join(output, 'dossier.md'), renderDossier(dossier));
  return dossier;
}
