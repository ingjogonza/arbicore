# SDD Design: DashboardScreen — Real Binance Data

## Overview

Refactor `DashboardScreen` from hardcoded mock data to real Binance API data via a consolidated backend endpoint (`GET /api/dashboard/summary`). Extract 5 presentational sub-components, keep `DashboardScreen` as the orchestrator. Backend calls 3 Binance APIs in parallel using `Promise.allSettled`, returns partial results on failure.

---

## 1. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
│                                                                  │
│  DashboardScreen.tsx (orchestrator)                              │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │ useEffect → fetch(`${API_BASE}/api/dashboard/summary`)  │     │
│  │   headers: { Authorization: Bearer <supabase token> }   │     │
│  └──────────────────────┬──────────────────────────────────┘     │
│                         │                                        │
│    ┌────────────────────┼────────────────────┐                   │
│    ▼                    ▼                    ▼                   │
│  OnboardingBanner    KPIGrid            EquityChart              │
│  BotStatusPanel      RecentTradesTable  (Trust Alert kept inline) │
└───────────────────────┼─────────────────────────────────────────┘
                        │ HTTPS
┌───────────────────────┼─────────────────────────────────────────┐
│                        BACKEND (Fastify)                         │
│                         ▼                                        │
│  routes/dashboard.ts                                           │
│    └─► GET /api/dashboard/summary                               │
│         │  • Auth already validated by registerAuth plugin       │
│         │  • userId = request.user.sub                          │
│         ▼                                                        │
│  services/dashboardService.ts                                   │
│    └─► getDashboardSummary(userId)                              │
│         │  1. getApiKeys(userId)  ← decrypt from MongoDB         │
│         │  2. Promise.allSettled([                               │
│         │       binanceService.getAccount(),                     │
│         │       binanceService.getMyTrades(),                    │
│         │       binanceService.getAccountSnapshot()              │
│         │     ])                                                 │
│         │  3. Map Binance responses → DashboardSummaryResponse   │
│         │  4. Compute botStatus from keys + profile              │
│         ▼                                                        │
│  services/binanceService.ts                                     │
│    └─► HTTP calls to api.binance.com with HMAC-SHA256 sig        │
│         • GET /api/v3/account                                    │
│         • GET /api/v3/myTrades?symbol=BTCFDUSD&limit=20          │
│         • GET /api/v3/accountSnapshot?type=SPOT                  │
│                                                                  │
│  utils/binanceAuth.ts                                           │
│    └─► buildSignature(method, path, queryString, secretKey)      │
│                                                                  │
│  types/binance.ts                                               │
│    └─► TypeScript interfaces for Binance API responses           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Backend — File-by-File Changes

### 2.1 `backend/src/types/binance.ts` (NEW)

**Purpose:** TypeScript interfaces for Binance API responses used across services and routes.

```typescript
// Binance API raw responses (from binanceService)

export interface BinanceBalance {
  asset: string;
  free: string;
  locked: string;
}

export interface BinanceAccountResponse {
  makerCommission: number;
  takerCommission: number;
  buyerCommission: number;
  sellerCommission: number;
  canTrade: boolean;
  canWithdraw: boolean;
  canDeposit: boolean;
  updateTime: number;
  accountType: string;
  balances: BinanceBalance[];
  permissions: string[];
}

export interface BinanceTradeResponse {
  id: number;
  symbol: string;
  orderId: number;
  orderListId: number;
  price: string;
  qty: string;
  quoteQty: string;
  commission: string;
  commissionAsset: string;
  time: number;
  isBuyer: boolean;
  isMaker: boolean;
  isBestMatch: boolean;
}

export interface BinanceSnapshotVipAsset {
  asset: string;
  totalAsset: string;
  freeAsset: string;
  lockedAsset: string;
}

export interface BinanceSnapshotDataPoint {
  time: number;
  data: {
    balances: BinanceSnapshotVipAsset[];
    totalAssetOfBtc: string;
  };
}

export interface BinanceSnapshotResponse {
  code: number;
  msg: string;
  snapshotVos: BinanceSnapshotDataPoint[];
}

// Service-level mapped types (returned by dashboardService)

export interface DashboardBalance {
  asset: string;
  free: string;
  locked: string;
}

export interface DashboardTrade {
  id: number;
  symbol: string;
  price: string;
  qty: string;
  quoteQty: string;
  commission: string;
  commissionAsset: string;
  time: number;
  isBuyer: boolean;
  isMaker: boolean;
}

export interface DashboardEquityPoint {
  date: string;   // "Jan 15"
  value: number;  // total balance in FDUSD
}

export interface DashboardBotStatus {
  active: boolean;
  runningSince: string | null;  // ISO date string
  strategy: string;
}
```

**Why new file:** Keeps Binance-specific types isolated from shared `types/index.ts`. Other services import from here without polluting the shared type namespace.

---

### 2.2 `backend/src/utils/binanceAuth.ts` (NEW)

**Purpose:** HMAC-SHA256 request signing for Binance REST API authentication.

