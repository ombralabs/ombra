import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { ProfileBusyError } from "../dist/esm/index.js";
import { acquireFileLock, FileLockBusyError } from "../dist/esm/file-lock.js";
import {
  acquireProfileLease,
  readProfileMetadata,
  resolveNamedProfileDir,
  writeProfileMetadata,
} from "../dist/esm/profile.js";
import { withIsolatedEnv } from "./helpers.js";

function profileProcess(userDataDir: string): ChildProcess {
  return spawn(process.execPath, ["--input-type=module", "-e", `
    import { acquireProfileLease } from ${JSON.stringify(new URL("../dist/esm/profile.js", import.meta.url).href)};
    const timeout = setTimeout(() => process.exit(2), 15000);
    let lease;
    process.on("message", (message) => {
      if (message === "acquire") {
        try {
          lease = acquireProfileLease({ userDataDir: ${JSON.stringify(userDataDir)} });
          process.send("owned");
        } catch (error) { process.send(error.name); }
      } else if (message === "release") {
        lease?.release();
        clearTimeout(timeout);
        process.disconnect();
      }
    });
    process.send("ready");
  `], { stdio: ["ignore", "inherit", "inherit", "ipc"] });
}

async function stopProfileProcess(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, "exit");
  child.kill("SIGKILL");
  await exited;
}

async function tryProcessAcquire(child: ChildProcess): Promise<unknown> {
  const reply = once(child, "message");
  child.send("acquire");
  return (await reply)[0];
}

