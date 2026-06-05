# SDD Tasks: DashboardScreen — Real Binance Data

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~820 new + ~120 removed = ~700 net |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Backend: Tasks 1–3) → PR 2 (Frontend core: Tasks 4–5) → PR 3 (Components + Orchestrator + Tests: Tasks 6–9) |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

```text
Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High
```

**Rationale:** Backend adds ~560 new lines (types + auth + 2 services + route + integration tests). Frontend adds ~260 new component/hook lines + ~120 orchestrator rewrite + ~300 test lines. Total ~700 net new exceeds 400-line budget by ~75%. Recommend 3 stacked PRs with clear review boundaries.

---

## Dependency Graph

```
Task 1 ──► Task 2 ──► Task 3 ──┐
                                ├──► Task 4 ──► Task 5 ──┐
                                │                         ├──► Task 8 ──► Task 9
                                └──► Task 6 ──► Task 7 ──┘
```

Tasks 6 and 7 are parallel with Task 5; Task 8 depends on all prior frontend tasks.

---

## Task 1: Backend Types + Binance Auth Utils

**PR:** 1 | **Est. lines:** ~140 | **Dependencies:** None

### Scope
- Create `backend/src/types/binance.ts` — TypeScript interfaces for Binance API raw responses and mapped response types.
- Create `backend/src/utils/binanceAuth.ts` — HMAC-SHA256 signature builder and signed URL builder for Binance REST API.
- Create `backend/src/utils/__tests__/binanceAuth.test.ts` — Unit tests for `buildSignature` and `buildSignedUrl`.

### Files
| Action | File | Est. Lines |
|--------|------|-----------|
| CREATE | `backend/src/types/binance.ts` | ~70 |
| CREATE | `backend/src/utils/binanceAuth.ts` | ~45 |
| CREATE | `backend/src/utils/__tests__/binanceAuth.test.ts` | ~30 |

### Acceptance / Verification
- `backend/src/types/binance.ts` exports all interfaces from design §2.1 (`BinanceBalance`, `BinanceAccountResponse`, `BinanceTradeResponse`, `BinanceSnapshotResponse`, `DashboardBalance`, `DashboardTrade`, `DashboardEquityPoint`, `DashboardBotStatus`)
- `backend/src/utils/binanceAuth.ts` exports `buildSignature()` (pure function) and `buildSignedUrl()` (composes URL with timestamp + signature)
- `npm test` passes for `binanceAuth.test.ts` with known-input HMAC verification
- `buildSignature` produces correct HMAC-SHA256 hex digest for a known test vector
- `buildSignedUrl` includes `timestamp` and `signature` query params

### TDD (strict_tdd: true)
- RED: Write test first verifying `buildSignature('GET', '/api/v3/account', '', secret)` returns correct HMAC
- GREEN: Implement `buildSignature` in `binanceAuth.ts`
- REFACTOR: Add `buildSignedUrl` as composition over `buildSignature`

---

## Task 2: Backend Services (binanceService + dashboardService)

**PR:** 1 | **Est. lines:** ~290 | **Dependencies:** Task 1

### Scope
- Create `backend/src/services/binanceService.ts` — Low-level Binance API client with 3 methods (`getAccount`, `getMyTrades`, `getAccountSnapshot`). Uses Node.js native `https`, 15s timeout, Binance API key header.
- Create `backend/src/services/dashboardService.ts` — Orchestrator: fetches user's API keys via existing `keysService.getApiKeys`, calls 3 Binance endpoints in parallel via `Promise.allSettled`, maps responses to consolidated shape, computes `botStatus`.
- Create `backend/src/services/__tests__/binanceService.test.ts` — Unit tests with mocked HTTPS responses.
- Create `backend/src/services/__tests__/dashboardService.test.ts` — Unit tests with mocked `binanceService` and `keysService`.

### Files
| Action | File | Est. Lines |
|--------|------|-----------|
| CREATE | `backend/src/services/binanceService.ts` | ~80 |
| CREATE | `backend/src/services/dashboardService.ts` | ~130 |
| CREATE | `backend/src/services/__tests__/binanceService.test.ts` | ~40 |
| CREATE | `backend/src/services/__tests__/dashboardService.test.ts` | ~50 |