```typescript
import { createHmac } from 'crypto';

/**
 * Builds the HMAC-SHA256 signature required by Binance REST APIs.
 *
 * @param method   HTTP method (GET, POST, etc.)
 * @param path     API path, e.g. '/api/v3/account'
 * @param query    Query string (may be empty for SIGNED endpoints)
 * @param secretKey  Binance secret key (decrypted)
 * @returns signature string to append as &signature=...
 */
export function buildSignature(
  method: string,
  path: string,
  query: string,
  secretKey: string,
): string {
  // Binance expects the signature over the full request line
  const signPayload = `${method} ${path}${query ? '?' + query : ''}`;
  return createHmac('sha256', secretKey).update(signPayload).digest('hex');
}

/**
 * Builds a complete Binance signed request URL with timestamp + signature.
 */
export function buildSignedUrl(
  baseUrl: string,
  path: string,
  query: Record<string, string | number> | undefined,
  secretKey: string,
): { url: string; headers: Record<string, string> } {
  const timestamp = Date.now();
  const params = new URLSearchParams({
    timestamp: String(timestamp),
    ...(query ? Object.fromEntries(
      Object.entries(query).map(([k, v]) => [k, String(v)])
    ) : {}),
  });
  const queryString = params.toString();
  const signature = buildSignature('GET', path, queryString, secretKey);

  return {
    url: `${baseUrl}${path}?${queryString}&signature=${signature}`,
    headers: {},
  };
}
```

**Design decisions:**
- `buildSignature` is unit-testable in isolation (pure function).
- `buildSignedUrl` composes timestamp + signature in one step, reducing boilerplate at call sites.
- Binance docs require signature over the full `METHOD PATH?QUERY` string, not just the query params — this matches their `SIGNED` endpoint spec.

---

### 2.3 `backend/src/services/binanceService.ts` (NEW)

**Purpose:** Low-level Binance API client. Each function makes one authenticated HTTP call.

```typescript
import https from 'https';
import { buildSignedUrl } from '../utils/binanceAuth';
import type {
  BinanceAccountResponse,
  BinanceTradeResponse,
  BinanceSnapshotResponse,
} from '../types/binance';

const BINANCE_BASE = 'https://api.binance.com';

/**
 * Generic HTTPS GET with Binance auth headers.
 */
function binanceGet<T>(path: string, query: Record<string, string | number>, apiKey: string, secretKey: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const { url } = buildSignedUrl(BINANCE_BASE, path, query, secretKey);
    const parsedUrl = new URL(url);

    const req = https.get({
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      headers: {
        'X-MBX-APIKEY': apiKey,
      },
      timeout: 15000,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(data)); }
          catch { reject(new Error(`Invalid JSON from Binance: ${data.slice(0, 200)}`)); }
        } else {
          reject(new Error(`Binance API ${res.statusCode}: ${data.slice(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Binance API timeout')); });
  });
}

/**
 * GET /api/v3/account — returns all spot balances.
 */
export async function getAccount(
  apiKey: string,
  secretKey: string,
): Promise<BinanceAccountResponse> {
  return binanceGet<BinanceAccountResponse>('/api/v3/account', {}, apiKey, secretKey);
}

/**
 * GET /api/v3/myTrades — returns recent trades for a symbol.
 */
export async function getMyTrades(
  apiKey: string,
  secretKey: string,
  symbol: string = 'BTCFDUSD',
  limit: number = 20,
): Promise<BinanceTradeResponse[]> {
  return binanceGet<BinanceTradeResponse[]>(
    '/api/v3/myTrades',
    { symbol, limit },
    apiKey,
    secretKey,
  );
}

/**
 * GET /api/v3/accountSnapshot?type=SPOT — returns historical balance snapshots.
 */
export async function getAccountSnapshot(
  apiKey: string,
  secretKey: string,
): Promise<BinanceSnapshotResponse> {
  return binanceGet<BinanceSnapshotResponse>(
    '/api/v3/accountSnapshot',
    { type: 'SPOT' },
    apiKey,
    secretKey,
  );
}
```

**Design decisions:**
- Uses Node.js native `https` module (no external HTTP client dependency).
- 15-second timeout per call to prevent hanging requests.
- Errors bubble up as `Error` instances — `dashboardService.ts` catches and converts them to `DashboardError[]`.

---

### 2.4 `backend/src/services/dashboardService.ts` (NEW)

**Purpose:** Orchestrator. Fetches user's decrypted API keys, calls 3 Binance APIs in parallel via `Promise.allSettled`, maps responses to the consolidated response shape.

```typescript
import { getApiKeys } from './keysService';
import { getAccount, getMyTrades, getAccountSnapshot } from './binanceService';
import { NotFoundError } from '../utils/errors';
import type {
  DashboardBalance,
  DashboardTrade,
  DashboardEquityPoint,
  DashboardBotStatus,
} from '../types/binance';

export interface DashboardError {
  source: 'balances' | 'trades' | 'equity';
  message: string;
  code?: string;
}

export interface DashboardSummaryData {
  balances: DashboardBalance[] | null;
  trades: DashboardTrade[] | null;
  equityHistory: DashboardEquityPoint[] | null;
  botStatus: DashboardBotStatus;
}

export interface DashboardSummaryResult {
  data: DashboardSummaryData;
  errors: DashboardError[];
}

/**
 * Main orchestrator — called by routes/dashboard.ts
 */