describe("named profiles, seed persistence, and profile.lock", () => {
  it("persists seed across named profile launches and updates when explicitSeed changes", async () => {
    await withIsolatedEnv(async () => {
      const lease1 = acquireProfileLease({
        profile: "Shop Account",
        osHint: "macos",
        timezone: "America/New_York",
        locale: "en-US",
      });
      const firstSeed = lease1.seed;
      const dir1 = lease1.path;
      assert.ok(firstSeed >= 10_000);
      lease1.release();

      // Re-opening same named profile reuses stored seed and hints
      const lease2 = acquireProfileLease({ profile: "Shop Account" });
      assert.equal(lease2.path, dir1);
      assert.equal(lease2.seed, firstSeed);
      assert.equal(lease2.osHint, "macos");
      assert.equal(lease2.timezone, "America/New_York");
      lease2.release();

      // Explicit seed updates persisted profile.json
      const lease3 = acquireProfileLease({ profile: "Shop Account", explicitSeed: 777_888 });
      assert.equal(lease3.seed, 777_888);
      lease3.release();
      const meta = readProfileMetadata(dir1);
      assert.equal(meta?.seed, 777_888);
    });
  });

  it("disambiguates slug collisions using an 8-char SHA-256 suffix", async () => {
    await withIsolatedEnv(async () => {
      const a = acquireProfileLease({ profile: "Shop US" });
      a.release();

      const b = acquireProfileLease({ profile: "shop---us" });
      b.release();

      assert.notEqual(a.path, b.path);
      assert.match(path.basename(b.path), /^shop-us-[0-9a-f]{8}$/);
    });
  });

  it("removes ephemeral profile directories on release", async () => {
    await withIsolatedEnv(async () => {
      const lease = acquireProfileLease({});
      assert.equal(lease.ephemeral, true);
      assert.equal(fs.existsSync(lease.path), true);
      const dir = lease.path;
      lease.release();
      assert.equal(fs.existsSync(dir), false);
    });
  });

  it("keeps literal suffix collisions separate with their own identity, seed and data", async () => {
    await withIsolatedEnv(async () => {
      const cases = [["Pricing EU", 111], ["pricing-eu-a64572d7", 333], ["Pricing!EU", 222]] as const;
      const dirs: string[] = [];
      for (const [profile, explicitSeed] of cases) {
        const lease = acquireProfileLease({ profile, explicitSeed });
        try {
          dirs.push(lease.path);
          fs.writeFileSync(path.join(lease.path, "cookies"), profile);
        } finally { lease.release(); }
      }
      assert.equal(new Set(dirs).size, 3);
      for (const [index, [profile, seed]] of cases.entries()) {
        const lease = acquireProfileLease({ profile });
        try {
          assert.equal(lease.path, dirs[index]);
          assert.equal(lease.seed, seed);
          assert.equal(readProfileMetadata(lease.path)?.name, profile);
          assert.equal(fs.readFileSync(path.join(lease.path, "cookies"), "utf8"), profile);
        } finally { lease.release(); }
      }
    });
  });

  it("reopens the owned suffixed directory after its base neighbor is deleted", async () => {
    await withIsolatedEnv(async () => {
      const base = acquireProfileLease({ profile: "Pricing EU", explicitSeed: 111 });
      base.release();
      const suffixed = acquireProfileLease({ profile: "Pricing!EU", explicitSeed: 222 });
      fs.writeFileSync(path.join(suffixed.path, "cookies"), "persisted cookies");
      suffixed.release();
      fs.rmSync(base.path, { recursive: true });
      const reopened = acquireProfileLease({ profile: "Pricing!EU" });
      try {
        assert.equal(reopened.path, suffixed.path);
        assert.equal(reopened.seed, 222);
        assert.equal(fs.readFileSync(path.join(reopened.path, "cookies"), "utf8"), "persisted cookies");
      } finally { reopened.release(); }
    });
  });

  it("rechecks identity under the selected directory lock before reusing data", async (t) => {
    await withIsolatedEnv(async () => {
      const candidate = resolveNamedProfileDir("Pricing EU");
      const open = fs.openSync;
      const hook = t.mock.method(fs, "openSync", (...args: Parameters<typeof fs.openSync>) => {
        if (args[0] === path.join(candidate, ".ombra", "profile.lock")) {
          hook.mock.restore();
          writeProfileMetadata(candidate, { name: "Pricing!EU", seed: 222, created_at: "2020-01-01" });
          fs.writeFileSync(path.join(candidate, "cookies"), "neighbor cookies");
        }
        return open(...args);
      });
      const lease = acquireProfileLease({ profile: "Pricing EU", explicitSeed: 111 });
      try {
        assert.notEqual(lease.path, candidate);
        assert.equal(readProfileMetadata(candidate)?.name, "Pricing!EU");
        assert.equal(readProfileMetadata(candidate)?.seed, 222);
        assert.equal(fs.readFileSync(path.join(candidate, "cookies"), "utf8"), "neighbor cookies");
      } finally { hook.mock.restore(); lease.release(); }
    });
  });

  it("retains the lock inode across acquisition and release", async () => {
    await withIsolatedEnv(async ({ tmpRoot }) => {
      const userDataDir = path.join(tmpRoot, "stable");
      fs.mkdirSync(path.join(userDataDir, ".ombra"), { recursive: true });
      const lockFile = path.join(userDataDir, ".ombra", "profile.lock");
      fs.writeFileSync(lockFile, "stale metadata");
      const inode = fs.statSync(lockFile).ino;
      const lease = acquireProfileLease({ userDataDir });
      try { assert.equal(fs.statSync(lockFile).ino, inode); }
      finally { lease.release(); }
      assert.equal(fs.statSync(lockFile).ino, inode);
      assert.equal(fs.readFileSync(lockFile, "utf8"), "");
    });
  });

  it("rejects a live separate-process owner and releases ownership on abrupt death", async () => {
    await withIsolatedEnv(async ({ tmpRoot }) => {
      const owner = profileProcess(path.join(tmpRoot, "shared"));
      try {
        await once(owner, "message");
        assert.equal(await tryProcessAcquire(owner), "owned");
        assert.throws(() => acquireProfileLease({ userDataDir: path.join(tmpRoot, "shared") }), ProfileBusyError);
        await stopProfileProcess(owner);
        const recovered = acquireProfileLease({ userDataDir: path.join(tmpRoot, "shared") });
        recovered.release();
      } finally { await stopProfileProcess(owner); }
    });
  });

  it("does not steal a live process lock when its metadata looks stale", { skip: process.platform === "win32" }, async () => {
    await withIsolatedEnv(async ({ tmpRoot }) => {
      const userDataDir = path.join(tmpRoot, "shared");
      const owner = profileProcess(userDataDir);
      try {
        await once(owner, "message");
        assert.equal(await tryProcessAcquire(owner), "owned");
        fs.writeFileSync(path.join(userDataDir, ".ombra", "profile.lock"), JSON.stringify({ pid: 999_999_991 }));
        assert.throws(() => acquireProfileLease({ userDataDir }).release(), ProfileBusyError);
      } finally { await stopProfileProcess(owner); }
    });
  });

  it("permits only one simultaneous process to reclaim stale metadata", async () => {
    await withIsolatedEnv(async ({ tmpRoot }) => {
      const userDataDir = path.join(tmpRoot, "shared");
      fs.mkdirSync(path.join(userDataDir, ".ombra"), { recursive: true });
      fs.writeFileSync(path.join(userDataDir, ".ombra", "profile.lock"), JSON.stringify({ pid: 999_999_991 }));
      const children = Array.from({ length: 6 }, () => profileProcess(userDataDir));
      try {
        await Promise.all(children.map((child) => once(child, "message")));
        const results = await Promise.all(children.map(tryProcessAcquire));
        assert.equal(results.filter((result) => result === "owned").length, 1, JSON.stringify(results));
        assert.equal(results.filter((result) => result === "ProfileBusyError").length, 5, JSON.stringify(results));
      } finally { await Promise.all(children.map(stopProfileProcess)); }
    });
  });

  it("releases ownership if metadata publication fails", async (t) => {
    await withIsolatedEnv(async ({ tmpRoot }) => {
      const userDataDir = path.join(tmpRoot, "failed-write");
      const hook = t.mock.method(fs, "renameSync", () => { throw new Error("metadata publication failed"); });
      try { assert.throws(() => acquireProfileLease({ userDataDir }), /metadata publication failed/); }
      finally { hook.mock.restore(); }
      const contender = profileProcess(userDataDir);
      try {
        await once(contender, "message");
        assert.equal(await tryProcessAcquire(contender), "owned");
      } finally { await stopProfileProcess(contender); }
    });
  });

  it("keeps live legacy PID ownership intact without leaking an OS lock", async () => {
    await withIsolatedEnv(async ({ tmpRoot }) => {
      const userDataDir = path.join(tmpRoot, "legacy");
      const lockFile = path.join(userDataDir, ".ombra", "profile.lock");
      fs.mkdirSync(path.dirname(lockFile), { recursive: true });
      const payload = JSON.stringify({ pid: process.pid });
      fs.writeFileSync(lockFile, payload);
      assert.throws(() => acquireProfileLease({ userDataDir }), ProfileBusyError);
      assert.equal(fs.readFileSync(lockFile, "utf8"), payload);
      const lock = acquireFileLock(lockFile);
      lock.release();
    });
  });

  it("clears partial PID metadata and releases ownership if lock initialization fails", async (t) => {
    await withIsolatedEnv(async ({ tmpRoot }) => {
      const userDataDir = path.join(tmpRoot, "failed-lock-write");
      const hook = t.mock.method(fs, "fsyncSync", () => { throw new Error("lock write failed"); });
      try { assert.throws(() => acquireProfileLease({ userDataDir }), /lock write failed/); }
      finally { hook.mock.restore(); }
      const contender = profileProcess(userDataDir);
      try {
        await once(contender, "message");
        assert.equal(await tryProcessAcquire(contender), "owned");
      } finally { await stopProfileProcess(contender); }
    });
  });

  for (const opener of ["same process", "separate process"]) {
    it(`reopens a lease in the ${opener} after PID metadata clearing fails`, async (t) => {
      await withIsolatedEnv(async ({ tmpRoot }) => {
        const userDataDir = path.join(tmpRoot, "failed-lock-clear");
        const lease = acquireProfileLease({ userDataDir });
        const lockFile = path.join(userDataDir, ".ombra", "profile.lock");
        const inode = fs.statSync(lockFile).ino;
        const hook = t.mock.method(fs, "ftruncateSync", () => { throw new Error("lock clear failed"); });
        try { assert.throws(() => lease.release(), /lock clear failed/); }
        finally { hook.mock.restore(); }
        assert.equal(JSON.parse(fs.readFileSync(lockFile, "utf8")).pid, process.pid);
        if (opener === "same process") {
          const reopened = acquireProfileLease({ userDataDir });
          try { assert.equal(reopened.seed, lease.seed); }
          finally { reopened.release(); }
        } else {
          const contender = profileProcess(userDataDir);
          try {
            await once(contender, "message");
            assert.equal(await tryProcessAcquire(contender), "owned");
          } finally { await stopProfileProcess(contender); }
        }
        assert.equal(fs.statSync(lockFile).ino, inode);
      });
    });
  }

  it("clears PID metadata after a transient release failure for legacy client handoff", async (t) => {
    await withIsolatedEnv(async ({ tmpRoot }) => {
      const userDataDir = path.join(tmpRoot, "failed-lock-clear");
      const lease = acquireProfileLease({ userDataDir });
      const lockFile = path.join(userDataDir, ".ombra", "profile.lock");
      const inode = fs.statSync(lockFile).ino;
      const hook = t.mock.method(fs, "ftruncateSync", () => {
        hook.mock.restore();
        throw new Error("lock clear failed");
      });
      try { assert.throws(() => lease.release(), /lock clear failed/); }
      finally { hook.mock.restore(); }
      assert.equal(fs.readFileSync(lockFile, "utf8"), "");
      assert.equal(fs.statSync(lockFile).ino, inode);
      const reopened = acquireProfileLease({ userDataDir });
      reopened.release();
    });
  });

  it("offers nonblocking payload-neutral locks with distinct busy errors and idempotent release", async (t) => {
    await withIsolatedEnv(async ({ tmpRoot }) => {
      const lockFile = path.join(tmpRoot, "installer.lock");
      fs.writeFileSync(lockFile, "installer metadata");
      const first = acquireFileLock(lockFile);
      const open = fs.openSync;
      let attemptedFd = -1;
      const hook = t.mock.method(fs, "openSync", (...args: Parameters<typeof fs.openSync>) => {
        attemptedFd = open(...args);
        return attemptedFd;
      });
      try {
        assert.throws(() => acquireFileLock(lockFile), (error: unknown) =>
          error instanceof FileLockBusyError && error.code === "ELOCKED");
        assert.throws(() => fs.fstatSync(attemptedFd), { code: "EBADF" });
      } finally { hook.mock.restore(); first.release(); }
      const second = acquireFileLock(lockFile);
      try {
        first.release();
        assert.ok(fs.fstatSync(second.fd).isFile());
        assert.equal(fs.readFileSync(second.fd, "utf8"), "installer metadata");
      } finally { second.release(); }
      assert.throws(() => fs.fstatSync(second.fd), { code: "EBADF" });
      assert.throws(() => acquireFileLock(path.join(tmpRoot, "absent", "lock")), { code: "ENOENT" });
    });
  });

  it("releases ownership even if ephemeral directory cleanup fails", async (t) => {
    await withIsolatedEnv(async () => {
      const lease = acquireProfileLease();
      const hook = t.mock.method(fs, "rmSync", () => { throw new Error("cleanup failed"); });
      try { assert.throws(() => lease.release(), /cleanup failed/); }
      finally { hook.mock.restore(); }
      const contender = profileProcess(lease.path);
      try {
        await once(contender, "message");
        assert.equal(await tryProcessAcquire(contender), "owned");
      } finally {
        await stopProfileProcess(contender);
        fs.rmSync(lease.path, { recursive: true, force: true });
      }
    });
  });

  it("enforces in-process and PID locks and recovers stale lock files", async () => {
    await withIsolatedEnv(async ({ tmpRoot }) => {
      const lease = acquireProfileLease({ profile: "locked-prof" });
      try {
        assert.throws(
          () => acquireProfileLease({ profile: "locked-prof" }),
          ProfileBusyError,
        );
      } finally {
        lease.release();
      }

      // Write a stale lock referencing a dead PID
      const customDir = path.join(tmpRoot, "custom-udd");
      const lockDir = path.join(customDir, ".ombra");
      fs.mkdirSync(lockDir, { recursive: true });
      fs.writeFileSync(
        path.join(lockDir, "profile.lock"),
        JSON.stringify({ pid: 999_999_991, started_at: "2020-01-01T00:00:00Z" }),
        "utf8",
      );

      const recovered = acquireProfileLease({ userDataDir: customDir });
      assert.equal(recovered.path, customDir);
      recovered.release();
    });
  });
});
