import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/mcp.mjs';

test('MCP initializes, lists its five tools, and completes an asynchronous research lifecycle', async () => {
  const fake = fileURLToPath(new URL('../test-support/fake-provider.mjs', import.meta.url));
  const { server, jobs } = await createServer({ provider: 'claude', home: mkdtempSync(path.join(tmpdir(), 'rsearch-mcp-')), dependencies: {
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
    const report = JSON.parse((await client.callTool({ name: 'research_read', arguments: { runId: id } })).content[0].text);
    assert.match(report.markdown, /Research dossier/);
    assert.equal((await client.callTool({ name: 'research_read', arguments: { runId: '../outside' } })).isError, true);
  } finally { await jobs.close(); await client.close(); await server.close(); }
});