export async function getDashboardSummary(userId: string): Promise<DashboardSummaryResult> {
  const errors: DashboardError[] = [];

  // Step 1: Get user's API keys
  let apiKey: string, secretKey: string;
  try {
    const keys = await getApiKeys(userId);
    apiKey = keys.apiKey;
    secretKey = keys.secretKey;
  } catch (err) {
    if (err instanceof NotFoundError) {
      return {
        data: {
          balances: null,
          trades: null,
          equityHistory: null,
          botStatus: buildBotStatus(false, null, null),
        },
        errors: [{ source: 'balances', message: 'No API keys configured', code: 'NO_API_KEYS' }],
      };
    }
    throw err; // Unexpected error — let error handler catch
  }

  // Step 2: Parallel Binance calls
  const [accountResult, tradesResult, snapshotResult] = await Promise.allSettled([
    getAccount(apiKey, secretKey),
    getMyTrades(apiKey, secretKey, 'BTCFDUSD', 20),
    getAccountSnapshot(apiKey, secretKey),
  ]);

  // Step 3: Map balances
  let balances: DashboardBalance[] | null = null;
  if (accountResult.status === 'fulfilled') {
    balances = accountResult.value.balances
      .filter((b) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
      .map((b) => ({ asset: b.asset, free: b.free, locked: b.locked }));
  } else {
    errors.push({
      source: 'balances',
      message: accountResult.reason?.message || 'Failed to fetch account',
    });
  }

  // Step 4: Map trades
  let trades: DashboardTrade[] | null = null;
  if (tradesResult.status === 'fulfilled') {
    trades = tradesResult.value.map((t) => ({
      id: t.id,
      symbol: t.symbol,
      price: t.price,
      qty: t.qty,
      quoteQty: t.quoteQty,
      commission: t.commission,
      commissionAsset: t.commissionAsset,
      time: t.time,
      isBuyer: t.isBuyer,
      isMaker: t.isMaker,
    }));
  } else {
    errors.push({
      source: 'trades',
      message: tradesResult.reason?.message || 'Failed to fetch trades',
    });
  }

  // Step 5: Map equity history from snapshots
  let equityHistory: DashboardEquityPoint[] | null = null;
  if (snapshotResult.status === 'fulfilled') {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    equityHistory = snapshotResult.value.snapshotVos
      .filter((s) => s.data.totalAssetOfBtc)
      .sort((a, b) => a.time - b.time)
      .map((s) => {
        const d = new Date(s.time);
        return {
          date: `${months[d.getMonth()]} ${d.getDate()}`,
          value: parseFloat(s.data.totalAssetOfBtc),
        };
      });
  } else {
    errors.push({
      source: 'equity',
      message: snapshotResult.reason?.message || 'Failed to fetch snapshots',
    });
  }

  // Step 6: Compute bot status
  const botStatus = buildBotStatus(true, null, null); // Keys exist → bot is considered active

  return { data: { balances, trades, equityHistory, botStatus }, errors };
}

/**
 * Computes bot status from keys state and optional profile data.
 * In v1: if keys exist → active, strategy defaults to "Conservative Spot Trading".
 * Future: read actual robot status from MongoDB collection.
 */
function buildBotStatus(
  hasKeys: boolean,
  runningSince: Date | null,
  strategy: string | null,
): DashboardBotStatus {
  return {
    active: hasKeys,
    runningSince: runningSince?.toISOString() ?? null,
    strategy: strategy ?? 'Conservative Spot Trading',
  };
}
```

**Design decisions:**
- `Promise.allSettled` ensures one failing Binance call doesn't kill the others.
- Balances with zero free+locked are filtered out to reduce noise.
- Bot status is v1-simplified (keys exist = active). Future PR can hook into actual robot telemetry.

---

### 2.5 `backend/src/routes/dashboard.ts` (NEW)

**Purpose:** HTTP route definition. Validates auth (already done by plugin), calls `dashboardService`, returns JSON.

```typescript
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getDashboardSummary } from '../services/dashboardService';
import { UnauthorizedError } from '../utils/errors';

export async function dashboardRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/api/dashboard/summary',
    {
      schema: {
        tags: ['Dashboard'],
        summary: 'Get consolidated dashboard data from Binance',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            refresh: { type: 'string', enum: ['true'] },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  balances: { type: ['array', 'null'] },
                  trades: { type: ['array', 'null'] },
                  equityHistory: { type: ['array', 'null'] },
                  botStatus: { type: 'object' },
                },
              },
              errors: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    source: { type: 'string' },
                    message: { type: 'string' },
                    code: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.user) throw new UnauthorizedError();

      const userId = request.user.sub;
      const query = request.query as { refresh?: string };

      // v1: no caching. Future: if (!query.refresh) check cache first.
      const result = await getDashboardSummary(userId);

      reply.send({
        success: true,
        data: result.data,
        ...(result.errors.length > 0 ? { errors: result.errors } : {}),
      });
    },
  );
}
```

**Design decisions:**
- Auth is handled by the global `registerAuth` plugin — route only needs `request.user` check.
- `?refresh=true` query param reserved for future cache bypass. No-op in v1.
- `errors` array is only included in response when non-empty to keep clean JSON for happy path.

---

### 2.6 `backend/src/index.ts` (MODIFY)

**Change:** Import and register `dashboardRoutes`.

```typescript
// ADD to imports:
import { dashboardRoutes } from './routes/dashboard';

// ADD to buildPublicServer(), after existing route registrations:
await app.register(dashboardRoutes);
```

---

### 2.7 `backend/src/utils/errors.ts` (NO CHANGE — REVIEW)

Existing `NotFoundError`, `UnauthorizedError` are already defined and used by the new services. No modifications needed.

---

## 3. Frontend — File-by-File Changes

### 3.1 Directory Structure (NEW)

```
src/
├── screens/
│   ├── DashboardScreen.tsx          ← REFACTORED: orchestrator only
│   └── WithdrawModal.tsx            ← UNCHANGED
├── components/
│   └── dashboard/                   ← NEW directory
│       ├── OnboardingBanner.tsx     ← NEW
│       ├── KPIGrid.tsx              ← NEW
│       ├── EquityChart.tsx          ← NEW
│       ├── BotStatusPanel.tsx       ← NEW
│       └── RecentTradesTable.tsx    ← NEW
├── hooks/
│   └── useDashboard.ts              ← NEW: data fetching hook
├── types/
│   └── index.ts                     ← MODIFY: add dashboard response types
└── data/
    └── mock.ts                      ← UNCHANGED: keep for fallback/dev
