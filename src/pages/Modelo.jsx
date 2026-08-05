// src/pages/Modelo.jsx
import { useState, useEffect } from 'react'
import {
  lanzarPipelineCompleto, lanzarEntrenamiento,
  actualizarIngesta, getEstadoModelo,
} from '../services/api'

function StatusBadge({ estado }) {
  const cfg = {
    ok:           { color: 'var(--green)',  bg: 'var(--green-muted)',  label: 'Completado' },
    ejecutando:   { color: 'var(--amber)',  bg: 'var(--amber-muted)',  label: 'Ejecutando…' },
    error:        { color: 'var(--red)',    bg: 'var(--red-muted)',    label: 'Error' },
    sin_ejecutar: { color: 'var(--text-muted)', bg: 'var(--bg-hover)', label: 'Sin ejecutar' },
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
    pending:   { color: 'var(--text-muted)',     bg: 'var(--bg-hover)' },
    running:   { color: 'var(--amber)',           bg: 'var(--amber-muted)' },
    done:      { color: 'var(--green)',           bg: 'var(--green-muted)' },
    error:     { color: 'var(--red)',             bg: 'var(--red-muted)' },
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

export default function Modelo({ ticker }) {
  const [estado, setEstado] = useState({ estado: 'sin_ejecutar', detalle: {} })
  const [loading, setLoading] = useState(false)
  const [log, setLog] = useState([])

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
      addLog(`✓ ${label} — respuesta: ${JSON.stringify(res).slice(0, 120)}`)
    } catch (e) {
      addLog(`✗ Error en ${label}: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const pipelineSteps = [
    {
      title: 'Ingesta yfinance',
      desc: 'Descarga datos OHLCV históricos desde Yahoo Finance → SQLite',
      statusKey: 'ingesta',
    },
    {
      title: 'Limpieza con R',
      desc: 'Ejecuta cleaner.R: elimina outliers, calcula 15 indicadores técnicos',
      statusKey: 'r_cleaning',
    },
    {
      title: 'Entrenamiento XGBoost',
      desc: 'Etiquetado, split temporal, XGBClassifier + backtesting sin lookahead',
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
          <span className="card-title">Estado del sistema</span>
          <StatusBadge estado={estado.estado} />
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {/* Pipeline completo */}
            <button
              className="btn btn-primary"
              disabled={loading || estado.estado === 'ejecutando'}
              onClick={() => ejecutar(
                () => lanzarPipelineCompleto({}),
                'Pipeline completo'
              )}
            >
              ▶ Pipeline completo
            </button>

            {/* Solo ingesta */}
            <button
              className="btn"
              disabled={loading || estado.estado === 'ejecutando'}
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
              disabled={loading || estado.estado === 'ejecutando'}
              onClick={() => ejecutar(
                () => lanzarEntrenamiento({}),
                'Entrenamiento XGBoost'
              )}
            >
              ⚡ Solo entrenar
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
