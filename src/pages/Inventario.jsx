import { useState, useMemo, useEffect } from 'react'
import { Plus, Edit2, Trash2, Search, AlertTriangle, Package, Filter, X, RefreshCw, Download } from 'lucide-react'  // <-- se agregó Download
import { useInventario } from '../hooks/useInventario'
import { useConfiguracion } from '../hooks/useConfiguracion'
import { useCatalogo } from '../hooks/useCatalogo'
import SelectorFotos from '../components/SelectorFotos'
import GestorVariantes from '../components/GestorVariantes'
import CodigoBarra from '../components/CodigoBarra'
import { usePaginacion } from '../hooks/usePaginacion'
import Paginacion from '../components/Paginacion'
import { C, T, S, input, btn, card, badge } from '../styles/responsive'
import { supabase } from '../lib/supabase'
import { exportarInventario } from '../lib/exportarExcel'  // <-- NUEVA IMPORTACIÓN

const estadoBadge = (stock, minimo) => {
  if (stock === 0) return badge('out')
  if (stock <= minimo) return badge('low')
  return badge('ok')
}
const estadoLabel = (stock, minimo) => {
  if (stock === 0) return 'Agotado'
  if (stock <= minimo) return 'Stock bajo'
  return 'Disponible'
}

const FORM_INICIAL = {
  cod: '', nombre: '', descripcion: '', precio: '',
  precio_compra: '', stock: '', stock_minimo: '5',
  categoria_id: '', marca_id: '', proveedor_id: '', foto_url: '',
}

function CampoAtributo({ atributo, value, onChange }) {
  if (atributo.tipo === 'lista') return (
    <div>
      <label style={{ fontSize: T.xs, color: C.textSecondary, display: 'block', marginBottom: '0.25rem' }}>{atributo.nombre}</label>
      <input list={`attr-${atributo.id}`} value={value || ''} onChange={e => onChange(e.target.value)}
        placeholder="Selecciona o escribe..." style={input} />
      <datalist id={`attr-${atributo.id}`}>
        {(atributo.atributo_opciones || []).map(op => <option key={op.id} value={op.valor} />)}
      </datalist>
    </div>
  )
  return (
    <div>
      <label style={{ fontSize: T.xs, color: C.textSecondary, display: 'block', marginBottom: '0.25rem' }}>{atributo.nombre}</label>
      <input type={atributo.tipo === 'numero' ? 'number' : 'text'}
        value={value || ''} onChange={e => onChange(e.target.value)}
        placeholder={atributo.tipo === 'numero' ? '0' : `${atributo.nombre}...`} style={input} />
    </div>
  )
}

function StatCard({ label, val, sub, color }) {
  return (
    <div style={{ ...card, padding: '0.875rem 1rem' }}>
      <div style={{ fontSize: T.xs, color: C.textMuted, marginBottom: '0.25rem' }}>{label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color, lineHeight: 1 }}>{val}</div>
      <div style={{ fontSize: T.xs, color: C.textMuted, marginTop: '0.25rem' }}>{sub}</div>
    </div>
  )
}

