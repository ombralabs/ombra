import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));

async function withConsumer(format: "esm" | "cjs", peerLocation: "consumer" | "sdk", fn: (fixture: {
  root: string; run: (code: string) => Promise<string>;
}) => Promise<void>, peerFormat: "esm" | "cjs" | "import-only" | "require-only" = "cjs"): Promise<void> {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ombra-geoip-test-"));
  const sdk = path.join(root, "sdk");
  const consumer = path.join(root, "consumer");
  fs.mkdirSync(consumer);
  fs.cpSync(dist, sdk, { recursive: true });
  fs.mkdirSync(path.join(sdk, "node_modules"));
  fs.symlinkSync(path.dirname(createRequire(import.meta.url).resolve("fs-ext-extra-prebuilt/package.json")), path.join(sdk, "node_modules", "fs-ext-extra-prebuilt"), "junction");
  fs.symlinkSync(path.dirname(createRequire(import.meta.url).resolve("import-meta-resolve")), path.join(sdk, "node_modules", "import-meta-resolve"), "junction");
  const peer = path.join(peerLocation === "sdk" ? sdk : consumer, "node_modules", "mmdb-lib");
  fs.mkdirSync(peer, { recursive: true });
  const isEsm = peerFormat === "esm" || peerFormat === "import-only";
  const extension = peerFormat === "import-only" ? "js" : isEsm ? "mjs" : "cjs";
  const entry = peerFormat === "import-only"
    ? { type: "module", exports: { import: "./index.js" } }
    : peerFormat === "require-only"
    ? { exports: { require: "./index.cjs" } }
    : { main: `index.${extension}` };
  fs.writeFileSync(path.join(peer, "package.json"), JSON.stringify({ name: "mmdb-lib", ...entry }));
  fs.writeFileSync(path.join(peer, `index.${extension}`), `
    ${isEsm ? "import fs from 'node:fs'; export class Reader" : "const fs = require('node:fs'); exports.Reader = class"} {
      get(ip) {
        fs.appendFileSync(process.env.GEOIP_QUERIES, ip + '\\n');
        return { location: { time_zone: 'Asia/Tokyo' }, country: { iso_code: 'JP' } };
      }
    };
  `);
  for (const name of ["playwright-core", "puppeteer-core"]) {
    const client = path.join(path.dirname(peer), name);
    fs.mkdirSync(client);
    fs.writeFileSync(path.join(client, "package.json"), JSON.stringify({ name, ...entry }));
    fs.writeFileSync(path.join(client, `index.${extension}`), isEsm ? "export const installed = true;" : "exports.installed = true;");
  }
  const cache = path.join(root, "cache");
  fs.mkdirSync(path.join(cache, "geoip"), { recursive: true });
  fs.writeFileSync(path.join(cache, "geoip", "GeoLite2-City.mmdb"), "fixture handled by optional Reader");
  const prefix = `
    import assert from 'node:assert/strict';
    import fs from 'node:fs';
    import { createRequire } from 'node:module';
    const load = ${format === "esm" ? "(name) => import(" + JSON.stringify(pathToFileURL(path.join(sdk, format)).href + "/") + " + name + '.js')" : "(name) => createRequire(" + JSON.stringify(path.join(sdk, "__fixture__.cjs")) + ")(" + JSON.stringify(path.join(sdk, format) + path.sep) + " + name + '.js')"};
    const geoip = await load('geoip');
    process.chdir(${JSON.stringify(consumer)});
    globalThis.fetch = async () => new Response('203.0.113.42');
  `;
  const run = (code: string) => new Promise<string>((resolve, reject) => {
    const child = spawn(process.execPath, ["--input-type=module", "-e", prefix + code], {
      timeout: 3000,
      cwd: sdk,
      env: { ...process.env, OMBRA_CACHE_DIR: cache, OMBRA_APP_ENGINES_DIR: path.join(root, "none"), OMBRA_DOWNLOAD_URL: "off", OMBRA_LOG_LEVEL: "error", GEOIP_QUERIES: path.join(root, "queries") },
    });
    let stdout = "", stderr = "";
    child.stdout.on("data", (chunk) => stdout += chunk);
    child.stderr.on("data", (chunk) => stderr += chunk);
    child.once("error", reject);
    child.once("close", (code) => code === 0 ? resolve(stdout) : reject(new Error(`consumer failed (${code}): ${stderr}`)));
  });
  try { await fn({ root, run }); }
  finally { fs.rmSync(root, { recursive: true, force: true }); }
}

