# Ombra SDK for Go

> **Scaffold.** Layout and contract only. No package is published and no launcher is implemented yet. The API below is the target defined by [contract v0.1](../../docs/sdk-contract.md).

[← All SDKs](../README.md) · [Contract](../../docs/sdk-contract.md) · [Stealth invariants](../../docs/sdk-contract.md#12-stealth-invariants)

## Target package

| Item | Value |
|---|---|
| Module | `github.com/ombralabs/ombra/sdks/go` |
| Registry | Go modules |
| Runtime | Go 1.22+ |
| Returns | `*ombra.Session`; `Session.Context()` is chromedp-ready |
| Status | Scaffold |

## Target API

```go
package main

import (
	"context"
	"log"

	"github.com/chromedp/chromedp"
	"github.com/ombralabs/ombra/sdks/go"
)

func main() {
	ctx := context.Background()

	session, err := ombra.Launch(ctx,
		ombra.WithHeadless(false),
		ombra.WithProfile("pricing-eu"),
		ombra.WithProxy("socks5://user:pass@proxy:1080"),
		ombra.WithSeed(20261116),
	)
	if err != nil {
		log.Fatal(err)
	}
	defer session.Close()

	pageCtx := session.Context()
	if err := chromedp.Run(pageCtx, chromedp.Navigate("https://example.com")); err != nil {
		log.Fatal(err)
	}
}
```

`Session.Context()` already carries the remote allocator for the launched engine, so ordinary chromedp actions work unchanged.

Binary management:

```go
info, err := ombra.BinaryInfo(ctx)
path, err := ombra.EnsureBinary(ctx)
err = ombra.ClearCache()
```

## Layout

Go uses the package root, not a `src/` directory:

```text
sdks/go/
├── go.mod               # module github.com/ombralabs/ombra/sdks/go
├── launch.go            # Launch, Session, options
├── binary.go            # resolve, verify, download, BinaryInfo
├── profile.go           # named profiles, seed persistence, lock
├── proxy.go             # loopback relay
├── errors.go            # Error, ErrorKind
└── launch_test.go
```

## Build and test (planned)

```bash
go mod tidy
gofmt -l .
go vet ./...
go test -race ./...
```

## Notes

- Accept a `context.Context` as the first argument for every operation.
- Return wrapped errors with `%w` and expose `errors.Is` / `errors.As` helpers.
- `Session.Close()` terminates the engine and releases the profile lock; it is safe to call twice.
- Do not enable `Runtime`, inject init scripts, or override identity through `Emulation`.
