import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { zipSync } from 'fflate';
import spawn from 'cross-spawn';

const root = fileURLToPath(new URL('../', import.meta.url));
mkdirSync(path.join(root, 'dist'), { recursive: true });
const packed = spawn.sync('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', 'dist'], { cwd: root, encoding: 'utf8', windowsHide: true });
if (packed.status !== 0) throw new Error(packed.stderr || 'npm pack failed.');
const files = {};
function collect(relative = '') {
  for (const entry of readdirSync(path.join(root, relative), { withFileTypes: true })) {
    if (['.git', 'node_modules', 'dist', '.local'].includes(entry.name) || entry.name.endsWith('.log') || entry.name === '.env') continue;
    const file = path.join(relative, entry.name);
    if (entry.isDirectory()) collect(file);
    else if (entry.isFile()) files['rsearch-0.2.0/' + file.replaceAll('\\', '/')] = new Uint8Array(readFileSync(path.join(root, file)));
  }
}
collect();
writeFileSync(path.join(root, 'dist/rsearch-0.2.0-source.zip'), zipSync(files, { level: 6, mtime: new Date('2026-10-14T00:00:00Z') }));
const names = ['rsearch-0.2.0.tgz', 'rsearch-0.2.0-source.zip', 'rsearch-0.2.0.mcpb'];
const sums = names.map(name => createHash('sha256').update(readFileSync(path.join(root, 'dist', name))).digest('hex') + '  ' + name).join('\n') + '\n';
writeFileSync(path.join(root, 'dist/SHA256SUMS.txt'), sums);
console.log('Release archives and checksums prepared.');
