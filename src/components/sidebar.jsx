// src/components/Sidebar.jsx
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
  signal: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="nav-icon">
      <circle cx="8" cy="8" r="2"/>
      <path d="M4.5 4.5a5 5 0 0 0 0 7M11.5 4.5a5 5 0 0 1 0 7"/>
      <path d="M2 2a9 9 0 0 0 0 12M14 2a9 9 0 0 1 0 12"/>
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
}

export default function Sidebar({ activePage, onNavigate }) {
  const [modelStatus, setModelStatus] = useState('sin_ejecutar')

  useEffect(() => {
    const check = () =>
      getEstadoModelo()
        .then(d => setModelStatus(d.estado))
        .catch(() => {})
    check()
    const id = setInterval(check, 8000)
    return () => clearInterval(id)
  }, [])

  const statusColor = modelStatus === 'ok' ? 'green'
    : modelStatus === 'ejecutando' ? 'amber'
    : modelStatus === 'error' ? 'red'
    : 'amber'

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: ICONS.dashboard },
    { id: 'precios',   label: 'Precios',   icon: ICONS.chart },
    { id: 'señales',   label: 'Señales',   icon: ICONS.signal },
    { id: 'metricas',  label: 'Métricas',  icon: ICONS.metrics },
    { id: 'modelo',    label: 'Modelo',    icon: ICONS.model },
  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">FP</div>
        <div className="logo-text">Fin<span>Predict</span></div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Análisis</div>
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-item${activePage === item.id ? ' active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span className={`dot ${statusColor}`}></span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Modelo: {modelStatus}
          </span>
        </div>
        <div className="sidebar-version">UNdeC 2026 · v1.0</div>
      </div>
    </aside>
  )
}