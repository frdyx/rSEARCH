import { mkdirSync, writeFileSync, readFileSync, existsSync, unlinkSync, openSync, closeSync } from 'node:fs';
import { randomUUID, createHash } from 'node:crypto';
import path from 'node:path';
import { execFile } from 'node:child_process';
import spawn from 'cross-spawn';
import { safeOutput, researchHome, resolveRepository } from './paths.mjs';
import { MIN_RETRIEVALS, PROVIDERS, providerInvocation, researchPrompt, parseStream } from './providers.mjs';
import { findingSchema, validateFindings } from './schema.mjs';
import { verifyRuns } from './verifier.mjs';

export const VERSION = '0.2.1';
export const newRunId = () => 'research-' + new Date().toISOString().slice(0,10).replaceAll('-', '') + '-' + randomUUID();
export const json = (file, value) => writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const digest = value => createHash('sha256').update(value).digest('hex');
export const processAlive = pid => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };

function lockStore(home, id) {
  mkdirSync(home, { recursive: true });
  const file = path.join(home, '.active-run.json');
  let descriptor;
  try { descriptor = openSync(file, 'wx'); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    let previous;
    try { previous = JSON.parse(readFileSync(file, 'utf8')); } catch { throw new Error('Research store contains an unreadable active-run lock.'); }
    if (!Number.isInteger(previous.pid) || previous.pid < 1 || processAlive(previous.pid)) throw new Error('Another research run is active in this store.');
    unlinkSync(file);
    descriptor = openSync(file, 'wx');
  }
  writeFileSync(descriptor, JSON.stringify({ pid: process.pid, id }));
  closeSync(descriptor);
  return () => {
    try { const owner = JSON.parse(readFileSync(file, 'utf8')); if (owner.pid === process.pid && owner.id === id) unlinkSync(file); } catch { /* already released */ }
  };
}

export function providerVersion(provider) {
  return new Promise(resolve => {
    const child = spawn(provider, ['--version'], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    const timer = setTimeout(() => { child.kill(); resolve(null); }, 5000);
    child.stdout.on('data', data => { if (output.length < 4096) output += data.toString(); });
    child.on('error', () => { clearTimeout(timer); resolve(null); });
    child.on('close', code => { clearTimeout(timer); resolve(code === 0 ? output.trim() : null); });
  });
}

export async function doctor(provider) {
  if (provider && !PROVIDERS.includes(provider)) throw new Error('Provider must be codex or claude.');
  const entries = await Promise.all((provider ? [provider] : PROVIDERS).map(async name => {
    const version = await providerVersion(name);
    return { provider: name, installed: Boolean(version), version, authentication: 'Checked when a research run starts.' };
  }));
  return { version: VERSION, node: process.version, nodeSupported: Number(process.versions.node.split('.')[0]) >= 22, platform: process.platform, providers: entries, researchHome: researchHome() };
}

function stopChild(child) {
  if (!child.pid || child.exitCode !== null) return;
  if (process.platform === 'win32') {
    if (['node.exe', 'node'].includes(path.basename(child.spawnfile).toLowerCase())) { child.kill('SIGTERM'); return; }
    execFile('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, timeout: 5000 }, error => { if (error) child.kill('SIGTERM'); });
  } else {
    try { process.kill(-child.pid, 'SIGTERM'); } catch { child.kill('SIGTERM'); }
    const force = setTimeout(() => { try { process.kill(-child.pid, 'SIGKILL'); } catch { /* exited */ } }, 1000);
    force.unref();
  }
}

function execute(invocation, prompt, cwd, signal, onProgress) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new Error(String(signal.reason))); return; }
    const env = { ...process.env };
    // Child research is a separate bounded run, not an interactive nested host session.
    delete env.CLAUDECODE;
    delete env.CLAUDE_CODE_ENTRYPOINT;
    const child = spawn(invocation.command, invocation.args, { cwd, env, windowsHide: true, detached: process.platform !== 'win32', stdio: ['pipe', 'pipe', 'pipe'] });
    let raw = '', stderr = '', bytes = 0;
    let limitExceeded = false;
    const stop = () => stopChild(child);
    signal.addEventListener('abort', stop, { once: true });
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', data => {
      bytes += Buffer.byteLength(data);
      if (bytes > 64 * 1024 * 1024) { limitExceeded = true; stopChild(child); return; }
      raw += data;
      onProgress?.(raw);
    });
    child.stderr.on('data', data => { if (stderr.length < 1024 * 1024) stderr += data.toString(); });
    child.stdin.on('error', () => {});
    child.on('error', error => { signal.removeEventListener('abort', stop); reject(new Error('Provider could not start: ' + error.message)); });
    child.on('close', code => { signal.removeEventListener('abort', stop); resolve({ raw, stderr, code, limitExceeded }); });
    child.stdin.end(prompt);
  });
}

