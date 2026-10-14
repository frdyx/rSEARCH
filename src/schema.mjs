import Ajv from 'ajv/dist/2020.js';

export const findingSchema = {
  type: 'object', additionalProperties: false, required: ['findings'],
  properties: {
    findings: { type: 'array', minItems: 1, items: {
      type: 'object', additionalProperties: false,
      required: ['claim', 'source_url', 'source_kind', 'retrieved_at', 'independence_group', 'proposed_tier', 'falsifier', 'limitations'],
      properties: {
        claim: { type: 'string', minLength: 1 },
        source_url: { type: 'string', minLength: 1 },
        source_kind: { type: 'string', enum: ['primary_authoritative', 'primary_other', 'secondary', 'community', 'local_measurement'] },
        retrieved_at: { type: 'string' },
        independence_group: { type: 'string', minLength: 1 },
        proposed_tier: { type: 'string', enum: ['T0_hypothetical', 'T1_proposed', 'T2_inferred', 'T3_observed', 'T4_corroborated', 'T5_verified'] },
        falsifier: { type: 'string', minLength: 1 },
        limitations: { type: 'array', items: { type: 'string' } }
      }
    } }
  }
};

const validator = new Ajv({ allErrors: true, strict: true }).compile(findingSchema);
export function validateFindings(payload) {
  if (!validator(payload)) throw new Error('Invalid findings: ' + validator.errors.map(e => e.instancePath + ' ' + e.message).join('; '));
  for (const f of payload.findings) {
    if (!f.claim.trim() || !f.falsifier.trim()) throw new Error('Claims and falsifiers must contain text.');
    if (f.source_kind !== 'local_measurement') {
      let url;
      try { url = new URL(f.source_url); } catch { throw new Error('External findings must cite a valid HTTP(S) source URL.'); }
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('External findings must cite a valid HTTP(S) source URL without credentials.');
    }
  }
  return payload;
}
