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
	legalDocsAccepted: boolean;
}

export interface AuthState {
	user: {
		id: string;
		email: string;
		firstName?: string;
		lastName?: string;
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
}

export interface AuthContextValue {
	state: AuthState;
	twoFactor: TwoFactorState;
	login: (email: string, password: string) => Promise<boolean>;
	register: (data: RegisterData) => Promise<void>;
	logout: () => Promise<void>;
	resendVerification: () => Promise<void>;
	resetPassword: (email: string) => Promise<void>;
	setup2FA: () => Promise<{ secret: string; qrCodeUrl: string }>;
	verify2FA: (token: string) => Promise<boolean>;
	disable2FA: () => Promise<void>;
	check2FAStatus: () => Promise<boolean>;
	clearError: () => void;
}
