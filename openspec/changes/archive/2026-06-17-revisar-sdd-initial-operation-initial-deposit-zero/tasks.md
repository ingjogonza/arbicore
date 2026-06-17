# Tasks: Fix Initial Deposit Detection for Internal FDUSD Transfers

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~235 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Types + binanceService sub-account func + tests | PR 1 | Precedes dashboard fan-out |
| 2 | Dashboard fan-out + integration tests | PR 1 | Depends on unit 1 |

## Phase 1: Foundation — Types & binanceService

- [x] 1.1 [RED] Write failing tests for `getSubAccountTransferHistory()` in `backend/src/services/__tests__/binanceService.test.ts` (happy path returning FDUSD 10.14119044 + 401 rejection)
- [x] 1.2 [GREEN] Add `BinanceTransferType` union to `backend/src/types/binance.ts`; implement `getSubAccountTransferHistory()` calling `/sapi/v1/sub-account/transfer/subUserHistory` in `backend/src/services/binanceService.ts`
- [x] 1.3 [REFACTOR] Clean up; run `cd backend && npm test` — all binanceService tests pass

## Phase 2: Core — Dashboard fan-out

- [x] 2.1 [RED] Add `subAccountTransfer` handler to `installBinanceMock()` in `backend/src/routes/__tests__/dashboard.test.ts`; write failing test: `MAIN_UMFUTURE` 401, sub-account returns FDUSD 10.14119044 → initialBalance is the FDUSD transfer
- [x] 2.2 [RED] Write failing test: sub-account 401, `MAIN_UMFUTURE` returns USDT → initialBalance is USDT, no `transfers` error in `body.errors`
- [x] 2.3 [GREEN] Replace single `getTransferHistory()` with `Promise.allSettled` fan-out over `[MAIN_UMFUTURE, MAIN_FUNDING, MAIN_C2C, subAccount]` in `backend/src/services/dashboardService.ts`; flatten fulfilled rows, warn on rejection
- [x] 2.4 [REFACTOR] Clean up fan-out; run `cd backend && npm test` — all dashboard + binanceService + existing scenarios pass

## Phase 3: Verification

- [x] 3.1 Run full backend test suite: `cd backend && npm test` — confirm all tests green
- [x] 3.2 Confirm existing deposit and `MAIN_UMFUTURE` scenarios still pass with no regressions
