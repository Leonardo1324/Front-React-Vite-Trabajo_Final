// src/pages/Señales.jsx
import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, CartesianGrid,
} from 'recharts'
import { useApi } from '../hooks/useApi'
import { getSeñales, getUltimaSeñal } from '../services/api'
import { fmt } from '../utils/format'

function ProbBar({ value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div className="prob-bar">
        <div
          className="prob-fill"
          style={{
            width: `${Math.round((value || 0) * 100)}%`,
            background: color,
          }}
        />
      </div>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 36, textAlign: 'right' }}>
        {((value || 0) * 100).toFixed(1)}%
      </span>
    </div>
  )
}

function UltimaSeñalCard({ ticker }) {
  const { data, loading } = useApi(() => getUltimaSeñal(ticker), [ticker])

  if (loading) return (
    <div className="card">
      <div className="card-body">
        <div className="skeleton" style={{ height: 80 }} />
      </div>
    </div>
  )

  if (!data) return (
    <div className="card">
      <div className="empty-state">Sin señal disponible</div>
    </div>
  )

  const { senal_texto, prob_compra, prob_hold, prob_venta, fecha } = data

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Señal más reciente</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmt.date(fecha)}</span>
      </div>
      <div className="card-body">
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
          <span className={`signal-badge ${senal_texto}`} style={{ fontSize: 16, padding: '8px 18px' }}>
            {senal_texto}
          </span>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {senal_texto === 'COMPRA'
              ? 'El modelo predice un alza mayor al 0.5% para el próximo día.'
              : senal_texto === 'VENTA'
              ? 'El modelo predice una caída mayor al 0.5% para el próximo día.'
              : 'El modelo no detecta señal direccional significativa.'}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 11, color: 'var(--green)', minWidth: 52 }}>COMPRA</span>
            <ProbBar value={prob_compra} color="var(--green)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 11, color: 'var(--amber)', minWidth: 52 }}>HOLD</span>
            <ProbBar value={prob_hold} color="var(--amber)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 11, color: 'var(--red)', minWidth: 52 }}>VENTA</span>
            <ProbBar value={prob_venta} color="var(--red)" />
          </div>
        </div>
      </div>
    </div>
  )
}

function DistribucionChart({ señales }) {
  const counts = useMemo(() => {
    const c = { COMPRA: 0, HOLD: 0, VENTA: 0 }
    señales.forEach(s => { if (c[s.senal_texto] !== undefined) c[s.senal_texto]++ })
    return [
      { name: 'COMPRA', value: c.COMPRA, color: 'var(--green)' },
      { name: 'HOLD',   value: c.HOLD,   color: 'var(--amber)' },
      { name: 'VENTA',  value: c.VENTA,  color: 'var(--red)'   },
    ]
  }, [señales])

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Distribución de Señales</span>
      </div>
      <div className="card-body">
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={counts} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: '#7a90b0', fontSize: 11, fontFamily: 'DM Mono' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: '#3d5070', fontSize: 10, fontFamily: 'DM Mono' }}
              tickLine={false}
              axisLine={false}
              width={30}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-panel)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                fontSize: 12,
                fontFamily: 'DM Mono',
              }}
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            />
            <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={48}>
              {counts.map((entry) => (
                <Cell key={entry.name} fill={entry.color} fillOpacity={0.75} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function TablaSeñales({ señales }) {
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Historial de Señales · XGBoost</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Últimas {señales.length}</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Señal</th>
              <th>P(Compra)</th>
              <th>P(Hold)</th>
              <th>P(Venta)</th>
            </tr>
          </thead>
          <tbody>
            {señales.slice().reverse().slice(0, 60).map((s, i) => (
              <tr key={i}>
                <td>{fmt.date(s.fecha)}</td>
                <td>
                  <span className={`signal-badge ${s.senal_texto}`}>
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
    </div>
  )
}

export default function Señales({ ticker }) {
  const { data: señales, loading, error } = useApi(
    () => getSeñales(ticker, { limite: 200 }),
    [ticker]
  )

  return (
    <div className="col fade-in">
      <UltimaSeñalCard ticker={ticker} />

      {loading && (
        <div className="skeleton" style={{ height: 200, borderRadius: 12 }} />
      )}

      {error && (
        <div className="empty-state">
          <div className="empty-icon">⚠</div>
          <div>Error cargando señales: {error}</div>
        </div>
      )}

      {señales && señales.length > 0 && (
        <>
          <DistribucionChart señales={señales} />
          <TablaSeñales señales={señales} />
        </>
      )}

      {señales && señales.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">◌</div>
          <div>Sin señales para {ticker}</div>
          <div style={{ fontSize: 11 }}>
            Ejecutá el pipeline completo desde la sección Modelo
          </div>
        </div>
      )}
    </div>
  )
}
