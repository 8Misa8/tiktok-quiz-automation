/**
 * generate-quiz.mjs
 * Claude APIを使って「心理・人間関係」特化のTikTokクイズを自動生成するスクリプト
 * ニッチ戦略: 心理学×人間関係に絞ってアルゴリズムのレコメンドを最大化
 */

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ===== 心理・人間関係サブカテゴリ（7日ローテーション） =====
// 各サブカテゴリはTikTokでバズりやすい切り口に特化
const CATEGORIES = [
  {
    label: "🧠 行動心理",
    theme: "人が無意識にとる行動の心理学的理由",
    hookStyle: "「あなたも無意識にやってる」「実はこれ、心理学的に証明されてる」",
    exampleTopics: "返報性の法則、確証バイアス、バンドワゴン効果、吊り橋効果、ハロー効果",
  },
  {
    label: "💕 恋愛心理",
    theme: "恋愛・好意・引き寄せに関する心理学の事実",
    hookStyle: "「好きな人に試してみて」「これ知ってたら恋愛うまくいく」",
    exampleTopics: "好意のサイン、近接効果、単純接触効果、ミラーリング、承認欲求",
  },
  {
    label: "🤝 人間関係",
    theme: "人間関係・コミュニケーション・職場での心理テクニック",
    hookStyle: "「嫌いな人への対処法」「この一言で関係が変わる」",
    exampleTopics: "フット・イン・ザ・ドア、ドア・イン・ザ・フェイス、同調圧力、承認欲求",
  },
  {
    label: "🔮 性格診断",
    theme: "行動・癖・好みから分かる性格・心理の傾向",
    hookStyle: "「あなたのタイプが分かる」「この答えであなたの本音がバレる」",
    exampleTopics: "内向型・外向型、防衛機制、愛着スタイル、自己効力感、認知の歪み",
  },
  {
    label: "😤 感情の謎",
    theme: "喜怒哀楽・ストレス・モチベーションの心理メカニズム",
    hookStyle: "「なぜかイライラするのには理由がある」「この感情、実は〇〇のサイン」",
    exampleTopics: "怒りの2次感情、ストレスコーピング、内発的動機付け、幸福感の錯覚",
  },
  {
    label: "🧩 思考の罠",
    theme: "人間が陥りやすい認知バイアス・思考の錯誤",
    hookStyle: "「あなたも騙されてる」「頭いい人でも間違える心理トリック」",
    exampleTopics: "サンクコスト、フレーミング効果、アンカリング、後知恵バイアス、集団思考",
  },
  {
    label: "💬 言葉の心理",
    theme: "言葉・話し方・聞き方が相手に与える心理的影響",
    hookStyle: "「この言葉を使うと好かれる」「絶対に言ってはいけない一言」",
    exampleTopics: "ネガポジ変換、沈黙の効果、質問の仕方、クッション言葉、ラベリング",
  },
];

const DIFFICULTIES = ["かんたん", "ふつう", "むずかしい"];

// 統一カラースキーム（心理・人間関係テーマ）
// サブカテゴリごとに微妙に色を変えてブランド感を統一
const CATEGORY_COLORS = {
  "🧠 行動心理": { bg: "#0f0a1e", accent: "#a855f7" },  // 深紫
  "💕 恋愛心理": { bg: "#1a0a1a", accent: "#f472b6" },  // ピンク
  "🤝 人間関係": { bg: "#0a0f1e", accent: "#60a5fa" },  // ブルー
  "🔮 性格診断": { bg: "#0f1a1a", accent: "#34d399" },  // ティール
  "😤 感情の謎": { bg: "#1a0f0a", accent: "#fb923c" },  // オレンジ
  "🧩 思考の罠": { bg: "#0a1a0f", accent: "#a3e635" },  // ライム
  "💬 言葉の心理": { bg: "#1a1a0a", accent: "#facc15" }, // ゴールド
};

