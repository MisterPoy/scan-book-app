import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import MentionsLegales from './pages/MentionsLegales.tsx'
import Confidentialite from './pages/Confidentialite.tsx'
import ConsentBanner from './components/ConsentBanner.tsx'
import ConsentAwareAnalytics from './components/ConsentAwareAnalytics.tsx'

const pathname = window.location.pathname.replace(/\/$/, '') || '/'
const currentPage = pathname === '/mentions-legales'
  ? <MentionsLegales />
  : pathname === '/confidentialite'
    ? <Confidentialite />
    : <App />

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {currentPage}
      <ConsentAwareAnalytics />
      <ConsentBanner />
    </ErrorBoundary>
  </StrictMode>,
)
