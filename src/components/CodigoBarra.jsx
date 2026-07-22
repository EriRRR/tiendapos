import { useEffect, useRef } from 'react'
import bwipjs from 'bwip-js'

export default function CodigoBarra({
  codigo,
  ancho        = 2,
  alto         = 10,
  mostrarTexto = true,
  style        = {},
}) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current || !codigo) return
    try {
      bwipjs.toCanvas(canvasRef.current, {
        bcid:          'code128',   // Code 128 — estándar retail
        text:          String(codigo),
        scale:         ancho,
        height:        alto,
        includetext:   mostrarTexto,
        textxalign:    'center',
        textsize:      11,
        textgaps:      2,
        paddingwidth:  6,
        paddingheight: 2,
        backgroundcolor: 'ffffff',
        barcolor:        '000000',
      })
    } catch (e) {
      console.warn('[CodigoBarra] Error generando código:', e.message)
    }
  }, [codigo, ancho, alto, mostrarTexto])

  if (!codigo) return null

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', maxWidth: '100%', ...style }}
    />
  )
}