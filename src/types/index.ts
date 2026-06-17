// ============================================
// TYPES / INTERFACES
// ============================================

export interface User {
	name: string;
	email: string;
	avatar: string;
}

export interface Account {
	initialBalance: number;
	currentBalance: number;
	apiConnected: boolean;
	apiKey: string;
	botStatus: "active" | "paused" | "error";
	botRunningSince: string;
	strategy: string;
}

export interface Trade {
	id: string;
	date: string;
	pair: string;
	type: "buy" | "sell";
	amount: number;
	price: number;
	pnl: number;
	status: "completed" | "pending" | "failed";
}

export interface Withdrawal {
	id: string;
	date: string;
	grossProfit: number;
	fee: number;
	netAmount: number;
	wallet: string;
	txHash: string;
	status: "completed" | "pending" | "failed";
}

export interface LegalDocument {
	id: string;
	title: string;
	description: string;
	accepted: boolean;
	pdfUrl: string;
}

export type Theme = "light" | "dark";
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";
export type AlertVariant = "info" | "success" | "warning" | "danger";
export type BadgeVariant =
	| "success"
	| "warning"
	| "danger"
	| "info"
	| "pending";

// Auth types
export interface RegisterData {
	firstName: string;
	lastName: string;
	email: string;
	password: string;
	phone: string;
	legalDocsAccepted: boolean;
}

export interface AuthState {
	user: {
		id: string;
		email: string;
		firstName?: string;
		lastName?: string;
		phone?: string;
	} | null;
	session: { access_token: string } | null;
	loading: boolean;
	error: string | null;
}

export interface ForgotPasswordData {
	email: string;
}

export interface TwoFactorState {
	enabled: boolean;
	setupComplete: boolean;
	qrCodeUrl?: string;
	requires2FA: boolean;
	pendingUserId?: string;
	recoveryCodes?: string[];
}

export interface OnboardingStatus {
	has2FA: boolean;
	hasApiKeys: boolean;
	loading: boolean;
}

export interface AuthContextValue {
	state: AuthState;
	twoFactor: TwoFactorState;
	onboarding: OnboardingStatus;
	login: (email: string, password: string) => Promise<boolean>;
	register: (data: RegisterData) => Promise<void>;
	logout: () => Promise<void>;
	resendVerification: () => Promise<void>;
	resetPassword: (email: string) => Promise<void>;
	setup2FA: () => Promise<{
		secret: string;
		qrCodeUrl: string;
		recoveryCodes: string[];
	}>;
	verify2FA: (token: string) => Promise<boolean>;
	disable2FA: () => Promise<void>;
	check2FAStatus: () => Promise<boolean>;
	recover2FA: (code: string) => Promise<{ success: boolean; message: string }>;
	fetchOnboardingStatus: () => Promise<void>;
	clearError: () => void;
}

// Dashboard types (from API)
export interface DashboardBalance {
	asset: string;
	free: string;
	locked: string;
}

export interface DashboardTrade {
	id: number;
	symbol: string;
	orderId: number;
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

/**
 * Per-coin cumulative deposits. Keys are coin symbols (e.g. "FDUSD", "BTC"),
 * values are total amounts deposited or received via incoming transfers.
 * Empty when no deposits detected.
 */
export type CumulativeDeposits = Record<string, number>;

/** Coins treated as 1:1 with USD for the "seed capital" total. */
export const STABLECOINS = ["FDUSD", "USDT", "USDC"] as const;
export type Stablecoin = (typeof STABLECOINS)[number];

export interface DashboardSummaryData {
	balances: DashboardBalance[] | null;
	trades: DashboardTrade[] | null;
	equityHistory: DashboardEquityPoint[] | null;
	botStatus: DashboardBotStatus;
	/**
	 * Per-coin cumulative deposits. Replaces the previous
	 * `initialBalance: InitialOperation | null` field. See
	 * `dashboard-cumulative-deposits-display` spec.
	 */
	cumulativeDeposits: CumulativeDeposits;
	/**
	 * Sum of stablecoin deposits (USDT + FDUSD + USDC). Represents the user's
	 * seed capital in USD-equivalent terms. Falls back to current account
	 * balance when no stablecoin deposits are detected.
	 */
	totalStablecoinDepositedUSD: number;
}

/**
 * @deprecated Replaced by `CumulativeDeposits`. The single-operation shape is
 * kept as a type alias only for components that still consume the legacy
 * `initialBalance` field (e.g. EquityChart reference line, WithdrawModal).
 * Will be removed once those components are migrated to the new contract.
 */
export interface InitialOperation {
	type: "deposit" | "transfer";
	coin: string;
	amount: number;
	time: number; // Unix timestamp (ms)
}

export interface DashboardSummaryResponse {
	success: boolean;
	data: DashboardSummaryData;
	errors?: Array<{ source: string; message: string; code?: string }>;
}

export interface DashboardError {
	source: string;
	message: string;
	code?: string;
}
