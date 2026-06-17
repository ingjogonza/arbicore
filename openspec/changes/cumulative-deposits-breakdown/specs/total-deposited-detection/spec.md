# Total Deposited Detection Specification

## Purpose

Detect the cumulative deposits and incoming transfers per coin across the account's lifetime, replacing the previous "first operation" detection that only surfaced a single earliest event.

## Requirements

### Requirement: Aggregate deposits and transfers into a per-coin map

The system MUST aggregate the amount of every successful deposit and every incoming transfer grouped by coin, returning a `Record<string, number>` map.

#### Scenario: All deposits are FDUSD

- GIVEN two deposits: 1.0 FDUSD and 9.14 FDUSD
- AND no transfers
- WHEN total deposits are computed
- THEN the result is `{ FDUSD: 10.14 }`

#### Scenario: Multiple coins

- GIVEN one deposit of 5 FDUSD, one deposit of 0.5 BTC, and one transfer of 100 USDT
- WHEN total deposits are computed
- THEN the result is `{ FDUSD: 5, BTC: 0.5, USDT: 100 }`

#### Scenario: Status 1 and status 6 deposits

- GIVEN one deposit with `status=1` (success) and one deposit with `status=6` (credited)
- WHEN total deposits are computed
- THEN both are summed into the corresponding coin

#### Scenario: No deposits or transfers

- GIVEN an empty deposit list and an empty transfer list
- WHEN total deposits are computed
- THEN the result is `{}`

### Requirement: Include only confirmed on-chain deposits

The system MUST exclude pending deposits (`status=0`) and failed deposits from the cumulative sum.

#### Scenario: Pending deposit is excluded

- GIVEN one deposit with `status=1` (5 FDUSD) and one with `status=0` (10 FDUSD)
- WHEN total deposits are computed
- THEN the result is `{ FDUSD: 5 }`

### Requirement: Expose a derived FDUSD total for KPI math

The system MUST derive `totalDepositedFDUSD: number` from the per-coin map. The system MUST fall back to the current account balance when the derived value is `0` or `null`.

#### Scenario: FDUSD present in map

- GIVEN `{ FDUSD: 10.14, BTC: 0.001 }` and `currentBalance = 12.5`
- WHEN the derived FDUSD total is computed
- THEN the result is `10.14`

#### Scenario: Map is empty

- GIVEN `{}` and `currentBalance = 12.5`
- WHEN the derived FDUSD total is computed
- THEN the result is `12.5`

### Requirement: Known limitation on main-to-sub transfers

The system MUST document that Binance SAPI public API does not expose main-to-sub account transfers from the main account perspective. The system MUST continue to return the partial result computed from available sources.

#### Scenario: Only sub-account internal transfers exist

- GIVEN a user whose only operations are main-to-sub internal transfers
- WHEN the dashboard is queried
- THEN the cumulative deposits map is `{}` and `totalDepositedFDUSD` falls back to `currentBalance`
