<p align="center">
<img src="../../assets/logo.svg" width="72" height="72" alt="Ombra">
</p>

<h1 align="center">Ombra</h1>

<p align="center">
<a href="https://pypi.org/project/ombrabrowser/"><img src="https://img.shields.io/pypi/v/ombrabrowser?label=PyPI" alt="PyPI"></a>
<a href="https://www.npmjs.com/package/@ombralabs/sdk"><img src="https://img.shields.io/npm/v/@ombralabs/sdk?label=npm" alt="npm"></a>
<a href="../../LICENSE"><img src="https://img.shields.io/github/license/ombralabs/ombra" alt="Lisans"></a>
<a href="https://github.com/ombralabs/ombra"><img src="https://img.shields.io/github/last-commit/ombralabs/ombra" alt="Son Commit"></a>
<br>
<a href="https://github.com/ombralabs/ombra"><img src="https://img.shields.io/github/stars/ombralabs/ombra" alt="Yıldızlar"></a>
<a href="https://pypi.org/project/ombrabrowser/"><img src="https://img.shields.io/pepy/dt/ombrabrowser?label=pypi&logo=pypi&logoColor=white" alt="PyPI İndirmeleri"></a>
<a href="https://www.npmjs.com/package/@ombralabs/sdk"><img src="https://img.shields.io/npm/dt/@ombralabs/sdk?label=npm&logo=npm&logoColor=white" alt="npm İndirmeleri"></a>
<a href="https://github.com/ombralabs/ombra/releases"><img src="https://img.shields.io/github/v/release/ombralabs/ombra?label=release" alt="Sürüm"></a>
</p>

<p align="center">
<a href="#kurulum"><strong>Kurulum</strong></a> ·
<a href="#python-api">Python API</a> ·
<a href="#nodejs-ve-typescript-api">Node.js API</a> ·
<a href="#doğal-girdi-simülasyonu">Doğal girdi</a> ·
<a href="#ombra-desktop">Ombra Desktop</a> ·
<a href="../../README.md">English</a>
</p>

<details>
<summary>Diller</summary>

[English](../../README.md) · [Русский](../ru/README.md) · [Deutsch](../de/README.md) · [Español](../es/README.md) ·
[Français](../fr/README.md) · [Italiano](../it/README.md) · [Nederlands](../nl/README.md) · [Polski](../pl/README.md) ·
[Português](../pt/README.md) · [Română](../ro/README.md) · [Türkçe](README.md) · [Українська](../uk/README.md) ·
[Tiếng Việt](../vi/README.md) · [Bahasa Indonesia](../id/README.md) · [简体中文](../zh-Hans/README.md) · [繁體中文](../zh-Hant/README.md) ·
[日本語](../ja/README.md) · [한국어](../ko/README.md) · [ไทย](../th/README.md) · [हिंदी](../hi/README.md) ·
[Filipino](../fil/README.md) · [ខ្មែរ](../km/README.md)

</details>

<br>

<h3 align="center">C++ kaynak düzeyinde parmak izi kontrollerine ve yerleşik doğal girdi simülasyonuna sahip Chromium.</h3>

<table><tr><td>
Bir başlatma bayrağı yığını ya da sayfa üzerine yapılan bir JavaScript enjeksiyonu değil. Parmak izi yamaları doğrudan C++ kaynak koduna derlenmiş ve girdi simülasyonu tarayıcı sürecinin içinde çalışan gerçek bir Chromium ikili dosyasıdır. Resmi Playwright veya Puppeteer istemcisini yerel CDP üzerinden bağlayın — sarmalayıcı nesneler yok, sayfa kodunu yeniden yazmaya gerek yok.
</td></tr></table>

<br>

<p align="center">
Python ve Node.js üzerinde Playwright ve Puppeteer için doğrudan yerine geçen başlatıcı.<br>
Aynı API, aynı seçiciler ve tipler — yalnızca içe aktarma satırını ve <code>launch()</code> çağrısını değiştirin.
</p>

