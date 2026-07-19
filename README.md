# BattleBots Design Lab

A production-grade computer-aided design tool for BattleBots teams: design a bot in 3D, let an **agent society** negotiate a build grounded in real historical fight data, simulate the fight with real physics, and read the meta — with the society **learning across sessions**.

Four modes (top nav) plus **Freya**, an in-app AI assistant (bottom-right):

- **BUILD** — 3D parametric CAD editor (React-Three-Fiber). Edit weapon/armor/drivetrain/chassis; live weight/CG/HP against the 250 lb budget.
- **AGENTS** — five specialist agents (scout, weapon, armor, drivetrain, chief) negotiate a build round-by-round, beat a single-agent baseline, and remember the outcome. Load the result into the lab.
- **ARENA** — stage your build vs a roster opponent (built from its real weapon class) in a Rapier physics arena. Press **Start**, watch (Auto-sim) or **drive it yourself** (Manual, WASD). Live HP bars, a **Sim Model** panel explaining the prediction, and an AI/offline fight-analyst verdict.
- **META** — "The Meta Intelligence" dashboard from **real Bright Data-scraped records**: weapon-class win/KO charts, a threat-ranking dumbbell, field-composition donut, counter-build recs, a top-10 leaderboard with generated bot avatars, and embedded fight videos.

## Run

```bash
npm install
npm run dev          # frontend at http://localhost:5173
```

The agent society and the physics arena run **entirely in the browser** — no backend or API key required. The META dashboard renders from a committed real-data snapshot. Freya chat and live agent reasoning need the backend + an OpenAI key (below).

## Live AI (real OpenAI reasoning)

To have the specialists reason with a real LLM instead of the deterministic rules:

```bash
cp .env.example .env          # then set OPENAI_API_KEY=sk-...
npm run api                   # backend at http://localhost:3001
npm run dev                   # in another terminal
```

In the **AGENTS** view, tick **"Live AI (OpenAI via backend)"**. The frontend POSTs the design request to the backend, which runs the society with OpenAI. The key stays server-side. If the backend is unreachable or a call fails, it falls back to the deterministic society — the UI never breaks.

**Freya chat** (`POST /chat`) is pure-AI (no offline fallback): it needs `OPENAI_API_KEY` + `npm run api`, otherwise the widget shows an offline notice.

## Real data (Bright Data)

`src/data/bots.json` + `aggregates.json` ship committed — the META dashboard renders offline from this **real** snapshot (61 bots scraped from the BattleBots wiki, incl. images and verified fight-video ids). To refresh the assets from source (needs `BRIGHTDATA_API_KEY` + `BRIGHTDATA_ZONE` in `.env`):

```bash
npm run enrich       # Bright Data Web Unlocker → per-bot images + top-bot fight videos → bots.json
npm run cartoonize   # OpenAI gpt-image-1 → transparent chibi avatars for the top 10 → public/bots/
npm run ingest       # (optional) Bright Data → Postgres bots table for the live /meta path
```

`GET /meta` computes per-class aggregates **live from the bots table** when the backend runs; the frontend prefers it and falls back to the committed snapshot — the dashboard never breaks.

## Test / build

```bash
npm test             # ~230 unit tests (DB-dependent suite skips without DATABASE_URL)
npm run build
```

## Architecture

| Area | Path |
|------|------|
| Parametric bot physics (mass/CG/inertia/HP/weapon energy, all SI) | `src/lib/domain/` |
| 3D CAD scene + editor | `src/lib/scene/`, `src/components/lab/` |
| Rapier fight arena (opponent gen, prediction, HUD, hologram-style bots) | `src/lib/sim/`, `src/components/arena/` |
| Agent society (scout/specialists/negotiation/headless eval) | `server/agents/` |
| Agent society UI | `src/lib/design/`, `src/components/design/` |
| Cross-session memory | `src/lib/memory/` |
| Meta analysis + charts | `src/lib/analysis/`, `src/components/analysis/` |
| Bright Data enrichment (images/videos) + cartoon avatars | `server/ingest/`, `scripts/` |
| Freya AI chat | `src/components/chat/`, `src/lib/chat/`, `server/agents/chatAgent.js` |
| REST API (health/bots/meta/design/verdict/chat) | `server/api/` |

Everything decision-relevant is a pure, unit-tested function; the LLM, 3D, and physics are thin layers over that core.
