# Ombra SDK for .NET

> **Scaffold.** Layout and contract only. No package is published and no launcher is implemented yet. The API below is the target defined by [contract v0.1](../../docs/sdk-contract.md).

[← All SDKs](../README.md) · [Contract](../../docs/sdk-contract.md) · [Stealth invariants](../../docs/sdk-contract.md#12-stealth-invariants)

## Target package

| Item | Value |
|---|---|
| Package | `Ombra` |
| Registry | NuGet |
| Runtime | .NET 8+ |
| Language | C# with nullable reference types |
| Returns | `Microsoft.Playwright.IBrowser` |
| Status | Scaffold |

## Target API

```csharp
using Ombra;

var browser = await Ombra.LaunchAsync(new LaunchOptions
{
    Profile = "pricing-eu",
    Headless = false,
    Proxy = "socks5://user:pass@proxy:1080",
    Fingerprint = new Fingerprint { Seed = 20261116, Os = "macos" },
});

var page = await browser.NewPageAsync();
await page.GotoAsync("https://example.com");
Console.WriteLine(await page.TitleAsync());
await browser.CloseAsync();
```

Binary management:

```csharp
var info = Ombra.BinaryInfo();
await Ombra.EnsureBinaryAsync();
Ombra.ClearCache();
```

`LaunchAsync` returns a real `IBrowser`; existing page objects and helpers keep working.

## Layout

```text
sdks/dotnet/
├── src/Ombra/
│   ├── Ombra.csproj
│   ├── Ombra.cs             # LaunchAsync, BinaryInfo, EnsureBinaryAsync
│   ├── LaunchOptions.cs
│   ├── Fingerprint.cs
│   ├── BinaryManager.cs
│   ├── ProfileStore.cs
│   ├── ProxyRelay.cs
│   └── OmbraException.cs
└── tests/Ombra.Tests/
    ├── Ombra.Tests.csproj
    ├── OptionsTests.cs
    └── LaunchTests.cs
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
- Microsoft.Playwright is an optional package. Keep the core artifact free of a hard dependency.
- Async everywhere; no `.Result` or `.Wait()`.
- Use one `HttpClient` for binary downloads and verify SHA-256 before spawn.
- Do not add launch flags, init scripts, or `Emulation` overrides.
