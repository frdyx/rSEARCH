export const sampleFinding = (overrides = {}) => ({
  claim: 'The API supports cursor pagination.', source_url: 'https://docs.example.org/pagination', source_kind: 'primary_authoritative',
  retrieved_at: '2026-10-14T00:00:00Z', independence_group: 'worker-proposal', proposed_tier: 'T5_verified',
  falsifier: 'A documented endpoint rejects its stated cursor parameter.', limitations: ['Illustrative fixture; not an assertion about a real product.'], ...overrides
});

export function fixtureStream(provider, { count = 2, payload = { findings: [sampleFinding()] }, failed = false } = {}) {
  const events = [];
  for (let i = 0; i < count; i++) {
    if (provider === 'codex') {
      events.push({ type: 'item.started', item: { id: 'search-' + i, type: 'web_search' } });
      events.push({ type: 'item.completed', item: { id: 'search-' + i, type: 'web_search', status: failed ? 'failed' : 'completed', action: { type: 'search', query: '' } } });
    } else {
      events.push({ type: 'assistant', parent_tool_use_id: null, message: { content: [{ type: 'tool_use', id: 'search-' + i, name: i === 0 ? 'WebSearch' : 'WebFetch', input: { url: 'https://docs.example.org/pagination' } }] } });
      events.push({ type: 'user', parent_tool_use_id: null, message: { content: [{ type: 'tool_result', tool_use_id: 'search-' + i, content: 'Retrieved fixture source content.', is_error: failed }] } });
    }
  }
  events.push(provider === 'codex' ? { type: 'item.completed', item: { id: 'answer', type: 'agent_message', text: JSON.stringify(payload) } }
    : { type: 'result', subtype: 'success', is_error: false, structured_output: payload });
  return events.map(e => JSON.stringify(e)).join('\n') + '\n';
}
