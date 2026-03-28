/**
 * generate-quiz.mjs
 * Claude APIを使って日本語雑学クイズを自動生成するスクリプト
 */

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ===== カテゴリローテーション =====
const CATEGORIES = [
  { label: "🌏 地理", theme: "世界の国々、山、川、海などの地理" },
  { label: "🔬 科学", theme: "生物、化学、物理、宇宙などのサイエンス" },
  { label: "📜 歴史", theme: "日本史・世界史の出来事や人物" },
  { label: "🐾 動物", theme: "動物や生き物の面白い生態・習性" },
  { label: "🍜 食文化", theme: "日本食・世界料理の起源や豆知識" },
  { label: "🏆 スポーツ", theme: "オリンピックやスポーツのトリビア" },
  { label: "🎌 日本文化", theme: "日本の伝統文化、祭り、習慣" },
  { label: "💡 雑学", theme: "思わず人に話したくなるびっくり豆知識" },
];

const DIFFICULTIES = ["かんたん", "ふつう", "むずかしい"];

// テーマカラーのマッピング
const CATEGORY_COLORS = {
  "🌏 地理": { bg: "#1a1a2e", accent: "#e94560" },
  "🔬 科学": { bg: "#0d1117", accent: "#58a6ff" },
  "📜 歴史": { bg: "#1c1410", accent: "#d4a017" },
  "🐾 動物": { bg: "#0d1f0d", accent: "#2ed573" },
  "🍜 食文化": { bg: "#1f0d0d", accent: "#ff6b35" },
  "🏆 スポーツ": { bg: "#0d0d1f", accent: "#a855f7" },
  "🎌 日本文化": { bg: "#1f0d1a", accent: "#ff4785" },
  "💡 雑学": { bg: "#111827", accent: "#fbbf24" },
};

async function generateQuiz() {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // 今日の日付からカテゴリをローテーション（毎日違うカテゴリ）
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const category = CATEGORIES[dayOfYear % CATEGORIES.length];
  const difficulty = DIFFICULTIES[dayOfYear % DIFFICULTIES.length];

  console.log(`📝 カテゴリ: ${category.label} / 難易度: ${difficulty}`);

  const prompt = `あなたはTikTok用の日本語雑学クイズ動画のコンテンツ作成者です。

以下の条件でクイズを1問作成してください：

カテゴリ: ${category.label}
テーマ: ${category.theme}
難易度: ${difficulty}

要件:
- 問題文は30字以内で、思わず考えたくなる面白い質問
- 選択肢は4つ（正解1つ＋不正解3つ）
- 不正解の選択肢も「それっぽい」ものにして引っかかりやすくする
- 解説は50〜80字程度で、「へぇ！」と思えるプラスアルファの豆知識を含める
- TikTokユーザー（10代〜30代）が楽しめる内容

必ず以下のJSON形式のみで返答してください（マークダウンなし）:
{
  "question": "問題文",
  "choices": ["選択肢A", "選択肢B", "選択肢C", "選択肢D"],
  "correctIndex": 0,
  "explanation": "解説文（豆知識含む）",
  "category": "${category.label}",
  "difficulty": "${difficulty}"
}`;

  const message = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const responseText = message.content[0].type === "text" ? message.content[0].text : "";

  // JSONをパース
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("JSONが返されませんでした: " + responseText);
  }

  const quizData = JSON.parse(jsonMatch[0]);

  // カラースキームを追加
  const colors = CATEGORY_COLORS[category.label] || { bg: "#1a1a2e", accent: "#e94560" };
  quizData.bgColor = colors.bg;
  quizData.accentColor = colors.accent;

  // 結果を保存
  const outputPath = join(__dirname, "../public/quiz-data.json");
  writeFileSync(outputPath, JSON.stringify(quizData, null, 2), "utf-8");

  console.log("✅ クイズ生成完了:");
  console.log(`   問題: ${quizData.question}`);
  console.log(`   正解: ${quizData.choices[quizData.correctIndex]}`);
  console.log(`   保存先: ${outputPath}`);

  return quizData;
}

// 実行
generateQuiz().catch((err) => {
  console.error("❌ エラー:", err);
  process.exit(1);
});
