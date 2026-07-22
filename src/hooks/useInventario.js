import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useFoto } from './useFoto'
import { getIsOnline, encolar } from '../lib/offlineManager'
import db from '../lib/db'

export function useInventario() {
  const [productos,  setProductos]  = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const { subirFoto, eliminarFoto } = useFoto()

  // ── Cargar productos (online con fallback offline) ──
  const fetchProductos = useCallback(async () => {
    setLoading(true)
    if (getIsOnline()) {
      try {
        const { data, error } = await supabase
          .from('productos')
          .select(`
            *,
            categorias(nombre),
            marcas(nombre),
            proveedores(nombre),
            producto_atributos(id, valor, categoria_atributos(id, nombre, tipo))
          `)
          .eq('activo', true)
          .order('nombre')
        if (!error) {
          // El campo 'cod' es el identificador principal para el código de barras.
          // Se genera automáticamente con prefijo + números (ej. PRD0042), compatible con Code 128.
          const productosConQR = (data || []).map(p => ({
            ...p,
            qrValue: p.cod || p.sku || p.id, // mantenido por compatibilidad, pero se prefiere 'cod'
          }))
          setProductos(productosConQR)
          setLoading(false)
          return
        }
      } catch {}
    }
    // Fallback offline
    const local = await db.productos.where('activo').equals(1).toArray()
    const localesConQR = local.map(p => ({
      ...p,
      qrValue: p.cod || p.sku || p.id,
    }))
    setProductos(localesConQR)
    setLoading(false)
  }, [])

  // ── Cargar categorías (online con fallback offline) ──
  const fetchCategorias = useCallback(async () => {
    if (getIsOnline()) {
      try {
        const { data } = await supabase
          .from('categorias')
          .select(`*, categoria_atributos(*, atributo_opciones(*))`)
          .order('nombre')
        if (data) {
          setCategorias(data)
          return
        }
      } catch {}
    }
    const local = await db.categorias.toArray()
    setCategorias(local)
  }, [])

  useEffect(() => {
    fetchProductos()
    fetchCategorias()
  }, [])

  // ── Crear producto ──
  const crearProducto = async (datos, atributos, archivoFoto = null) => {
    if (getIsOnline()) {
      const { data: prod, error } = await supabase
        .from('productos')
        .insert([datos])
        .select()
        .single()
      if (error) throw new Error(error.message)

      if (archivoFoto) {
        const url = await subirFoto(archivoFoto, prod.id)
        await supabase.from('productos').update({ foto_url: url }).eq('id', prod.id)
      }

      if (atributos && Object.keys(atributos).length > 0) {
        const items = Object.entries(atributos)
          .filter(([, v]) => v?.toString().trim())
          .map(([atributo_id, valor]) => ({
            producto_id: prod.id,
            atributo_id,
            valor: valor.toString()
          }))
        if (items.length > 0) {
          await supabase.from('producto_atributos').insert(items)
        }
      }
    } else {
      // Modo offline: guardar local + encolar
      const id = crypto.randomUUID()
      await db.productos.add({ ...datos, id, _synced: false })
      await encolar('productos', 'insert', { ...datos, id }, datos.tenant_id)
    }
    await fetchProductos()
  }

  // ── Actualizar producto ──
  const actualizarProducto = async (id, datos, atributos, archivoFoto = null, eliminarFotoActual = false) => {
    let fotoUrl = datos.foto_url
    if (eliminarFotoActual) {
      await eliminarFoto(id)
      fotoUrl = null
    }
    if (archivoFoto) {
      fotoUrl = await subirFoto(archivoFoto, id)
    }

    const datosActualizados = {
      ...datos,
      foto_url: fotoUrl,
      updated_at: new Date().toISOString()
    }

    if (getIsOnline()) {
      const { error } = await supabase
        .from('productos')
        .update(datosActualizados)
        .eq('id', id)
      if (error) throw new Error(error.message)

      if (atributos) {
        await supabase.from('producto_atributos').delete().eq('producto_id', id)
        const items = Object.entries(atributos)
          .filter(([, v]) => v?.toString().trim())
          .map(([atributo_id, valor]) => ({
            producto_id: id,
            atributo_id,
            valor: valor.toString()
          }))
        if (items.length > 0) {
          await supabase.from('producto_atributos').insert(items)
        }
      }
    } else {
      // Modo offline: actualizar local + encolar
      await db.productos.where('id').equals(id).modify(datosActualizados)
      await encolar('productos', 'update', { ...datosActualizados, id }, datos.tenant_id)
    }
    await fetchProductos()
  }

  // ── Eliminar producto (baja lógica) ──
  const eliminarProducto = async (id) => {
    await eliminarFoto(id)
    if (getIsOnline()) {
      await supabase.from('productos').update({ activo: false }).eq('id', id)
    } else {
      await db.productos.where('id').equals(id).modify({ activo: false })
      await encolar('productos', 'delete', { id }, null)
    }
    await fetchProductos()
  }

  // ── Buscar por SKU o código ──
  const buscarPorSku = async (sku) => {
    if (getIsOnline()) {
      try {
        const { data } = await supabase
          .from('productos')
          .select(`
            *,
            categorias(nombre),
            marcas(nombre),
            producto_atributos(id, valor, categoria_atributos(id, nombre, tipo))
          `)
          .or(`cod.eq.${sku},sku.eq.${sku}`)
          .eq('activo', true)
          .single()
        if (data) {
          // Devuelve también el campo 'cod' como referencia principal para código de barras
          return { ...data, qrValue: data.cod || data.sku || data.id }
        }
      } catch {}
    }
    // Fallback offline
    const local = await db.productos
      .filter(p => (p.cod === sku || p.sku === sku) && p.activo !== false)
      .first()
    if (local) {
      return { ...local, qrValue: local.cod || local.sku || local.id }
    }
    return null
  }

  return {
    productos,
    categorias,
    loading,
    error,
    crearProducto,
    actualizarProducto,
    eliminarProducto,
    buscarPorSku,
    refetch: fetchProductos,
  }
}