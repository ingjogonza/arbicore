# Proposal: Replace Initial Balance with Initial Account Operation

## Intent

Replace the static "Initial Balance" KPI with the actual first account operation (deposit or transfer) to accurately reflect how the account was funded.

## Scope

### In Scope
- Query Binance transfer history alongside deposits.
- Determine earliest operation and expose type, amount, coin, time.
- Change `DashboardSummaryData` from `string | null` to an operation object.
- Update `KPIGrid`, `WithdrawModal`, `DashboardScreen`, and `EquityChart`.
- Align `WithdrawModal` with real dashboard data (currently uses mock).
- Update all affected tests.

### Out of Scope
- Binance API permission verification.
- Other unrelated dashboard features.

## Capabilities

### New Capabilities
- `initial-operation-detection`: Query Binance deposits and transfers, determine earliest, return typed result.
- `dashboard-initial-operation-display`: Render operation type, coin, and amount in KPI Grid and WithdrawModal.

### Modified Capabilities
- None

## Approach

Add `getTransferHistory` in `binanceService.ts`. Update `computeInitialBalance` in `dashboardService.ts` to sort deposits and transfers by timestamp and return the earliest as an object. Update frontend types, hooks, and components. Fallback to deposit-only if transfer API is unavailable.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/src/services/dashboardService.ts` | Modified | Return earliest operation |
| `backend/src/services/binanceService.ts` | Modified | Add transfer query |
| `backend/src/types/binance.ts` | Modified | Add transfer type |
| `backend/src/routes/dashboard.ts` | Modified | Update schema |
| `src/types/index.ts` | Modified | Use operation object |
| `src/hooks/useDashboard.ts` | Modified | Handle new shape |
| `src/screens/DashboardScreen.tsx` | Modified | Pass operation down |
| `src/components/dashboard/KPIGrid.tsx` | Modified | Dynamic label |
| `src/screens/WithdrawModal.tsx` | Modified | Real data |
| `src/components/dashboard/EquityChart.tsx` | Modified | Adapt reference line |
| `src/data/mock.ts` | Modified | Update mock |
| Tests | Modified | Update tests |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Binance transfer API permission denied | Med | Fallback to deposit-only |
| Breaking type change across stack | High | Update contracts/tests together |
| WithdrawModal mock data drift | High | Fix modal to use `useDashboard` |
| High test surface (strict TDD) | Med | Update tests alongside code |

## Rollback Plan

Revert `initialBalance` to `string | null`, restore deposit-only backend, revert frontend labels, restore mock data.

## Dependencies

- Binance API key with transfer history read permission.

## Success Criteria

- [ ] Dashboard KPI Grid shows first operation type, coin, and amount.
- [ ] WithdrawModal uses real dashboard data.
- [ ] All tests pass.
