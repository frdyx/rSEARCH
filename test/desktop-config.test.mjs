import test from 'node:test';
import assert from 'node:assert/strict';
import { desktopConfig } from '../src/desktop-config.mjs';
import { providerInvocation } from '../src/providers.mjs';

test('Desktop blank or missing optional settings do not select a model or repository', () => {
  for (const value of [undefined, '', '   ']) {
    assert.deepEqual(desktopConfig({ RSEARCH_PROVIDER: 'claude', RSEARCH_MODEL: value, RSEARCH_READABLE_ROOT: value }),
      { provider: 'claude', model: undefined, readableRoots: [] });
  }
});
test('Desktop unresolved optional templates are not forwarded to the provider', () => {
  const config = desktopConfig({ RSEARCH_PROVIDER: 'claude', RSEARCH_MODEL: '${user_config.model}', RSEARCH_READABLE_ROOT: '${user_config.readable_root}' });
  assert.deepEqual(config, { provider: 'claude', model: undefined, readableRoots: [] });
  assert.ok(!providerInvocation(config.provider, '', null, config.model).args.includes('--model'));
});
test('Desktop explicit model and readable root survive unchanged', () => {
  const root = 'C:/A directory/repo';
  for (const model of ['sonnet', 'opus', 'claude-opus-5-5']) {
    const config = desktopConfig({ RSEARCH_PROVIDER: 'claude', RSEARCH_MODEL: model, RSEARCH_READABLE_ROOT: root });
    assert.equal(config.model, model);
    assert.deepEqual(config.readableRoots, [root]);
    const args = providerInvocation(config.provider, '', null, config.model).args;
    assert.equal(args[args.indexOf('--model') + 1], model);
  }
});
test('Desktop invalid actual models and missing required providers fail explicitly', () => {
  for (const model of ['not a model', '${user_config.unknown}', 'sonnet;echo']) {
    assert.throws(() => desktopConfig({ RSEARCH_PROVIDER: 'claude', RSEARCH_MODEL: model }), /Invalid model/);
  }
  for (const provider of [undefined, '', '${user_config.provider}', 'other']) {
    assert.throws(() => desktopConfig({ RSEARCH_PROVIDER: provider }), /Research provider/);
  }
});
