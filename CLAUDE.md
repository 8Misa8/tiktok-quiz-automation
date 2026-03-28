tiktokで収益化出来るようにサポートしてください。

---

## システム概要

Claude API + Remotion + GitHub Actions で毎日自動的にTikTokクイズ動画を生成・投稿するシステム。

- **動画仕様**: 64秒 / 1920フレーム @ 30fps / 縦型 9:16 / 1080x1920px
- **パイプライン**: `generate-quiz.mjs` → `render.mjs` → `post-to-tiktok.mjs`
- **自動実行**: GitHub Actions（毎日20:00 JST、タイムアウト60分）

---

## 重要な運用メモ

### Git Push について
**ClaudeからGitHub pushができる方法が判明しました（2026-03-28確認）。**

`github.com` へのHTTPS pushはLinux VMから可能。ただし `.git` ディレクトリへの直接書き込み（`git add`）はWindowsマウントの権限制限で失敗するため、`/tmp` にクローンして操作する。

```bash
TOKEN="※GitHubのPersonal Access Tokenをここに入力（Settings→Developer settings→PAT）"
REPO_URL="https://$TOKEN@github.com/8Misa8/tiktok-quiz-automation.git"
MOUNT="/sessions/gifted-upbeat-ramanujan/mnt/tiktok-quiz-automation"

# /tmpにクローン
git clone "$REPO_URL" /tmp/tiktok-repo

# 変更ファイルをコピー（必要なファイルを個別にコピー）
cp "$MOUNT/変更ファイル" /tmp/tiktok-repo/対象パス

# コミット＆プッシュ
cd /tmp/tiktok-repo
git config user.email "misa.maeda.biz@gmail.com"
git config user.name "Misa"
git add .
git commit -m "コミットメッセージ"
git push origin main

# 終わったら後片付け
rm -rf /tmp/tiktok-repo
```

**ユーザーが「pushしてください」と言ったら、上記の手順でClaudeが代行する。**

### Gitロックファイルのエラーが出た場合
`/tmp/tiktok-repo` を使う方法ではロックは発生しない。
万一Windowsからgit操作した後にロックが残った場合：
```
del C:\Users\still\OneDrive\Claude\tiktok-quiz-automation\.git\index.lock
```

### GitHub Actions ワークフロートリガー
Chrome経由でGitHubにアクセスし、Actionsタブから手動トリガーできる。
- 毎日の自動動画生成: `daily-video.yml`（毎日20:00 JST自動実行）
- 7本まとめ生成: `generate-7-videos.yml`（手動トリガーのみ）

### ANTHROPIC_API_KEY の形式
GitHub Secretsに設定するときは `sk-ant-...` の生の値のみ。引用符・改行・スペースを含めるとHTTPヘッダーエラーが出る。

---

## ファイル構成と役割

| ファイル | 役割 |
|---------|------|
| `scripts/generate-quiz.mjs` | Claude APIでクイズ生成 → `public/quiz-data.json` に保存 |
| `scripts/render.mjs` | Remotionで動画レンダリング → `output/quiz-YYYY-MM-DD.mp4` |
| `scripts/post-to-tiktok.mjs` | TikTok APIで動画投稿 |
| `scripts/pipeline.mjs` | 上記3ステップを一括実行（DRY_RUN=trueで投稿スキップ） |
| `src/QuizVideo.tsx` | 9フェーズのアニメーション動画コンポーネント（紙吹雪・プログレスバー・タイプライター効果実装済み） |
| `public/*.mp3` | 音声アセット（GitHubに含める。.gitignoreで除外しない） |
| `.github/workflows/daily-video.yml` | GitHub Actions設定（dry_runデフォルトはtrue） |

---

## クイズデータのスキーマ

```typescript
{
  question: string,      // 問題文
  choices: string[4],   // 選択肢A〜D
  correctIndex: 0-3,    // 正解インデックス
  explanation: string,  // 正解の解説
  bonusFact: string,    // 追加豆知識（39〜52秒フェーズ）
  hook: string,         // 冒頭フック（例: 「99%の人が間違える！」）
  category: string,     // カテゴリ名（絵文字付き）
  difficulty: string,   // かんたん/ふつう/むずかしい
  bgColor: string,      // 背景色（カテゴリ別）
  accentColor: string,  // アクセントカラー（カテゴリ別）
}
```

---

## コンテンツ戦略：心理・人間関係ニッチに特化

**ニッチ選定理由**: TikTokアルゴリズムは専門性の高いアカウントを優遇する。10カテゴリの雑多な雑学から「心理・人間関係」に絞ることで、ターゲット視聴者のリピート率・フォロー率を最大化する。

### サブカテゴリ（7日ローテーション）

| カテゴリ | テーマ | アクセントカラー |
|---------|--------|----------------|
| 🧠 行動心理 | 無意識の行動の心理学的理由 | #a855f7（紫） |
| 💕 恋愛心理 | 好意・引き寄せの心理学 | #f472b6（ピンク） |
| 🤝 人間関係 | コミュニケーション・職場心理 | #60a5fa（青） |
| 🔮 性格診断 | 行動・癖から分かる性格傾向 | #34d399（ティール） |
| 😤 感情の謎 | 喜怒哀楽・ストレスのメカニズム | #fb923c（オレンジ） |
| 🧩 思考の罠 | 認知バイアス・思考の錯誤 | #a3e635（ライム） |
| 💬 言葉の心理 | 言葉・話し方の心理的影響 | #facc15（ゴールド） |

### ターゲット視聴者
15〜35歳の日本人。特に「恋愛・人間関係に悩む人」「自己理解を深めたい人」。

### コンテンツ設計の原則
- **自分ごと化**: 「あなた」「自分」を主語にしたフックで視聴者を引き込む
- **実践的**: 「知って終わり」ではなく「明日から使える」内容にする
- **保存促進**: ボーナス豆知識に日常生活での活かし方を必ず含める
- **コメント誘発**: 引っかけ選択肢で「Aだと思った！」という議論を生む

---

## TikTok収益化のポイント

- Creator Rewards Programは**1分以上の動画**が対象（このシステムは64秒で対応済み）
- 収益化申請条件: フォロワー10,000人 + 過去30日で100,000再生
- アルゴリズムで重要な指標: 視聴完了率（70%以上が目標）、保存数、コメント数
- 投稿時間のベスト: 朝7-9時、昼12-13時、夜20-22時（JST）
- ハッシュタグ必須: #心理学 #人間関係 #恋愛心理 #行動心理学 #メンタル #クイズ #豆知識

詳細な戦略は `TikTok戦略計画書.md` を参照。

---

## よくあるエラーと対処法

| エラー | 原因 | 対処 |
|-------|------|------|
| `*** is not a legal HTTP header value` | ANTHROPIC_API_KEY に引用符や改行が含まれている | GitHubのSecretsで値を再設定（生の文字列のみ） |
| `public/bgm.mp3: 404` | mp3ファイルがGitHubにpushされていない | `.gitignore`の`*.mp3`行を確認し、`git add public/*.mp3 && git push` |
| `crf and videoBitrate can not both be set` | render.mjsにcrf設定が残っている | `render.mjs`から`crf: 18`の行を削除 |
| `Unable to create '.git/index.lock'` | 前回のgit操作が中断されロックファイルが残っている | Windowsターミナルで`.lock`ファイルを削除 |
