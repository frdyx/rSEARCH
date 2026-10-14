import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import spawn from 'cross-spawn';
import { unzipSync } from 'fflate';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
const root = fileURLToPath(new URL('../', import.meta.url));
const { version } = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const basename = `rsearch-${version}`;
const temporary = mkdtempSync(path.join(tmpdir(), 'rsearch clean install '));
const prefix = path.join(temporary, 'npm');
const archive = path.join(temporary, basename + '.tgz');
copyFileSync(path.join(root, 'dist', basename + '.tgz'), archive);
const install = spawn.sync('npm', ['install', '--prefix', prefix, '--ignore-scripts', '--omit=dev', '--prefer-offline', '--no-audit', '--no-fund', archive], { encoding: 'utf8', windowsHide: true });
if (install.status !== 0) throw new Error('Clean package installation failed: ' + install.stderr);
const installed = path.join(prefix, 'node_modules/rsearch/bin/rsearch.mjs');
const help = spawn.sync(process.execPath, [installed, '--help'], { encoding: 'utf8', windowsHide: true, cwd: temporary });
if (help.status !== 0 || !help.stdout.includes('Research you can inspect')) throw new Error('Installed CLI does not start.');
const wrapper = path.join(prefix, 'node_modules/.bin', process.platform === 'win32' ? 'rsearch.cmd' : 'rsearch');
const wrapped = spawn.sync(wrapper, ['--help'], { encoding: 'utf8', windowsHide: true, cwd: temporary });
if (wrapped.status !== 0 || !wrapped.stdout.includes('Research you can inspect')) throw new Error('Installed command wrapper does not start from a path with spaces.');
const bundle = unzipSync(new Uint8Array(readFileSync(path.join(root, 'dist', basename + '.mcpb'))));
const directory = path.join(temporary, 'desktop');
for (const [name, data] of Object.entries(bundle)) {
  if (name.includes('..') || path.isAbsolute(name)) throw new Error('Unsafe archive entry.');
  const target = path.join(directory, name);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, data);
}
const desktop = spawn.sync(process.execPath, [path.join(directory, 'bin/rsearch.mjs'), '--help'], { encoding: 'utf8', windowsHide: true, cwd: directory });
if (desktop.status !== 0 || !desktop.stdout.includes('Research you can inspect')) throw new Error('Extracted desktop bundle cannot start.');
const manifest = JSON.parse(readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
// Exercise the shipped launcher with Desktop's observed unresolved blank fields.
const desktopArgs = manifest.server.mcp_config.args.map(arg => arg.replaceAll('${__dirname}', directory));
const desktopEnv = { ...manifest.server.mcp_config.env, RSEARCH_PROVIDER: 'claude' };
const launchers = [
  { label: 'npm', args: [installed, 'mcp', '--provider', 'claude'], env: { RSEARCH_READABLE_ROOT: '' } },
  { label: 'desktop-unresolved', args: desktopArgs, env: desktopEnv },
  { label: 'desktop-blank', args: desktopArgs, env: { ...desktopEnv, RSEARCH_MODEL: '', RSEARCH_READABLE_ROOT: '' } },
  { label: 'desktop-explicit', args: desktopArgs, env: { ...desktopEnv, RSEARCH_MODEL: 'sonnet', RSEARCH_READABLE_ROOT: '' }, model: 'sonnet' }
];
for (const { label, args, env, model = null } of launchers) {
  const transport = new StdioClientTransport({
    command: process.execPath, args,
    cwd: temporary, env: { ...process.env, ...env, RSEARCH_HOME: path.join(temporary, label + ' research store') },
    stderr: 'pipe'
  });
  const client = new Client({ name: 'rsearch-install-check', version });
  try {
    await client.connect(transport);
    const listed = await client.listTools();
    if (listed.tools.length !== 5) throw new Error(label + ' MCP tools missing.');
    const report = await client.callTool({ name: 'doctor', arguments: {} });
    const diagnosis = JSON.parse(report.content[0].text);
    if (report.isError || diagnosis.version !== version || diagnosis.modelOverride !== model) throw new Error(label + ' MCP configuration differs from the selected settings.');
    const result = await client.callTool({ name: 'research_status', arguments: { runId: '../outside' } });
    if (!result.isError) throw new Error(label + ' MCP accepted an escaped run path.');
  } finally { await client.close(); }
}
console.log('Clean npm and manifest-launched desktop runtimes pass stdio MCP checks from paths with spaces, including blank, unresolved and explicit optional settings.');
