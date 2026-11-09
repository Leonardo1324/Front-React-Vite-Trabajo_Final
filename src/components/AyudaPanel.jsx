// src/components/AyudaPanel.jsx
import { useState, useEffect } from 'react'
import { explicarPantalla, getEstadoAyuda, configurarGeminiKey } from '../services/api'

const PREGUNTAS_SUGERIDAS = {
  dashboard: [
    '¿Qué significa cada tarjeta superior (KPI) en este resumen?',
    '¿Cómo se leen las barras de probabilidad del modelo XGBoost?',
    '¿Qué diferencia hay entre las líneas SMA 20 y SMA 50 del gráfico?',
  ],
  precios: [
    '¿Qué significa el valor actual del indicador RSI 14?',
    '¿Cómo se lee el panel de MACD y su histograma?',
    '¿Qué describen las Bandas de Bollinger sobre la volatilidad?',
  ],
  comparar: [
    '¿Qué significa comparar en Modo Rendimiento Base 100 (%)?',
    '¿Cómo interpretar la tabla comparativa inferior?',
  ],
  catalogo: [
    '¿Qué ocurre internamente cuando incorporo un activo nuevo?',
    '¿De dónde provienen los precios e indicadores del catálogo?',
  ],
  señales: [
    '¿Qué significan las etiquetas COMPRAR, HOLD y VENDER en el modelo?',
    '¿Por qué el modelo evalúa 4 horizontes (1d, 5d, 15d y 30d)?',
    '¿Cómo se calcula el porcentaje de confianza de cada horizonte?',
  ],
  shap: [
    '¿Qué es TreeSHAP y para qué sirve en este sistema?',
    '¿Cómo se leen las barras positivas (+) y negativas (−) del gráfico local?',
    '¿Qué diferencia hay entre Importancia Global y Explicación Local?',
  ],
  metricas: [
    '¿Qué significan Sharpe Ratio y Max Drawdown en esta pantalla?',
    '¿Qué compara el Retorno de la Estrategia frente a Buy & Hold?',
    '¿Qué miden el F1-Score y el Win Rate del clasificador?',
  ],
  modelo: [
    '¿Qué hace cada hiperparámetro de XGBoost en esta pantalla?',
    '¿Qué diferencia hay entre Actualizar Ingesta y Re-entrenar?',
  ],
  seguridad: [
    '¿Qué diferencia de permisos hay entre ADMIN y un usuario estándar?',
    '¿Qué registra la bitácora de auditoría?',
  ],
}

const NOMBRES_PANTALLA = {
  dashboard: 'Dashboard Principal',
  catalogo:  'Catálogo de Activos',
  precios:   'Precios e Indicadores Técnicos',
  comparar:  'Comparador Multi-Activo',
  señales:   'Señales ML · XGBoost',
  shap:      'Explicabilidad TreeSHAP',
  metricas:  'Métricas de Backtesting',
  modelo:    'Motor XGBoost (Admin)',
  seguridad: 'Usuarios y Auditoría (Admin)',
}

const VISTAS_CON_TICKER_UNICO = new Set(['dashboard', 'precios', 'señales', 'shap', 'metricas'])

