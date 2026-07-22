import { useState, useMemo, useEffect, useRef } from 'react'
import { Search, X, SlidersHorizontal, Package, Tag, ChevronDown, ChevronUp } from 'lucide-react'
import { useInventario } from '../hooks/useInventario'
import { useCatalogo } from '../hooks/useCatalogo'
import { C, T, card } from '../styles/responsive'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function Catalogo() {
  const { tenantInfo } = useAuth()
  const { productos, loading } = useInventario()
  const { categorias, marcas } = useCatalogo()

  const [busqueda, setBusqueda] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [marcaFiltro, setMarcaFiltro] = useState('')
  const [panelFiltros, setPanelFiltros] = useState(false)
  const [productoDetalle, setProductoDetalle] = useState(null)
  const [config, setConfig] = useState(null)

  const [width, setWidth] = useState(window.innerWidth)
  useEffect(() => {
    const h = () => setWidth(window.innerWidth)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  const isMobile = width < 768

  // ── Cargar configuración (color primario) ──
  useEffect(() => {
    if (!tenantInfo?.tenant_id) return
    const tid = tenantInfo.tenant_id

    const cargarConfig = async () => {
      const { data, error } = await supabase
        .from('configuracion')
        .select('color_primario')
        .eq('tenant_id', tid)
        .single()
      if (data) setConfig(data)
      else if (error && error.code !== 'PGRST116') {
        console.error('Error cargando config:', error)
      }
    }
    cargarConfig()

    // Suscribirse a cambios en tiempo real
    const channel = supabase
      .channel(`catalogo-config-${tid}`)
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'configuracion',
          filter: `tenant_id=eq.${tid}`,
        },
        (payload) => {
          if (payload.new) setConfig(payload.new)
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [tenantInfo?.tenant_id])

  const color = config?.color_primario || '#2563eb'

  // Referencia para el color en el hover de tarjetas
  const colorRef = useRef(color)
  useEffect(() => {
    colorRef.current = color
  }, [color])

  // Solo productos activos y visibles en catálogo con stock > 0
  const productosFiltrados = useMemo(() => {
    return productos.filter(p => {
      if (!p.activo) return false
      if (p.visible_catalogo === false) return false

      if (busqueda) {
        const q = busqueda.toLowerCase()
        const matchNombre = p.nombre.toLowerCase().includes(q)
        const matchMarca = (p.marcas?.nombre || '').toLowerCase().includes(q)
        const matchCod = (p.cod || p.sku || '').toLowerCase().includes(q)
        if (!matchNombre && !matchMarca && !matchCod) return false
      }

      if (categoriaFiltro && p.categoria_id !== categoriaFiltro) return false
      if (marcaFiltro && p.marca_id !== marcaFiltro) return false

      return true
    })
  }, [productos, busqueda, categoriaFiltro, marcaFiltro])

  const hayFiltros = categoriaFiltro || marcaFiltro
  const limpiarFiltros = () => { setCategoriaFiltro(''); setMarcaFiltro('') }

  // Categorías y marcas que tienen productos visibles
  const categoriasConProductos = useMemo(() => {
    const ids = new Set(productos.filter(p => p.activo).map(p => p.categoria_id).filter(Boolean))
    return categorias.filter(c => ids.has(c.id))
  }, [productos, categorias])

  const marcasConProductos = useMemo(() => {
    const ids = new Set(productos.filter(p => p.activo).map(p => p.marca_id).filter(Boolean))
    return marcas.filter(m => ids.has(m.id))
  }, [productos, marcas])

  const PanelFiltrosLateral = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

      {/* Categorías */}
      <div style={{ ...card, padding: '1rem' }}>
        <div style={{ fontSize: T.sm, fontWeight: 700, color: color, marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: `2px solid ${color}`, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <Tag size={14} /> Categorías
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
          <button
            onClick={() => setCategoriaFiltro('')}
            style={{ textAlign: 'left', background: 'none', border: 'none', padding: '0.375rem 0.25rem', fontSize: T.sm, fontWeight: !categoriaFiltro ? 700 : 400, color: !categoriaFiltro ? color : C.text, cursor: 'pointer', borderRadius: '0.25rem', transition: 'color 0.15s' }}>
            Todas las categorías
          </button>
          {categoriasConProductos.map(c => (
            <button key={c.id}
              onClick={() => setCategoriaFiltro(categoriaFiltro === c.id ? '' : c.id)}
              style={{ textAlign: 'left', background: 'none', border: 'none', padding: '0.375rem 0.25rem', fontSize: T.sm, fontWeight: categoriaFiltro === c.id ? 700 : 400, color: categoriaFiltro === c.id ? color : C.text, cursor: 'pointer', borderRadius: '0.25rem', transition: 'color 0.15s' }}>
              {c.nombre}
            </button>
          ))}
        </div>
      </div>

      {/* Marcas */}
      {marcasConProductos.length > 0 && (
        <div style={{ ...card, padding: '1rem' }}>
          <div style={{ fontSize: T.sm, fontWeight: 700, color: color, marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: `2px solid ${color}`, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            Marcas
          </div>

          {marcaFiltro && (
            <button
              onClick={() => setMarcaFiltro('')}
              style={{ fontSize: T.xs, color: color, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, marginBottom: '0.5rem', padding: '0.125rem 0', display: 'block', textDecoration: 'underline' }}>
              Limpiar filtro marcas
            </button>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {marcasConProductos.map(m => (
              <label key={m.id}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.1875rem 0' }}>
                <input
                  type="checkbox"
                  checked={marcaFiltro === m.id}
                  onChange={() => setMarcaFiltro(marcaFiltro === m.id ? '' : m.id)}
                  style={{ width: '0.875rem', height: '0.875rem', accentColor: color, cursor: 'pointer', flexShrink: 0 }}
                />
                <span style={{ fontSize: T.sm, color: marcaFiltro === m.id ? color : C.text, fontWeight: marcaFiltro === m.id ? 600 : 400 }}>
                  {m.nombre}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <>
      <style>{`
        .catalogo-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          align-content: start;
        }
        @media (max-width: 1200px) { .catalogo-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 768px)  { .catalogo-grid { grid-template-columns: repeat(2, 1fr); gap: 0.75rem; } }
        @media (max-width: 480px)  { .catalogo-grid { grid-template-columns: repeat(2, 1fr); gap: 0.5rem; } }

        .catalogo-card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: box-shadow 0.2s, transform 0.2s;
          cursor: pointer;
        }
        .catalogo-card:hover {
          box-shadow: 0 4px 20px rgba(0,0,0,0.10);
          transform: translateY(-2px);
        }
      `}</style>

      <div style={{ maxWidth: '90rem', margin: '0 auto' }}>

        {/* Buscador top */}
        <div style={{ marginBottom: '1.25rem', display: 'flex', gap: '0.625rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '12rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: C.bgWhite, border: `1px solid ${C.border}`, borderRadius: '0.625rem', padding: '0.625rem 0.875rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Search size={16} color={C.textMuted} />
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar productos, marcas..."
              style={{ border: 'none', outline: 'none', fontSize: T.base, width: '100%', background: 'transparent', color: C.text }}
            />
            {busqueda && (
              <button onClick={() => setBusqueda('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, display: 'flex', padding: 0 }}>
                <X size={16} />
              </button>
            )}
          </div>

          {/* Botón filtros móvil */}
          {isMobile && (
            <button
              onClick={() => setPanelFiltros(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', background: hayFiltros ? `${color}15` : C.bgWhite, color: hayFiltros ? color : C.textSecondary, border: `1px solid ${hayFiltros ? color : C.border}`, borderRadius: '0.625rem', padding: '0.625rem 0.875rem', fontSize: T.sm, fontWeight: 600, cursor: 'pointer' }}>
              <SlidersHorizontal size={15} />
              Filtros {hayFiltros && '•'}
            </button>
          )}

          {/* Info resultados */}
          <div style={{ fontSize: T.sm, color: C.textMuted, whiteSpace: 'nowrap' }}>
            {productosFiltrados.length} producto{productosFiltrados.length !== 1 ? 's' : ''}
            {(busqueda || hayFiltros) && (
              <button onClick={() => { setBusqueda(''); limpiarFiltros() }}
                style={{ marginLeft: '0.5rem', fontSize: T.xs, color: C.danger, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Filtros móvil desplegables */}
        {isMobile && panelFiltros && (
          <div style={{ marginBottom: '1rem' }}>
            <PanelFiltrosLateral />
          </div>
        )}

        {/* Layout principal */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '13rem 1fr', gap: '1.25rem', alignItems: 'start' }}>

          {/* Sidebar filtros desktop */}
          {!isMobile && <PanelFiltrosLateral />}

          {/* Grid productos */}
          <div>
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: C.textMuted }}>
                Cargando catálogo...
              </div>
            ) : productosFiltrados.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: C.textMuted, background: C.bgWhite, borderRadius: '0.75rem', border: `1px solid ${C.border}` }}>
                <Package size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.2 }} />
                <div style={{ fontSize: T.base, fontWeight: 600, marginBottom: '0.25rem', color: C.text }}>
                  Sin resultados
                </div>
                <div style={{ fontSize: T.sm }}>
                  {busqueda ? `No encontramos "${busqueda}"` : 'No hay productos en esta categoría'}
                </div>
                {(busqueda || hayFiltros) && (
                  <button onClick={() => { setBusqueda(''); limpiarFiltros() }}
                    style={{ marginTop: '0.75rem', fontSize: T.sm, color: color, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                    Ver todos los productos
                  </button>
                )}
              </div>
            ) : (
              <div className="catalogo-grid">
                {productosFiltrados.map(p => (
                  <div
                    key={p.id}
                    className="catalogo-card"
                    onClick={() => setProductoDetalle(p)}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = colorRef.current
                      e.currentTarget.style.boxShadow = `0 4px 12px ${colorRef.current}20`
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = C.border
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    {/* Foto */}
                    {p.foto_url ? (
                      <div style={{ position: 'relative', paddingTop: '75%', background: '#f9fafb', flexShrink: 0 }}>
                        <img
                          src={p.foto_url}
                          alt={p.nombre}
                          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', padding: '0.5rem' }}
                        />
                        {p.stock === 0 && (
                          <div style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', background: C.danger, color: '#fff', fontSize: '0.6875rem', fontWeight: 700, borderRadius: '0.25rem', padding: '0.125rem 0.5rem' }}>
                            Agotado
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ position: 'relative', paddingTop: '75%', background: '#f3f4f6', flexShrink: 0 }}>
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>
                          📦
                        </div>
                        {p.stock === 0 && (
                          <div style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', background: C.danger, color: '#fff', fontSize: '0.6875rem', fontWeight: 700, borderRadius: '0.25rem', padding: '0.125rem 0.5rem' }}>
                            Agotado
                          </div>
                        )}
                      </div>
                    )}

                    {/* Info */}
                    <div style={{ padding: '0.75rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {p.marcas?.nombre && (
                        <div style={{ fontSize: T.xs, color: C.textMuted, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {p.marcas.nombre}
                        </div>
                      )}
                      <div style={{ fontSize: T.sm, fontWeight: 600, color: C.text, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {p.nombre}
                      </div>
                      {p.categorias?.nombre && (
                        <div style={{ fontSize: T.xs, color: C.textMuted }}>
                          {p.categorias.nombre}
                        </div>
                      )}

                      {/* Atributos resumidos */}
                      {p.producto_atributos?.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.125rem' }}>
                          {p.producto_atributos.slice(0, 3).map(pa => (
                            <span key={pa.id} style={{ fontSize: '0.625rem', background: C.bgMuted, borderRadius: '9999px', padding: '0.125rem 0.5rem', color: C.textSecondary }}>
                              {pa.valor}
                            </span>
                          ))}
                        </div>
                      )}

                      <div style={{ marginTop: 'auto', paddingTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: T.lg, fontWeight: 700, color: p.stock === 0 ? C.textMuted : color }}>
                          L {parseFloat(p.precio).toFixed(2)}
                        </div>
                        {p.stock > 0 && p.stock <= p.stock_minimo && (
                          <span style={{ fontSize: '0.625rem', background: '#fef9c3', color: '#92400e', borderRadius: '9999px', padding: '0.125rem 0.5rem', fontWeight: 600 }}>
                            Pocas unidades
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal detalle producto */}
      {productoDetalle && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}
          onClick={e => { if (e.target === e.currentTarget) setProductoDetalle(null) }}>
          <div style={{ background: C.bgWhite, borderRadius: '1rem', width: '100%', maxWidth: '32rem', maxHeight: '90vh', overflowY: 'auto', animation: 'fadeIn 0.2s ease' }}>

            {/* Foto grande */}
            {productoDetalle.foto_url ? (
              <div style={{ position: 'relative', paddingTop: '60%', background: '#f9fafb', borderRadius: '1rem 1rem 0 0', overflow: 'hidden' }}>
                <img src={productoDetalle.foto_url} alt={productoDetalle.nombre}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', padding: '1rem' }} />
                <button onClick={() => setProductoDetalle(null)}
                  style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%', width: '2rem', height: '2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div style={{ position: 'relative', paddingTop: '40%', background: '#f3f4f6', borderRadius: '1rem 1rem 0 0' }}>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem' }}>📦</div>
                <button onClick={() => setProductoDetalle(null)}
                  style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', background: 'rgba(0,0,0,0.3)', border: 'none', borderRadius: '50%', width: '2rem', height: '2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Detalle */}
            <div style={{ padding: '1.25rem' }}>
              {productoDetalle.marcas?.nombre && (
                <div style={{ fontSize: T.xs, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>
                  {productoDetalle.marcas.nombre}
                </div>
              )}

              <div style={{ fontSize: T.xl, fontWeight: 700, color: C.text, marginBottom: '0.5rem', lineHeight: 1.3 }}>
                {productoDetalle.nombre}
              </div>

              {productoDetalle.categorias?.nombre && (
                <div style={{ display: 'inline-block', fontSize: T.xs, background: `${color}15`, color: color, borderRadius: '9999px', padding: '0.1875rem 0.625rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                  {productoDetalle.categorias.nombre}
                </div>
              )}

              {productoDetalle.descripcion && (
                <p style={{ fontSize: T.sm, color: C.textSecondary, lineHeight: 1.6, marginBottom: '0.875rem' }}>
                  {productoDetalle.descripcion}
                </p>
              )}

              {/* Atributos */}
              {productoDetalle.producto_atributos?.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: T.xs, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
                    Características
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    {productoDetalle.producto_atributos.map(pa => (
                      <div key={pa.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: T.sm, padding: '0.375rem 0', borderBottom: `1px solid ${C.borderLight}` }}>
                        <span style={{ color: C.textSecondary }}>{pa.categoria_atributos?.nombre}</span>
                        <span style={{ fontWeight: 600, color: C.text }}>{pa.valor}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Precio y disponibilidad */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: productoDetalle.stock === 0 ? '#fef2f2' : `${color}10`, borderRadius: '0.75rem', marginTop: '0.5rem' }}>
                <div>
                  <div style={{ fontSize: T.xs, color: C.textMuted, marginBottom: '0.25rem' }}>Precio</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: productoDetalle.stock === 0 ? C.textMuted : color }}>
                    L {parseFloat(productoDetalle.precio).toFixed(2)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: T.xs, color: C.textMuted, marginBottom: '0.25rem' }}>Disponibilidad</div>
                  <div style={{ fontSize: T.sm, fontWeight: 700, color: productoDetalle.stock === 0 ? C.danger : color }}>
                    {productoDetalle.stock === 0 ? 'Agotado' : productoDetalle.stock <= productoDetalle.stock_minimo ? 'Pocas unidades' : 'Disponible'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:scale(0.97); } to { opacity:1; transform:scale(1); } }
      `}</style>
    </>
  )
}