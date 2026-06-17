## Exploration: Why Initial Deposit Card Shows Zero Despite Binance Transfer of 10.14 FDUSD

### Current State

The system detects the earliest account operation (deposit or transfer) via two Binance API endpoints:
1. **Deposits**: `GET /sapi/v1/capital/deposit/hisrec` with `status=1` (successful on-chain deposits)
2. **Transfers**: `GET /sapi/v1/asset/transfer` with **hardcoded `type=MAIN_UMFUTURE`** (Main ↔ UM Futures only)

The results are merged by `computeInitialBalance()` (dashboardService.ts:152-184), which picks the single earliest operation by timestamp. If both sources are empty, it returns `null`. The frontend KPIGrid renders `null` as "Sin operación inicial" with no value — users perceive this as "zero."

### Root Cause

**`getTransferHistory` hardcodes `type: "MAIN_UMFUTURE"` (binanceService.ts:196).**

The user's initial operation was a **spot-to-spot** FDUSD transfer (not Main↔Futures). Because the Binance Universal Transfer API requires a specific `type` parameter and only `MAIN_UMFUTURE` is queried, the spot-to-spot transfer is **never returned**. The deposit history is empty (the user has no on-chain deposits). `computeInitialBalance` receives two empty inputs → returns `null` → frontend shows "Sin operación inicial."

**Data flow trace:**
```
User's Binance account: spot-to-spot transfer 10.14 FDUSD @ 2026-06-04
  → getTransferHistory(type="MAIN_UMFUTURE") → [ ] (transfer is not MAIN_UMFUTURE)
  → getDepositHistory() → [ ] (no on-chain deposits)
  → computeInitialBalance([], []) → null
  → API: { initialBalance: null }
  → KPIGrid.render → "Sin operación inicial" (empty value)
```
**Note**: the label is "Sin operación inicial," not literally zero — users interpret the empty KPI card as "me sale en cero."

### Affected Areas

- `backend/src/services/binanceService.ts:193-205` — `getTransferHistory` hardcodes `type="MAIN_UMFUTURE"`; must query additional transfer types or use different endpoints to capture spot-to-spot/internal transfers.
- `backend/src/services/dashboardService.ts:286-315` — orchestrator calls `getTransferHistory` with default type; may need to query multiple types in parallel or handle sub-account endpoints.
- `backend/src/types/binance.ts:82-89` — `BinanceTransfer` type already has a `type` field (string), ready for multi-type results.
- `backend/src/services/__tests__/dashboardService.test.ts:270-389` — `computeInitialBalance` tests use only `MAIN_UMFUTURE` test data; need expansion.
- `backend/src/routes/__tests__/dashboard.test.ts:218-467` — mocked integration tests only simulate `MAIN_UMFUTURE` transfers.
- `backend/src/services/__tests__/binanceService.test.ts:316-396` — transfer tests hardcode `MAIN_UMFUTURE`.
- `openspec/specs/initial-operation-detection/spec.md` — spec covers "transfer is earliest" but assumes the transfer endpoint returns relevant data; no scenario for "transfer exists but wrong type filter excludes it."
- (No files): Sub-account transfer endpoint support does not exist in the codebase.

### Approaches

1. **Query multiple Universal Transfer types in parallel**
   - `getTransferHistory` is called once with `MAIN_UMFUTURE`; change orchestrator to query multiple types (`MAIN_UMFUTURE`, `MAIN_CMFUTURE`, `MAIN_MARGIN`, `MAIN_FUNDING`, `MAIN_INTERNAL`, etc.) in parallel via `Promise.allSettled`, merge results.
   - Pros: Quick fix within existing architecture; reuses `computeInitialBalance` as-is.
   - Cons: May still miss spot-to-spot transfers if Binance doesn't surface them under any universal transfer type; increased API calls (rate limit risk per type).
   - Effort: Low-Medium

2. **Add sub-account transfer endpoint (`/sapi/v1/sub-account/transfer/subUserHistory`)**
   - Query the sub-account transfer endpoint in addition to (or instead of) universal transfers. This endpoint returns transfers between master and sub-accounts or between sub-accounts.
   - Pros: Directly addresses the user's scenario ("sub-account transfer history"); captures spot-to-spot internal transfers.
   - Cons: Requires API key to have sub-account permissions; adds a third data source; spec update needed.
   - Effort: Medium

3. **Use deposit history API without status filter + expand to all possible funding sources**
   - The deposit endpoint already works; the user's transfer is NOT a deposit. However, Binance may list certain internal credit operations under deposit history. Drop `status=1` filter to see all deposit-like records.
   - Pros: Minimal code change (one query param).
   - Cons: Deposit history is for on-chain deposits — unlikely to include spot-to-spot transfers; spec says "deposit" type, this would mislabel transfers as deposits.
   - Effort: Low (but likely ineffective for this bug)

4. **Detect initial operation from account snapshot history instead**
   - Use `/sapi/v1/accountSnapshot` (already fetched for equity chart) to infer the first funded moment. The earliest snapshot with non-zero totalAssetOfBtc gives the initial balance, but loses coin/type detail.
   - Pros: Uses already-fetched data; no extra API calls.
   - Cons: Loses coin and type information (can't distinguish deposit vs transfer, can't show "10.14 FDUSD" — only shows FDUSD-equivalent BTC value); snapshot must be enabled on the account (many users lack it).
   - Effort: Low

### Recommendation

**Approach 1 + Approach 2 combined**: Query multiple Universal Transfer types in parallel AND add sub-account transfer endpoint support with graceful degradation.

**Rationale**:
- Approach 1 is the minimum fix — it would catch many transfer types but may not cover spot-to-spot.
- Approach 2 directly targets the user's description of "sub-account transfer history."
- Both degrade gracefully (if an endpoint fails, fall back to the other).
- The `computeInitialBalance` function is already designed to merge multiple sources — we just need to feed it the right data.
- Effort is contained: add ~2 functions to `binanceService.ts`, update orchestrator to call them, update tests.

**Ponytail note**: If the user confirms their transfer appears under a specific Binance endpoint/type, we can narrow to just that. Otherwise, querying both universal transfer types + sub-account transfers covers the most ground without guessing.

### Risks

- **Rate limiting**: Querying multiple transfer types or additional endpoints increases Binance API calls. Mitigation: batch with `Promise.all`, the caching layer (30s TTL) already limits duplicate calls.
- **API permission requirements**: Sub-account and some Universal Transfer types require specific API key permissions. If the user's key lacks them, those calls will reject → graceful degradation already handles this (dashboardService.ts:302-310).
- **Incomplete coverage**: Even with all types queried, some Binance-internal operations (spot-to-spot within same account, Convert operations, Earn subscriptions) may not appear in transfer history. The spec's fallback scenario ("No operations exist → null") already handles this gracefully.
- **Test surface expansion**: Adding endpoints means adding mock handlers in ~3 test files. Manageable but must be accounted for.

### Ready for Proposal

**Yes**. The root cause is clearly identified: `getTransferHistory` only queries `MAIN_UMFUTURE` transfers, missing spot-to-spot/internal transfers. Tell the user:

1. The backend only queries Main↔Futures transfers, not spot-to-spot or sub-account transfers.
2. To fix, we need to expand transfer type coverage and/or add sub-account transfer support.
3. Ask: what exact transfer type/endpoint does the user's Binance history show? This narrows the implementation effort.
4. The orchestrator should proceed to `sdd-propose` with this exploration as context.
