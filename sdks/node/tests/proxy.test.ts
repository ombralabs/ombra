import assert from "node:assert/strict";
import net from "node:net";
import { describe, it } from "node:test";
import { InvalidOptionError, ProxyError } from "../dist/esm/index.js";
import { LoopbackProxyRelay, parseProxy, prepareProxy } from "../dist/esm/proxy.js";

function socks5HandshakeAndEcho(relayPort: number, targetHost: string, targetPort: number, payload: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const sock = net.connect(relayPort, "127.0.0.1");
    sock.on("error", reject);
    sock.once("connect", () => {
      sock.write(Buffer.from([0x05, 0x01, 0x00]));
      sock.once("data", (greet) => {
        assert.deepEqual(greet, Buffer.from([0x05, 0x00]));
        const hostBuf = Buffer.from(targetHost, "utf8");
        const portBuf = Buffer.alloc(2);
        portBuf.writeUInt16BE(targetPort, 0);
        sock.write(
          Buffer.concat([Buffer.from([0x05, 0x01, 0x00, 0x03, hostBuf.length]), hostBuf, portBuf]),
        );
        sock.once("data", (rep) => {
          if (rep[1] !== 0x00) {
            sock.destroy();
            reject(new Error(`SOCKS5 connect failed with code ${rep[1]}`));
            return;
          }
          sock.write(payload, "utf8");
          sock.once("data", (echoed) => {
            sock.end();
            resolve(echoed.toString("utf8"));
          });
        });
      });
    });
  });
}

describe("proxy credential and transport regressions", () => {
  it("round-trips percent-encoded UTF-8 and preserves empty credential components", () => {
    const cases = [
      { auth: "%D0%BF%D0%BE%D0%BB%D1%8C%D0%B7:%E5%AF%86%E7%A0%81%F0%9F%94%91", user: "польз", pass: "密码🔑" },
      { auth: "", user: "", pass: undefined },
      { auth: ":", user: "", pass: "" },
      { auth: ":secret", user: "", pass: "secret" },
      { auth: "user:", user: "user", pass: "" },
    ];
    for (const { auth, user, pass } of cases) {
      const proxy = parseProxy(`socks5://${auth}@localhost:1080`)!;
      assert.equal(proxy.username, user);
      assert.equal(proxy.password, pass);
      assert.equal(proxy.hasCredentials, true);
      const roundTrip = parseProxy(proxy.upstreamUrlForGeoip())!;
      assert.equal(roundTrip.username, user);
      assert.equal(roundTrip.password, pass);
    }
  });

  it("normalizes socks5h in browser arguments and relay configuration", async () => {
    const direct = parseProxy("socks5h://localhost:1080")!;
    assert.equal(direct.scheme, "socks5");
    assert.equal(direct.upstreamUrlForGeoip(), "socks5://localhost:1080");
    assert.deepEqual((await prepareProxy(direct)).proxyArgs, ["--proxy-server=socks5://localhost:1080"]);
    const authenticated = parseProxy({ server: "socks5h://user:pass@localhost:1080" })!;
    assert.equal(authenticated.scheme, "socks5");
    const prepared = await prepareProxy(authenticated);
    try {
      assert.match(prepared.proxyArgs[0], /^--proxy-server=socks5:\/\/127\.0\.0\.1:/);
    } finally {
      await prepared.relay!.stop();
    }
  });

  for (const scheme of ["http", "https"] as const) {
    it(`closes repeated ${scheme} upstream handshake stalls before relay.stop`, { timeout: 5000 }, async () => {
      const pending = new Set<net.Socket>();
      let accepted = 0;
      const upstream = net.createServer((socket) => {
        accepted++;
        pending.add(socket);
        socket.on("error", () => {});
        socket.on("close", () => pending.delete(socket));
        socket.resume(); // Accept TCP/TLS bytes, but never answer the upstream handshake.
      });
      await new Promise<void>((resolve) => upstream.listen(0, "127.0.0.1", resolve));
      const port = (upstream.address() as net.AddressInfo).port;
      const relay = new LoopbackProxyRelay(parseProxy(`${scheme}://user:pass@localhost:${port}`)!);
      relay.handshakeTimeoutMs = 100;
      await relay.start();
      const clients: net.Socket[] = [];
      try {
        for (let attempt = 0; attempt < 3; attempt++) {
          const client = net.connect(Number(new URL(relay.url).port), "127.0.0.1");
          clients.push(client);
          client.on("error", () => {});
          const closed = new Promise<void>((resolve) => client.once("close", () => resolve()));
          client.once("connect", () => client.write(Buffer.from([5, 1, 0])));
          client.once("data", () => client.write(Buffer.from([5, 1, 0, 1, 127, 0, 0, 1, 0, 80])));
          await closed;
          const deadline = Date.now() + 500;
          while (pending.size && Date.now() < deadline) {
            await new Promise((resolve) => setTimeout(resolve, 5));
          }
          assert.equal(accepted, attempt + 1, "real upstream connection must be exercised");
          assert.equal(pending.size, 0, "timed-out upstream must close without stopping relay");
        }
      } finally {
        clients.forEach((socket) => socket.destroy());
        await relay.stop();
        pending.forEach((socket) => socket.destroy());
        await new Promise<void>((resolve) => upstream.close(() => resolve()));
      }
    });
  }
});

