import { useState, useEffect, useCallback } from 'react'
import {
  onConnectionChange,
  onSyncChange,
  getIsOnline,
  getIsSyncing,
  syncQueue,
  getPendientesFallidos,
  reintentarFallidos,
  limpiarCola,
} from '../lib/offlineManager'
import db from '../lib/db'

export function useConexion() {
  const [online,        setOnline]        = useState(getIsOnline())
  const [sincronizando, setSincronizando] = useState(getIsSyncing())
  const [pendientes,    setPendientes]    = useState(0)
  const [fallidos,      setFallidos]      = useState(0)
  const [ultimoSync,    setUltimoSync]    = useState(
    localStorage.getItem('lastSync')
      ? new Date(localStorage.getItem('lastSync'))
      : null
  )
  const [ultimoResultado, setUltimoResultado] = useState(null)

  // Cargar conteo inicial
  useEffect(() => {
    const cargarConteos = async () => {
      const total   = await db.sync_queue.where('fallido').notEqual(true).count().catch(() => 0)
      const fall    = await getPendientesFallidos().then(f => f.length).catch(() => 0)
      setPendientes(total)
      setFallidos(fall)
    }
    cargarConteos()
  }, [])

  useEffect(() => {
    const unsubConn = onConnectionChange(estaOnline => {
      setOnline(estaOnline)
      if (!estaOnline) setSincronizando(false)
    })

    const unsubSync = onSyncChange(estado => {
      if (estado.tipo === 'iniciando') {
        setSincronizando(true)
        setUltimoResultado(null)
      } else if (estado.tipo === 'completado') {
        setSincronizando(false)
        setPendientes(estado.restantes || 0)
        setUltimoSync(new Date())
        setUltimoResultado({
          exitosos: estado.exitosos,
          fallidos: estado.fallidos,
        })
        // Actualizar conteo de fallidos
        getPendientesFallidos().then(f => setFallidos(f.length))
        if (estado.exitosos > 0) {
          localStorage.setItem('lastSync', new Date().toISOString())
        }
      } else if (estado.tipo === 'pendientes') {
        setPendientes(estado.cantidad || 0)
      }
    })

    return () => { unsubConn(); unsubSync() }
  }, [])

  const sincronizarAhora = useCallback(async () => {
    if (!online) return
    setSincronizando(true)
    await syncQueue()
  }, [online])

  const reintentar = useCallback(async () => {
    if (!online) return
    await reintentarFallidos()
  }, [online])

  const limpiar = useCallback(async () => {
    if (!window.confirm('¿Limpiar toda la cola de sincronización? Las operaciones pendientes se perderán.')) return
    await limpiarCola()
    setPendientes(0)
    setFallidos(0)
  }, [])

  const fmtSync = ultimoSync
    ? ultimoSync.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' })
    : null

  return {
    online,
    sincronizando,
    pendientes,
    fallidos,
    ultimoSync,
    fmtSync,
    ultimoResultado,
    sincronizarAhora,
    reintentar,
    limpiar,
  }
}