```

---

### 3.2 `src/types/index.ts` (MODIFY — APPEND)

**Add dashboard-specific types** (appended to existing file, no breaking changes):

```typescript
// ---- Dashboard API Types ----

export interface DashboardBalance {
  asset: string;
  free: string;
  locked: string;
}

export interface DashboardTrade {
  id: number;
  symbol: string;
  price: string;
  qty: string;
  quoteQty: string;
  commission: string;
  commissionAsset: string;
  time: number;
  isBuyer: boolean;
  isMaker: boolean;
}

export interface DashboardEquityPoint {
  date: string;
  value: number;
}

export interface DashboardBotStatus {
  active: boolean;
  runningSince: string | null;
  strategy: string;
}

export interface DashboardError {
  source: 'balances' | 'trades' | 'equity';
  message: string;
  code?: string;
}

export interface DashboardSummaryResponse {
  success: boolean;
  data: {
    balances: DashboardBalance[] | null;
    trades: DashboardTrade[] | null;
    equityHistory: DashboardEquityPoint[] | null;
    botStatus: DashboardBotStatus;
  };
  errors?: DashboardError[];
}
```

---

### 3.3 `src/hooks/useDashboard.ts` (NEW)

**Purpose:** Data fetching hook. Encapsulates the API call, loading/error state, and partial-failure handling.

```typescript
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { env } from '../lib/env';
import type { DashboardSummaryResponse, DashboardError } from '../types';

