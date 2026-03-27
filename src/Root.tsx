import { Composition } from "remotion";
import { QuizVideo, QuizVideoSchema } from "./QuizVideo";

// 動画の基本設定（TikTok 9:16縦型）
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="QuizVideo"
        component={QuizVideo}
        durationInFrames={1920}  // 64秒 @ 30fps（Creator Rewards Program対応: 1分以上必須）
        fps={30}
        width={1080}
        height={1920}
        schema={QuizVideoSchema}
        defaultProps={{
          question: "日本で一番高い山は？",
          choices: ["富士山", "北岳", "奥穂高岳", "間ノ岳"],
          correctIndex: 0,
          explanation: "富士山は標高3,776mで日本最高峰！\n実は約10万年前に活動を始めた比較的新しい火山です。",
          bonusFact: "富士山の頂上は宗教上の理由から私有地になっており、山梨県と静岡県のどちらにも属していません！",
          hook: "99%の人が間違える日本の常識クイズ！",
          category: "🌏 地理",
          difficulty: "かんたん",
          bgColor: "#1a1a2e",
          accentColor: "#e94560",
        }}
      />
    </>
  );
};
