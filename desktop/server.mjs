import { desktopConfig } from '../src/desktop-config.mjs';
import { serveStdio } from '../src/mcp.mjs';

try {
  if (Number(process.versions.node.split('.')[0]) < 22) throw new Error('rSEARCH requires Node.js 22 or newer.');
  await serveStdio(desktopConfig());
} catch (error) {
  process.stderr.write('rSEARCH: ' + error.message + '\n');
  process.exitCode = 1;
}
