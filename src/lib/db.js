import Dexie from 'dexie'

export const db = new Dexie('TiendaPos')

db.version(1).stores({
  // Tablas locales — los campos indexados van aquí
  // El resto de campos se guardan automáticamente
  productos:          '++_id, id, tenant_id, sku, cod, nombre, categoria_id, marca_id, activo, updated_at',
  categorias:         '++_id, id, tenant_id, nombre',
  marcas:             '++_id, id, tenant_id, nombre',
  proveedores:        '++_id, id, tenant_id, nombre, activo',
  clientes:           '++_id, id, tenant_id, nombre, apellido',
  ventas:             '++_id, id, tenant_id, created_at, metodo_pago',
  venta_items:        '++_id, id, tenant_id, venta_id, producto_id',
  abonos:             '++_id, id, tenant_id, cliente_id',
  configuracion:      '++_id, id, tenant_id',
  categoria_atributos:'++_id, id, tenant_id, categoria_id',
  atributo_opciones:  '++_id, id, tenant_id, atributo_id',
  producto_atributos: '++_id, id, tenant_id, producto_id',

  // Cola de operaciones offline
  sync_queue: '++id, tabla, operacion, tenant_id, created_at, intentos',
})

// Limpia registros huérfanos al abrir
db.open().catch(err => console.error('Error abriendo IndexedDB:', err))

export default db