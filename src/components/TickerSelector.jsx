// src/components/TickerSelector.jsx
import { useEffect } from 'react'
import { useApi } from '../hooks/useApi'
import { getActivos } from '../services/api'

export default function TickerSelector({ selected, onChange }) {
  const { data: activos, loading, refetch } = useApi(getActivos)

  useEffect(() => {
    const handler = () => refetch()
    window.addEventListener('finpredict:activos-updated', handler)
    return () => window.removeEventListener('finpredict:activos-updated', handler)
  }, [refetch])

  const DEFAULT = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA']
  const tickers = activos?.length ? activos.map(a => a.ticker) : DEFAULT
  const currentValue = tickers.includes(selected) ? selected : (tickers[0] ?? '')

  return (
    <div className="ticker-dropdown">
      <select
        className="ticker-select"
        value={currentValue}
        onChange={(event) => onChange(event.target.value)}
        disabled={loading}
      >
        {loading ? (
          <option value="">Cargando...</option>
        ) : (
          tickers.map(t => (
            <option key={t} value={t}>
              {t}
            </option>
          ))
        )}
      </select>
    </div>
  )
}
