// ============================================
// SCREEN 6: SETTINGS / LEGAL
// ============================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	Settings,
	Link2,
	BarChart3,
	FileText,
	AlertTriangle,
	CheckCircle,
	Download,
	Trash2,
	Info,
} from "lucide-react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { Modal } from "../components/ui/Modal";
import { Input } from "../components/ui/Input";
import { useTrading } from "../hooks/useTrading";
import { useAuth } from "../contexts/AuthContext";

export const SettingsScreen: React.FC = () => {
	const navigate = useNavigate();
	const { legalDocs, acceptDocument, disconnectApi } = useTrading();
	const { twoFactor } = useAuth();
	const [activeSection, setActiveSection] = useState("legal");
	const [showDisconnectModal, setShowDisconnectModal] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);

	const allAccepted = legalDocs.every((d) => d.accepted);

	return (
		<DashboardLayout>
			<div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
				{/* Sidebar */}
				<div className="lg:col-span-1">
					<Card className="p-2 md:p-4">
						<nav className="space-y-1">
							<button
								onClick={() => setActiveSection("account")}
								className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${activeSection === "account" ? "bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400" : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"}`}
							>
								<Settings size={18} /> Account Settings
							</button>
							<button
								onClick={() => setActiveSection("api")}
								className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${activeSection === "api" ? "bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400" : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"}`}
							>
								<Link2 size={18} /> API Management
							</button>
							<button
								onClick={() => setActiveSection("risk")}
								className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${activeSection === "risk" ? "bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400" : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"}`}
							>
								<BarChart3 size={18} /> Risk Configuration
							</button>
							<div className="border-t border-slate-100 dark:border-slate-700 my-2" />
							<button
								onClick={() => setActiveSection("legal")}
								className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${activeSection === "legal" ? "bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400" : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"}`}
							>
								<FileText size={18} /> Legal Documents
							</button>
							<div className="border-t border-slate-100 dark:border-slate-700 my-2" />
							<button
								onClick={() => setActiveSection("danger")}
								className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${activeSection === "danger" ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400" : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"}`}
							>
								<AlertTriangle size={18} /> Danger Zone
							</button>
						</nav>
					</Card>
				</div>

				{/* Content */}
				<div className="lg:col-span-3">
					{activeSection === "legal" && (
						<div className="space-y-4">
							<Card className="p-4 md:p-6">
								<h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
									Legal Documents
								</h3>
								<p className="text-sm text-slate-500 mb-6">
									Review and accept all required legal agreements to use the
									platform.
								</p>

								<div className="space-y-4">
									{legalDocs.map((doc) => (
										<div
											key={doc.id}
											className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
										>
											<div className="w-10 h-10 bg-white dark:bg-slate-700 rounded-lg flex items-center justify-center text-slate-400 shrink-0">
												<FileText size={20} />
											</div>
											<div className="flex-1">
												<h4 className="font-semibold text-slate-900 dark:text-white">
													{doc.title}
												</h4>
												<p className="text-sm text-slate-500 mt-0.5">
													{doc.description}
												</p>
												<div className="flex items-center gap-3 mt-3">
													<Button variant="ghost" size="sm">
														View Document
													</Button>
													<Button variant="secondary" size="sm">
														<Download size={14} className="mr-2" /> PDF
													</Button>
												</div>
											</div>
											<label className="flex items-center gap-2 cursor-pointer shrink-0">
												<input
													type="checkbox"
													checked={doc.accepted}
													onChange={() => acceptDocument(doc.id)}
													className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
												/>
												<span className="text-sm text-slate-600 dark:text-slate-400">
													I agree
												</span>
											</label>
										</div>
									))}
								</div>

								<div className="mt-6 p-4 bg-teal-50 dark:bg-teal-900/20 rounded-lg flex items-center gap-3">
									<CheckCircle
										size={20}
										className={`${allAccepted ? "text-teal-600" : "text-slate-400"}`}
									/>
									<span
										className={`text-sm font-medium ${allAccepted ? "text-teal-900 dark:text-teal-200" : "text-slate-500"}`}
									>
										{allAccepted
											? "All documents accepted"
											: `${legalDocs.filter((d) => d.accepted).length} of ${legalDocs.length} accepted`}
									</span>
								</div>
							</Card>
						</div>
					)}

					{activeSection === "danger" && (
						<Card className="p-4 md:p-6 border-red-200 dark:border-red-800">
							<div className="flex items-center gap-2 mb-4">
								<AlertTriangle size={20} className="text-red-500" />
								<h3 className="text-lg font-semibold text-red-700 dark:text-red-400">
									Danger Zone
								</h3>
							</div>
							<p className="text-sm text-slate-500 mb-6">
								These actions are irreversible. Please proceed with caution.
							</p>

							<div className="space-y-4">
								<div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
									<div>
										<h4 className="font-medium text-slate-900 dark:text-white">
											Disconnect Binance API
										</h4>
										<p className="text-sm text-slate-500 mt-0.5">
											Remove API access and stop all automated trading.
										</p>
									</div>
									<Button
										variant="danger"
										size="sm"
										onClick={() => setShowDisconnectModal(true)}
									>
										Disconnect
									</Button>
								</div>

								<div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
									<div>
										<h4 className="font-medium text-slate-900 dark:text-white">
											Delete Account
										</h4>
										<p className="text-sm text-slate-500 mt-0.5">
											Permanently delete your account and all associated data.
										</p>
									</div>
									<Button
										variant="danger"
										size="sm"
										onClick={() => setShowDeleteModal(true)}
									>
										<Trash2 size={14} className="mr-2" /> Delete
									</Button>
								</div>
							</div>
						</Card>
					)}

					{activeSection === "account" && (
						<Card className="p-4 md:p-6">
							<h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
								Account Settings
							</h3>
							<div className="space-y-4">
								<Input
									label="Full Name"
									value="Alex Rivera"
									onChange={() => {}}
								/>
								<Input
									label="Email"
									value="alex@example.com"
									onChange={() => {}}
								/>
								<Button>Save Changes</Button>
							</div>
							<div className="mt-6 border-t border-slate-100 dark:border-slate-700 pt-6">
								<h4 className="text-md font-semibold text-slate-900 dark:text-white mb-2">
									Autenticación en dos pasos (2FA)
								</h4>
								{twoFactor.enabled ? (
									<Alert variant="success" icon={<CheckCircle size={16} />}>
										<span className="font-medium">2FA activado</span>
										<p className="mt-1 text-sm">
											Tu cuenta está protegida con autenticación en dos pasos.
										</p>
									</Alert>
								) : (
									<div>
										<p className="text-sm text-slate-500 mb-3">
											Agregá una capa extra de seguridad a tu cuenta.
										</p>
										<Button
											variant="secondary"
											onClick={() => navigate("/2fa-setup")}
										>
											Activar 2FA
										</Button>
									</div>
								)}
							</div>
						</Card>
					)}

					{activeSection === "api" && (
						<Card className="p-4 md:p-6">
							<h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
								API Management
							</h3>
							<Alert variant="info" icon={<Info size={16} />}>
								Your API keys are encrypted at rest using AES-256.
							</Alert>
							<div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
								<p className="text-sm font-medium text-slate-900 dark:text-white">
									Connected API Key
								</p>
								<p className="text-sm font-mono text-slate-500 mt-1">
									••••••••••••••••
								</p>
							</div>
						</Card>
					)}

					{activeSection === "risk" && (
						<Card className="p-4 md:p-6">
							<h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
								Risk Configuration
							</h3>
							<div className="space-y-4">
								<div>
									<label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
										Risk Profile
									</label>
									<select className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-sm">
										<option>Conservative</option>
										<option>Moderate</option>
										<option>Aggressive</option>
									</select>
								</div>
								<div>
									<label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
										Max Position Size (%)
									</label>
									<input
										type="number"
										defaultValue={10}
										className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-sm"
									/>
								</div>
								<Button>Save Configuration</Button>
							</div>
						</Card>
					)}
				</div>
			</div>

			{/* Disconnect Modal */}
			<Modal
				isOpen={showDisconnectModal}
				onClose={() => setShowDisconnectModal(false)}
			>
				<div className="p-8">
					<div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
						<AlertTriangle size={24} className="text-red-600" />
					</div>
					<h3 className="text-xl font-bold text-center text-slate-900 dark:text-white mb-2">
						Disconnect API?
					</h3>
					<p className="text-sm text-center text-slate-500 mb-6">
						This will stop all automated trading and remove API access. You can
						reconnect anytime.
					</p>
					<div className="flex gap-3">
						<Button
							variant="secondary"
							onClick={() => setShowDisconnectModal(false)}
							className="flex-1"
						>
							Cancel
						</Button>
						<Button
							variant="danger"
							onClick={() => {
								disconnectApi();
								setShowDisconnectModal(false);
								navigate("/connect");
							}}
							className="flex-1"
						>
							Disconnect
						</Button>
					</div>
				</div>
			</Modal>

			{/* Delete Modal */}
			<Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
				<div className="p-8">
					<div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
						<Trash2 size={24} className="text-red-600" />
					</div>
					<h3 className="text-xl font-bold text-center text-slate-900 dark:text-white mb-2">
						Delete Account?
					</h3>
					<p className="text-sm text-center text-slate-500 mb-6">
						This action cannot be undone. All your data will be permanently
						deleted.
					</p>
					<div className="flex gap-3">
						<Button
							variant="secondary"
							onClick={() => setShowDeleteModal(false)}
							className="flex-1"
						>
							Cancel
						</Button>
						<Button
							variant="danger"
							onClick={() => setShowDeleteModal(false)}
							className="flex-1"
						>
							Delete Account
						</Button>
					</div>
				</div>
			</Modal>
		</DashboardLayout>
	);
};
