<p align="center">
<img src="../../assets/logo.svg" width="72" height="72" alt="Ombra">
</p>

<h1 align="center">Ombra</h1>

<p align="center">
<a href="https://pypi.org/project/ombrabrowser/"><img src="https://img.shields.io/pypi/v/ombrabrowser?label=PyPI" alt="PyPI"></a>
<a href="https://www.npmjs.com/package/@ombralabs/sdk"><img src="https://img.shields.io/npm/v/@ombralabs/sdk?label=npm" alt="npm"></a>
<a href="../../LICENSE"><img src="https://img.shields.io/github/license/ombralabs/ombra" alt="ライセンス"></a>
<a href="https://github.com/ombralabs/ombra"><img src="https://img.shields.io/github/last-commit/ombralabs/ombra" alt="最終コミット"></a>
<br>
<a href="https://github.com/ombralabs/ombra"><img src="https://img.shields.io/github/stars/ombralabs/ombra" alt="スター数"></a>
<a href="https://pypi.org/project/ombrabrowser/"><img src="https://img.shields.io/pepy/dt/ombrabrowser?label=pypi&logo=pypi&logoColor=white" alt="PyPI ダウンロード数"></a>
<a href="https://www.npmjs.com/package/@ombralabs/sdk"><img src="https://img.shields.io/npm/dt/@ombralabs/sdk?label=npm&logo=npm&logoColor=white" alt="npm ダウンロード数"></a>
<a href="https://github.com/ombralabs/ombra/releases"><img src="https://img.shields.io/github/v/release/ombralabs/ombra?label=release" alt="リリース"></a>
</p>

<p align="center">
<a href="#インストール"><strong>インストール</strong></a> ·
<a href="#python-api">Python API</a> ·
<a href="#nodejs-および-typescript-api">Node.js API</a> ·
<a href="#人間らしい入力">人間らしい入力</a> ·
<a href="#ombra-desktop">Ombra Desktop</a> ·
<a href="../../README.md">English</a>
</p>

<details>
<summary>言語</summary>

[English](../../README.md) · [Русский](../ru/README.md) · [Deutsch](../de/README.md) · [Español](../es/README.md) ·
[Français](../fr/README.md) · [Italiano](../it/README.md) · [Nederlands](../nl/README.md) · [Polski](../pl/README.md) ·
[Português](../pt/README.md) · [Română](../ro/README.md) · [Türkçe](../tr/README.md) · [Українська](../uk/README.md) ·
[Tiếng Việt](../vi/README.md) · [Bahasa Indonesia](../id/README.md) · [简体中文](../zh-Hans/README.md) · [繁體中文](../zh-Hant/README.md) ·
[日本語](README.md) · [한국어](../ko/README.md) · [ไทย](../th/README.md) · [हिंदी](../hi/README.md) ·
[Filipino](../fil/README.md) · [ខ្មែរ](../km/README.md)

</details>

<br>

<h3 align="center">C++ ソースレベルのフィンガープリント制御とネイティブな人間らしい入力を備えた Chromium。</h3>

<table><tr><td>
単なる起動フラグの寄せ集めや、ページ上への JavaScript インジェクションではありません。C++ ソースコードにフィンガープリントパッチを組み込み、ブラウザプロセス内部で入力シミュレーションを実行する本物の Chromium バイナリです。公式の Playwright または Puppeteer をローカル CDP 経由でそのまま接続でき、ラッパーオブジェクトもページコードの書き換えも不要です。
</td></tr></table>

<br>

<p align="center">
Python および Node.js における Playwright・Puppeteer のドロップイン起動置き換え。<br>
同じ API、同じセレクターと型 — インポートと <code>launch()</code> 呼び出しを差し替えるだけです。
</p>

- **ソースレベルの Chromium パッチ** — canvas、WebGL、WebGPU、オーディオ、フォント、GPU、画面、CSS メディアクエリ、ハードウェア報告値、STUN リークなしの WebRTC、TLS ClientHello、タイムゾーン、ロケール、および自動化シグナルの除去（`navigator.webdriver`、`Runtime.enable`、ヘッドレスマーカー）に対応しています。
- **ブラウザプロセス内のネイティブな人間らしい入力 (`humanize=True`)** — ポインター軌道（`cursory-rs`）、照準と押下時間を伴うクリック、タイプミスの自己修正を含むタイピングリズム、スクロール物理挙動を Chromium 内部で実行します。SDK はプロキシラッパーを挟まない標準のネイティブ `Browser` を返します。
- **キーやアカウント不要の自律動作** — 現行エンジンビルド（`158.0.8127.37-3` 以降）および Ombra Desktop は、ユーザー登録、ライセンスキー、ハードウェア ID、ライセンスサーバーなしでローカル動作します。
- **自動インストールと暗号学的バイナリ検証** — `pip install ombrabrowser` または `npm install @ombralabs/sdk` で導入でき、初回起動時に SDK が対象プラットフォーム向けビルドをダウンロードし、Ed25519 署名と SHA-256 チェックサムを検証します。
- **永続プロファイルと安全なプロキシリレー** — 名前付きプロファイルは Cookie、`localStorage`、IndexedDB、`seed` をプロセス間ロック付きで実行をまたいで保持します。認証付きプロキシ（HTTP、HTTPS、SOCKS5）はローカルループバックリレー経由で動作するため、認証情報がプロセス引数に露出することはありません。
- **オフライン動作の Ombra Desktop プロファイルマネージャー** — 本リポジトリに収録されたネイティブデスクトップアプリ（[`desktop/`](../../desktop/README.md)）で、macOS、Linux、Windows 向けのビルド済みインストーラーを提供しています。

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

