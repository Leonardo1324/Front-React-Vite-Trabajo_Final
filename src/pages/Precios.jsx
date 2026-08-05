// src/pages/Precios.jsx
import { useState, useMemo } from 'react'
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { useApi } from '../hooks/useApi'
import { getPreciosLimpios } from '../services/api'
import { fmt } from '../utils/format'

const INDICATOR_OPTS = [
  { key: 'sma20',  label: 'SMA 20',  color: '#f59e0b' },
  { key: 'sma50',  label: 'SMA 50',  color: '#a78bfa' },
  { key: 'ema20',  label: 'EMA 20',  color: '#38bdf8' },
  { key: 'bb_upper', label: 'BB Sup', color: '#64748b' },
  { key: 'bb_lower', label: 'BB Inf', color: '#64748b' },
]

const LIMITS = [
  { value: 60,  label: '60d' },
  { value: 120, label: '120d' },
  { value: 252, label: '1 año' },
  { value: 504, label: '2 años' },
]

function PriceTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div style={{
      background: 'var(--bg-panel)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      padding: '10px 14px',
      fontSize: 12,
      fontFamily: 'var(--font-mono)',
      minWidth: 150,
    }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ color: 'var(--text-primary)' }}>Cierre <strong>{fmt.price(d?.close)}</strong></div>
        {d?.rsi14  && <div style={{ color: 'var(--text-secondary)' }}>RSI {fmt.rsi(d.rsi14)}</div>}
        {d?.volume && <div style={{ color: 'var(--text-secondary)' }}>Vol {fmt.vol(d.volume)}</div>}
        {payload.filter(p => p.name !== 'close' && p.name !== 'volume').map(p => (
          <div key={p.name} style={{ color: p.stroke || 'var(--text-secondary)' }}>
            {p.name.toUpperCase()} {fmt.price(p.value)}
          </div>
        ))}
      </div>
    </div>
  )
}

