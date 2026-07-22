import { useState } from 'react'
import { Plus, X, Trash2 } from 'lucide-react'
import { C, T, btn, input } from '../styles/responsive'

const COLORES_COMUNES = ['Negro', 'Blanco', 'Gris', 'Rojo', 'Azul', 'Verde', 'Amarillo', 'Naranja', 'Morado', 'Rosa', 'Café', 'Beige']
const TALLAS_ROPA     = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']
const TALLAS_ZAPATOS  = ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45']

const COLOR_HEX = {
  'Negro': '#111', 'Blanco': '#fff', 'Gris': '#9ca3af', 'Rojo': '#ef4444',
  'Azul': '#3b82f6', 'Verde': '#22c55e', 'Amarillo': '#eab308',
  'Naranja': '#f97316', 'Morado': '#a855f7', 'Rosa': '#ec4899',
  'Café': '#92400e', 'Beige': '#d4b483',
}

export default function GestorVariantes({ variantes = [], onChange, precioBase }) {
  const [modo,      setModo]      = useState('simple') // 'simple' | 'avanzado'
  const [formNueva, setFormNueva] = useState({ color: '', talla: '', stock: '1', precio: '' })

  const agregarVariante = () => {
    if (!formNueva.color && !formNueva.talla) return
    const nombre = [formNueva.color, formNueva.talla].filter(Boolean).join(' / ')
    const nueva = {
      id:       `temp-${Date.now()}`,
      nombre,
      color:    formNueva.color  || null,
      talla:    formNueva.talla  || null,
      stock:    parseInt(formNueva.stock) || 0,
      precio:   formNueva.precio ? parseFloat(formNueva.precio) : null,
      foto_url: null,
      activo:   true,
    }
    onChange([...variantes, nueva])
    setFormNueva({ color: '', talla: '', stock: '1', precio: '' })
  }

  const actualizarVariante = (id, campo, valor) => {
    onChange(variantes.map(v => v.id === id ? { ...v, [campo]: valor } : v))
  }

  const eliminarVariante = (id) => {
    onChange(variantes.filter(v => v.id !== id))
  }

  // Generar combinaciones automáticas
  const generarCombinaciones = (colores, tallas) => {
    const combinaciones = []
    if (colores.length > 0 && tallas.length > 0) {
      colores.forEach(c => tallas.forEach(t => {
        const existe = variantes.find(v => v.color === c && v.talla === t)
        if (!existe) combinaciones.push({ color: c, talla: t })
      }))
    } else if (colores.length > 0) {
      colores.forEach(c => {
        const existe = variantes.find(v => v.color === c && !v.talla)
        if (!existe) combinaciones.push({ color: c, talla: null })
      })
    } else if (tallas.length > 0) {
      tallas.forEach(t => {
        const existe = variantes.find(v => v.talla === t && !v.color)
        if (!existe) combinaciones.push({ color: null, talla: t })
      })
    }
    return combinaciones
  }

  const [selColores, setSelColores] = useState([])
  const [selTallas,  setSelTallas]  = useState([])

  const toggleColor = (c) => setSelColores(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  const toggleTalla = (t) => setSelTallas(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])

  const aplicarCombinaciones = () => {
    const nuevas = generarCombinaciones(selColores, selTallas).map(c => ({
      id:       `temp-${Date.now()}-${Math.random()}`,
      nombre:   [c.color, c.talla].filter(Boolean).join(' / '),
      color:    c.color,
      talla:    c.talla,
      stock:    0,
      precio:   null,
      foto_url: null,
      activo:   true,
    }))
    onChange([...variantes, ...nuevas])
    setSelColores([])
    setSelTallas([])
  }

  const lbl = { fontSize: T.xs, color: C.textSecondary, display: 'block', marginBottom: '0.25rem' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: T.xs, fontWeight: 700, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Variantes ({variantes.length})
        </div>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {['simple', 'avanzado'].map(m => (
            <button key={m} onClick={() => setModo(m)}
              style={{ fontSize: T.xs, padding: '0.25rem 0.625rem', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', background: modo === m ? C.primary : C.bgMuted, color: modo === m ? '#fff' : C.textSecondary }}>
              {m === 'simple' ? 'Simple' : 'Por combinación'}
            </button>
          ))}
        </div>
      </div>

      {/* Modo simple — agregar una variante */}
      {modo === 'simple' && (
        <div style={{ background: C.bgMuted, borderRadius: '0.5rem', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 5rem 6rem auto', gap: '0.5rem', alignItems: 'end' }}>
            <div>
              <label style={lbl}>Color</label>
              <input list="colores-lista" value={formNueva.color}
                onChange={e => setFormNueva(p => ({ ...p, color: e.target.value }))}
                placeholder="Ej: Rojo" style={input} />
              <datalist id="colores-lista">
                {COLORES_COMUNES.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label style={lbl}>Talla</label>
              <input list="tallas-lista" value={formNueva.talla}
                onChange={e => setFormNueva(p => ({ ...p, talla: e.target.value }))}
                placeholder="Ej: M" style={input} />
              <datalist id="tallas-lista">
                {[...TALLAS_ROPA, ...TALLAS_ZAPATOS].map(t => <option key={t} value={t} />)}
              </datalist>
            </div>
            <div>
              <label style={lbl}>Stock</label>
              <input type="number" value={formNueva.stock} min={0}
                onChange={e => setFormNueva(p => ({ ...p, stock: e.target.value }))}
                style={input} />
            </div>
            <div>
              <label style={lbl}>Precio (L)</label>
              <input type="number" value={formNueva.precio}
                onChange={e => setFormNueva(p => ({ ...p, precio: e.target.value }))}
                placeholder={precioBase ? `${precioBase} (base)` : 'Base'}
                style={input} />
            </div>
            <button onClick={agregarVariante}
              disabled={!formNueva.color && !formNueva.talla}
              style={{ ...btn.base, ...btn.primary, padding: '0.5rem 0.625rem', alignSelf: 'flex-end', opacity: (!formNueva.color && !formNueva.talla) ? 0.5 : 1 }}>
              <Plus size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Modo avanzado — combinaciones */}
      {modo === 'avanzado' && (
        <div style={{ background: C.bgMuted, borderRadius: '0.5rem', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label style={lbl}>Colores</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {COLORES_COMUNES.map(c => (
                <button key={c} onClick={() => toggleColor(c)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.25rem 0.5rem', border: `1px solid ${selColores.includes(c) ? C.primary : C.border}`, borderRadius: '9999px', background: selColores.includes(c) ? C.primaryLight : '#fff', cursor: 'pointer', fontSize: T.xs, color: selColores.includes(c) ? C.primary : C.textSecondary }}>
                  <div style={{ width: '0.75rem', height: '0.75rem', borderRadius: '50%', background: COLOR_HEX[c] || '#ddd', border: '1px solid rgba(0,0,0,0.15)' }} />
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={lbl}>Tallas ropa</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.375rem' }}>
              {TALLAS_ROPA.map(t => (
                <button key={t} onClick={() => toggleTalla(t)}
                  style={{ padding: '0.25rem 0.625rem', border: `1px solid ${selTallas.includes(t) ? C.primary : C.border}`, borderRadius: '0.375rem', background: selTallas.includes(t) ? C.primaryLight : '#fff', cursor: 'pointer', fontSize: T.xs, color: selTallas.includes(t) ? C.primary : C.textSecondary, fontWeight: selTallas.includes(t) ? 700 : 400 }}>
                  {t}
                </button>
              ))}
            </div>
            <label style={{ ...lbl, marginTop: '0.25rem' }}>Tallas zapatos</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {TALLAS_ZAPATOS.map(t => (
                <button key={t} onClick={() => toggleTalla(t)}
                  style={{ padding: '0.25rem 0.625rem', border: `1px solid ${selTallas.includes(t) ? C.primary : C.border}`, borderRadius: '0.375rem', background: selTallas.includes(t) ? C.primaryLight : '#fff', cursor: 'pointer', fontSize: T.xs, color: selTallas.includes(t) ? C.primary : C.textSecondary, fontWeight: selTallas.includes(t) ? 700 : 400 }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <button onClick={aplicarCombinaciones}
            disabled={selColores.length === 0 && selTallas.length === 0}
            style={{ ...btn.base, ...btn.primary, justifyContent: 'center', opacity: (selColores.length === 0 && selTallas.length === 0) ? 0.5 : 1 }}>
            <Plus size={14} /> Generar {generarCombinaciones(selColores, selTallas).length} combinaciones
          </button>
        </div>
      )}

      {/* Lista de variantes */}
      {variantes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          {/* Header tabla */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 5rem 6rem auto', gap: '0.5rem', padding: '0 0.375rem' }}>
            {['Color', 'Talla', 'Stock', 'Precio (L)', ''].map(h => (
              <div key={h} style={{ fontSize: '0.625rem', color: C.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</div>
            ))}
          </div>
          {variantes.map(v => (
            <div key={v.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 5rem 6rem auto', gap: '0.5rem', alignItems: 'center', background: C.bgMuted, borderRadius: '0.375rem', padding: '0.375rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                {v.color && COLOR_HEX[v.color] && (
                  <div style={{ width: '0.875rem', height: '0.875rem', borderRadius: '50%', background: COLOR_HEX[v.color], border: '1px solid rgba(0,0,0,0.15)', flexShrink: 0 }} />
                )}
                <input value={v.color || ''} onChange={e => actualizarVariante(v.id, 'color', e.target.value || null)}
                  placeholder="Color" style={{ ...input, padding: '0.25rem 0.375rem', fontSize: T.xs }} />
              </div>
              <input value={v.talla || ''} onChange={e => actualizarVariante(v.id, 'talla', e.target.value || null)}
                placeholder="Talla" style={{ ...input, padding: '0.25rem 0.375rem', fontSize: T.xs }} />
              <input type="number" value={v.stock} min={0}
                onChange={e => actualizarVariante(v.id, 'stock', parseInt(e.target.value) || 0)}
                style={{ ...input, padding: '0.25rem 0.375rem', fontSize: T.xs }} />
              <input type="number" value={v.precio || ''}
                onChange={e => actualizarVariante(v.id, 'precio', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder={precioBase || 'Base'}
                style={{ ...input, padding: '0.25rem 0.375rem', fontSize: T.xs }} />
              <button onClick={() => eliminarVariante(v.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.danger, display: 'flex', padding: '0.25rem' }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}