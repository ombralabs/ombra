# Ombra SDK for PHP

> **Scaffold.** Layout and contract only. No package is published and no client is implemented yet. The API below is the target defined by [contract v0.1](../../docs/sdk-contract.md).

[← All SDKs](../README.md) · [Contract](../../docs/sdk-contract.md) · [Stealth invariants](../../docs/sdk-contract.md#11-stealth-invariants)

## Target package

| Item | Value |
|---|---|
| Package | `ombralabs/ombra` |
| Registry | Packagist |
| Runtime | PHP 8.2+ |
| CDP clients | Any CDP WebSocket client; the helper returns the URL |
| Status | Scaffold |

## Target API

```php
<?php

use Ombra\Client;

$client = new Client('http://127.0.0.1:45678');

$profile = $client->profiles()->create([
    'name' => 'checkout-eu',
    'fingerprint' => ['seed' => 20261116, 'os' => 'macos'],
    'proxy' => 'socks5://user:pass@proxy:1080',
]);

$session = $client->launch($profile->id, ['headless' => false]);
$cdpUrl = $session->cdpUrl();

// Pass $cdpUrl to the CDP client your project already uses.
$session->close();
```

## Layout

```text
sdks/php/
├── composer.json        # PSR-4: Ombra\ => src/
├── src/
│   ├── Client.php
│   ├── ProfilesClient.php
│   ├── Profile.php
│   ├── Session.php
│   ├── Transport.php
│   └── OmbraException.php
└── tests/
    ├── TransportTest.php
    └── SessionTest.php
```

## Build and test (planned)

```bash
composer install
composer validate --strict
vendor/bin/phpstan analyse
vendor/bin/phpunit
```

## Notes

- PSR-4, PSR-12, `declare(strict_types=1);` in every file.
- Use cURL or the PSR-18 client the consumer provides; do not bundle a full HTTP framework.
- No async runtime. The client is synchronous and predictable.
- `debug_port` is an `int`; the wire sends a string.
- No `Runtime.enable`, no init scripts, no `Emulation.*` — see the contract.
