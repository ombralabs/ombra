#!/usr/bin/env node
/**
 * Build ESM + CJS bundles, compile TypeScript test suite (compatible with Node 20+),
 * and execute `node --test` on selected or all test files.
 */

import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { localTsc } from "./tooling.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(rootDir, ".test-dist");

execFileSync(process.execPath, [path.join(rootDir, "scripts", "build.mjs")], {
  cwd: rootDir,
  stdio: "inherit",
});

fs.rmSync(outDir, { recursive: true, force: true });

try {
  execFileSync(process.execPath, [localTsc(), "-p", "tsconfig.test.json"], {
    cwd: rootDir,
    stdio: "inherit",
  });
  fs.writeFileSync(
    path.join(outDir, "package.json"),
    JSON.stringify({ type: "module" }, null, 2) + "\n",
  );

  const filterArgs = process.argv.slice(2);
  let testFiles = fs
    .readdirSync(outDir)
    .filter((f) => f.endsWith(".test.js"))
    .sort()
    .map((f) => path.join(outDir, f));

  if (filterArgs.length > 0) {
    testFiles = testFiles.filter((file) =>
      filterArgs.some((pat) => path.basename(file).includes(pat)),
    );
  }

  const res = spawnSync(process.execPath, ["--test", ...testFiles], {
    cwd: rootDir,
    stdio: "inherit",
  });
  process.exitCode = res.status ?? 1;
} finally {
  fs.rmSync(outDir, { recursive: true, force: true });
}
