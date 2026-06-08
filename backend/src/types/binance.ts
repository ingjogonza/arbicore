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
 * First FDUSD deposit amount, representing initial investment.
 * null if no FDUSD deposits found or deposit history unavailable.
 */
export type InitialBalance = string | null;
