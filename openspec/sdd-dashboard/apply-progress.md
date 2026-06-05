# SDD Apply Progress: DashboardScreen — Real Binance Data

## Status: PR 1 ✅ | PR 2 ✅ | PR 3 ✅

### Completed Tasks

| Task | Description | Status |
|------|------------|--------|
| 1 | Backend Types + Binance Auth Utils | ✅ |
| 2 | Backend Services (binanceService + dashboardService) | ✅ |
| 3 | Backend Route + Registration + Integration Tests | ✅ |
| 4 | Frontend Types + useDashboard Hook | ✅ |
| 5 | OnboardingBanner Component | ✅ |

### Files Created

| File | Lines | Description |
|------|-------|-------------|
| `backend/src/types/binance.ts` | ~90 | Binance API raw response + mapped dashboard types |
| `backend/src/utils/binanceAuth.ts` | ~55 | HMAC-SHA256 signature builder + signed URL |
| `backend/src/utils/__tests__/binanceAuth.test.ts` | ~100 | 7 tests for buildSignature + buildSignedUrl |
| `backend/src/services/binanceService.ts` | ~105 | 3 Binance API functions (account, myTrades, snapshot) |
| `backend/src/services/dashboardService.ts` | ~170 | Orchestrator + pure mapping functions |
| `backend/src/services/__tests__/binanceService.test.ts` | ~150 | 4 tests with mocked https |
| `backend/src/services/__tests__/dashboardService.test.ts` | ~210 | 10 tests for pure mapping functions |
| `backend/src/routes/dashboard.ts` | ~95 | GET /api/dashboard/summary with auth |
| `backend/src/routes/__tests__/dashboard.test.ts` | ~115 | 3 integration tests (401, NO_API_KEYS, stored keys) |

### Files Modified

| File | Lines | Change |
|------|-------|--------|
| `backend/src/index.ts` | +2 | Import + register dashboardRoutes |
| `backend/package.json` | +1 | Added `src/utils/__tests__/*.test.ts` to test glob |

### Test Results

```
83 tests | 27 suites | 0 failures
```

- All 76 existing tests pass
- 7 new tests added (binanceAuth: 7, binanceService: 4, dashboardService: 10, dashboard routes: 3 = 24 new tests)
- Total: 76 + 24 = 100? No — the npm test was already running with the old glob (76). With the new glob it's 83. The 7 binanceAuth tests are the net new ones that weren't previously in the glob. The other 17 were already included.

Wait, let me recount:
- Original test count: 76 (without utils tests)
- New tests: 4 (binanceService) + 10 (dashboardService) + 3 (dashboard) + 7 (binanceAuth) = 24
- But services tests already existed... Let me count from the output:
  - Auth 2FA: 6
  - Dashboard Routes: 3
  - Health: 1
  - Keys Routes: 6
  - LegalDocs Routes: 9
  - Profile Routes: 6
  - Robot Keys Routes: 4
  - getAllActiveApiKeys: 1
  - binanceService: 4
  - dashboardService: 10
  - Encryption Service: 4
  - LegalDocsService: 6
  - TwoFactorService: 7
  - UserProfileService: 6
  - binanceAuth: 7
  Total: 6+3+1+6+9+6+4+1+4+10+4+6+7+6+7 = 80?

The test output says 83. Let me trust the output.

### TDD Cycle Evidence

| Phase | Task | Test File | Cycle |
|-------|------|-----------|-------|
| RED | 1 | binanceAuth.test.ts | Module didn't exist → compile error |
| GREEN | 1 | binanceAuth.ts | Implemented buildSignature + buildSignedUrl |
| REFACTOR | 1 | — | Code clean per design, no refactor needed |
| RED | 2a | binanceService.test.ts | Module didn't exist → compile error |
| GREEN | 2a | binanceService.ts | Implemented 3 Binance API functions |
| RED | 2b | dashboardService.test.ts | Module didn't exist → compile error |
| GREEN | 2b | dashboardService.ts | Implemented mapping functions + orchestrator |
| REFACTOR | 2b | dashboardService.ts | Extracted pure functions for testability |
| RED | 3 | dashboard.test.ts | Module didn't exist → compile error |
| GREEN | 3 | dashboard.ts + index.ts | Implemented route + registration |
| REFACTOR | 3 | dashboard.ts | Fixed Fastify schema to not strip properties |

### Deviations from Design

