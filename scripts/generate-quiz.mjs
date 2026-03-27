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
  { label: "🧠 心理", theme: "人間の心理・脳科学・行動パターンの面白い事実" },
  { label: "💡 雑学", theme: "思わず人に話したくなる日常のびっくり豆知識" },
  { label: "📜 歴史", theme: "日本史・世界史の意外な出来事や人物の裏側" },
  { label: "🔬 科学", theme: "生物、化学、物理、宇宙などの驚きのサイエンス" },
  { label: "🐾 動物", theme: "動物や生き物の誰も知らない面白い生態・習性" },
  { label: "🍜 食文化", theme: "日本食・世界料理の意外な起源や豆知識" },
  { label: "🌏 地理", theme: "世界の国々の意外な事実・日本の地理トリビア" },
  { label: "🎌 日本文化", theme: "日本の伝統文化・慣習・言葉の意外な由来" },
  { label: "🏥 健康・体", theme: "人間の体や健康に関する意外な事実" },
  { label: "💰 お金・経済", theme: "お金・ビジネス・経済にまつわる驚きの豆知識" },
];

const DIFFICULTIES = ["かんたん", "ふつう", "むずかしい"];

// テーマカラーのマッピング
const CATEGORY_COLORS = {
  "🧠 心理":       { bg: "#0f0a1e", accent: "#a855f7" },
  "💡 雑学":       { bg: "#111827", accent: "#fbbf24" },
  "📜 歴史":       { bg: "#1c1410", accent: "#d4a017" },
  "🔬 科学":       { bg: "#0d1117", accent: "#58a6ff" },
  "🐾 動物":       { bg: "#0d1f0d", accent: "#2ed573" },
  "🍜 食文化":     { bg: "#1f0d0d", accent: "#ff6b35" },
  "🌏 地理":       { bg: "#1a1a2e", accent: "#e94560" },
  "🎌 日本文化":   { bg: "#1f0d1a", accent: "#ff4785" },
  "🏥 健康・体":   { bg: "#0d1a1f", accent: "#00d2ff" },
  "💰 お金・経済": { bg: "#1a1a0d", accent: "#84cc16" },
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

  const prompt = `あなたはTikTokバズり専門の日本語雑学クイズ動画コンテンツ作成者です。
TikTokアルゴリズム対策として「視聴完了率」「保存数」「シェア数」を最大化するクイズを作成します。

カテゴリ: ${category.label}
テーマ: ${category.theme}
難易度: ${difficulty}

【作成ルール】
1. hookテキスト（冒頭3秒で視聴者を掴む煽り文句）
   - 「99%の人が間違える」「これ知ってたらすごい」「実は常識が嘘だった」など
   - 20字以内でインパクトのある文章

2. 問題文
   - 30字以内
   - 「え、そうなの？！」と思わせる意外性のある質問
   - 知っているようで知らない"常識の盲点"を突く

3. 選択肢4つ
   - 正解1つ＋ひっかけ3つ
   - 不正解も「確かにそれっぽい」と思える選択肢にして、コメント欄が盛り上がるようにする

4. 解説（explanation）
   - 60〜100字程度
   - 「なぜそうなのか」の理由を面白く説明
   - 「へえ！」と言いたくなる情報

5. ボーナス豆知識（bonusFact）
   - 80〜120字程度
   - 解説に続く「さらに深い」知識
   - 「これは保存しておきたい」「友達に話したい」情報
   - 日常生活に使えるか、誰かに話したくなる内容にする

必ず以下のJSON形式のみで返答してください（マークダウン・コードブロックなし）:
{
  "hook": "冒頭フックテキスト（20字以内）",
  "question": "問題文（30字以内）",
  "choices": ["選択肢A", "選択肢B", "選択肢C", "選択肢D"],
  "correctIndex": 0,
  "explanation": "解説文（60〜100字）",
  "bonusFact": "ボーナス豆知識（80〜120字）",
  "category": "${category.label}",
  "difficulty": "${difficulty}"
}`;

  const message = await client.messages.create({
    model: "claude-opus-4-6",
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
  console.log(`   フック: ${quizData.hook}`);
  console.log(`   問題: ${quizData.question}`);
  console.log(`   正解: ${quizData.choices[quizData.correctIndex]}`);
  console.log(`   ボーナス豆知識: ${quizData.bonusFact?.slice(0, 30)}...`);
  console.log(`   保存先: ${outputPath}`);

  return quizData;
}

// 実行
generateQuiz().catch((err) => {
  console.error("❌ エラー:", err);
  process.exit(1);
});
