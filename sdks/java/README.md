# Ombra SDK for Java

> **Scaffold.** Layout and contract only. No package is published and no client is implemented yet. The API below is the target defined by [contract v0.1](../../docs/sdk-contract.md).

[← All SDKs](../README.md) · [Contract](../../docs/sdk-contract.md) · [Stealth invariants](../../docs/sdk-contract.md#11-stealth-invariants)

## Target package

| Item | Value |
|---|---|
| Coordinates | `dev.ombra:ombra` |
| Registry | Maven Central |
| Runtime | Java 17+ |
| CDP clients | Microsoft Playwright, Selenium |
| Status | Scaffold |

## Target API

```java
import dev.ombra.OmbraClient;
import dev.ombra.ProfileSpec;
import dev.ombra.Fingerprint;
import dev.ombra.LaunchOptions;

try (var client = OmbraClient.create("http://127.0.0.1:45678")) {
    var profile = client.profiles().create(ProfileSpec.builder()
            .name("checkout-eu")
            .fingerprint(Fingerprint.builder().seed(20261116L).os("macos").build())
            .proxy("socks5://user:pass@proxy:1080")
            .build());

    try (var session = client.launch(profile.id(), LaunchOptions.headless(false))) {
        var browser = session.connectPlaywright();
        var page = browser.newPage();
        page.navigate("https://example.com");
    }
}
```

No Lombok, no reflection, no runtime code generation. Builders are hand-written.

## Layout

```text
sdks/java/
├── pom.xml
├── src/main/java/dev/ombra/
│   ├── OmbraClient.java
│   ├── ProfilesClient.java
│   ├── Profile.java
│   ├── Session.java
│   ├── Transport.java
│   └── OmbraException.java
└── src/test/java/dev/ombra/
    ├── TransportTest.java
    └── SessionTest.java
```

## Build and test (planned)

```bash
mvn -q spotless:check
mvn -q verify
mvn -q -DskipTests package
```

## Notes

- Target Java 17; use records for immutable values where the API allows it.
- The HTTP client is `java.net.http.HttpClient`; do not add OkHttp or Apache HttpClient.
- Playwright and Selenium helpers are optional dependencies; keep them out of the core artifact.
- `debug_port` is an `int`; the wire sends a string.
- No `Runtime.enable`, no init scripts, no `Emulation.*` — see the contract.
