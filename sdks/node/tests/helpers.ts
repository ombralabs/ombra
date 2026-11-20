import { execFileSync } from "node:child_process";
import { createHash, generateKeyPairSync, sign as cryptoSign } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";

export interface IsolatedEnvContext {
  tmpRoot: string;
  cacheDir: string;
  appEnginesDir: string;
}

const OMBRA_ENV_KEYS = [
  "OMBRA_BINARY_PATH",
  "OMBRA_CACHE_DIR",
  "OMBRA_APP_ENGINES_DIR",
  "OMBRA_DOWNLOAD_URL",
  "OMBRA_AUTO_UPDATE",
  "OMBRA_SKIP_CHECKSUM",
  "OMBRA_RELEASE_CHANNEL",
  "OMBRA_VERSION",
  "OMBRA_TIMEOUT_MS",
  "OMBRA_LICENSE_KEY",
  "OMBRA_LOG_LEVEL",
];

export async function withIsolatedEnv<T>(
  fn: (ctx: IsolatedEnvContext) => Promise<T> | T,
): Promise<T> {
  const saved: Record<string, string | undefined> = {};
  for (const key of OMBRA_ENV_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ombra-node-test-"));
  const cacheDir = path.join(tmpRoot, "cache");
  const appEnginesDir = path.join(tmpRoot, "app-engines");
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.mkdirSync(appEnginesDir, { recursive: true });

  process.env.OMBRA_CACHE_DIR = cacheDir;
  process.env.OMBRA_APP_ENGINES_DIR = appEnginesDir;
  process.env.OMBRA_DOWNLOAD_URL = "off";
  process.env.OMBRA_LOG_LEVEL = "error";

  try {
    return await fn({ tmpRoot, cacheDir, appEnginesDir });
  } finally {
    for (const key of OMBRA_ENV_KEYS) {
      if (saved[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = saved[key];
      }
    }
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

export interface FakeEngineOptions {
  version?: string;
  platform?: string;
  /** Custom Node.js body executed when the fake engine runs without `--version`. */
  scriptBody?: string;
}

/**
 * Create a realistic platform-layout fake Ombra engine binary with `ombra-build.json`.
 */
export function makeFakeEngine(baseDir: string, opts: FakeEngineOptions = {}): string {
  const version = opts.version ?? "151.0.7922.108";
  const cdnPlat =
    opts.platform ??
    (process.platform === "darwin"
      ? process.arch === "arm64"
        ? "darwin-arm64"
        : "darwin-x64"
      : process.platform === "win32"
        ? "windows-x64"
        : "linux-x64");

  let binPath: string;
  let buildJsonPath: string;

  if (process.platform === "darwin") {
    const appDir = path.join(baseDir, "Chromium.app");
    binPath = path.join(appDir, "Contents", "MacOS", "Chromium");
    buildJsonPath = path.join(appDir, "Contents", "Resources", "ombra-build.json");
  } else if (process.platform === "win32") {
    binPath = path.join(baseDir, "chrome.exe");
    buildJsonPath = path.join(baseDir, "ombra-build.json");
  } else {
    binPath = path.join(baseDir, "chrome");
    buildJsonPath = path.join(baseDir, "ombra-build.json");
  }

  fs.mkdirSync(path.dirname(binPath), { recursive: true });
  fs.mkdirSync(path.dirname(buildJsonPath), { recursive: true });
  fs.writeFileSync(
    buildJsonPath,
    JSON.stringify({ version, platform: cdnPlat }, null, 2) + "\n",
    "utf8",
  );

  const defaultBody = `
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const args = process.argv.slice(2);
if (args.includes("--version")) {
  process.stdout.write("Ombra Chromium " + ${JSON.stringify(version)} + "\\n");
  process.exit(0);
}

const uddArg = args.find((a) => a.startsWith("--user-data-dir="));
const userDataDir = uddArg ? uddArg.slice("--user-data-dir=".length) : process.cwd();
fs.writeFileSync(path.join(userDataDir, "spawned-args.json"), JSON.stringify({ args, envKey: process.env.OMBRA_LICENSE_KEY || null }));

const mode = process.env.FAKE_ENGINE_MODE || "ready";
if (mode === "exit_early") {
  process.stderr.write("fatal failure with http://alice:topsecret@proxy.internal:8080 and OMBRA_LICENSE_KEY=" + (process.env.OMBRA_LICENSE_KEY || "none") + "\\n");
  process.exit(1);
}
if (mode === "exit_license_invalid") {
  process.stderr.write("ombra license: invalid\\n");
  process.exit(77);
}
if (mode === "hang_no_port") {
  setInterval(() => {}, 1000);
  return;
}

let pollCount = 0;
const srv = http.createServer((req, res) => {
  if (req.url === "/json/version") {
    pollCount += 1;
    if (mode === "license_no_key") {
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ombra: { license: "no_key" } }));
      return;
    }
    if (mode === "license_no_slot") {
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ombra: { license: "no_slot" } }));
      return;
    }
    if (mode === "warmup_then_ready" && pollCount < 2) {
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ombra: { license: "checking" } }));
      return;
    }
    const addr = srv.address();
    const host = process.env.FAKE_WS_HOST || "127.0.0.1";
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      Browser: "Chrome/" + ${JSON.stringify(version)},
      webSocketDebuggerUrl: "ws://" + host + ":" + addr.port + "/devtools/browser/fake-guid"
    }));
    return;
  }
  res.writeHead(404);
  res.end();
});

srv.listen(0, "127.0.0.1", () => {
  const port = srv.address().port;
  fs.writeFileSync(
    path.join(userDataDir, "DevToolsActivePort"),
    port + "\\n/devtools/browser/fake-guid\\n",
    "utf8"
  );
});

process.on("SIGTERM", () => {
  srv.close(() => process.exit(0));
});
`;

  const script = `#!${process.execPath}\n${opts.scriptBody ?? defaultBody}\n`;
  fs.writeFileSync(binPath, script, { encoding: "utf8", mode: 0o755 });
  if (process.platform !== "win32") {
    fs.chmodSync(binPath, 0o755);
  }
  fs.writeFileSync(path.join(baseDir, "binary.sha256"), createHash("sha256").update(script).digest("hex") + "\n");
  return binPath;
}

export interface ArchiveEntrySpec {
  name: string;
  content?: Buffer | string;
  mode?: number;
  typeFlag?: string;
  linkName?: string;
}

function writeOctalField(buf: Buffer, offset: number, length: number, value: number): void {
  const oct = value.toString(8).padStart(length - 1, "0");
  buf.write(oct, offset, length - 1, "ascii");
  buf[offset + length - 1] = 0;
}

export function buildTarGzBuffer(entries: ArchiveEntrySpec[]): Buffer {
  const blocks: Buffer[] = [];
  for (const entry of entries) {
    const payload =
      entry.content !== undefined
        ? Buffer.isBuffer(entry.content)
          ? entry.content
          : Buffer.from(entry.content, "utf8")
        : Buffer.alloc(0);
    const header = Buffer.alloc(512, 0);
    header.write(entry.name, 0, Math.min(100, Buffer.byteLength(entry.name)), "utf8");
    writeOctalField(header, 100, 8, entry.mode ?? 0o755);
    writeOctalField(header, 108, 8, 0);
    writeOctalField(header, 116, 8, 0);
    writeOctalField(header, 124, 12, payload.length);
    writeOctalField(header, 136, 12, Math.floor(Date.now() / 1000));
    header.fill(0x20, 148, 156); // spaces for checksum calculation
    header[156] = (entry.typeFlag ?? (entry.name.endsWith("/") ? "5" : "0")).charCodeAt(0);
    if (entry.linkName) {
      header.write(entry.linkName, 157, Math.min(100, Buffer.byteLength(entry.linkName)), "utf8");
    }
    header.write("ustar\0", 257, 6, "ascii");
    header.write("00", 263, 2, "ascii");

    let sum = 0;
    for (let i = 0; i < 512; i++) sum += header[i];
    const chk = sum.toString(8).padStart(6, "0");
    header.write(chk, 148, 6, "ascii");
    header[154] = 0;
    header[155] = 0x20;

    blocks.push(header);
    if (payload.length > 0) {
      blocks.push(payload);
      const pad = (512 - (payload.length % 512)) % 512;
      if (pad > 0) blocks.push(Buffer.alloc(pad, 0));
    }
  }
  blocks.push(Buffer.alloc(1024, 0));
  return zlib.gzipSync(Buffer.concat(blocks));
}

export function buildTarXzBuffer(entries: ArchiveEntrySpec[]): Buffer {
  return execFileSync("xz", ["-zc"], { input: zlib.gunzipSync(buildTarGzBuffer(entries)) });
}

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

export function buildZipBuffer(
  entries: Array<{ name: string; content?: Buffer | string; unixMode?: number; compress?: boolean }>,
): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, "utf8");
    const raw =
      entry.content !== undefined
        ? Buffer.isBuffer(entry.content)
          ? entry.content
          : Buffer.from(entry.content, "utf8")
        : Buffer.alloc(0);
    const method = entry.compress !== false && raw.length > 0 ? 8 : 0;
    const comp = method === 8 ? zlib.deflateRawSync(raw) : raw;
    const crc = crc32(raw);

    const loc = Buffer.alloc(30);
    loc.writeUInt32LE(0x04034b50, 0);
    loc.writeUInt16LE(20, 4);
    loc.writeUInt16LE(0, 6);
    loc.writeUInt16LE(method, 8);
    loc.writeUInt16LE(0, 10);
    loc.writeUInt16LE(0, 12);
    loc.writeUInt32LE(crc, 14);
    loc.writeUInt32LE(comp.length, 18);
    loc.writeUInt32LE(raw.length, 22);
    loc.writeUInt16LE(nameBuf.length, 26);
    loc.writeUInt16LE(0, 28);

    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50, 0);
    cen.writeUInt16LE(0x0314, 4); // UNIX
    cen.writeUInt16LE(20, 6);
    cen.writeUInt16LE(0, 8);
    cen.writeUInt16LE(method, 10);
    cen.writeUInt16LE(0, 12);
    cen.writeUInt16LE(0, 14);
    cen.writeUInt32LE(crc, 16);
    cen.writeUInt32LE(comp.length, 20);
    cen.writeUInt32LE(raw.length, 24);
    cen.writeUInt16LE(nameBuf.length, 28);
    cen.writeUInt16LE(0, 30);
    cen.writeUInt16LE(0, 32);
    cen.writeUInt16LE(0, 34);
    cen.writeUInt16LE(0, 36);
    const mode = entry.unixMode ?? 0o100755;
    cen.writeUInt32LE((mode << 16) >>> 0, 38);
    cen.writeUInt32LE(offset, 42);

    localParts.push(loc, nameBuf, comp);
    centralParts.push(cen, nameBuf);
    offset += loc.length + nameBuf.length + comp.length;
  }

  const cdBuf = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cdBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, cdBuf, eocd]);
}

