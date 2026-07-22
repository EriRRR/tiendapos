import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { getIsOnline, encolar } from '../lib/offlineManager'
import db from '../lib/db'

export function useVentas() {
  const [carrito, setCarrito] = useState([])

  const total = carrito.reduce((s, i) => s + (i.precioPersonalizado * i.cantidad), 0)

  const agregarAlCarrito = (producto) => {
    setCarrito(prev => {
      if (prev.find(i => i.id === producto.id)) return prev
      if (producto.stock === 0) return prev
      return [...prev, {
        ...producto,
        cantidad: 1,
        precioPersonalizado: parseFloat(producto.precio)
      }]
    })
  }

  const quitarDelCarrito = (id) =>
    setCarrito(prev => prev.filter(i => i.id !== id))

  const cambiarCantidad = (id, cant) =>
    setCarrito(prev => prev.map(i =>
      i.id === id
        ? { ...i, cantidad: Math.max(1, Math.min(cant, i.stock)) }
        : i
    ))

  const cambiarPrecio = (id, precio) =>
    setCarrito(prev => prev.map(i =>
      i.id === id
        ? { ...i, precioPersonalizado: parseFloat(precio) || i.precioPersonalizado }
        : i
    ))

  const procesarVenta = async (metodoPago, clienteId = null, tenantId) => {
    if (carrito.length === 0) throw new Error('El carrito está vacío')

    const ventaId     = crypto.randomUUID()
    const numeroVenta = Date.now()
    const esCredito   = metodoPago === 'credito'
    const ahora       = new Date().toISOString()

    const venta = {
      id:           ventaId,
      tenant_id:    tenantId,
      numero_venta: numeroVenta,
      total,
      metodo_pago:  metodoPago,
      es_credito:     esCredito,
      cliente_id:   clienteId || null,
      created_at:   ahora,
    }

    const items = carrito.map(item => ({
      id:              crypto.randomUUID(),
      tenant_id:       tenantId,
      venta_id:        ventaId,
      producto_id:     item.id,
      cantidad:        item.cantidad,
      precio_unitario: item.precioPersonalizado,
      subtotal:        item.precioPersonalizado * item.cantidad,
      created_at:      ahora,
    }))

    if (getIsOnline()) {
      const { error: errVenta } = await supabase.from('ventas').insert([venta])
      if (errVenta) throw new Error(errVenta.message)

      const { error: errItems } = await supabase.from('venta_items').insert(items)
      if (errItems) throw new Error(errItems.message)
    } else {
      await db.ventas.add({ ...venta, _synced: false })
      await db.venta_items.bulkAdd(items.map(i => ({ ...i, _synced: false })))

      for (const item of carrito) {
        await db.productos
          .where('id').equals(item.id)
          .modify(p => { p.stock = Math.max(0, p.stock - item.cantidad) })
      }

      await encolar('ventas', 'insert', venta, tenantId)
      for (const item of items) {
        await encolar('venta_items', 'insert', item, tenantId)
      }
    }

    setCarrito([])
    return { ...venta, numero_venta: numeroVenta }
  }

  return {
    carrito,
    total,
    agregarAlCarrito,
    quitarDelCarrito,
    cambiarCantidad,
    cambiarPrecio,
    procesarVenta,
  }
}