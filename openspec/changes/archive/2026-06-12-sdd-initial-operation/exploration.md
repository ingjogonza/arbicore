## Exploration: Replace Initial Balance with Initial Account Operation

### Current State

The application currently displays "Initial Balance" in two places:

1. **Dashboard KPI Grid** (`src/components/dashboard/KPIGrid.tsx`): Shows a static numeric value labeled "Initial Balance".
2. **Withdraw Modal** (`src/screens/WithdrawModal.tsx`): Shows "Initial Balance" as part of the profit breakdown before withdrawal.

**Backend data flow:**
- `backend/src/services/dashboardService.ts` computes `initialBalance` by calling Binance `GET /sapi/v1/capital/deposit/hisrec`.
- It finds the **first completed FDUSD deposit** (or falls back to the first deposit of any coin) and returns the `amount` as a string.
- This value is returned in `DashboardSummaryData.initialBalance: string | null`.

**Frontend data flow:**
- `src/hooks/useDashboard.ts` fetches `/api/dashboard/summary`.
- `src/screens/DashboardScreen.tsx` receives `data.initialBalance`, parses it to a number, and falls back to `currentBalance` if null.
- It passes `initialBalance` to `KPIGrid`.
- `WithdrawModal` does **NOT** use `useDashboard`. It uses `useTrading` which reads from `mockAccount` (`src/data/mock.ts`). This is a **design inconsistency** — the WithdrawModal shows a static mock value while the Dashboard shows real Binance data.

**Existing types:**
- `backend/src/types/binance.ts`: `BinanceDeposit` interface with `amount`, `coin`, `insertTime`, `status`.
- `src/types/index.ts`: `DashboardSummaryData` has `initialBalance: string | null`.
- There is **no transfer model or API endpoint** in the backend.

**Tests affected:**
- `src/components/dashboard/__tests__/KPIGrid.test.tsx` — asserts "Initial Balance" text and formatting.
- `src/screens/__tests__/DashboardScreen.test.tsx` — asserts "Initial Balance" card renders.
- `src/screens/__tests__/WithdrawModal.test.tsx` — asserts "Initial Balance" text and profit math.
- `backend/src/services/__tests__/dashboardService.test.ts` — tests `computeInitialBalance` pure function.

### Affected Areas

- `src/components/dashboard/KPIGrid.tsx` — renders the "Initial Balance" KPI card; needs to display operation type + amount.
- `src/screens/DashboardScreen.tsx` — computes `initialBalance` from API; may need to handle new operation object.
- `src/screens/WithdrawModal.tsx` — uses `useTrading` mock account; needs to align with real dashboard data or be updated to accept new initial operation shape.
- `src/hooks/useDashboard.ts` — fetches summary; may need to handle new response structure.
- `src/types/index.ts` — `DashboardSummaryData` interface needs to change from `initialBalance: string | null` to an operation object.
- `backend/src/services/dashboardService.ts` — `computeInitialBalance` needs to consume both deposits and transfers and determine the earliest operation.
- `backend/src/services/binanceService.ts` — needs a new function to call Binance transfer history API.
- `backend/src/types/binance.ts` — needs new `BinanceTransfer` interface and update `DashboardSummaryData` / `InitialBalance` type.
- `backend/src/routes/dashboard.ts` — OpenAPI schema needs to reflect new response shape.
- `src/components/dashboard/EquityChart.tsx` — has a reference line for initial balance; may need to adapt if the value source changes.
- `src/data/mock.ts` — `mockAccount.initialBalance` used by `useTrading` / `WithdrawModal`.

### Approaches