function RSIChart({ data }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.08em' }}>
        RSI 14 — Sobrecompra {'>'} 70 · Sobreventa {'<'} 30
      </div>
      <ResponsiveContainer width="100%" height={100}>
        <ComposedChart data={data} margin={{ top: 0, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="fecha" hide />
          <YAxis domain={[0, 100]} tick={{ fill: '#3d5070', fontSize: 10 }} tickLine={false} axisLine={false} width={32} />
          <Tooltip content={() => null} />
          <ReferenceLine y={70} stroke="rgba(239,68,68,0.4)"  strokeDasharray="3 2" />
          <ReferenceLine y={30} stroke="rgba(34,197,94,0.4)"  strokeDasharray="3 2" />
          <ReferenceLine y={50} stroke="rgba(255,255,255,0.08)" />
          <Line type="monotone" dataKey="rsi14" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

function MACDChart({ data }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.08em' }}>
        MACD · Señal · Histograma
      </div>
      <ResponsiveContainer width="100%" height={100}>
        <ComposedChart data={data} margin={{ top: 0, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="fecha" hide />
          <YAxis tick={{ fill: '#3d5070', fontSize: 10 }} tickLine={false} axisLine={false} width={40} tickFormatter={v => v.toFixed(1)} />
          <Tooltip content={() => null} />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
          <Bar dataKey="macd_hist"
            fill="#3b82f6"
            opacity={0.6}
            maxBarSize={4}
          />
          <Line type="monotone" dataKey="macd"        stroke="#60a5fa" strokeWidth={1.5} dot={false} />
          <Line type="monotone" dataKey="macd_signal" stroke="#f59e0b" strokeWidth={1}   dot={false} strokeDasharray="3 2" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function Precios({ ticker }) {
  const [limite, setLimite] = useState(120)
  const [indicadores, setIndicadores] = useState(['sma20', 'bb_upper', 'bb_lower'])

  const { data, loading, error } = useApi(
    () => getPreciosLimpios(ticker, { limite }),
    [ticker, limite]
  )

  const chartData = useMemo(() =>
    (data || []).map(d => ({
      ...d,
      fecha: d.fecha?.slice(5),
      close: +Number(d.close).toFixed(2),
      rsi14: d.rsi14 ? +Number(d.rsi14).toFixed(2) : null,
      macd: d.macd ? +Number(d.macd).toFixed(3) : null,
      macd_signal: d.macd_signal ? +Number(d.macd_signal).toFixed(3) : null,
      macd_hist: d.macd_hist ? +Number(d.macd_hist).toFixed(3) : null,
    })),
    [data]
  )

  const lastRow = data?.at(-1)

  const toggleIndicador = (key) =>
    setIndicadores(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )

  return (
    <div className="col fade-in">
      {/* Controles */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {LIMITS.map(l => (
            <button
              key={l.value}
              className={`ticker-tab${limite === l.value ? ' active' : ''}`}
              onClick={() => setLimite(l.value)}
            >
              {l.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {INDICATOR_OPTS.map(opt => (
            <button
              key={opt.key}
              className="btn"
              style={indicadores.includes(opt.key)
                ? { borderColor: opt.color, color: opt.color, background: `${opt.color}15` }
                : {}}
              onClick={() => toggleIndicador(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Indicadores actuales */}
      {lastRow && (
        <div className="metrics-grid">
          {[
            { label: 'RSI 14', value: fmt.rsi(lastRow.rsi14),
              color: lastRow.rsi14 > 70 ? 'negative' : lastRow.rsi14 < 30 ? 'positive' : '' },
            { label: 'SMA 20',  value: fmt.price(lastRow.sma20) },
            { label: 'SMA 50',  value: fmt.price(lastRow.sma50) },
            { label: 'ATR 14',  value: fmt.num2(lastRow.atr14), sub: 'Volatilidad diaria' },
            { label: 'BB Width', value: fmt.num3(lastRow.bb_width), sub: 'Bandas Bollinger' },
            { label: 'VWAP',    value: fmt.price(lastRow.vwap), sub: '20d rolling' },
          ].map(m => (
            <div key={m.label} className="metric-card">
              <div className="metric-label">{m.label}</div>
              <div className={`metric-value ${m.color || 'neutral'}`}>{m.value}</div>
              {m.sub && <div className="metric-sub">{m.sub}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Gráfico de precios */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Precio + Indicadores · {ticker}</span>
          <span className="tag tag-blue">Datos R</span>
        </div>
        <div className="card-body" style={{ paddingTop: 8 }}>
          {loading
            ? <div className="skeleton" style={{ height: 280, borderRadius: 6 }} />
            : error
              ? <div className="empty-state">
                  <div className="empty-icon">⚠</div>
                  <div>{error}</div>
                </div>
              : (
                <>
                  <ResponsiveContainer width="100%" height={280}>
                    <ComposedChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="closeGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                      <XAxis
                        dataKey="fecha"
                        tick={{ fill: '#3d5070', fontSize: 10, fontFamily: 'DM Mono' }}
                        tickLine={false}
                        axisLine={false}
                        interval={Math.floor(chartData.length / 6)}
                      />
                      <YAxis
                        tick={{ fill: '#3d5070', fontSize: 10, fontFamily: 'DM Mono' }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={v => `$${v}`}
                        width={58}
                        domain={['auto', 'auto']}
                      />
                      <Tooltip content={<PriceTooltip />} />
                      {/* Precio principal */}
                      <Line type="monotone" dataKey="close" stroke="#3b82f6" strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} />
                      {/* Indicadores seleccionados */}
                      {INDICATOR_OPTS.filter(o => indicadores.includes(o.key)).map(opt => (
                        <Line
                          key={opt.key}
                          type="monotone"
                          dataKey={opt.key}
                          stroke={opt.color}
                          strokeWidth={1}
                          dot={false}
                          strokeDasharray={opt.key.startsWith('bb') ? '4 2' : undefined}
                        />
                      ))}
                    </ComposedChart>
                  </ResponsiveContainer>

                  {/* Subgráficos */}
                  <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <RSIChart  data={chartData} />
                    <MACDChart data={chartData} />
                  </div>
                </>
              )
          }
        </div>
      </div>
    </div>
  )
}
