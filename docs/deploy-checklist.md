# Deploy checklist (Property Pro)

Use this after merging to `main` (or when standing up a new Firebase project).

## 1. Firebase Authentication

1. Console → **Authentication → Sign-in method**
2. Enable **Anonymous**
3. Enable **Google**
4. **Settings → Authorized domains**: add `localhost`, `127.0.0.1`, and `dineshreddymeka.github.io`

## 2. Firestore rules & indexes

```bash
firebase login
firebase use <your-project-id>
firebase deploy --only firestore:rules,firestore:indexes
```

Sources: [`firestore.rules`](../firestore.rules), [`firestore.indexes.json`](../firestore.indexes.json), wired in [`firebase.json`](../firebase.json).

## 3. Cloud Functions (estimate + tax research proxy)

```bash
npm --prefix functions ci
npm --prefix functions run build
firebase deploy --only functions
```

Configure server env / secrets from [`functions/.env.example`](../functions/.env.example):

- `ALLOWED_ORIGINS` — include the GitHub Pages origin
- `CACHE_TTL_SECONDS` — 6h default; shared by estimates cache and tax research snapshot reuse
- Optional upstream `*_API_URL` / `*_API_KEY`
- Rate limits as needed

Details:

- Estimates: [`docs/external-estimates-api.md`](./external-estimates-api.md)
- Per-house tax research: [`docs/per-house-tax-research.md`](./per-house-tax-research.md)

## 4. Client env (local)

Copy [`.env.example`](../.env.example) → `.env.local`:

| Variable | Purpose |
| --- | --- |
| `VITE_FIREBASE_*` | Web app config |
| `VITE_GOOGLE_MAPS_API_KEY` | Places + map preview (optional; external Maps link works without it) |
| `VITE_ESTIMATE_API_BASE_URL` | Functions base URL (blank = offline stubs) |
| `VITE_ESTIMATE_API_TIMEOUT_MS` | Proxy timeout (default 12000) |
| `VITE_TAX_RESEARCH_API_BASE_URL` | Tax research base URL (optional; falls back to estimate URL) |
| `VITE_TAX_RESEARCH_API_TIMEOUT_MS` | Tax collect timeout (default 35000) |

## 5. GitHub Pages secrets

Repository → **Settings → Secrets and variables → Actions**:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `GOOGLE_MAPS_API_KEY` (mapped to `VITE_GOOGLE_MAPS_API_KEY` in deploy workflow)
- `VITE_ESTIMATE_API_BASE_URL`
- `VITE_TAX_RESEARCH_API_BASE_URL` (optional; omit to reuse estimate URL)

Pages source must be **GitHub Actions** (see README).

## 6. Smoke test

1. Open the live site; create/select a house
2. Confirm cloud sync chip / Firestore writes
3. Link Google; copy UID; invite a second account
4. Research tab: notes/links persist after reload
5. Estimates panel: proxy or offline stub with confidence chips
6. Research tab → Tax references: **Collect** / **Refresh** when tax API URL configured; official links appear under external snapshot
7. Revision conflict: edit same house in two sessions → dialog shows local vs remote rev

## Known production limits

- Email invites store a hash only — **no outbound email**
- Collaboration is last-write-wins with a revision dialog (no realtime merge)
- Offline estimate stubs are **low confidence** until upstream providers are configured
