// ============================================
// TOP BAR COMPONENT
// ============================================

import { useLocation } from "react-router-dom";
import { Bell, Menu, LogOut } from "lucide-react";
import { useTrading } from "../../hooks/useTrading";
import { useAuth } from "../../contexts/AuthContext";

interface TopBarProps {
	onMenuClick?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onMenuClick }) => {
	const { user } = useTrading();
	const { state: authState, logout } = useAuth();
	const location = useLocation();

	const titles: Record<string, string> = {
		"/dashboard": "Dashboard",
		"/connect": "API Connection",
		"/withdrawals": "Withdrawal History",
		"/settings": "Settings & Legal",
	};

	return (
		<header className="h-14 md:h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:px-6 sticky top-0 z-40">
			<div className="flex items-center gap-3">
				<button
					onClick={onMenuClick}
					className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
				>
					<Menu size={24} />
				</button>
				<h1 className="text-lg md:text-xl font-semibold text-slate-900 dark:text-white">
					{titles[location.pathname] || "CryptoInvestor"}
				</h1>
			</div>
			<div className="flex items-center gap-2 md:gap-4">
				<button className="relative p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
					<Bell size={20} />
					<span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
				</button>
				<div className="flex items-center gap-3">
					<div className="w-8 md:w-9 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center text-teal-700 dark:text-teal-400 font-semibold text-xs md:text-sm">
						{authState.user
							? `${authState.user.firstName?.[0] ?? authState.user.email[0]}${authState.user.lastName?.[0] ?? ""}`.toUpperCase()
							: user.avatar}
					</div>
					<div className="hidden md:block">
						<p className="text-sm font-medium text-slate-900 dark:text-white">
							{authState.user
								? `${authState.user.firstName || ""} ${authState.user.lastName || ""}`.trim() ||
									authState.user.email
								: user.name}
						</p>
						<p className="text-xs text-slate-500">
							{authState.user?.email || user.email}
						</p>
					</div>
					{authState.user && (
						<button
							onClick={logout}
							className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
							title="Cerrar sesión"
						>
							<LogOut size={18} />
						</button>
					)}
				</div>
			</div>
		</header>
	);
};
