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
  bonusFact: z.string().optional().default(""),
  hook: z.string().optional().default(""),
  category: z.string(),
  difficulty: z.string(),
  bgColor: z.string().default("#1a1a2e"),
  accentColor: z.string().default("#e94560"),
});

type QuizVideoProps = z.infer<typeof QuizVideoSchema>;

// ===== タイムライン（64秒 / 1920フレーム @ 30fps） =====
// Creator Rewards Program対応: 1分以上の動画が収益化対象
const TIMELINE = {
  hook:        { start: 0,    duration: 90  },  // 0〜3秒:    フック「99%の人が間違える！」
  question:    { start: 90,   duration: 120 },  // 3〜7秒:    問題文フェードイン
  choices:     { start: 210,  duration: 120 },  // 7〜11秒:   選択肢登場
  engage:      { start: 330,  duration: 90  },  // 11〜14秒:  「コメントで予想して！」
  countdown:   { start: 420,  duration: 300 },  // 14〜24秒:  10秒カウントダウン
  reveal:      { start: 720,  duration: 120 },  // 24〜28秒:  答え発表
  explanation: { start: 840,  duration: 330 },  // 28〜39秒:  解説（豆知識）
  bonusFact:   { start: 1170, duration: 390 },  // 39〜52秒:  ボーナス豆知識
  cta:         { start: 1560, duration: 360 },  // 52〜64秒:  フォローCTA＋保存促進
};

const COUNTDOWN_SECONDS = 10;

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
      <circle
        cx="100" cy="100" r={radius}
        fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="10"
      />
      <circle
        cx="100" cy="100" r={radius}
        fill="none" stroke={accentColor} strokeWidth="10"
        strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
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
    ? isCorrect ? "rgba(46, 213, 115, 0.9)" : "rgba(255, 71, 87, 0.5)"
    : "rgba(255,255,255,0.12)";

  const borderColor = revealed
    ? isCorrect ? "#2ed573" : "transparent"
    : "rgba(255,255,255,0.25)";

  return (
    <div style={{
      opacity,
      transform: `translateY(${translateY}px)`,
      display: "flex",
      alignItems: "center",
      background: bgColor,
      border: `2px solid ${borderColor}`,
      borderRadius: 20,
      padding: "20px 28px",
      marginBottom: 14,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: "50%",
        background: revealed && isCorrect ? "rgba(255,255,255,0.3)" : accentColor,
        display: "flex", alignItems: "center", justifyContent: "center",
        marginRight: 20, flexShrink: 0, fontSize: 20, fontWeight: "bold", color: "#fff",
      }}>
        {revealed && isCorrect ? "✓" : label}
      </div>
      <span style={{
        fontSize: 32, color: "#fff",
        fontWeight: revealed && isCorrect ? "bold" : "normal",
        lineHeight: 1.3,
      }}>
        {text}
      </span>
    </div>
  );
};

// ===== フラッシュ演出（答え発表時） =====
const RevealFlash: React.FC<{ accentColor: string }> = ({ accentColor }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 8, 20], [0.6, 0.3, 0], {
    extrapolateRight: "clamp",
  });
  return (
    <div style={{
      position: "absolute", inset: 0,
      background: accentColor,
      opacity,
      pointerEvents: "none",
    }} />
  );
};

