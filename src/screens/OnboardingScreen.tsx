// ============================================
// SCREEN 1: ONBOARDING
// ============================================

import { useSafeNavigate } from "../hooks/useSafeNavigate";
import {
	Key,
	Play,
	Wallet,
	ShieldCheck,
	ArrowRight,
	BarChart3,
	LogIn,
	UserPlus,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";

export const OnboardingScreen: React.FC = () => {
	const navigate = useSafeNavigate();

	const steps = [
		{
			icon: <Key size={24} />,
			title: "Connect API Keys",
			desc: "Link your Binance account securely with read-only and trading permissions.",
		},
		{
			icon: <Play size={24} />,
			title: "Activate the Bot",
			desc: "Choose your risk profile and start automated execution in seconds.",
		},
		{
			icon: <Wallet size={24} />,
			title: "Withdraw Profits",
			desc: "Withdraw anytime. Only 7% fee on profits withdrawn. Full transparency.",
		},
	];

	return (
		<div className="min-h-screen bg-white dark:bg-slate-950 flex">
			<div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-24 max-w-3xl">
				<div className="mb-8">
					<div className="flex items-center gap-2 mb-6">
						<div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
							<BarChart3 size={18} className="text-white" />
						</div>
						<span className="text-xl font-bold text-slate-900 dark:text-white">
							CryptoInvestor
						</span>
					</div>
					<p className="text-sm text-slate-500 dark:text-slate-400">
						Automated Execution. Full Custody. Transparent Fees.
					</p>
				</div>

				<h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white leading-tight mb-4">
					Automate Your Trading Strategy
				</h1>
				<p className="text-lg text-slate-600 dark:text-slate-400 mb-10 max-w-lg">
					Connect your Binance account via API and let our algorithm execute
					trades automatically. You keep full custody of your funds at all
					times.
				</p>

				<div className="grid gap-6 mb-10">
					{steps.map((step, i) => (
						<div key={i} className="flex items-start gap-4">
							<div className="w-12 h-12 bg-teal-50 dark:bg-teal-900/20 rounded-xl flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
								{step.icon}
							</div>
							<div>
								<h3 className="font-semibold text-slate-900 dark:text-white">
									{step.title}
								</h3>
								<p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
									{step.desc}
								</p>
							</div>
						</div>
					))}
				</div>

				<Alert variant="success" icon={<ShieldCheck size={16} />}>
					<span className="font-medium">
						Your funds remain in your Binance account at all times.
					</span>{" "}
					We never hold custody.
				</Alert>

				<div className="mt-8 space-y-3">
					<Button
						size="lg"
						onClick={() => navigate("/connect")}
						className="w-full md:w-auto"
					>
						Connect Binance Account <ArrowRight size={18} className="ml-2" />
					</Button>
					<div className="flex gap-3">
						<Button
							variant="secondary"
							size="md"
							onClick={() => navigate("/login")}
							className="flex-1 md:flex-none"
						>
							<LogIn size={16} className="mr-2" /> Iniciar sesión
						</Button>
						<Button
							variant="ghost"
							size="md"
							onClick={() => navigate("/register")}
							className="flex-1 md:flex-none"
						>
							<UserPlus size={16} className="mr-2" /> Crear cuenta
						</Button>
					</div>
					<p className="text-xs text-slate-400">
						No credit card required · Start in under 2 minutes
					</p>
				</div>

				<p className="mt-8 text-xs text-slate-400">
					No Custodial Trading Automation Software — We do not hold, manage, or
					custody your funds.
				</p>
			</div>

			<div className="hidden lg:flex flex-1 bg-gradient-to-br from-teal-50 to-slate-100 dark:from-teal-950/20 dark:to-slate-900 items-center justify-center">
				<div className="relative w-96 h-96">
					<svg viewBox="0 0 400 400" className="w-full h-full opacity-30">
						<defs>
							<linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
								<stop offset="0%" stopColor="#0d9488" />
								<stop offset="100%" stopColor="#0f766e" />
							</linearGradient>
						</defs>
						<circle
							cx="200"
							cy="200"
							r="150"
							fill="none"
							stroke="url(#grad1)"
							strokeWidth="1"
						/>
						<circle
							cx="200"
							cy="200"
							r="100"
							fill="none"
							stroke="url(#grad1)"
							strokeWidth="1"
							opacity="0.5"
						/>
						<circle
							cx="200"
							cy="200"
							r="50"
							fill="none"
							stroke="url(#grad1)"
							strokeWidth="1"
							opacity="0.3"
						/>
						<line
							x1="200"
							y1="50"
							x2="200"
							y2="350"
							stroke="url(#grad1)"
							strokeWidth="0.5"
							opacity="0.3"
						/>
						<line
							x1="50"
							y1="200"
							x2="350"
							y2="200"
							stroke="url(#grad1)"
							strokeWidth="0.5"
							opacity="0.3"
						/>
						<line
							x1="94"
							y1="94"
							x2="306"
							y2="306"
							stroke="url(#grad1)"
							strokeWidth="0.5"
							opacity="0.3"
						/>
						<line
							x1="306"
							y1="94"
							x2="94"
							y2="306"
							stroke="url(#grad1)"
							strokeWidth="0.5"
							opacity="0.3"
						/>
						<circle cx="200" cy="50" r="4" fill="#0d9488" />
						<circle cx="350" cy="200" r="4" fill="#0d9488" />
						<circle cx="200" cy="350" r="4" fill="#0d9488" />
						<circle cx="50" cy="200" r="4" fill="#0d9488" />
						<circle cx="200" cy="200" r="6" fill="#0d9488" />
					</svg>
				</div>
			</div>
		</div>
	);
};