export async function runResearch(options, dependencies = {}) {
  const { provider, brief } = options;
  if (!PROVIDERS.includes(provider)) throw new Error('An explicit codex or claude provider is required.');
  if (typeof brief !== 'string' || !brief.trim() || Buffer.byteLength(brief) > 65536) throw new Error('Brief must contain 1–65536 UTF-8 bytes.');
  const timeoutSeconds = options.timeoutSeconds ?? 600;
  if (!Number.isInteger(timeoutSeconds) || timeoutSeconds < 1 || timeoutSeconds > 3600) throw new Error('Timeout must be an integer from 1 to 3600 seconds.');
  const repo = resolveRepository(options.repo);
  const home = safeOutput(options.home || researchHome(), repo);
  const id = options.id || newRunId();
  if (!/^[a-z0-9][a-z0-9-]{0,90}$/.test(id)) throw new Error('Invalid run ID.');
  const releaseLock = lockStore(home, id);
  const directory = path.join(home, id);
  const meta = { schema: 'rsearch.run/2', id, provider, providerVersion: null, modelOverride: options.model || null, state: 'running', verdict: 'PENDING', ownerPid: process.pid, repo, startedAt: new Date().toISOString(), completedRetrievals: 0, requiredRetrievals: MIN_RETRIEVALS, timeoutSeconds };
  const controller = new AbortController();
  const forwardAbort = () => controller.abort(options.signal.reason || 'CANCELLED');
  let timer;
  try {
    if (existsSync(directory)) throw new Error('Run directory already exists.');
    mkdirSync(directory);
    json(path.join(directory, 'run.json'), meta);
    writeFileSync(path.join(directory, 'brief.md'), brief);
    const schemaPath = path.join(directory, 'finding.schema.json');
    json(schemaPath, findingSchema);
    if (options.signal?.aborted) controller.abort(options.signal.reason || 'CANCELLED');
    else options.signal?.addEventListener('abort', forwardAbort, { once: true });
    timer = setTimeout(() => controller.abort('TIMEOUT'), timeoutSeconds * 1000);
    meta.providerVersion = await (dependencies.providerVersion || providerVersion)(provider);
    if (!meta.providerVersion) throw new Error('Provider CLI is unavailable. Install and authenticate ' + provider + ' first.');
    const invocation = (dependencies.invocation || providerInvocation)(provider, schemaPath, repo, options.model);
    let previousCount = 0;
    const progress = raw => {
      const count = parseStream(provider, raw).retrievals.length;
      if (count !== previousCount) {
        previousCount = count;
        meta.completedRetrievals = count;
        json(path.join(directory, 'run.json'), meta);
        options.onProgress?.({ id, completedRetrievals: count });
      }
    };
    const result = await execute(invocation, researchPrompt(brief, repo), repo || directory, controller.signal, progress);
    writeFileSync(path.join(directory, 'provider-stream.jsonl'), result.raw);
    writeFileSync(path.join(directory, 'provider-stderr.txt'), result.stderr);
    meta.streamSha256 = digest(result.raw);
    meta.providerExitCode = result.code;
    const parsed = parseStream(provider, result.raw);
    meta.completedRetrievals = parsed.retrievals.length;
    if (controller.signal.aborted) throw new Error(String(controller.signal.reason));
    if (result.limitExceeded) throw new Error('PROVIDER_OUTPUT_LIMIT_EXCEEDED');
    if (result.code !== 0 || parsed.errors.length) throw new Error('PROVIDER_FAILED: provider reported a failure. See private provider logs for diagnostics.');
    if (!result.raw.trim()) throw new Error('BROKEN_INSTRUMENT: provider produced no event stream.');
    if (meta.completedRetrievals < MIN_RETRIEVALS) throw new Error('FAILED_RETRIEVAL_FLOOR: fewer than two completed retrieval operations.');
    const payload = validateFindings(parsed.payload);
    json(path.join(directory, 'findings.json'), payload);
    meta.verdict = 'RETRIEVAL_VERIFIED';
    json(path.join(directory, 'run.json'), meta);
    const dossier = verifyRuns([directory]);
    meta.state = 'completed';
    meta.finishedAt = new Date().toISOString();
    json(path.join(directory, 'run.json'), meta);
    return { ...meta, directory, findingCount: dossier.findingCount };
  } catch (error) {
    meta.state = controller.signal.reason === 'CANCELLED' ? 'cancelled' : 'failed';
    meta.verdict = meta.state === 'cancelled' ? 'CANCELLED' : controller.signal.reason === 'TIMEOUT' ? 'TIMEOUT' : 'FAILED';
    meta.error = error.message;
    meta.finishedAt = new Date().toISOString();
    // Never write into an already-existing run ID after its collision was detected.
    if (existsSync(path.join(directory, 'run.json')) && JSON.parse(readFileSync(path.join(directory, 'run.json'), 'utf8')).ownerPid === process.pid && meta.startedAt === JSON.parse(readFileSync(path.join(directory, 'run.json'), 'utf8')).startedAt) json(path.join(directory, 'run.json'), meta);
    error.run = { ...meta, directory };
    throw error;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', forwardAbort);
    releaseLock();
  }
}
