// ============================================
// BINANCE API TYPES
// ============================================

// ---- Raw Binance API response types (from binanceService) ----

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

export interface BinanceSnapshotVos {
	asset: string;
	totalAsset: string;
	freeAsset: string;
	lockedAsset: string;
}

export interface BinanceSnapshotDataPoint {
	updateTime: number;
	data: {
		balances: BinanceSnapshotVos[];
		totalAssetOfBtc: string;
	};
}

export interface BinanceSnapshotResponse {
	code: number;
	msg: string;
	snapshotVos: BinanceSnapshotDataPoint[];
}

/** Deposit history entry from GET /sapi/v1/capital/deposit/hisrec */
export interface BinanceDeposit {
	amount: string;
	coin: string;
	network: string;
	status: number; // 0=pending, 1=success, 6=credited
	address: string;
	addressTag: string;
	txId: string;
	insertTime: number;
	confirmTimes: string;
}

/** Union of universal transfer type values queried for initial-operation detection. */
export type BinanceTransferType = "MAIN_UMFUTURE" | "MAIN_FUNDING" | "MAIN_C2C";

/**
 * Internal/universal transfer entry from GET /sapi/v1/asset/transfer.
 * Binance returns transfers wrapped under `rows` with a `total` count;
 * this type represents a single row.
 */
export interface BinanceTransfer {
	asset: string;
	amount: string;
	type: string; // e.g. "MAIN_UMFUTURE", "FUNDING_MAIN", etc.
	status: string; // "CONFIRMED" | "FAILED" | "PENDING"
	tranId: number;
	timestamp: number;
}

// ---- Service-level mapped types (returned by dashboardService) ----

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
	date: string; // "Jan 15"
	value: number; // total balance in FDUSD
}

export interface DashboardBotStatus {
	active: boolean;
	runningSince: string | null; // ISO date string
	strategy: string;
}

/**
 * Per-coin cumulative deposits. Keys are coin symbols (e.g. "FDUSD", "BTC"),
 * values are total amounts in that coin. Empty when no deposits detected.
 */
export type CumulativeDeposits = Record<string, number>;

/** Coins treated as 1:1 with USD for the "seed capital" total. */
export const STABLECOINS = ["FDUSD", "USDT", "USDC"] as const;
export type Stablecoin = (typeof STABLECOINS)[number];

/**
 * @deprecated Replaced by `CumulativeDeposits`. The single-operation shape is
 * no longer used by the dashboard. Kept as a type alias only for any external
 * consumers that have not yet migrated; will be removed in a future release.
 */
export type InitialOperation = {
	type: "deposit" | "transfer";
	coin: string;
	amount: number;
	time: number;
};

/**
 * @deprecated Replaced by `CumulativeDeposits`. See `InitialOperation` for
 * the migration note.
 */
export type InitialBalance = InitialOperation | null;
