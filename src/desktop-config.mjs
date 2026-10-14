import { PROVIDERS, validateModelIdentifier } from './providers.mjs';

function optionalSetting(value, key) {
  if (value === undefined || value.trim() === '' || value.trim() === '${user_config.' + key + '}') return undefined;
  return value;
}

export function desktopConfig(env = process.env) {
  const provider = env.RSEARCH_PROVIDER?.trim();
  if (!PROVIDERS.includes(provider)) throw new Error('Set Research provider to claude or codex in the extension configuration.');
  // Desktop can leave an optional blank field as its literal template. Only
  // the exact known optional templates are treated as unset; actual bad values fail.
  const model = validateModelIdentifier(optionalSetting(env.RSEARCH_MODEL, 'model'));
  const root = optionalSetting(env.RSEARCH_READABLE_ROOT, 'readable_root');
  return { provider, model, readableRoots: root ? [root] : [] };
}
