import { supabase } from './supabase'
import db from './db'

// ─── Estado de conexión ───────────────────────────────────────────────
let isOnline       = navigator.onLine
let syncing        = false
const listeners    = new Set()
const syncListeners= new Set()

window.addEventListener('online',  () => {
  isOnline = true
  notifyListeners()
  // Pequeño delay para que la conexión se estabilice
  setTimeout(() => syncQueue(), 1500)
})
window.addEventListener('offline', () => {
  isOnline = false
  notifyListeners()
})

function notifyListeners() {
  listeners.forEach(fn => fn(isOnline))
}

function notifySyncListeners(estado) {
  syncListeners.forEach(fn => fn(estado))
}

export function onConnectionChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function onSyncChange(fn) {
  syncListeners.add(fn)
  return () => syncListeners.delete(fn)
}

export function getIsOnline()  { return isOnline }
export function getIsSyncing() { return syncing  }

// ─── Poblar cache local desde Supabase ───────────────────────────────
export async function poblarCacheLocal(tenantId) {
  if (!isOnline) return
  console.log('[Offline] Poblando cache local...')

  const tablas = [
    { nombre: 'productos',    select: '*, categorias(nombre), marcas(nombre), proveedores(nombre), producto_atributos(id, valor, categoria_atributos(id, nombre, tipo))' },
    { nombre: 'categorias',   select: '*, categoria_atributos(*, atributo_opciones(*))' },
    { nombre: 'marcas',       select: '*' },
    { nombre: 'proveedores',  select: '*' },
    { nombre: 'clientes',     select: '*' },
    { nombre: 'ventas',       select: '*, venta_items(*, productos(nombre, cod, sku))' },
    { nombre: 'configuracion',select: '*' },
  ]

  for (const tabla of tablas) {
    try {
      const { data, error } = await supabase
        .from(tabla.nombre)
        .select(tabla.select)
        .eq('tenant_id', tenantId)

      if (!error && data) {
        await db[tabla.nombre]?.where('tenant_id').equals(tenantId).delete()
        await db[tabla.nombre]?.bulkPut(data.map(r => ({ ...r, _synced: true })))
        console.log(`[Offline] ${tabla.nombre}: ${data.length} registros`)
      }
    } catch (e) {
      console.warn(`[Offline] Error cargando ${tabla.nombre}:`, e.message)
    }
  }

  localStorage.setItem('lastSync', new Date().toISOString())
  console.log('[Offline] Cache local listo')
}

// ─── Agregar a la cola offline ────────────────────────────────────────
export async function encolar(tabla, operacion, datos, tenantId) {
  await db.sync_queue.add({
    tabla,
    operacion,
    datos:      JSON.stringify(datos),
    tenant_id:  tenantId,
    created_at: new Date().toISOString(),
    intentos:   0,
    error:      null,
  })
  console.log(`[Offline] Encolado: ${operacion} en ${tabla}`)

  // Actualizar conteo para el indicador
  const pendientes = await db.sync_queue.count()
  notifySyncListeners({ tipo: 'pendientes', cantidad: pendientes })
}

// ─── Ejecutar cola de sync ────────────────────────────────────────────
export async function syncQueue() {
  if (!isOnline || syncing) return

  const pendientes = await db.sync_queue.orderBy('created_at').toArray()
  if (pendientes.length === 0) return

  syncing = true
  notifySyncListeners({ tipo: 'iniciando', cantidad: pendientes.length })
  console.log(`[Offline] Sincronizando ${pendientes.length} operaciones...`)

  let exitosos = 0
  let fallidos  = 0

  for (const op of pendientes) {
    try {
      const datos = JSON.parse(op.datos)

      // Ejecutar según la operación
      let error = null

      if (op.operacion === 'insert') {
        // Verificar si ya existe (para evitar duplicados)
        const { data: existe } = await supabase
          .from(op.tabla)
          .select('id')
          .eq('id', datos.id)
          .single()

        if (!existe) {
          const result = await supabase.from(op.tabla).insert([datos])
          error = result.error
        }
        // Si ya existe, igual lo consideramos exitoso
      } else if (op.operacion === 'update') {
        const result = await supabase
          .from(op.tabla)
          .update(datos)
          .eq('id', datos.id)
        error = result.error
      } else if (op.operacion === 'delete') {
        const result = await supabase
          .from(op.tabla)
          .update({ activo: false })
          .eq('id', datos.id)
        error = result.error
      }

      if (error) throw new Error(error.message)

      // Éxito — eliminar de la cola
      await db.sync_queue.delete(op.id)
      exitosos++
      console.log(`[Offline] ✓ ${op.operacion} en ${op.tabla}`)

    } catch (e) {
      fallidos++
      const nuevosIntentos = (op.intentos || 0) + 1

      if (nuevosIntentos >= 5) {
        // Demasiados intentos — marcar como fallido permanente
        await db.sync_queue.update(op.id, {
          intentos: nuevosIntentos,
          error:    e.message,
          fallido:  true,
        })
        console.error(`[Offline] ✗ Fallo permanente en ${op.tabla}:`, e.message)
      } else {
        await db.sync_queue.update(op.id, {
          intentos: nuevosIntentos,
          error:    e.message,
        })
        console.warn(`[Offline] Intento ${nuevosIntentos}/5 fallido en ${op.tabla}:`, e.message)
      }
    }
  }

  syncing = false
  localStorage.setItem('lastSync', new Date().toISOString())

  const restantes = await db.sync_queue.where('fallido').notEqual(true).count()

  notifySyncListeners({
    tipo:      'completado',
    exitosos,
    fallidos,
    restantes,
  })

  console.log(`[Offline] Sync completado: ${exitosos} exitosos, ${fallidos} fallidos`)
}

// ─── Query universal: nube o local ───────────────────────────────────
export async function query(tabla, tenantId, filtros = {}) {
  if (isOnline) {
    try {
      let q = supabase.from(tabla).select('*').eq('tenant_id', tenantId)
      Object.entries(filtros).forEach(([k, v]) => { q = q.eq(k, v) })
      const { data, error } = await q
      if (!error) return data
    } catch {}
  }

  // Fallback a IndexedDB
  if (!db[tabla]) return []
  const resultados = await db[tabla].where('tenant_id').equals(tenantId).toArray()
  return Object.entries(filtros).reduce(
    (arr, [k, v]) => arr.filter(r => r[k] === v),
    resultados
  )
}

// ─── Obtener pendientes fallidos (para mostrar al usuario) ───────────
export async function getPendientesFallidos() {
  return await db.sync_queue.filter(op => op.fallido === true).toArray()
}

// ─── Reintentar fallidos manualmente ─────────────────────────────────
export async function reintentarFallidos() {
  await db.sync_queue.filter(op => op.fallido === true).modify({
    fallido:  false,
    intentos: 0,
    error:    null,
  })
  await syncQueue()
}

// ─── Limpiar cola (solo admin) ────────────────────────────────────────
export async function limpiarCola() {
  await db.sync_queue.clear()
  notifySyncListeners({ tipo: 'pendientes', cantidad: 0 })
}