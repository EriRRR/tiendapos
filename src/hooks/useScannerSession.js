import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useScannerSession() {
  const { tenantInfo } = useAuth()
  const [sessionKey,  setSessionKey]  = useState(null)
  const [scannerUrl,  setScannerUrl]  = useState('')
  const [cargando,    setCargando]    = useState(false)

  const crearSesion = async () => {
    if (!tenantInfo?.tenant_id) return
    setCargando(true)

    // Clave aleatoria de 8 caracteres
    const key = Math.random().toString(36).substring(2, 10).toUpperCase()

    const { error } = await supabase
      .from('scanner_sessions')
      .insert([{
        tenant_id:   tenantInfo.tenant_id,
        session_key: key,
        activo:      true,
      }])

    if (!error) {
      setSessionKey(key)
      // URL del escáner del teléfono
      const base = window.location.origin
      setScannerUrl(`${base}/escaner-movil?s=${key}`)
    }
    setCargando(false)
  }

  const terminarSesion = async () => {
    if (!sessionKey) return
    await supabase
      .from('scanner_sessions')
      .update({ activo: false })
      .eq('session_key', sessionKey)
    setSessionKey(null)
    setScannerUrl('')
  }

  // Limpiar al desmontar
  useEffect(() => {
    return () => { if (sessionKey) terminarSesion() }
  }, [sessionKey])

  return { sessionKey, scannerUrl, cargando, crearSesion, terminarSesion }
}