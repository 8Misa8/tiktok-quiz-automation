import { Composition } from "remotion";
import { QuizVideo, QuizVideoSchema } from "./QuizVideo";

// 動画の基本設定（TikTok 9:16縦型）
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="QuizVideo"
        component={QuizVideo}
        durationInFrames={450}  // 15秒 @ 30fps
        fps={30}
        width={1080}
        height={1920}
        schema={QuizVideoSchema}
        defaultProps={{
          question: "日本で一番高い山は？",
          choices: ["富士山", "北岳", "奥穂高岳", "間ノ岳"],
          correctIndex: 0,
          explanation: "富士山は標高3,776mで日本最高峰！\n実は約10万年前に活動を始めた比較的新しい火山です。",
          category: "🌏 地理",
          difficulty: "かんたん",
          bgColor: "#1a1a2e",
          accentColor: "#e94560",
        }}
      />
    </>
  );
};
