# Ombra SDK for C# / .NET (`Ombra`)

> **Alpha (`0.2.0`).** Implements [SDK contract v0.2](../../docs/sdk-contract.md) and attaches `Microsoft.Playwright` over loopback CDP (`ConnectOverCDPAsync(..., IsLocal = true, NoDefaults = true)`) to Ombra stealth Chromium.

[← All SDKs](../README.md) · [Contract](../../docs/sdk-contract.md) · [Stealth invariants](../../docs/sdk-contract.md#12-stealth-invariants)

## Package overview

| Item | Value |
|---|---|
| Package | `Ombra` (`0.2.0`) |
| Registry | [GitHub Packages (NuGet)](https://github.com/orgs/ombralabs/packages?repo_name=ombra) |
| Namespace | `OmbraLabs.Ombra` |
| Runtime | .NET 8+ (`net8.0`) |
| Engine range | `>=151.0.7922.108,<159` (default Chromium family `158.0.8127.37`) |
| Returns | `Microsoft.Playwright.IBrowser` / `Microsoft.Playwright.IBrowserContext` |
| Playwright | `Microsoft.Playwright >=1.60.0,<2.0.0` (referenced automatically; no `playwright install` needed) |
| Status | Alpha |

## Installation (GitHub Packages NuGet)

Add the Ombra Labs GitHub Packages NuGet source (requires a GitHub Personal Access Token with `read:packages` scope):

```bash
dotnet nuget add source "https://nuget.pkg.github.com/ombralabs/index.json" \
  --name github-ombralabs \
  --username YOUR_GITHUB_USERNAME \
  --password YOUR_GITHUB_PAT

dotnet add package Ombra --version 0.2.0
```

Or add a `nuget.config` to your solution:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <packageSources>
    <add key="nuget.org" value="https://api.nuget.org/v3/index.json" />
    <add key="github-ombralabs" value="https://nuget.pkg.github.com/ombralabs/index.json" />
  </packageSources>
</configuration>
```

On first launch, the SDK resolves a local Ombra engine (`BinaryPath`, `OMBRA_BINARY_PATH`, Ombra Desktop app directory, or `~/.ombra/engines`) or downloads a signed build from [GitHub Releases](https://github.com/ombralabs/ombra/releases), verifying its Ed25519 signature, SHA-256 digest, and archive size. Linux `.tar.xz` extraction requires `xz` (`xz-utils`) on `PATH`.

## Usage

```csharp
using OmbraLabs.Ombra;

await using var browser = await Ombra.LaunchAsync(new LaunchOptions
{
    Profile = "pricing-eu",
    Headless = false,
    Proxy = "socks5://user:pass@proxy:1080",
    Fingerprint = new Fingerprint
    {
        Seed = 20261116,
        Os = "macos",
        Screen = new ScreenOption(1440, 900),
    },
    Humanize = HumanizeOption.Careful,
});

var page = await browser.NewPageAsync();
await page.GotoAsync("https://example.com");
Console.WriteLine(await page.TitleAsync());
```

`LaunchAsync` returns a `Microsoft.Playwright.IBrowser`. Closing or disposing the browser sends `Browser.close`, closes Playwright, terminates the engine process tree, stops any authenticated-proxy loopback relay, and releases the profile lock. New contexts and pages default to `ViewportSize.NoViewport` so Playwright does not inject an `Emulation` viewport override.

### Context and persistent profile helpers

```csharp
using OmbraLabs.Ombra;

// Browser + context in one call (Locale/Timezone go to engine flags, not Emulation overrides)
await using var context = await Ombra.LaunchContextAsync(new LaunchContextOptions
{
    Locale = "de-DE",
    Timezone = "Europe/Berlin",
    Humanize = true,
});
var page = await context.NewPageAsync();
await page.GotoAsync("https://example.com");

// Persistent profile returning the engine's default context
await using var persistent = await Ombra.LaunchPersistentContextAsync("./my-profile", new LaunchPersistentContextOptions
{
    Headless = false,
    Humanize = true,
});
```

### Mobile page layout on desktop

```csharp
using OmbraLabs.Ombra;

await using var browser = await Ombra.LaunchAsync(new LaunchOptions
{
    MobileViewport = new ViewportDimensions(390, 844),
});
var page = await browser.NewPageAsync();
await page.GotoAsync("http://127.0.0.1:8000/");
```

`MobileViewport` accepts CSS pixels from `1` through `10000` and requires the target/profile OS to match the host OS.

### Browser-level CDP controls

```csharp
using OmbraLabs.Ombra;

await using var browser = await Ombra.LaunchAsync();
await using var cdp = await Ombra.CdpAsync(browser);

var state = await cdp.GetHumanizeStateAsync();
await cdp.SetHumanizeAsync(new SetHumanizeOptions { Enabled = true, Preset = "careful" });
```

### Binary management and diagnostics

```csharp
using OmbraLabs.Ombra;

var info = Ombra.BinaryInfo();
var binaryPath = await Ombra.EnsureBinaryAsync(version: "158.0.8127.37-3");
var preview = await Ombra.BuildLaunchOptionsAsync(new LaunchOptions { Profile = "pricing-eu", Humanize = true });

await using var browser = await Ombra.LaunchAsync();
var launchInfo = Ombra.LastLaunchInfo(browser);
Ombra.CheckEngineHealth(browser);

Ombra.ClearCache(); // removes SDK-managed binaries; preserves ~/.ombra/profiles & license.key
```

## Layout

```text
sdks/dotnet/
├── LICENSE
├── NOTICE
├── Ombra.sln
├── README.md
├── src/Ombra/
│   ├── Ombra.csproj
│   ├── Ombra.cs                # LaunchAsync, LaunchContextAsync, LaunchPersistentContextAsync, BinaryInfo, EnsureBinaryAsync, ClearCache, CdpAsync
│   ├── LaunchOptions.cs        # LaunchOptions, LaunchContextOptions, validation, CLI switch builder
│   ├── Fingerprint.cs          # Fingerprint, ScreenOption, GpuOption, AutoOrInt, HumanizeOption, ProxyOption
│   ├── BinaryManager.cs        # Resolution order, Ed25519 + SHA-256 verification, GitHub Releases downloader
│   ├── ArchiveExtractor.cs     # Zip-Slip / Tar-Slip safe .zip, .tar.gz, .tar.xz extraction
│   ├── ProfileStore.cs         # Named profile slugification, seed persistence, OS file locks
│   ├── ProxyRelay.cs           # Proxy parser and in-memory loopback SOCKS5 credential relay
│   ├── OmbraCdp.cs             # Browser-level Ombra / Browser CDP domain client
│   ├── PlaywrightAdapters.cs   # Forward-compatible DispatchProxy lifecycle and NoViewport adapters
│   └── OmbraException.cs       # Typed OmbraException hierarchy and SecretRedactor
└── tests/Ombra.Tests/
    ├── Ombra.Tests.csproj
    ├── TestHelpers.cs
    ├── OptionsTests.cs
    ├── ProfileTests.cs
    ├── ProxyTests.cs
    ├── BinaryTests.cs
    ├── CdpTests.cs
    └── LaunchAndStealthTests.cs
```

## Build and test

```bash
cd sdks/dotnet
dotnet format --verify-no-changes
dotnet build -c Release
dotnet test -c Release
dotnet pack src/Ombra -c Release
```

## Notes

- Targets `net8.0` with nullable reference types enabled and `TreatWarningsAsErrors`.
- Uses one shared `HttpClient` for binary downloads with HTTPS-only redirect validation and Ed25519 + SHA-256 verification before spawn.
- Uses `DispatchProxy` for `IBrowser` and `IBrowserContext` lifecycle/default-viewport adaptation, keeping forward binary compatibility across `Microsoft.Playwright` `1.60.x`–`1.x` releases without wrapping `IPage`.
- Obeys all stealth invariants (`SI-01`–`SI-12`): attaches via `ConnectOverCDPAsync(..., IsLocal = true, NoDefaults = true)`, defaults new pages/contexts to `ViewportSize.NoViewport`, and never injects init scripts, `Runtime.enable`, `--enable-automation`, proxy credentials on CLI, or `Emulation` overrides.
- Resolves native `Ombra.app/Contents/MacOS/Ombra`, `ombra`, and `ombra.exe` engine layouts as well as historical Chromium layouts, rejecting ambiguous executables or conflicting `ombra-build.json` metadata.
