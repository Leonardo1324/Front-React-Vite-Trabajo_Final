// src/pages/Dashboard.jsx
import { useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { useApi } from '../hooks/useApi'
import {
  getPreciosRaw, getMetricas, getUltimaSeñal, getAllMetricas
} from '../services/api'
import { fmt, signClass } from '../utils/format'

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

function MiniChart({ ticker }) {
  const { data, loading } = useApi(
    () => getPreciosRaw(ticker, { limite: 90 }),
    [ticker]
  )

  const chartData = useMemo(() =>
    (data || []).map(d => ({
      fecha: d.fecha?.slice(5),
      close: +Number(d.close).toFixed(2),
    })),
    [data]
  )

  const isUp = chartData.length > 1
    ? chartData.at(-1).close >= chartData[0].close
    : true

  const color = isUp ? '#22c55e' : '#ef4444'

  if (loading) {
    return (
      <div className="skeleton" style={{ height: 200, borderRadius: 8 }} />
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`g-${ticker}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.15} />
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
          interval={14}
        />
        <YAxis
          tick={{ fill: '#3d5070', fontSize: 10, fontFamily: 'DM Mono' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={v => `$${v}`}
          width={52}
          domain={['auto', 'auto']}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="close"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#g-${ticker})`}
          dot={false}
          activeDot={{ r: 3, fill: color }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function MetricaCard({ label, value, sub, color }) {
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className={`metric-value ${color || ''}`}>{value}</div>
      {sub && <div className="metric-sub">{sub}</div>}
    </div>
  )
}

function TickerMetricas({ ticker }) {
  const { data: m, loading } = useApi(() => getMetricas(ticker), [ticker])
  const { data: señal } = useApi(() => getUltimaSeñal(ticker), [ticker])

  if (loading) return (
    <div className="metrics-grid">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="metric-card">
          <div className="skeleton" style={{ height: 10, width: 80, marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 22, width: 100 }} />
        </div>
      ))}
    </div>
  )

  if (!m) return (
    <div className="empty-state">
      <div className="empty-icon">◌</div>
      <div>Sin métricas disponibles para {ticker}</div>
      <div style={{ fontSize: 11 }}>Ejecutá el pipeline desde la sección Modelo</div>
    </div>
  )

  const retPct = m.retorno_total_pct
  const señalTexto = señal?.senal_texto || 'N/A'

  return (
    <div className="metrics-grid">
      <MetricaCard
        label="Retorno Total"
        value={fmt.pct(retPct)}
        color={signClass(retPct)}
        sub={`Capital final ${fmt.price(m.capital_final)}`}
      />
      <MetricaCard
        label="Sharpe Ratio"
        value={fmt.num3(m.sharpe_ratio)}
        color={m.sharpe_ratio > 1 ? 'positive' : m.sharpe_ratio < 0 ? 'negative' : ''}
        sub="Anualizado · 252 días"
      />
      <MetricaCard
        label="Sortino Ratio"
        value={fmt.num3(m.sortino_ratio)}
        sub="Solo volatilidad negativa"
      />
      <MetricaCard
        label="Max Drawdown"
        value={fmt.pct(m.max_drawdown_pct)}
        color="negative"
        sub="Peor caída desde máximo"
      />
      <MetricaCard
        label="Win Rate"
        value={fmt.pct(m.win_rate_pct)}
        color={m.win_rate_pct > 50 ? 'positive' : 'negative'}
        sub={`${m.n_operaciones} operaciones`}
      />
      <MetricaCard
        label="Señal Actual"
        value={
          <span className={`signal-badge ${señalTexto}`} style={{ fontSize: 14 }}>
            {señalTexto}
          </span>
        }
        sub={señal ? `Prob: ${fmt.pct(
          señalTexto === 'COMPRA' ? señal.prob_compra * 100
          : señalTexto === 'VENTA' ? señal.prob_venta * 100
          : señal.prob_hold * 100
        )}` : ''}
      />
    </div>
  )
}

// ── Tabla resumen de todos los activos ────────────────────────
function ResumenActivos() {
  const { data, loading } = useApi(getAllMetricas)

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Resumen de Activos</span>
      </div>
      {loading
        ? <div style={{ padding: 20 }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 36, marginBottom: 8, borderRadius: 4 }} />
            ))}
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
                  <th>Retorno</th>
                  <th>Sharpe</th>
                  <th>Max DD</th>
                  <th>Win Rate</th>
                  <th>Ops</th>
                  <th>Capital Final</th>
                </tr>
              </thead>
              <tbody>
                {data.map(m => (
                  <tr key={m.ticker}>
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
  const { data: preciosRaw } = useApi(
    () => getPreciosRaw(ticker, { limite: 1 }),
    [ticker]
  )
  const lastPrice = preciosRaw?.[0]?.close

  return (
    <div className="col fade-in">
      {/* Precio actual */}
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

      {/* Gráfico principal */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Precio Histórico · 90d</span>
          <span className="tag tag-blue">RAW</span>
        </div>
        <div className="card-body" style={{ paddingTop: 8, paddingBottom: 4 }}>
          <MiniChart ticker={ticker} />
        </div>
      </div>

      {/* Métricas de backtesting */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Backtesting · XGBoost v1</span>
        </div>
        <div className="card-body">
          <TickerMetricas ticker={ticker} />
        </div>
      </div>

      {/* Tabla global */}
      <ResumenActivos />
    </div>
  )
}
