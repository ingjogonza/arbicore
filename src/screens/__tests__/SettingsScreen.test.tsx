// ============================================
// SETTINGS SCREEN TESTS
// ============================================

import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { SettingsScreen } from "../SettingsScreen";

// --- Mocks ---

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
	...jest.requireActual("react-router-dom"),
	useNavigate: () => mockNavigate,
}));

const mockAcceptDocument = jest.fn();
const mockDisconnectApi = jest.fn();

const defaultLegalDocs = [
	{
		id: "tos",
		title: "Terms of Service",
		description:
			"Legal agreement governing use of the CryptoInvestor platform and automated trading services.",
		accepted: true,
	},
	{
		id: "risk",
		title: "Risk Disclosure",
		description:
			"Acknowledgment of risks associated with automated cryptocurrency trading and market volatility.",
		accepted: true,
	},
	{
		id: "api",
		title: "API Authorization Agreement",
		description:
			"Terms for connecting and authorizing API access to your Binance account for trade execution.",
		accepted: true,
	},
	{
		id: "custody",
		title: "No Custody Policy",
		description:
			"Confirmation that CryptoInvestor does not hold, manage, or take custody of your funds at any time.",
		accepted: true,
	},
];

const mockUser = {
	firstName: "Alex",
	lastName: "Rivera",
	email: "alex@example.com",
	phone: "+54 11 2345 6789",
};

jest.mock("../../hooks/useTrading", () => ({
	useTrading: jest.fn(),
}));

jest.mock("../../contexts/AuthContext", () => ({
	useAuth: jest.fn(),
}));

jest.mock("../../components/layout/DashboardLayout", () => ({
	DashboardLayout: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="dashboard-layout">{children}</div>
	),
}));

jest.mock("../../components/ui/Modal", () => ({
		Modal: ({
		isOpen,
		children,
	}: {
		isOpen: boolean;
		onClose: () => void;
		children: React.ReactNode;
	}) => (isOpen ? <div data-testid="modal">{children}</div> : null),
}));

import { useTrading } from "../../hooks/useTrading";
import { useAuth } from "../../contexts/AuthContext";

const mockUseTrading = useTrading as jest.Mock;
const mockUseAuth = useAuth as jest.Mock;

beforeEach(() => {
	jest.clearAllMocks();
	mockUseTrading.mockReturnValue({
		legalDocs: defaultLegalDocs,
		acceptDocument: mockAcceptDocument,
		disconnectApi: mockDisconnectApi,
	});
	mockUseAuth.mockReturnValue({
		state: { user: mockUser },
		twoFactor: { enabled: false, setupComplete: false, requires2FA: false },
	});
});

// -------------------------------------------------------------------
// Tests
// -------------------------------------------------------------------

