# Proposal: Fix Initial Deposit Detection for Internal FDUSD Transfers

## Intent

Detect the user's real initial Binance funding operation when it is an internal/spot/sub-account transfer, not an on-chain deposit or Main↔Futures transfer. The dashboard currently shows no initial operation because transfer history is queried only with `MAIN_UMFUTURE`.

## Scope

### In Scope
- Expand backend transfer discovery beyond hardcoded `MAIN_UMFUTURE`.
- Add graceful support for sub-account/internal transfer history where permitted.
- Preserve `computeInitialBalance()` earliest-operation merge behavior.
- Add TDD coverage for FDUSD internal transfer detection and partial API failures.

### Out of Scope
- Frontend redesign of the KPI card.
- Manual Binance data entry or reconciliation UI.
- Exhaustive support for Convert/Earn/history APIs unless needed later.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `initial-operation-detection`: Transfer history MUST include relevant internal/sub-account transfer sources, not only Main↔Futures transfers.
- `dashboard-initial-operation-display`: Display behavior remains unchanged, but scenarios should cover a detected FDUSD transfer instead of rendering the null fallback.

## Approach

Use TDD first. Add the smallest backend change: query multiple Binance transfer sources with `Promise.allSettled`, normalize successful results into existing transfer shape, and let `computeInitialBalance()` pick the earliest operation. If sub-account permissions are missing, log and continue with other sources.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/src/services/binanceService.ts` | Modified | Support multiple transfer types and sub-account/internal transfer endpoint. |
| `backend/src/services/dashboardService.ts` | Modified | Fetch and merge expanded transfer sources. |
| `backend/src/types/binance.ts` | Modified | Add minimal response types if needed. |
| `backend/src/services/__tests__/` | Modified | Add failing tests for FDUSD internal transfer and graceful degradation. |
| `backend/src/routes/__tests__/dashboard.test.ts` | Modified | Cover dashboard summary returning the detected transfer. |
| `openspec/specs/*initial-operation*` | Modified | Delta specs for detection/display expectations. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Binance rate limits from extra calls | Medium | Keep source list minimal; rely on existing cache; parallelize settled calls. |
| Missing sub-account permissions | Medium | Treat endpoint failure as partial failure, not dashboard failure. |
| Transfer absent from queried APIs | Low | Keep null fallback; document remaining unsupported Binance sources. |

## Rollback Plan

Revert the backend transfer-source expansion and related tests/spec deltas. Existing deposit and `MAIN_UMFUTURE` detection will continue to work as before.

## Dependencies

- Binance API key permissions for any queried sub-account/internal transfer endpoint.

## Success Criteria

- [ ] A Binance FDUSD internal/sub-account transfer of `10.14119044` can become the dashboard initial operation.
- [ ] Partial failures from unsupported transfer endpoints do not fail the dashboard summary.
- [ ] Existing deposit and Main↔Futures transfer scenarios still pass.
