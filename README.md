# BattleBots Design Lab

A production-grade computer-aided design tool for BattleBots teams: design a bot in 3D, let an **agent society** negotiate a build grounded in real historical fight data, simulate the fight with real physics, and read the meta — with the society **learning across sessions**.

Four modes (top-right of the app):

- **BUILD** — 3D parametric CAD editor (React-Three-Fiber). Edit weapon/armor/drivetrain/chassis; live weight/CG/HP against the 250 lb budget.
- **AGENTS** — five specialist agents (scout, weapon, armor, drivetrain, chief) negotiate a build round-by-round, beat a single-agent baseline, and remember the outcome. Load the result into the lab.
- **SIMULATE** — drop the build into a Rapier physics arena and watch it fight a roster opponent.
- **META** — weapon-class tier list, roster leaderboard, and counter-build recommendations from the real scraped records, with your memory overlaid.

## Run

```bash
npm install
npm run dev          # frontend at http://localhost:5173
```

The agent society runs **entirely in the browser** with a deterministic rule-based agent — no backend or API key required.

## Live AI (real OpenAI reasoning)

To have the specialists reason with a real LLM instead of the deterministic rules:

```bash
cp .env.example .env          # then set OPENAI_API_KEY=sk-...
npm run api                   # backend at http://localhost:3001
npm run dev                   # in another terminal
```

In the **AGENTS** view, tick **"Live AI (OpenAI via backend)"**. The frontend then POSTs the design request to the backend, which runs the society with OpenAI (`gpt-4o-mini`). The key stays server-side and never reaches the browser. If the backend is unreachable or a specialist call fails, it falls back to the deterministic society — the UI never breaks.

## Live data refresh (optional)

`aggregates.json` / `bots.json` ship committed, so the **META** dashboard renders offline from a snapshot (it shows "DATA SOURCE: COMMITTED SNAPSHOT"). To refresh from source:

```bash
# set DATABASE_URL + BRIGHTDATA_API_TOKEN in .env
npm run ingest       # Bright Data → Postgres bots table
npm run api          # backend at http://localhost:3001
npm run dev          # dashboard now shows "DATA SOURCE: LIVE"
```

`GET /meta` computes the per-class aggregates **live from the current bots table** (no precomputed table), so a fresh ingest is reflected immediately. The frontend prefers the backend's live meta + roster and falls back to the committed snapshot if the backend is unreachable — the dashboard never breaks.

## Test / build

```bash
npm test             # ~183 unit tests (DB-dependent suite skips without DATABASE_URL)
npm run build
```

## Architecture

| Area | Path |
|------|------|
| Parametric bot physics (mass/CG/inertia/HP/weapon energy, all SI) | `src/lib/domain/` |
| 3D CAD scene + editor | `src/lib/scene/`, `src/components/lab/` |
| Rapier fight sim | `src/lib/sim/`, `src/components/arena/` |
| Agent society (scout/specialists/negotiation/headless eval) | `server/agents/` |
| Agent society UI | `src/lib/design/`, `src/components/design/` |
| Cross-session memory | `src/lib/memory/` |
| Meta analysis | `src/lib/analysis/`, `src/components/analysis/` |
| REST API (health/bots/meta/design) | `server/api/` |

Everything decision-relevant is a pure, unit-tested function; the LLM, 3D, and physics are thin layers over that core.
