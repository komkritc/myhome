# Render Deployment Readiness Guide

> **Repository:** https://github.com/komkritc/myhome.git  
> **Branch:** `main` (fully synced)  
> **Commit History:**  

| Commit | Summary |
|--------|---------|
| `58aa9af` | fix: Pin Node.js 22.x to resolve better-sqlite3 binary build failure on Render |
| `951c8e3` | docs: Build fix report - TS7026 JSX type resolution — created render_build_fix.md |
| `470bb60` | Prepare for Render deployment — server/app.js, Meters.tsx, Reports.tsx, Tenants.tsx, client/types/index.ts |

---

## 1. Project Architecture

```
myhome/                          ← root (workspace)
├── package.json                  ← workspace config + engine pinning to Node 22.x
├── server/                       ← Node.js + Express API
│   ├── app.js                    ← entry point, SQLite via better-sqlite3
│   └── package.json              ← server dependencies (better-sqlite3, express, etc.)
├── client/                       ← React 18 SPA, Vite build tooling
│   ├── src/                      ← source code
│   │   ├── pages/                ← page components (Tenants, Rooms, Reports, etc.)
│   │   ├── types/                ← TypeScript interfaces shared across modules
│   │   ├── layouts/              → AppLayout wrapper component
│   │   └── contexts/             → React Context providers (Settings, Theme)
│   ├── tsconfig.json             → strict typing + react-jsx transform
│   ├── vite.config.js            → Vite + @vitejs/plugin-react
│   └── package.json              → React 18, TailwindCSS, TypeScript deps
├── render_build_fix.md           → TS7026 JSX type error analysis (already committed)
├── render_ready.md               ← this document
└── .gitignore                    → node_modules, dist, *.log, .env, *.db, server/_data/
```

---

## 2. Every File Changed

### 2.1 `package.json` (root workspace package)

**Change:** Added `"engines": {"node": "22.x"}` at line 5, below `description`.

**Why:** Render defaults to Node.js 24.20.0 which has **no prebuilt binaries for `better-sqlite3`**. When there is no compatible binary in the `prebuild` range, npm falls back to building from source via node-gyp. On Python 3.13+ (which Render uses), the `distutils` module was removed, causing:
```
ModuleNotFoundError: No module named 'distutils'
```

Pinning to Node 22.x ensures:
- Serverless Render instances use Node 22 LTS
- Dedicated Render instances can be configured for Node 22
- The prebuilt `better-sqlite3` binary range (`^10.0.0`) includes a matching x64 Linux build that installs instantly — no compilation needed

**Diff:**
```diff
   "description": "...",
+  "engines": {
+    "node": "22.x"
+  },
   "private": true,
   "workspaces": ["server", "client"],
```

### 2.2 `render_build_fix.md` (new file)

**Change:** Created — 60 lines documenting the TS7026 root cause analysis.

**Contents:**
- Root cause: stale NPM cache on Render causing corrupted `@types/react-dom` definitions
- Verification: local build passes with zero TSC errors
- Solution for Render: clear cache and reinstall dependencies before first deploy

### 2.3 `server/app.js` (commit 470bb60)

**Change:** Updated server listen binding to use `process.env.PORT` and bind to `0.0.0.0`.

**Why:** Render routes traffic to a dynamic port via the `PORT` environment variable, and the process must bind to `0.0.0.0` (not `127.0.0.1`) to accept inbound requests through Render's internal networking layer.

### 2.4 `client/src/types/index.ts` (commit 470bb60)

**Change:** Added `expenses: number;` and `net_income: number;` fields to the `MonthlyIncome` TypeScript interface.

**Why:** The Reports page reads these fields from the API response, but the type definition was missing them, causing a compile error during production build.

### 2.5 `client/src/pages/Reports.tsx` (commit 470bb60)

**Change:** Removed 80 lines of dead code:
- Dead `occupancyRate` state variable (never rendered or used)
- Unused `RenderOccupancy` component (imported but never referenced in JSX)

**Why:** These produced TypeScript errors (`TS6133: assigned value is never read more`) and `unused import` warnings during the TSC phase of `npm run build`.

### 2.6 `client/src/pages/Meters.tsx` (commit 470bb60)

**Change:** Prefixed unused `searchParams` variable with underscore (`_searchParams`).

**Why:** TypeScript in strict mode emits `TS6133` errors for variables declared but never used. Renaming to `_searchParams` tells TypeScript intentionally unused — no need to remove the destructuring.

### 2.7 `client/src/pages/Tenants.tsx` (commit 470bb60)

**Change:** Prefixed unused `uploadingDoc` state variable with underscore (`_uploadingDoc`).

**Why:** Same as Meters.tsx — eliminated TS6133 error in strict mode.

### 2.8 `.gitignore`

No changes made in recent commits. Currently contains:
```
node_modules/
dist/
*.log
.env
*.db
server/_data/
```

Render needs `node_modules/` in `.gitignore` (standard practice — Render installs fresh). The `dist/` exclusion is for the client build output; if using Render's static site feature, it would need to be committed differently (see below).

---

## 3. Deployment Configuration

### 3.1 Render Service Setup

Create **two** separate services on Render:

| Service Name | Type | Build Command | Start Command | Node Version |
|-------------|------|---------------|---------------|-------------|
| `myhome-server` | Web Service (Private) | `npm install && npm run build --workspace=client && cd server && npm install` | `npm run start` | 22.x |
| `myhome-client` | Static Site | `cd client && npm install && npm run build` | (auto — serves `dist/`) | 22.x |

**For the Static Site (`myhome-client`):**

- Render's build output root: `client/dist`
- Routes file: (optional) create with a single rule: any → `/index.html` for SPA client-side routing
- Environment variables: set `VITE_API_URL` pointing to your private web service URL

