import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { it } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

it('loads automation peers from consumer CWD and SDK fallback in both builds, preserving initializer errors', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ombra-automation-loader-'));
  const sdk = path.join(root, 'sdk'), consumer = path.join(root, 'consumer');
  const req = createRequire(import.meta.url);
  try {
    fs.cpSync(fileURLToPath(new URL('../dist/', import.meta.url)), sdk, { recursive: true });
    fs.mkdirSync(consumer);
    fs.mkdirSync(path.join(sdk, 'node_modules'));
    for (const dependency of ['fs-ext-extra-prebuilt', 'import-meta-resolve']) {
      const entry = req.resolve(dependency === 'fs-ext-extra-prebuilt' ? `${dependency}/package.json` : dependency);
      fs.symlinkSync(path.dirname(entry), path.join(sdk, 'node_modules', dependency), 'junction');
    }
    for (const format of ['esm', 'cjs']) {
      for (const location of [consumer, sdk]) {
        for (const core of [false, true]) {
          for (const family of ['playwright', 'puppeteer']) {
            const name = family + (core ? '-core' : '');
            const peer = path.join(location, 'node_modules', name);
            fs.mkdirSync(peer, { recursive: true });
            fs.writeFileSync(path.join(peer, 'package.json'), JSON.stringify(core
              ? { exports: { require: './index.cjs' } }
              : { type: 'module', exports: { import: './index.js' } }));
            const entry = path.join(peer, core ? 'index.cjs' : 'index.js');
            const load = format === 'esm'
              ? `await import(${JSON.stringify(pathToFileURL(path.join(sdk, format, 'index.js')).href)})`
              : `createRequire(${JSON.stringify(path.join(sdk, "__fixture__.cjs"))})(${JSON.stringify(path.join(sdk, format, 'index.js'))})`;
            const run = (assertion: string) => {
              const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
                import assert from 'node:assert/strict';
                import { createRequire } from 'node:module';
                const { _clientLoader } = ${load};
                process.chdir(${JSON.stringify(consumer)});
                const loader = _clientLoader.${family === 'playwright' ? 'loadPlaywright' : 'loadPuppeteer'};
                ${assertion}
              `], { cwd: sdk, encoding: 'utf8', timeout: 10_000 });
              assert.equal(result.status, 0, `${format}/${location}/${name}: ${result.stderr}`);
            };
            try {
              fs.writeFileSync(entry, core ? 'exports.marker = "selected";' : 'await Promise.resolve(); export const marker = "selected";');
              run('assert.equal((await loader()).marker, "selected");');
              fs.writeFileSync(entry, 'throw new Error("selected initializer failed");');
              run('await assert.rejects(loader, /selected initializer failed/);');
            } finally { fs.rmSync(peer, { recursive: true, force: true }); }
          }
        }
      }
    }
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
