import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
  Audio,
  staticFile,
} from "remotion";
import { z } from "zod";

// ===== スキーマ定義 =====
export const QuizVideoSchema = z.object({
  question: z.string(),
  choices: z.array(z.string()).length(4),
  correctIndex: z.number().min(0).max(3),
  explanation: z.string(),
  category: z.string(),
  difficulty: z.string(),
  bgColor: z.string().default("#1a1a2e"),
  accentColor: z.string().default("#e94560"),
});

type QuizVideoProps = z.infer<typeof QuizVideoSchema>;

// ===== ユーティリティ =====
const COUNTDOWN_SECONDS = 5;
const FPS = 30;

// タイムライン（フレーム単位）
const TIMELINE = {
  intro: { start: 0, duration: 40 },          // 0〜1.3秒: イントロ
  question: { start: 40, duration: 60 },       // 1.3〜3.3秒: 問題表示
  choices: { start: 100, duration: 60 },       // 3.3〜5.3秒: 選択肢登場
  countdown: { start: 160, duration: 150 },    // 5.3〜10.3秒: カウントダウン
  reveal: { start: 310, duration: 60 },        // 10.3〜12.3秒: 答え発表
  explanation: { start: 370, duration: 80 },  // 12.3〜15秒: 解説
};

// ===== カウントダウンリング =====
const CountdownRing: React.FC<{ progress: number; accentColor: string }> = ({
  progress,
  accentColor,
}) => {
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <svg width="200" height="200" style={{ transform: "rotate(-90deg)" }}>
      {/* 背景リング */}
      <circle
        cx="100"
        cy="100"
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="10"
      />
      {/* プログレスリング */}
      <circle
        cx="100"
        cy="100"
        r={radius}
        fill="none"
        stroke={accentColor}
        strokeWidth="10"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
      />
    </svg>
  );
};

// ===== 選択肢ボタン =====
const ChoiceButton: React.FC<{
  label: string;
  text: string;
  isCorrect: boolean;
  revealed: boolean;
  enterDelay: number;
  accentColor: string;
}> = ({ label, text, isCorrect, revealed, enterDelay, accentColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterProgress = spring({
    frame: frame - enterDelay,
    fps,
    config: { damping: 12, stiffness: 200 },
  });

  const translateY = interpolate(enterProgress, [0, 1], [40, 0]);
  const opacity = interpolate(enterProgress, [0, 1], [0, 1]);

  const bgColor = revealed
    ? isCorrect
      ? "rgba(46, 213, 115, 0.9)"
      : "rgba(255, 71, 87, 0.5)"
    : "rgba(255,255,255,0.12)";

  const borderColor = revealed
    ? isCorrect
      ? "#2ed573"
      : "transparent"
    : "rgba(255,255,255,0.25)";

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        display: "flex",
        alignItems: "center",
        background: bgColor,
        border: `2px solid ${borderColor}`,
        borderRadius: 20,
        padding: "22px 28px",
        marginBottom: 16,
        transition: "background 0.3s",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: revealed && isCorrect ? "rgba(255,255,255,0.3)" : accentColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 20,
          flexShrink: 0,
          fontSize: 20,
          fontWeight: "bold",
          color: "#fff",
        }}
      >
        {revealed && isCorrect ? "✓" : label}
      </div>
      <span
        style={{
          fontSize: 34,
          color: "#fff",
          fontWeight: revealed && isCorrect ? "bold" : "normal",
          lineHeight: 1.3,
        }}
      >
        {text}
      </span>
    </div>
  );
};

