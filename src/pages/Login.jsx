import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import { C, T, btn, input } from '../styles/responsive'
import { supabase } from '../lib/supabase'  // <-- agregado

export default function Login() {
  const { signIn, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verPass, setVerPass] = useState(false)
  const [error, setError] = useState('')
  const [tiendaDeshabilitada, setTiendaDeshabilitada] = useState(null)

  // ── Estados para "Olvidé mi contraseña" ──
  const [vistaOlvide, setVistaOlvide] = useState(false)
  const [emailOlvide, setEmailOlvide] = useState('')
  const [enviandoSol, setEnviandoSol] = useState(false)
  const [msgOlvide, setMsgOlvide] = useState(null)

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Ingresa email y contraseña')
      return
    }
    setError('')
    setTiendaDeshabilitada(null)
    try {
      const result = await signIn(email, password)
      if (result.is_admin) navigate('/admin')
      else navigate('/inventario')
    } catch (e) {
      if (e.message === 'TIENDA_DESHABILITADA') {
        setTiendaDeshabilitada(e.nombre || 'Tu tienda')
      } else if (e.message === 'Invalid login credentials') {
        setError('Email o contraseña incorrectos')
      } else {
        setError(e.message)
      }
    }
  }

  // ── Manejador de solicitud de restablecimiento ──
  const handleOlvidePassword = async (e) => {
    e.preventDefault()
    if (!emailOlvide.trim()) {
      setMsgOlvide({ tipo: 'error', texto: 'Ingresa tu email' })
      return
    }
    setEnviandoSol(true)
    setMsgOlvide(null)
    try {
      const { data, error } = await supabase.rpc('crear_solicitud_password', {
        p_email: emailOlvide.trim().toLowerCase()
      })
      if (error) throw new Error(error.message)
      setMsgOlvide({
        tipo: 'ok',
        texto: data?.mensaje ||
          'Solicitud enviada. El gerente o dueño de tu tienda deberá aprobarla. Recibirás un email cuando sea aprobada.'
      })
    } catch (e) {
      setMsgOlvide({ tipo: 'error', texto: e.message })
    }
    setEnviandoSol(false)
  }

  const lbl = {
    fontSize: T.xs,
    color: C.textSecondary,
    display: 'block',
    marginBottom: '0.25rem',
    fontWeight: 500,
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      {/* Modal tienda deshabilitada */}
      {tiendaDeshabilitada && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: C.bgWhite,
              borderRadius: '1rem',
              padding: '2rem',
              maxWidth: '22rem',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            }}
          >
            <div
              style={{
                width: '4rem',
                height: '4rem',
                background: '#fef2f2',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
              }}
            >
              <AlertTriangle size={28} color={C.danger} />
            </div>
            <div
              style={{
                fontSize: T.lg,
                fontWeight: 700,
                color: C.text,
                marginBottom: '0.5rem',
              }}
            >
              Acceso deshabilitado
            </div>
            <div
              style={{
                fontSize: T.sm,
                color: C.textSecondary,
                lineHeight: 1.6,
                marginBottom: '1.5rem',
              }}
            >
              El acceso de <strong>{tiendaDeshabilitada}</strong> ha sido deshabilitado.
              Por favor contacta a soporte para regularizar tu cuenta.
            </div>
            <div
              style={{
                background: C.bgMuted,
                borderRadius: '0.5rem',
                padding: '0.75rem',
                fontSize: T.xs,
                color: C.textSecondary,
                marginBottom: '1.25rem',
              }}
            >
              📞 Soporte: +504 0000-0000<br />
              ✉️ soporte@tiendapos.com
            </div>
            <button
              onClick={() => setTiendaDeshabilitada(null)}
              style={{
                ...btn.base,
                ...btn.secondary,
                width: '100%',
                justifyContent: 'center',
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      <div style={{ width: '100%', maxWidth: '22rem' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '3.5rem',
              height: '3.5rem',
              background: C.primary,
              borderRadius: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.875rem',
            }}
          >
            <ShoppingCart size={24} color="#fff" />
          </div>
          <div style={{ fontSize: T.xl, fontWeight: 800, color: C.text }}>TiendaPos</div>
          <div
            style={{
              fontSize: T.sm,
              color: C.textMuted,
              marginTop: '0.25rem',
            }}
          >
            Sistema de punto de venta
          </div>
        </div>

        <div
          style={{
            background: C.bgWhite,
            borderRadius: '1rem',
            padding: '1.75rem',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            border: `1px solid ${C.border}`,
          }}
        >
          <div
            style={{
              fontSize: T.base,
              fontWeight: 700,
              color: C.text,
              marginBottom: '1.25rem',
            }}
          >
            Iniciar sesión
          </div>

          {error && (
            <div
              style={{
                background: '#fef2f2',
                border: `1px solid ${C.dangerBorder}`,
                borderRadius: '0.5rem',
                padding: '0.75rem',
                fontSize: T.sm,
                color: C.danger,
                marginBottom: '1rem',
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.875rem',
              }}
            >
              <div>
                <label style={lbl}>Correo electrónico</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  autoComplete="email"
                  style={input}
                />
              </div>
              <div>
                <label style={lbl}>Contraseña</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={verPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    style={{ ...input, paddingRight: '2.75rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setVerPass((v) => !v)}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: C.textMuted,
                      display: 'flex',
                    }}
                  >
                    {verPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={authLoading}
                style={{
                  ...btn.base,
                  ...btn.primary,
                  width: '100%',
                  justifyContent: 'center',
                  padding: '0.6875rem',
                  fontSize: T.base,
                  fontWeight: 700,
                  marginTop: '0.25rem',
                  opacity: authLoading ? 0.7 : 1,
                }}
              >
                {authLoading ? (
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <span
                      style={{
                        width: '1rem',
                        height: '1rem',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTop: '2px solid #fff',
                        borderRadius: '50%',
                        display: 'inline-block',
                        animation: 'spin 0.8s linear infinite',
                      }}
                    />
                    Iniciando sesión...
                  </span>
                ) : (
                  'Iniciar sesión'
                )}
              </button>
            </div>
          </form>

          {/* ── Link "Olvidé mi contraseña" ── */}
          {!vistaOlvide && (
            <button
              type="button"
              onClick={() => { setVistaOlvide(true); setError('') }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: C.primary,
                fontSize: T.xs,
                textDecoration: 'underline',
                marginTop: '0.5rem',
                display: 'block',
                width: '100%',
                textAlign: 'center',
              }}
            >
              ¿Olvidaste tu contraseña?
            </button>
          )}

          {/* ── Vista "Olvidé mi contraseña" ── */}
          {vistaOlvide && (
            <div
              style={{
                marginTop: '1rem',
                borderTop: `1px solid ${C.borderLight}`,
                paddingTop: '1rem',
              }}
            >
              <div
                style={{
                  fontSize: T.sm,
                  fontWeight: 700,
                  color: C.text,
                  marginBottom: '0.375rem',
                }}
              >
                Restablecer contraseña
              </div>
              <div
                style={{
                  fontSize: T.xs,
                  color: C.textMuted,
                  marginBottom: '0.875rem',
                  lineHeight: 1.5,
                }}
              >
                Ingresa tu email. Se enviará una solicitud al gerente o dueño de
                tu tienda para que la aprueben.
              </div>

              {msgOlvide && (
                <div
                  style={{
                    background:
                      msgOlvide.tipo === 'ok' ? C.successLight : '#fef2f2',
                    border: `1px solid ${
                      msgOlvide.tipo === 'ok' ? '#bbf7d0' : C.dangerBorder
                    }`,
                    borderRadius: '0.5rem',
                    padding: '0.75rem',
                    fontSize: T.xs,
                    color: msgOlvide.tipo === 'ok' ? C.success : C.danger,
                    marginBottom: '0.875rem',
                    lineHeight: 1.6,
                  }}
                >
                  {msgOlvide.texto}
                </div>
              )}

              {msgOlvide?.tipo !== 'ok' && (
                <form
                  onSubmit={handleOlvidePassword}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.625rem',
                  }}
                >
                  <input
                    type="email"
                    value={emailOlvide}
                    onChange={(e) => setEmailOlvide(e.target.value)}
                    placeholder="tu@email.com"
                    style={input}
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={enviandoSol}
                    style={{
                      ...btn.base,
                      ...btn.primary,
                      justifyContent: 'center',
                      width: '100%',
                      opacity: enviandoSol ? 0.7 : 1,
                    }}
                  >
                    {enviandoSol
                      ? 'Enviando solicitud...'
                      : 'Solicitar restablecimiento'}
                  </button>
                </form>
              )}

              <button
                onClick={() => {
                  setVistaOlvide(false)
                  setMsgOlvide(null)
                  setEmailOlvide('')
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: C.textMuted,
                  fontSize: T.xs,
                  marginTop: '0.625rem',
                  textDecoration: 'underline',
                  display: 'block',
                  width: '100%',
                  textAlign: 'center',
                }}
              >
                ← Volver al inicio de sesión
              </button>
            </div>
          )}
        </div>

        <div
          style={{
            textAlign: 'center',
            marginTop: '1.25rem',
            fontSize: T.xs,
            color: C.textMuted,
          }}
        >
          Acceso solo por invitación · TiendaPos
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}