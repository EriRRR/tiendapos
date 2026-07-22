import { useState } from 'react'
import { Bell, CheckCircle, XCircle, Clock, User, X, ChevronDown } from 'lucide-react'
import { C, T, btn } from '../styles/responsive'
import { useSolicitudesPassword } from '../hooks/useSolicitudesPassword'

export default function NotificacionesSolicitudes() {
  const { solicitudes, procesando, esSuperior, aprobar, rechazar, pendientes } = useSolicitudesPassword()
  const [abierto,       setAbierto]       = useState(false)
  const [msgRechazar,   setMsgRechazar]   = useState({})
  const [resultado,     setResultado]     = useState(null)
  const [notaRechazar,  setNotaRechazar]  = useState({})

  if (!esSuperior || pendientes === 0) return null

  const handleAprobar = async (sol) => {
    const res = await aprobar(sol.id)
    if (res?.ok) {
      setResultado({ tipo: 'ok', msg: `✓ Aprobado. Se envió email a ${res.email}` })
      setTimeout(() => setResultado(null), 4000)
    } else {
      setResultado({ tipo: 'error', msg: res?.error || 'Error al aprobar' })
      setTimeout(() => setResultado(null), 4000)
    }
  }

  const handleRechazar = async (sol) => {
    const res = await rechazar(sol.id, notaRechazar[sol.id] || '')
    if (res?.ok) {
      setMsgRechazar(p => ({ ...p, [sol.id]: false }))
      setResultado({ tipo: 'ok', msg: '✓ Solicitud rechazada' })
      setTimeout(() => setResultado(null), 3000)
    }
  }

  const fmt = (iso) => new Date(iso).toLocaleString('es-HN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  })

  return (
    <div style={{ position: 'relative' }}>
      {/* Botón campana */}
      <button
        onClick={() => setAbierto(v => !v)}
        style={{ position: 'relative', background: pendientes > 0 ? '#422006' : C.bgMuted, border: pendientes > 0 ? '1px solid #92400e' : `1px solid ${C.border}`, borderRadius: '0.5rem', padding: '0.375rem 0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
        <Bell size={16} color={pendientes > 0 ? '#fbbf24' : C.textMuted} />
        {pendientes > 0 && (
          <span style={{ background: C.danger, color: '#fff', borderRadius: '9999px', fontSize: '0.625rem', fontWeight: 700, padding: '0.0625rem 0.375rem', minWidth: '1rem', textAlign: 'center' }}>
            {pendientes}
          </span>
        )}
      </button>

      {/* Panel de notificaciones */}
      {abierto && (
        <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 0.5rem)', width: '22rem', maxWidth: '95vw', background: C.bgWhite, border: `1px solid ${C.border}`, borderRadius: '0.75rem', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', zIndex: 200, overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ padding: '0.875rem 1rem', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.bgMuted }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bell size={14} color={C.primary} />
              <span style={{ fontSize: T.sm, fontWeight: 700, color: C.text }}>
                Solicitudes de contraseña
              </span>
              <span style={{ background: C.danger, color: '#fff', borderRadius: '9999px', fontSize: '0.625rem', fontWeight: 700, padding: '0.0625rem 0.375rem' }}>
                {pendientes}
              </span>
            </div>
            <button onClick={() => setAbierto(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, display: 'flex' }}>
              <X size={16} />
            </button>
          </div>

          {/* Resultado */}
          {resultado && (
            <div style={{ padding: '0.625rem 1rem', background: resultado.tipo === 'ok' ? C.successLight : '#fef2f2', borderBottom: `1px solid ${C.borderLight}`, fontSize: T.xs, color: resultado.tipo === 'ok' ? C.success : C.danger, fontWeight: 600 }}>
              {resultado.msg}
            </div>
          )}

          {/* Lista */}
          <div style={{ maxHeight: '24rem', overflowY: 'auto' }}>
            {solicitudes.map(sol => (
              <div key={sol.id} style={{ padding: '0.875rem 1rem', borderBottom: `1px solid ${C.borderLight}` }}>
                {/* Info usuario */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
                  <div style={{ width: '2.25rem', height: '2.25rem', background: C.primaryLight, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <User size={14} color={C.primary} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: T.xs, fontWeight: 700, color: C.text }}>
                      {sol.nombre || 'Usuario'}
                    </div>
                    <div style={{ fontSize: '0.625rem', color: C.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {sol.email}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.125rem' }}>
                      <Clock size={10} color={C.textMuted} />
                      <span style={{ fontSize: '0.625rem', color: C.textMuted }}>{fmt(sol.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Descripción */}
                <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', fontSize: T.xs, color: '#92400e', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                  ⚠️ Este usuario olvidó su contraseña y solicita restablecerla. Al aprobar, recibirá un email para crear una nueva.
                </div>

                {/* Botones aprobar / rechazar */}
                {!msgRechazar[sol.id] ? (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleAprobar(sol)}
                      disabled={procesando === sol.id}
                      style={{ ...btn.base, background: C.successLight, color: C.success, border: '1px solid #bbf7d0', flex: 1, justifyContent: 'center', fontSize: T.xs, opacity: procesando === sol.id ? 0.7 : 1 }}>
                      <CheckCircle size={13} />
                      {procesando === sol.id ? 'Enviando...' : 'Aprobar y enviar email'}
                    </button>
                    <button
                      onClick={() => setMsgRechazar(p => ({ ...p, [sol.id]: true }))}
                      disabled={procesando === sol.id}
                      style={{ ...btn.base, background: '#fef2f2', color: C.danger, border: `1px solid ${C.dangerBorder}`, padding: '0.375rem 0.625rem', fontSize: T.xs }}>
                      <XCircle size={13} />
                    </button>
                  </div>
                ) : (
                  /* Formulario de rechazo */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <input
                      placeholder="Razón del rechazo (opcional)"
                      value={notaRechazar[sol.id] || ''}
                      onChange={e => setNotaRechazar(p => ({ ...p, [sol.id]: e.target.value }))}
                      style={{ padding: '0.5rem 0.75rem', border: `1px solid ${C.border}`, borderRadius: '0.375rem', fontSize: T.xs, color: C.text, background: C.bgWhite, outline: 'none' }}
                    />
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <button onClick={() => setMsgRechazar(p => ({ ...p, [sol.id]: false }))}
                        style={{ ...btn.base, ...btn.ghost, flex: 1, justifyContent: 'center', fontSize: T.xs }}>
                        Cancelar
                      </button>
                      <button onClick={() => handleRechazar(sol)} disabled={procesando === sol.id}
                        style={{ ...btn.base, background: '#fef2f2', color: C.danger, border: `1px solid ${C.dangerBorder}`, flex: 1, justifyContent: 'center', fontSize: T.xs }}>
                        <XCircle size={13} /> Rechazar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}