interface UseDashboardReturn {
  data: DashboardSummaryResponse['data'] | null;
  errors: DashboardError[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDashboard(): UseDashboardReturn {
  const { state } = useAuth();
  const [data, setData] = useState<DashboardSummaryResponse['data'] | null>(null);
  const [errors, setErrors] = useState<DashboardError[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    if (!state.session) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setErrors([]);

    try {
      const API_BASE = env.VITE_API_BASE_URL || 'http://localhost:3000';
      const res = await fetch(`${API_BASE}/api/dashboard/summary`, {
        headers: { Authorization: `Bearer ${state.session.access_token}` },
      });

      if (!res.ok) {
        if (res.status === 401) {
          setError('Authentication expired. Please log in again.');
        } else {
          setError(`Server error: ${res.status}`);
        }
        setData(null);
        return;
      }

      const result: DashboardSummaryResponse = await res.json();

      if (!result.success) {
        setError(result.errors?.[0]?.message || 'Failed to load dashboard data');
        setData(null);
        return;
      }

      setData(result.data);
      setErrors(result.errors ?? []);
    } catch (err: any) {
      setError(err.message || 'Network error');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [state.session]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return { data, errors, loading, error, refetch: fetchDashboard };
}
```

**Design decisions:**
- `useCallback` + dependency on `state.session` prevents stale closures.
- On `401`, shows a clear message — the `AuthContext` should handle session refresh upstream.
- Partial errors (from `result.errors`) are stored separately from fatal `error` (network/auth failure).

---

### 3.4 `src/components/dashboard/OnboardingBanner.tsx` (NEW)

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, Key, ArrowRight, X, CheckCircle } from 'lucide-react';

interface OnboardingBannerProps {
  has2FA: boolean;
  hasApiKeys: boolean;
  loading: boolean;
}

export const OnboardingBanner: React.FC<OnboardingBannerProps> = ({
  has2FA,
  hasApiKeys,
  loading,
}) => {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (loading) return null;

  const isComplete = has2FA && hasApiKeys;

  // All complete — show green banner
  if (isComplete) {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-4 py-2">
        <CheckCircle size={16} />
        <span>Todo listo — 2FA y API de Binance configurados.</span>
      </div>
    );
  }

  if (dismissed) return null;

  const steps: { icon: React.ReactNode; label: string; desc: string; action: () => void }[] = [];

  if (!has2FA) {
    steps.push({
      icon: <Smartphone size={18} />,
      label: 'Configurar 2FA',
      desc: 'Protegé tu cuenta con autenticación de dos factores.',
      action: () => navigate('/2fa-setup'),
    });
  }

  if (!hasApiKeys) {
    steps.push({
      icon: <Key size={18} />,
      label: 'Conectar API de Binance',
      desc: 'Vinculá tu cuenta de Binance para empezar a operar.',
      action: () => navigate('/connect'),
    });
  }

  return (
    <div className="bg-gradient-to-r from-teal-600 to-emerald-600 rounded-xl p-4 md:p-6 text-white relative">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/20 transition-colors"
        aria-label="Cerrar"
      >
        <X size={18} />
      </button>
      <h2 className="text-lg font-bold mb-1">¡Bienvenido a CryptoInvestor!</h2>
      <p className="text-sm text-white/80 mb-4">Completá estos pasos para empezar a operar:</p>
      <div className="flex flex-col sm:flex-row gap-3">
        {steps.map((step, i) => (
          <button
            key={i}
            onClick={step.action}
            className="flex items-center gap-3 bg-white/10 hover:bg-white/20 rounded-lg p-3 transition-colors text-left flex-1"
          >
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
              {step.icon}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{step.label}</p>
              <p className="text-xs text-white/70 truncate">{step.desc}</p>
            </div>
            <ArrowRight size={16} className="shrink-0 ml-auto opacity-60" />
          </button>
        ))}
      </div>
    </div>
  );
};
```

**Change vs current:** Extracted inline banner JSX from `DashboardScreen`. Logic is identical — `dismissed` state moves to local component state.

---

### 3.5 `src/components/dashboard/KPIGrid.tsx` (NEW)

```typescript
import { Wallet, TrendingUp, BarChart3, Percent, Receipt } from 'lucide-react';
import { KPICard } from '../ui/KPICard';

interface KPIGridProps {
  initialBalance: number;
  currentBalance: number;
}

export const KPIGrid: React.FC<KPIGridProps> = ({ initialBalance, currentBalance }) => {
  const grossProfit = currentBalance - initialBalance;
  const performance = initialBalance > 0
    ? ((grossProfit / initialBalance) * 100).toFixed(2)
    : '0.00';
  const pendingFee = grossProfit * 0.07;

  const fmt = (v: number) =>
    v.toLocaleString('en-US', { minimumFractionDigits: 2 });

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-4">
      <KPICard
        label="Initial Balance"
        value={`${fmt(initialBalance)} USDT`}
        icon={<Wallet size={20} />}
      />
      <KPICard
        label="Current Balance"
        value={`${fmt(currentBalance)} USDT`}
        change={`+${fmt(grossProfit)} (+${performance}%)`}
        changePositive={grossProfit >= 0}
        icon={<TrendingUp size={20} />}
        iconColor="text-emerald-500"
      />
      <KPICard
        label="Net Profit"
        value={`+${fmt(grossProfit)} USDT`}
        changePositive={grossProfit >= 0}
        icon={<BarChart3 size={20} />}
        iconColor="text-emerald-500"
      />
      <KPICard
        label="Performance"
        value={`+${performance}%`}
        change="Since activation"
        changePositive={grossProfit >= 0}
        icon={<Percent size={20} />}
        iconColor="text-teal-500"
      />
      <KPICard
        label="Pending Fee (7%)"
        value={`${fmt(pendingFee)} USDT`}
        change="Payable on withdrawal"
        changePositive={true}
        icon={<Receipt size={20} />}
        iconColor="text-amber-500"
      />
    </div>
  );
};
```

**Design decisions:**
- KPI computation (`grossProfit`, `performance`, `pendingFee`) moved from `DashboardScreen` into `KPIGrid` — the orchestrator no longer needs to duplicate this math.
- `changePositive` uses `grossProfit >= 0` (not hardcoded `true`), so it correctly reflects losses.

---

### 3.6 `src/components/dashboard/EquityChart.tsx` (NEW)

```typescript
import { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Card } from '../ui/Card';
import type { DashboardEquityPoint } from '../../types';

interface EquityChartProps {
  data: DashboardEquityPoint[];
  initialBalance: number;
}

const PERIODS = ['1D', '1W', '1M', '3M', 'ALL'] as const;
type Period = (typeof PERIODS)[number];

export const EquityChart: React.FC<EquityChartProps> = ({ data, initialBalance }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('ALL');

  // In v1, period filtering is visual-only (all data shown).
  // Future: filter data array by date range based on selectedPeriod.
  const displayData = data;

  return (
    <Card className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 md:mb-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Equity Curve</h3>
        <div className="flex gap-1">
          {PERIODS.map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                selectedPeriod === period
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>
      <div className="h-48 md:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={displayData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0d9488" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false}
              tickFormatter={(v: number) => `$${v / 1000}k`} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
              }}
              formatter={(value: number) => [`$${value.toLocaleString()}`, 'Balance']}
            />
            <ReferenceLine y={initialBalance} stroke="#94a3b8" strokeDasharray="5 5"
              label={{ value: 'Initial', position: 'right', fontSize: 10, fill: '#94a3b8' }} />
            <Area type="monotone" dataKey="value" stroke="#0d9488" strokeWidth={2} fill="url(#colorValue)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
```

**Change vs current:**
- Period buttons are now stateful — clicking highlights the active period (was purely visual).
- Data filtering by period is stubbed (v1 shows all data). This is intentional — Binance snapshot data is limited; period filtering needs a time-series store.

---

### 3.7 `src/components/dashboard/BotStatusPanel.tsx` (NEW)

```typescript
import { Play, Pause, Settings, Wallet } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface BotStatusPanelProps {
  botStatus: 'active' | 'paused' | 'error';
  runningSince: string | null;
  strategy: string;
  onToggleBot: () => void;
  onWithdraw: () => void;
  onRiskSettings: () => void;
}

export const BotStatusPanel: React.FC<BotStatusPanelProps> = ({
  botStatus,
  runningSince,
  strategy,
  onToggleBot,
  onWithdraw,
  onRiskSettings,
}) => {
  const badgeVariant =
    botStatus === 'active' ? 'success' : botStatus === 'paused' ? 'warning' : 'danger';

  return (
    <Card className="p-4 md:p-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 md:mb-4">Bot Status</h3>
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-3 h-3 rounded-full ${
          botStatus === 'active' ? 'bg-emerald-500 animate-pulse'
            : botStatus === 'paused' ? 'bg-amber-500'
            : 'bg-red-500'
        }`} />
        <Badge variant={badgeVariant}>
          {botStatus.charAt(0).toUpperCase() + botStatus.slice(1)}
        </Badge>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Running since</span>
          <span className="text-slate-900 dark:text-white font-medium">{runningSince ?? '—'}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Strategy</span>
          <span className="text-slate-900 dark:text-white font-medium">{strategy}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Last trade</span>
          <span className="text-slate-900 dark:text-white font-medium">—</span>
        </div>
      </div>

      <div className="space-y-2">
        <Button
          variant={botStatus === 'active' ? 'secondary' : 'primary'}
          onClick={onToggleBot}
          className="w-full"
        >
          {botStatus === 'active' ? (
            <Pause size={16} className="mr-2" />
          ) : (
            <Play size={16} className="mr-2" />
          )}
          {botStatus === 'active' ? 'Pause Bot' : 'Resume Bot'}
        </Button>
        <Button variant="secondary" className="w-full" onClick={onRiskSettings}>
          <Settings size={16} className="mr-2" /> Risk Settings
        </Button>
        <Button onClick={onWithdraw} className="w-full">
          <Wallet size={16} className="mr-2" /> Withdraw Profits
        </Button>
      </div>
    </Card>
  );
};
```

**Change vs current:** `last trade` hardcoded text removed (replaced with "—"). Future: compute from most recent trade timestamp.

---

### 3.8 `src/components/dashboard/RecentTradesTable.tsx` (NEW)

```typescript
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import type { DashboardTrade } from '../../types';

interface RecentTradesTableProps {
  trades: DashboardTrade[];
}

export const RecentTradesTable: React.FC<RecentTradesTableProps> = ({ trades }) => {
  const fmtDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const fmtNumber = (n: string) => parseFloat(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 });

