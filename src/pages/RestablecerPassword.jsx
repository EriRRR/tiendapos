import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { C, T, btn, card, input } from '../styles/responsive'

export default function RestablecerPassword() {
  const navigate = useNavigate()
  const [password,   setPassword]   = useState('')
  const [confirmar,  setConfirmar]  = useState('')
  const [verPass,    setVerPass]    = useState(false)
  const [guardando,  setGuardando]  = useState(false)
  const [error,      setError]      = useState('')
  const [exito,      setExito]      = useState(false)
  const [sesionLista,setSesionLista]= useState(false)

  useEffect(() => {
    // Supabase redirige aquí con el token en el hash de la URL
    // Detectar que la sesión de recuperación está activa
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSesionLista(true)
      }
    })
  }, [])

  const guardar = async (e) => {
    e.preventDefault()
    if (!password)                    { setError('Ingresa la nueva contraseña'); return }
    if (password.length < 8)         { setError('Mínimo 8 caracteres'); return }
    if (password !== confirmar)       { setError('Las contraseñas no coinciden'); return }

    setGuardando(true); setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
    } else {
      setExito(true)
      setTimeout(() => navigate('/'), 3000)
    }
    setGuardando(false)
  }

  const fortaleza = password.length < 8 ? 'débil' : password.length < 12 ? 'media' : 'fuerte'
  const colorF    = fortaleza === 'débil' ? C.danger : fortaleza === 'media' ? '#f59e0b' : C.success
  const pctF      = fortaleza === 'débil' ? 33 : fortaleza === 'media' ? 66 : 100

  return (
    <div style={{ minHeight: '100vh', background: C.bgMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ ...card, padding: '2rem', maxWidth: '24rem', width: '100%' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ width: '3.5rem', height: '3.5rem', background: C.primary, borderRadius: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
            <Lock size={24} color="#fff" />
          </div>
          <div style={{ fontSize: T.xl, fontWeight: 800, color: C.text }}>Nueva contraseña</div>
          <div style={{ fontSize: T.xs, color: C.textMuted, marginTop: '0.25rem' }}>Vendix</div>
        </div>

        {exito ? (
          <div style={{ textAlign: 'center' }}>
            <CheckCircle size={48} color={C.success} style={{ margin: '0 auto 1rem' }} />
            <div style={{ fontSize: T.base, fontWeight: 700, color: C.text, marginBottom: '0.5rem' }}>
              ✓ Contraseña actualizada
            </div>
            <div style={{ fontSize: T.sm, color: C.textMuted }}>
              Redirigiendo al inicio de sesión...
            </div>
          </div>
        ) : !sesionLista ? (
          <div style={{ textAlign: 'center', color: C.textMuted }}>
            <div style={{ fontSize: T.sm, marginBottom: '0.5rem' }}>Verificando enlace...</div>
            <div style={{ fontSize: T.xs }}>
              Si llegaste aquí desde el email de restablecimiento, espera un momento.
            </div>
          </div>
        ) : (
          <form onSubmit={guardar} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {error && (
              <div style={{ background: '#fef2f2', border: `1px solid ${C.dangerBorder}`, borderRadius: '0.5rem', padding: '0.75rem', fontSize: T.sm, color: C.danger }}>
                {error}
              </div>
            )}

            {/* Nueva contraseña */}
            <div>
              <label style={{ fontSize: T.xs, color: C.textSecondary, display: 'block', marginBottom: '0.25rem' }}>
                Nueva contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={verPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  style={{ ...input, paddingRight: '2.5rem' }}
                  autoFocus
                />
                <button type="button" onClick={() => setVerPass(v => !v)}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, display: 'flex' }}>
                  {verPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* Fortaleza */}
              {password && (
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ background: C.borderLight, borderRadius: '9999px', height: '0.25rem', overflow: 'hidden' }}>
                    <div style={{ background: colorF, height: '100%', width: `${pctF}%`, borderRadius: '9999px', transition: 'width 0.3s, background 0.3s' }} />
                  </div>
                  <div style={{ fontSize: '0.625rem', color: colorF, marginTop: '0.25rem', textTransform: 'capitalize' }}>
                    Contraseña {fortaleza}
                  </div>
                </div>
              )}
            </div>

            {/* Confirmar */}
            <div>
              <label style={{ fontSize: T.xs, color: C.textSecondary, display: 'block', marginBottom: '0.25rem' }}>
                Confirmar contraseña
              </label>
              <input
                type={verPass ? 'text' : 'password'}
                value={confirmar}
                onChange={e => setConfirmar(e.target.value)}
                placeholder="Repite la contraseña"
                style={{ ...input, borderColor: confirmar && password !== confirmar ? C.danger : undefined }}
              />
              {confirmar && password !== confirmar && (
                <div style={{ fontSize: T.xs, color: C.danger, marginTop: '0.25rem' }}>Las contraseñas no coinciden</div>
              )}
            </div>

            <button type="submit" disabled={guardando || !sesionLista}
              style={{ ...btn.base, ...btn.primary, justifyContent: 'center', width: '100%', padding: '0.75rem', fontWeight: 700, opacity: guardando ? 0.7 : 1 }}>
              <Lock size={15} /> {guardando ? 'Guardando...' : 'Establecer nueva contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}