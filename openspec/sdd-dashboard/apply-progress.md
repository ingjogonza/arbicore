# SDD Apply Progress: DashboardScreen — Real Binance Data

## Status: PR 1 ✅ | PR 2 ✅ | PR 3 (pending)

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

### Remaining Tasks (Future PRs)

- PR 3: Frontend Tasks 6-9 (KPIGrid, EquityChart, BotStatusPanel, RecentTradesTable, DashboardScreen orchestrator rewrite, DashboardScreen integration tests)

### Next Steps

PR 2 ready for review. All 23 new tests pass. Types appended correctly. Backend API contract consumed by useDashboard hook. OnboardingBanner extracted from DashboardScreen inline JSX with improved testability (callbacks instead of direct navigation, localStorage persistence).
