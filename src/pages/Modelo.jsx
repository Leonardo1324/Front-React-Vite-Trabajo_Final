// src/pages/Modelo.jsx
import { useState, useEffect } from 'react'
import {
  lanzarPipelineCompleto, lanzarEntrenamiento,
  actualizarIngesta, getEstadoModelo,
} from '../services/api'

function StatusBadge({ estado }) {
  const cfg = {
    ok:           { color: 'var(--green)',      bg: 'var(--green-muted)', label: 'Completado' },
    ejecutando:   { color: 'var(--amber)',      bg: 'var(--amber-muted)', label: 'Ejecutando…' },
    error:        { color: 'var(--red)',        bg: 'var(--red-muted)',   label: 'Error' },
    sin_ejecutar: { color: 'var(--text-muted)', bg: 'var(--bg-hover)',    label: 'Sin ejecutar' },
  }[estado] || { color: 'var(--text-muted)', bg: 'var(--bg-hover)', label: estado }

  return (
    <span style={{
      background: cfg.bg,
      color: cfg.color,
      border: `1px solid ${cfg.color}40`,
      padding: '4px 10px',
      borderRadius: 4,
      fontSize: 11,
      fontFamily: 'var(--font-mono)',
      fontWeight: 500,
    }}>
      {cfg.label}
    </span>
  )
}

