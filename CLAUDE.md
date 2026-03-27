# CLAUDE.md — TikTok クイズ自動化

このファイルは、このリポジトリで作業するAIアシスタント向けのガイドです。

## プロジェクト概要

日本語の雑学クイズ動画を毎日自動生成・レンダリング・TikTokに投稿するシステムです。

**パイプライン**: GitHub Actions (毎日20:00 JST) → Claude API (クイズJSON生成) → Remotion (MP4レンダリング) → TikTok API (投稿)

**主要言語**: TypeScript/JavaScript (ESM)
**Node.js要件**: >= 18.0.0
**パッケージマネージャー**: npm

---

## リポジトリ構成

```
tiktok-quiz-automation/
├── .github/workflows/daily-video.yml  # スケジュール実行CI/CD
├── scripts/
│   ├── generate-quiz.mjs              # Claude APIでクイズ生成
│   ├── render.mjs                     # Remotionで動画レンダリング
│   ├── post-to-tiktok.mjs             # TikTok APIで投稿
│   └── pipeline.mjs                   # 上記3つを順番に実行するオーケストレーター
├── src/
│   ├── QuizVideo.tsx                  # メインのRemotion動画コンポーネント
│   ├── Root.tsx                       # Remotionコンポジションのエントリポイント
│   └── index.ts                       # Remotion登録
├── public/quiz-data.json              # 生成されたクイズデータ（自動生成・コミット対象）
├── output/                            # レンダリング済みMP4（.gitignore対象）
├── .env.example                       # 必要な環境変数のテンプレート
├── tsconfig.json
└── package.json
```

