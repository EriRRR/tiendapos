import { useState, useEffect, useCallback } from 'react'
import { supabase, getTenantId } from '../lib/supabase'

export function useCatalogo() {
  const [categorias, setCategorias] = useState([])
  const [marcas, setMarcas] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchCategorias = useCallback(async () => {
    const { data } = await supabase
      .from('categorias')
      .select(`*, categoria_atributos(*, atributo_opciones(*))`)
      .order('nombre')
    setCategorias(data || [])
  }, [])

  const fetchMarcas = useCallback(async () => {
    const { data } = await supabase.from('marcas').select('*').order('nombre')
    setMarcas(data || [])
  }, [])

  const fetchProveedores = useCallback(async () => {
    const { data } = await supabase.from('proveedores').select('*').eq('activo', true).order('nombre')
    setProveedores(data || [])
  }, [])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    await Promise.all([fetchCategorias(), fetchMarcas(), fetchProveedores()])
    setLoading(false)
  }, [fetchCategorias, fetchMarcas, fetchProveedores])

  useEffect(() => { fetchAll() }, [])

  // CATEGORÍAS
  const crearCategoria = async (nombre) => {
    const tenant_id = await getTenantId()
    const { error } = await supabase.from('categorias').insert([{ nombre, tenant_id }])
    if (error) throw new Error(error.message)
    await fetchCategorias()
  }
  const editarCategoria = async (id, nombre) => {
    const { error } = await supabase.from('categorias').update({ nombre }).eq('id', id)
    if (error) throw new Error(error.message)
    await fetchCategorias()
  }
  const eliminarCategoria = async (id) => {
    const { error } = await supabase.from('categorias').delete().eq('id', id)
    if (error) throw new Error(error.message)
    await fetchCategorias()
  }

  // ATRIBUTOS
  const crearAtributo = async (categoria_id, nombre, tipo) => {
    const tenant_id = await getTenantId()
    const orden = (categorias.find(c => c.id === categoria_id)?.categoria_atributos?.length || 0) + 1
    const { error } = await supabase.from('categoria_atributos').insert([{ categoria_id, nombre, tipo, orden, tenant_id }])
    if (error) throw new Error(error.message)
    await fetchCategorias()
  }
  const editarAtributo = async (id, nombre, tipo) => {
    const { error } = await supabase.from('categoria_atributos').update({ nombre, tipo }).eq('id', id)
    if (error) throw new Error(error.message)
    await fetchCategorias()
  }
  const eliminarAtributo = async (id) => {
    const { error } = await supabase.from('categoria_atributos').delete().eq('id', id)
    if (error) throw new Error(error.message)
    await fetchCategorias()
  }

  // OPCIONES
  const crearOpcion = async (atributo_id, valor) => {
    const tenant_id = await getTenantId()
    const { error } = await supabase.from('atributo_opciones').insert([{ atributo_id, valor, tenant_id }])
    if (error) throw new Error(error.message)
    await fetchCategorias()
  }
  const eliminarOpcion = async (id) => {
    const { error } = await supabase.from('atributo_opciones').delete().eq('id', id)
    if (error) throw new Error(error.message)
    await fetchCategorias()
  }

  // MARCAS
  const crearMarca = async (nombre) => {
    const tenant_id = await getTenantId()
    const { error } = await supabase.from('marcas').insert([{ nombre: nombre.trim(), tenant_id }])
    if (error) throw new Error(error.message)
    await fetchMarcas()
  }
  const editarMarca = async (id, nombre) => {
    const { error } = await supabase.from('marcas').update({ nombre: nombre.trim() }).eq('id', id)
    if (error) throw new Error(error.message)
    await fetchMarcas()
  }
  const eliminarMarca = async (id) => {
    const { error } = await supabase.from('marcas').delete().eq('id', id)
    if (error) throw new Error(error.message)
    await fetchMarcas()
  }

  // PROVEEDORES
  const crearProveedor = async (datos) => {
    const tenant_id = await getTenantId()
    const { error } = await supabase.from('proveedores').insert([{ ...datos, tenant_id }])
    if (error) throw new Error(error.message)
    await fetchProveedores()
  }
  const editarProveedor = async (id, datos) => {
    const { error } = await supabase.from('proveedores').update(datos).eq('id', id)
    if (error) throw new Error(error.message)
    await fetchProveedores()
  }
  const eliminarProveedor = async (id) => {
    const { error } = await supabase.from('proveedores').update({ activo: false }).eq('id', id)
    if (error) throw new Error(error.message)
    await fetchProveedores()
  }

  return {
    categorias, marcas, proveedores, loading,
    fetchCategorias, fetchMarcas, fetchProveedores,
    crearCategoria, editarCategoria, eliminarCategoria,
    crearAtributo, editarAtributo, eliminarAtributo,
    crearOpcion, eliminarOpcion,
    crearMarca, editarMarca, eliminarMarca,
    crearProveedor, editarProveedor, eliminarProveedor,
  }
}