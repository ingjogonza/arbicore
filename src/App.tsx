// ============================================
// MAIN APP COMPONENT
// ============================================

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './hooks/useTheme';
import { TradingProvider } from './hooks/useTrading';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { ConnectScreen } from './screens/ConnectScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { WithdrawalsScreen } from './screens/WithdrawalsScreen';
import { SettingsScreen } from './screens/SettingsScreen';

function App() {
  return (
    <ThemeProvider>
      <TradingProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<OnboardingScreen />} />
            <Route path="/connect" element={<ConnectScreen />} />
            <Route path="/dashboard" element={<DashboardScreen />} />
            <Route path="/withdrawals" element={<WithdrawalsScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
          </Routes>
        </BrowserRouter>
      </TradingProvider>
    </ThemeProvider>
  );
}

export default App;
