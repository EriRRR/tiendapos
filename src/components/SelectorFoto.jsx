import { useState, useRef } from 'react'
import { Camera, Upload, X, Image } from 'lucide-react'

export default function SelectorFoto({ fotoActual, onChange, onEliminar }) {
  const [preview, setPreview] = useState(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef()
  const camaraRef = useRef()

  const procesarArchivo = (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Solo se permiten imágenes (JPG, PNG, WEBP)')
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    onChange(file)
  }

  const handleInput = (e) => {
    const file = e.target.files?.[0]
    if (file) procesarArchivo(file)
    e.target.value = ''
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) procesarArchivo(file)
  }

  const handleEliminar = () => {
    setPreview(null)
    onChange(null)
    if (onEliminar) onEliminar()
  }

  const fotoMostrar = preview || fotoActual

  return (
    <div>
      <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 6 }}>
        Foto del producto
        <span style={{ fontSize: 11, color: '#999', marginLeft: 6 }}>
          (se comprime automáticamente — máx ~100KB)
        </span>
      </label>

      {fotoMostrar ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img src={fotoMostrar} alt="Foto del producto"
              style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 10, border: '1px solid #e5e5e5', display: 'block' }} />
            {/* Botón eliminar */}
            <button type="button" onClick={handleEliminar} style={{
              position: 'absolute', top: -8, right: -8,
              background: '#dc2626', color: '#fff', border: 'none',
              borderRadius: '50%', width: 22, height: 22,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}>
              <X size={12} />
            </button>
            {/* Botón cambiar */}
            <button type="button" onClick={() => inputRef.current.click()} style={{
              position: 'absolute', bottom: -8, right: -8,
              background: '#2563eb', color: '#fff', border: 'none',
              borderRadius: '50%', width: 26, height: 26,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}>
              <Camera size={13} />
            </button>
          </div>
          <div style={{ fontSize: 12, color: '#888', lineHeight: 1.6 }}>
            <div style={{ fontWeight: 500, color: '#555', marginBottom: 4 }}>Foto cargada</div>
            <div>• Toca el <span style={{ color: '#2563eb' }}>botón azul</span> para cambiarla</div>
            <div>• Toca la <span style={{ color: '#dc2626' }}>X roja</span> para quitarla</div>
          </div>
        </div>
      ) : (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragging ? '#2563eb' : '#e5e5e5'}`,
            borderRadius: 10, padding: '20px 16px', textAlign: 'center',
            background: dragging ? '#eff6ff' : '#fafafa',
            transition: 'all 0.15s',
          }}
        >
          <Image size={28} color="#ccc" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
            Arrastra una foto aquí, o usa los botones
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => inputRef.current.click()} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: '#fff', border: '1px solid #e5e5e5',
              borderRadius: 7, padding: '8px 14px', fontSize: 12,
              cursor: 'pointer', color: '#555', fontWeight: 500,
            }}>
              <Upload size={13} /> Elegir archivo
            </button>
            <button type="button" onClick={() => camaraRef.current.click()} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: '#eff6ff', border: '1px solid #bfdbfe',
              borderRadius: 7, padding: '8px 14px', fontSize: 12,
              cursor: 'pointer', color: '#2563eb', fontWeight: 500,
            }}>
              <Camera size={13} /> Tomar foto
            </button>
          </div>
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleInput} style={{ display: 'none' }} />
      <input ref={camaraRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={handleInput} style={{ display: 'none' }} />
    </div>
  )
}