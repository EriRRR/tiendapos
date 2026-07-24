import { useState } from 'react'
import { Bell, X, CheckCheck, Package, AlertTriangle, ShoppingCart, DollarSign } from 'lucide-react'
import { C, T, btn } from '../styles/responsive'
import { useNotificaciones } from '../hooks/useNotificaciones'

const ICONOS = {
  stock_agotado: { icon: Package,      color: '#ef4444', bg: '#fef2f2' },
  stock_bajo:    { icon: AlertTriangle,color: '#f59e0b', bg: '#fef9c3' },
  venta:         { icon: ShoppingCart, color: '#16a34a', bg: '#f0fdf4' },
  abono:         { icon: DollarSign,   color: '#2563eb', bg: '#eff6ff' },
  pago_vencido:  { icon: AlertTriangle,color: '#dc2626', bg: '#fef2f2' },
}

export default function PanelNotificaciones() {
  const { notifs, noLeidas, marcarLeida, marcarTodasLeidas, eliminar } = useNotificaciones()
  const [abierto, setAbierto] = useState(false)

  const fmt = (iso) => {
    const diff = Date.now() - new Date(iso).getTime()
    const min  = Math.floor(diff / 60000)
    if (min < 1)   return 'Ahora'
    if (min < 60)  return `Hace ${min} min`
    const h = Math.floor(min / 60)
    if (h < 24)    return `Hace ${h}h`
    return new Date(iso).toLocaleDateString('es-HN', { day: '2-digit', month: 'short' })
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Botón campana */}
      <button onClick={() => setAbierto(v => !v)}
        style={{ position: 'relative', background: noLeidas > 0 ? '#fef9c3' : C.bgMuted, border: `1px solid ${noLeidas > 0 ? '#fde68a' : C.border}`, borderRadius: '0.5rem', padding: '0.375rem 0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <Bell size={16} color={noLeidas > 0 ? '#92400e' : C.textMuted} />
        {noLeidas > 0 && (
          <span style={{ background: C.danger, color: '#fff', borderRadius: '9999px', fontSize: '0.625rem', fontWeight: 700, padding: '0.0625rem 0.375rem', minWidth: '1rem', textAlign: 'center' }}>
            {noLeidas > 99 ? '99+' : noLeidas}
          </span>
        )}
      </button>

      {/* Panel */}
      {abierto && (
        <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 0.5rem)', width: '22rem', maxWidth: '95vw', background: C.bgWhite, border: `1px solid ${C.border}`, borderRadius: '0.75rem', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', zIndex: 200, overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ padding: '0.75rem 1rem', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.bgMuted }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bell size={14} color={C.primary} />
              <span style={{ fontSize: T.sm, fontWeight: 700, color: C.text }}>Notificaciones</span>
              {noLeidas > 0 && (
                <span style={{ background: C.danger, color: '#fff', borderRadius: '9999px', fontSize: '0.625rem', fontWeight: 700, padding: '0.0625rem 0.375rem' }}>
                  {noLeidas}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
              {noLeidas > 0 && (
                <button onClick={marcarTodasLeidas}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.primary, fontSize: T.xs, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <CheckCheck size={13} /> Marcar todas
                </button>
              )}
              <button onClick={() => setAbierto(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, display: 'flex' }}>
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Lista */}
          <div style={{ maxHeight: '24rem', overflowY: 'auto' }}>
            {notifs.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: C.textMuted }}>
                <Bell size={28} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} />
                <div style={{ fontSize: T.sm }}>Sin notificaciones</div>
              </div>
            ) : notifs.map(n => {
              const info = ICONOS[n.tipo] || ICONOS.venta
              const Icon = info.icon
              return (
                <div key={n.id}
                  onClick={() => !n.leida && marcarLeida(n.id)}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', padding: '0.75rem 1rem', borderBottom: `1px solid ${C.borderLight}`, background: n.leida ? C.bgWhite : `${C.primaryLight}`, cursor: n.leida ? 'default' : 'pointer', transition: 'background 0.15s' }}>

                  <div style={{ width: '2.25rem', height: '2.25rem', background: info.bg, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={14} color={info.color} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: T.xs, fontWeight: n.leida ? 400 : 700, color: C.text, lineHeight: 1.3 }}>
                      {n.titulo}
                    </div>
                    <div style={{ fontSize: '0.625rem', color: C.textMuted, marginTop: '0.125rem', lineHeight: 1.4 }}>
                      {n.mensaje}
                    </div>
                    <div style={{ fontSize: '0.625rem', color: C.textMuted, marginTop: '0.25rem' }}>
                      {fmt(n.created_at)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flexShrink: 0 }}>
                    {!n.leida && (
                      <div style={{ width: '0.5rem', height: '0.5rem', background: C.primary, borderRadius: '50%' }} />
                    )}
                    <button onClick={e => { e.stopPropagation(); eliminar(n.id) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, display: 'flex', padding: 0 }}>
                      <X size={12} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}