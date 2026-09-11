# Render Readiness Checklist — Instructions for AI Agent

> **Context:** This document tells Pi (or any LLM agent) how to verify and ensure this project is deployment-ready for Render. Do NOT deploy or approve until all checks pass.

---

## 0. Repository Identity

| Field | Value |
|------|-------|
| URL | `https://github.com/komkritc/myhome.git` |
| Branch | `main` (must be fully synced) |
| Commit History (last 4) | `c8f806d docs: Add render_ready.md`, `58aa9af fix: Pin Node.js 22.x`, `951c8e3 docs: TS7026 build fix`, `470bb60 Prepare for Render deployment` |

---

## 1. Pre-Flight (DO NOT SKIP)

Before making ANY changes, run these and abort if anything fails:

```bash
cd /data/Projects/myhome_v2/myhome

# 1a. Working tree must be clean
git status --short    # must output NOTHING

# 1b. Production build MUST succeed with zero errors
cd client && npm run build   # must show 0 TSC errors

# 1c. Node version
node --version         # should report v22.x (not 24)
```

**Abort** if: `git status` shows uncommitted changes, `npm run build` produces TSC errors, or `node --version` reports v24+ without the engines pin check passing.

---

## 2. Required Checks — What the AI Must Verify

For each item below, read the file and report pass/fail with explanation:

### CHECK A: Node Version Pinning
- **File:** `package.json` (root)
- **Must contain:** `"engines": { "node": "22.x" }`
- **Why critical:** Prevents Render from using Node 24 which breaks `better-sqlite3` prebuilt binary resolution. Without this, npm falls back to node-gyp compilation → fails on Python 3.13+ (`distutils` removed).
- **If missing:** Add it above the `"private"` field.

### CHECK B: TypeScript Compilation
- **File:** `client/tsconfig.json`
- **Must have:** `"jsx": "react-jsx"`, `"strict": true`, `"skipLibCheck": true` (keep this — DO NOT remove)
- **Run:** `npm run build` in `client/` directory
- **Expected:** Exit code 0, zero TS6133 / TS7006 / TS7026 errors

### CHECK C: Server Port Binding
- **File:** `server/app.js`
- **Must contain:** `app.listen(parseInt(process.env.PORT || "3000"), "0.0.0.0")` or equivalent
- **Why:** Render injects the port via env var; binding to `127.0.0.1` rejects external traffic

### CHECK D: SQLite / better-sqlite3 Dependency
- **File:** `server/package.json`
- **Must contain:** `"better-sqlite3": "^9.6.0"` or compatible version with prebuilt binaries for Node 22 x64 Linux
- **DO NOT alter** this dependency — it must use SQLite on the local filesystem

### CHECK E: Package Lockfile Consistency
- **File:** `package-lock.json`
- **Validate:** `npm --no-save ls` and confirm no unmet / missing workspace dependencies
- **If mismatch:** Run `npm install` to regenerate; diff before/after; only commit if changes are expected and minimal

### CHECK F: No Unused Imports (TS6133)
- **Scope:** All files in `client/src/pages/*.tsx`, `client/src/types/index.ts`, `server/app.js`
- **Rule:** Every imported symbol must be used exactly once. Prefix unused vars with `_` to silence TS strict mode (e.g., `_unusedVar`).

### CHECK G: .gitignore Contents
- **File:** `.gitignore`
- **Must include:** All of the following — `node_modules/`, `dist/`, `*.log`, `.env`, `*.db`, `server/_data/`
- **DO NOT remove** SQLite db patterns or `.env`

---

## 3. Deployment Configuration (For Render Dashboard)

If you are assisting with deploying, provide these exact settings:

### Service 1 — API Backend (`myhome-server`)
| Setting | Value |
|---------|-------|
| Type | Web Service (Private) |
| Build Command | `npm install && npm run build --workspace=client && cd server && npm install` |
| Start Command | `npm start` (alias for `NODE_ENV=production node app.js`) |
| Node Version | **22.x** (select from dropdown — DO NOT leave default to 24) |
| Env Vars | `NODE_ENV=production` + any custom DB path variable |

### Service 2 — Frontend SPA (`myhome-client`)
| Setting | Value |
|---------|-------|
| Type | Static Site |
| Build Command | `cd client && npm install && npm run build` |
| Publish Directory | `client/dist` |
| Node Version | **22.x** |
| Env Vars | `VITE_API_URL=https://<myhome-server>.onrender.com` |
| Routes File | `_routes.json` in dist with SPA catch-all → `/index.html` |

---

## 4. Known Pitfalls — What to Avoid

| Trap | Why | Mitigation |
|------|-----|------------|
| **Node 24 fallback** | No prebuilt `better-sqlite3` binary; triggers node-gyp | Engines pin `"node": "22.x"` in root package.json |
| **Removing skipLibCheck** | Breaks Vite React plugin type resolution on production build | Keep it; TS7026 comes from cache corruption, not strict mode |
| **Rewriting SQLite layer** | Project intentionally uses `better-sqlite3` with local `.db` file | Ephemeral filesystem means data won't persist across restarts — document this; do NOT replace with Postgres/Redis unless explicitly requested |
| **Hard-coded port 3000 or localhost** | Render routes traffic via dynamic env var; rejects direct bind | Must use `process.env.PORT` and `0.0.0.0` |
| **Committing .env or *.db files** | Secrets leak; binary blobs bloat repo | Check `.gitignore`; verify with `git ls-files --others client/ server/ \| grep -E "\.env$|\.db$"` |
| **Static SPA 404 on refresh** | Client-side router paths don't exist as physical files | Add `_routes.json` with filesystem then catch-all rule |

---

## 5. Verification Steps (Complete BEFORE Sign-Off)

Run every command and confirm output matches expected result:

1. `cd /data/Projects/myhome_v2/myhome && git status --short` → **empty output**
2. `npm run build` in `client/` → **zero TS error lines, exit code 0**
3. Verify `"engines": {"node":"22.x"}` exists in root `package.json` → **present**
4. Verify `server/app.js` has `process.env.PORT` and `"0.0.0.0"` → **present**
5. Verify no TS6133 (unused import) errors remain → **zero**
6. Verify all TypeScript interfaces match their API consumers → **confirmed via build pass**
7. `git diff <tag-or-base> HEAD --stat` → ensure only intended files changed

---

## 6. Sign-Off Criteria — Do NOT Approve Deploy If:

- [ ] Any TS error present in `npm run build` output
- [ ] Node version pin missing from package.json
- [ ] Server app.js not listening on `0.0.0.0:PORT`
- [ ] Working tree has uncommitted changes
- [ ] Untracked `.env` or `*.db` files present in repo root or tracked

---

## 7. Output Format — Report to User Like This:

```markdown
=== RENDER READINESS REPORT ===
Node engine pin: ✅/❌ (details)
TSC compilation: ✅/❌ (N errors, N warnings)
Port binding: ✅/❌ (file:line)
better-sqlite3 compatible: ✅/❌ (version range, Node 22 support)
Build output clean: ✅/❌
Uncommitted changes: ✅/❌ (list if any)

CONCLUSION: READY / NOT READY for Render deployment
```

**Only say "READY" when all checks pass. Never skip a check.**

---

*Last updated: 2026-09-10 — based on current `main` branch state*
