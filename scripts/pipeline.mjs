/**
 * pipeline.mjs
 * 全ステップを一括実行するパイプラインスクリプト
 * GitHub Actions から呼ばれる、またはローカルでテスト実行する
 */

import { execSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "..");

function run(command, label) {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`▶ ${label}`);
  console.log("=".repeat(50));
  execSync(command, { stdio: "inherit", cwd: ROOT_DIR });
}

async function main() {
  const startTime = Date.now();
  console.log("🚀 TikTokクイズ動画パイプライン開始");
  console.log(`📅 実行日時: ${new Date().toLocaleString("ja-JP")}`);

  try {
    // Step 1: クイズ生成
    run("node scripts/generate-quiz.mjs", "STEP 1: Claude APIでクイズ生成");

    // Step 2: 動画レンダリング
    run("node scripts/render.mjs", "STEP 2: Remotionで動画レンダリング");

    // Step 3: TikTok投稿（DRY_RUNモードの場合はスキップ）
    if (process.env.DRY_RUN === "true") {
      console.log("\n⏭️  DRY_RUNモード: TikTok投稿をスキップ");
    } else {
      run("node scripts/post-to-tiktok.mjs", "STEP 3: TikTokへ自動投稿");
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n🎉 パイプライン完了！ (${elapsed}秒)`);
  } catch (err) {
    console.error("\n❌ パイプラインエラー:", err.message);
    process.exit(1);
  }
}

main();
