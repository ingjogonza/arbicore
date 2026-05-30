# SDD Tasks: Sistema de Autenticación y Gestión de Claves API

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~800 total (PR1: ~250, PR2: ~350, PR3: ~200) |
| 400-line budget risk | High (total), Low per-PR |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 (frontend auth → backend API → mTLS robot) |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

```text
Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High
```

---

## Environment Setup Tasks (Before any PR)

| Task | Description | Done When |
|------|-------------|-----------|
| **E1** | Create Supabase project and copy `URL` + `anon key` + `service role key` | `.env` vars available |
| **E2** | Create `public.profiles` table with trigger in Supabase SQL Editor | Trigger visible in Database → Triggers |
| **E3** | Enable Email confirmations in Supabase Auth settings | Auth → Providers → Email → Confirm email ON |
| **E4** | Install and start MongoDB locally or get Atlas URI | `mongod` running or Atlas connection string ready |
| **E5** | Generate `MASTER_KEY` with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` | Key copied to secure password manager |

---

## PR 1: Frontend Auth Foundation

**Goal:** Users can register, verify email, login, logout. Protected routes active.
**Estimated lines:** ~250
**Risk:** Low-Medium

### Tasks

| ID | Description | Files (create/modify) | Est. Lines | BlockedBy |
|----|-------------|----------------------|------------|-----------|
| **T1.1** | Install `@supabase/supabase-js` and add env vars to `.env.example` | `package.json` (mod), `.env.example` (mod) | 5 | E1 |
| **T1.2** | Create `src/lib/supabase.ts` — Supabase client singleton reading Vite env vars | `src/lib/supabase.ts` (new) | 15 | T1.1 |
| **T1.3** | Add auth types to `src/types/index.ts` — `User`, `Session`, `RegisterData`, `AuthState` | `src/types/index.ts` (mod) | 25 | — |
| **T1.4** | Create `src/contexts/AuthContext.tsx` — state, `login()`, `register()`, `logout()`, `resendVerification()`, `onAuthStateChange` listener, session recovery on mount | `src/contexts/AuthContext.tsx` (new) | 120 | T1.2, T1.3 |
| **T1.5** | Create `src/components/ProtectedRoute.tsx` — reads `AuthContext`, redirects unauthenticated to `/login`, renders `<Outlet>` if authenticated | `src/components/ProtectedRoute.tsx` (new) | 25 | T1.4 |
| **T1.6** | Create `src/screens/LoginScreen.tsx` — email/password form, loading states, error display, link to `/register` | `src/screens/LoginScreen.tsx` (new) | 80 | T1.3, T1.4 |
| **T1.7** | Create `src/screens/RegisterScreen.tsx` — form with firstName, lastName, email, password, 4 legal doc checkboxes with links, validation, calls `register()` then redirects to `/verify-email` | `src/screens/RegisterScreen.tsx` (new) | 120 | T1.3, T1.4 |
| **T1.8** | Create `src/screens/VerifyEmailScreen.tsx` — message + resend button + link to `/login` | `src/screens/VerifyEmailScreen.tsx` (new) | 40 | T1.4 |
| **T1.9** | Modify `src/App.tsx` — wrap routes with `AuthProvider`, add `/login`, `/register`, `/verify-email`, wrap protected routes with `ProtectedRoute` | `src/App.tsx` (mod) | 40 | T1.4, T1.5 |
| **T1.10** | Modify `src/screens/OnboardingScreen.tsx` — add "Iniciar sesión" / "Crear cuenta" buttons replacing or supplementing existing CTA | `src/screens/OnboardingScreen.tsx` (mod) | 20 | — |
| **T1.11** | Modify `src/components/layout/TopBar.tsx` — show user avatar/name, add logout button calling `logout()` from `AuthContext` | `src/components/layout/TopBar.tsx` (mod) | 25 | T1.4 |
| **T1.12** | Modify `src/hooks/useTrading.tsx` — replace `mockUser` with `useAuth()` user reference; keep mock trades/account data until backend integration | `src/hooks/useTrading.tsx` (mod) | 20 | T1.4 |

### Acceptance Criteria PR 1

- [ ] User can navigate from `/` to `/register`, fill form with 4 legal docs checked, submit
- [ ] Supabase Auth creates user with `first_name` and `last_name` in `raw_user_meta_data`
- [ ] `public.profiles` row auto-created by trigger with names
- [ ] Verification email arrives (check Supabase logs if needed)
- [ ] After register, user lands on `/verify-email`
- [ ] User can resend verification email from `/verify-email`
- [ ] After clicking verification link, user can login at `/login`
- [ ] Login with unverified email shows error + resend option
- [ ] Login with verified email redirects to `/dashboard`
- [ ] Dashboard displays real user email/name from Supabase
- [ ] Logout button clears session and redirects to `/`
- [ ] Navigating directly to `/dashboard` without session redirects to `/login`
- [ ] No mock user data is used when real auth state is available

### Testing Tasks PR 1

| ID | Test | How |
|----|------|-----|
| **T1.T1** | Register form validation | Frontend-only: attempt submit without all 4 checkboxes → error message |
| **T1.T2** | Auth state persistence | Refresh page after login → `getSession()` recovers session, still logged in |
| **T1.T3** | Route guards | Direct navigation to `/dashboard` without auth → redirects to `/login` |
| **T1.T4** | Logout flow | Click logout → `onAuthStateChange` fires `SIGNED_OUT`, redirects to `/` |

---

## PR 2: Backend Core API

**Goal:** Fastify server runs. Users can store API keys and accept legal docs. JWT verification working.
**Estimated lines:** ~350
**Risk:** Medium-High (encryption, JWT verification)

### Tasks

| ID | Description | Files (create/modify) | Est. Lines | BlockedBy |
|----|-------------|----------------------|------------|-----------|
| **T2.1** | Create `backend/` folder, init npm, install deps (`fastify`, `@fastify/cors`, `mongodb`, `dotenv`, `zod`, `typescript`, `@types/node`, `ts-node`, `nodemon`) | `backend/package.json` (new) | 35 | E4 |
| **T2.2** | Create `backend/tsconfig.json` — Node + strict TypeScript | `backend/tsconfig.json` (new) | 25 | T2.1 |
| **T2.3** | Create `backend/.env.example` — document all env vars with comments | `backend/.env.example` (new) | 30 | — |
| **T2.4** | Create `backend/src/types/index.ts` — `ApiKeyDoc`, `LegalDocRecord`, `UserProfileCache`, `StoreKeysBody`, request.user augmentation | `backend/src/types/index.ts` (new) | 40 | — |
| **T2.5** | Create `backend/src/utils/errors.ts` — `ApiError`, `UnauthorizedError`, `ValidationError`, `NotFoundError`, `ConflictError` + Fastify error handler setup | `backend/src/utils/errors.ts` (new) | 45 | — |
| **T2.6** | Create `backend/src/config/env.ts` — Zod validation for `PORT`, `ROBOT_PORT`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `MONGODB_URI`, `MASTER_KEY`, cert paths | `backend/src/config/env.ts` (new) | 40 | T2.3 |
| **T2.7** | Create `backend/src/config/database.ts` — MongoDB client singleton, connection/disconnection with `pino` logging | `backend/src/config/database.ts` (new) | 30 | T2.1, T2.6 |
| **T2.8** | Create `backend/src/config/supabase.ts` — Supabase admin client (`@supabase/supabase-js` with service role key) | `backend/src/config/supabase.ts` (new) | 15 | T2.6 |
| **T2.9** | Create `backend/src/plugins/cors.ts` — CORS plugin allowing frontend origin (`localhost:5173` in dev) | `backend/src/plugins/cors.ts` (new) | 15 | T2.1 |
| **T2.10** | Create `backend/src/plugins/auth.ts` — `verifySupabaseJWT` hook: extract `Authorization: Bearer`, call `supabaseAdmin.auth.getUser(token)`, attach `request.user = {userId, email}`, throw `UnauthorizedError` on failure | `backend/src/plugins/auth.ts` (new) | 35 | T2.8, T2.5 |
| **T2.11** | Create `backend/src/services/encryption.ts` — `deriveKey()` (base64 decode or scryptSync fallback), `encrypt()`, `decrypt()` with AES-256-GCM, `EncryptedData` interface | `backend/src/services/encryption.ts` (new) | 50 | T2.6 |
| **T2.12** | Create `backend/src/services/keysService.ts` — `storeKeys(userId, apiKey, secretKey)` → encrypt, upsert to `apiKeys` collection; `getKeys(userId)` → find one; MongoDB indexes setup | `backend/src/services/keysService.ts` (new) | 50 | T2.7, T2.11 |
| **T2.13** | Create `backend/src/services/legalDocsService.ts` — `acceptDocuments(userId, docs[])` → insert to `legalDocuments`; `getDocuments(userId)` → find one | `backend/src/services/legalDocsService.ts` (new) | 40 | T2.7 |
| **T2.14** | Create `backend/src/routes/keys.ts` — `POST /api/keys` handler: apply `preValidation` auth hook, validate body, call `keysService.storeKeys()`, return 201 | `backend/src/routes/keys.ts` (new) | 45 | T2.10, T2.12 |
| **T2.15** | Create `backend/src/routes/legalDocs.ts` — `POST /api/legal-docs` (accept docs) + `GET /api/legal-docs/:userId` (check acceptance), both with auth hook | `backend/src/routes/legalDocs.ts` (new) | 50 | T2.10, T2.13 |
| **T2.16** | Create `backend/src/routes/health.ts` — `GET /health` simple health check | `backend/src/routes/health.ts` (new) | 10 | — |
| **T2.17** | Create `backend/src/index.ts` — bootstrap Fastify public server (port 3000), register CORS, register routes, global error handler, start listening | `backend/src/index.ts` (new) | 50 | T2.9, T2.10, T2.14, T2.15, T2.16 |
| **T2.18** | Modify `src/screens/ConnectScreen.tsx` — send Binance keys to `POST /api/keys` with `Authorization: Bearer` header instead of local state | `src/screens/ConnectScreen.tsx` (mod) | 30 | T1.4, T2.14 |
| **T2.19** | Modify `.gitignore` — add `backend/.env`, `backend/certs/*.pem`, `*.key` | `.gitignore` (mod) | 5 | — |

### Acceptance Criteria PR 2

- [ ] `npm run dev` in `backend/` starts server on port 3000
- [ ] `GET /health` returns 200
- [ ] `POST /api/keys` without `Authorization` header → 401
- [ ] `POST /api/keys` with valid JWT but empty body → 400
- [ ] `POST /api/keys` with valid JWT and valid keys → 201, record exists in MongoDB `apiKeys` collection
- [ ] Stored record has `encryptedSecret`, `iv`, `authTag` — no `secretKey` in plaintext in DB
- [ ] `POST /api/legal-docs` with valid JWT → 201, record in MongoDB `legalDocuments`
- [ ] `GET /api/legal-docs/:userId` with valid JWT → 200 with documents array
- [ ] Frontend ConnectScreen sends keys to backend on submit
- [ ] Encryption roundtrip: encrypt → decrypt → original secret matches input
- [ ] `MASTER_KEY` never logged, never in source code, only in `.env`
- [ ] Logs contain userId and route but never contain secret keys, master key, or JWT tokens

### Testing Tasks PR 2

| ID | Test | How |
|----|------|-----|
| **T2.T1** | Auth middleware | Request with fake JWT → 401; valid JWT → passes with `request.user` set |
| **T2.T2** | Encryption roundtrip | Unit test: `decrypt(encrypt('test-secret')) === 'test-secret'` |
| **T2.T3** | Keys storage | POST keys → query MongoDB directly → verify `encryptedSecret` exists, no plaintext secret |
| **T2.T4** | Keys retrieval | Call `keysService.getKeys()` → returns document with all fields |
| **T2.T5** | Legal docs CRUD | POST docs → GET docs → verify `acceptedAll: true` |
| **T2.T6** | Validation | POST empty body → 400; POST invalid key (too short) → 400 |

---

## PR 3: mTLS + Robot Endpoint

**Goal:** Robot can fetch decrypted keys via mTLS. Certificate infrastructure ready.
**Estimated lines:** ~200
**Risk:** High (mTLS configuration, certificate generation)

### Tasks

| ID | Description | Files (create/modify) | Est. Lines | BlockedBy |
|----|-------------|----------------------|------------|-----------|
| **T3.1** | Create `backend/scripts/generate-certs.sh` — OpenSSL script generating CA key/cert, server key/cert (with SAN), robot client key/cert, cleanup | `backend/scripts/generate-certs.sh` (new) | 50 | — |
| **T3.2** | Run `generate-certs.sh` and verify `backend/certs/` contains `ca-cert.pem`, `ca-key.pem`, `server-cert.pem`, `server-key.pem`, `robot-cert.pem`, `robot-key.pem` | `backend/certs/` (new, gitignored) | — | T3.1 |
| **T3.3** | Create `backend/src/plugins/mtls.ts` — `createRobotServer()` factory returning Fastify with `https` options (`key`, `cert`, `ca`, `requestCert: true`, `rejectUnauthorized: true`) | `backend/src/plugins/mtls.ts` (new) | 30 | T3.2 |
| **T3.4** | Create `backend/src/routes/robotKeys.ts` — `GET /api/keys/:userId` handler: NO auth hook (identity is mTLS cert), lookup MongoDB, decrypt secret, return `{apiKey, secretKey}`; 404 if no keys | `backend/src/routes/robotKeys.ts` (new) | 40 | T2.12, T3.3 |
| **T3.5** | Modify `backend/src/index.ts` — import `createRobotServer`, register `robotKeys` route, start robot server on `ROBOT_PORT` (3001) alongside public server | `backend/src/index.ts` (mod) | 30 | T2.17, T3.3, T3.4 |
| **T3.6** | Modify `backend/.env.example` — add `ROBOT_PORT`, `SERVER_KEY_PATH`, `SERVER_CERT_PATH`, `CA_CERT_PATH` | `backend/.env.example` (mod) | 5 | T3.1 |
| **T3.7** | Create `backend/scripts/test-robot.sh` — curl command with client cert to test mTLS endpoint | `backend/scripts/test-robot.sh` (new) | 20 | T3.4 |
| **T3.8** | Verify mTLS rejection: attempt curl without client cert → TLS handshake fails (connection refused/reset) | — | — | T3.5, T3.7 |
| **T3.9** | Verify mTLS success: curl with valid client cert → returns `{apiKey, secretKey}` matching original input | — | — | T3.5, T3.7 |

### Acceptance Criteria PR 3

- [ ] `backend/certs/` contains all 6 PEM files after running script
- [ ] `generate-certs.sh` is executable and idempotent (rerunning regenerates)
- [ ] Robot server starts on port 3001 alongside public server on port 3000
- [ ] `curl` to `https://localhost:3001/api/keys/:userId` without cert → TLS handshake failure
- [ ] `curl` with `--cert robot-cert.pem --key robot-key.pem --cacert ca-cert.pem` → 200 with keys
- [ ] Decrypted `secretKey` in response matches the original secret stored by user
- [ ] Endpoint returns 404 for userId that never stored keys
- [ ] No JWT or session auth required on robot endpoint (only mTLS)
- [ ] Certificate expiry dates are 365 days (configurable in script)

### Testing Tasks PR 3

| ID | Test | How |
|----|------|-----|
| **T3.T1** | mTLS rejection | `curl` without certs → verify connection fails before HTTP layer |
| **T3.T2** | mTLS acceptance | `curl` with robot certs → 200 + valid JSON |
| **T3.T3** | Decryption integrity | Compare returned `secretKey` with original input → exact match |
| **T3.T4** | Missing keys | Request for random `userId` → 404 |
| **T3.T5** | Expired cert scenario | Document: cert expiry is 365 days; renewal process needed |

---

## Risk Flags

| Task | Risk Level | Mitigation |
|------|------------|------------|
| **T1.4** (AuthContext) | Medium | `onAuthStateChange` must not cause infinite re-renders. Use `useEffect` with cleanup. |
| **T1.7** (RegisterScreen) | Low | Legal doc checkboxes must all be checked before submit. Simple validation. |
| **T2.10** (JWT verify) | High | `supabase.auth.getUser()` is network call — handle timeouts, retries, cache JWKS if needed later. |
| **T2.11** (Encryption) | High | Must use AES-256-GCM (not CBC). Must store `authTag`. Must not leak master key. |
| **T2.12** (KeysService) | High | Never log secretKey or masterKey. Use structured logging with allowlist. |
| **T3.3** (mTLS plugin) | High | `rejectUnauthorized: true` is mandatory. Test with invalid cert to confirm rejection. |
| **T3.4** (Robot endpoint) | Medium | No auth hook = only mTLS protects it. Confirm no accidental `preValidation` registration. |
| **T3.1** (Cert script) | Low | Must run on Linux/macOS/WSL. Windows native needs OpenSSL installed. Document prerequisite. |

---

## Cross-PR Dependencies

```
E1-E5 (env setup)
  → PR 1 (all T1.* tasks parallel after T1.3/T1.4 base)
    → T1.4 blocks most PR1 tasks
    → PR1 completes → PR2 can start
      → T2.10 blocks T2.14, T2.15
      → T2.11 blocks T2.12
      → T2.12 blocks T2.14, T3.4
      → PR2 completes → PR3 can start
        → T3.2 blocks T3.3
        → T3.3 blocks T3.4, T3.5
        → T3.4 blocks T3.7, T3.8, T3.9
```

---

## Rollback Plan

| PR | Rollback Steps |
|----|---------------|
| **PR 3** | Stop robot server, revert `index.ts` changes, delete `robotKeys.ts`, `mtls.ts`, cert files |
| **PR 2** | Stop backend server, delete `backend/` folder, revert ConnectScreen changes, revert `.gitignore` |
| **PR 1** | Revert `package.json` (remove `@supabase/supabase-js`), revert all modified frontend files to pre-auth state, delete new auth files |

---

## Notes for Apply Phase

- **Strict TDD is OFF** in `openspec/config.yaml`. Write tests after implementation or alongside, not strictly before.
- **Modern web guidance** should be consulted before implementing frontend auth forms (checkbox patterns, form validation UX).
- Each PR should be **self-contained and reviewable independently**.
- After each PR merge, update `openspec/sdd-auth-system/apply-progress.md` with completion status.