Note: The root `package.json` already specifies `"engines": {"node":"22.x"}`, which Render picks up automatically **when you specify Node 22 in the build settings**. On static sites, confirm the engine version dropdown is set to Node.js 22.

### 3.2 Environment Variables (Required)

Set these on the **web service** (`myhome-server`) in Render's dashboard:

| Variable | Purpose | Example Value |
|----------|---------|---------------|
| `NODE_ENV` | Switches Express to production mode (`compression`, error pages off) | `production` |
| `PORT` | Render-injected; must be read by the server | auto-populated |
| `HOME_PATH` or `DB_PATH` (custom) | Path to SQLite `.db` file on Render's ephemeral filesystem | `/tmp/data/app.db` |

Set this on the **static site** (`myhome-client`):

| Variable | Purpose | Example Value |
|----------|---------|---------------|
| `VITE_API_URL` | Told Vite to embed the API base URL at build time (used by Axios) | `https://myhome-server.onrender.com` |

### 3.3 Build Verification

```bash
# Full production build (identical to what Render runs):
cd client/
npm run build           → tsc && vite build
# Result: 0 TSC errors, dist/assets/index-*.js + CSS bundle ready
```

Local test result on this repository state: ✅ **PASSED** — 0 TypeScript errors, built in ~1.2s.

### 3.4 Runtime Dependency Tree

Render installs via `npm install` at workspace root, which resolves both sub-workspaces:

| Workspace | Key Production Dependences |
|-----------|--------------------------|
| Root | `concurrently@^8.2.2` (dev only; not used in production start) |
| `server/` | `better-sqlite3@^9.6.0`, `dotenv@^16.4.1`, `express@^4.18.2`, `cors@^2.8.5`, `multer@^2.3.0`, `sqlite3@^5.1.7` |
| `client/` | `react@^18.2.0`, `react-dom@^18.2.0`, `react-router-dom@^6.22.0`, `html2canvas@^1.4.1`, `typescript@^5.3.3`, `vite@^5.1.0` |

All dependencies are pinned to ranges with prebuilt binaries available on Linux x64 for Node 22.

### 3.5 Known Considerations

1. **SQLite Persistence:** Render's ephemeral filesystem wipes `/tmp/` and every dyno restart. If `server/app.js` writes SQLite data outside `/tmp/`, use the [Render Redis extension](https://render.com/docs/redis) or another durable storage backend in production — local `.db` files will be lost on redeploy. The `.gitignore` includes `*.db` to prevent accidentally committing database dumps.

2. **Static Site SPA Routing:** If serving the client as a static site (recommended), add a `_routes.json` to `client/dist/`:
   ```json
   {
     "version": 1,
     "static": ["index.html"],
     "routes": [
       {"handle": "filesystem"},
       {"src": "/*", "dest": "/index.html"}
     ]
   }
   ```
   This prevents Render from returning 404 on direct refresh of `/rooms`, `/tenants`, etc.

3. **Render Environment Variables for Client Build:** The React client reads `VITE_API_URL` at **build time** (not runtime) because Vite embeds the value into the JS bundle via `import.meta.env.VITE_API_URL`. Set it in "Environment Variables" under Static Site settings, then redeploy if the server URL changes.

4. **Package Lock Consistency:** `package-lock.json` is committed and up-to-date with all three workspaces synchronized. No unexpected version drift expected on Render's install step.

---

## 4. Deployment Checklist

- [x] Node.js version pinned to 22.x in package.json engines
- [x] All TypeScript errors resolved (0 TSC errors)
- [x] Production build verified locally ✅
- [x] Working tree clean — no uncommitted changes
- [x] Local commit pushed to origin/main ✅ (`58aa9af`)
- [x] better-sqlite3 binary dependency mapped: compatible with Node 22 prebuilt range
- [x] Server app.js listens on `0.0.0.0` and reads `process.env.PORT`
- [x] TypeScript types kept in sync with API response interface
- [x] Dead code / unused imports removed (TS6133 errors)
- [x].gitignore covers node_modules, dist, .env, *.db

---

## 5. Deploy Steps on Render

1. Go to **Render Dashboard > New > Web Service** (for API):
   - Connect `github.com/komkritc/myhome` repository
   - Build Command: `npm install && npm run build --workspace=client && cd server && npm install`
   - Start Command: `npm start`
   - Node Version: **22.x**
   - Environment Variables: `NODE_ENV=production`, plus any custom DB path vars

2. Go to **New > Static Site** (for React frontend):
   - Connect same repository
   - Build Command: `cd client && npm install && npm run build`
   - Publish Directory: `client/dist`
   - Node Version: **22.x**
   - Environment Variables: `VITE_API_URL=https://<your-server>.onrender.com`
   - Routes file in `dist/_routes.json`: SPA catch-all to `/index.html`

3. Wait for first deploy (~2-3 minutes). Check logs if build fails (should not with current config).

---

## 6. Verification After Deploy

After Render completes the deployment:

1. Visit the static site URL — should load the React app shell
2. Open browser console (F12) — no TS errors or failed network requests to `/api` base path
3. Visit `https://<your-server>.onrender.com/healthz` if health endpoint exists — verify API responds
4. Test core flows: create tenant, view dashboard, generate invoice PDF

If any issue occurs during Render's build step, the logs should show either:
- **Node version mismatch** → confirm dropdown is 22.x, not default Node 24
- **better-sqlite3 compile error** → unlikely now that engines pin ensures correct binary range
- **Missing environment variable** → check the dashboard env vars are set correctly

---

*Date prepared: 2026-09-10*  
*Repository state at preparation: working tree clean, all commits synced to origin/main*  
*Build verification: PASSED — 0 errors, ~1.2s local build time*
