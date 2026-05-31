// ============================================
// SCREEN: REGISTER
// ============================================

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
	User,
	Mail,
	Lock,
	ArrowRight,
	AlertCircle,
	FileText,
	Check,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { useAuth } from "../contexts/AuthContext";

const LEGAL_DOCS = [
	{
		id: "tos",
		title: "Términos de Servicio",
		description:
			"Acuerdo legal que rige el uso de la plataforma CryptoInvestor y los servicios de trading automatizado.",
	},
	{
		id: "risk",
		title: "Divulgación de Riesgos",
		description:
			"Reconocimiento de los riesgos asociados al trading automatizado de criptomonedas y la volatilidad del mercado.",
	},
	{
		id: "api",
		title: "Acuerdo de Autorización API",
		description:
			"Términos para conectar y autorizar el acceso API a tu cuenta de Binance para la ejecución de trades.",
	},
	{
		id: "custody",
		title: "Política de No Custodia",
		description:
			"Confirmación de que CryptoInvestor no custodia, administra ni retiene tus fondos en ningún momento.",
	},
];

export const RegisterScreen: React.FC = () => {
	const navigate = useNavigate();
	const { register, state, clearError } = useAuth();
	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [acceptedDocs, setAcceptedDocs] = useState<Set<string>>(new Set());
	const [localError, setLocalError] = useState("");

	const toggleDoc = (id: string) => {
		setAcceptedDocs((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const allDocsAccepted = acceptedDocs.size === LEGAL_DOCS.length;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		clearError();
		setLocalError("");

		if (!firstName.trim() || !lastName.trim()) {
			setLocalError("Ingresa tu nombre y apellido.");
			return;
		}
		if (!email.trim()) {
			setLocalError("Ingresa tu correo electrónico.");
			return;
		}
		if (password.length < 6) {
			setLocalError("La contraseña debe tener al menos 6 caracteres.");
			return;
		}
		if (password !== confirmPassword) {
			setLocalError("Las contraseñas no coinciden.");
			return;
		}
		if (!allDocsAccepted) {
			setLocalError(
				"Debes aceptar todos los documentos legales para continuar.",
			);
			return;
		}

		try {
			await register({
				firstName: firstName.trim(),
				lastName: lastName.trim(),
				email: email.trim(),
				password,
				legalDocsAccepted: true,
			});
			navigate("/verify-email");
		} catch {
			// Error is set in AuthContext state
		}
	};

	return (
		<div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center px-4 py-8">
			<div className="w-full max-w-lg">
				<div className="text-center mb-6">
					<div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center mx-auto mb-4">
						<User size={24} className="text-white" />
					</div>
					<h1 className="text-2xl font-bold text-slate-900 dark:text-white">
						Crear cuenta
					</h1>
					<p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
						Comenzá a operar con CryptoInvestor
					</p>
				</div>

				{(state.error || localError) && (
					<div className="mb-4">
						<Alert variant="danger" icon={<AlertCircle size={16} />}>
							<span className="text-sm font-medium">
								{state.error || localError}
							</span>
						</Alert>
					</div>
				)}

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="grid grid-cols-2 gap-3">
						<div>
							<label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
								Nombre
							</label>
							<input
								type="text"
								value={firstName}
								onChange={(e) => setFirstName(e.target.value)}
								placeholder="Juan"
								className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
								required
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
								Apellido
							</label>
							<input
								type="text"
								value={lastName}
								onChange={(e) => setLastName(e.target.value)}
								placeholder="Pérez"
								className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
								required
							/>
						</div>
					</div>

					<div>
						<label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
							Correo electrónico
						</label>
						<div className="relative">
							<Mail
								size={18}
								className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
							/>
							<input
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="tu@email.com"
								className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
								required
							/>
						</div>
					</div>

					<div>
						<label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
							Contraseña
						</label>
						<div className="relative">
							<Lock
								size={18}
								className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
							/>
							<input
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="••••••••"
								className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
								required
							/>
						</div>
						<p className="text-xs text-slate-400 mt-1">Mínimo 6 caracteres</p>
					</div>

					<div>
						<label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
							Confirmar contraseña
						</label>
						<div className="relative">
							<Lock
								size={18}
								className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
							/>
							<input
								type="password"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								placeholder="••••••••"
								className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
								required
							/>
						</div>
					</div>

					<div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-3">
						<div className="flex items-center gap-2 mb-2">
							<FileText size={18} className="text-teal-600" />
							<h3 className="text-sm font-semibold text-slate-900 dark:text-white">
								Documentos legales obligatorios
							</h3>
						</div>
						<p className="text-xs text-slate-500 dark:text-slate-400">
							Debes aceptar todos los documentos para operar en la plataforma.
						</p>
						{LEGAL_DOCS.map((doc) => (
							<label
								key={doc.id}
								className="flex items-start gap-3 cursor-pointer group"
							>
								<div
									className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${
										acceptedDocs.has(doc.id)
											? "bg-teal-600 border-teal-600"
											: "border-slate-300 dark:border-slate-600 group-hover:border-teal-400"
									}`}
								>
									{acceptedDocs.has(doc.id) && (
										<Check size={14} className="text-white" />
									)}
								</div>
								<input
									type="checkbox"
									className="sr-only"
									checked={acceptedDocs.has(doc.id)}
									onChange={() => toggleDoc(doc.id)}
								/>
								<div>
									<p className="text-sm font-medium text-slate-800 dark:text-slate-200">
										{doc.title}
									</p>
									<p className="text-xs text-slate-500 dark:text-slate-400">
										{doc.description}
									</p>
								</div>
							</label>
						))}
					</div>

					<Button
						type="submit"
						variant="primary"
						className="w-full"
						disabled={state.loading || !allDocsAccepted}
					>
						{state.loading ? (
							<span className="flex items-center justify-center gap-2">
								<span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
								Creando cuenta...
							</span>
						) : (
							<span className="flex items-center justify-center gap-2">
								Crear cuenta <ArrowRight size={16} />
							</span>
						)}
					</Button>
				</form>

				<p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
					¿Ya tienes cuenta?{" "}
					<Link
						to="/login"
						className="text-teal-600 hover:text-teal-700 font-medium"
					>
						Iniciar sesión
					</Link>
				</p>
			</div>
		</div>
	);
};
