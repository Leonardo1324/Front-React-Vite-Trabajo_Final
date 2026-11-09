// src/pages/Seguridad.jsx
import { useState, useEffect, useCallback } from 'react'
import {
  loginUsuario,
  registrarUsuario,
  getPerfilActual,
  getRoles,
  getUsuarios,
  getAuditoria,
  getSoloAdmin,
  clearToken,
} from '../services/api'

const ROLE_COLORS = {
  ADMIN:    'tag-red',
  TRADER:   'tag-green',
  ANALISTA: 'tag-blue',
  VIEWER:   'tag-amber',
}

export default function Seguridad({ user, onAuthChange }) {
  // Login state
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authMsg, setAuthMsg] = useState(null)

  // Registro state
  const [regData, setRegData] = useState({
    username: '',
    email: '',
    password: '',
    rol: 'ANALISTA',
  })
  const [regLoading, setRegLoading] = useState(false)

  // Datos de RBAC y Auditoría
  const [roles, setRoles] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [auditoria, setAuditoria] = useState([])
  const [loadingTablas, setLoadingTablas] = useState(false)
  const [adminCheckMsg, setAdminCheckMsg] = useState(null)

  const cargarDatosSeguridad = useCallback(async () => {
    setLoadingTablas(true)
    try {
      const [rRes, uRes, aRes] = await Promise.allSettled([
        getRoles(),
        getUsuarios(),
        getAuditoria({ limite: 60 }),
      ])
      if (rRes.status === 'fulfilled') {
        const list = Array.isArray(rRes.value) ? rRes.value : rRes.value?.roles || []
        setRoles(list)
      }
      if (uRes.status === 'fulfilled') {
        const list = Array.isArray(uRes.value) ? uRes.value : uRes.value?.usuarios || []
        setUsuarios(list)
      }
      if (aRes.status === 'fulfilled') {
        const list = Array.isArray(aRes.value) ? aRes.value : aRes.value?.logs || aRes.value?.auditoria || []
        setAuditoria(list)
      }
    } finally {
      setLoadingTablas(false)
    }
  }, [])

  useEffect(() => {
    cargarDatosSeguridad()
  }, [cargarDatosSeguridad, user])

  const handleLogin = async (e, quickUser, quickPass) => {
    if (e) e.preventDefault()
    const u = quickUser ?? username
    const p = quickPass ?? password
    if (!u || !p) return

    setAuthLoading(true)
    setAuthMsg(null)
    try {
      const res = await loginUsuario(u, p)
      let perfil = res?.usuario || res?.user
      if (!perfil) {
        perfil = await getPerfilActual().catch(() => ({
          username: u,
          rol: res?.rol || (u === 'admin' ? 'ADMIN' : 'TRADER'),
        }))
      }
      onAuthChange?.(perfil)
      setAuthMsg({ type: 'ok', text: `Sesión iniciada como ${perfil.username} (${perfil.rol})` })
      setUsername('')
      setPassword('')
      cargarDatosSeguridad()
    } catch (err) {
      setAuthMsg({ type: 'error', text: err.message })
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = () => {
    clearToken()
    onAuthChange?.(null)
    setAdminCheckMsg(null)
    setAuthMsg({ type: 'ok', text: 'Sesión cerrada correctamente' })
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!regData.username || !regData.password) return
    setRegLoading(true)
    setAuthMsg(null)
    try {
      await registrarUsuario(regData)
      setAuthMsg({ type: 'ok', text: `Usuario "${regData.username}" registrado con rol ${regData.rol}` })
      setRegData({ username: '', email: '', password: '', rol: 'ANALISTA' })
      cargarDatosSeguridad()
    } catch (err) {
      setAuthMsg({ type: 'error', text: err.message })
    } finally {
      setRegLoading(false)
    }
  }

  const probarEndpointAdmin = async () => {
    setAdminCheckMsg(null)
    try {
      const res = await getSoloAdmin()
      setAdminCheckMsg({
        type: 'ok',
        text: res?.mensaje || res?.detail || 'Acceso RBAC ADMIN verificado correctamente (HTTP 200)',
      })
      cargarDatosSeguridad()
    } catch (err) {
      setAdminCheckMsg({
        type: 'error',
        text: `Acceso denegado por RBAC: ${err.message}`,
      })
      cargarDatosSeguridad()
    }
  }

  const inputStyle = {
    background: 'var(--bg-base)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '8px 12px',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    width: '100%',
  }

  return (
    <div className="col fade-in">
      {/* Banner de mensaje */}
      {authMsg && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            fontSize: 12,
            background: authMsg.type === 'ok' ? 'var(--green-muted)' : 'var(--red-muted)',
            color: authMsg.type === 'ok' ? 'var(--green)' : 'var(--red)',
            border: `1px solid ${authMsg.type === 'ok' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          }}
        >
          {authMsg.type === 'ok' ? '✓ ' : '✗ '}
          {authMsg.text}
        </div>
      )}

      <div className="row" style={{ alignItems: 'stretch' }}>
        {/* 1. Panel de Sesión JWT y Login Rápido */}
        <div className="card" style={{ flex: 1 }}>
          <div className="card-header">
            <span className="card-title">Autenticación JWT (RFC 7519 · HS256)</span>
            <span className={`tag ${user ? ROLE_COLORS[user.rol] || 'tag-blue' : 'tag-amber'}`}>
              {user ? `ACTIVO: ${user.rol}` : 'SIN SESIÓN'}
            </span>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {user ? (
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>USUARIO AUTENTICADO</div>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                      {user.username}
                    </div>
                    {user.email && (
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{user.email}</div>
                    )}
                  </div>
                  <span className={`tag ${ROLE_COLORS[user.rol] || 'tag-blue'}`} style={{ fontSize: 12, padding: '4px 12px' }}>
                    Rol: {user.rol}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                  <button type="button" className="btn" onClick={probarEndpointAdmin}>
                    🛡 Verificar /auth/solo-admin
                  </button>
                  <button type="button" className="btn btn-danger" onClick={handleLogout}>
                    Cerrar sesión
                  </button>
                </div>

                {adminCheckMsg && (
                  <div style={{
                    fontSize: 11,
                    padding: '8px 10px',
                    borderRadius: 6,
                    background: adminCheckMsg.type === 'ok' ? 'var(--green-muted)' : 'var(--red-muted)',
                    color: adminCheckMsg.type === 'ok' ? 'var(--green)' : 'var(--red)',
                  }}>
                    {adminCheckMsg.text}
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                    Usuario
                  </label>
                  <input
                    style={inputStyle}
                    type="text"
                    placeholder="admin o trader"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                    Contraseña (PBKDF2-HMAC-SHA256)
                  </label>
                  <input
                    style={inputStyle}
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={authLoading}>
                  {authLoading ? 'Autenticando…' : 'Iniciar Sesión JWT'}
                </button>
              </form>
            )}

            {/* Botones rápidos de semilla por defecto */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                Cuentas semilla de prueba rápida:
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn"
                  disabled={authLoading}
                  onClick={() => handleLogin(null, 'admin', 'admin123')}
                >
                  ⚡ Login Admin (admin / admin123)
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={authLoading}
                  onClick={() => handleLogin(null, 'trader', 'trader123')}
                >
                  ⚡ Login Trader (trader / trader123)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Registro de Nuevos Usuarios con RBAC */}
        <div className="card" style={{ flex: 1 }}>
          <div className="card-header">
            <span className="card-title">Alta de Usuarios y Asignación de Rol (RBAC)</span>
            <span className="tag tag-blue">POST /auth/register</span>
          </div>
          <div className="card-body">
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                    Username
                  </label>
                  <input
                    style={inputStyle}
                    type="text"
                    placeholder="ej. analista1"
                    value={regData.username}
                    onChange={e => setRegData({ ...regData, username: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                    Rol RBAC
                  </label>
                  <select
                    style={inputStyle}
                    value={regData.rol}
                    onChange={e => setRegData({ ...regData, rol: e.target.value })}
                  >
                    {(roles.length > 0 ? roles : [
                      { nombre: 'ADMIN' },
                      { nombre: 'TRADER' },
                      { nombre: 'ANALISTA' },
                      { nombre: 'VIEWER' },
                    ]).map(r => {
                      const val = r.nombre || r.rol || r
                      return <option key={val} value={val}>{val}</option>
                    })}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Correo electrónico
                </label>
                <input
                  style={inputStyle}
                  type="email"
                  placeholder="usuario@finpredict.com"
                  value={regData.email}
                  onChange={e => setRegData({ ...regData, email: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Contraseña
                </label>
                <input
                  style={inputStyle}
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={regData.password}
                  onChange={e => setRegData({ ...regData, password: e.target.value })}
                />
              </div>

              <button type="submit" className="btn btn-success" disabled={regLoading} style={{ marginTop: 4 }}>
                {regLoading ? 'Registrando…' : '+ Registrar Usuario'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* 3. Directorio de Usuarios Registrados */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Usuarios Registrados y Roles ({usuarios.length})</span>
          <button type="button" className="btn" onClick={cargarDatosSeguridad} disabled={loadingTablas}>
            ↻ Actualizar
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          {usuarios.length === 0 ? (
            <div className="empty-state" style={{ padding: 24 }}>
              Sin usuarios para mostrar (iniciá sesión para consultar el padrón)
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Usuario</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Último Login</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u, idx) => {
                  const rolName = u.rol || u.rol_nombre || 'VIEWER'
                  return (
                    <tr key={u.id || u.username || idx}>
                      <td>{u.id ?? idx + 1}</td>
                      <td style={{ fontWeight: 600 }}>{u.username}</td>
                      <td>{u.email || '—'}</td>
                      <td>
                        <span className={`tag ${ROLE_COLORS[rolName] || 'tag-blue'}`}>
                          {rolName}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: u.activo !== false ? 'var(--green)' : 'var(--red)' }}>
                          {u.activo !== false ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>{u.ultimo_login ? String(u.ultimo_login).slice(0, 19).replace('T', ' ') : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 4. Bitácora de Auditoría (logs_auditoria) */}
      <div className="card">
        <div className="card-header">
          <div>
            <span className="card-title">Bitácora de Auditoría de Base de Datos (logs_auditoria)</span>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              Trazabilidad automática de autenticaciones, entrenamientos, ingestas, reportes y consultas SHAP
            </div>
          </div>
          <span className="tag tag-blue">{auditoria.length} eventos</span>
        </div>
        <div style={{ overflowX: 'auto', maxHeight: 360, overflowY: 'auto' }}>
          {auditoria.length === 0 ? (
            <div className="empty-state" style={{ padding: 28 }}>
              Sin eventos de auditoría disponibles
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha / Hora</th>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Acción</th>
                  <th>Método & Recurso</th>
                  <th>HTTP</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {auditoria.map((log, i) => {
                  const status = log.estado_http || 200
                  const statusColor = status >= 400 ? 'var(--red)' : 'var(--green)'
                  return (
                    <tr key={log.id || i}>
                      <td style={{ fontSize: 11 }}>
                        {log.creado_en ? String(log.creado_en).slice(0, 19).replace('T', ' ') : '—'}
                      </td>
                      <td style={{ fontWeight: 600 }}>{log.username || 'anónimo'}</td>
                      <td>
                        {log.rol ? (
                          <span className={`tag ${ROLE_COLORS[log.rol] || 'tag-blue'}`}>{log.rol}</span>
                        ) : '—'}
                      </td>
                      <td>{log.accion || 'OPERACION'}</td>
                      <td style={{ fontSize: 11 }}>
                        <strong style={{ color: 'var(--accent)' }}>{log.metodo_http || 'GET'}</strong>{' '}
                        {log.recurso || '—'}
                      </td>
                      <td style={{ color: statusColor, fontWeight: 600 }}>{status}</td>
                      <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{log.ip_origen || '127.0.0.1'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

