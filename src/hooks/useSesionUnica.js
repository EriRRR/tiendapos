import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

// Token persistente en sessionStorage — sobrevive re-renders pero NO recarga de página
// Esto garantiza que en la misma pestaña siempre use el mismo token
function obtenerOCrearToken(userId) {
  const key = `vendix_session_token_${userId}`
  let token = sessionStorage.getItem(key)
  if (!token) {
    token = `${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    sessionStorage.setItem(key, token)
  }
  return token
}

function limpiarToken(userId) {
  sessionStorage.removeItem(`vendix_session_token_${userId}`)
}

function obtenerDispositivo() {
  const ua = navigator.userAgent
  const platform = navigator.platform || 'Desconocido'
  if (/Android/i.test(ua))     return `Android · ${platform}`
  if (/iPhone|iPad/i.test(ua)) return `iOS · ${platform}`
  if (/Windows/i.test(ua))     return `Windows · Navegador`
  if (/Mac/i.test(ua))         return `Mac · Navegador`
  if (/Linux/i.test(ua))       return `Linux · Navegador`
  return `Navegador · ${platform}`
}

export function useSesionUnica(session, tenantInfo, onForzarLogout) {
  const [conflicto,    setConflicto]    = useState(null)
  const tokenRef       = useRef(null)
  const iniciadoRef    = useRef(false)
  const channelRef     = useRef(null)
  const heartbeatRef   = useRef(null)

  useEffect(() => {
    // Solo inicializar una vez por montaje del componente
    if (!session?.user?.id || !tenantInfo?.tenant_id) return
    if (iniciadoRef.current) return
    iniciadoRef.current = true

    const userId   = session.user.id
    const tenantId = tenantInfo.tenant_id
    const token    = obtenerOCrearToken(userId)
    tokenRef.current = token

    const dispositivo = obtenerDispositivo()

    const iniciar = async () => {
      const { data, error } = await supabase.rpc('registrar_sesion', {
        p_user_id:     userId,
        p_tenant_id:   tenantId,
        p_token:       token,
        p_dispositivo: dispositivo,
      })

      if (error) {
        console.warn('[Sesión] Error al registrar:', error.message)
        return
      }

      // Solo mostrar conflicto si hay sesión previa REAL en otro dispositivo
      if (data?.sesion_previa === true) {
        setConflicto({
          dispositivo: data.sesion_previa_dispositivo || 'otro dispositivo',
          token:       data.sesion_previa_token,
        })
      }

      // Escuchar si ESTA sesión es cerrada remotamente
      channelRef.current = supabase
        .channel(`sesion-watch-${token}-${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event:  'UPDATE',
            schema: 'public',
            table:  'sesiones_activas',
            filter: `session_token=eq.${token}`,
          },
          (payload) => {
            if (payload.new?.activa === false) {
              limpiarToken(userId)
              onForzarLogout?.('Tu sesión fue cerrada porque la cuenta inició sesión en otro dispositivo.')
            }
          }
        )
        .subscribe()

      // Heartbeat cada 3 minutos
      heartbeatRef.current = setInterval(async () => {
        await supabase.rpc('heartbeat_sesion', { p_token: token })
      }, 3 * 60 * 1000)
    }

    iniciar()

    return () => {
      clearInterval(heartbeatRef.current)
      if (channelRef.current) supabase.removeChannel(channelRef.current)
      // Al desmontar (logout real) limpiar la sesión
      if (tokenRef.current) {
        supabase.rpc('cerrar_sesion_remota', { p_token: tokenRef.current }).then(() => {})
        limpiarToken(userId)
      }
    }
  }, [session?.user?.id, tenantInfo?.tenant_id])

  const expulsarSesionAnterior = async () => {
    if (!conflicto?.token) { setConflicto(null); return }
    await supabase.rpc('cerrar_sesion_remota', { p_token: conflicto.token })
    setConflicto(null)
  }

  const cederSesion = async () => {
    if (tokenRef.current) {
      await supabase.rpc('cerrar_sesion_remota', { p_token: tokenRef.current })
      limpiarToken(session?.user?.id)
    }
    setConflicto(null)
    onForzarLogout?.('Inicio de sesión cancelado — el usuario ya está activo en otro dispositivo.')
  }

  return { conflicto, expulsarSesionAnterior, cederSesion }
}