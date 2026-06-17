# Tasks: Cumulative Deposits Breakdown

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~430 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No (single PR fits with 430 lines including 200 lines of test rewrites) |
| Suggested split | single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Backend contract refactor + tests | PR 1 | Includes type rename, service changes, route schema, tests. |
| 2 | Frontend KPIGrid update + tests | PR 2 | Depends on PR 1. |

Note: PR 2 is small enough (~60 lines frontend + tests) that it can ship together with PR 1 in a single PR.

## Phase 1: Foundation — types and binance service

- [ ] 1.1 RED: Write failing test `getDepositHistory` issues two parallel calls (`status=1` and `status=6`) and concatenates results. File: `backend/src/services/__tests__/binanceService.test.ts`.
- [ ] 1.2 GREEN: Update `getDepositHistory` in `backend/src/services/binanceService.ts` to issue two parallel `binanceGet` calls and return concatenated array.
- [ ] 1.3 REFACTOR: Clean up duplication; ensure all binanceService tests pass.

## Phase 2: Core — dashboard service refactor

- [ ] 2.1 RED: Write failing test for `computeTotalDeposited`: empty input returns `{}`; FDUSD-only inputs return `{FDUSD: sum}`; multiple coins aggregate by coin; pending status=0 excluded; status=1 and status=6 both summed. File: `backend/src/services/__tests__/dashboardService.test.ts`.
- [ ] 2.2 GREEN: Replace `computeInitialBalance` with `computeTotalDeposited` in `backend/src/services/dashboardService.ts`. Update return type to `CumulativeDeposits`.
- [ ] 2.3 RED: Write failing test that `totalDepositedFDUSD` falls back to `currentBalance` when cumulative map is empty.
- [ ] 2.4 GREEN: Add `totalDepositedFDUSD` derivation in `getDashboardSummary` orchestrator.
- [ ] 2.5 REFACTOR: Update `DashboardSummaryData` type in `backend/src/types/binance.ts`. Remove deprecated `InitialOperation` and `InitialBalance`.

## Phase 3: Wiring — route schema and integration tests

- [ ] 3.1 RED: Write failing integration test that `/api/dashboard/summary` returns `cumulativeDeposits` and `totalDepositedFDUSD`. File: `backend/src/routes/__tests__/dashboard.test.ts`.
- [ ] 3.2 GREEN: Update Fastify response schema in `backend/src/routes/dashboard.ts` to expose new fields.
- [ ] 3.3 RED: Write failing test for partial-source failure (one transfer source fails, others succeed) covering the new contract.
- [ ] 3.4 GREEN: Confirm `Promise.allSettled` fan-out still works and feeds `computeTotalDeposited` correctly.
- [ ] 3.5 REFACTOR: Clean up dead code; remove old `initialBalance` field references.

## Phase 4: Frontend — KPIGrid refactor

- [ ] 4.1 RED: Write failing test that `KPIGrid` renders "Total Deposited" card with FDUSD primary and compact list of other coins. File: `frontend/src/components/dashboard/__tests__/KPIGrid.test.tsx`.
- [ ] 4.2 GREEN: Update `frontend/src/components/dashboard/KPIGrid.tsx`: replace `initialOperation` prop with `cumulativeDeposits` + `totalDepositedFDUSD`; render breakdown.
- [ ] 4.3 RED: Write failing test for empty map case (shows fallback value, no list).
- [ ] 4.4 GREEN: Handle empty case in render.
- [ ] 4.5 REFACTOR: Update `frontend/src/types/index.ts` to expose new types; remove `InitialOperation` references.

## Phase 5: Verification

- [ ] 5.1 Run `cd backend && npm test` from workspace; all tests green.
- [ ] 5.2 Run frontend test suite (Jest); all tests green.
- [ ] 5.3 Manually verify the new card renders correctly in the dashboard.
- [ ] 5.4 Confirm no regressions: previous trade/BTCFDUSD-related tests still pass.

## Phase 6: Cleanup

- [ ] 6.1 Archive `openspec/specs/initial-operation-detection/spec.md` and `openspec/specs/dashboard-initial-operation-display/spec.md` (move to archive folder).
- [ ] 6.2 Confirm no remaining references to `initialBalance` or `InitialOperation` in the codebase.
- [ ] 6.3 Update OpenSpec config if needed.
