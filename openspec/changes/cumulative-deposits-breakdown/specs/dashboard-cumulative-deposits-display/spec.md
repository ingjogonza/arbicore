# Dashboard Cumulative Deposits Display Specification

## Purpose

Render the cumulative deposits per coin on the dashboard as a "Total Deposited" card, replacing the previous "Initial Deposit" card that showed only the earliest operation.

## Requirements

### Requirement: Render FDUSD as the primary value

The system MUST display the `totalDepositedFDUSD` value as the primary number of the card, formatted with two decimal places.

#### Scenario: Total Deposited is 10.14 FDUSD

- GIVEN `cumulativeDeposits = { FDUSD: 10.14 }` and `totalDepositedFDUSD = 10.14`
- WHEN the KPI grid renders
- THEN the first card shows "Total Deposited" with value "10.14 FDUSD"

#### Scenario: No deposits detected

- GIVEN `cumulativeDeposits = {}` and `totalDepositedFDUSD` equals the current balance fallback
- WHEN the KPI grid renders
- THEN the first card shows "Total Deposited" with the fallback value and no extra coin list

### Requirement: Render a compact list of other coins

When the cumulative map contains coins other than FDUSD, the system MUST render a compact list below the primary FDUSD value, comma-separated, with each entry formatted as `<amount> <COIN>` (e.g. "0.5 BTC, 250 USDT").

#### Scenario: Map contains BTC and USDT besides FDUSD

- GIVEN `cumulativeDeposits = { FDUSD: 10.14, BTC: 0.5, USDT: 250 }`
- WHEN the KPI grid renders
- THEN the first card shows "10.14 FDUSD" as the primary value and "0.5 BTC, 250 USDT" as a compact list below

#### Scenario: Map contains only FDUSD

- GIVEN `cumulativeDeposits = { FDUSD: 10.14 }`
- WHEN the KPI grid renders
- THEN the first card shows only "10.14 FDUSD" and no extra list is rendered

### Requirement: Display a clear label

The system MUST label the card "Total Deposited" in English (or the equivalent in the active UI locale).

#### Scenario: Card label

- WHEN the KPI grid renders
- THEN the first card's label is "Total Deposited"
