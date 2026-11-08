// src/services/api.js
const BASE = '/api'
const TOKEN_KEY = 'finpredict_token'

export const getToken = () =>
  typeof window !== 'undefined' ? window.localStorage.getItem(TOKEN_KEY) : null

export const setToken = (token) => {
  if (typeof window !== 'undefined' && token) {
    window.localStorage.setItem(TOKEN_KEY, token)
  }
}

export const clearToken = () => {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(TOKEN_KEY)
  }
}

async function request(path, options = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  }

  let res
  try {
    res = await fetch(`${BASE}${path}`, {
      ...options,
      headers,
    })
  } catch {
    throw new Error('Servidor Backend desconectado. Verificá que FastAPI esté activo (uvicorn main:app --reload).')
  }

  if (!res.ok) {
    if (res.status === 502 || res.status === 503 || res.status === 504) {
      throw new Error('Servidor Backend desconectado. Verificá que FastAPI esté activo (uvicorn main:app --reload).')
    }
    const err = await res.json().catch(() => ({ detail: null }))
    if (!err.detail && res.status === 500) {
      throw new Error('Servidor Backend desconectado o no disponible.')
    }
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

async function downloadFile(path, defaultFilename) {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `Error descargando archivo (HTTP ${res.status})`)
  }

  const blob = await res.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = defaultFilename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}

// ── Base & Pipeline ───────────────────────────────────────────────────────────
export const getHealth              = () => request('/')
export const getActivos             = () => request('/activos/')
export const getCatalogoMercado     = (p = {}) => { const q = new URLSearchParams(p).toString(); return request(`/activos/catalogo${q ? '?' + q : ''}`) }
export const getActivo              = (t) => request(`/activos/${t}`)
export const agregarActivo          = (ticker, inicio = null) =>
  request('/activos/agregar', {
    method: 'POST',
    body: JSON.stringify({ ticker, ...(inicio ? { inicio } : {}) }),
  })
export const eliminarActivo         = (ticker) =>
  request(`/activos/${encodeURIComponent(ticker)}`, { method: 'DELETE' })
export const getPreciosRaw          = (t, p = {}) => { const q = new URLSearchParams(p).toString(); return request(`/precios/${t}${q ? '?' + q : ''}`) }
export const getPreciosLimpios      = (t, p = {}) => { const q = new URLSearchParams(p).toString(); return request(`/precios/${t}/limpio${q ? '?' + q : ''}`) }
export const getComparacionActivos  = (p = {}) => { const q = new URLSearchParams(p).toString(); return request(`/precios/comparar/multi${q ? '?' + q : ''}`) }
export const getSeñales             = (t, p = {}) => { const q = new URLSearchParams(p).toString(); return request(`/senales/${t}${q ? '?' + q : ''}`) }
export const getUltimaSeñal         = (t) => request(`/senales/${t}/ultima`)
export const getMetricas            = (t, p = {}) => { const q = new URLSearchParams(p).toString(); return request(`/metricas/${t}${q ? '?' + q : ''}`) }
export const getAllMetricas          = () => request('/metricas/')
export const getEstadoModelo        = () => request('/modelo/estado')
export const lanzarEntrenamiento    = (b = {}) => request('/modelo/entrenar', { method: 'POST', body: JSON.stringify(b) })
export const lanzarPipelineCompleto = (b = {}) => request('/modelo/pipeline-completo', { method: 'POST', body: JSON.stringify(b) })
export const actualizarIngesta      = (b = {}) => request('/ingesta/actualizar', { method: 'POST', body: JSON.stringify(b) })

// ── Fase 1 (M2): Motor Predictivo Dual (XGBoost + Random Forest) y Horizontes ─
export const getDecisionManana      = (ticker) => request(`/senales/${ticker}/decision-manana`)
export const getHorizontes          = (ticker, algoritmo = 'xgb') =>
  request(`/senales/${ticker}/horizontes${algoritmo ? `?algoritmo=${encodeURIComponent(algoritmo)}` : ''}`)
export const compararModelos        = (ticker) => request(`/modelo/comparar/${ticker}`)

// ── Fase 2 (M3): Interpretabilidad con Valores SHAP ───────────────────────────
export const getShapCompleto        = (ticker) => request(`/shap/${ticker}`)
export const getShapGlobal          = (ticker) => request(`/shap/${ticker}/global`)
export const getShapLocal           = (ticker) => request(`/shap/${ticker}/local`)
export const getShapImagenUrl       = (ticker, tipo = 'global') => `${BASE}/shap/${ticker}/imagen/${tipo}`

// ── Fase 3 (M4): Reportes Descargables (PDF / CSV) ────────────────────────────
export const getReportePdfUrl       = (ticker) => `${BASE}/reportes/pdf/${ticker}`
export const getReporteCsvUrl       = (ticker) => `${BASE}/reportes/csv/${ticker}`
export const descargarReportePdf    = (ticker) => downloadFile(`/reportes/pdf/${ticker}`, `FinPredict_Reporte_${ticker}.pdf`)
export const descargarReporteCsv    = (ticker) => downloadFile(`/reportes/csv/${ticker}`, `FinPredict_Datos_${ticker}.csv`)

// ── Fase 4 (M1): Seguridad (JWT, RBAC y Auditoría) ────────────────────────────
export const loginUsuario           = async (username, password) => {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  const token = data?.access_token || data?.token
  if (token) setToken(token)
  return data
}
export const registrarUsuario       = (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) })
export const getPerfilActual        = () => request('/auth/me')
export const getRoles               = () => request('/auth/roles')
export const getUsuarios            = () => request('/auth/usuarios')
export const getAuditoria           = (p = {}) => { const q = new URLSearchParams(p).toString(); return request(`/auth/auditoria${q ? '?' + q : ''}`) }
export const getSoloAdmin           = () => request('/auth/solo-admin')
