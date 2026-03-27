# CLAUDE.md — TikTok Quiz Automation

This file provides guidance for AI assistants working in this repository.

## Project Overview

An automated system that generates, renders, and posts daily Japanese trivia quiz videos to TikTok.

**Pipeline**: GitHub Actions (daily 20:00 JST) → Claude API (quiz JSON) → Remotion (MP4 render) → TikTok API (publish)

**Primary language**: TypeScript/JavaScript (ESM)
**Node.js requirement**: >= 18.0.0
**Package manager**: npm

---

## Repository Structure

```
tiktok-quiz-automation/
├── .github/workflows/daily-video.yml  # Scheduled CI/CD automation
├── scripts/
│   ├── generate-quiz.mjs              # Claude API quiz generation
│   ├── render.mjs                     # Remotion video rendering
│   ├── post-to-tiktok.mjs             # TikTok API posting
│   └── pipeline.mjs                   # Orchestration (runs all 3 in order)
├── src/
│   ├── QuizVideo.tsx                  # Main Remotion video component
│   ├── Root.tsx                       # Remotion composition entry point
│   └── index.ts                       # Remotion registration
├── public/quiz-data.json              # Generated quiz data (auto-created, committed)
├── output/                            # Rendered MP4 files (.gitignore'd)
├── .env.example                       # Required environment variables template
├── tsconfig.json
└── package.json
```

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Video generation | [Remotion](https://www.remotion.dev/) 4.x (React-based) |
| AI content | Anthropic Claude API (`claude-opus-4-5`) |
| TikTok publishing | TikTok Content Posting API v2 |
| HTTP client | axios |
| Scheduling | GitHub Actions (cron) |
| Language | TypeScript 5.3, ESM modules (`.mjs`) |

---

## Development Commands

```bash
# Install dependencies
npm install

# Preview video in browser (Remotion Studio)
npm run dev

# Run full pipeline locally (no TikTok post)
DRY_RUN=true node scripts/pipeline.mjs

# Run individual steps
node scripts/generate-quiz.mjs    # generates public/quiz-data.json
node scripts/render.mjs           # renders output/quiz-YYYY-MM-DD.mp4
node scripts/post-to-tiktok.mjs   # posts latest MP4 in output/

# Render video only
npm run render

# Bundle for production
npm run build
```

---

## Environment Variables

Copy `.env.example` to `.env` for local development. In CI, these are GitHub Secrets.

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Claude API key (`sk-ant-...`) |
| `TIKTOK_ACCESS_TOKEN` | Yes | TikTok Content Posting API token |
| `TIKTOK_OPEN_ID` | Yes | TikTok user Open ID |
| `DRY_RUN` | No | Set `true` to skip TikTok posting |
| `CATEGORY_OVERRIDE` | No | Force a specific quiz category |

**Important**: TikTok tokens expire (24h–30d). A token refresh mechanism may be needed for long-running deployments.

---

## Key Conventions

### Scripts (.mjs files)
- All scripts use **ESM syntax** (`import`/`export`, not `require`)
- Scripts are standalone — no TypeScript compilation needed
- They read/write to `public/quiz-data.json` and `output/` directory

### Video Component (`src/QuizVideo.tsx`)
- Props are validated with **Zod schema**
- Timeline is **frame-based** at 30 FPS, total 450 frames (15 seconds):

| Phase | Frames | Duration |
|-------|--------|----------|
| Intro | 0–40 | 1.3s |
| Question display | 40–100 | 2s |
| Choices appear | 100–160 | 2s |
| Countdown timer | 160–310 | 5s |
| Answer reveal | 310–370 | 2s |
| Explanation | 370–450 | 2.67s |

- Output resolution: **1080×1920** (TikTok 9:16 vertical)
- Render settings: h264, CRF 18, 4M video bitrate, 320k audio

### Quiz Data Schema
`public/quiz-data.json` contains:
```json
{
  "question": "...",
  "choices": ["A", "B", "C", "D"],
  "correctIndex": 0,
  "explanation": "...",
  "category": "科学",
  "difficulty": "ふつう",
  "bgColor": "#1a1a2e",
  "accentColor": "#e94560"
}
```

### Category & Difficulty Rotation
Rotates daily based on `Date.now()` modulo array length:
- **8 categories**: 地理, 科学, 歴史, 動物, 食文化, スポーツ, 日本文化, 雑学
- **3 difficulties**: かんたん (Easy), ふつう (Normal), むずかしい (Hard)
- Each category has a paired `bgColor` and `accentColor`

### TikTok Posting
- Privacy defaults to `SELF_ONLY` — change to `PUBLIC_TO_EVERYONE` for live publishing
- Hashtag strategy: base tags + engagement tags + category-specific tags
- Auto-detects newest `.mp4` in `output/` directory

---

## GitHub Actions Workflow

File: `.github/workflows/daily-video.yml`

- **Schedule**: Daily at 11:00 UTC (20:00 JST)
- **Manual trigger**: `workflow_dispatch` with optional `dry_run` input
- **Concurrency**: Prevents overlapping runs
- **Timeout**: 30 minutes
- **Artifacts**: Video uploaded with 7-day retention
- **System requirements installed in CI**: Chrome (for Remotion), Japanese fonts (Noto Sans CJK)

---

## Common Tasks for AI Assistants

### Modifying the video layout
Edit `src/QuizVideo.tsx`. Use frame numbers and the timeline table above to target specific phases. The `CountdownRing` and `ChoiceButton` are internal sub-components in the same file.

### Changing quiz generation behavior
Edit `scripts/generate-quiz.mjs`. The Claude model, prompt template, categories, difficulties, and color schemes are all defined there.

### Changing video render settings
Edit `scripts/render.mjs`. Key settings: `codec`, `crf`, `videoBitrate`, `audioBitrate`, output path.

### Adjusting TikTok post behavior
Edit `scripts/post-to-tiktok.mjs`. Privacy level, hashtag arrays, and API version are defined there.

### Adding a new category
1. Add entry to `CATEGORIES` array in `scripts/generate-quiz.mjs` with `name`, `emoji`, `bgColor`, `accentColor`
2. Add corresponding hashtags in `scripts/post-to-tiktok.mjs`

### Testing locally without posting
```bash
DRY_RUN=true node scripts/pipeline.mjs
```

---

## Important Notes

- `output/` is `.gitignore`'d — rendered videos are not committed
- `public/quiz-data.json` is committed and read by the Remotion bundler at render time
- `tiktokcZQ3pMTS7bbHDRoDpMXkig66qVtr3CK8.txt` is a TikTok domain verification file — do not delete
- The project targets Japanese-speaking TikTok users; all quiz content and UI text is in Japanese
- Chrome must be installed in any environment running `render.mjs`
