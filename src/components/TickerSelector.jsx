// src/components/TickerSelector.jsx
import { useApi } from '../hooks/useApi'
import { getActivos } from '../services/api'

export default function TickerSelector({ selected, onChange }) {
  const { data: activos, loading } = useApi(getActivos)

  const DEFAULT = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA']
  const tickers = activos?.length ? activos.map(a => a.ticker) : DEFAULT

  return (
    <div className="ticker-tabs">
      {loading
        ? DEFAULT.map(t => (
            <button key={t} className="ticker-tab"
              style={{ width: 60, height: 28 }}
            >
              <span className="skeleton" style={{ width: '100%', height: 12, display: 'block' }}/>
            </button>
          ))
        : tickers.map(t => (
            <button
              key={t}
              className={`ticker-tab${selected === t ? ' active' : ''}`}
              onClick={() => onChange(t)}
            >
              {t}
            </button>
          ))
      }
    </div>
  )
}