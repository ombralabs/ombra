import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { inspect } from "node:util";
import { CDPConnectError, ProxyError, redactSecrets } from "../dist/esm/index.js";

function assertSafe(error: Error, secrets: string[]): void {
  const outputs = [error.message, error.stack ?? "", inspect(error, { depth: null }), JSON.stringify(error), JSON.stringify(error, Object.getOwnPropertyNames(error))];
  for (const output of outputs) {
    for (const secret of secrets) assert.ok(!output.includes(secret), `exposed fake credential ${secret}`);
  }
}

describe("credential-safe public errors", () => {
  it("redacts URL auth including either empty component without losing host context", () => {
    for (const [url, secrets] of [
      ["http://fake-user:fake-password@proxy.invalid:8080", ["fake-user", "fake-password"]],
      ["http://:fake-empty-user-password@proxy.invalid:8080", ["fake-empty-user-password"]],
      ["socks5://fake-empty-password-user:@proxy.invalid:8080", ["fake-empty-password-user"]],
      ["http://fake-user-only@proxy.invalid:8080", ["fake-user-only"]],
      ["http://:@proxy.invalid:8080", []],
      ["http://fake%40user:fake%3Apassword@proxy.invalid:8080", ["fake%40user", "fake%3Apassword"]],
      ["http://fake-user:fake@password-tail@proxy.invalid:8080", ["fake-user", "fake", "password-tail"]],
    ] as const) {
      const error = new ProxyError(`Cannot connect to ${url}`, { details: { endpoint: url }, cause: new Error(url) });
      assertSafe(error, [...secrets]);
      assert.ok(error.message.includes("proxy.invalid:8080"));
      assert.equal(error.kind, "ProxyError");
      assert.ok(error instanceof ProxyError);
    }
  });

  it("redacts Basic, Bearer and License header values and explicit credential detail fields", () => {
    const secrets = ["ZmFrZTpmYWtl", "fake-bearer", "fake-license", "fake-password", "fake-username", "fake-api-key", "fake-refresh-token", "fake-cookie"];
    const error = new ProxyError("Authorization: Basic ZmFrZTpmYWtl Authorization: Bearer fake-bearer Authorization: License fake-license", {
      details: { password: secrets[3], username: secrets[4], nested: [{ api_key: secrets[5], refreshToken: secrets[6], Cookie: secrets[7] }], Authorization: secrets[1] },
    });
    assertSafe(error, secrets);
    assert.equal(error.details.password, "***");
    assert.equal(redactSecrets("key=xy", ["xy"]), "key=***");
  });

  it("sanitizes nested Error causes, stacks and custom fields without retaining originals", () => {
    const inner = new Error("Authorization: Basic ZmFrZTpzZWNyZXQ=");
    const outer = Object.assign(new Error("http://:fake-cause-password@proxy.invalid:8000", { cause: inner }), { password: "fake-custom-password" });
    const error = new ProxyError("Connection failed", { cause: outer, details: { failures: [outer] } });
    assertSafe(error, ["ZmFrZTpzZWNyZXQ=", "fake-cause-password", "fake-custom-password"]);
    assert.notEqual(error.cause, outer);
    assert.ok(inspect(error, { depth: null }).includes("proxy.invalid:8000"));
    assert.equal(outer.message, "http://:fake-cause-password@proxy.invalid:8000");
  });

  it("handles recursive objects, arrays and error causes in inspect and JSON", () => {
    const details: Record<string, unknown> = { token: "fake-cycle-token", context: "retry download" };
    details.self = details;
    details.items = [details];
    const cause = new Error("Authorization: Bearer fake-cycle-bearer");
    cause.cause = cause;
    const error = new ProxyError("Connection failed", { details, cause });
    assertSafe(error, ["fake-cycle-token", "fake-cycle-bearer"]);
    assert.equal(error.details.context, "retry download");
    assert.ok(JSON.stringify(error).includes("Circular"));
  });

  it("snapshots array subclasses without inherited inspection or serialization hooks", () => {
    class DiagnosticList extends Array<unknown> {
      [inspect.custom](): string { return "fake-subclass-inspect-token"; }
      toJSON(): string { return "fake-subclass-json-token"; }
    }
    const items = new DiagnosticList({ password: "fake-item-password", context: "retry" });
    items.push(items);
    for (const options of [
      { details: { nested: { items } } },
      { cause: { nested: { items } } },
      { cause: new Error("failed", { cause: { nested: { items } } }) },
    ]) {
      const error = new ProxyError("Connection failed", options);
      const cause = error.cause as { cause?: unknown; nested?: { items: unknown } } | undefined;
      const diagnostics = (options.details ? error.details : cause?.cause ?? cause) as { nested: { items: unknown } };
      const snapshot = diagnostics.nested.items;
      assertSafe(error, ["fake-subclass-inspect-token", "fake-subclass-json-token", "fake-item-password"]);
      assert.equal(Object.getPrototypeOf(snapshot), Array.prototype);
      assert.notEqual(snapshot, items);
      assert.deepEqual(snapshot, [{ password: "***", context: "retry" }, "[Circular]"]);
      assert.equal(JSON.stringify(snapshot), '[{"password":"***","context":"retry"},"[Circular]"]');
    }
  });

  it("masks token-bearing CDP browser paths and URL auth query values in public inspection", () => {
    const url = "ws://127.0.0.1:9222/devtools/browser/fake-session-token?token=fake-query-token&auth=fake-auth-token&access_token=fake-access-token";
    const error = new CDPConnectError(`Attach failed: ${url}`, { details: { endpoint: url }, cause: new Error(url) });
    assertSafe(error, ["fake-session-token", "fake-query-token", "fake-auth-token", "fake-access-token"]);
    assert.ok(inspect(error, { depth: null }).includes("ws://127.0.0.1:9222"));
  });
});
