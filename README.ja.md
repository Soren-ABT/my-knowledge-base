# 🎵 Soren's ナレッジベース & ブログ

<img align='right' src='public/favicon.svg' width='180px' alt="logo">

[Astro 6](https://astro.build) と [Tailwind CSS 4](https://tailwindcss.com) で構築された超高速な個人ナレッジベース＆ブログ。Web Audio API DSP パイプラインを備えたプロ仕様の Hi-Res 音楽プレーヤー、OKLCH 動的テーマシステム、Three.js 3D インタラクティブウェルカムページ、全文検索を搭載。

[![Node.js >= 18](https://img.shields.io/badge/node.js-%3E%3D18-brightgreen?logo=nodedotjs)](https://nodejs.org/)
[![Astro 6](https://img.shields.io/badge/Astro-6.4.3-%23FF5D01?logo=astro)](https://astro.build)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind-4.1.6-%2306B6D4?logo=tailwindcss)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-green.svg)](LICENSE)

[**🖥️ ライブデモ**](https://soren-abt.github.io) | [**📝 利用ガイド**](https://soren-abt.github.io/posts/website-user-guide/) | [**📚 記事一覧**](https://soren-abt.github.io/posts/)

🌏 **README 言語：**
[**English**](./README.md) / [**中文**](./README.zh.md) / [**日本語**](./README.ja.md) / [**繁體中文**](./README.tw.md) /

ブログ記事やナレッジベースのノートから没入型の音楽鑑賞まで、このプロジェクトは学生や開発者が個人ウェブサイトを構築するために必要なすべてをまとめています。LaTeX 数式を使ったノート作成、学習資料の整理、ハイファイオーディオの再生まで、すべてを洗練された無料の静的サイトで実現します。

---

## ✨ 機能

### 🎨 デザイン & インターフェース

- [x] [Astro 6](https://astro.build) + [Tailwind CSS 4](https://tailwindcss.com) で構築、OKLCH 色空間を採用
- [x] Astro [View Transitions](https://docs.astro.build/en/guides/view-transitions/) によるスムーズなページ遷移
- [x] システム設定に応じたライト/ダークテーマ自動切替
- [x] 動的色相スライダー — 1 つの CSS 変数でサイト全体のアクセントカラーを変更
- [x] フルスクリーン壁紙カルーセル + グラスモーフィズムカード効果
- [x] 桜のパーティクルアニメーション（Canvas、オン/オフ切替可能）
- [x] ウェルカムページのカスタムカーソル（ホバーエフェクト付き）
- [x] 全デバイス対応レスポンシブデザイン

### 🎼 音楽プレーヤー

- [x] Web Audio API DSP 信号経路：`ReplayGain → Headroom → Compressor → Crossfeed → Analyser`
- [x] 20 以上の音声形式に対応：FLAC、ALAC、WAV、AIFF、WavPack、APE、TAK、TTA、MP3、AAC、Opus、OGG 他
- [x] 自動品質分類：Studio Master / Hi-Res / CD 品質 / 標準ロスレス
- [x] Roon にインスパイアされた没入型フルスクリーン再生（ブラーカバー背景）
- [x] Apple Music スタイルのライブラリブラウザ：アルバム、アーティスト、ジャンル、年別に閲覧
- [x] 音声ファイルメタデータからのアルバムカバー自動抽出
- [x] ReplayGain（トラック/アルバムゲイン正規化）
- [x] EQ プリセット：Off、Classical、Rock、Jazz、Headphones、Voice
- [x] 最近の再生履歴（無効エントリの自動クリーンアップ付き）
- [x] お気に入り & 再生キュー管理

### 🔍 コンテンツ & 検索

- [x] Markdown/MDX 執筆、Zod 型付きコンテンツコレクション
- [x] 強化されたコードブロック（[Expressive Code](https://expressive-code.com/)）：行番号、コピーボタン、折りたたみ
- [x] LaTeX 数式：KaTeX（サーバーサイド）+ MathJax 3（クライアントフォールバック）
- [x] Mermaid 図表（ライト/ダークテーマ自動切替）
- [x] GitHub スタイルの注意書き：`:::note`、`:::tip`、`:::important`、`:::caution`、`:::warning`
- [x] GitHub リポジトリカード：`:github[user/repo]` 構文
- [x] 画像の幅指定とセンタリング：`![説明 w-400 center](url)`
- [x] Pagefind 静的全文検索（中国語分詞対応）
- [x] 読了時間の推定（中国語 400 字/分、英語 200 語/分）
- [x] スクロール追跡付き浮動目次の自動生成
- [x] RSS 2.0 フィード

### 🛠 技術機能

- [x] デフォルトで JS ゼロ出力（Islands Architecture）
- [x] Satori による OG 画像自動生成（JSX → SVG → PNG）
- [x] SEO のための JSON-LD 構造化データ
- [x] 下書きシステム（開発時は表示、本番では非表示）
- [x] ページナビゲーション間の読書位置復元
- [x] スクロール進捗リング付きトップへ戻るボタン
- [x] キーボード操作対応の画像ライトボックス
- [x] ホバー時のリンクプレビューカード
- [x] カスタム remark/rehype プラグインパイプライン（12 プラグイン）

### 🏠 ウェルカムページ

- [x] Three.js ワイヤーフレームジオメトリ（マウスパララックス付き）
- [x] カスタムカーソル（システムカーソルを非表示、6px ドット + グロー）
- [x] 時間帯に応じた挨拶（タイプライターエフェクト）
- [x] サイトタイトルの1文字ずつの登場アニメーション
- [x] 3D シーンの昼夜モード切替

---

## 🚀 クイックスタート

### 必要条件

| 依存関係 | バージョン |
|----------|------------|
| Node.js | >= 18（LTS 推奨） |
| npm | >= 9 |

### インストール

```bash
# 1. リポジトリをクローン
git clone https://github.com/Soren-ABT/my-knowledge-base.git
cd my-knowledge-base

# 2. 依存関係をインストール
npm install

# 3. （オプション）音楽ファイルを追加
# 音声ファイルを public/assets/music/url/ に配置
# 対応形式：.mp3 .flac .m4a .ogg .wav .wma .aiff .ape .wv .opus .aac .mpc .mp4 .alac .tak .tta .ac3 .dts
# 注意：DSD（.dsf/.dff）は非対応 — スキャナーが自動的にスキップします

# 4. 音楽をスキャンしてプレイリストを生成
npm run scan-music

# 5. 開発サーバーを起動
npm run dev
```

ブラウザで `http://localhost:3000` を開きます。

### コンテンツの作成

```bash
# 新しいブログ記事を作成（手動）
# src/content/posts/ に frontmatter 付きの .md ファイルを追加：

---
title: "最初の投稿"
published: 2026-06-10
description: "SEO とプレビュー用の短い説明"
tags: ["技術", "チュートリアル"]
category: "技術"
draft: false
pinned: false
---
```

ナレッジベースのドキュメントは `src/content/docs/files/` に配置します。

---

## 📝 記事の Frontmatter

```yaml
---
title: "記事タイトル"                 # 必須
published: 2026-06-10                 # 必須
updated: 2026-06-10                   # オプション
description: "SEO 説明"               # 推奨
image: "./cover.jpg"                  # オプション、カバー画像
tags: ["タグ1", "タグ2"]             # デフォルト: []
category: "技術"                       # オプション
draft: false                          # true = 本番で非表示
pinned: false                         # true = トップに固定
---
```

### 下書きシステム

下書き記事は開発モード（`npm run dev`）では表示されますが、本番ビルドでは自動的に非表示になります。公開前に記事をじっくり磨き上げるのに便利です。

---

## ⚡ コマンド

| コマンド | 説明 |
|----------|------|
| `npm run dev` | 音楽スキャン + 開発サーバー起動（`localhost:3000`） |
| `npm run build` | 音楽スキャン + 本番ビルド + Pagefind 検索インデックス |
| `npm run preview` | 本番ビルドをローカルでプレビュー |
| `npm run scan-music` | 音楽ファイルのみスキャンしてプレイリストを生成 |
| `npm run scan-music:watch` | 音楽ディレクトリの変更を監視し自動更新 |

---

## 🎼 音楽プレーヤー

### 信号経路

```
MediaElement → Gain(ReplayGain) → Gain(Headroom -3dB) → DynamicsCompressor
  → [Crossfeed Split] → Analyser → Destination
```

### 品質レベル

| レベル | 基準 | バッジ |
|--------|------|--------|
| Studio Master | > 96kHz / 24bit | SM |
| Hi-Res ロスレス | > 48kHz / 24bit | HR |
| CD 品質 | 44.1kHz / 16bit | CD |
| 標準ロスレス | 44.1kHz / 16bit（その他形式） | — |
| 高ビットレート非可逆 | > 256kbps | — |
| 標準非可逆 | > 128kbps | — |
| 低ビットレート非可逆 | < 128kbps | — |

### 音楽の追加

1. 音声ファイルを `public/assets/music/url/` に配置
2. `npm run scan-music` を実行
3. カバー画像が `public/assets/music/cover/` に自動抽出されます
4. プレイリストが `public/api/music-playlist.json` に生成されます

スキャナーは `music-metadata` ライブラリを使用して埋め込みメタデータ（タイトル、アーティスト、アルバム、年、ジャンル、作曲者、トラック番号、ReplayGain）を読み取ります。形式検出にはマジックバイトを使用し、ファイル拡張子に依存しません。

---

## 📁 プロジェクト構成

```
my-knowledge-base/
├── public/
│   ├── assets/
│   │   ├── font/                        # セルフホストフォント（woff2）
│   │   ├── music/
│   │   │   ├── url/                     # 音声ファイル（ここに音楽を配置）
│   │   │   └── cover/                   # カバーアート（自動抽出）
│   │   └── wallpaper/                   # デスクトップ + モバイル壁紙
│   ├── api/
│   │   └── music-playlist.json          # プレイリスト API（自動生成）
│   └── js/                              # クライアントスクリプト
│       ├── app.js                       # メインアプリロジック
│       ├── music-player.js              # オーディオエンジン（Web Audio API）
│       ├── music-player-library.js      # ライブラリブラウザ UI
│       ├── music-player-eq-presets.js   # イコライザープリセット
│       ├── music-player-decoder.js      # フォーマットデコーダー情報
│       ├── music-player-lyrics.js       # 歌詞表示
│       ├── sakura.js                    # 桜パーティクルエフェクト
│       ├── welcome-3d.js                # Three.js 3D シーン
│       └── mermaid-render.js            # Mermaid 図表レンダラー
├── scripts/
│   ├── scan-music.mjs                   # 音楽メタデータスキャナー
│   ├── audio-decoder.mjs                # 音声フォーマット知識ベース
│   └── tag-reader.mjs                   # タグリーダー＆正規化
├── src/
│   ├── components/                      # Astro コンポーネント（18 ファイル）
│   │   └── MusicPlayer.astro            # 音楽プレーヤー完全 UI
│   ├── config/                          # サイト設定（9 ファイル）
│   │   └── musicPlaylist.generated.ts   # プレイリスト TS（自動生成）
│   ├── content/
│   │   ├── posts/                       # ブログ記事（*.md）
│   │   └── docs/files/                  # ナレッジベース文書
│   ├── content.config.ts                # Zod コンテンツスキーマ
│   ├── layouts/
│   │   ├── Layout.astro                 # メインレイアウト（全コンテンツページ）
│   │   └── WelcomeLayout.astro          # ウェルカムページレイアウト
│   ├── pages/                           # ルートページ（12 ファイル）
│   ├── plugins/                         # Remark/Rehype プラグイン（12 ファイル）
│   ├── styles/                          # CSS デザインシステム（7 層）
│   └── types/                           # TypeScript 型定義
├── astro.config.ts                      # Astro 設定
├── pagefind.yml                         # 検索エンジン設定
├── vercel.json                          # Vercel デプロイ + セキュリティヘッダー
└── package.json
```

---

## 🎯 設定ガイド

### Astro 設定

`astro.config.ts` を編集して、サイト URL、統合、Markdown プラグイン、Vite オプションをカスタマイズします。設定ファイルはセクションごとに整理され、詳細なコメントが付いています。

### サイト設定

`src/config/` 以下のファイルを編集：
- サイトメタデータ（タイトル、説明、著者）
- ナビゲーションリンク
- ソーシャルリンク
- テーマのデフォルト値

### CSS デザイントークン

すべての色は単一の `--hue` CSS 変数から OKLCH 色空間を介して導出されます。1 つの数字を変更するだけでサイト全体の色を変更できます：

```css
:root {
  --hue: 250; /* デフォルトは紫青 */
  --primary: oklch(65% 0.25 var(--hue));
}
```

---

## 🚀 デプロイ

### GitHub Pages（無料）

リポジトリには GitHub Actions ワークフローが含まれています。`master` ブランチにプッシュすると、自動的にビルドされて `gh-pages` にデプロイされます。

設定：`astro.config.ts` → `site` + `base`、その後リポジトリの Settings → Pages で有効化。

### Vercel（無料 CDN）

```bash
npm i -g vercel
vercel
```

Vercel はグローバル CDN アクセラレーションと自動 HTTPS を提供します。無料枠は 100GB/月の帯域幅 — 個人ブログには十分以上です。

### 環境変数

環境変数は不要です。プロジェクトはゼロ設定でデプロイ可能です。

---

## 🧩 Markdown 拡張

標準の GitHub Flavored Markdown に加えて、本プロジェクトは以下をサポートします：

| 拡張 | 構文 | 説明 |
|------|------|------|
| 注意書き | `:::note` / `:::warning` 他 | 5 種類のコールアウトボックス |
| 数式 | `$E=mc^2$` / `$$\int$$` | LaTeX（KaTeX + MathJax） |
| 図表 | ` ```mermaid ` | フローチャート、シーケンス図、ガントチャート |
| GitHub カード | `:github[user/repo]` | リポジトリ情報カード |
| 画像幅指定 | `![説明 w-400 center](url)` | カスタム幅 + センタリング |
| コードブロック | ` ```言語 ` | 行番号、コピー、折りたたみ |

完全なリファレンスは [Markdown ガイド](https://soren-abt.github.io/posts/markdown-guide/) を参照してください。

---

## 🏗 アーキテクチャ

```
ビルド時：
  Markdown → remark プラグイン → rehype プラグイン → HTML
              │                                    │
              └── 読了時間、数式、                  └── コンポーネント、シンタックス
                  ディレクティブ、Mermaid               ハイライト、ラッピング

  scan-music.mjs → music-metadata → FLAC タグ
    → musicPlaylist.generated.ts（サーバー）
    → music-playlist.json（クライアント API）
    → カバー画像抽出

実行時：
  app.js: ナビバースクロール、検索モーダル、ライトボックス、設定パネル、
          トップへ戻る、プログレスバー、リンクプレビュー、キーボードショートカット

  music-player.js: Web Audio API DSP チェーン、HTML5 Audio 要素、
                   状態管理、パブリッシュ-サブスクライブブロードキャスト

  welcome-3d.js: Three.js シーン、マウスパララックス、ズーム、昼夜モード
```

---

## 🌟 キーボードショートカット

| ショートカット | アクション |
|----------------|------------|
| `Ctrl+K` / `/` | 検索を開く |
| `Ctrl+D` | ダーク/ライトテーマ切替 |
| `Ctrl+↑` | トップへスクロール |
| `?` | 全ショートカットを表示 |
| `Esc` | モーダル / パネルを閉じる |

**音楽プレーヤー（ライブラリが開いている時）：**

| ショートカット | アクション |
|----------------|------------|
| `Space` | 再生 / 一時停止 |
| `Alt+←` / `Cmd+←` | 前のトラック |
| `Alt+→` / `Cmd+→` | 次のトラック |
| `Esc` | ライブラリを閉じる |

完全なリストは [ウェブサイト利用ガイド](https://soren-abt.github.io/posts/website-user-guide/) をご覧ください。

---

## 🙏 謝辞

- フレームワーク：[Astro](https://astro.build) — 最高の静的サイトフレームワーク
- フォント：[LXGW WenKai](https://github.com/lxgw/LxgwWenKai)（本文）、JetBrains Mono Nerd Font（コード）
- 数式：[KaTeX](https://katex.org) + [MathJax](https://www.mathjax.org)
- 検索：[Pagefind](https://pagefind.app)
- インスピレーション：Roon（音楽 UI）、Apple Music（ライブラリブラウザ）、foobar2000（DSP）

---

## 📄 ライセンス

コンテンツ：[CC BY-NC-SA 4.0](LICENSE) — 引用・共有は自由ですが、出典を明記してください。

コード：MIT — 使用、改変、学習にご自由にお使いください。

---

⭐ このプロジェクトが役立つと思ったら、Star を付けていただけると嬉しいです！
