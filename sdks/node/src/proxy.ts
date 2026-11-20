/**
 * Proxy parsing, normalization, and loopback SOCKS5 relay for authenticated proxies
 * (SDK contract §8 & SI-06).
 */

import net from "node:net";
import tls from "node:tls";
import { InvalidOptionError, ProxyError } from "./errors.js";
import type { ProxyInput } from "./types.js";

const HANDSHAKE_TIMEOUT_MS = 15_000;
const ALLOWED_PROXY_KEYS = new Set(["type", "host", "port", "username", "password", "server", "bypass"]);
const ALLOWED_SCHEMES = new Set(["http", "https", "socks5", "socks5h"]);
const LOOPBACK_PEERS = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

export interface NormalizedProxy {
  readonly scheme: "http" | "https" | "socks5" | "socks5h";
  readonly host: string;
  readonly port: number;
  readonly username?: string;
  readonly password?: string;
  readonly bypass?: string;
  readonly hasCredentials: boolean;
  readonly serverUrl: string;
  upstreamUrlForGeoip(): string;
  secrets(): string[];
}

function makeNormalizedProxy(params: {
  scheme: "http" | "https" | "socks5" | "socks5h";
  host: string;
  port: number;
  username?: string;
  password?: string;
  bypass?: string;
}): NormalizedProxy {
  const scheme = params.scheme === "socks5h" ? "socks5" : params.scheme;
  const hostFmt = params.host.includes(":") && !params.host.startsWith("[") ? `[${params.host}]` : params.host;
  const hasCredentials = params.username !== undefined || params.password !== undefined;
  const serverUrl = `${scheme}://${hostFmt}:${params.port}`;

  return {
    scheme,
    host: params.host.replace(/^\[|\]$/g, ""),
    port: params.port,
    username: params.username,
    password: params.password,
    bypass: params.bypass,
    hasCredentials,
    serverUrl,
    upstreamUrlForGeoip(): string {
      if (!hasCredentials) return serverUrl;
      const user = encodeURIComponent(params.username ?? "");
      const auth =
        params.password !== undefined ? `${user}:${encodeURIComponent(params.password)}@` : `${user}@`;
      return `${scheme}://${auth}${hostFmt}:${params.port}`;
    },
    secrets(): string[] {
      const out: string[] = [];
      if (params.username) out.push(params.username);
      if (params.password) out.push(params.password);
      return out;
    },
  };
}

function lenientDecode(text: string): string {
  return text.replace(/(?:%[0-9A-Fa-f]{2})+/g, (encoded) =>
    Buffer.from(encoded.replace(/%/g, ""), "hex").toString("utf8"),
  );
}

