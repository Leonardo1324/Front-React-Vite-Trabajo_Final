// src/pages/Metricas.jsx
import { useMemo } from 'react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts'
import { useApi } from '../hooks/useApi'
import { getMetricas, getAllMetricas } from '../services/api'
import { fmt, signClass } from '../utils/format'

function GaugeCard({ label, value, min, max, good, suffix = '' }) {
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
  const isGood = good === 'high' ? value > (max * 0.5) : value < (max * 0.5)
  const color = isGood ? 'var(--green)' : 'var(--amber)'

  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value" style={{ color, fontSize: 20 }}>
        {fmt.num2(value)}{suffix}
      </div>
      <div style={{ marginTop: 8 }}>
        <div style={{
          height: 3,
          background: 'var(--bg-hover)',
          borderRadius: 99,
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            background: color,
            borderRadius: 99,
            transition: 'width 0.5s ease',
          }} />
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: 10, color: 'var(--text-muted)', marginTop: 4,
        }}>
          <span>{min}{suffix}</span>
          <span>{max}{suffix}</span>
        </div>
      </div>
    </div>
  )
}

function RadarMetricas({ m }) {
  const data = useMemo(() => {
    if (!m) return []
    const sharpeN = Math.min(100, Math.max(0, ((m.sharpe_ratio + 1) / 4) * 100))
    const sortinoN = Math.min(100, Math.max(0, ((m.sortino_ratio + 1) / 4) * 100))
    const winN = m.win_rate_pct || 0
    const ddN = Math.max(0, 100 + (m.max_drawdown_pct || 0))
    const pfN = Math.min(100, ((m.profit_factor || 0) / 3) * 100)
    return [
      { metric: 'Sharpe',   value: Math.round(sharpeN) },
      { metric: 'Sortino',  value: Math.round(sortinoN) },
      { metric: 'Win Rate', value: Math.round(winN) },
      { metric: 'Drawdown', value: Math.round(ddN) },
      { metric: 'Profit F.', value: Math.round(pfN) },
    ]
  }, [m])

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Perfil de Riesgo · Radar</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Score normalizado 0-100</span>
      </div>
      <div className="card-body" style={{ paddingTop: 0 }}>
        <ResponsiveContainer width="100%" height={220}>
          <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
            <PolarGrid stroke="rgba(255,255,255,0.07)" />
            <PolarAngleAxis
              dataKey="metric"
              tick={{ fill: '#7a90b0', fontSize: 11, fontFamily: 'DM Mono' }}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-panel)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                fontSize: 12,
                fontFamily: 'DM Mono',
              }}
            />
            <Radar
              name="Score"
              dataKey="value"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.15}
              strokeWidth={1.5}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function ComparacionTabla() {
  const { data, loading } = useApi(getAllMetricas)

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Comparación entre Activos</span>
      </div>
      {loading
        ? <div style={{ padding: 20 }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 36, marginBottom: 6, borderRadius: 4 }} />
            ))}
          </div>
        : !data?.length
          ? <div className="empty-state">
              <div className="empty-icon">◌</div>
              <div>Sin métricas disponibles</div>
            </div>
          : <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Retorno</th>
                    <th>Sharpe</th>
                    <th>Sortino</th>
                    <th>Max DD</th>
                    <th>Win Rate</th>
                    <th>Profit Factor</th>
                    <th>Ops</th>
                  </tr>
                </thead>
                <tbody>
                  {data
                    .sort((a, b) => (b.retorno_total_pct || 0) - (a.retorno_total_pct || 0))
                    .map(m => (
                      <tr key={m.ticker}>
                        <td><span className="tag tag-blue">{m.ticker}</span></td>
                        <td style={{ color: m.retorno_total_pct >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 500 }}>
                          {fmt.pct(m.retorno_total_pct)}
                        </td>
                        <td style={{ color: m.sharpe_ratio > 1 ? 'var(--green)' : m.sharpe_ratio < 0 ? 'var(--red)' : 'var(--text-secondary)' }}>
                          {fmt.num3(m.sharpe_ratio)}
                        </td>
                        <td>{fmt.num3(m.sortino_ratio)}</td>
                        <td style={{ color: 'var(--red)' }}>{fmt.pct(m.max_drawdown_pct)}</td>
                        <td style={{ color: m.win_rate_pct > 50 ? 'var(--green)' : 'var(--text-secondary)' }}>
                          {fmt.pct(m.win_rate_pct)}
                        </td>
                        <td style={{ color: m.profit_factor > 1 ? 'var(--green)' : 'var(--red)' }}>
                          {fmt.num3(m.profit_factor)}
                        </td>
                        <td>{fmt.int(m.n_operaciones)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
      }
    </div>
  )
}

export default function Metricas({ ticker }) {
  const { data: m, loading } = useApi(() => getMetricas(ticker), [ticker])

  return (
    <div className="col fade-in">
      {/* Cards de métricas detalladas */}
      {loading
        ? <div className="metrics-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="metric-card">
                <div className="skeleton" style={{ height: 10, width: 80, marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 24, width: 100 }} />
              </div>
            ))}
          </div>
        : m
          ? <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800 }}>
                  Backtesting · {ticker}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {m.periodo_inicio} → {m.periodo_fin}
                </span>
              </div>

              {/* KPIs principales */}
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-label">Retorno Total</div>
                  <div className={`metric-value ${signClass(m.retorno_total_pct)}`}>
                    {fmt.pct(m.retorno_total_pct)}
                  </div>
                  <div className="metric-sub">Capital: {fmt.price(m.capital_inicial)} → {fmt.price(m.capital_final)}</div>
                </div>
                <GaugeCard label="Sharpe Ratio"  value={m.sharpe_ratio}   min={-2} max={3}   good="high" />
                <GaugeCard label="Sortino Ratio" value={m.sortino_ratio}  min={-2} max={4}   good="high" />
                <div className="metric-card">
                  <div className="metric-label">Max Drawdown</div>
                  <div className="metric-value negative">{fmt.pct(m.max_drawdown_pct)}</div>
                  <div className="metric-sub">Caída máxima desde pico</div>
                </div>
                <GaugeCard label="Win Rate"      value={m.win_rate_pct}   min={0}  max={100} good="high" suffix="%" />
                <GaugeCard label="Profit Factor" value={m.profit_factor}  min={0}  max={3}   good="high" />
              </div>

              {/* Radar */}
              <RadarMetricas m={m} />
            </>
          : <div className="empty-state">
              <div className="empty-icon">◌</div>
              <div>Sin métricas para {ticker}</div>
              <div style={{ fontSize: 11 }}>Ejecutá el pipeline desde la sección Modelo</div>
            </div>
      }

      {/* Tabla comparativa */}
      <ComparacionTabla />
    </div>
  )
}
