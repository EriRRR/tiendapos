import { DollarSign, AlertTriangle, CheckCircle, Calendar } from 'lucide-react'
import { T, btn } from '../../../styles/responsive'

export default function TabPagos({ tiendas, conRetraso, alDia, onPago, onConfig }) {
  const sectionTitle = { fontSize: T.lg, fontWeight: 700, color: '#f1f5f9', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }

  const retrasadas = tiendas.filter(t => t.dias_retraso > 0 && t.dias_retraso <= t.dias_gracia && t.estado !== 'deshabilitado')
  const alDiaTiendas = tiendas.filter(t => t.dias_retraso === 0 && t.estado !== 'deshabilitado')

  return (
    <div>
      <div style={sectionTitle}><DollarSign size={18} /> Estado de pagos</div>

      {/* Con retraso */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: T.xs, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <AlertTriangle size={13} /> Con retraso ({conRetraso})
        </div>
        {retrasadas.length === 0 ? (
          <div style={{ padding: '1.25rem', textAlign: 'center', color: '#64748b', background: '#1e293b', borderRadius: '0.75rem', border: '1px solid #334155', fontSize: T.sm }}>
            ✅ Ninguna con retraso
          </div>
        ) : retrasadas.map(t => (
          <div key={t.id} style={{ background: '#1e293b', border: '1px solid #92400e', borderRadius: '0.75rem', padding: '1rem 1.25rem', marginBottom: '0.625rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: T.base, fontWeight: 700, color: '#f1f5f9' }}>{t.nombre}</div>
              {t.slug && <div style={{ fontSize: T.xs, color: '#64748b', fontFamily: 'monospace' }}>/catalogo/{t.slug}</div>}
              <div style={{ fontSize: T.xs, color: '#fbbf24', fontWeight: 600, marginTop: '0.25rem' }}>
                {t.dias_retraso}d de retraso · {t.dias_gracia - t.dias_retraso}d antes de deshabilitar
              </div>
              <div style={{ fontSize: T.xs, color: '#64748b' }}>
                L {parseFloat(t.precio_plan || 0).toFixed(2)} / {t.ciclo_pago || 'mes'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button onClick={() => onPago(t)}
                style={{ ...btn.base, background: '#052e16', color: '#34d399', border: '1px solid #065f46', fontSize: T.xs }}>
                <DollarSign size={13} /> Registrar pago
              </button>
              <button onClick={() => onConfig(t)}
                style={{ ...btn.base, background: '#334155', color: '#94a3b8', border: 'none', fontSize: T.xs }}>
                <Calendar size={13} /> Configurar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Al día */}
      <div>
        <div style={{ fontSize: T.xs, fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <CheckCircle size={13} /> Al día ({alDia})
        </div>
        {alDiaTiendas.map(t => (
          <div key={t.id} style={{ background: '#1e293b', border: '1px solid #065f46', borderRadius: '0.75rem', padding: '0.875rem 1.25rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.625rem' }}>
            <div>
              <div style={{ fontSize: T.sm, fontWeight: 600, color: '#f1f5f9' }}>{t.nombre}</div>
              {t.slug && <div style={{ fontSize: T.xs, color: '#64748b', fontFamily: 'monospace' }}>/catalogo/{t.slug}</div>}
              <div style={{ fontSize: T.xs, color: '#64748b', marginTop: '0.125rem' }}>
                Último pago: {t.fecha_pago ? new Date(t.fecha_pago + 'T00:00:00').toLocaleDateString('es-HN') : '—'}
                {' · '}L {parseFloat(t.precio_plan || 0).toFixed(2)} / {t.ciclo_pago || 'mes'}
              </div>
              {t.notas_pago && <div style={{ fontSize: T.xs, color: '#475569' }}>📝 {t.notas_pago}</div>}
            </div>
            <div style={{ display: 'flex', gap: '0.375rem' }}>
              <button onClick={() => onPago(t)}
                style={{ ...btn.base, background: '#052e16', color: '#34d399', border: '1px solid #065f46', fontSize: T.xs, padding: '0.3125rem 0.625rem' }}>
                <DollarSign size={13} /> Renovar
              </button>
              <button onClick={() => onConfig(t)}
                style={{ ...btn.base, background: '#334155', color: '#94a3b8', border: 'none', fontSize: T.xs, padding: '0.3125rem 0.5rem' }}>
                <Calendar size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}