## Exploration: Cumulative Deposits Breakdown

### Current State

The system currently detects a **single earliest operation** (deposit or transfer) per account:

1. **Backend — `dashboardService.computeInitialBalance()`** (L161-193): A pure function that receives `BinanceDeposit[]` and `BinanceTransfer[]`, normalizes both into a `CandidateOperation` union, sorts by timestamp, and returns the single earliest `InitialOperation | null`. It does NOT filter by deposit status — all deposits with a parsable numeric amount are candidates. Transfers have no status filter either.

2. **Backend — `getDashboardSummary()` orchestrator** (L201-339): Uses `Promise.allSettled` to fan out across 4 transfer sources (`TRANSFER_SOURCES` array: MAIN_UMFUTURE, MAIN_FUNDING, MAIN_C2C via universal-transfer endpoint, and sub-account via `/sapi/v1/sub-account/transfer/subUserHistory`). Flattened results are passed to `computeInitialBalance` alongside deposits. The orchestrator does NOT filter deposits by status; it passes whatever `getDepositHistory` returns.

3. **Backend — `getDepositHistory()`** (binanceService.ts:164-177): Calls `/sapi/v1/capital/deposit/hisrec` with **hardcoded `status: 1`** (success only). This means status=6 (credited) deposits are NOT fetched. Status codes: 0=pending, 1=success, 6=credited (can be withdrawn but still needs confirmations). The `BinanceDeposit` type (binance.ts:65-75) tracks `status: number`.

4. **Frontend — `KPIGrid` component** (KPIGrid.tsx): Receives `initialOperation: InitialOperation | null`, renders a single card with label ("Depósito Inicial" | "Transferencia Inicial" | "Sin operación inicial") and value (`{amount} {coin}`). Single-coin, single-operation display.

5. **Frontend — `DashboardScreen`** (DashboardScreen.tsx:40-45): Derives `initialAmount` from `initialOperation.amount` (falls back to `currentBalance` when null). This single number feeds `grossProfit`, `performance`, `pendingFee` computation. Changing to a multi-coin map breaks this calculation chain.

6. **Frontend — `EquityChart`** (EquityChart.tsx): Uses `initialOperation.amount` as the ReferenceLine Y coordinate. Null operation = no line.

7. **Frontend — `WithdrawModal`** (WithdrawModal.tsx): Displays `initialOperation` label and amount for context in the withdrawal flow.

8. **Route schema** (dashboard.ts:35-49): `initialBalance` field is typed as `["object", "null"]` with required `type`, `coin`, `amount`, `time` properties.

9. **Type contracts**:
   - `backend/src/types/binance.ts`: `InitialOperation` interface — single operation: `type`, `coin`, `amount`, `time`.
   - `src/types/index.ts`: `InitialOperation` interface — identical shape.
   - `DashboardSummaryData.initialBalance: InitialOperation | null`.

10. **Tests**: 6 unit tests for `computeInitialBalance` (dashboardService.test.ts:270-389), 5 integration tests for the fan-out + contract (dashboard.test.ts:245-635), 6 frontend tests for KPIGrid, 3 for EquityChart, 7 for useDashboard propagation, 6 for WithdrawModal display.

### Affected Areas

- **`backend/src/services/dashboardService.ts`** — Replace `computeInitialBalance()` with `computeCumulativeDeposits()`. Modify `getDashboardSummary()` orchestrator to call it. Change return type from `InitialOperation | null` to `CumulativeDeposits`.
- **`backend/src/services/binanceService.ts`** — `getDepositHistory()` must query BOTH status=1 AND status=6 deposits (currently only status=1).
- **`backend/src/types/binance.ts`** — Add `CumulativeDeposits` type (`Record<string, number>` or `{coin: string; totalAmount: number}[]`). Remove or deprecate `InitialOperation` and `InitialBalance`.
- **`backend/src/routes/dashboard.ts`** — Update Fastify response schema: replace `initialBalance: InitialOperation | null` with `cumulativeDeposits: {[coin: string]: number}` or array form.
- **`src/types/index.ts`** — Replace `InitialOperation` with `CumulativeDeposits` type. Update `DashboardSummaryData.initialBalance` field.
- **`src/components/dashboard/KPIGrid.tsx`** — Replace single `initialOperation` prop with `cumulativeDeposits`. Render list of coins with amounts. Keep or change label ("Total Deposited" vs "Initial Deposit").
- **`src/screens/DashboardScreen.tsx`** — Compute `initialAmount` differently: sum of all FDUSD deposits, or first FDUSD value, or total across all coins. This feeds `grossProfit`/`performance`/`pendingFee`.
- **`src/components/dashboard/EquityChart.tsx`** — Update ReferenceLine prop to use the total FDUSD amount (or remove if not meaningful).
- **`src/screens/WithdrawModal.tsx`** — Update to display total deposited breakdown or a summary line.
- **`src/hooks/useDashboard.ts`** — Type update only (passthrough).
- **`backend/src/services/__tests__/dashboardService.test.ts`** — Replace `computeInitialBalance` tests with `computeCumulativeDeposits` tests. Update fan-out mock expectations.
- **`backend/src/routes/__tests__/dashboard.test.ts`** — Update mocked integration tests to assert cumulative deposits contract.
- **`src/components/dashboard/__tests__/KPIGrid.test.tsx`** — Replace single-operation assertions with multi-coin list.
- **`src/components/dashboard/__tests__/EquityChart.test.tsx`** — Update ReferenceLine assertions.
- **`src/screens/__tests__/WithdrawModal.test.tsx`** — Update operation display assertions.
- **`src/hooks/__tests__/useDashboard.test.ts`** — Update passthrough test data shapes.
- **`openspec/specs/initial-operation-detection/spec.md`** — Replace entirely with cumulative-deposits spec.
- **`openspec/specs/dashboard-initial-operation-display/spec.md`** — Replace entirely with cumulative-deposits-display spec.

