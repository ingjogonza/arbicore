# Design: Replace Initial Balance with Initial Account Operation

## Technical Approach

Introduce an `InitialOperation` interface that replaces the static string `initialBalance`. The backend will query both `/sapi/v1/capital/deposit/hisrec` and `/sapi/v1/asset/transfer`, map them to a unified format, and return the earliest operation based on the timestamp. The frontend will consume this object to display dynamic labels ("Depósito Inicial" vs "Transferencia Inicial") and values in the `KPIGrid` and `WithdrawModal`, eliminating the previous mock data usage.

## Architecture Decisions

### Decision: Graceful Degradation for Transfer API

**Choice**: If the Binance transfer API fails (e.g., due to lack of permissions), log a warning, return an empty array, and fall back to deposit history.
**Alternatives considered**: Fail the entire dashboard request, or return an explicit error payload for the initial operation.
**Rationale**: Binance API keys often lack transfer read permissions by default. Failing the dashboard for a historical KPI creates a poor UX. Degrading gracefully ensures the core dashboard remains functional.

### Decision: Data Source for WithdrawModal

**Choice**: Pass dashboard data (`initialOperation`, `currentBalance`) via props from `DashboardScreen` to `WithdrawModal`.
**Alternatives considered**: Call `useDashboard` directly inside `WithdrawModal`, or update the `useTrading` mock hook to use real data.
**Rationale**: `DashboardScreen` already fetches and normalizes this data. Passing props avoids duplicate requests and tightly couples the modal's state to the real dashboard state, ensuring consistency and solving the mock data drift issue.

### Decision: Unification of Operation Timestamps

**Choice**: Map `insertTime` (from deposits) and `timestamp` (from transfers) to a unified `time` property in `InitialOperation`.
**Alternatives considered**: Expose raw Binance fields and let the frontend parse them.
**Rationale**: Keeps the frontend contract clean and prevents domain leakage from Binance's specific API quirks.

## Data Flow

```text
Binance API ──(Deposits)──────┐
                              ▼
Binance API ──(Transfers)──→ dashboardService ──(Sort & Pick Earliest)──┐
                                                                        ▼
   KPIGrid ◀── DashboardScreen ◀── useDashboard ◀── GET /summary ───────┘
      │               │
      ▼               ▼
WithdrawModal    EquityChart
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/src/types/binance.ts` | Modify | Define `BinanceTransfer` and `InitialOperation` types; update `InitialBalance`. |
| `backend/src/services/binanceService.ts` | Modify | Add `getTransferHistory` using the `/sapi/v1/asset/transfer` endpoint. |
| `backend/src/services/dashboardService.ts` | Modify | Update `computeInitialBalance` to merge and sort both lists; handle transfer Promise errors gracefully. |
| `backend/src/routes/dashboard.ts` | Modify | Update Fastify schema to reflect `initialBalance` as an object. |
| `src/types/index.ts` | Modify | Add `InitialOperation` interface; update `DashboardSummaryData.initialBalance` type. |
| `src/hooks/useDashboard.ts` | Modify | No explicit logic change, but types transparently flow through. |
| `src/screens/DashboardScreen.tsx` | Modify | Extract `amount` for derived KPI math; pass `initialOperation` to children. |
| `src/components/dashboard/KPIGrid.tsx` | Modify | Accept `InitialOperation`; render dynamic label and `amount + coin`. |
| `src/screens/WithdrawModal.tsx` | Modify | Remove `useTrading`; accept real data props; show dynamic operation values. |
| `src/components/dashboard/EquityChart.tsx` | Modify | Update `initialBalance` reference line to use `initialOperation.amount`. |
| `src/data/mock.ts` | Modify | Update `mockAccount.initialBalance` type semantics if needed to align with components. |

## Interfaces / Contracts

```typescript
// Shared Interface (Frontend & Backend)
export interface InitialOperation {
  type: "deposit" | "transfer";
  coin: string;
  amount: number;
  time: number; // Unix timestamp
}

// Updated DashboardSummaryData
export interface DashboardSummaryData {
  // ...
  initialBalance: InitialOperation | null;
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `computeInitialBalance` | Mock various deposit/transfer arrays. Assert it picks the absolute earliest and formats correctly. |
| Integration | `GET /dashboard/summary` | Mock `binanceService` to return transfers/deposits. Assert graceful failure on transfer error. |
| Component | `KPIGrid` | Pass deposit, transfer, and null states. Assert correct label and value rendering. |
| Component | `WithdrawModal` | Assert real dashboard props are used for calculations, replacing mock data. |

## Migration / Rollout

No database migration required. The change relies strictly on external API aggregations.

## Open Questions

- [ ] Which specific Binance transfer endpoint should be used? We assume `/sapi/v1/asset/transfer` for universal transfers, but if sub-accounts are involved, `/sapi/v1/sub-account/transfer/subUserHistory` may be required.