Puppeteer も `import { launch } from "@ombralabs/sdk/puppeteer"` または `launchPuppeteer()` でサポートされています（[詳細](#puppeteer)）。

**アンチボット保護があるサイト向け**には、レジデンシャルプロキシ、永続プロファイル、整合性の取れた環境設定を組み合わせて使用します。

```python
from ombrabrowser import launch_persistent_context

context = launch_persistent_context(
    profile="pricing-eu",
    proxy="socks5://user:pass@residential-proxy:1080",  # データセンター IP よりレジデンシャル IP を推奨
    fingerprint={"timezone": "auto", "locale": "auto"},  # タイムゾーンとロケールをプロキシ出口に合わせる
    headless=False,                                      # 一部のサイトはヘッドレスとの差異を検出する
    humanize=True,                                       # ネイティブなマウス・キーボード・スクロールのシミュレーション
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

Linux、コンテナ、および保護された対象サイトでよくある問題については、[トラブルシューティング](#トラブルシューティング)を参照してください。

## インストール

**Python (3.10+):**

```bash
python -m pip install ombrabrowser

# オプション: プロキシ出口からタイムゾーンとロケールを自動検出 (timezone="auto", locale="auto")
python -m pip install "ombrabrowser[geoip]"
```

**Node.js / TypeScript (20+):**

```bash
# Playwright を使用する場合 (1.60.0+、標準 Chromium のダウンロードは不要)
npm install @ombralabs/sdk "playwright-core@^1.60.0"

# または Puppeteer を使用する場合
npm install @ombralabs/sdk puppeteer-core

# オプション: timezone: "auto" および locale: "auto" 用のオフライン GeoIP データベースリーダー
npm install mmdb-lib
```

---

起動時、SDK は厳密な優先順位でエンジンを解決します：`binary_path`（Node.js では `binaryPath`）、`OMBRA_BINARY_PATH`、Ombra Desktop のエンジンディレクトリ、SDK キャッシュ（`~/.ombra/engines`）。互換性のあるエンジンが見つからない場合、SDK は署名付きリリースチャネルからビルドをダウンロードし、Ed25519 署名と SHA-256 チェックサムを検証したうえでローカルにキャッシュします。`playwright install chromium` の実行は不要です。

自動ダウンロードを無効にするには `download=False`（Node.js では `download: false`）を指定します。コンテナビルド時などに事前にエンジンをダウンロード・検証しておくには、`ensure_binary()`（`ensureBinary()`）を呼び出すか CLI の `install` コマンドを使用します。

> **自律起動:** 現行エンジンビルド（`158.0.8127.37-3` 以降）は無料であり、アカウントやライセンスキーは不要です。`OMBRA_LICENSE_KEY` および `login` コマンドは、旧ライセンスビルドとの互換性のためにのみ残されています。

**Playwright からの移行**はわずか 2 行の変更で完了し、すべてのページ操作、ロケーター、待機処理はそのまま動作します。

```diff
- from playwright.sync_api import sync_playwright
- pw = sync_playwright().start()
- browser = pw.chromium.launch()
+ from ombrabrowser import launch
+ browser = launch()

  page = browser.new_page()
  page.goto("https://example.com")
  # 残りのコードは変更なしで動作します
```

```diff
- import { chromium } from "playwright";
- const browser = await chromium.launch();
+ import { launch } from "@ombralabs/sdk";
+ const browser = await launch();
```

> ⭐ 役に立ったらリポジトリに **Star** を付けてください。また、エンジン・SDK・Ombra Desktop の新しいビルドの通知を受け取るには **[Watch releases](https://github.com/ombralabs/ombra/subscription)** をご利用ください。

---

## 現在のステータスとリリース

エコシステム内の各コンポーネントは共通の起動コントラクトに従い、独立してバージョニングされています。

| コンポーネント | ステータス / バージョン | 場所 |
|---|---|---|
| **SDK コントラクト** | Draft `0.2.0` | [`docs/sdk-contract.md`](../../docs/sdk-contract.md) |
| **Python SDK** | Alpha `0.2.0` | [PyPI 上の `ombrabrowser`](https://pypi.org/project/ombrabrowser/) |
| **Node.js / TypeScript SDK** | Alpha `0.2.0` | [npm 上の `@ombralabs/sdk`](https://www.npmjs.com/package/@ombralabs/sdk) |
| **Ombra Chromium エンジン** | Chromium `158.0.8127.37` | `158.0.8127.37-3` · macOS ARM64 / Linux x64 / Windows x64 |
| **Ombra Desktop** | `desktop-v1.2.2` | [`desktop/`](../../desktop/README.md) · [GitHub Releases](https://github.com/ombralabs/ombra/releases/tag/desktop-v1.2.2) |
| **スタンドアロンブラウザ** | `v158.0.8127.37-3` | [GitHub Releases](https://github.com/ombralabs/ombra/releases/tag/v158.0.8127.37-3) |
| **スキーマとコンフォーマンス** | JSON Schema + 共通ケース | [`spec/schemas`](../../spec/schemas) · [`conformance`](../../conformance/README.md) |
| **ステルスチェックアップ手法** | 6 層 (`L0`–`L5`) | [`docs/stealth-checkup.md`](../../docs/stealth-checkup.md) |

現行リリースに含まれる主な機能:

- **ソースレベルパッチ** — `seed` に基づく一貫したフィンガープリント導出、WebGL / WebGPU と拡張機能の整合性調整、OS ごとの現実的なフォントテーブル、ネイティブ TLS ClientHello プロファイル（`chrome-<major>`）、`Runtime.enable` および `UtilityScript` スタックリークの抑制、WebRTC ホスト IP リーク保護。
- **ブラウザレベルの `Ombra` CDP ドメイン** — ブラウザを再起動することなく、Python および Node.js から人間らしい入力をリアルタイム制御（`getHumanizeState`、`setHumanize`）。
- **ブラウザプロセス内のネイティブ入力シミュレーション** — `cursory-rs` ポインタープランナー、ホイール／トラックパッドのスクロールプロファイル、タイプミスの自己修正付きタイピングリズム、分離クリップボード経由の安全な長文ペースト。
- **キーレス自律ビルド** — 現行エンジンビルド（`158.0.8127.37-3`）および Ombra Desktop `1.2.2` は、アカウント・キー・テレメトリなしで完全にローカル実行可能。
- **エンジンバージョン固定 (`version`)** — `launch(version="158.0.8127.37-3")`、`OMBRA_VERSION`、または CLI の `install --version` で特定のビルドを固定可能。
- **統合プロキシリレー** — HTTP、HTTPS、SOCKS5 の認証付きプロキシに対応し、Chromium のコマンドライン、ログ、プロファイルメタデータに認証情報を露出しない構成。
- **永続的な名前付きプロファイル** — `seed`、Cookie、`localStorage`、IndexedDB を `~/.ombra/profiles/<slug>` に保存し、プロセス間ロック（`ProfileBusyError`）で保護。
- **暗号学的サプライチェーン検証** — リリースエンベロープの Ed25519 署名検証と、展開前のアーカイブに対する SHA-256 検証。

完全なリリース履歴は [CHANGELOG.md](../../CHANGELOG.md) を参照してください。

## Ombra を選ぶ理由

- **設定レベルや JS パッチは壊れやすい。** `playwright-stealth`、`puppeteer-extra`、`undetected-chromedriver` などのツールは、ページに JavaScript を注入したり起動フラグを調整したりします。Chrome のアップデートで頻繁に破損するうえ、最新の検出器はパッチ自体を検知します（`Function.prototype.toString`、プロトタイプ異常、`addScriptToEvaluateOnNewDocument`）。
- **変更が Chromium のソースコードに組み込まれている。** フィンガープリントは C++ レベルで生成され、メインフレーム、Worker、iframe 全体にわたって一貫して適用されます。SDK はページにスクリプトを一切注入せず、`Emulation.*` による上書きも行いません。
- **入力シミュレーションが Playwright の上ではなくブラウザプロセス内に存在する。** マウス軌道、キー入力、スクロールが Chromium 内部で処理されるため、SDK は Playwright や Puppeteer のオブジェクトをラップしません。あらゆるロケーター、フレーム、サードパーティライブラリがそのまま正常に動作します。
- **余計なサービスを必要としないローカルアーキテクチャ。** バックグラウンドのコントロールプレーンデーモンも、スクリプトとブラウザ間のネットワークホップもありません。単一のエンジンプロセスと `127.0.0.1` 上のローカルループバック CDP のみで完結し、プロファイル数や同時実行数の制限もありません。

## Ombra Desktop

**GUI を備えたローカル・オフラインのプロファイルマネージャーです。** ソースコードはこのリポジトリ内（[`desktop/`](../../desktop/README.md)）に直接配置されており、Tauri（Rust + Vue）で構築されています。

- **完全オフラインかつローカル動作** — プロファイルカタログはローカルの暗号化キーを用いたマシン上の SQLite データベースに保存され、アカウント、クラウドサービス、ネットワーク接続は不要です。
- **構造化されたプロファイル管理** — プロファイルの作成、名前・メモ・番号による検索、説明の編集に加え、Rust カタログ内でグループ、タグ、ラベル、ブックマークを使って整理できます。
- **安全なゴミ箱** — プロファイルをゴミ箱に移動してもディスク上のファイルは保持されるため、後から復元できます。
- **プロファイル数の制限なし** — プロファイル数に応じた課金枠やクラウドクォータはありません。すべてのデータは手元に残ります。
- **ビルド済みインストーラー** — macOS Apple Silicon（`.dmg`、Apple Developer ID 署名・公証済み）、Linux（`.deb` および `.rpm`）、Windows x64（`setup.exe`）向けに提供しています。
- **分離カタログ** — `OMBRA_DESKTOP_DATA_DIR` を設定することで、テスト用の別カタログやバックアップコピーを扱えます。

[`desktop-v1.2.2` をダウンロード →](https://github.com/ombralabs/ombra/releases/tag/desktop-v1.2.2) · [Desktop README](../../desktop/README.md) · [プロファイルとローカルキーのガイド](../../docs/desktop/README.md)

## フィンガープリント検証とステルスチェックアップ

Ombra は「100% 検出不能」といった根拠のない約束をする代わりに、記録された条件下で再現可能な検証手順に依拠しています。実際のサイトでの結果は常に、出口 IP のレピュテーション、地域、プロファイル履歴、検出器のバージョン、および起動構成に左右されます。

### エンジンと SDK が処理するサーフェス

| サーフェス / シグナル | 標準 Playwright | Ombra | 実装方式 |
|---|---|---|---|
| `navigator.webdriver` | `true` | `false` | C++ エンジンパッチ |
| `window.chrome` | ヘッドレスで欠落 | 完全なオブジェクト | 通常の Chrome と一致 |
| `navigator.plugins` | ヘッドレスで `0` | 整合性の取れたプラグイン構成 | エンジンレベル |
| User-Agent と Client Hints | `HeadlessChrome`、ブランド不一致 | `Google Chrome` + 整合した `Sec-CH-UA*` | パッチ `010-user-agent-and-webdriver` |
| CDP アーティファクト (`Runtime.enable`、`UtilityScript`) | 検出器によりフラグ付け | エンジンで抑制、SDK は `Runtime.enable` を呼ばない | パッチ `110-runtime-enable` + 不変条件 `SI-02` |
| WebRTC IP リーク | ローカル／ホスト IP を露出 | 実際の STUN を送信せず出口 IP を報告 | パッチ `100-webrtc-leak` (`--webrtc-ip`) |
| TLS と HTTP/2 | 環境設定に依存 | Chromium ネットワークスタック + `chrome-<major>` ClientHello プロファイル | パッチ `210-tls-network-persona` |
| WebGL と WebGPU | ソフトウェアレンダラー／GPU 不一致 | 統一された WebGL/WebGPU 制限値と拡張テーブル | パッチ `070`、`071`、`075`、`955` |
| フォント、ロケール、タイムゾーン | ホスト値、`Intl` のずれ | 整合したフォントテーブル、ICU ロケール、タイムゾーン | パッチ `040`、`090`、`092`、`230` |
| 入力シミュレーション | カーソルの瞬間移動、即時の `fill()` | `cursory-rs` 曲線、タイピングリズム、スクロール物理挙動 | ブラウザプロセス内パッチ `135-ombra-humanize` |
| フィンガープリントの安定性 | 変化する、またはホスト情報をリーク | 再起動やフレームをまたいで `seed` ごとに決定論的 | パッチ `001`、`002` + 永続プロファイル |

### チェックアップの 6 層

構成をリリースまたはデプロイする前に、実際に使用するエンジンビルド、自動化クライアント、プロキシの組み合わせで 6 層すべてのチェックアップを実行してください。

| 層 | テスト対象の例 | 合格基準 |
|---|---|---|
| **L0 トランスポート** | TrackMe、IP/WebRTC リーク検証ページ、ヘッダーエコー | プロキシの出口 IP のみが見えること。JA4 と HTTP/2 が Chromium ビルドと一致すること。argv にプロキシ認証情報がないこと |
| **L1 アイデンティティ** | ローカルプローブ、Sannysoft、Intoli、UA-CH チェック | UA、Client Hints、プラットフォーム、GPU、フォント、画面、ロケール間に矛盾がないこと |
| **L2 フィンガープリント** | CreepJS、FingerprintJS、BrowserScan、Pixelscan | ヘッドレスマーカーや `lie` マーカーが出ないこと。リロードをまたいでフィンガープリントが安定していること |
| **L3 自動化** | rebrowser、brotector、botd、CDP コマンド監査 | `Runtime.enable`、init スクリプト、バインディング、`navigator.webdriver` のリークがないこと |
| **L4 挙動** | 入力忠実度プローブ、humanize トレース、実チャレンジのスモークテスト | `isTrusted: true` イベント、自然な順序とタイミング、現実的なポインター曲線とスクロール |
| **L5 安定性** | 反復起動、Worker、同一／クロスオリジン iframe、SDK 間の同等性 | 同一の `seed` がすべてのコンテキストで完全に同じフィンガープリントを再現すること |

完全な手順、ステータス定義（`PASS` / `DEGRADED` / `FAIL` / `UNREACHABLE`）、シグナルチェックリスト、レポートテンプレートは、[英語版 (`docs/stealth-checkup.md`)](../../docs/stealth-checkup.md) および [ロシア語版 (`docs/stealth-checkup.ru.md`)](../../docs/stealth-checkup.ru.md) を参照してください。

## 比較

| 機能 | Playwright | playwright-stealth | undetected-chromedriver | Ombra |
|---|---|---|---|---|
| 自動化 API | Playwright | Playwright | Selenium | **Playwright および Puppeteer** |
| パッチ層 | なし | ページ内 JS インジェクション | 設定フラグ | **C++ ソース (Chromium)** |
| 一貫したフィンガープリント `seed` | なし | なし | 部分的 | **あり（プロファイルおよび eTLD+1 単位）** |
| 入力シミュレーション (`humanize`) | なし | なし | なし | **ブラウザプロセスに組み込み** |
| `Runtime.enable` / CDP リーク抑制 | なし | なし | 部分的 | **エンジンパッチ + SDK 不変条件** |
| CLI リークなしの認証付きプロキシ | なし | なし | 限定的 | **ローカルループバックリレー** |
| プロファイル分離 | ブラウザコンテキスト | ブラウザコンテキスト | なし | **プロファイルディレクトリ + ファイルロック** |
| オフラインプロファイルマネージャー (GUI) | なし | なし | なし | **Ombra Desktop (macOS、Linux、Windows)** |
| Playwright からの移行 | — | インポート変更 | コード書き換え | **インポートと `launch()` の差し替え** |

## 動作の仕組み

```mermaid
flowchart LR
    Script["ユーザーのスクリプト<br/>Playwright · Puppeteer"]
    SDK["Ombra SDK<br/>launch() + CDP ブリッジ"]
    Relay["ローカルプロキシリレー<br/>認証が必要な場合"]
    Engine["Ombra Chromium<br/>C++ パッチ済みエンジン"]
    Client["ネイティブクライアント<br/>Playwright · Puppeteer"]
    Profile[("プロファイル<br/>seed · Cookie · ストレージ")]

    Script -->|"launch()"| SDK
    SDK -->|"検証 + 起動"| Engine
    SDK -.->|"プロキシ認証"| Relay
    Relay -.-> Engine
    SDK -->|"CDP で接続"| Client
    Script -->|"page API"| Client
    Client -->|"ループバック CDP"| Engine
    Engine --> Profile
```

1. **`launch()` がエンジンを検出またはダウンロード**し、Ed25519 署名と SHA-256 チェックサムを検証します。
2. **プロファイルと `seed` を準備します。** 名前付きプロファイルはプロセス間ロックを取得し、プロキシに認証情報が必要な場合は SDK がインメモリのループバックリレーを起動します。
3. **Ombra Chromium を起動します。** 選択されたプロファイル、フィンガープリントオプション、およびローカルデバッグポート（`--remote-debugging-port=0`）を指定して起動します。
4. **公式クライアントが接続します。** `DevToolsActivePort` が生成されると、SDK は `127.0.0.1` 経由で Playwright（`no_defaults=True` 指定）または Puppeteer をアタッチし、ネイティブの `Browser` オブジェクトを返します。
5. **クリーンな終了処理。** `browser.close()` は `Browser.close` を送信し、エンジンプロセスツリーを終了させ、リレーを停止してプロファイルロックを解放します。

起動後、SDK はデータパスから外れます。すべてのページコマンドは Playwright または Puppeteer から Chromium へ直接送信されます。

### SDK の責務境界とステルス不変条件

[v0.2 SDK コントラクト (`docs/sdk-contract.md`)](../../docs/sdk-contract.md) では、すべての公式 SDK に厳格な不変条件を課しています。

- **ページへのステルススクリプト注入を行わない。** SDK は `Page.addScriptToEvaluateOnNewDocument` / `evaluateOnNewDocument` を一切呼び出さず、DOM プロパティへのパッチも行いません。
- **`Runtime.enable` を使用しない。** 準備完了チェックにはローカルの CDP HTTP エンドポイントまたは `Browser.getVersion` のみを使用し、`Runtime`、`Debugger`、`Log` を有効化しません。
- **`Emulation.*` 上書きを行わない。** SDK は `Emulation.setUserAgentOverride`、`setTimezoneOverride`、`setLocaleOverride`、`setDeviceMetricsOverride` を一切呼び出しません。ブラウザのアイデンティティはエンジンから供給されます。
- **デフォルトで禁止フラグを付与しない。** SDK が独自に `--enable-automation`、`--disable-blink-features=AutomationControlled`、`--no-sandbox`、`--user-agent` を注入することはありません。
- **ループバック CDP 限定。** デバッグポートは常に `127.0.0.1` にバインドされ、ループバック以外の `--remote-debugging-address` 指定は拒否されます。
- **テレメトリなし・機密情報の非露出。** プロキシ認証情報、キー、Cookie はログおよびエラーメッセージからマスクされます。

## Python API

### `launch()`

```python
from ombrabrowser import launch

# 基本的な起動（デフォルトはヘッドレス）
browser = launch()

# ブラウザウィンドウを表示して起動
browser = launch(headless=False)

# HTTP または SOCKS5 プロキシ（認証情報はローカルループバックリレー経由で処理）
browser = launch(proxy="http://user:pass@proxy:8080")
browser = launch(proxy="socks5://user:pass@proxy:1080")

# バイパスリスト付きのプロキシオブジェクト
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

# フィンガープリント制御（seed、OS、プロキシからのタイムゾーン／ロケール自動設定、画面、GPU）
# timezone="auto" / locale="auto" を使うには pip install "ombrabrowser[geoip]" をインストール
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

# ネイティブなマウス・キーボード・スクロールのシミュレーション
browser = launch(humanize=True)
browser = launch(humanize={"preset": "careful"})

# 特定のエンジンビルドを固定し、追加の Chromium フラグを渡す
browser = launch(
    version="158.0.8127.37-3",
    args=["--webrtc-ip=203.0.113.10"],
)
```

標準の `playwright.sync_api.Browser` を返します。すべての Playwright メソッド（`new_page()`、`new_context()`、`close()` など）が通常どおり動作します。プロファイルのウィンドウ寸法が上書きされないよう、新規ページはデフォルトで `no_viewport=True` になります。

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

### `launch_context()` と `launch_context_async()`

ブラウザを起動して `BrowserContext` を直接返す便利なヘルパーです（コンテキストを閉じるとエンジンプロセスも終了します）。`storage_state`、`permissions`、`extra_http_headers` などの追加キーワード引数は `browser.new_context()` にそのまま転送されます。

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

非同期版は `await launch_context_async(...)` です。

### `launch_persistent_context()` と `launch_persistent_context_async()`

永続プロファイルでブラウザを起動し、デフォルトの `BrowserContext` を返します。Cookie、`localStorage`、IndexedDB、キャッシュ、およびフィンガープリントの `seed` がセッション間で保持されます。

- `profile="pricing-eu"` を渡すと、`~/.ombra/profiles/pricing-eu` にプロファイルが作成され、`.ombra/profile.json` のメタデータとロックファイルが管理されます。
- `user_data_dir="./my-profile"`（または位置引数としてのパス）を渡すと、その明示的なディレクトリを使用します。
- 同じプロファイルを別プロセスから同時に起動しようとすると、プロファイルデータの破損を防ぐために `ProfileBusyError` が送出されます。

```python
from ombrabrowser import launch_persistent_context

# 名前付きプロファイルを指定（~/.ombra/profiles/ に保存）
ctx = launch_persistent_context(profile="pricing-eu", headless=False)
page = ctx.new_page()
page.goto("https://example.com")
ctx.close()  # Cookie、ストレージ、seed が永続化される

# 明示的なパスを指定（例: Chrome 拡張機能を読み込む場合）
ctx = launch_persistent_context(
    "./my-profile",
    headless=False,
    args=[
        "--disable-extensions-except=./my-extension",
        "--load-extension=./my-extension",
    ],
)
```

非同期版は `await launch_persistent_context_async(...)` です。

### ユーティリティ関数と診断 (Python)

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

# 解決されたエンジンバイナリを確認
print(binary_info())
# {'version': '158.0.8127.37-3', 'platform': 'macos-arm64',
#  'path': '…', 'installed': True, 'source': 'cache', 'sha256': '…'}

# ブラウザを起動せずにエンジンをダウンロード・検証
ensure_binary(version="158.0.8127.37-3")

# SDK 管理下のエンジンバイナリを削除（~/.ombra/profiles 配下のプロファイルは保持）
clear_cache()

# Chromium を起動せずに解決後の起動コマンドを確認
cmd = build_launch_options(profile="pricing-eu", humanize=True)

# 実行時メタデータ（CDP ポート、ws_url、seed、pid）を取得し、プロセスの健全性を確認
browser = launch()
print(last_launch_info(browser))
check_engine_health(browser)
browser.close()
```

### CLI (Python)

```bash
ombrabrowser install                             # エンジンをダウンロードして検証 (Ed25519 + SHA-256)
ombrabrowser install --version 158.0.8127.37-3  # 特定のエンジンビルドをインストール
ombrabrowser info                                # 環境・バイナリ・依存関係の診断（エイリアス: doctor）
ombrabrowser info --quick --json                 # バイナリを起動しない高速な機械可読レポート
ombrabrowser info --proxy socks5://user:pass@host:1080  # プロキシ経由での出口 IP・タイムゾーン・ロケール解決をテスト
ombrabrowser update                              # リリースチャネルを確認し、キャッシュ済みエンジンを更新
ombrabrowser clear-cache                         # キャッシュ済みエンジンバイナリを削除（プロファイルは保持）
ombrabrowser login                               # ライセンスキーを ~/.ombra/license.key に保存（旧ライセンスビルド専用）
ombrabrowser logout                              # 保存済みのライセンスキーを削除
```

同じコマンドは `python -m ombrabrowser <command>` でも利用できます。

## Node.js および TypeScript API

`@ombralabs/sdk` は完全な TypeScript 型定義（`.d.ts`）を備えた ESM + CommonJS デュアルビルドとして配布されています。Playwright と Puppeteer のどちらも内部で同じエンジン上で動作します。

### Playwright (デフォルト)

```ts
import { launch, launchContext, launchPersistentContext } from "@ombralabs/sdk";

// プロキシ、フィンガープリント、入力シミュレーションを指定した基本起動
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

// 簡易起動: 1 回の呼び出しで browser と context を作成
const context = await launchContext({
  proxy: "socks5://user:pass@residential-proxy:1080",
  fingerprint: { timezone: "auto", locale: "auto" },
  headless: false,
  humanize: true,
  contextOptions: { storageState: "state.json" },
});
const page = await context.newPage();

// 永続プロファイル — Cookie、localStorage、seed が実行をまたいで保持される
const persistentCtx = await launchPersistentContext({
  userDataDir: "./chrome-profile",
  headless: false,
  humanize: true,
});
```

> 上記の各スニペットは単独で動作します。既存の Playwright 起動コードを移行する場合は、インポートを `import * as chromium from "@ombralabs/sdk"` に置き換え、`await chromium.launch(...)` をそのまま維持することもできます。

### Puppeteer

`@ombralabs/sdk` から `launchPuppeteer()` を使用するか、`@ombralabs/sdk/puppeteer` からインポートします。

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

> **Puppeteer に関する注意:** Puppeteer は `connectOverCDP({ noDefaults: true })` を用いる Playwright に比べ、デフォルトでより多くの CDP トラフィックを送信します。CDP チェックが厳しいサイトでは Playwright の使用を推奨します。

### ユーティリティと CLI (Node.js)

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

## 人間らしい入力

Ombra では、入力シミュレーション（`humanize`）は自動化クライアントを包む JS ラッパーとしてではなく、**Chromium ブラウザプロセス内にネイティブに組み込まれています**（`cursory-rs` とエンジンの入力スケジューラーを使用）。これにより、次の利点が得られます。

- Playwright および Puppeteer のすべての標準操作（`page.click()`、`page.fill()`、`page.type()`、`page.mouse.*`、`page.keyboard.*`、`locator.*`、`ElementHandle.*`）が、ブラウザ内のタブごとの単一入力キューを通過します。
- 挙動パラメーターはプロファイルの `seed`（`--fingerprint-humanize-seed`）から決定論的に導出されます。
- SDK は `Page` や `Browser` をプロキシクラスでラップしないため、ネイティブの型とクライアントの挙動がそのまま維持されます。

```python
browser = launch(humanize=True)
page = browser.new_page()
page.goto("https://example.com")
page.locator("#email").fill("user@example.com")
page.locator("button[type=submit]").click()
```

**`humanize=True` で変わること:**

| 操作 | `humanize` なし | `humanize=True` あり |
|---|---|---|
| マウス移動 | 瞬間移動 | 加減速、一時停止、わずかなオーバーシュートを伴う `cursory-rs` 曲線 |
| クリック・ドラッグ | 即時押下 | 対象内の照準位置、クリック前の間、押下時間を再現 |
| テキスト入力 | 値の即時設定 | 設定されたリズムとキーボード配列による 1 文字ずつの入力、時折のタイプミスと自己修正。非常に長いテキストはシステムクリップボードに触れない分離クリップボード経由でペースト |
| スクロール | 一度のジャンプ | 実測減速プロファイルに従うホイール／トラックパッドイベント列 |
| アイドル区間 | カーソル完全静止 | `careful` プリセットでは操作間に微細なアイドル時カーソル微動を発生 |

**プリセット** — `default`（通常ペース）、`careful`（ゆっくり慎重で、アイドル時の微動あり）、`fast`（高速ペース）。入力シミュレーションを明示的に無効にするには `humanize=False`（`humanize: false`）を指定します。

```python
browser = launch(humanize={"preset": "careful"})
```

```ts
const browser = await launch({ humanize: { preset: "careful" } });
```

`Ombra` CDP ドメインを通じて、ブラウザを再起動せずに実行時にモードを切り替えたりプリセットを変更したりすることもできます。

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

## フィンガープリントとプロファイル管理

エンジンは単一の `seed` から整合性の取れたブラウザ構成を導出します。`seed` を省略した場合の挙動は次のとおりです。

| シナリオ | 挙動 |
|---|---|
| **プロファイルなしの `launch()`** | SDK がセッション用のランダムな `seed` を生成し、`close()` 後に削除される一時ディレクトリを作成します。 |
| **`profile="name"` または `user_data_dir="./dir"`** | `seed` が `.ombra/profile.json` に保存され、毎回の起動で再利用されます。サイトからは同じデバイスと Cookie を持つ再訪ユーザーとして認識されます。 |
| **`fingerprint={"seed": N, ...}`** | 明示的な `seed` に基づく決定論的フィンガープリントを生成します。追加フィールドは個別の設定を上書きしつつ、残りの整合性を維持します。 |

canvas / オーディオのノイズは `eTLD+1` 単位でキー付けされます（同一サイト上では安定し、異なるサイト間では関連付け不能）。2D canvas および WebGL `readPixels` のピクセルノイズは、「Canvas Tampering / Masking」系の検出器に反応しないようデフォルトで無効になっており、`--fingerprint-pixel-noise` で明示的に有効化できます。

> **ヒント:** 同じサイトに再アクセスする場合は、一時的な `launch()` に固定 `seed` を渡すのではなく、永続プロファイル（`profile="name"` または `launch_persistent_context()`）を使用してください。これにより、フィンガープリントとあわせて Cookie、キャッシュ、`localStorage` も一貫して保持されます。

### `fingerprint` オブジェクトのフィールド

以下のフィールド名は Python（`snake_case`）表記です。Node.js では `camelCase`（`osVersion`、`hardwareConcurrency`、`deviceMemory`）と `snake_case` の両方を受け付けます。

| フィールド | 型 | 説明 |
|---|---|---|
| `seed` | `int` (`>= 0`) | フィンガープリント全体の構成を決定するジェネレーターシード |
| `os` | `"macos"` \| `"windows"` \| `"linux"` | 対象 OS（`navigator.platform`、UA、GPU・フォントプール） |
| `os_version` | `string` | Client Hints 用の OS バージョンヒント |
| `timezone` | IANA ゾーン または `"auto"` | タイムゾーン（例: `"Europe/Berlin"`）。`"auto"` は GeoIP 経由でプロキシ出口からゾーンを解決 |
| `locale` | BCP-47 または `"auto"` | ロケール（`Accept-Language`、`navigator.languages`、ICU `Intl`）。`"auto"` はプロキシ出口からロケールを解決 |
| `screen` | `{"width", "height"}` または `"auto"` | 対象 OS のタスクバー／メニューバーを考慮した画面および作業領域の寸法 |
| `gpu` | `{"vendor", "renderer"}` または `"auto"` | 明示的な WebGL `UNMASKED_VENDOR` / `UNMASKED_RENDERER` 文字列 |
| `hardware_concurrency` | `int` または `"auto"` | 報告される `navigator.hardwareConcurrency` |
| `device_memory` | `int` または `"auto"` | 報告される `navigator.deviceMemory`（GB 単位） |
| `noise` | `bool` | フィンガープリントノイズの有効／無効（`False` で `--disable-fingerprint-noise` を付与） |

> フィンガープリントパラメーターの主要な決定元は `seed` のままにしておくことを推奨します。整合性を保たずに個別の値を上書きすると（例: OS と非互換な GPU の組み合わせ）、検出器に対する矛盾を生むおそれがあります。

### 追加のエンジンフラグ (`args`)

エンジンがサポートしているものの、SDK が自動設定しないフラグです（`args=[...]` 経由で渡します）。

| フラグ | 用途 |
|---|---|
| `--fingerprint-brand=chrome\|edge\|opera\|vivaldi` | `Sec-CH-UA` 内のブラウザブランド（SDK のデフォルトは `chrome`） |
| `--fingerprint-tls-profile=chrome-<major>` | 指定した Chrome メジャーバージョンに対応する TLS ClientHello プロファイル（SDK がエンジンバージョンから自動設定） |
| `--webrtc-ip=<ip>` | 実際の STUN トラフィックを送らずに WebRTC ICE 候補内の IP アドレスを置換 |
| `--fingerprint-location=<lat,lon>` | `navigator.geolocation` が報告する座標 |
| `--fingerprint-storage-quota=<MB>` | `navigator.storage.estimate()` が報告するストレージクォータ |
| `--fingerprint-max-touch-points=<N>` | タッチポイント数（`navigator.maxTouchPoints` およびポインターメディアクエリ） |
| `--fingerprint-device-pixel-ratio=<ratio>` | ディスプレイのピクセル密度（`window.devicePixelRatio`） |
| `--fingerprint-color-depth=<bits>` | 画面の色深度 |
| `--disable-gpu-fingerprint` | ホストの実際の GPU（WebGL/WebGPU 文字列、制限値、拡張機能）をそのまま渡す |
| `--disable-gpu-string-spoof` | 他のプロファイル設定を維持しつつ、実際の GPU 文字列のみをそのまま渡す |
| `--disable-fingerprint-noise` | アイデンティティパラメーターを有効に保ったまま canvas/WebGL/オーディオノイズを無効化 |
| `--fingerprint-pixel-noise` | 2D canvas および `readPixels` 向けのオプトイン冪等ピクセルノイズを有効化 |
| `--profile-label=<text>` | ブラウザのアドレスバーに表示するプロファイルラベル（UI 専用、Web ページからは不可視） |

### Linux でのフォント設定

最小構成の Linux サーバーやコンテナでは絵文字フォントや CJK フォントが不足していることが多く、非表示の canvas テキストや絵文字レンダリングで不自然なハッシュが生成される原因になります。

**1. ベースライン層（絵文字と CJK）:**

```bash
sudo apt-get update && sudo apt-get install -y \
    fonts-noto-color-emoji fonts-freefont-ttf fonts-unifont \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-tlwg-loma-otf
```

**2. Windows プロファイル用の Windows フォント (`os="windows"`):**
Linux 上で Windows 構成を実行する場合、`C:\Windows\Fonts\` から実際のフォント（`Segoe UI`、`Calibri`、`Consolas`、`Courier New`、`Arial`、`Times New Roman`、`MS UI Gothic` など）をインストールすると、フォント列挙の整合性が大幅に向上します。

```bash
mkdir -p ~/.local/share/fonts/windows
cp -r /path/to/windows/Fonts/. ~/.local/share/fonts/windows/
fc-cache -f
```

**3. macOS プロファイル用の macOS フォント (`os="macos"`):**
同様に、Linux 上で `os="macos"` を使用する場合は、`/System/Library/Fonts/`、`/System/Library/Fonts/Supplemental/`、および `/Library/Fonts/` からフォントを `~/.local/share/fonts/mac/` にコピーし、`fc-cache -f` を実行します。

`Dockerfile` 内では、システムディレクトリの `/usr/local/share/fonts/` にフォントを配置します。

```dockerfile
COPY windows-fonts/ /usr/local/share/fonts/windows/
RUN fc-cache -f
```

## 起動オプション、設定、およびエラー

### `launch()` オプション

オプション名は Python API および [SDK コントラクト](../../docs/sdk-contract.md) に準拠しています。Node.js では `camelCase` 相当（`timeoutMs`、`userDataDir`、`binaryPath`、`licenseKey`）を使用しますが、`snake_case` エイリアスも受け付けます。未知のオプションは `InvalidOptionError` で拒否されます。

| オプション | デフォルト | 説明 |
|---|---|---|
| `headless` | `true` | ウィンドウなしで実行 (`--headless=new`) |
| `proxy` | なし | プロキシ URL（`http`、`https`、`socks5`）またはオブジェクト。認証付きプロキシはループバックリレーを使用 |
| `fingerprint` | なし | `seed`、OS、タイムゾーン、ロケール、画面、GPU、メモリ、ノイズの設定 |
| `profile` | なし | `~/.ombra/profiles/<slug>` 配下の名前付き永続プロファイル（`user_data_dir` と排他） |
| `user_data_dir` | 一時ディレクトリ | 明示的なプロファイルディレクトリパス（`profile` と排他） |
| `args` | `[]` | 追加の Chromium 引数（変更せずそのまま渡す） |
| `binary_path` | 自動解決 | エンジン実行ファイルへの明示的なパス |
| `version` | 環境変数 / 自動 | エンジンバージョンの固定（例: `158.0.8127.37-3`）。`OMBRA_VERSION` を上書き |
| `timeout_ms` | `30000` | エンジン起動および CDP 接続のタイムアウト（1000–600000 ms） |
| `humanize` | エンジンデフォルト | `False`、`True`、または `{"preset": "default" \| "careful" \| "fast"}` |
| `license_key` | 環境変数 / ファイル | 旧ライセンスビルド用キー（`158.0.8127.37-3+` では不要。ログ出力されない） |
| `env` | `{}` | エンジンプロセスに渡す追加の環境変数 |
| `download` | `True` | 不足しているエンジンバイナリの自動ダウンロードを許可 |

### 環境変数

優先順位: **明示的な起動オプション → 環境変数 → プロファイルメタデータ → デフォルト**。

| 変数 | デフォルト | 説明 |
|---|---|---|
| `OMBRA_BINARY_PATH` | 未設定 | エンジンバイナリへの明示的なパス |
| `OMBRA_CACHE_DIR` | `~/.ombra` | キャッシュ済みエンジンおよび名前付きプロファイルの保存ディレクトリ |
| `OMBRA_DOWNLOAD_URL` | `https://api.github.com/repos/ombralabs/ombra/releases` | エンジンダウンロードのベース URL / ミラー（`none`/`off` でダウンロード無効化） |
| `OMBRA_VERSION` | 最新の互換版 | 固定するエンジンバージョン（例: `158.0.8127.37-3`） |
| `OMBRA_RELEASE_CHANNEL` | `stable` | エンジンリリースチャネル: `stable` または `beta` |
| `OMBRA_AUTO_UPDATE` | `true` | 起動時に新しいエンジンビルドを確認 |
| `OMBRA_SKIP_CHECKSUM` | `false` | ローカル開発専用: SHA-256 検証を無効化（警告をログ出力） |
| `OMBRA_LICENSE_KEY` | 未設定 | 旧ライセンスビルド用キー（ログ出力されない） |
| `OMBRA_TIMEOUT_MS` | `30000` | デフォルトの起動タイムアウト (ms) |
| `OMBRA_LOG_LEVEL` | `warn` | ログ出力レベル: `error`、`warn`、`info`、`debug` |

### 型付きエラー

いずれかの失敗が発生すると、SDK は起動したエンジンプロセスを終了し、プロファイルロックを解放したうえで、安定した `kind` と機密情報をマスク済みの `details` を持つ `OmbraError` サブクラスを送出します。

`InvalidOptionError` · `BinaryNotFoundError` · `DownloadFailedError` · `ChecksumMismatchError` · `UnsupportedPlatformError` · `UnsupportedEngineError` · `ProxyError` · `ProfileBusyError` · `LaunchTimeoutError` · `CDPConnectError` · `EngineExitedError` · `EngineCrashedError` · `LicenseError`

完全なエラー分類とリトライ規則は [SDK コントラクト (`docs/sdk-contract.md`)](../../docs/sdk-contract.md) に記載されています。

## プラットフォーム、連携、およびコンテナ

### サポートされているプラットフォームとランタイム

| コンポーネント | サポート状況 | 備考 |
|---|---|---|
| **macOS ARM64 (Apple Silicon)** | ✅ | 自律ビルド `158.0.8127.37-3`。Ombra Desktop は Developer ID 署名・公証済み |
| **macOS x64 (Intel)** | — | Chromium 158 の現行リリースはありません |
| **Linux x64** | ✅ | 自律ビルド `158.0.8127.37-3`。`.tar.xz` 展開のため `xz-utils` (`xz`) が必要 |
| **Windows x64** | ✅ | 自律ビルド `158.0.8127.37-3` および Ombra Desktop インストーラー |
| **Python** | `3.10+` | `ombrabrowser` と一緒に Playwright `>=1.60,<2.0` が自動インストール |
| **Node.js** | `20+` | Playwright `>=1.60,<2.0` または Puppeteer `>=22`（Puppeteer 25+ は Node.js `>=22.12` が必要） |

### フレームワークおよび AI エージェントとの連携

Ombra は、カスタム Chromium バイナリを受け付けるか CDP 経由で接続できるあらゆる自動化ツールや AI エージェントフレームワーク（`browser-use`、`Crawl4AI`、`Crawlee`、`Scrapling`、`Stagehand`、`LangChain` など）と連携できます。

```python
# 方法 1: 独自のランナー向けに検証済みバイナリパスとエンジン引数を解決する
from ombrabrowser import build_launch_options

cmd = build_launch_options(profile="agent-1", humanize=True)
binary_path = cmd["binary_path"]
engine_args = cmd["args"]

# 方法 2: Ombra SDK 経由で起動し、ローカル CDP エンドポイントをフレームワークに渡す
from ombrabrowser import launch_async, last_launch_info

browser = await launch_async(profile="agent-1", humanize=True)
info = last_launch_info(browser)
ws_url = info["ws_url"]             # ws://127.0.0.1:<port>/devtools/browser/...
cdp_http = f"http://127.0.0.1:{info['cdp_port']}"
# フレームワークを ws_url または cdp_http に接続 — フィンガープリント設定と humanize は
# エンジン内部で動作するため、任意の CDP クライアントからそのまま有効になります
```

### Docker および Linux サーバーでの実行

イメージビルド時にエンジンを事前ダウンロード・検証する `Dockerfile` の例:

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

> **コンテナおよび Web サーバーでの注意点:**
> - コンテナ環境で Chromium サンドボックスを初期化できない場合は、`args=["--no-sandbox"]` で `--no-sandbox` を明示的に指定してください（SDK が独自にこのフラグを追加することはありません）。
> - ヘッドレスサーバー上で `headless=False` を実行するには `Xvfb` を使用してください（[下記](#トラブルシューティング)参照）。
> - `uvloop` を有効にした `uvicorn` 配下で実行する場合は、サブプロセスのパイプハングを防ぐために `--loop asyncio` を指定してください。

## トラブルシューティング

### サイトがヘッドレスモードをブロックする場合

一部のアンチボットシステムは、C++ パッチが適用されていてもヘッドレスモードにおける挙動やレンダリングの差異をチェックします。`Xvfb` を用いた仮想ディスプレイ上で `headless=False` にして実行してください。

```bash
sudo apt-get install -y xvfb
Xvfb :99 -screen 0 1920x1080x24 &
export DISPLAY=:99
```

そのうえで、レジデンシャル SOCKS5/HTTP プロキシ、永続プロファイル、一致させたタイムゾーン／ロケール、`headless=False`、`humanize=True` を指定して起動します。

```python
context = launch_persistent_context(
    profile="site-eu",
    proxy="socks5://user:pass@residential-proxy:1080",
    fingerprint={"timezone": "auto", "locale": "auto"},
    headless=False,
    humanize=True,
)
```

Linux で引き続きブロックされる場合は、[Linux でのフォント設定](#linux-でのフォント設定)を確認してください。

### アクセスのたびにサイトから検証を求められる場合

`profile` を指定せずに `launch()` を呼び出すと、毎回空の一時ディレクトリと新しい `seed` で起動するため、サイトからは毎回 Cookie のない新規訪問者として扱われます。Cookie、`localStorage`、`seed` が実行間で引き継がれるよう、`profile="..."` または `launch_persistent_context(...)` に切り替えてください。

### `ProfileBusyError`

名前付きプロファイルまたは `user_data_dir` は、同時に 1 つのプロセスでしか開けません。並列ワーカーごとに異なるプロファイル名（`profile=f"worker-{i}"`）を割り当ててください。クラッシュしたプロセスが残した古いロックは自動的に検出・クリーンアップされます。

### `playwright install chromium` を実行する必要がありますか？

いいえ。Ombra は独自のエンジンバイナリを実行するため、Playwright 標準の Chromium は使用しません。Linux ではシステムライブラリと `xz-utils` のみが必要です。

```bash
sudo apt-get install -y xz-utils
playwright install-deps chromium
```

### エンジンの更新、チャネル切り替え、およびロールバック

SDK を最新リリースに更新します。

```bash
python -m pip install -U ombrabrowser
npm install @ombralabs/sdk@latest
```

`beta` チャネルを試す場合や、特定のエンジンビルドを固定／ロールバックする場合:

```python
# 特定の起動で厳密なビルドを固定
browser = launch(version="158.0.8127.37-3")
```

```bash
# または環境変数 / CLI で設定
export OMBRA_VERSION=158.0.8127.37-3
export OMBRA_RELEASE_CHANNEL=beta
ombrabrowser install --version 158.0.8127.37-3

# またはローカルでビルドしたバイナリを指定
export OMBRA_BINARY_PATH=/path/to/ombra/chromium
```

### macOS: Gatekeeper がローカルビルドをブロックする場合

Apple Silicon macOS 向けの公式 Ombra リリースは、Apple Developer ID 証明書で署名・公証されています。未署名のローカル開発ビルドを実行して macOS が検疫した場合は、一度だけ検疫属性を解除してください。

```bash
xattr -cr ~/.ombra/engines/*/*.app
```

### 同期 Python でページを待機する方法

同期版 Playwright では、`page.goto()` の直後に長い `time.sleep(15)` を 1 回呼ぶと Playwright のイベントループが停止し、検証ページが停滞することがあります。代わりに、軽いコンテキスト呼び出しを挟みながら短い間隔で待機してください。

```python
import time

for _ in range(15):
    page.context.cookies()  # ページの DOM に触れずに Playwright の処理を継続させる
    time.sleep(1)
```

非同期 Python では `await asyncio.sleep(...)`、Node.js では `await new Promise(r => setTimeout(r, ms))` を使用します。また、余分な CDP トラフィックを発生させないよう、チェック前の頻繁な `page.wait_for_timeout()` や不要な `page.evaluate()` の呼び出しは避けてください。

## セキュリティ

- **エンジンの真正性と完全性。** SDK は展開前に、ピン留めされた公開鍵でリリースエンベロープの Ed25519 署名を検証し、アーカイブと実行ファイル双方の SHA-256 ダイジェストを確認します。
- **ローカル限定の CDP。** デバッグポートは厳密に `127.0.0.1` にバインドされます。CDP はブラウザに対する完全な制御権を付与するため、追加の認証なしに CDP ポートを公開ネットワークへ露出しないでください。
- **機密情報の分離。** プロキシ認証情報はローカルループバックリレーのメモリ内にのみ存在し、プロセスのコマンドライン、プロファイルメタデータ、ログ、エラー詳細には一切現れません。
- **テレメトリなし。** SDK はアナリティクス、クラッシュレポート、隠れたネットワーク通信を一切送信しません。

セキュリティ上の問題は [SECURITY.md](../../SECURITY.md) に従って非公開で報告してください。

## リポジトリ構成

```text
.
├── README.md                    # ルート README (English)
├── translations/
│   ├── ja/README.md             # このファイル (日本語)
│   └── <locale>/README.md       # その他 20 言語のローカライズ
├── desktop/                     # Ombra Desktop (Tauri: Rust カタログ + Vue UI)
├── docs/
│   ├── architecture.md          # アーキテクチャ、信頼境界、ライフサイクル
│   ├── sdk-contract.md          # v0.2 起動コントラクト、オプション、エラー、不変条件
│   ├── stealth-checkup.md       # チェックアップ手法 (English)
│   ├── stealth-checkup.ru.md    # チェックアップ手法 (Русский)
│   ├── versioning.md            # SDK、エンジン、クライアントのバージョニング
│   └── desktop/                 # Desktop のローカルプロファイルおよびキーのガイド
├── spec/
│   └── schemas/                 # 起動オプションおよびバイナリメタデータの JSON Schema
├── sdks/
│   ├── manifest.json            # 機械可読な SDK レジストリ
│   ├── README.md                # SDK の構成とコントリビューション規約
│   ├── python/                  # Python SDK (ombrabrowser として公開)
│   ├── node/                    # Node.js / TypeScript SDK (@ombralabs/sdk として公開)
│   └── ...                      # 他言語向けコントラクトスキャフォールド (Go、Rust、C#、Java、PHP、Ruby)
├── conformance/                 # 言語横断の起動・ステルス不変条件ケース
├── tools/check_repo.py          # 構造・スキーマ・リンクのバリデーター (CI)
└── .github/workflows/ci.yml
```

このリポジトリでは、SDK コントラクト、スキーマ、コンフォーマンスケース、ドキュメント、および Ombra Desktop のソースコードを管理しています。Chromium エンジンパッチは別リポジトリで保守されており、コンパイル済みビルドはダウンロードチャネルおよび [GitHub Releases](https://github.com/ombralabs/ombra/releases) から公開されています。

## よくある質問 (FAQ)

### これは Playwright のフォークですか？

いいえ。SDK は公式の Playwright（または Puppeteer）クライアントをローカル CDP 経由で Ombra Chromium に接続します。すべての型、ロケーター、待機処理、ページオブジェクトは標準のままです。

### Ombra は無料ですか？ライセンスキーは必要ですか？

このリポジトリ内の SDK ソースコードは Apache License 2.0 のオープンソースです。現行エンジンビルド（`158.0.8127.37-3` 以降）およびローカルの Ombra Desktop プロファイルマネージャー（`desktop-v1.2.2`）は無料で自律動作し、アカウント、ライセンスキー、ハードウェア ID、プロファイル数制限はありません。`license_key` と `OMBRA_LICENSE_KEY` は旧ライセンスビルドでのみ必要です。

### SDK を使うのに Ombra Desktop のインストールは必要ですか？

いいえ。SDK はエンジンを子プロセスとして直接起動するため、スクリプト、コンテナ、CI での利用に適しています。Ombra Desktop は、ローカルのプロファイルカタログを GUI で管理したい場合のオプションです。

### Ombra は `playwright-stealth` とどう違いますか？

`playwright-stealth` は通常のブラウザ上でページに JavaScript を注入する方式であり、最新の検出器ではパッチ自体が頻繁に識別されます。Ombra は変更を Chromium のソースコードにコンパイルしており、SDK はページへスクリプトを一切注入しません。

### 独自のプロキシは使えますか？

はい。`proxy` に `http://`、`https://`、または `socks5://` プロキシを指定できます。認証情報が含まれる場合、SDK はローカルループバックリレーを起動するため、プロセス引数に認証情報が露出することはありません。なお、Playwright 独自の `context.request` / `page.request` クライアントはブラウザレベルのプロキシ設定をバイパスする場合があるため、確実にプロキシ経由で通信するにはページコンテキストから `fetch()` を発行してください。

### どのバージョンの Playwright と Puppeteer がサポートされていますか？

Python SDK には Playwright `>=1.60,<2.0` が必要です（`ombrabrowser` と一緒に自動インストールされます）。Node.js SDK は `playwright-core@^1.60.0` または `puppeteer-core >=22.0.0` をサポートしています。互換性ルールについては[バージョニングガイド](../../docs/versioning.md)を参照してください。

### Ombra を使えばあらゆるボットチェックを通過できますか？

いいえ。検出技術は絶えず変化しており、サイト、地域、IP レピュテーション、プロファイル履歴、検出器バージョンに左右されます。特定の構成を客観的に計測・追跡するには、[ステルスチェックアップ手法](../../docs/stealth-checkup.md)を使用してください。

### Ombra はどのような用途向けに作られていますか？

Ombra は、認可された自動化、QA テスト、監視、調査研究、および分離された業務プロファイルの管理向けに構築されています。不正アクセス、クレデンシャルスタッフィング、悪用行為はサポートしていません。

## コントリビューション

コントリビューションガイドラインは [CONTRIBUTING.md](../../CONTRIBUTING.md)、コミュニティ行動規範は [CODE_OF_CONDUCT.md](../../CODE_OF_CONDUCT.md)、SDK の開発手順は [sdks/README.md](../../sdks/README.md) を参照してください。

- 新しい起動オプションを追加する前に、[SDK コントラクト](../../docs/sdk-contract.md) と [スキーマ](../../spec/schemas) を更新してください。
- SDK の挙動を変更する場合は、実装、テスト、および [conformance](../../conformance/README.md) 内の共通ケースを更新してください。
- プルリクエストを作成する前に `python3 tools/check_repo.py` を実行し、リポジトリ構成とリンクを検証してください。

## ライセンス

このリポジトリ内の SDK ソースコードは [Apache License 2.0](../../LICENSE) の下でライセンスされています。このライセンスは Ombra の商標、Ombra Chromium エンジン、および Ombra Desktop に対する権利を付与するものではありません。商標およびサードパーティの条件については [NOTICE](../../NOTICE) を参照してください。

## リンク

- 🌐 **Web サイト** — [ombrabrowser.dev](https://ombrabrowser.dev)
- 📦 **PyPI** — [pypi.org/project/ombrabrowser](https://pypi.org/project/ombrabrowser/)
- 📦 **npm** — [npmjs.com/package/@ombralabs/sdk](https://www.npmjs.com/package/@ombralabs/sdk)
- 🚀 **リリース (エンジン & Desktop)** — [GitHub Releases](https://github.com/ombralabs/ombra/releases)
- 📋 **変更履歴** — [CHANGELOG.md](../../CHANGELOG.md)
- 🐛 **バグ報告・機能リクエスト** — [GitHub Issues](https://github.com/ombralabs/ombra/issues)
- 🏢 **組織** — [Ombra Labs](https://github.com/ombralabs)
