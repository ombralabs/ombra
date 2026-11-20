# <img src="../../assets/logo.svg" width="24" height="24" alt=""> Ombra SDKs

Python ve Node.js'te `launch()`, Ombra Chromium'u başlatır ve Playwright'ın `Browser` nesnesini döndürür. Node.js'te Puppeteer kullanmak için `launchPuppeteer()` işlevini çağırın.

**[Kurulum](#kurulum)** · <a href="../../README.md">English</a>

<details>
<summary>Diller</summary>

[English](../../README.md) · [Русский](../ru/README.md) · [Deutsch](../de/README.md) · [Español](../es/README.md) ·
[Français](../fr/README.md) · [Italiano](../it/README.md) · [Nederlands](../nl/README.md) · [Polski](../pl/README.md) ·
[Português](../pt/README.md) · [Română](../ro/README.md) · [Türkçe](README.md) · [Українська](../uk/README.md) ·
[Tiếng Việt](../vi/README.md) · [Bahasa Indonesia](../id/README.md) · [简体中文](../zh-Hans/README.md) · [繁體中文](../zh-Hant/README.md) ·
[日本語](../ja/README.md) · [한국어](../ko/README.md) · [ไทย](../th/README.md) · [हिंदी](../hi/README.md) ·
[Filipino](../fil/README.md) · [ខ្មែរ](../km/README.md)

</details>

## Chromium'da parmak izi kontrolleri

Ombra, tarayıcı parmak izini Chromium içinde yönetir. Bu kontroller canvas, WebGL, ses, yazı tipleri, donanımın desteklediği eşzamanlılık, sayfa öğelerinin konum ve boyutları, GPU tanımlayıcıları, saat dilimleri ve otomasyon sinyallerini kapsar. Motor, Chromium'un TLS ve HTTP/2 ağ yığınını kullanır. İnsan hareketlerine benzetilen giriş olaylarını tarayıcı sürecinde işler.

SDK, motoru yerel olarak başlatır ve otomasyon istemcisini Chrome DevTools Protocol (CDP) üzerinden bağlar. Ombra masaüstü uygulamasını kurmadan bir betikte, bir konteynerde veya sürekli entegrasyon (CI) görevinde çalıştırabilirsiniz.

## Durum

Örneklerde Python ve Node.js için yayımlanmış alfa paketleri kullanılır. Depoda ortak başlatma sözleşmesi ve sekiz SDK için hazırlanmış proje iskeletleri de bulunur.

| Bileşen | Durum |
|---|---|
| [SDK sözleşmesi](../../docs/sdk-contract.md) | `0.1.0` taslağı |
| Python SDK'sı | `0.1.3` alfa · [PyPI'da `ombrabrowser`](https://pypi.org/project/ombrabrowser/) |
| Node.js SDK'sı | `0.1.0` alfa · [npm'de `@ombralabs/sdk`](https://www.npmjs.com/package/@ombralabs/sdk) |
| [Ortak şemalar](../../spec/schemas) | Başlatma seçenekleri ve motorun çalıştırılabilir dosyasına ait üst veriler |
| [Diller arası uyumluluk testleri](../../conformance) | Her iki SDK için ortak test senaryoları |
| [Stealth kontrolü](../../docs/stealth-checkup.md) | Test ölçütleri ve rapor şablonu |

## Kurulum

**Python**

```bash
python -m pip install ombrabrowser
```

**Node.js / TypeScript**

```bash
npm install @ombralabs/sdk "playwright-core@^1.60.0"
```

Puppeteer kullanacaksanız `playwright-core` yerine `puppeteer-core` kurun. Desteklenen istemci ve Node.js sürümlerini [paketin npm sayfasında](https://www.npmjs.com/package/@ombralabs/sdk) bulabilirsiniz.

SDK, motoru önce Python'da `binary_path`, Node.js'te `binaryPath` ile belirttiğiniz yolda arar. Ardından sırasıyla `OMBRA_BINARY_PATH` değişkenini, masaüstü uygulamasının motor dizinini ve SDK önbelleğini kontrol eder. Motoru bulamazsa indirir ve dosyayı doğrular.

İndirmeleri kapatmak için Python'da `download=False`, Node.js'te `download: false` kullanın. Motoru tarayıcıyı açmadan hazırlamak için Python'da `ensure_binary()`, Node.js'te `ensureBinary()` işlevini çağırın.

## Hızlı başlangıç

**Python**

```python
from ombrabrowser import launch

browser = launch()
page = browser.new_page()
page.goto("https://example.com")
print(page.title())
browser.close()
```

Adlandırılmış bir profil kullanıyorsanız çerezleri ve sitelerin sakladığı verileri yeniden kullanmak için sayfaları profilin mevcut tarayıcı bağlamında açın. Bu örnekte bir proxy de tanımlanıyor.

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

Puppeteer'ın `Browser` nesnesini elde etmek için `launchPuppeteer()` işlevini kullanın.

```ts
import { launchPuppeteer } from "@ombralabs/sdk";

const browser = await launchPuppeteer({ headless: false });
await browser.close();
```

## Doğrudan geçiş

Playwright kullanan bir Python betiğini taşımak için `ombrabrowser` paketini kurun. İçe aktarma satırını ve tarayıcıyı başlatan çağrıyı değiştirin. Sayfa metotları, türler ve seçiciler yine Playwright'tan gelir.

```diff
- from playwright.sync_api import sync_playwright
- pw = sync_playwright().start()
- browser = pw.chromium.launch()
+ from ombrabrowser import launch
+ browser = launch()

  page = browser.new_page()
  page.goto("https://example.com")
```

Node.js'te de aynı değişiklik iki satır sürer.

```diff
- import { chromium } from "playwright";
- const browser = await chromium.launch();
+ import { launch } from "@ombralabs/sdk";
+ const browser = await launch();
```

## Nasıl çalışır

```mermaid
flowchart LR
    Script["Betiğiniz<br/>Playwright · Puppeteer"]
    SDK["Ombra SDK<br/>launch() + CDP köprüsü"]
    Engine["Ombra Chromium<br/>yamalanmış motor"]
    Client["Yerel otomasyon istemcisi"]
    Profile[("Profil<br/>başlangıç değeri · çerezler · uzantılar")]

    Script -->|launch()| SDK
    SDK -->|süreç başlat| Engine
    SDK -->|CDP üzerinden bağlan| Client
    Script --> Client
    Client -->|CDP| Engine
    Engine --> Profile
```

1. `launch()` motoru bulur veya indirir, ardından çalıştırılabilir dosyayı doğrular.
2. SDK profil dizinini ve profilin başlangıç değerini (seed) seçer. Proxy kimlik doğrulaması istiyorsa yerel bir aktarıcı başlatır.
3. Chromium'u seçili profil, başlatma seçenekleri ve geri döngü (loopback) arabirimindeki hata ayıklama portuyla başlatır.
4. `DevToolsActivePort` hazır olduğunda SDK, Playwright veya Puppeteer istemcisini CDP üzerinden bağlar ve istemcinin `Browser` nesnesini döndürür.
5. `browser.close()` motoru durdurur ve profil kilidini kaldırır.

Başlatma tamamlandıktan sonra istemci sayfa komutlarını doğrudan Chromium'a gönderir.

## SDK matrisi

| Çalışma ortamı | Yayımlanmış paket | Tarayıcı nesnesi |
|---|---|---|
| Python 3.10+ | `ombrabrowser` | `launch()` → Playwright `Browser` |
| Node.js 20+ | `@ombralabs/sdk` | `launch()` → Playwright `Browser`<br>`launchPuppeteer()` → Puppeteer `Browser` |

Depoda altı SDK için daha dizin bulunur. Planlanan paketler ve istemciler [SDK manifestinde](../../sdks/manifest.json) listelenmiştir. [SDK kılavuzu](../../sdks/README.md) dizin yapısını açıklar.

| Hedef çalışma ortamı | Planlanan paket | İstemci veya dönüş türü |
|---|---|---|
| .NET 8+ | `Ombra` (NuGet) | Microsoft.Playwright `IBrowser` |
| Java 17+ | `dev.ombra:ombra` (Maven Central) | Playwright `Browser` |
| Go 1.22+ | `github.com/ombralabs/ombra/sdks/go` | chromedp |
| PHP 8.2+ | `ombralabs/ombra` (Packagist) | `Ombra\Browser` (CDP) |
| Ruby 3.2+ | `ombra` (RubyGems) | `Ferrum::Browser` |
| Rust 1.78+ | `ombra` (crates.io) | `chromiumoxide::Browser` |

## Başlatma seçenekleri

Tablodaki seçenek adları Python API'sinde ve SDK sözleşmesinde kullanılan adlardır. Node.js karşılıklarında `timeoutMs`, `userDataDir` ve `binaryPath` örneklerindeki gibi camelCase kullanılır.

| Seçenek | Varsayılan | İşlevi |
|---|---|---|
| `headless` | `true` | Motoru pencere açmadan çalıştırır |
| `proxy` | yok | Proxy URL'si veya yapılandırma nesnesi. Kimlik doğrulaması isteyen proxy'ler yerel bir aktarıcı kullanır |
| `fingerprint` | yok | Başlangıç değeri ile işletim sistemi, saat dilimi, yerel ayar, ekran ve GPU ayarları |
| `profile` | yok | Çerezleri, site verilerini ve başlangıç değerini saklayan adlandırılmış profil |
| `user_data_dir` | geçici | Açıkça belirtilen profil dizini. `profile` ile birlikte kullanılamaz |
| `args` | `[]` | Motora olduğu gibi aktarılan ek komut satırı seçenekleri |
| `timeout_ms` | `30000` | Başlatma ve CDP bağlantısı için milisaniye cinsinden süre sınırı |
| `humanize` | motorun varsayılanı | `false`, `true` veya hazır ayar |
| `binary_path` | otomatik belirlenir | Motor için belirli bir çalıştırılabilir dosya seçer |
| `download` | `true` | Motor dosyası eksikse indirir |

[SDK sözleşmesi](../../docs/sdk-contract.md) tüm başlatma seçeneklerini listeler, hata türlerini ve profillerin nasıl çalıştığını açıklar.

## İkili dosya yönetimi

```python
from ombrabrowser import binary_info, ensure_binary, clear_cache

print(binary_info())
# {'version': '151.0.7922.108', 'platform': 'macos-arm64',
#  'path': '…', 'installed': True, 'source': 'cache', 'sha256': '…'}

ensure_binary()   # download and verify without launching
clear_cache()     # remove SDK-managed binaries; profiles are untouched
```

SDK, başlatmadan önce motor dosyasının SHA-256 sağlama toplamını doğrular. Üretimde bu denetimi açık tutun. `OMBRA_SKIP_CHECKSUM=1` yerel geliştirme derlemeleri içindir.

## Yapılandırma

| Değişken | Varsayılan | İşlevi |
|---|---|---|
| `OMBRA_BINARY_PATH` | ayarlanmamış | Motorun çalıştırılabilir dosyası için açıkça belirtilen yol |
| `OMBRA_CACHE_DIR` | `~/.ombra` | SDK'nın yönettiği motor dosyalarının ve adlandırılmış profillerin dizini |
| `OMBRA_DOWNLOAD_URL` | sürüm indirme adresi | Motor dosyalarını indirmek için temel URL |
| `OMBRA_VERSION` | en son uyumlu sürüm | Kullanılacak motor sürümü |
| `OMBRA_AUTO_UPDATE` | `true` | Başlangıçta daha yeni bir motor sürümü olup olmadığını kontrol eder |
| `OMBRA_SKIP_CHECKSUM` | `false` | Yalnızca geliştirme için |
| `OMBRA_LICENSE_KEY` | ayarlanmamış | Motora iletilen lisans anahtarı |
| `OMBRA_TIMEOUT_MS` | `30000` | Milisaniye cinsinden varsayılan başlatma süresi sınırı |
| `OMBRA_LOG_LEVEL` | `warn` | `error`, `warn`, `info`, `debug` |

SDK sırasıyla başlatma seçeneklerine, ortam değişkenlerine, profil üst verilerine ve varsayılanlara bakar. Bulduğu ilk değeri kullanır.

## Karşılaştırma

| Özellik | Playwright | playwright-stealth | undetected-chromedriver | Ombra |
|---|---|---|---|---|
| API | Playwright | Playwright | Selenium | Playwright veya Puppeteer |
| Değişikliğin uygulandığı düzey | yok | sayfa içi JavaScript | yapılandırma seçenekleri | motorun kaynak kodu |
| Parmak izi için başlangıç değeri | yok | yok | kısmi | her profile ayrı |
| İnsan hareketlerine benzetilen girdi | yok | yok | yok | motorda |
| Profil yalıtımı | tarayıcı bağlamı | tarayıcı bağlamı | yok | kullanıcı verileri dizini |
| Doğrudan geçiş | — | içe aktarmayı değiştirme | yeniden yazma | içe aktarmayı değiştirme |

Algılama sonuçları siteye, çıkış IP adresine ve profile bağlıdır. [Kontrol kılavuzu](../../docs/stealth-checkup.md) bu sonuçların nasıl ölçüldüğünü açıklar.

## Stealth, motorun bir özelliğidir

Parmak izi ayarlarını motor uygular. SDK'lar profilin başlangıç değerini ve başlatırken belirttiğiniz seçenekleri motora iletir.

| Katman | Ombra'nın uygulaması |
|---|---|
| TLS ve HTTP/2 | Motorun derlendiği Chromium sürümünün kendi ağ yığını |
| Tarayıcı kimliği | Profilin başlangıç değerine göre çalışan, motorun kaynak kodundaki değişiklikler |
| Otomasyon sinyalleri | WebDriver sinyallerini motor işler. SDK `Runtime.enable` çağrısı yapmaz |
| Girdi | Tarayıcı sürecinde insan hareketlerine benzetilen işaretçi, klavye ve kaydırma girdileri |
| Ağ tutarlılığı | Saat dilimi ve yerel ayarlar belirlenirken proxy dikkate alınır |
| Durum | Her profil için ayrı bir kullanıcı verileri dizini |

### SDK'nın sınırları

- CDP hata ayıklama portu yalnızca geri döngü (loopback) arabiriminden gelen yerel bağlantıları kabul eder.
- SDK, proxy kimlik bilgilerini, lisans anahtarlarını ve çerezleri günlüklere yazmaz. Telemetri verisi göndermez.
- Açıkça yeni bir değer belirtmediğiniz sürece mevcut profil kendi başlangıç değerini korur.
- SDK `addScriptToEvaluateOnNewDocument` veya `evaluateOnNewDocument` ile stealth betikleri eklemez ve sayfa özelliklerini değiştirmez.
- Motorun hazır olup olmadığını denetlemek için SDK, CDP'nin HTTP uç noktasını veya `Browser.getVersion` çağrısını kullanır. Bu denetimde asla `Runtime.enable` çağrısı yapmaz.
- Tarayıcı kimliğini motor sağlar. SDK, Playwright veya Puppeteer üzerinden kullanıcı aracısını ya da kimliği değiştirmez. `Emulation.setUserAgentOverride`, `setTimezoneOverride`, `setLocaleOverride` veya `setDeviceMetricsOverride` çağrısı yapmaz.
- SDK kendiliğinden `--enable-automation`, `--disable-blink-features=AutomationControlled` veya `--no-sandbox` seçeneğini eklemez.

## Stealth kontrolü

Bu kontrolleri kullanmayı planladığınız motor derlemesi, otomasyon istemcisi ve profille çalıştırın.

| Katman | Örnek testler | Başarı ölçütleri |
|---|---|---|
| L0 Aktarım | TrackMe, IP/WebRTC sızıntı testleri | Yalnızca çıkış IP adresi görünür. JA4 ve HTTP/2, motorun Chromium derlemesiyle eşleşir |
| L1 Kimlik | Yerel test, Sannysoft, Intoli | UA, UA-CH, platform, GPU, yazı tipleri ve ekran arasında çelişki yoktur |
| L2 Parmak izi | CreepJS, FingerprintJS, BrowserScan | Penceresiz çalışma veya gerçeğe aykırı veri belirtisi yoktur. Sayfa yeniden yüklendiğinde parmak izi aynı kalır |
| L3 Otomasyon | rebrowser, brotector, botd | CDP, başlatma betiği veya WebDriver izi görülmez |
| L4 Davranış | Girdi doğruluğu, `humanize` izleri, Cloudflare temel işlev testi | Güvenilir olaylar gerçekçi bir sırada gerçekleşir ve doğrulama tamamlanır |
| L5 Kararlılık | Başlangıç değeri, worker, iframe, farklı kaynaklar | Aynı başlangıç değeri her çalıştırmada aynı kimliği üretir |

Test kılavuzu, test durumlarını, sorun gidermeyi ve sonuçların nasıl raporlanacağını açıklar. Kılavuzu [İngilizce](../../docs/stealth-checkup.md) veya [Rusça](../../docs/stealth-checkup.ru.md) okuyabilirsiniz.

Testleri tekrarlayabilmek ve karşılaştırabilmek için her sonuçla birlikte motor derlemesini, istemci sürümünü, profil ayarlarını, proxy'nin çıkış IP adresini ve algılama aracının sürümünü kaydedin.

## Depo haritası

```text
.
├── README.md                  # İngilizce özgün sürüm
├── translations/
│   └── <locale>/README.md
├── desktop/                   # çevrimdışı profil yöneticisi
├── docs/
│   ├── desktop/               # profil yöneticisinin belgeleri
│   ├── architecture.md        # bileşenler, başlatma akışı, sınırlar
│   ├── sdk-contract.md        # v0 başlatma sözleşmesi ve SDK davranışı
│   ├── stealth-checkup.md     # stealth doğrulama yöntemi ve test kılavuzu
│   ├── stealth-checkup.ru.md  # Rusça çeviri
│   └── versioning.md          # SDK, motor ve istemci uyumluluğu
├── spec/
│   └── schemas/               # başlatma seçenekleri ve ikili dosya bilgileri için JSON Schema
├── sdks/
│   ├── manifest.json          # makine tarafından okunabilir SDK kayıt defteri
│   ├── README.md              # düzen ve katkı kuralları
│   ├── _template/             # yeni bir dil için şablon
│   ├── python/  node/  dotnet/  java/
│   └── go/  php/  ruby/  rust/
├── conformance/               # dilden bağımsız başlatma ve stealth testleri
├── tools/check_repo.py        # yapı ve bağlantı doğrulaması (CI)
└── .github/workflows/ci.yml
```

Bu depoda SDK proje iskeletleri, başlatma sözleşmesi, uyumluluk testleri ve çevrimdışı profil yöneticisi bulunur. Chromium motorunun ve Desktop 1.2.1'in tam sürümünün ayrı depoları vardır. [Desktop kaynak kodu ve derleme kılavuzu](../../desktop/README.md) · [Profil yöneticisinin belgeleri](../../docs/desktop/README.md)

## Sözleşme

- `launch(options)` motoru başlatır ve istemcinin `Browser` nesnesini döndürür. Ardından istemci CDP üzerinden doğrudan Chromium ile iletişim kurar.
- SDK, başlatmadan önce motorun platformunu ve SHA-256 sağlama toplamını denetler. Motor dosyası yoksa ve indirmelere izin verilmişse dosyayı indirir.
- Adlandırılmış profiller çerezleri, sitelerin sakladığı verileri ve profilin başlangıç değerini oturumlar arasında korur.
- Başlatma başarısız olursa SDK başlattığı süreci sonlandırır ve türü belirli bir hata fırlatır. Yeniden denenip denenmeyeceğine çağrıyı yapan kod karar verir.
- SDK'nın, motorun ve otomasyon istemcisinin sürüm aralıkları birbirinden bağımsızdır. Motor derlemesini öğrenmek için Python'da `binary_info()`, Node.js'te `binaryInfo()` kullanın.

## Uyumluluk

| Bileşen | Desteklenen sürüm veya platform |
|---|---|
| Motor | SDK'nın seçtiği derleme. `binary_info()` veya `binaryInfo()` ile sorgulanır |
| macOS | Apple Silicon ve Intel |
| Windows | x64 |
| Linux | x64 |
| Python | 3.10+ ve desteklenen bir Playwright sürümü |
| Node.js | 20+ ve desteklenen bir Playwright veya Puppeteer sürümü |

SDK ve motor birbirinden bağımsız sürümlendirilir. Sürümler uyumsuzsa SDK, türü belirli bir hata verir ve hata iletisinde her iki sürümü de belirtir.

## Katkıda bulunma

[Katkı kılavuzu](../../CONTRIBUTING.md) inceleme sürecini açıklar. Derleme yönergeleri [SDK kılavuzunda](../../sdks/README.md) yer alır.

- SDK davranışını değiştiriyorsanız ilgili uygulamayı güncelleyin ve bir test veya ortak uyumluluk senaryosu ekleyin.
- Yeni bir dil için [SDK şablonunu](../../sdks/_template) kopyalayın, yeni SDK'yı [manifeste](../../sdks/manifest.json) kaydedin ve taslak bir pull request açın.
- Yeni bir başlatma seçeneği eklemeden önce [SDK sözleşmesini](../../docs/sdk-contract.md) ve [şemaları](../../spec/schemas) güncelleyin.
- Motor düzeyindeki stealth değişiklikleri motorun deposunda yapılır. SDK'nın stealth kontrolünden geçmesi gerekir.
- Güvenlik sorunlarını [güvenlik politikasında](../../SECURITY.md) belirtilen özel kanaldan bildirin.

## SSS

### Ombra, Playwright'tan çatallanmış bir proje mi?

Hayır. SDK, Playwright'ın resmî istemcisini Ombra Chromium'a bağlar. Playwright'ın türlerini, yardımcı işlevlerini ve sayfa nesnelerini kullanmaya devam edebilirsiniz.

### Ombra masaüstü uygulamasına ihtiyacım var mı?

SDK motoru doğrudan başlatır. Masaüstü uygulaması isteğe bağlıdır ve profilleri elle yönetmenizi sağlar.

### Ombra ile playwright-stealth arasındaki fark nedir?

Ombra'nın parmak izi değişiklikleri Chromium'un içine derlenir. SDK sayfa betiklerine dokunmaz.

### Kendi proxy'mi kullanabilir miyim?

Evet. Proxy'yi `launch()` çağrısına iletin. Kimlik doğrulaması gereken bir proxy kullanıyorsanız yerel aktarıcı, kimlik bilgilerinin motorun komut satırında görünmesini önler.

### Hangi Playwright ve Puppeteer sürümleri destekleniyor?

Her SDK kendi paket manifestinde desteklenen istemci sürümlerini belirtir. İstemciler ayrı bağımlılıklardır. Desteklenen sürüm aralıkları için [sürümlendirme kılavuzuna](../../docs/versioning.md) bakın.

### Ombra her bot denetiminden geçer mi?

Sonuçlar siteye, bölgeye, çıkış IP adresinin itibarına, algılama aracının sürümüne ve profil ayarlarına bağlıdır. [Stealth kontrol kılavuzu](../../docs/stealth-checkup.md) belirli bir yapılandırmanın nasıl değerlendirileceğini açıklar.

## Lisans

Bu depodaki SDK kaynak kodu [Apache Lisansı 2.0](../../LICENSE) ile lisanslanmıştır. Lisans, Ombra motoru, Ombra adı veya logoya ilişkin hak vermez. Ticari markalar ve üçüncü taraflara yapılan atıflar için [NOTICE](../../NOTICE) dosyasına bakın.

---

[Ombra Labs](https://github.com/ombralabs) · [ombrabrowser.dev](https://ombrabrowser.dev)
