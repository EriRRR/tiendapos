import { useConexion } from '../hooks/useConexion'
import { Wifi, WifiOff, RefreshCw, CheckCircle, AlertTriangle, X } from 'lucide-react'
import { C, T } from '../styles/responsive'

export default function IndicadorConexion() {
  const {
    online, sincronizando, pendientes, fallidos,
    fmtSync, ultimoResultado, sincronizarAhora, reintentar, limpiar
  } = useConexion()

  // ── Offline ──────────────────────────────────────────────────────────
  if (!online) return (
    <div style={{ background: '#fef9c3', borderBottom: '1px solid #fde68a', padding: '0.375rem 1rem', display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0, flexWrap: 'wrap' }}>
      <WifiOff size={13} color="#92400e" />
      <span style={{ fontSize: T.xs, fontWeight: 700, color: '#92400e' }}>
        Sin conexión — modo offline
      </span>
      {pendientes > 0 && (
        <span style={{ fontSize: T.xs, color: '#92400e' }}>
          · {pendientes} operación{pendientes !== 1 ? 'es' : ''} pendiente{pendientes !== 1 ? 's' : ''}
        </span>
      )}
      <span style={{ fontSize: T.xs, color: '#92400e', opacity: 0.7 }}>
        Se sincronizará al reconectar
      </span>
    </div>
  )

  // ── Sincronizando ────────────────────────────────────────────────────
  if (sincronizando) return (
    <div style={{ background: C.primaryLight, borderBottom: `1px solid ${C.primaryBorder}`, padding: '0.375rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
      <RefreshCw size={13} color={C.primary} style={{ animation: 'spin 1s linear infinite' }} />
      <span style={{ fontSize: T.xs, fontWeight: 600, color: C.primary }}>
        Sincronizando datos offline...
      </span>
      {pendientes > 0 && (
        <span style={{ fontSize: T.xs, color: C.primary, opacity: 0.7 }}>
          {pendientes} pendiente{pendientes !== 1 ? 's' : ''}
        </span>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  // ── Hay fallidos ─────────────────────────────────────────────────────
  if (fallidos > 0) return (
    <div style={{ background: '#fef2f2', borderBottom: `1px solid ${C.dangerBorder}`, padding: '0.375rem 1rem', display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0, flexWrap: 'wrap' }}>
      <AlertTriangle size={13} color={C.danger} />
      <span style={{ fontSize: T.xs, fontWeight: 700, color: C.danger }}>
        {fallidos} operación{fallidos !== 1 ? 'es' : ''} no se pudo{fallidos !== 1 ? 'ieron' : ''} sincronizar
      </span>
      <button onClick={reintentar}
        style={{ fontSize: T.xs, fontWeight: 600, color: C.danger, background: 'none', border: `1px solid ${C.dangerBorder}`, borderRadius: '0.375rem', padding: '0.125rem 0.5rem', cursor: 'pointer' }}>
        Reintentar
      </button>
      <button onClick={limpiar}
        style={{ fontSize: T.xs, color: C.textMuted, background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto' }}>
        <X size={12} />
      </button>
    </div>
  )

  // ── Sync exitoso reciente ─────────────────────────────────────────────
  if (ultimoResultado?.exitosos > 0) return (
    <div style={{ background: C.successLight, borderBottom: '1px solid #bbf7d0', padding: '0.375rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
      <CheckCircle size={13} color={C.success} />
      <span style={{ fontSize: T.xs, fontWeight: 600, color: C.success }}>
        ✓ {ultimoResultado.exitosos} operación{ultimoResultado.exitosos !== 1 ? 'es' : ''} sincronizada{ultimoResultado.exitosos !== 1 ? 's' : ''}
      </span>
      {fmtSync && (
        <span style={{ fontSize: T.xs, color: C.success, opacity: 0.7 }}>· {fmtSync}</span>
      )}
    </div>
  )

  // ── Online normal — barra mínima ──────────────────────────────────────
  return (
    <div style={{ background: C.successLight, borderBottom: '1px solid #bbf7d0', padding: '0.25rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
      <Wifi size={12} color={C.success} />
      <span style={{ fontSize: '0.625rem', color: C.success, fontWeight: 500 }}>
        En línea{fmtSync ? ` · Sync ${fmtSync}` : ''}
      </span>
      {pendientes > 0 && (
        <>
          <span style={{ fontSize: '0.625rem', color: C.success }}>
            · {pendientes} pendiente{pendientes !== 1 ? 's' : ''}
          </span>
          <button onClick={sincronizarAhora}
            style={{ fontSize: '0.625rem', color: C.success, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
            Sync ahora
          </button>
        </>
      )}
    </div>
  )
}