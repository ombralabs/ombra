# Ombra SDK for Go

> **Scaffold.** Layout and contract only. No package is published and no client is implemented yet. The API below is the target defined by [contract v0.1](../../docs/sdk-contract.md).

[← All SDKs](../README.md) · [Contract](../../docs/sdk-contract.md) · [Stealth invariants](../../docs/sdk-contract.md#11-stealth-invariants)

## Target package

| Item | Value |
|---|---|
| Module | `github.com/ombralabs/ombra/sdks/go` |
| Registry | Go modules |
| Runtime | Go 1.22+ |
| CDP clients | chromedp, playwright-go |
| Status | Scaffold |

## Target API

```go
package main

import (
	"context"
	"log"

	"github.com/ombralabs/ombra/sdks/go"
)

func main() {
	ctx := context.Background()

	client, err := ombra.New(ombra.WithEndpoint("http://127.0.0.1:45678"))
	if err != nil {
		log.Fatal(err)
	}

	profile, err := client.Profiles.Create(ctx, ombra.ProfileSpec{
		Name:        "checkout-eu",
		Fingerprint: ombra.Fingerprint{Seed: 20261116, OS: "macos"},
		Proxy:       "socks5://user:pass@proxy:1080",
	})
	if err != nil {
		log.Fatal(err)
	}

	session, err := client.Launch(ctx, profile.ID, ombra.LaunchOptions{Headless: false})
	if err != nil {
		log.Fatal(err)
	}
	defer session.Close(ctx)

	browserCtx, err := session.ConnectChromedp(ctx)
	if err != nil {
		log.Fatal(err)
	}
	_ = browserCtx
}
```

## Layout

Go uses the package root, not a `src/` directory:

```text
sdks/go/
├── go.mod               # module github.com/ombralabs/ombra/sdks/go
├── client.go            # Client, New, options
├── profiles.go          # Profile, ProfileSpec, ProfilesClient
├── session.go           # Session, chromedp/playwright helpers
├── transport.go         # net/http, envelope, auth, timeouts
├── errors.go            # Error, ErrorKind
└── client_test.go
```

## Build and test (planned)

```bash
go mod tidy
gofmt -l .
go vet ./...
go test -race ./...
```

## Notes

- Accept a `context.Context` as the first argument for every network call.
- Return wrapped errors with `%w` and expose `errors.Is` / `errors.As` helpers.
- The chromedp helper returns a `context.Context`; the caller owns cancellation.
- `debug_port` is an `int`; the wire sends a string.
- No `Runtime.enable`, no init scripts, no `Emulation.*` — see the contract.
