#!/usr/bin/env node
/**
 * Build dual ESM (dist/esm) and CommonJS (dist/cjs) bundles with TypeScript declarations.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { localTsc } from "./tooling.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const noEmit = process.argv.includes("--noEmit");
const tsc = localTsc();

if (noEmit) {
  execFileSync(process.execPath, [tsc, "-p", "tsconfig.json", "--noEmit"], {
    cwd: rootDir,
    stdio: "inherit",
  });
  process.exit(0);
}

fs.rmSync(path.join(rootDir, "dist"), { recursive: true, force: true });

execFileSync(process.execPath, [tsc, "-p", "tsconfig.json"], {
  cwd: rootDir,
  stdio: "inherit",
});

execFileSync(process.execPath, [tsc, "-p", "tsconfig.cjs.json"], {
  cwd: rootDir,
  stdio: "inherit",
});

// Mark dist/esm and dist/cjs explicitly so Node resolves ESM vs CommonJS unambiguously.
fs.writeFileSync(
  path.join(rootDir, "dist", "esm", "package.json"),
  JSON.stringify({ type: "module" }, null, 2) + "\n",
);
fs.writeFileSync(
  path.join(rootDir, "dist", "cjs", "package.json"),
  JSON.stringify({ type: "commonjs" }, null, 2) + "\n",
);

// Ensure CLI entrypoint is executable on POSIX.
const cliPath = path.join(rootDir, "dist", "esm", "cli.js");
if (fs.existsSync(cliPath) && process.platform !== "win32") {
  fs.chmodSync(cliPath, 0o755);
}
