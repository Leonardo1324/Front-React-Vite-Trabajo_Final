// src/pages/Señales.jsx
import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, ReferenceLine,
} from 'recharts'
import { useApi } from '../hooks/useApi'
import {
  getSeñales,
  getDecisionManana,
  getHorizontes,
  descargarReportePdf,
  descargarReporteCsv,
} from '../services/api'
import { fmt } from '../utils/format'

function normalizarBadge(texto = '') {
  const t = String(texto).toUpperCase()
  if (t.includes('COMPRA')) return 'COMPRA'
  if (t.includes('VENTA') || t.includes('VENDE')) return 'VENTA'
  return 'HOLD'
}

// ── 1. Tarjeta Semáforo Ejecutiva (XGBoost) + Niveles ATR + Descarga PDF/CSV ──
function SemaforoDecision({ ticker }) {
  const { data, loading, error, refetch } = useApi(() => getDecisionManana(ticker), [ticker])
  const [downloading, setDownloading] = useState(null)
  const [downloadError, setDownloadError] = useState(null)

  const handleDownload = async (tipo) => {
    setDownloading(tipo)
    setDownloadError(null)
    try {
      if (tipo === 'pdf') await descargarReportePdf(ticker)
      else await descargarReporteCsv(ticker)
    } catch (e) {
      setDownloadError(e.message)
    } finally {
      setDownloading(null)
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="skeleton" style={{ height: 170, borderRadius: 8 }} />
        </div>
      </div>
    )
  }

  // Si el backend está apagado o devuelve error, NO mostrar sugerencias inventadas
  if (error || !data) {
    return (
      <div className="card" style={{ borderLeft: '5px solid var(--red)' }}>
        <div className="card-header">
          <span className="card-title">🔴 MOTOR PREDICTIVO XGBOOST SIN CONEXIÓN · {ticker}</span>
        </div>
        <div className="card-body" style={{ padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: 'var(--red)', fontWeight: 700, marginBottom: 6 }}>
            {error || 'No se pudo obtener respuesta del servidor backend.'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
            Por seguridad operativa, FinPredict no emite señales ni sugerencias cuando el backend está apagado.
          </div>
          <button type="button" className="btn btn-primary" onClick={refetch}>
            ↻ Reintentar conexión con Backend
          </button>
        </div>
      </div>
    )
  }

  const rawDecision = data.decision_ejecutiva || data.decision || 'HOLD'
  const badgeClass = normalizarBadge(rawDecision)
  const confianzaPct = data.confianza_pct ?? (data.probabilidad_max ? +(data.probabilidad_max * 100).toFixed(1) : 0)
  const nivelConfianza = data.nivel_confianza || (confianzaPct >= 50 ? 'ALTA' : confianzaPct >= 38 ? 'MEDIA' : 'BAJA')
  const explicacion = data.explicacion || data.recomendacion || ''
  const fecha = data.fecha_cierre_analizada || data.fecha || 'Último cierre'
  const sesion = data.sesion_objetivo || 'Próxima rueda bursátil'

  const precioActual = data.precio_actual ?? data.close ?? data.precio_cierre
  const atr14 = data.atr14 ?? data.atr
  const rangoMin = data.rango_estimado_min ?? data.rango_manana?.min ?? (precioActual && atr14 ? precioActual - atr14 : null)
  const rangoMax = data.rango_estimado_max ?? data.rango_manana?.max ?? (precioActual && atr14 ? precioActual + atr14 : null)
  const stopLoss = data.stop_loss ?? data.niveles?.stop_loss ?? (precioActual && atr14 ? precioActual - 1.5 * atr14 : null)
  const takeProfit = data.take_profit ?? data.niveles?.take_profit ?? (precioActual && atr14 ? precioActual + 2.0 * atr14 : null)

  const colorConviccion =
    nivelConfianza === 'ALTA' ? 'var(--green)' :
    nivelConfianza === 'MEDIA' ? 'var(--accent, #60a5fa)' :
    'var(--amber)'

  const semaforoColor =
    badgeClass === 'COMPRA' ? 'var(--green, #22c55e)' :
    badgeClass === 'VENTA'  ? 'var(--red, #ef4444)' :
    'var(--amber, #f59e0b)'

  const semaforoIcono =
    badgeClass === 'COMPRA' ? '🟢' :
    badgeClass === 'VENTA'  ? '🔴' : '🟡'

  return (
    <div
      className="card"
      style={{
        borderLeft: `5px solid ${semaforoColor}`,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(0,0,0,0.1) 100%)',
      }}
    >
      <div className="card-header" style={{ paddingBottom: 10, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {semaforoIcono} PREDICCIÓN XGBOOST PARA MAÑANA · {ticker}
          </span>
          <span className="tag tag-blue">XGBoost (xgb_global_v1)</span>
          <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 12 }}>
            {sesion}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Cierre base: {fmt.date(fecha)}
          </span>
        </div>

        {/* Botones de exportación M4 (PDF / CSV) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            className="btn btn-primary"
            disabled={downloading !== null}
            onClick={() => handleDownload('pdf')}
            title="Descargar reporte institucional multipágina en PDF"
          >
            {downloading === 'pdf' ? 'Generando PDF…' : '📄 Reporte PDF'}
          </button>
          <button
            type="button"
            className="btn"
            disabled={downloading !== null}
            onClick={() => handleDownload('csv')}
            title="Descargar precios limpios, 14 indicadores y señales en CSV (Excel)"
          >
            {downloading === 'csv' ? 'Exportando…' : '📊 Datos CSV'}
          </button>
        </div>
      </div>

      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {downloadError && (
          <div style={{
            padding: '8px 12px',
            borderRadius: 6,
            background: 'var(--red-muted)',
            color: 'var(--red)',
            fontSize: 12,
          }}>
            ⚠ Error al exportar reporte: {downloadError}
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          {/* Insignia Principal */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span
              className={`signal-badge ${badgeClass}`}
              style={{
                fontSize: 20,
                padding: '10px 22px',
                fontWeight: 800,
                letterSpacing: '0.04em',
                boxShadow: `0 0 20px ${semaforoColor}22`,
              }}
            >
              {rawDecision}
            </span>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Certeza XGBoost
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: colorConviccion }}>
                {fmt.num2(confianzaPct)}% · {nivelConfianza}
              </div>
            </div>
          </div>

          {/* Explicación comprensible */}
          <div
            style={{
              flex: 1,
              minWidth: 260,
              fontSize: 13,
              color: 'var(--text-secondary)',
              background: 'rgba(0,0,0,0.2)',
              padding: '12px 16px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              lineHeight: 1.45,
            }}
          >
            {explicacion}
          </div>
        </div>

        {/* Niveles Operativos sugeridos (Cierre, Rango ±ATR14, Stop Loss -1.5xATR, Take Profit +2.0xATR) */}
        <div className="metrics-grid" style={{ marginTop: 4 }}>
          <div className="metric-card" style={{ padding: '12px 14px' }}>
            <div className="metric-label">Precio Cierre Actual</div>
            <div className="metric-value" style={{ fontSize: 18 }}>
              {precioActual != null ? fmt.price(precioActual) : '—'}
            </div>
            <div className="metric-sub">
              {atr14 != null ? `ATR(14): ${fmt.price(atr14)}` : 'Referencia spot'}
            </div>
          </div>

          <div className="metric-card" style={{ padding: '12px 14px' }}>
            <div className="metric-label">Rango Estimado Mañana</div>
            <div className="metric-value neutral" style={{ fontSize: 16 }}>
              {rangoMin != null && rangoMax != null
                ? `${fmt.price(rangoMin)} – ${fmt.price(rangoMax)}`
                : '—'}
            </div>
            <div className="metric-sub">Banda de volatilidad ±1.0 ATR14</div>
          </div>

          <div className="metric-card" style={{ padding: '12px 14px' }}>
            <div className="metric-label">Stop Loss Sugerido</div>
            <div className="metric-value negative" style={{ fontSize: 18 }}>
              {stopLoss != null ? fmt.price(stopLoss) : '—'}
            </div>
            <div className="metric-sub">Protección a −1.5 × ATR14</div>
          </div>

          <div className="metric-card" style={{ padding: '12px 14px' }}>
            <div className="metric-label">Take Profit Sugerido</div>
            <div className="metric-value positive" style={{ fontSize: 18 }}>
              {takeProfit != null ? fmt.price(takeProfit) : '—'}
            </div>
            <div className="metric-sub">Objetivo a +2.0 × ATR14 (R:R 1.33)</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 2. Gráfico Visual Multi-Horizonte (Exclusivo XGBoost: 1D, 5D, 15D, 30D) ───
function GraficoMultiHorizonte({ ticker }) {
  const { data, loading, error, refetch } = useApi(() => getHorizontes(ticker, 'xgb'), [ticker])

  const horizontes = Array.isArray(data?.horizontes)
    ? data.horizontes
    : Array.isArray(data)
      ? data
      : []

  const chartData = horizontes.map(h => ({
    plazo: h.horizonte_nombre || `${h.horizonte_dias || h.horizonte}d`,
    Compra: Number(((h.prob_compra || 0) * 100).toFixed(1)),
    Hold:   Number(((h.prob_hold   || 0) * 100).toFixed(1)),
    Venta:  Number(((h.prob_venta  || 0) * 100).toFixed(1)),
    decision: h.decision || h.senal_texto || 'HOLD',
    umbral: h.umbral_pct,
  }))

  return (
    <div className="card">
      <div className="card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <span className="card-title">PROYECCIÓN MULTI-HORIZONTE XGBOOST (1D · 5D · 15D · 30D)</span>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            Probabilidades calculadas en vivo por el modelo XGBoost sobre indicadores técnicos y variables macroeconómicas FRED
          </div>
        </div>
        <span className="tag tag-blue">Motor único: XGBoost</span>
      </div>

      <div className="card-body">
        {loading ? (
          <div className="skeleton" style={{ height: 220, borderRadius: 8 }} />
        ) : error || horizontes.length === 0 ? (
          <div className="empty-state" style={{ padding: 28 }}>
            <div className="empty-icon">⚠</div>
            <div style={{ color: 'var(--red)', fontWeight: 600 }}>
              {error || 'Sin proyecciones disponibles (Backend desconectado)'}
            </div>
            <button type="button" className="btn" style={{ marginTop: 10 }} onClick={refetch}>
              ↻ Reintentar
            </button>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 12, right: 12, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="plazo"
                  tick={{ fill: '#94a3b8', fontSize: 12, fontFamily: 'DM Mono' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'DM Mono' }}
                  tickLine={false}
                  axisLine={false}
                  unit="%"
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 12,
                    fontFamily: 'DM Mono',
                  }}
                  formatter={(value, name) => [`${value}%`, name]}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} iconType="circle" />
                <ReferenceLine
                  y={33.3}
                  stroke="rgba(255,255,255,0.12)"
                  strokeDasharray="3 3"
                  label={{ value: 'Umbral base (33%)', fill: '#64748b', fontSize: 10 }}
                />
                <Bar dataKey="Compra" fill="var(--green, #22c55e)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="Hold"   fill="var(--amber, #f59e0b)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="Venta"  fill="var(--red, #ef4444)"   radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>

            {/* 4 Mini Tarjetas resumen abajo del gráfico */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10, marginTop: 16 }}>
              {horizontes.map((h, idx) => {
                const dec = h.decision || h.senal_texto || 'HOLD'
                const badge = normalizarBadge(dec)
                const esCompra = badge === 'COMPRA'
                const esVenta = badge === 'VENTA'
                const badgeColor = esCompra ? 'var(--green)' : esVenta ? 'var(--red)' : 'var(--amber)'
                const precioEst = h.precio_estimado ?? h.precio_proyectado
                const retEst = h.retorno_esperado_pct ?? h.retorno_estimado_pct

                return (
                  <div
                    key={h.horizonte_dias || idx}
                    style={{
                      background: 'var(--bg-subtle, rgba(255,255,255,0.02))',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>
                        {h.horizonte_nombre || `${h.horizonte_dias} Días`}
                      </span>
                      {h.umbral_pct != null && (
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                          Umbral: ±{h.umbral_pct}%
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className={`signal-badge ${badge}`} style={{ fontSize: 11, padding: '2px 8px' }}>
                        {dec}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: badgeColor }}>
                        {esCompra ? `${((h.prob_compra || 0) * 100).toFixed(0)}% Compra` :
                         esVenta  ? `${((h.prob_venta  || 0) * 100).toFixed(0)}% Venta` :
                         `${((h.prob_hold || 0) * 100).toFixed(0)}% Neutral`}
                      </span>
                    </div>

                    {(precioEst != null || retEst != null) && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 11,
                        color: 'var(--text-secondary)',
                        borderTop: '1px solid var(--border)',
                        paddingTop: 6,
                      }}>
                        <span>Est: <strong>{precioEst != null ? fmt.price(precioEst) : '—'}</strong></span>
                        {retEst != null && (
                          <span style={{ color: retEst >= 0 ? 'var(--green)' : 'var(--red)' }}>
                            {fmt.pct(retEst)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── 3. Historial de Señales XGBoost (Tabla Colapsable) ───────────────────────
function HistorialSeñales({ ticker }) {
  const [abierto, setAbierto] = useState(false)
  const { data: señales, loading, error } = useApi(() => getSeñales(ticker, { limite: 60 }), [ticker])

  if (loading || error || !señales || señales.length === 0) return null

  return (
    <div className="card">
      <div
        className="card-header"
        onClick={() => setAbierto(!abierto)}
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        <span className="card-title">
          {abierto ? '▼' : '►'} Historial de Señales XGBoost ({señales.length} sesiones)
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {abierto ? 'Click para ocultar' : 'Click para desplegar tabla'}
        </span>
      </div>

      {abierto && (
        <div style={{ overflowX: 'auto', borderTop: '1px solid var(--border)' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Modelo</th>
                <th>Señal</th>
                <th>P(Compra)</th>
                <th>P(Hold)</th>
                <th>P(Venta)</th>
              </tr>
            </thead>
            <tbody>
              {señales.slice().reverse().slice(0, 30).map((s, i) => (
                <tr key={i}>
                  <td>{fmt.date(s.fecha)}</td>
                  <td>
                    <span className="tag tag-blue">{s.modelo_version || 'xgb_global_v1'}</span>
                  </td>
                  <td>
                    <span className={`signal-badge ${normalizarBadge(s.senal_texto)}`}>
                      {s.senal_texto}
                    </span>
                  </td>
                  <td style={{ color: 'var(--green)' }}>
                    {s.prob_compra != null ? `${(s.prob_compra * 100).toFixed(1)}%` : '—'}
                  </td>
                  <td style={{ color: 'var(--amber)' }}>
                    {s.prob_hold != null ? `${(s.prob_hold * 100).toFixed(1)}%` : '—'}
                  </td>
                  <td style={{ color: 'var(--red)' }}>
                    {s.prob_venta != null ? `${(s.prob_venta * 100).toFixed(1)}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Componente Principal ──────────────────────────────────────────────────
export default function Señales({ ticker }) {
  return (
    <div className="col fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 1. Semáforo Principal XGBoost + Niveles ATR + Descargas PDF/CSV */}
      <SemaforoDecision ticker={ticker} />

      {/* 2. Gráfico Visual Multi-Horizonte (XGBoost) */}
      <GraficoMultiHorizonte ticker={ticker} />

      {/* 3. Historial de Señales XGBoost (compacto y colapsable) */}
      <HistorialSeñales ticker={ticker} />
    </div>
  )
}
