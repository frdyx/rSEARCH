import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/mcp.mjs';
import { desktopConfig } from '../src/desktop-config.mjs';

test('MCP initializes, lists its five tools, and completes an asynchronous research lifecycle', async () => {
  const fake = fileURLToPath(new URL('../test-support/fake-provider.mjs', import.meta.url));
  const config = desktopConfig({ RSEARCH_PROVIDER: 'claude', RSEARCH_MODEL: '${user_config.model}', RSEARCH_READABLE_ROOT: '${user_config.readable_root}' });
  const home = mkdtempSync(path.join(tmpdir(), 'rsearch MCP with spaces '));
  const { server, jobs } = await createServer({ ...config, home, dependencies: {
    providerVersion: async () => 'fixture 1.0', invocation: provider => ({ command: process.execPath, args: [fake, provider, 'ok'] })
  } });
  const client = new Client({ name: 'fixture-client', version: '1.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  try {
    const list = await client.listTools();
    assert.equal(list.tools.length, 5);
    const invalid = await client.callTool({ name: 'research_start', arguments: { brief: 'A question', command: 'arbitrary execution' } });
    assert.equal(invalid.isError, true);
    const started = await client.callTool({ name: 'research_start', arguments: { brief: 'Research pagination.' } });
    const id = JSON.parse(started.content[0].text).runId;
    await jobs.active.get(id).pending;
    const status = JSON.parse((await client.callTool({ name: 'research_status', arguments: { runId: id } })).content[0].text);
    assert.equal(status.state, 'completed');
    assert.equal(status.completedRetrievals, 2);
    assert.equal(JSON.parse(readFileSync(path.join(home, id, 'run.json'), 'utf8')).modelOverride, null);
    const report = JSON.parse((await client.callTool({ name: 'research_read', arguments: { runId: id } })).content[0].text);
    assert.match(report.markdown, /Research dossier/);
    assert.equal((await client.callTool({ name: 'research_read', arguments: { runId: '../outside' } })).isError, true);
  } finally { await jobs.close(); await client.close(); await server.close(); }
});
