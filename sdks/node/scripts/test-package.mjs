#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { root, runNpm } from './tooling.mjs';

// An optional destination retains the verified tarball for release or manual installation.
const destination = process.argv[2] && path.resolve(process.argv[2]);
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ombra-package-'));
try {
  execFileSync(process.execPath, ['scripts/build.mjs'], { cwd: root, stdio: 'inherit' });
  const packed = JSON.parse(runNpm(['pack', '--ignore-scripts', '--json', '--pack-destination', temp], { cwd: root, encoding: 'utf8' }))[0];
  const tarball = path.join(temp, packed.filename);
  const files = packed.files.map(file => file.path);
  assert.ok(files.includes('LICENSE') && files.includes('NOTICE') && files.includes('README.md'));
  assert.ok(!files.some(file => /^(src|tests|scripts|node_modules)\//.test(file)), 'Tarball contains development files');
  const consumer = path.join(temp, 'consumer');
  fs.mkdirSync(consumer);
  fs.writeFileSync(path.join(consumer, 'package.json'), JSON.stringify({ private: true, type: 'module', allowScripts: { 'fs-ext-extra-prebuilt': true } }));
  runNpm(['install', '--omit=dev', '--no-audit', '--no-fund', tarball], { cwd: consumer, stdio: 'inherit' });
  for (const name of ['playwright', 'playwright-core', 'puppeteer', 'puppeteer-core']) assert.ok(!fs.existsSync(path.join(consumer, 'node_modules', name)), `Unexpected optional client ${name}`);
  fs.copyFileSync(path.join(root, 'scripts/distribution/smoke.mjs'), path.join(consumer, 'smoke.mjs'));
  execFileSync(process.execPath, ['smoke.mjs'], { cwd: consumer, stdio: 'inherit' });
  runNpm(['exec', '--offline', '--', 'ombra-sdk', '--help'], { cwd: consumer, stdio: 'inherit' });
  if (destination) {
    fs.mkdirSync(destination, { recursive: true });
    const retained = path.join(destination, packed.filename);
    fs.copyFileSync(tarball, retained);
    console.log(`Verified tarball: ${retained}`);
  }
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
