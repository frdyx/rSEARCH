import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import spawn from 'cross-spawn';
import { unzipSync } from 'fflate';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
const root = fileURLToPath(new URL('../', import.meta.url));
const temporary = mkdtempSync(path.join(tmpdir(), 'rsearch clean install '));
const prefix = path.join(temporary, 'npm');
const archive = path.join(temporary, 'rsearch-0.2.0.tgz');
copyFileSync(path.join(root, 'dist/rsearch-0.2.0.tgz'), archive);
const install = spawn.sync('npm', ['install', '--prefix', prefix, '--ignore-scripts', '--omit=dev', '--offline', '--no-audit', '--no-fund', archive], { encoding: 'utf8', windowsHide: true });
if (install.status !== 0) throw new Error('Clean package installation failed: ' + install.stderr);
const installed = path.join(prefix, 'node_modules/rsearch/bin/rsearch.mjs');
const help = spawn.sync(process.execPath, [installed, '--help'], { encoding: 'utf8', windowsHide: true, cwd: temporary });
if (help.status !== 0 || !help.stdout.includes('Research you can inspect')) throw new Error('Installed CLI does not start.');
const bundle = unzipSync(new Uint8Array(readFileSync(path.join(root, 'dist/rsearch-0.2.0.mcpb'))));
const directory = path.join(temporary, 'desktop');
for (const [name, data] of Object.entries(bundle)) {
  if (name.includes('..') || path.isAbsolute(name)) throw new Error('Unsafe archive entry.');
  const target = path.join(directory, name);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, data);
}
const desktop = spawn.sync(process.execPath, [path.join(directory, 'bin/rsearch.mjs'), '--help'], { encoding: 'utf8', windowsHide: true, cwd: directory });
if (desktop.status !== 0 || !desktop.stdout.includes('Research you can inspect')) throw new Error('Extracted desktop bundle cannot start.');
for (const [label, entry] of [['npm', installed], ['desktop', path.join(directory, 'bin/rsearch.mjs')]]) {
  const transport = new StdioClientTransport({
    command: process.execPath, args: [entry, 'mcp', '--provider', 'claude'],
    cwd: temporary, env: { ...process.env, RSEARCH_HOME: path.join(temporary, label + ' research store') },
    stderr: 'pipe'
  });
  const client = new Client({ name: 'rsearch-install-check', version: '0.2.0' });
  try {
    await client.connect(transport);
    const listed = await client.listTools();
    if (listed.tools.length !== 5) throw new Error(label + ' MCP tools missing.');
    const result = await client.callTool({ name: 'research_status', arguments: { runId: '../outside' } });
    if (!result.isError) throw new Error(label + ' MCP accepted an escaped run path.');
  } finally { await client.close(); }
}
console.log('Clean npm and extracted desktop runtimes start and pass stdio MCP checks from paths with spaces, without preinstalled rSEARCH resources.');
