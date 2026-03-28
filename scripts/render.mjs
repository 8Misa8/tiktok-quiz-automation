/**
 * render.mjs
 * Remotionを使ってクイズ動画をレンダリングするスクリプト
 */

import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { readFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "..");

async function render() {
  console.log("🎬 動画レンダリング開始...");

  // クイズデータの読み込み
  const quizDataPath = join(ROOT_DIR, "public/quiz-data.json");
  if (!existsSync(quizDataPath)) {
    throw new Error(`クイズデータが見つかりません: ${quizDataPath}`);
  }
  const quizData = JSON.parse(readFileSync(quizDataPath, "utf-8"));
  console.log(`📋 問題: ${quizData.question}`);

  // 出力ディレクトリ作成
  const outputDir = join(ROOT_DIR, "output");
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // 日付ベースのファイル名
  const dateStr = new Date().toISOString().split("T")[0];
  const outputPath = join(outputDir, `quiz-${dateStr}.mp4`);

  // Remotionバンドルの作成
  console.log("📦 バンドル作成中...");
  const bundleLocation = await bundle({
    entryPoint: join(ROOT_DIR, "src/index.ts"),
    webpackOverride: (config) => config,
  });

  // コンポジションの選択
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "QuizVideo",
    inputProps: quizData,
  });

  // 動画レンダリング
  console.log("🎞️ レンダリング中...");
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation: outputPath,
    inputProps: quizData,
    fps: 30,
    onProgress: ({ progress }) => {
      process.stdout.write(`\r   進捗: ${Math.round(progress * 100)}%`);
    },
  });

  console.log(`\n✅ レンダリング完了: ${outputPath}`);

  // 出力パスを環境変数として書き出し（GitHub Actions用）
  if (process.env.GITHUB_OUTPUT) {
    const { appendFileSync } = await import("fs");
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `video_path=${outputPath}\nvideo_date=${dateStr}\n`
    );
  }

  return outputPath;
}

render().catch((err) => {
  console.error("❌ レンダリングエラー:", err);
  process.exit(1);
});
