import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useCredito() {
  const { tenantInfo } = useAuth()
  const [verificando, setVerificando] = useState(false)

  const verificarCredito = useCallback(async (clienteId, monto = 0) => {
    if (!clienteId || !tenantInfo?.tenant_id) return null
    setVerificando(true)
    const { data, error } = await supabase.rpc('verificar_credito_cliente', {
      p_tenant_id:  tenantInfo.tenant_id,
      p_cliente_id: clienteId,
      p_monto:      monto,
    })
    setVerificando(false)
    if (error) return null
    return data
  }, [tenantInfo?.tenant_id])

  return { verificarCredito, verificando }
}