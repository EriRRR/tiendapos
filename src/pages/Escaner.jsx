import { useState, useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { useInventario } from '../hooks/useInventario'
import { Scan, X, Search, Package, AlertCircle } from 'lucide-react'
import { C, T, btn, card, input } from '../styles/responsive'

export default function Escaner() {
  const { buscarPorSku } = useInventario()

  const [activo,         setActivo]         = useState(false)
  const [error,          setError]          = useState('')
  const [ultimoProducto, setUltimoProducto] = useState(null)
  const [busquedaManual, setBusquedaManual] = useState('')
  const [buscando,       setBuscando]       = useState(false)
  const scannerRef = useRef(null)

  const iniciar = async () => {
    setError('')
    try {
      const scanner   = new Html5Qrcode('visor-escaner')
      scannerRef.current = scanner
      const qrboxWidth  = Math.min(window.innerWidth - 48, 500)
      const qrboxHeight = Math.round(qrboxWidth * 0.35) // ← rectangular 35% del ancho

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps:   15,
          qrbox: { width: qrboxWidth, height: qrboxHeight },
        },
        manejarEscaneo,
        () => {}
      )
      setActivo(true)
    } catch (e) {
      setError('No se pudo acceder a la cámara. Verifica los permisos.')
    }
  }

  const detener = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop() } catch {}
      scannerRef.current = null
    }
    setActivo(false)
  }

  useEffect(() => () => { detener() }, [])

  const manejarEscaneo = async (codigo) => {
    await buscarYMostrar(codigo)
  }

  const buscarYMostrar = async (codigo) => {
    setBuscando(true)
    const producto = await buscarPorSku(codigo)
    setUltimoProducto(producto ? { ...producto, codigo } : { codigo, noEncontrado: true })
    setBuscando(false)
  }

  const handleBuscarManual = async () => {
    if (!busquedaManual.trim()) return
    await buscarYMostrar(busquedaManual.trim())
    setBusquedaManual('')
  }

  return (
    <div style={{ maxWidth: '36rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Visor de la cámara — rectangular para código de barras */}
      <div style={card}>
        <div style={{
          width:        '100%',
          aspectRatio:  '16 / 6',    // ← rectangular, ideal para barras
          background:   '#000',
          borderRadius: '0.625rem 0.625rem 0 0',
          overflow:     'hidden',
          position:     'relative',
          minHeight:    activo ? '8rem' : '0',
          transition:   'min-height 0.3s',
        }}>
          {/* Contenedor del scanner */}
          <div
            id="visor-escaner"
            style={{ width: '100%', height: '100%' }}
          />

          {/* Línea guía de escaneo */}
          {activo && (
            <div style={{
              position:    'absolute',
              inset:       0,
              display:     'flex',
              alignItems:  'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}>
              {/* Marco guía rectangular */}
              <div style={{
                width:        '75%',
                height:       '55%',
                border:       '2px solid #34d399',
                borderRadius: '0.375rem',
                boxShadow:    '0 0 0 9999px rgba(0,0,0,0.35)',
                position:     'relative',
              }}>
                {/* Esquinas del marco */}
                {[
                  { top: -2, left: -2, borderTop: '3px solid #34d399', borderLeft: '3px solid #34d399' },
                  { top: -2, right: -2, borderTop: '3px solid #34d399', borderRight: '3px solid #34d399' },
                  { bottom: -2, left: -2, borderBottom: '3px solid #34d399', borderLeft: '3px solid #34d399' },
                  { bottom: -2, right: -2, borderBottom: '3px solid #34d399', borderRight: '3px solid #34d399' },
                ].map((s, i) => (
                  <div key={i} style={{ position: 'absolute', width: '1rem', height: '1rem', ...s }} />
                ))}

                {/* Línea de escaneo animada */}
                <div style={{
                  position:   'absolute',
                  left:       0,
                  right:      0,
                  height:     '2px',
                  background: 'linear-gradient(90deg, transparent, #34d399, transparent)',
                  boxShadow:  '0 0 6px #34d399',
                  animation:  'scanLine 1.5s ease-in-out infinite',
                }} />
              </div>
            </div>
          )}

          {/* Placeholder cuando no está activo */}
          {!activo && (
            <div style={{ display: 'none' }} />
          )}
        </div>

        {/* Controles */}
        <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {!activo ? (
            <div style={{ textAlign: 'center' }}>
              <Scan size={40} color={C.textMuted} style={{ margin: '0.5rem auto', opacity: 0.3 }} />
              <div style={{ fontSize: T.sm, color: C.text, fontWeight: 500, marginBottom: '0.5rem' }}>
                Escanea el código de barras del producto
              </div>
              <div style={{ fontSize: T.xs, color: C.textMuted, marginBottom: '0.875rem' }}>
                Apunta la cámara al código de barras — detección automática
              </div>
              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fef2f2', border: `1px solid ${C.dangerBorder}`, borderRadius: '0.5rem', padding: '0.625rem', fontSize: T.xs, color: C.danger, marginBottom: '0.875rem', textAlign: 'left' }}>
                  <AlertCircle size={14} style={{ flexShrink: 0 }} /> {error}
                </div>
              )}
              <button onClick={iniciar} style={{ ...btn.base, ...btn.primary, margin: '0 auto' }}>
                <Scan size={15} /> Activar cámara
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: C.success, fontSize: T.xs, fontWeight: 600 }}>
                <span style={{ width: '0.5rem', height: '0.5rem', background: C.success, borderRadius: '50%', display: 'inline-block', animation: 'pulse 1s infinite' }} />
                Cámara activa — apunta al código
              </div>
              <button onClick={detener} style={{ ...btn.base, ...btn.danger, padding: '0.375rem 0.75rem', fontSize: T.xs }}>
                <X size={14} /> Detener
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Búsqueda manual */}
      <div style={card}>
        <div style={{ padding: '0.875rem 1rem', borderBottom: `1px solid ${C.borderLight}`, fontSize: T.sm, fontWeight: 700, color: C.text }}>
          Buscar por código manualmente
        </div>
        <div style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
          <input
            value={busquedaManual}
            onChange={e => setBusquedaManual(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleBuscarManual()}
            placeholder="Ingresa el código del producto..."
            style={{ ...input, flex: 1 }}
          />
          <button
            onClick={handleBuscarManual}
            disabled={buscando || !busquedaManual.trim()}
            style={{ ...btn.base, ...btn.primary, opacity: buscando ? 0.7 : 1 }}>
            <Search size={15} />
          </button>
        </div>
      </div>

      {/* Resultado del escaneo */}
      {ultimoProducto && (
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: T.sm, fontWeight: 700, color: C.text }}>Resultado</span>
            <button onClick={() => setUltimoProducto(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, display: 'flex' }}>
              <X size={16} />
            </button>
          </div>

          {ultimoProducto.noEncontrado ? (
            <div style={{ padding: '1.5rem', textAlign: 'center' }}>
              <AlertCircle size={32} color={C.danger} style={{ margin: '0 auto 0.5rem', opacity: 0.6 }} />
              <div style={{ fontSize: T.sm, fontWeight: 600, color: C.danger }}>Código no encontrado</div>
              <div style={{ fontSize: T.xs, color: C.textMuted, marginTop: '0.25rem', fontFamily: 'monospace' }}>
                {ultimoProducto.codigo}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.875rem', padding: '1rem', alignItems: 'flex-start' }}>
              {/* Foto */}
              {ultimoProducto.foto_url ? (
                <img
                  src={ultimoProducto.foto_url}
                  alt={ultimoProducto.nombre}
                  style={{ width: '5rem', height: '5rem', objectFit: 'cover', borderRadius: '0.5rem', flexShrink: 0 }}
                />
              ) : (
                <div style={{ width: '5rem', height: '5rem', background: C.bgMuted, borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Package size={24} color={C.textMuted} />
                </div>
              )}

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: T.base, fontWeight: 700, color: C.text, marginBottom: '0.25rem' }}>
                  {ultimoProducto.nombre}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.375rem', marginTop: '0.5rem' }}>
                  {[
                    { label: 'Código',     valor: ultimoProducto.cod || ultimoProducto.sku || '—', mono: true },
                    { label: 'Precio',     valor: `L ${parseFloat(ultimoProducto.precio || 0).toFixed(2)}`, color: C.primary },
                    { label: 'Stock',      valor: ultimoProducto.stock === 0 ? 'Agotado' : `${ultimoProducto.stock} uds`, color: ultimoProducto.stock === 0 ? C.danger : C.success },
                    { label: 'Categoría', valor: ultimoProducto.categorias?.nombre || '—' },
                  ].map(f => (
                    <div key={f.label} style={{ background: C.bgMuted, borderRadius: '0.375rem', padding: '0.375rem 0.625rem' }}>
                      <div style={{ fontSize: '0.625rem', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{f.label}</div>
                      <div style={{ fontSize: T.xs, fontWeight: 600, color: f.color || C.text, fontFamily: f.mono ? 'monospace' : undefined, marginTop: '0.125rem' }}>
                        {f.valor}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Stock agotado */}
                {ultimoProducto.stock === 0 && (
                  <div style={{ marginTop: '0.625rem', background: '#fef2f2', border: `1px solid ${C.dangerBorder}`, borderRadius: '0.375rem', padding: '0.5rem 0.75rem', fontSize: T.xs, color: C.danger, fontWeight: 600 }}>
                    ✗ Producto agotado — sin stock disponible
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes scanLine {
          0%   { top: 0%; }
          50%  { top: calc(100% - 2px); }
          100% { top: 0%; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}