  if (trades.length === 0) {
    return (
      <Card>
        <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Operations</h3>
        </div>
        <div className="p-6 text-center text-sm text-slate-500">No trades found for BTC/FDUSD.</div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Operations</h3>
        <button className="text-sm text-teal-600 hover:text-teal-700 font-medium">View All</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50">
              <th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
              <th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pair</th>
              <th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Type</th>
              <th className="px-3 md:px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Amount</th>
              <th className="px-3 md:px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:table-cell">Price</th>
              <th className="px-3 md:px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Quote Qty</th>
              <th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:table-cell">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {trades.map((trade) => (
              <tr key={trade.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-slate-500">{fmtDate(trade.time)}</td>
                <td className="px-3 md:px-6 py-3 text-xs md:text-sm font-semibold text-slate-900 dark:text-white">
                  {trade.symbol.replace('FDUSD', '/FDUSD')}
                </td>
                <td className="px-3 md:px-6 py-3">
                  <Badge variant={trade.isBuyer ? 'info' : 'warning'}>
                    {trade.isBuyer ? 'BUY' : 'SELL'}
                  </Badge>
                </td>
                <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-right font-mono text-slate-900 dark:text-white">
                  {fmtNumber(trade.qty)}
                </td>
                <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-right font-mono text-slate-500 hidden sm:table-cell">
                  ${fmtNumber(trade.price)}
                </td>
                <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-right font-mono text-slate-900 dark:text-white">
                  {fmtNumber(trade.quoteQty)}
                </td>
                <td className="px-3 md:px-6 py-3 hidden sm:table-cell">
                  <Badge variant="success">Completed</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
```

**Change vs current:**
- Table columns adapted to Binance trade data: `P&L` column removed (Binance `myTrades` doesn't include P&L), replaced with `Quote Qty`.
- `pair` derived from `symbol` (e.g., `BTCFDUSD` → `BTC/FDUSD`).
- `type` derived from `isBuyer` boolean.
- Date formatted from unix ms timestamp.

---

### 3.9 `src/screens/DashboardScreen.tsx` (MODIFY — FULL REWRITE)

**Purpose:** Becomes a thin orchestrator. Imports 5 sub-components, calls `useDashboard` + `useAuth`, distributes props.

```typescript
import { useState, useMemo } from 'react';
import { Shield, ExternalLink } from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Alert } from '../components/ui/Alert';
import { WithdrawModal } from './WithdrawModal';
import { OnboardingBanner } from '../components/dashboard/OnboardingBanner';
import { KPIGrid } from '../components/dashboard/KPIGrid';
import { EquityChart } from '../components/dashboard/EquityChart';
import { BotStatusPanel } from '../components/dashboard/BotStatusPanel';
import { RecentTradesTable } from '../components/dashboard/RecentTradesTable';
import { useDashboard } from '../hooks/useDashboard';
import { useAuth } from '../contexts/AuthContext';
import { useTrading } from '../hooks/useTrading';

export const DashboardScreen: React.FC = () => {
  const { onboarding } = useAuth();
  const { data, errors, loading, error, refetch } = useDashboard();
  const { toggleBot, account: tradingAccount } = useTrading(); // still needed for withdraw/bot toggle
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);

  // Compute initialBalance from balances (FDUSD free + locked)
  const balances = data?.balances ?? [];
  const fdusdBalance = useMemo(() => {
    const fdusd = balances.find((b) => b.asset === 'FDUSD');
    if (!fdusd) return 0;
    return parseFloat(fdusd.free) + parseFloat(fdusd.locked);
  }, [balances]);

  // Derive KPI inputs: use snapshot equityHistory[0] as initial, or fallback
  const initialBalance = useMemo(() => {
    if (data?.equityHistory && data.equityHistory.length > 0) {
      return data.equityHistory[0].value;
    }
    // Fallback: use current FDUSD balance (no historical data yet)
    return fdusdBalance;
  }, [data?.equityHistory, fdusdBalance]);

  const currentBalance = fdusdBalance;

  // Map botStatus
  const botStatus = data?.botStatus
    ? (data.botStatus.active ? 'active' : 'paused') as 'active' | 'paused' | 'error'
    : tradingAccount.botStatus; // fallback to local state

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Fatal error banner */}
        {error && (
          <Alert variant="danger">
            <div className="flex flex-col sm:flex-row gap-2 items-start">
              <span className="text-sm font-medium">{error}</span>
              <button onClick={refetch} className="text-sm text-teal-600 hover:text-teal-700 font-medium">
                Retry
              </button>
            </div>
          </Alert>
        )}

        {/* Partial errors */}
        {errors.length > 0 && (
          <Alert variant="warning">
            <div className="space-y-1">
              {errors.map((e, i) => (
                <p key={i} className="text-sm">
                  ⚠️ {e.source}: {e.message}
                </p>
              ))}
            </div>
          </Alert>
        )}

        {/* Onboarding Banner */}
        <OnboardingBanner
          has2FA={onboarding.has2FA}
          hasApiKeys={onboarding.hasApiKeys}
          loading={onboarding.loading || loading}
        />

        {/* Loading skeleton */}
        {loading && !data && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {/* KPI Grid */}
        {data && (
          <KPIGrid initialBalance={initialBalance} currentBalance={currentBalance} />
        )}

        {/* Main Content Grid */}
        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <EquityChart
              data={data.equityHistory ?? []}
              initialBalance={initialBalance}
            />
            <BotStatusPanel
              botStatus={botStatus}
              runningSince={data.botStatus.runningSince}
              strategy={data.botStatus.strategy}
              onToggleBot={toggleBot}
              onWithdraw={() => setWithdrawModalOpen(true)}
              onRiskSettings={() => {}}
            />
          </div>
        )}

