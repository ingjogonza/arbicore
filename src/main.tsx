import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { registerDomErrorHandler } from './lib/domErrorHandler'

// Register error handler for browser extension DOM conflicts (e.g. MozBar)
registerDomErrorHandler();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
)
