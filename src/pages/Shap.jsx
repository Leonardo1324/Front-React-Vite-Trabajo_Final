// src/pages/Shap.jsx
import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, ReferenceLine,
} from 'recharts'
import { useApi } from '../hooks/useApi'
import { getShapCompleto, getShapImagenUrl } from '../services/api'
import { fmt } from '../utils/format'

const MACRO_FEATURES = new Set(['T10Y2Y', 'FEDFUNDS', 'VIXCLS', 'DCOILWTICO', 'BAA10Y'])

function esMacro(featureName = '') {
  const upper = String(featureName).toUpperCase()
  for (const m of MACRO_FEATURES) {
    if (upper.includes(m)) return true
  }
  return false
}

export default function Shap({ ticker }) {
  const { data, loading, error } = useApi(() => getShapCompleto(ticker), [ticker])
  const [modoVista, setModoVista] = useState('interactivo') // 'interactivo' | 'imagenes'

  // Normalización flexible de la respuesta de /shap/{ticker}
  const narrativa =
    data?.explicacion_local?.explicacion_narrativa ||
    data?.narrativa ||
    data?.local?.narrativa ||
    data?.explicacion_local?.narrativa ||
    data?.explicacion ||
    null

  const decisionLocal =
    data?.explicacion_local?.decision ||
    data?.local?.decision ||
    data?.local?.senal_texto ||
    data?.decision ||
    data?.senal_texto ||
    'HOLD'

  const fechaLocal =
    data?.explicacion_local?.fecha ||
    data?.local?.fecha ||
    data?.fecha ||
    null

  const rawLocalList = useMemo(() => {
    const list =
      data?.explicacion_local?.contribuciones ||
      data?.local?.contribuciones ||
      data?.local?.features ||
      data?.local?.valores ||
      data?.waterfall ||
      data?.contribuciones_locales ||
      (Array.isArray(data?.local) ? data.local : [])
    return Array.isArray(list) ? list : []
  }, [data])

  const localChartData = useMemo(() => {
    return rawLocalList
      .map(item => {
        const name = item.nombre_legible || item.feature || item.variable || item.nombre || 'Feature'
        const val = Number(item.shap_valor ?? item.shap_value ?? item.impacto ?? item.valor_shap ?? item.contribucion ?? 0)
        const fVal = item.valor_actual ?? item.feature_value ?? item.valor_feature ?? item.valor
        return {
          feature: name,
          shap: +val.toFixed(4),
          absShap: Math.abs(val),
          featureValue: fVal,
          macro: esMacro(item.feature || name),
        }
      })
      .sort((a, b) => b.absShap - a.absShap)
      .slice(0, 14)
  }, [rawLocalList])

  const rawGlobalList = useMemo(() => {
    const list =
      data?.importancia_global?.top_features ||
      data?.global?.ranking ||
      data?.global?.features ||
      data?.global?.importancia ||
      data?.importancia_global ||
      data?.ranking_global ||
      (Array.isArray(data?.global) ? data.global : [])
    return Array.isArray(list) ? list : []
  }, [data])

  const globalChartData = useMemo(() => {
    return rawGlobalList
      .map(item => {
        const name = item.nombre_legible || item.feature || item.variable || item.nombre || 'Feature'
        const val = Number(item.importancia_global ?? item.mean_abs_shap ?? item.importancia ?? item.shap_mean ?? item.valor ?? 0)
        return {
          feature: name,
          importancia: +val.toFixed(4),
          macro: esMacro(item.feature || name),
        }
      })
      .sort((a, b) => b.importancia - a.importancia)
      .slice(0, 15)
  }, [rawGlobalList])

  const imgGlobalSrc = useMemo(() => {
    const b64 =
      data?.importancia_global?.grafico_base64 ||
      data?.imagen_global_base64 ||
      data?.global?.imagen_base64 ||
      data?.imagenes?.global
    if (b64) return b64.startsWith('data:image') ? b64 : `data:image/png;base64,${b64}`
    return getShapImagenUrl(ticker, 'global')
  }, [data, ticker])

  const imgLocalSrc = useMemo(() => {
    const b64 =
      data?.explicacion_local?.grafico_base64 ||
      data?.imagen_local_base64 ||
      data?.local?.imagen_base64 ||
      data?.imagenes?.local
    if (b64) return b64.startsWith('data:image') ? b64 : `data:image/png;base64,${b64}`
    return getShapImagenUrl(ticker, 'local')
  }, [data, ticker])

  if (loading) {
    return (
      <div className="col fade-in">
        <div className="skeleton" style={{ height: 120, borderRadius: 12 }} />
        <div className="skeleton" style={{ height: 320, borderRadius: 12 }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-icon">⚠</div>
          <div>Error al calcular valores TreeSHAP para {ticker}: {error}</div>
          <div style={{ fontSize: 11 }}>Asegurate de haber entrenado el modelo desde la sección Modelo</div>
        </div>
      </div>
    )
  }

  return (
    <div className="col fade-in">
      {/* Encabezado y selector de vista */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800 }}>
              Interpretabilidad TreeSHAP · {ticker}
            </span>
            <span className="tag tag-blue">Módulo M3 · 29 Features</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Descomposición exacta de Lundberg & Lee sobre 14 indicadores técnicos, rezagos, volatilidad y 5 series macro FRED
          </div>
        </div>

        <div className="theme-switcher" role="group" aria-label="Modo de visualización SHAP">
          <button
            type="button"
            className={`theme-option${modoVista === 'interactivo' ? ' active' : ''}`}
            onClick={() => setModoVista('interactivo')}
          >
            Gráficos Interactivos
          </button>
          <button
            type="button"
            className={`theme-option${modoVista === 'imagenes' ? ' active' : ''}`}
            onClick={() => setModoVista('imagenes')}
          >
            Plots Matplotlib (PNG)
          </button>
        </div>
      </div>

      {/* Tarjeta de Narrativa Explicativa Local en Español */}
      <div className="card" style={{ borderLeft: '4px solid var(--accent)' }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="card-title">Narrativa Explicativa de la Última Vela</span>
            {decisionLocal && (
              <span className={`signal-badge ${decisionLocal.includes('COMPRA') ? 'COMPRA' : decisionLocal.includes('VENTA') ? 'VENTA' : 'HOLD'}`}>
                {decisionLocal}
              </span>
            )}
          </div>
          {fechaLocal && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Vela: {fmt.date(fechaLocal)}
            </span>
          )}
        </div>
        <div className="card-body">
          <p style={{ fontSize: 13.5, color: 'var(--text-primary)', lineHeight: 1.6 }}>
            {narrativa || 'El motor TreeSHAP descompone el impacto marginal de cada indicador técnico y macroeconómico sobre la probabilidad final emitida por el modelo para la sesión actual.'}
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
            <span className="tag tag-green">+SHAP impulsa la clase predicha</span>
            <span className="tag tag-red">−SHAP se opone a la clase predicha</span>
            <span className="tag tag-amber">Series Macro FRED: T10Y2Y · FEDFUNDS · VIXCLS · DCOILWTICO · BAA10Y</span>
          </div>
        </div>
      </div>

      {modoVista === 'interactivo' ? (
        <div className="row" style={{ alignItems: 'stretch' }}>
          {/* Explicabilidad Local (Waterfall / Contribuciones de Hoy) */}
          <div className="card" style={{ flex: 1 }}>
            <div className="card-header">
              <div>
                <span className="card-title">Explicabilidad Local · Desglose de Hoy</span>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  Empuje en log-odds de las variables más determinantes en la última rueda
                </div>
              </div>
            </div>
            <div className="card-body">
              {localChartData.length === 0 ? (
                <div className="empty-state">Sin desglose local disponible</div>
              ) : (
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart
                    data={localChartData}
                    layout="vertical"
                    margin={{ top: 4, right: 20, bottom: 4, left: 95 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'DM Mono' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="feature"
                      tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontFamily: 'DM Mono' }}
                      tickLine={false}
                      axisLine={false}
                      width={90}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--bg-panel)',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        fontSize: 12,
                        fontFamily: 'DM Mono',
                      }}
                      formatter={(val, _name, props) => {
                        const fv = props?.payload?.featureValue
                        const extra = fv != null ? ` (Valor: ${Number(fv).toFixed(2)})` : ''
                        return [`${val > 0 ? '+' : ''}${val}${extra}`, 'Impacto SHAP']
                      }}
                    />
                    <ReferenceLine x={0} stroke="rgba(255,255,255,0.2)" />
                    <Bar dataKey="shap" radius={[3, 3, 3, 3]} maxBarSize={20}>
                      {localChartData.map((entry, idx) => (
                        <Cell
                          key={idx}
                          fill={entry.shap >= 0 ? 'var(--green)' : 'var(--red)'}
                          fillOpacity={0.85}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Explicabilidad Global (Top 15 de las 29 Variables) */}
          <div className="card" style={{ flex: 1 }}>
            <div className="card-header">
              <div>
                <span className="card-title">Importancia Global · mean(|SHAP|)</span>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  Impacto medio absoluto histórico sobre las decisiones del modelo
                </div>
              </div>
            </div>
            <div className="card-body">
              {globalChartData.length === 0 ? (
                <div className="empty-state">Sin ranking global disponible</div>
              ) : (
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart
                    data={globalChartData}
                    layout="vertical"
                    margin={{ top: 4, right: 20, bottom: 4, left: 95 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'DM Mono' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="feature"
                      tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontFamily: 'DM Mono' }}
                      tickLine={false}
                      axisLine={false}
                      width={90}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--bg-panel)',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        fontSize: 12,
                        fontFamily: 'DM Mono',
                      }}
                      formatter={(val, _name, props) => [
                        val,
                        props?.payload?.macro ? 'mean(|SHAP|) · Macro FRED' : 'mean(|SHAP|) · Técnico',
                      ]}
                    />
                    <Bar dataKey="importancia" radius={[0, 4, 4, 0]} maxBarSize={20}>
                      {globalChartData.map((entry, idx) => (
                        <Cell
                          key={idx}
                          fill={entry.macro ? 'var(--amber)' : 'var(--accent)'}
                          fillOpacity={0.85}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Vista de gráficos nativos generados por Matplotlib en modo oscuro */
        <div className="row" style={{ alignItems: 'stretch' }}>
          <div className="card" style={{ flex: 1 }}>
            <div className="card-header">
              <span className="card-title">Waterfall Plot Local (Matplotlib)</span>
              <span className="tag tag-blue">PNG / Base64</span>
            </div>
            <div className="card-body" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <img
                src={imgLocalSrc}
                alt={`SHAP Local Waterfall ${ticker}`}
                style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid var(--border)' }}
              />
            </div>
          </div>

          <div className="card" style={{ flex: 1 }}>
            <div className="card-header">
              <span className="card-title">Summary Plot Global (Matplotlib)</span>
              <span className="tag tag-blue">PNG / Base64</span>
            </div>
            <div className="card-body" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <img
                src={imgGlobalSrc}
                alt={`SHAP Global Summary ${ticker}`}
                style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid var(--border)' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

