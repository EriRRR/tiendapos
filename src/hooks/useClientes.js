import { useState, useEffect, useCallback } from 'react'
import { supabase, getTenantId } from '../lib/supabase'

export function useClientes() {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchClientes = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('clientes')
      .select('*')
      .eq('activo', true)
      .order('nombre')
    setClientes(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchClientes() }, [])

  const nombreMostrar = (c) => {
    if (!c) return ''
    const completo = [c.nombre, c.apellido].filter(Boolean).join(' ')
    return c.apodo ? `${completo} "${c.apodo}"` : completo
  }

  const buscarClientes = (lista, texto) => {
    if (!texto.trim()) return lista
    const q = texto.toLowerCase()
    return lista.filter(c =>
      (c.nombre || '').toLowerCase().includes(q) ||
      (c.apellido || '').toLowerCase().includes(q) ||
      (c.apodo || '').toLowerCase().includes(q) ||
      (c.telefono || '').includes(q)
    )
  }

  const crearCliente = async (datos) => {
    const tenant_id = await getTenantId()
    const { data, error } = await supabase
      .from('clientes').insert([{ ...datos, tenant_id }]).select().single()
    if (error) throw new Error(error.message)
    await fetchClientes()
    return data
  }

  const actualizarCliente = async (id, datos) => {
    const { error } = await supabase
      .from('clientes')
      .update({ ...datos, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw new Error(error.message)
    await fetchClientes()
  }

  const eliminarCliente = async (id) => {
    const { error } = await supabase
      .from('clientes').update({ activo: false }).eq('id', id)
    if (error) throw new Error(error.message)
    await fetchClientes()
  }

  const fetchDetalleCliente = async (id) => {
    const { data: cliente } = await supabase
      .from('clientes').select('*').eq('id', id).single()
    const { data: ventas } = await supabase
      .from('ventas')
      .select('*, venta_items(*, productos(nombre, sku))')
      .eq('cliente_id', id)
      .eq('es_credito', true)
      .order('created_at', { ascending: false })
    const { data: abonos } = await supabase
      .from('abonos')
      .select('*')
      .eq('cliente_id', id)
      .order('created_at', { ascending: false })
    return { cliente, ventas: ventas || [], abonos: abonos || [] }
  }

  const registrarAbono = async (cliente_id, monto, tipo = 'abono', venta_id = null, nota = '') => {
    const tenant_id = await getTenantId()
    const { error } = await supabase
      .from('abonos')
      .insert([{ cliente_id, monto: parseFloat(monto), tipo, venta_id, nota, tenant_id }])
    if (error) throw new Error(error.message)
    await fetchClientes()
  }

  return {
    clientes, loading, fetchClientes,
    nombreMostrar, buscarClientes,
    crearCliente, actualizarCliente, eliminarCliente,
    fetchDetalleCliente, registrarAbono,
  }
}