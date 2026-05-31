// ============================================
// STANDARD ERROR CLASSES + FASTIFY HANDLER
// ============================================

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export class ApiError extends Error {
	constructor(
		message: string,
		public statusCode: number = 500,
		public code: string = "INTERNAL_ERROR",
	) {
		super(message);
		this.name = "ApiError";
	}
}

export class UnauthorizedError extends ApiError {
	constructor(message = "Unauthorized") {
		super(message, 401, "UNAUTHORIZED");
	}
}

export class ValidationError extends ApiError {
	constructor(message = "Validation failed") {
		super(message, 400, "VALIDATION_ERROR");
	}
}

export class NotFoundError extends ApiError {
	constructor(message = "Not found") {
		super(message, 404, "NOT_FOUND");
	}
}

export class ConflictError extends ApiError {
	constructor(message = "Conflict") {
		super(message, 409, "CONFLICT");
	}
}

export function setupErrorHandler(app: FastifyInstance) {
	app.setErrorHandler(
		(
			error: Error & {
				statusCode?: number;
				code?: string;
				validation?: unknown[];
			},
			_request: FastifyRequest,
			reply: FastifyReply,
		) => {
			if (error instanceof ApiError) {
				reply.status(error.statusCode).send({
					success: false,
					error: {
						code: error.code,
						message: error.message,
					},
				});
				return;
			}

			// Handle Fastify native validation errors (catch FST_ERR_VALIDATION)
			if (error.validation || error.statusCode === 400) {
				reply.status(400).send({
					success: false,
					error: {
						code: "VALIDATION_ERROR",
						message: error.message,
					},
				});
				return;
			}

			// Log unexpected errors
			app.log.error(error);

			reply.status(500).send({
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Internal server error",
				},
			});
		},
	);
}
