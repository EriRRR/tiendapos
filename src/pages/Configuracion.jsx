import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import {
  Store, DollarSign, Globe, Package,
  Image, Save, CheckCircle, AlertCircle,
  ChevronRight, Info, Hash, Percent, AlertTriangle,
  Clock
} from 'lucide-react'
import { C, T, btn, card, input } from '../styles/responsive'

const TABS = [
  { id: 'negocio',   icon: Store,      label: 'Negocio'   },
  { id: 'ventas',    icon: DollarSign, label: 'Ventas'    },
  { id: 'catalogo',  icon: Globe,      label: 'Catálogo'  },
  { id: 'productos', icon: Package,    label: 'Productos' },
]

export default function Configuracion() {
  const { tenantInfo } = useAuth()
  const navigate = useNavigate()

  const [tab,        setTab]        = useState('negocio')
  const [form,       setForm]       = useState({})
  const [loading,    setLoading]    = useState(true)
  const [guardando,  setGuardando]  = useState(false)
  const [msg,        setMsg]        = useState(null)
  const [logoFile,   setLogoFile]   = useState(null)
  const [logoPreview,setLogoPreview]= useState(null)
  const logoInputRef = useRef(null)

  // Slug para URL amigable
  const [slug, setSlug] = useState('')

  // Catálogo
  const [categorias,   setCategorias]   = useState([])
  const [marcas,       setMarcas]       = useState([])
  const [proveedores,  setProveedores]  = useState([])
  const [modalCat,     setModalCat]     = useState(null)
  const [formCat,      setFormCat]      = useState({ nombre: '', descripcion: '' })
  const [editItem,     setEditItem]     = useState(null)
  const [guardandoCat, setGuardandoCat] = useState(false)

  useEffect(() => {
    if (!tenantInfo?.tenant_id) return
    cargar()
  }, [tenantInfo?.tenant_id])

  const cargar = async () => {
    setLoading(true)
    const tid = tenantInfo.tenant_id
    const [{ data: cfg }, { data: cats }, { data: mrcs }, { data: provs }, { data: tenantData }] = await Promise.all([
      supabase.rpc('get_configuracion', { p_tenant_id: tid }),
      supabase.from('categorias').select('*').eq('tenant_id', tid).order('nombre'),
      supabase.from('marcas').select('*').eq('tenant_id', tid).order('nombre'),
      supabase.from('proveedores').select('*').eq('tenant_id', tid).eq('activo', true).order('nombre'),
      supabase.from('tenants').select('slug').eq('id', tid).single(),
    ])
    if (cfg) {
      setForm(cfg)
      if (cfg.logo_url) setLogoPreview(cfg.logo_url)
    }
    if (cats)  setCategorias(cats)
    if (mrcs)  setMarcas(mrcs)
    if (provs) setProveedores(provs)
    if (tenantData?.slug) setSlug(tenantData.slug)
    setLoading(false)
  }

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  // ── FUNCIÓN GUARDAR CORREGIDA (UPDATE/INSERT directo) ──
  const guardar = async () => {
    setGuardando(true); setMsg(null)
    try {
      let logo_url = form.logo_url || null

      // ── Subir logo ────────────────────────────────────────────────────
      if (logoFile) {
        const ext  = logoFile.name.split('.').pop().toLowerCase()
        const path = `logos/${tenantInfo.tenant_id}/logo.${ext}`

        const { data: upData, error: errUp } = await supabase.storage
          .from('productos-fotos')
          .upload(path, logoFile, { upsert: true, contentType: logoFile.type })

        if (errUp) throw new Error(`Error subiendo logo: ${errUp.message}`)

        const { data: urlData } = supabase.storage
          .from('productos-fotos')
          .getPublicUrl(path)

        logo_url = urlData.publicUrl
      }

      // ── Guardar via UPDATE directo (más confiable que RPC) ────────────
      const datosUpdate = {
        nombre_tienda:          form.nombre_tienda          || null,
        logo_url:               logo_url,
        direccion:              form.direccion              || null,
        ciudad:                 form.ciudad                 || null,
        pais:                   form.pais                   || null,
        telefono:               form.telefono               || null,
        whatsapp:               form.whatsapp               || null,
        email:                  form.email                  || null,
        rtn:                    form.rtn                    || null,
        horario:                form.horario                || null,
        descripcion:            form.descripcion            || null,
        moneda:                 form.moneda                 || 'L',
        moneda_nombre:          form.moneda_nombre          || 'Lempiras',
        impuesto_activo:        form.impuesto_activo        ?? false,
        impuesto_pct:           parseFloat(form.impuesto_pct) || 15,
        margen_tipo:            form.margen_tipo            || null,
        margen_valor:           parseFloat(form.margen_valor) || null,
        cod_prefijo:            form.cod_prefijo            || null,
        catalogo_activo:        form.catalogo_activo        ?? true,
        catalogo_descripcion:   form.catalogo_descripcion   || null,
        catalogo_mostrar_precio: form.catalogo_mostrar_precio ?? true,   // <-- NUEVO
        facebook:               form.facebook               || null,
        instagram:              form.instagram              || null,
        color_primario:         form.color_primario         || '#2563eb',
        limite_credito_default: parseFloat(form.limite_credito_default) || 500,
        credito_activo:         form.credito_activo         ?? true,
        session_timeout_activo: form.session_timeout_activo ?? true,
        session_timeout_minutos: parseInt(form.session_timeout_minutos) || 10,
        updated_at:             new Date().toISOString(),
      }

      // Intentar UPDATE primero
      const { data: updData, error: errUpd } = await supabase
        .from('configuracion')
        .update(datosUpdate)
        .eq('tenant_id', tenantInfo.tenant_id)
        .select()

      if (errUpd) throw new Error(errUpd.message)

      // Si no había fila, hacer INSERT
      if (!updData || updData.length === 0) {
        const { error: errIns } = await supabase
          .from('configuracion')
          .insert([{ ...datosUpdate, tenant_id: tenantInfo.tenant_id }])
        if (errIns) throw new Error(errIns.message)
      }

      // Actualizar preview del logo localmente
      if (logo_url) {
        setLogoPreview(logo_url)
        setLogoFile(null)
      }

      setMsg({ tipo: 'ok', texto: '✓ Configuración guardada correctamente' })
      await cargar()

    } catch (e) {
      console.error('[Configuracion] Error guardando:', e)
      setMsg({ tipo: 'error', texto: e.message })
    }

    setGuardando(false)
    setTimeout(() => setMsg(null), 4000)
  }
  // ── FIN FUNCIÓN GUARDAR CORREGIDA ──

  // CRUD catálogo
  const abrirModal = (tipo, item = null) => {
    setModalCat(tipo)
    setEditItem(item)
    setFormCat(item
      ? { nombre: item.nombre || '', descripcion: item.descripcion || '' }
      : { nombre: '', descripcion: '' })
  }

  const guardarCat = async () => {
    if (!formCat.nombre.trim()) return
    setGuardandoCat(true)
    const tabla = modalCat === 'cat' ? 'categorias' : modalCat === 'marca' ? 'marcas' : 'proveedores'
    try {
      if (editItem) {
        await supabase.from(tabla)
          .update({ ...formCat, updated_at: new Date().toISOString() })
          .eq('id', editItem.id)
      } else {
        await supabase.from(tabla)
          .insert([{ ...formCat, tenant_id: tenantInfo.tenant_id }])
      }
      setModalCat(null)
      await cargar()
    } catch {}
    setGuardandoCat(false)
  }

  const eliminarCat = async (tipo, id) => {
    if (!window.confirm('¿Eliminar este elemento?')) return
    const t = tipo === 'cat' ? 'categorias' : tipo === 'marca' ? 'marcas' : 'proveedores'
    await supabase.from(t).delete().eq('id', id)
    await cargar()
  }

  const lbl = { fontSize: T.xs, color: C.textSecondary, display: 'block', marginBottom: '0.25rem' }

  const ListaCatalogo = ({ items, tipo, etiqueta }) => (
    <div style={card}>
      <div style={{ padding: '0.75rem 1rem', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: T.sm, fontWeight: 700, color: C.text }}>{etiqueta} ({items.length})</span>
        <button onClick={() => abrirModal(tipo)}
          style={{ ...btn.base, ...btn.primary, fontSize: T.xs, padding: '0.3125rem 0.625rem' }}>
          + Agregar
        </button>
      </div>
      {items.length === 0 ? (
        <div style={{ padding: '1.5rem', textAlign: 'center', color: C.textMuted, fontSize: T.xs }}>
          No hay {etiqueta.toLowerCase()} registradas
        </div>
      ) : items.map(item => (
        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.625rem 1rem', borderBottom: `1px solid ${C.borderLight}` }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: T.xs, fontWeight: 600, color: C.text }}>{item.nombre}</div>
            {item.descripcion && <div style={{ fontSize: '0.625rem', color: C.textMuted }}>{item.descripcion}</div>}
          </div>
          <button onClick={() => abrirModal(tipo, item)}
            style={{ ...btn.base, ...btn.ghost, padding: '0.25rem 0.375rem', fontSize: T.xs }}>✏️</button>
          <button onClick={() => eliminarCat(tipo, item.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.danger, display: 'flex', padding: '0.25rem' }}>✕</button>
        </div>
      ))}
    </div>
  )

  if (loading) return (
    <div style={{ padding: '2.5rem', textAlign: 'center', color: C.textMuted }}>Cargando...</div>
  )

  return (
    <div style={{ maxWidth: '48rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 0.875rem', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontSize: T.xs, fontWeight: 600, background: tab === t.id ? C.primary : C.bgMuted, color: tab === t.id ? '#fff' : C.textSecondary, transition: 'all 0.15s' }}>
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {/* Mensaje */}
      {msg && (
        <div style={{ background: msg.tipo === 'ok' ? C.successLight : '#fef2f2', border: `1px solid ${msg.tipo === 'ok' ? '#bbf7d0' : C.dangerBorder}`, borderRadius: '0.5rem', padding: '0.75rem 1rem', fontSize: T.sm, color: msg.tipo === 'ok' ? C.success : C.danger, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {msg.tipo === 'ok' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {msg.texto}
        </div>
      )}

      {/* ── TAB: NEGOCIO ── solo logo y nombre */}
      {tab === 'negocio' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div style={card}>
            <div style={{ padding: '0.875rem 1rem', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Store size={15} color={C.primary} />
              <span style={{ fontSize: T.sm, fontWeight: 700, color: C.text }}>Identidad del negocio</span>
            </div>
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* Logo */}
              <div>
                <label style={{ ...lbl, marginBottom: '0.5rem', fontWeight: 600 }}>Logo del negocio</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div
                    onClick={() => logoInputRef.current?.click()}
                    style={{ width: '5rem', height: '5rem', background: C.bgMuted, border: `2px dashed ${C.border}`, borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', flexShrink: 0, transition: 'border-color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = C.primary}
                    onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <div style={{ textAlign: 'center' }}>
                        <Store size={24} color={C.textMuted} />
                        <div style={{ fontSize: '0.625rem', color: C.textMuted, marginTop: '0.25rem' }}>Logo</div>
                      </div>
                    )}
                  </div>
                  <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => {
                      const f = e.target.files[0]
                      if (!f) return
                      setLogoFile(f)
                      setLogoPreview(URL.createObjectURL(f))
                    }} />
                  <div>
                    <div style={{ fontSize: T.sm, fontWeight: 600, color: C.text, marginBottom: '0.25rem' }}>
                      {logoPreview ? 'Cambiar logo' : 'Subir logo'}
                    </div>
                    <div style={{ fontSize: T.xs, color: C.textMuted, marginBottom: '0.5rem', lineHeight: 1.5 }}>
                      Se mostrará en la barra lateral<br />
                      PNG, JPG · Recomendado: 200×200px
                    </div>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <button onClick={() => logoInputRef.current?.click()}
                        style={{ ...btn.base, ...btn.ghost, fontSize: T.xs }}>
                        <Image size={13} /> Seleccionar
                      </button>
                      {logoPreview && (
                        <button onClick={() => { setLogoPreview(null); setLogoFile(null); set('logo_url', null) }}
                          style={{ ...btn.base, background: 'none', border: 'none', color: C.danger, fontSize: T.xs, cursor: 'pointer' }}>
                          Quitar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Nombre */}
              <div>
                <label style={{ ...lbl, fontWeight: 600 }}>Nombre del negocio *</label>
                <input
                  value={form.nombre_tienda || ''}
                  onChange={e => set('nombre_tienda', e.target.value)}
                  placeholder="Ej: Valentina's Store"
                  style={{ ...input, fontSize: T.base, fontWeight: 600 }}
                />
                <div style={{ fontSize: T.xs, color: C.textMuted, marginTop: '0.375rem' }}>
                  Se mostrará en la barra lateral y en el catálogo público
                </div>
              </div>

              {/* Preview sidebar */}
              <div style={{ background: C.bgMuted, borderRadius: '0.625rem', padding: '0.875rem' }}>
                <div style={{ fontSize: T.xs, color: C.textMuted, marginBottom: '0.625rem', fontWeight: 600 }}>
                  Vista previa en la barra lateral:
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', background: C.bgWhite, borderRadius: '0.5rem', padding: '0.625rem 0.75rem', border: `1px solid ${C.border}` }}>
                  <div style={{ width: '2rem', height: '2rem', background: C.primary, borderRadius: '0.4375rem', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                    {logoPreview
                      ? <img src={logoPreview} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      : <Store size={14} color="#fff" />
                    }
                  </div>
                  <div>
                    <div style={{ fontSize: T.xs, fontWeight: 700, color: C.text }}>
                      {form.nombre_tienda || 'Vendix'}
                    </div>
                    <div style={{ fontSize: '0.625rem', color: C.textMuted }}>
                      Sistema de ventas
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: VENTAS ── */}
      {tab === 'ventas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

          {/* Moneda */}
          <div style={card}>
            <div style={{ padding: '0.875rem 1rem', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <DollarSign size={15} color={C.primary} />
              <span style={{ fontSize: T.sm, fontWeight: 700, color: C.text }}>Moneda</span>
            </div>
            <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={lbl}>Símbolo</label>
                <input value={form.moneda || 'L'} onChange={e => set('moneda', e.target.value)} placeholder="L" style={input} maxLength={5} />
              </div>
              <div>
                <label style={lbl}>Nombre</label>
                <input value={form.moneda_nombre || 'Lempiras'} onChange={e => set('moneda_nombre', e.target.value)} placeholder="Lempiras" style={input} />
              </div>
            </div>
          </div>

          {/* Impuesto */}
          <div style={card}>
            <div style={{ padding: '0.875rem 1rem', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Percent size={15} color={C.primary} />
              <span style={{ fontSize: T.sm, fontWeight: 700, color: C.text }}>Impuesto (ISV)</span>
            </div>
            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.bgMuted, borderRadius: '0.5rem', padding: '0.75rem 1rem' }}>
                <div>
                  <div style={{ fontSize: T.sm, fontWeight: 600, color: C.text }}>Aplicar impuesto en ventas</div>
                  <div style={{ fontSize: T.xs, color: C.textMuted }}>ISV incluido en el precio de venta</div>
                </div>
                <button onClick={() => set('impuesto_activo', !form.impuesto_activo)}
                  style={{ width: '2.75rem', height: '1.5rem', borderRadius: '9999px', border: 'none', cursor: 'pointer', background: form.impuesto_activo ? C.primary : C.border, transition: 'background 0.2s', position: 'relative', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', top: '0.125rem', left: form.impuesto_activo ? '1.25rem' : '0.125rem', width: '1.25rem', height: '1.25rem', background: '#fff', borderRadius: '50%', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </button>
              </div>
              {form.impuesto_activo && (
                <div>
                  <label style={lbl}>Porcentaje (%)</label>
                  <input type="number" value={form.impuesto_pct || 15} onChange={e => set('impuesto_pct', parseFloat(e.target.value))} min={0} max={50} step={0.5} style={{ ...input, maxWidth: '8rem' }} />
                </div>
              )}
            </div>
          </div>

          {/* Margen */}
          <div style={card}>
            <div style={{ padding: '0.875rem 1rem', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <DollarSign size={15} color={C.primary} />
              <span style={{ fontSize: T.sm, fontWeight: 700, color: C.text }}>Margen de ganancia sugerido</span>
            </div>
            <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={lbl}>Tipo</label>
                <select value={form.margen_tipo || 'porcentaje'} onChange={e => set('margen_tipo', e.target.value)} style={{ ...input, cursor: 'pointer' }}>
                  <option value="porcentaje">Porcentaje (%)</option>
                  <option value="fijo">Monto fijo (L)</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Valor</label>
                <input type="number" value={form.margen_valor || ''} onChange={e => set('margen_valor', parseFloat(e.target.value))} min={0} placeholder="Ej: 30" style={input} />
              </div>
            </div>
            <div style={{ padding: '0 1rem 1rem', fontSize: T.xs, color: C.textMuted }}>
              Se usa como sugerencia al crear productos. No afecta precios existentes.
            </div>
          </div>

          {/* Límite de crédito */}
          <div style={card}>
            <div style={{ padding: '0.875rem 1rem', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={15} color={C.primary} />
              <span style={{ fontSize: T.sm, fontWeight: 700, color: C.text }}>Límite de crédito (crédito)</span>
            </div>
            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.bgMuted, borderRadius: '0.5rem', padding: '0.75rem 1rem' }}>
                <div>
                  <div style={{ fontSize: T.sm, fontWeight: 600, color: C.text }}>Permitir ventas a crédito (crédito)</div>
                  <div style={{ fontSize: T.xs, color: C.textMuted }}>Si se desactiva no se podrá dar credito a ningún cliente</div>
                </div>
                <button onClick={() => set('credito_activo', !form.credito_activo)}
                  style={{ width: '2.75rem', height: '1.5rem', borderRadius: '9999px', border: 'none', cursor: 'pointer', background: form.credito_activo !== false ? C.primary : C.border, transition: 'background 0.2s', position: 'relative', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', top: '0.125rem', left: form.credito_activo !== false ? '1.25rem' : '0.125rem', width: '1.25rem', height: '1.25rem', background: '#fff', borderRadius: '50%', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </button>
              </div>
              {form.credito_activo !== false && (
                <div>
                  <label style={lbl}>Límite de crédito por defecto (L)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <input type="number" value={form.limite_credito_default || 500} onChange={e => set('limite_credito_default', parseFloat(e.target.value))} min={0} step={50} style={{ ...input, maxWidth: '10rem' }} />
                    <div style={{ fontSize: T.xs, color: C.textMuted }}>0 = sin límite</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                    {[200, 500, 1000, 2000, 5000].map(n => (
                      <button key={n} onClick={() => set('limite_credito_default', n)}
                        style={{ fontSize: T.xs, padding: '0.25rem 0.625rem', background: form.limite_credito_default === n ? C.primary : C.bgMuted, color: form.limite_credito_default === n ? '#fff' : C.textSecondary, border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}>
                        L {n}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── NUEVA SECCIÓN: TIMEOUT DE SESIÓN ── */}
          <div style={card}>
            <div style={{ padding: '0.875rem 1rem', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={15} color={C.primary} />
              <span style={{ fontSize: T.sm, fontWeight: 700, color: C.text }}>Cierre automático de sesión</span>
            </div>
            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

              {/* Toggle activo */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.bgMuted, borderRadius: '0.5rem', padding: '0.75rem 1rem' }}>
                <div>
                  <div style={{ fontSize: T.sm, fontWeight: 600, color: C.text }}>
                    Cerrar sesión por inactividad
                  </div>
                  <div style={{ fontSize: T.xs, color: C.textMuted }}>
                    Se mostrará un aviso 1 minuto antes de cerrar
                  </div>
                </div>
                <button
                  onClick={() => set('session_timeout_activo', !form.session_timeout_activo)}
                  style={{ width: '2.75rem', height: '1.5rem', borderRadius: '9999px', border: 'none', cursor: 'pointer', background: form.session_timeout_activo !== false ? C.primary : C.border, transition: 'background 0.2s', position: 'relative', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', top: '0.125rem', left: form.session_timeout_activo !== false ? '1.25rem' : '0.125rem', width: '1.25rem', height: '1.25rem', background: '#fff', borderRadius: '50%', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </button>
              </div>

              {/* Minutos */}
              {form.session_timeout_activo !== false && (
                <div>
                  <label style={{ fontSize: T.xs, color: C.textSecondary, display: 'block', marginBottom: '0.375rem' }}>
                    Minutos de inactividad antes de cerrar
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <input
                      type="number"
                      value={form.session_timeout_minutos ?? 10}
                      onChange={e => set('session_timeout_minutos', parseInt(e.target.value))}
                      min={1} max={480} step={1}
                      style={{ ...input, maxWidth: '6rem' }}
                    />
                    <div style={{ fontSize: T.xs, color: C.textMuted }}>
                      minutos (mín. 1, máx. 480)
                    </div>
                  </div>
                  {/* Presets */}
                  <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                    {[5, 10, 15, 30, 60].map(n => (
                      <button key={n}
                        onClick={() => set('session_timeout_minutos', n)}
                        style={{ fontSize: T.xs, padding: '0.25rem 0.625rem', background: (form.session_timeout_minutos ?? 10) === n ? C.primary : C.bgMuted, color: (form.session_timeout_minutos ?? 10) === n ? '#fff' : C.textSecondary, border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}>
                        {n} min
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: T.xs, color: C.textMuted, marginTop: '0.5rem' }}>
                    Se mostrará un aviso 1 minuto antes. El usuario puede elegir continuar o cerrar sesión.
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* ── FIN SECCIÓN TIMEOUT ── */}

        </div>
      )}

      {/* ── TAB: CATÁLOGO ── (con slug editable) */}
      {tab === 'catalogo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div style={card}>
            <div style={{ padding: '0.875rem 1rem', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Globe size={15} color={C.primary} />
              <span style={{ fontSize: T.sm, fontWeight: 700, color: C.text }}>Catálogo público</span>
            </div>
            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

              {/* Toggle activo */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.bgMuted, borderRadius: '0.5rem', padding: '0.875rem 1rem' }}>
                <div>
                  <div style={{ fontSize: T.sm, fontWeight: 600, color: C.text }}>Catálogo público activo</div>
                  <div style={{ fontSize: T.xs, color: C.textMuted }}>Los clientes pueden ver tus productos en línea</div>
                </div>
                <button onClick={() => set('catalogo_activo', !form.catalogo_activo)}
                  style={{ width: '2.75rem', height: '1.5rem', borderRadius: '9999px', border: 'none', cursor: 'pointer', background: form.catalogo_activo ? C.primary : C.border, transition: 'background 0.2s', position: 'relative', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', top: '0.125rem', left: form.catalogo_activo ? '1.25rem' : '0.125rem', width: '1.25rem', height: '1.25rem', background: '#fff', borderRadius: '50%', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </button>
              </div>

              {/* ── NUEVO TOGGLE: Mostrar precios ── */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.bgMuted, borderRadius: '0.5rem', padding: '0.875rem 1rem' }}>
                <div>
                  <div style={{ fontSize: T.sm, fontWeight: 600, color: C.text }}>Mostrar precios en el catálogo</div>
                  <div style={{ fontSize: T.xs, color: C.textMuted }}>Los clientes podrán ver el precio de cada producto</div>
                </div>
                <button
                  onClick={() => set('catalogo_mostrar_precio', !form.catalogo_mostrar_precio)}
                  style={{ width: '2.75rem', height: '1.5rem', borderRadius: '9999px', border: 'none', cursor: 'pointer', background: form.catalogo_mostrar_precio !== false ? C.primary : C.border, transition: 'background 0.2s', position: 'relative', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', top: '0.125rem', left: form.catalogo_mostrar_precio !== false ? '1.25rem' : '0.125rem', width: '1.25rem', height: '1.25rem', background: '#fff', borderRadius: '50%', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </button>
              </div>

              {/* Descripción */}
              <div>
                <label style={lbl}>Descripción del catálogo</label>
                <textarea value={form.catalogo_descripcion || ''} onChange={e => set('catalogo_descripcion', e.target.value)} placeholder="Bienvenido a nuestro catálogo..." rows={2} style={{ ...input, resize: 'vertical' }} />
              </div>

              {/* ── SECCIÓN DE URL CON SLUG ── */}
              <div style={{ background: C.primaryLight, border: `1px solid ${C.primaryBorder}`, borderRadius: '0.5rem', padding: '0.875rem 1rem' }}>
                <div style={{ fontSize: T.xs, color: C.primary, fontWeight: 600, marginBottom: '0.375rem' }}>
                  🔗 URL de tu catálogo público
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: T.xs, color: C.primary }}>
                  {`${window.location.origin}/catalogo/${slug || tenantInfo?.tenant_id}`}
                </div>

                {/* Editar slug */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.625rem' }}>
                  <div style={{ fontSize: T.xs, color: C.textMuted, flexShrink: 0 }}>
                    {window.location.origin}/catalogo/
                  </div>
                  <input
                    value={slug}
                    onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/--+/g, '-'))}
                    placeholder="nombre-de-la-tienda"
                    style={{ ...input, flex: 1, fontFamily: 'monospace', fontSize: T.xs, fontWeight: 700, color: C.primary }}
                  />
                  <button
                    onClick={async () => {
                      if (!slug.trim()) return
                      const { error } = await supabase
                        .from('tenants')
                        .update({ slug: slug.trim() })
                        .eq('id', tenantInfo.tenant_id)
                      if (error) {
                        setMsg({ tipo: 'error', texto: error.message.includes('unique') ? 'Ese nombre ya está en uso, elige otro' : error.message })
                      } else {
                        setMsg({ tipo: 'ok', texto: '✓ URL actualizada' })
                      }
                      setTimeout(() => setMsg(null), 3000)
                    }}
                    style={{ ...btn.base, ...btn.primary, fontSize: T.xs, padding: '0.375rem 0.75rem', flexShrink: 0 }}>
                    Guardar
                  </button>
                </div>

                <button
                  onClick={() => {
                    const url = `${window.location.origin}/catalogo/${slug || tenantInfo?.tenant_id}`
                    navigator.clipboard.writeText(url)
                    setMsg({ tipo: 'ok', texto: '✓ URL copiada' })
                    setTimeout(() => setMsg(null), 2000)
                  }}
                  style={{ fontSize: T.xs, color: C.primary, background: 'none', border: `1px solid ${C.primaryBorder}`, borderRadius: '0.375rem', padding: '0.25rem 0.625rem', cursor: 'pointer', fontWeight: 600 }}>
                  📋 Copiar URL
                </button>

                <div style={{ fontSize: '0.625rem', color: C.textMuted, marginTop: '0.5rem' }}>
                  Solo letras, números y guiones. Ejemplo: <span style={{ fontFamily: 'monospace', color: C.primary }}>valentinas-store</span>
                </div>
              </div>
              {/* ── FIN SECCIÓN URL ── */}

              {/* Color primario */}
              <div>
                <label style={{ ...lbl, fontWeight: 600 }}>Color principal del catálogo</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <input
                    type="color"
                    value={form.color_primario || '#2563eb'}
                    onChange={e => set('color_primario', e.target.value)}
                    style={{ width: '3rem', height: '2.25rem', padding: '0.125rem', border: `1px solid ${C.border}`, borderRadius: '0.375rem', cursor: 'pointer' }}
                  />
                  <input
                    value={form.color_primario || '#2563eb'}
                    onChange={e => set('color_primario', e.target.value)}
                    placeholder="#2563eb"
                    style={{ ...input, maxWidth: '8rem', fontFamily: 'monospace' }}
                  />
                  <div style={{ display: 'flex', gap: '0.375rem' }}>
                    {['#2563eb','#16a34a','#dc2626','#7c3aed','#0891b2','#d97706'].map(color => (
                      <button key={color} onClick={() => set('color_primario', color)}
                        style={{ width: '1.5rem', height: '1.5rem', background: color, border: form.color_primario === color ? '2px solid #111' : '2px solid transparent', borderRadius: '50%', cursor: 'pointer' }} />
                    ))}
                  </div>
                </div>
                {/* Preview del color */}
                <div style={{ marginTop: '0.75rem', background: (form.color_primario || '#2563eb') + '15', border: `1px solid ${form.color_primario || '#2563eb'}33`, borderRadius: '0.5rem', padding: '0.625rem 0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '1rem', height: '1rem', background: form.color_primario || '#2563eb', borderRadius: '50%' }} />
                  <span style={{ fontSize: T.xs, color: form.color_primario || '#2563eb', fontWeight: 600 }}>
                    Vista previa del color seleccionado
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: PRODUCTOS ── (actualizado) */}
      {tab === 'productos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

          {/* Código de productos — solo informativo */}
          <div style={card}>
            <div style={{ padding: '0.875rem 1rem', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Hash size={15} color={C.primary} />
              <span style={{ fontSize: T.sm, fontWeight: 700, color: C.text }}>Código de productos</span>
            </div>
            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              <div style={{ background: C.primaryLight, border: `1px solid ${C.primaryBorder}`, borderRadius: '0.625rem', padding: '0.875rem 1rem' }}>
                <div style={{ fontSize: T.xs, color: C.primary, fontWeight: 700, marginBottom: '0.375rem' }}>
                  ℹ️ Códigos generados automáticamente
                </div>
                <div style={{ fontSize: T.xs, color: C.textSecondary, lineHeight: 1.6 }}>
                  Cada producto recibe un código numérico secuencial al crearse.
                  Los códigos son compatibles con lectores de código de barras estándar.
                </div>
              </div>

              {/* Preview del próximo código */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.bgMuted, borderRadius: '0.5rem', padding: '0.75rem 1rem' }}>
                <div>
                  <div style={{ fontSize: T.xs, color: C.textMuted }}>Próximo código</div>
                  <div style={{ fontFamily: 'monospace', fontSize: T.lg, fontWeight: 800, color: C.primary, marginTop: '0.125rem' }}>
                    {String((form.cod_contador || 0) + 1).padStart(6, '0')}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: T.xs, color: C.textMuted }}>Productos creados</div>
                  <div style={{ fontSize: T.lg, fontWeight: 800, color: C.text, marginTop: '0.125rem' }}>
                    {form.cod_contador || 0}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: T.xs, color: C.textMuted, lineHeight: 1.6 }}>
                Formato: <span style={{ fontFamily: 'monospace', color: C.primary, fontWeight: 700 }}>000001</span>,{' '}
                <span style={{ fontFamily: 'monospace', color: C.primary, fontWeight: 700 }}>000002</span>,{' '}
                <span style={{ fontFamily: 'monospace', color: C.primary, fontWeight: 700 }}>000003</span>...
                — 6 dígitos, compatible con Code 128 y lectores físicos.
              </div>
            </div>
          </div>

          <ListaCatalogo items={categorias}  tipo="cat"   etiqueta="Categorías"  />
          <ListaCatalogo items={marcas}      tipo="marca" etiqueta="Marcas"       />
          <ListaCatalogo items={proveedores} tipo="prov"  etiqueta="Proveedores"  />
        </div>
      )}

      {/* Botón guardar — no en tab productos */}
      {tab !== 'productos' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={guardar} disabled={guardando}
            style={{ ...btn.base, ...btn.primary, padding: '0.6875rem 1.5rem', fontWeight: 700, opacity: guardando ? 0.7 : 1 }}>
            <Save size={15} /> {guardando ? 'Guardando...' : 'Guardar configuración'}
          </button>
        </div>
      )}

      {/* Acceso a información */}
      <div style={card}>
        <button onClick={() => navigate('/informacion')}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
          <div style={{ width: '2.25rem', height: '2.25rem', background: C.primaryLight, borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Info size={16} color={C.primary} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: T.sm, fontWeight: 600, color: C.text }}>Información del producto</div>
            <div style={{ fontSize: T.xs, color: C.textMuted }}>Versión, suscripción, términos, ayuda</div>
          </div>
          <ChevronRight size={16} color={C.textMuted} />
        </button>
      </div>

      {/* Modal categoría/marca/proveedor */}
      {modalCat && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div style={{ background: C.bgWhite, borderRadius: '0.75rem', padding: '1.25rem', width: '100%', maxWidth: '22rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: T.base, fontWeight: 700, color: C.text }}>
                {editItem ? 'Editar' : 'Nuevo'} {modalCat === 'cat' ? 'categoría' : modalCat === 'marca' ? 'marca' : 'proveedor'}
              </h3>
              <button onClick={() => setModalCat(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1rem' }}>
              <div>
                <label style={lbl}>Nombre *</label>
                <input value={formCat.nombre} onChange={e => setFormCat(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre" style={input} autoFocus />
              </div>
              <div>
                <label style={lbl}>Descripción</label>
                <input value={formCat.descripcion} onChange={e => setFormCat(p => ({ ...p, descripcion: e.target.value }))} placeholder="Opcional" style={input} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setModalCat(null)} style={{ ...btn.base, ...btn.ghost }}>Cancelar</button>
              <button onClick={guardarCat} disabled={guardandoCat || !formCat.nombre.trim()}
                style={{ ...btn.base, ...btn.primary, opacity: guardandoCat ? 0.7 : 1 }}>
                {guardandoCat ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}