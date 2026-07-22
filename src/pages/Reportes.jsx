import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  TrendingUp, ShoppingCart, DollarSign, Users,
  Package, AlertTriangle, BarChart2, RefreshCw,
  Calendar, ArrowUp, ArrowDown, Minus as MinusIcon,
  Download, ChevronDown
} from 'lucide-react'
import { C, T, btn, card } from '../styles/responsive'

// ─── Mini gráfica de barras SVG (sin librería) ────────────────────────
function GraficaBarras({ datos, colorBarra = C.primary, altura = 120 }) {
  if (!datos || datos.length === 0) return (
    <div style={{ height: altura, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textMuted, fontSize: T.xs }}>
      Sin datos para mostrar
    </div>
  )

  const max    = Math.max(...datos.map(d => d.ingresos || d.cantidad || 0), 1)
  const anchoB = Math.max(8, Math.min(32, Math.floor(600 / datos.length) - 4))

  return (
    <div style={{ width: '100%', overflowX: 'auto', paddingBottom: '0.25rem' }}>
      <svg
        width={Math.max(datos.length * (anchoB + 4), 300)}
        height={altura + 32}
        style={{ display: 'block', minWidth: '100%' }}
      >
        {/* Líneas de referencia */}
        {[0.25, 0.5, 0.75, 1].map(f => (
          <line
            key={f}
            x1={0} y1={altura - altura * f}
            x2="100%" y2={altura - altura * f}
            stroke={C.borderLight} strokeWidth={0.5}
            strokeDasharray="4 4"
          />
        ))}

        {datos.map((d, i) => {
          const val   = d.ingresos || d.cantidad || 0
          const h     = Math.max(2, (val / max) * altura)
          const x     = i * (anchoB + 4) + 2
          const y     = altura - h
          const label = d.label || d.fecha || ''

          return (
            <g key={i}>
              <rect
                x={x} y={y}
                width={anchoB} height={h}
                rx={3}
                fill={colorBarra}
                opacity={0.85}
              />
              {/* Label bajo la barra */}
              <text
                x={x + anchoB / 2}
                y={altura + 14}
                textAnchor="middle"
                fontSize={9}
                fill={C.textMuted}
              >
                {label.length > 5 ? label.slice(-5) : label}
              </text>
              {/* Valor sobre la barra */}
              {h > 16 && (
                <text
                  x={x + anchoB / 2}
                  y={y - 3}
                  textAnchor="middle"
                  fontSize={8}
                  fill={C.textSecondary}
                >
                  {val >= 1000 ? `${(val/1000).toFixed(1)}k` : val.toFixed(0)}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ─── Gráfica de dona SVG ─────────────────────────────────────────────
function GraficaDona({ datos, size = 120 }) {
  if (!datos || datos.length === 0) return null

  const total   = datos.reduce((s, d) => s + (d.monto || d.cantidad || 0), 0)
  const colores = [C.primary, C.success, '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6']
  const cx = size / 2, cy = size / 2, r = size * 0.38, grosor = size * 0.18

  let angulo = -90
  const arcos = datos.map((d, i) => {
    const valor   = d.monto || d.cantidad || 0
    const pct     = total > 0 ? valor / total : 0
    const grados  = pct * 360
    const rad1    = (angulo * Math.PI) / 180
    const rad2    = ((angulo + grados) * Math.PI) / 180
    const x1 = cx + r * Math.cos(rad1), y1 = cy + r * Math.sin(rad1)
    const x2 = cx + r * Math.cos(rad2), y2 = cy + r * Math.sin(rad2)
    const grande  = grados > 180 ? 1 : 0
    const path    = `M ${x1} ${y1} A ${r} ${r} 0 ${grande} 1 ${x2} ${y2}`
    angulo += grados
    return { path, color: colores[i % colores.length], pct, label: d.metodo || d.nombre || '', valor }
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
      <svg width={size} height={size} style={{ flexShrink: 0 }}>
        {arcos.map((a, i) => (
          <path
            key={i} d={a.path}
            fill="none" stroke={a.color}
            strokeWidth={grosor}
            strokeLinecap="butt"
          />
        ))}
        <circle cx={cx} cy={cy} r={r - grosor / 2} fill={C.bgWhite} />
        <text x={cx} y={cy - 4}  textAnchor="middle" fontSize={10} fill={C.textSecondary}>Total</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize={11} fontWeight="bold" fill={C.text}>
          {datos.length}
        </text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', flex: 1, minWidth: '8rem' }}>
        {arcos.map((a, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '0.625rem', height: '0.625rem', borderRadius: '2px', background: a.color, flexShrink: 0 }} />
            <span style={{ fontSize: T.xs, color: C.textSecondary, flex: 1, textTransform: 'capitalize' }}>{a.label}</span>
            <span style={{ fontSize: T.xs, fontWeight: 700, color: C.text }}>
              {(a.pct * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────
export default function Reportes() {
  const { tenantInfo } = useAuth()

  const [periodo,     setPeriodo]     = useState(30)
  const [cargando,    setCargando]    = useState(true)
  const [resumen,     setResumen]     = useState(null)
  const [ventasDia,   setVentasDia]   = useState([])
  const [topProductos,setTopProductos]= useState([])
  const [metodosPago, setMetodosPago] = useState([])
  const [stockBajo,   setStockBajo]   = useState([])
  const [tabActivo,   setTabActivo]   = useState('resumen')
  const [verGrafica,  setVerGrafica]  = useState('ingresos') // 'ingresos' | 'cantidad'

  const cargar = async () => {
    if (!tenantInfo?.tenant_id) return
    setCargando(true)
    const tid = tenantInfo.tenant_id

    const [
      { data: res },
      { data: dias },
      { data: top },
      { data: metodos },
      { data: stock },
    ] = await Promise.all([
      supabase.rpc('reporte_resumen',       { p_tenant_id: tid, p_dias: periodo }),
      supabase.rpc('reporte_ventas_por_dia',{ p_tenant_id: tid, p_dias: periodo }),
      supabase.rpc('reporte_productos_top', { p_tenant_id: tid, p_limite: 10, p_dias: periodo }),
      supabase.rpc('reporte_metodos_pago',  { p_tenant_id: tid, p_dias: periodo }),
      supabase.rpc('reporte_stock_bajo',    { p_tenant_id: tid, p_umbral: 5 }),
    ])

    if (res)     setResumen(res)
    if (dias)    setVentasDia(Array.isArray(dias) ? dias : [])
    if (top)     setTopProductos(Array.isArray(top) ? top : [])
    if (metodos) setMetodosPago(Array.isArray(metodos) ? metodos : [])
    if (stock)   setStockBajo(Array.isArray(stock) ? stock : [])
    setCargando(false)
  }

  useEffect(() => { cargar() }, [tenantInfo?.tenant_id, periodo])

  const fmt   = (n) => `L ${parseFloat(n || 0).toLocaleString('es-HN', { minimumFractionDigits: 2 })}`
  const fmtN  = (n) => parseInt(n || 0).toLocaleString('es-HN')

  const TABS = [
    { id: 'resumen',   label: 'Resumen',      icon: BarChart2   },
    { id: 'ventas',    label: 'Ventas',        icon: TrendingUp  },
    { id: 'productos', label: 'Productos top', icon: Package     },
    { id: 'stock',     label: 'Stock',         icon: AlertTriangle },
  ]

  const PERIODOS = [
    { val: 7,   label: '7 días'  },
    { val: 15,  label: '15 días' },
    { val: 30,  label: '30 días' },
    { val: 60,  label: '60 días' },
    { val: 90,  label: '90 días' },
  ]

  if (cargando) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '16rem', gap: '0.75rem' }}>
      <RefreshCw size={24} color={C.primary} style={{ animation: 'spin 1s linear infinite' }} />
      <div style={{ fontSize: T.sm, color: C.textMuted }}>Cargando reportes...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Header con filtros */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.625rem' }}>
        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTabActivo(t.id)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.4375rem 0.875rem', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontSize: T.xs, fontWeight: 600, background: tabActivo === t.id ? C.primary : C.bgMuted, color: tabActivo === t.id ? '#fff' : C.textSecondary, transition: 'all 0.15s' }}>
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
          <Calendar size={13} color={C.textMuted} />
          <select
            value={periodo}
            onChange={e => setPeriodo(+e.target.value)}
            style={{ fontSize: T.xs, padding: '0.375rem 0.625rem', border: `1px solid ${C.border}`, borderRadius: '0.375rem', background: C.bgWhite, color: C.text, cursor: 'pointer' }}>
            {PERIODOS.map(p => <option key={p.val} value={p.val}>{p.label}</option>)}
          </select>
          <button onClick={cargar}
            style={{ ...btn.base, ...btn.ghost, padding: '0.375rem 0.5rem' }}>
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* ── TAB: RESUMEN ── */}
      {tabActivo === 'resumen' && resumen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

          {/* KPIs principales */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(10rem, 1fr))', gap: '0.75rem' }}>
            {[
              { icon: DollarSign,  label: 'Ingresos hoy',      valor: fmt(resumen.ingresos_hoy),    color: C.primary,  bg: C.primaryLight   },
              { icon: ShoppingCart,label: 'Ventas hoy',         valor: fmtN(resumen.ventas_hoy),     color: C.success,  bg: C.successLight   },
              { icon: DollarSign,  label: 'Ingresos del mes',   valor: fmt(resumen.ingresos_mes),    color: C.primary,  bg: C.primaryLight   },
              { icon: ShoppingCart,label: 'Ventas del mes',     valor: fmtN(resumen.ventas_mes),     color: C.success,  bg: C.successLight   },
              { icon: TrendingUp,  label: 'Ticket promedio',    valor: fmt(resumen.ticket_promedio), color: '#8b5cf6',  bg: '#f5f3ff'        },
              { icon: Users,       label: 'Clientes',           valor: fmtN(resumen.total_clientes), color: '#f59e0b',  bg: '#fef9c3'        },
              { icon: Package,     label: 'Productos activos',  valor: fmtN(resumen.total_productos),color: C.primary,  bg: C.primaryLight   },
              { icon: AlertTriangle,label:'Agotados',           valor: fmtN(resumen.productos_agotados), color: C.danger, bg: '#fef2f2'      },
            ].map((k, i) => (
              <div key={i} style={{ ...card, padding: '0.875rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div style={{ width: '2rem', height: '2rem', background: k.bg, borderRadius: '0.375rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <k.icon size={13} color={k.color} />
                  </div>
                  <span style={{ fontSize: T.xs, color: C.textMuted, lineHeight: 1.3 }}>{k.label}</span>
                </div>
                <div style={{ fontSize: T.lg, fontWeight: 800, color: k.color }}>
                  {k.valor}
                </div>
              </div>
            ))}
          </div>

          {/* creditos pendientes */}
          {parseFloat(resumen.creditos_monto || 0) > 0 && (
            <div style={{ ...card, padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.875rem', background: '#fef9c3', border: '1px solid #fde68a' }}>
              <AlertTriangle size={20} color="#92400e" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: T.sm, fontWeight: 700, color: '#92400e' }}>
                  Créditos pendientes por cobrar
                </div>
                <div style={{ fontSize: T.xs, color: '#92400e', marginTop: '0.125rem' }}>
                  {fmtN(resumen.creditos_pendientes)} venta{resumen.creditos_pendientes !== 1 ? 's' : ''} crédito{resumen.creditos_pendientes !== 1 ? 's' : ''}
                </div>
              </div>
              <div style={{ fontSize: T.lg, fontWeight: 800, color: '#92400e' }}>
                {fmt(resumen.creditos_monto)}
              </div>
            </div>
          )}

          {/* Métodos de pago + stock bajo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>

            {/* Métodos de pago */}
            <div style={card}>
              <div style={{ padding: '0.75rem 1rem', borderBottom: `1px solid ${C.borderLight}`, fontSize: T.sm, fontWeight: 700, color: C.text, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShoppingCart size={14} color={C.primary} /> Métodos de pago
              </div>
              <div style={{ padding: '0.875rem 1rem' }}>
                {metodosPago.length === 0 ? (
                  <div style={{ color: C.textMuted, fontSize: T.xs, textAlign: 'center', padding: '1rem' }}>Sin datos</div>
                ) : (
                  <GraficaDona datos={metodosPago} />
                )}
              </div>
            </div>

            {/* Stock crítico */}
            <div style={card}>
              <div style={{ padding: '0.75rem 1rem', borderBottom: `1px solid ${C.borderLight}`, fontSize: T.sm, fontWeight: 700, color: C.text, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={14} color={C.danger} /> Stock crítico (≤5)
              </div>
              <div style={{ maxHeight: '12rem', overflowY: 'auto' }}>
                {stockBajo.length === 0 ? (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: C.success, fontSize: T.xs }}>
                    ✓ Todo el stock está bien
                  </div>
                ) : stockBajo.slice(0, 6).map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 1rem', borderBottom: `1px solid ${C.borderLight}` }}>
                    <div style={{ width: '2rem', height: '2rem', background: p.stock === 0 ? '#fef2f2' : '#fef9c3', borderRadius: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: T.sm, fontWeight: 800, color: p.stock === 0 ? C.danger : '#92400e' }}>
                      {p.stock}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: T.xs, fontWeight: 500, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.nombre}
                      </div>
                      <div style={{ fontSize: '0.625rem', color: C.textMuted, fontFamily: 'monospace' }}>
                        {p.cod || p.sku || '—'}
                      </div>
                    </div>
                    {p.stock === 0 && (
                      <span style={{ fontSize: '0.625rem', background: '#fef2f2', color: C.danger, borderRadius: '9999px', padding: '0.0625rem 0.375rem', fontWeight: 700, flexShrink: 0 }}>
                        Agotado
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: VENTAS ── */}
      {tabActivo === 'ventas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

          {/* Selector de métrica */}
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            {[
              { val: 'ingresos', label: 'Ingresos (L)' },
              { val: 'cantidad', label: 'N° Ventas'    },
            ].map(m => (
              <button key={m.val} onClick={() => setVerGrafica(m.val)}
                style={{ ...btn.base, background: verGrafica === m.val ? C.primary : C.bgMuted, color: verGrafica === m.val ? '#fff' : C.textSecondary, border: 'none', fontSize: T.xs, padding: '0.375rem 0.875rem' }}>
                {m.label}
              </button>
            ))}
          </div>

          {/* Gráfica de barras */}
          <div style={card}>
            <div style={{ padding: '0.75rem 1rem', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: T.sm, fontWeight: 700, color: C.text }}>
                {verGrafica === 'ingresos' ? 'Ingresos' : 'Ventas'} — últimos {periodo} días
              </span>
              <span style={{ fontSize: T.xs, color: C.textMuted }}>
                {ventasDia.length} día{ventasDia.length !== 1 ? 's' : ''} con actividad
              </span>
            </div>
            <div style={{ padding: '1rem' }}>
              <GraficaBarras
                datos={ventasDia}
                colorBarra={verGrafica === 'ingresos' ? C.primary : C.success}
                altura={140}
              />
            </div>
          </div>

          {/* Tabla de ventas por día */}
          <div style={card}>
            <div style={{ padding: '0.75rem 1rem', borderBottom: `1px solid ${C.borderLight}`, fontSize: T.sm, fontWeight: 700, color: C.text }}>
              Detalle por día
            </div>
            <div style={{ overflowX: 'auto' }}>
              {ventasDia.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: C.textMuted, fontSize: T.sm }}>
                  Sin ventas en este período
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: C.bgMuted }}>
                      {['Fecha', 'Ventas', 'Ingresos'].map(h => (
                        <th key={h} style={{ padding: '0.5rem 1rem', fontSize: T.xs, fontWeight: 700, color: C.textSecondary, textAlign: h === 'Fecha' ? 'left' : 'right', whiteSpace: 'nowrap' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...ventasDia].reverse().map((d, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${C.borderLight}` }}
                        onMouseEnter={e => e.currentTarget.style.background = C.bgMuted}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '0.625rem 1rem', fontSize: T.xs, color: C.text, fontWeight: 500 }}>
                          {new Date(d.fecha + 'T00:00:00').toLocaleDateString('es-HN', { weekday: 'short', day: '2-digit', month: 'short' })}
                        </td>
                        <td style={{ padding: '0.625rem 1rem', fontSize: T.xs, color: C.text, textAlign: 'right' }}>
                          {d.cantidad}
                        </td>
                        <td style={{ padding: '0.625rem 1rem', fontSize: T.xs, fontWeight: 700, color: C.primary, textAlign: 'right' }}>
                          {fmt(d.ingresos)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: C.primaryLight }}>
                      <td style={{ padding: '0.625rem 1rem', fontSize: T.xs, fontWeight: 700, color: C.primary }}>Total</td>
                      <td style={{ padding: '0.625rem 1rem', fontSize: T.xs, fontWeight: 700, color: C.primary, textAlign: 'right' }}>
                        {ventasDia.reduce((s, d) => s + d.cantidad, 0)}
                      </td>
                      <td style={{ padding: '0.625rem 1rem', fontSize: T.xs, fontWeight: 700, color: C.primary, textAlign: 'right' }}>
                        {fmt(ventasDia.reduce((s, d) => s + parseFloat(d.ingresos || 0), 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: PRODUCTOS TOP ── */}
      {tabActivo === 'productos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div style={card}>
            <div style={{ padding: '0.75rem 1rem', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: T.sm, fontWeight: 700, color: C.text }}>
                Top 10 productos — últimos {periodo} días
              </span>
            </div>

            {topProductos.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: C.textMuted, fontSize: T.sm }}>
                Sin ventas en este período
              </div>
            ) : (
              <>
                {/* Gráfica de barras horizontal con barras de progreso */}
                <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {topProductos.map((p, i) => {
                    const maxUnid = topProductos[0]?.unidades_vendidas || 1
                    const pct     = (p.unidades_vendidas / maxUnid) * 100
                    const medalla = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`
                    return (
                      <div key={i}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontSize: T.xs, minWidth: '1.5rem', flexShrink: 0, textAlign: 'center' }}>
                            {medalla}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: T.xs, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {p.nombre}
                            </div>
                            <div style={{ fontSize: '0.625rem', color: C.textMuted, fontFamily: 'monospace' }}>
                              {p.cod || '—'}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: T.xs, fontWeight: 700, color: C.primary }}>{fmt(p.ingresos)}</div>
                            <div style={{ fontSize: '0.625rem', color: C.textMuted }}>{p.unidades_vendidas} uds</div>
                          </div>
                        </div>
                        <div style={{ marginLeft: '2.125rem', background: C.borderLight, borderRadius: '9999px', height: '0.375rem', overflow: 'hidden' }}>
                          <div style={{ background: i === 0 ? '#f59e0b' : i === 1 ? C.textSecondary : i === 2 ? '#92400e' : C.primary, height: '100%', width: `${pct}%`, borderRadius: '9999px', transition: 'width 0.5s' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Tabla detallada */}
                <div style={{ borderTop: `1px solid ${C.borderLight}`, overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: C.bgMuted }}>
                        {['#', 'Producto', 'Código', 'Precio unit.', 'Unidades', 'Ventas', 'Ingresos'].map(h => (
                          <th key={h} style={{ padding: '0.5rem 0.75rem', fontSize: T.xs, fontWeight: 700, color: C.textSecondary, textAlign: h === 'Producto' ? 'left' : 'right', whiteSpace: 'nowrap' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {topProductos.map((p, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${C.borderLight}` }}
                          onMouseEnter={e => e.currentTarget.style.background = C.bgMuted}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '0.5rem 0.75rem', fontSize: T.xs, color: C.textMuted, textAlign: 'right' }}>{i + 1}</td>
                          <td style={{ padding: '0.5rem 0.75rem', fontSize: T.xs, fontWeight: 500, color: C.text, maxWidth: '12rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nombre}</td>
                          <td style={{ padding: '0.5rem 0.75rem', fontSize: T.xs, color: C.textMuted, fontFamily: 'monospace', textAlign: 'right' }}>{p.cod || '—'}</td>
                          <td style={{ padding: '0.5rem 0.75rem', fontSize: T.xs, color: C.text, textAlign: 'right' }}>{fmt(p.precio)}</td>
                          <td style={{ padding: '0.5rem 0.75rem', fontSize: T.xs, fontWeight: 700, color: C.text, textAlign: 'right' }}>{p.unidades_vendidas}</td>
                          <td style={{ padding: '0.5rem 0.75rem', fontSize: T.xs, color: C.text, textAlign: 'right' }}>{p.num_ventas}</td>
                          <td style={{ padding: '0.5rem 0.75rem', fontSize: T.xs, fontWeight: 700, color: C.primary, textAlign: 'right' }}>{fmt(p.ingresos)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: STOCK ── */}
      {tabActivo === 'stock' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

          {/* Resumen de stock */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(10rem, 1fr))', gap: '0.75rem' }}>
            {[
              { label: 'Total productos',  valor: fmtN(resumen?.total_productos),    color: C.primary, icon: Package       },
              { label: 'Agotados',         valor: fmtN(resumen?.productos_agotados), color: C.danger,  icon: AlertTriangle },
              { label: 'Stock bajo (≤5)',  valor: fmtN(resumen?.stock_bajo),         color: '#f59e0b', icon: AlertTriangle },
            ].map((k, i) => (
              <div key={i} style={{ ...card, padding: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <k.icon size={20} color={k.color} style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: T.xs, color: C.textMuted }}>{k.label}</div>
                  <div style={{ fontSize: T.xl, fontWeight: 800, color: k.color }}>{k.valor}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Lista completa de stock crítico */}
          <div style={card}>
            <div style={{ padding: '0.75rem 1rem', borderBottom: `1px solid ${C.borderLight}`, fontSize: T.sm, fontWeight: 700, color: C.text, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={15} color={C.danger} />
              Productos con stock ≤ 5
              {stockBajo.length > 0 && (
                <span style={{ fontSize: T.xs, background: '#fef2f2', color: C.danger, borderRadius: '9999px', padding: '0.0625rem 0.5rem', marginLeft: 'auto' }}>
                  {stockBajo.length} productos
                </span>
              )}
            </div>

            {stockBajo.length === 0 ? (
              <div style={{ padding: '2.5rem', textAlign: 'center' }}>
                <Package size={36} color={C.success} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                <div style={{ fontSize: T.sm, color: C.success, fontWeight: 600 }}>¡Excelente! Todo el stock está bien</div>
                <div style={{ fontSize: T.xs, color: C.textMuted, marginTop: '0.25rem' }}>Ningún producto tiene stock ≤ 5 unidades</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: C.bgMuted }}>
                      {['Producto', 'Código', 'Categoría', 'Precio', 'Stock'].map(h => (
                        <th key={h} style={{ padding: '0.5rem 1rem', fontSize: T.xs, fontWeight: 700, color: C.textSecondary, textAlign: h === 'Producto' ? 'left' : 'right', whiteSpace: 'nowrap' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stockBajo.map((p, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${C.borderLight}`, background: p.stock === 0 ? '#fef2f2' : 'transparent' }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                        <td style={{ padding: '0.625rem 1rem', fontSize: T.xs, fontWeight: 500, color: C.text }}>{p.nombre}</td>
                        <td style={{ padding: '0.625rem 1rem', fontSize: T.xs, color: C.textMuted, fontFamily: 'monospace', textAlign: 'right' }}>{p.cod || p.sku || '—'}</td>
                        <td style={{ padding: '0.625rem 1rem', fontSize: T.xs, color: C.textMuted, textAlign: 'right' }}>{p.categoria || '—'}</td>
                        <td style={{ padding: '0.625rem 1rem', fontSize: T.xs, color: C.text, textAlign: 'right' }}>{fmt(p.precio)}</td>
                        <td style={{ padding: '0.625rem 1rem', textAlign: 'right' }}>
                          <span style={{ fontSize: T.xs, fontWeight: 800, background: p.stock === 0 ? '#fef2f2' : '#fef9c3', color: p.stock === 0 ? C.danger : '#92400e', borderRadius: '0.375rem', padding: '0.1875rem 0.5rem' }}>
                            {p.stock === 0 ? '✗ Agotado' : `${p.stock} uds`}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}