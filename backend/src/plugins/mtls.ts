// ============================================
// mTLS PLUGIN (robot server only)
// ============================================

import { readFileSync } from "fs";
import { resolve } from "path";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { env } from "../config/env";

export function getTlsOptions(): {
	key: Buffer;
	cert: Buffer;
	ca: Buffer;
	requestCert: boolean;
	rejectUnauthorized: boolean;
} | null {
	const caPath = env.TLS_CA_CERT;
	const certPath = env.TLS_SERVER_CERT;
	const keyPath = env.TLS_SERVER_KEY;

	if (!caPath || !certPath || !keyPath) {
		console.warn("[mTLS] Certificate paths not configured. mTLS is disabled.");
		return null;
	}

	try {
		return {
			key: readFileSync(resolve(keyPath)),
			cert: readFileSync(resolve(certPath)),
			ca: readFileSync(resolve(caPath)),
			requestCert: true,
			rejectUnauthorized: true,
		};
	} catch (err) {
		console.error("[mTLS] Failed to load certificates:", err);
		return null;
	}
}

export function addClientCertHeader(app: FastifyInstance): void {
	// When mTLS is active, Node.js exposes client certificate info on the socket
	app.addHook(
		"onRequest",
		async (request: FastifyRequest, _reply: FastifyReply) => {
			const socket = request.raw.socket as
				| { getPeerCertificate?: () => unknown }
				| undefined;
			if (socket && typeof socket.getPeerCertificate === "function") {
				const cert = socket.getPeerCertificate();
				if (cert) {
					(
						request.raw as unknown as Record<string, unknown>
					).clientCertificate = cert;
				}
			}
		},
	);
}
