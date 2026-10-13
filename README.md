# Inventory Helper — frontend

Next.js app store staff use on their phones to photograph delivery receipts,
review the OCR'd items, and search past deliveries. It talks to the backend in
the separate `osave-inv-helper-server` repo. Domain rules are in
`AI_DOCS/main-file.md`; the API shapes it expects are in
`AI_DOCS/frontend-contract.md`; code conventions are in `CLAUDE.md`.

## Local development

Requires Node 24 and the backend running (by default on `http://localhost:4000`).

```bash
npm install
cp .env.example .env.local   # then point NEXT_PUBLIC_API_URL at the backend
npm run dev                  # http://localhost:3000
npm run dev:https            # HTTPS on the LAN, for testing the camera on a phone
npm test                     # Vitest, single run
npm run lint
```

## Deployment

Hosted on **Vercel**, with the backend on Railway. Branches: features merge
into `develop`; `production` is what Vercel serves.

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | The Railway backend's public URL, e.g. `https://<service>.up.railway.app` |

- It's inlined at build time, so after changing it, **redeploy**.
- The backend only answers browsers from origins listed in its
  `ALLOWED_ORIGINS`, so that must include this app's Vercel URL (exactly,
  `https://…`, no trailing slash).
- Camera capture needs HTTPS, which Vercel provides.

Vercel detects Next.js and runs `npm run build` itself; there's no
`vercel.json`. CI (`.github/workflows/ci.yml`) runs lint, tests and a build
on every PR.
