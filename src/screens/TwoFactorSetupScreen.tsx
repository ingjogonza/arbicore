// ============================================
// 2FA SETUP SCREEN
// ============================================

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
	Shield,
	AlertCircle,
	CheckCircle,
	ArrowRight,
	Copy,
	Download,
	Key,
	Check,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { useAuth } from "../contexts/AuthContext";

export const TwoFactorSetupScreen: React.FC = () => {
	const navigate = useNavigate();
	const { setup2FA, verify2FA } = useAuth();
	const [qrCode, setQrCode] = useState("");
	const [secret, setSecret] = useState("");
	const [token, setToken] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [verified, setVerified] = useState(false);
	const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
	const [codesCopied, setCodesCopied] = useState(false);
	const [codesSaved, setCodesSaved] = useState(false);
	const codesRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		let cancelled = false;
		setup2FA()
			.then(({ secret: s, qrCodeUrl, recoveryCodes: codes }) => {
				if (!cancelled) {
					setSecret(s);
					setQrCode(qrCodeUrl);
					setRecoveryCodes(codes || []);
				}
			})
			.catch((err: any) => {
				if (!cancelled)
					setError(err.message || "Error al iniciar configuración de 2FA");
			});
		return () => {
			cancelled = true;
		};
	}, [setup2FA]);

	const handleVerify = async () => {
		if (token.length !== 6) {
			setError("Ingresa el código de 6 dígitos.");
			return;
		}
		setLoading(true);
		setError("");
		try {
			const ok = await verify2FA(token);
			if (ok) {
				setVerified(true);
			} else {
				setError("Código incorrecto. Intenta de nuevo.");
			}
		} catch (err: any) {
			setError(err.message || "Error al verificar código");
		} finally {
			setLoading(false);
		}
	};

	const copyCodes = () => {
		navigator.clipboard.writeText(recoveryCodes.join("\n"));
		setCodesCopied(true);
		setTimeout(() => setCodesCopied(false), 2000);
	};

	const downloadCodes = () => {
		const content = [
			"CryptoInvestor - Códigos de Recuperación 2FA",
			"Guardalos en un lugar seguro. Cada código solo puede usarse una vez.",
			"",
			...recoveryCodes.map((c) => `  ${c}`),
			"",
			"Generado el: " + new Date().toLocaleDateString("es-AR"),
		].join("\n");
		const blob = new Blob([content], { type: "text/plain" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "cryptoinvestor-2fa-recovery-codes.txt";
		a.click();
		URL.revokeObjectURL(url);
		setCodesSaved(true);
	};

	const handleContinue = () => {
		navigate("/settings");
	};

	return (
		<div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center px-4">
			<div className="w-full max-w-md">
				<div className="text-center mb-6">
					<div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center mx-auto mb-4">
						<Shield size={24} className="text-white" />
					</div>
					<h1 className="text-2xl font-bold text-slate-900 dark:text-white">
						Configurar 2FA
					</h1>
					<p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
						Agregá una capa extra de seguridad a tu cuenta
					</p>
				</div>

				{error && (
					<div className="mb-4">
						<Alert variant="danger" icon={<AlertCircle size={16} />}>
							<span className="text-sm font-medium">{error}</span>
						</Alert>
					</div>
				)}

				{verified ? (
					<div className="space-y-4">
						<Alert variant="success" icon={<CheckCircle size={16} />}>
							<span className="font-medium">¡2FA activado correctamente!</span>
						</Alert>

						<div className="border border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
							<div className="flex items-start gap-3">
								<Key size={20} className="text-yellow-600 mt-0.5" />
								<div>
									<h3 className="text-sm font-bold text-yellow-800 dark:text-yellow-200">
										Códigos de Recuperación
									</h3>
									<p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
										Guardá estos códigos en un lugar seguro. Si perdés el acceso
										a tu app de autenticación, podés usar uno de estos códigos
										para recuperar tu cuenta.
										<strong>Cada código solo puede usarse una vez.</strong>
										Estos códigos no se mostrarán nuevamente.
									</p>
								</div>
							</div>

							<div
								ref={codesRef}
								className="mt-3 p-3 bg-white dark:bg-slate-800 rounded border border-yellow-300 dark:border-yellow-600 font-mono text-sm"
							>
								{recoveryCodes.map((code, i) => (
									<div key={i} className="py-0.5">
										<span className="text-slate-400 mr-2">{i + 1}.</span>
										<span className="text-slate-800 dark:text-slate-200">
											{code}
										</span>
									</div>
								))}
							</div>

							<div className="flex gap-2 mt-3">
								<Button variant="secondary" size="sm" onClick={copyCodes}>
									{codesCopied ? (
										<>
											<Check size={14} className="mr-1" /> Copiado
										</>
									) : (
										<>
											<Copy size={14} className="mr-1" /> Copiar
										</>
									)}
								</Button>
								<Button variant="secondary" size="sm" onClick={downloadCodes}>
									<Download size={14} className="mr-1" />{" "}
									{codesSaved ? "Descargado" : "Descargar"}
								</Button>
							</div>
						</div>

						<div className="flex justify-center">
							<Button
								variant="primary"
								className="w-full"
								onClick={handleContinue}
							>
								Ir a configuración
							</Button>
						</div>
					</div>
				) : qrCode ? (
					<div className="space-y-4">
						<div className="text-center">
							<p className="text-sm text-slate-700 dark:text-slate-300 mb-3">
								Escaneá el código QR con tu app de autenticación:
							</p>
							<img
								src={qrCode}
								alt="2FA QR Code"
								className="mx-auto w-48 h-48 rounded-lg border border-slate-200 dark:border-slate-700"
							/>
							<p className="text-xs text-slate-500 mt-2 font-mono break-all">
								{secret}
							</p>
						</div>

						<div>
							<label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
								Código de verificación
							</label>
							<input
								type="text"
								value={token}
								onChange={(e) =>
									setToken(e.target.value.replace(/\D/g, "").slice(0, 6))
								}
								placeholder="000000"
								maxLength={6}
								className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm text-center tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
							/>
						</div>

						<Button
							onClick={handleVerify}
							variant="primary"
							className="w-full"
							disabled={loading || token.length !== 6}
						>
							{loading ? (
								"Verificando..."
							) : (
								<span className="flex items-center justify-center gap-2">
									Verificar <ArrowRight size={16} />
								</span>
							)}
						</Button>
					</div>
				) : (
					<div className="text-center">
						<span className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin inline-block" />
						<p className="text-sm text-slate-500 mt-2">Cargando...</p>
					</div>
				)}
			</div>
		</div>
	);
};