// ===== 紙吹雪パーティクル（正解発表時） =====
const Confetti: React.FC = () => {
  const frame = useCurrentFrame();
  const COLORS = ["#fbbf24", "#2ed573", "#74b9ff", "#fd79a8", "#a29bfe", "#ff7675"];
  const particles = Array.from({ length: 24 }, (_, i) => {
    const seed = (i * 137.5) % 360;
    const x = (i / 24) * 100;
    const delay = (i % 6) * 3;
    const progress = Math.max(0, frame - delay) / 60;
    const y = interpolate(progress, [0, 1], [-10, 120], { extrapolateRight: "clamp" });
    const rotation = seed + frame * (i % 2 === 0 ? 3 : -3);
    const opacity = interpolate(progress, [0, 0.1, 0.8, 1], [0, 1, 1, 0], { extrapolateRight: "clamp" });
    const size = 8 + (i % 3) * 6;
    return { x, y, rotation, opacity, color: COLORS[i % COLORS.length], size };
  });

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {particles.map((p, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${p.x}%`,
          top: `${p.y}%`,
          width: p.size,
          height: p.size,
          background: p.color,
          opacity: p.opacity,
          transform: `rotate(${p.rotation}deg)`,
          borderRadius: i % 3 === 0 ? "50%" : 2,
        }} />
      ))}
    </div>
  );
};

// ===== プログレスバー（動画全体の進行状況） =====
const ProgressBar: React.FC<{ accentColor: string }> = ({ accentColor }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = frame / durationInFrames;
  return (
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0, height: 6, zIndex: 100,
      background: "rgba(255,255,255,0.15)",
    }}>
      <div style={{
        height: "100%",
        width: `${progress * 100}%`,
        background: `linear-gradient(90deg, ${accentColor}, #fbbf24)`,
        borderRadius: "0 4px 4px 0",
        boxShadow: `0 0 8px ${accentColor}`,
        transition: "width 0.1s linear",
      }} />
    </div>
  );
};

// ===== タイプライター効果 =====
const TypewriterText: React.FC<{
  text: string;
  startFrame: number;
  charsPerFrame?: number;
  style?: React.CSSProperties;
}> = ({ text, startFrame, charsPerFrame = 0.8, style }) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - startFrame);
  const charsToShow = Math.min(text.length, Math.floor(elapsed * charsPerFrame));
  const displayText = text.slice(0, charsToShow);
  const showCursor = charsToShow < text.length;
  return (
    <span style={style}>
      {displayText}
      {showCursor && (
        <span style={{
          opacity: Math.floor(elapsed / 8) % 2 === 0 ? 1 : 0,
          borderRight: "3px solid #fff",
          marginLeft: 2,
        }}>
          &#8203;
        </span>
      )}
    </span>
  );
};

