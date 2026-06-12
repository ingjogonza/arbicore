# Archive Report — sdd-initial-operation

**Archived**: 2026-06-12
**Change**: sdd-initial-operation
**Artifact Store**: OpenSpec
**Verify Verdict**: PASS WITH WARNINGS

## Summary

Replaced the static "Initial Balance" KPI with the actual first account operation (deposit or transfer). Backend queries Binance deposit and transfer history, determines the earliest operation, and returns it as a typed `InitialOperation` object. Frontend displays dynamic labels ("Depósito Inicial" / "Transferencia Inicial") and values in KPI Grid, WithdrawModal, and EquityChart.

## Specs Confirmed

| Domain | Status | Path |
|--------|--------|------|
| initial-operation-detection | ✅ Confirmed — source of truth | `openspec/specs/initial-operation-detection/spec.md` |
| dashboard-initial-operation-display | ✅ Confirmed — source of truth | `openspec/specs/dashboard-initial-operation-display/spec.md` |

No delta specs to merge — both specs were written directly as full specs in the source-of-truth location during the spec phase.

## Archive Contents

- `exploration.md` ✅ — requirement exploration
- `proposal.md` ✅ — intent, scope, approach, risks, rollback
- `design.md` ✅ — architecture decisions, data flow, file changes
- `tasks.md` ✅ — 17/17 tasks completed (marked `[x]`)
- `apply-progress.md` ✅ — implementation evidence (frontend PR 2 + backend PR 1 + remediation)
- `verify-report.md` ✅ — verification evidence (PASS WITH WARNINGS)
- `archive-report.md` ✅ — this file

## Verification Gate

- **Verdict**: PASS WITH WARNINGS
- **CRITICAL issues**: None
- **Total tests**: 429 (332 frontend + 97 backend)
- **Build**: Clean (`tsc && vite build` + backend `tsc`)

## Warnings Carried Forward

1. Frontend build emits existing `ts-jest` deprecation, Vite CSS `@import` order, and chunk-size warnings.
2. `EquityChart.tsx` branch coverage at 55.55% (line coverage 86.66% — acceptable).
3. Some legacy tests assert CSS classes — non-blocking, spec-critical behavior tested separately.
4. Binance transfer endpoint/type scope (`MAIN_UMFUTURE`) remains an open design question for future changes.

## Risks To Next Changes

- None carried from this archive. The change is fully complete and verified.
- The transfer-type scope question (`MAIN_UMFUTURE`) should be resolved in a dedicated change if broader transfer categories are needed.

## SDD Cycle Complete

The change has been fully planned, implemented, verified, and archived.
