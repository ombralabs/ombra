# <img src="../../assets/logo.svg" width="24" height="24" alt=""> Ombra SDKs

Python と Node.js の `launch()` は Ombra Chromium を起動し、Playwright の `Browser` を返します。Node.js で Puppeteer を使う場合は `launchPuppeteer()` を呼び出します。

**[インストール](#インストール)** · <a href="../../README.md">English</a>

<details>
<summary>言語</summary>

[English](../../README.md) · [Русский](../ru/README.md) · [Deutsch](../de/README.md) · [Español](../es/README.md) ·
[Français](../fr/README.md) · [Italiano](../it/README.md) · [Nederlands](../nl/README.md) · [Polski](../pl/README.md) ·
[Português](../pt/README.md) · [Română](../ro/README.md) · [Türkçe](../tr/README.md) · [Українська](../uk/README.md) ·
[Tiếng Việt](../vi/README.md) · [Bahasa Indonesia](../id/README.md) · [简体中文](../zh-Hans/README.md) · [繁體中文](../zh-Hant/README.md) ·
[日本語](README.md) · [한국어](../ko/README.md) · [ไทย](../th/README.md) · [हिंदी](../hi/README.md) ·
[Filipino](../fil/README.md) · [ខ្មែរ](../km/README.md)

</details>

## Chromium でのフィンガープリント制御

Ombra は Chromium にフィンガープリント制御を組み込んでいます。対象は Canvas、WebGL、オーディオ、フォント、ハードウェアの論理コア数、要素の境界、GPU 文字列、タイムゾーン、自動化のシグナルです。TLS と HTTP/2 には Chromium のネットワークスタックを使い、人の操作を模した入力はブラウザプロセス内で処理します。

SDK はローカルでエンジンを起動し、Chrome DevTools Protocol（CDP）経由で自動化クライアントを接続します。Ombra デスクトップアプリをインストールせずに、スクリプト、コンテナ、CI ジョブで実行できます。

## ステータス

サンプルは公開済みの Python 版と Node.js 版のアルファパッケージを使用します。このリポジトリでは、共通の起動コントラクトと 8 つの SDK のひな形を管理しています。

| コンポーネント | 状態 |
|---|---|
| [SDK コントラクト](../../docs/sdk-contract.md) | ドラフト `0.1.0` |
| Python SDK | `0.1.3` アルファ版 · [PyPI の `ombrabrowser`](https://pypi.org/project/ombrabrowser/) |
| Node.js SDK | `0.1.0` アルファ版 · [npm の `@ombralabs/sdk`](https://www.npmjs.com/package/@ombralabs/sdk) |
| [共通スキーマ](../../spec/schemas) | 起動オプションとエンジンバイナリのメタデータ |
| [言語間の適合性テスト](../../conformance) | 両方の SDK で共用するテストケース |
| [ステルスチェックアップ](../../docs/stealth-checkup.md) | 判定基準と報告用テンプレート |

## インストール

**Python**

```bash
python -m pip install ombrabrowser
```

**Node.js / TypeScript**

```bash
npm install @ombralabs/sdk "playwright-core@^1.60.0"
```

Puppeteer を使う場合は、`playwright-core` の代わりに `puppeteer-core` をインストールしてください。対応するクライアントとランタイムのバージョンは [npm のパッケージページ](https://www.npmjs.com/package/@ombralabs/sdk)で確認できます。

SDK はまず、Python の `binary_path` または Node.js の `binaryPath` で指定したパスを確認します。次に `OMBRA_BINARY_PATH`、デスクトップアプリのエンジンディレクトリ、SDK のキャッシュを順に調べます。エンジンが見つからなければダウンロードして検証します。

ダウンロードを無効にするには、Python では `download=False`、Node.js では `download: false` を指定します。ブラウザを開かずにエンジンを準備するには、Python の `ensure_binary()` または Node.js の `ensureBinary()` を呼び出します。

## クイックスタート

**Python**

```python
from ombrabrowser import launch

browser = launch()
page = browser.new_page()
page.goto("https://example.com")
print(page.title())
browser.close()
```

名前付きプロファイルの Cookie とサイトストレージを再利用するには、既存のコンテキストでページを開きます。この例ではプロキシも指定します。

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

Puppeteer の `Browser` を取得するには `launchPuppeteer()` を呼び出します。

```ts
import { launchPuppeteer } from "@ombralabs/sdk";

const browser = await launchPuppeteer({ headless: false });
await browser.close();
```

## ドロップイン移行

Python の Playwright スクリプトを移行するには、`ombrabrowser` をインストールし、インポート文と起動の呼び出しを変更します。ページのメソッド、型、セレクターは引き続き Playwright のものを使えます。

```diff
- from playwright.sync_api import sync_playwright
- pw = sync_playwright().start()
- browser = pw.chromium.launch()
+ from ombrabrowser import launch
+ browser = launch()

  page = browser.new_page()
  page.goto("https://example.com")
```

Node.js でも同じように 2 行を変更します。

```diff
- import { chromium } from "playwright";
- const browser = await chromium.launch();
+ import { launch } from "@ombralabs/sdk";
+ const browser = await launch();
```

## 仕組み

```mermaid
flowchart LR
    Script["あなたのスクリプト<br/>Playwright · Puppeteer"]
    SDK["Ombra SDK<br/>launch() + CDP ブリッジ"]
    Engine["Ombra Chromium<br/>パッチ適用済みエンジン"]
    Client["ネイティブ自動化クライアント"]
    Profile[("プロファイル<br/>シード · Cookie · 拡張機能")]

    Script -->|launch()| SDK
    SDK -->|起動| Engine
    SDK -->|CDP 経由で接続| Client
    Script --> Client
    Client -->|CDP| Engine
    Engine --> Profile
```

1. `launch()` はエンジンを探し、必要に応じてダウンロードして、バイナリを検証します。
2. SDK はプロファイルのディレクトリとシードを決めます。プロキシに認証が必要な場合は、ローカルで中継プロセスを起動します。
3. 選択したプロファイル、起動オプション、ループバックのデバッグポートを指定して Chromium を起動します。
4. `DevToolsActivePort` の準備が整うと、SDK は CDP 経由で Playwright または Puppeteer を接続し、そのクライアントの `Browser` を返します。
5. `browser.close()` はエンジンを停止し、プロファイルのロックを解放します。

起動後、クライアントはページ操作のコマンドを Chromium に直接送ります。

## SDK マトリクス

| ランタイム | 公開済みパッケージ | ブラウザオブジェクト |
|---|---|---|
| Python 3.10+ | `ombrabrowser` | `launch()` → Playwright `Browser` |
| Node.js 20+ | `@ombralabs/sdk` | `launch()` → Playwright `Browser`<br>`launchPuppeteer()` → Puppeteer `Browser` |

このリポジトリには、ほかに 6 つの SDK 用のディレクトリがあります。予定されているパッケージとクライアントは [SDK マニフェスト](../../sdks/manifest.json)に、ディレクトリ構成は [SDK ガイド](../../sdks/README.md)に記載しています。

| 対象ランタイム | 予定されているパッケージ | クライアントまたは戻り値の型 |
|---|---|---|
| .NET 8+ | `Ombra` (NuGet) | Microsoft.Playwright `IBrowser` |
| Java 17+ | `dev.ombra:ombra` (Maven Central) | Playwright `Browser` |
| Go 1.22+ | `github.com/ombralabs/ombra/sdks/go` | chromedp |
| PHP 8.2+ | `ombralabs/ombra` (Packagist) | `Ombra\Browser` (CDP) |
| Ruby 3.2+ | `ombra` (RubyGems) | `Ferrum::Browser` |
| Rust 1.78+ | `ombra` (crates.io) | `chromiumoxide::Browser` |

## 起動オプション

表には Python API と SDK コントラクトのオプション名を示します。Node.js では `timeoutMs`、`userDataDir`、`binaryPath` のようにキャメルケースを使います。

| オプション | 既定値 | 意味 |
|---|---|---|
| `headless` | `true` | ウィンドウなしでエンジンを実行 |
| `proxy` | なし | プロキシの URL または設定オブジェクト。認証付きプロキシはローカルで中継 |
| `fingerprint` | なし | シードと、OS、タイムゾーン、ロケール、画面、GPU の設定 |
| `profile` | なし | Cookie、ストレージ、シードを永続化する名前付きプロファイル |
| `user_data_dir` | 一時ディレクトリ | 明示的なプロファイルディレクトリ。`profile` とは併用できません |
| `args` | `[]` | 追加のエンジンフラグ。変更せずそのまま渡されます |
| `timeout_ms` | `30000` | 起動と CDP 接続に許容する時間（ミリ秒） |
| `humanize` | エンジンの既定値 | `false`、`true`、またはプリセット |
| `captcha` | `false` | 任意の制限付きでエンジンモジュールを有効化 |
| `binary_path` | 自動的に特定 | 特定のエンジンバイナリを使用 |
| `download` | `true` | 見つからないエンジンバイナリをダウンロード |

すべての起動オプション、エラーの種類、プロファイルの動作は [SDK コントラクト](../../docs/sdk-contract.md)に記載しています。

## バイナリ管理

```python
from ombrabrowser import binary_info, ensure_binary, clear_cache

print(binary_info())
# {'version': '151.0.7922.108', 'platform': 'macos-arm64',
#  'path': '…', 'installed': True, 'source': 'cache', 'sha256': '…'}

ensure_binary()   # download and verify without launching
clear_cache()     # remove SDK-managed binaries; profiles are untouched
```

SDK は起動前にエンジンの SHA-256 チェックサムを検証します。本番環境では検証を有効にしてください。`OMBRA_SKIP_CHECKSUM=1` はローカルの開発ビルド用です。

## 設定

| 変数 | 既定値 | 意味 |
|---|---|---|
| `OMBRA_BINARY_PATH` | 未設定 | 明示的なエンジンバイナリ |
| `OMBRA_CACHE_DIR` | `~/.ombra` | 管理対象のバイナリと名前付きプロファイル |
| `OMBRA_DOWNLOAD_URL` | リリースエンドポイント | バイナリのダウンロード先ベース URL |
| `OMBRA_VERSION` | 最新の互換バージョン | 解決対象のエンジンバージョン |
| `OMBRA_AUTO_UPDATE` | `true` | 起動時に新しいエンジンを確認 |
| `OMBRA_SKIP_CHECKSUM` | `false` | 開発専用 |
| `OMBRA_LICENSE_KEY` | 未設定 | エンジンに渡されます |
| `OMBRA_TIMEOUT_MS` | `30000` | 起動タイムアウトの既定値（ミリ秒） |
| `OMBRA_LOG_LEVEL` | `warn` | `error`、`warn`、`info`、`debug` |

SDK は起動オプション、環境変数、プロファイルのメタデータ、既定値の順に調べ、最初に見つかった値を使用します。

## 比較

| 機能 | Playwright | playwright-stealth | undetected-chromedriver | Ombra |
|---|---|---|---|---|
| API | Playwright | Playwright | Selenium | Playwright または Puppeteer |
| パッチの適用階層 | なし | ページ内 JavaScript | 設定フラグ | エンジンのソース |
| フィンガープリントのシード | なし | なし | 一部 | プロファイルごと |
| ヒューマナイズ入力 | なし | なし | なし | エンジン |
| プロファイルの分離 | ブラウザコンテキスト | ブラウザコンテキスト | なし | ユーザーデータディレクトリ |
| ドロップイン移行 | — | インポートの変更 | 書き換え | インポートの変更 |

検出結果はサイト、出口 IP、プロファイルによって変わります。測定手順は[ステルスチェックアップ](../../docs/stealth-checkup.md)にあります。

## ステルスはエンジンの特性

フィンガープリントの設定を適用するのはエンジンです。SDK はプロファイルのシードと明示的な起動オプションをエンジンに渡します。

| レイヤー | Ombra が処理する場所 |
|---|---|
| TLS と HTTP/2 | エンジンビルドにバージョンを合わせた Chromium 自身のネットワークスタック |
| ブラウザの識別情報 | プロファイルのシードに基づくソースレベルのエンジンパッチ |
| 自動化の露出面 | WebDriver シグナル向けのエンジンパッチ。SDK は `Runtime.enable` を呼び出しません |
| 入力 | ブラウザプロセス内で行われるヒューマナイズされたポインター操作、キーボード入力、スクロール |
| ネットワークの整合性 | プロキシを考慮したタイムゾーンとロケールの解決 |
| 状態 | プロファイルごとに独立したユーザーデータディレクトリ |

### SDK の境界

- CDP のデバッグポートは、ループバック経由のローカル接続だけを受け付けます。
- SDK はプロキシの認証情報、ライセンスキー、Cookie をログに記録しません。テレメトリも送信しません。
- 新しいシードを明示的に指定しない限り、既存のプロファイルは同じシードを使います。
- SDK は `addScriptToEvaluateOnNewDocument` や `evaluateOnNewDocument` でステルス用スクリプトを注入したり、ページのプロパティを書き換えたりしません。
- 準備完了の確認には CDP の HTTP エンドポイントか `Browser.getVersion` を使います。この確認で `Runtime.enable` を呼び出すことはありません。
- ブラウザの識別情報はエンジンが提供します。SDK は Playwright や Puppeteer でユーザーエージェントや識別情報を上書きせず、`Emulation.setUserAgentOverride`、`setTimezoneOverride`、`setLocaleOverride`、`setDeviceMetricsOverride` も呼び出しません。
- SDK が `--enable-automation`、`--disable-blink-features=AutomationControlled`、`--no-sandbox` を自動で追加することはありません。

## ステルスチェックアップ

使用する予定のエンジンビルド、自動化クライアント、プロファイルに対して、次のチェックを実行してください。

| レイヤー | 対象の例 | 合格基準 |
|---|---|---|
| L0 トランスポート | TrackMe、IP/WebRTC リークチェック | 出口 IP だけが見え、JA4 と HTTP/2 がエンジンの Chromium ビルドと一致すること |
| L1 アイデンティティ | ローカルプローブ、Sannysoft、Intoli | UA、UA-CH、プラットフォーム、GPU、フォント、画面の間に矛盾がないこと |
| L2 フィンガープリント | CreepJS、FingerprintJS、BrowserScan | ヘッドレス動作や偽装を示すマーカーがなく、再読み込みしてもフィンガープリントが安定していること |
| L3 自動化 | rebrowser、brotector、botd | CDP、初期化スクリプト、WebDriver のリークがないこと |
| L4 挙動 | 入力の忠実度、ヒューマナイズの痕跡、Cloudflare スモークテスト | イベントが信頼でき、順序が現実的で、チャレンジが解決されること |
| L5 安定性 | シード、ワーカー、iframe、クロスオリジン | 同じシードから、起動のたびに同じペルソナが生成されること |

手順書には結果の分類、問題の切り分け、報告方法をまとめています。[英語版](../../docs/stealth-checkup.md)と[ロシア語版](../../docs/stealth-checkup.ru.md)があります。

実行を再現して比較できるよう、各結果とあわせてエンジンビルド、クライアントのバージョン、プロファイル設定、プロキシの出口、検出器のバージョンを記録してください。

## リポジトリ構成

```text
.
├── README.md                  # 英語の原文
├── translations/
│   └── <locale>/README.md
├── desktop/                   # オフラインのプロファイルマネージャー
├── docs/
│   ├── desktop/               # プロファイルマネージャーのドキュメント
│   ├── architecture.md        # コンポーネント、起動フロー、境界
│   ├── sdk-contract.md        # v0 の起動コントラクトと SDK の動作
│   ├── stealth-checkup.md     # ステルス検証の手法とランブック
│   ├── stealth-checkup.ru.md  # ロシア語訳
│   └── versioning.md          # SDK、エンジン、クライアントの互換性
├── spec/
│   └── schemas/               # 起動オプションとバイナリ情報の JSON Schema
├── sdks/
│   ├── manifest.json          # 機械可読な SDK レジストリ
│   ├── README.md              # 構成とコントリビューションのルール
│   ├── _template/             # 新しい言語用の SDK のひな形
│   ├── python/  node/  dotnet/  java/
│   └── go/  php/  ruby/  rust/
├── conformance/               # 言語に依存しない起動とステルスのケース
├── tools/check_repo.py        # 構造とリンクの検証（CI）
└── .github/workflows/ci.yml
```

このリポジトリでは SDK のひな形、起動コントラクト、適合性テストケース、オフラインのプロファイルマネージャーを管理しています。Chromium エンジンと Desktop 1.2.1 の完全版は、それぞれ別のリポジトリにあります。[Desktop のソースとビルド手順](../../desktop/README.md) · [プロファイルマネージャーのドキュメント](../../docs/desktop/README.md)

## コントラクト

- `launch(options)` はエンジンを起動し、クライアントの `Browser` を返します。以降、クライアントは CDP 経由で Chromium と直接通信します。
- SDK は起動前にエンジンの対象プラットフォームと SHA-256 チェックサムを確認します。バイナリが見つからず、ダウンロードが有効なら取得します。
- 名前付きプロファイルは、次回の起動まで Cookie、サイトストレージ、プロファイルのシードを保持します。
- 起動に失敗した場合、SDK は自分が起動したプロセスを終了し、型付きエラーを返します。再試行するかどうかは呼び出し側が決めます。
- SDK、エンジン、自動化クライアントには、それぞれ独立したバージョン範囲があります。エンジンのビルドは Python の `binary_info()` または Node.js の `binaryInfo()` で確認できます。

## 互換性

| コンポーネント | サポート対象 |
|---|---|
| エンジン | SDK が選択したビルド。`binary_info()` または `binaryInfo()` で確認可能 |
| macOS | Apple Silicon と Intel |
| Windows | x64 |
| Linux | x64 |
| Python | 3.10 以降と、対応する Playwright のリリース |
| Node.js | 20 以降と、対応する Playwright または Puppeteer のリリース |

SDK とエンジンのバージョンは個別に管理されています。互換性がない場合、SDK は両方のバージョンを含む型付きエラーを返します。

## コントリビューション

レビューの流れは[コントリビューションガイド](../../CONTRIBUTING.md)に、ビルド手順は [SDK ガイド](../../sdks/README.md)に記載しています。

- SDK の動作を変更する場合は、対象の実装を更新し、テストまたは共通の適合性テストケースを追加してください。
- 新しい言語の SDK を追加するには、[SDK テンプレート](../../sdks/_template)をコピーし、[マニフェスト](../../sdks/manifest.json)に登録してドラフトのプルリクエストを作成してください。
- 起動オプションを追加する場合は、先に [SDK コントラクト](../../docs/sdk-contract.md)と[スキーマ](../../spec/schemas)を更新してください。
- エンジンレベルのステルス機能の変更はエンジンのリポジトリで行います。変更後も SDK はチェックアップの基準を満たす必要があります。
- セキュリティ上の問題は、[セキュリティポリシー](../../SECURITY.md)に従って非公開で報告してください。

## よくある質問

### これは Playwright のフォークですか？

いいえ。SDK は Playwright の公式クライアントを Ombra Chromium に接続します。Playwright の型、ヘルパー、ページオブジェクトを引き続き使えます。

### Ombra デスクトップアプリは必要ですか？

SDK はエンジンを直接起動します。デスクトップアプリは任意で、プロファイルを手動で管理する際に使えます。

### Ombra と playwright-stealth はどう違いますか？

Ombra のフィンガープリント制御は Chromium 自体に組み込まれています。SDK はページ内のスクリプトを変更しません。

### Ombra は CAPTCHA に対応していますか？

エンジンにはオプションの CAPTCHA モジュールがあります。対応範囲はタスクの種類、エンジンのビルド、利用可能なモデルによって異なります。SDK は起動ごとの設定を渡し、CDP 経由でモジュールの操作機能を提供します。

### 自分のプロキシを使えますか？

はい。`launch()` にプロキシを渡してください。認証付きプロキシはローカルで中継するため、エンジンのコマンドラインに認証情報が表示されることはありません。

### どのバージョンの Playwright と Puppeteer に対応していますか？

各 SDK のパッケージマニフェストに対応バージョンを記載しています。クライアントは個別の依存パッケージです。対応範囲は[バージョニングガイド](../../docs/versioning.md)で確認できます。

### Ombra はすべてのボット検出を通過できますか？

結果はサイト、地域、出口 IP の評価、検出ツールのバージョン、プロファイル設定によって変わります。特定の構成での測定方法は[ステルスチェックアップ](../../docs/stealth-checkup.md)で確認できます。

## ライセンス

このリポジトリの SDK ソースは [Apache License 2.0](../../LICENSE) でライセンスされています。このライセンスは、Ombra エンジン、Ombra の名称、ロゴに関する権利を許諾するものではありません。商標および第三者への帰属表示については [NOTICE](../../NOTICE) を参照してください。

---

[Ombra Labs](https://github.com/ombralabs) · [ombrabrowser.dev](https://ombrabrowser.dev)
