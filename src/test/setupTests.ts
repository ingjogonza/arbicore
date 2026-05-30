import "@testing-library/jest-dom";

// Mock import.meta.env for Vite
declare global {
	var importMetaEnv: Record<string, string>;
}
global.importMetaEnv = {
	VITE_SUPABASE_URL: "https://test.supabase.co",
	VITE_SUPABASE_ANON_KEY: "test-anon-key",
	VITE_API_BASE_URL: "http://localhost:3000",
};

Object.defineProperty(global, "import", {
	value: { meta: { env: global.importMetaEnv } },
	writable: true,
});

// Mock ResizeObserver for Recharts
class ResizeObserverMock {
	observe() {}
	unobserve() {}
	disconnect() {}
}
Object.defineProperty(window, "ResizeObserver", {
	writable: true,
	value: ResizeObserverMock,
});

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: jest.fn().mockImplementation((query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: jest.fn(),
		removeListener: jest.fn(),
		addEventListener: jest.fn(),
		removeEventListener: jest.fn(),
		dispatchEvent: jest.fn(),
	})),
});

// Suppress console errors during tests
global.console = {
	...console,
	error: jest.fn(),
	warn: jest.fn(),
};
