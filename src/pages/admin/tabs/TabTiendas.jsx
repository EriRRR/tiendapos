import { Store, Search, X, Plus } from 'lucide-react'
import { T, btn } from '../../../styles/responsive'
import TarjetaTienda from '../components/TarjetaTienda'

export default function TabTiendas({
  tiendas, loading, busqueda, setBusqueda,
  expandida, setExpandida,
  onNueva, onEntrar, onConfig, onPago,
  onCambiarEstado, onEliminarUsuario,
}) {
  const sectionTitle = { fontSize: T.lg, fontWeight: 700, color: '#f1f5f9', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }

  const filtradas = tiendas.filter(t => {
    if (!busqueda) return true
    const q = busqueda.toLowerCase()
    return (
      t.nombre.toLowerCase().includes(q) ||
      t.email_contacto?.toLowerCase().includes(q) ||
      t.usuarios?.some(u => u.email.toLowerCase().includes(q))
    )
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.625rem' }}>
        <div style={sectionTitle}><Store size={18} /> Gestión de tiendas</div>
        <button onClick={onNueva} style={{ ...btn.base, ...btn.primary }}>
          <Plus size={15} /> Nueva tienda
        </button>
      </div>

      {/* Buscador */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', marginBottom: '1rem' }}>
        <Search size={14} color="#64748b" />
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, email o usuario..."
          style={{ border: 'none', outline: 'none', background: 'transparent', color: '#f1f5f9', fontSize: T.sm, width: '100%' }} />
        {busqueda && (
          <button onClick={() => setBusqueda('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', padding: 0 }}>
            <X size={14} />
          </button>
        )}
      </div>

      {loading
        ? <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Cargando...</div>
        : filtradas.length === 0
          ? <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', background: '#1e293b', borderRadius: '0.75rem', border: '1px solid #334155' }}>
              {busqueda ? `Sin resultados para "${busqueda}"` : 'No hay tiendas registradas'}
            </div>
          : filtradas.map(t => (
            <TarjetaTienda key={t.id} t={t}
              expandida={expandida} setExpandida={setExpandida}
              onEntrar={onEntrar} onConfig={onConfig} onPago={onPago}
              onCambiarEstado={onCambiarEstado} onEliminarUsuario={onEliminarUsuario} />
          ))
      }
    </div>
  )
}