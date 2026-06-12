# Initial Operation Detection Specification

## Purpose

Detect the earliest account operation (deposit or transfer) from Binance history to represent how the account was initially funded. This replaces the previous static "Initial Balance" string with a structured operation result.

## Requirements

### Requirement: Query Deposit History

The system MUST retrieve the user's deposit history from the Binance API, including coin, amount, and timestamp for each deposit.

#### Scenario: Deposits available

- GIVEN the Binance API returns one or more deposit records
- WHEN the system queries deposit history
- THEN it SHALL return all deposits with coin, amount, and timestamp fields

#### Scenario: No deposits exist

- GIVEN the Binance API returns an empty deposit list
- WHEN the system queries deposit history
- THEN it SHALL return an empty array

### Requirement: Query Transfer History

The system MUST retrieve the user's internal transfer history from the Binance API, including coin, amount, and timestamp for each transfer.

#### Scenario: Transfers available

- GIVEN the Binance API returns one or more transfer records
- WHEN the system queries transfer history
- THEN it SHALL return all transfers with coin, amount, and timestamp fields

#### Scenario: Transfer API unavailable

- GIVEN the Binance transfer endpoint returns an error or is not permitted
- WHEN the system queries transfer history
- THEN it SHALL return an empty array and log a warning

### Requirement: Determine Earliest Operation

The system MUST compare all deposits and transfers by timestamp and return the single earliest operation as a typed object.

#### Scenario: Deposit is earliest

- GIVEN deposits and transfers both exist
- AND the earliest deposit timestamp precedes the earliest transfer timestamp
- WHEN the system determines the initial operation
- THEN it SHALL return the deposit with type `"deposit"`, coin, amount, and time

#### Scenario: Transfer is earliest

- GIVEN deposits and transfers both exist
- AND the earliest transfer timestamp precedes the earliest deposit timestamp
- WHEN the system determines the initial operation
- THEN it SHALL return the transfer with type `"transfer"`, coin, amount, and time

#### Scenario: Only deposits exist

- GIVEN deposits exist but no transfers are available
- WHEN the system determines the initial operation
- THEN it SHALL return the earliest deposit

#### Scenario: Only transfers exist

- GIVEN transfers exist but no deposits are available
- WHEN the system determines the initial operation
- THEN it SHALL return the earliest transfer

#### Scenario: No operations exist

- GIVEN both deposit and transfer histories are empty
- WHEN the system determines the initial operation
- THEN it SHALL return `null`

### Requirement: Typed Operation Result

The system MUST return the initial operation as a structured object with fields: `type` (string: `"deposit"` | `"transfer"`), `coin` (string), `amount` (number), and `time` (number, Unix timestamp). A `null` value indicates no operations found.

#### Scenario: Result shape contract

- GIVEN the system has determined an initial operation
- WHEN the result is returned to the caller
- THEN it SHALL conform to the type `InitialOperation | null`
- AND `type` SHALL be either `"deposit"` or `"transfer"`

### Requirement: Fallback on Partial API Failure

The system SHOULD gracefully degrade when one data source fails. If the transfer API is unavailable, the system SHALL fall back to deposit-only detection without failing the overall request.

#### Scenario: Transfer API fails, deposits succeed

- GIVEN the transfer API returns an error
- AND the deposit API returns valid data
- WHEN the system determines the initial operation
- THEN it SHALL return the earliest deposit
- AND it SHALL NOT propagate the transfer error to the caller
