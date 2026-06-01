// ============================================
// SCREEN: API CONNECTION
// ============================================

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
	Key,
	Lock,
	CheckCircle,
	Info,
	Loader2,
	AlertTriangle,
	Trash2,
	MessageCircle,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Alert } from "../components/ui/Alert";
import { Modal } from "../components/ui/Modal";
import { useAuth } from "../contexts/AuthContext";
import { env } from "../lib/env";

const API_BASE = env.VITE_API_BASE_URL || "http://localhost:3000";
const SUPPORT_WA = "https://wa.me/56968546598";

type ConnectionState =
	| "loading"
	| "connected"
	| "not_connected"
	| "was_disconnected";

export const ConnectScreen: React.FC = () => {
	const navigate = useNavigate();
	const { state: authState, onboarding, fetchOnboardingStatus } = useAuth();

	const [connectionState, setConnectionState] =
		useState<ConnectionState>("loading");
	const [apiKey, setApiKey] = useState("");
	const [secretKey, setSecretKey] = useState("");
	const [confirmed, setConfirmed] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [showDisconnectModal, setShowDisconnectModal] = useState(false);
	const [deleting, setDeleting] = useState(false);

	// Fetch real key status on mount
	useEffect(() => {
		if (!authState.session) {
			setConnectionState("not_connected");
			return;
		}

		let cancelled = false;
		fetch(`${API_BASE}/api/keys/status`, {
			headers: { Authorization: `Bearer ${authState.session.access_token}` },
		})
			.then((res) => res.json())
			.then((data) => {
				if (cancelled) return;
				setConnectionState(
					data.success && data.data?.hasKeys ? "connected" : "not_connected",
				);
			})
			.catch(() => {
				if (cancelled) return;
				setConnectionState("not_connected");
			});

		return () => {
			cancelled = true;
		};
	}, [authState.session]);

	const handleConnect = async () => {
		if (!apiKey || !secretKey || !confirmed) return;
		if (!authState.session) {
			setError("Debes iniciar sesión para conectar tus claves API.");
			return;
		}

		setSaving(true);
		setError("");

		try {
			const res = await fetch(`${API_BASE}/api/keys`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${authState.session.access_token}`,
				},
				body: JSON.stringify({ apiKey, secretKey, label: "Binance" }),
			});

			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(
					data.error?.message || "Error al guardar las claves API",
				);
			}

			setConnectionState("connected");
			fetchOnboardingStatus();
			setTimeout(() => {
				navigate("/dashboard");
			}, 1500);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error desconocido");
		} finally {
			setSaving(false);
		}
	};

	const handleDisconnect = async () => {
		if (!authState.session) return;
		setDeleting(true);

		try {
			const res = await fetch(`${API_BASE}/api/keys`, {
				method: "DELETE",
				headers: { Authorization: `Bearer ${authState.session.access_token}` },
			});

			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(
					data.error?.message || "Error al eliminar las claves API",
				);
			}

			setShowDisconnectModal(false);
			setConnectionState("was_disconnected");
			setApiKey("");
			setSecretKey("");
			setConfirmed(false);
			fetchOnboardingStatus();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error desconocido");
		} finally {
			setDeleting(false);
		}
	};

	// Loading state
	if (connectionState === "loading") {
		return (
			<div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
				<Loader2 size={32} className="animate-spin text-teal-600" />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
			<Card className="w-full max-w-lg p-4 md:p-8">
				<div className="mb-6">
					<h2 className="text-2xl font-bold text-slate-900 dark:text-white">
						Conectar Binance
					</h2>
					<p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
						Vinculá tu cuenta de Binance para que el robot pueda operar.
					</p>
				</div>

				{error && (
					<div className="mb-4">
						<Alert variant="danger" icon={<Info size={16} />}>
							<span className="text-sm font-medium">{error}</span>
						</Alert>
					</div>
				)}

				{/* Connected state */}
				{connectionState === "connected" && (
					<div className="space-y-4">
						<Alert variant="success" icon={<CheckCircle size={16} />}>
							<span className="font-medium">Claves API conectadas</span>
							<p className="mt-1">
								Tu cuenta de Binance está vinculada y el robot puede operar.
							</p>
						</Alert>

						<div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
							<div>
								<p className="text-sm font-medium text-slate-900 dark:text-white">
									API Key
								</p>
								<p className="text-sm font-mono text-slate-500">
									{apiKey
										? apiKey.slice(0, 4) + "••••••••••••••"
										: "••••••••••••••"}
								</p>
							</div>
							<Badge variant="success">Conectado</Badge>
						</div>

						<div className="flex gap-3">
							<Button
								variant="secondary"
								onClick={() => navigate("/dashboard")}
								className="flex-1"
							>
								Ir al Dashboard
							</Button>
							<Button
								variant="danger"
								onClick={() => setShowDisconnectModal(true)}
								className="flex-1"
							>
								<Trash2 size={16} className="mr-2" />
								Desconectar
							</Button>
						</div>
					</div>
				)}

				{/* Registration form */}
				{(connectionState === "not_connected" ||
					connectionState === "was_disconnected") && (
					<div className="space-y-5">
						{connectionState === "was_disconnected" && (
							<Alert variant="warning" icon={<AlertTriangle size={16} />}>
								<span className="font-medium">
									Claves eliminadas correctamente.
								</span>
								<p className="mt-1">
									Recordá que las claves antiguas ya no funcionan.{" "}
									<strong>
										Debés crear claves NUEVAS en Binance para volver a operar.
									</strong>{" "}
									No podés reutilizar las anteriores.
								</p>
							</Alert>
						)}

						{connectionState === "not_connected" &&
							!onboarding.loading &&
							!onboarding.hasApiKeys && (
								<Alert variant="info" icon={<Key size={16} />}>
									<span className="font-medium">
										Todavía no configuraste tus claves API.
									</span>
									<p className="mt-1">
										Seguí estos pasos para vincular tu cuenta de Binance.
									</p>
								</Alert>
							)}

						<Input
							label="API Key"
							placeholder="Ingresá tu API Key de Binance"
							value={apiKey}
							onChange={setApiKey}
							helper="Generala en Binance → API Management → Create API"
							icon={<Key size={16} />}
						/>
						<Input
							label="Secret Key"
							placeholder="Ingresá tu Secret Key"
							value={secretKey}
							onChange={setSecretKey}
							helper="La encriptamos con AES-256 en reposo. Nadie más puede verla."
							icon={<Lock size={16} />}
							masked
						/>

						<label className="flex items-start gap-3 cursor-pointer">
							<input
								type="checkbox"
								checked={confirmed}
								onChange={(e) => setConfirmed(e.target.checked)}
								className="mt-0.5 w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
							/>
							<div>
								<p className="text-sm text-slate-700 dark:text-slate-300">
									Confirmo que mis claves API{" "}
									<span className="font-semibold">NO</span> tienen permisos de
									retiro habilitados.
								</p>
								<p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
									Solo requerimos permisos de trading SPOT.
								</p>
							</div>
						</label>

						<Alert variant="info" icon={<Info size={16} />}>
							<span className="font-medium">Seguridad:</span> Podés revocar el
							acceso desde Binance en cualquier momento.
						</Alert>

						<div className="flex gap-3 pt-2">
							<Button
								variant="secondary"
								onClick={() => navigate("/dashboard")}
								className="flex-1"
							>
								Cancelar
							</Button>
							<Button
								onClick={handleConnect}
								disabled={!apiKey || !secretKey || !confirmed || saving}
								className="flex-[2]"
							>
								{saving ? (
									<Loader2 size={18} className="mr-2 animate-spin" />
								) : null}
								{saving ? "Guardando..." : "Verificar y Conectar"}
							</Button>
						</div>

						<a
							href={SUPPORT_WA}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center justify-center gap-2 text-sm text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 font-medium underline underline-offset-2 w-full pt-1"
						>
							<MessageCircle size={16} />
							¿No tenés tus claves? Pedí ayuda por WhatsApp
						</a>
					</div>
				)}
			</Card>

			{/* Disconnect confirmation modal */}
			<Modal
				isOpen={showDisconnectModal}
				onClose={() => !deleting && setShowDisconnectModal(false)}
			>
				<div className="p-6">
					<div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
						<AlertTriangle size={24} className="text-red-600" />
					</div>

					<h3 className="text-lg font-bold text-slate-900 dark:text-white text-center mb-2">
						¿Desconectar claves API?
					</h3>

					<div className="space-y-3 text-sm text-slate-600 dark:text-slate-400 mb-6">
						<div className="flex items-start gap-2">
							<AlertTriangle
								size={16}
								className="text-red-500 mt-0.5 shrink-0"
							/>
							<p>
								<strong className="text-red-600 dark:text-red-400">
									El robot se detendrá inmediatamente
								</strong>{" "}
								para tu cuenta. No se ejecutarán más operaciones hasta que
								conectes claves nuevas.
							</p>
						</div>
						<div className="flex items-start gap-2">
							<Key size={16} className="text-amber-500 mt-0.5 shrink-0" />
							<p>
								<strong>Debés crear claves NUEVAS en Binance.</strong> No podés
								reutilizar las claves que desconectaste.
							</p>
						</div>
						<div className="flex items-start gap-2">
							<MessageCircle
								size={16}
								className="text-teal-500 mt-0.5 shrink-0"
							/>
							<p>
								Si tenés dudas,{" "}
								<a
									href={SUPPORT_WA}
									target="_blank"
									rel="noopener noreferrer"
									className="text-teal-600 hover:text-teal-700 font-medium underline"
								>
									contactanos por WhatsApp
								</a>{" "}
								y te ayudamos.
							</p>
						</div>
					</div>

					<div className="flex gap-3">
						<Button
							variant="ghost"
							onClick={() => setShowDisconnectModal(false)}
							className="flex-1"
							disabled={deleting}
						>
							Cancelar
						</Button>
						<Button
							variant="danger"
							onClick={handleDisconnect}
							className="flex-1"
							disabled={deleting}
						>
							{deleting ? (
								<>
									<Loader2 size={16} className="mr-2 animate-spin" />
									Eliminando...
								</>
							) : (
								<>
									<Trash2 size={16} className="mr-2" />
									Desconectar
								</>
							)}
						</Button>
					</div>
				</div>
			</Modal>
		</div>
	);
};
