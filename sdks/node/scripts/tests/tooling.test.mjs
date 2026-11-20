import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const scripts = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
test('build and test fail usefully without SDK-local TypeScript', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ombra-tooling-'));
  try {
    fs.cpSync(scripts, path.join(temp, 'scripts'), { recursive: true });
    for (const script of ['build.mjs', 'test.mjs']) {
      const result = spawnSync(process.execPath, [path.join(temp, 'scripts', script)], { encoding: 'utf8' });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /SDK-local TypeScript is missing.*npm install/);
    }
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});

test('npm subprocess uses the JavaScript CLI safely with spaces in paths and arguments', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ombra npm cli '));
  try {
    const cli = path.join(temp, 'npm cli.cjs');
    fs.writeFileSync(cli, 'process.stdout.write(JSON.stringify(process.argv.slice(2)));');
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
      import { runNpm } from ${JSON.stringify(new URL('../tooling.mjs', import.meta.url).href)};
      process.stdout.write(runNpm(['install', 'a path with spaces', 'literal$HOME'], { encoding: 'utf8' }));
    `], { encoding: 'utf8', env: { ...process.env, npm_execpath: cli } });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), ['install', 'a path with spaces', 'literal$HOME']);
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});

test('a compiler alone cannot borrow Node types from another project', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ombra-node-types-'));
  try {
    fs.cpSync(scripts, path.join(temp, 'scripts'), { recursive: true });
    const compiler = path.join(temp, 'node_modules/typescript/bin');
    fs.mkdirSync(compiler, { recursive: true });
    fs.writeFileSync(path.join(compiler, 'tsc'), '');
    const result = spawnSync(process.execPath, [path.join(temp, 'scripts/build.mjs'), '--noEmit'], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /SDK-local @types\/node is missing.*npm install/);
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});
