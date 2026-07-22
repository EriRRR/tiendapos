import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Plus, X, Image, ArrowLeft, ArrowRight } from 'lucide-react'
import { C, T, btn } from '../styles/responsive'

export default function SelectorFotos({ productoId, fotos = [], onChange }) {
  const { tenantInfo } = useAuth()
  const inputRef = useRef(null)
  const [subiendo, setSubiendo] = useState(false)

  const subirFoto = async (file) => {
    if (!file) return
    setSubiendo(true)
    try {
      const ext  = file.name.split('.').pop().toLowerCase()
      const path = `productos/${tenantInfo.tenant_id}/${productoId || 'temp'}/${Date.now()}.${ext}`

      const { error: errUp } = await supabase.storage
        .from('productos-fotos')
        .upload(path, file, { upsert: true, contentType: file.type })

      if (errUp) throw new Error(errUp.message)

      const { data: { publicUrl } } = supabase.storage
        .from('productos-fotos')
        .getPublicUrl(path)

      onChange([...fotos, { url: publicUrl, orden: fotos.length }])
    } catch (e) { alert('Error subiendo foto: ' + e.message) }
    setSubiendo(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  const eliminarFoto = (idx) => {
    onChange(fotos.filter((_, i) => i !== idx))
  }

  const moverFoto = (idx, dir) => {
    const nuevas = [...fotos]
    const target = idx + dir
    if (target < 0 || target >= nuevas.length) return
    ;[nuevas[idx], nuevas[target]] = [nuevas[target], nuevas[idx]]
    onChange(nuevas.map((f, i) => ({ ...f, orden: i })))
  }

  return (
    <div>
      <div style={{ fontSize: T.xs, color: C.textSecondary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
        Fotos del producto ({fotos.length})
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {fotos.map((f, i) => (
          <div key={i} style={{ position: 'relative', width: '5rem', height: '5rem', borderRadius: '0.5rem', overflow: 'hidden', border: `1px solid ${C.border}`, flexShrink: 0 }}>
            <img src={f.url} alt={`Foto ${i + 1}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

            {/* Badge principal */}
            {i === 0 && (
              <div style={{ position: 'absolute', top: '0.25rem', left: '0.25rem', background: C.primary, color: '#fff', fontSize: '0.5rem', fontWeight: 700, borderRadius: '0.25rem', padding: '0.0625rem 0.25rem' }}>
                PRINCIPAL
              </div>
            )}

            {/* Controles */}
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', opacity: 0, transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.5)'; e.currentTarget.style.opacity = '1' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0)'; e.currentTarget.style.opacity = '0' }}>
              {i > 0 && (
                <button onClick={() => moverFoto(i, -1)}
                  style={{ background: '#fff', border: 'none', borderRadius: '0.25rem', padding: '0.25rem', cursor: 'pointer', display: 'flex' }}>
                  <ArrowLeft size={10} color="#111" />
                </button>
              )}
              <button onClick={() => eliminarFoto(i)}
                style={{ background: '#ef4444', border: 'none', borderRadius: '0.25rem', padding: '0.25rem', cursor: 'pointer', display: 'flex' }}>
                <X size={10} color="#fff" />
              </button>
              {i < fotos.length - 1 && (
                <button onClick={() => moverFoto(i, 1)}
                  style={{ background: '#fff', border: 'none', borderRadius: '0.25rem', padding: '0.25rem', cursor: 'pointer', display: 'flex' }}>
                  <ArrowRight size={10} color="#111" />
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Botón agregar */}
        <button
          onClick={() => inputRef.current?.click()}
          disabled={subiendo}
          style={{ width: '5rem', height: '5rem', border: `2px dashed ${C.border}`, borderRadius: '0.5rem', background: C.bgMuted, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', color: C.textMuted, flexShrink: 0 }}>
          {subiendo ? (
            <div style={{ fontSize: '0.625rem' }}>Subiendo...</div>
          ) : (
            <>
              <Plus size={18} color={C.textMuted} />
              <div style={{ fontSize: '0.625rem' }}>Agregar</div>
            </>
          )}
        </button>

        <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => subirFoto(e.target.files[0])} />
      </div>

      <div style={{ fontSize: T.xs, color: C.textMuted, marginTop: '0.375rem' }}>
        La primera foto es la principal. Arrastra para reordenar.
      </div>
    </div>
  )
}