import { useState, useEffect, useRef, useCallback } from 'react'
import { Clock, RefreshCw } from 'lucide-react'
import { C, T, btn } from '../styles/responsive'

const EVENTOS_ACTIVIDAD = [
  'mousedown', 'mousemove', 'keydown',
  'scroll', 'touchstart', 'click', 'wheel'
]

/**
 * Muestra aviso 1 minuto antes de cerrar sesión por inactividad.
 * Incluye cuenta regresiva y botón para extender la sesión.
 */
export default function AlertaTimeout({ onTimeout, minutos = 10, activo = true }) {
  const [mostrando,    setMostrando]    = useState(false)
  const [segundosRest, setSegundosRest] = useState(60)
  const timerPrincipal = useRef(null)
  const timerAviso     = useRef(null)
  const timerContador  = useRef(null)

  const limpiarTodo = useCallback(() => {
    clearTimeout(timerPrincipal.current)
    clearTimeout(timerAviso.current)
    clearInterval(timerContador.current)
  }, [])

  const cerrarSesion = useCallback(() => {
    limpiarTodo()
    setMostrando(false)
    onTimeout?.()
  }, [limpiarTodo, onTimeout])

  const extender = useCallback(() => {
    limpiarTodo()
    setMostrando(false)
    iniciar()
  }, [])

  const iniciar = useCallback(() => {
    if (!activo || !minutos) return
    limpiarTodo()

    const msTotal  = minutos * 60 * 1000
    const msAviso  = Math.max(0, msTotal - 60 * 1000) // 1 min antes

    // Timer para mostrar el aviso
    timerAviso.current = setTimeout(() => {
      setMostrando(true)
      setSegundosRest(60)

      // Cuenta regresiva
      timerContador.current = setInterval(() => {
        setSegundosRest(prev => {
          if (prev <= 1) {
            clearInterval(timerContador.current)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      // Timer final para cerrar
      timerPrincipal.current = setTimeout(cerrarSesion, 60 * 1000)
    }, msAviso)
  }, [activo, minutos, limpiarTodo, cerrarSesion])

  // Reiniciar al detectar actividad
  const reiniciar = useCallback(() => {
    if (!activo || !minutos || mostrando) return
    iniciar()
  }, [activo, minutos, mostrando, iniciar])

  useEffect(() => {
    if (!activo || !minutos) { limpiarTodo(); return }
    iniciar()
    EVENTOS_ACTIVIDAD.forEach(e => window.addEventListener(e, reiniciar, { passive: true }))
    return () => {
      limpiarTodo()
      EVENTOS_ACTIVIDAD.forEach(e => window.removeEventListener(e, reiniciar))
    }
  }, [activo, minutos])

  if (!mostrando) return null

  const pct = (segundosRest / 60) * 100

  return (
    <div style={{
      position:        'fixed',
      inset:           0,
      background:      'rgba(0,0,0,0.6)',
      display:         'flex',
      alignItems:      'center',
      justifyContent:  'center',
      zIndex:          1000,
      padding:         '1rem',
    }}>
      <div style={{
        background:   C.bgWhite,
        borderRadius: '0.875rem',
        padding:      '1.75rem',
        maxWidth:     '22rem',
        width:        '100%',
        textAlign:    'center',
        boxShadow:    '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Ícono con cuenta regresiva circular */}
        <div style={{ position: 'relative', width: '5rem', height: '5rem', margin: '0 auto 1.25rem' }}>
          <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="40" cy="40" r="34" fill="none" stroke={C.borderLight} strokeWidth="6" />
            <circle cx="40" cy="40" r="34" fill="none"
              stroke={segundosRest > 30 ? '#f59e0b' : C.danger}
              strokeWidth="6"
              strokeDasharray={`${2 * Math.PI * 34}`}
              strokeDashoffset={`${2 * Math.PI * 34 * (1 - pct / 100)}`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={16} color={segundosRest > 30 ? '#f59e0b' : C.danger} />
            <div style={{ fontSize: '1.125rem', fontWeight: 800, color: segundosRest > 30 ? '#f59e0b' : C.danger, lineHeight: 1 }}>
              {segundosRest}
            </div>
          </div>
        </div>

        <div style={{ fontSize: T.lg, fontWeight: 700, color: C.text, marginBottom: '0.5rem' }}>
          ¿Sigues ahí?
        </div>
        <div style={{ fontSize: T.sm, color: C.textSecondary, lineHeight: 1.6, marginBottom: '1.5rem' }}>
          Tu sesión se cerrará en <strong style={{ color: segundosRest > 30 ? '#f59e0b' : C.danger }}>{segundosRest} segundo{segundosRest !== 1 ? 's' : ''}</strong> por inactividad.
        </div>

        <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'center' }}>
          <button onClick={cerrarSesion}
            style={{ ...btn.base, ...btn.danger, padding: '0.625rem 1rem' }}>
            Cerrar sesión
          </button>
          <button onClick={extender}
            style={{ ...btn.base, ...btn.primary, padding: '0.625rem 1.25rem', fontWeight: 700 }}>
            <RefreshCw size={14} /> Continuar
          </button>
        </div>
      </div>
    </div>
  )
}