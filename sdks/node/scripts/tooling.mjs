import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function localTsc() {
  const cli = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc');
  if (!fs.existsSync(cli)) throw new Error('SDK-local TypeScript is missing. Run npm install in sdks/node (including devDependencies).');
  if (!fs.existsSync(path.join(root, 'node_modules', '@types', 'node', 'package.json'))) throw new Error('SDK-local @types/node is missing. Run npm install in sdks/node (including devDependencies).');
  return cli;
}

export function runNpm(args, options) {
  // npm's JavaScript CLI works on Windows without executing a .cmd shim or shell.
  if (process.env.npm_execpath) return execFileSync(process.execPath, [process.env.npm_execpath, ...args], options);
  if (process.platform === 'win32') throw new Error('Run this check via npm run so npm_execpath identifies the npm CLI on Windows.');
  return execFileSync('npm', args, options);
}