export function createTestSigningKeypair() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const spkiDer = publicKey.export({ format: "der", type: "spki" }) as Buffer;
  const rawPubB64 = spkiDer.subarray(spkiDer.length - 32).toString("base64");

  return {
    rawPubB64,
    signEnvelope(innerObj: Record<string, unknown>): Buffer {
      const signed = JSON.stringify(innerObj);
      const sig = cryptoSign(null, Buffer.from(signed, "utf8"), privateKey).toString("base64");
      return Buffer.from(JSON.stringify({ signed, sig }), "utf8");
    },
    sha256Hex(buf: Buffer): string {
      return createHash("sha256").update(buf).digest("hex");
    },
  };
}

/** Benign signed CDN fixture shared by installer/provenance process tests. */
export async function withSignedEngineServer(
  tmpRoot: string,
  fn: (cdn: {
    signer: ReturnType<typeof createTestSigningKeypair>;
    version: string;
    serial: number;
    archiveRequests: number;
    baseUrl: string;
  }) => Promise<void>,
): Promise<void> {
  const { default: http } = await import("node:http");
  const { BINARY_SIGNING_PUBKEYS, getPlatformInfo } = await import("../dist/esm/config.js");
  const plat = getPlatformInfo();
  const signer = createTestSigningKeypair();
  const originalKeys = [...BINARY_SIGNING_PUBKEYS];
  const cdn = { signer, version: "151.0.7922.108-7", serial: 10, archiveRequests: 0, baseUrl: "" };
  const archives = new Map<string, Buffer>();
  function archive(version: string): Buffer {
    if (!archives.has(version)) {
      const dir = path.join(tmpRoot, `fixture-${version}`);
      makeFakeEngine(dir, { version });
      const files: ArchiveEntrySpec[] = [];
      function collect(root: string, prefix = ""): void {
        for (const ent of fs.readdirSync(root, { withFileTypes: true })) {
          const full = path.join(root, ent.name);
          const name = prefix + ent.name;
          if (ent.isDirectory()) collect(full, name + "/");
          else files.push({ name, content: fs.readFileSync(full), mode: 0o755 });
        }
      }
      collect(dir);
      archives.set(version, plat.system === "Windows" ? buildZipBuffer(files) : plat.system === "Linux" ? buildTarXzBuffer(files) : buildTarGzBuffer(files));
    }
    return archives.get(version)!;
  }
  const server = http.createServer((req, res) => {
    const release = /^\/engine\/releases\/([^/]+)\/release.json$/.exec(req.url ?? "");
    const channel = /^\/engine\/channels\/(stable|beta).json$/.exec(req.url ?? "");
    const version = release?.[1] ?? cdn.version;
    const bytes = archive(version);
    const filename = `ombra-engine-${version}-${plat.cdnName}${plat.archiveExt}`;
    const metadata = { sha256: signer.sha256Hex(bytes), size: bytes.length };
    if (release || channel) {
      res.end(signer.signEnvelope(release
        ? { version, platforms: { [plat.cdnName]: { file: filename, ...metadata } } }
        : { channel: channel![1], serial: cdn.serial, platforms: { [plat.cdnName]: { version, path: `/engine/releases/${version}/${filename}`, ...metadata } } }));
    } else {
      cdn.archiveRequests++;
      setTimeout(() => res.end(bytes), 100);
    }
  });
  BINARY_SIGNING_PUBKEYS.splice(0, BINARY_SIGNING_PUBKEYS.length, signer.rawPubB64);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  cdn.baseUrl = `http://127.0.0.1:${(server.address() as import("node:net").AddressInfo).port}`;
  process.env.OMBRA_DOWNLOAD_URL = cdn.baseUrl;
  try {
    await fn(cdn);
  } finally {
    BINARY_SIGNING_PUBKEYS.splice(0, BINARY_SIGNING_PUBKEYS.length, ...originalKeys);
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}
