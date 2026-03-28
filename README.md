# 📱 TikTok 雑学クイズ 自動投稿システム

Claude API + Remotion + GitHub Actions で、毎日自動的にTikTok用クイズ動画を生成・投稿するシステムです。

## 🎯 概要

```
毎日 20:00 (JST) GitHub Actions が自動起動
    ↓
Claude API で日本語雑学クイズを生成（hook・bonusFact含む）
    ↓
Remotion で9:16縦型動画をレンダリング（64秒 / Creator Rewards Program対応）
    ↓
TikTok API で自動投稿
```

### コンテンツ例
- 「99%の人が知らない！コンビニのあの食べ物の本当の名前は？」（日常雑学）
- 「脳が騙される錯覚クイズ！正解できたら天才」（心理・脳科学）
- 「江戸時代にあった意外なもの、何個知ってる？」（歴史クイズ）

10カテゴリを日付で自動ローテーション：
🧠心理 / 💡雑学 / 📜歴史 / 🔬科学 / 🐾動物 / 🍜食文化 / 🌏地理 / 🎌日本文化 / 🏥健康・体 / 💰お金・経済

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
| `ANTHROPIC_API_KEY` | Claude API キー（`sk-ant-...` の形式で、引用符なし） |
| `TIKTOK_ACCESS_TOKEN` | TikTok アクセストークン |
| `TIKTOK_OPEN_ID` | TikTok ユーザーの Open ID |

> ⚠️ **重要**: `ANTHROPIC_API_KEY` はキーの値のみを貼り付けてください。引用符（`"` や `'`）や改行を含めると認証エラーになります。

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
│   ├── QuizVideo.tsx      # メイン動画コンポーネント（9フェーズ・64秒）
│   ├── index.ts
│   └── components/        # サブコンポーネント
├── scripts/
│   ├── generate-quiz.mjs  # Claude APIでクイズ生成
│   ├── render.mjs         # Remotionで動画レンダリング
│   ├── post-to-tiktok.mjs # TikTok APIで投稿
│   └── pipeline.mjs       # 全ステップを一括実行
├── .github/workflows/
│   └── daily-video.yml    # GitHub Actions（毎日20:00 JST、タイムアウト60分）
├── public/
│   ├── quiz-data.json     # 生成されたクイズデータ（自動生成）
│   ├── bgm.mp3            # BGM（Gitに含める）
│   ├── countdown-tick.mp3 # カウントダウン音
│   ├── intro-jingle.mp3   # イントロ音
│   └── reveal.mp3         # 答え発表音
└── output/                # レンダリングされた動画（.gitignore対象）
```

---

## 🎨 動画タイムライン（64秒 / 1920フレーム @ 30fps）

`src/QuizVideo.tsx` の `TIMELINE` を変更すると動画の尺・タイミングを調整できます：

```typescript
const TIMELINE = {
  hook:        { start: 0,    duration: 90  },  // 0〜3秒:    フック「99%の人が間違える！」
  question:    { start: 90,   duration: 120 },  // 3〜7秒:    問題文フェードイン
  choices:     { start: 210,  duration: 120 },  // 7〜11秒:   選択肢登場
  engage:      { start: 330,  duration: 90  },  // 11〜14秒:  「コメントで予想して！」
  countdown:   { start: 420,  duration: 300 },  // 14〜24秒:  10秒カウントダウン
  reveal:      { start: 720,  duration: 120 },  // 24〜28秒:  答え発表
  explanation: { start: 840,  duration: 330 },  // 28〜39秒:  解説
  bonusFact:   { start: 1170, duration: 390 },  // 39〜52秒:  ボーナス豆知識
  cta:         { start: 1560, duration: 360 },  // 52〜64秒:  フォローCTA＋保存促進
};
```

**なぜ64秒か**: Creator Rewards Program（収益化）は1分以上の動画のみ対象。

---

## 🤖 クイズデータのフォーマット（`public/quiz-data.json`）

```json
{
  "question": "問題文",
  "choices": ["A選択肢", "B選択肢", "C選択肢", "D選択肢"],
  "correctIndex": 0,
  "explanation": "正解の解説文",
  "bonusFact": "追加の豆知識（ボーナス豆知識フェーズで表示）",
  "hook": "冒頭フックテキスト（例: 99%の人が間違える！）",
  "category": "🧠 心理",
  "difficulty": "ふつう",
  "bgColor": "#0f0a1e",
  "accentColor": "#a855f7"
}
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
- 動画の長さ **1分以上**（このシステムは64秒で対応済み ✅）

### 収益化ロードマップ
- **Phase 1（0〜3ヶ月）**: フォロワー1,000人 → 毎日投稿でアカウントの認知確立
- **Phase 2（3〜6ヶ月）**: フォロワー10,000人 + 月10万再生 → Creator Rewards Program申請
- **Phase 3（6ヶ月〜）**: 月収¥6,000〜¥12,000（10万再生）〜 ¥60,000〜¥120,000（100万再生）

---

## ⚠️ 注意事項

- TikTok APIのアクセストークンは有効期限があります（通常24時間〜30日）。定期的なリフレッシュが必要です。
- `PRIVACY_LEVEL` は最初 `SELF_ONLY`（非公開）に設定しています。動作確認後は `post-to-tiktok.mjs` で `PUBLIC_TO_EVERYONE` に変更してください。
- GitHub Actionsの無料枠：月2,000分まで。このワークフローは1回あたり約10〜15分なので、毎日実行しても月300〜450分程度で余裕があります。
- GitHub Actions の `dry_run` は **デフォルトで `true`**（テスト用）です。本番投稿時は手動実行画面で `false` に変更してください。
- 音声ファイル（`public/*.mp3`）はGitHubに含めてください。`.gitignore` では `*.mp3` を除外していません。
