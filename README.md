# 📱 TikTok 雑学クイズ 自動投稿システム

Claude API + Remotion + GitHub Actions で、毎日自動的にTikTok用クイズ動画を生成・投稿するシステムです。

## 🎯 概要

```
毎日 20:00 (JST) GitHub Actions が自動起動
    ↓
Claude API で日本語雑学クイズを生成
    ↓
Remotion で9:16縦型動画をレンダリング（15秒）
    ↓
TikTok API で自動投稿
```

### コンテンツ例
- 「日本で一番高い山は？」（地理クイズ）
- 「キリンが寝る時間は1日何時間？」（動物クイズ）
- 「江戸時代の人口は？」（歴史クイズ）

8カテゴリを日付で自動ローテーション：🌏地理 / 🔬科学 / 📜歴史 / 🐾動物 / 🍜食文化 / 🏆スポーツ / 🎌日本文化 / 💡雑学

---

## 🚀 セットアップ手順

### 1. リポジトリのフォーク & クローン

```bash
git clone https://github.com/YOUR_USERNAME/tiktok-quiz-automation
cd tiktok-quiz-automation
npm install
```

### 2. 環境変数の設定

```bash
cp .env.example .env
```

`.env` を編集して以下を設定：

```
ANTHROPIC_API_KEY=sk-ant-...
TIKTOK_ACCESS_TOKEN=...
TIKTOK_OPEN_ID=...
```

### 3. APIキーの取得方法

#### Claude API キー
1. https://console.anthropic.com/ にアクセス
2. 「API Keys」→「Create Key」
3. キーをコピーして `.env` に貼り付け

#### TikTok API
1. https://developers.tiktok.com/ でアカウント作成
2. アプリを作成（「Content Posting API」を有効化）
3. OAuth 2.0 で認証してアクセストークンを取得
4. スコープ: `video.publish`, `video.upload` が必要

### 4. GitHub Secrets の設定

GitHubリポジトリの Settings → Secrets and variables → Actions に追加：

| Secret名 | 内容 |
|---------|------|
| `ANTHROPIC_API_KEY` | Claude API キー |
| `TIKTOK_ACCESS_TOKEN` | TikTok アクセストークン |
| `TIKTOK_OPEN_ID` | TikTok ユーザーの Open ID |

---

## 💻 ローカルでのテスト実行

### クイズ生成のみ
```bash
node scripts/generate-quiz.mjs
# → public/quiz-data.json に保存される
```

### 動画レンダリングのみ
```bash
node scripts/render.mjs
# → output/quiz-YYYY-MM-DD.mp4 に保存される
```

### Remotionプレビュー（ブラウザで確認）
```bash
npm run dev
# → http://localhost:3000 でプレビュー
```

### 全パイプライン（投稿なし）
```bash
DRY_RUN=true node scripts/pipeline.mjs
```

### 全パイプライン（投稿あり）
```bash
node scripts/pipeline.mjs
```

---

## 📂 プロジェクト構成

```
tiktok-quiz-automation/
├── src/
│   ├── Root.tsx           # Remotionのエントリーポイント
│   ├── QuizVideo.tsx      # メイン動画コンポーネント（アニメーション込み）
│   └── index.ts
├── scripts/
│   ├── generate-quiz.mjs  # Claude APIでクイズ生成
│   ├── render.mjs         # Remotionで動画レンダリング
│   ├── post-to-tiktok.mjs # TikTok APIで投稿
│   └── pipeline.mjs       # 全ステップを一括実行
├── .github/workflows/
│   └── daily-video.yml    # GitHub Actions（毎日20:00 JST）
├── public/
│   └── quiz-data.json     # 生成されたクイズデータ（自動生成）
└── output/                # レンダリングされた動画（.gitignore対象）
```

---

## 🎨 動画カスタマイズ

`src/QuizVideo.tsx` の `TIMELINE` を変更すると動画の尺・タイミングを調整できます：

```typescript
const TIMELINE = {
  intro:       { start: 0,   duration: 40  },  // イントロ
  question:    { start: 40,  duration: 60  },  // 問題表示
  choices:     { start: 100, duration: 60  },  // 選択肢登場
  countdown:   { start: 160, duration: 150 },  // カウントダウン（5秒）
  reveal:      { start: 310, duration: 60  },  // 答え発表
  explanation: { start: 370, duration: 80  },  // 解説
};
```

---

## 📈 収益化の目安（日本語TikTok）

| フォロワー数 | 月間再生数（目安） | 月収（Creator Rewards） |
|------------|----------------|----------------------|
| 1,000〜    | 10万〜          | ¥500〜¥2,000          |
| 10,000〜   | 100万〜         | ¥5,000〜¥20,000       |
| 100,000〜  | 1,000万〜       | ¥50,000〜¥200,000     |

**収益化条件（Creator Rewards Program）:**
- フォロワー 10,000人以上
- 過去30日間で動画再生 100,000回以上
- 動画の長さ 1分以上（このシステムは15秒なので、複数クイズをつなげて1分以上の動画も可能）

---

## ⚠️ 注意事項

- TikTok APIのアクセストークンは有効期限があります（通常24時間〜30日）。定期的なリフレッシュが必要です。
- `PRIVACY_LEVEL` は最初 `SELF_ONLY`（非公開）に設定しています。動作確認後は `post-to-tiktok.mjs` で `PUBLIC_TO_EVERYONE` に変更してください。
- GitHub Actionsの無料枠：月2,000分まで。このワークフローは1回あたり約10〜15分なので、毎日実行しても月300〜450分程度で余裕があります。
