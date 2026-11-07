// src/pages/Dashboard.jsx
import { useState, useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
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

  const chartData = useMemo(() =>
    (data || []).map(d => ({
      fecha: limite > 365 ? d.fecha?.slice(0, 10) : d.fecha?.slice(5, 10),
      close: +Number(d.close).toFixed(2),
    })),
    [data, limite]
  )

  const isUp = chartData.length > 1
    ? chartData.at(-1).close >= chartData[0].close
    : true

  const color = isUp ? '#22c55e' : '#ef4444'

  if (loading) {
    return (
      <div className="skeleton" style={{ height: 270, borderRadius: 8 }} />
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

  const firstClose = chartData[0]?.close
  const lastClose = chartData.at(-1)?.close
  const retornoRango = firstClose && lastClose
    ? (((lastClose / firstClose) - 1) * 100)
    : null

  return (
    <div>
      {chartData.length > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 11,
          color: 'var(--text-muted)',
          marginBottom: 8,
          fontFamily: 'var(--font-mono)',
        }}>
          <span>
            Período: {data?.[0]?.fecha?.slice(0, 10)} → {data?.at(-1)?.fecha?.slice(0, 10)} ({chartData.length} ruedas)
          </span>
          {retornoRango != null && (
            <span style={{ color: retornoRango >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
              Variación en el período: {fmt.pct(retornoRango)}
            </span>
          )}
        </div>
      )}

      <ResponsiveContainer width="100%" height={270}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
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
            interval={Math.max(1, Math.floor(chartData.length / 7))}
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

      {/* Gráfico principal con selector de historial completo */}
      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="card-title">Precio Histórico · {ticker}</span>
            <span className="tag tag-blue">OHLCV</span>
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
