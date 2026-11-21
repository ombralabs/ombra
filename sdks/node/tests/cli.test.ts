import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { runCli } from "../dist/esm/cli.js";
import { SDK_VERSION } from "../dist/esm/index.js";
import { makeFakeEngine, withIsolatedEnv } from "./helpers.js";

describe("CLI engine version selection", () => {
  it("selects the same install revision for spaced and equals version flags", async () => {
    await withIsolatedEnv(async ({ cacheDir }) => {
      const pinned = makeFakeEngine(path.join(cacheDir, "engines", "151.0.7922.108-7"), { version: "151.0.7922.108-7" });
      makeFakeEngine(path.join(cacheDir, "engines", "151.0.7922.108-9"), { version: "151.0.7922.108-9" });
      const output: string[] = [];
      const errors: string[] = [];
      const io = { stdout: (line: string) => output.push(line), stderr: (line: string) => errors.push(line) };
      for (const args of [["install", "--version", "151.0.7922.108-7"], ["install", "--version=151.0.7922.108-7"]]) {
        output.length = 0;
        assert.equal(await runCli(args, io), 0, errors.join("\n"));
        assert.deepEqual(output, [pinned]);
      }
      output.length = 0;
      assert.equal(await runCli(["--version"], io), 0);
      assert.deepEqual(output, [SDK_VERSION]);
      assert.equal(await runCli(["install", "--version"], io), 1);
      assert.match(errors.join("\n"), /--version.*value/);
    });
  });
});
