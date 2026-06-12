# Tasks: Replace Initial Balance with Initial Account Operation

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~380–480 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (backend) → PR 2 (frontend) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Backend: detect earliest operation from Binance APIs | PR 1 | Types, services, route, + all backend tests. Base: `main`. |
| 2 | Frontend: display `InitialOperation` in dashboard | PR 2 | Frontend types, KPIGrid, WithdrawModal, EquityChart, + all frontend tests. Base: `main`. |

## Phase 1: Types & Interfaces

- [x] 1.1 Add `InitialOperation` and `BinanceTransfer` types to `backend/src/types/binance.ts`
- [x] 1.2 Add `InitialOperation` interface to `src/types/index.ts`; update `DashboardSummaryData.initialBalance`

## Phase 2: Backend Detection Logic (TDD: RED → GREEN)

- [x] 2.1 RED: Write unit tests for `computeInitialBalance` covering spec scenarios (deposit earliest, transfer earliest, only deposits, only transfers, empty, transfer API error)
- [x] 2.2 GREEN: Add `getTransferHistory()` to `backend/src/services/binanceService.ts`
- [x] 2.3 GREEN: Rewrite `computeInitialBalance` in `backend/src/services/dashboardService.ts` to merge/sort deposits + transfers with graceful fallback
- [x] 2.4 RED: Write integration test for `GET /dashboard/summary` with mocked Binance responses
- [x] 2.5 GREEN: Update Fastify response schema in `backend/src/routes/dashboard.ts` for `InitialOperation`

## Phase 3: Frontend Display (TDD: RED → GREEN)

- [x] 3.1 RED: Write `KPIGrid` tests (deposit label, transfer label, null fallback)
- [x] 3.2 GREEN: Update `src/components/dashboard/KPIGrid.tsx` to accept `InitialOperation` with dynamic labels
- [x] 3.3 RED: Write `EquityChart` tests (reference line at amount, no line on null)
- [x] 3.4 GREEN: Update `src/components/dashboard/EquityChart.tsx` to use `initialOperation.amount`
- [x] 3.5 RED: Write `WithdrawModal` tests (displays real operation data, null fallback)
- [x] 3.6 GREEN: Refactor `src/screens/WithdrawModal.tsx` to accept real dashboard props

## Phase 4: Wiring & Cleanup

- [x] 4.1 Update `src/hooks/useDashboard.ts` for transparent `InitialOperation` passthrough
- [x] 4.2 Update `src/screens/DashboardScreen.tsx` to extract amount and pass `initialOperation` to children
- [x] 4.3 Update `src/data/mock.ts` to align `initialBalance` with new `InitialOperation` type
- [x] 4.4 Remove mock/hardcoded initial balance references from `WithdrawModal`
