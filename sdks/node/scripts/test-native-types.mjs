#!/usr/bin/env node
// Install real consumers outside the repository so SDK devDependencies cannot supply peer types.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runNpm } from './tooling.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = (command, args, cwd) => execFileSync(command, args, {
  cwd, stdio: 'inherit', env: { ...process.env, PUPPETEER_SKIP_DOWNLOAD: 'true', PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1' },
});
const cases = [
  ['none'], ['playwright-core', '1.60.0'], ['playwright', '1.60.0'],
  ['puppeteer-core', '22.0.0'], ['puppeteer', '22.0.0'],
  ['puppeteer-core', '25.18.0'], ['puppeteer', '25.18.0'],
];
const selected = cases.filter(([client, version]) => process.argv.length === 2 || process.argv.slice(2).includes(version ? `${client}@${version}` : client));
assert.ok(selected.length, 'Select at least one native consumer case');
if (selected.some(([, version]) => version === '25.18.0')) {
  const [major, minor] = process.versions.node.split('.').map(Number);
  assert.ok(major > 22 || major === 22 && minor >= 12, 'Puppeteer 25 consumers require Node >=22.12; select the 22.0.0 cases on Node 20');
}
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ombra-native-types-'));
try {
  run(process.execPath, ['scripts/build.mjs'], root);
  runNpm(['pack', '--ignore-scripts', '--loglevel=error', '--pack-destination', temp], { cwd: root, stdio: 'inherit' });
  const tarball = path.join(temp, fs.readdirSync(temp).find(name => name.endsWith('.tgz')));
  for (const [client, version] of selected) {
    const label = version ? `${client}@${version}` : client;
    const cwd = path.join(temp, label);
    fs.mkdirSync(cwd);
    fs.writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
    runNpm(['install', '--ignore-scripts', '--no-audit', '--no-fund', tarball, 'typescript@5.9.3', '@types/node@22', ...(version ? [label] : [])], {
      cwd, stdio: 'inherit', env: { ...process.env, PUPPETEER_SKIP_DOWNLOAD: 'true', PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1' },
    });
    if (version && !client.endsWith('-core')) {
      // A full package must supply its own types even when core is not hoisted to SDK resolution.
      const nested = path.join(cwd, 'node_modules', client, 'node_modules');
      fs.mkdirSync(nested, { recursive: true });
      fs.renameSync(path.join(cwd, 'node_modules', `${client}-core`), path.join(nested, `${client}-core`));
      assert.ok(!fs.existsSync(path.join(cwd, 'node_modules', `${client}-core`)));
    }
    for (const name of ['playwright', 'playwright-core', 'puppeteer', 'puppeteer-core']) {
      if (name !== client) assert.ok(!fs.existsSync(path.join(cwd, 'node_modules', name)), `Unexpected hoisted peer ${name}`);
    }
    const family = client.startsWith('playwright') ? 'playwright' : client.startsWith('puppeteer') ? 'puppeteer' : 'none';
    const fixture = fs.readFileSync(path.join(root, 'scripts', 'native-types', `${family}.ts`), 'utf8').replaceAll('CLIENT', client);
    for (const ext of ['mts', 'cts']) fs.writeFileSync(path.join(cwd, `consumer.${ext}`), fixture);
    fs.writeFileSync(path.join(cwd, 'tsconfig.json'), JSON.stringify({ compilerOptions: {
      target: 'ES2022', module: 'NodeNext', moduleResolution: 'NodeNext', strict: true,
      skipLibCheck: false, noEmit: true, types: ['node'],
    }, include: ['consumer.mts', 'consumer.cts'] }));
    run(process.execPath, [path.join(cwd, 'node_modules/typescript/bin/tsc'), '-p', 'tsconfig.json'], cwd);
    if (version) {
      run(process.execPath, ['--input-type=module', '-e', `
        import assert from 'node:assert/strict';
        import { createRequire } from 'node:module';
        import { _clientLoader } from '@ombralabs/sdk';
        const cjs = createRequire(process.cwd() + '/__consumer__.cjs')('@ombralabs/sdk');
        for (const loader of [_clientLoader, cjs._clientLoader]) {
          const client = await loader.${family === 'playwright' ? 'loadPlaywright' : 'loadPuppeteer'}();
          assert.equal(typeof ${family === 'playwright' ? '(client.chromium ?? client.default?.chromium).connectOverCDP' : '(client.default ?? client).connect'}, 'function');
        }
      `], cwd);
    }
    console.log(`PASS ${label}: ${version ? "native ESM/CJS declarations, helpers, not-any checks and optional loader" : "optional-free ESM/CJS declarations and unknown defaults"}`);
  }
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
