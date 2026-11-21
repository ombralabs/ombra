<p align="center">
<img src="../../assets/logo.svg" width="72" height="72" alt="Ombra">
</p>

<h1 align="center">Ombra</h1>

<p align="center">
<a href="https://pypi.org/project/ombrabrowser/"><img src="https://img.shields.io/pypi/v/ombrabrowser?label=PyPI" alt="PyPI"></a>
<a href="https://www.npmjs.com/package/@ombralabs/sdk"><img src="https://img.shields.io/npm/v/@ombralabs/sdk?label=npm" alt="npm"></a>
<a href="../../LICENSE"><img src="https://img.shields.io/github/license/ombralabs/ombra" alt="Lisensi"></a>
<a href="https://github.com/ombralabs/ombra"><img src="https://img.shields.io/github/last-commit/ombralabs/ombra" alt="Commit Terakhir"></a>
<br>
<a href="https://github.com/ombralabs/ombra"><img src="https://img.shields.io/github/stars/ombralabs/ombra" alt="Bintang"></a>
<a href="https://pypi.org/project/ombrabrowser/"><img src="https://img.shields.io/pepy/dt/ombrabrowser?label=pypi&logo=pypi&logoColor=white" alt="Unduhan PyPI"></a>
<a href="https://www.npmjs.com/package/@ombralabs/sdk"><img src="https://img.shields.io/npm/dt/@ombralabs/sdk?label=npm&logo=npm&logoColor=white" alt="Unduhan npm"></a>
<a href="https://github.com/ombralabs/ombra/releases"><img src="https://img.shields.io/github/v/release/ombralabs/ombra?label=release" alt="Rilis"></a>
</p>

<p align="center">
<a href="#instalasi"><strong>Instalasi</strong></a> ·
<a href="#api-python">API Python</a> ·
<a href="#api-nodejs-dan-typescript">API Node.js</a> ·
<a href="#input-seperti-manusia">Humanize</a> ·
<a href="#ombra-desktop">Ombra Desktop</a> ·
<a href="../../README.md">English</a>
</p>

<details>
<summary>Bahasa</summary>

[English](../../README.md) · [Русский](../ru/README.md) · [Deutsch](../de/README.md) · [Español](../es/README.md) ·
[Français](../fr/README.md) · [Italiano](../it/README.md) · [Nederlands](../nl/README.md) · [Polski](../pl/README.md) ·
[Português](../pt/README.md) · [Română](../ro/README.md) · [Türkçe](../tr/README.md) · [Українська](../uk/README.md) ·
[Tiếng Việt](../vi/README.md) · [Bahasa Indonesia](README.md) · [简体中文](../zh-Hans/README.md) · [繁體中文](../zh-Hant/README.md) ·
[日本語](../ja/README.md) · [한국어](../ko/README.md) · [ไทย](../th/README.md) · [हिंदी](../hi/README.md) ·
[Filipino](../fil/README.md) · [ខ្មែរ](../km/README.md)

</details>

<br>

<h3 align="center">Chromium dengan kontrol fingerprint tingkat kode sumber C++ dan input seperti manusia bawaan.</h3>

<table><tr><td>
Bukan sekadar kumpulan flag peluncuran dan bukan pula injeksi JavaScript di atas halaman. Ini adalah biner Chromium asli dengan patch fingerprint yang dikompilasi langsung ke dalam kode sumber C++ serta simulasi input yang berjalan di dalam proses browser. Hubungkan Playwright atau Puppeteer resmi melalui CDP lokal — tanpa objek pembungkus dan tanpa perlu menulis ulang kode halaman.
</td></tr></table>

<br>

<p align="center">
Pengganti langsung (drop-in) untuk peluncuran Playwright dan Puppeteer di Python dan Node.js.<br>
API, selektor, dan tipe yang sama — cukup ganti pernyataan impor dan panggilan <code>launch()</code>.
</p>

- **Patch Chromium tingkat kode sumber** — canvas, WebGL, WebGPU, audio, font, GPU, layar, media query CSS, pelaporan perangkat keras, WebRTC tanpa kebocoran STUN, TLS ClientHello, zona waktu, locale, serta penghapusan sinyal otomatisasi (`navigator.webdriver`, `Runtime.enable`, penanda headless).
- **Input seperti manusia bawaan di dalam proses browser (`humanize=True`)** — lintasan kursor (`cursory-rs`), klik terarah dengan durasi tekan, irama pengetikan dengan koreksi otomatis salah ketik, dan fisika pengguliran (scroll) berjalan di dalam Chromium. SDK mengembalikan objek `Browser` native biasa tanpa pembungkus proxy.
- **Operasi mandiri tanpa kunci atau akun** — build mesin terkini (`158.0.8127.37-3` dan yang lebih baru) serta Ombra Desktop berjalan secara lokal tanpa pendaftaran, kunci lisensi, ID perangkat keras, atau server lisensi.
- **Instalasi otomatis dan verifikasi biner kriptografis** — `pip install ombrabrowser` atau `npm install @ombralabs/sdk`; pada peluncuran pertama, SDK mengunduh build untuk platform Anda dan memverifikasi tanda tangan Ed25519 serta checksum SHA-256.
- **Profil persisten dan relay proksi aman** — profil bernama menyimpan cookie, `localStorage`, IndexedDB, dan `seed` antar sesi dengan penguncian lintas proses; proksi terautentikasi (HTTP, HTTPS, SOCKS5) berjalan melalui relay loopback lokal sehingga kredensial tidak pernah muncul di argumen proses.
- **Manajer profil offline Ombra Desktop** — aplikasi desktop native di dalam repositori ini ([`desktop/`](../../desktop/README.md)) dengan installer siap pakai untuk macOS, Linux, dan Windows.

**Python (Playwright):**

```python
from ombrabrowser import launch

browser = launch()
page = browser.new_page()
page.goto("https://example.com")
print(page.title())
browser.close()
```

**Node.js / TypeScript (Playwright):**

```ts
import { launch } from "@ombralabs/sdk";

const browser = await launch();
const page = await browser.newPage();
await page.goto("https://example.com");
console.log(await page.title());
await browser.close();
```