        {/* Recent Trades */}
        {data && (
          <RecentTradesTable trades={data.trades ?? []} />
        )}

        {/* Trust Reminder */}
        <Alert variant="info" icon={<Shield size={16} />}>
          <div className="flex flex-col sm:flex-row gap-2">
            <span className="text-sm font-medium">
              Your funds are in your Binance account. We only execute orders via API.
            </span>
            <a
              href="https://www.binance.com/en/my/wallet"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1 shrink-0 whitespace-nowrap"
            >
              Verify on Binance <ExternalLink size={14} />
            </a>
          </div>
        </Alert>
      </div>

      <WithdrawModal isOpen={withdrawModalOpen} onClose={() => setWithdrawModalOpen(false)} />
    </DashboardLayout>
  );
};
```

**Key changes:**
- All inline JSX replaced with imported sub-components.
- No direct use of `mockAccount`, `mockTrades`, or `equityData`.
- `useDashboard` replaces `useTrading` for data fetching. `useTrading` still imported for `toggleBot` (mutates local state for bot pause/resume — future PR can route this through backend).
- `FDUSD` is the canonical asset for balance computation (v1 fixed spot).
- Fatal error (`error` from `useDashboard`) shows a red alert with retry button.
- Partial errors (`errors[]`) show as a yellow alert listing which sections failed.
- Loading skeleton shows 5 pulsing placeholders while first fetch completes.

---

## 4. Test Plan

### 4.1 Backend Tests

| # | Test | File | Method |
|---|------|------|--------|
| B1 | `binanceAuth.buildSignature` produces correct HMAC for known inputs | `backend/src/utils/__tests__/binanceAuth.test.ts` | Unit |
| B2 | `binanceAuth.buildSignedUrl` includes timestamp + signature | ídem | Unit |
| B3 | `binanceService.getAccount` parses Binance account response | `backend/src/services/__tests__/binanceService.test.ts` | Unit (mocked https) |
| B4 | `binanceService.getMyTrades` passes correct symbol + limit | ídem | Unit (mocked https) |
| B5 | `binanceService.getAccountSnapshot` handles empty snapshotVos | ídem | Unit (mocked https) |
| B6 | `dashboardService.getDashboardSummary` returns all 3 sections when Binance is healthy | `backend/src/services/__tests__/dashboardService.test.ts` | Unit (mocked binanceService) |
| B7 | `dashboardService.getDashboardSummary` returns partial results + errors[] when one call fails | ídem | Unit |
| B8 | `dashboardService.getDashboardSummary` returns NO_API_KEYS error when user has no keys | ídem | Unit |
| B9 | `GET /api/dashboard/summary` returns 200 + correct structure | `backend/src/routes/__tests__/dashboard.test.ts` | Integration (supertest-style inject) |
| B10 | `GET /api/dashboard/summary` returns 401 without auth | ídem | Integration |
| B11 | `GET /api/dashboard/summary` returns 404-equivalent when no API keys | ídem | Integration |
| B12 | `GET /api/dashboard/summary` returns partial errors when balances fail | ídem | Integration |

### 4.2 Frontend Tests

| # | Test | File | Method |
|---|------|------|--------|
| F1 | `OnboardingBanner` renders dismissible banner when !has2FA | `src/components/dashboard/__tests__/OnboardingBanner.test.tsx` | Unit (Vitest + RTL) |
| F2 | `OnboardingBanner` renders green "Todo listo" when has2FA && hasApiKeys | ídem | Unit |
| F3 | `OnboardingBanner` renders nothing when loading | ídem | Unit |
| F4 | `KPIGrid` computes and displays 5 KPIs correctly | `src/components/dashboard/__tests__/KPIGrid.test.tsx` | Unit |
| F5 | `KPIGrid` handles zero initialBalance (no division by zero) | ídem | Unit |
| F6 | `EquityChart` renders chart with data points | `src/components/dashboard/__tests__/EquityChart.test.tsx` | Unit |
| F7 | `EquityChart` period buttons toggle active state | ídem | Unit |
| F8 | `BotStatusPanel` shows correct badge variant for each status | `src/components/dashboard/__tests__/BotStatusPanel.test.tsx` | Unit |
| F9 | `BotStatusPanel` calls onToggleBot on button click | ídem | Unit |
| F10 | `RecentTradesTable` renders rows with BUY/SELL badges | `src/components/dashboard/__tests__/RecentTradesTable.test.tsx` | Unit |
| F11 | `RecentTradesTable` shows empty state when trades=[] | ídem | Unit |
| F12 | `useDashboard` fetches data on mount, sets loading → data | `src/hooks/__tests__/useDashboard.test.ts` | Unit (mocked fetch) |
| F13 | `useDashboard` handles 401 response | ídem | Unit |
| F14 | `useDashboard` handles partial errors | ídem | Unit |
| F15 | `DashboardScreen` orchestrator renders all sub-components when data available | `src/screens/__tests__/DashboardScreen.test.tsx` | Integration |
| F16 | `DashboardScreen` shows error alert on fetch failure | ídem | Integration |

---

## 5. Implementation Order with Dependencies

```
Phase 1: Backend Foundation (no frontend dependency)
├─ P1.1  backend/src/types/binance.ts          [NEW — no deps]
├─ P1.2  backend/src/utils/binanceAuth.ts      [NEW — depends on P1.1 types]
├─ P1.3  backend/src/services/binanceService.ts [NEW — depends on P1.1, P1.2]
├─ P1.4  backend/src/services/dashboardService.ts [NEW — depends on P1.3, existing keysService]
├─ P1.5  backend/src/routes/dashboard.ts        [NEW — depends on P1.4]
└─ P1.6  backend/src/index.ts                   [MODIFY — register dashboardRoutes]

