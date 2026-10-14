import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCodex, parseClaude, providerInvocation } from '../src/providers.mjs';
import { fixtureStream } from '../test-support/fixtures.mjs';

test('Codex counts completed unique events, not started events or query text', () => {
  const raw = fixtureStream('codex');
  assert.equal(parseCodex(raw + raw).retrievals.length, 2);
  assert.equal(parseCodex('{"type":"item.started","item":{"id":"a","type":"web_search"}}\n').retrievals.length, 0);
  assert.equal(parseCodex(fixtureStream('codex', { failed: true })).retrievals.length, 0);
});
test('Codex refuses identifier-free asserted completions and incomplete lines', () => {
  assert.equal(parseCodex('{"type":"item.completed","item":{"type":"web_search"}}\n').retrievals.length, 0);
  assert.equal(parseCodex('{"type":"item.completed",').retrievals.length, 0);
});
test('Claude requires matched successful results; duplicate messages count once', () => {
  const raw = fixtureStream('claude');
  assert.equal(parseClaude(raw + raw).retrievals.length, 2);
  assert.equal(parseClaude(fixtureStream('claude', { failed: true })).retrievals.length, 0);
  assert.equal(parseClaude('{"type":"user","message":{"content":[{"type":"tool_result","tool_use_id":"unknown","content":"a source"}]}}\n').retrievals.length, 0);
});
test('Claude does not count partial tokens, subagent copies, or tool assertions', () => {
  const raw = fixtureStream('claude').split('\n').filter(Boolean).map(s => ({ ...JSON.parse(s), parent_tool_use_id: 'copy' })).map(JSON.stringify).join('\n');
  assert.equal(parseClaude(raw).retrievals.length, 0);
  assert.equal(parseClaude('{"type":"stream_event","event":{"type":"tool_result","content":"retrieved"}}\n').retrievals.length, 0);
});
test('Both providers preserve the structured findings payload', () => {
  assert.equal(parseClaude(fixtureStream('claude')).payload.findings.length, 1);
  assert.equal(parseCodex(fixtureStream('codex')).payload.findings.length, 1);
});
test('A failed final Claude result is not silently accepted', () => {
  const result = parseClaude(fixtureStream('claude') + '{"type":"result","subtype":"error_max_turns","is_error":true}\n');
  assert.equal(result.errors.length, 1);
});
test('Provider invocations keep schema and paths as arguments, with no bypass flags', () => {
  const codex = providerInvocation('codex', 'C:\\A directory\\schema.json', null);
  assert.ok(codex.args.includes('C:\\A directory\\schema.json'));
  assert.ok(codex.args.includes('web_search="live"'));
  const claude = providerInvocation('claude', '', null);
  assert.ok(claude.args.includes('--restricted'));
  assert.ok(claude.args.includes('--strict-mcp-config'));
  assert.ok(!claude.args.some(a => a.includes('bypassPermissions')));
});
