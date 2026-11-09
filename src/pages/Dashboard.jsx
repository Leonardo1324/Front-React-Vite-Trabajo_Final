// src/pages/Dashboard.jsx
import { useState, useMemo, useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Brush, ReferenceArea,
} from 'recharts'
import { useApi } from '../hooks/useApi'
import {
  getPreciosRaw, getUltimaSeñal, getAllMetricas,
} from '../services/api'
import { fmt } from '../utils/format'

const RANGOS_HISTORIAL = [
  { value: 90,    label: '90d' },
  { value: 252,   label: '1 año' },
  { value: 756,   label: '3 años' },
  { value: 1260,  label: '5 años' },
  { value: 15000, label: 'Todo el historial' },
]

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-panel)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      padding: '8px 12px',
      fontSize: 12,
      fontFamily: 'var(--font-mono)',
    }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ color: '#60a5fa' }}>
        Cierre: {fmt.price(payload[0]?.value)}
      </div>
    </div>
  )
}

function HistorialPrecioChart({ ticker, limite }) {
  const { data, loading, error, refetch } = useApi(
    () => getPreciosRaw(ticker, { limite }),
    [ticker, limite]
  )

  const fullData = useMemo(() =>
    (data || []).map((d, idx) => ({
      idx,
      fechaCompleta: d.fecha?.slice(0, 10),
      fecha: limite > 365 ? d.fecha?.slice(0, 10) : d.fecha?.slice(5, 10),
      close: +Number(d.close).toFixed(2),
    })),
    [data, limite]
  )

  // Estado de Zoom [startIndex, endIndex] y selección con mouse
  const [zoomRange, setZoomRange] = useState({ start: 0, end: 0 })
  const [dragLeft, setDragLeft] = useState(null)
  const [dragRight, setDragRight] = useState(null)

  useEffect(() => {
    if (fullData.length > 0) {
      setZoomRange({ start: 0, end: fullData.length - 1 })
    }
  }, [fullData.length, ticker, limite])

  const visibleData = useMemo(() => {
    if (!fullData.length) return []
    const s = Math.max(0, Math.min(zoomRange.start, fullData.length - 1))
    const e = Math.max(s + 1, Math.min(zoomRange.end, fullData.length - 1))
    return fullData.slice(s, e + 1)
  }, [fullData, zoomRange])

  const isZoomed = fullData.length > 2 && (zoomRange.start > 0 || zoomRange.end < fullData.length - 1)

  const handleZoomIn = () => {
    const len = zoomRange.end - zoomRange.start
    if (len <= 10) return
    const step = Math.max(2, Math.floor(len * 0.2))
    setZoomRange(prev => ({
      start: Math.min(prev.end - 5, prev.start + step),
      end: Math.max(prev.start + 5, prev.end - step),
    }))
  }

  const handleZoomOut = () => {
    if (!fullData.length) return
    const len = zoomRange.end - zoomRange.start
    const step = Math.max(5, Math.floor(len * 0.25))
    setZoomRange(prev => ({
      start: Math.max(0, prev.start - step),
      end: Math.min(fullData.length - 1, prev.end + step),
    }))
  }

  const handleResetZoom = () => {
    if (!fullData.length) return
    setZoomRange({ start: 0, end: fullData.length - 1 })
  }

  const handleMouseUp = () => {
    if (dragLeft != null && dragRight != null && dragLeft !== dragRight) {
      const idxA = fullData.findIndex(d => d.fecha === dragLeft)
      const idxB = fullData.findIndex(d => d.fecha === dragRight)
      if (idxA !== -1 && idxB !== -1 && Math.abs(idxA - idxB) >= 3) {
        setZoomRange({
          start: Math.min(idxA, idxB),
          end: Math.max(idxA, idxB),
        })
      }
    }
    setDragLeft(null)
    setDragRight(null)
  }

  const isUp = visibleData.length > 1
    ? visibleData.at(-1).close >= visibleData[0].close
    : true

  const color = isUp ? '#22c55e' : '#ef4444'

  if (loading) {
    return (
      <div className="skeleton" style={{ height: 310, borderRadius: 8 }} />
    )
  }

  if (error) {
    return (
      <div className="empty-state" style={{ padding: 28 }}>
        <div className="empty-icon">⚠</div>
        <div style={{ color: 'var(--red)', fontWeight: 600 }}>{error}</div>
        <button type="button" className="btn" style={{ marginTop: 8 }} onClick={refetch}>
          ↻ Reintentar
        </button>
      </div>
    )
  }

  const firstClose = visibleData[0]?.close
  const lastClose = visibleData.at(-1)?.close
  const retornoRango = firstClose && lastClose
    ? (((lastClose / firstClose) - 1) * 100)
    : null

  return (
    <div style={{ userSelect: 'none' }}>
      {/* Barra de información del tramo visible + Controles de Zoom */}
      {visibleData.length > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
          fontSize: 11,
          color: 'var(--text-muted)',
          marginBottom: 10,
          fontFamily: 'var(--font-mono)',
        }}>
          <div>
            <span>
              Viendo: {visibleData[0]?.fechaCompleta} → {visibleData.at(-1)?.fechaCompleta} ({visibleData.length} ruedas)
            </span>
            {retornoRango != null && (
              <span style={{ color: retornoRango >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700, marginLeft: 12 }}>
                Variación: {fmt.pct(retornoRango)}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              💡 Arrastrá sobre el gráfico o usá la barra inferior para hacer zoom
            </span>
            <button type="button" className="btn" style={{ padding: '3px 8px', fontSize: 11 }} onClick={handleZoomIn} title="Acercar zoom">
              🔍+
            </button>
            <button type="button" className="btn" style={{ padding: '3px 8px', fontSize: 11 }} onClick={handleZoomOut} disabled={!isZoomed} title="Alejar zoom">
              🔍−
            </button>
            {isZoomed && (
              <button type="button" className="btn btn-primary" style={{ padding: '3px 9px', fontSize: 11 }} onClick={handleResetZoom}>
                ⟲ Restablecer Zoom
              </button>
            )}
          </div>
        </div>
      )}

      <ResponsiveContainer width="100%" height={310}>
        <AreaChart
          data={fullData}
          margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
          onMouseDown={e => e?.activeLabel && setDragLeft(e.activeLabel)}
          onMouseMove={e => dragLeft && e?.activeLabel && setDragRight(e.activeLabel)}
          onMouseUp={handleMouseUp}
        >
          <defs>
            <linearGradient id={`g-${ticker}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={color} stopOpacity={0.18} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.04)"
            vertical={false}
          />
          <XAxis
            dataKey="fecha"
            tick={{ fill: '#3d5070', fontSize: 10, fontFamily: 'DM Mono' }}
            tickLine={false}
            axisLine={false}
            minTickGap={28}
          />
          <YAxis
            tick={{ fill: '#3d5070', fontSize: 10, fontFamily: 'DM Mono' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `$${v}`}
            width={56}
            domain={['auto', 'auto']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="close"
            stroke={color}
            strokeWidth={1.6}
            fill={`url(#g-${ticker})`}
            dot={false}
            activeDot={{ r: 3, fill: color }}
            isAnimationActive={false}
          />
          {dragLeft && dragRight && (
            <ReferenceArea
              x1={dragLeft}
              x2={dragRight}
              strokeOpacity={0.3}
              fill="#3b82f6"
              fillOpacity={0.22}
            />
          )}
          <Brush
            dataKey="fecha"
            height={26}
            stroke="#3b82f6"
            fill="rgba(15, 23, 42, 0.75)"
            travellerWidth={8}
            startIndex={zoomRange.start}
            endIndex={zoomRange.end}
            onChange={(r) => {
              if (r && typeof r.startIndex === 'number' && typeof r.endIndex === 'number') {
                setZoomRange({ start: r.startIndex, end: r.endIndex })
              }
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Tabla resumen de todos los activos ────────────────────────
function ResumenActivos() {
  const { data, loading, error } = useApi(getAllMetricas)

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Resumen General de Activos Monitoreados</span>
      </div>
      {loading
        ? <div style={{ padding: 20 }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 36, marginBottom: 8, borderRadius: 4 }} />
            ))}
          </div>
        : error
          ? <div className="empty-state">
              <div className="empty-icon">⚠</div>
              <div style={{ color: 'var(--red)' }}>{error}</div>
            </div>
          : !data?.length
            ? <div className="empty-state">
                <div className="empty-icon">◌</div>
                <div>Sin datos — ejecutá el pipeline</div>
              </div>
            : <table className="data-table">
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Retorno Histórico Backtest</th>
                    <th>Sharpe</th>
                    <th>Max DD</th>
                    <th>Win Rate</th>
                    <th>Ops</th>
                    <th>Capital Final</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(m => (
                    <tr key={`${m.ticker}-${m.modelo_version || ''}`}>
                      <td><span className="tag tag-blue">{m.ticker}</span></td>
                      <td style={{ color: m.retorno_total_pct >= 0 ? 'var(--green)' : 'var(--red)' }}>
                        {fmt.pct(m.retorno_total_pct)}
                      </td>
                      <td>{fmt.num3(m.sharpe_ratio)}</td>
                      <td style={{ color: 'var(--red)' }}>{fmt.pct(m.max_drawdown_pct)}</td>
                      <td>{fmt.pct(m.win_rate_pct)}</td>
                      <td>{fmt.int(m.n_operaciones)}</td>
                      <td>{fmt.price(m.capital_final)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
      }
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────
export default function Dashboard({ ticker }) {
  const [limiteHistorial, setLimiteHistorial] = useState(15000) // Todo el historial por defecto
  const { data: preciosRaw, error: errPrecio } = useApi(
    () => getPreciosRaw(ticker, { limite: 1 }),
    [ticker]
  )
  const { data: ultimaSenal } = useApi(
    () => getUltimaSeñal(ticker),
    [ticker]
  )

  const lastPrice = !errPrecio ? preciosRaw?.[0]?.close : null
  const senalTexto = !errPrecio ? ultimaSenal?.senal_texto : null

  return (
    <div className="col fade-in">
      {/* Encabezado de Precio actual y Señal XGBoost */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: 32,
            fontWeight: 800,
            color: 'var(--text-primary)',
            letterSpacing: -1,
          }}>
            {lastPrice ? fmt.price(lastPrice) : '—'}
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            {ticker} · Último cierre disponible
          </span>
        </div>

        {senalTexto && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Señal XGBoost actual:</span>
            <span className={`signal-badge ${senalTexto}`} style={{ fontSize: 13 }}>
              {senalTexto}
            </span>
          </div>
        )}
      </div>

      {/* Gráfico principal con selector de historial completo y Zoom interactivo */}
      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="card-title">Precio Histórico · {ticker}</span>
            <span className="tag tag-blue">OHLCV + Zoom</span>
          </div>

          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {RANGOS_HISTORIAL.map(r => (
              <button
                key={r.value}
                type="button"
                className={`ticker-tab${limiteHistorial === r.value ? ' active' : ''}`}
                onClick={() => setLimiteHistorial(r.value)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div className="card-body" style={{ paddingTop: 10, paddingBottom: 8 }}>
          <HistorialPrecioChart ticker={ticker} limite={limiteHistorial} />
        </div>
      </div>

      {/* Tabla global */}
      <ResumenActivos />
    </div>
  )
}