Phase 2: Frontend Types + Hook (depends on Phase 1 response shape)
├─ P2.1  src/types/index.ts                     [MODIFY — append dashboard types]
└─ P2.2  src/hooks/useDashboard.ts              [NEW — depends on P2.1 types]

Phase 3: Frontend Components (parallel, no inter-deps)
├─ P3.1  src/components/dashboard/OnboardingBanner.tsx  [NEW]
├─ P3.2  src/components/dashboard/KPIGrid.tsx           [NEW]
├─ P3.3  src/components/dashboard/EquityChart.tsx       [NEW]
├─ P3.4  src/components/dashboard/BotStatusPanel.tsx    [NEW]
└─ P3.5  src/components/dashboard/RecentTradesTable.tsx [NEW]

Phase 4: Frontend Orchestrator (depends on Phase 2 + Phase 3)
└─ P4.1  src/screens/DashboardScreen.tsx        [MODIFY — use all new components + hook]

Phase 5: Tests (parallel per layer)
├─ P5.1  Backend unit + integration tests       [depends on Phase 1]
└─ P5.2  Frontend unit + integration tests      [depends on Phase 2-4]
```

**Critical path:** P1.1 → P1.2 → P1.3 → P1.4 → P1.5 → P1.6 → P2.1 → P2.2 → P4.1 (with P3.x parallel to P2.x)

---

## 6. Contracts & Risk Mitigations

### 6.1 API Contract: `GET /api/dashboard/summary`

| Scenario | HTTP Status | Response Shape |
|---|---|---|
| Success, all data | 200 | `{ success: true, data: { balances, trades, equityHistory, botStatus } }` |
| Success, partial data | 200 | `{ success: true, data: { ... }, errors: [{ source, message }] }` |
| No API keys | 200 | `{ success: true, data: { balances: null, ... }, errors: [{ source: 'balances', code: 'NO_API_KEYS' }] }` |
| Invalid/expired keys | 200 | `{ success: true, data: { ... }, errors: [{ source, message }] }` |
| No auth token | 401 | `{ success: false, error: { code: 'UNAUTHORIZED', message } }` |

### 6.2 Risk Mitigations

| Risk | Mitigation |
|---|---|
| Binance API rate limit | v1: no caching — each refresh hits Binance. v2: MongoDB cache with 30s TTL, `?refresh=true` bypass |
| Binance downtime | `Promise.allSettled` isolates failures; partial data still renders |
| Slow response (3 sequential calls) | All 3 calls run in parallel; total latency ≈ max(individual latencies), not sum |
| Invalid API keys | Returned as error in `errors[]` array; frontend shows warning alert |
| Frontend crashes on null data | Each component handles `null`/`[]` gracefully; loading skeleton shown during fetch |

---

## 7. Out of Scope (Confirmed)

- No real-time polling (manual refresh only, via `refetch`)
- No new Binance data sources beyond account, myTrades, accountSnapshot
- No UI redesign — same visual layout, same color scheme
- No changes to the Python robot
- No caching implementation in v1 (reserved via `?refresh=true` query param)
- No P&L computation per trade (Binance `myTrades` doesn't provide it)
- No multi-symbol support (fixed: BTC/FDUSD)

---

## 8. Files Summary

### New Files (10)

| File | Layer | Lines (est.) |
|---|---|---|
| `backend/src/types/binance.ts` | Backend types | ~70 |
| `backend/src/utils/binanceAuth.ts` | Backend utils | ~40 |
| `backend/src/services/binanceService.ts` | Backend service | ~70 |
| `backend/src/services/dashboardService.ts` | Backend service | ~120 |
| `backend/src/routes/dashboard.ts` | Backend route | ~70 |
| `src/types/index.ts` (append) | Frontend types | ~45 |
| `src/hooks/useDashboard.ts` | Frontend hook | ~60 |
| `src/components/dashboard/OnboardingBanner.tsx` | Frontend component | ~75 |
| `src/components/dashboard/KPIGrid.tsx` | Frontend component | ~50 |
| `src/components/dashboard/EquityChart.tsx` | Frontend component | ~70 |
| `src/components/dashboard/BotStatusPanel.tsx` | Frontend component | ~65 |
| `src/components/dashboard/RecentTradesTable.tsx` | Frontend component | ~70 |

### Modified Files (2)

| File | Change | Lines (est.) |
|---|---|---|
| `backend/src/index.ts` | Import + register dashboardRoutes | +3 |
| `src/screens/DashboardScreen.tsx` | Full rewrite as orchestrator | ~120 (replaces ~240) |

### Net Change Estimate

**~800 new lines, ~120 removed lines = ~680 net new lines.** This is within the 400-line review budget if split across 2 PRs (backend + frontend), or can be delivered as a single PR with focused review on the orchestrator + binanceService.
