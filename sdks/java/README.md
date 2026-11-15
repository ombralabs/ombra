# Ombra SDK for Java

> **Scaffold.** Layout and contract only. No package is published and no launcher is implemented yet. The API below is the target defined by [contract v0.1](../../docs/sdk-contract.md).

[← All SDKs](../README.md) · [Contract](../../docs/sdk-contract.md) · [Stealth invariants](../../docs/sdk-contract.md#12-stealth-invariants)

## Target package

| Item | Value |
|---|---|
| Coordinates | `dev.ombra:ombra` |
| Registry | Maven Central |
| Runtime | Java 17+ |
| Returns | `com.microsoft.playwright.Browser` |
| Status | Scaffold |

## Target API

```java
import dev.ombra.Fingerprint;
import dev.ombra.LaunchOptions;
import dev.ombra.Ombra;

var browser = Ombra.launch(LaunchOptions.builder()
        .profile("pricing-eu")
        .headless(false)
        .proxy("socks5://user:pass@proxy:1080")
        .fingerprint(Fingerprint.builder().seed(20261116L).os("macos").build())
        .build());

var page = browser.newPage();
page.navigate("https://example.com");
System.out.println(page.title());
browser.close();
```

Binary management:

```java
var info = Ombra.binaryInfo();
Ombra.ensureBinary();
Ombra.clearCache();
```

No Lombok, no reflection, no runtime code generation. Builders are hand-written.

## Layout

```text
sdks/java/
├── pom.xml
├── src/main/java/dev/ombra/
│   ├── Ombra.java           # launch, binaryInfo, ensureBinary, clearCache
│   ├── LaunchOptions.java
│   ├── Fingerprint.java
│   ├── BinaryManager.java
│   ├── ProfileStore.java
│   ├── ProxyRelay.java
│   └── OmbraException.java
└── src/test/java/dev/ombra/
    ├── OptionsTest.java
    └── LaunchTest.java
```

## Build and test (planned)

```bash
mvn -q spotless:check
mvn -q verify
mvn -q -DskipTests package
```

## Notes

- Target Java 17; use records for immutable values where the API allows it.
- The HTTP downloader is `java.net.http.HttpClient`; do not add OkHttp or Apache HttpClient.
- Microsoft Playwright for Java is an optional dependency; keep it out of the core artifact.
- `launch()` returns the real Playwright `Browser`; do not wrap it.
- Do not add launch flags, init scripts, or `Emulation` overrides.
