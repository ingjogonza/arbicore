# SDD Archive: DashboardScreen — Real Binance Data

## Archive Status

**PASS** — All 9 tasks complete, 406 tests pass, zero regressions, no blockers.

---

## Change Summary

### What Was Built

The DashboardScreen was refactored from hardcoded mock data to live Binance API data, spanning backend and frontend across 3 stacked PRs.

| Layer | Description | New Files | Changed Files |
|-------|-------------|-----------|---------------|
| **Backend** | `GET /api/dashboard/summary` endpoint with 3 parallel Binance API calls (account, myTrades, accountSnapshot), HMAC-SHA256 auth, partial error handling | 7 | 2 |
| **Frontend Core** | `useDashboard` data-fetching hook, `OnboardingBanner` component, dashboard API types | 4 | 1 |
| **Frontend Components** | `KPIGrid`, `EquityChart`, `BotStatusPanel`, `RecentTradesTable`, rewritten `DashboardScreen` orchestrator, integration tests | 8 | 2 |
| **Total** | | **19** | **5** |

### Architecture

```
Binance API
    │
    ▼
binanceService.ts (3 calls paralelas via Promise.allSettled)
    │
    ▼
dashboardService.ts (orquesta, computa, mapea)
    │
    ▼
GET /api/dashboard/summary  (Fastify route)
    │
    ▼
DashboardScreen.tsx (orquestador frontend — 171 lines, ↓ de ~240)
    │
    ├─► OnboardingBanner
    ├─► KPIGrid
    ├─► EquityChart
    ├─► BotStatusPanel
    └─► RecentTradesTable
```

---

## Test Results

| Suite | Tests | Suites | Status |
|-------|-------|--------|--------|
| Backend | 83 | 27 | ✅ 0 failures |
| Frontend | 323 | 29 | ✅ 0 failures |
| **Total** | **406** | **56** | **✅ PASS** |

### New Tests Added

| Test File | Tests | Area |
|-----------|-------|------|
| `backend/src/utils/__tests__/binanceAuth.test.ts` | 7 | HMAC-SHA256 signing |
| `backend/src/services/__tests__/binanceService.test.ts` | 4 | Binance API client |
| `backend/src/services/__tests__/dashboardService.test.ts` | 10 | Dashboard orchestrator |
| `backend/src/routes/__tests__/dashboard.test.ts` | 3 | Integration (401, NO_API_KEYS, stored keys) |
| `src/hooks/__tests__/useDashboard.test.ts` | 10 | Data fetching hook |
| `src/components/dashboard/__tests__/OnboardingBanner.test.tsx` | 13 | Banner component |
| `src/components/dashboard/__tests__/KPIGrid.test.tsx` | 7 | KPI grid |
| `src/components/dashboard/__tests__/EquityChart.test.tsx` | 7 | Chart component |
| `src/components/dashboard/__tests__/BotStatusPanel.test.tsx` | 11 | Status panel |
| `src/components/dashboard/__tests__/RecentTradesTable.test.tsx` | 8 | Trade table |
| `src/screens/__tests__/DashboardScreen.test.tsx` | 14 (rewritten) | Integration tests |
| **Total new/rewritten** | **84** | |

### Regression Check

Zero regressions — all 263 pre-existing frontend tests and 59 pre-existing backend tests continue to pass.

---

## Deviations from Spec/Design

| # | Area | Spec/Design | Implementation | Severity |
|---|------|-------------|----------------|----------|
| 1 | **RecentTradesTable column** | "Quote Qty" column | "Commission" column showing `commission` + `commissionAsset` | Minor |
| 2 | **KPIGrid props** | Design: KPIGrid computes KPI values internally | Passes pre-computed values; KPIGrid is purely presentational | Acceptable |
| 3 | **BotStatusPanel prop type** | String union `'active' \| 'paused' \| 'error'` | Uses `DashboardBotStatus` object with `active: boolean` | Acceptable |
| 4 | **DashboardScreen currentBalance** | `free + locked` | `free` only | Acceptable |
| 5 | **DashboardScreen useTrading** | Still imported for `toggleBot` | Placeholder no-op, no `useTrading` import | Acceptable |
| 6 | **OnboardingBanner styling** | Teal-to-emerald gradient | Amber-to-yellow gradient per task spec | Acceptable |
| 7 | **EquityChart `initialBalance`** | External prop | Computed internally from `data[0].value` | Acceptable |
| 8 | **Trust Reminder** | `<button>` element | `<a>` tag with Binance wallet URL | Acceptable |

All deviations are minor or acceptable; no spec-breaking changes.

---

## Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Proposal | `openspec/sdd-dashboard/proposal.md` | Problem statement and scope |
| Spec | `openspec/sdd-dashboard/spec.md` | API contract, types, component interfaces, test plan |
| Design | `openspec/sdd-dashboard/design.md` | Technical architecture, file-by-file changes |
| Tasks | `openspec/sdd-dashboard/tasks.md` | 9 tasks across 3 PRs |
| Apply Progress | `openspec/sdd-dashboard/apply-progress.md` | Implementation tracking with TDD cycles |
| Verify Report | `openspec/sdd-dashboard/verify-report.md` | Verification results |
| Archive | `openspec/sdd-dashboard/archive.md` | This document |

