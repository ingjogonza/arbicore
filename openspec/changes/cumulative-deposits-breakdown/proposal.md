# Proposal: Cumulative Deposits Breakdown

## Intent

Replace the dashboard's "Initial Deposit" card (which surfaces a single earliest operation) with a "Total Deposited" card that shows the cumulative sum of all deposits and incoming transfers per coin. The new card addresses two real problems: (1) the current card shows zero when the user's first operation is a main-to-sub internal transfer (which Binance SAPI does not expose from the main account perspective), and (2) the current card ignores subsequent top-ups, so it does not reflect what the user has actually funded.

## Scope

### In Scope
- Rename `InitialOperation` (single earliest op) to `CumulativeDeposits` (map `{ coin: totalAmount }`).
- Update `dashboardService.computeInitialBalance` to `computeTotalDeposited`, summing deposits (status=1 and status=6) plus incoming transfers from the 3-fan-out sources (`MAIN_UMFUTURE`, `MAIN_FUNDING`, `sub-account-received`).
- Derive a numeric field `totalDepositedFDUSD` from the map to preserve KPI math chain (grossProfit, etc.). Fall back to `currentBalance` when the derived field is 0/null.
- Update `/sapi/v1/capital/deposit/hisrec` query to include both `status=1` and `status=6`.
- Update frontend `KPIGrid` and any consumer of the old `initialBalance` field to render `Total Deposited` with breakdown by coin.
- Document the known limitation: main-to-sub transfers from the main account perspective are not exposed by Binance SAPI public API. Future PR may add manual input feature.

### Out of Scope
- Manual input feature for the initial deposit (separate future SDD).
- Net deposits (deposits minus withdrawals); current scope is gross deposited.
- Scraping BAPI endpoints that require cookie auth.

## Capabilities

### New Capabilities
- `total-deposited-detection`: Detection logic that aggregates deposits and incoming transfers into a per-coin cumulative map.
- `dashboard-cumulative-deposits-display`: Dashboard card that renders the per-coin cumulative deposits as a primary FDUSD total plus a compact list of other coins.

### Modified Capabilities
None (existing `initial-operation-detection` and `dashboard-initial-operation-display` are replaced by the new ones above).

## Approach

The change is a contract refactor in the backend plus a UI rename/restructuring. The pure function `computeInitialBalance` becomes `computeTotalDeposited`, and the route schema field `initialBalance: InitialOperation | null` becomes `cumulativeDeposits: Record<string, number>` plus `totalDepositedFDUSD: number` (derived for KPI math). The frontend `KPIGrid` is updated to render the new shape. Tests follow strict TDD: red first, then implementation, then refactor.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/src/services/dashboardService.ts` | Modified | Rename `computeInitialBalance` to `computeTotalDeposited`; return map + derived field. |
| `backend/src/services/binanceService.ts` | Modified | `getDepositHistory` queries both `status=1` and `status=6`. |
| `backend/src/services/__tests__/dashboardService.test.ts` | Modified | Update tests to assert map and derived field. |
| `backend/src/routes/dashboard.ts` | Modified | Route schema exposes new fields. |
| `frontend/src/components/dashboard/KPIGrid.tsx` (or equivalent) | Modified | Render "Total Deposited" + breakdown. |
| `openspec/specs/total-deposited-detection/spec.md` | Created | New full spec for the detection logic. |
| `openspec/specs/dashboard-cumulative-deposits-display/spec.md` | Created | New full spec for the UI. |
| `openspec/specs/initial-operation-detection/spec.md` | Archived | Replaced by total-deposited-detection. |
| `openspec/specs/dashboard-initial-operation-display/spec.md` | Archived | Replaced by dashboard-cumulative-deposits-display. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| KPI math chain (grossProfit) breaks if `totalDepositedFDUSD` is null. | Medium | Derive field always; fall back to `currentBalance` when no deposits. |
| Binance rate limit hit by extra `status=6` call. | Low | 30s cache already wraps the whole `getDashboardSummary`. |
| Some main-to-sub transfers still not captured. | Known | Document in spec; future PR for manual input. |
| Frontend components depending on old `initialBalance` shape break. | Medium | TypeScript types surface the rename at compile time. |

## Rollback Plan

Revert the commit on `feat/cumulative-deposits-breakdown`. The branch is isolated from `develop`; revert is local. Specs archived under their old names can be restored from git history if needed.

## Dependencies

- Binance SAPI `/sapi/v1/capital/deposit/hisrec` with `status=6` support (publicly available).
- Binance SAPI fan-out sources (`MAIN_UMFUTURE`, `MAIN_FUNDING`, `sub-account-received`) already wired in `binanceService.ts`.

## Success Criteria

- [ ] `cumulativeDeposits` field in `/api/dashboard/summary` returns a non-null map with FDUSD as the only required coin.
- [ ] `totalDepositedFDUSD` field is derived and consistent with `cumulativeDeposits.FDUSD` when present.
- [ ] Frontend `Total Deposited` card shows the FDUSD total as the primary number and a compact list of other coins below.
- [ ] When no deposits are detected, the card shows a "Sin depósitos detectados" message.
- [ ] Backend test suite remains green (currently 101/101).
- [ ] Strict TDD evidence table in `apply-progress` shows RED → GREEN → REFACTOR for each task.
- [ ] Spec documents the known limitation about main-to-sub transfers not being exposed by SAPI.
