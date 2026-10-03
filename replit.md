# Nexora — AI Learning Companion

A premium IELTS & BCS preparation AI study platform with speaking simulator, MCQ bank, writing evaluator, flashcards, notebook, pronunciation practice, and progress tracking.

## Run & Operate

- `pnpm --filter @workspace/nexora run dev` — run the frontend (port auto-assigned via PORT env)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite, Tailwind CSS v4, Zustand (state), Recharts (charts)
- Typography: Sora + DM Sans (Google Fonts)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM (not yet used by frontend — frontend is client-side only)
- Build: esbuild (CJS bundle for API server)

## Where things live

- `artifacts/nexora/src/` — React frontend
  - `src/App.tsx` — root, screen switcher
  - `src/lib/store.ts` — Zustand global state (currentScreen, scores)
  - `src/lib/constants.ts` — IELTS questions, BCS MCQ decks, pronunciation words, flashcard templates
  - `src/components/` — all screen components
  - `src/index.css` — dark theme, glass-morphism, Sora/DM Sans fonts
- `artifacts/nexora/public/` — icons: icon-512.png, icon-192.png, apple-touch-icon.png
- `artifacts/api-server/src/` — Express API (health check only currently)
- `attached_assets/` — original Nexora source files (reference implementation)

## Architecture decisions

- Fully client-side frontend — all state in Zustand + localStorage, no backend calls for IELTS/BCS features
- Single-page app with screen switching via Zustand (no router) matching original mobile-app feel
- Dark glass-morphism aesthetic: deep dark backgrounds (#06070d), purple primary (#7c3aed), cyan accent (#00e0ff)
- Mobile-first layout: max-w-[430px] centered phone container
- MCQ questions normalized to `{ q, options: string[], correct: 'A'|'B'|'C'|'D', explanation }` in constants.ts
- Notebook notes persisted to `localStorage` under key `nexora_notes`

## Product

- **Splash**: Real Nexora icon, feature list, CTA
- **Chat**: AI chat with Support/Gossip/Hype/Tutor modes, animated typing indicator
- **Speaking Simulator**: IELTS Part 1/2/3 questions, mock microphone recording, band score feedback
- **Study Mode**: Flashcard deck with 3D flip animation + dot pagination | Notebook tab (add/search/read notes, localStorage)
- **MCQ Bank**: IELTS (vocab/grammar) + BCS/Govt (6 subject decks) with deck selector, progress bar, results screen
- **Writing Evaluator**: Task 1 & 2 essay submission with mock AI band scoring (TA/CC/LR/GRA breakdown)
- **Pronunciation**: Word-by-word practice with IPA phonetics, Web Speech API playback
- **Progress Dashboard**: Recharts area chart of band score history, MCQ accuracy bar

## User preferences

- Premium dark aesthetic matching original Nexora design system
- Mobile-phone-in-browser layout (max ~430px wide)
- Real app icons in public/ (512px, 192px, apple-touch-icon)

## Gotchas

- Zustand must be in `devDependencies` of `artifacts/nexora/package.json` (client-side dep)
- Google Fonts `@import url(...)` must be the FIRST line in `index.css` before `@import "tailwindcss"`
- Icons are in `public/` (not `attached_assets/`) — imported in Splash.tsx as `/icon-512.png`
- The original JS source is in `attached_assets/` — reference for feature additions

## Pointers

- See the `pnpm-workspace` skill for workspace structure
- See the `react-vite` skill for frontend conventions
