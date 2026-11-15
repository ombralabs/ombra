# Ombra SDK for .NET

> **Scaffold.** Layout and contract only. No package is published and no client is implemented yet. The API below is the target defined by [contract v0.1](../../docs/sdk-contract.md).

[← All SDKs](../README.md) · [Contract](../../docs/sdk-contract.md) · [Stealth invariants](../../docs/sdk-contract.md#11-stealth-invariants)

## Target package

| Item | Value |
|---|---|
| Package | `Ombra` |
| Registry | NuGet |
| Runtime | .NET 8+ |
| Language | C# with nullable reference types |
| CDP clients | Microsoft.Playwright, Selenium |
| Status | Scaffold |

## Target API

```csharp
using Ombra;

await using var client = new OmbraClient("http://127.0.0.1:45678");

var profile = await client.Profiles.CreateAsync(new ProfileSpec
{
    Name = "checkout-eu",
    Fingerprint = new Fingerprint { Seed = 20261116, Os = "macos" },
    Proxy = "socks5://user:pass@proxy:1080",
});

await using var session = await client.LaunchAsync(profile.Id, headless: false);
var browser = await session.ConnectPlaywrightAsync();
var page = await browser.NewPageAsync();
await page.GotoAsync("https://example.com");
await session.CloseAsync();
```

The Selenium helper returns a configured `OpenQA.Selenium.Chrome.ChromeDriver`:

```csharp
using var driver = await session.ConnectSeleniumAsync();
driver.Navigate().GoToUrl("https://example.com");
```

## Layout

```text
sdks/dotnet/
├── src/Ombra/
│   ├── Ombra.csproj
│   ├── OmbraClient.cs
│   ├── ProfilesClient.cs
│   ├── Profile.cs
│   ├── Session.cs
│   ├── Transport.cs
│   └── OmbraException.cs
└── tests/Ombra.Tests/
    ├── Ombra.Tests.csproj
    ├── TransportTests.cs
    └── SessionTests.cs
```

## Build and test (planned)

```bash
dotnet format --verify-no-changes
dotnet build -c Release
dotnet test -c Release
dotnet pack src/Ombra -c Release
```

## Notes

- Target `net8.0`; do not multi-target unless a consumer needs it.
- Use `HttpClient` from `IHttpClientFactory` when the consumer provides one, and a single static client otherwise.
- Async everywhere; no `.Result` or `.Wait()`.
- Playwright and Selenium are optional packages; the helpers live in separate extension methods.
- `debug_port` is an `int`; the wire sends a string.
- No `Runtime.enable`, no init scripts, no `Emulation.*` — see the contract.
