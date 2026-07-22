import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useReportes() {
  const [datos, setDatos] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchReportes = useCallback(async (periodo = 'hoy') => {
    setLoading(true)

    const ahora = new Date()
    let desde

    if (periodo === 'hoy') {
      desde = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
    } else if (periodo === 'semana') {
      desde = new Date(ahora)
      desde.setDate(ahora.getDate() - 7)
    } else if (periodo === 'mes') {
      desde = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
    }

    const desdeISO = desde.toISOString()

    const { data: ventas } = await supabase
      .from('ventas')
      .select('*, venta_items(*, productos(nombre, sku))')
      .gte('created_at', desdeISO)
      .order('created_at', { ascending: false })

    if (!ventas) { setLoading(false); return }

    const totalVentas = ventas.length
    const totalCobrado = ventas.reduce((s, v) => s + parseFloat(v.total), 0)

    const metodos = ventas.reduce((acc, v) => {
      acc[v.metodo_pago] = (acc[v.metodo_pago] || 0) + parseFloat(v.total)
      return acc
    }, {})

    const productosMap = {}
    ventas.forEach(v => {
      v.venta_items?.forEach(item => {
        const nombre = item.productos?.nombre || 'Desconocido'
        const sku = item.productos?.sku || ''
        if (!productosMap[sku]) productosMap[sku] = { nombre, sku, cantidad: 0, total: 0 }
        productosMap[sku].cantidad += item.cantidad
        productosMap[sku].total += parseFloat(item.subtotal)
      })
    })
    const masVendidos = Object.values(productosMap)
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5)

    const ventasPorDia = ventas.reduce((acc, v) => {
      const dia = new Date(v.created_at).toLocaleDateString('es-HN', { day: '2-digit', month: '2-digit' })
      if (!acc[dia]) acc[dia] = { dia, cantidad: 0, total: 0 }
      acc[dia].cantidad++
      acc[dia].total += parseFloat(v.total)
      return acc
    }, {})

    setDatos({
      ventas,
      totalVentas,
      totalCobrado,
      metodos,
      masVendidos,
      ventasPorDia: Object.values(ventasPorDia).reverse(),
      ticketPromedio: totalVentas > 0 ? totalCobrado / totalVentas : 0,
    })

    setLoading(false)
  }, [])

  return { datos, loading, fetchReportes }
}