# Ombra SDK for Ruby

> **Scaffold.** Layout and contract only. No package is published and no launcher is implemented yet. The API below is the target defined by [contract v0.1](../../docs/sdk-contract.md).

[← All SDKs](../README.md) · [Contract](../../docs/sdk-contract.md) · [Stealth invariants](../../docs/sdk-contract.md#12-stealth-invariants)

## Target package

| Item | Value |
|---|---|
| Gem | `ombra` |
| Registry | RubyGems |
| Runtime | Ruby 3.2+ |
| Returns | `Ferrum::Browser` |
| Status | Scaffold |

## Target API

```ruby
require "ombra"

browser = Ombra.launch(
  profile: "pricing-eu",
  headless: false,
  proxy: "socks5://user:pass@proxy:1080",
  fingerprint: { seed: 20261116, os: "macos" }
)

browser.go_to("https://example.com")
puts browser.current_url
browser.quit
```

Binary management:

```ruby
info = Ombra.binary_info
Ombra.ensure_binary
Ombra.clear_cache
```

`Ombra.launch` returns a real `Ferrum::Browser`; existing Ferrum code keeps working.

## Layout

```text
sdks/ruby/
├── ombra.gemspec
├── Gemfile
├── lib/
│   ├── ombra.rb
│   └── ombra/
│       ├── launcher.rb
│       ├── binary.rb
│       ├── profile.rb
│       ├── proxy.rb
│       └── errors.rb
└── spec/
    ├── options_spec.rb
    └── launch_spec.rb
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
- Ferrum is an optional development dependency used only by the launcher.
- Follow Ruby conventions: `snake_case`, predicate methods with `?`, expressive errors.
- Do not add launch flags, init scripts, or `Emulation` overrides.
