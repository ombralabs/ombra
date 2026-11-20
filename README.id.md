# <img src="assets/logo.svg" width="24" height="24" alt=""> Ombra SDKs

Di Python dan Node.js, `launch()` menjalankan Ombra Chromium dan mengembalikan objek `Browser` dari Playwright. Untuk Puppeteer di Node.js, gunakan `launchPuppeteer()`.

**[Instalasi](#instalasi)** · <a href="README.md">English</a>

<details>
<summary>Bahasa</summary>

[English](README.md) · [Русский](README.ru.md) · [Deutsch](README.de.md) · [Español](README.es.md) ·
[Français](README.fr.md) · [Italiano](README.it.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) ·
[Português](README.pt.md) · [Română](README.ro.md) · [Türkçe](README.tr.md) · [Українська](README.uk.md) ·
[Tiếng Việt](README.vi.md) · [Bahasa Indonesia](README.id.md) · [简体中文](README.zh-Hans.md) · [繁體中文](README.zh-Hant.md) ·
[日本語](README.ja.md) · [한국어](README.ko.md) · [ไทย](README.th.md) · [हिंदी](README.hi.md) ·
[Filipino](README.fil.md) · [ខ្មែរ](README.km.md)

</details>

## Kontrol fingerprint di Chromium

Kontrol fingerprint Ombra diterapkan langsung di Chromium. Cakupannya meliputi canvas, WebGL, audio, font, jumlah prosesor logis, posisi dan ukuran elemen halaman, identitas GPU, zona waktu, dan sinyal otomasi. Mesin memakai implementasi TLS dan HTTP/2 milik Chromium. Masukan yang meniru tindakan pengguna diproses di dalam proses browser.

SDK menjalankan mesin secara lokal dan menghubungkan klien otomasi melalui Chrome DevTools Protocol (CDP). Anda bisa menjalankannya dari skrip, kontainer, atau CI tanpa memasang aplikasi desktop Ombra.

## Status

Contoh berikut menggunakan paket alfa Python dan Node.js yang sudah diterbitkan. Repositori ini juga memuat kontrak peluncuran bersama dan kerangka untuk delapan SDK.

| Komponen | Status |
|---|---|
| [Kontrak API SDK](docs/sdk-contract.md) | Draf `0.1.0` |
| SDK Python | `0.1.3` alfa · [`ombrabrowser` (PyPI)](https://pypi.org/project/ombrabrowser/) |
| SDK Node.js | `0.1.0` alfa · [`@ombralabs/sdk` (npm)](https://www.npmjs.com/package/@ombralabs/sdk) |
| [Skema bersama](spec/schemas) | Opsi peluncuran dan metadata biner mesin |
| [Kesesuaian lintas bahasa](conformance) | Kasus uji yang dipakai kedua SDK |
| [Pemeriksaan stealth](docs/stealth-checkup.md) | Kriteria pengujian dan templat laporan |

## Instalasi

**Python**

```bash
python -m pip install ombrabrowser
```

**Node.js / TypeScript**

```bash
npm install @ombralabs/sdk "playwright-core@^1.60.0"
```

Untuk Puppeteer, pasang `puppeteer-core` sebagai pengganti `playwright-core`. Versi klien dan Node.js yang didukung tercantum di [halaman paket npm](https://www.npmjs.com/package/@ombralabs/sdk).

SDK memeriksa jalur yang diberikan lewat `binary_path` di Python atau `binaryPath` di Node.js. Berikutnya, SDK memeriksa `OMBRA_BINARY_PATH`, direktori mesin aplikasi desktop, lalu cache SDK. Jika mesin tidak ditemukan, SDK mengunduh dan memverifikasinya.

Untuk menonaktifkan unduhan, gunakan `download=False` di Python atau `download: false` di Node.js. Untuk menyiapkan mesin tanpa membuka browser, panggil `ensure_binary()` di Python atau `ensureBinary()` di Node.js.

## Mulai cepat

**Python**

```python
from ombrabrowser import launch

browser = launch()
page = browser.new_page()
page.goto("https://example.com")
print(page.title())
browser.close()
```

Buka halaman di konteks yang sudah ada pada profil bernama agar cookie dan data situs dapat dipakai kembali. Contoh ini juga menetapkan proxy.

```python
browser = launch(
    profile="pricing-eu",
    headless=False,
    proxy="socks5://user:pass@proxy:1080",
    fingerprint={"seed": 20261116, "os": "macos"},
)
page = browser.contexts[0].new_page()
page.goto("https://example.com")
browser.close()
```

**Node.js / TypeScript**

```ts
import { launch } from "@ombralabs/sdk";

const browser = await launch();
const page = await browser.newPage();
await page.goto("https://example.com");
console.log(await page.title());
await browser.close();
```

Panggil `launchPuppeteer()` untuk mendapatkan objek `Browser` dari Puppeteer.

```ts
import { launchPuppeteer } from "@ombralabs/sdk";

const browser = await launchPuppeteer({ headless: false });
await browser.close();
```

## Migrasi tanpa penulisan ulang

Untuk memindahkan skrip Python dari Playwright, pasang `ombrabrowser`, lalu ubah impor dan panggilan yang menjalankan browser. Metode halaman, tipe, dan selektor tetap berasal dari Playwright.

```diff
- from playwright.sync_api import sync_playwright
- pw = sync_playwright().start()
- browser = pw.chromium.launch()
+ from ombrabrowser import launch
+ browser = launch()

  page = browser.new_page()
  page.goto("https://example.com")
```

Di Node.js, cukup ganti dua baris.

```diff
- import { chromium } from "playwright";
- const browser = await chromium.launch();
+ import { launch } from "@ombralabs/sdk";
+ const browser = await launch();
```

## Cara kerja

```mermaid
flowchart LR
    Script["Skrip Anda<br/>Playwright · Puppeteer"]
    SDK["Ombra SDK<br/>launch() + jembatan CDP"]
    Engine["Ombra Chromium<br/>mesin yang di-patch"]
    Client["Klien otomasi native"]
    Profile[("Profil<br/>seed · cookie · ekstensi")]

    Script -->|launch()| SDK
    SDK -->|jalankan| Engine
    SDK -->|hubungkan melalui CDP| Client
    Script --> Client
    Client -->|CDP| Engine
    Engine --> Profile
```

1. `launch()` mencari atau mengunduh mesin, lalu memverifikasi berkas binernya.
2. SDK memilih direktori dan seed profil. Jika proxy memerlukan autentikasi, SDK menjalankan relai lokal.
3. SDK menjalankan Chromium dengan profil, opsi peluncuran, dan port debug pada antarmuka loopback.
4. Setelah `DevToolsActivePort` siap, SDK menghubungkan Playwright atau Puppeteer lewat CDP dan mengembalikan `Browser` milik klien tersebut.
5. `browser.close()` menghentikan mesin dan melepaskan kunci profil.

Setelah itu, klien mengirim perintah halaman langsung ke Chromium.

## Matriks SDK

| Runtime | Paket terbitan | Objek browser |
|---|---|---|
| Python 3.10+ | `ombrabrowser` | `launch()` → Playwright `Browser` |
| Node.js 20+ | `@ombralabs/sdk` | `launch()` → Playwright `Browser`<br>`launchPuppeteer()` → Puppeteer `Browser` |

Enam SDK lain masih berupa kerangka. [Manifes SDK](sdks/manifest.json) mencatat rencana nama paket, runtime, dan klien. [Panduan SDK](sdks/README.md) menjelaskan struktur direktorinya.

| Target runtime | Rencana paket | Klien atau tipe hasil |
|---|---|---|
| .NET 8+ | `Ombra` (NuGet) | Microsoft.Playwright `IBrowser` |
| Java 17+ | `dev.ombra:ombra` (Maven Central) | Playwright `Browser` |
| Go 1.22+ | `github.com/ombralabs/ombra/sdks/go` | chromedp |
| PHP 8.2+ | `ombralabs/ombra` (Packagist) | `Ombra\Browser` (CDP) |
| Ruby 3.2+ | `ombra` (RubyGems) | `Ferrum::Browser` |
| Rust 1.78+ | `ombra` (crates.io) | `chromiumoxide::Browser` |

## Opsi peluncuran

Nama opsi di bawah mengikuti API Python dan kontrak SDK. Di Node.js, nama yang setara ditulis dalam camelCase, misalnya `timeoutMs`, `userDataDir`, dan `binaryPath`.

| Opsi | Bawaan | Keterangan |
|---|---|---|
| `headless` | `true` | Menjalankan mesin tanpa jendela |
| `proxy` | tidak ada | URL atau objek proxy; proxy dengan autentikasi menggunakan relay loopback |
| `fingerprint` | tidak ada | Seed dan pengaturan untuk OS, zona waktu, lokal, layar, dan GPU |
| `profile` | tidak ada | Profil bernama dengan cookie, penyimpanan, dan seed yang persisten |
| `user_data_dir` | sementara | Direktori profil eksplisit, saling eksklusif dengan `profile` |
| `args` | `[]` | Flag mesin tambahan, diteruskan tanpa perubahan |
| `timeout_ms` | `30000` | Batas waktu peluncuran dan koneksi CDP, dalam milidetik |
| `humanize` | bawaan mesin | `false`, `true`, atau preset |
| `captcha` | `false` | Mengaktifkan modul mesin dengan batas opsional |
| `binary_path` | ditentukan | Menggunakan biner mesin tertentu |
| `download` | `true` | Mengunduh biner mesin yang tidak ada |

[Kontrak SDK](docs/sdk-contract.md) memuat semua opsi peluncuran, jenis kesalahan, dan aturan untuk profil.

## Manajemen biner

```python
from ombrabrowser import binary_info, ensure_binary, clear_cache

print(binary_info())
# {'version': '151.0.7922.108', 'platform': 'macos-arm64',
#  'path': '…', 'installed': True, 'source': 'cache', 'sha256': '…'}

ensure_binary()   # unduh dan periksa mesin tanpa menjalankannya
clear_cache()     # hapus mesin yang diunduh dan pertahankan profil
```

Sebelum peluncuran, SDK memeriksa checksum SHA-256 mesin. Biarkan pemeriksaan ini aktif di lingkungan produksi. `OMBRA_SKIP_CHECKSUM=1` khusus untuk build pengembangan lokal.

## Konfigurasi

| Variabel | Bawaan | Keterangan |
|---|---|---|
| `OMBRA_BINARY_PATH` | tidak diatur | Biner mesin eksplisit |
| `OMBRA_CACHE_DIR` | `~/.ombra` | Biner yang dikelola dan profil bernama |
| `OMBRA_DOWNLOAD_URL` | endpoint rilis | URL dasar untuk unduhan biner |
| `OMBRA_VERSION` | kompatibel terbaru | Versi mesin yang akan ditentukan |
| `OMBRA_AUTO_UPDATE` | `true` | Memeriksa mesin yang lebih baru saat peluncuran |
| `OMBRA_SKIP_CHECKSUM` | `false` | Hanya untuk pengembangan |
| `OMBRA_LICENSE_KEY` | tidak diatur | Diteruskan ke mesin |
| `OMBRA_TIMEOUT_MS` | `30000` | Batas waktu peluncuran bawaan, dalam milidetik |
| `OMBRA_LOG_LEVEL` | `warn` | `error`, `warn`, `info`, `debug` |

Prioritas: opsi eksplisit, lalu variabel lingkungan, lalu metadata profil, lalu nilai bawaan.

## Perbandingan

| Aspek | Playwright | playwright-stealth | undetected-chromedriver | Ombra |
|---|---|---|---|---|
| API | Playwright | Playwright | Selenium | Playwright atau Puppeteer |
| Tingkat patch | tidak ada | JavaScript di halaman | flag konfigurasi | kode sumber mesin |
| Seed fingerprint | tidak | tidak | sebagian | per profil |
| Input yang menyerupai manusia | tidak | tidak | tidak | mesin |
| Isolasi profil | konteks browser | konteks browser | tidak | direktori data pengguna |
| Migrasi tanpa penulisan ulang | — | perubahan impor | penulisan ulang | perubahan impor |

Hasil deteksi bergantung pada situs, IP keluar, dan profil. [Prosedur pemeriksaan](docs/stealth-checkup.md) menjelaskan cara mengukurnya.

## Stealth adalah properti mesin

Mesin menerapkan pengaturan fingerprint. SDK meneruskan seed profil dan opsi peluncuran eksplisit kepadanya.

| Lapisan | Tempat Ombra menanganinya |
|---|---|
| TLS dan HTTP/2 | Tumpukan jaringan milik Chromium sendiri, disesuaikan versinya dengan build mesin |
| Identitas browser | Patch mesin pada tingkat kode sumber yang dikendalikan oleh seed profil |
| Permukaan otomasi | Patch mesin untuk sinyal WebDriver; SDK tidak memanggil `Runtime.enable` |
| Input | Pointer, keyboard, dan gulir yang menyerupai manusia di dalam proses browser |
| Koherensi jaringan | Penentuan zona waktu dan locale yang mempertimbangkan proxy |
| Keadaan | Direktori data pengguna terpisah untuk setiap profil |

### Batas SDK

- Port debug CDP hanya menerima koneksi lokal melalui loopback.
- Kredensial proxy, kunci lisensi, dan cookie tidak dicatat dalam log. SDK tidak mengirim telemetri.
- Profil yang sudah ada mempertahankan seed-nya kecuali Anda secara eksplisit memberikan seed baru.
- SDK tidak menyisipkan skrip stealth melalui `addScriptToEvaluateOnNewDocument`, `evaluateOnNewDocument` dan tidak mengubah properti halaman.
- Untuk memeriksa kesiapan, SDK memakai endpoint HTTP CDP atau `Browser.getVersion`. SDK tidak memanggil `Runtime.enable` untuk pemeriksaan ini.
- Identitas browser berasal dari mesin. SDK tidak menimpanya melalui Playwright atau Puppeteer dan tidak memanggil metode emulasi berikut (`Emulation.setUserAgentOverride`, `setTimezoneOverride`, `setLocaleOverride`, `setDeviceMetricsOverride`).
- SDK tidak pernah menambahkan flag `--enable-automation`, `--disable-blink-features=AutomationControlled`, `--no-sandbox` secara otomatis.

## Pemeriksaan stealth

Jalankan pemeriksaan ini terhadap build mesin, klien otomasi, dan profil yang ingin Anda gunakan.

| Lapisan | Contoh target | Kriteria kelulusan |
|---|---|---|
| L0 Transport | TrackMe, pemeriksaan kebocoran IP/WebRTC | Hanya IP keluar; JA4 dan HTTP/2 cocok dengan Chromium mesin |
| L1 Identitas | Probe lokal, Sannysoft, Intoli | Tidak ada kontradiksi antara UA, UA-CH, platform, GPU, font, layar |
| L2 Fingerprint | CreepJS, FingerprintJS, BrowserScan | Tidak ada penanda headless atau penanda kebohongan; stabil pada setiap pemuatan ulang |
| L3 Otomasi | rebrowser, brotector, botd | Tidak ada kebocoran CDP, skrip init, atau WebDriver |
| L4 Perilaku | Fidelitas input, jejak humanize, smoke test Cloudflare | Event tepercaya, urutan realistis, challenge terselesaikan |
| L5 Stabilitas | Seed, worker, iframe, lintas asal | Seed yang sama menghasilkan persona yang sama di setiap peluncuran |

Prosedur pengujian memuat status hasil, panduan penelusuran masalah, dan format laporan. Baca dalam [bahasa Inggris](docs/stealth-checkup.md) atau [bahasa Rusia](docs/stealth-checkup.ru.md).

Catat build mesin, versi klien, pengaturan profil, IP keluar proxy, dan versi detektor pada setiap hasil agar setiap eksekusi dapat direproduksi dan dibandingkan.

## Peta repositori

```text
.
├── README.md                  # versi asli bahasa Inggris
├── README.ru.md               # terjemahan bahasa Rusia
├── desktop/                   # pengelola profil luring
├── docs/
│   ├── desktop/               # dokumentasi pengelola profil
│   ├── architecture.md        # komponen, alur peluncuran, batas
│   ├── sdk-contract.md        # kontrak peluncuran v0 dan perilaku SDK
│   ├── stealth-checkup.md     # metode dan runbook validasi stealth
│   ├── stealth-checkup.ru.md  # terjemahan bahasa Rusia
│   └── versioning.md          # kompatibilitas SDK, mesin, dan klien
├── spec/
│   └── schemas/               # JSON Schema untuk opsi peluncuran dan info biner
├── sdks/
│   ├── manifest.json          # registri SDK yang dapat dibaca mesin
│   ├── README.md              # tata letak dan aturan kontribusi
│   ├── _template/             # kerangka untuk bahasa baru
│   ├── python/  node/  dotnet/  java/
│   └── go/  php/  ruby/  rust/
├── conformance/               # kasus peluncuran dan stealth yang netral bahasa
├── tools/check_repo.py        # validasi struktur dan tautan (CI)
└── .github/workflows/ci.yml
```

Repositori ini memuat kerangka SDK, kontrak peluncuran, kasus uji bersama, dan pengelola profil luring. Mesin Chromium dan rilis lengkap Desktop 1.2.1 berada di repositori tersendiri. [Kode sumber dan panduan build Desktop](desktop/README.md) · [Dokumentasi pengelola profil](docs/desktop/README.md)

## Kontrak

- `launch(options)` menjalankan mesin dan mengembalikan `Browser` milik klien. Klien kemudian terhubung langsung ke Chromium melalui CDP.
- Sebelum menjalankan mesin, SDK memeriksa platform dan checksum SHA-256. Jika unduhan diizinkan, SDK mengunduh berkas yang belum tersedia.
- Profil bernama mempertahankan cookie, data situs, dan seed di antara peluncuran.
- Jika peluncuran gagal, SDK menghentikan proses yang dimulainya dan melaporkan kesalahan bertipe. Pemanggil memutuskan apakah akan mencoba lagi.
- SDK, mesin, dan klien otomasi memiliki rentang versi tersendiri. Untuk melihat build mesin, gunakan `binary_info()` di Python atau `binaryInfo()` di Node.js.

## Kompatibilitas

| Komponen | Target |
|---|---|
| Mesin | Build pilihan SDK, dilaporkan oleh `binary_info()` atau `binaryInfo()` |
| macOS | Apple Silicon dan Intel |
| Windows | x64 |
| Linux | x64 |
| Python | 3.10+; rentang Playwright yang didukung |
| Node.js | 20+; rentang Playwright dan Puppeteer yang didukung |

Versi SDK dan mesin dikelola terpisah. Jika keduanya tidak kompatibel, SDK menyertakan kedua versi dalam pesan kesalahan bertipe.

## Kontribusi

[Panduan kontribusi](CONTRIBUTING.md) menjelaskan proses peninjauan. Petunjuk build ada di [panduan SDK](sdks/README.md).

- Untuk mengubah perilaku SDK, perbarui implementasi terkait serta tambahkan pengujian atau kasus uji bersama.
- Untuk SDK dalam bahasa baru, salin [templat SDK](sdks/_template), daftarkan di [manifes](sdks/manifest.json), lalu buka draf pull request.
- Untuk opsi peluncuran baru, perbarui [kontrak](docs/sdk-contract.md) dan [skema](spec/schemas) terlebih dahulu.
- Perubahan stealth pada mesin dilakukan di repositori mesin. SDK tetap harus lulus pemeriksaan.
- Laporkan masalah keamanan secara privat sesuai [kebijakan keamanan](SECURITY.md).

## FAQ

### Apakah ini fork Playwright?

Tidak. SDK menghubungkan klien resmi Playwright ke Ombra Chromium. Anda dapat terus menggunakan tipe, fungsi pembantu, dan objek halaman Playwright.

### Apakah saya memerlukan aplikasi desktop Ombra?

SDK menjalankan mesin secara langsung. Aplikasi desktop bersifat opsional dan bisa digunakan untuk mengelola profil secara manual.

### Apa perbedaannya dengan playwright-stealth?

Perubahan fingerprint Ombra dikompilasi ke dalam Chromium. SDK tidak menambahkan skrip stealth di tingkat halaman.

### Apakah SDK dapat menyelesaikan CAPTCHA?

Mesin menyediakan modul CAPTCHA opsional. Dukungan bergantung pada jenis tugas, build, dan model yang tersedia. SDK meneruskan pengaturan saat peluncuran dan menyediakan akses ke modul melalui CDP.

### Dapatkah saya menggunakan proxy saya sendiri?

Ya. Teruskan proxy tersebut ke `launch()`. Proxy dengan autentikasi melewati relay loopback sehingga kredensial tidak pernah muncul di baris perintah proses.

### Versi Playwright dan Puppeteer mana yang didukung?

Versi klien yang didukung tercantum dalam manifes setiap paket dan [panduan kompatibilitas](docs/versioning.md). Klien didistribusikan sebagai dependensi terpisah.

### Apakah ini akan lulus setiap pemeriksaan bot?

Hasilnya bergantung pada situs, wilayah, reputasi IP keluar, versi detektor, dan pengaturan profil. Gunakan [pemeriksaan stealth](docs/stealth-checkup.md) untuk mengukur konfigurasi tertentu.

## Lisensi

Kode sumber SDK di repositori ini dilisensikan di bawah [Apache License 2.0](LICENSE). Lisensi ini tidak memberikan hak atas mesin Ombra, nama Ombra, atau logo. Lihat [NOTICE](NOTICE) untuk atribusi merek dagang dan pihak ketiga.

---

[Ombra Labs](https://github.com/ombralabs) · [ombrabrowser.dev](https://ombrabrowser.dev)