1. **Full Backend + Frontend: Fetch Binance Deposits AND Transfers**
   - Add `getTransferHistory(apiKey, secretKey)` in `binanceService.ts` (Binance endpoint `/sapi/v1/asset/transfer` or `/sapi/v1/capital/transfer`).
   - Change `computeInitialBalance` in `dashboardService.ts` to accept both deposits and transfers, sort by `insertTime`/`timestamp`, and return the earliest operation with its type.
   - Change `InitialBalance` type from `string | null` to an object like `{ type: 'deposit' | 'transfer'; amount: string; coin: string; time: number } | null`.
   - Update frontend `KPIGrid` to render the label dynamically (e.g., "First Deposit" or "Transfer In") and the value.
   - Update `WithdrawModal` to consume the new shape (either via `useDashboard` or by passing props).
   - **Pros:** Fully accurate, matches user intent, distinguishes deposit vs transfer.
   - **Cons:** Requires new Binance API endpoint (permission/availability risk), touches backend types, service, route, frontend types, hooks, screens, components, and many tests. **High effort and risk**.
   - **Effort:** High

2. **Backend-Only Extension: Add Transfer Detection to Deposit History**
   - Keep using deposit history, but check if the first deposit has metadata or a network/address pattern that suggests it was an internal transfer (heuristic).
   - Return a simple flag like `isTransfer: boolean` alongside `initialBalance`.
   - Frontend changes label based on flag.
   - **Pros:** Minimal backend change, no new API calls.
   - **Cons:** Unreliable heuristic, may misclassify operations, doesn't actually fetch real transfer data.
   - **Effort:** Low

3. **Frontend-Only: Relabel and Show First Deposit Details**
   - Keep the current `initialBalance` value and data source.
   - Change the `KPIGrid` label from "Initial Balance" to "Initial Deposit" or "First Operation (Deposit)".
   - Show the coin and amount if available (e.g., "1,000 FDUSD").
   - Update `WithdrawModal` label similarly.
   - **Pros:** Very fast, zero backend risk, satisfies the user's intent partially if deposits are the common case.
   - **Cons:** Does not handle actual transfers, inaccurate if the initial operation was a transfer.
   - **Effort:** Low

### Recommendation

**Recommend Approach 1 (Full Backend + Frontend) as the target, but with a prerequisite clarification step.**

The user's intent is clear: they want to know the **first operation** (deposit or transfer) that seeded the account, not just a static balance number. Approach 1 is the only one that fulfills this accurately.

However, before committing to implementation, we must verify:
1. **Binance API availability:** Does the user's Binance API key have permission for `GET /sapi/v1/asset/transfer` (or the correct transfer history endpoint)? Is there a different endpoint for internal transfers?
2. **Data shape:** What fields does the transfer response return? Does it have a `timestamp`, `amount`, `asset`?
3. **Scope of `WithdrawModal`:** The modal currently uses `useTrading` (mock data) and is disconnected from `useDashboard`. This is a pre-existing bug that should be fixed as part of this change, or at least acknowledged.

**If the Binance API is unavailable or permission-restricted, fall back to Approach 3** as a quick win and document the limitation.

### Risks

- **Binance API Permission Risk:** The transfer history endpoint may require wallet permissions not granted to the API key. This could cause 401/403 errors and break the dashboard for users.
- **Breaking Type Change:** Changing `initialBalance` from `string | null` to an object is a breaking change across the frontend-backend contract. All tests and mocks must be updated.
- **WithdrawModal Data Drift:** `WithdrawModal` uses `useTrading` (mock `Account`) while `DashboardScreen` uses `useDashboard` (real API). If we only update `DashboardScreen`, the modal will still show stale/incorrect initial balance. This inconsistency must be resolved.
- **EquityChart Reference Line:** The chart references `initialBalance` as a number. If the shape changes, the chart logic needs updating.
- **Test Burden:** This change touches frontend unit tests (Jest), backend unit tests (Node native runner), and integration tests. With `strict_tdd: true`, all must be updated.

### Ready for Proposal

**Yes — with the following caveat for the orchestrator to tell the user:**

> We can implement this, but we need to confirm one thing: does your Binance API key have permission to read **transfer history** (not just deposit history)? The current code only reads deposits. To show "transfer from another account" accurately, we need to call Binance's transfer API. If that permission is not available, we can still show the **first deposit** with a clearer label (e.g., "Initial Deposit"), but true transfer detection won't be possible. Please confirm, or we can proceed with the deposit-only approach as a first iteration.

Also mention: the WithdrawModal currently uses **mock data** for initial balance, so it will be updated to use real dashboard data as part of this fix.
