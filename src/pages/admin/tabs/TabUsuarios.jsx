import { Users } from 'lucide-react'
import { T, btn } from '../../../styles/responsive'

export default function TabUsuarios({ tiendas, totalUsuarios, onGestionar }) {
  const total = tiendas.length
  const sectionTitle = { fontSize: T.lg, fontWeight: 700, color: '#f1f5f9', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }

  return (
    <div>
      <div style={sectionTitle}><Users size={18} /> Usuarios por tienda</div>

      {/* Stats */}
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '0.75rem', padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(9rem, 1fr))', gap: '0.625rem' }}>
          {[
            { label: 'Total usuarios', val: totalUsuarios,                                                                         color: '#a78bfa', sub: 'Sin contar dev' },
            { label: 'Promedio',       val: total > 0 ? (totalUsuarios / total).toFixed(1) : 0,                                   color: '#60a5fa', sub: 'por tienda'    },
            { label: 'Al límite',      val: tiendas.filter(t => (t.total_usuarios || 0) >= (t.max_usuarios || 3)).length,         color: '#f87171', sub: 'sin espacio'   },
          ].map(s => (
            <div key={s.label} style={{ background: '#0f172a', borderRadius: '0.5rem', padding: '0.75rem' }}>
              <div style={{ fontSize: T.xs, color: '#64748b' }}>{s.label}</div>
              <div style={{ fontSize: T.xl, fontWeight: 700, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: '0.625rem', color: '#475569' }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Lista de tiendas */}
      {tiendas.map(t => {
        const usados = t.total_usuarios || 0
        const max    = t.max_usuarios   || 3
        const pct    = Math.min(100, Math.round((usados / max) * 100))
        const color  = pct >= 100 ? '#f87171' : pct >= 75 ? '#fbbf24' : '#34d399'

        return (
          <div key={t.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '0.75rem', padding: '0.875rem 1.25rem', marginBottom: '0.625rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '10rem' }}>
              <div style={{ fontSize: T.sm, fontWeight: 600, color: '#f1f5f9' }}>{t.nombre}</div>
              <div style={{ fontSize: T.xs, color: '#64748b', marginTop: '0.125rem' }}>{t.email_contacto}</div>
              {t.slug && <div style={{ fontSize: T.xs, color: '#64748b', fontFamily: 'monospace' }}>/catalogo/{t.slug}</div>}
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: T.xs, color: '#64748b' }}>Capacidad</span>
                  <span style={{ fontSize: T.xs, fontWeight: 700, color }}>{usados}/{max}</span>
                </div>
                <div style={{ background: '#334155', borderRadius: '9999px', height: '0.375rem', overflow: 'hidden' }}>
                  <div style={{ background: color, height: '100%', width: `${pct}%`, borderRadius: '9999px' }} />
                </div>
              </div>
            </div>
            <button onClick={() => onGestionar(t)}
              style={{ ...btn.base, background: '#1e3a5f', color: '#60a5fa', border: '1px solid #1e40af', fontSize: T.xs }}>
              <Users size={13} /> Gestionar usuarios
            </button>
          </div>
        )
      })}
    </div>
  )
}