# Ombra SDK for PHP

> **Scaffold.** Layout and contract only. No package is published and no launcher is implemented yet. The API below is the target defined by [contract v0.1](../../docs/sdk-contract.md).

[← All SDKs](../README.md) · [Contract](../../docs/sdk-contract.md) · [Stealth invariants](../../docs/sdk-contract.md#12-stealth-invariants)

## Target package

| Item | Value |
|---|---|
| Package | `ombralabs/ombra` |
| Registry | Packagist |
| Runtime | PHP 8.2+ |
| Returns | `Ombra\Browser`, a thin CDP handle |
| Status | Scaffold |

## Target API

```php
<?php

use function Ombra\binary_info;
use function Ombra\launch;

$browser = launch([
    'profile' => 'pricing-eu',
    'headless' => false,
    'proxy' => 'socks5://user:pass@proxy:1080',
    'fingerprint' => ['seed' => 20261116, 'os' => 'macos'],
]);

$page = $browser->newPage();
$page->goto('https://example.com');
echo $page->title();

$browser->close();

print_r(binary_info());
```

PHP has no dominant Playwright/Puppeteer client, so the SDK returns a small `Ombra\Browser` handle with `newPage()`, `close()`, and the CDP URL. The handle is intentionally thin; page automation beyond navigation and evaluation belongs to the CDP client your project already uses.

Binary management:

```php
Ombra\ensure_binary();
Ombra\clear_cache();
```

## Layout

```text
sdks/php/
├── composer.json        # PSR-4: Ombra\ => src/, files: src/functions.php
├── src/
│   ├── functions.php    # launch, binary_info, ensure_binary, clear_cache
│   ├── Browser.php      # newPage, close, cdpUrl
│   ├── Page.php         # goto, title, evaluate
│   ├── BinaryManager.php
│   ├── ProfileStore.php
│   ├── ProxyRelay.php
│   └── OmbraException.php
└── tests/
    ├── OptionsTest.php
    └── LaunchTest.php
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
- No async runtime. The launcher is synchronous and predictable.
- Do not add launch flags, init scripts, or `Emulation` overrides.