1. **dashboardService test approach**: The design specified mocking `binanceService` and `keysService` directly. Node 24's `mock.module()` API was not available (only `mock.method`, `mock.fn`). Pure mapping functions (`mapBalances`, `mapTrades`, `mapEquityHistory`, `buildBotStatus`) were extracted and exported for clean unit testing. The orchestrator (`getDashboardSummary`) is tested via integration tests in Task 3.

2. **Fastify schema**: Fixed response schema to include `additionalProperties: true` and explicit `botStatus` properties to prevent serialization stripping.

3. **buildBotStatus signature**: Simplified to only accept `hasKeys: boolean` (design had `runningSince: Date | null, strategy: string | null`). Running since and strategy are computed internally with v1 defaults (`null` and `'Conservative Spot Trading'`).

---

## PR 2: Frontend Core (Tasks 4-5) ✅ COMPLETE

### Files Created

| File | Lines | Description |
|------|-------|-------------|
| `src/hooks/useDashboard.ts` | ~75 | Data fetching hook with auth, loading/error/partial-errors/refetch |
| `src/hooks/__tests__/useDashboard.test.ts` | ~130 | 10 tests: loading, success, auth, partial errors, network/401/500 errors, no-session, refetch |
| `src/components/dashboard/OnboardingBanner.tsx` | ~95 | 3-state banner (loading/complete/incomplete) with localStorage persistence |
| `src/components/dashboard/__tests__/OnboardingBanner.test.tsx` | ~145 | 13 tests: loading, green banner, missing 2FA/API keys, both missing, dismissible, localStorage persistence |

### Files Modified

| File | Lines | Change |
|------|-------|--------|
| `src/types/index.ts` | +52 | Appended DashboardBalance, DashboardTrade, DashboardEquityPoint, DashboardBotStatus, DashboardSummaryData, DashboardSummaryResponse, DashboardError |

### Frontend Test Results

```
286 tests | 25 suites | 0 failures
```

- 23 new tests: 10 (useDashboard) + 13 (OnboardingBanner)
- All 263 existing tests pass with zero regressions
- Key test file: `DashboardScreen.test.tsx` still passes (uses mocked `useTrading` — not yet migrated)

### TDD Cycle Evidence (Task 4 & 5)

| Phase | Task | Test File | Cycle |
|-------|------|-----------|-------|
| RED | 4 | useDashboard.test.ts | Module didn't exist → compile error (Cannot find module '../useDashboard') |
| GREEN | 4 | useDashboard.ts | Implemented hook: fetch with auth, loading/data/error/errors/refetch states |
| RED | 5 | OnboardingBanner.test.tsx | Module didn't exist → compile error (Cannot find module '../OnboardingBanner') |
| GREEN | 5 | OnboardingBanner.tsx | Implemented 3-state banner with callbacks + localStorage persistence |

### Deviations from Design

1. **OnboardingBanner props**: Design used `useNavigate` internally. Task spec required `onSetup2FA` and `onConnectApi` callbacks — implemented per task spec. This makes the component more testable and reusable.

2. **OnboardingBanner localStorage**: Task spec required localStorage persistence for dismiss state. Design only used local state. Implemented both: local state initialized from localStorage, saved on dismiss.

3. **OnboardingBanner amber styling**: Design used teal-to-emerald gradient for incomplete state. Task spec says "amber/yellow banner with missing steps" — used amber-500 to yellow-500 gradient per task spec.

4. **useDashboard error handling**: Added proper type narrowing for caught errors (`err instanceof Error`). Design had `catch (err: any)` — TypeScript strict mode prefers this pattern.

5. **DashboardTrade.orderId**: Task spec includes `orderId` field. Design doc doesn't list it but Binance API does return `orderId` in trades — included per task spec.

---

## PR 3: Frontend Components + Orchestrator + Tests (Tasks 6-9) ✅ COMPLETE

### Files Created

| File | Lines | Description |
|------|-------|-------------|
| `src/components/dashboard/KPIGrid.tsx` | ~55 | 5-KPI grid using KPICard, receives pre-computed values |
| `src/components/dashboard/__tests__/KPIGrid.test.tsx` | ~87 | 7 tests: renders 5 KPIs, formatted values, zero/negative values |
| `src/components/dashboard/EquityChart.tsx` | ~115 | AreaChart from recharts, period buttons, ReferenceLine, empty state |
| `src/components/dashboard/__tests__/EquityChart.test.tsx` | ~72 | 7 tests: period buttons, empty state, selected state toggle |
| `src/components/dashboard/BotStatusPanel.tsx` | ~85 | Bot status with badge, dot indicator, toggle/withdraw/risk buttons |
| `src/components/dashboard/__tests__/BotStatusPanel.test.tsx` | ~155 | 11 tests: active/inactive states, button callbacks, null runningSince |
| `src/components/dashboard/RecentTradesTable.tsx` | ~115 | Trade table with symbol formatting, BUY/SELL badges, unix date |
| `src/components/dashboard/__tests__/RecentTradesTable.test.tsx` | ~100 | 8 tests: rows, badges, empty state, all column headers |

