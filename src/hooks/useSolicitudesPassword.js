import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useSolicitudesPassword() {
  const { session, tenantInfo } = useAuth()
  const [solicitudes,  setSolicitudes]  = useState([])
  const [cargando,     setCargando]     = useState(false)
  const [procesando,   setProcesando]   = useState(null)
  const mountedRef     = useRef(false)

  const esSuperior = ['Dueño', 'Gerente', 'admin', 'developer'].includes(tenantInfo?.rol)
    || tenantInfo?.is_admin === true

  const cargar = async () => {
    if (!tenantInfo?.tenant_id || !esSuperior) return
    setCargando(true)
    const { data } = await supabase
      .from('solicitudes_password')
      .select('*')
      .eq('tenant_id', tenantInfo.tenant_id)
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false })
    if (data) setSolicitudes(data)
    setCargando(false)
  }

  useEffect(() => {
    if (!tenantInfo?.tenant_id || !esSuperior) return
    if (mountedRef.current) return
    mountedRef.current = true

    cargar()

    // Realtime — escuchar nuevas solicitudes
    const channel = supabase
      .channel(`solicitudes-${tenantInfo.tenant_id}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event:  '*',
          schema: 'public',
          table:  'solicitudes_password',
          filter: `tenant_id=eq.${tenantInfo.tenant_id}`,
        },
        () => cargar()
      )
      .subscribe()

    return () => {
      mountedRef.current = false
      supabase.removeChannel(channel)
    }
  }, [tenantInfo?.tenant_id, esSuperior])

  const aprobar = async (solicitudId) => {
    if (!session?.user?.id) return
    setProcesando(solicitudId)
    try {
      const { data, error } = await supabase.rpc('aprobar_solicitud_password', {
        p_aprobador_user_id: session.user.id,
        p_solicitud_id:      solicitudId,
      })
      if (error) throw new Error(error.message)

      // Enviar reset de contraseña por email via Supabase Auth
      const email = data?.email
      if (email) {
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/restablecer-password`,
        })
      }
      await cargar()
      return { ok: true, email }
    } catch (e) {
      return { ok: false, error: e.message }
    } finally {
      setProcesando(null)
    }
  }

  const rechazar = async (solicitudId, nota = '') => {
    if (!session?.user?.id) return
    setProcesando(solicitudId)
    try {
      const { error } = await supabase.rpc('rechazar_solicitud_password', {
        p_aprobador_user_id: session.user.id,
        p_solicitud_id:      solicitudId,
        p_nota:              nota || null,
      })
      if (error) throw new Error(error.message)
      await cargar()
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e.message }
    } finally {
      setProcesando(null)
    }
  }

  return {
    solicitudes,
    cargando,
    procesando,
    esSuperior,
    cargar,
    aprobar,
    rechazar,
    pendientes: solicitudes.length,
  }
}