// Formateador de markdown básico con alto contraste para lectura cómoda
function renderizarTextoPedagogico(texto) {
  if (!texto) return null
  // Limpiar combinaciones **`texto`** -> **texto** para evitar backticks residuales
  const textoLimpio = texto.replace(/\*\*`([^`]+)`\*\*/g, '**$1**')
  const lineas = textoLimpio.split('\n')

  const formatearInline = (str) => {
    const partes = str.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g)
    return partes.map((parte, idx) => {
      if (parte.startsWith('**') && parte.endsWith('**')) {
        return (
          <strong key={idx} style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
            {parte.slice(2, -2)}
          </strong>
        )
      }
      if (parte.startsWith('`') && parte.endsWith('`')) {
        return (
          <code
            key={idx}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              background: 'var(--accent-glow)',
              color: 'var(--accent)',
              padding: '2px 6px',
              borderRadius: 4,
              border: '1px solid var(--border-accent)',
            }}
          >
            {parte.slice(1, -1)}
          </code>
        )
      }
      if (parte.startsWith('*') && parte.endsWith('*')) {
        return <em key={idx} style={{ color: 'var(--text-secondary)' }}>{parte.slice(1, -1)}</em>
      }
      return parte
    })
  }

  return lineas.map((linea, i) => {
    const trim = linea.trim()
    if (!trim) return <div key={i} style={{ height: 10 }} />

    if (trim.startsWith('### ') || trim.startsWith('## ')) {
      return (
        <div
          key={i}
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginTop: i === 0 ? 0 : 14,
            marginBottom: 10,
            paddingBottom: 8,
            borderBottom: '1px solid var(--border)',
            lineHeight: 1.4,
          }}
        >
          {formatearInline(trim.replace(/^#{2,3}\s+/, ''))}
        </div>
      )
    }

    if (trim.startsWith('- ') || trim.startsWith('* ') || /^\d+\.\s/.test(trim)) {
      const contenido = trim.replace(/^(-|\*|\d+\.)\s+/, '')
      return (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            marginBottom: 12,
            paddingLeft: 4,
            lineHeight: 1.65,
            color: 'var(--text-primary)',
            wordBreak: 'break-word',
          }}
        >
          <span style={{ color: 'var(--accent)', fontWeight: 800, fontSize: 15, lineHeight: 1.4, flexShrink: 0 }}>•</span>
          <div style={{ flex: 1, minWidth: 0 }}>{formatearInline(contenido)}</div>
        </div>
      )
    }

    return (
      <p key={i} style={{ margin: '0 0 12px 0', lineHeight: 1.68, color: 'var(--text-primary)', wordBreak: 'break-word' }}>
        {formatearInline(trim)}
      </p>
    )
  })
}

export default function AyudaPanel({ activePage, ticker }) {
  const [abierto, setAbierto] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [respuesta, setRespuesta] = useState(null)
  const [preguntaUsuario, setPreguntaUsuario] = useState('')
  const [preguntaActiva, setPreguntaActiva] = useState(null)
  const [error, setError] = useState(null)

  // Estado de configuración de Google Gemini API
  const [geminiActivo, setGeminiActivo] = useState(false)
  const [mostrarConfigKey, setMostrarConfigKey] = useState(false)
  const [inputApiKey, setInputApiKey] = useState('')
  const [guardandoKey, setGuardandoKey] = useState(false)
  const [mensajeKey, setMensajeKey] = useState(null)

  const consultarAyuda = async (preguntaEspecifica = null) => {
    setCargando(true)
    setError(null)
    setPreguntaActiva(preguntaEspecifica)
    try {
      const res = await explicarPantalla({
        vista: activePage,
        ticker: ticker || 'AAPL',
        pregunta: preguntaEspecifica,
      })
      setRespuesta(res)
      if (res?.origen === 'gemini' || res?.gemini_configurado) {
        setGeminiActivo(true)
      }
    } catch (e) {
      setError(e.message || 'No se pudo obtener la explicación de la pantalla.')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    if (!abierto) return
    getEstadoAyuda()
      .then(st => setGeminiActivo(Boolean(st?.gemini_configurado)))
      .catch(() => {})
    consultarAyuda(null)
  }, [abierto, activePage, ticker])

  const handleEnviarPregunta = (e) => {
    e.preventDefault()
    const limpia = preguntaUsuario.trim()
    if (!limpia || cargando) return
    setPreguntaUsuario('')
    consultarAyuda(limpia)
  }

  const handleGuardarKey = async (e) => {
    e.preventDefault()
    const limpia = inputApiKey.trim()
    if (!limpia) return
    setGuardandoKey(true)
    setMensajeKey(null)
    try {
      await configurarGeminiKey(limpia)
      setGeminiActivo(true)
      setInputApiKey('')
      setMostrarConfigKey(false)
      setMensajeKey('✓ Google Gemini API activada correctamente.')
      consultarAyuda(preguntaActiva)
    } catch (err) {
      setMensajeKey(`⚠ ${err.message}`)
    } finally {
      setGuardandoKey(false)
    }
  }

  const sugerencias = PREGUNTAS_SUGERIDAS[activePage] || PREGUNTAS_SUGERIDAS.dashboard
  const datosCtx = respuesta?.datos_contexto || {}
  const mostrarMiniResumen = VISTAS_CON_TICKER_UNICO.has(activePage) && datosCtx.precio_cierre !== undefined

  return (
    <>
      {/* Botón flotante sólido y bien visible (solo cuando el panel está cerrado) */}
      {!abierto && (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          title="Abrir Ayuda descriptiva sobre lo que se ve en pantalla"
          style={{
            position: 'fixed',
            right: 28,
            bottom: 28,
            zIndex: 1050,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 22px',
            borderRadius: 999,
            border: '2px solid #60a5fa',
            background: '#2563eb',
            color: '#ffffff',
            boxShadow: '0 10px 28px rgba(37, 99, 235, 0.55)',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: '0.02em',
            cursor: 'pointer',
          }}
        >
          <span
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: '#ffffff',
              color: '#1d4ed8',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 900,
            }}
          >
            ?
          </span>
          <span>Ayuda de Pantalla</span>
        </button>
      )}

      {/* Fondo oscurecido semitransparente + Panel lateral 100% sólido y opaco */}
      {abierto && (
        <>
          <div
            onClick={() => setAbierto(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1090,
              background: 'rgba(4, 8, 16, 0.55)',
              backdropFilter: 'blur(2px)',
            }}
          />

          <aside
            aria-label="Panel de Ayuda Descriptiva"
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: 'min(500px, 95vw)',
              zIndex: 1100,
              background: 'var(--bg-panel)',
              borderLeft: '2px solid var(--border-accent)',
              boxShadow: '-16px 0 48px rgba(0, 0, 0, 0.75)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Cabecera sólida del panel de Ayuda (no se encoge) */}
            <div
              style={{
                flexShrink: 0,
                padding: '16px 20px',
                background: 'var(--bg-card)',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      fontSize: 16,
                      color: 'var(--text-primary)',
                    }}
                  >
                    📘 Ayuda · Guía de Pantalla
                  </span>
                  <span
                    className={`tag ${respuesta?.origen === 'gemini' ? 'tag-green' : 'tag-blue'}`}
                    style={{ fontSize: 10.5, padding: '3px 8px' }}
                  >
                    {respuesta?.origen === 'gemini' ? '✨ Gemini Flash' : 'Guía Descriptiva'}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                  Ventana: <strong style={{ color: 'var(--text-primary)' }}>{NOMBRES_PANTALLA[activePage] || activePage}</strong>
                  {VISTAS_CON_TICKER_UNICO.has(activePage) && (
                    <> · Activo: <strong style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{ticker}</strong></>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <button
                  type="button"
                  className="btn"
                  style={{ fontSize: 11, padding: '6px 10px', background: 'var(--bg-hover)' }}
                  onClick={() => setMostrarConfigKey(prev => !prev)}
                  title="Configurar API Key de Google Gemini"
                >
                  🔑 {geminiActivo ? 'API Key' : 'Conectar Gemini'}
                </button>
                <button
                  type="button"
                  onClick={() => setAbierto(false)}
                  title="Cerrar panel de Ayuda"
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--border-accent)',
                    background: 'var(--bg-hover)',
                    color: 'var(--text-primary)',
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  ✕ Cerrar
                </button>
              </div>
            </div>

            {/* Cinta de postura estrictamente descriptiva */}
            <div
              style={{
                flexShrink: 0,
                padding: '10px 20px',
                background: 'var(--bg-base)',
                borderBottom: '1px solid var(--border)',
                fontSize: 12,
                color: 'var(--text-secondary)',
                lineHeight: 1.45,
              }}
            >
              Explicación <strong style={{ color: 'var(--text-primary)' }}>pedagógica y 100% descriptiva</strong> de lo que se observa en pantalla. No constituye sugerencia ni consejo financiero.
            </div>

            {/* Formulario desplegable opcional para configurar GEMINI_API_KEY */}
            {mostrarConfigKey && (
              <form
                onSubmit={handleGuardarKey}
                style={{
                  flexShrink: 0,
                  padding: '14px 20px',
                  background: 'var(--bg-card)',
                  borderBottom: '1px solid var(--border-accent)',
                }}
              >
                <div style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.45, marginBottom: 8 }}>
                  Pegá tu <strong>GEMINI_API_KEY</strong> (de Google AI Studio) para generar las explicaciones con <code>gemini-2.5-flash</code>:
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="password"
                    value={inputApiKey}
                    onChange={e => setInputApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--border-accent)',
                      background: 'var(--bg-base)',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                    }}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={guardandoKey || !inputApiKey.trim()}
                    style={{ fontSize: 12, padding: '8px 14px' }}
                  >
                    {guardandoKey ? 'Guardando…' : 'Guardar'}
                  </button>
                </div>
                {mensajeKey && (
                  <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--accent)', marginTop: 6 }}>
                    {mensajeKey}
                  </div>
                )}
              </form>
            )}

            {/* Cuerpo desplazable en flujo de bloque normal (display: block) para que ninguna caja se encoja ni desborde */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                padding: '18px 20px',
                background: 'var(--bg-panel)',
                display: 'block',
              }}
            >
              {/* Resumen rápido de valores leídos de la pantalla actual (solo en vistas de activo individual) */}
              {mostrarMiniResumen && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 10,
                    padding: '12px 14px',
                    marginBottom: 16,
                    borderRadius: 10,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 11 }}>Cierre ({datosCtx.ticker})</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                      ${datosCtx.precio_cierre}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 11 }}>RSI 14</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                      {datosCtx.rsi_14 ?? '—'}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 11 }}>Clase XGBoost</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--accent)', marginTop: 2 }}>
                      {datosCtx.ultima_clasificacion_xgboost ?? '—'}
                    </div>
                  </div>
                </div>
              )}

              {/* Tarjeta principal con el texto explicativo de altura auto-ajustable */}
              <div
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-accent)',
                  borderRadius: 12,
                  padding: '18px',
                  marginBottom: 20,
                  fontSize: 13.5,
                  color: 'var(--text-primary)',
                  height: 'auto',
                  overflow: 'visible',
                }}
              >
                {cargando ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 12,
                      padding: '36px 16px',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 13,
                      textAlign: 'center',
                    }}
                  >
                    <div className="spinner" />
                    <span>Generando explicación descriptiva de la pantalla…</span>
                  </div>
                ) : error ? (
                  <div style={{ color: 'var(--red)', fontSize: 13 }}>
                    ⚠ {error}
                  </div>
                ) : (
                  renderizarTextoPedagogico(respuesta?.explicacion)
                )}
              </div>

              {/* Botones rápidos de consultas frecuentes sobre esta ventana */}
              <div style={{ paddingBottom: 8 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--text-secondary)',
                    marginBottom: 10,
                    fontWeight: 700,
                  }}
                >
                  Preguntas frecuentes sobre esta ventana
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {sugerencias.map((preg, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={cargando}
                      onClick={() => consultarAyuda(preg)}
                      style={{
                        textAlign: 'left',
                        padding: '11px 14px',
                        borderRadius: 8,
                        border: preguntaActiva === preg
                          ? '1px solid var(--accent)'
                          : '1px solid var(--border)',
                        background: preguntaActiva === preg
                          ? 'var(--bg-hover)'
                          : 'var(--bg-card)',
                        color: 'var(--text-primary)',
                        fontSize: 12.5,
                        lineHeight: 1.45,
                        cursor: cargando ? 'wait' : 'pointer',
                      }}
                    >
                      💬 {preg}
                    </button>
                  ))}
                  {preguntaActiva && (
                    <button
                      type="button"
                      disabled={cargando}
                      onClick={() => consultarAyuda(null)}
                      className="btn"
                      style={{ fontSize: 12, padding: '8px 12px', alignSelf: 'flex-start', marginTop: 4 }}
                    >
                      ↺ Volver a la explicación general de esta pantalla
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Barra inferior sólida para escribir una duda puntual sobre lo que se ve en pantalla */}
            <form
              onSubmit={handleEnviarPregunta}
              style={{
                flexShrink: 0,
                padding: '14px 20px',
                background: 'var(--bg-card)',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                gap: 10,
              }}
            >
              <input
                type="text"
                value={preguntaUsuario}
                onChange={e => setPreguntaUsuario(e.target.value)}
                disabled={cargando}
                placeholder="Preguntá qué significa cualquier dato en pantalla…"
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--border-accent)',
                  background: 'var(--bg-base)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                }}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={cargando || !preguntaUsuario.trim()}
                style={{ fontSize: 13, padding: '10px 18px', fontWeight: 700 }}
              >
                Consultar
              </button>
            </form>
          </aside>
        </>
      )}
    </>
  )
}
