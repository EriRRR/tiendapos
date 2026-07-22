import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Search, X, Phone, Clock, MapPin, ShoppingBag, Loader, ChevronLeft, ChevronRight, Filter } from 'lucide-react'

const POR_PAGINA = 12

export default function CatalogoPublico() {
  const { slug } = useParams()

  const [data,            setData]            = useState(null)
  const [loading,         setLoading]         = useState(true)
  const [busqueda,        setBusqueda]        = useState('')
  const [catFiltro,       setCatFiltro]       = useState('')
  const [colorFiltro,     setColorFiltro]     = useState('')
  const [tallaFiltro,     setTallaFiltro]     = useState('')
  const [precioMax,       setPrecioMax]       = useState('')
  const [soloDisponibles, setSoloDisponibles] = useState(false)
  const [mostrarFiltros,  setMostrarFiltros]  = useState(false)
  const [productoModal,   setProductoModal]   = useState(null)
  const [fotoActiva,      setFotoActiva]      = useState(0)
  const [varianteSelec,   setVarianteSelec]   = useState(null)
  const [carrito,         setCarrito]         = useState([])
  const [pagina,          setPagina]          = useState(1)
  const [cargandoMas,     setCargandoMas]     = useState(false)
  const loaderRef = useRef(null)

  useEffect(() => {
    if (!slug) return
    supabase.rpc('get_catalogo_por_slug', { p_slug: slug })
      .then(({ data: d }) => { setData(d); setLoading(false) })
  }, [slug])

  const color       = data?.color_primario  || '#2563eb'
  const moneda      = data?.moneda          || 'L'
  const mostrarPrecio = data?.mostrar_precio !== false

  // Colores y tallas únicos para filtros
  const todosColores = [...new Set((data?.productos || []).flatMap(p => p.colores || []).filter(Boolean))]
  const todasTallas  = [...new Set((data?.productos || []).flatMap(p => p.tallas  || []).filter(Boolean))]

  const todosProductos = (data?.productos || []).filter(p => {
    const q         = busqueda.toLowerCase()
    const matchBusq = !busqueda || p.nombre.toLowerCase().includes(q) || (p.cod || '').includes(q)
    const matchCat  = !catFiltro || p.categoria === catFiltro
    const matchColor= !colorFiltro || (p.colores || []).includes(colorFiltro)
    const matchTalla= !tallaFiltro || (p.tallas  || []).includes(tallaFiltro)
    const matchPrecio = !precioMax || parseFloat(p.precio) <= parseFloat(precioMax)
    const matchDisp = !soloDisponibles || p.stock > 0 || (p.variantes || []).some(v => v.stock > 0)
    return matchBusq && matchCat && matchColor && matchTalla && matchPrecio && matchDisp
  })

  const productosVisibles = todosProductos.slice(0, pagina * POR_PAGINA)
  const hayMas            = productosVisibles.length < todosProductos.length

  useEffect(() => { setPagina(1) }, [busqueda, catFiltro, colorFiltro, tallaFiltro, precioMax, soloDisponibles])

  // Infinite scroll
  useEffect(() => {
    if (!hayMas) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !cargandoMas) {
        setCargandoMas(true)
        setTimeout(() => { setPagina(p => p + 1); setCargandoMas(false) }, 400)
      }
    }, { threshold: 0.1, rootMargin: '200px' })
    if (loaderRef.current) observer.observe(loaderRef.current)
    return () => observer.disconnect()
  }, [hayMas, cargandoMas])

  const categorias = [...new Set((data?.productos || []).map(p => p.categoria).filter(Boolean))]

  // Carrito
  const agregarAlPedido = (p, variante = null) => {
    const key   = variante ? `${p.id}-${variante.id}` : p.id
    const nombre = variante ? `${p.nombre} — ${variante.nombre}` : p.nombre
    const precio = variante?.precio || p.precio
    setCarrito(prev => {
      const existe = prev.find(i => i.key === key)
      if (existe) return prev.map(i => i.key === key ? { ...i, cantidad: i.cantidad + 1 } : i)
      return [...prev, { key, nombre, precio, cantidad: 1, foto: (p.fotos?.[0] || p.foto_url) }]
    })
  }

  const cambiarCantidad = (key, cantidad) => {
    if (cantidad <= 0) { setCarrito(prev => prev.filter(i => i.key !== key)); return }
    setCarrito(prev => prev.map(i => i.key === key ? { ...i, cantidad } : i))
  }

  const totalPedido = carrito.reduce((s, i) => s + parseFloat(i.precio) * i.cantidad, 0)

  const enviarPedidoWhatsApp = () => {
    if (!data?.whatsapp) return
    const num    = data.whatsapp.replace(/\D/g, '')
    const lineas = carrito.map(i =>
      `• ${i.nombre} x${i.cantidad} = ${moneda} ${(parseFloat(i.precio) * i.cantidad).toFixed(2)}`
    ).join('\n')
    const msg = encodeURIComponent(`¡Hola! Me gustaría hacer un pedido:\n\n${lineas}\n\n*Total: ${moneda} ${totalPedido.toFixed(2)}*\n\n¿Está disponible?`)
    window.open(`https://wa.me/${num}?text=${msg}`, '_blank')
  }

  const consultarWhatsApp = (p) => {
    if (!data?.whatsapp) return
    const num = data.whatsapp.replace(/\D/g, '')
    const msg = encodeURIComponent(`¡Hola! Vi *${p.nombre}* en su catálogo${mostrarPrecio ? ` a ${moneda} ${parseFloat(p.precio).toFixed(2)}` : ''}. ¿Está disponible?`)
    window.open(`https://wa.me/${num}?text=${msg}`, '_blank')
  }

  const abrirModal = (p) => {
    setProductoModal(p)
    setFotoActiva(0)
    setVarianteSelec(null)
  }

  const fotosProducto = (p) => {
    const fotos = p.fotos?.filter(Boolean) || []
    if (fotos.length === 0 && p.foto_url) return [p.foto_url]
    return fotos
  }

  const COLOR_HEX = {
    'Negro': '#111', 'Blanco': '#f9fafb', 'Gris': '#9ca3af', 'Rojo': '#ef4444',
    'Azul': '#3b82f6', 'Verde': '#22c55e', 'Amarillo': '#eab308', 'Naranja': '#f97316',
    'Morado': '#a855f7', 'Rosa': '#ec4899', 'Café': '#92400e', 'Beige': '#d4b483',
  }

  const s = {
    page:  { minHeight: '100vh', background: '#f8fafc', fontFamily: '-apple-system, sans-serif', color: '#1e293b' },
    btn:   { display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.625rem 1rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' },
  }

  if (loading) return (
    <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center', color: '#64748b' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏪</div>
        <div>Cargando catálogo...</div>
      </div>
    </div>
  )

  if (!data || data.activo === false) return (
    <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center', color: '#64748b' }}>
        <ShoppingBag size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
        <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>Catálogo no disponible</div>
      </div>
    </div>
  )

  const hayFiltrosActivos = busqueda || catFiltro || colorFiltro || tallaFiltro || precioMax || soloDisponibles

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={{ background: color, color: '#fff', padding: '1.25rem 1rem 1rem' }}>
        <div style={{ maxWidth: '56rem', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '0.875rem', flexWrap: 'wrap' }}>
          {data.logo_url ? (
            <img src={data.logo_url} alt="Logo"
              style={{ width: '3.5rem', height: '3.5rem', objectFit: 'contain', borderRadius: '0.625rem', background: '#fff', padding: '0.25rem', flexShrink: 0 }} />
          ) : (
            <div style={{ width: '3.5rem', height: '3.5rem', background: 'rgba(255,255,255,0.2)', borderRadius: '0.625rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', flexShrink: 0 }}>🏪</div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '1.375rem', fontWeight: 800 }}>{data.nombre_tienda}</div>
            {data.descripcion && <div style={{ fontSize: '0.8125rem', opacity: 0.85, marginTop: '0.25rem' }}>{data.descripcion}</div>}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.375rem', flexWrap: 'wrap', fontSize: '0.8125rem', opacity: 0.9 }}>
              {data.telefono && <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Phone size={13} />{data.telefono}</span>}
              {data.horario  && <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={13} />{data.horario}</span>}
              {data.ciudad   && <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><MapPin size={13} />{data.ciudad}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: '56rem', margin: '0 auto', padding: '1rem' }}>

        {/* Barra de búsqueda + filtros sticky */}
        <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f8fafc', paddingTop: '0.75rem', paddingBottom: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', flex: 1, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <Search size={14} color="#94a3b8" />
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar producto..."
                style={{ border: 'none', outline: 'none', fontSize: '0.875rem', width: '100%', background: 'transparent', color: '#1e293b' }} />
              {busqueda && <button onClick={() => setBusqueda('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, display: 'flex' }}><X size={14} /></button>}
            </div>
            <button
              onClick={() => setMostrarFiltros(v => !v)}
              style={{ ...s.btn, background: hayFiltrosActivos ? color : '#fff', color: hayFiltrosActivos ? '#fff' : '#475569', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '0.5rem 0.75rem' }}>
              <Filter size={15} />
              {hayFiltrosActivos ? 'Filtros activos' : 'Filtrar'}
            </button>
          </div>

          {/* Panel de filtros */}
          {mostrarFiltros && (
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1rem', marginBottom: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.875rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(10rem, 1fr))', gap: '0.75rem' }}>

                {/* Categoría */}
                {categorias.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.375rem' }}>Categoría</div>
                    <select value={catFiltro} onChange={e => setCatFiltro(e.target.value)}
                      style={{ width: '100%', padding: '0.4375rem 0.625rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem', fontSize: '0.875rem', background: '#fff', color: '#1e293b', cursor: 'pointer' }}>
                      <option value="">Todas</option>
                      {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                )}

                {/* Precio máximo */}
                {mostrarPrecio && (
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.375rem' }}>Precio máximo ({moneda})</div>
                    <input type="number" value={precioMax} onChange={e => setPrecioMax(e.target.value)}
                      placeholder="Sin límite"
                      style={{ width: '100%', padding: '0.4375rem 0.625rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem', fontSize: '0.875rem', color: '#1e293b', boxSizing: 'border-box' }} />
                  </div>
                )}

                {/* Solo disponibles */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: '#475569', userSelect: 'none' }}>
                    <input type="checkbox" checked={soloDisponibles} onChange={e => setSoloDisponibles(e.target.checked)} style={{ accentColor: color, width: '1rem', height: '1rem' }} />
                    Solo disponibles
                  </label>
                </div>
              </div>

              {/* Colores */}
              {todosColores.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.375rem' }}>Color</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                    <button onClick={() => setColorFiltro('')}
                      style={{ padding: '0.25rem 0.625rem', border: `1px solid ${!colorFiltro ? color : '#e2e8f0'}`, borderRadius: '9999px', background: !colorFiltro ? color : '#fff', color: !colorFiltro ? '#fff' : '#475569', cursor: 'pointer', fontSize: '0.8125rem' }}>
                      Todos
                    </button>
                    {todosColores.map(c => (
                      <button key={c} onClick={() => setColorFiltro(colorFiltro === c ? '' : c)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.25rem 0.625rem', border: `1px solid ${colorFiltro === c ? color : '#e2e8f0'}`, borderRadius: '9999px', background: colorFiltro === c ? `${color}15` : '#fff', color: colorFiltro === c ? color : '#475569', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: colorFiltro === c ? 700 : 400 }}>
                        <div style={{ width: '0.75rem', height: '0.75rem', borderRadius: '50%', background: COLOR_HEX[c] || '#ddd', border: '1px solid rgba(0,0,0,0.15)' }} />
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tallas */}
              {todasTallas.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.375rem' }}>Talla</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                    <button onClick={() => setTallaFiltro('')}
                      style={{ padding: '0.25rem 0.625rem', border: `1px solid ${!tallaFiltro ? color : '#e2e8f0'}`, borderRadius: '0.375rem', background: !tallaFiltro ? color : '#fff', color: !tallaFiltro ? '#fff' : '#475569', cursor: 'pointer', fontSize: '0.8125rem' }}>
                      Todas
                    </button>
                    {todasTallas.map(t => (
                      <button key={t} onClick={() => setTallaFiltro(tallaFiltro === t ? '' : t)}
                        style={{ padding: '0.25rem 0.625rem', border: `1px solid ${tallaFiltro === t ? color : '#e2e8f0'}`, borderRadius: '0.375rem', background: tallaFiltro === t ? `${color}15` : '#fff', color: tallaFiltro === t ? color : '#475569', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: tallaFiltro === t ? 700 : 400 }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Limpiar filtros */}
              {hayFiltrosActivos && (
                <button onClick={() => { setCatFiltro(''); setColorFiltro(''); setTallaFiltro(''); setPrecioMax(''); setSoloDisponibles(false); setBusqueda('') }}
                  style={{ alignSelf: 'flex-start', fontSize: '0.8125rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                  ✕ Limpiar todos los filtros
                </button>
              )}
            </div>
          )}

          <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
            {todosProductos.length} producto{todosProductos.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Grid de productos */}
        {productosVisibles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
            <ShoppingBag size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
            <div>No se encontraron productos</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(9rem, 1fr))', gap: '0.75rem', marginBottom: '1rem', paddingBottom: carrito.length > 0 ? '8rem' : '1rem' }}>
              {productosVisibles.map((p, idx) => {
                const fotos     = fotosProducto(p)
                const tieneVar  = (p.variantes || []).length > 0
                const stockTotal= tieneVar
                  ? (p.variantes || []).reduce((s, v) => s + (v.stock || 0), 0)
                  : p.stock

                return (
                  <div key={p.id} onClick={() => abrirModal(p)}
                    style={{ background: '#fff', borderRadius: '0.75rem', border: '1px solid #e2e8f0', overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: 'column', transition: 'transform 0.15s, box-shadow 0.15s', animation: `fadeInUp 0.3s ease ${(idx % POR_PAGINA) * 0.03}s both` }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${color}25` }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}>

                    {/* Foto */}
                    <div style={{ position: 'relative' }}>
                      {fotos[0] ? (
                        <img src={fotos[0]} alt={p.nombre} loading="lazy"
                          style={{ width: '100%', height: '8rem', objectFit: 'cover', display: 'block' }} />
                      ) : (
                        <div style={{ width: '100%', height: '8rem', background: `${color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ShoppingBag size={28} color={color} style={{ opacity: 0.4 }} />
                        </div>
                      )}
                      {stockTotal === 0 && (
                        <div style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: '0.625rem', fontWeight: 700, borderRadius: '0.25rem', padding: '0.125rem 0.375rem' }}>
                          AGOTADO
                        </div>
                      )}
                      {fotos.length > 1 && (
                        <div style={{ position: 'absolute', bottom: '0.375rem', right: '0.375rem', background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: '0.625rem', borderRadius: '0.25rem', padding: '0.125rem 0.375rem' }}>
                          +{fotos.length - 1} fotos
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ padding: '0.625rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {p.categoria && (
                        <div style={{ fontSize: '0.625rem', color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{p.categoria}</div>
                      )}
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {p.nombre}
                      </div>

                      {/* Colores disponibles en miniatura */}
                      {(p.colores || []).length > 0 && (
                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.125rem' }}>
                          {(p.colores || []).slice(0, 5).map(c => (
                            <div key={c} style={{ width: '0.875rem', height: '0.875rem', borderRadius: '50%', background: COLOR_HEX[c] || '#ddd', border: '1px solid rgba(0,0,0,0.15)' }} title={c} />
                          ))}
                          {(p.colores || []).length > 5 && <span style={{ fontSize: '0.625rem', color: '#94a3b8' }}>+{p.colores.length - 5}</span>}
                        </div>
                      )}

                      {/* Tallas disponibles */}
                      {(p.tallas || []).length > 0 && (
                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                          {(p.tallas || []).slice(0, 4).map(t => (
                            <span key={t} style={{ fontSize: '0.5625rem', border: '1px solid #e2e8f0', borderRadius: '0.25rem', padding: '0.0625rem 0.25rem', color: '#475569' }}>{t}</span>
                          ))}
                          {(p.tallas || []).length > 4 && <span style={{ fontSize: '0.5625rem', color: '#94a3b8' }}>+{p.tallas.length - 4}</span>}
                        </div>
                      )}

                      {/* Precio */}
                      <div style={{ marginTop: 'auto', paddingTop: '0.25rem' }}>
                        {mostrarPrecio && (
                          <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: stockTotal === 0 ? '#94a3b8' : color }}>
                            {moneda} {parseFloat(p.precio).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Sentinel scroll */}
            {hayMas && (
              <div ref={loaderRef} style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem 0' }}>
                {cargandoMas ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: '#94a3b8' }}>
                    <Loader size={24} color={color} style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: '0.8125rem' }}>Cargando más...</span>
                  </div>
                ) : <div style={{ height: '1px' }} />}
              </div>
            )}

            {!hayMas && todosProductos.length > POR_PAGINA && (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                ✓ Has visto todos los productos ({todosProductos.length})
              </div>
            )}
          </>
        )}
      </div>

      {/* Carrito flotante */}
      {carrito.length > 0 && data?.whatsapp && (
        <div style={{ position: 'fixed', bottom: '1rem', left: '50%', transform: 'translateX(-50%)', zIndex: 50, width: 'calc(100% - 2rem)', maxWidth: '32rem' }}>
          <div style={{ background: '#fff', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>
                🛒 Mi pedido ({carrito.reduce((s, i) => s + i.cantidad, 0)} items)
              </span>
              <button onClick={() => setCarrito([])} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}><X size={16} /></button>
            </div>
            <div style={{ maxHeight: '10rem', overflowY: 'auto' }}>
              {carrito.map(item => (
                <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 1rem', borderBottom: '1px solid #f8fafc' }}>
                  {item.foto && <img src={item.foto} alt="" style={{ width: '2rem', height: '2rem', objectFit: 'cover', borderRadius: '0.25rem', flexShrink: 0 }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nombre}</div>
                    {mostrarPrecio && <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>{moneda} {parseFloat(item.precio).toFixed(2)} c/u</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}>
                    <button onClick={() => cambiarCantidad(item.key, item.cantidad - 1)} style={{ width: '1.5rem', height: '1.5rem', border: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: '0.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>−</button>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, minWidth: '1.25rem', textAlign: 'center' }}>{item.cantidad}</span>
                    <button onClick={() => cambiarCantidad(item.key, item.cantidad + 1)} style={{ width: '1.5rem', height: '1.5rem', border: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: '0.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>+</button>
                  </div>
                  {mostrarPrecio && (
                    <div style={{ fontSize: '0.8125rem', fontWeight: 700, color, minWidth: '4rem', textAlign: 'right', flexShrink: 0 }}>
                      {moneda} {(parseFloat(item.precio) * item.cantidad).toFixed(2)}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', background: '#f8fafc' }}>
              {mostrarPrecio && (
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Total</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 800, color }}>{moneda} {totalPedido.toFixed(2)}</div>
                </div>
              )}
              <button onClick={enviarPedidoWhatsApp}
                style={{ ...s.btn, background: '#25d366', color: '#fff', flex: 1, justifyContent: 'center', padding: '0.75rem' }}>
                💬 Pedir por WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal detalle producto */}
      {productoModal && (() => {
        const p     = productoModal
        const fotos = fotosProducto(p)
        const variantesActivas = (p.variantes || []).filter(v => v.activo !== false)
        const coloresUnicos    = [...new Set(variantesActivas.map(v => v.color).filter(Boolean))]
        const tallasFiltradas  = varianteSelec?.color
          ? [...new Set(variantesActivas.filter(v => v.color === varianteSelec?.color).map(v => v.talla).filter(Boolean))]
          : [...new Set(variantesActivas.map(v => v.talla).filter(Boolean))]

        const precioMostrar = varianteSelec?.precio || p.precio
        const stockMostrar  = varianteSelec ? varianteSelec.stock : (variantesActivas.length > 0 ? variantesActivas.reduce((s, v) => s + v.stock, 0) : p.stock)
        const disponible    = stockMostrar > 0

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }}
            onClick={e => { if (e.target === e.currentTarget) setProductoModal(null) }}>
            <div style={{ background: '#fff', borderRadius: '1.25rem 1.25rem 0 0', width: '100%', maxWidth: '32rem', maxHeight: '92vh', overflowY: 'auto' }}>

              {/* Galería de fotos */}
              <div style={{ position: 'relative', background: '#000' }}>
                {fotos.length > 0 ? (
                  <img src={fotos[fotoActiva]} alt={p.nombre}
                    style={{ width: '100%', height: '18rem', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div style={{ width: '100%', height: '14rem', background: `${color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShoppingBag size={48} color={color} style={{ opacity: 0.4 }} />
                  </div>
                )}

                {/* Controles galería */}
                {fotos.length > 1 && (
                  <>
                    <button onClick={() => setFotoActiva(p => Math.max(0, p - 1))} disabled={fotoActiva === 0}
                      style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%', width: '2rem', height: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', opacity: fotoActiva === 0 ? 0.3 : 1 }}>
                      <ChevronLeft size={16} />
                    </button>
                    <button onClick={() => setFotoActiva(p => Math.min(fotos.length - 1, p + 1))} disabled={fotoActiva === fotos.length - 1}
                      style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%', width: '2rem', height: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', opacity: fotoActiva === fotos.length - 1 ? 0.3 : 1 }}>
                      <ChevronRight size={16} />
                    </button>

                    {/* Dots */}
                    <div style={{ position: 'absolute', bottom: '0.5rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '0.375rem' }}>
                      {fotos.map((_, i) => (
                        <button key={i} onClick={() => setFotoActiva(i)}
                          style={{ width: i === fotoActiva ? '1.5rem' : '0.5rem', height: '0.5rem', borderRadius: '9999px', background: '#fff', border: 'none', cursor: 'pointer', opacity: i === fotoActiva ? 1 : 0.5, transition: 'all 0.2s', padding: 0 }} />
                      ))}
                    </div>
                  </>
                )}

                {/* Miniaturas */}
                {fotos.length > 1 && (
                  <div style={{ display: 'flex', gap: '0.375rem', padding: '0.5rem', background: '#f8fafc', overflowX: 'auto' }}>
                    {fotos.map((f, i) => (
                      <img key={i} src={f} alt="" onClick={() => setFotoActiva(i)}
                        style={{ width: '3.5rem', height: '3.5rem', objectFit: 'cover', borderRadius: '0.375rem', border: `2px solid ${i === fotoActiva ? color : '#e2e8f0'}`, cursor: 'pointer', flexShrink: 0, transition: 'border-color 0.15s' }} />
                    ))}
                  </div>
                )}

                {/* Botón cerrar */}
                <button onClick={() => setProductoModal(null)}
                  style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%', width: '2rem', height: '2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <X size={16} />
                </button>
              </div>

              {/* Contenido */}
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

                {/* Nombre y precio */}
                <div>
                  {p.categoria && (
                    <div style={{ fontSize: '0.75rem', color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem' }}>
                      {p.categoria}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', lineHeight: 1.3, flex: 1 }}>{p.nombre}</div>
                    {mostrarPrecio && (
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color, flexShrink: 0 }}>
                        {moneda} {parseFloat(precioMostrar).toFixed(2)}
                      </div>
                    )}
                  </div>
                  {p.marca && <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>{p.marca}</div>}
                </div>

                {/* Disponibilidad */}
                <div style={{ background: disponible ? '#f0fdf4' : '#fef2f2', border: `1px solid ${disponible ? '#bbf7d0' : '#fecaca'}`, borderRadius: '0.5rem', padding: '0.625rem', fontSize: '0.875rem', color: disponible ? '#16a34a' : '#ef4444', fontWeight: 600, textAlign: 'center' }}>
                  {varianteSelec
                    ? (disponible ? `✓ ${stockMostrar} en stock` : '✗ Agotado')
                    : (disponible ? '✓ Disponible' : '✗ Agotado')}
                </div>

                {/* Selector de colores */}
                {coloresUnicos.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem' }}>
                      Color{varianteSelec?.color ? `: ${varianteSelec.color}` : ''}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {coloresUnicos.map(c => {
                        const seleccionado = varianteSelec?.color === c
                        const agotado      = !variantesActivas.filter(v => v.color === c).some(v => v.stock > 0)
                        return (
                          <button key={c}
                            onClick={() => setVarianteSelec(v => v?.color === c ? null : { color: c, talla: null, precio: null, stock: null })}
                            title={c}
                            style={{ width: '2.25rem', height: '2.25rem', borderRadius: '50%', background: COLOR_HEX[c] || '#ddd', border: `3px solid ${seleccionado ? '#1e293b' : 'transparent'}`, cursor: agotado ? 'not-allowed' : 'pointer', opacity: agotado ? 0.35 : 1, position: 'relative', outline: seleccionado ? `2px solid ${color}` : 'none', outlineOffset: '2px' }}>
                            {agotado && <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={10} color="#fff" /></div>}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Selector de tallas */}
                {tallasFiltradas.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem' }}>
                      Talla{varianteSelec?.talla ? `: ${varianteSelec.talla}` : ''}
                    </div>
                    <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                      {tallasFiltradas.map(t => {
                        const varColor  = varianteSelec?.color
                        const varFound  = variantesActivas.find(v => v.talla === t && (!varColor || v.color === varColor))
                        const agotado   = !varFound || varFound.stock === 0
                        const selec     = varianteSelec?.talla === t
                        return (
                          <button key={t}
                            onClick={() => {
                              if (agotado) return
                              const v = variantesActivas.find(vv => vv.talla === t && (!varianteSelec?.color || vv.color === varianteSelec?.color))
                              setVarianteSelec(prev => ({
                                ...prev,
                                talla:  t,
                                precio: v?.precio || null,
                                stock:  v?.stock  || 0,
                                id:     v?.id,
                              }))
                            }}
                            style={{ minWidth: '2.75rem', padding: '0.375rem 0.625rem', border: `1.5px solid ${selec ? color : agotado ? '#e2e8f0' : '#cbd5e1'}`, borderRadius: '0.5rem', background: selec ? `${color}15` : agotado ? '#f8fafc' : '#fff', color: selec ? color : agotado ? '#cbd5e1' : '#475569', fontWeight: selec ? 700 : 400, cursor: agotado ? 'not-allowed' : 'pointer', fontSize: '0.875rem', textDecoration: agotado ? 'line-through' : 'none' }}>
                            {t}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Descripción */}
                {p.descripcion && (
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.375rem' }}>Descripción</div>
                    <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.7, margin: 0 }}>{p.descripcion}</p>
                  </div>
                )}

                {/* Especificaciones / Atributos */}
                {(p.atributos || []).length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem' }}>Especificaciones</div>
                    <div style={{ background: '#f8fafc', borderRadius: '0.625rem', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                      {p.atributos.map((a, i) => (
                        <div key={i} style={{ display: 'flex', padding: '0.5rem 0.875rem', borderBottom: i < p.atributos.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                          <span style={{ fontSize: '0.8125rem', color: '#64748b', minWidth: '8rem', flexShrink: 0 }}>{a.nombre}</span>
                          <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#1e293b' }}>{a.valor}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Botones acción */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', paddingTop: '0.25rem' }}>
                  {disponible && (
                    <button
                      onClick={() => { agregarAlPedido(p, varianteSelec?.id ? variantesActivas.find(v => v.id === varianteSelec.id) : null); setProductoModal(null) }}
                      style={{ ...s.btn, background: color, color: '#fff', width: '100%', justifyContent: 'center', padding: '0.875rem', fontSize: '1rem' }}>
                      🛒 Agregar al pedido
                    </button>
                  )}
                  {data?.whatsapp && (
                    <button onClick={() => consultarWhatsApp(p)}
                      style={{ ...s.btn, background: '#25d366', color: '#fff', width: '100%', justifyContent: 'center', padding: '0.875rem', fontSize: '1rem' }}>
                      💬 Consultar por WhatsApp
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      <style>{`
        @keyframes fadeInUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform:rotate(360deg); } }
      `}</style>
    </div>
  )
}