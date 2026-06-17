# Delta for initial-operation-detection

## MODIFIED Requirements

### Requirement: Query Transfer History

The system MUST retrieve the user's internal transfer history from the Binance API by querying **all relevant transfer sources** (including Main↔Futures, sub-account, and internal spot transfers), including coin, amount, and timestamp for each transfer. The system SHALL query sources in parallel and merge successful results.

(Previously: queried only a single hardcoded transfer source type `MAIN_UMFUTURE`)

#### Scenario: Transfers available

- GIVEN the Binance API returns one or more transfer records from any queried source
- WHEN the system queries transfer history
- THEN it SHALL return all transfers with coin, amount, and timestamp fields

#### Scenario: Transfer API unavailable

- GIVEN all Binance transfer endpoints return errors or are not permitted
- WHEN the system queries transfer history
- THEN it SHALL return an empty array and log a warning

#### Scenario: Internal FDUSD transfer detected

- GIVEN the user's initial funding was an internal/sub-account FDUSD transfer
- WHEN the system queries transfer history across all relevant sources
- THEN it SHALL include the FDUSD transfer in results with correct coin, amount, and timestamp

#### Scenario: Partial transfer source failure

- GIVEN one transfer source (e.g., sub-account) returns an error or permission denied
- AND another transfer source returns valid data
- WHEN the system queries transfer history
- THEN it SHALL return transfers from successful sources only
- AND it SHALL log a warning for the failed source
- AND it SHALL NOT fail the overall transfer query

### Requirement: Fallback on Partial API Failure

The system SHOULD gracefully degrade when one data source fails. If any individual transfer source or the deposit API is unavailable, the system SHALL fall back to remaining successful sources without failing the overall request.

(Previously: only covered transfer API vs deposit API failure, not individual transfer source failures)

#### Scenario: Transfer API fails, deposits succeed

- GIVEN all transfer endpoints return errors
- AND the deposit API returns valid data
- WHEN the system determines the initial operation
- THEN it SHALL return the earliest deposit
- AND it SHALL NOT propagate the transfer error to the caller

#### Scenario: One transfer source fails, others succeed

- GIVEN one transfer source returns a permission or endpoint error
- AND other transfer sources return valid transfer data
- WHEN the system determines the initial operation
- THEN it SHALL include transfers from successful sources in earliest-operation detection
- AND it SHALL NOT propagate the individual source error to the caller
