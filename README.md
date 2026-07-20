# BattleBots Design Lab

A production-grade computer-aided design tool for BattleBots teams: design a bot in 3D, let an **agent society** negotiate a build grounded in real historical fight data, simulate the fight with real physics, and read the meta — with the society **learning across sessions**.

Four modes (top nav) plus **Freya**, an in-app AI assistant (bottom-right):

- **BUILD** — 3D parametric CAD editor (React-Three-Fiber). Edit weapon/armor/drivetrain/chassis; live weight/balance/HP against the 250 lb budget. **Reshape** any module into another shape from the kit (a drum becomes a bar, a flipper, forks — shared dimensions carry across, the rest are re-seeded in range), with **undo/redo** (⌘Z / ⇧⌘Z) and reset. Dimensions read in millimetres, not raw metres.
- **AGENTS** — the **Counter-Design Studio**. It answers "what should I change about *my* bot to beat this one": the search starts from whatever you have open in BUILD (falling back to a neutral seed only if that build cannot be read). Five specialists (scout, weapon, armor, drivetrain, chief) each enumerate every option on the axis they own, score all of them against the specific opponent, and argue for their pick; the chief accepts only what improves the predicted margin and still fits the weight budget. You get a proposal ledger (including what was refused and why), a spec diff against your build, the tradeoff space that was searched, and a per-specialist contribution breakdown — plus a measured comparison against a generalist given the same starting bot that never scouted. Load the result back into the lab.
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

The **AGENTS** view always posts the design request to the backend; when a key is set, the specialists' proposals come from OpenAI instead of the deterministic search. Either way the chief **scores every proposal against the actual opponent** before accepting it, so the model can influence a build but never ship an unverified one. The key stays server-side, and if the backend is unreachable the in-browser search takes over — the UI never breaks.

**Freya chat** (`POST /chat`) is pure-AI (no offline fallback): it needs `OPENAI_API_KEY` + `npm run api`, otherwise the widget shows an offline notice.

## Real data (Bright Data)

`src/data/bots.json` + `aggregates.json` ship committed — the META dashboard renders offline from this **real** snapshot (61 bots scraped from the BattleBots wiki, incl. images and verified fight-video ids). To refresh the assets from source (needs `BRIGHTDATA_API_KEY` + `BRIGHTDATA_ZONE` in `.env`):

```bash
npm run enrich       # Bright Data Web Unlocker → per-bot images + top-bot fight videos → bots.json
npm run cartoonize   # OpenAI gpt-image-1 → transparent chibi avatars for the top 10 → public/bots/
npm run ingest       # (optional) Bright Data → Postgres bots table for the live /meta path
```

## Fight-model calibration

The headless model the agent society scores with is **fitted against the real data**, not hand-tuned: `scripts/fitFightModel.mjs` searches its free constants to match the observed per-weapon-class win rates in `bots.json`. Class archetypes are given identical records during the fit, so the result is driven by class structure rather than by the record-derived scaling — otherwise the exercise would be circular.

Current agreement is **Spearman rho = 0.83** on class ordering (rmse 0.12), unchanged under leave-one-class-out. `calibration.test.js` pins this, so a regression in the fight model fails the suite instead of quietly degrading the studio's numbers. Scores are still an *ordering* of builds, never a win probability — the UI says so.

`GET /meta` computes per-class aggregates **live from the bots table** when the backend runs; the frontend prefers it and falls back to the committed snapshot — the dashboard never breaks.

## Test / build

```bash
npm test             # ~370 unit tests (DB-dependent suite skips without DATABASE_URL)
npm run build
```

## Architecture

| Area | Path |
|------|------|
| Parametric bot physics (mass/CG/inertia/HP/weapon energy, all SI) | `src/lib/domain/` |
| 3D CAD scene + editor | `src/lib/scene/`, `src/components/lab/` |
| Rapier fight arena (opponent gen, prediction, HUD, hologram-style bots) | `src/lib/sim/`, `src/components/arena/` |
| Agent society (scout, per-axis scored search, negotiation, headless eval) | `server/agents/` |
| Fight-model calibration against real per-class results | `server/agents/calibration.js`, `scripts/fitFightModel.mjs` |
| Counter-Design Studio UI | `src/lib/design/`, `src/components/design/studio/` |
| Cross-session memory | `src/lib/memory/` |
| Meta analysis + charts | `src/lib/analysis/`, `src/components/analysis/` |
| Bright Data enrichment (images/videos) + cartoon avatars | `server/ingest/`, `scripts/` |
| Freya AI chat | `src/components/chat/`, `src/lib/chat/`, `server/agents/chatAgent.js` |
| REST API (health/bots/meta/design/verdict/chat) | `server/api/` |

Everything decision-relevant is a pure, unit-tested function; the LLM, 3D, and physics are thin layers over that core.