describe("SettingsScreen", () => {
	describe("sidebar navigation", () => {
		test("renders all navigation buttons", () => {
			render(
				<BrowserRouter>
					<SettingsScreen />
				</BrowserRouter>,
			);

			expect(
				screen.getByRole("button", { name: /account settings/i }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: /api management/i }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: /risk configuration/i }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: /legal documents/i }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: /danger zone/i }),
			).toBeInTheDocument();
		});

		test("shows legal section by default", () => {
			render(
				<BrowserRouter>
					<SettingsScreen />
				</BrowserRouter>,
			);
			expect(
				screen.getByText(/review and accept all required legal agreements/i),
			).toBeInTheDocument();
		});

		test("switches to account section when Account Settings is clicked", () => {
			render(
				<BrowserRouter>
					<SettingsScreen />
				</BrowserRouter>,
			);
			fireEvent.click(
				screen.getAllByRole("button", { name: /account settings/i })[0],
			);
			expect(screen.getByText(/autenticaci.n en dos pasos/i)).toBeInTheDocument();
		});

		test("switches to API section when API Management is clicked", () => {
			render(
				<BrowserRouter>
					<SettingsScreen />
				</BrowserRouter>,
			);
			fireEvent.click(
				screen.getByRole("button", { name: /api management/i }),
			);
			expect(
				screen.getByText(/your api keys are encrypted at rest/i),
			).toBeInTheDocument();
		});

		test("switches to risk section when Risk Configuration is clicked", () => {
			render(
				<BrowserRouter>
					<SettingsScreen />
				</BrowserRouter>,
			);
			fireEvent.click(
				screen.getByRole("button", { name: /risk configuration/i }),
			);
			expect(
				screen.getByText(/risk profile/i),
			).toBeInTheDocument();
		});

		test("switches to danger section when Danger Zone is clicked", () => {
			render(
				<BrowserRouter>
					<SettingsScreen />
				</BrowserRouter>,
			);
			fireEvent.click(
				screen.getByRole("button", { name: /danger zone/i }),
			);
			expect(
				screen.getByText(/these actions are irreversible/i),
			).toBeInTheDocument();
		});
	});

	describe("legal documents section", () => {
		test("renders all legal documents with titles", () => {
			render(
				<BrowserRouter>
					<SettingsScreen />
				</BrowserRouter>,
			);
			expect(screen.getByText("Terms of Service")).toBeInTheDocument();
			expect(screen.getByText("Risk Disclosure")).toBeInTheDocument();
			expect(
				screen.getByText("API Authorization Agreement"),
			).toBeInTheDocument();
			expect(screen.getByText("No Custody Policy")).toBeInTheDocument();
		});

		test("shows all accepted status when all docs are accepted", () => {
			render(
				<BrowserRouter>
					<SettingsScreen />
				</BrowserRouter>,
			);
			expect(
				screen.getByText(/all documents accepted/i),
			).toBeInTheDocument();
		});

		test("shows partial acceptance status", () => {
			mockUseTrading.mockReturnValue({
				legalDocs: [
					{ id: "tos", title: "Terms of Service", description: "", accepted: true },
					{ id: "risk", title: "Risk Disclosure", description: "", accepted: false },
					{ id: "api", title: "API Authorization Agreement", description: "", accepted: false },
					{ id: "custody", title: "No Custody Policy", description: "", accepted: false },
				],
				acceptDocument: mockAcceptDocument,
				disconnectApi: mockDisconnectApi,
			});

			render(
				<BrowserRouter>
					<SettingsScreen />
				</BrowserRouter>,
			);
			expect(screen.getByText(/1 of 4 accepted/i)).toBeInTheDocument();
		});

		test("calls acceptDocument when checkbox is toggled", () => {
			render(
				<BrowserRouter>
					<SettingsScreen />
				</BrowserRouter>,
			);
			const checkboxes = screen.getAllByRole("checkbox");
			// All checked initially, clicking unchecks
			fireEvent.click(checkboxes[0]);
			expect(mockAcceptDocument).toHaveBeenCalledWith("tos");
		});

		test("renders View Document and PDF buttons for each doc", () => {
			render(
				<BrowserRouter>
					<SettingsScreen />
				</BrowserRouter>,
			);
			const viewButtons = screen.getAllByText(/view document/i);
			expect(viewButtons).toHaveLength(4);
			const pdfButtons = screen.getAllByText(/pdf/i);
			expect(pdfButtons).toHaveLength(4);
		});
	});

	describe("account section", () => {
		const renderAndClickAccount = () => {
			render(
				<BrowserRouter>
					<SettingsScreen />
				</BrowserRouter>,
			);
			fireEvent.click(
				screen.getByRole("button", { name: /account settings/i }),
			);
		};

		test("shows user full name", () => {
			renderAndClickAccount();
			expect(screen.getByText("Alex Rivera")).toBeInTheDocument();
		});

		test("shows user email", () => {
			renderAndClickAccount();
			expect(screen.getByText("alex@example.com")).toBeInTheDocument();
		});

		test("shows user phone", () => {
			renderAndClickAccount();
			expect(screen.getByText("+54 11 2345 6789")).toBeInTheDocument();
		});

		test("shows 2FA setup button when 2FA is disabled", () => {
			renderAndClickAccount();
			const activateBtn = screen.getByRole("button", { name: /activar 2fa/i });
			expect(activateBtn).toBeInTheDocument();
			fireEvent.click(activateBtn);
			expect(mockNavigate).toHaveBeenCalledWith("/2fa-setup");
		});

		test("shows 2FA enabled alert when 2FA is enabled", () => {
			mockUseAuth.mockReturnValue({
				state: { user: mockUser },
				twoFactor: { enabled: true, setupComplete: true, requires2FA: false },
			});
			renderAndClickAccount();
			expect(
				screen.getByText(/2fa activado/i),
			).toBeInTheDocument();
		});

		test("shows fallback dash when user data is missing", () => {
			mockUseAuth.mockReturnValue({
				state: { user: null },
				twoFactor: { enabled: false, setupComplete: false, requires2FA: false },
			});
			renderAndClickAccount();
			expect(screen.getAllByText("-")).toHaveLength(3);
		});
	});

	describe("API management section", () => {
		test("shows encrypted at rest message", () => {
			render(
				<BrowserRouter>
					<SettingsScreen />
				</BrowserRouter>,
			);
			fireEvent.click(
				screen.getByRole("button", { name: /api management/i }),
			);
			expect(
				screen.getByText(/your api keys are encrypted at rest using aes-256/i),
			).toBeInTheDocument();
		});

		test("shows connected API key placeholder", () => {
			render(
				<BrowserRouter>
					<SettingsScreen />
				</BrowserRouter>,
			);
			fireEvent.click(
				screen.getByRole("button", { name: /api management/i }),
			);
			expect(
				screen.getByText(/connected api key/i),
			).toBeInTheDocument();
		});
	});

	describe("risk configuration section", () => {
		test("renders risk profile select with options", () => {
			render(
				<BrowserRouter>
					<SettingsScreen />
				</BrowserRouter>,
			);
			fireEvent.click(
				screen.getByRole("button", { name: /risk configuration/i }),
			);
			const select = screen.getByRole("combobox");
			expect(select).toBeInTheDocument();
			expect(screen.getByText("Conservative")).toBeInTheDocument();
			expect(screen.getByText("Moderate")).toBeInTheDocument();
			expect(screen.getByText("Aggressive")).toBeInTheDocument();
		});

		test("renders max position size input", () => {
			render(
				<BrowserRouter>
					<SettingsScreen />
				</BrowserRouter>,
			);
			fireEvent.click(
				screen.getByRole("button", { name: /risk configuration/i }),
			);
			expect(
				screen.getByDisplayValue("10"),
			).toBeInTheDocument();
		});

		test("renders save configuration button", () => {
			render(
				<BrowserRouter>
					<SettingsScreen />
				</BrowserRouter>,
			);
			fireEvent.click(
				screen.getByRole("button", { name: /risk configuration/i }),
			);
			expect(
				screen.getByRole("button", { name: /save configuration/i }),
			).toBeInTheDocument();
		});
	});

	describe("danger zone", () => {
		beforeEach(() => {
			render(
				<BrowserRouter>
					<SettingsScreen />
				</BrowserRouter>,
			);
			fireEvent.click(
				screen.getByRole("button", { name: /danger zone/i }),
			);
		});

		test("renders disconnect and delete options", () => {
			expect(
				screen.getByText(/disconnect binance api/i),
			).toBeInTheDocument();
			expect(
				screen.getByText(/delete account/i),
			).toBeInTheDocument();
		});

		test("opens disconnect modal and confirms disconnect", () => {
			fireEvent.click(
				screen.getAllByRole("button", { name: /disconnect/i })[0],
			);

			expect(
				screen.getByText(/this will stop all automated trading/i),
			).toBeInTheDocument();

			// Confirm disconnect
			const confirmBtns = screen.getAllByRole("button", { name: /disconnect/i });
			fireEvent.click(confirmBtns[confirmBtns.length - 1]);

			expect(mockDisconnectApi).toHaveBeenCalled();
			expect(mockNavigate).toHaveBeenCalledWith("/connect");
		});

		test("opens disconnect modal and cancels", () => {
			fireEvent.click(
				screen.getAllByRole("button", { name: /disconnect/i })[0],
			);

			expect(
				screen.getByText(/this will stop all automated trading/i),
			).toBeInTheDocument();

			fireEvent.click(
				screen.getByRole("button", { name: /cancel/i }),
			);

			expect(
				screen.queryByText(/this will stop all automated trading/i),
			).not.toBeInTheDocument();
		});

		test("opens delete account modal", () => {
			fireEvent.click(
				screen.getByRole("button", { name: /^delete$/i }),
			);

			expect(
				screen.getByText(/this action cannot be undone/i),
			).toBeInTheDocument();
		});

		test("closes delete modal on cancel", () => {
			fireEvent.click(
				screen.getByRole("button", { name: /^delete$/i }),
			);

			expect(
				screen.getByText(/this action cannot be undone/i),
			).toBeInTheDocument();

			fireEvent.click(
				screen.getByRole("button", { name: /^cancel$/i }),
			);

			expect(
				screen.queryByText(/this action cannot be undone/i),
			).not.toBeInTheDocument();
		});
	});
});