### Acceptance / Verification
- `binanceService.getAccount()` makes correct GET to `/api/v3/account` with `X-MBX-APIKEY` header and signed URL
- `binanceService.getMyTrades()` defaults to `symbol=BTCFDUSD` and `limit=20`
- `binanceService.getAccountSnapshot()` calls `/api/v3/accountSnapshot?type=SPOT`
- All 3 functions reject with `Error` on HTTP error or timeout
- `dashboardService.getDashboardSummary(userId)` returns `{ data, errors }` shape
- When all 3 Binance calls succeed, `errors` is empty and all data sections are populated
- When 1 call fails, returns partial data + `errors[]` with `source` and `message`
- When user has no API keys, returns `NO_API_KEYS` error, all data sections `null`, botStatus `active: false`
- Unwraps and decrypts keys via existing `keysService.getApiKeys`
- Filters out zero-balance assets from balance list
- Computes `botStatus.active = true` if keys exist (v1 simplification)
- Maps `accountSnapshot` snapshotVos to `EquityPoint[]` sorted by time ascending

### TDD
- RED: Write test for `binanceService.getAccount` mocking `https.get` — verify URL, headers, response parsing
- GREEN: Implement `binanceService.ts`
- RED: Write test for `dashboardService.getDashboardSummary` with all 3 mocked Binance responses
- GREEN: Implement `dashboardService.ts`
- REFACTOR: Add partial-failure tests (Promise.allSettled behavior)

---

## Task 3: Backend Route + Registration + Integration Tests

**PR:** 1 | **Est. lines:** ~150 | **Dependencies:** Task 2

### Scope
- Create `backend/src/routes/dashboard.ts` — `GET /api/dashboard/summary` with auth check, Zod schema (optional), calls `dashboardService`, returns JSON with `success`, `data`, optional `errors`.
- Modify `backend/src/index.ts` — Import and register `dashboardRoutes`.
- Create `backend/src/routes/__tests__/dashboard.test.ts` — Integration tests using `app.inject`.

### Files
| Action | File | Est. Lines |
|--------|------|-----------|
| CREATE | `backend/src/routes/dashboard.ts` | ~75 |
| MODIFY | `backend/src/index.ts` (+3 lines) | ~3 |
| CREATE | `backend/src/routes/__tests__/dashboard.test.ts` | ~70 |

### Acceptance / Verification
- `GET /api/dashboard/summary` returns 200 with correct `{ success: true, data: { balances, trades, equityHistory, botStatus } }` structure
- `?refresh=true` query param is accepted but no-op in v1 (reserved for future cache)
- Route uses `request.user.sub` for userId (existing auth plugin)
- Returns 401 when no auth token present
- Tests exercise all 3 response scenarios: full success, partial errors, no-API-keys
- `npm test` passes for `dashboard.test.ts`

### TDD
- RED: Write integration test expecting 401 without auth header
- GREEN: Implement route with auth check
- RED: Write integration test for 200 + full data
- GREEN: Wire up `dashboardService` and complete route
- REFACTOR: Add partial-error scenario test

---

## Task 4: Frontend Types + useDashboard Hook

**PR:** 2 | **Est. lines:** ~150 | **Dependencies:** Task 3 (response shape contract)

### Scope
- Append dashboard API response types to `src/types/index.ts` — `DashboardBalance`, `DashboardTrade`, `DashboardEquityPoint`, `DashboardBotStatus`, `DashboardError`, `DashboardSummaryResponse`.
- Create `src/hooks/useDashboard.ts` — Fetch hook with `loading`, `data`, `errors`, `error` (fatal), `refetch()`. Uses `useAuth` for session token, fetches from `${API_BASE}/api/dashboard/summary`.
- Create `src/hooks/__tests__/useDashboard.test.ts` — Unit tests with mocked `fetch`.

### Files
| Action | File | Est. Lines |
|--------|------|-----------|
| MODIFY | `src/types/index.ts` (append ~45 lines) | ~45 |
| CREATE | `src/hooks/useDashboard.ts` | ~65 |
| CREATE | `src/hooks/__tests__/useDashboard.test.ts` | ~40 |

### Acceptance / Verification
- `DashboardSummaryResponse` type matches the backend response contract from Tasks 1–3
- `useDashboard()` returns `{ data, errors, loading, error, refetch }` on mount
- Loading state: `loading === true`, `data === null`
- Success: `loading === false`, `data` populated, `errors` contains partial errors if any
- 401 response: `error` contains "Authentication expired" message
- Network failure: `error` populated with error message
- `refetch()` triggers a new fetch and updates state
- `npm test` passes (frontend test suite)

---

## Task 5: OnboardingBanner Component