function PipelineStep({ number, title, desc, status }) {
  const colors = {
    pending:   { color: 'var(--text-muted)', bg: 'var(--bg-hover)' },
    running:   { color: 'var(--amber)',      bg: 'var(--amber-muted)' },
    done:      { color: 'var(--green)',      bg: 'var(--green-muted)' },
    error:     { color: 'var(--red)',        bg: 'var(--red-muted)' },
  }
  const s = colors[status] || colors.pending

  return (
    <div style={{
      display: 'flex',
      gap: 16,
      padding: '16px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{
        width: 32, height: 32,
        borderRadius: '50%',
        background: s.bg,
        color: s.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: 13,
        flexShrink: 0,
      }}>
        {status === 'done' ? '✓' : number}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 14,
          color: status === 'pending' ? 'var(--text-secondary)' : 'var(--text-primary)',
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          marginBottom: 4,
        }}>
          {title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{desc}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {status === 'running' && (
          <div style={{
            width: 16, height: 16,
            border: '2px solid var(--amber)',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
        )}
      </div>
    </div>
  )
}

function JsonViewer({ data }) {
  if (!data || typeof data !== 'object') return null
  return (
    <pre style={{
      background: 'var(--bg-base)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      padding: '12px 16px',
      fontSize: 11,
      fontFamily: 'var(--font-mono)',
      color: 'var(--text-secondary)',
      overflowX: 'auto',
      maxHeight: 300,
      overflowY: 'auto',
    }}>
      {JSON.stringify(data, null, 2)}
    </pre>
  )
}

export default function Modelo({ user }) {
  const [estado, setEstado] = useState({ estado: 'sin_ejecutar', detalle: {} })
  const [loading, setLoading] = useState(false)
  const [log, setLog] = useState([])

  const esViewer = user?.rol === 'VIEWER'

  // Polling del estado del modelo
  useEffect(() => {
    const check = () => getEstadoModelo().then(setEstado).catch(() => {})
    check()
    const id = setInterval(check, 3000)
    return () => clearInterval(id)
  }, [])

  const addLog = (msg) => setLog(prev => [...prev, {
    ts: new Date().toLocaleTimeString(),
    msg,
  }])

  const ejecutar = async (fn, label) => {
    setLoading(true)
    addLog(`Iniciando: ${label}…`)
    try {
      const res = await fn()
      addLog(`✓ ${label} — respuesta: ${JSON.stringify(res).slice(0, 140)}`)
    } catch (e) {
      addLog(`✗ Error en ${label}: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const pipelineSteps = [
    {
      title: 'Ingesta yfinance + Series Macro FRED',
      desc: 'Descarga datos OHLCV históricos desde Yahoo Finance y 5 series de la Reserva Federal (T10Y2Y, FEDFUNDS, VIXCLS, DCOILWTICO, BAA10Y)',
      statusKey: 'ingesta',
    },
    {
      title: 'Limpieza Estadística e Indicadores con R',
      desc: 'Ejecuta cleaner.R: elimina outliers, construye rezagos temporales, ratios de volatilidad y 14 indicadores técnicos (29 features en total)',
      statusKey: 'r_cleaning',
    },
    {
      title: 'Entrenamiento Dual Multi-Horizonte (XGBoost + Random Forest)',
      desc: 'Entrena y serializa 8 modelos (1d ±0.5%, 5d ±1.5%, 15d ±3.0%, 30d ±5.0%) con XGBClassifier y RandomForestClassifier + backtesting sin lookahead',
      statusKey: 'xgboost',
    },
  ]

  const getStepStatus = (key) => {
    if (estado.estado === 'sin_ejecutar') return 'pending'
    if (estado.estado === 'error') return 'error'
    if (estado.estado === 'ejecutando') return 'running'
    if (estado.estado === 'ok' && estado.detalle?.[key]) return 'done'
    return 'pending'
  }

  return (
    <div className="col fade-in">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Estado global */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Estado del sistema · Motor Dual Multi-Horizonte</span>
          <StatusBadge estado={estado.estado} />
        </div>
        <div className="card-body">
          {esViewer && (
            <div style={{
              marginBottom: 14,
              padding: '8px 12px',
              background: 'var(--amber-muted)',
              border: '1px solid rgba(245,158,11,0.25)',
              borderRadius: 6,
              fontSize: 12,
              color: 'var(--amber)',
            }}>
              🔒 Tu rol actual es <strong>VIEWER</strong> (solo lectura). Iniciá sesión como <strong>ADMIN</strong> o <strong>TRADER</strong> para disparar entrenamientos o ingesta.
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {/* Pipeline completo */}
            <button
              className="btn btn-primary"
              disabled={loading || estado.estado === 'ejecutando' || esViewer}
              onClick={() => ejecutar(
                () => lanzarPipelineCompleto({}),
                'Pipeline completo (Ingesta + R + XGBoost/RF Multi-Horizonte)'
              )}
            >
              ▶ Pipeline completo
            </button>

            {/* Solo ingesta */}
            <button
              className="btn"
              disabled={loading || estado.estado === 'ejecutando' || esViewer}
              onClick={() => ejecutar(
                () => actualizarIngesta({}),
                'Ingesta de datos'
              )}
            >
              ↓ Solo ingesta
            </button>

            {/* Solo entrenar */}
            <button
              className="btn"
              disabled={loading || estado.estado === 'ejecutando' || esViewer}
              onClick={() => ejecutar(
                () => lanzarEntrenamiento({}),
                'Entrenamiento Dual (XGBoost + Random Forest)'
              )}
            >
              ⚡ Solo entrenar (8 modelos)
            </button>
          </div>

          {estado.estado === 'ejecutando' && (
            <div style={{
              marginTop: 16,
              padding: '10px 14px',
              background: 'var(--amber-muted)',
              border: '1px solid rgba(245,158,11,0.2)',
              borderRadius: 6,
              fontSize: 12,
              color: 'var(--amber)',
            }}>
              Pipeline en ejecución — actualizando cada 3 segundos…
            </div>
          )}
        </div>
      </div>

      {/* Arquitectura de los 8 modelos */}
      <div className="metrics-grid">
        {[
          { label: 'Horizonte 1 Día',   value: '±0.5%', sub: 'xgb_global_1d · rf_global_1d' },
          { label: 'Horizonte 5 Días',  value: '±1.5%', sub: 'xgb_global_5d · rf_global_5d' },
          { label: 'Horizonte 15 Días', value: '±3.0%', sub: 'xgb_global_15d · rf_global_15d' },
          { label: 'Horizonte 30 Días', value: '±5.0%', sub: 'xgb_global_30d · rf_global_30d' },
        ].map(h => (
          <div key={h.label} className="metric-card">
            <div className="metric-label">{h.label}</div>
            <div className="metric-value neutral" style={{ fontSize: 18 }}>Umbral {h.value}</div>
            <div className="metric-sub">{h.sub}</div>
          </div>
        ))}
      </div>

      {/* Pasos del pipeline */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Etapas del Pipeline</span>
        </div>
        <div className="card-body">
          {pipelineSteps.map((step, i) => (
            <PipelineStep
              key={step.statusKey}
              number={i + 1}
              title={step.title}
              desc={step.desc}
              status={getStepStatus(step.statusKey)}
            />
          ))}
        </div>
      </div>

      {/* Resultado del estado */}
      {estado.estado === 'ok' && estado.detalle && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Resultado del último pipeline</span>
          </div>
          <div className="card-body">
            <JsonViewer data={estado.detalle} />
          </div>
        </div>
      )}

      {/* Log de actividad */}
      {log.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Log de actividad</span>
            <button className="btn" style={{ fontSize: 10 }} onClick={() => setLog([])}>
              Limpiar
            </button>
          </div>
          <div className="card-body">
            <div style={{
              background: 'var(--bg-base)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: '12px 16px',
              maxHeight: 200,
              overflowY: 'auto',
            }}>
              {log.map((l, i) => (
                <div key={i} style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>
                  <span style={{ color: 'var(--text-muted)', marginRight: 8 }}>{l.ts}</span>
                  {l.msg}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
