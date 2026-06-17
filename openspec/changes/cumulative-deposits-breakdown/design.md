# Design: Cumulative Deposits Breakdown

## Technical Approach

Replace the `InitialOperation` contract with a per-coin cumulative map. The pure function `computeInitialBalance` becomes `computeTotalDeposited`, which returns `Record<string, number>`. The orchestrator adds a derived `totalDepositedFDUSD` numeric field for KPI math, falling back to the current account balance when the map is empty. The frontend `KPIGrid` component switches from a single-operation card to a "Total Deposited" card with breakdown by coin.

## Architecture Decisions

### Decision: Replace `computeInitialBalance` instead of adding a new function

**Choice**: Rename the function in place and change its return type.
**Alternatives considered**: Add `computeTotalDeposited` as a separate function and keep `computeInitialBalance` for back-compat.
**Rationale**: The change is a contract rename. Keeping both creates dead code and confusion about which one the UI uses. The frontend is owned by us, so we change it in lockstep. The deprecated `InitialBalance = InitialOperation | null` alias in `types/binance.ts` is removed.

### Decision: Include status=6 (credited) in deposit sum

**Choice**: Query `/sapi/v1/capital/deposit/hisrec` for both `status=1` (success) and `status=6` (credited) and aggregate them.
**Alternatives considered**: Keep `status=1` only; status=6 is for "credited to funding wallet" which is a later state of the same transfer.
**Rationale**: From the user's perspective, a deposit is "done" once it shows up in their balance. Both states represent money that has arrived. Excluding status=6 undercounts.

### Decision: Fall back to `currentBalance` when no deposits

**Choice**: `totalDepositedFDUSD` returns the FDUSD-denominated current account balance when the cumulative map is empty.
**Alternatives considered**: Return 0; return null; show "unknown".
**Rationale**: The KPI math chain (grossProfit, performance%) needs a positive baseline. When the user has zero detected deposits, the safest baseline is "what you have right now", which makes performance 0% and grossProfit 0. This matches the previous behavior of `initialBalance=null` falling back to balance.

### Decision: Sub-account internal transfer limitation documented, not patched

**Choice**: Spec documents the limitation. Future PR may add manual input feature.
**Alternatives considered**: Scrape BAPI endpoint; ask user to enter deposit manually now.
**Rationale**: Scraping BAPI requires cookie auth, which is fragile and against Binance ToS. Manual input is a separate UX feature that deserves its own SDD.

## Data Flow

```
dashboardService.getDashboardSummary(userId)
  -> getAccount, getDepositHistory (now status 1 + status 6), fan-out transfers
  -> computeTotalDeposited(deposits, transfers) -> Record<string, number>
  -> derive totalDepositedFDUSD from map (or currentBalance fallback)
  -> return { cumulativeDeposits, totalDepositedFDUSD, ... }

Frontend KPIGrid
  -> receives cumulativeDeposits: Record<string, number>
  -> receives totalDepositedFDUSD: number
  -> renders "Total Deposited" with FDUSD primary + compact list of others
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/src/types/binance.ts` | Modify | Replace `InitialOperation` and `InitialBalance` with `CumulativeDeposits = Record<string, number>` and add `totalDepositedFDUSD: number` to dashboard summary. |
| `backend/src/services/binanceService.ts` | Modify | `getDepositHistory` issues two parallel calls (`status=1` and `status=6`) and concatenates results. |
| `backend/src/services/dashboardService.ts` | Modify | Rename `computeInitialBalance` to `computeTotalDeposited`; change return shape; add `totalDepositedFDUSD` derivation. |
| `backend/src/services/__tests__/dashboardService.test.ts` | Modify | Update tests to assert map shape and derived field. |
| `backend/src/services/__tests__/binanceService.test.ts` | Modify | Update deposit tests to cover status=1 and status=6. |
| `backend/src/routes/dashboard.ts` | Modify | Update Fastify schema for new response fields. |
| `backend/src/routes/__tests__/dashboard.test.ts` | Modify | Update integration tests for new shape. |
| `frontend/src/types/index.ts` (or equivalent) | Modify | Replace `InitialOperation` with `CumulativeDeposits` type. |
| `frontend/src/components/dashboard/KPIGrid.tsx` | Modify | Replace `initialOperation` prop with `cumulativeDeposits` + `totalDepositedFDUSD`; render breakdown. |
| `frontend/src/components/dashboard/__tests__/KPIGrid.test.tsx` | Modify | Update tests for new render shape. |
| `openspec/specs/total-deposited-detection/spec.md` | Create | New full spec. |
| `openspec/specs/dashboard-cumulative-deposits-display/spec.md` | Create | New full spec. |
| `openspec/specs/initial-operation-detection/spec.md` | Archive | Replaced. |
| `openspec/specs/dashboard-initial-operation-display/spec.md` | Archive | Replaced. |

## Interfaces / Contracts

```ts
// backend/src/types/binance.ts
export type CumulativeDeposits = Record<string, number>;

export interface DashboardSummaryData {
  balances: DashboardBalance[] | null;
  trades: DashboardTrade[] | null;
  equityHistory: DashboardEquityPoint[] | null;
  botStatus: DashboardBotStatus;
  /** Per-coin cumulative deposits. Empty when no deposits detected. */
  cumulativeDeposits: CumulativeDeposits;
  /** FDUSD-denominated total. Falls back to current balance when map is empty. */
  totalDepositedFDUSD: number;
}
```

```ts
// backend/src/services/dashboardService.ts
export function computeTotalDeposited(
  deposits: BinanceDeposit[],
  transfers?: BinanceTransfer[],
): CumulativeDeposits;
```

```ts
// frontend/src/components/dashboard/KPIGrid.tsx
interface KPIGridProps {
  cumulativeDeposits: CumulativeDeposits;
  totalDepositedFDUSD: number;
  currentBalance: number;
  grossProfit: number;
  performance: string;
  pendingFee: number;
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `computeTotalDeposited` aggregates deposits (status 1, status 6) and transfers by coin. | Pure function tests in `dashboardService.test.ts`. |
| Unit | `getDepositHistory` returns both status=1 and status=6 results. | Mock `binanceGet` to assert both calls happen and results concat. |
| Unit | `totalDepositedFDUSD` falls back to `currentBalance` when map is empty. | Add test case. |
| Integration | `/api/dashboard/summary` returns the new shape. | Update Supertest in `dashboard.test.ts`. |
| Unit | `KPIGrid` renders "Total Deposited" + breakdown. | Update React Testing Library in `KPIGrid.test.tsx`. |

## Migration / Rollout

The change is a contract rename. Migration steps:

1. Backend implements new contract; old `initialBalance` field removed.
2. Frontend migrates to new contract in the same PR.
3. Cache key `dashboard:${userId}` (30s TTL) is invalidated on backend restart; no manual cache busting needed.
4. Specs `initial-operation-detection` and `dashboard-initial-operation-display` archived after the merge.

No data migration; no feature flag.

## Open Questions

- [ ] Should `totalDepositedFDUSD` fall back to the BTC-denominated current balance when the user has zero FDUSD? Current design falls back to whatever the account's "currentBalance" is, regardless of coin. The frontend formats it as "FDUSD" but the value is just "the user's total". This is acceptable for v1.
- [ ] Should the compact list be sorted by amount (desc) or alphabetical? Default to alphabetical for stability.
