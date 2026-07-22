import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useConfiguracion() {
  const { tenantInfo } = useAuth()
  const [config,    setConfig]    = useState(null)
  const channelRef  = useRef(null)
  const mountedRef  = useRef(false)

  useEffect(() => {
    if (!tenantInfo?.tenant_id) return
    if (mountedRef.current) return
    mountedRef.current = true

    const tid = tenantInfo.tenant_id

    const cargar = async () => {
      const { data } = await supabase
        .from('configuracion')
        .select('*')
        .eq('tenant_id', tid)
        .single()
      if (data) setConfig(data)
    }

    cargar()

    const channel = supabase
      .channel(`config-hook-${tid}-${Date.now()}`)

    channel
      .on('postgres_changes', {
        event:  'UPDATE',
        schema: 'public',
        table:  'configuracion',
        filter: `tenant_id=eq.${tid}`,
      }, (payload) => {
        if (payload.new) setConfig(payload.new)
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      mountedRef.current = false
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [tenantInfo?.tenant_id])

  const cargar = async () => {
    if (!tenantInfo?.tenant_id) return null
    const { data } = await supabase
      .from('configuracion')
      .select('*')
      .eq('tenant_id', tenantInfo.tenant_id)
      .single()
    if (data) setConfig(data)
    return data
  }

  const calcularPrecioSugerido = (precioCompra) => {
    if (!precioCompra || !config) return null
    const pc = parseFloat(precioCompra)
    if (!pc || pc <= 0) return null
    if (config.margen_tipo === 'porcentaje' && config.margen_valor > 0)
      return pc * (1 + config.margen_valor / 100)
    if (config.margen_tipo === 'fijo' && config.margen_valor > 0)
      return pc + config.margen_valor
    return null
  }

  const previewCod = () => {
    const contador = (config?.cod_contador || 0) + 1
    return String(contador).padStart(6, '0')
  }

  const generarCod = async () => {
    const { data, error } = await supabase.rpc('generar_cod_producto', {
      p_tenant_id: tenantInfo.tenant_id,
    })
    if (error) throw new Error('No se pudo generar el código: ' + error.message)
    return data
  }

  return { config, cargar, calcularPrecioSugerido, generarCod, previewCod }
}