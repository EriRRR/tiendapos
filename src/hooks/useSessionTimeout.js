import { useEffect, useRef, useCallback } from 'react'

const EVENTOS_ACTIVIDAD = [
  'mousedown', 'mousemove', 'keydown',
  'scroll', 'touchstart', 'click', 'wheel'
]

/**
 * Cierra la sesión automáticamente tras X minutos de inactividad.
 * @param {function} onTimeout   — callback al cerrar sesión
 * @param {number}   minutos     — minutos de inactividad (0 = desactivado)
 * @param {boolean}  activo      — si false, no hace nada
 */
export function useSessionTimeout(onTimeout, minutos = 10, activo = true) {
  const timerRef    = useRef(null)
  const callbackRef = useRef(onTimeout)
  callbackRef.current = onTimeout

  const reiniciar = useCallback(() => {
    if (!activo || !minutos) return
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      callbackRef.current?.()
    }, minutos * 60 * 1000)
  }, [activo, minutos])

  useEffect(() => {
    if (!activo || !minutos) {
      clearTimeout(timerRef.current)
      return
    }

    // Iniciar el timer
    reiniciar()

    // Escuchar actividad del usuario
    EVENTOS_ACTIVIDAD.forEach(e => window.addEventListener(e, reiniciar, { passive: true }))

    return () => {
      clearTimeout(timerRef.current)
      EVENTOS_ACTIVIDAD.forEach(e => window.removeEventListener(e, reiniciar))
    }
  }, [activo, minutos, reiniciar])
}