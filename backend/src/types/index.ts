// ============================================
// BACKEND SHARED TYPES
// ============================================

// No Fastify imports needed in shared types

export interface ApiKeyDoc {
	_id?: string;
	userId: string;
	apiKeyEncrypted: string;
	secretKeyEncrypted: string;
	label: string;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface LegalDocRecord {
	_id?: string;
	userId: string;
	docId: string;
	title: string;
	acceptedAt: Date;
	ipAddress?: string;
}

export interface UserProfileCache {
	userId: string;
	email: string;
	firstName?: string;
	lastName?: string;
	phone?: string;
	lastVerifiedAt: Date;
}

export interface EncryptedData {
	iv: string;
	salt: string;
	authTag: string;
	ciphertext: string;
}

export interface StoreKeysBody {
	apiKey: string;
	secretKey: string;
	label?: string;
}

export interface TwoFactorDoc {
	_id?: string;
	userId: string;
	secretEncrypted: string;
	enabled: boolean;
	createdAt: Date;
	recoveryCodes?: RecoveryCode[];
}

export interface RecoveryCode {
	codeHash: string;
	used: boolean;
	usedAt?: Date;
}

export interface TwoFactorSetupResult {
	secret: string;
	qrCodeUrl: string;
	recoveryCodes: string[];
}

export interface TwoFactorSetupBody {
	token: string;
}

export interface JwtPayload {
	sub: string;
	email: string;
	app_metadata?: Record<string, unknown>;
	user_metadata?: {
		first_name?: string;
		last_name?: string;
		phone?: string;
	};
}

// Augment Fastify request with authenticated user
declare module "fastify" {
	interface FastifyRequest {
		user?: JwtPayload;
	}
}
