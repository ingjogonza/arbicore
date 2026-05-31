// ============================================
// PROTECTED ROUTE TESTS
// ============================================

import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../ProtectedRoute';

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

import { useAuth } from '../../contexts/AuthContext';

const MockDashboard = () => <div data-testid="dashboard">Dashboard</div>;
const MockLogin = () => <div data-testid="login">Login</div>;

const renderProtected = (_authState: any, _twoFactorState?: any) =>
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/login" element={<MockLogin />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<MockDashboard />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );

describe('ProtectedRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('redirects to login when not authenticated', () => {
    (useAuth as jest.Mock).mockReturnValue({
      state: { user: null, loading: false, error: null },
      twoFactor: { requires2FA: false },
    });

    renderProtected({ user: null, loading: false });
    expect(screen.getByTestId('login')).toBeInTheDocument();
  });

  test('shows loading spinner while loading', () => {
    (useAuth as jest.Mock).mockReturnValue({
      state: { user: null, loading: true, error: null },
      twoFactor: { requires2FA: false },
    });

    renderProtected({ user: null, loading: true });
    expect(screen.getByRole('status')).toBeInTheDocument(); // spinner
  });

  test('renders protected content when authenticated', () => {
    (useAuth as jest.Mock).mockReturnValue({
      state: { user: { id: '123', email: 'test@test.com' }, loading: false, error: null },
      twoFactor: { requires2FA: false },
    });

    renderProtected({ user: { id: '123' }, loading: false });
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
  });

  test('redirects to 2fa-verify when 2FA required', () => {
    (useAuth as jest.Mock).mockReturnValue({
      state: { user: { id: '123', email: 'test@test.com' }, loading: false, error: null },
      twoFactor: { requires2FA: true },
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/2fa-verify" element={<div data-testid="2fa">2FA Verify</div>} />
          <Route path="/login" element={<MockLogin />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<MockDashboard />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('2fa')).toBeInTheDocument();
  });
});
