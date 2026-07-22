import { useEffect, useRef } from 'react'
import { isElectron } from '../lib/electronBridge'
import { supabase } from '../lib/supabase'

/**
 * Escucha códigos QR del teléfono.
 * - En Electron: via IPC (WebSocket local / Cloudflare Tunnel)
 * - En Web: via Supabase Realtime
 */
export function useScannerRemoto(onCodigo, activo = true, sessionKey = null) {
  const callbackRef = useRef(onCodigo)
  callbackRef.current = onCodigo
  const mountedRef = useRef(false)

  useEffect(() => {
    if (!activo || !sessionKey) return
    if (mountedRef.current) return
    mountedRef.current = true

    // ── Electron: IPC desde el servidor WebSocket local ──────────────
    if (isElectron && window.electron?.onScannerCodigo) {
      const limpiar = window.electron.onScannerCodigo((codigo) => {
        if (callbackRef.current) callbackRef.current(codigo)
      })
      return () => {
        mountedRef.current = false
        if (typeof limpiar === 'function') limpiar()
      }
    }

    // ── Web: Supabase Realtime ────────────────────────────────────────
    const channel = supabase
      .channel(`scanner-${sessionKey}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'scanner_codigos',
          filter: `session_key=eq.${sessionKey}`,
        },
        (payload) => {
          const codigo = payload.new?.codigo
          if (codigo && callbackRef.current) {
            callbackRef.current(codigo)
            // Marcar como procesado
            supabase
              .from('scanner_codigos')
              .update({ procesado: true })
              .eq('id', payload.new.id)
              .then(() => {})
          }
        }
      )
      .subscribe()

    return () => {
      mountedRef.current = false
      supabase.removeChannel(channel)
    }
  }, [activo, sessionKey])
}