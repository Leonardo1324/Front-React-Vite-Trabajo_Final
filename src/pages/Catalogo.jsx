// src/pages/Catalogo.jsx
import { useState, useEffect, useCallback } from 'react'
import { getCatalogoMercado, agregarActivo, eliminarActivo } from '../services/api'

const CATEGORIAS_DEFAULT = [
  'Todas',
  'Tecnología & IA',
  'Argentina & LatAm',
  'Finanzas & Bancos',
  'Consumo, Salud & Energía',
  'ETFs, Índices & Cripto',
]

export default function Catalogo({ user, onSelectTicker }) {
  const [categoria, setCategoria] = useState('Todas')
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos') // 'todos' | 'instalados' | 'disponibles'
  const [items, setItems] = useState([])
  const [categorias, setCategorias] = useState(CATEGORIAS_DEFAULT)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [procesandoTicker, setProcesandoTicker] = useState(null)
  const [feedback, setFeedback] = useState(null)

  const esAdmin = user?.rol === 'ADMIN'

  const cargarCatalogo = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {}
      if (categoria && categoria !== 'Todas') params.categoria = categoria
      if (busqueda.trim()) params.q = busqueda.trim()
      const res = await getCatalogoMercado(params)
      setItems(res?.activos || [])
      if (res?.categorias?.length) setCategorias(res.categorias)
    } catch (err) {
      setError(err.message || 'No se pudo cargar el catálogo de activos')
    } finally {
      setLoading(false)
    }
  }, [categoria, busqueda])

  useEffect(() => {
    const timer = setTimeout(() => {
      cargarCatalogo()
    }, 220)
    return () => clearTimeout(timer)
  }, [cargarCatalogo])

  const handleIncorporar = async (ticker, nombre) => {
    setProcesandoTicker(ticker)
    setFeedback(null)
    try {
      const res = await agregarActivo(ticker)
      setFeedback({
        type: 'ok',
        text: `✓ ${nombre} (${ticker}) incorporado con éxito: ${res.registros_ohlcv} ruedas OHLCV, 14 indicadores calculados y señal XGBoost actual = ${res.ultima_senal_xgboost}.`,
      })
      window.dispatchEvent(new Event('finpredict:activos-updated'))
      await cargarCatalogo()
    } catch (err) {
      setFeedback({
        type: 'error',
        text: `Error al incorporar ${ticker}: ${err.message}`,
      })
    } finally {
      setProcesandoTicker(null)
    }
  }

  const handleEliminar = async (ticker) => {
    setProcesandoTicker(ticker)
    setFeedback(null)
    try {
      const res = await eliminarActivo(ticker)
      setFeedback({ type: 'ok', text: res.mensaje })
      window.dispatchEvent(new Event('finpredict:activos-updated'))
      await cargarCatalogo()
    } catch (err) {
      setFeedback({ type: 'error', text: err.message })
    } finally {
      setProcesandoTicker(null)
    }
  }

  const itemsFiltrados = items.filter(item => {
    if (filtroEstado === 'instalados') return item.instalado
    if (filtroEstado === 'disponibles') return !item.instalado
    return true
  })

  const totalInstalados = items.filter(i => i.instalado).length

  return (
    <div className="col fade-in">
      {/* Encabezado y Buscador por Nombre o Sector */}
      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div>
            <span className="card-title">🌎 Catálogo Explorador de Activos (Yahoo Finance)</span>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              Explorá acciones globales, ADRs argentinos, bancos, ETFs y criptoactivos por nombre o sector sin necesidad de recordar su código
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <span className="tag tag-green">{totalInstalados} activos en tu sistema</span>
            <span className="tag tag-blue">{items.length} en catálogo</span>
          </div>
        </div>

        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {feedback && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 6,
              fontSize: 12,
              background: feedback.type === 'ok' ? 'var(--green-muted)' : 'var(--red-muted)',
              color: feedback.type === 'ok' ? 'var(--green)' : 'var(--red)',
              border: `1px solid ${feedback.type === 'ok' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
            }}>
              {feedback.text}
            </div>
          )}

          {/* Barra de búsqueda + Filtro de estado */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="🔍 Buscar por nombre de empresa, sector o rubro (ej: MercadoLibre, Galicia, Coca-Cola, Bancos, Petróleo, Bitcoin)…"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              style={{
                flex: 1,
                minWidth: 260,
                background: 'var(--bg-base)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '9px 14px',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: 12.5,
              }}
            />

            {busqueda && (
              <button
                type="button"
                className="btn"
                onClick={() => setBusqueda('')}
              >
                ✕ Limpiar
              </button>
            )}

            <div className="theme-switcher" role="group">
              <button
                type="button"
                className={`theme-option${filtroEstado === 'todos' ? ' active' : ''}`}
                onClick={() => setFiltroEstado('todos')}
              >
                Todos
              </button>
              <button
                type="button"
                className={`theme-option${filtroEstado === 'instalados' ? ' active' : ''}`}
                onClick={() => setFiltroEstado('instalados')}
              >
                Instalados
              </button>
              <button
                type="button"
                className={`theme-option${filtroEstado === 'disponibles' ? ' active' : ''}`}
                onClick={() => setFiltroEstado('disponibles')}
              >
                Por Agregar
              </button>
            </div>
          </div>

          {/* Pestañas de Categorías / Sectores */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            {categorias.map(cat => (
              <button
                key={cat}
                type="button"
                className={`ticker-tab${categoria === cat ? ' active' : ''}`}
                onClick={() => setCategoria(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grilla de Tarjetas de Activos */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 12 }}>
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card" style={{ padding: 16 }}>
              <div className="skeleton" style={{ height: 95, borderRadius: 6 }} />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="card">
          <div className="empty-state" style={{ padding: 32 }}>
            <div className="empty-icon">⚠</div>
            <div style={{ color: 'var(--red)', fontWeight: 600 }}>{error}</div>
            <button type="button" className="btn" style={{ marginTop: 10 }} onClick={cargarCatalogo}>
              ↻ Reintentar
            </button>
          </div>
        </div>
      ) : itemsFiltrados.length === 0 ? (
        <div className="card">
          <div className="empty-state" style={{ padding: 32 }}>
            <div>No se encontraron activos que coincidan con "{busqueda}"</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {itemsFiltrados.map(item => {
            const enProceso = procesandoTicker === item.ticker
            return (
              <div
                key={item.ticker}
                className="card"
                style={{
                  borderLeft: item.instalado ? '4px solid var(--green)' : '4px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          fontFamily: 'var(--font-display)',
                          fontWeight: 800,
                          fontSize: 17,
                          color: 'var(--text-primary)',
                        }}>
                          {item.ticker}
                        </span>
                        <span className="tag tag-blue" style={{ fontSize: 10 }}>
                          {item.sector}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 3 }}>
                        {item.nombre}
                      </div>
                    </div>

                    <span className={`tag ${item.instalado ? 'tag-green' : 'tag-amber'}`} style={{ fontSize: 10 }}>
                      {item.instalado ? '✓ Instalado' : 'Disponible'}
                    </span>
                  </div>

                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Categoría: {item.categoria} · Moneda: {item.moneda || 'USD'}
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: 8,
                    marginTop: 6,
                    paddingTop: 10,
                    borderTop: '1px solid var(--border)',
                  }}>
                    {item.instalado ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ flex: 1, justifyContent: 'center', fontSize: 11.5 }}
                          onClick={() => onSelectTicker?.(item.ticker)}
                        >
                          📊 Ver Análisis de {item.ticker}
                        </button>
                        {esAdmin && (
                          <button
                            type="button"
                            className="btn"
                            disabled={enProceso}
                            onClick={() => handleEliminar(item.ticker)}
                            style={{ fontSize: 11, color: 'var(--red)', padding: '5px 10px' }}
                            title="Quitar del sistema"
                          >
                            {enProceso ? '…' : 'Quitar'}
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        type="button"
                        className="btn"
                        disabled={enProceso}
                        onClick={() => handleIncorporar(item.ticker, item.nombre)}
                        style={{
                          flex: 1,
                          justifyContent: 'center',
                          fontSize: 11.5,
                          borderColor: 'var(--accent)',
                          color: 'var(--accent)',
                        }}
                      >
                        {enProceso
                          ? `⏳ Descargando ${item.ticker}…`
                          : `➕ Incorporar ${item.ticker} al Sistema`}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
