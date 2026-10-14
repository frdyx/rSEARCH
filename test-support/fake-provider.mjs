import { fixtureStream, sampleFinding } from './fixtures.mjs';
const [provider, mode = 'ok'] = process.argv.slice(2);
process.stdin.resume();
process.stdin.on('end', () => {
  if (mode === 'slow') { setTimeout(() => process.stdout.write(fixtureStream(provider)), 60000); return; }
  if (mode === 'empty') return;
  if (mode === 'exit-failure') { process.stderr.write('Fixture authentication failure.'); process.exitCode = 1; return; }
  const count = mode === 'no-search' ? 0 : mode === 'single' ? 1 : 2;
  const payload = mode === 'invalid' ? { findings: [] } : { findings: [sampleFinding({ claim: 'Pagination supports cafés and 日本語.' })] };
  process.stdout.write(fixtureStream(provider, { count, payload, failed: mode === 'failed-search' }));
});