- **Kaynak düzeyinde Chromium yamaları** — canvas, WebGL, WebGPU, ses, yazı tipleri, GPU, ekran, CSS medya sorguları, donanım bildirimi, STUN sızıntısı olmadan WebRTC, TLS ClientHello, saat dilimi, yerel ayar ve otomasyon sinyallerinin kaldırılması (`navigator.webdriver`, `Runtime.enable`, headless işaretçileri).
- **Tarayıcı sürecinde yerleşik doğal girdi simülasyonu (`humanize=True`)** — işaretçi yörüngeleri (`cursory-rs`), basılı tutma süreli hedefli tıklamalar, yazım hatası ve kendi kendini düzeltme içeren yazma ritmi ve kaydırma fiziği doğrudan Chromium içinde çalışır. SDK, proxy sarmalayıcıları olmadan düz ve doğal bir `Browser` nesnesi döndürür.
- **Anahtar veya hesap gerektirmeden bağımsız çalışma** — güncel motor derlemeleri ile Ombra Desktop kayıt, lisans anahtarı, donanım kimliği veya lisans sunucusu olmadan yerel olarak çalışır.
- **Otomatik kurulum ve kriptografik ikili doğrulama** — `pip install ombrabrowser` veya `npm install @ombralabs/sdk`; ilk başlatmada SDK [GitHub Releases](https://github.com/ombralabs/ombra/releases) üzerinden uyumlu bir derleme indirir, Ed25519 imzasını ve SHA-256 sağlama toplamını doğrular.
- **Kalıcı profiller ve güvenli proxy aktarıcı** — adlandırılmış profiller çerezleri, `localStorage`, IndexedDB ve `seed` değerini süreçler arası kilitleme ile çalıştırmalar arasında korur; kimlik doğrulamalı proxy'ler (HTTP, HTTPS, SOCKS5) yerel loopback aktarıcı üzerinden çalışır, böylece kimlik bilgileri süreç argümanlarında asla görünmez.
- **Çevrimdışı Ombra Desktop profil yöneticisi** — macOS, Linux ve Windows için önceden derlenmiş kurulum dosyalarıyla bu depoda yer alan yerleşik bir masaüstü uygulaması ([`desktop/`](../../desktop/README.md)).

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

Puppeteer de `import { launch } from "@ombralabs/sdk/puppeteer"` veya `launchPuppeteer()` üzerinden desteklenir ([ayrıntılar](#puppeteer)).

**Anti-bot korumalı siteler için**, bir konut tipi (residential) proxy, kalıcı bir profil ve tutarlı ortam ayarlarını birlikte kullanın:

```python
from ombrabrowser import launch_persistent_context

context = launch_persistent_context(
    profile="pricing-eu",
    proxy="socks5://user:pass@residential-proxy:1080",  # veri merkezi yerine konut tipi IP tercih edilir
    fingerprint={"timezone": "auto", "locale": "auto"},  # saat dilimi ve yerel ayarı proxy çıkışıyla eşleştirir
    headless=False,                                      # bazı siteler headless farklarını tespit eder
    humanize=True,                                       # yerleşik fare, klavye ve kaydırma simülasyonu
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

Linux üzerinde, konteynerlerde ve korumalı hedeflerde sık karşılaşılan sorunlar için [Sorun giderme](#sorun-giderme) bölümüne bakın.

## Kurulum

**Python (3.10+):**

```bash
python -m pip install ombrabrowser

# İsteğe bağlı: proxy çıkışından saat dilimi ve yerel ayarı otomatik algıla (timezone="auto", locale="auto")
python -m pip install "ombrabrowser[geoip]"
```

**Node.js / TypeScript (20+):**

```bash
# Playwright ile (1.60.0+, standart Chromium indirmesi gerekmez)
npm install @ombralabs/sdk "playwright-core@^1.60.0"

# Veya Puppeteer ile (Puppeteer 25+ için Node.js 22.12+ gerekir)
npm install @ombralabs/sdk puppeteer-core

# İsteğe bağlı: timezone: "auto" ve locale: "auto" için çevrimdışı GeoIP veritabanı okuyucu
npm install mmdb-lib
```

---

Başlatma sırasında SDK, motoru kesin bir sırayla çözümler: `binary_path` (Node.js'te `binaryPath`), `OMBRA_BINARY_PATH`, Ombra Desktop motor dizini ve SDK önbelleği (`~/.ombra/engines`). Uyumlu bir motor bulunamazsa SDK, [GitHub Releases](https://github.com/ombralabs/ombra/releases) üzerinden bir derleme indirir, Ed25519 imzasını ve SHA-256 sağlama toplamını doğrular ve yerel olarak önbelleğe alır. `playwright install chromium` komutunu çalıştırmak gerekmez.

Otomatik indirmeyi devre dışı bırakmak için `download=False` (Node.js'te `download: false`) parametresini geçin. Motoru önceden indirip doğrulamak için (örneğin bir konteyner derlemesi sırasında) `ensure_binary()` (`ensureBinary()`) işlevini çağırın veya CLI `install` komutunu kullanın.

> **Bağımsız başlatma:** güncel motor derlemeleri ücretsizdir; hesap veya lisans anahtarı gerektirmez. `OMBRA_LICENSE_KEY` ve `login` komutu yalnızca eski lisanslı derlemelerle uyumluluk için korunmaktadır.

**Playwright'tan geçiş** yalnızca iki satır sürer — tüm sayfa işlemleri, konumlandırıcılar (locator) ve beklemeler olduğu gibi kalır:

```diff
- from playwright.sync_api import sync_playwright
- pw = sync_playwright().start()
- browser = pw.chromium.launch()
+ from ombrabrowser import launch
+ browser = launch()

  page = browser.new_page()
  page.goto("https://example.com")
  # kodunuzun geri kalanı değişmeden çalışır
```

```diff
- import { chromium } from "playwright";
- const browser = await chromium.launch();
+ import { launch } from "@ombralabs/sdk";
+ const browser = await launch();
```

> ⭐ Faydalı bulduysanız depoya **yıldız (Star)** verin ve yeni motor, SDK ve Ombra Desktop derlemelerinden haberdar olmak için **[sürümleri takip edin (Watch releases)](https://github.com/ombralabs/ombra/subscription)**.

---

## Güncel durum ve sürümler

Ekosistemdeki her bileşen ortak başlatma sözleşmesini izler ve bağımsız olarak sürümlenir.

| Bileşen | Durum / sürüm | Konum |
|---|---|---|
| **SDK sözleşmesi** | Taslak `0.2.0` | [`docs/sdk-contract.md`](../../docs/sdk-contract.md) |
| **Python SDK** | Alfa `0.2.0` | [PyPI üzerinde `ombrabrowser`](https://pypi.org/project/ombrabrowser/) |
| **Node.js / TypeScript SDK** | Alfa `0.2.0` | [npm üzerinde `@ombralabs/sdk`](https://www.npmjs.com/package/@ombralabs/sdk) |
| **Ombra Chromium motoru** | SDK aralığı `>=151.0.7922.108,<159` | SDK tarafından [GitHub Releases](https://github.com/ombralabs/ombra/releases) üzerinden otomatik indirilir (macOS ARM64 / Linux x64 / Windows x64) |
| **Ombra Desktop** | Çevrimdışı profil yöneticisi | [`desktop/`](../../desktop/README.md) · [GitHub Releases](https://github.com/ombralabs/ombra/releases) |
| **Bağımsız tarayıcı** | Chromium `158.0.8127.37` | [GitHub Releases](https://github.com/ombralabs/ombra/releases) |
| **Şemalar ve uyumluluk testleri** | JSON Schema + ortak senaryolar | [`spec/schemas`](../../spec/schemas) · [`conformance`](../../conformance/README.md) |
| **Gizlilik kontrolü yöntemi** | 6 katman (`L0`–`L5`) | [`docs/stealth-checkup.md`](../../docs/stealth-checkup.md) |

Tüm sürüm geçmişi için [CHANGELOG.md](../../CHANGELOG.md) dosyasına bakın.

## Neden Ombra

- **Yapılandırma düzeyindeki ve JS tabanlı yamalar kolayca bozulur.** `playwright-stealth`, `puppeteer-extra` ve `undetected-chromedriver` gibi araçlar sayfalara JavaScript enjekte eder veya başlatma bayraklarını değiştirir. Chrome güncellemeleri bunları sık sık bozar ve modern dedektörler yamaların kendisini tespit eder (`Function.prototype.toString`, prototip anormallikleri, `addScriptToEvaluateOnNewDocument`).
- **Değişiklikler doğrudan Chromium kaynak koduna derlenir.** Parmak izleri C++ düzeyinde üretilir ve ana çerçeve (main frame), worker'lar ve iframe'ler genelinde tutarlı biçimde uygulanır. SDK sayfalara hiçbir betik enjekte etmez ve `Emulation.*` geçersiz kılmaları yapmaz.
- **Girdi simülasyonu Playwright'ın üst katmanında değil, tarayıcı sürecinin içinde yaşar.** Fare yörüngeleri, tuş vuruşları ve kaydırma işlemleri doğrudan Chromium içinde yürütüldüğünden SDK, Playwright veya Puppeteer nesnelerini sarmalamaz — tüm konumlandırıcılar, çerçeveler ve üçüncü taraf kütüphaneler normal biçimde çalışmaya devam eder.
- **Ek servis gerektirmeyen yerel mimari.** Arka planda çalışan bir kontrol düzlemi servisi (daemon) veya betiğinizle tarayıcı arasında bir ağ atlaması yoktur: tek bir motor süreci, `127.0.0.1` üzerinde yerel loopback CDP ve profil sayısı ya da eşzamanlılık sınırı yok.

## Ombra Desktop

**Grafik arayüzlü, yerel ve çevrimdışı bir profil yöneticisi.** Kaynak kodu doğrudan bu depoda bulunur ([`desktop/`](../../desktop/README.md)) ve Tauri (Rust + Vue) ile geliştirilmiştir.

- **Tamamen çevrimdışı ve yerel** — profil kataloğu makinenizde yerel bir şifreleme anahtarıyla korunan yerel bir SQLite veritabanında tutulur; hesap, bulut hizmeti veya ağ erişimi gerekmez.
- **Yapılandırılmış profil yönetimi** — profiller oluşturun, ad, not veya numaraya göre arama yapın, açıklamaları düzenleyin ve kayıtları Rust kataloğunda gruplar, etiketler, işaretler ve yer imleriyle organize edin.
- **Güvenli Çöp Kutusu** — bir profili Çöp Kutusu'na taşımak dosyalarını diskte saklar, böylece daha sonra geri yükleyebilirsiniz.
- **Profil başına sınır yok** — profil başına ücret katmanı veya bulut kotası yoktur: tüm veriler sizde kalır.
- **Önceden derlenmiş kurulum dosyaları** — macOS Apple Silicon (`.dmg`, Apple Developer ID ile imzalı ve noter onaylı), Linux (`.deb` ve `.rpm`) ve Windows x64 (`setup.exe`).
- **Yalıtılmış kataloglar** — ayrı bir test kataloğu veya yedek kopya ile çalışmak için `OMBRA_DESKTOP_DATA_DIR` değişkenini ayarlayın.

[En son sürümü indir →](https://github.com/ombralabs/ombra/releases) · [Desktop README](../../desktop/README.md) · [Profiller ve yerel anahtarlar kılavuzu](../../docs/desktop/README.md)

## Parmak izi doğrulaması ve gizlilik kontrolü

Ombra, genelgeçer "%100 tespit edilemez" vaatleri vermek yerine kayıtlı koşullar altında tekrarlanabilir bir doğrulama prosedürüne dayanır. Herhangi bir sitedeki gerçek dünya sonuçları her zaman çıkış IP itibarına, bölgeye, profil geçmişine, dedektör sürümüne ve başlatma yapılandırmasına bağlıdır.

### Motor ve SDK tarafından ele alınan yüzeyler

| Yüzey / sinyal | Standart Playwright | Ombra | Uygulama |
|---|---|---|---|
| `navigator.webdriver` | `true` | `false` | C++ motor yaması |
| `window.chrome` | headless modda eksik | tam nesne | Standart Chrome ile eşleşir |
| `navigator.plugins` | headless modda `0` | tutarlı eklenti kümesi | Motor düzeyinde |
| User-Agent ve Client Hints | `HeadlessChrome`, marka uyuşmazlığı | `Google Chrome` + hizalı `Sec-CH-UA*` | `010-user-agent-and-webdriver` yaması |
| CDP izleri (`Runtime.enable`, `UtilityScript`) | dedektörler tarafından işaretlenir | motor tarafından bastırılır; SDK asla `Runtime.enable` çağırmaz | `110-runtime-enable` yaması + `SI-01` değişmezi |
| WebRTC IP sızıntısı | yerel/ana makine IP'sini ifşa eder | gerçek STUN göndermeden çıkış IP'sini bildirir | `100-webrtc-leak` yaması (`--webrtc-ip`) |
| TLS ve HTTP/2 | kuruluma bağlı | Chromium ağ yığını + `chrome-<major>` ClientHello profili | `210-tls-network-persona` yaması |
| WebGL ve WebGPU | yazılım işleyici / GPU uyuşmazlığı | birleşik WebGL/WebGPU limitleri ve uzantı tabloları | `070`, `071`, `075`, `955` yamaları |
| Yazı tipleri, yerel ayar ve saat dilimi | ana makine değerleri, `Intl` sapması | tutarlı yazı tipi tabloları, ICU yerel ayarı ve saat dilimi | `040`, `090`, `092`, `230` yamaları |
| Girdi simülasyonu | imleç ışınlanması, anlık `fill()` | `cursory-rs` eğrileri, yazma ritmi, kaydırma fiziği | Tarayıcı sürecinde `135-ombra-humanize` yaması |
| Parmak izi kararlılığı | değişir veya ana makineyi sızdırır | yeniden başlatmalar ve çerçeveler boyunca `seed` başına deterministik | `001`, `002` yamaları + kalıcı profil |

### Kontrolün altı katmanı

Bir yapılandırmayı yayımlamadan veya devreye almadan önce, kullanmayı planladığınız motor derlemesi, otomasyon istemcisi ve proxy ile altı kontrol katmanının tamamını çalıştırın:

| Katman | Örnek hedefler | Geçme kriterleri |
|---|---|---|
| **L0 Aktarım** | TrackMe, IP/WebRTC sızıntı sayfaları, başlık yankısı (header echo) | Yalnızca proxy çıkış IP'si görünür; JA4 ve HTTP/2 Chromium derlemesiyle eşleşir; argv içinde proxy kimlik bilgisi yoktur |
| **L1 Kimlik** | Yerel prob, Sannysoft, Intoli, UA-CH kontrolü | UA, Client Hints, platform, GPU, yazı tipleri, ekran ve yerel ayar arasında çelişki yoktur |
| **L2 Parmak İzi** | CreepJS, FingerprintJS, BrowserScan, Pixelscan | Headless veya `lie` işaretçisi yoktur; parmak izi sayfa yenilemelerinde sabit kalır |
| **L3 Otomasyon** | rebrowser, brotector, botd, CDP komut denetimi | `Runtime.enable`, başlangıç betiği (init-script), binding veya `navigator.webdriver` sızıntısı yoktur |
| **L4 Davranış** | Girdi doğruluğu probu, humanize izleri, canlı doğrulama testi | `isTrusted: true` olayları, doğal sıralama ve zamanlama, gerçekçi işaretçi eğrileri ve kaydırma |
| **L5 Kararlılık** | Tekrarlanan başlatmalar, worker'lar, aynı/farklı kaynaklı iframe'ler, SDK'lar arası denklik | Aynı `seed` tüm bağlamlarda birebir aynı parmak izini yeniden üretir |

Tam prosedür, durumlar (`PASS` / `DEGRADED` / `FAIL` / `UNREACHABLE`), sinyal kontrol listesi ve rapor şablonu: [İngilizce (`docs/stealth-checkup.md`)](../../docs/stealth-checkup.md) ve [Rusça (`docs/stealth-checkup.ru.md`)](../../docs/stealth-checkup.ru.md).

## Karşılaştırma

| Özellik | Playwright | playwright-stealth | undetected-chromedriver | Ombra |
|---|---|---|---|---|
| Otomasyon API'si | Playwright | Playwright | Selenium | **Playwright ve Puppeteer** |
| Yama düzeyi | Yok | Sayfa içi JS enjeksiyonu | Yapılandırma bayrakları | **C++ kaynak kodu (Chromium)** |
| Tutarlı parmak izi `seed` değeri | Hayır | Hayır | Kısmi | **Evet, profil ve eTLD+1 başına** |
| Girdi simülasyonu (`humanize`) | Hayır | Hayır | Hayır | **Tarayıcı sürecinde yerleşik** |
| `Runtime.enable` / CDP sızıntı bastırma | Hayır | Hayır | Kısmi | **Motor yaması + SDK değişmezleri** |
| CLI sızıntısı olmadan kimlik doğrulamalı proxy | Hayır | Hayır | Sınırlı | **Yerel loopback aktarıcı** |
| Profil yalıtımı | Tarayıcı bağlamı | Tarayıcı bağlamı | Hayır | **Profil dizini + dosya kilidi** |
| Çevrimdışı profil yöneticisi (GUI) | Hayır | Hayır | Hayır | **Ombra Desktop (macOS, Linux, Windows)** |
| Playwright'tan geçiş | — | İçe aktarma değişikliği | Kodun yeniden yazımı | **İçe aktarma ve `launch()` değişimi** |

## Nasıl çalışır

```mermaid
flowchart LR
    Script["Betiğiniz<br/>Playwright · Puppeteer"]
    SDK["Ombra SDK<br/>launch() + CDP köprüsü"]
    Relay["Yerel proxy aktarıcı<br/>kimlik doğrulama gerektiğinde"]
    Engine["Ombra Chromium<br/>C++ yamalı motor"]
    Client["Resmi istemci<br/>Playwright · Puppeteer"]
    Profile[("Profil<br/>seed · çerezler · depolama")]

    Script -->|"launch()"| SDK
    SDK -->|"doğrula + başlat"| Engine
    SDK -.->|"proxy kimlik doğrulama"| Relay
    Relay -.-> Engine
    SDK -->|"CDP üzerinden bağlan"| Client
    Script -->|"sayfa API'si"| Client
    Client -->|"loopback CDP"| Engine
    Engine --> Profile
```

1. **`launch()` motoru bulur veya indirir** ve Ed25519 imzası ile SHA-256 sağlama toplamını doğrular.
2. **Profil ve `seed` hazırlanır.** Adlandırılmış bir profil süreçler arası kilit alır; proxy kimlik bilgisi gerektiriyorsa SDK bellek içi bir loopback aktarıcı başlatır.
3. **Ombra Chromium başlatılır** — seçilen profil, parmak izi seçenekleri ve yerel bir hata ayıklama bağlantı noktası (`--remote-debugging-port=0`) ile.
4. **Resmi istemci bağlanır.** `DevToolsActivePort` oluştuğunda SDK, Playwright'ı (`no_defaults=True` ile) veya Puppeteer'ı `127.0.0.1` üzerinden bağlar ve yerel `Browser` nesnesini döndürür.
5. **Temiz kapanış.** `browser.close()` çağrısı `Browser.close` komutunu gönderir, motor süreç ağacını sonlandırır, aktarıcıyı durdurur ve profil kilidini serbest bırakır.

Başlatma tamamlandıktan sonra SDK veri yolundan çekilir: tüm sayfa komutları doğrudan Playwright veya Puppeteer'dan Chromium'a gider.

### SDK sınırları ve gizlilik değişmezleri

[v0.2 SDK sözleşmesi (`docs/sdk-contract.md`)](../../docs/sdk-contract.md) her resmi SDK için katı değişmezler zorunlu kılar:

- **Sayfalarda gizlilik betiği yok.** SDK asla `Page.addScriptToEvaluateOnNewDocument` / `evaluateOnNewDocument` çağırmaz ve DOM özelliklerine yama uygulamaz.
- **`Runtime.enable` yok.** Hazırlık denetimleri yalnızca yerel CDP HTTP uç noktasını veya `Browser.getVersion` çağrısını kullanır; SDK asla `Runtime`, `Debugger` veya `Log` alanlarını etkinleştirmez.
- **`Emulation.*` geçersiz kılmaları yok.** SDK asla `Emulation.setUserAgentOverride`, `setTimezoneOverride`, `setLocaleOverride` veya `setDeviceMetricsOverride` çağırmaz — tarayıcı kimliği doğrudan motordan gelir.
- **Varsayılan olarak yasaklı bayrak yok.** SDK kendi başına asla `--enable-automation`, `--disable-blink-features=AutomationControlled`, `--no-sandbox` veya `--user-agent` eklemez.
- **Yalnızca loopback CDP.** Hata ayıklama bağlantı noktası her zaman `127.0.0.1` adresine bağlanır; loopback dışı bir `--remote-debugging-address` geçilmesi reddedilir.
- **Telemetri yok ve gizli bilgi sızıntısı yok.** Proxy kimlik bilgileri, anahtarlar ve çerezler günlüklerden ve hata mesajlarından maskelenir.

## Python API

### `launch()`

```python
from ombrabrowser import launch

# Temel başlatma (varsayılan olarak headless)
browser = launch()

# Arayüzlü (headed) tarayıcı penceresi
browser = launch(headless=False)

# HTTP veya SOCKS5 proxy (kimlik bilgileri yerel loopback aktarıcı üzerinden işlenir)
browser = launch(proxy="http://user:pass@proxy:8080")
browser = launch(proxy="socks5://user:pass@proxy:1080")

# İstisna listesi (bypass) içeren proxy nesnesi
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

# Parmak izi kontrolleri (seed, işletim sistemi, proxy'den otomatik saat dilimi/yerel ayar, ekran, GPU)
# timezone="auto" / locale="auto" için kurun: pip install "ombrabrowser[geoip]"
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

# Yerleşik fare, klavye ve kaydırma simülasyonu
browser = launch(humanize=True)
browser = launch(humanize={"preset": "careful"})

# Belirli bir motor derlemesini sabitle ve ek Chromium bayrakları geç
browser = launch(
    version="158.0.8127.37-3",
    args=["--webrtc-ip=203.0.113.10"],
)
```

Standart bir `playwright.sync_api.Browser` döndürür. Tüm Playwright yöntemleri normal biçimde çalışır (`new_page()`, `new_context()`, `close()` vb.). Profilin pencere boyutlarının üzerine yazılmaması için yeni sayfalar varsayılan olarak `no_viewport=True` ile açılır.

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

### `launch_context()` ve `launch_context_async()`

Tarayıcıyı başlatıp doğrudan bir `BrowserContext` döndüren kolaylık yardımcısı (bağlamı kapatmak motor sürecini de sonlandırır). Ek anahtar kelime argümanları `browser.new_context()` yöntemine iletilir — örneğin `storage_state`, `permissions` veya `extra_http_headers`:

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

Asenkron karşılığı: `await launch_context_async(...)`.

### `launch_persistent_context()` ve `launch_persistent_context_async()`

Tarayıcıyı kalıcı bir profille başlatır ve varsayılan `BrowserContext` nesnesini döndürür. Çerezler, `localStorage`, IndexedDB, önbellek ve parmak izi `seed` değeri oturumlar arasında korunur.

- `profile="pricing-eu"` geçildiğinde, `.ombra/profile.json` meta verileri ve bir kilit dosyasıyla birlikte `~/.ombra/profiles/pricing-eu` altında profil oluşturulur.
- `user_data_dir="./my-profile"` (veya konumsal bir yol argümanı) geçildiğinde açıkça belirtilen o dizin kullanılır.
- Aynı profili başka bir süreçten eşzamanlı olarak başlatmak, profil verilerini bozmak yerine `ProfileBusyError` hatası fırlatır.

```python
from ombrabrowser import launch_persistent_context

# Adlandırılmış profil ile (~/.ombra/profiles/ altında saklanır)
ctx = launch_persistent_context(profile="pricing-eu", headless=False)
page = ctx.new_page()
page.goto("https://example.com")
ctx.close()  # çerezler, depolama ve seed kalıcı olarak saklanır

# Açık dizin yolu ile (örneğin Chrome eklentileri yüklemek için)
ctx = launch_persistent_context(
    "./my-profile",
    headless=False,
    args=[
        "--disable-extensions-except=./my-extension",
        "--load-extension=./my-extension",
    ],
)
```

Asenkron karşılığı: `await launch_persistent_context_async(...)`.

### Yardımcı işlevler ve tanılama (Python)

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

# Çözümlenen motor ikili dosyasını incele
print(binary_info())
# {'version': '158.0.8127.37-3', 'platform': 'macos-arm64',
#  'path': '…', 'installed': True, 'source': 'cache', 'sha256': '…'}

# Tarayıcı başlatmadan motoru indir ve doğrula
ensure_binary(version="158.0.8127.37-3")

# SDK tarafından yönetilen motor ikili dosyalarını temizle (~/.ombra/profiles altındaki profillere dokunulmaz)
clear_cache()

# Chromium'u başlatmadan çözümlenen başlatma komutunun dry-run önizlemesi
cmd = build_launch_options(profile="pricing-eu", humanize=True)

# Çalışma zamanı meta verilerini (CDP portu, ws_url, seed, pid) oku ve süreç sağlığını doğrula
browser = launch()
print(last_launch_info(browser))
check_engine_health(browser)
browser.close()
```

### CLI (Python)

```bash
ombrabrowser install                             # motoru indir ve doğrula (Ed25519 + SHA-256)
ombrabrowser install --version 158.0.8127.37-3  # belirli bir motor derlemesini kur
ombrabrowser info                                # ortam, ikili dosya ve bağımlılık tanılaması (takma ad: doctor)
ombrabrowser info --quick --json                 # ikili dosyayı başlatmadan hızlı, makine tarafından okunabilir rapor
ombrabrowser info --proxy socks5://user:pass@host:1080  # proxy üzerinden çıkış IP'si, saat dilimi ve yerel ayar çözümlemesini test et
ombrabrowser update                              # GitHub Releases üzerinden kontrol et ve önbellekteki motoru güncelle
ombrabrowser clear-cache                         # önbellekteki motor ikili dosyalarını temizle (profiller korunur)
ombrabrowser login                               # lisans anahtarını ~/.ombra/license.key dosyasına kaydet (yalnızca eski derlemeler)
ombrabrowser logout                              # kayıtlı lisans anahtarını kaldır
```

Aynı komutlar `python -m ombrabrowser <komut>` biçiminde de kullanılabilir.

## Node.js ve TypeScript API

`@ombralabs/sdk`, tam TypeScript tip tanımlarıyla (`.d.ts`) birlikte çift ESM + CommonJS derlemeleri sunar. Hem Playwright hem de Puppeteer arka planda aynı motor üzerinde çalışır.

### Playwright (varsayılan)

```ts
import { launch, launchContext, launchPersistentContext } from "@ombralabs/sdk";

// Proxy, parmak izi ve girdi simülasyonu ile temel başlatma
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

// Kolay başlatma: tek çağrıda tarayıcı + bağlam
const context = await launchContext({
  proxy: "socks5://user:pass@residential-proxy:1080",
  fingerprint: { timezone: "auto", locale: "auto" },
  headless: false,
  humanize: true,
  contextOptions: { storageState: "state.json" },
});
const page = await context.newPage();

// Kalıcı profil — çerezler, localStorage ve seed çalıştırmalar arasında korunur
const persistentCtx = await launchPersistentContext({
  userDataDir: "./chrome-profile",
  headless: false,
  humanize: true,
});
```

> Yukarıdaki her kod parçası tek başına çalışabilir. Mevcut bir Playwright başlatıcısını taşımak için içe aktarmayı `import * as chromium from "@ombralabs/sdk"` ile değiştirip `await chromium.launch(...)` çağrısını aynen koruyabilirsiniz.

### Puppeteer

`@ombralabs/sdk` paketinden `launchPuppeteer()` işlevini kullanın veya `@ombralabs/sdk/puppeteer` alt yolundan içe aktarın:

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

> **Puppeteer hakkında not:** Puppeteer, `connectOverCDP({ noDefaults: true })` kullanan Playwright'a kıyasla daha fazla varsayılan CDP trafiği gönderir. Katı CDP denetimleri yapan siteler için Playwright önerilir.

### Yardımcı araçlar ve CLI (Node.js)

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

## Doğal girdi simülasyonu

Ombra'da girdi simülasyonu (`humanize`), otomasyon istemcisinin etrafında bir JS sarmalayıcısı olarak değil, **doğrudan Chromium tarayıcı sürecine yerleşik** olarak (`cursory-rs` ve motorun girdi zamanlayıcısı ile güçlendirilmiş) derlenmiştir. Bunun anlamı şudur:

- Her standart Playwright ve Puppeteer eylemi (`page.click()`, `page.fill()`, `page.type()`, `page.mouse.*`, `page.keyboard.*`, `locator.*`, `ElementHandle.*`), tarayıcı içindeki sekme başına tek bir girdi kuyruğundan geçer.
- Davranışsal parametreler, profilin `seed` değerinden (`--fingerprint-humanize-seed`) deterministik olarak türetilir.
- SDK asla `Page` veya `Browser` nesnelerini proxy sınıflarıyla sarmalamaz — yerleşik tipler ve istemci davranışı bozulmadan kalır.

```python
browser = launch(humanize=True)
page = browser.new_page()
page.goto("https://example.com")
page.locator("#email").fill("user@example.com")
page.locator("button[type=submit]").click()
```

**`humanize=True` ile neler değişir:**

| Eylem | `humanize` olmadan | `humanize=True` ile |
|---|---|---|
| Fare hareketi | Anlık ışınlanma | İvmelenme, duraklamalar ve hafif hedef aşımı içeren `cursory-rs` eğrileri |
| Tıklama ve sürükleme | Anlık basış | Hedef içinde nişan noktası, tıklama öncesi duraklama ve basılı tutma süresi |
| Metin girişi | Anlık değer atama | Yapılandırılmış ritim ve klavye düzeniyle karakter karakter yazma, arada sırada yazım hatası ve kendi kendini düzeltme; çok uzun metinler sistem panosuna dokunmadan yalıtılmış bir pano üzerinden yapıştırılır |
| Kaydırma | Tek seferde sıçrama | Ölçülmüş yavaşlama profillerini izleyen tekerlek/dokunmatik yüzey (trackpad) olay serileri |
| Boşta kalma aralıkları | Sabit imleç | `careful` ön ayarında eylemler arasında hafif boşta imleç gezinmesi |

**Ön ayarlar** — `default` (normal tempo), `careful` (daha yavaş, temkinli, boşta mikro hareketli) ve `fast` (daha hızlı tempo). Girdi simülasyonunu açıkça devre dışı bırakmak için `humanize=False` (`humanize: false`) geçin.

```python
browser = launch(humanize={"preset": "careful"})
```

```ts
const browser = await launch({ humanize: { preset: "careful" } });
```

`Ombra` CDP alanı aracılığıyla tarayıcıyı yeniden başlatmadan çalışma zamanında modu açıp kapatabilir veya ön ayarları değiştirebilirsiniz:

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

## Parmak izi ve profil yönetimi

Motor, tek bir `seed` değerinden tutarlı bir tarayıcı yapılandırması türetir. `seed` belirtilmediğinde:

| Senaryo | Davranış |
|---|---|
| **Profil olmadan `launch()`** | SDK oturum için rastgele bir `seed` üretir ve `close()` sonrasında silinen geçici bir dizin oluşturur. |
| **`profile="name"` veya `user_data_dir="./dir"`** | `seed` değeri `.ombra/profile.json` dosyasına kaydedilir ve her başlatmada yeniden kullanılır — siteler aynı cihaza ve çerezlere sahip geri dönen bir ziyaretçi görür. |
| **`fingerprint={"seed": N, ...}`** | Açık `seed` değerinden deterministik parmak izi üretilir; ek alanlar geri kalanını tutarlı tutarak tekil ayarları geçersiz kılar. |

Canvas/ses gürültüsü `eTLD+1` başına anahtarlanır (aynı sitede kararlı, farklı siteler arasında ilişkilendirilemez). 2D canvas ve WebGL `readPixels` için piksel gürültüsü, "Canvas Tampering / Masking" dedektörlerini tetiklememek amacıyla varsayılan olarak kapalıdır ve `--fingerprint-pixel-noise` ile isteğe bağlı olarak etkinleştirilebilir.

> **İpucu:** Aynı siteyi tekrar ziyaret ederken, geçici bir `launch()` çağrısına sabit bir `seed` geçmek yerine kalıcı bir profil (`profile="name"` veya `launch_persistent_context()`) kullanın — böylece çerezler, önbellek ve `localStorage` parmak iziyle birlikte tutarlı kalır.

### `fingerprint` nesnesi alanları

Aşağıdaki alan adları Python (`snake_case`) kurallarını izler; Node.js hem `camelCase` (`osVersion`, `hardwareConcurrency`, `deviceMemory`) hem de `snake_case` biçimlerini kabul eder:

| Alan | Tip | Açıklama |
|---|---|---|
| `seed` | `int` (`>= 0`) | Genel parmak izi yapılandırmasını belirleyen üretici `seed` değeri |
| `os` | `"macos"` \| `"windows"` \| `"linux"` | Hedef işletim sistemi (`navigator.platform`, UA, GPU ve yazı tipi havuzları) |
| `os_version` | `string` | Client Hints için işletim sistemi sürüm ipucu |
| `timezone` | IANA bölgesi veya `"auto"` | Saat dilimi (ör. `"Europe/Berlin"`). `"auto"` değeri bölgeyi GeoIP üzerinden proxy çıkışından çözümler |
| `locale` | BCP-47 veya `"auto"` | Yerel ayar (`Accept-Language`, `navigator.languages`, ICU `Intl`). `"auto"` değeri yerel ayarı proxy çıkışından çözümler |
| `screen` | `{"width", "height"}` veya `"auto"` | Hedef işletim sisteminin görev çubuğu / menü çubuğunu hesaba katan ekran ve çalışma alanı boyutları |
| `gpu` | `{"vendor", "renderer"}` veya `"auto"` | Açık WebGL `UNMASKED_VENDOR` / `UNMASKED_RENDERER` dizeleri |
| `hardware_concurrency` | `int` veya `"auto"` | Bildirilen `navigator.hardwareConcurrency` değeri |
| `device_memory` | `int` veya `"auto"` | Bildirilen `navigator.deviceMemory` değeri (GB cinsinden) |
| `noise` | `bool` | Parmak izi gürültüsünü etkinleştir/devre dışı bırak (`False` değeri `--disable-fingerprint-noise` bayrağını geçer) |

> Parmak izi parametrelerinin birincil kaynağı olarak `seed` değerini koruyun: tekil değerleri birbiriyle uyumlu tutmadan geçersiz kılmak (örneğin bir işletim sistemini uyumsuz bir GPU ile eşleştirmek) dedektörler için çelişkiler doğurabilir.

### Ek motor bayrakları (`args`)

Ek motor bayrakları (`args=[...]` ile ayarlayın veya geçersiz kılın):

| Bayrak | Amaç |
|---|---|
| `--fingerprint-brand=chrome\|edge\|opera\|vivaldi` | `Sec-CH-UA` içindeki tarayıcı markası (SDK varsayılan olarak `chrome` kullanır) |
| `--fingerprint-tls-profile=chrome-<major>` | Belirtilen Chrome ana sürümüyle eşleşen TLS ClientHello profili (SDK tarafından motor sürümüne göre otomatik ayarlanır) |
| `--webrtc-ip=<ip>` | Gerçek STUN trafiği göndermeden WebRTC ICE adaylarındaki IP adresini değiştirir |
| `--fingerprint-location=<lat,lon>` | `navigator.geolocation` tarafından bildirilen koordinatlar |
| `--fingerprint-storage-quota=<MB>` | `navigator.storage.estimate()` tarafından bildirilen depolama kotası |
| `--fingerprint-max-touch-points=<N>` | Dokunma noktası sayısı (`navigator.maxTouchPoints` ve işaretçi medya sorguları) |
| `--fingerprint-device-pixel-ratio=<ratio>` | Ekran piksel yoğunluğu (`window.devicePixelRatio`) |
| `--fingerprint-color-depth=<bits>` | Ekran renk derinliği |
| `--disable-gpu-fingerprint` | Ana makinenin gerçek GPU'sunu doğrudan aktarır (WebGL/WebGPU dizeleri, limitler ve uzantılar) |
| `--disable-gpu-string-spoof` | Diğer profil ayarlarını korurken gerçek GPU dizelerini doğrudan aktarır |
| `--disable-fingerprint-noise` | Kimlik parametrelerini etkin tutarken canvas/WebGL/ses gürültüsünü devre dışı bırakır (`fingerprint={"noise": False}` ile de ayarlanır) |
| `--fingerprint-pixel-noise` | 2D canvas ve `readPixels` için isteğe bağlı idempotent piksel gürültüsünü etkinleştirir |
| `--profile-label=<text>` | Tarayıcı adres çubuğunda gösterilen profil etiketi (yalnızca arayüz; `profile` değerinden otomatik ayarlanır, `args` ile yalnızca `profile` ayarlı değilken geçin) |

### Linux üzerinde yazı tipi kurulumu

Minimal Linux sunucularında ve konteynerlerde genellikle emoji ve CJK yazı tipleri eksiktir; bu da gizli canvas metinlerinin ve emojilerin işlenmesinde olağandışı özetler (hash) oluşmasına yol açar.

**1. Temel katman (emoji ve CJK):**

```bash
sudo apt-get update && sudo apt-get install -y \
    fonts-noto-color-emoji fonts-freefont-ttf fonts-unifont \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-tlwg-loma-otf
```

**2. Windows profilleri için Windows yazı tipleri (`os="windows"`):**
Linux üzerinde bir Windows yapılandırması çalıştırırken `C:\Windows\Fonts\` dizininden gerçek yazı tiplerini (`Segoe UI`, `Calibri`, `Consolas`, `Courier New`, `Arial`, `Times New Roman`, `MS UI Gothic` dahil) kurmak yazı tipi listeleme tutarlılığını belirgin biçimde artırır:

```bash
mkdir -p ~/.local/share/fonts/windows
cp -r /path/to/windows/Fonts/. ~/.local/share/fonts/windows/
fc-cache -f
```

**3. macOS profilleri için macOS yazı tipleri (`os="macos"`):**
Benzer şekilde, Linux üzerinde `os="macos"` kullanırken `/System/Library/Fonts/`, `/System/Library/Fonts/Supplemental/` ve `/Library/Fonts/` dizinlerindeki yazı tiplerini `~/.local/share/fonts/mac/` dizinine kopyalayın ve `fc-cache -f` komutunu çalıştırın.

Bir `Dockerfile` içinde yazı tiplerini sistem dizini olan `/usr/local/share/fonts/` altına yerleştirin:

```dockerfile
COPY windows-fonts/ /usr/local/share/fonts/windows/
RUN fc-cache -f
```

## Başlatma seçenekleri, yapılandırma ve hatalar

### `launch()` seçenekleri

Seçenek adları Python API ve [SDK sözleşmesi](../../docs/sdk-contract.md) ile uyumludur; Node.js `camelCase` karşılıklarını (`timeoutMs`, `userDataDir`, `binaryPath`, `licenseKey`) kullanır ve `snake_case` takma adlarını da kabul eder. Bilinmeyen seçenekler `InvalidOptionError` ile reddedilir.

| Seçenek | Varsayılan | Açıklama |
|---|---|---|
| `headless` | `true` | Pencere açmadan çalıştır (`--headless=new`) |
| `proxy` | yok | Proxy URL'si (`http`, `https`, `socks5`) veya nesne; kimlik doğrulamalı proxy'ler loopback aktarıcı kullanır |
| `fingerprint` | yok | `seed`, işletim sistemi, saat dilimi, yerel ayar, ekran, GPU, bellek ve gürültü ayarları |
| `profile` | yok | `~/.ombra/profiles/<slug>` altında adlandırılmış kalıcı profil (`user_data_dir` ile birlikte kullanılamaz) |
| `user_data_dir` | geçici | Açık profil dizini yolu (`profile` ile birlikte kullanılamaz) |
| `args` | `[]` | Ek Chromium argümanları (değiştirilmeden doğrudan iletilir) |
| `binary_path` | çözümlenir | Bir motor yürütülebilir dosyasına açık yol |
| `version` | ortam / otomatik | Motor sürümü sabitleme (örneğin `158.0.8127.37-3`), `OMBRA_VERSION` değerini geçersiz kılar |
| `timeout_ms` | `30000` | Motor başlatma ve CDP bağlantısı için zaman aşımı (1000–600000 ms) |
| `humanize` | motor varsayılanı | `False`, `True` veya `{"preset": "default" \| "careful" \| "fast"}` |
| `license_key` | ortam / dosya | Eski lisanslı derlemeler için anahtar (güncel derlemelerde gerekmez; asla günlüğe yazılmaz) |
| `env` | `{}` | Motor süreci için ek ortam değişkenleri |
| `download` | `True` | Eksik motor ikili dosyasının otomatik indirilmesine izin ver |

### Ortam değişkenleri

Öncelik sırası: **açık başlatma seçeneği → ortam değişkeni → profil meta verisi → varsayılan**.

| Değişken | Varsayılan | Açıklama |
|---|---|---|
| `OMBRA_BINARY_PATH` | tanımlı değil | Bir motor ikili dosyasına açık yol |
| `OMBRA_CACHE_DIR` | `~/.ombra` | Önbelleğe alınmış motorlar ve adlandırılmış profiller için dizin |
| `OMBRA_DOWNLOAD_URL` | `https://api.github.com/repos/ombralabs/ombra/releases` | Motor indirme kaynağı; özel bir URL eski yansı modunu etkinleştirir (`none`/`off` indirmeleri kapatır) |
| `OMBRA_VERSION` | en son uyumlu | Sabitlenmiş motor sürümü (örneğin `158.0.8127.37-3`) |
| `OMBRA_RELEASE_CHANNEL` | `stable` | Motor sürüm kanalı: `stable` (GitHub sürümleri) veya `beta` (GitHub ön sürümleri) |
| `OMBRA_AUTO_UPDATE` | `true` | Başlatmada daha yeni motor derlemelerini kontrol et |
| `OMBRA_SKIP_CHECKSUM` | `false` | Yalnızca yerel geliştirme için: SHA-256 doğrulamasını devre dışı bırakır (uyarı günlüğü yazar) |
| `OMBRA_LICENSE_KEY` | tanımlı değil | Eski lisanslı derlemeler için anahtar (asla günlüğe yazılmaz) |
| `OMBRA_TIMEOUT_MS` | `30000` | Varsayılan başlatma zaman aşımı (ms) |
| `OMBRA_LOG_LEVEL` | `warn` | Günlük ayrıntı düzeyi: `error`, `warn`, `info`, `debug` |

### Tipli hatalar

Herhangi bir hata durumunda SDK, başlatılan motor sürecini sonlandırır, profil kilidini serbest bırakır ve kararlı bir `kind` alanı ile gizli bilgileri maskelenmiş `details` alanı taşıyan bir `OmbraError` alt sınıfı fırlatır:

`InvalidOptionError` · `BinaryNotFoundError` · `DownloadFailedError` · `ChecksumMismatchError` · `UnsupportedPlatformError` · `UnsupportedEngineError` · `ProxyError` · `ProfileBusyError` · `LaunchTimeoutError` · `CDPConnectError` · `EngineExitedError` · `EngineCrashedError` · `LicenseError`

Tam hata taksonomisi ve yeniden deneme kuralları [SDK sözleşmesinde (`docs/sdk-contract.md`)](../../docs/sdk-contract.md) belgelenmiştir.

## Platformlar, entegrasyonlar ve konteynerler

### Desteklenen platformlar ve çalışma zamanları

| Bileşen | Destek | Notlar |
|---|---|---|
| **macOS ARM64 (Apple Silicon)** | ✅ | GitHub Releases üzerinden bağımsız motor derlemeleri; Ombra Desktop Developer ID ile imzalı ve noter onaylıdır |
| **macOS x64 (Intel)** | — | Chromium 158 için güncel sürüm yok |
| **Linux x64** | ✅ | GitHub Releases üzerinden bağımsız motor derlemeleri; Node.js SDK, `.tar.xz` arşivini açmak için `xz-utils` (`xz`) gerektirir |
| **Windows x64** | ✅ | GitHub Releases üzerinden bağımsız motor derlemeleri ve Ombra Desktop kurulum dosyası |
| **Python** | `3.10+` | Playwright `>=1.60,<2.0`, `ombrabrowser` ile otomatik olarak kurulur |
| **Node.js** | `20+` | Playwright `>=1.60,<2.0` veya Puppeteer `>=22` (Puppeteer 25+ için Node.js `>=22.12` gerekir) |

### Çerçeve ve yapay zeka ajanı entegrasyonları

Ombra, özel bir Chromium ikili dosyasını kabul eden veya CDP üzerinden bağlanan her otomasyon aracı ya da yapay zeka ajanı çerçevesiyle (`browser-use`, `Crawl4AI`, `Crawlee`, `Scrapling`, `Stagehand`, `LangChain` ve diğerleri) çalışır:

```python
# Seçenek 1: kendi çalıştırıcınız için doğrulanmış ikili yolunu ve çalıştırılabilir motor argümanlarını çözümleyin
# Not: build_launch_options() bir dry-run yardımcısıdır — user_data_dir ve seed değerlerini açıkça geçin
# (adlandırılmış profiller ve kimlik doğrulamalı proxy'ler Seçenek 2'yi gerektirir).
from ombrabrowser import build_launch_options

cmd = build_launch_options(
    user_data_dir="./agent-1",
    fingerprint={"seed": 20261116},
    humanize=True,
)
binary_path = cmd["binary_path"]
engine_args = cmd["args"]

# Seçenek 2: Ombra SDK üzerinden başlatın ve yerel CDP uç noktasını çerçevenize verin
from ombrabrowser import launch_async, last_launch_info

browser = await launch_async(profile="agent-1", humanize=True)
info = last_launch_info(browser)
ws_url = info["ws_url"]             # ws://127.0.0.1:<port>/devtools/browser/...
cdp_http = f"http://127.0.0.1:{info['cdp_port']}"
# Çerçevenizi ws_url veya cdp_http adresine bağlayın — parmak izi ayarları ve humanize
# motorun içinde çalışır ve tüm CDP istemcileri için etkin kalır
```

### Docker ve Linux sunucularında çalıştırma

İmaj derleme aşamasında motoru önceden indirip doğrulayan örnek bir `Dockerfile`:

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

> **Konteynerler ve web sunucuları:**
> - Konteyneriniz Chromium sandbox ortamını başlatamıyorsa `--no-sandbox` bayrağını `args=["--no-sandbox"]` üzerinden açıkça geçin (SDK bu bayrağı kendi başına asla eklemez).
> - Ekransız (headless) bir sunucuda `headless=False` ile çalıştırmak için `Xvfb` kullanın (bkz. [aşağısı](#sorun-giderme)).
> - `uvloop` ile `uvicorn` altında çalışırken alt süreç borusu (pipe) takılmalarını önlemek için `--loop asyncio` parametresini geçin.

## Sorun giderme

### Site headless modunu engelliyor

Bazı anti-bot sistemleri C++ yamaları olsa bile headless moddaki davranışsal ve işleme (rendering) farklarını kontrol eder. `Xvfb` ile sanal bir ekran üzerinde `headless=False` olarak çalıştırın:

```bash
sudo apt-get install -y xvfb
Xvfb :99 -screen 0 1920x1080x24 &
export DISPLAY=:99
```

Ardından konut tipi bir SOCKS5/HTTP proxy, kalıcı bir profil, eşleşen saat dilimi/yerel ayar, `headless=False` ve `humanize=True` ile başlatın (bu README'nin başındaki `launch_persistent_context()` örneğine bakın).

Linux üzerinde engellemeler devam ediyorsa [Linux üzerinde yazı tipi kurulumu](#linux-üzerinde-yazı-tipi-kurulumu) bölümünü kontrol edin.

### Site her ziyarette doğrulama istiyor

`profile` belirtmeden `launch()` çağırmak her seferinde boş bir geçici dizin ve yeni bir `seed` ile başlar; bu nedenle site her çalıştırmayı çerezsiz, yepyeni bir ziyaretçi olarak değerlendirir. Çerezlerin, `localStorage` verilerinin ve `seed` değerinin çalıştırmalar arasında taşınması için `profile="..."` veya `launch_persistent_context(...)` kullanımına geçin.

### `ProfileBusyError`

Adlandırılmış bir profil veya `user_data_dir` aynı anda yalnızca tek bir süreçte açık olabilir. Her paralel çalışana ayrı bir profil adı atayın (`profile=f"worker-{i}"`). Çöken süreçlerin geride bıraktığı bayat kilitler otomatik olarak algılanır ve temizlenir.

### `playwright install chromium` komutunu çalıştırmam gerekiyor mu?

Hayır. Ombra kendi motor ikili dosyasını çalıştırır ve Playwright'ın standart Chromium'unu kullanmaz. Linux üzerinde yalnızca sistem kütüphanelerine ve `xz-utils` paketine ihtiyacınız vardır:

```bash
sudo apt-get install -y xz-utils
playwright install-deps chromium
```

### Motoru güncelleme, kanal değiştirme ve eski sürüme dönme

SDK'yı en son sürüme güncelleyin:

```bash
python -m pip install -U ombrabrowser
npm install @ombralabs/sdk@latest
```

`beta` kanalını test edin veya belirli bir motor derlemesini sabitleyin / eski sürüme dönün:

```python
# Belirli bir başlatma için kesin bir derlemeyi sabitle
browser = launch(version="158.0.8127.37-3")
```

```bash
# Beta kanalını test et (OMBRA_VERSION değişkenini kaldırın — kesin -N sabitlemesi kanalı yok sayar)
unset OMBRA_VERSION
export OMBRA_RELEASE_CHANNEL=beta
ombrabrowser update

# Veya belirli bir motor derlemesini sabitle / eski sürüme dön
export OMBRA_VERSION=158.0.8127.37-3
ombrabrowser install --version 158.0.8127.37-3

# Veya yerel olarak derlenmiş bir ikili dosyayı göster
export OMBRA_BINARY_PATH=/path/to/ombra/chromium
```

### macOS: Gatekeeper yerel derlemeyi engelliyor

Apple Silicon macOS için resmi Ombra sürümleri bir Apple Developer ID sertifikasıyla imzalanmış ve noter onayından geçmiştir. İmzasız yerel bir geliştirici derlemesi çalıştırıyorsanız ve macOS bunu karantinaya alıyorsa, karantina özniteliğini bir kez temizleyin:

```bash
xattr -cr ~/.ombra/engines/*/*.app
```

### Eşzamanlı Python'da sayfada bekleme

Eşzamanlı (senkron) Playwright'ta `page.goto()` sonrasında tek bir uzun `time.sleep(15)` çağrısı yapmak Playwright'ın olay döngüsünü duraklatır ve bu da doğrulama sayfalarının takılmasına neden olabilir. Bunun yerine hafif bir bağlam çağrısıyla kısa aralıklarla bekleyin:

```python
import time

for _ in range(15):
    page.context.cookies()  # sayfa DOM'una dokunmadan Playwright'ın işlemeye devam etmesini sağlar
    time.sleep(1)
```

Asenkron Python'da `await asyncio.sleep(...)`; Node.js'te `await new Promise(r => setTimeout(r, ms))` kullanın. Ayrıca fazladan CDP trafiği üretmemek için kontrollerden önce sık `page.wait_for_timeout()` ve gereksiz `page.evaluate()` çağrılarından kaçının.

## Güvenlik

- **Motor özgünlüğü ve bütünlüğü.** Arşivi açmadan önce SDK, sürüm zarfının Ed25519 imzasını sabitlenmiş genel anahtara karşı doğrular ve hem arşivin hem de yürütülebilir dosyanın SHA-256 özetini kontrol eder.
- **Yalnızca yerel CDP.** Hata ayıklama bağlantı noktası kesin olarak `127.0.0.1` adresine bağlanır. Bir CDP bağlantı noktasını ek kimlik doğrulama olmadan genel bir ağa asla açmayın — CDP tarayıcı üzerinde tam denetim verir.
- **Gizli bilgi yalıtımı.** Proxy kimlik bilgileri yalnızca yerel loopback aktarıcının belleğinde yaşar ve süreç komut satırlarında, profil meta verilerinde, günlüklerde veya hata ayrıntılarında asla görünmez.
- **Telemetri yok.** SDK hiçbir analitik verisi, çökme raporu veya gizli ağ isteği göndermez.

Güvenlik sorunlarını [SECURITY.md](../../SECURITY.md) dosyasına uygun olarak gizli biçimde bildirin.

## Depo haritası

```text
.
├── README.md                    # İngilizce kök README
├── translations/
│   ├── tr/README.md             # bu dosya (Türkçe)
│   ├── ru/README.md             # Rusça çeviri
│   └── <locale>/README.md       # 19 ek yerelleştirme
├── desktop/                     # Ombra Desktop (Tauri: Rust kataloğu + Vue arayüzü)
├── docs/
│   ├── architecture.md          # mimari, güven sınırları, yaşam döngüsü
│   ├── sdk-contract.md          # v0.2 başlatma sözleşmesi, seçenekler, hatalar, değişmezler
│   ├── stealth-checkup.md       # gizlilik kontrolü yöntemi (İngilizce)
│   ├── stealth-checkup.ru.md    # gizlilik kontrolü yöntemi (Rusça)
│   ├── versioning.md            # SDK, motor ve istemci sürümleme kuralları
│   └── desktop/                 # Desktop yerel profil ve anahtar kılavuzları
├── spec/
│   └── schemas/                 # başlatma seçenekleri ve ikili meta verileri için JSON Şemaları
├── sdks/
│   ├── manifest.json            # makine tarafından okunabilir SDK kayıt defteri
│   ├── README.md                # SDK dizin yapısı ve katkı kuralları
│   ├── python/                  # Python SDK (ombrabrowser olarak yayımlanır)
│   ├── node/                    # Node.js / TypeScript SDK (@ombralabs/sdk olarak yayımlanır)
│   └── ...                      # diğer diller için sözleşme iskeletleri (Go, Rust, C#, Java, PHP, Ruby)
├── conformance/                 # diller arası başlatma ve gizlilik değişmezi test senaryoları
├── tools/check_repo.py          # yapı, şema ve bağlantı doğrulayıcı (CI)
└── .github/workflows/ci.yml
```

Bu depo SDK sözleşmesini, şemaları, uyumluluk test senaryolarını, belgeleri ve Ombra Desktop kaynak kodunu barındırır. Chromium motor yamaları ayrı bir depoda tutulur; derlenmiş ikili paketler [GitHub Releases](https://github.com/ombralabs/ombra/releases) üzerinden yayımlanır.

## Sıkça sorulan sorular (SSS)

### Bu bir Playwright çatalı mı?

Hayır. SDK, resmi Playwright (veya Puppeteer) istemcisini yerel CDP üzerinden Ombra Chromium'a bağlar. Tüm tipler, konumlandırıcılar, beklemeler ve sayfa nesneleri standart kalır.

### Ombra ücretsiz mi ve lisans anahtarına ihtiyacım var mı?

Bu depodaki SDK kaynak kodu Apache License 2.0 altında açık kaynaklıdır. Güncel motor derlemeleri ile yerel Ombra Desktop profil yöneticisi ücretsiz ve bağımsız çalışır — hesap, lisans anahtarı, donanım kimliği veya profil sayısı sınırı yoktur. `license_key` ve `OMBRA_LICENSE_KEY` yalnızca eski lisanslı derlemeler için gereklidir.

### SDK'yı kullanmak için Ombra Desktop'ı kurmam gerekiyor mu?

Hayır. SDK motoru doğrudan alt süreç olarak başlatır; bu da onu betikler, konteynerler ve CI için uygun hale getirir. Ombra Desktop, yerel bir profil kataloğunu grafik arayüzle yönetmek istiyorsanız isteğe bağlıdır.

### Ombra'nın `playwright-stealth` aracından farkı nedir?

`playwright-stealth`, standart bir tarayıcı üzerinde sayfalara JavaScript enjekte eder ve modern dedektörler çoğu zaman yamaların kendisini tespit eder. Ombra değişikliklerini doğrudan Chromium kaynak koduna derler ve SDK sayfalara hiçbir betik enjekte etmez.

### Kendi proxy'mi kullanabilir miyim?

Evet. `proxy` seçeneğinde bir `http://`, `https://` veya `socks5://` proxy'si geçin. Kimlik bilgileri mevcutsa SDK yerel bir loopback aktarıcı çalıştırır, böylece bunlar süreç argümanlarında asla görünmez. Playwright'ın kendi `context.request` / `page.request` istemcisinin tarayıcı düzeyindeki proxy ayarlarını atlayabileceğini unutmayın — trafiğin proxy üzerinden gitmesini garanti etmek için `fetch()` çağrısını sayfa bağlamından yapın.

### Hangi Playwright ve Puppeteer sürümleri destekleniyor?

Python SDK, Playwright `>=1.60,<2.0` sürümünü gerektirir (`ombrabrowser` ile otomatik olarak kurulur). Node.js SDK, `playwright-core@^1.60.0` veya `puppeteer-core >=22.0.0` sürümlerini destekler. Uyumluluk kuralları için [sürümleme kılavuzuna](../../docs/versioning.md) bakın.

### Ombra her bot kontrolünden geçmeyi garanti ediyor mu?

Hayır. Tespit sistemleri siteye, bölgeye, IP itibarına, profil geçmişine ve dedektör sürümüne göre sürekli değişen bir hedeftir. Belirli bir yapılandırmayı nesnel olarak ölçmek ve izlemek için [gizlilik kontrolü yöntemini](../../docs/stealth-checkup.md) kullanın.

### Ombra hangi kullanım senaryoları için geliştirildi?

Ombra yetkili otomasyon, QA testi, izleme, araştırma ve yalıtılmış çalışma profillerinin yönetimi için geliştirilmiştir. Yetkisiz erişim, kimlik bilgisi doldurma (credential stuffing) ve kötüye kullanım desteklenmez.

## Katkıda bulunma

Katkı yönergeleri [CONTRIBUTING.md](../../CONTRIBUTING.md), topluluk standartları [CODE_OF_CONDUCT.md](../../CODE_OF_CONDUCT.md) ve SDK talimatları [sdks/README.md](../../sdks/README.md) dosyalarındadır.

- Yeni bir başlatma seçeneği eklemeden önce [SDK sözleşmesini](../../docs/sdk-contract.md) ve [şemaları](../../spec/schemas) güncelleyin.
- SDK davranışını değiştirirken uygulamayı, testleri ve [conformance](../../conformance/README.md) içindeki ortak senaryoları güncelleyin.
- Bir pull request açmadan önce depo yapısını ve bağlantıları doğrulamak için `python3 tools/check_repo.py` komutunu çalıştırın.

## Lisans

Bu depodaki SDK kaynak kodu [Apache License 2.0](../../LICENSE) altında lisanslanmıştır. Bu lisans Ombra ticari markaları, Ombra Chromium motoru veya Ombra Desktop üzerinde hak vermez — ticari marka ve üçüncü taraf koşulları için [NOTICE](../../NOTICE) dosyasına bakın.

## Bağlantılar

- 🌐 **Web sitesi** — [ombrabrowser.dev](https://ombrabrowser.dev)
- 📦 **PyPI** — [pypi.org/project/ombrabrowser](https://pypi.org/project/ombrabrowser/)
- 📦 **npm** — [npmjs.com/package/@ombralabs/sdk](https://www.npmjs.com/package/@ombralabs/sdk)
- 🚀 **Sürümler (motor ve Desktop)** — [GitHub Releases](https://github.com/ombralabs/ombra/releases)
- 📋 **Değişiklik günlüğü** — [CHANGELOG.md](../../CHANGELOG.md)
- 🐛 **Hatalar ve özellik istekleri** — [GitHub Issues](https://github.com/ombralabs/ombra/issues)
- 🏢 **Kuruluş** — [Ombra Labs](https://github.com/ombralabs)
