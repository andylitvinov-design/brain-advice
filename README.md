# Advice

Advice is a standalone Next.js MVP for a narrow page-improvement loop:

1. paste a page URL
2. choose a dashboard
3. analyze the page
4. edit the generated Codex prompt
5. choose a Codex target
6. run a mock rebuild
7. open a real temporary preview URL
8. refresh or accept the result

The dashboard metric source is currently live and fixed to:

- [http://127.0.0.1:8877/sales/landing-metric-dashboard.html](http://127.0.0.1:8877/sales/landing-metric-dashboard.html)
- JSON feed: `http://127.0.0.1:8877/sales/reports/landing-metric-dashboard-data.json`

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Monitoring

Sentry is wired through `@sentry/nextjs` and stays inactive until a DSN is set.

Required runtime env:

```bash
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_DSN=
```

Optional env:

```bash
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.1
```

Figma MCP is configured in Codex via `FIGMA_OAUTH_TOKEN`. Set it in the shell or launcher environment before starting Codex.

Sentry CLI is installed locally as `sentry`. Authenticate once with:

```bash
sentry auth login
```

Then verify:

```bash
sentry auth status
```

## Architecture

- `src/app/page.tsx`
  Main Advice UI entry.
- `src/components/advice-app.tsx`
  Client workflow, reducer wiring, and UI blocks.
- `src/lib/types.ts`
  Shared contracts for dashboards, analysis, runs, and preview state.
- `src/lib/dashboard-configs/index.ts`
  Dashboard presets and weighted criteria.
- `src/lib/analysis/*`
  Server-side fetch and rule-based scoring.
- `src/lib/prompt-builder/index.ts`
  Short Codex-ready prompt generation.
- `src/lib/codex/*`
  Target catalog and Codex client abstraction.
- `src/lib/preview/provider.ts`
  Filesystem-backed preview and publish flow.
- `src/lib/state/advice-reducer.ts`
  Typed UI state machine.

## Where to change things

### Dashboard metrics

The app now loads the dashboard list from the live sales metric JSON feed.

Edit `src/lib/dashboard-configs/index.ts` to change:

- source URLs
- metric-to-config transformation
- fallback description/prompt focus rules

### Analysis rules

Edit:

- `src/lib/analysis/fetch-page.ts`
- `src/lib/analysis/analyzer.ts`

### Real Codex API integration

Current mock:

- `src/lib/codex/mock-client.ts`

Contract:

- `src/lib/codex/client.ts`

Swap the exported instance in `src/lib/server.ts`.

### Real preview deploy provider

Current local provider:

- `src/lib/preview/provider.ts`

Artifacts are stored under:

- `artifacts/runs`
- `artifacts/previews`
- `artifacts/published`

Public routes already exist:

- `/preview/[runId]`
- `/published/[slug]`

## API routes

- `POST /api/analyze`
- `POST /api/runs`
- `POST /api/runs/[runId]/refresh`
- `POST /api/runs/[runId]/accept`

## MVP limitations

- analysis is heuristic, not LLM-backed
- Codex integration is mock-only
- preview publishing is local filesystem-backed
- `Custom dashboard` is config-based, not a UI builder
