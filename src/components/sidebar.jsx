// src/components/sidebar.jsx
import { useState, useEffect } from 'react'
import { getEstadoModelo } from '../services/api'

const ICONS = {
  dashboard: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="nav-icon">
      <rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/>
      <rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/>
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="nav-icon">
      <polyline points="1,12 5,7 8,9 12,4 15,6"/>
      <line x1="1" y1="15" x2="15" y2="15"/>
    </svg>
  ),
  compare: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="nav-icon">
      <polyline points="1,13 5,9 9,10 15,3"/>
      <polyline points="1,9 6,5 10,7 15,6"/>
    </svg>
  ),
  signal: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="nav-icon">
      <circle cx="8" cy="8" r="2"/>
      <path d="M4.5 4.5a5 5 0 0 0 0 7M11.5 4.5a5 5 0 0 1 0 7"/>
      <path d="M2 2a9 9 0 0 0 0 12M14 2a9 9 0 0 1 0 12"/>
    </svg>
  ),
  shap: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="nav-icon">
      <line x1="8" y1="2" x2="8" y2="14"/>
      <rect x="8" y="3" width="6" height="2.5" rx="0.5"/>
      <rect x="3" y="7" width="5" height="2.5" rx="0.5"/>
      <rect x="8" y="11" width="4" height="2.5" rx="0.5"/>
    </svg>
  ),
  metrics: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="nav-icon">
      <rect x="1" y="8" width="3" height="7" rx="0.5"/>
      <rect x="6" y="4" width="3" height="11" rx="0.5"/>
      <rect x="11" y="1" width="3" height="14" rx="0.5"/>
    </svg>
  ),
  model: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="nav-icon">
      <circle cx="4" cy="4" r="2"/><circle cx="12" cy="4" r="2"/>
      <circle cx="4" cy="12" r="2"/><circle cx="12" cy="12" r="2"/>
      <line x1="6" y1="4" x2="10" y2="4"/><line x1="6" y1="12" x2="10" y2="12"/>
      <line x1="4" y1="6" x2="4" y2="10"/><line x1="12" y1="6" x2="12" y2="10"/>
    </svg>
  ),
  security: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="nav-icon">
      <path d="M8 1.5L2.5 4v4c0 3.5 2.4 5.8 5.5 6.5 3.1-.7 5.5-3 5.5-6.5V4L8 1.5z"/>
      <polyline points="5.5,8 7.2,9.7 10.5,6.3"/>
    </svg>
  ),
}

export default function Sidebar({ activePage, onNavigate, user }) {
  const [modelStatus, setModelStatus] = useState('sin_ejecutar')
  const [backendOnline, setBackendOnline] = useState(true)

  useEffect(() => {
    const check = () =>
      getEstadoModelo()
        .then(d => {
          setBackendOnline(true)
          setModelStatus(d.estado)
        })
        .catch(() => {
          setBackendOnline(false)
          setModelStatus('desconectado')
        })
    check()
    const id = setInterval(check, 6000)
    return () => clearInterval(id)
  }, [])

  const statusColor = !backendOnline ? 'red'
    : modelStatus === 'ok' ? 'green'
    : modelStatus === 'ejecutando' ? 'amber'
    : modelStatus === 'error' ? 'red'
    : 'amber'

  const esAdmin = user?.rol === 'ADMIN'

  const navAnalisis = [
    { id: 'dashboard', label: 'Dashboard',        icon: ICONS.dashboard },
    { id: 'precios',   label: 'Precios',          icon: ICONS.chart },
    { id: 'comparar',  label: 'Comparar Activos', icon: ICONS.compare },
    { id: 'señales',   label: 'Señales XGBoost',  icon: ICONS.signal },
    { id: 'shap',      label: 'Explicabilidad',   icon: ICONS.shap },
    { id: 'metricas',  label: 'Métricas',         icon: ICONS.metrics },
  ]

  const navAdmin = [
    { id: 'modelo',    label: 'Control Pipeline',    icon: ICONS.model },
    { id: 'seguridad', label: 'Usuarios & Auditoría', icon: ICONS.security },
  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">FP</div>
        <div className="logo-text">Fin<span>Predict</span></div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Análisis & IA</div>
        {navAnalisis.map(item => (
          <button
            key={item.id}
            className={`nav-item${activePage === item.id ? ' active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            {item.icon}
            {item.label}
          </button>
        ))}

        {/* Sección exclusiva para Administrador */}
        {esAdmin && (
          <>
            <div className="nav-section-label">Administración (Admin)</div>
            {navAdmin.map(item => (
              <button
                key={item.id}
                className={`nav-item${activePage === item.id ? ' active' : ''}`}
                onClick={() => onNavigate(item.id)}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span className={`dot ${statusColor}`}></span>
          <span style={{ fontSize: 11, color: !backendOnline ? 'var(--red)' : 'var(--text-muted)' }}>
            {!backendOnline ? 'Backend: apagado' : `Modelo: ${modelStatus}`}
          </span>
        </div>
        {user && (
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
            👤 {user.username} · <strong style={{ color: 'var(--accent)' }}>{user.rol}</strong>
          </div>
        )}
        <div className="sidebar-version">UNdeC 2026 · XGBoost</div>
      </div>
    </aside>
  )
}
