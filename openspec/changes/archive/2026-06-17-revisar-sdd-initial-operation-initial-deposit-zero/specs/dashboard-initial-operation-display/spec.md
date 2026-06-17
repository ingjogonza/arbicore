# Delta for dashboard-initial-operation-display

## MODIFIED Requirements

### Requirement: Display Operation in KPI Grid

The KPI Grid MUST display the initial operation's type, coin, and amount. The label SHALL dynamically reflect the operation type (e.g., "Depósito Inicial" for deposits, "Transferencia Inicial" for transfers).

(Previously: scenarios did not cover FDUSD internal transfer detection from expanded sources)

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

#### Scenario: FDUSD internal transfer displayed

- GIVEN the initial operation has type `"transfer"`, coin `"FDUSD"`, and amount `10.14119044`
- WHEN the KPI Grid renders
- THEN it SHALL display the label "Transferencia Inicial"
- AND it SHALL display the value "10.14119044 FDUSD"

#### Scenario: No initial operation

- GIVEN the initial operation is `null`
- WHEN the KPI Grid renders
- THEN it SHALL display a fallback label (e.g., "Sin operación inicial")
- AND it SHALL NOT display an amount value