describe("GeoIP optional peer and proxy exit correctness", () => {
  for (const format of ["esm", "cjs"] as const) {
    for (const location of ["consumer", "sdk"] as const) {
      for (const peerFormat of ["esm", "cjs", "import-only", "require-only"] as const) {
        it(`${format} loads the ${location} ${peerFormat} optional peer and emits boolean diagnostics after CWD changes`, async () => {
          await withConsumer(format, location, async ({ root, run }) => {
            await run(`
            assert.equal(await geoip.geoipAvailable(), true);
            const cli = await load('cli');
            const output = [];
            assert.equal(await cli.runCli(['doctor', '--quick', '--json'], { stdout: s => output.push(s), stderr: s => { throw new Error(s); } }), 0);
            const diag = JSON.parse(output.join(''));
            assert.equal(diag.modules['mmdb-lib'], true);
            assert.equal(diag.modules.playwright, true);
            assert.equal(diag.modules.puppeteer, true);
            for (const value of Object.values(diag.modules)) assert.equal(typeof value, 'boolean');
            assert.deepEqual(await geoip.resolveAutoGeoHints({ timezone: 'auto', locale: 'de-DE', proxy: null }), { timezone: 'Asia/Tokyo', locale: 'de-DE' });
            assert.deepEqual(await geoip.resolveAutoGeoHints({ timezone: 'Europe/Berlin', locale: 'auto', proxy: null }), { timezone: 'Europe/Berlin', locale: 'ja-JP' });
          `);
            assert.equal(fs.readFileSync(path.join(root, "queries"), "utf8"), "203.0.113.42\n203.0.113.42\n");
          }, peerFormat);
        });
      }
    }
  }

  for (const format of ["esm", "cjs"] as const) {
    it(`${format} prefers the consumer require-only peer over a different SDK peer`, async () => {
      await withConsumer(format, "consumer", async ({ root, run }) => {
        const sdkPeer = path.join(root, "sdk", "node_modules", "mmdb-lib");
        fs.mkdirSync(sdkPeer);
        fs.writeFileSync(path.join(sdkPeer, "package.json"), JSON.stringify({ name: "mmdb-lib", main: "index.cjs" }));
        fs.writeFileSync(path.join(sdkPeer, "index.cjs"), `
          exports.Reader = class {
            get() { return { location: { time_zone: 'Europe/London' }, country: { iso_code: 'GB' } }; }
          };
        `);
        await run(`
          assert.equal(await geoip.geoipAvailable(), true);
          assert.deepEqual(await geoip.resolveAutoGeoHints({ timezone: 'auto', locale: 'auto', proxy: null }), { timezone: 'Asia/Tokyo', locale: 'ja-JP' });
        `);
        assert.equal(fs.readFileSync(path.join(root, "queries"), "utf8"), "203.0.113.42\n");
      }, "require-only");
    });

    it(`${format} availability and doctor do not execute peer initializers or unresolved top-level await`, async () => {
      await withConsumer(format, "consumer", async ({ root, run }) => {
        for (const name of ["mmdb-lib", "playwright-core", "puppeteer-core"]) {
          fs.writeFileSync(path.join(root, "consumer", "node_modules", name, "index.mjs"), `
            import fs from 'node:fs';
            fs.writeFileSync(process.env.GEOIP_QUERIES + '.initialized', 'unexpected initialization');
            await new Promise(() => {});
          `);
        }
        await run(`
          assert.equal(await geoip.geoipAvailable(), true);
          const cli = await load('cli');
          const output = [];
          assert.equal(await cli.runCli(['doctor', '--quick', '--json'], { stdout: s => output.push(s), stderr: s => { throw new Error(s); } }), 0);
          assert.deepEqual(JSON.parse(output.join('')).modules, { playwright: true, puppeteer: true, 'mmdb-lib': true });
        `);
        assert.equal(fs.existsSync(path.join(root, "queries.initialized")), false);
      }, "esm");
    });

    it(`${format} reports absent peers without evaluating or loading them`, async () => {
      await withConsumer(format, "consumer", async ({ root, run }) => {
        fs.rmSync(path.join(root, "consumer", "node_modules"), { recursive: true });
        await run(`
          assert.equal(await geoip.geoipAvailable(), false);
          const cli = await load('cli');
          const output = [];
          assert.equal(await cli.runCli(['doctor', '--quick', '--json'], { stdout: s => output.push(s), stderr: s => { throw new Error(s); } }), 0);
          assert.deepEqual(JSON.parse(output.join('')).modules, { playwright: false, puppeteer: false, 'mmdb-lib': false });
          assert.deepEqual(await geoip.resolveAutoGeoHints({ timezone: 'auto', locale: 'de-DE', proxy: null }), { timezone: undefined, locale: 'de-DE' });
        `);
      });
    });
  }

  it("returns ProxyError after failed real proxy exit discovery without querying the gateway", { timeout: 5000 }, async () => {
    let requests = 0;
    const proxy = net.createServer((socket) => {
      socket.once("data", () => {
        requests++;
        socket.end("HTTP/1.1 502 Bad Gateway\r\nContent-Length: 0\r\n\r\n");
      });
    });
    await new Promise<void>((resolve) => proxy.listen(0, "127.0.0.1", resolve));
    try {
      await withConsumer("esm", "consumer", async ({ root, run }) => {
        await run(`
          const { parseProxy } = await load('proxy');
          const { ProxyError } = await load('errors');
          await assert.rejects(geoip.resolveAutoGeoHints({ timezone: 'auto', locale: 'auto', proxy: parseProxy('http://127.0.0.1:${(proxy.address() as net.AddressInfo).port}') }), ProxyError);
        `);
        assert.equal(requests, 3);
        assert.equal(fs.existsSync(path.join(root, "queries")), false, "gateway must never reach the database");
      });
    } finally {
      await new Promise<void>((resolve) => proxy.close(() => resolve()));
    }
  });
});
