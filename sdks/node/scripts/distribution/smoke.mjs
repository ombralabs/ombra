import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const packageRoot = path.resolve(path.dirname(require.resolve('@ombralabs/sdk')), '../..');
const pkg = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
assert.equal(pkg.name, '@ombralabs/sdk');
assert.equal(fs.lstatSync(packageRoot).isSymbolicLink(), false);
for (const entry of Object.keys(pkg.exports)) {
  const specifier = entry === '.' ? pkg.name : pkg.name + entry.slice(1);
  const esm = await import(specifier);
  const cjs = require(specifier);
  assert.deepEqual(Object.keys(esm).sort(), Object.keys(cjs).sort());
  for (const mode of ['esm', 'cjs']) {
    for (const file of ['optional-module.cjs', 'optional-module.d.cts']) {
      assert.ok(fs.existsSync(path.join(packageRoot, 'dist', mode, file)), `${mode}/${file} missing`);
    }
  }
}
const sdk = await import('@ombralabs/sdk');
assert.equal(sdk.SDK_VERSION, pkg.version);
for (const name of ['launch', 'launchContext', 'launchPersistentContext', 'launchPuppeteer', 'ensureBinary', 'ombraCdp']) assert.equal(typeof sdk[name], 'function');
assert.equal((await import('@ombralabs/sdk/puppeteer')).launch, sdk.launchPuppeteer);
const cli = path.join(packageRoot, pkg.bin['ombra-sdk']);
assert.match(fs.readFileSync(cli, 'utf8'), /^#!\/usr\/bin\/env node/);
assert.equal(execFileSync(process.execPath, [cli, '--version'], { encoding: 'utf8' }).trim(), pkg.version);
if (process.platform !== 'win32') assert.ok(fs.statSync(cli).mode & 0o111);

// Exercise the installed SDK's native locking path, including contention across processes.
const profileUrl = pathToFileURL(path.join(packageRoot, 'dist', 'esm', 'profile.js')).href;
const { acquireProfileLease } = await import(profileUrl);
const profileDir = path.resolve('profile');
const lease = acquireProfileLease({ userDataDir: profileDir });
const child = busy => spawnSync(process.execPath, ['--input-type=module', '-e', `
  import assert from 'node:assert/strict';
  import { acquireProfileLease } from ${JSON.stringify(profileUrl)};
  const acquire = () => acquireProfileLease({ userDataDir: ${JSON.stringify(profileDir)} });
  ${busy ? "assert.throws(acquire, error => error.name === 'ProfileBusyError');" : 'acquire().release();'}
`], { encoding: 'utf8' });
try {
  const held = child(true);
  assert.equal(held.status, 0, held.stderr);
} finally { lease.release(); }
const released = child(false);
assert.equal(released.status, 0, released.stderr);
console.log('PASS clean tarball: all ESM/CJS exports, CLI version/mode, native profile lock contention/reacquisition');
