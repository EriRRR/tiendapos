import { AlertTriangle, Monitor, LogOut } from 'lucide-react'
import { C, T, btn } from '../styles/responsive'

export default function AlertaSesionDuplicada({ conflicto, onExpulsar, onCeder }) {
  if (!conflicto) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        background: C.bgWhite,
        borderRadius: '0.875rem',
        padding: '1.5rem',
        maxWidth: '26rem',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Ícono */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <div style={{ width: '3.5rem', height: '3.5rem', background: '#fef9c3', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={28} color="#92400e" />
          </div>
        </div>

        {/* Título */}
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <div style={{ fontSize: T.lg, fontWeight: 700, color: C.text, marginBottom: '0.375rem' }}>
            Usuario en otro dispositivo
          </div>
          <div style={{ fontSize: T.sm, color: C.textSecondary, lineHeight: 1.6 }}>
            Esta cuenta ya tiene una sesión activa en:
          </div>
        </div>

        {/* Dispositivo anterior */}
        <div style={{ background: C.bgMuted, borderRadius: '0.625rem', padding: '0.875rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Monitor size={20} color={C.textMuted} style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: T.xs, fontWeight: 600, color: C.text }}>
              {conflicto.dispositivo}
            </div>
            <div style={{ fontSize: T.xs, color: C.textMuted, marginTop: '0.125rem' }}>
              Sesión activa
            </div>
          </div>
        </div>

        {/* Opciones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          <button onClick={onExpulsar}
            style={{ ...btn.base, ...btn.primary, width: '100%', justifyContent: 'center', padding: '0.75rem', fontWeight: 700 }}>
            Continuar aquí y cerrar la otra sesión
          </button>
          <button onClick={onCeder}
            style={{ ...btn.base, background: C.bgMuted, color: C.textSecondary, border: `1px solid ${C.border}`, width: '100%', justifyContent: 'center', padding: '0.75rem' }}>
            <LogOut size={15} /> Cancelar y salir
          </button>
        </div>

        <div style={{ fontSize: T.xs, color: C.textMuted, textAlign: 'center', marginTop: '0.875rem', lineHeight: 1.5 }}>
          Si continúas aquí, la sesión anterior será cerrada automáticamente.
        </div>
      </div>
    </div>
  )
}