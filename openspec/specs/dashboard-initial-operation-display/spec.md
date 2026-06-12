# Dashboard Initial Operation Display Specification

## Purpose

Render the detected initial account operation (type, coin, and amount) in the dashboard KPI Grid and WithdrawModal, replacing the previous static "Initial Balance" display with dynamic, data-driven content.

## Requirements

### Requirement: Display Operation in KPI Grid

The KPI Grid MUST display the initial operation's type, coin, and amount. The label SHALL dynamically reflect the operation type (e.g., "Depósito Inicial" for deposits, "Transferencia Inicial" for transfers).

#### Scenario: Deposit operation displayed

- GIVEN the initial operation has type `"deposit"`, coin `"BTC"`, and amount `0.5`
- WHEN the KPI Grid renders
- THEN it SHALL display the label "Depósito Inicial"
- AND it SHALL display the value "0.5 BTC"

#### Scenario: Transfer operation displayed

- GIVEN the initial operation has type `"transfer"`, coin `"USDT"`, and amount `1000`
- WHEN the KPI Grid renders
- THEN it SHALL display the label "Transferencia Inicial"
- AND it SHALL display the value "1000 USDT"

#### Scenario: No initial operation

- GIVEN the initial operation is `null`
- WHEN the KPI Grid renders
- THEN it SHALL display a fallback label (e.g., "Sin operación inicial")
- AND it SHALL NOT display an amount value

### Requirement: Display Operation in WithdrawModal

The WithdrawModal MUST use real dashboard data for the initial operation instead of mock or hardcoded values. It SHALL display the operation type, coin, and amount consistently with the KPI Grid.

#### Scenario: WithdrawModal shows real operation data

- GIVEN the dashboard has a detected initial operation
- WHEN the WithdrawModal opens
- THEN it SHALL display the same operation type, coin, and amount as the KPI Grid

#### Scenario: WithdrawModal with no operation

- GIVEN the initial operation is `null`
- WHEN the WithdrawModal opens
- THEN it SHALL display a fallback indicating no initial operation is available

### Requirement: Dashboard Summary Data Type Contract

The `DashboardSummaryData` type MUST change the `initialBalance` field from `string | null` to `InitialOperation | null`, where `InitialOperation` contains `type`, `coin`, `amount`, and `time` fields.

#### Scenario: Type contract enforced

- GIVEN the backend returns an `InitialOperation` object
- WHEN the frontend receives the dashboard summary
- THEN the `initialBalance` field SHALL conform to the `InitialOperation | null` type

#### Scenario: Null propagation

- GIVEN the backend returns `null` for `initialBalance`
- WHEN the frontend receives the dashboard summary
- THEN the `initialBalance` field SHALL be `null` and components SHALL handle it gracefully

### Requirement: Equity Chart Adaptation

The EquityChart component MUST adapt its reference line to use the `amount` from the `InitialOperation` object instead of a raw string value.

#### Scenario: Chart reference line with operation

- GIVEN the initial operation has amount `500`
- WHEN the EquityChart renders
- THEN the reference line SHALL be positioned at value `500`

#### Scenario: Chart reference line with null operation

- GIVEN the initial operation is `null`
- WHEN the EquityChart renders
- THEN it SHALL NOT render a reference line for the initial operation

### Requirement: Hook Integration

The `useDashboard` hook MUST expose the `initialBalance` field as an `InitialOperation | null` type and propagate it to all consuming components.

#### Scenario: Hook provides typed operation

- GIVEN the dashboard API returns a valid initial operation
- WHEN `useDashboard` is called
- THEN the returned `initialBalance` SHALL be the typed `InitialOperation` object

#### Scenario: Hook handles null

- GIVEN the dashboard API returns `null` for `initialBalance`
- WHEN `useDashboard` is called
- THEN the returned `initialBalance` SHALL be `null`
