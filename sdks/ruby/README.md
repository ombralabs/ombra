# Ombra SDK for Ruby

> **Scaffold.** Layout and contract only. No package is published and no client is implemented yet. The API below is the target defined by [contract v0.1](../../docs/sdk-contract.md).

[← All SDKs](../README.md) · [Contract](../../docs/sdk-contract.md) · [Stealth invariants](../../docs/sdk-contract.md#11-stealth-invariants)

## Target package

| Item | Value |
|---|---|
| Gem | `ombra` |
| Registry | RubyGems |
| Runtime | Ruby 3.2+ |
| CDP client | Ferrum |
| Status | Scaffold |

## Target API

```ruby
require "ombra"

client = Ombra::Client.new(endpoint: "http://127.0.0.1:45678")

profile = client.profiles.create(
  name: "checkout-eu",
  fingerprint: { seed: 20261116, os: "macos" },
  proxy: "socks5://user:pass@proxy:1080"
)

session = client.launch(profile.id, headless: false)
browser = Ferrum::Browser.new(**session.ferrum_options)
browser.goto("https://example.com")
browser.quit
session.close
```

## Layout

```text
sdks/ruby/
├── ombra.gemspec
├── Gemfile
├── lib/
│   ├── ombra.rb
│   └── ombra/
│       ├── client.rb
│       ├── profiles.rb
│       ├── profile.rb
│       ├── session.rb
│       ├── transport.rb
│       └── errors.rb
└── spec/
    ├── transport_spec.rb
    └── session_spec.rb
```

## Build and test (planned)

```bash
bundle install
bundle exec rubocop
bundle exec rspec
bundle exec rake build
```

## Notes

- Use `Net::HTTP` and the standard library; no runtime dependencies beyond `json`.
- Ferrum is an optional development dependency used only by `session.ferrum_options`.
- Follow Ruby conventions: `snake_case`, predicate methods with `?`, expressive errors.
- `debug_port` is an `Integer`; the wire sends a string.
- No `Runtime.enable`, no init scripts, no `Emulation.*` — see the contract.
