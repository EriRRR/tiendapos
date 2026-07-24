import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  Search, X, Filter, ChevronDown, ChevronUp,
  FileX, RotateCcw, Calendar, ShoppingCart,
  User, AlertTriangle, CheckCircle, Download
} from 'lucide-react'
import { C, T, btn, card, input, badge } from '../styles/responsive'
import { exportarVentas } from '../lib/exportarExcel'  // <-- NUEVO IMPORT

const METODOS = [
  { val: '',          label: 'Todos los métodos' },
  { val: 'efectivo',  label: '💵 Efectivo'       },
  { val: 'fiado',     label: '📋 Fiado'          },
  { val: 'tarjeta',   label: '💳 Tarjeta'        },
]

export default function Historial() {
  const { tenantInfo, session } = useAuth()

  const [ventas,       setVentas]       = useState([])
  const [total,        setTotal]        = useState(0)
  const [loading,      setLoading]      = useState(true)
  const [busqueda,     setBusqueda]     = useState('')
  const [metodo,       setMetodo]       = useState('')
  const [fechaIni,     setFechaIni]     = useState('')
  const [fechaFin,     setFechaFin]     = useState('')
  const [soloAnuladas, setSoloAnuladas] = useState(false)
  const [expandida,    setExpandida]    = useState(null)
  const [pagina,       setPagina]       = useState(0)
  const [modalAnular,  setModalAnular]  = useState(null)
  const [motivoAnular, setMotivoAnular] = useState('')
  const [anulando,     setAnulando]     = useState(false)
  const [msg,          setMsg]          = useState(null)
  const POR_PAG = 20

  const cargar = useCallback(async (pag = 0) => {
    if (!tenantInfo?.tenant_id) return
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('get_historial_ventas', {
        p_tenant_id: tenantInfo.tenant_id,
        p_fecha_ini: fechaIni || null,
        p_fecha_fin: fechaFin || null,
        p_metodo:    metodo   || null,
        p_busqueda:  busqueda || null,
        p_limite:    POR_PAG,
        p_offset:    pag * POR_PAG,
      })
      if (error) throw error
      let lista = data?.ventas || []
      if (soloAnuladas) lista = lista.filter(v => v.anulada)
      setVentas(lista)
      setTotal(data?.total || 0)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }, [tenantInfo?.tenant_id, fechaIni, fechaFin, metodo, busqueda, soloAnuladas])

  useEffect(() => { setPagina(0); cargar(0) }, [fechaIni, fechaFin, metodo, busqueda, soloAnuladas])

  const hoy = () => {
    const h = new Date().toISOString().split('T')[0]
    setFechaIni(h); setFechaFin(h)
  }
  const esteaMes = () => {
    const ahora = new Date()
    const ini   = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString().split('T')[0]
    const fin   = new Date().toISOString().split('T')[0]
    setFechaIni(ini); setFechaFin(fin)
  }

  const handleAnular = async () => {
    if (!motivoAnular.trim()) { setMsg({ tipo: 'error', texto: 'Escribe el motivo de la anulación' }); return }
    setAnulando(true)
    try {
      const { data, error } = await supabase.rpc('anular_venta', {
        p_tenant_id: tenantInfo.tenant_id,
        p_venta_id:  modalAnular.id,
        p_user_id:   session.user.id,
        p_motivo:    motivoAnular,
      })
      if (error) throw new Error(error.message)
      setMsg({ tipo: 'ok', texto: `✓ Venta #${modalAnular.numero_venta} anulada correctamente` })
      setModalAnular(null)
      setMotivoAnular('')
      await cargar(pagina)
    } catch (e) {
      setMsg({ tipo: 'error', texto: e.message })
    }
    setAnulando(false)
    setTimeout(() => setMsg(null), 4000)
  }

  // Totales del período filtrado
  const totalEfectivo = ventas.filter(v => !v.anulada && v.metodo_pago === 'efectivo').reduce((s, v) => s + parseFloat(v.total), 0)
  const totalFiado    = ventas.filter(v => !v.anulada && v.es_fiado).reduce((s, v) => s + parseFloat(v.total), 0)
  const totalGeneral  = ventas.filter(v => !v.anulada).reduce((s, v) => s + parseFloat(v.total), 0)

  const fmt = (iso) => new Date(iso).toLocaleString('es-HN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const lbl = { fontSize: T.xs, color: C.textSecondary, display: 'block', marginBottom: '0.25rem' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Mensaje */}
      {msg && (
        <div style={{ background: msg.tipo === 'ok' ? C.successLight : '#fef2f2', border: `1px solid ${msg.tipo === 'ok' ? '#bbf7d0' : C.dangerBorder}`, borderRadius: '0.5rem', padding: '0.75rem 1rem', fontSize: T.sm, color: msg.tipo === 'ok' ? C.success : C.danger, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {msg.tipo === 'ok' ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
          {msg.texto}
        </div>
      )}

      {/* Resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(9rem, 1fr))', gap: '0.75rem' }}>
        {[
          { label: 'Total ventas',  val: `L ${totalGeneral.toFixed(2)}`,  color: C.primary  },
          { label: 'Efectivo',      val: `L ${totalEfectivo.toFixed(2)}`, color: C.success  },
          { label: 'Fiado',         val: `L ${totalFiado.toFixed(2)}`,    color: '#f59e0b'  },
          { label: 'Transacciones', val: ventas.filter(v => !v.anulada).length, color: C.text },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding: '0.875rem 1rem' }}>
            <div style={{ fontSize: T.xs, color: C.textMuted }}>{s.label}</div>
            <div style={{ fontSize: T.xl, fontWeight: 800, color: s.color, marginTop: '0.25rem' }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ ...card, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>

          {/* Búsqueda */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: C.bgWhite, border: `1px solid ${C.border}`, borderRadius: '0.5rem', padding: '0.5rem 0.75rem', flex: 1, minWidth: '12rem' }}>
            <Search size={14} color={C.textMuted} />
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por # venta o cliente..."
              style={{ border: 'none', outline: 'none', fontSize: T.sm, width: '100%', background: 'transparent', color: C.text }} />
            {busqueda && <button onClick={() => setBusqueda('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, padding: 0, display: 'flex' }}><X size={13} /></button>}
          </div>

          {/* Método */}
          <select value={metodo} onChange={e => setMetodo(e.target.value)}
            style={{ ...input, cursor: 'pointer', minWidth: '10rem' }}>
            {METODOS.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
          </select>

          {/* Solo anuladas */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', fontSize: T.xs, color: C.textSecondary, userSelect: 'none', background: soloAnuladas ? '#fef2f2' : C.bgMuted, border: `1px solid ${soloAnuladas ? C.dangerBorder : C.border}`, borderRadius: '0.5rem', padding: '0.5rem 0.75rem' }}>
            <input type="checkbox" checked={soloAnuladas} onChange={e => setSoloAnuladas(e.target.checked)} style={{ accentColor: C.danger }} />
            Solo anuladas
          </label>
        </div>

        {/* Fechas */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <Calendar size={14} color={C.textMuted} />
            <label style={lbl}>Desde</label>
            <input type="date" value={fechaIni} onChange={e => setFechaIni(e.target.value)}
              style={{ ...input, padding: '0.375rem 0.625rem', fontSize: T.xs }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <label style={lbl}>Hasta</label>
            <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)}
              style={{ ...input, padding: '0.375rem 0.625rem', fontSize: T.xs }} />
          </div>
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            <button onClick={hoy} style={{ ...btn.base, ...btn.ghost, fontSize: T.xs, padding: '0.375rem 0.625rem' }}>Hoy</button>
            <button onClick={esteaMes} style={{ ...btn.base, ...btn.ghost, fontSize: T.xs, padding: '0.375rem 0.625rem' }}>Este mes</button>
            <button onClick={() => { setFechaIni(''); setFechaFin(''); setMetodo(''); setBusqueda(''); setSoloAnuladas(false) }}
              style={{ ...btn.base, ...btn.ghost, fontSize: T.xs, padding: '0.375rem 0.625rem', color: C.danger }}>
              Limpiar
            </button>
            {/* ─── BOTÓN EXPORTAR ─── */}
            <button
              onClick={() => exportarVentas(ventas)}
              style={{ ...btn.base, ...btn.ghost, fontSize: T.xs, padding: '0.375rem 0.625rem' }}>
              <Download size={14} /> Exportar Excel
            </button>
          </div>
        </div>
      </div>

      {/* Lista de ventas */}
      <div style={card}>
        {loading ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: C.textMuted }}>Cargando...</div>
        ) : ventas.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: C.textMuted }}>
            <ShoppingCart size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.25 }} />
            <div>No se encontraron ventas</div>
          </div>
        ) : ventas.map(v => {
          const abierta = expandida === v.id
          return (
            <div key={v.id} style={{ borderBottom: `1px solid ${C.borderLight}`, opacity: v.anulada ? 0.6 : 1 }}>
              {/* Fila resumen */}
              <div
                onClick={() => setExpandida(abierta ? null : v.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', cursor: 'pointer', flexWrap: 'wrap' }}
                onMouseEnter={e => e.currentTarget.style.background = C.bgMuted}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                {/* Número venta */}
                <div style={{ fontFamily: 'monospace', fontSize: T.sm, fontWeight: 700, color: C.primary, flexShrink: 0 }}>
                  #{String(v.numero_venta).padStart(4, '0')}
                </div>

                {/* Fecha */}
                <div style={{ fontSize: T.xs, color: C.textMuted, flexShrink: 0 }}>
                  {fmt(v.created_at)}
                </div>

                {/* Cliente */}
                <div style={{ flex: 1, minWidth: '6rem' }}>
                  {v.cliente_nombre ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: T.xs, color: C.textSecondary }}>
                      <User size={12} /> {v.cliente_nombre}
                    </div>
                  ) : (
                    <div style={{ fontSize: T.xs, color: C.textMuted }}>Cliente general</div>
                  )}
                </div>

                {/* Método */}
                <div style={{ fontSize: T.xs, fontWeight: 600, color: v.es_fiado ? '#f59e0b' : C.success, flexShrink: 0 }}>
                  {v.es_fiado ? '📋 Fiado' : '💵 Efectivo'}
                </div>

                {/* Total */}
                <div style={{ fontSize: T.base, fontWeight: 800, color: v.anulada ? C.textMuted : C.text, flexShrink: 0 }}>
                  L {parseFloat(v.total).toFixed(2)}
                </div>

                {/* Badge estado */}
                {v.anulada ? (
                  <span style={{ fontSize: T.xs, background: '#fef2f2', color: C.danger, border: `1px solid ${C.dangerBorder}`, borderRadius: '9999px', padding: '0.125rem 0.5rem', fontWeight: 700, flexShrink: 0 }}>
                    ✗ Anulada
                  </span>
                ) : v.es_fiado && v.saldo_pendiente > 0 ? (
                  <span style={{ fontSize: T.xs, background: '#fef9c3', color: '#92400e', border: '1px solid #fde68a', borderRadius: '9999px', padding: '0.125rem 0.5rem', fontWeight: 600, flexShrink: 0 }}>
                    Pendiente L {parseFloat(v.saldo_pendiente).toFixed(2)}
                  </span>
                ) : null}

                {/* Botón anular */}
                {!v.anulada && (
                  <button
                    onClick={e => { e.stopPropagation(); setModalAnular(v); setMotivoAnular('') }}
                    style={{ ...btn.base, background: '#fef2f2', color: C.danger, border: `1px solid ${C.dangerBorder}`, fontSize: T.xs, padding: '0.25rem 0.5rem', flexShrink: 0 }}>
                    <FileX size={13} /> Anular
                  </button>
                )}

                {/* Chevron */}
                <div style={{ flexShrink: 0, color: C.textMuted }}>
                  {abierta ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {/* Detalle expandido */}
              {abierta && (
                <div style={{ background: C.bgMuted, padding: '0.75rem 1rem', borderTop: `1px solid ${C.borderLight}` }}>

                  {v.anulada && v.notas && (
                    <div style={{ background: '#fef2f2', border: `1px solid ${C.dangerBorder}`, borderRadius: '0.375rem', padding: '0.5rem 0.75rem', fontSize: T.xs, color: C.danger, marginBottom: '0.75rem' }}>
                      <strong>Motivo de anulación:</strong> {v.notas}
                    </div>
                  )}

                  <div style={{ fontSize: T.xs, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
                    Productos vendidos
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: T.xs }}>
                    <thead>
                      <tr style={{ background: C.bgWhite }}>
                        {['Producto', 'Cantidad', 'Precio unitario', 'Subtotal'].map(h => (
                          <th key={h} style={{ padding: '0.375rem 0.625rem', textAlign: 'left', color: C.textMuted, fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(v.items || []).map((item, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? C.bgWhite : C.bgMuted }}>
                          <td style={{ padding: '0.375rem 0.625rem', color: C.text }}>
                            {item.nombre}
                            {item.cod && <span style={{ fontFamily: 'monospace', color: C.textMuted, marginLeft: '0.375rem' }}>({item.cod})</span>}
                          </td>
                          <td style={{ padding: '0.375rem 0.625rem', color: C.text, textAlign: 'center' }}>{item.cantidad}</td>
                          <td style={{ padding: '0.375rem 0.625rem', color: C.text }}>L {parseFloat(item.precio_unitario).toFixed(2)}</td>
                          <td style={{ padding: '0.375rem 0.625rem', color: C.text, fontWeight: 600 }}>L {parseFloat(item.subtotal).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3} style={{ padding: '0.5rem 0.625rem', textAlign: 'right', fontWeight: 700, color: C.textSecondary, borderTop: `1px solid ${C.border}` }}>Total:</td>
                        <td style={{ padding: '0.5rem 0.625rem', fontWeight: 800, color: C.primary, borderTop: `1px solid ${C.border}` }}>L {parseFloat(v.total).toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )
        })}

        {/* Paginación */}
        {total > POR_PAG && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderTop: `1px solid ${C.borderLight}` }}>
            <div style={{ fontSize: T.xs, color: C.textMuted }}>
              Mostrando {pagina * POR_PAG + 1}–{Math.min((pagina + 1) * POR_PAG, total)} de {total}
            </div>
            <div style={{ display: 'flex', gap: '0.375rem' }}>
              <button onClick={() => { setPagina(p => p - 1); cargar(pagina - 1) }}
                disabled={pagina === 0}
                style={{ ...btn.base, ...btn.ghost, padding: '0.375rem 0.625rem', fontSize: T.xs, opacity: pagina === 0 ? 0.4 : 1 }}>
                ← Anterior
              </button>
              <button onClick={() => { setPagina(p => p + 1); cargar(pagina + 1) }}
                disabled={(pagina + 1) * POR_PAG >= total}
                style={{ ...btn.base, ...btn.ghost, padding: '0.375rem 0.625rem', fontSize: T.xs, opacity: (pagina + 1) * POR_PAG >= total ? 0.4 : 1 }}>
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal anular */}
      {modalAnular && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div style={{ background: C.bgWhite, borderRadius: '0.75rem', padding: '1.25rem', width: '100%', maxWidth: '24rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.875rem' }}>
              <div style={{ width: '2.5rem', height: '2.5rem', background: '#fef2f2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileX size={18} color={C.danger} />
              </div>
              <div>
                <div style={{ fontSize: T.base, fontWeight: 700, color: C.text }}>Anular venta #{String(modalAnular.numero_venta).padStart(4, '0')}</div>
                <div style={{ fontSize: T.xs, color: C.textMuted }}>Esta acción restaura el stock de los productos</div>
              </div>
            </div>

            <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: '0.5rem', padding: '0.625rem 0.875rem', fontSize: T.xs, color: '#92400e', marginBottom: '1rem' }}>
              ⚠️ Esta acción no se puede deshacer. Se restaurará el stock de todos los productos de esta venta.
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: T.xs, color: C.textSecondary, display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
                Motivo de anulación *
              </label>
              <textarea
                value={motivoAnular}
                onChange={e => setMotivoAnular(e.target.value)}
                placeholder="Ej: Producto incorrecto, cliente canceló el pedido..."
                rows={3}
                autoFocus
                style={{ width: '100%', padding: '0.625rem', border: `1px solid ${C.border}`, borderRadius: '0.5rem', fontSize: T.sm, color: C.text, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => { setModalAnular(null); setMotivoAnular('') }}
                style={{ ...btn.base, ...btn.ghost }}>Cancelar</button>
              <button onClick={handleAnular} disabled={anulando || !motivoAnular.trim()}
                style={{ ...btn.base, background: C.danger, color: '#fff', border: 'none', opacity: (anulando || !motivoAnular.trim()) ? 0.6 : 1 }}>
                <FileX size={14} /> {anulando ? 'Anulando...' : 'Confirmar anulación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}