### Approaches

1. **Add `cumulativeDeposits` alongside `initialBalance`, keep both** — Add new field, deprecate old. Frontend migrates gradually.
   - Pros: Non-breaking migration path. Old consumers keep working. Risk low.
   - Cons: More code to maintain. Dual schema fields confuse the API contract. Creates tech debt.
   - Effort: Medium

2. **Replace `initialBalance` with `cumulativeDeposits` entirely** — Breaking change. Replace `InitialOperation` with `CumulativeDeposits` everywhere.
   - Pros: Clean contract. Single source of truth. No legacy code. Aligns with user's directive ("La tarjeta Initial Deposit pasa a Total Deposited").
   - Cons: Breaking change across 6+ frontend components. `DashboardScreen` math (grossProfit = currentBalance - initialAmount) loses its single-number anchor. EquityChart reference line is ambiguous with multiple coins.
   - Effort: High

3. **Replace `computeInitialBalance` with `computeCumulativeDeposits`; preserve a synthetic `totalDepositedFDUSD` number for math continuity** — The cumulative breakdown (`{coin: totalAmount}` map) replaces the single-operation object, but the route also returns a derived `totalDepositedFDUSD: number` to keep KPI math working.
   - Pros: Most of the breaking-change risk is absorbed by adding a backward-compatible numeric field. Frontend math survives with minimal changes. EquityChart reference line stays meaningful.
   - Cons: Still a breaking change for `KPIGrid` and `WithdrawModal` display. `totalDepositedFDUSD` is a heuristic (FDUSD is the main stablecoin for this user; what about multi-coin accounts?).
   - Effort: Medium

### Recommendation

**Approach 3** — Replace `InitialOperation` with `CumulativeDeposits` and add a derived `totalDepositedFDUSD` field.

Reasons:
- The user explicitly said "La tarjeta Initial Deposit pasa a Total Deposited" — the single-card era ends. Multi-coin breakdown is the new contract.
- The math chain (`grossProfit = currentBalance - initialAmount`) is the only place that needs a single number, and FDUSD is the user's primary unit. A derived `totalDepositedFDUSD` (sum of all FDUSD deposits + FDUSD transfers) preserves this chain without ambiguity.
- This avoids the maintenance burden of dual schema fields (Approach 1).
- The "known limitation" about main-to-sub transfers being invisible from SAPI public API is important context, but doesn't change the implementation — it's documentation.

Open design question for the spec phase: what exactly does the KPIGrid card show? One option: "Total Deposited" label + a compact list like "10.14 FDUSD, 0.5 BTC" with the breakdown. Another: single "Total Deposited" card shows total FDUSD amount, with a separate expandable breakdown list.

### Risks

- **KPI Math Breakage**: `grossProfit = currentBalance - initialAmount` currently falls back to `currentBalance` when `initialBalance` is null, making `grossProfit` = 0. With cumulative deposits, if no FDUSD deposits exist, `totalDepositedFDUSD` could be 0, giving a misleadingly large `grossProfit = currentBalance - 0`. Mitigation: when `totalDepositedFDUSD` is 0/nil, fall back to `currentBalance` as before.
- **Binance Deposit Status 6**: The user directive says "status=1 or 6". `getDepositHistory` currently hardcodes `status: 1`. Binance only supports one status per call, so we need two calls (status=1 + status=6) with `Promise.allSettled` — adds 1 more API call. Risk: rate limit increase (marginal: 1 extra call per 30s cache window).
- **MAIN_C2C endpoint**: Already documented as potentially invalid. If it returns errors in production, tests that depend on its fan-out entry may need adjustment.
- **Frontend surface area**: 4+ components change their prop shapes. The diff will be non-trivial but well-bounded.

### Ready for Proposal

**Yes** — but the orchestrator should ask the user one clarifying question before the spec phase:

> The KPIGrid card currently shows one operation with a dynamic label ("Depósito Inicial" / "Transferencia Inicial"). With cumulative deposits, what should the card look like?
> 1. "Total Deposited: 10.14 FDUSD" with other coins in a small list below, OR
> 2. "Total Deposited: 10.14 FDUSD" only (just the FDUSD total, breakdown elsewhere)
>
> The first option keeps the card compact but informative; the second is simpler but hides coin diversity.
