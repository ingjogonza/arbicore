# CryptoInvestor — Automated Crypto Trading Platform

A premium fintech web application for automated cryptocurrency trading via Binance API. No-custodial, transparent 7% fee on withdrawn profits only.

## Tech Stack

- **React 18** + TypeScript
- **Tailwind CSS** for styling
- **React Router DOM** for navigation
- **Recharts** for equity curve visualization
- **Lucide React** for icons
- **Vite** for build tooling

## Project Structure

```
cryptoinvestor/
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── src/
    ├── App.tsx                          # Main router
    ├── main.tsx                         # Entry point
    ├── index.css                        # Global styles
    ├── types/
    │   └── index.ts                     # All TypeScript interfaces
    ├── data/
    │   └── mock.ts                      # Mock data (user, trades, withdrawals, equity)
    ├── hooks/
    │   ├── useTheme.tsx                 # Light/Dark mode context
    │   └── useTrading.tsx               # Global trading state context
    ├── components/
    │   ├── ui/                          # Reusable UI components
    │   │   ├── Button.tsx
    │   │   ├── Input.tsx
    │   │   ├── Card.tsx
    │   │   ├── Badge.tsx
    │   │   ├── Modal.tsx
    │   │   ├── Alert.tsx
    │   │   └── KPICard.tsx
    │   └── layout/                      # Layout components
    │       ├── Sidebar.tsx
    │       ├── TopBar.tsx
    │       └── DashboardLayout.tsx
    └── screens/                         # Page components
        ├── OnboardingScreen.tsx
        ├── ConnectScreen.tsx
        ├── DashboardScreen.tsx
        ├── WithdrawModal.tsx
        ├── WithdrawalsScreen.tsx
        └── SettingsScreen.tsx
```

## Quick Start

```bash
# 1. Create project with Vite
npm create vite@latest cryptoinvestor -- --template react-ts
cd cryptoinvestor

# 2. Install dependencies
npm install react-router-dom recharts lucide-react clsx tailwind-merge

# 3. Install dev dependencies
npm install -D tailwindcss postcss autoprefixer

# 4. Copy all files from this project into your directory
# (Replace the generated src/ folder and config files)

# 5. Start development server
npm run dev
```

## Features

### 6 Screens
| Route | Screen | Description |
|-------|--------|-------------|
| `/` | **Onboarding** | Hero, 3-step process, trust banner, disclaimer |
| `/connect` | **API Connection** | Key inputs, security checkbox, status badges |
| `/dashboard` | **Dashboard** | 5 KPIs, equity chart, bot panel, trades table |
| `/withdraw` | **Withdraw Modal** | 93%/7% breakdown, visual split, double confirmation |
| `/withdrawals` | **History** | Full table with fees, wallets, tx hashes |
| `/settings` | **Legal/Settings** | 4 legal docs, danger zone, account settings |

### Design System
- **Colors**: Teal accent (#0D9488), slate neutrals, semantic colors
- **Typography**: Inter font, clear hierarchy
- **Components**: Button, Input, Card, Badge, Modal, Alert, KPICard
- **Themes**: Light + Dark mode toggle
- **Responsive**: Mobile-first, breakpoints at 640px, 1024px, 1440px

### Business Logic
- Fee 7% only on withdrawn profits
- 93% to client, 7% to platform
- No custody: funds always in user's Binance
- Mock data for development
- Context-based global state management

## Customization

### Changing Colors
Edit `tailwind.config.js`:
```js
colors: {
  teal: {
    600: '#YOUR_COLOR',
  }
}
```

### Adding Real API
Replace mock data in `src/hooks/useTrading.tsx` with actual API calls.

### Binance Integration
The API connection screen is ready for real integration. Add:
- API key validation
- Permission checking
- WebSocket for real-time data

## License

MIT — Built for demonstration purposes.
