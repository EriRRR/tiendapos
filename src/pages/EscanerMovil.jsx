import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function EscanerMovil() {
  const params     = new URLSearchParams(window.location.search)
  const sessionKey = params.get('s')

  const [estado,    setEstado]    = useState('conectando') // conectando|listo|error
  const [scanning,  setScanning]  = useState(false)
  const [ultimo,    setUltimo]    = useState(null)
  const [historial, setHistorial] = useState([])
  const videoRef    = useRef(null)
  const streamRef   = useRef(null)
  const scanningRef = useRef(false)

  useEffect(() => {
    if (!sessionKey) { setEstado('error'); return }
    // Verificar que la sesión existe y está activa
    supabase
      .from('scanner_sessions')
      .select('id')
      .eq('session_key', sessionKey)
      .eq('activo', true)
      .gt('expires_at', new Date().toISOString())
      .single()
      .then(({ data, error }) => {
        if (error || !data) setEstado('error')
        else setEstado('listo')
      })
  }, [sessionKey])

  const enviarCodigo = async (codigo) => {
    // Evitar duplicados en 2 segundos
    const ultimo = historial[historial.length - 1]
    if (ultimo && ultimo.cod === codigo && Date.now() - ultimo.ts < 2000) return

    const { error } = await supabase
      .from('scanner_codigos')
      .insert([{ session_key: sessionKey, codigo }])

    if (!error) {
      setUltimo({ cod: codigo, ts: Date.now() })
      setHistorial(prev => {
        const nuevo = [{ cod: codigo, ts: Date.now() }, ...prev].slice(0, 15)
        return nuevo
      })
      if (navigator.vibrate) navigator.vibrate([60, 30, 60])
    }
  }

  const iniciarCamara = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      // Fallback: modo foto
      document.getElementById('inputFoto').click()
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream
      videoRef.current.srcObject = stream
      setScanning(true)
      scanningRef.current = true

      if ('BarcodeDetector' in window) {
        loopBarcodeDetector()
      } else {
        import('https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js')
          .catch(() => {})
        loopJsQR()
      }
    } catch (e) {
      // Fallback a foto
      document.getElementById('inputFoto').click()
    }
  }

  const detenerCamara = () => {
    scanningRef.current = false
    setScanning(false)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
  }

  const loopBarcodeDetector = async () => {
    const detector = new BarcodeDetector({
      formats: ['qr_code', 'code_128', 'ean_13', 'ean_8', 'code_39', 'upc_a', 'upc_e']
    })
    while (scanningRef.current) {
      try {
        if (videoRef.current?.readyState === 4) {
          const codes = await detector.detect(videoRef.current)
          if (codes.length > 0) await enviarCodigo(codes[0].rawValue)
        }
      } catch {}
      await new Promise(r => setTimeout(r, 250))
    }
  }

  const loopJsQR = () => {
    if (!scanningRef.current) return
    requestAnimationFrame(() => {
      const vid = videoRef.current
      if (vid?.readyState === 4) {
        const c   = document.createElement('canvas')
        c.width   = vid.videoWidth
        c.height  = vid.videoHeight
        const ctx = c.getContext('2d')
        ctx.drawImage(vid, 0, 0)
        const d = ctx.getImageData(0, 0, c.width, c.height)
        // jsQR debe estar cargado globalmente
        if (window.jsQR) {
          const qr = window.jsQR(d.data, d.width, d.height, { inversionAttempts: 'dontInvert' })
          if (qr?.data) enviarCodigo(qr.data)
        }
      }
      if (scanningRef.current) setTimeout(loopJsQR, 150)
    })
  }

  const procesarFoto = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const img = new Image()
    img.onload = async () => {
      const c   = document.createElement('canvas')
      c.width   = img.width; c.height = img.height
      const ctx = c.getContext('2d')
      ctx.drawImage(img, 0, 0)
      const d = ctx.getImageData(0, 0, c.width, c.height)
      if (window.jsQR) {
        const qr = window.jsQR(d.data, d.width, d.height, { inversionAttempts: 'attemptBoth' })
        if (qr?.data) await enviarCodigo(qr.data)
      }
      e.target.value = ''
    }
    img.src = URL.createObjectURL(file)
  }

  useEffect(() => {
    // Cargar jsQR para el fallback
    const script  = document.createElement('script')
    script.src    = 'https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js'
    script.async  = true
    document.head.appendChild(script)
    return () => { detenerCamara() }
  }, [])

  // ── Estilos inline para que funcione sin el sistema de estilos de la app ──
  const s = {
    body:    { minHeight: '100vh', background: '#0f172a', color: '#f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem', gap: '1rem', fontFamily: '-apple-system, sans-serif' },
    titulo:  { fontSize: '1.375rem', fontWeight: 700, color: '#60a5fa', textAlign: 'center' },
    badge:   (c) => ({ padding: '0.5rem 1.5rem', borderRadius: '9999px', fontWeight: 600, fontSize: '0.875rem', textAlign: 'center', background: c === 'ok' ? '#052e16' : c === 'scan' ? '#1e3a5f' : c === 'err' ? '#450a0a' : '#1e293b', color: c === 'ok' ? '#34d399' : c === 'scan' ? '#60a5fa' : c === 'err' ? '#f87171' : '#94a3b8' }),
    visor:   {
      width:        '100%',
      maxWidth:     '340px',
      borderRadius: '0.75rem',
      overflow:     'hidden',
      background:   '#000',
      border:       '3px solid #334155',
      position:     'relative',
      // quita aspect-ratio: 1 (era cuadrado)
    },
    video:   {
      width:      '100%',
      height:     '100%',
      objectFit:  'cover',
      display:    'block',
    },
    scanLine:{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#34d399', boxShadow: '0 0 8px #34d399', animation: 'scan 2s ease-in-out infinite' },
    guide:   { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '65%', aspectRatio: '1', border: '2px solid rgba(52,211,153,.6)', borderRadius: '0.5rem' },
    btn:     (danger) => ({ background: danger ? '#7f1d1d' : '#2563eb', color: danger ? '#fca5a5' : '#fff', border: 'none', borderRadius: '1rem', padding: '1.25rem', fontSize: '1.0625rem', fontWeight: 700, cursor: 'pointer', width: '100%', maxWidth: '340px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.625rem' }),
    ultimo:  { background: '#1e293b', borderRadius: '0.75rem', padding: '0.75rem 1rem', width: '100%', maxWidth: '340px', textAlign: 'center', fontSize: '0.875rem' },
    hist:    { width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '9rem', overflowY: 'auto' },
    item:    { background: '#1e293b', borderRadius: '0.5rem', padding: '0.375rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' },
  }

  if (estado === 'error') return (
    <div style={s.body}>
      <div style={s.titulo}>📦 TiendaPos</div>
      <div style={s.badge('err')}>Sesión inválida o expirada</div>
      <div style={{ fontSize: '0.875rem', color: '#64748b', textAlign: 'center' }}>
        Pide a la PC que genere un nuevo código QR
      </div>
    </div>
  )

  if (estado === 'conectando') return (
    <div style={s.body}>
      <div style={s.titulo}>📦 TiendaPos</div>
      <div style={s.badge('')}>Conectando...</div>
    </div>
  )

  return (
    <div style={s.body}>
      <style>{`
        @keyframes scan { 0%{top:10%} 50%{top:85%} 100%{top:10%} }
        @keyframes scanLine {
          0%   { top: 0%; }
          50%  { top: calc(100% - 2px); }
          100% { top: 0%; }
        }
      `}</style>

      <div style={s.titulo}>📦 TiendaPos</div>
      {/* Mensaje actualizado: apunta al código de barras */}
      <div style={s.badge(scanning ? 'scan' : 'ok')}>
        {scanning ? '● Escáner activo — apunta al código de barras' : '✓ Conectado a la PC'}
      </div>

      {/* Visor cámara — rectangular para código de barras */}
      <div style={{
        ...s.visor,
        aspectRatio:  '16 / 6',   // ← rectangular
        height:       'auto',
        minHeight:    '6rem',
        display:      scanning ? 'block' : 'none',
        position:     'relative',
      }}>
        <video ref={videoRef} autoPlay playsInline muted style={{ ...s.video, height: '100%', objectFit: 'cover' }} />

        {/* Marco guía */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ width: '75%', height: '60%', border: '2px solid #34d399', borderRadius: '0.375rem', boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)', position: 'relative' }}>
            {[
              { top: -2, left: -2,    borderTop:    '3px solid #34d399', borderLeft:  '3px solid #34d399' },
              { top: -2, right: -2,   borderTop:    '3px solid #34d399', borderRight: '3px solid #34d399' },
              { bottom: -2, left: -2,  borderBottom: '3px solid #34d399', borderLeft:  '3px solid #34d399' },
              { bottom: -2, right: -2, borderBottom: '3px solid #34d399', borderRight: '3px solid #34d399' },
            ].map((s2, i) => (
              <div key={i} style={{ position: 'absolute', width: '1rem', height: '1rem', ...s2 }} />
            ))}
            <div style={{ position: 'absolute', left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, #34d399, transparent)', boxShadow: '0 0 6px #34d399', animation: 'scanLine 1.5s ease-in-out infinite' }} />
          </div>
        </div>
      </div>

      {/* Input foto fallback (oculto) */}
      <input
        type="file" accept="image/*" capture="environment"
        id="inputFoto" style={{ display: 'none' }}
        onChange={procesarFoto}
      />

      {/* Botón principal */}
      {!scanning ? (
        <button style={s.btn(false)} onClick={iniciarCamara}>
          📷 Activar escáner
        </button>
      ) : (
        <button style={s.btn(true)} onClick={detenerCamara}>
          ⏹ Detener
        </button>
      )}

      {/* Último escaneado */}
      {ultimo && (
        <div style={s.ultimo}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Último escaneado:</div>
          <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#60a5fa' }}>{ultimo.cod}</div>
        </div>
      )}

      {/* Historial */}
      {historial.length > 0 && (
        <div style={s.hist}>
          {historial.map((h, i) => (
            <div key={i} style={s.item}>
              <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: '#60a5fa', flex: 1 }}>{h.cod}</span>
              <span style={{ fontSize: '0.6875rem', color: '#475569' }}>
                {new Date(h.ts).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}