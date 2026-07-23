# Property Pro

Single-page app for mortgage, cash-to-close, rental, and when-to-sell modeling. React, TypeScript, Vite, Material UI. State stays in the browser; **Export Excel** for an offline workbook.

## Quick start

```bash
git clone git@github.com:dineshreddymeka/mortgage-pro.git
cd mortgage-pro
npm install
npm run dev
```

Open the URL Vite prints (default: http://127.0.0.1:5173).

## Google Maps (property address)

The Mortgage tab can autocomplete a property address and show a compact map preview.

1. In [Google Cloud Console](https://console.cloud.google.com/), enable **Maps JavaScript API** and **Places API (New)** for your project.
2. Create a **browser** API key (HTTP referrer restrictions). Do not treat it as a private server credential — Vite embeds `VITE_*` values in the client bundle.
3. Restrict the key to:
   - `https://dineshreddymeka.github.io/mortgage-pro/*`
   - `http://localhost:*/*` and `http://127.0.0.1:*/*` (local Vite)
4. Copy [`.env.example`](.env.example) to `.env.local` and set `VITE_GOOGLE_MAPS_API_KEY=`.
5. For GitHub Pages, add a repository secret named `GOOGLE_MAPS_API_KEY` with the same key. The deploy workflow passes it as `VITE_GOOGLE_MAPS_API_KEY` at build time.

Without a key, you can still type an address manually; autocomplete and the map stay off.

## Data model

**One structure as the point of truth** — house root by business `id`, all inputs in a single `scenario` object (reuse those fields; don’t fork copies per tab):

```
id: "001"                 ← root identity
  name, archived, …
  scenario: {             ← every tab / panel input (no field loss)
    homePrice, downPayment, …, monthlyRent, …, refi?, …
  }
```

Category tabs (Property · Financing · Upfront · Rental · Exit) are UI only — they read/write the same `scenario` properties. Firestore keeps an internal doc path for multi-user uniqueness; `id` / `houseId` is the stable `001` / `002` users navigate.

See [`docs/kpi-data-inventory.md`](docs/kpi-data-inventory.md) for the maintained
inventory of persisted scenario properties, derived KPIs, formulas, and ownership rules.

## Firestore (multi-property sync)

Optional cloud sync for multiple saved properties. Uses the **Firebase web client SDK** only — never the Admin / service-account private key in this app.

1. Firebase project with **Cloud Firestore** (native) and published rules/indexes (see [`firestore.rules`](firestore.rules), [`firestore.indexes.json`](firestore.indexes.json)).
2. **Authentication → Sign-in method**: enable **Anonymous** and **Google**.
3. **Authentication → Settings → Authorized domains**: add `dineshreddymeka.github.io` (and `localhost` for local).
4. Register a **Web app** and copy the config into `.env.local` (see [`.env.example`](.env.example)).
5. Deploy rules/indexes/functions — full steps in [`docs/deploy-checklist.md`](docs/deploy-checklist.md).
6. For GitHub Pages, set these repository secrets (same values):
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_ESTIMATE_API_BASE_URL` (optional estimate proxy; blank = offline stubs)
   - `VITE_TAX_RESEARCH_API_BASE_URL` (optional tax research proxy; falls back to estimate URL)
   - `GOOGLE_MAPS_API_KEY` (optional Maps autocomplete)

Without Firebase env vars, the app keeps working with local browser storage only.

## GitHub Pages

**Live URL:** https://dineshreddymeka.github.io/mortgage-pro/

Workflow [Deploy to GitHub Pages](.github/workflows/deploy-pages.yml) builds with `npm ci && npm run build` and publishes `dist/` on push to `main` (or manual dispatch).

### First-time setup

1. Open [Settings → Pages](https://github.com/dineshreddymeka/mortgage-pro/settings/pages).
2. **Build and deployment → Source:** GitHub Actions.
3. Confirm [Actions](https://github.com/dineshreddymeka/mortgage-pro/actions) → **Deploy to GitHub Pages** is green (approve the `github-pages` environment if prompted).
4. Open the live URL above.

CI sets `VITE_BASE_PATH` to `/mortgage-pro/`. Locally the base is `/`.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck + production build |
| `npm run preview` | Preview `dist/` |
| `npm run lint` | ESLint |
| `npm run test` | Vitest unit tests |
| `npm run functions:test` | Firebase Functions unit tests |
| `npm run tax-research:live-smoke` | Opt-in live adapter smoke (requires `--network` + `--address`; not CI) |

## External estimate proxy (Phase 8)

Optional server-side proxy for mortgage rates, property tax, insurance, rent, and comps. See [`docs/external-estimates-api.md`](docs/external-estimates-api.md) for deploy notes, env vars, and provider limitations.

Set `VITE_ESTIMATE_API_BASE_URL` in `.env.local` (or GitHub Actions secret) to your Firebase Functions base URL. Without it, estimate panels use offline heuristic stubs with explicit apply-only confirmation.

## Per-house tax research

Research tab can collect **official** federal/state/county tax reference links for the active saved house via `collectHouseTaxResearch`. Configure `VITE_TAX_RESEARCH_API_BASE_URL` (or reuse `VITE_ESTIMATE_API_BASE_URL`). See [`docs/per-house-tax-research.md`](docs/per-house-tax-research.md) for endpoint contract, cache, persistence, and security controls.

## License

Private / all rights reserved unless a `LICENSE` file is added.