function PanelFiltros({ filtros, setFiltros, categorias, marcas, productos, onCerrar }) {
  const atributosUnicos = useMemo(() => {
    const map = {}
    productos.forEach(p => {
      p.producto_atributos?.forEach(pa => {
        const nombre = pa.categoria_atributos?.nombre
        if (!nombre) return
        if (!map[nombre]) map[nombre] = new Set()
        map[nombre].add(pa.valor)
      })
    })
    return Object.entries(map).map(([nombre, valores]) => ({ nombre, valores: [...valores].sort() }))
  }, [productos])

  const limpiar = () => setFiltros({ categoria: '', marca: '', estado: '', precioMin: '', precioMax: '', stockMin: '', atributos: {} })
  const hayFiltros = Object.values(filtros).some(v => typeof v === 'string' ? v : Object.keys(v).length > 0)

  const sel = { ...input, cursor: 'pointer' }
  const lbl = { fontSize: T.xs, fontWeight: 700, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.375rem' }

  return (
    <div style={{ ...card, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: T.sm, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.375rem', color: C.text }}>
          <Filter size={14} color={C.primary} /> Filtros
        </span>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {hayFiltros && <button onClick={limpiar} style={{ fontSize: T.xs, color: C.danger, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Limpiar</button>}
          <button onClick={onCerrar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, padding: '0.25rem' }}><X size={16} /></button>
        </div>
      </div>

      <div><label style={lbl}>Categoría</label>
        <select value={filtros.categoria} onChange={e => setFiltros(p => ({ ...p, categoria: e.target.value }))} style={sel}>
          <option value="">Todas</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </div>

      <div><label style={lbl}>Marca</label>
        <select value={filtros.marca} onChange={e => setFiltros(p => ({ ...p, marca: e.target.value }))} style={sel}>
          <option value="">Todas</option>
          {marcas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
        </select>
      </div>

      <div><label style={lbl}>Estado</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          {[{ val: '', label: 'Todos' }, { val: 'disponible', label: '✅ Disponible' }, { val: 'bajo', label: '⚠️ Stock bajo' }, { val: 'agotado', label: '❌ Agotado' }].map(op => (
            <label key={op.val} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: T.sm, color: C.text }}>
              <input type="radio" name="estado-filtro" value={op.val} checked={filtros.estado === op.val} onChange={() => setFiltros(p => ({ ...p, estado: op.val }))} />
              {op.label}
            </label>
          ))}
        </div>
      </div>

      <div><label style={lbl}>Precio venta (L)</label>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input type="number" value={filtros.precioMin} onChange={e => setFiltros(p => ({ ...p, precioMin: e.target.value }))} placeholder="Mín" style={{ ...input, width: '50%' }} />
          <span style={{ color: C.textMuted, fontSize: T.sm }}>–</span>
          <input type="number" value={filtros.precioMax} onChange={e => setFiltros(p => ({ ...p, precioMax: e.target.value }))} placeholder="Máx" style={{ ...input, width: '50%' }} />
        </div>
      </div>

      <div><label style={lbl}>Stock mínimo</label>
        <input type="number" value={filtros.stockMin} onChange={e => setFiltros(p => ({ ...p, stockMin: e.target.value }))} placeholder="Ej: 5" style={input} />
      </div>

      {atributosUnicos.map(({ nombre, valores }) => (
        <div key={nombre}><label style={lbl}>{nombre}</label>
          <select value={filtros.atributos[nombre] || ''}
            onChange={e => setFiltros(p => ({
              ...p,
              atributos: e.target.value
                ? { ...p.atributos, [nombre]: e.target.value }
                : (() => { const a = { ...p.atributos }; delete a[nombre]; return a })()
            }))} style={sel}>
            <option value="">Todos</option>
            {valores.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      ))}
    </div>
  )
}

export default function Inventario() {
  const { productos, categorias, loading, crearProducto, actualizarProducto, eliminarProducto } = useInventario()
  const { calcularPrecioSugerido, config, generarCod, previewCod } = useConfiguracion()
  const { marcas, proveedores, fetchMarcas, fetchProveedores } = useCatalogo()

  const [width, setWidth] = useState(window.innerWidth)
  useEffect(() => {
    const h = () => setWidth(window.innerWidth)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  const isMobile = width < 768

  const [busqueda, setBusqueda] = useState('')
  const [filtrosVisible, setFiltrosVisible] = useState(false)
  const [filtros, setFiltros] = useState({ categoria: '', marca: '', estado: '', precioMin: '', precioMax: '', stockMin: '', atributos: {} })
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(FORM_INICIAL)
  const [atributosValores, setAtributosValores] = useState({})
  const [archivoFoto, setArchivoFoto] = useState(null)
  const [eliminarFotoFlag, setEliminarFotoFlag] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState('')

  // Nuevos estados para fotos múltiples y variantes
  const [fotosProducto, setFotosProducto] = useState([])
  const [variantes, setVariantes] = useState([])

  // Estados para modales rápidos
  const [modalNuevaMarca, setModalNuevaMarca] = useState(false)
  const [modalNuevoProveedor, setModalNuevoProveedor] = useState(false)
  const [nombreNuevaMarca, setNombreNuevaMarca] = useState('')
  const [nombreNuevoProveedor, setNombreNuevoProveedor] = useState('')
  const [guardandoMarca, setGuardandoMarca] = useState(false)
  const [guardandoProveedor, setGuardandoProveedor] = useState(false)

  const categoriaActual = categorias.find(c => c.id === form.categoria_id)
  const atributosDeCat = categoriaActual?.categoria_atributos?.sort((a, b) => a.orden - b.orden) || []

  const atributosFiltrados = atributosDeCat.filter(attr => attr.nombre.toLowerCase() !== 'marca')

  const precioSugerido = calcularPrecioSugerido(form.precio_compra)

  const filtrosActivos = [filtros.categoria, filtros.marca, filtros.estado, filtros.precioMin, filtros.precioMax, filtros.stockMin, ...Object.values(filtros.atributos)].filter(Boolean).length

  const productosFiltrados = useMemo(() => products(productos, busqueda, filtros), [productos, busqueda, filtros])

  function products(lista, q, f) {
    return lista.filter(p => {
      if (q) {
        const s = q.toLowerCase()
        if (!p.nombre.toLowerCase().includes(s) && !(p.cod || p.sku || '').toLowerCase().includes(s) && !p.producto_atributos?.some(pa => pa.valor.toLowerCase().includes(s))) return false
      }
      if (f.categoria && p.categoria_id !== f.categoria) return false
      if (f.marca && p.marca_id !== f.marca) return false
      if (f.estado === 'agotado' && p.stock !== 0) return false
      if (f.estado === 'bajo' && !(p.stock > 0 && p.stock <= p.stock_minimo)) return false
      if (f.estado === 'disponible' && !(p.stock > p.stock_minimo)) return false
      if (f.precioMin && parseFloat(p.precio) < parseFloat(f.precioMin)) return false
      if (f.precioMax && parseFloat(p.precio) > parseFloat(f.precioMax)) return false
      if (f.stockMin && p.stock < parseInt(f.stockMin)) return false
      for (const [nombre, valor] of Object.entries(f.atributos)) {
        if (!p.producto_atributos?.some(pa => pa.categoria_atributos?.nombre === nombre && pa.valor === valor)) return false
      }
      return true
    })
  }

  // ── Paginación ─────────────────────────────────────────────────────────
  const pag = usePaginacion(productosFiltrados, 20)

  // ── ABRIR MODALES ─────────────────────────────────────────────────────
  const abrirCrear = () => {
    setEditando(null)
    setForm({ ...FORM_INICIAL, cod: previewCod() })
    setAtributosValores({})
    setArchivoFoto(null)
    setEliminarFotoFlag(false)
    setErrorForm('')
    setFotosProducto([])
    setVariantes([])
    setModal(true)
  }

  const abrirEditar = async (p) => {
    setEditando(p.id)
    setForm({
      cod: p.cod || p.sku || '',
      nombre: p.nombre,
      descripcion: p.descripcion || '',
      precio: p.precio,
      precio_compra: p.precio_compra || '',
      stock: p.stock,
      stock_minimo: p.stock_minimo,
      categoria_id: p.categoria_id || '',
      marca_id: p.marca_id || '',
      proveedor_id: p.proveedor_id || '',
      foto_url: p.foto_url || '',
    })

    // Cargar atributos
    const vals = {}
    p.producto_atributos?.forEach(pa => {
      vals[pa.categoria_atributos?.id] = pa.valor
    })
    setAtributosValores(vals)
    setArchivoFoto(null)
    setEliminarFotoFlag(false)
    setErrorForm('')

    // Cargar fotos existentes
    try {
      const { data: fotosDB } = await supabase
        .from('producto_fotos')
        .select('*')
        .eq('producto_id', p.id)
        .order('orden')
      setFotosProducto(
        fotosDB?.map(f => ({ url: f.url, orden: f.orden })) ||
        (p.foto_url ? [{ url: p.foto_url, orden: 0 }] : [])
      )
    } catch {
      setFotosProducto(p.foto_url ? [{ url: p.foto_url, orden: 0 }] : [])
    }

    // Cargar variantes existentes
    try {
      const { data: varDB } = await supabase
        .from('producto_variantes')
        .select('*')
        .eq('producto_id', p.id)
        .eq('activo', true)
        .order('color, talla')
      setVariantes(varDB || [])
    } catch {
      setVariantes([])
    }

    setModal(true)
  }

  const setField = (k, v) => setForm(prev => ({ ...prev, [k]: v }))
  const setAtributo = (id, val) => setAtributosValores(prev => ({ ...prev, [id]: val }))

  // ── GUARDAR ──────────────────────────────────────────────────────────
  const guardar = async () => {
    if (!form.nombre || !form.precio) {
      setErrorForm('Nombre y precio son obligatorios.')
      return
    }
    setGuardando(true)
    try {
      const cod = editando ? form.cod : await generarCod()
      const datos = {
        ...form,
        cod,
        sku: cod,
        precio: parseFloat(form.precio),
        precio_compra: form.precio_compra ? parseFloat(form.precio_compra) : null,
        stock: parseInt(form.stock) || 0,
        stock_minimo: parseInt(form.stock_minimo) || 5,
        categoria_id: form.categoria_id || null,
        marca_id: form.marca_id || null,
        proveedor_id: form.proveedor_id || null,
        foto_url: fotosProducto[0]?.url || null,
      }

      let productoId = editando

      if (editando) {
        await actualizarProducto(editando, datos, atributosValores, null, false)
      } else {
        const nuevo = await crearProducto(datos, atributosValores, null)
        productoId = nuevo?.id
        if (!productoId) throw new Error('No se pudo obtener el ID del producto creado')
      }

      // ── Guardar fotos múltiples ──
      await supabase.from('producto_fotos').delete().eq('producto_id', productoId)
      if (fotosProducto.length > 0) {
        const fotosInsert = fotosProducto.map((f, i) => ({
          tenant_id: null,  // Eliminado useTenant
          producto_id: productoId,
          url: f.url,
          orden: i,
        }))
        const { error: errFotos } = await supabase
          .from('producto_fotos')
          .insert(fotosInsert)
        if (errFotos) throw new Error('Error al guardar fotos: ' + errFotos.message)
      }

      // ── Guardar variantes ──
      await supabase
        .from('producto_variantes')
        .update({ activo: false })
        .eq('producto_id', productoId)

      if (variantes.length > 0) {
        const variantesLimpias = variantes.map(v => ({
          tenant_id: null,  // Eliminado useTenant
          producto_id: productoId,
          nombre: v.nombre || [v.color, v.talla].filter(Boolean).join(' / '),
          color: v.color || null,
          talla: v.talla || null,
          stock: v.stock || 0,
          precio: v.precio || null,
          foto_url: v.foto_url || null,
          activo: true,
        }))
        const { error: errVar } = await supabase
          .from('producto_variantes')
          .insert(variantesLimpias)
        if (errVar) throw new Error('Error al guardar variantes: ' + errVar.message)
      }

      setModal(false)
    } catch (e) {
      setErrorForm(e.message)
    }
    setGuardando(false)
  }

  // ── ELIMINAR ─────────────────────────────────────────────────────────
  const confirmarEliminar = async (id, nombre) => {
    if (window.confirm(`¿Eliminar "${nombre}"?`)) await eliminarProducto(id)
  }

  // ── CRUD RÁPIDO (marca / proveedor) ────────────────────────────────
  const handleCrearMarca = async () => {
    if (!nombreNuevaMarca.trim()) return
    setGuardandoMarca(true)
    try {
      const { data, error } = await supabase
        .from('marcas')
        .insert([{ nombre: nombreNuevaMarca.trim() }])
        .select()
        .single()
      if (error) throw new Error(error.message)
      await fetchMarcas()
      setField('marca_id', data.id)
      setModalNuevaMarca(false)
      setNombreNuevaMarca('')
    } catch (e) { alert(e.message) }
    setGuardandoMarca(false)
  }

  const handleCrearProveedor = async () => {
    if (!nombreNuevoProveedor.trim()) return
    setGuardandoProveedor(true)
    try {
      const { data, error } = await supabase
        .from('proveedores')
        .insert([{ nombre: nombreNuevoProveedor.trim() }])
        .select()
        .single()
      if (error) throw new Error(error.message)
      await fetchProveedores()
      setField('proveedor_id', data.id)
      setModalNuevoProveedor(false)
      setNombreNuevoProveedor('')
    } catch (e) { alert(e.message) }
    setGuardandoProveedor(false)
  }

  const stockBajo = productos.filter(p => p.stock > 0 && p.stock <= p.stock_minimo).length
  const agotados = productos.filter(p => p.stock === 0).length

  const lbl = { fontSize: T.xs, color: C.textSecondary, display: 'block', marginBottom: '0.25rem' }

  return (
    <div>
      {/* Stats */}
      <div className="grid-cols-3" style={{ marginBottom: '1rem' }}>
        <StatCard label="Total" val={productos.length} sub={`${categorias.length} categ.`} color={C.primary} />
        <StatCard label="Stock bajo" val={stockBajo} sub="Reponer" color={C.warning} />
        <StatCard label="Agotados" val={agotados} sub="Sin unidades" color={C.danger} />
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '0.625rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: C.bgWhite, border: `1px solid ${C.border}`, borderRadius: '0.5rem', padding: '0.5rem 0.75rem', flex: 1, minWidth: '10rem' }}>
          <Search size={14} color={C.textMuted} />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar..."
            style={{ border: 'none', outline: 'none', fontSize: T.sm, width: '100%', background: 'transparent', color: C.text }} />
          {busqueda && <button onClick={() => setBusqueda('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, padding: 0, display: 'flex' }}><X size={14} /></button>}
        </div>
        <button onClick={() => setFiltrosVisible(v => !v)} style={{
          ...btn.base, ...btn.ghost,
          background: filtrosActivos > 0 ? C.primaryLight : C.bgWhite,
          color: filtrosActivos > 0 ? C.primary : C.textSecondary,
          borderColor: filtrosActivos > 0 ? C.primary : C.border,
        }}>
          <Filter size={14} /> {!isMobile && 'Filtros'}
          {filtrosActivos > 0 && <span style={{ background: C.primary, color: '#fff', borderRadius: '9999px', padding: '0.125rem 0.4rem', fontSize: '0.6875rem', fontWeight: 700 }}>{filtrosActivos}</span>}
        </button>
        <button onClick={abrirCrear} style={{ ...btn.base, ...btn.primary }}>
          <Plus size={15} /> {!isMobile && 'Nuevo'}
        </button>
        {/* ─── BOTÓN EXPORTAR EXCEL ─── */}
        <button
          onClick={() => exportarInventario(productos)}
          style={{ ...btn.base, ...btn.ghost, fontSize: T.xs }}>
          <Download size={14} /> Excel
        </button>
      </div>

      {/* Layout filtros + tabla */}
      <div style={{ display: 'grid', gridTemplateColumns: filtrosVisible && !isMobile ? '13.75rem 1fr' : '1fr', gap: '0.75rem', alignItems: 'start' }}>

        {filtrosVisible && !isMobile && (
          <PanelFiltros filtros={filtros} setFiltros={setFiltros} categorias={categorias} marcas={marcas} productos={productos} onCerrar={() => setFiltrosVisible(false)} />
        )}
        {filtrosVisible && isMobile && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 60, display: 'flex', alignItems: 'flex-end' }}
            onClick={e => e.target === e.currentTarget && setFiltrosVisible(false)}>
            <div style={{ background: C.bgWhite, borderRadius: '1rem 1rem 0 0', width: '100%', maxHeight: '85vh', overflowY: 'auto', padding: '1rem', animation: 'slideUp 0.25s ease' }}>
              <PanelFiltros filtros={filtros} setFiltros={setFiltros} categorias={categorias} marcas={marcas} productos={productos} onCerrar={() => setFiltrosVisible(false)} />
            </div>
          </div>
        )}

        <div>
          {(busqueda || filtrosActivos > 0) && (
            <div style={{ fontSize: T.xs, color: C.textMuted, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <strong style={{ color: C.text }}>{productosFiltrados.length}</strong> de {productos.length} productos
              {filtrosActivos > 0 && <button onClick={() => setFiltros({ categoria: '', marca: '', estado: '', precioMin: '', precioMax: '', stockMin: '', atributos: {} })} style={{ fontSize: T.xs, color: C.danger, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Limpiar</button>}
            </div>
          )}

          <div style={card}>
            <div className="table-scroll">
              {loading ? (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: C.textMuted }}>Cargando...</div>
              ) : productosFiltrados.length === 0 ? (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: C.textMuted }}>
                  <Package size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.25 }} />
                  <div>No se encontraron productos</div>
                </div>
              ) : isMobile ? (
                <div style={{ padding: '0.5rem' }}>
                  {pag.itemsPagina.map(p => (
                    <div key={p.id} style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem', borderBottom: `1px solid ${C.borderLight}`, alignItems: 'center' }}>
                      {p.foto_url
                        ? <img src={p.foto_url} alt={p.nombre} style={{ width: '3rem', height: '3rem', objectFit: 'cover', borderRadius: '0.5rem', border: `1px solid ${C.border}`, flexShrink: 0 }} />
                        : <div style={{ width: '3rem', height: '3rem', background: C.bgMuted, borderRadius: '0.5rem', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1.25rem' }}>📦</div>
                      }
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: T.sm, color: C.text, marginBottom: '0.125rem' }}>
                          {p.nombre}
                          {p.stock <= p.stock_minimo && p.stock > 0 && <AlertTriangle size={11} color="#f59e0b" style={{ marginLeft: '0.25rem', display: 'inline', verticalAlign: 'middle' }} />}
                        </div>
                        <div style={{ fontSize: T.xs, color: C.textMuted, fontFamily: 'monospace', marginBottom: '0.25rem' }}>{p.cod || p.sku}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={estadoBadge(p.stock, p.stock_minimo)}>{estadoLabel(p.stock, p.stock_minimo)}</span>
                          <span style={{ fontSize: T.xs, color: C.textMuted }}>Stock: {p.stock}</span>
                          <span style={{ fontSize: T.sm, fontWeight: 700, color: C.primary }}>L {parseFloat(p.precio).toFixed(2)}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <button onClick={() => abrirEditar(p)} style={{ border: `1px solid ${C.border}`, background: C.bgWhite, borderRadius: '0.375rem', padding: '0.3125rem 0.4375rem', cursor: 'pointer', color: C.textSecondary, display: 'flex' }}><Edit2 size={13} /></button>
                        <button onClick={() => confirmarEliminar(p.id, p.nombre)} style={{ border: `1px solid ${C.dangerBorder}`, background: C.bgWhite, borderRadius: '0.375rem', padding: '0.3125rem 0.4375rem', cursor: 'pointer', color: C.danger, display: 'flex' }}><Trash2 size={13} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: T.sm, minWidth: '37.5rem' }}>
                  <thead>
                    <tr style={{ background: C.bgMuted }}>
                      {['', 'COD', 'Producto', 'Marca', 'Categoría', 'P. Compra', 'P. Venta', 'Stock', 'Estado', ''].map((h, i) => (
                        <th key={i} style={{ padding: '0.625rem 0.75rem', textAlign: 'left', fontSize: '0.6875rem', color: C.textMuted, fontWeight: 600, borderBottom: `1px solid ${C.border}`, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pag.itemsPagina.map(p => (
                      <tr key={p.id} style={{ borderBottom: `1px solid ${C.borderLight}` }}
                        onMouseEnter={e => e.currentTarget.style.background = C.bgMuted}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '0.5rem 0.75rem' }}>
                          {p.foto_url
                            ? <img src={p.foto_url} alt={p.nombre} style={{ width: '2.5rem', height: '2.5rem', objectFit: 'cover', borderRadius: '0.375rem', border: `1px solid ${C.border}`, display: 'block' }} />
                            : <div style={{ width: '2.5rem', height: '2.5rem', background: C.bgMuted, borderRadius: '0.375rem', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.125rem' }}>📦</div>}
                        </td>
                        <td style={{ padding: '0.625rem 0.75rem', color: C.textMuted, fontFamily: 'monospace', fontSize: '0.6875rem', whiteSpace: 'nowrap' }}>{p.cod || p.sku}</td>
                        <td style={{ padding: '0.625rem 0.75rem' }}>
                          <div style={{ fontWeight: 500, color: C.text }}>
                            {p.nombre}
                            {p.stock <= p.stock_minimo && p.stock > 0 && <AlertTriangle size={11} color="#f59e0b" style={{ marginLeft: '0.3rem', display: 'inline', verticalAlign: 'middle' }} />}
                          </div>
                          {p.producto_atributos?.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem' }}>
                              {p.producto_atributos.map(pa => (
                                <span key={pa.id} style={{ fontSize: '0.625rem', background: C.bgMuted, borderRadius: '0.25rem', padding: '0.0625rem 0.375rem', color: C.textSecondary }}>
                                  {pa.categoria_atributos?.nombre}: {pa.valor}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.625rem 0.75rem', color: C.textSecondary, whiteSpace: 'nowrap' }}>{p.marcas?.nombre || '—'}</td>
                        <td style={{ padding: '0.625rem 0.75rem', color: C.textSecondary, whiteSpace: 'nowrap' }}>{p.categorias?.nombre || '—'}</td>
                        <td style={{ padding: '0.625rem 0.75rem', color: C.textMuted, whiteSpace: 'nowrap' }}>{p.precio_compra ? `L ${parseFloat(p.precio_compra).toFixed(2)}` : '—'}</td>
                        <td style={{ padding: '0.625rem 0.75rem', fontWeight: 600, color: C.text, whiteSpace: 'nowrap' }}>L {parseFloat(p.precio).toFixed(2)}</td>
                        <td style={{ padding: '0.625rem 0.75rem', color: C.text }}>{p.stock}</td>
                        <td style={{ padding: '0.625rem 0.75rem', whiteSpace: 'nowrap' }}>
                          <span style={estadoBadge(p.stock, p.stock_minimo)}>{estadoLabel(p.stock, p.stock_minimo)}</span>
                        </td>
                        <td style={{ padding: '0.625rem 0.75rem' }}>
                          <div style={{ display: 'flex', gap: '0.375rem' }}>
                            <button onClick={() => abrirEditar(p)} style={{ border: `1px solid ${C.border}`, background: C.bgWhite, borderRadius: '0.375rem', padding: '0.3125rem 0.4375rem', cursor: 'pointer', color: C.textSecondary, display: 'flex' }}><Edit2 size={13} /></button>
                            <button onClick={() => confirmarEliminar(p.id, p.nombre)} style={{ border: `1px solid ${C.dangerBorder}`, background: C.bgWhite, borderRadius: '0.375rem', padding: '0.3125rem 0.4375rem', cursor: 'pointer', color: C.danger, display: 'flex' }}><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* ─── Paginación ─── */}
            {productosFiltrados.length > 0 && (
              <Paginacion
                pagina={pag.pagina}
                totalPaginas={pag.totalPaginas}
                total={pag.total}
                porPagina={20}
                irA={pag.irA}
                anterior={pag.anterior}
                siguiente={pag.siguiente}
                hayAnterior={pag.hayAnterior}
                haySiguiente={pag.haySiguiente}
                label="productos"
              />
            )}
          </div>
        </div>
      </div>

      {/* Modal de producto */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: isMobile ? '0.5rem' : '1rem' }}>
          <div style={{ background: C.bgWhite, borderRadius: '0.75rem', padding: isMobile ? '1rem' : '1.25rem', width: '100%', maxWidth: '34rem', maxHeight: '92vh', overflowY: 'auto', animation: 'fadeIn 0.2s ease' }}>
            <h3 style={{ fontSize: T.lg, fontWeight: 700, marginBottom: '1rem', color: C.text }}>
              {editando ? 'Editar producto' : 'Nuevo producto'}
            </h3>

            <div className="grid-cols-2">

              {/* COD */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={lbl}>COD {!editando && <span style={{ color: C.textMuted, fontSize: T.xs }}>(autogenerado)</span>}</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input value={form.cod} readOnly={!editando}
                    style={{ ...input, flex: 1, fontFamily: 'monospace', fontWeight: 600, background: editando ? C.bgWhite : C.bgMuted, color: C.primary }} />
                  {!editando && (
                    <button type="button" onClick={() => setField('cod', previewCod())}
                      style={{ ...btn.base, ...btn.ghost, padding: '0.5rem 0.625rem' }}>
                      <RefreshCw size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Categoría */}
              <div>
                <label style={lbl}>Categoría</label>
                <select value={form.categoria_id} onChange={e => { setField('categoria_id', e.target.value); setAtributosValores({}) }} style={{ ...input, cursor: 'pointer' }}>
                  <option value="">Sin categoría</option>
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>

              {/* Marca con botón + */}
              <div>
                <label style={lbl}>Marca</label>
                <div style={{ display: 'flex', gap: '0.375rem' }}>
                  <select value={form.marca_id} onChange={e => setField('marca_id', e.target.value)}
                    style={{ ...input, flex: 1, cursor: 'pointer' }}>
                    <option value="">Sin marca</option>
                    {marcas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                  </select>
                  <button type="button" onClick={() => { setNombreNuevaMarca(''); setModalNuevaMarca(true) }}
                    title="Crear nueva marca"
                    style={{ ...btn.base, background: C.successLight, color: C.success, border: '1px solid #bbf7d0', padding: '0.5rem 0.625rem', fontSize: '1.125rem', flexShrink: 0 }}>
                    +
                  </button>
                </div>
              </div>

              {/* Nombre */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={lbl}>Nombre *</label>
                <input value={form.nombre} onChange={e => setField('nombre', e.target.value)} placeholder="Nombre del producto" style={input} />
              </div>

              {/* Proveedor con botón + */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={lbl}>Proveedor</label>
                <div style={{ display: 'flex', gap: '0.375rem' }}>
                  <select value={form.proveedor_id} onChange={e => setField('proveedor_id', e.target.value)}
                    style={{ ...input, flex: 1, cursor: 'pointer' }}>
                    <option value="">Sin proveedor</option>
                    {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}{p.telefono ? ` — ${p.telefono}` : ''}</option>)}
                  </select>
                  <button type="button" onClick={() => { setNombreNuevoProveedor(''); setModalNuevoProveedor(true) }}
                    title="Crear nuevo proveedor"
                    style={{ ...btn.base, background: C.successLight, color: C.success, border: '1px solid #bbf7d0', padding: '0.5rem 0.625rem', fontSize: '1.125rem', flexShrink: 0 }}>
                    +
                  </button>
                </div>
              </div>

              {/* Atributos dinámicos (excluyendo "Marca") */}
              {atributosFiltrados.length > 0 && (
                <div style={{ gridColumn: 'span 2', borderTop: `1px solid ${C.borderLight}`, paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                  <div style={{ fontSize: T.xs, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.625rem' }}>
                    Atributos — {categoriaActual?.nombre}
                  </div>
                  <div className="grid-cols-2">
                    {atributosFiltrados.map(attr => (
                      <CampoAtributo key={attr.id} atributo={attr} value={atributosValores[attr.id]} onChange={val => setAtributo(attr.id, val)} />
                    ))}
                  </div>
                </div>
              )}

              {/* Precio compra */}
              <div>
                <label style={lbl}>Precio compra (L)</label>
                <input type="number" value={form.precio_compra} onChange={e => setField('precio_compra', e.target.value)} placeholder="0.00" style={input} />
              </div>

              {/* Precio sugerido */}
              <div>
                <label style={lbl}>
                  Precio sugerido
                  {config && <span style={{ color: C.textMuted, marginLeft: '0.25rem', fontSize: '0.6875rem' }}>
                    ({config.margen_tipo === 'porcentaje' ? `+${config.margen_valor}%` : `+L${config.margen_valor}`})
                  </span>}
                </label>
                <div style={{ ...input, background: C.successLight, borderColor: '#bbf7d0', color: precioSugerido ? C.success : C.textMuted, fontWeight: precioSugerido ? 600 : 400 }}>
                  {precioSugerido ? `L ${precioSugerido.toFixed(2)}` : 'Ingresa precio de compra'}
                </div>
              </div>

              {/* Precio venta */}
              <div>
                <label style={lbl}>Precio de venta (L) *</label>
                <div style={{ display: 'flex', gap: '0.375rem' }}>
                  <input type="number" value={form.precio} onChange={e => setField('precio', e.target.value)} placeholder="0.00" style={{ ...input, flex: 1 }} />
                  {precioSugerido && (
                    <button type="button" onClick={() => setField('precio', precioSugerido.toFixed(2))}
                      style={{ whiteSpace: 'nowrap', fontSize: T.xs, padding: '0.4375rem 0.5rem', background: C.primaryLight, color: C.primary, border: `1px solid ${C.primaryBorder}`, borderRadius: '0.4375rem', cursor: 'pointer', fontWeight: 600 }}>
                      Usar
                    </button>
                  )}
                </div>
              </div>

              {/* Stock */}
              <div>
                <label style={lbl}>Stock actual</label>
                <input type="number" value={form.stock} onChange={e => setField('stock', e.target.value)} placeholder="0" style={input} />
              </div>

              {/* Stock mínimo */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={lbl}>Stock mínimo (alerta)</label>
                <input type="number" value={form.stock_minimo} onChange={e => setField('stock_minimo', e.target.value)} placeholder="5" style={{ ...input, maxWidth: '7.5rem' }} />
              </div>

              {/* ─── Fotos múltiples ─── */}
              <div style={{ gridColumn: 'span 2', borderTop: `1px solid ${C.borderLight}`, paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                <SelectorFotos
                  productoId={editando}
                  fotos={fotosProducto}
                  onChange={setFotosProducto}
                />
              </div>

              {/* ─── Variantes ─── */}
              <div style={{ gridColumn: 'span 2', borderTop: `1px solid ${C.borderLight}`, paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                <GestorVariantes
                  variantes={variantes}
                  onChange={setVariantes}
                  precioBase={form.precio}
                />
              </div>

              {/* Descripción */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={lbl}>Descripción</label>
                <textarea value={form.descripcion} onChange={e => setField('descripcion', e.target.value)} rows={2} placeholder="Opcional..."
                  style={{ ...input, resize: 'vertical' }} />
              </div>

              {/* ─── Código de barras ─── */}
              {(form.cod || form.sku) && (
                <div style={{
                  gridColumn: 'span 2',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.875rem',
                  background: C.bgMuted,
                  borderRadius: '0.625rem',
                  marginTop: '0.5rem',
                  border: `1px solid ${C.borderLight}`,
                }}>
                  <div style={{ fontSize: T.xs, fontWeight: 700, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Código de barras
                  </div>
                  <div style={{ background: '#fff', padding: '0.625rem 1rem', borderRadius: '0.5rem', display: 'inline-block' }}>
                    <CodigoBarra
                      codigo={form.cod || form.sku}
                      ancho={2}
                      alto={14}
                      mostrarTexto={true}
                    />
                  </div>
                  <div style={{ fontSize: T.xs, color: C.textMuted }}>
                    Este código se imprime en las etiquetas del producto
                  </div>
                </div>
              )}
            </div>

            {errorForm && <div style={{ color: C.danger, fontSize: T.xs, marginTop: '0.5rem' }}>{errorForm}</div>}

            <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button onClick={() => setModal(false)} style={{ ...btn.base, ...btn.ghost }}>Cancelar</button>
              <button onClick={guardar} disabled={guardando} style={{ ...btn.base, ...btn.primary, opacity: guardando ? 0.7 : 1 }}>
                {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear producto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal crear marca rápida */}
      {modalNuevaMarca && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }}>
          <div style={{ background: C.bgWhite, borderRadius: '0.75rem', padding: '1.25rem', width: '100%', maxWidth: '22rem', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: T.base, fontWeight: 700, marginBottom: '0.25rem', color: C.text }}>Nueva marca</h3>
            <p style={{ fontSize: T.xs, color: C.textMuted, marginBottom: '1rem' }}>Se creará y quedará seleccionada automáticamente.</p>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: T.xs, color: C.textSecondary, display: 'block', marginBottom: '0.25rem' }}>Nombre de la marca *</label>
              <input
                autoFocus
                value={nombreNuevaMarca}
                onChange={e => setNombreNuevaMarca(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCrearMarca()}
                placeholder="Ej: Nike, Zara, Samsung..."
                style={{ ...input, width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setModalNuevaMarca(false)}
                style={{ ...btn.base, ...btn.ghost }}>Cancelar</button>
              <button onClick={handleCrearMarca} disabled={guardandoMarca || !nombreNuevaMarca.trim()}
                style={{ ...btn.base, ...btn.primary, opacity: !nombreNuevaMarca.trim() ? 0.5 : 1 }}>
                {guardandoMarca ? 'Guardando...' : 'Crear marca'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal crear proveedor rápido */}
      {modalNuevoProveedor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }}>
          <div style={{ background: C.bgWhite, borderRadius: '0.75rem', padding: '1.25rem', width: '100%', maxWidth: '22rem', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: T.base, fontWeight: 700, marginBottom: '0.25rem', color: C.text }}>Nuevo proveedor</h3>
            <p style={{ fontSize: T.xs, color: C.textMuted, marginBottom: '1rem' }}>Se creará y quedará seleccionado automáticamente.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ fontSize: T.xs, color: C.textSecondary, display: 'block', marginBottom: '0.25rem' }}>Nombre *</label>
                <input
                  autoFocus
                  value={nombreNuevoProveedor}
                  onChange={e => setNombreNuevoProveedor(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCrearProveedor()}
                  placeholder="Nombre del proveedor"
                  style={{ ...input, width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setModalNuevoProveedor(false)}
                style={{ ...btn.base, ...btn.ghost }}>Cancelar</button>
              <button onClick={handleCrearProveedor} disabled={guardandoProveedor || !nombreNuevoProveedor.trim()}
                style={{ ...btn.base, ...btn.primary, opacity: !nombreNuevoProveedor.trim() ? 0.5 : 1 }}>
                {guardandoProveedor ? 'Guardando...' : 'Crear proveedor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}