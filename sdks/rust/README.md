# Ombra SDK for Rust

> **Scaffold.** Layout and contract only. No package is published and no launcher is implemented yet. The API below is the target defined by [contract v0.1](../../docs/sdk-contract.md).

[← All SDKs](../README.md) · [Contract](../../docs/sdk-contract.md) · [Stealth invariants](../../docs/sdk-contract.md#12-stealth-invariants)

## Target package

| Item | Value |
|---|---|
| Crate | `ombra` |
| Registry | crates.io |
| Runtime | Rust 1.78+, Tokio |
| Returns | `chromiumoxide::Browser` |
| Status | Scaffold |

## Target API

```rust
use ombra::{Fingerprint, LaunchOptions};

#[tokio::main]
async fn main() -> Result<(), ombra::Error> {
    let browser = ombra::launch(
        LaunchOptions::builder()
            .profile("pricing-eu")
            .headless(false)
            .proxy("socks5://user:pass@proxy:1080")
            .fingerprint(Fingerprint::builder().seed(20261116).os("macos").build())
            .build()?,
    )
    .await?;

    let page = browser.new_page("https://example.com").await?;
    println!("{:?}", page.url().await?);

    browser.close().await?;
    Ok(())
}
```

Binary management:

```rust
let info = ombra::binary_info().await?;
let path = ombra::ensure_binary().await?;
ombra::clear_cache()?;
```

`launch()` returns a real `chromiumoxide::Browser`; existing chromiumoxide handlers keep working.

## Layout

```text
sdks/rust/
├── Cargo.toml
├── src/
│   ├── lib.rs
│   ├── launch.rs       # launch, LaunchOptions, Session
│   ├── binary.rs       # resolve, verify, download, binary_info
│   ├── profile.rs      # named profiles, seed persistence, lock
│   ├── proxy.rs        # loopback relay
│   └── error.rs        # Error, ErrorKind
└── tests/
    ├── options.rs
    └── launch.rs
```

## Build and test (planned)

```bash
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test
cargo doc --no-deps
```

## Notes

- Tokio is the async runtime; keep it out of the public types where possible.
- `chromiumoxide` is an optional feature so the core launcher builds without a browser dependency.
- Use `thiserror` for the error enum and `reqwest` for downloads; no hidden global runtime.
- Do not add launch flags, init scripts, or `Emulation` overrides.
