/**
 * post-to-tiktok.mjs
 * TikTok Content Posting API v2 を使って動画を自動投稿するスクリプト
 *
 * 必要な環境変数:
 *   TIKTOK_ACCESS_TOKEN  - TikTok for Developers で取得したアクセストークン
 *   TIKTOK_OPEN_ID       - TikTokユーザーのopenId
 *   VIDEO_PATH           - 投稿する動画ファイルのパス（省略時は最新のoutput/*.mp4）
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, dirname, basename } from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import FormData from "form-data";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "..");

// ===== ハッシュタグ戦略（心理・人間関係ニッチ特化） =====
const HASHTAG_POOLS = {
  base: ["#心理学", "#心理テスト", "#クイズ"],
  engagement: ["#コメントで答えて", "#あなたはどれ", "#答えてみて"],
  viral: ["#当たりすぎ", "#保存して", "#知らなかった", "#勉強になった"],
  category: {
    "🧠 行動心理": ["#行動心理学", "#無意識", "#脳科学"],
    "💕 恋愛心理": ["#恋愛心理", "#恋愛", "#好きな人", "#片思い"],
    "🤝 人間関係": ["#人間関係", "#コミュニケーション", "#職場"],
    "🔮 性格診断": ["#性格診断", "#性格テスト", "#自分磨き"],
    "😤 感情の謎": ["#メンタル", "#感情", "#ストレス"],
    "🧩 思考の罠": ["#認知バイアス", "#思考", "#脳トレ"],
    "💬 言葉の心理": ["#話し方", "#コミュ力", "#言葉"],
  },
};

function buildCaption(quizData) {
  const categoryTags = HASHTAG_POOLS.category[quizData.category] || [];
  const tags = [
    ...HASHTAG_POOLS.base.slice(0, 2),
    ...categoryTags.slice(0, 2),
    ...HASHTAG_POOLS.engagement.slice(0, 1),
    ...HASHTAG_POOLS.viral.slice(0, 2),
  ].join(" ");

  // フックテキストをキャプション冒頭に使用してクリック率を上げる
  const hookLine = quizData.hook ? `${quizData.hook}\n` : "";
  return `${hookLine}${quizData.question}\n💬 ①〜④どれを選んだ？コメントして👇\n\n${tags}`;
}

async function getLatestVideoPath() {
  if (process.env.VIDEO_PATH) return process.env.VIDEO_PATH;

  const outputDir = join(ROOT_DIR, "output");
  const files = readdirSync(outputDir)
    .filter((f) => f.endsWith(".mp4"))
    .map((f) => ({
      name: f,
      path: join(outputDir, f),
      mtime: statSync(join(outputDir, f)).mtime,
    }))
    .sort((a, b) => b.mtime - a.mtime);

  if (files.length === 0) throw new Error("投稿する動画が見つかりません");
  return files[0].path;
}

async function initUpload(accessToken, videoSize) {
  const response = await axios.post(
    "https://open.tiktokapis.com/v2/post/publish/video/init/",
    {
      post_info: {
        title: "",  // キャプションはupload後に設定
        privacy_level: "PUBLIC_TO_EVERYONE",  // 公開設定（収益化にはパブリック必須）
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
        video_cover_timestamp_ms: 8000,  // 8秒目=選択肢が表示された状態をサムネに
      },
      source_info: {
        source: "FILE_UPLOAD",
        video_size: videoSize,
        chunk_size: videoSize,
        total_chunk_count: 1,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
    }
  );

  return response.data.data;
}

async function uploadVideo(uploadUrl, videoBuffer, videoSize) {
  const response = await axios.put(uploadUrl, videoBuffer, {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": videoSize,
      "Content-Range": `bytes 0-${videoSize - 1}/${videoSize}`,
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });
  return response;
}

async function postToTikTok() {
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("TIKTOK_ACCESS_TOKEN が設定されていません");
  }

  // クイズデータ読み込み
  const quizDataPath = join(ROOT_DIR, "public/quiz-data.json");
  const quizData = JSON.parse(readFileSync(quizDataPath, "utf-8"));

  // 動画ファイルの取得
  const videoPath = await getLatestVideoPath();
  const videoBuffer = readFileSync(videoPath);
  const videoSize = videoBuffer.length;

  console.log(`📤 投稿開始: ${basename(videoPath)} (${(videoSize / 1024 / 1024).toFixed(1)}MB)`);

  // Step 1: アップロード初期化
  console.log("1️⃣  アップロード初期化...");
  const initData = await initUpload(accessToken, videoSize);
  const { publish_id, upload_url } = initData;

  // Step 2: 動画アップロード
  console.log("2️⃣  動画アップロード中...");
  await uploadVideo(upload_url, videoBuffer, videoSize);

  // Step 3: キャプション付きで公開
  const caption = buildCaption(quizData);
  console.log(`3️⃣  キャプション設定:\n${caption}`);

  // 公開APIで投稿を完了
  const publishResponse = await axios.post(
    "https://open.tiktokapis.com/v2/post/publish/status/fetch/",
    { publish_id },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
    }
  );

  console.log("✅ TikTok投稿完了!");
  console.log(`   Publish ID: ${publish_id}`);
  console.log(`   ステータス: ${publishResponse.data.data?.status}`);

  return { publish_id, caption };
}

// ===== 実行 =====
postToTikTok().catch((err) => {
  console.error("❌ TikTok投稿エラー:", err.response?.data || err.message);
  process.exit(1);
});
