import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import path from 'node:path';
import { parseStream } from '../src/providers.mjs';
import { validateFindings } from '../src/schema.mjs';
const { values } = parseArgs({ options: { provider: { type: 'string' }, input: { type: 'string' }, output: { type: 'string' } } });
if (!values.provider || !values.input || !values.output) throw new Error('Use --provider, --input and --output. Review sanitized fixtures before publishing.');
const raw = readFileSync(values.input, 'utf8');
const parsed = parseStream(values.provider, raw);
validateFindings(parsed.payload);
const retained = [];
for (const [index, retrieval] of parsed.retrievals.entries()) {
  const id = 'recorded-operation-' + index;
  if (values.provider === 'codex') retained.push({ type: 'item.completed', item: { id, type: 'web_search', status: 'completed', action: { type: retrieval.action, ...(retrieval.url ? { url: retrieval.url } : {}) } } });
  else {
    retained.push({ type: 'assistant', parent_tool_use_id: null, message: { content: [{ type: 'tool_use', id, name: retrieval.tool, input: retrieval.url ? { url: retrieval.url } : {} }] } });
    retained.push({ type: 'user', parent_tool_use_id: null, message: { content: [{ type: 'tool_result', tool_use_id: id, content: 'Successful recorded retrieval; response body omitted.', is_error: false }] } });
  }
}
retained.push(values.provider === 'codex' ? { type: 'item.completed', item: { id: 'recorded-answer', type: 'agent_message', text: JSON.stringify(parsed.payload) } }
  : { type: 'result', subtype: 'success', is_error: false, structured_output: parsed.payload });
const sanitized = retained.map(event => JSON.stringify(event)).join('\n') + '\n';
if (parseStream(values.provider, sanitized).retrievals.length !== parsed.retrievals.length) throw new Error('Sanitization changed the recorded retrieval count.');
mkdirSync(path.dirname(values.output), { recursive: true });
writeFileSync(values.output, sanitized);
writeFileSync(values.output + '.metadata.json', JSON.stringify({ kind: 'sanitized-live-recording', provider: values.provider, recordedDate: new Date().toISOString().slice(0, 10), completedRetrievals: parsed.retrievals.length, findingCount: parsed.payload.findings.length, originalStreamSha256: createHash('sha256').update(raw).digest('hex'), omitted: ['provider initialization', 'session identifiers', 'local paths', 'reasoning', 'retrieved response bodies'], note: 'Parser-relevant events reconstructed from observed completed operations; not a full original transcript.' }, null, 2) + '\n');
console.log('Sanitized recording written; review source claims and URLs before publishing.');
