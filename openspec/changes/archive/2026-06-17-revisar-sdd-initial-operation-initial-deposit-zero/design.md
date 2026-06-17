# Design: Fix Initial Deposit Detection for Internal FDUSD Transfers

## Technical Approach

Replace the single hardcoded `MAIN_UMFUTURE` call in `getDashboardSummary` with a parallel fan-out across multiple Binance transfer sources (universal-transfer `type` variants + sub-account internal history), merge successful rows into the existing `BinanceTransfer[]` shape, and let `computeInitialBalance()` pick the earliest. `Promise.allSettled` gives per-source graceful degradation. `getTransferHistory` already takes a `type` argument — keep it, iterate from the orchestrator. Add one new endpoint for the sub-account internal history (different path and permission scope).

## Architecture Decisions

### Decision: Iterate transfer types from the orchestrator

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Iterate types inside `getTransferHistory` | Hides concurrency from caller, harder to fail individual types | Reject |
| Iterate in `dashboardService` via `Promise.allSettled` | Caller controls fan-out, per-source failure visible, matches existing contract | **Choose** |
| Single "get all transfers" mega-call | Binance has no such endpoint | Reject |

### Decision: Add sub-account endpoint as a separate function

`getSubAccountTransferHistory()` calling `/sapi/v1/sub-account/transfer/subUserHistory`. FDUSD internal/sub-account transfers populate this endpoint, not universal-transfer `MAIN_UMFUTURE`. The 10.14119044 case is exactly this.

### Decision: Keep `computeInitialBalance` unchanged

Pure function still takes `(deposits, transfers)` and returns `InitialOperation | null`. Merge happens in the orchestrator — keeps the function deterministic and TDD-tested.

## Data Flow

```
dashboardService.getDashboardSummary
  └─ Promise.allSettled([
       getTransferHistory(type=MAIN_UMFUTURE),
       getTransferHistory(type=MAIN_FUNDING),
       getTransferHistory(type=MAIN_C2C),
       getSubAccountTransferHistory(),
     ])
     ├─ fulfilled rows  ──→ allTransfers.push(...rows)
     └─ rejected          ──→ console.warn("[Dashboard] <source> failed: …")
     ▼
   computeInitialBalance(deposits, allTransfers)   // unchanged
     ▼
   InitialOperation | null   →  DashboardSummaryData.initialBalance
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/src/services/binanceService.ts` | Modify | Add `getSubAccountTransferHistory()` for `/sapi/v1/sub-account/transfer/subUserHistory`; keep `getTransferHistory(type)` unchanged. |
| `backend/src/services/dashboardService.ts` | Modify | Replace single `getTransferHistory` call with `Promise.allSettled` fan-out over a static list of sources; flatten fulfilled rows; warn on rejection. `computeInitialBalance` unchanged. |
| `backend/src/types/binance.ts` | Modify | Add `BinanceTransferType = "MAIN_UMFUTURE" \| "MAIN_FUNDING" \| "MAIN_C2C"`. |
| `backend/src/services/__tests__/binanceService.test.ts` | Modify | Add tests for `getSubAccountTransferHistory` happy path + 401 rejection. Existing tests stay green. |
| `backend/src/routes/__tests__/dashboard.test.ts` | Modify | Extend `installBinanceMock` with sub-account URL detection. Add scenarios: (1) `MAIN_UMFUTURE` 401, sub-account returns FDUSD 10.14119044 → `initialBalance` is the FDUSD transfer. (2) Sub-account 401, `MAIN_UMFUTURE` returns USDT → `initialBalance` is the USDT transfer, no `transfers` error in `body.errors`. |
| `backend/src/routes/dashboard.ts` | No change | Schema already permits `transfer` type + arbitrary coin. |
| `frontend/*` | No change | `useDashboard`, `KPIGrid`, `WithdrawModal`, `EquityChart` already handle `InitialOperation` with arbitrary coin and `type: "transfer"`. |

## Interfaces / Contracts

```ts
// backend/src/types/binance.ts
export type BinanceTransferType = "MAIN_UMFUTURE" | "MAIN_FUNDING" | "MAIN_C2C";

// backend/src/services/binanceService.ts
export async function getSubAccountTransferHistory(
  apiKey: string, secretKey: string,
): Promise<BinanceTransfer[]>;

// dashboardService internal (not exported):
const TRANSFER_SOURCES = [
  { name: "MAIN_UMFUTURE", call: (k, s) => getTransferHistory(k, s, "MAIN_UMFUTURE") },
  { name: "MAIN_FUNDING",  call: (k, s) => getTransferHistory(k, s, "MAIN_FUNDING") },
  { name: "MAIN_C2C",      call: (k, s) => getTransferHistory(k, s, "MAIN_C2C") },
  { name: "sub-account",   call: getSubAccountTransferHistory },
] as const;
```

Orchestrator's `Promise.allSettled` flattens fulfilled rows; rejections log a warning and contribute zero rows. `computeInitialBalance` is invoked once with the merged array.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|--------------|----------|
| Unit (binanceService) | `getSubAccountTransferHistory` hits the right path, unwraps `.rows`, rejects on non-2xx. | Reuse existing `https.get` mock pattern. |
| Integration (route) | Two new mocked scenarios (FDUSD-via-sub-account, partial-source-failure). Existing scenarios remain green. | Extend `installBinanceMock`. |

## Migration / Rollout

No migration. Adding transfer sources can only make the earliest operation earlier (more accurate), never regress. Revert path: drop the fan-out list back to a single `getTransferHistory()` call (the original line).

## Open Questions

- Confirm exact sub-account endpoint (`subUserHistory` vs `subToSub`) and `type` filter against the user's live API key during implementation. If the key lacks "Sub-account Transfer" permission, the call rejects and the partial-failure test covers it.
- Conservative start: three universal types + sub-account. Add more (`MAIN_OTOCO`, `MAIN_MARGIN`) only if coverage gaps appear.