describe("proxy parsing and LoopbackProxyRelay", () => {
  it("parses string, contract object, and Playwright proxy formats", () => {
    const p1 = parseProxy("proxy.example.com:8080")!;
    assert.equal(p1.scheme, "http");
    assert.equal(p1.serverUrl, "http://proxy.example.com:8080");
    assert.equal(p1.hasCredentials, false);

    const p2 = parseProxy("socks5://user%40corp:pa%3Ass@[::1]:1080")!;
    assert.equal(p2.scheme, "socks5");
    assert.equal(p2.host, "::1");
    assert.equal(p2.port, 1080);
    assert.equal(p2.username, "user@corp");
    assert.equal(p2.password, "pa:ss");
    assert.equal(p2.hasCredentials, true);

    const p3 = parseProxy({
      type: "https",
      host: "gw.proxy.io",
      port: 8443,
      username: "u1",
      password: "p1",
      bypass: "*.local",
    })!;
    assert.equal(p3.serverUrl, "https://gw.proxy.io:8443");
    assert.equal(p3.bypass, "*.local");

    const p4 = parseProxy({
      server: "http://127.0.0.1:3128",
      username: "pwuser",
      password: "pwpass",
    })!;
    assert.equal(p4.hasCredentials, true);
    assert.equal(p4.username, "pwuser");

    assert.throws(() => parseProxy("ftp://1.2.3.4:21"), InvalidOptionError);
    assert.throws(() => parseProxy("socks5://" + "u".repeat(260) + ":p@127.0.0.1:1080"), ProxyError);
  });

  it("passes unauthenticated proxies directly without starting a relay", async () => {
    const parsed = parseProxy({ type: "http", host: "127.0.0.1", port: 8080, bypass: "localhost" });
    const { proxyArgs, relay } = await prepareProxy(parsed);
    assert.equal(relay, null);
    assert.deepEqual(proxyArgs, [
      "--proxy-server=http://127.0.0.1:8080",
      "--proxy-bypass-list=localhost",
    ]);
  });

  it("tunnels through an authenticated upstream HTTP CONNECT proxy without leaking credentials", async () => {
    // Start a local echo TCP server (destination)
    const echoServer = net.createServer((sock) => {
      sock.on("data", (d) => sock.write(Buffer.concat([Buffer.from("HTTP-OK:"), d])));
    });
    await new Promise<void>((r) => echoServer.listen(0, "127.0.0.1", () => r()));
    const echoPort = (echoServer.address() as any).port;

    let receivedAuth = "";
    const upstreamHttpProxy = net.createServer((sock) => {
      let head = "";
      const onData = (chunk: Buffer) => {
        head += chunk.toString("ascii");
        if (!head.includes("\r\n\r\n")) return;
        sock.removeListener("data", onData);
        const authLine = head
          .split("\r\n")
          .find((l) => l.toLowerCase().startsWith("proxy-authorization:"));
        receivedAuth = authLine ?? "";
        const target = net.connect(echoPort, "127.0.0.1", () => {
          sock.write("HTTP/1.1 200 Connection Established\r\n\r\n");
          sock.pipe(target);
          target.pipe(sock);
        });
      };
      sock.on("data", onData);
    });
    await new Promise<void>((r) => upstreamHttpProxy.listen(0, "127.0.0.1", () => r()));
    const proxyPort = (upstreamHttpProxy.address() as any).port;

    const parsed = parseProxy(`http://%D0%BF%D0%BE%D0%BB%D1%8C%D0%B7:%E5%AF%86%E7%A0%81%F0%9F%94%91@127.0.0.1:${proxyPort}`)!;
    const { proxyArgs, relay } = await prepareProxy(parsed);
    assert.ok(relay);
    assert.ok(proxyArgs[0].startsWith("--proxy-server=socks5://127.0.0.1:"));
    assert.ok(!proxyArgs[0].includes("польз"));
    assert.ok(!proxyArgs[0].includes("密码🔑"));

    try {
      const relayPort = Number.parseInt(relay.url.split(":").pop()!, 10);
      const reply = await socks5HandshakeAndEcho(relayPort, "127.0.0.1", echoPort, "ping");
      assert.equal(reply, "HTTP-OK:ping");
      const expectedB64 = Buffer.from("польз:密码🔑").toString("base64");
      assert.equal(receivedAuth, `Proxy-Authorization: Basic ${expectedB64}`);
    } finally {
      await relay.stop();
      await new Promise<void>((r) => upstreamHttpProxy.close(() => r()));
      await new Promise<void>((r) => echoServer.close(() => r()));
    }
  });

  it("tunnels through an authenticated upstream SOCKS5 (RFC 1929) proxy and enforces handshake timeout", async () => {
    const echoServer = net.createServer((sock) => {
      sock.on("data", (d) => sock.write(Buffer.concat([Buffer.from("SOCKS5-OK:"), d])));
    });
    await new Promise<void>((r) => echoServer.listen(0, "127.0.0.1", () => r()));
    const echoPort = (echoServer.address() as any).port;

    let seenCreds = "";
    const upstreamSocks = net.createServer((sock) => {
      sock.once("data", (greet) => {
        assert.equal(greet[0], 0x05);
        assert.equal(greet[2], 0x02); // username/password method
        sock.write(Buffer.from([0x05, 0x02]));
        sock.once("data", (auth) => {
          const uLen = auth[1];
          const user = auth.subarray(2, 2 + uLen).toString("utf8");
          const pLen = auth[2 + uLen];
          const pass = auth.subarray(3 + uLen, 3 + uLen + pLen).toString("utf8");
          seenCreds = `${user}:${pass}`;
          sock.write(Buffer.from([0x01, 0x00]));
          sock.once("data", () => {
            const target = net.connect(echoPort, "127.0.0.1", () => {
              sock.write(Buffer.from([0x05, 0x00, 0x00, 0x01, 127, 0, 0, 1, 0, 0]));
              sock.pipe(target);
              target.pipe(sock);
            });
          });
        });
      });
    });
    await new Promise<void>((r) => upstreamSocks.listen(0, "127.0.0.1", () => r()));
    const socksPort = (upstreamSocks.address() as any).port;

    const relay = new LoopbackProxyRelay(parseProxy(`socks5h://%D0%BF%D0%BE%D0%BB%D1%8C%D0%B7:%E5%AF%86%E7%A0%81%F0%9F%94%91@127.0.0.1:${socksPort}`)!);
    await relay.start();

    try {
      const relayPort = Number.parseInt(relay.url.split(":").pop()!, 10);
      const reply = await socks5HandshakeAndEcho(relayPort, "127.0.0.1", echoPort, "hello");
      assert.equal(reply, "SOCKS5-OK:hello");
      assert.equal(seenCreds, "польз:密码🔑");

      // Handshake timeout closes stalled client socket cleanly
      relay.handshakeTimeoutMs = 80;
      const stalledClosed = await new Promise<boolean>((resolve) => {
        const s = net.connect(relayPort, "127.0.0.1");
        s.once("close", () => resolve(true));
      });
      assert.equal(stalledClosed, true);
    } finally {
      await relay.stop();
      await new Promise<void>((r) => upstreamSocks.close(() => r()));
      await new Promise<void>((r) => echoServer.close(() => r()));
    }
  });
});