// ===== メインコンポーネント =====
export const QuizVideo: React.FC<QuizVideoProps> = ({
  question, choices, correctIndex, explanation,
  bonusFact = "", hook = "",
  category, difficulty, bgColor, accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const isRevealed = frame >= TIMELINE.reveal.start;
  const showChoices = frame >= TIMELINE.choices.start;

  // ===== カウントダウン計算 =====
  const countdownFrame = frame - TIMELINE.countdown.start;
  const countdownProgress = Math.max(0, 1 - countdownFrame / TIMELINE.countdown.duration);
  const countdownNumber = Math.ceil(countdownProgress * COUNTDOWN_SECONDS);

  // ===== 答え発表アニメーション =====
  const revealProgress = spring({
    frame: frame - TIMELINE.reveal.start,
    fps,
    config: { damping: 10, stiffness: 180 },
  });
  const revealScale = interpolate(revealProgress, [0, 1], [0.5, 1]);
  const revealOpacity = interpolate(revealProgress, [0, 1], [0, 1]);

  // ===== フック（冒頭）アニメーション =====
  const hookScale = spring({
    frame,
    fps,
    config: { damping: 8, stiffness: 120 },
  });
  const hookOpacity = interpolate(
    frame,
    [0, 10, TIMELINE.hook.duration - 20, TIMELINE.hook.duration],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // ===== 解説フェードイン =====
  const explanationOpacity = interpolate(
    frame,
    [TIMELINE.explanation.start, TIMELINE.explanation.start + 25],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // ===== ボーナス豆知識フェードイン =====
  const bonusOpacity = interpolate(
    frame,
    [TIMELINE.bonusFact.start, TIMELINE.bonusFact.start + 25],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // ===== CTA アニメーション =====
  const ctaProgress = spring({
    frame: frame - TIMELINE.cta.start,
    fps,
    config: { damping: 12, stiffness: 150 },
  });
  const ctaTranslateY = interpolate(ctaProgress, [0, 1], [60, 0]);
  const ctaOpacity = interpolate(ctaProgress, [0, 1], [0, 1]);

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(135deg, ${bgColor} 0%, #16213e 50%, #0f3460 100%)`,
      fontFamily: "'Noto Sans JP', 'Hiragino Sans', sans-serif",
      overflow: "hidden",
    }}>
      {/* プログレスバー（常時表示） */}
      <ProgressBar accentColor={accentColor} />

      {/* 背景グラデーション */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `radial-gradient(circle at 20% 20%, rgba(233,69,96,0.1) 0%, transparent 50%),
                           radial-gradient(circle at 80% 80%, rgba(52,152,219,0.1) 0%, transparent 50%)`,
      }} />

      {/* ===== PHASE 1: フック（0〜3秒） ===== */}
      {frame < TIMELINE.question.start && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          opacity: hookOpacity,
        }}>
          {/* アテンション帯 */}
          <div style={{
            background: accentColor,
            width: "100%",
            padding: "30px 0",
            marginBottom: 40,
            transform: `scale(${interpolate(hookScale, [0, 1], [0.8, 1])})`,
            textAlign: "center",
          }}>
            <div style={{
              fontSize: 38, fontWeight: "bold", color: "#fff",
              letterSpacing: 2,
            }}>
              🚨 あなたは答えられる？
            </div>
          </div>

          {/* フックテキスト */}
          <div style={{
            fontSize: 56, fontWeight: "bold", color: "#fff",
            textAlign: "center", padding: "0 60px",
            lineHeight: 1.35,
            textShadow: `0 0 30px ${accentColor}`,
            transform: `scale(${interpolate(hookScale, [0, 1], [0.7, 1])})`,
          }}>
            {hook || "99%の人が間違える\nクイズに挑戦！"}
          </div>

          <div style={{
            marginTop: 50,
            fontSize: 36, color: "rgba(255,255,255,0.7)",
            animation: "pulse 1s infinite",
          }}>
            ▼ スクロールしないで！
          </div>
        </div>
      )}

      {/* ===== PHASE 2〜 カテゴリ・難易度バッジ（常時表示） ===== */}
      {frame >= TIMELINE.question.start && (
        <div style={{
          position: "absolute", top: 70, left: 0, right: 0,
          display: "flex", justifyContent: "center", gap: 16,
          opacity: interpolate(frame, [TIMELINE.question.start, TIMELINE.question.start + 20], [0, 1], {
            extrapolateRight: "clamp",
          }),
        }}>
          <div style={{
            background: accentColor, borderRadius: 50,
            padding: "10px 24px", fontSize: 26, color: "#fff", fontWeight: "bold",
          }}>
            {category}
          </div>
          <div style={{
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: 50, padding: "10px 24px", fontSize: 26, color: "#fff",
          }}>
            難易度: {difficulty}
          </div>
        </div>
      )}

      {/* ===== PHASE 2: 問題文（3〜7秒） ===== */}
      {frame >= TIMELINE.question.start && (
        <div style={{
          position: "absolute", top: 190, left: 60, right: 60,
          opacity: interpolate(frame, [TIMELINE.question.start, TIMELINE.question.start + 25], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          }),
          transform: `translateY(${interpolate(
            frame,
            [TIMELINE.question.start, TIMELINE.question.start + 25],
            [30, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          )}px)`,
        }}>
          <div style={{
            background: "rgba(255,255,255,0.08)",
            border: `1px solid rgba(255,255,255,0.15)`,
            borderRadius: 24, padding: "36px 40px",
          }}>
            <div style={{
              fontSize: 22, color: accentColor, fontWeight: "bold",
              marginBottom: 16, letterSpacing: 2,
            }}>
              Q U E S T I O N
            </div>
            <div style={{ fontSize: 44, color: "#fff", fontWeight: "bold", lineHeight: 1.45 }}>
              <TypewriterText
                text={question}
                startFrame={TIMELINE.question.start + 10}
                charsPerFrame={0.9}
              />
            </div>
          </div>
        </div>
      )}

      {/* ===== PHASE 3: 選択肢（7〜11秒） ===== */}
      {showChoices && (
        <div style={{ position: "absolute", top: 560, left: 60, right: 60 }}>
          {choices.map((choice, i) => (
            <ChoiceButton
              key={i}
              label={["A", "B", "C", "D"][i]}
              text={choice}
              isCorrect={i === correctIndex}
              revealed={isRevealed}
              enterDelay={TIMELINE.choices.start + i * 10}
              accentColor={accentColor}
            />
          ))}
        </div>
      )}

      {/* ===== PHASE 4: エンゲージCTA（11〜14秒） ===== */}
      {frame >= TIMELINE.engage.start && frame < TIMELINE.countdown.start && (
        <div style={{
          position: "absolute", bottom: 120, left: 60, right: 60,
          opacity: interpolate(frame, [TIMELINE.engage.start, TIMELINE.engage.start + 20], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          }),
        }}>
          <div style={{
            background: "rgba(255,255,255,0.12)",
            border: `2px solid ${accentColor}`,
            borderRadius: 20, padding: "22px 32px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 32, color: "#fff", fontWeight: "bold" }}>
              💬 答えをコメントで予想して！
            </div>
            <div style={{ fontSize: 24, color: "rgba(255,255,255,0.6)", marginTop: 8 }}>
              全問正解できたらフォローして！
            </div>
          </div>
        </div>
      )}

      {/* ===== PHASE 5: カウントダウン（14〜24秒） ===== */}
      {frame >= TIMELINE.countdown.start && frame < TIMELINE.reveal.start && (
        <div style={{
          position: "absolute", bottom: 100, left: 0, right: 0,
          display: "flex", flexDirection: "column", alignItems: "center",
        }}>
          <div style={{ position: "relative", width: 200, height: 200 }}>
            <CountdownRing progress={countdownProgress} accentColor={accentColor} />
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 72, fontWeight: "bold", color: "#fff",
            }}>
              {countdownNumber}
            </div>
          </div>
          <div style={{
            fontSize: 28, color: "rgba(255,255,255,0.6)",
            marginTop: 8, letterSpacing: 3,
          }}>
            考えてみよう！
          </div>
        </div>
      )}

      {/* ===== PHASE 6: 答え発表（24〜28秒） ===== */}
      {isRevealed && frame < TIMELINE.explanation.start && (
        <>
          <Sequence from={0} durationInFrames={20}>
            <RevealFlash accentColor={accentColor} />
          </Sequence>
          {/* 紙吹雪 */}
          <Sequence from={0} durationInFrames={TIMELINE.reveal.duration}>
            <Confetti />
          </Sequence>
          <div style={{
            position: "absolute", bottom: 100, left: 60, right: 60,
            opacity: revealOpacity,
            transform: `scale(${revealScale})`,
          }}>
            {/* 正解ラベル（点滅） */}
            <div style={{
              textAlign: "center", marginBottom: 16,
              opacity: Math.floor((frame - TIMELINE.reveal.start) / 6) % 2 === 0 ? 1 : 0.5,
            }}>
              <span style={{
                fontSize: 40, fontWeight: "bold", color: "#fbbf24",
                textShadow: "0 0 20px #fbbf24, 0 0 40px #fbbf24",
                letterSpacing: 4,
              }}>
                🎉 正 解 発 表 🎉
              </span>
            </div>
            <div style={{
              background: `linear-gradient(135deg, #2ed573, #1abc9c)`,
              borderRadius: 24, padding: "28px 36px", textAlign: "center",
              boxShadow: "0 0 40px rgba(46,213,115,0.6)",
            }}>
              <div style={{ fontSize: 30, color: "#fff", fontWeight: "bold" }}>
                ✅ 正解は...
              </div>
              <div style={{ fontSize: 52, color: "#fff", fontWeight: "bold", marginTop: 10,
                textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
                {choices[correctIndex]}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ===== PHASE 7: 解説（28〜39秒） ===== */}
      {frame >= TIMELINE.explanation.start && frame < TIMELINE.bonusFact.start && (
        <div style={{
          position: "absolute", bottom: 80, left: 60, right: 60,
          opacity: explanationOpacity,
        }}>
          {/* 正解継続表示（小さめ） */}
          <div style={{
            background: "rgba(46,213,115,0.2)", border: "1px solid #2ed573",
            borderRadius: 16, padding: "14px 24px", marginBottom: 16,
            textAlign: "center",
          }}>
            <span style={{ fontSize: 26, color: "#2ed573", fontWeight: "bold" }}>
              ✅ 正解：{choices[correctIndex]}
            </span>
          </div>
          <div style={{
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 24, padding: "28px 32px",
          }}>
            <div style={{
              fontSize: 26, color: accentColor, fontWeight: "bold", marginBottom: 12,
            }}>
              💡 解説
            </div>
            <div style={{ fontSize: 34, color: "#fff", lineHeight: 1.55 }}>
              {explanation}
            </div>
          </div>
        </div>
      )}

      {/* ===== PHASE 8: ボーナス豆知識（39〜52秒） ===== */}
      {frame >= TIMELINE.bonusFact.start && frame < TIMELINE.cta.start && bonusFact && (
        <div style={{
          position: "absolute", bottom: 80, left: 60, right: 60,
          opacity: bonusOpacity,
        }}>
          <div style={{
            background: `linear-gradient(135deg, rgba(233,69,96,0.2), rgba(52,152,219,0.2))`,
            border: `1px solid ${accentColor}`,
            borderRadius: 24, padding: "32px 36px",
          }}>
            <div style={{
              fontSize: 28, color: "#fbbf24", fontWeight: "bold", marginBottom: 16,
            }}>
              🌟 さらに深掘り！ボーナス豆知識
            </div>
            <div style={{ fontSize: 32, color: "#fff", lineHeight: 1.55 }}>
              {bonusFact}
            </div>
            <div style={{
              marginTop: 20, fontSize: 26, color: "rgba(255,255,255,0.6)",
            }}>
              📌 保存してあとで見返そう！
            </div>
          </div>
        </div>
      )}

      {/* ===== PHASE 9: フォローCTA（52〜64秒） ===== */}
      {frame >= TIMELINE.cta.start && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          opacity: ctaOpacity,
          transform: `translateY(${ctaTranslateY}px)`,
        }}>
          <div style={{
            background: accentColor,
            borderRadius: 30, padding: "36px 60px",
            textAlign: "center", marginBottom: 30, width: "80%",
          }}>
            <div style={{ fontSize: 44, color: "#fff", fontWeight: "bold" }}>
              👉 フォローで
            </div>
            <div style={{ fontSize: 52, color: "#fff", fontWeight: "bold" }}>
              毎日クイズ！
            </div>
          </div>

          <div style={{
            background: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: 24, padding: "26px 48px",
            textAlign: "center", width: "80%", marginBottom: 24,
          }}>
            <div style={{ fontSize: 34, color: "#fff" }}>
              🔔 通知ONで見逃しなし！
            </div>
          </div>

          <div style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 24, padding: "20px 48px",
            textAlign: "center", width: "80%",
          }}>
            <div style={{ fontSize: 30, color: "rgba(255,255,255,0.7)" }}>
              💾 このクイズを保存して友達に出してみよう！
            </div>
          </div>
        </div>
      )}

      {/* ===== 常時表示: フォロー促進バッジ（動画中盤以降） ===== */}
      {frame >= TIMELINE.choices.start && frame < TIMELINE.cta.start && (
        <div style={{
          position: "absolute", top: 40, right: 40,
          opacity: interpolate(frame, [TIMELINE.choices.start, TIMELINE.choices.start + 20], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          }),
        }}>
          <div style={{
            background: "rgba(0,0,0,0.5)",
            border: `1px solid ${accentColor}`,
            borderRadius: 50, padding: "10px 20px",
            fontSize: 22, color: "#fff", fontWeight: "bold",
          }}>
            👉 フォロー！
          </div>
        </div>
      )}

      {/* ===== 音声 ===== */}
      {/* BGM: 動画全体を通して流れる */}
      <Audio src={staticFile("bgm.mp3")} volume={0.25} startFrom={0} />

      {/* イントロジングル */}
      <Sequence from={TIMELINE.hook.start} durationInFrames={40}>
        <Audio src={staticFile("intro-jingle.mp3")} volume={0.7} />
      </Sequence>

      {/* カウントダウンビープ */}
      <Sequence from={TIMELINE.countdown.start} durationInFrames={TIMELINE.countdown.duration}>
        <Audio src={staticFile("countdown-tick.mp3")} volume={0.6} />
      </Sequence>

      {/* 正解発表ジングル */}
      <Sequence from={TIMELINE.reveal.start} durationInFrames={50}>
        <Audio src={staticFile("reveal.mp3")} volume={0.9} />
      </Sequence>
    </AbsoluteFill>
  );
};