// ===== メインコンポーネント =====
export const QuizVideo: React.FC<QuizVideoProps> = ({
  question,
  choices,
  correctIndex,
  explanation,
  category,
  difficulty,
  bgColor,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const isRevealed = frame >= TIMELINE.reveal.start;

  // ===== イントロアニメーション =====
  const introProgress = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 150 },
  });

  // ===== カウントダウン計算 =====
  const countdownFrame = frame - TIMELINE.countdown.start;
  const countdownProgress = Math.max(
    0,
    1 - countdownFrame / TIMELINE.countdown.duration
  );
  const countdownNumber = Math.ceil(countdownProgress * COUNTDOWN_SECONDS);

  // ===== 答え発表アニメーション =====
  const revealProgress = spring({
    frame: frame - TIMELINE.reveal.start,
    fps,
    config: { damping: 10, stiffness: 180 },
  });
  const revealScale = interpolate(revealProgress, [0, 1], [0.5, 1]);
  const revealOpacity = interpolate(revealProgress, [0, 1], [0, 1]);

  // ===== 解説フェードイン =====
  const explanationOpacity = interpolate(
    frame,
    [TIMELINE.explanation.start, TIMELINE.explanation.start + 20],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const choicesVisible = frame >= TIMELINE.choices.start;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${bgColor} 0%, #16213e 50%, #0f3460 100%)`,
        fontFamily: "'Noto Sans JP', 'Hiragino Sans', sans-serif",
        overflow: "hidden",
      }}
    >
      {/* 背景パターン */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `radial-gradient(circle at 20% 20%, rgba(233,69,96,0.1) 0%, transparent 50%),
                             radial-gradient(circle at 80% 80%, rgba(52,152,219,0.1) 0%, transparent 50%)`,
        }}
      />

      {/* ===== カテゴリ＆難易度バッジ ===== */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 16,
          opacity: interpolate(frame, [0, 20], [0, 1], {
            extrapolateRight: "clamp",
          }),
        }}
      >
        <div
          style={{
            background: accentColor,
            borderRadius: 50,
            padding: "10px 24px",
            fontSize: 26,
            color: "#fff",
            fontWeight: "bold",
          }}
        >
          {category}
        </div>
        <div
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: 50,
            padding: "10px 24px",
            fontSize: 26,
            color: "#fff",
          }}
        >
          難易度: {difficulty}
        </div>
      </div>

      {/* ===== 問題文 ===== */}
      <div
        style={{
          position: "absolute",
          top: 200,
          left: 60,
          right: 60,
          opacity: interpolate(frame, [TIMELINE.question.start, TIMELINE.question.start + 20], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          transform: `translateY(${interpolate(
            frame,
            [TIMELINE.question.start, TIMELINE.question.start + 20],
            [20, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          )}px)`,
        }}
      >
        <div
          style={{
            background: "rgba(255,255,255,0.08)",
            border: `1px solid rgba(255,255,255,0.15)`,
            borderRadius: 24,
            padding: "36px 40px",
          }}
        >
          <div
            style={{
              fontSize: 22,
              color: accentColor,
              fontWeight: "bold",
              marginBottom: 16,
              letterSpacing: 2,
            }}
          >
            Q U E S T I O N
          </div>
          <div
            style={{
              fontSize: 46,
              color: "#fff",
              fontWeight: "bold",
              lineHeight: 1.4,
            }}
          >
            {question}
          </div>
        </div>
      </div>

      {/* ===== 選択肢 ===== */}
      {choicesVisible && (
        <div
          style={{
            position: "absolute",
            top: 580,
            left: 60,
            right: 60,
          }}
        >
          {choices.map((choice, i) => (
            <ChoiceButton
              key={i}
              label={["A", "B", "C", "D"][i]}
              text={choice}
              isCorrect={i === correctIndex}
              revealed={isRevealed}
              enterDelay={i * 8}
              accentColor={accentColor}
            />
          ))}
        </div>
      )}

      {/* ===== カウントダウン ===== */}
      {frame >= TIMELINE.countdown.start && frame < TIMELINE.reveal.start && (
        <div
          style={{
            position: "absolute",
            bottom: 180,
            left: 0,
            right: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div style={{ position: "relative", width: 200, height: 200 }}>
            <CountdownRing progress={countdownProgress} accentColor={accentColor} />
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 72,
                fontWeight: "bold",
                color: "#fff",
              }}
            >
              {countdownNumber}
            </div>
          </div>
          <div
            style={{
              fontSize: 28,
              color: "rgba(255,255,255,0.6)",
              marginTop: 8,
              letterSpacing: 3,
            }}
          >
            考えてみよう！
          </div>
        </div>
      )}

      {/* ===== 答え発表バナー ===== */}
      {isRevealed && frame < TIMELINE.explanation.start && (
        <div
          style={{
            position: "absolute",
            bottom: 160,
            left: 60,
            right: 60,
            opacity: revealOpacity,
            transform: `scale(${revealScale})`,
          }}
        >
          <div
            style={{
              background: `linear-gradient(135deg, #2ed573, #1abc9c)`,
              borderRadius: 24,
              padding: "24px 36px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 28, color: "#fff", fontWeight: "bold" }}>
              ✅ 正解は...
            </div>
            <div style={{ fontSize: 52, color: "#fff", fontWeight: "bold", marginTop: 8 }}>
              {choices[correctIndex]}
            </div>
          </div>
        </div>
      )}

      {/* ===== 解説 ===== */}
      {frame >= TIMELINE.explanation.start && (
        <div
          style={{
            position: "absolute",
            bottom: 80,
            left: 60,
            right: 60,
            opacity: explanationOpacity,
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 24,
              padding: "28px 32px",
            }}
          >
            <div
              style={{
                fontSize: 24,
                color: accentColor,
                fontWeight: "bold",
                marginBottom: 12,
              }}
            >
              💡 豆知識
            </div>
            <div style={{ fontSize: 32, color: "#fff", lineHeight: 1.5 }}>
              {explanation}
            </div>
          </div>
        </div>
      )}

      {/* ===== フォロー促進 CTA ===== */}
      <div
        style={{
          position: "absolute",
          top: 40,
          right: 40,
          opacity: interpolate(frame, [durationInFrames - 30, durationInFrames - 10], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <div
          style={{
            background: accentColor,
            borderRadius: 50,
            padding: "12px 24px",
            fontSize: 24,
            color: "#fff",
            fontWeight: "bold",
          }}
        >
          👉 フォローで毎日クイズ！
        </div>
      </div>
    </AbsoluteFill>
  );
};
