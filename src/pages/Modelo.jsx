// src/pages/Modelo.jsx
import { useState, useEffect } from 'react'
import {
  lanzarEntrenamiento,
  actualizarIngesta,
  getEstadoModelo,
} from '../services/api'

const PRESETS_HIPERPARAMETROS = {
  equilibrado: {
    nombre: 'Equilibrado (Recomendado)',
    n_estimators: 600,
    max_depth: 6,
    learning_rate: 0.03,
    subsample: 0.85,
    colsample_bytree: 0.85,
    min_child_weight: 15,
    gamma: 1.5,
    umbral_pct: 0.5,
    capital_inicial: 10000,
    comision_pct: 0.1,
  },
  conservador: {
    nombre: 'Conservador (Anti-Overfitting)',
    n_estimators: 400,
    max_depth: 4,
    learning_rate: 0.02,
    subsample: 0.75,
    colsample_bytree: 0.75,
    min_child_weight: 25,
    gamma: 2.0,
    umbral_pct: 0.6,
    capital_inicial: 10000,
    comision_pct: 0.1,
  },
  profundo: {
    nombre: 'Alta Capacidad (Más Árboles)',
    n_estimators: 900,
    max_depth: 8,
    learning_rate: 0.025,
    subsample: 0.90,
    colsample_bytree: 0.90,
    min_child_weight: 10,
    gamma: 1.0,
    umbral_pct: 0.5,
    capital_inicial: 10000,
    comision_pct: 0.1,
  },
}

function StatusBadge({ estado, version }) {
  const cfg = {
    ok:         { color: 'var(--green)', bg: 'var(--green-muted)', label: `🟢 Activo · ${version || 'xgb_global_v1'}` },
    listo:      { color: 'var(--green)', bg: 'var(--green-muted)', label: `🟢 Activo · ${version || 'xgb_global_v1'}` },
    ejecutando: { color: 'var(--amber)', bg: 'var(--amber-muted)', label: '⏳ Re-entrenando XGBoost…' },
    error:      { color: 'var(--red)',   bg: 'var(--red-muted)',   label: '⚠ Error en entrenamiento' },
  }[estado] || { color: 'var(--green)', bg: 'var(--green-muted)', label: `🟢 Activo · ${version || 'xgb_global_v1'}` }

  return (
    <span style={{
      background: cfg.bg,
      color: cfg.color,
      border: `1px solid ${cfg.color}40`,
      padding: '5px 12px',
      borderRadius: 6,
      fontSize: 11.5,
      fontFamily: 'var(--font-mono)',
      fontWeight: 700,
    }}>
      {cfg.label}
    </span>
  )
}

