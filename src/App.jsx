// src/App.jsx
import { useEffect, useState } from 'react'
import Sidebar from './components/sidebar'
import TickerSelector from './components/TickerSelector'
import Dashboard from './pages/Dashboard'
import Precios   from './pages/Precios'
import Señales   from './pages/Señales'
import Metricas  from './pages/Metricas'
import Modelo    from './pages/Modelo'

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  precios:   'Análisis de Precios',
  señales:   'Señales ML',
  metricas:  'Métricas de Backtesting',
  modelo:    'Control del Modelo',
}

const PAGES = {
  dashboard: Dashboard,
  precios:   Precios,
  señales:   Señales,
  metricas:  Metricas,
  modelo:    Modelo,
}

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [ticker, setTicker] = useState('AAPL')
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'dark'

    const savedTheme = window.localStorage.getItem('theme')
    if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme

    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    window.localStorage.setItem('theme', theme)
  }, [theme])

  const PageComponent = PAGES[page] || Dashboard

  return (
    <div className="app-shell">
      <Sidebar activePage={page} onNavigate={setPage} />

      <div className="main-content">
        {/* Header */}
        <header className="page-header">
          <div style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 15,
            color: 'var(--text-primary)',
            minWidth: 180,
          }}>
            {PAGE_TITLES[page]}
          </div>

          <div style={{ flex: 1 }} />

          <div className="theme-switcher" role="group" aria-label="Selector de tema">
            <button
              type="button"
              className={`theme-option${theme === 'dark' ? ' active' : ''}`}
              onClick={() => setTheme('dark')}
            >
              Oscuro
            </button>
            <button
              type="button"
              className={`theme-option${theme === 'light' ? ' active' : ''}`}
              onClick={() => setTheme('light')}
            >
              Claro
            </button>
          </div>

          <TickerSelector selected={ticker} onChange={setTicker} />
        </header>

        {/* Contenido */}
        <main className="page-body">
          <PageComponent ticker={ticker} />
        </main>
      </div>
    </div>
  )
}
