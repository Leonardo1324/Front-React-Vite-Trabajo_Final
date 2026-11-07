// src/pages/Comparar.jsx
import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts'
import { useApi } from '../hooks/useApi'
import { getActivos, getComparacionActivos } from '../services/api'
import { fmt } from '../utils/format'

const TICKER_COLORS = {
  AAPL:  '#3b82f6',
  MSFT:  '#22c55e',
  GOOGL: '#f59e0b',
  AMZN:  '#a855f7',
  NVDA:  '#ec4899',
}

const FALLBACK_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ec4899', '#14b8a6', '#f43f5e']

const PRESET_LIMITS = [
  { value: 60,    label: '60d' },
  { value: 120,   label: '120d' },
  { value: 252,   label: '1 año' },
  { value: 756,   label: '3 años' },
  { value: 1260,  label: '5 años' },
  { value: 10000, label: 'Todo el historial' },
]

export default function Comparar() {
  const { data: activosList } = useApi(getActivos, [])
  const tickersDisponibles = useMemo(
    () => (activosList?.length ? activosList.map(a => a.ticker) : ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA']),
    [activosList]
  )

  const [seleccionados, setSeleccionados] = useState(['AAPL', 'MSFT', 'NVDA'])
  const [modoGrafico, setModoGrafico] = useState('retorno') // 'retorno' (%) | 'precio' (USD)
  const [limite, setLimite] = useState(252)
  const [diasInput, setDiasInput] = useState('252')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  const toggleTicker = (t) => {
    setSeleccionados(prev => {
      if (prev.includes(t)) {
        if (prev.length <= 1) return prev // mantener al menos 1 activo
        return prev.filter(x => x !== t)
      }
      return [...prev, t]
    })
  }

  const handlePresetLimit = (val) => {
    setLimite(val)
    setDiasInput(val >= 10000 ? '' : String(val))
  }

  const handleDiasCustom = (e) => {
    const val = e.target.value
    setDiasInput(val)
    const num = parseInt(val, 10)
    if (!isNaN(num) && num >= 5 && num <= 20000) {
      setLimite(num)
    }
  }

  const queryParams = useMemo(() => {
    const p = {
      tickers: seleccionados.join(','),
      limite,
    }
    if (desde) p.desde = desde
    if (hasta) p.hasta = hasta
    return p
  }, [seleccionados, limite, desde, hasta])

  const { data, loading, error, refetch } = useApi(
    () => getComparacionActivos(queryParams),
    [queryParams.tickers, queryParams.limite, queryParams.desde, queryParams.hasta]
  )

  const series = data?.series || []
  const resumen = data?.resumen || []

  const inputStyle = {
    background: 'var(--bg-panel)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '5px 10px',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
  }

  return (
    <div className="col fade-in">
      {/* Barra de Selección de Activos y Modo */}
      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div>
            <span className="card-title">Comparador Multi-Activo</span>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              Seleccioná dos o más activos para comparar su rendimiento acumulado (%) o cotización en USD
            </div>
          </div>

          {/* Selector Rendimiento (%) vs Precio (USD) */}
          <div className="theme-switcher" role="group">
            <button
              type="button"
              className={`theme-option${modoGrafico === 'retorno' ? ' active' : ''}`}
              onClick={() => setModoGrafico('retorno')}
            >
              Rendimiento (%)
            </button>
            <button
              type="button"
              className={`theme-option${modoGrafico === 'precio' ? ' active' : ''}`}
              onClick={() => setModoGrafico('precio')}
            >
              Precio (USD)
            </button>
          </div>
        </div>

        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Chips de activos */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 4 }}>Activos:</span>
            {tickersDisponibles.map((t, idx) => {
              const activo = seleccionados.includes(t)
              const color = TICKER_COLORS[t] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length]
              return (
                <button
                  key={t}
                  type="button"
                  className="btn"
                  onClick={() => toggleTicker(t)}
                  style={activo ? {
                    borderColor: color,
                    color: color,
                    background: `${color}18`,
                    fontWeight: 700,
                  } : { opacity: 0.65 }}
                >
                  <span style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: color,
                    display: 'inline-block',
                    marginRight: 6,
                  }} />
                  {t}
                </button>
              )
            })}
          </div>

          {/* Controles de Período, Cantidad de Días y Rango Desde/Hasta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {PRESET_LIMITS.map(l => (
                <button
                  key={l.value}
                  type="button"
                  className={`ticker-tab${limite === l.value && !desde && !hasta ? ' active' : ''}`}
                  onClick={() => handlePresetLimit(l.value)}
                >
                  {l.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Días:</label>
              <input
                type="number"
                min={5}
                max={20000}
                placeholder="Ej. 180"
                value={diasInput}
                onChange={handleDiasCustom}
                style={{ ...inputStyle, width: 82 }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Desde:</label>
              <input
                type="date"
                value={desde}
                onChange={e => setDesde(e.target.value)}
                style={inputStyle}
              />
              <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Hasta:</label>
              <input
                type="date"
                value={hasta}
                onChange={e => setHasta(e.target.value)}
                style={inputStyle}
              />
              {(desde || hasta) && (
                <button
                  type="button"
                  className="btn"
                  style={{ fontSize: 11, padding: '4px 8px' }}
                  onClick={() => { setDesde(''); setHasta('') }}
                >
                  ✕ Limpiar fechas
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico Comparativo */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            {modoGrafico === 'retorno'
              ? 'Evolución Comparada de Rendimiento (% desde el inicio del período)'
              : 'Evolución Comparada de Precio de Cierre (USD)'}
          </span>
          <span className="tag tag-blue">
            {series.length} ruedas analizadas
          </span>
        </div>

        <div className="card-body" style={{ paddingTop: 10 }}>
          {loading ? (
            <div className="skeleton" style={{ height: 340, borderRadius: 8 }} />
          ) : error ? (
            <div className="empty-state" style={{ padding: 32 }}>
              <div className="empty-icon">⚠</div>
              <div style={{ color: 'var(--red)', fontWeight: 600 }}>{error}</div>
              <button type="button" className="btn" style={{ marginTop: 10 }} onClick={refetch}>
                ↻ Reintentar conexión
              </button>
            </div>
          ) : series.length === 0 ? (
            <div className="empty-state">Sin datos para el rango seleccionado</div>
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={series} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="fecha"
                  tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'DM Mono' }}
                  tickLine={false}
                  axisLine={false}
                  interval={Math.max(1, Math.floor(series.length / 7))}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'DM Mono' }}
                  tickLine={false}
                  axisLine={false}
                  width={62}
                  domain={['auto', 'auto']}
                  tickFormatter={v => modoGrafico === 'retorno' ? `${v > 0 ? '+' : ''}${Number(v).toFixed(0)}%` : `$${v}`}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 12,
                    fontFamily: 'var(--font-mono)',
                  }}
                  formatter={(val, name) => {
                    const cleanTicker = String(name).replace('ret_', '').replace('close_', '')
                    if (modoGrafico === 'retorno') {
                      const num = Number(val)
                      return [`${num >= 0 ? '+' : ''}${num.toFixed(2)}%`, cleanTicker]
                    }
                    return [fmt.price(val), cleanTicker]
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
                  formatter={(val) => String(val).replace('ret_', '').replace('close_', '')}
                />
                {modoGrafico === 'retorno' && (
                  <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                )}
                {seleccionados.map((t, idx) => {
                  const color = TICKER_COLORS[t] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length]
                  const dataKey = modoGrafico === 'retorno' ? `ret_${t}` : `close_${t}`
                  return (
                    <Line
                      key={t}
                      type="monotone"
                      dataKey={dataKey}
                      name={t}
                      stroke={color}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: color }}
                    />
                  )
                })}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Tabla Resumen Comparativa Lado a Lado */}
      {!error && resumen.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Tabla Comparativa de Activos en el Período</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Activo</th>
                  <th>Período Analizado</th>
                  <th>Precio Inicial</th>
                  <th>Precio Actual</th>
                  <th>Rendimiento Período</th>
                  <th>RSI (14)</th>
                  <th>Volatilidad ATR (14)</th>
                  <th>Señal XGBoost Hoy</th>
                </tr>
              </thead>
              <tbody>
                {resumen.map(r => (
                  <tr key={r.ticker}>
                    <td>
                      <span
                        className="tag"
                        style={{
                          borderColor: TICKER_COLORS[r.ticker] || 'var(--accent)',
                          color: TICKER_COLORS[r.ticker] || 'var(--accent)',
                        }}
                      >
                        {r.ticker}
                      </span>
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {r.fecha_inicio} → {r.fecha_fin} ({r.ruedas} ruedas)
                    </td>
                    <td>{fmt.price(r.precio_inicial)}</td>
                    <td style={{ fontWeight: 700 }}>{fmt.price(r.precio_actual)}</td>
                    <td style={{
                      fontWeight: 700,
                      color: r.retorno_periodo_pct >= 0 ? 'var(--green)' : 'var(--red)',
                    }}>
                      {fmt.pct(r.retorno_periodo_pct)}
                    </td>
                    <td>{r.rsi14 != null ? fmt.rsi(r.rsi14) : '—'}</td>
                    <td>{r.atr14 != null ? fmt.price(r.atr14) : '—'}</td>
                    <td>
                      <span className={`signal-badge ${r.senal_xgboost || 'HOLD'}`}>
                        {r.senal_xgboost || 'HOLD'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
