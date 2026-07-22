import { ShieldX } from 'lucide-react'
import { C, T, btn } from '../styles/responsive'

export default function AlertaLogoutForzado({ mensaje, onAceptar }) {
  if (!mensaje) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        background: C.bgWhite,
        borderRadius: '0.875rem',
        padding: '1.5rem',
        maxWidth: '24rem',
        width: '100%',
        textAlign: 'center',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <div style={{ width: '3.5rem', height: '3.5rem', background: '#fef2f2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldX size={28} color={C.danger} />
          </div>
        </div>
        <div style={{ fontSize: T.lg, fontWeight: 700, color: C.text, marginBottom: '0.5rem' }}>
          Sesión cerrada
        </div>
        <div style={{ fontSize: T.sm, color: C.textSecondary, lineHeight: 1.6, marginBottom: '1.25rem' }}>
          {mensaje}
        </div>
        <button onClick={onAceptar}
          style={{ ...btn.base, ...btn.primary, width: '100%', justifyContent: 'center', padding: '0.75rem', fontWeight: 700 }}>
          Entendido — ir al inicio
        </button>
      </div>
    </div>
  )
}