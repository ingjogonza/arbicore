# SDD Proposal: DashboardScreen — Real Binance Data

## Problem

DashboardScreen usa datos mock (`mockAccount`, `mockTrades`, `equityData`) de `useTrading`. No refleja datos reales del usuario ni de Binance. Para que el dashboard sea funcional, debe consumir datos reales de la cuenta Binance del usuario autenticado.

## Scope

### Backend — Nuevo endpoint consolidado

```
GET /api/dashboard/summary
```

Realiza 3 llamadas a la API de Binance con las API keys del usuario autenticado:

| Binance API | Propósito | Uso en frontend |
|---|---|---|
| `GET /api/v3/account` | Balance completo (spot) | KPIGrid (initialBalance, currentBalance, netProfit) |
| `GET /api/v3/myTrades?symbol=BTCFDUSD` | Trades recientes del par | RecentTradesTable |
| `GET /api/v3/accountSnapshot?type=SPOT` | Snapshots históricos de balance | EquityChart |

**Parámetros fijos v1 (parametrizables a futuro):**
- Spot: FDUSD
- Pair: BTC/FDUSD

**Estrategia de errores parciales:**
Si un call a Binance falla, el endpoint devuelve `null` en esa sección + un array `errors[]` con detalles. El frontend muestra los datos disponibles y un alert donde falló.

**Cache:**
Opcional en v1. El response puede cachearse en MongoDB por N segundos (a definir).

### Frontend — Refactor de DashboardScreen

Extraer 5 componentes presentacionales y conectar los datos reales:

| Componente | Props | Estado |
|---|---|---|
| `OnboardingBanner` | `has2FA, hasApiKeys, loading, onSetup2FA, onConnectApi` | Local (`dismissed`) |
| `KPIGrid` | `initialBalance, currentBalance, grossProfit, performance, pendingFee` | Ninguno |
| `EquityChart` | `equityData: {date, value}[]` + período seleccionado | Local (período) |
| `BotStatusPanel` | `botStatus, botRunningSince, strategy, onToggleBot, onWithdraw` | Ninguno |
| `RecentTradesTable` | `trades: Trade[]` | Ninguno |

DashboardScreen pasa a ser orquestador: recibe datos del endpoint, computa derivados (grossProfit, performance, fee), y distribuye a los sub-componentes.

## Out of Scope

- No se agregan nuevos datos que Binance no provea
- No se implementa polling en tiempo real
- No se cambia la UI significativamente
- No se toca el robot Python

## Risks

1. **API keys inválidas/expiradas**: El endpoint devuelve error y el frontend debe mostrar un mensaje claro + link a ConnectScreen
2. **Rate limiting de Binance**: Muchos usuarios consultando el dashboard simultáneamente pueden rate-limitear. Solución: cache.
3. **Binance API downtime**: El endpoint debe fallar gracefulmente
4. **Latencia**: 3 calls secuenciales a Binance pueden ser lentos (considerar paralelización con `Promise.all`)
