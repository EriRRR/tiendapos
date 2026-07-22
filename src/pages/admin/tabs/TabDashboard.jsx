import { LayoutDashboard } from 'lucide-react'
import { T } from '../../../styles/responsive'
import TarjetaTienda from '../components/TarjetaTienda'

export default function TabDashboard({
  tiendas, loading, expandida, setExpandida,
  onEntrar, onConfig, onPago, onCambiarEstado, onEliminarUsuario,
  alDia, conRetraso, deshabilitadas, totalUsuarios
}) {
  const total = tiendas.length
  const sectionTitle = { fontSize: T.lg, fontWeight: 700, color: '#f1f5f9', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }

  return (
    <div>
      <div style={sectionTitle}><LayoutDashboard size={18} /> Resumen general</div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(9rem, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total tiendas',  val: total,          color: '#60a5fa', bg: '#1e3a5f' },
          { label: 'Al día',         val: alDia,          color: '#34d399', bg: '#052e16' },
          { label: 'Con retraso',    val: conRetraso,     color: '#fbbf24', bg: '#422006' },
          { label: 'Deshabilitadas', val: deshabilitadas, color: '#f87171', bg: '#450a0a' },
          { label: 'Total usuarios', val: totalUsuarios,  color: '#a78bfa', bg: '#2e1065' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.color}22`, borderRadius: '0.75rem', padding: '1rem' }}>
            <div style={{ fontSize: T.xs, color: '#94a3b8' }}>{s.label}</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: s.color, lineHeight: 1, marginTop: '0.375rem' }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Requieren atención */}
      {(conRetraso > 0 || deshabilitadas > 0) && (
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: T.xs, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.625rem' }}>
            ⚠️ Requieren atención
          </div>
          {tiendas.filter(t => t.dias_retraso > 0 || t.estado === 'deshabilitado').map(t => (
            <TarjetaTienda key={t.id} t={t}
              expandida={expandida} setExpandida={setExpandida}
              onEntrar={onEntrar} onConfig={onConfig} onPago={onPago}
              onCambiarEstado={onCambiarEstado} onEliminarUsuario={onEliminarUsuario} />
          ))}
        </div>
      )}

      <div style={{ fontSize: T.xs, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.625rem' }}>
        Todas las tiendas
      </div>
      {loading
        ? <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Cargando...</div>
        : tiendas.map(t => (
          <TarjetaTienda key={t.id} t={t}
            expandida={expandida} setExpandida={setExpandida}
            onEntrar={onEntrar} onConfig={onConfig} onPago={onPago}
            onCambiarEstado={onCambiarEstado} onEliminarUsuario={onEliminarUsuario} />
        ))
      }
    </div>
  )
}