---

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| 動画生成 | [Remotion](https://www.remotion.dev/) 4.x（Reactベース）|
| AIコンテンツ | Anthropic Claude API（`claude-opus-4-5`）|
| TikTok投稿 | TikTok Content Posting API v2 |
| HTTPクライアント | axios |
| スケジューリング | GitHub Actions（cron）|
| 言語 | TypeScript 5.3、ESMモジュール（`.mjs`）|

---

## 開発コマンド

```bash
# 依存関係のインストール
npm install

# ブラウザでプレビュー（Remotion Studio）
npm run dev

# フルパイプラインをローカル実行（TikTok投稿なし）
DRY_RUN=true node scripts/pipeline.mjs

# 各ステップを個別実行
node scripts/generate-quiz.mjs    # public/quiz-data.json を生成
node scripts/render.mjs           # output/quiz-YYYY-MM-DD.mp4 をレンダリング
node scripts/post-to-tiktok.mjs   # output/ 内の最新MP4を投稿

# 動画レンダリングのみ
npm run render

# プロダクション向けバンドル
npm run build
```

---

## 環境変数

ローカル開発では `.env.example` を `.env` にコピーして使用します。CI環境ではGitHub Secretsを使用します。

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `ANTHROPIC_API_KEY` | Yes | Claude APIキー（`sk-ant-...`）|
| `TIKTOK_ACCESS_TOKEN` | Yes | TikTok Content Posting APIトークン |
| `TIKTOK_OPEN_ID` | Yes | TikTokユーザーのOpen ID |
| `DRY_RUN` | No | `true` に設定するとTikTok投稿をスキップ |
| `CATEGORY_OVERRIDE` | No | 特定のカテゴリを強制指定 |

**注意**: TikTokトークンは有効期限があります（24時間〜30日）。長期運用にはトークン更新の仕組みが必要です。

---

## 主要な規約

### スクリプト（.mjsファイル）
- すべてのスクリプトは **ESM構文** を使用（`import`/`export`、`require`は不使用）
- スクリプトは独立して動作 — TypeScriptのコンパイル不要
- `public/quiz-data.json` と `output/` ディレクトリを読み書きする

### 動画コンポーネント（`src/QuizVideo.tsx`）
- Propsは **Zodスキーマ** でバリデーション
- タイムラインは **フレームベース**（30 FPS、合計450フレーム = 15秒）:

| フェーズ | フレーム | 時間 |
|---------|---------|------|
| イントロ | 0〜40 | 1.3秒 |
| 問題表示 | 40〜100 | 2秒 |
| 選択肢表示 | 100〜160 | 2秒 |
| カウントダウン | 160〜310 | 5秒 |
| 答え表示 | 310〜370 | 2秒 |
| 解説 | 370〜450 | 2.67秒 |

- 出力解像度: **1080×1920**（TikTok 9:16縦型）
- レンダリング設定: h264、CRF 18、ビットレート4M（映像）/ 320k（音声）

### クイズデータのスキーマ
`public/quiz-data.json` の構造:
```json
{
  "question": "...",
  "choices": ["A", "B", "C", "D"],
  "correctIndex": 0,
  "explanation": "...",
  "category": "科学",
  "difficulty": "ふつう",
  "bgColor": "#1a1a2e",
  "accentColor": "#e94560"
}
```

### カテゴリ・難易度のローテーション
`Date.now()` を配列の長さで割った余りで毎日ローテーション:
- **カテゴリ（8種）**: 地理、科学、歴史、動物、食文化、スポーツ、日本文化、雑学
- **難易度（3段階）**: かんたん、ふつう、むずかしい
- 各カテゴリには `bgColor` と `accentColor` が対応付けられている

### TikTok投稿
- プライバシーはデフォルト `SELF_ONLY` — 本番公開時は `PUBLIC_TO_EVERYONE` に変更
- ハッシュタグ戦略: 基本タグ + エンゲージメントタグ + カテゴリ別タグ
- `output/` ディレクトリ内の最新 `.mp4` を自動検出

---

## GitHub Actionsワークフロー

ファイル: `.github/workflows/daily-video.yml`

- **スケジュール**: 毎日11:00 UTC（20:00 JST）
- **手動実行**: `workflow_dispatch`（オプションで `dry_run` 入力可）
- **同時実行制御**: 並行実行を防ぐ
- **タイムアウト**: 30分
- **アーティファクト**: 動画を7日間保持してアップロード
- **CI環境のシステム要件**: Chrome（Remotion用）、日本語フォント（Noto Sans CJK）

---

## AIアシスタントがよく行うタスク

### 動画レイアウトの変更
`src/QuizVideo.tsx` を編集します。上記のタイムライン表のフレーム番号を参考に対象フェーズを特定してください。`CountdownRing` と `ChoiceButton` は同ファイル内のサブコンポーネントです。

### クイズ生成の動作変更
`scripts/generate-quiz.mjs` を編集します。Claudeのモデル、プロンプトテンプレート、カテゴリ、難易度、カラースキームがすべてここで定義されています。

### 動画レンダリング設定の変更
`scripts/render.mjs` を編集します。主要設定: `codec`、`crf`、`videoBitrate`、`audioBitrate`、出力パス。

### TikTok投稿動作の調整
`scripts/post-to-tiktok.mjs` を編集します。プライバシーレベル、ハッシュタグ配列、APIバージョンがここで定義されています。

### 新しいカテゴリの追加
1. `scripts/generate-quiz.mjs` の `CATEGORIES` 配列に `name`、`emoji`、`bgColor`、`accentColor` を持つエントリを追加
2. `scripts/post-to-tiktok.mjs` に対応するハッシュタグを追加

### TikTok投稿なしでローカルテスト
```bash
DRY_RUN=true node scripts/pipeline.mjs
```

---

## 重要事項

- `output/` は `.gitignore` 対象 — レンダリング済み動画はコミットされない
- `public/quiz-data.json` はコミット対象で、レンダリング時にRemotionバンドラーが読み込む
- `tiktokcZQ3pMTS7bbHDRoDpMXkig66qVtr3CK8.txt` はTikTokのドメイン認証ファイル — 削除禁止
- このプロジェクトは日本語圏のTikTokユーザーを対象としており、クイズ内容とUIテキストはすべて日本語
- `render.mjs` を実行する環境にはChromeのインストールが必要