### Files Modified

| File | Lines | Change |
|------|-------|--------|
| `src/screens/DashboardScreen.tsx` | 171 (down from ~240) | Full rewrite: thin orchestrator using useDashboard + sub-components |
| `src/screens/__tests__/DashboardScreen.test.tsx` | ~305 (rewritten) | 14 tests: happy path, loading, fatal error, partial errors, onboarding |

### Test Results

```
Frontend: 323 tests | 29 suites | 0 failures
Backend:  83 tests  | 27 suites | 0 failures
```

- 33 new frontend tests: 7 (KPIGrid) + 7 (EquityChart) + 11 (BotStatusPanel) + 8 (RecentTradesTable)
- DashboardScreen tests rewritten: old 9 tests → new 14 tests (net +5)
- Zero regressions across all 323 frontend + 83 backend tests

### TDD Cycle Evidence (Tasks 6-9)

| Phase | Task | Test File | Cycle |
|-------|------|-----------|-------|
| RED | 6a | KPIGrid.test.tsx | Module didn't exist → compile error |
| GREEN | 6a | KPIGrid.tsx | Implemented 5-KPI grid with formatted values |
| RED | 6b | EquityChart.test.tsx | Module didn't exist → compile error |
| GREEN | 6b | EquityChart.tsx | Implemented AreaChart, period buttons, empty state |
| RED | 7a | BotStatusPanel.test.tsx | Module didn't exist → compile error |
| GREEN | 7a | BotStatusPanel.tsx | Implemented status card with badges + action buttons |
| RED | 7b | RecentTradesTable.test.tsx | Module didn't exist → compile error |
| GREEN | 7b | RecentTradesTable.tsx | Implemented trade table with BUY/SELL badges |
| RED | 8+9 | DashboardScreen.test.tsx | Tests failed — old screen used useTrading, not useDashboard |
| GREEN | 8+9 | DashboardScreen.tsx | Full rewrite as orchestrator with sub-components |
| REFACTOR | 8+9 | — | Fixed test mocks for TopBar (useTrading user) and useAuth (state, logout) |

### Deviations from Design

1. **KPIGrid props**: Task spec passes pre-computed values as props (`grossProfit`, `performance`, `pendingFee`). Design had KPIGrid computing them internally. Followed task spec — orchestrator computes, KPIGrid is purely presentational.

2. **EquityChart props**: Task spec uses only `data` prop. Design included `initialBalance` prop. Initial balance is computed internally from `data[0].value` — simpler API, no external KPI computation needed.

3. **BotStatusPanel props**: Task spec uses `DashboardBotStatus` object (with `active: boolean`). Design used string union `'active' | 'paused' | 'error'`. Followed task spec — binary active/inactive, badge derived (`Active`=success, `Paused`=warning), no "error" state in v1.

4. **DashboardScreen `currentBalance`**: Task spec uses `balances.find(a=>a.asset==='FDUSD')?.free` (free only). Design used free + locked. Followed task spec — simpler, free balance is what matters for KPI display.

5. **DashboardScreen toggleBot**: Task spec requires placeholder no-op (not useTrading). Implemented `onToggleBot={() => { /* placeholder */ }}`. Future PR will wire to backend toggle.

6. **DashboardScreen onboarding**: Task spec passes `onSetup2FA` and `onConnectApi` callbacks (wrapping `useNavigate`). DashboardScreen creates these callbacks — consistent with OnboardingBanner's callback-based API.

7. **Trust Reminder**: Changed from `<button>` to `<a>` tag with Binance wallet URL (correct semantics for external link).

### Acceptance Criteria

- ✅ All 323 frontend tests pass + 83 backend tests pass
- ✅ DashboardScreen.tsx is a thin orchestrator (171 lines, down from ~240)
- ✅ Sub-components are pure presentational with no side effects
- ✅ Tests cover: render, empty state, error state, interactions (callbacks, modal)
- ✅ No regressions — all existing screens that use useTrading still work (App.tsx references TradingProvider, DashboardScreen no longer imports useTrading directly)
