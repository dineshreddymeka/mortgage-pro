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

**House is the root node, keyed by business `id` (`001`, `002`, …).** Category tabs are child maps under that id:

```
id: "001"                   ← root identity
  name, archived, …
  property/                 ← Property tab + location
  financing/                ← Financing (loan, DTI, refi)
  upfront/                  ← Upfront cash / buyer costs
  rental/                   ← Rental pro forma
  exit/                     ← When to sell
```

Firestore keeps an internal document path for multi-user uniqueness; the house field `id` (alias `houseId`) is the stable `001` / `002` users navigate. The UI still edits a flat in-memory scenario; pack/unpack at the storage boundary. Legacy flat `scenario` blobs migrate to category children on save.

## Firestore (multi-property sync)

Optional cloud sync for multiple saved properties. Uses the **Firebase web client SDK** only — never the Admin / service-account private key in this app.

1. Firebase project with **Cloud Firestore** (native) and published rules (see [`firestore.rules`](firestore.rules)).
2. **Authentication → Sign-in method → Anonymous → Enable**.
3. **Authentication → Settings → Authorized domains**: add `dineshreddymeka.github.io` (and `localhost` for local).
4. Register a **Web app** and copy the config into `.env.local` (see [`.env.example`](.env.example)).
5. For GitHub Pages, set these repository secrets (same values):
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`

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

## License

Private / all rights reserved unless a `LICENSE` file is added.
