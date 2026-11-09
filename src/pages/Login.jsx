// src/pages/Login.jsx
import { useState } from 'react'
import { loginUsuario, registrarUsuario, getPerfilActual } from '../services/api'

export default function Login({ onLoginSuccess, theme, onToggleTheme }) {
  const [modo, setModo] = useState('login') // 'login' | 'registro'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [okMsg, setOkMsg] = useState(null)

  const handleLogin = async (e, quickUser, quickPass) => {
    if (e) e.preventDefault()
    const u = quickUser ?? username
    const p = quickPass ?? password
    if (!u || !p) return

    setLoading(true)
    setError(null)
    setOkMsg(null)
    try {
      const res = await loginUsuario(u, p)
      let perfil = res?.usuario || res?.user
      if (!perfil) {
        perfil = await getPerfilActual().catch(() => ({
          username: u,
          rol: res?.rol || (u === 'admin' ? 'ADMIN' : 'TRADER'),
        }))
      }
      onLoginSuccess(perfil)
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!username || !password) return
    setLoading(true)
    setError(null)
    setOkMsg(null)
    try {
      await registrarUsuario({
        username,
        email: email || `${username}@finpredict.com`,
        password,
        rol: 'TRADER',
      })
      setOkMsg(`Cuenta "${username}" creada con éxito. Ahora podés iniciar sesión.`)
      setModo('login')
      setPassword('')
    } catch (err) {
      setError(err.message || 'No se pudo registrar el usuario')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    background: 'var(--bg-base)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '10px 14px',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    width: '100%',
    outline: 'none',
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-base)',
      padding: 20,
      position: 'relative',
    }}>
      {/* Selector de tema arriba a la derecha */}
      <div style={{ position: 'absolute', top: 20, right: 24 }}>
        <div className="theme-switcher" role="group" aria-label="Selector de tema">
          <button
            type="button"
            className={`theme-option${theme === 'dark' ? ' active' : ''}`}
            onClick={() => onToggleTheme('dark')}
          >
            Oscuro
          </button>
          <button
            type="button"
            className={`theme-option${theme === 'light' ? ' active' : ''}`}
            onClick={() => onToggleTheme('light')}
          >
            Claro
          </button>
        </div>
      </div>

      <div
        className="card fade-in"
        style={{
          width: '100%',
          maxWidth: 430,
          padding: '28px 28px 24px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.35)',
        }}
      >
        {/* Logo y Encabezado */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <div className="logo-mark" style={{ width: 38, height: 38, fontSize: 15 }}>FP</div>
          <div>
            <div className="logo-text" style={{ fontSize: 20 }}>
              Fin<span>Predict</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Sistema de Predicción Bursátil con XGBoost · UNdeC 2026
            </div>
          </div>
        </div>

        {/* Pestañas Iniciar Sesión / Crear Cuenta */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
          <button
            type="button"
            className={`ticker-tab${modo === 'login' ? ' active' : ''}`}
            style={{ flex: 1, textAlign: 'center', padding: '7px 0' }}
            onClick={() => { setModo('login'); setError(null) }}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            className={`ticker-tab${modo === 'registro' ? ' active' : ''}`}
            style={{ flex: 1, textAlign: 'center', padding: '7px 0' }}
            onClick={() => { setModo('registro'); setError(null) }}
          >
            Crear Cuenta
          </button>
        </div>

        {error && (
          <div style={{
            padding: '10px 12px',
            borderRadius: 6,
            background: 'var(--red-muted)',
            color: 'var(--red)',
            fontSize: 12,
            marginBottom: 14,
            border: '1px solid rgba(239,68,68,0.3)',
          }}>
            ⚠ {error}
          </div>
        )}

        {okMsg && (
          <div style={{
            padding: '10px 12px',
            borderRadius: 6,
            background: 'var(--green-muted)',
            color: 'var(--green)',
            fontSize: 12,
            marginBottom: 14,
            border: '1px solid rgba(34,197,94,0.3)',
          }}>
            ✓ {okMsg}
          </div>
        )}

        {modo === 'login' ? (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>
                Usuario
              </label>
              <input
                style={inputStyle}
                type="text"
                placeholder="Ingresá tu usuario (ej. admin o trader)"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>
                Contraseña
              </label>
              <input
                style={inputStyle}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ padding: '10px 16px', fontSize: 13, fontWeight: 700, justifyContent: 'center', marginTop: 4 }}
            >
              {loading ? 'Verificando credenciales…' : 'Ingresar a FinPredict'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>
                Nombre de Usuario
              </label>
              <input
                style={inputStyle}
                type="text"
                placeholder="ej. leonardo"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>
                Correo Electrónico
              </label>
              <input
                style={inputStyle}
                type="email"
                placeholder="usuario@finpredict.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>
                Contraseña (mínimo 6 caracteres)
              </label>
              <input
                style={inputStyle}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ padding: '10px 16px', fontSize: 13, fontWeight: 700, justifyContent: 'center', marginTop: 4 }}
            >
              {loading ? 'Registrando cuenta…' : 'Registrarme como Usuario'}
            </button>
          </form>
        )}

        {/* Accesos rápidos de demostración */}
        <div style={{
          borderTop: '1px solid var(--border)',
          marginTop: 20,
          paddingTop: 14,
        }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
            Acceso rápido de demostración (Roles RBAC):
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button
              type="button"
              className="btn"
              disabled={loading}
              onClick={() => handleLogin(null, 'trader', 'trader123')}
              style={{ justifyContent: 'center', fontSize: 11 }}
            >
              👤 Usuario Común (trader)
            </button>
            <button
              type="button"
              className="btn"
              disabled={loading}
              onClick={() => handleLogin(null, 'admin', 'admin123')}
              style={{ justifyContent: 'center', fontSize: 11 }}
            >
              🛡 Administrador (admin)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
