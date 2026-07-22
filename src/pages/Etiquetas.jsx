import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  Printer, Settings, Search, X, ChevronDown,
  ChevronUp, Plus, Minus, Package
} from 'lucide-react'
import { C, T, btn, card, input } from '../styles/responsive'
import CodigoBarra from '../components/CodigoBarra'

const CM_PX = 37.8  // 1cm ≈ 37.8px a 96dpi

export default function Etiquetas() {
  const { tenantInfo } = useAuth()

  const [productos,    setProductos]    = useState([])
  const [seleccionados,setSeleccionados]= useState([]) // [{producto, cantidad}]
  const [busqueda,     setBusqueda]     = useState('')
  const [loading,      setLoading]      = useState(true)
  const [verConfig,    setVerConfig]    = useState(false)
  const [verLista,     setVerLista]     = useState(true)

  // Config de etiquetas
  const [config, setConfig] = useState({
    ancho:       5,    // cm
    alto:        3,    // cm
    separacion:  0.3,  // cm entre etiquetas
    columnas:    3,    // etiquetas por fila
    fontSize:    7,    // pt nombre
    fontSizeCod: 6,    // pt código (ya no se usa, pero se mantiene por si acaso)
    mostrarNombre:  false,
    mostrarPrecio:  false,
    mostrarQR:      true,   // Barras
  })

  const printRef = useRef(null)

  useEffect(() => {
    if (!tenantInfo?.tenant_id) return
    supabase
      .from('productos')
      .select('id, nombre, cod, sku, precio, foto_url, activo')
      .eq('tenant_id', tenantInfo.tenant_id)
      .eq('activo', true)
      .order('nombre')
      .then(({ data }) => {
        setProductos(data || [])
        setLoading(false)
      })
  }, [tenantInfo?.tenant_id])

  const productosFiltrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (p.cod || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (p.sku || '').toLowerCase().includes(busqueda.toLowerCase())
  )

  const agregarProducto = (p) => {
    setSeleccionados(prev => {
      const existe = prev.find(s => s.producto.id === p.id)
      if (existe) return prev.map(s => s.producto.id === p.id ? { ...s, cantidad: s.cantidad + 1 } : s)
      return [...prev, { producto: p, cantidad: 1 }]
    })
  }

  const cambiarCantidad = (id, cantidad) => {
    if (cantidad <= 0) {
      setSeleccionados(prev => prev.filter(s => s.producto.id !== id))
    } else {
      setSeleccionados(prev => prev.map(s => s.producto.id === id ? { ...s, cantidad } : s))
    }
  }

  const quitarProducto = (id) => setSeleccionados(prev => prev.filter(s => s.producto.id !== id))

  // Generar todas las etiquetas (repitiendo por cantidad)
  const etiquetas = seleccionados.flatMap(s =>
    Array.from({ length: s.cantidad }, (_, i) => ({ ...s.producto, _key: `${s.producto.id}-${i}` }))
  )

  const imprimir = () => {
    const contenido = printRef.current?.innerHTML
    if (!contenido) return
    const win = window.open('', '_blank')
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Etiquetas — TiendaPos</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family: Arial, sans-serif; }
          @page { margin: 0.5cm; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>${contenido}</body>
      </html>
    `)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 400)
  }

  const anchoPx     = config.ancho     * CM_PX
  const altoPx      = config.alto      * CM_PX
  const separacionPx= config.separacion * CM_PX

  // ─── Componente Etiqueta actualizado ──────────────────────────────
  const Etiqueta = ({ p }) => {
    const codigo = p.cod || p.sku || p.id.substring(0, 8).toUpperCase()

    return (
      <div style={{
        width:           `${anchoPx}px`,
        minHeight:       `${altoPx}px`,
        border:          '1px solid #ccc',
        borderRadius:    '2px',
        display:         'flex',
        flexDirection:   'column',   // siempre columna
        alignItems:      'center',
        justifyContent:  'center',
        padding:         '3px 4px',
        gap:             '1px',
        background:      '#fff',
        overflow:        'hidden',
        flexShrink:      0,
        pageBreakInside: 'avoid',
      }}>
        {/* NOMBRE — arriba de las barras */}
        {config.mostrarNombre && (
          <div style={{
            fontSize:    `${config.fontSize}pt`,
            fontWeight:  700,
            color:       '#111',
            lineHeight:  1.2,
            textAlign:   'center',
            width:       '100%',
            overflow:    'hidden',
            display:     '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}>
            {p.nombre}
          </div>
        )}

        {/* CÓDIGO DE BARRAS — centro */}
        {config.mostrarQR && (
          <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <CodigoBarra
              codigo={codigo}
              ancho={1}
              alto={Math.max(8, Math.round(altoPx * 0.45 / 3))}
              mostrarTexto={true}
            />
          </div>
        )}

        {/* PRECIO — abajo del código */}
        {config.mostrarPrecio && (
          <div style={{
            fontSize:   `${config.fontSize + 1}pt`,
            fontWeight: 700,
            color:      '#111',
            textAlign:  'center',
          }}>
            L {parseFloat(p.precio).toFixed(2)}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>

      {/* Header con acciones */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.625rem', flexShrink: 0 }}>
        <div style={{ fontSize: T.xs, color: C.textMuted }}>
          {seleccionados.length > 0
            ? `${etiquetas.length} etiqueta${etiquetas.length !== 1 ? 's' : ''} listas para imprimir`
            : 'Selecciona productos para generar etiquetas'}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setVerConfig(v => !v)}
            style={{ ...btn.base, ...btn.ghost }}>
            <Settings size={15} /> Configurar
          </button>
          <button
            onClick={imprimir}
            disabled={etiquetas.length === 0}
            style={{ ...btn.base, ...btn.primary, opacity: etiquetas.length === 0 ? 0.5 : 1 }}>
            <Printer size={15} /> Imprimir {etiquetas.length > 0 ? `(${etiquetas.length})` : ''}
          </button>
        </div>
      </div>

      {/* Panel de configuración */}
      {verConfig && (
        <div style={{ ...card, padding: '1rem' }}>
          <div style={{ fontSize: T.sm, fontWeight: 700, color: C.text, marginBottom: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings size={15} color={C.primary} /> Configuración de etiquetas
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(9rem, 1fr))', gap: '0.75rem' }}>

            {/* Tamaño */}
            {[
              { label: 'Ancho (cm)',     key: 'ancho',      min: 2,   max: 15,  step: 0.5 },
              { label: 'Alto (cm)',      key: 'alto',       min: 1.5, max: 10,  step: 0.5 },
              { label: 'Separación (cm)',key: 'separacion', min: 0,   max: 2,   step: 0.1 },
              { label: 'Columnas',       key: 'columnas',   min: 1,   max: 6,   step: 1   },
              { label: 'Texto (pt)',     key: 'fontSize',   min: 4,   max: 14,  step: 1   },
              { label: 'Código (pt)',    key: 'fontSizeCod',min: 4,   max: 12,  step: 1   },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: T.xs, color: C.textSecondary, display: 'block', marginBottom: '0.25rem' }}>
                  {f.label}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <button
                    onClick={() => setConfig(p => ({ ...p, [f.key]: Math.max(f.min, +(p[f.key] - f.step).toFixed(2)) }))}
                    style={{ ...btn.base, ...btn.ghost, padding: '0.25rem 0.375rem', flexShrink: 0 }}>
                    <Minus size={12} />
                  </button>
                  <input
                    type="number"
                    value={config[f.key]}
                    min={f.min} max={f.max} step={f.step}
                    onChange={e => setConfig(p => ({ ...p, [f.key]: +e.target.value }))}
                    style={{ ...input, textAlign: 'center', padding: '0.25rem', width: '3.5rem', flexShrink: 0 }}
                  />
                  <button
                    onClick={() => setConfig(p => ({ ...p, [f.key]: Math.min(f.max, +(p[f.key] + f.step).toFixed(2)) }))}
                    style={{ ...btn.base, ...btn.ghost, padding: '0.25rem 0.375rem', flexShrink: 0 }}>
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Mostrar/ocultar elementos — sin opción "Código" */}
          <div style={{ marginTop: '0.875rem', display: 'flex', flexWrap: 'wrap', gap: '0.625rem' }}>
            {[
              { key: 'mostrarQR',     label: 'Barras'  },
              { key: 'mostrarNombre', label: 'Nombre'  },
              { key: 'mostrarPrecio', label: 'Precio'  },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setConfig(p => ({ ...p, [f.key]: !p[f.key] }))}
                style={{ ...btn.base, background: config[f.key] ? C.primaryLight : C.bgMuted, color: config[f.key] ? C.primary : C.textMuted, border: `1px solid ${config[f.key] ? C.primaryBorder : C.border}`, fontSize: T.xs, padding: '0.375rem 0.75rem' }}>
                {config[f.key] ? '✓' : '○'} {f.label}
              </button>
            ))}
          </div>

          {/* Presets de tamaños comunes */}
          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: T.xs, color: C.textMuted }}>Presets:</span>
            {[
              { label: 'Pequeña 4×2',   ancho: 4,   alto: 2   },
              { label: 'Mediana 5×3',   ancho: 5,   alto: 3   },
              { label: 'Grande 7×4',    ancho: 7,   alto: 4   },
              { label: 'Rollo 6×2.5',   ancho: 6,   alto: 2.5 },
            ].map(p => (
              <button
                key={p.label}
                onClick={() => setConfig(prev => ({ ...prev, ancho: p.ancho, alto: p.alto }))}
                style={{ ...btn.base, ...btn.ghost, fontSize: T.xs, padding: '0.25rem 0.625rem' }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', flex: 1, overflow: 'hidden', minHeight: 0 }}>

        {/* Panel izquierdo: selección de productos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflow: 'hidden' }}>

          {/* Buscador */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: C.bgWhite, border: `1px solid ${C.border}`, borderRadius: '0.5rem', padding: '0.5rem 0.75rem', flexShrink: 0 }}>
            <Search size={14} color={C.textMuted} />
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar producto o código..."
              style={{ border: 'none', outline: 'none', fontSize: T.sm, width: '100%', background: 'transparent', color: C.text }}
            />
            {busqueda && (
              <button onClick={() => setBusqueda('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, padding: 0, display: 'flex' }}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* Lista de productos */}
          <div style={{ ...card, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '0.625rem 0.875rem', borderBottom: `1px solid ${C.borderLight}`, fontSize: T.xs, fontWeight: 700, color: C.textSecondary, flexShrink: 0 }}>
              Productos ({productosFiltrados.length})
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: C.textMuted }}>Cargando...</div>
              ) : productosFiltrados.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: C.textMuted, fontSize: T.sm }}>
                  {busqueda ? 'Sin resultados' : 'No hay productos'}
                </div>
              ) : productosFiltrados.map(p => {
                const seleccionado = seleccionados.find(s => s.producto.id === p.id)
                const codigo = p.cod || p.sku || p.id.substring(0, 8).toUpperCase()
                return (
                  <div key={p.id}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.625rem 0.875rem', borderBottom: `1px solid ${C.borderLight}`, background: seleccionado ? C.primaryLight : 'transparent', cursor: 'pointer', transition: 'background 0.15s' }}
                    onClick={() => agregarProducto(p)}>
                    {/* Mini código de barras */}
                    <div style={{ flexShrink: 0, width: '4rem', overflow: 'hidden' }}>
                      <CodigoBarra
                        codigo={codigo}
                        ancho={1}
                        alto={8}
                        mostrarTexto={false}
                        style={{ height: '2rem' }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: T.xs, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.nombre}
                      </div>
                      <div style={{ fontSize: '0.625rem', color: C.textMuted, fontFamily: 'monospace' }}>
                        {codigo} · L {parseFloat(p.precio).toFixed(2)}
                      </div>
                    </div>
                    {seleccionado ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                        <button
                          onClick={e => { e.stopPropagation(); cambiarCantidad(p.id, seleccionado.cantidad - 1) }}
                          style={{ ...btn.base, ...btn.ghost, padding: '0.125rem 0.375rem', fontSize: T.xs }}>
                          <Minus size={11} />
                        </button>
                        <span style={{ fontSize: T.xs, fontWeight: 700, minWidth: '1.25rem', textAlign: 'center', color: C.primary }}>
                          {seleccionado.cantidad}
                        </span>
                        <button
                          onClick={e => { e.stopPropagation(); cambiarCantidad(p.id, seleccionado.cantidad + 1) }}
                          style={{ ...btn.base, ...btn.ghost, padding: '0.125rem 0.375rem', fontSize: T.xs }}>
                          <Plus size={11} />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); quitarProducto(p.id) }}
                          style={{ ...btn.base, background: 'none', border: 'none', color: C.danger, padding: '0.125rem', cursor: 'pointer' }}>
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.625rem', color: C.primary, fontWeight: 600, flexShrink: 0 }}>
                        + Agregar
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Panel derecho: vista previa */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflow: 'hidden' }}>
          <div style={{ ...card, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '0.625rem 0.875rem', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <span style={{ fontSize: T.xs, fontWeight: 700, color: C.textSecondary }}>
                Vista previa — {etiquetas.length} etiqueta{etiquetas.length !== 1 ? 's' : ''}
              </span>
              {etiquetas.length > 0 && (
                <button onClick={() => setSeleccionados([])}
                  style={{ ...btn.base, background: 'none', border: 'none', color: C.danger, fontSize: T.xs, padding: '0.125rem 0.375rem' }}>
                  <X size={12} /> Limpiar
                </button>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', background: '#f3f4f6' }}>
              {etiquetas.length === 0 ? (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', color: C.textMuted }}>
                  <Package size={36} style={{ opacity: 0.2 }} />
                  <div style={{ fontSize: T.sm }}>Selecciona productos de la lista</div>
                </div>
              ) : (
                /* Área de impresión */
                <div
                  ref={printRef}
                  style={{
                    display:             'flex',
                    flexWrap:            'wrap',
                    gap:                 `${separacionPx}px`,
                    justifyContent:      'flex-start',
                    alignContent:        'flex-start',
                  }}>
                  {etiquetas.map(p => (
                    <Etiqueta key={p._key} p={p} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}