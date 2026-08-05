const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export const getHealth            = () => request('/')
export const getActivos           = () => request('/activos/')
export const getActivo            = (t) => request(`/activos/${t}`)
export const getPreciosRaw        = (t, p={}) => { const q=new URLSearchParams(p).toString(); return request(`/precios/${t}${q?'?'+q:''}`) }
export const getPreciosLimpios    = (t, p={}) => { const q=new URLSearchParams(p).toString(); return request(`/precios/${t}/limpio${q?'?'+q:''}`) }
export const getSeñales           = (t, p={}) => { const q=new URLSearchParams(p).toString(); return request(`/senales/${t}${q?'?'+q:''}`) }
export const getUltimaSeñal       = (t) => request(`/senales/${t}/ultima`)
export const getMetricas          = (t) => request(`/metricas/${t}`)
export const getAllMetricas        = () => request('/metricas/')
export const getEstadoModelo      = () => request('/modelo/estado')
export const lanzarEntrenamiento  = (b={}) => request('/modelo/entrenar', { method:'POST', body:JSON.stringify(b) })
export const lanzarPipelineCompleto = (b={}) => request('/modelo/pipeline-completo', { method:'POST', body:JSON.stringify(b) })
export const actualizarIngesta    = (b={}) => request('/ingesta/actualizar', { method:'POST', body:JSON.stringify(b) })