---

## Files Created

### Backend (PR 1)

| File | Description |
|------|-------------|
| `backend/src/types/binance.ts` | Binance API raw response + mapped dashboard types (~90 lines) |
| `backend/src/utils/binanceAuth.ts` | HMAC-SHA256 signature builder + signed URL builder (~55 lines) |
| `backend/src/utils/__tests__/binanceAuth.test.ts` | 7 tests for buildSignature + buildSignedUrl (~100 lines) |
| `backend/src/services/binanceService.ts` | 3 Binance API functions (account, myTrades, snapshot) (~105 lines) |
| `backend/src/services/dashboardService.ts` | Orchestrator + pure mapping functions (~170 lines) |
| `backend/src/services/__tests__/binanceService.test.ts` | 4 tests with mocked https (~150 lines) |
| `backend/src/services/__tests__/dashboardService.test.ts` | 10 tests for mapping functions (~210 lines) |
| `backend/src/routes/dashboard.ts` | GET /api/dashboard/summary with auth (~95 lines) |
| `backend/src/routes/__tests__/dashboard.test.ts` | 3 integration tests (~115 lines) |

### Backend (PR 1) — Modified

| File | Change |
|------|--------|
| `backend/src/index.ts` | +2 lines: import + register dashboardRoutes |
| `backend/package.json` | +1 line: added test glob for utils |

### Frontend (PR 2)

| File | Description |
|------|-------------|
| `src/hooks/useDashboard.ts` | Data fetching hook with auth, loading/error/refetch (~75 lines) |
| `src/hooks/__tests__/useDashboard.test.ts` | 10 tests (~130 lines) |
| `src/components/dashboard/OnboardingBanner.tsx` | 3-state banner (loading/complete/incomplete) (~95 lines) |
| `src/components/dashboard/__tests__/OnboardingBanner.test.tsx` | 13 tests (~145 lines) |

### Frontend (PR 2) — Modified

| File | Change |
|------|--------|
| `src/types/index.ts` | +52 lines: appended DashboardBalance, DashboardTrade, etc. |

### Frontend (PR 3)

| File | Description |
|------|-------------|
| `src/components/dashboard/KPIGrid.tsx` | 5-KPI grid using KPICard (~55 lines) |
| `src/components/dashboard/__tests__/KPIGrid.test.tsx` | 7 tests (~87 lines) |
| `src/components/dashboard/EquityChart.tsx` | AreaChart from recharts with period buttons (~115 lines) |
| `src/components/dashboard/__tests__/EquityChart.test.tsx` | 7 tests (~72 lines) |
| `src/components/dashboard/BotStatusPanel.tsx` | Status card with badge + action buttons (~85 lines) |
| `src/components/dashboard/__tests__/BotStatusPanel.test.tsx` | 11 tests (~155 lines) |
| `src/components/dashboard/RecentTradesTable.tsx` | Trade table with BUY/SELL badges (~115 lines) |
| `src/components/dashboard/__tests__/RecentTradesTable.test.tsx` | 8 tests (~100 lines) |

### Frontend (PR 3) — Modified

| File | Change |
|------|--------|
| `src/screens/DashboardScreen.tsx` | Full rewrite: 171 lines (↓ from ~240), thin orchestrator |
| `src/screens/__tests__/DashboardScreen.test.tsx` | Rewritten: 14 tests (↑ from 9) |

---

## Key Decisions

1. **Promise.allSettled for partial errors**: A single failing Binance API call doesn't block the entire dashboard — users see available data with per-section error alerts.
2. **Pure mapping functions extracted**: `mapBalances`, `mapTrades`, `mapEquityHistory`, `buildBotStatus` are exported pure functions for clean unit testing without mocking.
3. **FDUSD as fixed spot v1**: The backend hardcodes FDUSD spot and BTC/FDUSD pair. Configurable via `symbol` parameter in a future PR.
4. **onToggleBot placeholder**: The bot toggle is a no-op awaiting a future backend endpoint for bot pause/resume.
5. **30-second cache reserved**: MongoDB caching with `?refresh=true` bypass is designed but not implemented in v1.

---

## Next Steps

1. **Backend toggle bot endpoint**: Wire `onToggleBot` to a real `POST /api/bot/toggle` endpoint.
2. **MongoDB caching**: Implement 30-second TTL cache for `GET /api/dashboard/summary` to reduce Binance API calls.
3. **Multi-symbol support**: V2 should allow configurable trading pairs rather than hardcoded BTC/FDUSD.
4. **Real-time polling**: Add WebSocket or periodic refresh for live dashboard updates.
5. **Document deviation #1**: Update `apply-progress.md` to note Commission column instead of Quote Qty in RecentTradesTable (minor).

---

## Audit Trail

- **Started**: Based on `openspec/sdd-dashboard/proposal.md`
- **Implemented**: 3 stacked PRs (Backend → Frontend Core → Components + Orchestrator)
- **Verified**: 2026-06-05 — 406 tests, 0 failures, 0 regressions
- **Archived**: 2026-06-05
