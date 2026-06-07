# SDD Spec: DashboardScreen — Real Binance Data

## 1. Endpoint: `GET /api/dashboard/summary`

### Request

```
GET /api/dashboard/summary
Headers:
  Authorization: Bearer <jwt>
```

No query params en v1. Parámetros (symbol, spot) se definen en backend.

### Response: 200 OK

```typescript
interface DashboardSummaryResponse {
  success: true;
  data: {
    balances: Balance[];
    trades: BinanceTrade[];
    equityHistory: EquityPoint[];
    botStatus: BotStatus;
  };
}

// ---- Subtypes ----

interface Balance {
  asset: string;        // "BTC", "FDUSD", etc.
  free: string;         // "123.45"
  locked: string;       // "0.00"
}

interface BinanceTrade {
  id: number;
  symbol: string;       // "BTCFDUSD"
  orderId: number;
  price: string;
  qty: string;
  quoteQty: string;     // cantidad en FDUSD
  commission: string;
  commissionAsset: string;
  time: number;         // unix ms
  isBuyer: boolean;
  isMaker: boolean;
}

interface EquityPoint {
  date: string;         // "Jan 15"
  value: number;        // balance total FDUSD
}

interface BotStatus {
  active: boolean;
  runningSince: string | null;   // ISO date
  strategy: string;
}
```

### Response: Partial Error

```typescript
interface DashboardSummaryResponse {
  success: true;
  data: {
    balances: Balance[] | null;
    trades: BinanceTrade[] | null;
    equityHistory: EquityPoint[] | null;
    botStatus: BotStatus;
  };
  errors: DashboardError[];
}

interface DashboardError {
  source: "balances" | "trades" | "equity";
  message: string;
  code?: string;
}
```

### Response: Auth Error

```typescript
{
  success: false;
  error: {
    code: "NO_API_KEYS" | "INVALID_API_KEYS" | "BINANCE_ERROR";
    message: string;
  };
}
```

### Caching Strategy (v1 opcional)

- Cachear response en MongoDB por 30 segundos
- Key: `dashboard_summary:<userId>`
- Si hay cache válido, devolverlo sin llamar a Binance
- Forzar refresh con query param `?refresh=true`

---

## 2. Backend Architecture

```
backend/src/
├── routes/
│   └── dashboard.ts           ← NUEVO: define ruta, valida auth, llama al service
├── services/
│   └── binanceService.ts      ← NUEVO: llama a API de Binance con keys del usuario
├── types/
│   └── binance.ts             ← NUEVO: tipos para requests/responses de Binance
├── services/
│   └── dashboardService.ts    ← NUEVO: orquesta las 3 llamadas, computa botStatus
└── utils/
    └── binanceAuth.ts         ← NUEVO: genera firma HMAC-SHA256 para Binance
```

### Dashboard Service

```typescript
// dashboardService.ts
export async function getDashboardSummary(userId: string): Promise<DashboardSummaryResponse['data']> {
  // 1. Get user's encrypted API keys from MongoDB
  // 2. Decrypt keys
  // 3. Call Binance APIs in parallel (Promise.allSettled)
  //    - GET /api/v3/account
  //    - GET /api/v3/myTrades?symbol=BTCFDUSD&limit=20
  //    - GET /api/v3/accountSnapshot?type=SPOT
  // 4. Compute equityPoints from snapshot data
  // 5. Return consolidated response
}
```

### Binance API Client

```typescript
// binanceService.ts
export async function getAccount(apiKey: string, secretKey: string): Promise<BinanceAccountInfo>;
export async function getMyTrades(apiKey: string, secretKey: string, symbol: string): Promise<BinanceTrade[]>;
export async function getAccountSnapshot(apiKey: string, secretKey: string): Promise<BinanceSnapshot>;
```

### Bot Status (no-Binance)

`botStatus` se computa del lado del backend sin llamar a Binance:
- `active`: true si el usuario tiene API keys activas y el robot tiene su userId en la whitelist
- `runningSince`: timestamp de cuándo se activó el robot (de la colección de keys o perfil)
- `strategy`: configurable, por defecto "Conservative Spot Trading"

---

## 3. Frontend: Component Interfaces

### OnboardingBanner

```typescript
interface OnboardingBannerProps {
  has2FA: boolean;
  hasApiKeys: boolean;
  loading: boolean;
  onSetup2FA: () => void;
  onConnectApi: () => void;
}
```

Estados:
- `loading === true` → no renderiza nada
- `has2FA && hasApiKeys` → banner verde "Todo listo"
- `!has2FA || !hasApiKeys` → banner con steps faltantes (dismissible localmente)

Estado local: `dismissed: boolean`

### KPIGrid

```typescript
interface KPIGridProps {
  initialBalance: number;
  currentBalance: number;
  grossProfit: number;
  performance: string;     // "+2.34%"
  pendingFee: number;
}
```

Puro render. Computa:
- `grossProfit = currentBalance - initialBalance`
- `performance = ((grossProfit / initialBalance) * 100).toFixed(2)`
- `pendingFee = grossProfit * 0.07`

### EquityChart

```typescript
interface EquityChartProps {
  data: EquityPoint[];
}
```

Estado local: `selectedPeriod: "1D" | "1W" | "1M" | "3M" | "ALL"` (default: "ALL")

### BotStatusPanel

```typescript
interface BotStatusPanelProps {
  botStatus: "active" | "paused" | "error";
  runningSince: string | null;
  strategy: string;
  onToggleBot: () => void;
  onWithdraw: () => void;
  onRiskSettings: () => void;
}
```

### RecentTradesTable

```typescript
interface RecentTradesTableProps {
  trades: Trade[];
}
```

Donde `Trade` es el tipo existente en `src/types/index.ts` o uno adaptado del response de Binance.

---

## 4. Data Flow

```
Binance API
    │
    ▼
binanceService.ts (3 calls paralelas)
    │
    ▼
dashboardService.ts (orquesta, computa, mapea)
    │
    ▼
GET /api/dashboard/summary
    │
    ▼
DashboardScreen.tsx (orquestador frontend)
    │
    ├─► OnboardingBanner
    ├─► KPIGrid
    ├─► EquityChart
    ├─► BotStatusPanel
    └─► RecentTradesTable
```

---

## 5. Test Plan

### Backend

| Test | Archivo |
|---|---|
| `GET /api/dashboard/summary` retorna datos correctos cuando Binance responde OK | `backend/src/routes/__tests__/dashboard.test.ts` |
| `GET /api/dashboard/summary` retorna errores parciales cuando un call falla | ídem |
| `GET /api/dashboard/summary` retorna 401 si no hay API keys | ídem |
| `GET /api/dashboard/summary` retorna cache cuando está vigente | ídem |
| binanceService construye firma HMAC correctamente | `backend/src/services/__tests__/binanceService.test.ts` |
| dashboardService computa KPIs correctamente | ídem |

### Frontend

| Test | Archivo |
|---|---|
| OnboardingBanner renderiza 3 estados | `src/screens/__tests__/DashboardScreen.test.tsx` |
| KPIGrid renderiza 5 KPIs con valores | ídem |
| EquityChart renderiza chart con datos | ídem |
| BotStatusPanel toggle llama callback | ídem |
| RecentTradesTable renderiza rows con formato condicional | ídem |
| DashboardScreen orquestador fetch + fallback | ídem |