Puppeteer juga didukung melalui `import { launch } from "@ombralabs/sdk/puppeteer"` atau `launchPuppeteer()` ([detail](#puppeteer)).

**Untuk situs dengan perlindungan anti-bot**, kombinasikan proksi residensial, profil persisten, dan pengaturan lingkungan yang selaras:

```python
from ombrabrowser import launch_persistent_context

context = launch_persistent_context(
    profile="pricing-eu",
    proxy="socks5://user:pass@residential-proxy:1080",  # IP residensial lebih disarankan daripada datacenter
    fingerprint={"timezone": "auto", "locale": "auto"},  # cocokkan zona waktu dan locale dengan titik keluar proksi
    headless=False,                                      # beberapa situs mendeteksi perbedaan mode headless
    humanize=True,                                       # simulasi mouse, keyboard, dan scroll bawaan
)
page = context.new_page()
page.goto("https://example.com")
context.close()
```

```ts
import { launchPersistentContext } from "@ombralabs/sdk";

const context = await launchPersistentContext({
  profile: "pricing-eu",
  proxy: "socks5://user:pass@residential-proxy:1080",
  fingerprint: { timezone: "auto", locale: "auto" },
  headless: false,
  humanize: true,
});
const page = await context.newPage();
await page.goto("https://example.com");
await context.close();
```

Lihat [Pemecahan masalah](#pemecahan-masalah) untuk kendala umum di Linux, di dalam kontainer, dan pada target yang dilindungi.

## Instalasi

**Python (3.10+):**

```bash
python -m pip install ombrabrowser

# Opsional: deteksi otomatis zona waktu dan locale dari titik keluar proksi (timezone="auto", locale="auto")
python -m pip install "ombrabrowser[geoip]"
```

**Node.js / TypeScript (20+):**

```bash
# Dengan Playwright (1.60.0+, tidak perlu mengunduh Chromium bawaan)
npm install @ombralabs/sdk "playwright-core@^1.60.0"

# Atau dengan Puppeteer
npm install @ombralabs/sdk puppeteer-core

# Opsional: pembaca basis data GeoIP offline untuk timezone: "auto" dan locale: "auto"
npm install mmdb-lib
```

---

Saat diluncurkan, SDK mencari mesin dalam urutan yang ketat: `binary_path` (`binaryPath` di Node.js), `OMBRA_BINARY_PATH`, direktori mesin Ombra Desktop, dan cache SDK (`~/.ombra/engines`). Jika tidak ada mesin yang kompatibel ditemukan, SDK akan mengunduh build dari saluran rilis bertanda tangan, memverifikasi tanda tangan Ed25519 dan checksum SHA-256, lalu menyimpannya di cache lokal. Menjalankan `playwright install chromium` tidak diperlukan.

Untuk menonaktifkan pengunduhan otomatis, teruskan `download=False` (`download: false` di Node.js). Untuk mengunduh dan memverifikasi mesin terlebih dahulu (misalnya saat membangun image kontainer), panggil `ensure_binary()` (`ensureBinary()`) atau gunakan perintah CLI `install`.

> **Peluncuran mandiri:** build mesin terkini (`158.0.8127.37-3` dan yang lebih baru) bersifat gratis dan tidak memerlukan akun atau kunci lisensi. `OMBRA_LICENSE_KEY` dan perintah `login` tetap tersedia hanya untuk kompatibilitas dengan build berlisensi versi lama.

**Migrasi dari Playwright** hanya memerlukan dua baris — semua operasi halaman, locator, dan mekanisme tunggu tetap tidak berubah:

```diff
- from playwright.sync_api import sync_playwright
- pw = sync_playwright().start()
- browser = pw.chromium.launch()
+ from ombrabrowser import launch
+ browser = launch()

  page = browser.new_page()
  page.goto("https://example.com")
  # sisa kode Anda tetap berjalan tanpa perubahan
```

```diff
- import { chromium } from "playwright";
- const browser = await chromium.launch();
+ import { launch } from "@ombralabs/sdk";
+ const browser = await launch();
```

> ⭐ **Beri bintang (Star)** repositori ini jika Anda merasa terbantu, dan **[Pantau rilis](https://github.com/ombralabs/ombra/subscription)** untuk mendapatkan notifikasi tentang build mesin, SDK, dan Ombra Desktop terbaru.

---

## Status terkini dan rilis

Setiap komponen dalam ekosistem mengikuti kontrak peluncuran bersama dan diberi versi secara independen.

| Komponen | Status / versi | Lokasi |
|---|---|---|
| **Kontrak SDK** | Draf `0.2.0` | [`docs/sdk-contract.md`](../../docs/sdk-contract.md) |
| **SDK Python** | Alpha `0.2.0` | [`ombrabrowser` di PyPI](https://pypi.org/project/ombrabrowser/) |
| **SDK Node.js / TypeScript** | Alpha `0.2.0` | [`@ombralabs/sdk` di npm](https://www.npmjs.com/package/@ombralabs/sdk) |
| **Mesin Ombra Chromium** | Chromium `158.0.8127.37` | `158.0.8127.37-3` · macOS ARM64 / Linux x64 / Windows x64 |
| **Ombra Desktop** | `desktop-v1.2.2` | [`desktop/`](../../desktop/README.md) · [GitHub Releases](https://github.com/ombralabs/ombra/releases/tag/desktop-v1.2.2) |
| **Browser mandiri** | `v158.0.8127.37-3` | [GitHub Releases](https://github.com/ombralabs/ombra/releases/tag/v158.0.8127.37-3) |
| **Skema dan conformance** | JSON Schema + kasus uji bersama | [`spec/schemas`](../../spec/schemas) · [`conformance`](../../conformance/README.md) |
| **Metode pemeriksaan stealth** | 6 lapisan (`L0`–`L5`) | [`docs/stealth-checkup.md`](../../docs/stealth-checkup.md) |

Tersedia pada rilis saat ini:

- **Patch tingkat kode sumber** — derivasi fingerprint yang konsisten terhadap seed, penyelarasan WebGL / WebGPU dan ekstensi, tabel font realistis per OS, profil TLS ClientHello native (`chrome-<major>`), peredaman kebocoran stack `Runtime.enable` dan `UtilityScript`, serta perlindungan kebocoran IP host WebRTC.
- **Domain CDP `Ombra` tingkat browser** — kontrol langsung atas input seperti manusia (`getHumanizeState`, `setHumanize`) di Python dan Node.js tanpa perlu memulai ulang browser.
- **Simulasi input native di dalam proses browser** — perencana kursor `cursory-rs`, profil scroll roda mouse dan trackpad, irama pengetikan dengan koreksi otomatis salah ketik, serta penempelan (paste) teks panjang yang aman melalui clipboard terisolasi.
- **Build mandiri tanpa kunci** — build mesin terkini (`158.0.8127.37-3`) dan Ombra Desktop `1.2.2` berjalan sepenuhnya secara lokal tanpa akun, kunci, atau telemetri.
- **Penyematan versi mesin (`version`)** — kunci ke build spesifik melalui `launch(version="158.0.8127.37-3")`, `OMBRA_VERSION`, atau CLI `install --version`.
- **Relay proksi terpadu** — proksi terautentikasi HTTP, HTTPS, dan SOCKS5 tanpa mengekspos kredensial di baris perintah Chromium, log, atau metadata profil.
- **Profil bernama persisten** — simpan `seed`, cookie, `localStorage`, dan IndexedDB di `~/.ombra/profiles/<slug>` dengan penguncian lintas proses (`ProfileBusyError`).
- **Pemeriksaan rantai pasok kriptografis** — verifikasi tanda tangan Ed25519 pada amplop rilis dan verifikasi SHA-256 pada arsip sebelum ekstraksi.

Lihat [CHANGELOG.md](../../CHANGELOG.md) untuk riwayat rilis lengkap.

## Mengapa Ombra

- **Patch tingkat konfigurasi dan JS mudah rusak.** Alat seperti `playwright-stealth`, `puppeteer-extra`, dan `undetected-chromedriver` menyuntikkan JavaScript ke dalam halaman atau memodifikasi flag peluncuran. Pembaruan Chrome sering kali merusaknya, dan detektor modern dapat mengenali patch itu sendiri (`Function.prototype.toString`, anomali prototipe, `addScriptToEvaluateOnNewDocument`).
- **Perubahan dikompilasi ke dalam kode sumber Chromium.** Fingerprint dihasilkan di tingkat C++ dan diterapkan secara konsisten di seluruh frame utama, worker, dan iframe. SDK tidak menyuntikkan skrip apa pun ke halaman dan tidak melakukan override `Emulation.*`.
- **Simulasi input berada di dalam proses browser, bukan di atas Playwright.** Karena lintasan mouse, penekanan tombol, dan pengguliran ditangani di dalam Chromium itu sendiri, SDK tidak membungkus objek Playwright atau Puppeteer — setiap locator, frame, dan pustaka pihak ketiga tetap berjalan normal.
- **Arsitektur lokal tanpa layanan tambahan.** Tidak ada daemon control-plane di latar belakang dan tidak ada lompatan jaringan antara skrip Anda dan browser: satu proses mesin, CDP loopback lokal di `127.0.0.1`, serta tanpa batasan jumlah profil atau konkurensi.

## Ombra Desktop

**Manajer profil offline lokal dengan antarmuka grafis (GUI).** Kode sumbernya tersedia langsung di repositori ini ([`desktop/`](../../desktop/README.md)) dan dibangun dengan Tauri (Rust + Vue).

- **Sepenuhnya offline dan lokal** — katalog profil tersimpan di basis data SQLite lokal pada mesin Anda dengan kunci enkripsi lokal; tidak memerlukan akun, layanan cloud, atau akses jaringan.
- **Manajemen profil terstruktur** — buat profil, cari berdasarkan nama, catatan, atau nomor, edit deskripsi, dan kelola entri dengan grup, tag, label, serta bookmark pada katalog Rust.
- **Tempat Sampah aman** — memindahkan profil ke Tempat Sampah tetap mempertahankan berkasnya di disk sehingga Anda dapat memulihkannya nanti.
- **Tanpa batas jumlah profil** — tidak ada paket harga per profil atau kuota cloud: seluruh data tetap sepenuhnya milik Anda.
- **Installer siap pakai** — macOS Apple Silicon (`.dmg`, ditandatangani dengan Apple Developer ID dan dinotarisasi), Linux (`.deb` dan `.rpm`), serta Windows x64 (`setup.exe`).
- **Katalog terisolasi** — atur `OMBRA_DESKTOP_DATA_DIR` untuk bekerja dengan katalog pengujian terpisah atau salinan cadangan.

[Unduh `desktop-v1.2.2` →](https://github.com/ombralabs/ombra/releases/tag/desktop-v1.2.2) · [README Desktop](../../desktop/README.md) · [Panduan profil dan kunci lokal](../../docs/desktop/README.md)

## Verifikasi fingerprint dan pemeriksaan stealth

Alih-alih memberikan janji kosong "100% tidak terdeteksi", Ombra mengandalkan prosedur verifikasi yang dapat diulang dalam kondisi yang terdokumentasi. Hasil di dunia nyata pada situs mana pun selalu bergantung pada reputasi IP keluar, wilayah, riwayat profil, versi detektor, dan konfigurasi peluncuran.

### Permukaan yang ditangani oleh mesin dan SDK

| Permukaan / sinyal | Playwright standar | Ombra | Implementasi |
|---|---|---|---|
| `navigator.webdriver` | `true` | `false` | Patch mesin C++ |
| `window.chrome` | tidak ada di mode headless | objek lengkap | Sesuai dengan Chrome biasa |
| `navigator.plugins` | `0` di mode headless | set plugin yang selaras | Tingkat mesin |
| User-Agent dan Client Hints | `HeadlessChrome`, merek tidak cocok | `Google Chrome` + `Sec-CH-UA*` yang selaras | Patch `010-user-agent-and-webdriver` |
| Artefak CDP (`Runtime.enable`, `UtilityScript`) | ditandai oleh detektor | diredam oleh mesin; SDK tidak pernah memanggil `Runtime.enable` | Patch `110-runtime-enable` + invarian `SI-02` |
| Kebocoran IP WebRTC | mengekspos IP lokal/host | melaporkan IP keluar tanpa mengirim STUN asli | Patch `100-webrtc-leak` (`--webrtc-ip`) |
| TLS dan HTTP/2 | bergantung pada konfigurasi | stack jaringan Chromium + profil ClientHello `chrome-<major>` | Patch `210-tls-network-persona` |
| WebGL dan WebGPU | renderer perangkat lunak / GPU tidak cocok | batas WebGL/WebGPU dan tabel ekstensi terpadu | Patch `070`, `071`, `075`, `955` |
| Font, locale, dan zona waktu | nilai host, ketidaksesuaian `Intl` | tabel font, locale ICU, dan zona waktu yang konsisten | Patch `040`, `090`, `092`, `230` |
| Simulasi input | teleportasi kursor, `fill()` instan | kurva `cursory-rs`, irama mengetik, fisika scroll | Patch `135-ombra-humanize` di proses browser |
| Stabilitas fingerprint | berubah atau membocorkan host | deterministik per `seed` di seluruh restart dan frame | Patch `001`, `002` + profil persisten |

### Enam lapisan pemeriksaan

Sebelum merilis atau men-deploy konfigurasi, jalankan seluruh enam lapisan pemeriksaan pada build mesin, klien otomatisasi, dan proksi persis seperti yang akan Anda gunakan:

| Lapisan | Contoh target | Kriteria lulus |
|---|---|---|
| **L0 Transport** | TrackMe, halaman uji kebocoran IP/WebRTC, echo header | Hanya IP keluar proksi yang terlihat; JA4 dan HTTP/2 cocok dengan build Chromium; tidak ada kredensial proksi di argv |
| **L1 Identity** | Probe lokal, Sannysoft, Intoli, uji UA-CH | Tidak ada kontradiksi antara UA, Client Hints, platform, GPU, font, layar, dan locale |
| **L2 Fingerprint** | CreepJS, FingerprintJS, BrowserScan, Pixelscan | Tidak ada penanda headless atau `lie`; fingerprint tetap stabil di setiap muat ulang |
| **L3 Automation** | rebrowser, brotector, botd, audit perintah CDP | Tidak ada kebocoran `Runtime.enable`, init-script, binding, atau `navigator.webdriver` |
| **L4 Behavior** | Probe ketepatan input, jejak humanize, uji cepat tantangan langsung | Event dengan `isTrusted: true`, urutan dan jeda waktu alami, kurva kursor dan pengguliran realistis |
| **L5 Stability** | Peluncuran berulang, worker, iframe same/cross-origin, kesetaraan lintas SDK | `seed` yang sama menghasilkan fingerprint identik di semua konteks |

Prosedur lengkap, status (`PASS` / `DEGRADED` / `FAIL` / `UNREACHABLE`), daftar periksa sinyal, dan templat laporan: [Bahasa Inggris (`docs/stealth-checkup.md`)](../../docs/stealth-checkup.md) dan [Bahasa Rusia (`docs/stealth-checkup.ru.md`)](../../docs/stealth-checkup.ru.md).

## Perbandingan

| Fitur | Playwright | playwright-stealth | undetected-chromedriver | Ombra |
|---|---|---|---|---|
| API otomatisasi | Playwright | Playwright | Selenium | **Playwright dan Puppeteer** |
| Tingkat patch | Tidak ada | Injeksi JS di halaman | Flag konfigurasi | **Kode sumber C++ (Chromium)** |
| `seed` fingerprint koheren | Tidak | Tidak | Sebagian | **Ya, per profil dan eTLD+1** |
| Simulasi input (`humanize`) | Tidak | Tidak | Tidak | **Terintegrasi di proses browser** |
| Peredaman `Runtime.enable` / kebocoran CDP | Tidak | Tidak | Sebagian | **Patch mesin + invarian SDK** |
| Proksi terautentikasi tanpa kebocoran CLI | Tidak | Tidak | Terbatas | **Relay loopback lokal** |
| Isolasi profil | Konteks browser | Konteks browser | Tidak | **Direktori profil + kunci berkas** |
| Manajer profil offline (GUI) | Tidak | Tidak | Tidak | **Ombra Desktop (macOS, Linux, Windows)** |
| Migrasi dari Playwright | — | Ubah impor | Tulis ulang kode | **Ganti impor dan `launch()`** |

## Cara kerja

```mermaid
flowchart LR
    Script["Skrip Anda<br/>Playwright · Puppeteer"]
    SDK["Ombra SDK<br/>launch() + jembatan CDP"]
    Relay["Relay proksi lokal<br/>saat autentikasi diperlukan"]
    Engine["Ombra Chromium<br/>mesin dengan patch C++"]
    Client["Klien native<br/>Playwright · Puppeteer"]
    Profile[("Profil<br/>seed · cookie · penyimpanan")]

    Script -->|"launch()"| SDK
    SDK -->|"verifikasi + jalankan"| Engine
    SDK -.->|"autentikasi proksi"| Relay
    Relay -.-> Engine
    SDK -->|"hubung lewat CDP"| Client
    Script -->|"API halaman"| Client
    Client -->|"loopback CDP"| Engine
    Engine --> Profile
```

1. **`launch()` mencari atau mengunduh mesin** serta memverifikasi tanda tangan Ed25519 dan checksum SHA-256.
2. **Profil dan `seed` disiapkan.** Profil bernama mengambil kunci lintas proses; jika proksi memerlukan kredensial, SDK menjalankan relay loopback di dalam memori.
3. **Ombra Chromium dijalankan** dengan profil yang dipilih, opsi fingerprint, dan port debugging lokal (`--remote-debugging-port=0`).
4. **Klien resmi terhubung.** Setelah `DevToolsActivePort` muncul, SDK menghubungkan Playwright (dengan `no_defaults=True`) atau Puppeteer melalui `127.0.0.1` dan mengembalikan objek `Browser` native.
5. **Penutupan bersih.** `browser.close()` mengirimkan `Browser.close`, menghentikan pohon proses mesin, mematikan relay, dan melepaskan kunci profil.

Setelah peluncuran selesai, SDK keluar dari jalur data: semua perintah halaman mengalir langsung dari Playwright atau Puppeteer ke Chromium.

### Batasan SDK dan invarian stealth

[Kontrak SDK v0.2 (`docs/sdk-contract.md`)](../../docs/sdk-contract.md) memberlakukan invarian ketat pada setiap SDK resmi:

- **Tanpa skrip stealth di halaman.** SDK tidak pernah memanggil `Page.addScriptToEvaluateOnNewDocument` / `evaluateOnNewDocument` dan tidak pernah memodifikasi properti DOM.
- **Tanpa `Runtime.enable`.** Pemeriksaan kesiapan hanya menggunakan endpoint HTTP CDP lokal atau `Browser.getVersion`; SDK tidak pernah mengaktifkan `Runtime`, `Debugger`, atau `Log`.
- **Tanpa override `Emulation.*`.** SDK tidak pernah memanggil `Emulation.setUserAgentOverride`, `setTimezoneOverride`, `setLocaleOverride`, atau `setDeviceMetricsOverride` — identitas browser sepenuhnya berasal dari mesin.
- **Tanpa flag terlarang secara default.** SDK tidak pernah menyisipkan `--enable-automation`, `--disable-blink-features=AutomationControlled`, `--no-sandbox`, atau `--user-agent` secara otomatis.
- **Hanya CDP loopback.** Port debug selalu terikat pada `127.0.0.1`; meneruskan `--remote-debugging-address` non-loopback akan ditolak.
- **Tanpa telemetri dan tanpa kebocoran rahasia.** Kredensial proksi, kunci, dan cookie disamarkan dari log dan pesan error.

## API Python

### `launch()`

```python
from ombrabrowser import launch

# Peluncuran dasar (headless secara default)
browser = launch()

# Jendela browser terlihat (non-headless)
browser = launch(headless=False)

# Proksi HTTP atau SOCKS5 (kredensial ditangani lewat relay loopback lokal)
browser = launch(proxy="http://user:pass@proxy:8080")
browser = launch(proxy="socks5://user:pass@proxy:1080")

# Objek proksi dengan daftar bypass
browser = launch(
    proxy={
        "type": "socks5",
        "host": "proxy.example.com",
        "port": 1080,
        "username": "user",
        "password": "pass",
        "bypass": ".local,127.0.0.1",
    }
)

# Kontrol fingerprint (seed, OS, zona waktu/locale otomatis dari proksi, layar, GPU)
# Untuk timezone="auto" / locale="auto", instal: pip install "ombrabrowser[geoip]"
browser = launch(
    proxy="socks5://user:pass@proxy:1080",
    fingerprint={
        "seed": 20261116,
        "os": "macos",
        "timezone": "auto",
        "locale": "auto",
        "screen": {"width": 1440, "height": 900},
    },
)

# Simulasi mouse, keyboard, dan scroll bawaan
browser = launch(humanize=True)
browser = launch(humanize={"preset": "careful"})

# Sematkan build mesin tertentu dan teruskan flag Chromium tambahan
browser = launch(
    version="158.0.8127.37-3",
    args=["--webrtc-ip=203.0.113.10"],
)
```

Mengembalikan objek standar `playwright.sync_api.Browser`. Semua metode Playwright berjalan normal (`new_page()`, `new_context()`, `close()`, dan sebagainya). Halaman baru secara default menggunakan `no_viewport=True` agar dimensi jendela profil tidak tertimpa.

### `launch_async()`

```python
import asyncio
from ombrabrowser import launch_async

async def main() -> None:
    browser = await launch_async(headless=False, humanize=True)
    page = await browser.new_page()
    await page.goto("https://example.com")
    print(await page.title())
    await browser.close()

asyncio.run(main())
```

### `launch_context()` dan `launch_context_async()`

Fungsi pembantu praktis yang meluncurkan browser dan langsung mengembalikan `BrowserContext` (menutup konteks juga menghentikan proses mesin). Argumen kata kunci tambahan diteruskan ke `browser.new_context()` — seperti `storage_state`, `permissions`, atau `extra_http_headers`:

```python
from ombrabrowser import launch_context

context = launch_context(
    proxy="socks5://user:pass@residential-proxy:1080",
    fingerprint={"timezone": "auto", "locale": "auto"},
    headless=False,
    humanize=True,
    storage_state="state.json",
)
page = context.new_page()
page.goto("https://example.com")
context.storage_state(path="state.json")
context.close()
```

Padanan asinkron: `await launch_context_async(...)`.

### `launch_persistent_context()` dan `launch_persistent_context_async()`

Meluncurkan browser dengan profil persisten dan mengembalikan `BrowserContext` default-nya. Cookie, `localStorage`, IndexedDB, cache, serta `seed` fingerprint tetap tersimpan antar sesi.

- Meneruskan `profile="pricing-eu"` akan membuat profil di bawah `~/.ombra/profiles/pricing-eu` beserta metadata di `.ombra/profile.json` dan sebuah berkas kunci.
- Meneruskan `user_data_dir="./my-profile"` (atau argumen path posisional) akan menggunakan direktori eksplisit tersebut.
- Meluncurkan profil yang sama secara bersamaan dari proses lain akan memunculkan `ProfileBusyError` alih-alih merusak data profil.

```python
from ombrabrowser import launch_persistent_context

# Menggunakan profil bernama (disimpan di ~/.ombra/profiles/)
ctx = launch_persistent_context(profile="pricing-eu", headless=False)
page = ctx.new_page()
page.goto("https://example.com")
ctx.close()  # cookie, penyimpanan, dan seed dipertahankan

# Menggunakan path eksplisit (misalnya, untuk memuat ekstensi Chrome)
ctx = launch_persistent_context(
    "./my-profile",
    headless=False,
    args=[
        "--disable-extensions-except=./my-extension",
        "--load-extension=./my-extension",
    ],
)
```

Padanan asinkron: `await launch_persistent_context_async(...)`.

### Fungsi utilitas dan diagnostik (Python)

```python
from ombrabrowser import (
    binary_info,
    build_launch_options,
    check_engine_health,
    clear_cache,
    ensure_binary,
    last_launch_info,
    launch,
)

# Periksa biner mesin yang ditemukan
print(binary_info())
# {'version': '158.0.8127.37-3', 'platform': 'macos-arm64',
#  'path': '…', 'installed': True, 'source': 'cache', 'sha256': '…'}

# Unduh dan verifikasi mesin tanpa meluncurkan browser
ensure_binary(version="158.0.8127.37-3")

# Hapus biner mesin yang dikelola SDK (profil di ~/.ombra/profiles tidak disentuh)
clear_cache()

# Periksa perintah peluncuran hasil resolusi tanpa menjalankan Chromium
cmd = build_launch_options(profile="pricing-eu", humanize=True)

# Baca metadata runtime (port CDP, ws_url, seed, pid) dan periksa kesehatan proses
browser = launch()
print(last_launch_info(browser))
check_engine_health(browser)
browser.close()
```

### CLI (Python)

```bash
ombrabrowser install                             # unduh dan verifikasi mesin (Ed25519 + SHA-256)
ombrabrowser install --version 158.0.8127.37-3  # instal build mesin tertentu
ombrabrowser info                                # diagnostik lingkungan, biner, dan dependensi (alias: doctor)
ombrabrowser info --quick --json                 # laporan cepat yang mudah dibaca mesin tanpa menjalankan biner
ombrabrowser info --proxy socks5://user:pass@host:1080  # uji resolusi IP keluar, zona waktu, dan locale lewat proksi
ombrabrowser update                              # periksa saluran rilis dan perbarui mesin di cache
ombrabrowser clear-cache                         # bersihkan cache biner mesin (profil tetap dipertahankan)
ombrabrowser login                               # simpan kunci lisensi ke ~/.ombra/license.key (khusus build lama)
ombrabrowser logout                              # hapus kunci lisensi yang tersimpan
```

Perintah yang sama juga tersedia melalui `python -m ombrabrowser <command>`.

## API Node.js dan TypeScript

`@ombralabs/sdk` menyediakan build ganda ESM + CommonJS lengkap dengan definisi TypeScript (`.d.ts`). Baik Playwright maupun Puppeteer berjalan di atas mesin yang sama.

### Playwright (default)

```ts
import { launch, launchContext, launchPersistentContext } from "@ombralabs/sdk";

// Peluncuran dasar dengan proksi, fingerprint, dan simulasi input
const browser = await launch({
  profile: "pricing-eu",
  proxy: "socks5://user:pass@residential-proxy:1080",
  fingerprint: {
    seed: 20261116,
    os: "macos",
    timezone: "auto",
    locale: "auto",
    screen: { width: 1440, height: 900 },
  },
  headless: false,
  humanize: { preset: "careful" },
});

// Peluncuran praktis: browser + konteks dalam satu panggilan
const context = await launchContext({
  proxy: "socks5://user:pass@residential-proxy:1080",
  fingerprint: { timezone: "auto", locale: "auto" },
  headless: false,
  humanize: true,
  contextOptions: { storageState: "state.json" },
});
const page = await context.newPage();

// Profil persisten — cookie, localStorage, dan seed tetap terjaga antar sesi
const persistentCtx = await launchPersistentContext({
  userDataDir: "./chrome-profile",
  headless: false,
  humanize: true,
});
```

> Setiap cuplikan di atas berdiri sendiri. Untuk memigrasi peluncur Playwright yang sudah ada, Anda juga dapat mengganti pernyataan impor menjadi `import * as chromium from "@ombralabs/sdk"` dan tetap mempertahankan `await chromium.launch(...)`.

### Puppeteer

Gunakan `launchPuppeteer()` dari `@ombralabs/sdk` atau impor dari `@ombralabs/sdk/puppeteer`:

```ts
import { launch } from "@ombralabs/sdk/puppeteer";

const browser = await launch({
  proxy: "socks5://user:pass@residential-proxy:1080",
  fingerprint: { timezone: "auto", locale: "auto" },
  headless: false,
  humanize: true,
});
const page = await browser.newPage();
await page.goto("https://example.com");
await browser.close();
```

> **Catatan tentang Puppeteer:** Puppeteer mengirim lalu lintas CDP default lebih banyak dibandingkan Playwright yang menggunakan `connectOverCDP({ noDefaults: true })`. Untuk situs dengan pemeriksaan CDP yang ketat, Playwright lebih disarankan.

### Utilitas dan CLI (Node.js)

```ts
import {
  binaryInfo,
  buildLaunchOptions,
  checkEngineHealth,
  clearCache,
  ensureBinary,
  lastLaunchInfo,
} from "@ombralabs/sdk";

console.log(await binaryInfo());
await ensureBinary({ version: "158.0.8127.37-3" });
await clearCache();
```

```bash
npx --no-install ombra-sdk install [--version <v>] [--channel <stable|beta>]
npx --no-install ombra-sdk info [--quick] [--json] [--proxy <url>]
npx --no-install ombra-sdk doctor
npx --no-install ombra-sdk update [--channel <stable|beta>]
npx --no-install ombra-sdk clear-cache
npx --no-install ombra-sdk login [<license-key>]
npx --no-install ombra-sdk logout
```

## Input seperti manusia

Di Ombra, simulasi input (`humanize`) dikompilasi **secara native ke dalam proses browser Chromium** (didukung oleh `cursory-rs` dan penjadwal input mesin), bukan diimplementasikan sebagai pembungkus JS di atas klien otomatisasi. Artinya:

- Setiap aksi standar Playwright dan Puppeteer (`page.click()`, `page.fill()`, `page.type()`, `page.mouse.*`, `page.keyboard.*`, `locator.*`, `ElementHandle.*`) mengalir melalui satu antrean input per tab di dalam browser.
- Parameter perilaku diturunkan secara deterministik dari `seed` profil (`--fingerprint-humanize-seed`).
- SDK tidak pernah membungkus `Page` atau `Browser` dalam kelas proxy — tipe native dan perilaku klien tetap utuh.

```python
browser = launch(humanize=True)
page = browser.new_page()
page.goto("https://example.com")
page.locator("#email").fill("user@example.com")
page.locator("button[type=submit]").click()
```

**Apa yang berubah saat `humanize=True`:**

| Aksi | Tanpa `humanize` | Dengan `humanize=True` |
|---|---|---|
| Pergerakan mouse | Teleportasi instan | Kurva `cursory-rs` dengan akselerasi, jeda, dan sedikit overshoot |
| Klik dan seret (drag) | Tekanan instan | Titik bidik di dalam target, jeda pra-klik, dan durasi tahan |
| Input teks | Pengisian nilai instan | Pengetikan per karakter dengan irama dan tata letak keyboard terkonfigurasi, sesekali salah ketik beserta koreksi otomatis; teks sangat panjang ditempel melalui clipboard terisolasi tanpa menyentuh clipboard sistem |
| Pengguliran (scroll) | Satu lompatan tunggal | Rangkaian event roda mouse/trackpad mengikuti profil perlambatan terukur |
| Interval diam (idle) | Kursor statis | Pada preset `careful`, pergeseran halus kursor saat diam di antara aksi |

**Preset** — `default` (kecepatan normal), `careful` (lebih lambat, cermat, dengan gerakan mikro saat diam), dan `fast` (kecepatan lebih tinggi). Teruskan `humanize=False` (`humanize: false`) untuk menonaktifkan simulasi input secara eksplisit.

```python
browser = launch(humanize={"preset": "careful"})
```

```ts
const browser = await launch({ humanize: { preset: "careful" } });
```

Anda dapat mengaktifkan/menonaktifkan mode atau mengganti preset saat runtime tanpa memulai ulang browser melalui domain CDP `Ombra`:

```python
from ombrabrowser import ombra_cdp

with ombra_cdp(browser) as cdp:
    cdp.set_humanize(enabled=True, preset="careful")
    print(cdp.get_humanize_state())
```

```ts
import { ombraCdp } from "@ombralabs/sdk";

const cdp = await ombraCdp(browser);
await cdp.setHumanize({ enabled: true, preset: "careful" });
console.log(await cdp.getHumanizeState());
```

## Manajemen fingerprint dan profil

Mesin menurunkan konfigurasi browser yang koheren dari satu `seed` tunggal. Ketika `seed` tidak disertakan:

| Skenario | Perilaku |
|---|---|
| **`launch()` tanpa profil** | SDK menghasilkan `seed` acak untuk sesi tersebut dan membuat direktori sementara yang dihapus setelah `close()`. |
| **`profile="name"` atau `user_data_dir="./dir"`** | `seed` disimpan ke `.ombra/profile.json` dan digunakan kembali di setiap peluncuran — situs melihat pengunjung yang kembali dengan perangkat dan cookie yang sama. |
| **`fingerprint={"seed": N, ...}`** | Fingerprint deterministik dari `seed` eksplisit; field tambahan mengganti pengaturan tertentu sambil menjaga konsistensi sisanya. |

Noise canvas/audio dikunci per `eTLD+1` (stabil di situs yang sama, tidak dapat dikaitkan antar situs berbeda). Noise piksel untuk canvas 2D dan WebGL `readPixels` dinonaktifkan secara default untuk menghindari pemicuan detektor "Canvas Tampering / Masking", dan dapat diaktifkan secara eksplisit melalui `--fingerprint-pixel-noise`.

> **Tips:** saat mengunjungi kembali situs yang sama, gunakan profil persisten (`profile="name"` atau `launch_persistent_context()`) daripada meneruskan `seed` tetap ke `launch()` sementara — dengan begitu cookie, cache, dan `localStorage` tetap konsisten bersama fingerprint.

### Field objek `fingerprint`

Nama field di bawah mengikuti konvensi Python (`snake_case`); Node.js menerima baik `camelCase` (`osVersion`, `hardwareConcurrency`, `deviceMemory`) maupun `snake_case`:

| Field | Tipe | Deskripsi |
|---|---|---|
| `seed` | `int` (`>= 0`) | Seed generator yang menentukan keseluruhan konfigurasi fingerprint |
| `os` | `"macos"` \| `"windows"` \| `"linux"` | OS target (`navigator.platform`, UA, kumpulan GPU dan font) |
| `os_version` | `string` | Petunjuk versi OS untuk Client Hints |
| `timezone` | Zona IANA atau `"auto"` | Zona waktu (misalnya `"Europe/Berlin"`). `"auto"` menentukan zona dari titik keluar proksi via GeoIP |
| `locale` | BCP-47 atau `"auto"` | Locale (`Accept-Language`, `navigator.languages`, ICU `Intl`). `"auto"` menentukan locale dari titik keluar proksi |
| `screen` | `{"width", "height"}` atau `"auto"` | Dimensi layar dan area kerja dengan memperhitungkan taskbar / menu bar OS target |
| `gpu` | `{"vendor", "renderer"}` atau `"auto"` | String eksplisit WebGL `UNMASKED_VENDOR` / `UNMASKED_RENDERER` |
| `hardware_concurrency` | `int` atau `"auto"` | Nilai `navigator.hardwareConcurrency` yang dilaporkan |
| `device_memory` | `int` atau `"auto"` | Nilai `navigator.deviceMemory` yang dilaporkan (dalam GB) |
| `noise` | `bool` | Aktifkan/nonaktifkan noise fingerprint (`False` meneruskan `--disable-fingerprint-noise`) |

> Pertahankan `seed` sebagai sumber utama parameter fingerprint: mengganti nilai individual tanpa menjaganya tetap selaras (seperti memasangkan OS dengan GPU yang tidak kompatibel) dapat menimbulkan kontradiksi bagi detektor.

### Flag mesin tambahan (`args`)

Flag yang didukung oleh mesin tetapi tidak diatur otomatis oleh SDK (teruskan melalui `args=[...]`):

| Flag | Tujuan |
|---|---|
| `--fingerprint-brand=chrome\|edge\|opera\|vivaldi` | Merek browser di `Sec-CH-UA` (SDK secara default menggunakan `chrome`) |
| `--fingerprint-tls-profile=chrome-<major>` | Profil TLS ClientHello yang cocok dengan versi mayor Chrome tertentu (diatur otomatis oleh SDK dari versi mesin) |
| `--webrtc-ip=<ip>` | Ganti alamat IP dalam kandidat ICE WebRTC tanpa mengirim lalu lintas STUN asli |
| `--fingerprint-location=<lat,lon>` | Koordinat yang dilaporkan oleh `navigator.geolocation` |
| `--fingerprint-storage-quota=<MB>` | Kuota penyimpanan yang dilaporkan oleh `navigator.storage.estimate()` |
| `--fingerprint-max-touch-points=<N>` | Jumlah titik sentuh (`navigator.maxTouchPoints` dan media query pointer) |
| `--fingerprint-device-pixel-ratio=<ratio>` | Kerapatan piksel layar (`window.devicePixelRatio`) |
| `--fingerprint-color-depth=<bits>` | Kedalaman warna layar |
| `--disable-gpu-fingerprint` | Teruskan GPU asli milik host (string, batas, dan ekstensi WebGL/WebGPU) |
| `--disable-gpu-string-spoof` | Teruskan string GPU asli sambil tetap mempertahankan pengaturan profil lainnya |
| `--disable-fingerprint-noise` | Nonaktifkan noise canvas/WebGL/audio sambil tetap menjaga parameter identitas aktif |
| `--fingerprint-pixel-noise` | Aktifkan noise piksel idempoten secara opt-in untuk canvas 2D dan `readPixels` |
| `--profile-label=<text>` | Label profil yang ditampilkan di bilah alamat browser (khusus UI; tidak terlihat oleh halaman web) |

### Pengaturan font di Linux

Server Linux minimal dan kontainer sering kali tidak memiliki font emoji dan CJK, sehingga perenderan teks canvas tersembunyi dan emoji menghasilkan hash yang tidak biasa.

**1. Lapisan dasar (emoji dan CJK):**

```bash
sudo apt-get update && sudo apt-get install -y \
    fonts-noto-color-emoji fonts-freefont-ttf fonts-unifont \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-tlwg-loma-otf
```

**2. Font Windows untuk profil Windows (`os="windows"`):**
Saat menjalankan konfigurasi Windows di Linux, menginstal font asli dari `C:\Windows\Fonts\` (termasuk `Segoe UI`, `Calibri`, `Consolas`, `Courier New`, `Arial`, `Times New Roman`, `MS UI Gothic`) secara signifikan meningkatkan koherensi enumerasi font:

```bash
mkdir -p ~/.local/share/fonts/windows
cp -r /path/to/windows/Fonts/. ~/.local/share/fonts/windows/
fc-cache -f
```

**3. Font macOS untuk profil macOS (`os="macos"`):**
Demikian pula, saat menggunakan `os="macos"` di Linux, salin font dari `/System/Library/Fonts/`, `/System/Library/Fonts/Supplemental/`, dan `/Library/Fonts/` ke dalam `~/.local/share/fonts/mac/` lalu jalankan `fc-cache -f`.

Di dalam `Dockerfile`, tempatkan font pada direktori sistem `/usr/local/share/fonts/`:

```dockerfile
COPY windows-fonts/ /usr/local/share/fonts/windows/
RUN fc-cache -f
```

## Opsi peluncuran, konfigurasi, dan error

### Opsi `launch()`

Nama opsi mengikuti API Python dan [kontrak SDK](../../docs/sdk-contract.md); Node.js menggunakan padanan `camelCase` (`timeoutMs`, `userDataDir`, `binaryPath`, `licenseKey`) dan juga menerima alias `snake_case`. Opsi yang tidak dikenal akan ditolak dengan `InvalidOptionError`.

| Opsi | Default | Deskripsi |
|---|---|---|
| `headless` | `true` | Jalankan tanpa jendela (`--headless=new`) |
| `proxy` | tidak ada | URL proksi (`http`, `https`, `socks5`) atau objek; proksi terautentikasi menggunakan relay loopback |
| `fingerprint` | tidak ada | Pengaturan untuk `seed`, OS, zona waktu, locale, layar, GPU, memori, dan noise |
| `profile` | tidak ada | Profil persisten bernama di `~/.ombra/profiles/<slug>` (tidak dapat digabungkan dengan `user_data_dir`) |
| `user_data_dir` | sementara | Path direktori profil eksplisit (tidak dapat digabungkan dengan `profile`) |
| `args` | `[]` | Argumen Chromium tambahan (diteruskan apa adanya) |
| `binary_path` | diresolusi | Path eksplisit menuju berkas eksekusi mesin |
| `version` | env / otomatis | Penyematan versi mesin (misalnya `158.0.8127.37-3`), menimpa `OMBRA_VERSION` |
| `timeout_ms` | `30000` | Batas waktu untuk startup mesin dan koneksi CDP (1000–600000 ms) |
| `humanize` | default mesin | `False`, `True`, atau `{"preset": "default" \| "careful" \| "fast"}` |
| `license_key` | env / berkas | Kunci untuk build berlisensi versi lama (tidak diperlukan di `158.0.8127.37-3+`; tidak pernah dicatat di log) |
| `env` | `{}` | Variabel lingkungan tambahan untuk proses mesin |
| `download` | `True` | Izinkan pengunduhan otomatis biner mesin yang belum tersedia |

### Variabel lingkungan

Urutan prioritas: **opsi peluncuran eksplisit → variabel lingkungan → metadata profil → default**.

| Variabel | Default | Deskripsi |
|---|---|---|
| `OMBRA_BINARY_PATH` | tidak disetel | Path eksplisit ke biner mesin |
| `OMBRA_CACHE_DIR` | `~/.ombra` | Direktori untuk cache mesin dan profil bernama |
| `OMBRA_DOWNLOAD_URL` | `https://api.github.com/repos/ombralabs/ombra/releases` | URL dasar / mirror untuk unduhan mesin (`none`/`off` menonaktifkan unduhan) |
| `OMBRA_VERSION` | versi kompatibel terbaru | Versi mesin yang disematkan (misalnya `158.0.8127.37-3`) |
| `OMBRA_RELEASE_CHANNEL` | `stable` | Saluran rilis mesin: `stable` atau `beta` |
| `OMBRA_AUTO_UPDATE` | `true` | Periksa build mesin yang lebih baru saat peluncuran |
| `OMBRA_SKIP_CHECKSUM` | `false` | Khusus pengembangan lokal: menonaktifkan verifikasi SHA-256 (mencatat peringatan) |
| `OMBRA_LICENSE_KEY` | tidak disetel | Kunci untuk build berlisensi versi lama (tidak pernah dicatat di log) |
| `OMBRA_TIMEOUT_MS` | `30000` | Batas waktu peluncuran default (ms) |
| `OMBRA_LOG_LEVEL` | `warn` | Tingkat detail log: `error`, `warn`, `info`, `debug` |

### Error bertipe

Pada setiap kegagalan, SDK menghentikan proses mesin yang dijalankan, melepaskan kunci profil, dan melempar subkelas `OmbraError` yang membawa properti `kind` stabil serta `details` dengan data rahasia yang sudah disamarkan:

`InvalidOptionError` · `BinaryNotFoundError` · `DownloadFailedError` · `ChecksumMismatchError` · `UnsupportedPlatformError` · `UnsupportedEngineError` · `ProxyError` · `ProfileBusyError` · `LaunchTimeoutError` · `CDPConnectError` · `EngineExitedError` · `EngineCrashedError` · `LicenseError`

Taksonomi error lengkap dan aturan percobaan ulang (retry) didokumentasikan dalam [kontrak SDK (`docs/sdk-contract.md`)](../../docs/sdk-contract.md).

## Platform, integrasi, dan kontainer

### Platform dan runtime yang didukung

| Komponen | Dukungan | Catatan |
|---|---|---|
| **macOS ARM64 (Apple Silicon)** | ✅ | Build mandiri `158.0.8127.37-3`; Ombra Desktop ditandatangani dengan Developer ID dan dinotarisasi |
| **macOS x64 (Intel)** | — | Belum ada rilis Chromium 158 saat ini |
| **Linux x64** | ✅ | Build mandiri `158.0.8127.37-3`; memerlukan `xz-utils` (`xz`) untuk mengekstrak `.tar.xz` |
| **Windows x64** | ✅ | Build mandiri `158.0.8127.37-3` dan installer Ombra Desktop |
| **Python** | `3.10+` | Playwright `>=1.60,<2.0` diinstal secara otomatis bersama `ombrabrowser` |
| **Node.js** | `20+` | Playwright `>=1.60,<2.0` atau Puppeteer `>=22` (Puppeteer 25+ memerlukan Node.js `>=22.12`) |

### Integrasi framework dan agen AI

Ombra bekerja dengan alat otomatisasi atau framework agen AI apa pun yang menerima biner Chromium kustom atau terhubung melalui CDP (`browser-use`, `Crawl4AI`, `Crawlee`, `Scrapling`, `Stagehand`, `LangChain`, dan lainnya):

```python
# Opsi 1: dapatkan path biner terverifikasi dan argumen mesin untuk runner Anda sendiri
from ombrabrowser import build_launch_options

cmd = build_launch_options(profile="agent-1", humanize=True)
binary_path = cmd["binary_path"]
engine_args = cmd["args"]

# Opsi 2: luncurkan lewat Ombra SDK dan berikan endpoint CDP lokal ke framework Anda
from ombrabrowser import launch_async, last_launch_info

browser = await launch_async(profile="agent-1", humanize=True)
info = last_launch_info(browser)
ws_url = info["ws_url"]             # ws://127.0.0.1:<port>/devtools/browser/...
cdp_http = f"http://127.0.0.1:{info['cdp_port']}"
# Hubungkan framework Anda ke ws_url atau cdp_http — pengaturan fingerprint dan humanize
# berjalan di dalam mesin dan tetap aktif untuk klien CDP mana pun
```

### Menjalankan di Docker dan server Linux

Contoh `Dockerfile` yang mengunduh dan memverifikasi mesin terlebih dahulu saat membangun image:

```dockerfile
FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    xz-utils xvfb \
    fonts-noto-color-emoji fonts-freefont-ttf fonts-unifont \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-tlwg-loma-otf \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir ombrabrowser "ombrabrowser[geoip]" \
    && playwright install-deps chromium \
    && ombrabrowser install

WORKDIR /app
COPY your_script.py /app/
CMD ["python", "/app/your_script.py"]
```

> **Kontainer dan server web:**
> - Jika kontainer Anda tidak dapat menginisialisasi sandbox Chromium, teruskan `--no-sandbox` secara eksplisit melalui `args=["--no-sandbox"]` (SDK tidak pernah menambahkan flag ini secara otomatis).
> - Untuk menjalankan dengan `headless=False` pada server tanpa layar, gunakan `Xvfb` (lihat [di bawah](#pemecahan-masalah)).
> - Saat berjalan di bawah `uvicorn` dengan `uvloop`, teruskan `--loop asyncio` untuk menghindari hang pada pipe subproses.

## Pemecahan masalah

### Situs memblokir mode headless

Beberapa sistem anti-bot memeriksa perbedaan perilaku dan perenderan dalam mode headless meskipun sudah menggunakan patch C++. Jalankan dengan `headless=False` pada layar virtual menggunakan `Xvfb`:

```bash
sudo apt-get install -y xvfb
Xvfb :99 -screen 0 1920x1080x24 &
export DISPLAY=:99
```

Kemudian luncurkan dengan proksi SOCKS5/HTTP residensial, profil persisten, zona waktu/locale yang cocok, `headless=False`, dan `humanize=True`:

```python
context = launch_persistent_context(
    profile="site-eu",
    proxy="socks5://user:pass@residential-proxy:1080",
    fingerprint={"timezone": "auto", "locale": "auto"},
    headless=False,
    humanize=True,
)
```

Jika pemblokiran terus berlanjut di Linux, periksa [Pengaturan font di Linux](#pengaturan-font-di-linux).

### Situs selalu menampilkan tantangan di setiap kunjungan

Memanggil `launch()` tanpa `profile` selalu memulai dari direktori sementara yang kosong dengan `seed` baru setiap kali dijalankan, sehingga situs memperlakukan setiap sesi sebagai pengunjung baru tanpa cookie. Beralihlah ke `profile="..."` atau `launch_persistent_context(...)` agar cookie, `localStorage`, dan `seed` tetap terbawa antar sesi.

### `ProfileBusyError`

Profil bernama atau `user_data_dir` hanya dapat dibuka oleh satu proses dalam satu waktu. Tetapkan nama profil berbeda untuk setiap worker paralel (`profile=f"worker-{i}"`). Kunci usang yang tertinggal akibat proses yang crash akan dideteksi dan dibersihkan secara otomatis.

### Apakah saya perlu menjalankan `playwright install chromium`?

Tidak. Ombra menjalankan biner mesinnya sendiri dan tidak menggunakan Chromium bawaan Playwright. Di Linux, Anda hanya memerlukan pustaka sistem dan `xz-utils`:

```bash
sudo apt-get install -y xz-utils
playwright install-deps chromium
```

### Memperbarui, mengganti saluran rilis, dan melakukan rollback mesin

Perbarui SDK ke rilis terbaru:

```bash
python -m pip install -U ombrabrowser
npm install @ombralabs/sdk@latest
```

Uji saluran `beta` atau sematkan/kembalikan ke build mesin tertentu:

```python
# Sematkan build tertentu untuk satu peluncuran spesifik
browser = launch(version="158.0.8127.37-3")
```

```bash
# Atau konfigurasikan melalui variabel lingkungan / CLI
export OMBRA_VERSION=158.0.8127.37-3
export OMBRA_RELEASE_CHANNEL=beta
ombrabrowser install --version 158.0.8127.37-3

# Atau arahkan ke biner hasil build lokal
export OMBRA_BINARY_PATH=/path/to/ombra/chromium
```

### macOS: Gatekeeper memblokir build lokal

Rilis resmi Ombra untuk macOS Apple Silicon ditandatangani dengan sertifikat Apple Developer ID dan dinotarisasi. Jika Anda menjalankan build pengembang lokal tanpa tanda tangan dan macOS mengkarantinanya, bersihkan atribut karantina sekali saja:

```bash
xattr -cr ~/.ombra/engines/*/*.app
```

### Menunggu di halaman pada Python sinkron

Pada Playwright sinkron, satu panggilan `time.sleep(15)` yang panjang setelah `page.goto()` menghentikan sementara event loop Playwright, yang dapat membuat halaman verifikasi macet. Sebagai gantinya, tunggu dalam interval pendek dengan panggilan konteks yang ringan:

```python
import time

for _ in range(15):
    page.context.cookies()  # menjaga pemrosesan Playwright tetap berjalan tanpa menyentuh DOM halaman
    time.sleep(1)
```

Di Python asinkron gunakan `await asyncio.sleep(...)`; di Node.js gunakan `await new Promise(r => setTimeout(r, ms))`. Hindari juga pemanggilan `page.wait_for_timeout()` yang terlalu sering serta `page.evaluate()` yang tidak perlu sebelum pemeriksaan agar tidak menghasilkan lalu lintas CDP tambahan.

## Keamanan

- **Keaslian dan integritas mesin.** Sebelum ekstraksi, SDK memverifikasi tanda tangan Ed25519 dari amplop rilis terhadap kunci publik yang disematkan dan memeriksa digest SHA-256 baik untuk arsip maupun berkas eksekusi.
- **CDP khusus lokal.** Port debug terikat secara ketat ke `127.0.0.1`. Jangan pernah mengekspos port CDP ke jaringan publik tanpa autentikasi tambahan — CDP memberikan kendali penuh atas browser.
- **Isolasi data rahasia.** Kredensial proksi hanya hidup di memori relay loopback lokal dan tidak pernah muncul pada baris perintah proses, metadata profil, log, atau detail error.
- **Tanpa telemetri.** SDK tidak mengirimkan analitik, laporan crash, atau ping jaringan tersembunyi.

Laporkan masalah keamanan secara privat sesuai dengan [SECURITY.md](../../SECURITY.md).

## Peta repositori

```text
.
├── README.md                    # README utama (Bahasa Inggris)
├── translations/
│   ├── id/README.md             # berkas ini (Bahasa Indonesia)
│   ├── ru/README.md             # terjemahan Bahasa Rusia
│   └── <locale>/README.md       # 19 lokalisasi lainnya
├── desktop/                     # Ombra Desktop (Tauri: katalog Rust + UI Vue)
├── docs/
│   ├── architecture.md          # arsitektur, batas kepercayaan, siklus hidup
│   ├── sdk-contract.md          # kontrak peluncuran v0.2, opsi, error, invarian
│   ├── stealth-checkup.md       # metode pemeriksaan stealth (Bahasa Inggris)
│   ├── stealth-checkup.ru.md    # metode pemeriksaan stealth (Bahasa Rusia)
│   ├── versioning.md            # pembuatan versi SDK, mesin, dan klien
│   └── desktop/                 # panduan profil lokal dan kunci untuk Desktop
├── spec/
│   └── schemas/                 # JSON Schema untuk opsi peluncuran dan metadata biner
├── sdks/
│   ├── manifest.json            # registri SDK yang dapat dibaca mesin
│   ├── README.md                # tata letak SDK dan aturan kontribusi
│   ├── python/                  # SDK Python (dipublikasikan sebagai ombrabrowser)
│   ├── node/                    # SDK Node.js / TypeScript (dipublikasikan sebagai @ombralabs/sdk)
│   └── ...                      # kerangka awal kontrak untuk bahasa lain (Go, Rust, C#, Java, PHP, Ruby)
├── conformance/                 # kasus uji peluncuran dan invarian stealth lintas bahasa
├── tools/check_repo.py          # validator struktur, skema, dan tautan (CI)
└── .github/workflows/ci.yml
```

Repositori ini menghosting kontrak SDK, skema, kasus uji conformance, dokumentasi, dan kode sumber Ombra Desktop. Patch mesin Chromium dikelola di repositori terpisah, dengan build terkompilasi dipublikasikan melalui saluran unduhan dan [GitHub Releases](https://github.com/ombralabs/ombra/releases).

## FAQ

### Apakah ini fork dari Playwright?

Tidak. SDK menghubungkan klien Playwright (atau Puppeteer) resmi ke Ombra Chromium melalui CDP lokal. Semua tipe, locator, mekanisme tunggu, dan objek halaman tetap standar.

### Apakah Ombra gratis, dan apakah saya memerlukan kunci lisensi?

Kode sumber SDK di repositori ini bersifat open source di bawah Lisensi Apache 2.0. Build mesin terkini (`158.0.8127.37-3` dan yang lebih baru) serta manajer profil lokal Ombra Desktop (`desktop-v1.2.2`) berjalan gratis dan mandiri — tanpa akun, kunci lisensi, ID perangkat keras, atau batasan jumlah profil. `license_key` dan `OMBRA_LICENSE_KEY` hanya diperlukan untuk build berlisensi versi lama.

### Apakah saya perlu menginstal Ombra Desktop untuk menggunakan SDK?

Tidak. SDK menjalankan mesin secara langsung sebagai proses anak, sehingga cocok untuk skrip, kontainer, dan CI. Ombra Desktop bersifat opsional jika Anda ingin mengelola katalog profil lokal melalui GUI.

### Bagaimana perbedaan Ombra dengan `playwright-stealth`?

`playwright-stealth` menyuntikkan JavaScript ke halaman di atas browser biasa, dan detektor modern sering mengenali patch itu sendiri. Ombra mengompilasi modifikasinya ke dalam kode sumber Chromium, dan SDK tidak menyuntikkan skrip apa pun ke halaman.

### Bisakah saya menggunakan proksi saya sendiri?

Ya. Teruskan proksi `http://`, `https://`, atau `socks5://` pada opsi `proxy`. Jika terdapat kredensial, SDK menjalankan relay loopback lokal sehingga kredensial tidak pernah muncul di argumen proses. Perlu dicatat bahwa klien `context.request` / `page.request` bawaan Playwright dapat melewati pengaturan proksi tingkat browser — untuk memastikan lalu lintas melewati proksi, panggil `fetch()` dari konteks halaman.

### Versi Playwright dan Puppeteer mana yang didukung?

SDK Python memerlukan Playwright `>=1.60,<2.0` (diinstal secara otomatis bersama `ombrabrowser`). SDK Node.js mendukung `playwright-core@^1.60.0` atau `puppeteer-core >=22.0.0`. Lihat [panduan pembuatan versi](../../docs/versioning.md) untuk aturan kompatibilitas.

### Apakah Ombra menjamin lolos dari semua pemeriksaan bot?

Tidak. Deteksi merupakan target yang terus bergerak dan bergantung pada situs, wilayah, reputasi IP, riwayat profil, serta versi detektor. Gunakan [metode pemeriksaan stealth](../../docs/stealth-checkup.md) untuk mengukur dan melacak konfigurasi tertentu secara objektif.

### Untuk kasus penggunaan apa Ombra dirancang?

Ombra dirancang untuk otomatisasi berizin, pengujian QA, pemantauan, riset, serta pengelolaan profil kerja yang terisolasi. Akses tidak sah, credential stuffing, dan penyalahgunaan tidak didukung.

## Berkontribusi

Panduan kontribusi tersedia di [CONTRIBUTING.md](../../CONTRIBUTING.md), standar komunitas di [CODE_OF_CONDUCT.md](../../CODE_OF_CONDUCT.md), dan petunjuk SDK di [sdks/README.md](../../sdks/README.md).

- Perbarui [kontrak SDK](../../docs/sdk-contract.md) dan [skema](../../spec/schemas) sebelum menambahkan opsi peluncuran baru.
- Saat mengubah perilaku SDK, perbarui implementasi, pengujian, dan kasus uji bersama di [conformance](../../conformance/README.md).
- Jalankan `python3 tools/check_repo.py` sebelum membuka pull request untuk memvalidasi tata letak repositori dan tautan.

## Lisensi

Kode sumber SDK di repositori ini dilisensikan di bawah [Lisensi Apache 2.0](../../LICENSE). Lisensi ini tidak memberikan hak atas merek dagang Ombra, mesin Ombra Chromium, atau Ombra Desktop — lihat [NOTICE](../../NOTICE) untuk ketentuan merek dagang dan pihak ketiga.

## Tautan

- 🌐 **Situs web** — [ombrabrowser.dev](https://ombrabrowser.dev)
- 📦 **PyPI** — [pypi.org/project/ombrabrowser](https://pypi.org/project/ombrabrowser/)
- 📦 **npm** — [npmjs.com/package/@ombralabs/sdk](https://www.npmjs.com/package/@ombralabs/sdk)
- 🚀 **Rilis (mesin & Desktop)** — [GitHub Releases](https://github.com/ombralabs/ombra/releases)
- 📋 **Catatan perubahan** — [CHANGELOG.md](../../CHANGELOG.md)
- 🐛 **Bug & permintaan fitur** — [GitHub Issues](https://github.com/ombralabs/ombra/issues)
- 🏢 **Organisasi** — [Ombra Labs](https://github.com/ombralabs)