**PR:** 2 | **Est. lines:** ~100 | **Dependencies:** None (independent of backend)

### Scope
- Create `src/components/dashboard/OnboardingBanner.tsx` — Extracted from current `DashboardScreen` inline JSX. Props: `has2FA`, `hasApiKeys`, `loading`. Local state: `dismissed`. Renders green "Todo listo" when complete, dismissible gradient banner when incomplete, nothing when loading.
- Create `src/components/dashboard/__tests__/OnboardingBanner.test.tsx` — Renders 3 states (complete, incomplete, loading).

### Files
| Action | File | Est. Lines |
|--------|------|-----------|
| CREATE | `src/components/dashboard/OnboardingBanner.tsx` | ~75 |
| CREATE | `src/components/dashboard/__tests__/OnboardingBanner.test.tsx` | ~30 |

### Acceptance / Verification
- Loading → renders nothing (`null`)
- `has2FA && hasApiKeys` → green banner with "Todo listo" text
- `!has2FA || !hasApiKeys` → gradient banner with step buttons and dismiss button
- `dismissed` state persists locally; dismissed banner returns `null`
- Step buttons navigate to `/2fa-setup` or `/connect` via `useNavigate`
- All existing functionality preserved from current inline banner

---

## Task 6: KPIGrid Component

**PR:** 2 | **Est. lines:** ~80 | **Dependencies:** None

### Scope
- Create `src/components/dashboard/KPIGrid.tsx` — Props: `initialBalance`, `currentBalance`. Computes `grossProfit`, `performance`, `pendingFee` internally. Renders 5 `KPICard` items with format and conditional colors.
- Create `src/components/dashboard/__tests__/KPIGrid.test.tsx` — Verify computation and rendering.

### Files
| Action | File | Est. Lines |
|--------|------|-----------|
| CREATE | `src/components/dashboard/KPIGrid.tsx` | ~55 |
| CREATE | `src/components/dashboard/__tests__/KPIGrid.test.tsx` | ~25 |

### Acceptance / Verification
- Renders 5 KPICards: Initial Balance, Current Balance, Net Profit, Performance, Pending Fee
- Computes `grossProfit = currentBalance - initialBalance` correctly
- Computes `performance = (grossProfit / initialBalance * 100).toFixed(2)` correctly
- Computes `pendingFee = grossProfit * 0.07` correctly
- Handles `initialBalance = 0` (no division by zero; performance shows "0.00")
- `changePositive` is derived from `grossProfit >= 0` (not hardcoded `true`)

---

## Task 7: EquityChart + BotStatusPanel Components

**PR:** 3 | **Est. lines:** ~180 | **Dependencies:** None

### Scope
- Create `src/components/dashboard/EquityChart.tsx` — Area chart using Recharts with period selector buttons (1D/1W/1M/3M/ALL), reference line for initial balance, gradient fill, responsive container.
- Create `src/components/dashboard/BotStatusPanel.tsx` — Bot status indicator with badge (active/paused/error), running since, strategy, action buttons (toggle, risk settings, withdraw). Props: `botStatus`, `runningSince`, `strategy`, `onToggleBot`, `onWithdraw`, `onRiskSettings`.
- Create `src/components/dashboard/__tests__/EquityChart.test.tsx` — Renders chart with data points; period buttons toggle active state.
- Create `src/components/dashboard/__tests__/BotStatusPanel.test.tsx` — Badge variant for each status; toggle button calls callback.

### Files
| Action | File | Est. Lines |
|--------|------|-----------|
| CREATE | `src/components/dashboard/EquityChart.tsx` | ~75 |
| CREATE | `src/components/dashboard/BotStatusPanel.tsx` | ~65 |
| CREATE | `src/components/dashboard/__tests__/EquityChart.test.tsx` | ~20 |
| CREATE | `src/components/dashboard/__tests__/BotStatusPanel.test.tsx` | ~20 |

### Acceptance / Verification
- EquityChart renders `ResponsiveContainer` > `AreaChart` with data from props
- Period buttons toggle `selectedPeriod` state; active period button has `bg-teal-600` class
- Reference line at `initialBalance` value shown
- Data filtering by period is stubbed (v1 shows all data; future: filter)
- BotStatusPanel shows correct badge variant: `success` for active, `warning` for paused, `danger` for error
- "Running since" shows `runningSince` value or em-dash when null
- "Pause Bot" label shown when active, "Resume Bot" when paused/error
- `onToggleBot` called on toggle button click
- `onWithdraw` called on withdraw button click
- `onRiskSettings` called on risk settings button click

