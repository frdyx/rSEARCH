import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import { zipSync, unzipSync } from 'fflate';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(readFileSync(path.join(root, 'desktop/manifest.json'), 'utf8'));
const schema = JSON.parse(readFileSync(path.join(root, 'schemas/mcpb-manifest-v0.3.schema.json'), 'utf8'));
const validate = new Ajv({ strict: false, validateFormats: false }).compile(schema);
if (!validate(manifest)) throw new Error('Invalid desktop manifest: ' + JSON.stringify(validate.errors));
const files = { 'manifest.json': new Uint8Array(Buffer.from(JSON.stringify(manifest, null, 2))) };
function addFile(relative) { files[relative.replaceAll('\\', '/')] = new Uint8Array(readFileSync(path.join(root, relative))); }
function addDirectory(relative) {
  for (const entry of readdirSync(path.join(root, relative), { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const file = path.join(relative, entry.name);
    if (entry.isDirectory()) addDirectory(file); else if (entry.isFile()) addFile(file);
  }
}
for (const directory of ['bin', 'src']) addDirectory(directory);
addFile('desktop/server.mjs');
for (const file of ['LICENSE', 'package.json', 'assets/icon.png']) addFile(file);
const lock = JSON.parse(readFileSync(path.join(root, 'npm-shrinkwrap.json'), 'utf8'));
for (const [relative, info] of Object.entries(lock.packages)) {
  if (relative.startsWith('node_modules/') && !info.dev && statSync(path.join(root, relative), { throwIfNoEntry: false })?.isDirectory()) addDirectory(relative);
}
const archive = zipSync(files, { level: 6, mtime: new Date('2026-10-14T00:00:00Z') });
const checked = unzipSync(archive);
if (!checked[manifest.server.entry_point] || !checked['src/mcp.mjs'] || !checked['node_modules/@modelcontextprotocol/sdk/package.json']) throw new Error('Desktop bundle is missing required runtime files.');
if (Object.keys(checked).some(name => name.includes('sharp') || name.includes('node-forge'))) throw new Error('A development dependency entered the desktop bundle.');
mkdirSync(path.join(root, 'dist'), { recursive: true });
const output = path.join(root, 'dist', `rsearch-${manifest.version}.mcpb`);
writeFileSync(output, archive);
console.log('Validated desktop bundle: ' + output + ' (' + Object.keys(checked).length + ' files).');