export default function Modelo({ user }) {
  const [infoModelo, setInfoModelo] = useState({
    estado: 'ok',
    version_activa: 'xgb_global_v1',
    archivo: 'GLOBAL_MULTI_ACTIVO_multi_horizon.joblib',
    ultima_actualizacion: '—',
    total_features: 23,
    horizontes: ['xgb_global_1d', 'xgb_global_5d', 'xgb_global_15d', 'xgb_global_30d'],
    hyperparams: {},
    detalle: {},
  })

  const [params, setParams] = useState(PRESETS_HIPERPARAMETROS.equilibrado)
  const [initializedFromDisk, setInitializedFromDisk] = useState(false)
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [log, setLog] = useState([])

  const esViewer = user?.rol === 'VIEWER'

  // Polling del estado del modelo en disco y entrenamientos en curso
  useEffect(() => {
    const check = () =>
      getEstadoModelo()
        .then(d => {
          setInfoModelo(d)
          if (!initializedFromDisk && d?.hyperparams && Object.keys(d.hyperparams).length > 0) {
            const hp = d.hyperparams
            setParams(prev => ({
              ...prev,
              n_estimators: hp.n_estimators ?? prev.n_estimators,
              max_depth: hp.max_depth ?? prev.max_depth,
              learning_rate: hp.learning_rate ?? prev.learning_rate,
              subsample: hp.subsample ?? prev.subsample,
              colsample_bytree: hp.colsample_bytree ?? prev.colsample_bytree,
              min_child_weight: hp.min_child_weight ?? prev.min_child_weight,
              gamma: hp.gamma ?? prev.gamma,
              umbral_pct: hp.umbral_1d != null ? +(hp.umbral_1d * 100).toFixed(2) : prev.umbral_pct,
              capital_inicial: hp.capital_inicial ?? prev.capital_inicial,
              comision_pct: hp.comision != null ? +(hp.comision * 100).toFixed(2) : prev.comision_pct,
            }))
            setInitializedFromDisk(true)
          }
        })
        .catch(() => {})
    check()
    const id = setInterval(check, 3500)
    return () => clearInterval(id)
  }, [initializedFromDisk])

  const addLog = (msg) => setLog(prev => [...prev, {
    ts: new Date().toLocaleTimeString(),
    msg,
  }])

  const handleParamChange = (key, value) => {
    setParams(prev => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleAplicarPreset = (presetKey) => {
    const p = PRESETS_HIPERPARAMETROS[presetKey]
    if (p) {
      setParams(p)
      addLog(`Perfil de hiperparámetros cargado: ${p.nombre}`)
    }
  }

  const handleReentrenar = async (e) => {
    if (e) e.preventDefault()
    setLoading(true)
    setFeedback(null)

    const payload = {
      n_estimators: Number(params.n_estimators),
      max_depth: Number(params.max_depth),
      learning_rate: Number(params.learning_rate),
      subsample: Number(params.subsample),
      colsample_bytree: Number(params.colsample_bytree),
      min_child_weight: Number(params.min_child_weight),
      gamma: Number(params.gamma),
      umbral: Number(params.umbral_pct) / 100.0,
      capital_inicial: Number(params.capital_inicial),
      comision: Number(params.comision_pct) / 100.0,
    }

    addLog(
      `Iniciando re-entrenamiento XGBoost: trees=${payload.n_estimators}, depth=${payload.max_depth}, ` +
      `lr=${payload.learning_rate}, subsample=${payload.subsample}, umbral=${params.umbral_pct}%…`
    )

    try {
      const res = await lanzarEntrenamiento(payload)
      setFeedback({
        type: 'ok',
        text: res.mensaje || 'Re-entrenamiento iniciado en segundo plano con los nuevos hiperparámetros.',
      })
      addLog(`✓ ${res.mensaje}`)
    } catch (err) {
      setFeedback({ type: 'error', text: err.message })
      addLog(`✗ Error al iniciar re-entrenamiento: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleActualizarIngesta = async () => {
    setLoading(true)
    setFeedback(null)
    addLog('Actualizando precios OHLCV (Yahoo Finance) y series macroeconómicas (FRED)…')
    try {
      const res = await actualizarIngesta({})
      setFeedback({
        type: 'ok',
        text: res.mensaje || 'Ingesta de precios actualizada correctamente.',
      })
      addLog(`✓ Ingesta completada: ${res.mensaje || 'OK'}`)
    } catch (err) {
      setFeedback({ type: 'error', text: err.message })
      addLog(`✗ Error en ingesta: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    background: 'var(--bg-base)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '8px 12px',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    width: '100%',
  }

  const hpActual = infoModelo.hyperparams || {}

  return (
    <div className="col fade-in">
      {/* 1. FICHA DE LA VERSIÓN ACTIVA DE XGBOOST EN PRODUCCIÓN */}
      <div className="card" style={{ borderLeft: '4px solid var(--green)' }}>
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div>
            <span className="card-title">Motor Predictivo en Producción · XGBoost Multi-Horizonte</span>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              Información en vivo del modelo serializado que está respondiendo las predicciones y el cálculo TreeSHAP
            </div>
          </div>
          <StatusBadge estado={infoModelo.estado} version={infoModelo.version_activa} />
        </div>

        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-label">Versión Activa Principal</div>
              <div className="metric-value neutral" style={{ fontSize: 18 }}>
                {infoModelo.version_activa || 'xgb_global_v1'}
              </div>
              <div className="metric-sub">Archivo: {infoModelo.archivo || 'GLOBAL_MULTI_ACTIVO.joblib'}</div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Último Entrenamiento</div>
              <div className="metric-value" style={{ fontSize: 16 }}>
                {infoModelo.ultima_actualizacion || 'En disco'}
              </div>
              <div className="metric-sub">{infoModelo.total_features || 23} variables (Técnicas + FRED)</div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Árboles / Profundidad</div>
              <div className="metric-value" style={{ fontSize: 18 }}>
                {hpActual.n_estimators ?? 600} árb · Nivel {hpActual.max_depth ?? 6}
              </div>
              <div className="metric-sub">Learning Rate η = {hpActual.learning_rate ?? 0.03}</div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Submuestreo Regularizado</div>
              <div className="metric-value" style={{ fontSize: 18 }}>
                {Math.round((hpActual.subsample ?? 0.85) * 100)}% / {Math.round((hpActual.colsample_bytree ?? 0.85) * 100)}%
              </div>
              <div className="metric-sub">Subsample · Colsample_bytree</div>
            </div>
          </div>

          {/* Horizontes activos del modelo */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(195px, 1fr))', gap: 10 }}>
            {[
              { h: 'Horizonte 1 Día (Mañana)', ver: 'xgb_global_1d',  umb: `±${hpActual.umbral_1d ? (hpActual.umbral_1d * 100).toFixed(2) : '0.50'}%` },
              { h: 'Horizonte 5 Días (1 Sem)', ver: 'xgb_global_5d',  umb: '±1.50%' },
              { h: 'Horizonte 15 Días (3 Sem)', ver: 'xgb_global_15d', umb: '±3.00%' },
              { h: 'Horizonte 30 Días (1 Mes)', ver: 'xgb_global_30d', umb: '±5.00%' },
            ].map(item => (
              <div
                key={item.ver}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 700 }}>{item.h}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {item.ver}
                  </div>
                </div>
                <span className="tag tag-blue">{item.umb}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. CONFIGURACIÓN DE HIPERPARÁMETROS Y RE-ENTRENAMIENTO (EXCLUSIVO ADMIN) */}
      <div className="card" style={{ borderLeft: '4px solid var(--accent)' }}>
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div>
            <span className="card-title">⚙️ Configuración de Hiperparámetros y Re-entrenamiento de XGBoost</span>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              Ajustá los hiperparámetros del clasificador XGBClassifier y los parámetros del Backtesting antes de lanzar un nuevo entrenamiento
            </div>
          </div>

          {/* Botones de Perfiles Rápidos */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn"
              style={{ fontSize: 11 }}
              onClick={() => handleAplicarPreset('conservador')}
            >
              🛡 Conservador
            </button>
            <button
              type="button"
              className="btn"
              style={{ fontSize: 11 }}
              onClick={() => handleAplicarPreset('equilibrado')}
            >
              ⚖️ Equilibrado (Default)
            </button>
            <button
              type="button"
              className="btn"
              style={{ fontSize: 11 }}
              onClick={() => handleAplicarPreset('profundo')}
            >
              🚀 Alta Capacidad
            </button>
          </div>
        </div>

        <div className="card-body">
          {feedback && (
            <div style={{
              marginBottom: 16,
              padding: '10px 14px',
              borderRadius: 6,
              fontSize: 12,
              background: feedback.type === 'ok' ? 'var(--green-muted)' : 'var(--red-muted)',
              color: feedback.type === 'ok' ? 'var(--green)' : 'var(--red)',
              border: `1px solid ${feedback.type === 'ok' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
            }}>
              {feedback.type === 'ok' ? '✓ ' : '⚠ '}
              {feedback.text}
            </div>
          )}

          {infoModelo.estado === 'ejecutando' && (
            <div style={{
              marginBottom: 16,
              padding: '12px 16px',
              background: 'var(--amber-muted)',
              border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: 6,
              fontSize: 12.5,
              color: 'var(--amber)',
              fontWeight: 600,
            }}>
              ⏳ Re-entrenando los 4 horizontes de XGBoost con los nuevos parámetros… Esta página se actualizará automáticamente al finalizar.
            </div>
          )}

          <form onSubmit={handleReentrenar} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Grilla de hiperparámetros del modelo */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>
                  Cantidad de Árboles (n_estimators)
                </label>
                <input
                  type="number"
                  min={100}
                  max={2000}
                  step={50}
                  style={inputStyle}
                  value={params.n_estimators}
                  onChange={e => handleParamChange('n_estimators', e.target.value)}
                />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Rango sugerido: 300 a 1000</span>
              </div>

              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>
                  Profundidad Máxima (max_depth)
                </label>
                <input
                  type="number"
                  min={2}
                  max={15}
                  step={1}
                  style={inputStyle}
                  value={params.max_depth}
                  onChange={e => handleParamChange('max_depth', e.target.value)}
                />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Controla la complejidad (ej. 4 a 8)</span>
              </div>

              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>
                  Tasa de Aprendizaje (learning_rate η)
                </label>
                <input
                  type="number"
                  min={0.005}
                  max={0.3}
                  step={0.005}
                  style={inputStyle}
                  value={params.learning_rate}
                  onChange={e => handleParamChange('learning_rate', e.target.value)}
                />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Paso del gradiente (ej. 0.02 a 0.05)</span>
              </div>

              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>
                  Muestreo de Filas (subsample)
                </label>
                <input
                  type="number"
                  min={0.5}
                  max={1.0}
                  step={0.05}
                  style={inputStyle}
                  value={params.subsample}
                  onChange={e => handleParamChange('subsample', e.target.value)}
                />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Fracción de datos por árbol (0.5 a 1.0)</span>
              </div>

              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>
                  Muestreo de Variables (colsample_bytree)
                </label>
                <input
                  type="number"
                  min={0.5}
                  max={1.0}
                  step={0.05}
                  style={inputStyle}
                  value={params.colsample_bytree}
                  onChange={e => handleParamChange('colsample_bytree', e.target.value)}
                />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Fracción de features por árbol (0.5 a 1.0)</span>
              </div>

              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>
                  Peso Mínimo por Hoja (min_child_weight)
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  step={1}
                  style={inputStyle}
                  value={params.min_child_weight}
                  onChange={e => handleParamChange('min_child_weight', e.target.value)}
                />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Evita hojas sobreajustadas (ej. 10 a 25)</span>
              </div>

              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>
                  Umbral Señal 1 Día (% retorno mín.)
                </label>
                <input
                  type="number"
                  min={0.1}
                  max={5.0}
                  step={0.05}
                  style={inputStyle}
                  value={params.umbral_pct}
                  onChange={e => handleParamChange('umbral_pct', e.target.value)}
                />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Ej. 0.5% para emitir COMPRA o VENTA</span>
              </div>

              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>
                  Capital Inicial Backtest (USD)
                </label>
                <input
                  type="number"
                  min={1000}
                  max={1000000}
                  step={1000}
                  style={inputStyle}
                  value={params.capital_inicial}
                  onChange={e => handleParamChange('capital_inicial', e.target.value)}
                />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Base para simulación de cartera</span>
              </div>

              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>
                  Comisión Broker (% por operación)
                </label>
                <input
                  type="number"
                  min={0.0}
                  max={2.0}
                  step={0.05}
                  style={inputStyle}
                  value={params.comision_pct}
                  onChange={e => handleParamChange('comision_pct', e.target.value)}
                />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Ej. 0.1% por compra/venta</span>
              </div>
            </div>

            {/* Botones de Acción del Administrador */}
            <div style={{
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
              borderTop: '1px solid var(--border)',
              paddingTop: 14,
            }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || infoModelo.estado === 'ejecutando' || esViewer}
                style={{ padding: '10px 20px', fontSize: 13, fontWeight: 700 }}
              >
                {infoModelo.estado === 'ejecutando'
                  ? '⏳ Entrenando XGBoost…'
                  : '⚡ Re-entrenar Modelo XGBoost con estos Parámetros'}
              </button>

              <button
                type="button"
                className="btn"
                disabled={loading || infoModelo.estado === 'ejecutando' || esViewer}
                onClick={handleActualizarIngesta}
                style={{ padding: '10px 16px', fontSize: 12.5 }}
              >
                ↓ Actualizar Ingesta Diaria (Yahoo Finance + FRED)
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Log de actividad en vivo */}
      {log.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Registro de Ejecución de esta Sesión</span>
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
