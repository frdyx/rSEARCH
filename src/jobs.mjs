import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { allowedRepository, researchHome, runPath, canonicalPath, safeOutput, isWithin } from './paths.mjs';
import { newRunId, runResearch, json, processAlive } from './runtime.mjs';

export class ResearchJobs {
  constructor({ provider, model, home = researchHome(), readableRoots = [], dependencies = {} }) {
    if (!['codex', 'claude'].includes(provider)) throw new Error('An explicit codex or claude provider is required.');
    this.provider = provider;
    this.model = model;
    this.home = canonicalPath(home);
    this.readableRoots = readableRoots.map(canonicalPath);
    this.dependencies = dependencies;
    this.active = new Map();
  }
  start({ brief, repo, timeoutSeconds = 600 }) {
    if (this.active.size) throw new Error('A research run is already active. Wait or cancel it before starting another.');
    if (typeof brief !== 'string' || !brief.trim() || Buffer.byteLength(brief) > 65536) throw new Error('Brief must contain 1–65536 UTF-8 bytes.');
    if (!Number.isInteger(timeoutSeconds) || timeoutSeconds < 1 || timeoutSeconds > 3600) throw new Error('Timeout must be an integer from 1 to 3600 seconds.');
    const repository = allowedRepository(repo, this.readableRoots);
    safeOutput(this.home, repository);
    mkdirSync(this.home, { recursive: true });
    const id = newRunId();
    const controller = new AbortController();
    const pending = runResearch({ id, provider: this.provider, model: this.model, brief, repo: repository, home: this.home, timeoutSeconds, signal: controller.signal }, this.dependencies).catch(error => {
      const directory = runPath(this.home, id);
      if (!existsSync(path.join(directory, 'run.json'))) {
        mkdirSync(directory, { recursive: true });
        json(path.join(directory, 'run.json'), { id, provider: this.provider, state: 'failed', verdict: 'FAILED', error: error.message, completedRetrievals: 0, requiredRetrievals: 2 });
      }
      throw error;
    }).finally(() => this.active.delete(id));
    this.active.set(id, { controller, pending });
    pending.catch(() => {});
    return { runId: id, state: 'started', provider: this.provider, next: 'Call research_status with this run ID.' };
  }
  status(id) {
    const directory = runPath(this.home, id);
    const file = this.safeFile(directory, 'run.json');
    const meta = JSON.parse(readFileSync(file, 'utf8'));
    if (meta.state === 'running' && !processAlive(meta.ownerPid)) {
      meta.state = 'failed'; meta.verdict = 'INTERRUPTED'; meta.error = 'The process owning this run stopped before completion.';
      json(path.join(directory, 'run.json'), meta);
    }
    return { runId: id, provider: meta.provider, state: meta.state, verdict: meta.verdict, completedRetrievals: meta.completedRetrievals, requiredRetrievals: meta.requiredRetrievals, error: meta.error || null };
  }
  read(id) {
    const status = this.status(id);
    if (status.state !== 'completed' || status.verdict !== 'RETRIEVAL_VERIFIED') throw new Error('This run has no completed dossier.');
    const directory = runPath(this.home, id);
    return { runId: id, markdown: readFileSync(this.safeFile(directory, 'dossier.md'), 'utf8'), dossier: JSON.parse(readFileSync(this.safeFile(directory, 'dossier.json'), 'utf8')) };
  }
  safeFile(directory, name) {
    const file = canonicalPath(path.join(directory, name));
    if (!isWithin(this.home, file)) throw new Error('Artifact escapes the configured research store.');
    return file;
  }
  cancel(id) {
    runPath(this.home, id);
    const job = this.active.get(id);
    if (!job) { if (!existsSync(runPath(this.home, id))) throw new Error('Run not found.'); return { runId: id, cancelled: false, reason: 'This server has no active process for that run.' }; }
    job.controller.abort('CANCELLED');
    return { runId: id, cancellationRequested: true };
  }
  async close() {
    for (const job of this.active.values()) job.controller.abort('CANCELLED');
    await Promise.allSettled([...this.active.values()].map(job => job.pending));
  }
}
