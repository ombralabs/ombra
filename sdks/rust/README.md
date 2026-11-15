# Ombra SDK for Rust

> **Scaffold.** Layout and contract only. No package is published and no client is implemented yet. The API below is the target defined by [contract v0.1](../../docs/sdk-contract.md).

[← All SDKs](../README.md) · [Contract](../../docs/sdk-contract.md) · [Stealth invariants](../../docs/sdk-contract.md#11-stealth-invariants)

## Target package

| Item | Value |
|---|---|
| Crate | `ombra` |
| Registry | crates.io |
| Runtime | Rust 1.78+, Tokio |
| CDP client | chromiumoxide |
| Status | Scaffold |

## Target API

```rust
use ombra::{Fingerprint, LaunchOptions, Ombra, ProfileSpec};

#[tokio::main]
async fn main() -> Result<(), ombra::Error> {
    let client = Ombra::new("http://127.0.0.1:45678")?;

    let profile = client
        .profiles()
        .create(
            ProfileSpec::builder()
                .name("checkout-eu")
                .fingerprint(Fingerprint::builder().seed(20261116).os("macos").build())
                .proxy("socks5://user:pass@proxy:1080")
                .build()?,
        )
        .await?;

    let session = client
        .launch(&profile.id, LaunchOptions::new().headless(false))
        .await?;

    let config = session.chromiumoxide_config();
    let _browser = chromiumoxide::Browser::launch(config).await?;

    session.close().await?;
    Ok(())
}
```

## Layout

```text
sdks/rust/
├── Cargo.toml
├── src/
│   ├── lib.rs
│   ├── client.rs
│   ├── profiles.rs
│   ├── session.rs
│   ├── transport.rs
│   └── error.rs
└── tests/
    ├── transport.rs
    └── session.rs
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
- `chromiumoxide` is an optional feature so the core client builds without a browser dependency.
- Use `thiserror` for the error enum and `reqwest` for HTTP; no hidden global runtime.
- `debug_port` is a `u16`; the wire sends a string.
- No `Runtime.enable`, no init scripts, no `Emulation.*` — see the contract.
