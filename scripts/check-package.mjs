import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Ajv from 'ajv';
import { VERSION } from '../src/runtime.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
if (VERSION !== pkg.version) throw new Error('Runtime version differs from package version.');
for (const file of ['plugin.json', '.claude-plugin/plugin.json', '.codex-plugin/plugin.json', 'desktop/manifest.json']) {
  const manifest = JSON.parse(readFileSync(path.join(root, file), 'utf8'));
  if (manifest.name !== pkg.name || manifest.version !== pkg.version) throw new Error('Manifest identity drift: ' + file);
}
const manifest = JSON.parse(readFileSync(path.join(root, 'desktop/manifest.json'), 'utf8'));
const validate = new Ajv({ strict: false, validateFormats: false }).compile(JSON.parse(readFileSync(path.join(root, 'schemas/mcpb-manifest-v0.3.schema.json'), 'utf8')));
if (!validate(manifest)) throw new Error(JSON.stringify(validate.errors));
const markdown = [];
const publicText = [];
function scan(relative = '') {
  for (const entry of readdirSync(path.join(root, relative), { withFileTypes: true })) {
    if (['.git', 'node_modules', 'dist', '.local'].includes(entry.name)) continue;
    const file = path.join(relative, entry.name);
    if (entry.isDirectory()) scan(file);
    else if (entry.isFile()) {
      if (entry.name.endsWith('.md')) markdown.push(file);
      if (/\.(md|json|yaml|yml|svg)$/.test(entry.name)) publicText.push(file);
    }
  }
}
scan();
for (const file of publicText) {
  const content = readFileSync(path.join(root, file), 'utf8');
  if (/m[aá]ddu/i.test(content)) throw new Error('Excluded dependency reference in public copy: ' + file);
}
for (const file of markdown) {
  const text = readFileSync(path.join(root, file), 'utf8');
  if (/C:[\\/]Users[\\/]FRDY|OEA-000254|tdx repository|relink-codex-cache/i.test(text)) throw new Error('Personal-only material found in ' + file);
  const targets = [...text.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)].map(m => m[1]).concat([...text.matchAll(/<img[^>]+src="([^"]+)"/g)].map(m => m[1]));
  for (const target of targets) {
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    const clean = target.split('#')[0];
    if (clean && !existsSync(path.resolve(root, path.dirname(file), clean))) throw new Error('Broken relative link in ' + file + ': ' + target);
  }
}
for (const file of ['README.md', 'LICENSE', 'CONTRIBUTING.md', 'docs/installation.md', 'docs/architecture.md', 'skills/rsearch-operator/SKILL.md', 'desktop/server.mjs', 'src/desktop-config.mjs', 'assets/hero.webp', 'assets/dataflow.svg', 'assets/icon.png']) {
  if (!existsSync(path.join(root, file))) throw new Error('Required package file missing: ' + file);
}
console.log('Package identities, desktop schema, public documentation and relative links passed.');
