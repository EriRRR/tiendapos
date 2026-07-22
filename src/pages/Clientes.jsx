import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  Search, Plus, X, User, Phone, DollarSign,
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle,
  Clock, FileText, Wallet, Edit2, UserX, UserCheck
} from 'lucide-react'
import { C, T, btn, card, input } from '../styles/responsive'
import { usePaginacion } from '../hooks/usePaginacion'     // <-- agregado
import Paginacion from '../components/Paginacion'         // <-- agregado

export default function Clientes() {
  const { tenantInfo, session } = useAuth()

  const [clientes,      setClientes]      = useState([])
  const [conDeuda,      setConDeuda]      = useState([])
  const [loading,       setLoading]       = useState(true)
  const [busqueda,      setBusqueda]      = useState('')
  const [tab,           setTab]           = useState('todos') // 'todos' | 'deuda' | 'abonos'
  const [expandido,     setExpandido]     = useState(null)
  const [creditos,        setCreditos]        = useState({}) // { clienteId: [...] }
  const [loadingCreditos, setLoadingCreditos] = useState(null)

  // Modal nuevo/editar cliente
  const [modalCliente,  setModalCliente]  = useState(false)
  const [editandoCliente, setEditandoCliente] = useState(null)
  const [formCliente,   setFormCliente]   = useState({
    nombre: '',
    apellido: '',
    apodo: '',
    telefono: '',
    direccion: '',
    limite_credito: '',
    credito_bloqueado: false,
    notas_credito: ''
  })
  const [guardandoCliente, setGuardandoCliente] = useState(false)
  const [errorCliente,  setErrorCliente]  = useState('')

  // Modal abono
  const [modalAbono,    setModalAbono]    = useState(null) // { venta, cliente }
  const [montoAbono,    setMontoAbono]    = useState('')
  const [notaAbono,     setNotaAbono]     = useState('')
  const [guardandoAbono,setGuardandoAbono]= useState(false)
  const [errorAbono,    setErrorAbono]    = useState('')

  const cargar = async () => {
    if (!tenantInfo?.tenant_id) return
    setLoading(true)
    const [{ data: cl }, { data: cd }] = await Promise.all([
      supabase.from('clientes')
        .select('*')
        .eq('tenant_id', tenantInfo.tenant_id)
        .eq('activo', true)
        .order('nombre'),
      supabase.rpc('get_clientes_con_deuda', { p_tenant_id: tenantInfo.tenant_id }),
    ])
    if (cl) setClientes(cl)
    if (cd) setConDeuda(Array.isArray(cd) ? cd : [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [tenantInfo?.tenant_id])

  const cargarCreditos = async (clienteId) => {
    setLoadingCreditos(clienteId)
    const { data } = await supabase.rpc('get_creditos_cliente', {
      p_tenant_id:  tenantInfo.tenant_id,
      p_cliente_id: clienteId,
    })
    setCreditos(prev => ({ ...prev, [clienteId]: Array.isArray(data) ? data : [] }))
    setLoadingCreditos(null)
  }

  const toggleExpandir = async (clienteId) => {
    if (expandido === clienteId) {
      setExpandido(null)
    } else {
      setExpandido(clienteId)
      if (!creditos[clienteId]) await cargarCreditos(clienteId)
    }
  }

  // ── CRUD Clientes ──
  const abrirNuevo = () => {
    setEditandoCliente(null)
    setFormCliente({
      nombre: '',
      apellido: '',
      apodo: '',
      telefono: '',
      direccion: '',
      limite_credito: '',
      credito_bloqueado: false,
      notas_credito: ''
    })
    setErrorCliente('')
    setModalCliente(true)
  }

  const abrirEditar = (c) => {
    setEditandoCliente(c)
    setFormCliente({
      nombre:           c.nombre           || '',
      apellido:         c.apellido         || '',
      apodo:            c.apodo            || '',
      telefono:         c.telefono         || '',
      direccion:        c.direccion        || '',
      limite_credito:   c.limite_credito   || '',
      credito_bloqueado: c.credito_bloqueado || false,
      notas_credito:    c.notas_credito    || '',
    })
    setErrorCliente('')
    setModalCliente(true)
  }

  const guardarCliente = async () => {
    if (!formCliente.nombre.trim()) { setErrorCliente('El nombre es obligatorio'); return }
    setGuardandoCliente(true); setErrorCliente('')
    try {
      const datos = {
        nombre:           formCliente.nombre,
        apellido:         formCliente.apellido,
        apodo:            formCliente.apodo,
        telefono:         formCliente.telefono,
        direccion:        formCliente.direccion,
        limite_credito:   formCliente.limite_credito   || null,
        credito_bloqueado: formCliente.credito_bloqueado || false,
        notas_credito:    formCliente.notas_credito    || null,
        updated_at:       new Date().toISOString(),
      }
      if (editandoCliente) {
        const { error } = await supabase.from('clientes').update(datos).eq('id', editandoCliente.id)
        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase.from('clientes')
          .insert([{ ...datos, tenant_id: tenantInfo.tenant_id, activo: true }])
        if (error) throw new Error(error.message)
      }
      setModalCliente(false)
      await cargar()
    } catch (e) { setErrorCliente(e.message) }
    setGuardandoCliente(false)
  }

  const desactivarCliente = async (c) => {
    if (!window.confirm(`¿Desactivar a ${nombreMostrar(c)}?`)) return
    await supabase.from('clientes').update({ activo: false }).eq('id', c.id)
    await cargar()
  }

  // ── Abonos ──
  const abrirAbono = (venta, cliente) => {
    setModalAbono({ venta, cliente })
    setMontoAbono(parseFloat(venta.saldo_pendiente).toFixed(2))
    setNotaAbono('')
    setErrorAbono('')
  }

  const confirmarAbono = async () => {
    const monto = parseFloat(montoAbono)
    if (!monto || monto <= 0) { setErrorAbono('Ingresa un monto válido'); return }
    if (monto > parseFloat(modalAbono.venta.saldo_pendiente)) {
      setErrorAbono('El monto no puede superar el saldo pendiente')
      return
    }
    setGuardandoAbono(true); setErrorAbono('')
    try {
      const { data, error } = await supabase.rpc('registrar_abono', {
        p_tenant_id:  tenantInfo.tenant_id,
        p_cliente_id: modalAbono.cliente.id,
        p_venta_id:   modalAbono.venta.id,
        p_monto:      monto,
        p_nota:       notaAbono || null,
      })
      if (error) throw new Error(error.message)
      setModalAbono(null)
      // Recargar créditos del cliente
      await cargarCreditos(modalAbono.cliente.id)
      await cargar()
    } catch (e) { setErrorAbono(e.message) }
    setGuardandoAbono(false)
  }

  // ── Helpers ──
  const nombreMostrar = (c) => {
    let n = [c.nombre, c.apellido].filter(Boolean).join(' ')
    if (c.apodo) n += ` "${c.apodo}"`
    return n
  }

  const fmt = (n) => `L ${parseFloat(n || 0).toFixed(2)}`

  // ── Filtros y paginación ──
  const clientesFiltrados = (tab === 'deuda' ? conDeuda : clientes).filter(c => {
    if (!busqueda) return true
    const q = busqueda.toLowerCase()
    return (
      (c.nombre    || '').toLowerCase().includes(q) ||
      (c.apellido  || '').toLowerCase().includes(q) ||
      (c.apodo     || '').toLowerCase().includes(q) ||
      (c.telefono  || '').toLowerCase().includes(q)
    )
  })

  const clientesDeudaFiltrados = conDeuda.filter(c => {
    if (!busqueda) return true
    const q = busqueda.toLowerCase()
    return (
      (c.nombre    || '').toLowerCase().includes(q) ||
      (c.apellido  || '').toLowerCase().includes(q) ||
      (c.apodo     || '').toLowerCase().includes(q) ||
      (c.telefono  || '').toLowerCase().includes(q)
    )
  })

  const pagGeneral = usePaginacion(clientesFiltrados, 15)
  const pagDeuda   = usePaginacion(clientesDeudaFiltrados, 15)

  const totalDeuda = conDeuda.reduce((s, c) => s + parseFloat(c.saldo_pendiente || 0), 0)

  const lbl = { fontSize: T.xs, color: C.textSecondary, display: 'block', marginBottom: '0.25rem' }

  if (loading) return (
    <div style={{ padding: '2.5rem', textAlign: 'center', color: C.textMuted }}>Cargando...</div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.625rem' }}>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {[
            { id: 'todos', label: `Todos (${clientes.length})` },
            { id: 'deuda', label: `Con deuda (${conDeuda.length})`, color: conDeuda.length > 0 ? C.danger : undefined },
            { id: 'abonos', label: `Abonos pendientes` },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding: '0.4375rem 0.875rem', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontSize: T.xs, fontWeight: 600, background: tab === t.id ? C.primary : C.bgMuted, color: tab === t.id ? '#fff' : (t.color || C.textSecondary) }}>
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={abrirNuevo} style={{ ...btn.base, ...btn.primary }}>
          <Plus size={15} /> Nuevo cliente
        </button>
      </div>

      {/* Alerta total deuda — solo para tabs deuda/abonos */}
      {(tab === 'deuda' || tab === 'abonos') && totalDeuda > 0 && (
        <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: '0.625rem', padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <AlertTriangle size={16} color="#92400e" />
            <span style={{ fontSize: T.sm, fontWeight: 600, color: '#92400e' }}>
              {conDeuda.length} cliente{conDeuda.length !== 1 ? 's' : ''} con deuda pendiente
            </span>
          </div>
          <span style={{ fontSize: T.lg, fontWeight: 800, color: '#92400e' }}>
            {fmt(totalDeuda)}
          </span>
        </div>
      )}

      {/* Buscador */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: C.bgWhite, border: `1px solid ${C.border}`, borderRadius: '0.5rem', padding: '0.5rem 0.75rem' }}>
        <Search size={14} color={C.textMuted} />
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, apodo o teléfono..."
          style={{ border: 'none', outline: 'none', fontSize: T.sm, width: '100%', background: 'transparent', color: C.text }}
        />
        {busqueda && (
          <button onClick={() => setBusqueda('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, padding: 0, display: 'flex' }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* ─── Contenido según tab ─── */}
      {tab === 'abonos' ? (
        /* ══ TAB: ABONOS PENDIENTES ══ */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

          {/* Resumen total */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(10rem, 1fr))', gap: '0.75rem' }}>
            <div style={{ ...card, padding: '0.875rem' }}>
              <div style={{ fontSize: T.xs, color: C.textMuted }}>Total por cobrar</div>
              <div style={{ fontSize: T.xl, fontWeight: 800, color: C.danger }}>
                L {conDeuda.reduce((s, c) => s + parseFloat(c.saldo_pendiente || 0), 0).toFixed(2)}
              </div>
            </div>
            <div style={{ ...card, padding: '0.875rem' }}>
              <div style={{ fontSize: T.xs, color: C.textMuted }}>Clientes con deuda</div>
              <div style={{ fontSize: T.xl, fontWeight: 800, color: '#f59e0b' }}>
                {conDeuda.length}
              </div>
            </div>
          </div>

          {/* Lista de clientes con deuda y sus créditos */}
          {clientesDeudaFiltrados.length === 0 ? (
            <div style={{ ...card, padding: '2.5rem', textAlign: 'center' }}>
              <CheckCircle size={36} color={C.success} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
              <div style={{ fontSize: T.sm, color: C.success, fontWeight: 600 }}>¡Sin cuentas pendientes!</div>
              <div style={{ fontSize: T.xs, color: C.textMuted, marginTop: '0.25rem' }}>Todos los clientes están al día</div>
            </div>
          ) : (
            pagDeuda.itemsPagina.map(c => {
              const abierto = expandido === `abono-${c.id}`
              return (
                <div key={c.id} style={{ ...card, overflow: 'hidden' }}>
                  {/* Header cliente */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1rem' }}>
                    <div style={{ width: '2.5rem', height: '2.5rem', background: '#fef9c3', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: T.base, fontWeight: 700, color: '#92400e' }}>
                      {(c.nombre || '?').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: T.sm, fontWeight: 700, color: C.text }}>{nombreMostrar(c)}</div>
                      {c.telefono && <div style={{ fontSize: T.xs, color: C.textMuted }}>{c.telefono}</div>}
                      <div style={{ fontSize: T.xs, color: '#92400e', fontWeight: 600, marginTop: '0.125rem' }}>
                        {c.num_creditos} crédito{c.num_creditos !== 1 ? 's' : ''} pendiente{c.num_creditos !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: T.lg, fontWeight: 800, color: C.danger }}>
                        L {parseFloat(c.saldo_pendiente).toFixed(2)}
                      </div>
                      <button
                        onClick={async () => {
                          const key = `abono-${c.id}`
                          if (expandido === key) { setExpandido(null) }
                          else {
                            setExpandido(key)
                            if (!creditos[c.id]) await cargarCreditos(c.id)
                          }
                        }}
                        style={{ ...btn.base, background: C.successLight, color: C.success, border: '1px solid #bbf7d0', fontSize: T.xs, padding: '0.3125rem 0.625rem', marginTop: '0.375rem' }}>
                        <DollarSign size={12} /> Ver créditos
                      </button>
                    </div>
                  </div>

                  {/* Créditos expandidos */}
                  {abierto && (
                    <div style={{ borderTop: `1px solid ${C.borderLight}`, background: C.bgMuted, padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {loadingCreditos === c.id ? (
                        <div style={{ textAlign: 'center', color: C.textMuted, fontSize: T.xs, padding: '1rem' }}>Cargando...</div>
                      ) : (creditos[c.id] || []).filter(v => parseFloat(v.saldo_pendiente) > 0).map(v => {
                        const abonado = parseFloat(v.total) - parseFloat(v.saldo_pendiente)
                        const pct     = (abonado / parseFloat(v.total)) * 100
                        return (
                          <div key={v.id} style={{ background: C.bgWhite, borderRadius: '0.5rem', border: `1px solid ${C.borderLight}`, padding: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.375rem' }}>
                              <div>
                                <div style={{ fontSize: T.xs, fontWeight: 700, color: C.text }}>
                                  Venta #{v.numero_venta}
                                </div>
                                <div style={{ fontSize: '0.625rem', color: C.textMuted }}>
                                  {new Date(v.created_at).toLocaleDateString('es-HN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                  {' · '}Total: L {parseFloat(v.total).toFixed(2)}
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: T.xs, color: C.danger, fontWeight: 700 }}>
                                    L {parseFloat(v.saldo_pendiente).toFixed(2)}
                                  </div>
                                  <div style={{ fontSize: '0.625rem', color: C.textMuted }}>pendiente</div>
                                </div>
                                <button onClick={() => abrirAbono(v, c)}
                                  style={{ ...btn.base, background: C.success, color: '#fff', border: 'none', fontSize: T.xs, padding: '0.4375rem 0.75rem' }}>
                                  <DollarSign size={12} /> Abonar
                                </button>
                              </div>
                            </div>
                            {/* Barra progreso */}
                            <div style={{ background: C.borderLight, borderRadius: '9999px', height: '0.375rem', overflow: 'hidden' }}>
                              <div style={{ background: C.success, height: '100%', width: `${pct}%`, borderRadius: '9999px' }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', fontSize: '0.625rem', color: C.textMuted }}>
                              <span>Abonado: L {abonado.toFixed(2)}</span>
                              <span>{Math.round(pct)}% pagado</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })
          )}

          {/* Paginación para abonos */}
          {clientesDeudaFiltrados.length > 0 && (
            <Paginacion
              pagina={pagDeuda.pagina}
              totalPaginas={pagDeuda.totalPaginas}
              total={pagDeuda.total}
              porPagina={15}
              irA={pagDeuda.irA}
              anterior={pagDeuda.anterior}
              siguiente={pagDeuda.siguiente}
              hayAnterior={pagDeuda.hayAnterior}
              haySiguiente={pagDeuda.haySiguiente}
              label="clientes"
            />
          )}
        </div>
      ) : (
        /* ══ TAB: TODOS / DEUDA ══ */
        <>
          {clientesFiltrados.length === 0 ? (
            <div style={{ ...card, padding: '2.5rem', textAlign: 'center' }}>
              <User size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.2 }} />
              <div style={{ fontSize: T.sm, color: C.textMuted }}>
                {busqueda ? `Sin resultados para "${busqueda}"` : tab === 'deuda' ? '✓ Sin clientes con deuda' : 'No hay clientes registrados'}
              </div>
              {!busqueda && tab === 'todos' && (
                <button onClick={abrirNuevo} style={{ ...btn.base, ...btn.primary, margin: '0.75rem auto 0' }}>
                  <Plus size={14} /> Crear primer cliente
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {pagGeneral.itemsPagina.map(c => {
                const abierto     = expandido === c.id
                const tieneCreditos = creditos[c.id]
                const deuda       = parseFloat(c.saldo_pendiente || 0)

                return (
                  <div key={c.id} style={{ ...card, overflow: 'hidden' }}>
                    {/* Fila principal */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1rem' }}>
                      {/* Avatar */}
                      <div style={{ width: '2.5rem', height: '2.5rem', background: deuda > 0 ? '#fef9c3' : C.primaryLight, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: T.base, fontWeight: 700, color: deuda > 0 ? '#92400e' : C.primary }}>
                        {(c.nombre || '?').charAt(0).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: T.sm, fontWeight: 600, color: C.text }}>
                            {nombreMostrar(c)}
                          </span>
                          {deuda > 0 && (
                            <span style={{ fontSize: T.xs, background: '#fef9c3', color: '#92400e', borderRadius: '9999px', padding: '0.0625rem 0.5rem', fontWeight: 700 }}>
                              Debe {fmt(deuda)}
                            </span>
                          )}
                        </div>
                        {c.telefono && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.125rem' }}>
                            <Phone size={11} color={C.textMuted} />
                            <span style={{ fontSize: T.xs, color: C.textMuted }}>{c.telefono}</span>
                          </div>
                        )}
                      </div>

                      {/* Acciones */}
                      <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
                        {deuda > 0 && (
                          <button
                            onClick={() => toggleExpandir(c.id)}
                            style={{ ...btn.base, background: '#fef9c3', color: '#92400e', border: '1px solid #fde68a', fontSize: T.xs, padding: '0.375rem 0.625rem' }}>
                            <Wallet size={13} /> Créditos
                          </button>
                        )}
                        <button onClick={() => abrirEditar(c)}
                          style={{ ...btn.base, ...btn.ghost, padding: '0.375rem 0.5rem' }}>
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => toggleExpandir(c.id)}
                          style={{ ...btn.base, ...btn.ghost, padding: '0.375rem 0.5rem' }}>
                          {abierto ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* Panel expandido — créditos y abonos */}
                    {abierto && (
                      <div style={{ borderTop: `1px solid ${C.borderLight}`, background: C.bgMuted }}>
                        {loadingCreditos === c.id ? (
                          <div style={{ padding: '1.5rem', textAlign: 'center', color: C.textMuted, fontSize: T.xs }}>
                            Cargando historial...
                          </div>
                        ) : !tieneCreditos || tieneCreditos.length === 0 ? (
                          <div style={{ padding: '1.5rem', textAlign: 'center', color: C.textMuted, fontSize: T.sm }}>
                            <CheckCircle size={24} color={C.success} style={{ margin: '0 auto 0.5rem' }} />
                            Sin créditos registrados
                          </div>
                        ) : (
                          <div style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                            <div style={{ fontSize: T.xs, fontWeight: 700, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Historial de créditos
                            </div>
                            {tieneCreditos.map(v => {
                              const saldo   = parseFloat(v.saldo_pendiente || 0)
                              const pagado  = saldo === 0
                              const abonado = parseFloat(v.total) - saldo
                              return (
                                <div key={v.id} style={{ background: C.bgWhite, borderRadius: '0.625rem', border: `1px solid ${pagado ? '#bbf7d0' : '#fde68a'}`, overflow: 'hidden' }}>
                                  {/* Header crédito */}
                                  <div style={{ padding: '0.75rem 0.875rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: T.xs, fontWeight: 700, color: C.text }}>
                                          Venta #{v.numero_venta}
                                        </span>
                                        <span style={{ fontSize: T.xs, background: pagado ? C.successLight : '#fef9c3', color: pagado ? C.success : '#92400e', borderRadius: '9999px', padding: '0.0625rem 0.5rem', fontWeight: 600 }}>
                                          {pagado ? '✓ Pagado' : `Debe ${fmt(saldo)}`}
                                        </span>
                                      </div>
                                      <div style={{ fontSize: '0.625rem', color: C.textMuted, marginTop: '0.125rem' }}>
                                        {new Date(v.created_at).toLocaleDateString('es-HN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        {' · '}Total: {fmt(v.total)}
                                        {abonado > 0 && ` · Abonado: ${fmt(abonado)}`}
                                      </div>
                                    </div>

                                    {!pagado && (
                                      <button
                                        onClick={() => abrirAbono(v, c)}
                                        style={{ ...btn.base, background: C.successLight, color: C.success, border: '1px solid #bbf7d0', fontSize: T.xs, padding: '0.375rem 0.75rem', flexShrink: 0 }}>
                                        <DollarSign size={12} /> Abonar
                                      </button>
                                    )}
                                  </div>

                                  {/* Barra de progreso del pago */}
                                  {!pagado && (
                                    <div style={{ padding: '0 0.875rem 0.625rem' }}>
                                      <div style={{ background: C.borderLight, borderRadius: '9999px', height: '0.375rem', overflow: 'hidden' }}>
                                        <div style={{ background: C.success, height: '100%', width: `${Math.min(100, (abonado / parseFloat(v.total)) * 100)}%`, borderRadius: '9999px', transition: 'width 0.5s' }} />
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                                        <span style={{ fontSize: '0.625rem', color: C.textMuted }}>
                                          Abonado: {fmt(abonado)}
                                        </span>
                                        <span style={{ fontSize: '0.625rem', color: C.textMuted }}>
                                          {Math.round((abonado / parseFloat(v.total)) * 100)}%
                                        </span>
                                      </div>
                                    </div>
                                  )}

                                  {/* Historial de abonos de esta venta */}
                                  {v.abonos && v.abonos.length > 0 && (
                                    <div style={{ borderTop: `1px solid ${C.borderLight}`, padding: '0.5rem 0.875rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                      <div style={{ fontSize: '0.625rem', fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                        Abonos registrados
                                      </div>
                                      {v.abonos.map((a, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                                          <CheckCircle size={12} color={C.success} style={{ flexShrink: 0 }} />
                                          <span style={{ fontSize: T.xs, fontWeight: 600, color: C.success }}>
                                            {fmt(a.monto)}
                                          </span>
                                          <span style={{ fontSize: '0.625rem', color: C.textMuted }}>
                                            {new Date(a.created_at).toLocaleDateString('es-HN', { day: '2-digit', month: 'short' })}
                                          </span>
                                          {a.nota && (
                                            <span style={{ fontSize: '0.625rem', color: C.textMuted, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                              · {a.nota}
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Paginación para todos/deuda */}
              {clientesFiltrados.length > 0 && (
                <Paginacion
                  pagina={pagGeneral.pagina}
                  totalPaginas={pagGeneral.totalPaginas}
                  total={pagGeneral.total}
                  porPagina={15}
                  irA={pagGeneral.irA}
                  anterior={pagGeneral.anterior}
                  siguiente={pagGeneral.siguiente}
                  hayAnterior={pagGeneral.hayAnterior}
                  haySiguiente={pagGeneral.haySiguiente}
                  label="clientes"
                />
              )}
            </div>
          )}
        </>
      )}

      {/* ══ MODAL NUEVO/EDITAR CLIENTE ══ */}
      {modalCliente && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div style={{ background: C.bgWhite, borderRadius: '0.75rem', padding: '1.25rem', width: '100%', maxWidth: '26rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: T.base, fontWeight: 700, color: C.text }}>
                {editandoCliente ? 'Editar cliente' : 'Nuevo cliente'}
              </h3>
              <button onClick={() => setModalCliente(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, display: 'flex' }}>
                <X size={18} />
              </button>
            </div>

            {errorCliente && (
              <div style={{ background: '#fef2f2', border: `1px solid ${C.dangerBorder}`, borderRadius: '0.5rem', padding: '0.75rem', fontSize: T.sm, color: C.danger, marginBottom: '1rem' }}>
                {errorCliente}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginBottom: '0.75rem' }}>
              {[
                { k: 'nombre',    label: 'Nombre *',    ph: 'Ej: María',       full: false },
                { k: 'apellido',  label: 'Apellido',    ph: 'Ej: García',      full: false },
                { k: 'apodo',     label: 'Apodo',       ph: '"La Chela"',      full: false },
                { k: 'telefono',  label: 'Teléfono',    ph: '+504 0000-0000',  full: false },
                { k: 'direccion', label: 'Dirección',   ph: 'Barrio, ciudad',  full: true  },
              ].map(f => (
                <div key={f.k} style={{ gridColumn: f.full ? 'span 2' : 'span 1' }}>
                  <label style={lbl}>{f.label}</label>
                  <input
                    value={formCliente[f.k]}
                    onChange={e => setFormCliente(p => ({ ...p, [f.k]: e.target.value }))}
                    placeholder={f.ph}
                    style={input}
                  />
                </div>
              ))}

              {/* Configuración de crédito */}
              <div style={{ gridColumn: 'span 2', borderTop: `1px solid ${C.borderLight}`, paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                <div style={{ fontSize: T.xs, fontWeight: 700, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.625rem' }}>
                  Configuración de crédito
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
                  <div>
                    <label style={lbl}>Límite de crédito (L)</label>
                    <input
                      type="number"
                      value={formCliente.limite_credito || ''}
                      onChange={e => setFormCliente(p => ({ ...p, limite_credito: e.target.value ? parseFloat(e.target.value) : null }))}
                      placeholder="Dejar vacío = usa el default"
                      min={0} step={50}
                      style={input}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.bgMuted, borderRadius: '0.5rem', padding: '0.625rem 0.75rem' }}>
                      <div>
                        <div style={{ fontSize: T.xs, fontWeight: 600, color: C.text }}>Crédito bloqueado</div>
                        <div style={{ fontSize: '0.625rem', color: C.textMuted }}>No puede dar credito</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormCliente(p => ({ ...p, credito_bloqueado: !p.credito_bloqueado }))}
                        style={{ width: '2.5rem', height: '1.375rem', borderRadius: '9999px', border: 'none', cursor: 'pointer', background: formCliente.credito_bloqueado ? C.danger : C.border, transition: 'background 0.2s', position: 'relative', flexShrink: 0 }}>
                        <div style={{ position: 'absolute', top: '0.0625rem', left: formCliente.credito_bloqueado ? '1.125rem' : '0.0625rem', width: '1.25rem', height: '1.25rem', background: '#fff', borderRadius: '50%', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                      </button>
                    </div>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={lbl}>Notas de crédito</label>
                    <input
                      value={formCliente.notas_credito || ''}
                      onChange={e => setFormCliente(p => ({ ...p, notas_credito: e.target.value }))}
                      placeholder="Ej: Cliente confiable, paga puntual..."
                      style={input}
                    />
                  </div>
                </div>
              </div>
            </div>

            {formCliente.nombre && (
              <div style={{ background: C.bgMuted, borderRadius: '0.375rem', padding: '0.5rem 0.75rem', fontSize: T.xs, color: C.textMuted, marginBottom: '0.875rem' }}>
                Se mostrará como: <strong style={{ color: C.text }}>
                  {[formCliente.nombre, formCliente.apellido].filter(Boolean).join(' ')}
                  {formCliente.apodo ? ` "${formCliente.apodo}"` : ''}
                </strong>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setModalCliente(false)}
                style={{ ...btn.base, ...btn.ghost }}>Cancelar</button>
              <button onClick={guardarCliente} disabled={guardandoCliente}
                style={{ ...btn.base, ...btn.primary, opacity: guardandoCliente ? 0.7 : 1 }}>
                {guardandoCliente ? 'Guardando...' : editandoCliente ? 'Guardar cambios' : 'Crear cliente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL ABONO ══ */}
      {modalAbono && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }}>
          <div style={{ background: C.bgWhite, borderRadius: '0.75rem', padding: '1.25rem', width: '100%', maxWidth: '24rem' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: T.base, fontWeight: 700, color: C.text }}>Registrar abono</h3>
                <div style={{ fontSize: T.xs, color: C.textMuted, marginTop: '0.125rem' }}>
                  {nombreMostrar(modalAbono.cliente)} · Venta #{modalAbono.venta.numero_venta}
                </div>
              </div>
              <button onClick={() => setModalAbono(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, display: 'flex' }}>
                <X size={18} />
              </button>
            </div>

            {/* Resumen de la deuda */}
            <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: '0.625rem', padding: '0.875rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: T.xs, color: '#92400e' }}>Saldo pendiente</div>
                <div style={{ fontSize: T.xl, fontWeight: 800, color: '#92400e' }}>
                  {fmt(modalAbono.venta.saldo_pendiente)}
                </div>
                <div style={{ fontSize: T.xs, color: '#92400e', marginTop: '0.125rem' }}>
                  de {fmt(modalAbono.venta.total)} total
                </div>
              </div>
              <AlertTriangle size={28} color="#92400e" />
            </div>

            {errorAbono && (
              <div style={{ background: '#fef2f2', border: `1px solid ${C.dangerBorder}`, borderRadius: '0.5rem', padding: '0.75rem', fontSize: T.sm, color: C.danger, marginBottom: '1rem' }}>
                {errorAbono}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <label style={lbl}>Monto a abonar (L) *</label>
                <input
                  type="number"
                  value={montoAbono}
                  onChange={e => setMontoAbono(e.target.value)}
                  min="0.01"
                  max={parseFloat(modalAbono.venta.saldo_pendiente)}
                  step="0.01"
                  style={{ ...input, fontSize: T.lg, fontWeight: 700, textAlign: 'center' }}
                  autoFocus
                />
                {/* Botones rápidos */}
                <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.5rem' }}>
                  {[25, 50, 75, 100].map(pct => {
                    const monto = (parseFloat(modalAbono.venta.saldo_pendiente) * pct / 100).toFixed(2)
                    return (
                      <button key={pct} onClick={() => setMontoAbono(monto)}
                        style={{ flex: 1, ...btn.base, ...btn.ghost, fontSize: T.xs, padding: '0.25rem' }}>
                        {pct}%
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label style={lbl}>Nota (opcional)</label>
                <input
                  value={notaAbono}
                  onChange={e => setNotaAbono(e.target.value)}
                  placeholder="Ej: Pago en efectivo, transferencia..."
                  style={input}
                />
              </div>
            </div>

            {/* Preview del resultado */}
            {montoAbono && parseFloat(montoAbono) > 0 && (
              <div style={{ background: C.successLight, border: '1px solid #bbf7d0', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', fontSize: T.xs }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ color: C.textSecondary }}>Abono:</span>
                  <span style={{ fontWeight: 700, color: C.success }}>{fmt(montoAbono)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: C.textSecondary }}>Saldo restante:</span>
                  <span style={{ fontWeight: 700, color: parseFloat(modalAbono.venta.saldo_pendiente) - parseFloat(montoAbono) <= 0 ? C.success : '#92400e' }}>
                    {fmt(Math.max(0, parseFloat(modalAbono.venta.saldo_pendiente) - parseFloat(montoAbono)))}
                    {parseFloat(modalAbono.venta.saldo_pendiente) - parseFloat(montoAbono) <= 0 && ' ✓ Pagado'}
                  </span>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setModalAbono(null)}
                style={{ ...btn.base, ...btn.ghost }}>Cancelar</button>
              <button onClick={confirmarAbono} disabled={guardandoAbono || !montoAbono || parseFloat(montoAbono) <= 0}
                style={{ ...btn.base, background: C.success, color: '#fff', border: 'none', opacity: guardandoAbono || !montoAbono ? 0.7 : 1 }}>
                <DollarSign size={14} />
                {guardandoAbono ? 'Registrando...' : `Confirmar abono de ${fmt(montoAbono)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}