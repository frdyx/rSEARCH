import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ResearchJobs } from './jobs.mjs';
import { doctor, VERSION } from './runtime.mjs';
import Ajv from 'ajv/dist/2020.js';

export const tools = [
  { name: 'doctor', description: 'Check Node and the configured provider CLI. No research or login is started.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, openWorldHint: false } },
  { name: 'research_start', description: 'Start a bounded research run using the configured provider. Uses provider credits and saves private local artifacts. Returns a run ID immediately; poll research_status, then use research_read.', inputSchema: { type: 'object', properties: { brief: { type: 'string', minLength: 1, maxLength: 65536 }, repo: { type: 'string', description: 'Optional existing repository inside a configured readable root.' }, timeoutSeconds: { type: 'integer', minimum: 1, maximum: 3600, default: 600 } }, required: ['brief'], additionalProperties: false }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true } },
  { name: 'research_status', description: 'Read research progress or failure details for a run in the local research store.', inputSchema: { type: 'object', properties: { runId: { type: 'string' } }, required: ['runId'], additionalProperties: false }, annotations: { readOnlyHint: true, openWorldHint: false } },
  { name: 'research_read', description: 'Read a completed source-linked dossier. Activity logs do not prove citation support or claim truth.', inputSchema: { type: 'object', properties: { runId: { type: 'string' } }, required: ['runId'], additionalProperties: false }, annotations: { readOnlyHint: true, openWorldHint: false } },
  { name: 'research_cancel', description: 'Cancel this server’s active research process and retain its diagnostics.', inputSchema: { type: 'object', properties: { runId: { type: 'string' } }, required: ['runId'], additionalProperties: false }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false } }
];

export async function createServer(config) {
  const jobs = new ResearchJobs(config);
  const ajv = new Ajv({ strict: true });
  const validators = new Map(tools.map(tool => [tool.name, ajv.compile(tool.inputSchema)]));
  const server = new Server({ name: 'rsearch', version: VERSION }, { capabilities: { tools: {} }, instructions: 'Use doctor before the first run. research_start uses the explicitly configured provider and its normal credits. It returns quickly; poll research_status at reasonable intervals, then read completed results. Never present retrieval activity as proof of correctness. Repository access is optional and restricted to configured readable roots.' });
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
  server.setRequestHandler(CallToolRequestSchema, async request => {
    try {
      const args = request.params.arguments || {};
      const validate = validators.get(request.params.name);
      if (!validate || !validate(args)) throw new Error('Invalid tool name or arguments.');
      let result;
      switch (request.params.name) {
        case 'doctor': result = { ...await doctor(config.provider), modelOverride: config.model ?? null }; break;
        case 'research_start': result = jobs.start(args); break;
        case 'research_status': result = jobs.status(args.runId); break;
        case 'research_read': result = jobs.read(args.runId); break;
        case 'research_cancel': result = jobs.cancel(args.runId); break;
        default: throw new Error('Unknown tool.');
      }
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    } catch (error) { return { isError: true, content: [{ type: 'text', text: error.message }] }; }
  });
  const previousClose = server.onclose;
  server.onclose = () => { previousClose?.(); jobs.close().catch(() => {}); };
  return { server, jobs };
}

export async function serveStdio(config) {
  const { server, jobs } = await createServer(config);
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await jobs.close(); await server.close(); process.exit(0); });
  await server.connect(new StdioServerTransport());
}
