// ============================================
// ONBOARDING BANNER COMPONENT
// ============================================

import { useState } from "react";
import { Smartphone, Key, ArrowRight, X } from "lucide-react";

interface OnboardingBannerProps {
	has2FA: boolean;
	hasApiKeys: boolean;
	loading: boolean;
	onSetup2FA: () => void;
	onConnectApi: () => void;
}

const DISMISSED_KEY = "onboarding-banner-dismissed";

export const OnboardingBanner: React.FC<OnboardingBannerProps> = ({
	has2FA,
	hasApiKeys,
	loading,
	onSetup2FA,
	onConnectApi,
}) => {
	const [dismissed, setDismissed] = useState(
		() => localStorage.getItem(DISMISSED_KEY) === "true",
	);

	if (loading) return null;

	const isComplete = has2FA && hasApiKeys;

	const handleDismiss = () => {
		setDismissed(true);
		localStorage.setItem(DISMISSED_KEY, "true");
	};

	// All complete — show green banner
	if (isComplete) {
		if (dismissed) return null;

		return (
			<div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-4 py-2">
				<span>✅</span>
				<span>Todo listo para operar</span>
				<button
					onClick={handleDismiss}
					className="ml-auto p-1 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
					aria-label="Cerrar"
				>
					<X size={14} />
				</button>
			</div>
		);
	}

	// Incomplete — show amber/yellow setup banner
	if (dismissed) return null;

	const steps: {
		icon: React.ReactNode;
		label: string;
		desc: string;
		action: () => void;
	}[] = [];

	if (!has2FA) {
		steps.push({
			icon: <Smartphone size={18} />,
			label: "Configurar 2FA",
			desc: "Protegé tu cuenta con autenticación de dos factores.",
			action: onSetup2FA,
		});
	}

	if (!hasApiKeys) {
		steps.push({
			icon: <Key size={18} />,
			label: "Conectar API de Binance",
			desc: "Vinculá tu cuenta de Binance para empezar a operar.",
			action: onConnectApi,
		});
	}

	return (
		<div className="bg-gradient-to-r from-amber-500 to-yellow-500 rounded-xl p-4 md:p-6 text-white relative">
			<button
				onClick={handleDismiss}
				className="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/20 transition-colors"
				aria-label="Cerrar"
			>
				<X size={18} />
			</button>
			<h2 className="text-lg font-bold mb-1">¡Bienvenido a CryptoInvestor!</h2>
			<p className="text-sm text-white/80 mb-4">
				Completá estos pasos para empezar a operar:
			</p>
			<div className="flex flex-col sm:flex-row gap-3">
				{steps.map((step, i) => (
					<button
						key={i}
						onClick={step.action}
						className="flex items-center gap-3 bg-white/10 hover:bg-white/20 rounded-lg p-3 transition-colors text-left flex-1"
					>
						<div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
							{step.icon}
						</div>
						<div className="min-w-0">
							<p className="text-sm font-semibold">{step.label}</p>
							<p className="text-xs text-white/70 truncate">{step.desc}</p>
						</div>
						<ArrowRight size={16} className="shrink-0 ml-auto opacity-60" />
					</button>
				))}
			</div>
		</div>
	);
};
