import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session,    setSession]    = useState(undefined) // undefined = aún no sabemos
  const [tenantInfo, setTenantInfo] = useState(null)
  const [loading,    setLoading]    = useState(true)
  const inicializadoRef = useRef(false)

  const cargarTenantInfo = async (userId) => {
    try {
      const { data, error } = await supabase
        .rpc('verificar_estado_tenant', { p_user_id: userId })
      if (data && !data.error) {
        setTenantInfo(data)
        return data
      }
      return null
    } catch {
      return null
    }
  }

  useEffect(() => {
    // Solo inicializar una vez
    if (inicializadoRef.current) return
    inicializadoRef.current = true

    // 1. Verificar sesión existente al cargar la app
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session ?? null)
      if (session?.user) {
        await cargarTenantInfo(session.user.id)
      }
      setLoading(false)
    })

    // 2. Listener solo para cambios EXTERNOS (cierre de sesión desde otra pestaña, expiración)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Ignorar SIGNED_IN porque lo manejamos manualmente en signIn
        // Solo reaccionar a SIGNED_OUT y TOKEN_REFRESHED
        if (event === 'SIGNED_OUT') {
          setSession(null)
          setTenantInfo(null)
          setLoading(false)
        } else if (event === 'TOKEN_REFRESHED' && session) {
          setSession(session)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw new Error(error.message)

      const { data: info } = await supabase
        .rpc('verificar_estado_tenant', { p_user_id: data.user.id })

      if (!info) throw new Error('Error al verificar acceso')
      if (info.error) throw new Error(info.error)

      if (info.estado === 'deshabilitado') {
        await supabase.auth.signOut()
        setSession(null)
        setTenantInfo(null)
        setLoading(false)
        const err = new Error('TIENDA_DESHABILITADA')
        err.nombre = info.nombre
        throw err
      }

      // Actualizar estado de forma síncrona
      setSession(data.session)
      setTenantInfo(info)
      setLoading(false)

      return { ...data, is_admin: info.is_admin }
    } catch (e) {
      setLoading(false)
      throw e
    }
  }

  const signOut = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    setSession(null)
    setTenantInfo(null)
    setLoading(false)
  }

  const refetchTenant = async () => {
    if (session?.user) {
      await cargarTenantInfo(session.user.id)
    }
  }

  return (
    <AuthContext.Provider value={{
      session,
      tenantInfo,
      loading,
      signIn,
      signOut,
      refetchTenant,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)