---

## Task 8: RecentTradesTable + DashboardScreen Orchestrator

**PR:** 3 | **Est. lines:** ~220 | **Dependencies:** Tasks 4, 5, 6, 7

### Scope
- Create `src/components/dashboard/RecentTradesTable.tsx` — Table with columns: Date, Pair, Type (BUY/SELL badge), Amount, Price (hidden sm), Quote Qty, Status. Empty state when `trades=[]`. Date formatted from Unix ms.
- Create `src/components/dashboard/__tests__/RecentTradesTable.test.tsx` — Renders rows with BUY/SELL badges; empty state.
- Rewrite `src/screens/DashboardScreen.tsx` — Thin orchestrator using `useDashboard` + `useAuth` + `useTrading` (for `toggleBot` only). Imports all 5 sub-components. Renders: error alerts, onboarding banner, loading skeleton, KPIGrid, EquityChart + BotStatusPanel side-by-side, RecentTradesTable, trust reminder alert, WithdrawModal.

### Files
| Action | File | Est. Lines |
|--------|------|-----------|
| CREATE | `src/components/dashboard/RecentTradesTable.tsx` | ~75 |
| CREATE | `src/components/dashboard/__tests__/RecentTradesTable.test.tsx` | ~30 |
| MODIFY | `src/screens/DashboardScreen.tsx` (full rewrite) | ~120 (replaces ~240) |

### Acceptance / Verification
- RecentTradesTable renders header row with all columns
- `pair` derived from `trade.symbol` (e.g., `BTCFDUSD` → `BTC/FDUSD`)
- `type` rendered as BUY (info badge) when `isBuyer=true`, SELL (warning badge) when `isBuyer=false`
- Date formatted from `trade.time` (Unix ms) to readable format
- Empty state: shows "No trades found for BTC/FDUSD."
- Balance column replaced with Quote Qty (P&L column removed — Binance doesn't provide it)
- `npm test` passes

### DashboardScreen Orchestrator Behavior
- Uses `useDashboard()` for data fetching (replaces `useTrading` for data)
- Still imports `useTrading` only for `toggleBot` (mutates local bot state — future PR can route through backend)
- Computes `initialBalance` from `equityHistory[0].value` (fallback to FDUSD balance)
- Computes `currentBalance` as FDUSD free + locked from Binance balances
- Fatal error (`error` from `useDashboard`) → red `Alert` with retry button
- Partial errors (`errors[]`) → yellow `Alert` listing source + message per failure
- Loading state → 5 pulsing skeleton placeholders
- All inline JSX from current `DashboardScreen` replaced with imported sub-components
- No direct reference to `mockAccount`, `mockTrades`, or `equityData`

---

## Task 9: Update DashboardScreen Integration Tests

**PR:** 3 | **Est. lines:** ~110 | **Dependencies:** Task 8

### Scope
- Rewrite `src/screens/__tests__/DashboardScreen.test.tsx` — Update mocks from `useTrading` to `useDashboard` + `useAuth`. Test orchestrator behavior: renders all sub-components when data available, shows error alert on fetch failure, shows partial error alerts, loading skeleton, onboarding banner with `has2FA`/`hasApiKeys` states.

### Files
| Action | File | Est. Lines |
|--------|------|-----------|
| MODIFY | `src/screens/__tests__/DashboardScreen.test.tsx` (rewrite) | ~110 (replaces ~257) |

### Test Cases
| # | Test | Type |
|---|------|------|
| F1 | Renders all 5 sub-components when data is available | Integration |
| F2 | Shows loading skeleton when `loading=true` and `data=null` | Integration |
| F3 | Shows fatal error alert on fetch failure with retry button | Integration |
| F4 | Shows partial error alerts when `errors` array is non-empty | Integration |
| F5 | Shows onboarding banner based on `has2FA`/`hasApiKeys` props | Integration |
| F6 | Withdraw modal opens on button click | Integration |
| F7 | Bot toggle button calls `toggleBot` from `useTrading` | Integration |

### Acceptance / Verification
- All existing test coverage preserved or improved
- Mocks `useDashboard` with `jest.mock` returning `{ data, errors, loading, error, refetch }`
- Mocks `useAuth` for `onboarding` state
- Mocks `useTrading` for `toggleBot` only
- `npm test` passes for `DashboardScreen.test.tsx`
- Coverage maintained at or above current levels (77.27% lines frontend)
