import * as XLSX from 'xlsx'

// Exportar ventas
export function exportarVentas(ventas, nombreArchivo = 'Ventas_Vendix') {
  const filas = ventas.flatMap(v =>
    (v.items || [{ nombre: '—', cantidad: 0, precio_unitario: 0, subtotal: 0 }]).map((item, i) => ({
      '# Venta':        v.numero_venta,
      'Fecha':          new Date(v.created_at).toLocaleString('es-HN'),
      'Cliente':        v.cliente_nombre || 'General',
      'Método pago':    v.es_fiado ? 'Fiado' : 'Efectivo',
      'Estado':         v.anulada ? 'Anulada' : 'Completada',
      'Producto':       item.nombre,
      'Cantidad':       item.cantidad,
      'Precio unit.':   parseFloat(item.precio_unitario || 0).toFixed(2),
      'Subtotal':       parseFloat(item.subtotal || 0).toFixed(2),
      'Total venta':    i === 0 ? parseFloat(v.total).toFixed(2) : '',
      'Saldo pendiente':i === 0 && v.es_fiado ? parseFloat(v.saldo_pendiente || 0).toFixed(2) : '',
    }))
  )

  const ws  = XLSX.utils.json_to_sheet(filas)
  const wb  = XLSX.utils.book_new()

  // Ancho de columnas
  ws['!cols'] = [
    { wch: 8 }, { wch: 18 }, { wch: 20 }, { wch: 12 },
    { wch: 12 }, { wch: 30 }, { wch: 10 }, { wch: 13 },
    { wch: 10 }, { wch: 12 }, { wch: 15 },
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Ventas')
  XLSX.writeFile(wb, `${nombreArchivo}.xlsx`)
}

// Exportar inventario
export function exportarInventario(productos, nombreArchivo = 'Inventario_Vendix') {
  const filas = productos.map(p => ({
    'Código':        p.cod || p.sku || '',
    'Nombre':        p.nombre,
    'Categoría':     p.categorias?.nombre || '',
    'Marca':         p.marcas?.nombre     || '',
    'Proveedor':     p.proveedores?.nombre|| '',
    'Precio compra': p.precio_compra ? parseFloat(p.precio_compra).toFixed(2) : '',
    'Precio venta':  parseFloat(p.precio).toFixed(2),
    'Stock actual':  p.stock,
    'Stock mínimo':  p.stock_minimo,
    'Estado':        p.stock === 0 ? 'Agotado' : p.stock <= p.stock_minimo ? 'Stock bajo' : 'Disponible',
  }))

  const ws  = XLSX.utils.json_to_sheet(filas)
  const wb  = XLSX.utils.book_new()
  ws['!cols'] = [
    { wch: 10 }, { wch: 35 }, { wch: 15 }, { wch: 15 },
    { wch: 20 }, { wch: 14 }, { wch: 12 }, { wch: 12 },
    { wch: 12 }, { wch: 12 },
  ]
  XLSX.utils.book_append_sheet(wb, ws, 'Inventario')
  XLSX.writeFile(wb, `${nombreArchivo}.xlsx`)
}

// Exportar clientes y deudas
export function exportarClientes(clientes, nombreArchivo = 'Clientes_Vendix') {
  const filas = clientes.map(c => ({
    'Nombre':          c.nombre || '',
    'Apellido':        c.apellido || '',
    'Apodo':           c.apodo   || '',
    'Teléfono':        c.telefono || '',
    'Dirección':       c.direccion || '',
    'Saldo pendiente': parseFloat(c.saldo_pendiente || 0).toFixed(2),
    'Límite crédito':  c.limite_credito ? parseFloat(c.limite_credito).toFixed(2) : 'Default',
    'Crédito bloqueado': c.credito_bloqueado ? 'Sí' : 'No',
    'Registrado':      new Date(c.created_at).toLocaleDateString('es-HN'),
  }))

  const ws  = XLSX.utils.json_to_sheet(filas)
  const wb  = XLSX.utils.book_new()
  ws['!cols'] = [
    { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 },
    { wch: 30 }, { wch: 16 }, { wch: 14 }, { wch: 17 }, { wch: 14 },
  ]
  XLSX.utils.book_append_sheet(wb, ws, 'Clientes')
  XLSX.writeFile(wb, `${nombreArchivo}.xlsx`)
}