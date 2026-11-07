// src/App.jsx
import { useEffect, useState } from 'react'
import Sidebar from './components/sidebar'
import TickerSelector from './components/TickerSelector'
import Dashboard from './pages/Dashboard'
import Precios   from './pages/Precios'
import Comparar  from './pages/Comparar'
import Señales   from './pages/Señales'
import Shap      from './pages/Shap'
import Metricas  from './pages/Metricas'
import Modelo    from './pages/Modelo'
import Seguridad from './pages/Seguridad'
import Login     from './pages/Login'
import { getToken, getPerfilActual, clearToken } from './services/api'

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  precios:   'Análisis de Precios e Indicadores',
  comparar:  'Comparador Multi-Activo',
  señales:   'Señales ML · Motor XGBoost & Horizontes',
  shap:      'Explicabilidad TreeSHAP (M3)',
  metricas:  'Métricas de Backtesting',
  modelo:    'Control del Pipeline y Entrenamiento (Admin)',
  seguridad: 'Administración de Usuarios, Roles y Auditoría (Admin)',
}

const PAGES = {
  dashboard: Dashboard,
  precios:   Precios,
  comparar:  Comparar,
  señales:   Señales,
  shap:      Shap,
  metricas:  Metricas,
  modelo:    Modelo,
  seguridad: Seguridad,
}

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [ticker, setTicker] = useState('AAPL')
  const [user, setUser] = useState(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
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

  // Recuperar sesión activa si hay un token JWT guardado
  useEffect(() => {
    const token = getToken()
    if (!token) {
      setCheckingAuth(false)
      return
    }
    getPerfilActual()
      .then(perfil => {
        if (perfil) setUser(perfil.usuario || perfil)
      })
      .catch(() => {
        clearToken()
        setUser(null)
      })
      .finally(() => {
        setCheckingAuth(false)
      })
  }, [])

  const handleLogout = () => {
    clearToken()
    setUser(null)
    setPage('dashboard')
  }

  if (checkingAuth) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-base)',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
        fontSize: 13,
      }}>
        Verificando sesión…
      </div>
    )
  }

  // Puerta de ingreso obligatoria: si no hay sesión iniciada, mostrar Login
  if (!user) {
    return (
      <Login
        onLoginSuccess={(perfil) => {
          setUser(perfil)
          setPage('dashboard')
        }}
        theme={theme}
        onToggleTheme={setTheme}
      />
    )
  }

  // Si un usuario común intenta ir a una vista exclusiva de ADMIN, redirigir a dashboard
  const esAdmin = user?.rol === 'ADMIN'
  const paginaEfectiva = (!esAdmin && (page === 'seguridad' || page === 'modelo')) ? 'dashboard' : page
  const PageComponent = PAGES[paginaEfectiva] || Dashboard

  return (
    <div className="app-shell">
      <Sidebar activePage={paginaEfectiva} onNavigate={setPage} user={user} />

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
            {PAGE_TITLES[paginaEfectiva]}
          </div>

          <div style={{ flex: 1 }} />

          {/* Badge de usuario logueado + Botón Cerrar sesión */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              className={`tag ${esAdmin ? 'tag-red' : 'tag-blue'}`}
              style={{ fontSize: 11, padding: '4px 10px' }}
            >
              {esAdmin ? '🛡 ADMIN' : '👤 USUARIO'} · {user.username}
            </span>

            <button
              type="button"
              className="btn"
              style={{ fontSize: 11, padding: '5px 10px' }}
              onClick={handleLogout}
              title="Cerrar sesión activa"
            >
              Cerrar sesión
            </button>
          </div>

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

          {paginaEfectiva !== 'comparar' && paginaEfectiva !== 'seguridad' && paginaEfectiva !== 'modelo' && (
            <TickerSelector selected={ticker} onChange={setTicker} />
          )}
        </header>

        {/* Contenido */}
        <main className="page-body">
          <PageComponent ticker={ticker} user={user} onAuthChange={setUser} />
        </main>
      </div>
    </div>
  )
}