function parseProxyString(raw: string): NormalizedProxy {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new InvalidOptionError("proxy string cannot be empty.");
  }
  const withScheme = trimmed.includes("://") ? trimmed : `http://${trimmed}`;
  const m = /^([a-zA-Z][a-zA-Z0-9+.-]*):\/\/(.*)$/.exec(withScheme);
  if (!m) {
    throw new ProxyError("Invalid proxy URL.");
  }
  const schemeLower = m[1].toLowerCase();
  if (!ALLOWED_SCHEMES.has(schemeLower)) {
    throw new InvalidOptionError(
      `Unsupported proxy scheme '${schemeLower}'; expected http, https, or socks5.`,
    );
  }
  const rest = m[2];
  const slashIdx = rest.search(/[/?#]/);
  const authority = slashIdx === -1 ? rest : rest.slice(0, slashIdx);
  const atIdx = authority.lastIndexOf("@");

  let username: string | undefined;
  let password: string | undefined;
  const hostPort = atIdx === -1 ? authority : authority.slice(atIdx + 1);

  if (atIdx !== -1) {
    const userinfo = authority.slice(0, atIdx);
    const colonIdx = userinfo.indexOf(":");
    if (colonIdx === -1) {
      username = lenientDecode(userinfo);
    } else {
      username = lenientDecode(userinfo.slice(0, colonIdx));
      password = lenientDecode(userinfo.slice(colonIdx + 1));
    }
  }

  let host: string;
  let portStr: string;
  if (hostPort.startsWith("[")) {
    const closeBracket = hostPort.indexOf("]");
    if (closeBracket === -1 || hostPort[closeBracket + 1] !== ":") {
      throw new ProxyError("Proxy URL must include a valid host and port (1..65535).");
    }
    host = hostPort.slice(1, closeBracket);
    portStr = hostPort.slice(closeBracket + 2);
  } else {
    const colon = hostPort.lastIndexOf(":");
    if (colon === -1) {
      throw new ProxyError("Proxy URL must include a valid host and port (1..65535).");
    }
    host = hostPort.slice(0, colon);
    portStr = hostPort.slice(colon + 1);
  }

  if (!host || !/^\d+$/.test(portStr)) {
    throw new ProxyError("Proxy URL must include a valid host and port (1..65535).");
  }
  const port = Number.parseInt(portStr, 10);
  if (port < 1 || port > 65535) {
    throw new ProxyError("Proxy URL port must be between 1 and 65535.");
  }

  if (schemeLower === "socks5" || schemeLower === "socks5h") {
    if (username && Buffer.byteLength(username, "utf8") > 255) {
      throw new ProxyError("SOCKS5 proxy username exceeds 255 bytes.");
    }
    if (password && Buffer.byteLength(password, "utf8") > 255) {
      throw new ProxyError("SOCKS5 proxy password exceeds 255 bytes.");
    }
  }

  return makeNormalizedProxy({
    scheme: schemeLower as NormalizedProxy["scheme"],
    host,
    port,
    username,
    password,
  });
}

export function parseProxy(proxy: ProxyInput | undefined | null): NormalizedProxy | null {
  if (proxy === undefined || proxy === null) return null;
  if (typeof proxy === "string") return parseProxyString(proxy);
  if (typeof proxy !== "object" || Array.isArray(proxy)) {
    throw new InvalidOptionError(`proxy must be a string or object, got ${typeof proxy}.`);
  }

  const raw = proxy as unknown as Record<string, unknown>;
  const unknown = Object.keys(raw).filter((k) => !ALLOWED_PROXY_KEYS.has(k));
  if (unknown.length > 0) {
    throw new InvalidOptionError(`Unknown proxy option(s): ${unknown.sort().join(", ")}.`, {
      details: { unknownKeys: unknown.sort() },
    });
  }

  const bypass = raw.bypass;
  if (bypass !== undefined && typeof bypass !== "string") {
    throw new InvalidOptionError("proxy.bypass must be a string.");
  }

  let base: NormalizedProxy;
  let username: string | undefined;
  let password: string | undefined;

  if ("server" in raw && raw.server !== undefined) {
    if ("type" in raw || "host" in raw || "port" in raw) {
      throw new InvalidOptionError(
        "proxy cannot combine Playwright 'server' with contract 'type'/'host'/'port'.",
      );
    }
    if (typeof raw.server !== "string" || !raw.server.trim()) {
      throw new InvalidOptionError("proxy.server must be a non-empty string.");
    }
    base = parseProxyString(raw.server);
    username = raw.username !== undefined ? (raw.username as string) : base.username;
    password = raw.password !== undefined ? (raw.password as string) : base.password;
  } else {
    for (const req of ["type", "host", "port"]) {
      if (!(req in raw) || raw[req] === undefined) {
        throw new InvalidOptionError(`proxy object is missing required field '${req}'.`);
      }
    }
    const schemeRaw = raw.type;
    if (
      typeof schemeRaw !== "string" ||
      !["http", "https", "socks5"].includes(schemeRaw.toLowerCase())
    ) {
      throw new InvalidOptionError(
        `proxy.type must be 'http', 'https', or 'socks5', got '${String(schemeRaw)}'.`,
      );
    }
    if (typeof raw.host !== "string" || !raw.host.trim()) {
      throw new InvalidOptionError("proxy.host must be a non-empty string.");
    }
    if (typeof raw.port !== "number" || !Number.isInteger(raw.port) || raw.port < 1 || raw.port > 65535) {
      throw new InvalidOptionError("proxy.port must be an integer between 1 and 65535.");
    }
    base = makeNormalizedProxy({
      scheme: schemeRaw.toLowerCase() as "http" | "https" | "socks5",
      host: raw.host.trim(),
      port: raw.port,
    });
    username = raw.username as string | undefined;
    password = raw.password as string | undefined;
  }

  if (username !== undefined && typeof username !== "string") {
    throw new InvalidOptionError("proxy.username must be a string.");
  }
  if (password !== undefined && typeof password !== "string") {
    throw new InvalidOptionError("proxy.password must be a string.");
  }
  if (base.scheme === "socks5" || base.scheme === "socks5h") {
    if (username && Buffer.byteLength(username, "utf8") > 255) {
      throw new ProxyError("SOCKS5 proxy username exceeds 255 bytes.");
    }
    if (password && Buffer.byteLength(password, "utf8") > 255) {
      throw new ProxyError("SOCKS5 proxy password exceeds 255 bytes.");
    }
  }

  return makeNormalizedProxy({
    scheme: base.scheme,
    host: base.host,
    port: base.port,
    username,
    password,
    bypass: bypass as string | undefined,
  });
}

class SocketReader {
  private buf: Buffer = Buffer.alloc(0);
  private ended = false;
  private err: Error | null = null;
  private waiters: Array<() => void> = [];

  private readonly onData = (chunk: Buffer): void => {
    this.buf = this.buf.length === 0 ? chunk : Buffer.concat([this.buf, chunk]);
    this.flush();
  };
  private readonly onEnd = (): void => {
    this.ended = true;
    this.flush();
  };
  private readonly onError = (err: Error): void => {
    this.err = err;
    this.onEnd();
  };

  constructor(private readonly sock: net.Socket) {
    sock.on("data", this.onData);
    sock.on("end", this.onEnd);
    sock.on("close", this.onEnd);
    sock.on("error", this.onError);
  }

  private flush(): void {
    const list = this.waiters.splice(0, this.waiters.length);
    for (const fn of list) fn();
  }

  private waitForMore(): Promise<void> {
    if (this.err) return Promise.reject(this.err);
    if (this.ended) return Promise.reject(new Error("Unexpected EOF"));
    return new Promise<void>((resolve) => {
      this.waiters.push(resolve);
    });
  }

  async readExactly(n: number): Promise<Buffer> {
    while (this.buf.length < n) {
      await this.waitForMore();
    }
    const out = this.buf.subarray(0, n);
    this.buf = this.buf.subarray(n);
    return out;
  }

  async readUntil(delim: Buffer, maxBytes = 32 * 1024): Promise<Buffer> {
    while (true) {
      const idx = this.buf.indexOf(delim);
      if (idx !== -1) {
        const end = idx + delim.length;
        const out = this.buf.subarray(0, end);
        this.buf = this.buf.subarray(end);
        return out;
      }
      if (this.buf.length > maxBytes) {
        throw new Error("Header limit exceeded");
      }
      await this.waitForMore();
    }
  }

  drainRemaining(): Buffer {
    const rem = this.buf;
    this.buf = Buffer.alloc(0);
    return rem;
  }

  detachListeners(): void {
    this.sock.removeListener("data", this.onData);
    this.sock.removeListener("end", this.onEnd);
    this.sock.removeListener("close", this.onEnd);
    this.sock.removeListener("error", this.onError);
  }
}

export class LoopbackProxyRelay {
  private server: net.Server | null = null;
  private readonly activeSockets = new Set<net.Socket>();
  private readonly userBytes: Buffer;
  private readonly passBytes: Buffer;
  private readonly basicAuth: string;
  private relayUrl: string | null = null;
  public handshakeTimeoutMs = HANDSHAKE_TIMEOUT_MS;

  constructor(private readonly upstream: NormalizedProxy) {
    this.userBytes = Buffer.from(upstream.username ?? "", "utf8");
    this.passBytes = Buffer.from(upstream.password ?? "", "utf8");
    this.basicAuth = Buffer.concat([this.userBytes, Buffer.from(":"), this.passBytes]).toString(
      "base64",
    );
  }

  get url(): string {
    if (!this.relayUrl) {
      throw new ProxyError("Loopback proxy relay has not started.");
    }
    return this.relayUrl;
  }

  async start(): Promise<string> {
    if (this.relayUrl) return this.relayUrl;

    const srv = net.createServer((clientSock) => {
      void this.handleClient(clientSock);
    });
    srv.unref();

    try {
      await new Promise<void>((resolve, reject) => {
        srv.once("error", reject);
        srv.listen(0, "127.0.0.1", () => {
          srv.removeListener("error", reject);
          resolve();
        });
      });
    } catch (err) {
      throw new ProxyError("Failed to start loopback proxy relay.", {
        secrets: this.upstream.secrets(),
        cause: err,
      });
    }

    const addr = srv.address();
    if (!addr || typeof addr === "string") {
      srv.close();
      throw new ProxyError("Failed to resolve loopback proxy relay port.");
    }
    this.server = srv;
    this.relayUrl = `socks5://127.0.0.1:${addr.port}`;
    return this.relayUrl;
  }

  async stop(): Promise<void> {
    for (const sock of this.activeSockets) {
      sock.destroy();
    }
    this.activeSockets.clear();
    const srv = this.server;
    this.server = null;
    this.relayUrl = null;
    if (srv) {
      await new Promise<void>((resolve) => {
        srv.close(() => resolve());
      });
    }
  }

  private trackSocket(sock: net.Socket): void {
    this.activeSockets.add(sock);
    sock.once("close", () => {
      this.activeSockets.delete(sock);
    });
  }

  private connectUpstream(ownSocket: (sock: net.Socket) => void): Promise<net.Socket> {
    return new Promise<net.Socket>((resolve, reject) => {
      const sock =
        this.upstream.scheme === "https"
          ? tls.connect({
              host: this.upstream.host,
              port: this.upstream.port,
              servername: this.upstream.host,
            })
          : net.connect({
              host: this.upstream.host,
              port: this.upstream.port,
            });
      const readyEvent = this.upstream.scheme === "https" ? "secureConnect" : "connect";
      const cleanup = () => {
        sock.removeListener("error", onError);
        sock.removeListener("close", onClose);
        sock.removeListener(readyEvent, onReady);
      };
      const onError = (err: Error) => {
        cleanup();
        sock.destroy();
        reject(err);
      };
      const onClose = () => {
        cleanup();
        reject(new Error("Upstream connection closed"));
      };
      const onReady = () => {
        cleanup();
        resolve(sock);
      };
      sock.once("error", onError);
      sock.once("close", onClose);
      sock.once(readyEvent, onReady);
      this.trackSocket(sock);
      ownSocket(sock);
    });
  }

  private async handleClient(clientSock: net.Socket): Promise<void> {
    this.trackSocket(clientSock);
    clientSock.on("error", () => {});

    if (clientSock.remoteAddress && !LOOPBACK_PEERS.has(clientSock.remoteAddress)) {
      clientSock.destroy();
      return;
    }

    let upSock: net.Socket | null = null;
    const readers: SocketReader[] = [];
    const destroySockets = () => {
      clientSock.destroy();
      upSock?.destroy();
    };
    clientSock.once("close", destroySockets);
    const timer = setTimeout(destroySockets, this.handshakeTimeoutMs);
    try {
      const result = await this.performHandshake(clientSock, (sock) => {
        upSock = sock;
        sock.on("error", destroySockets);
        sock.once("close", () => {
          if (!sock.readableEnded) destroySockets();
        });
        if (clientSock.destroyed) sock.destroy();
      }, readers);
      upSock = result.upSock;
      if (!result.ok || !upSock) {
        destroySockets();
        return;
      }

      const clientLeftover = result.clientReader.drainRemaining();
      const upLeftover = result.upReader.drainRemaining();
      result.clientReader.detachListeners();
      result.upReader.detachListeners();

      if (clientLeftover.length > 0) upSock.write(clientLeftover);
      if (upLeftover.length > 0) clientSock.write(upLeftover);

      clientSock.pipe(upSock);
      upSock.pipe(clientSock);
    } catch {
      destroySockets();
    } finally {
      clearTimeout(timer);
      for (const reader of readers) reader.detachListeners();
    }
  }

  private async performHandshake(
    clientSock: net.Socket,
    ownUpstream: (sock: net.Socket) => void,
    readers: SocketReader[],
  ): Promise<{
    ok: boolean;
    upSock: net.Socket | null;
    clientReader: SocketReader;
    upReader: SocketReader;
  }> {
    const clientReader = new SocketReader(clientSock);
    readers.push(clientReader);
    const greet = await clientReader.readExactly(2);
    await clientReader.readExactly(greet[1]);
    clientSock.write(Buffer.from([0x05, 0x00]));

    const reqHdr = await clientReader.readExactly(4);
    const cmd = reqHdr[1];
    const atyp = reqHdr[3];

    let host: string;
    let rawAddrPayload: Buffer;
    if (atyp === 1) {
      const ip4 = await clientReader.readExactly(4);
      rawAddrPayload = ip4;
      host = `${ip4[0]}.${ip4[1]}.${ip4[2]}.${ip4[3]}`;
    } else if (atyp === 3) {
      const lenBuf = await clientReader.readExactly(1);
      const domainBuf = await clientReader.readExactly(lenBuf[0]);
      rawAddrPayload = Buffer.concat([lenBuf, domainBuf]);
      host = domainBuf.toString("utf8");
    } else if (atyp === 4) {
      const ip6 = await clientReader.readExactly(16);
      rawAddrPayload = ip6;
      const groups: string[] = [];
      for (let i = 0; i < 16; i += 2) {
        groups.push(ip6.readUInt16BE(i).toString(16));
      }
      host = `[${groups.join(":")}]`;
    } else {
      clientSock.write(Buffer.from([0x05, 0x08, 0x00, 0x01, 0, 0, 0, 0, 0, 0]));
      return { ok: false, upSock: null, clientReader, upReader: clientReader };
    }

    const portBuf = await clientReader.readExactly(2);
    const port = portBuf.readUInt16BE(0);

    if (cmd !== 1) {
      clientSock.write(Buffer.from([0x05, 0x07, 0x00, 0x01, 0, 0, 0, 0, 0, 0]));
      return { ok: false, upSock: null, clientReader, upReader: clientReader };
    }

    const upSock = await this.connectUpstream(ownUpstream);
    const upReader = new SocketReader(upSock);
    readers.push(upReader);

    let ok = false;
    if (this.upstream.scheme === "socks5" || this.upstream.scheme === "socks5h") {
      const method = this.upstream.hasCredentials ? 0x02 : 0x00;
      upSock.write(Buffer.from([0x05, 0x01, method]));
      const chosen = await upReader.readExactly(2);
      if (chosen[0] === 0x05 && chosen[1] === method) {
        let authOk = true;
        if (method === 0x02) {
          const authPkt = Buffer.concat([
            Buffer.from([0x01, this.userBytes.length]),
            this.userBytes,
            Buffer.from([this.passBytes.length]),
            this.passBytes,
          ]);
          upSock.write(authPkt);
          const authRes = await upReader.readExactly(2);
          authOk = authRes[0] === 0x01 && authRes[1] === 0x00;
        }
        if (authOk) {
          upSock.write(
            Buffer.concat([Buffer.from([0x05, 0x01, 0x00, atyp]), rawAddrPayload, portBuf]),
          );
          const repHdr = await upReader.readExactly(4);
          const bAtyp = repHdr[3];
          if (bAtyp === 1) await upReader.readExactly(4);
          else if (bAtyp === 4) await upReader.readExactly(16);
          else if (bAtyp === 3) {
            const bLen = (await upReader.readExactly(1))[0];
            await upReader.readExactly(bLen);
          }
          await upReader.readExactly(2);
          ok = repHdr[1] === 0x00;
        }
      }
    } else {
      const authHeader = this.upstream.hasCredentials
        ? `Proxy-Authorization: Basic ${this.basicAuth}\r\n`
        : "";
      const connectReq = `CONNECT ${host}:${port} HTTP/1.1\r\nHost: ${host}:${port}\r\n${authHeader}\r\n`;
      upSock.write(connectReq, "ascii");
      const head = await upReader.readUntil(Buffer.from("\r\n\r\n"));
      const firstLine = head.subarray(0, head.indexOf("\r\n")).toString("ascii");
      const parts = firstLine.split(" ");
      ok = parts.length >= 2 && parts[1] === "200";
    }

    clientSock.write(Buffer.from([0x05, ok ? 0x00 : 0x05, 0x00, 0x01, 0, 0, 0, 0, 0, 0]));
    return { ok, upSock, clientReader, upReader };
  }
}

export async function prepareProxy(
  proxy: NormalizedProxy | null,
): Promise<{ proxyArgs: string[]; relay: LoopbackProxyRelay | null }> {
  if (!proxy) {
    return { proxyArgs: [], relay: null };
  }
  let relay: LoopbackProxyRelay | null = null;
  const proxyArgs: string[] = [];
  if (proxy.hasCredentials) {
    relay = new LoopbackProxyRelay(proxy);
    const relayUrl = await relay.start();
    proxyArgs.push(`--proxy-server=${relayUrl}`);
  } else {
    proxyArgs.push(`--proxy-server=${proxy.serverUrl}`);
  }
  if (proxy.bypass) {
    proxyArgs.push(`--proxy-bypass-list=${proxy.bypass}`);
  }
  return { proxyArgs, relay };
}
