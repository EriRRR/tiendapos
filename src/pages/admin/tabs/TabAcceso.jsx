import { Shield, ExternalLink } from 'lucide-react'
import { T, btn } from '../../../styles/responsive'
import { estadoInfo } from '../components/TarjetaTienda'

export default function TabAcceso({ tiendas, onEntrar, onCambiarEstado }) {
  const sectionTitle = { fontSize: T.lg, fontWeight: 700, color: '#f1f5f9', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }

  return (
    <div>
      <div style={sectionTitle}><Shield size={18} /> Control de acceso</div>

      {/* Info */}
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '0.75rem', padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ fontSize: T.sm, fontWeight: 700, color: '#60a5fa', marginBottom: '0.625rem' }}>¿Cómo funciona?</div>
        {[
          { color: '#34d399', label: 'Activo',        desc: 'Acceso completo al sistema.'                                         },
          { color: '#fbbf24', label: 'Advertencia',   desc: 'Pago retrasado. Banner visible, acceso funcional.'                   },
          { color: '#f87171', label: 'Deshabilitado', desc: 'Sin acceso. Modal bloqueante al intentar ingresar.'                  },
        ].map(e => (
          <div key={e.label} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', padding: '0.375rem 0' }}>
            <div style={{ width: '0.5rem', height: '0.5rem', background: e.color, borderRadius: '50%', marginTop: '0.3125rem', flexShrink: 0 }} />
            <div style={{ fontSize: T.xs }}>
              <span style={{ fontWeight: 700, color: e.color }}>{e.label}: </span>
              <span style={{ color: '#94a3b8' }}>{e.desc}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: T.xs, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.625rem' }}>
        Control rápido
      </div>

      {tiendas.map(t => {
        const des  = t.estado === 'deshabilitado' || t.dias_retraso > t.dias_gracia
        const info = estadoInfo(t)
        return (
          <div key={t.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '0.625rem', padding: '0.75rem 1.25rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              {info.icon}
              <div>
                <div style={{ fontSize: T.sm, fontWeight: 600, color: '#f1f5f9' }}>{t.nombre}</div>
                {t.slug && <div style={{ fontSize: T.xs, color: '#64748b', fontFamily: 'monospace' }}>/catalogo/{t.slug}</div>}
                <div style={{ fontSize: T.xs, color: '#64748b' }}>{info.label}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.375rem' }}>
              <button onClick={() => onEntrar(t)}
                style={{ ...btn.base, background: '#1e3a5f', color: '#60a5fa', border: '1px solid #1e40af', fontSize: T.xs, padding: '0.3125rem 0.625rem' }}>
                <ExternalLink size={13} /> Entrar
              </button>
              {des ? (
                <button onClick={() => onCambiarEstado(t.id, 'activo', new Date().toISOString().split('T')[0])}
                  style={{ ...btn.base, background: '#1e3a5f', color: '#93c5fd', border: '1px solid #1e40af', fontSize: T.xs, padding: '0.3125rem 0.625rem' }}>
                  Habilitar
                </button>
              ) : (
                <button onClick={() => { if (window.confirm(`¿Deshabilitar "${t.nombre}"?`)) onCambiarEstado(t.id, 'deshabilitado') }}
                  style={{ ...btn.base, background: '#450a0a', color: '#fca5a5', border: '1px solid #7f1d1d', fontSize: T.xs, padding: '0.3125rem 0.625rem' }}>
                  Deshabilitar
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}