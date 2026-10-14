import { existsSync, realpathSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

export function canonicalPath(input) {
  let cursor = path.resolve(input);
  const suffix = [];
  while (!existsSync(cursor)) {
    const parent = path.dirname(cursor);
    if (parent === cursor) throw new Error('Cannot resolve path: ' + input);
    suffix.unshift(path.basename(cursor));
    cursor = parent;
  }
  return path.join(realpathSync(cursor), ...suffix);
}

export function isWithin(root, target, platform = process.platform) {
  const api = platform === 'win32' ? path.win32 : path.posix;
  const relative = api.relative(api.resolve(root), api.resolve(target));
  return relative === '' || (!api.isAbsolute(relative) && relative !== '..' && !relative.startsWith('..' + api.sep));
}

export function researchHome(env = process.env) {
  if (env.RSEARCH_HOME) return canonicalPath(env.RSEARCH_HOME);
  if (process.platform === 'win32') return canonicalPath(path.join(env.LOCALAPPDATA || path.join(homedir(), 'AppData', 'Local'), 'rsearch'));
  if (process.platform === 'darwin') return canonicalPath(path.join(homedir(), 'Library', 'Application Support', 'rsearch'));
  return canonicalPath(path.join(env.XDG_DATA_HOME || path.join(homedir(), '.local', 'share'), 'rsearch'));
}

export function resolveRepository(input) {
  if (!input) return null;
  const result = canonicalPath(input);
  if (!existsSync(result) || !statSync(result).isDirectory()) throw new Error('Repository must be an existing directory.');
  return result;
}

export function safeOutput(home, repo) {
  const result = canonicalPath(home);
  if (repo && isWithin(repo, result)) throw new Error('Research artifacts must be outside the repository under study.');
  return result;
}

export function runPath(home, id) {
  if (!/^[a-z0-9][a-z0-9-]{0,90}$/.test(id)) throw new Error('Invalid run ID.');
  const root = canonicalPath(home);
  const result = canonicalPath(path.join(root, id));
  if (!isWithin(root, result)) throw new Error('Run path escapes the research store.');
  return result;
}

export function allowedRepository(input, roots) {
  const repo = resolveRepository(input);
  if (repo && !roots.some(root => isWithin(canonicalPath(root), repo))) throw new Error('Repository is outside the configured readable roots.');
  return repo;
}

export function resolveCitation(source, repo) {
  if (!repo || /^[a-z][a-z0-9+.-]*:\/\//i.test(source)) return null;
  const file = source.replace(/:\d+(?::\d+)?$/, '');
  try {
    const target = canonicalPath(path.resolve(repo, file));
    if (!isWithin(repo, target) || !existsSync(target) || !statSync(target).isFile()) return null;
    return target;
  } catch { return null; }
}
