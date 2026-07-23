const { ipcMain } = require('electron')
const store = require('./store.cjs')   // ← reemplaza electron-store

let pool = null

function crearPool() {
  try {
    const { Pool } = require('pg')
    pool = new Pool({
      host:     store.get('db_host',     'localhost'),
      port:     store.get('db_port',     5432),
      database: store.get('db_name',     'vendix'),
      user:     store.get('db_user',     'postgres'),
      password: store.get('db_password', ''),
      max:      10,
      idleTimeoutMillis:       30000,
      connectionTimeoutMillis: 3000,
    })
    pool.on('error', err => console.error('Error PostgreSQL:', err.message))
  } catch (e) {
    console.warn('pg no disponible:', e.message)
  }
  return pool
}

function getPool() {
  if (!pool) crearPool()
  return pool
}

ipcMain.handle('db-query', async (_, { sql, params }) => {
  try {
    const p = getPool()
    if (!p) return { data: null, error: 'PostgreSQL no configurado' }
    const client = await p.connect()
    try {
      const result = await client.query(sql, params || [])
      return { data: result.rows, error: null }
    } finally {
      client.release()
    }
  } catch (err) {
    return { data: null, error: err.message }
  }
})

ipcMain.handle('db-ping', async () => {
  try {
    const p = getPool()
    if (!p) return { ok: false, error: 'PostgreSQL no configurado' }
    await p.query('SELECT 1')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

ipcMain.handle('db-reconnect', async () => {
  if (pool) { await pool.end(); pool = null }
  crearPool()
  return { ok: true }
})

module.exports = { getPool }