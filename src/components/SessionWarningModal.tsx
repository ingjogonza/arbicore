// ============================================
// SESSION WARNING MODAL
// ============================================
//
// Modal que avisa al usuario que su sesión está
// por expirar por inactividad.
//

import { Modal } from "./ui/Modal";

interface SessionWarningModalProps {
	/** Whether the modal is visible */
	isOpen: boolean;
	/** Seconds remaining before forced logout */
	remainingSeconds: number;
	/** Called when user clicks "Keep me logged in" */
	onExtend: () => void;
	/** Called when user clicks "Logout now" */
	onLogout: () => void;
}

export const SessionWarningModal: React.FC<SessionWarningModalProps> = ({
	isOpen,
	remainingSeconds,
	onExtend,
	onLogout,
}) => {
	return (
		<Modal isOpen={isOpen} onClose={onExtend}>
			<div className="p-6 text-center">
				{/* Warning icon */}
				<div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
					<svg
						className="h-7 w-7 text-amber-600 dark:text-amber-400"
						fill="none"
						viewBox="0 0 24 24"
						strokeWidth={2}
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
						/>
					</svg>
				</div>

				<h2 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
					Sesión por expirar
				</h2>

				<p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
					Tu sesión se cerrará automáticamente por inactividad en:
				</p>

				{/* Countdown */}
				<div className="mb-6 text-4xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
					{remainingSeconds}s
				</div>

				{/* Actions */}
				<div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
					<button
						type="button"
						onClick={onLogout}
						className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
					>
						Cerrar sesión ahora
					</button>
					<button
						type="button"
						onClick={onExtend}
						className="rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-700"
					>
						Seguir conectado
					</button>
				</div>
			</div>
		</Modal>
	);
};