async function generateQuiz() {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // 今日の日付からサブカテゴリをローテーション
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000
  );
  const category = CATEGORIES[dayOfYear % CATEGORIES.length];
  const difficulty = DIFFICULTIES[dayOfYear % DIFFICULTIES.length];

  console.log(`📝 カテゴリ: ${category.label} / 難易度: ${difficulty}`);

  const prompt = `あなたはTikTok心理学クイズ専門のバイラルコンテンツクリエイターです。
「心理学・人間関係」に完全特化したTikTokアカウントの動画コンテンツを作成します。
ターゲット視聴者: 15〜35歳の日本人。特に「恋愛・人間関係に悩む人」「自己理解を深めたい人」。

今日のサブカテゴリ: ${category.label}
テーマ: ${category.theme}
フックスタイルの参考: ${category.hookStyle}
トピック例（参考）: ${category.exampleTopics}
難易度: ${difficulty}

【TikTokバズりのための絶対ルール】

1. hookテキスト（冒頭3秒 / 視聴者の指を止める一言）
   - 「実はこれ、○○のサインです」「あなたも無意識にやってる」「これ知らないと損」など
   - 自分ごと化できる表現にする（「あなた」「自分」を主語にする）
   - 20字以内・体言止めOK

2. 問題文（視聴者が「答えたい！」と思う質問）
   - 30字以内
   - 「なんで？」「え、本当に？」となる心理学の意外な事実を問う
   - 日常生活に直結するテーマ（恋愛・仕事・自分の性格など）
   - 「知ってたら自慢できる」ではなく「知って自分の行動が変わる」レベルの内容

3. 選択肢4つ
   - 正解1つ＋引っかけ3つ
   - 引っかけは「いかにも正しそう」な選択肢にする
   - コメントで「Aだと思ってた！」「Cじゃないの？」という議論が生まれるよう設計

4. 解説（explanation）
   - 60〜90字
   - 「なぜそうなるのか」の心理学的メカニズムを平易に説明
   - 専門用語には必ず（）で補足
   - 「これを知ると○○が変わる」という実用性を示す

5. ボーナス豆知識（bonusFact）
   - 90〜130字
   - 「これを知った上でどう活かすか」という実践的アドバイスを含める
   - 「保存して明日から使いたい」と思わせる内容
   - 例: 「この心理を使って〇〇するには…」「逆にこれを悪用する人がいるので注意」など

必ず以下のJSON形式のみで返答してください（マークダウン・コードブロック・余分な文字なし）:
{
  "hook": "冒頭フックテキスト（20字以内）",
  "question": "問題文（30字以内）",
  "choices": ["選択肢A", "選択肢B", "選択肢C", "選択肢D"],
  "correctIndex": 0,
  "explanation": "解説文（60〜90字）",
  "bonusFact": "ボーナス豆知識（90〜130字）",
  "category": "${category.label}",
  "difficulty": "${difficulty}"
}`;

  const message = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const responseText =
    message.content[0].type === "text" ? message.content[0].text : "";

  // JSONをパース
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("JSONが返されませんでした: " + responseText);
  }

  const quizData = JSON.parse(jsonMatch[0]);

  // カラースキームを追加
  const colors = CATEGORY_COLORS[category.label] || {
    bg: "#0f0a1e",
    accent: "#a855f7",
  };
  quizData.bgColor = colors.bg;
  quizData.accentColor = colors.accent;

  // 結果を保存
  const outputPath = join(__dirname, "../public/quiz-data.json");
  writeFileSync(outputPath, JSON.stringify(quizData, null, 2), "utf-8");

  console.log("✅ クイズ生成完了:");
  console.log(`   フック: ${quizData.hook}`);
  console.log(`   問題: ${quizData.question}`);
  console.log(`   正解: ${quizData.choices[quizData.correctIndex]}`);
  console.log(`   解説: ${quizData.explanation?.slice(0, 40)}...`);
  console.log(`   ボーナス豆知識: ${quizData.bonusFact?.slice(0, 40)}...`);
  console.log(`   保存先: ${outputPath}`);

  return quizData;
}

// 実行
generateQuiz().catch((err) => {
  console.error("❌ エラー:", err);
  process.exit(1);
});
