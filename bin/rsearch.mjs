#!/usr/bin/env node
import { readFileSync, mkdirSync } from 'node:fs';
import { parseArgs } from 'node:util';
import path from 'node:path';
import { doctor, runResearch, newRunId } from '../src/runtime.mjs';
import { verifyRuns } from '../src/verifier.mjs';
import { safeOutput, researchHome } from '../src/paths.mjs';
import { serveStdio } from '../src/mcp.mjs';

const help = `rSEARCH 0.2.0 — Research you can inspect.

rsearch doctor [--provider codex|claude]
rsearch research --provider codex|claude --brief-file <file>
                 [--repo <directory>] [--out <directory>] [--timeout-seconds <seconds>] [--model <id>]
rsearch verify <run-directory>
rsearch corroborate --runs <run-a> <run-b> [--out <directory>]
rsearch mcp --provider codex|claude [--read-root <directory> ...] [--out <directory>]

Install and authenticate your chosen provider CLI first.
The selected provider uses its normal subscription or API usage. No silent fallback.
`;

async function main() {
  if (Number(process.versions.node.split('.')[0]) < 22) throw new Error('rSEARCH requires Node.js 22 or newer.');
  const { values, positionals } = parseArgs({ allowPositionals: true, strict: true, options: {
    provider: { type: 'string' }, model: { type: 'string' }, 'brief-file': { type: 'string' }, repo: { type: 'string' }, out: { type: 'string' },
    'timeout-seconds': { type: 'string' }, runs: { type: 'boolean' }, 'read-root': { type: 'string', multiple: true }, help: { type: 'boolean', short: 'h' }
  } });
  const [command, ...args] = positionals;
  if (values.help || !command) { console.log(help); return; }
  if (command === 'doctor') {
    const report = await doctor(values.provider);
    console.log(JSON.stringify(report, null, 2));
    if (values.provider && report.providers.some(p => !p.installed)) process.exitCode = 1;
  } else if (command === 'research') {
    if (!values['brief-file']) throw new Error('--brief-file is required.');
    const controller = new AbortController();
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => controller.abort('CANCELLED'));
    const result = await runResearch({ provider: values.provider, model: values.model, brief: readFileSync(values['brief-file'], 'utf8'), repo: values.repo, home: values.out,
      timeoutSeconds: values['timeout-seconds'] === undefined ? 600 : Number(values['timeout-seconds']), signal: controller.signal,
      onProgress: event => process.stderr.write('Completed retrievals: ' + event.completedRetrievals + '\n') });
    console.log('Dossier: ' + path.join(result.directory, 'dossier.md'));
    console.log(JSON.stringify(result, null, 2));
  } else if (command === 'verify') {
    if (args.length !== 1) throw new Error('Supply one run directory.');
    const dossier = verifyRuns(args);
    console.log(JSON.stringify({ findings: dossier.findingCount, tiers: dossier.tierCounts, dossier: path.join(path.resolve(args[0]), 'dossier.md') }, null, 2));
  } else if (command === 'corroborate') {
    if (!values.runs || args.length < 2) throw new Error('Use --runs with at least two completed run directories.');
    const home = safeOutput(values.out || researchHome(), null);
    const output = path.join(home, newRunId().replace('research-', 'corroboration-'));
    mkdirSync(output, { recursive: true });
    const dossier = verifyRuns(args, output);
    console.log(JSON.stringify({ findings: dossier.findingCount, corroborated: dossier.corroboratedCount, dossier: path.join(output, 'dossier.md') }, null, 2));
  } else if (command === 'mcp') {
    const roots = values['read-root'] || (process.env.RSEARCH_READABLE_ROOT ? [process.env.RSEARCH_READABLE_ROOT] : []);
    await serveStdio({ provider: values.provider, model: values.model, home: values.out || researchHome(), readableRoots: roots });
  } else throw new Error('Unknown command. Use rsearch --help.');
}

main().catch(error => {
  process.stderr.write('rSEARCH: ' + error.message + '\n');
  if (error.run) process.stderr.write('Diagnostics: ' + error.run.directory + '\n');
  process.exitCode = 1;
});
