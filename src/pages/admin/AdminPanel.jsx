import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import {
  Store, Plus, LogOut, RefreshCw, DollarSign,
  Bell, Shield, LayoutDashboard, Users,
  Trash2, Edit2, X, Settings,
  UserX, UserCheck, Clock, Key, Save, Eye, EyeOff,
  UserPlus, ChevronDown, ChevronUp, AlertTriangle
} from 'lucide-react'
import { C, T, btn, input } from '../../styles/responsive'

// Tabs
import TabDashboard from './tabs/TabDashboard'
import TabTiendas from './tabs/TabTiendas'
import TabUsuarios from './tabs/TabUsuarios'
import TabPagos from './tabs/TabPagos'
import TabAcceso from './tabs/TabAcceso'
import TabAjustes from './tabs/TabAjustes'

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tiendas', label: 'Tiendas', icon: Store },
  { id: 'usuarios', label: 'Usuarios', icon: Users },
  { id: 'pagos', label: 'Pagos', icon: DollarSign },
  { id: 'acceso', label: 'Acceso', icon: Shield },
  { id: 'ajustes', label: 'Ajustes', icon: Settings },
]

export default function AdminPanel() {
  const { session, signOut } = useAuth()
  const navigate = useNavigate()

  const [tab, setTab] = useState('dashboard')
  const [tiendas, setTiendas] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [expandida, setExpandida] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  // ── Modales ──────────────────────────────────────────────────────────
  const [modalNueva, setModalNueva] = useState(false)
  const [modalConfig, setModalConfig] = useState(null)
  const [modalEntrar, setModalEntrar] = useState(null)
  const [modalPago, setModalPago] = useState(null)
  const [modalUsuario, setModalUsuario] = useState(null)
  const [modalEditUser, setModalEditUser] = useState(false)

  // ── Pagos ─────────────────────────────────────────────────────────────
  const [historialPagos, setHistorialPagos] = useState([])
  const [loadingPagos, setLoadingPagos] = useState(false)
  const [formPago, setFormPago] = useState({
    monto: '', metodo_pago: 'efectivo', referencia: '', notas: '',
    fecha_pago: new Date().toISOString().split('T')[0],
  })

  // ── Usuarios de tienda ────────────────────────────────────────────────
  const [usuariostienda, setUsuariosTienda] = useState([])
  const [rolestienda, setRolesTienda] = useState([])
  const [loadingUsuarios, setLoadingUsuarios] = useState(false)
  const [usuarioEdit, setUsuarioEdit] = useState(null)
  const [formUser, setFormUser] = useState({ nombre: '', email: '', rol_id: '', password: '', confirmar: '' })
  const [cambiarPass, setCambiarPass] = useState(false)
  const [verPass, setVerPass] = useState(false)
  const [guardandoUser, setGuardandoUser] = useState(false)
  const [errorUser, setErrorUser] = useState('')
  const [auditoriaTienda, setAuditoriaTienda] = useState([])
  const [verAudit, setVerAudit] = useState(false)

  // ── Ajustes ───────────────────────────────────────────────────────────
  const [stats, setStats] = useState(null)
  const [formPerfil, setFormPerfil] = useState({ nombre: '', titulo: '', empresa: '', telefono: '', sitio_web: '', bio: '' })
  const [formPassword, setFormPassword] = useState({ nueva: '', confirmar: '' })
  const [guardandoPerfil, setGuardandoPerfil] = useState(false)
  const [guardandoPassword, setGuardandoPassword] = useState(false)
  const [verPassNueva, setVerPassNueva] = useState(false)
  const [msgPerfil, setMsgPerfil] = useState(null)
  const [msgPassword, setMsgPassword] = useState(null)
  const [seccionAjustes, setSeccionAjustes] = useState('perfil')

  // ── Forms modales ─────────────────────────────────────────────────────
  const [formNueva, setFormNueva] = useState({
    nombre: '', email: '', telefono: '', plan: 'mensual', dias_gracia: 7, max_usuarios: 3, precio_plan: 300
  })
  const [formConfig, setFormConfig] = useState({
    max_usuarios: 3, precio_plan: 300, ciclo_pago: 'mensual',
    fecha_pago: '', dias_gracia: 7, plan: 'mensual', notas_pago: '', estado: 'activo',
  })

  // ── Carga inicial ─────────────────────────────────────────────────────
  const cargarTiendas = async () => {
    setLoading(true)
    const { data } = await supabase.rpc('admin_get_tiendas', { p_admin_user_id: session.user.id })
    if (data) setTiendas(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => {
    if (!session?.user?.id) return
    // Cargar ajustes
    Promise.all([
      supabase.from('admin_perfil').select('*').eq('user_id', session.user.id).single(),
      supabase.rpc('admin_get_stats', { p_admin_user_id: session.user.id }),
    ]).then(([{ data: p }, { data: s }]) => {
      if (p) { setFormPerfil({ nombre: p.nombre || '', titulo: p.titulo || '', empresa: p.empresa || '', telefono: p.telefono || '', sitio_web: p.sitio_web || '', bio: p.bio || '' }) }
      if (s) setStats(s)
    })
  }, [session?.user?.id])

  useEffect(() => { cargarTiendas() }, [])

  // ── Stats derivadas ───────────────────────────────────────────────────
  const total = tiendas.length
  const alDia = tiendas.filter(t => t.estado !== 'deshabilitado' && t.dias_retraso === 0).length
  const conRetraso = tiendas.filter(t => t.dias_retraso > 0 && t.dias_retraso <= t.dias_gracia && t.estado !== 'deshabilitado').length
  const deshabilitadas = tiendas.filter(t => t.estado === 'deshabilitado' || t.dias_retraso > t.dias_gracia).length
  const totalUsuarios = tiendas.reduce((s, t) => s + (t.total_usuarios || 0), 0)

  // ── Acciones de tienda ────────────────────────────────────────────────
  const abrirConfig = (t) => {
    setFormConfig({ max_usuarios: t.max_usuarios || 3, precio_plan: t.precio_plan || 300, ciclo_pago: t.ciclo_pago || 'mensual', fecha_pago: t.fecha_pago || '', dias_gracia: t.dias_gracia || 7, plan: t.plan || 'mensual', notas_pago: t.notas_pago || '', estado: t.estado || 'activo' })
    setModalConfig(t); setError('')
  }

  const guardarConfig = async () => {
    setGuardando(true); setError('')
    try {
      const { error } = await supabase.rpc('admin_actualizar_config_tienda', {
        p_admin_user_id: session.user.id, p_tenant_id: modalConfig.id,
        p_max_usuarios: parseInt(formConfig.max_usuarios), p_precio_plan: parseFloat(formConfig.precio_plan),
        p_ciclo_pago: formConfig.ciclo_pago, p_fecha_pago: formConfig.fecha_pago || null,
        p_dias_gracia: parseInt(formConfig.dias_gracia), p_plan: formConfig.plan,
        p_notas_pago: formConfig.notas_pago || null, p_estado: formConfig.estado,
      })
      if (error) throw new Error(error.message)
      setModalConfig(null); await cargarTiendas()
    } catch (e) { setError(e.message) }
    setGuardando(false)
  }

  const cambiarEstado = async (tenantId, estado, fechaPago = null) => {
    await supabase.rpc('admin_actualizar_config_tienda', { p_admin_user_id: session.user.id, p_tenant_id: tenantId, p_estado: estado, p_fecha_pago: fechaPago })
    await cargarTiendas()
  }

  const entrarComoTienda = (t) => {
    const esUsuario = t.usuarios?.find(u => u.user_id === session.user.id)
    if (esUsuario) navigate('/ventas')
    else setModalEntrar(t)
  }

  const eliminarUsuario = async (userId, tenantId, nombre) => {
    if (!window.confirm(`¿Eliminar permanentemente a ${nombre}?`)) return
    const { error } = await supabase.rpc('admin_eliminar_usuario', { p_admin_user_id: session.user.id, p_target_user_id: userId, p_tenant_id: tenantId })
    if (!error) cargarTiendas()
    else alert(error.message)
  }

  // ── Pagos ─────────────────────────────────────────────────────────────
  const abrirModalPago = async (tienda) => {
    setFormPago({ monto: tienda.precio_plan || '', metodo_pago: 'efectivo', referencia: '', notas: '', fecha_pago: new Date().toISOString().split('T')[0] })
    setModalPago(tienda); setLoadingPagos(true)
    const { data } = await supabase.rpc('admin_get_pagos_tienda', { p_admin_user_id: session.user.id, p_tenant_id: tienda.id })
    setHistorialPagos(Array.isArray(data) ? data : []); setLoadingPagos(false)
  }

  const confirmarPago = async () => {
    if (!formPago.monto || parseFloat(formPago.monto) <= 0) { alert('El monto es obligatorio'); return }
    setGuardando(true)
    try {
      const { error } = await supabase.rpc('admin_registrar_pago', {
        p_admin_user_id: session.user.id, p_tenant_id: modalPago.id,
        p_monto: parseFloat(formPago.monto), p_metodo_pago: formPago.metodo_pago,
        p_referencia: formPago.referencia || null, p_notas: formPago.notas || null, p_fecha_pago: formPago.fecha_pago,
      })
      if (error) throw new Error(error.message)
      const { data } = await supabase.rpc('admin_get_pagos_tienda', { p_admin_user_id: session.user.id, p_tenant_id: modalPago.id })
      setHistorialPagos(Array.isArray(data) ? data : [])
      setFormPago({ monto: modalPago.precio_plan || '', metodo_pago: 'efectivo', referencia: '', notas: '', fecha_pago: new Date().toISOString().split('T')[0] })
      await cargarTiendas()
    } catch (e) { alert(e.message) }
    setGuardando(false)
  }

  // ── Usuarios de tienda ────────────────────────────────────────────────
  const abrirGestionUsuarios = async (tienda) => {
    setModalUsuario(tienda); setLoadingUsuarios(true); setVerAudit(false)
    const [{ data: us }, { data: rs }, { data: au }] = await Promise.all([
      supabase.rpc('admin_get_usuarios_tienda', { p_admin_user_id: session.user.id, p_tenant_id: tienda.id }),
      supabase.from('tenant_roles').select('*').eq('tenant_id', tienda.id).order('nombre'),
      supabase.rpc('get_auditoria_usuarios', { p_tenant_id: tienda.id }),
    ])
    setUsuariosTienda(Array.isArray(us) ? us : []); setRolesTienda(rs || []); setAuditoriaTienda(Array.isArray(au) ? au : [])
    setLoadingUsuarios(false)
  }

  const abrirCrearUsuarioAdmin = () => {
    setUsuarioEdit(null); setFormUser({ nombre: '', email: '', password: '', confirmar: '', rol_id: rolestienda[0]?.id || '' })
    setCambiarPass(false); setVerPass(false); setErrorUser(''); setModalEditUser('crear')
  }

  const abrirEditarUsuario = (u) => {
    setUsuarioEdit(u); setFormUser({ nombre: u.nombre || '', email: u.email, rol_id: u.rol_id || '', password: '', confirmar: '' })
    setCambiarPass(false); setVerPass(false); setErrorUser(''); setModalEditUser(true)
  }

  const guardarUsuario = async () => {
    if (!formUser.nombre) { setErrorUser('El nombre es obligatorio'); return }
    if (modalEditUser === 'crear') {
      if (!formUser.email) { setErrorUser('El email es obligatorio'); return }
      if (!formUser.password) { setErrorUser('La contraseña es obligatoria'); return }
      if (formUser.password.length < 6) { setErrorUser('Mínimo 6 caracteres'); return }
    } else {
      if (!formUser.rol_id) { setErrorUser('Selecciona un rol'); return }
      if (cambiarPass && formUser.password.length < 6) { setErrorUser('Mínimo 6 caracteres'); return }
      if (cambiarPass && formUser.password !== formUser.confirmar) { setErrorUser('Las contraseñas no coinciden'); return }
    }
    setGuardandoUser(true); setErrorUser('')
    try {
      if (modalEditUser === 'crear') {
        const { error } = await supabase.rpc('crear_usuario_tienda', { p_creador_user_id: session.user.id, p_tenant_id: modalUsuario.id, p_email: formUser.email, p_password: formUser.password, p_nombre: formUser.nombre, p_rol_id: formUser.rol_id || rolestienda[0]?.id })
        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase.rpc('editar_usuario_tienda', { p_editor_user_id: session.user.id, p_tenant_id: modalUsuario.id, p_target_user_id: usuarioEdit.user_id, p_nombre: formUser.nombre, p_rol_id: formUser.rol_id, p_activo: null })
        if (error) throw new Error(error.message)
        if (cambiarPass && formUser.password) {
          const { error: ep } = await supabase.rpc('admin_cambiar_password', { p_admin_user_id: session.user.id, p_target_user_id: usuarioEdit.user_id, p_new_password: formUser.password })
          if (ep) throw new Error(ep.message)
        }
      }
      setModalEditUser(false); await abrirGestionUsuarios(modalUsuario); await cargarTiendas()
    } catch (e) { setErrorUser(e.message) }
    setGuardandoUser(false)
  }

  const toggleEstadoUsuario = async (u, activo) => {
    if (!window.confirm(`¿${activo ? 'Habilitar' : 'Deshabilitar'} a ${u.nombre || u.email}?`)) return
    await supabase.rpc('editar_usuario_tienda', { p_editor_user_id: session.user.id, p_tenant_id: modalUsuario.id, p_target_user_id: u.user_id, p_nombre: null, p_rol_id: null, p_activo: activo })
    await abrirGestionUsuarios(modalUsuario)
  }

  const eliminarUsuarioAdmin = async (u) => {
    if (!window.confirm(`¿ELIMINAR PERMANENTEMENTE a ${u.email}?`)) return
    const { error } = await supabase.rpc('admin_eliminar_usuario', { p_admin_user_id: session.user.id, p_target_user_id: u.user_id, p_tenant_id: modalUsuario.id })
    if (!error) { await abrirGestionUsuarios(modalUsuario); await cargarTiendas() }
    else alert(error.message)
  }

  const accionColor = (accion) => ({ crear: '#34d399', editar: '#60a5fa', deshabilitar: '#fbbf24', habilitar: '#34d399', eliminar: '#f87171' }[accion] || '#94a3b8')

  // ── Ajustes ───────────────────────────────────────────────────────────
  const guardarPerfil = async () => {
    setGuardandoPerfil(true); setMsgPerfil(null)
    const { error } = await supabase.from('admin_perfil').upsert({ user_id: session.user.id, ...formPerfil, updated_at: new Date().toISOString() })
    setMsgPerfil(error ? { tipo: 'error', texto: error.message } : { tipo: 'ok', texto: '✓ Perfil actualizado' })
    setGuardandoPerfil(false); setTimeout(() => setMsgPerfil(null), 3000)
  }

  const guardarPassword = async () => {
    if (!formPassword.nueva) { setMsgPassword({ tipo: 'error', texto: 'Ingresa la nueva contraseña' }); return }
    if (formPassword.nueva.length < 8) { setMsgPassword({ tipo: 'error', texto: 'Mínimo 8 caracteres' }); return }
    if (formPassword.nueva !== formPassword.confirmar) { setMsgPassword({ tipo: 'error', texto: 'Las contraseñas no coinciden' }); return }
    setGuardandoPassword(true); setMsgPassword(null)
    const { error } = await supabase.rpc('admin_cambiar_mi_password', { p_user_id: session.user.id, p_new_password: formPassword.nueva })
    setMsgPassword(error ? { tipo: 'error', texto: error.message } : { tipo: 'ok', texto: '✓ Contraseña actualizada' })
    if (!error) setFormPassword({ nueva: '', confirmar: '' })
    setGuardandoPassword(false); setTimeout(() => setMsgPassword(null), 3000)
  }

  // ── Crear tienda ──────────────────────────────────────────────────────
  const handleCrearTienda = async (e) => {
    e.preventDefault()
    if (!formNueva.nombre || !formNueva.email) { setError('Nombre y email son obligatorios'); return }
    setGuardando(true); setError('')
    try {
      const { error } = await supabase.rpc('admin_crear_tienda', { p_admin_user_id: session.user.id, p_nombre_tienda: formNueva.nombre, p_email_tienda: formNueva.email, p_password_temp: 'TiendaPos2024!', p_telefono: formNueva.telefono || null, p_plan: formNueva.plan, p_dias_gracia: parseInt(formNueva.dias_gracia) })
      if (error) throw new Error(error.message)
      const { data: t2 } = await supabase.from('tenants').select('id').eq('nombre', formNueva.nombre).single()
      if (t2) await supabase.rpc('admin_actualizar_config_tienda', { p_admin_user_id: session.user.id, p_tenant_id: t2.id, p_max_usuarios: parseInt(formNueva.max_usuarios), p_precio_plan: parseFloat(formNueva.precio_plan) })
      setModalNueva(false)
      setFormNueva({ nombre: '', email: '', telefono: '', plan: 'mensual', dias_gracia: 7, max_usuarios: 3, precio_plan: 300 })
      await cargarTiendas()
      alert(`✅ Tienda creada.\n\nVe a Supabase → Authentication → Users → Add user\nEmail: ${formNueva.email}`)
    } catch (e) { setError(e.message) }
    setGuardando(false)
  }

  const darkInput = { ...input, background: '#0f172a', color: '#f1f5f9', border: '1px solid #475569' }
  const lbl = { fontSize: T.xs, color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }

  // Props comunes para los tabs de tiendas
  const propsTienda = {
    expandida, setExpandida,
    onEntrar: entrarComoTienda,
    onConfig: abrirConfig,
    onPago: abrirModalPago,
    onCambiarEstado: cambiarEstado,
    onEliminarUsuario: eliminarUsuario,
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f1f5f9' }}>

      {/* Header */}
      <header style={{ background: '#1e293b', borderBottom: '1px solid #334155', padding: '0.875rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '2.25rem', height: '2.25rem', background: C.primary, borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Store size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: T.base, fontWeight: 700 }}>TiendaPos Admin</div>
            <div style={{ fontSize: T.xs, color: '#94a3b8' }}>Panel de desarrollador</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {(conRetraso > 0 || deshabilitadas > 0) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', background: '#422006', border: '1px solid #92400e', borderRadius: '0.5rem', padding: '0.3125rem 0.625rem' }}>
              <Bell size={13} color="#fbbf24" />
              <span style={{ fontSize: T.xs, color: '#fbbf24', fontWeight: 600 }}>
                {conRetraso > 0 && `${conRetraso} con retraso`}
                {conRetraso > 0 && deshabilitadas > 0 && ' · '}
                {deshabilitadas > 0 && `${deshabilitadas} deshabilitadas`}
              </span>
            </div>
          )}
          <button onClick={cargarTiendas} style={{ ...btn.base, background: '#334155', color: '#94a3b8', border: 'none' }}>
            <RefreshCw size={14} />
          </button>
          <button onClick={signOut} style={{ ...btn.base, background: '#334155', color: '#f87171', border: 'none', fontSize: T.xs }}>
            <LogOut size={14} /> Salir
          </button>
        </div>
      </header>

      {/* Tabs nav */}
      <div style={{ background: '#1e293b', borderBottom: '1px solid #334155', padding: '0 1.5rem', display: 'flex', gap: '0.25rem', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.75rem 1rem', border: 'none', background: 'none', cursor: 'pointer', fontSize: T.sm, fontWeight: 600, color: tab === t.id ? '#60a5fa' : '#64748b', borderBottom: `2px solid ${tab === t.id ? '#60a5fa' : 'transparent'}`, whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
            <t.icon size={15} /> {t.label}
            {t.id === 'pagos' && conRetraso > 0 && <span style={{ background: '#92400e', color: '#fbbf24', borderRadius: '9999px', padding: '0.0625rem 0.375rem', fontSize: '0.625rem', fontWeight: 700 }}>{conRetraso}</span>}
            {t.id === 'acceso' && deshabilitadas > 0 && <span style={{ background: '#7f1d1d', color: '#fca5a5', borderRadius: '9999px', padding: '0.0625rem 0.375rem', fontSize: '0.625rem', fontWeight: 700 }}>{deshabilitadas}</span>}
            {t.id === 'usuarios' && <span style={{ background: '#334155', color: '#94a3b8', borderRadius: '9999px', padding: '0.0625rem 0.375rem', fontSize: '0.625rem', fontWeight: 700 }}>{totalUsuarios}</span>}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <main style={{ padding: '1.25rem', maxWidth: '72rem', margin: '0 auto' }}>
        {tab === 'dashboard' && <TabDashboard tiendas={tiendas} loading={loading} alDia={alDia} conRetraso={conRetraso} deshabilitadas={deshabilitadas} totalUsuarios={totalUsuarios} {...propsTienda} />}
        {tab === 'tiendas' && <TabTiendas tiendas={tiendas} loading={loading} busqueda={busqueda} setBusqueda={setBusqueda} onNueva={() => setModalNueva(true)} {...propsTienda} />}
        {tab === 'usuarios' && <TabUsuarios tiendas={tiendas} totalUsuarios={totalUsuarios} onGestionar={abrirGestionUsuarios} />}
        {tab === 'pagos' && <TabPagos tiendas={tiendas} conRetraso={conRetraso} alDia={alDia} onPago={abrirModalPago} onConfig={abrirConfig} />}
        {tab === 'acceso' && <TabAcceso tiendas={tiendas} onEntrar={entrarComoTienda} onCambiarEstado={cambiarEstado} />}
        {tab === 'ajustes' && (
          <TabAjustes
            session={session} stats={stats}
            formPerfil={formPerfil} setFormPerfil={setFormPerfil} guardarPerfil={guardarPerfil} guardandoPerfil={guardandoPerfil} msgPerfil={msgPerfil}
            formPassword={formPassword} setFormPassword={setFormPassword} guardarPassword={guardarPassword} guardandoPassword={guardandoPassword} msgPassword={msgPassword}
            verPassNueva={verPassNueva} setVerPassNueva={setVerPassNueva}
            seccionAjustes={seccionAjustes} setSeccionAjustes={setSeccionAjustes}
          />
        )}
      </main>

      {/* ══ MODALES (sin cambios de lógica) ══ */}

      {/* Modal nueva tienda */}
      {modalNueva && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div style={{ background: '#1e293b', borderRadius: '0.75rem', padding: '1.5rem', width: '100%', maxWidth: '30rem', border: '1px solid #334155', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: T.lg, fontWeight: 700, color: '#f1f5f9' }}>Nueva tienda</h3>
              <button onClick={() => { setModalNueva(false); setError('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}><X size={18} /></button>
            </div>
            {error && <div style={{ background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: '0.5rem', padding: '0.75rem', fontSize: T.sm, color: '#fca5a5', marginBottom: '1rem' }}>{error}</div>}
            <form onSubmit={handleCrearTienda}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                {[
                  { k: 'nombre', l: 'Nombre de la tienda *', ph: 'Ej: Tienda Los Ángeles', full: true },
                  { k: 'email', l: 'Email del dueño *', ph: 'dueno@email.com', full: true },
                  { k: 'telefono', l: 'Teléfono', ph: '+504 0000-0000', full: false },
                  { k: 'plan', l: 'Plan', ph: '', full: false, select: ['mensual', 'trimestral', 'anual'] },
                  { k: 'precio_plan', l: 'Precio (L)', ph: '300', full: false, type: 'number' },
                  { k: 'max_usuarios', l: 'Máx usuarios', ph: '3', full: false, type: 'number' },
                  { k: 'dias_gracia', l: 'Días de gracia', ph: '7', full: false, type: 'number' },
                ].map(f => (
                  <div key={f.k} style={{ gridColumn: f.full ? 'span 2' : 'span 1' }}>
                    <label style={lbl}>{f.l}</label>
                    {f.select ? (
                      <select value={formNueva[f.k]} onChange={e => setFormNueva(p => ({ ...p, [f.k]: e.target.value }))} style={{ ...darkInput, cursor: 'pointer' }}>
                        {f.select.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input type={f.type || 'text'} value={formNueva[f.k]} onChange={e => setFormNueva(p => ({ ...p, [f.k]: e.target.value }))} placeholder={f.ph} style={darkInput} />
                    )}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setModalNueva(false); setError('') }} style={{ ...btn.base, background: '#334155', color: '#94a3b8', border: 'none' }}>Cancelar</button>
                <button type="submit" disabled={guardando} style={{ ...btn.base, ...btn.primary, opacity: guardando ? 0.7 : 1 }}>
                  {guardando ? 'Creando...' : 'Crear tienda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal config tienda */}
      {modalConfig && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div style={{ background: '#1e293b', borderRadius: '0.75rem', padding: '1.5rem', width: '100%', maxWidth: '28rem', border: '1px solid #334155', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: T.base, fontWeight: 700, color: '#f1f5f9' }}>Configurar — {modalConfig.nombre}</h3>
              <button onClick={() => { setModalConfig(null); setError('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}><X size={18} /></button>
            </div>
            {error && <div style={{ background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: '0.5rem', padding: '0.75rem', fontSize: T.sm, color: '#fca5a5', marginBottom: '1rem' }}>{error}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              {[
                { k: 'estado', l: 'Estado', select: ['activo', 'advertencia', 'deshabilitado'], full: true },
                { k: 'plan', l: 'Plan', select: ['mensual', 'trimestral', 'anual'] },
                { k: 'precio_plan', l: 'Precio (L)', type: 'number' },
                { k: 'max_usuarios', l: 'Máx. usuarios', type: 'number' },
                { k: 'dias_gracia', l: 'Días de gracia', type: 'number' },
                { k: 'fecha_pago', l: 'Fecha último pago', type: 'date' },
                { k: 'ciclo_pago', l: 'Ciclo', select: ['mensual', 'trimestral', 'anual'] },
                { k: 'notas_pago', l: 'Notas de pago', full: true },
              ].map(f => (
                <div key={f.k} style={{ gridColumn: f.full ? 'span 2' : 'span 1' }}>
                  <label style={lbl}>{f.l}</label>
                  {f.select ? (
                    <select value={formConfig[f.k]} onChange={e => setFormConfig(p => ({ ...p, [f.k]: e.target.value }))} style={{ ...darkInput, cursor: 'pointer' }}>
                      {f.select.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input type={f.type || 'text'} value={formConfig[f.k]} onChange={e => setFormConfig(p => ({ ...p, [f.k]: e.target.value }))} style={darkInput} />
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end' }}>
              <button onClick={() => { setModalConfig(null); setError('') }} style={{ ...btn.base, background: '#334155', color: '#94a3b8', border: 'none' }}>Cancelar</button>
              <button onClick={guardarConfig} disabled={guardando} style={{ ...btn.base, ...btn.primary, opacity: guardando ? 0.7 : 1 }}>
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal entrar como tienda */}
      {modalEntrar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div style={{ background: '#1e293b', borderRadius: '0.75rem', padding: '1.5rem', width: '100%', maxWidth: '26rem', border: '1px solid #334155' }}>
            <h3 style={{ fontSize: T.base, fontWeight: 700, color: '#f1f5f9', marginBottom: '0.5rem' }}>Entrar como tienda</h3>
            <p style={{ fontSize: T.xs, color: '#94a3b8', marginBottom: '1.25rem' }}>
              Para entrar a <strong style={{ color: '#f1f5f9' }}>{modalEntrar.nombre}</strong>, inicia sesión con las credenciales del dueño.
            </p>
            <div style={{ background: '#0f172a', borderRadius: '0.5rem', padding: '0.875rem', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: T.xs, color: '#64748b', marginBottom: '0.25rem' }}>Email del dueño:</div>
              <div style={{ fontSize: T.sm, fontWeight: 600, color: '#60a5fa' }}>{modalEntrar.email_contacto || 'No configurado'}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setModalEntrar(null)} style={{ ...btn.base, background: '#334155', color: '#94a3b8', border: 'none' }}>Cancelar</button>
              <button onClick={() => { setModalEntrar(null); signOut() }} style={{ ...btn.base, ...btn.primary }}>
                Cerrar sesión e ingresar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pago */}
      {modalPago && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div style={{ background: '#1e293b', borderRadius: '0.75rem', padding: '1.5rem', width: '100%', maxWidth: '32rem', border: '1px solid #334155', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: T.base, fontWeight: 700, color: '#f1f5f9' }}>Registrar pago — {modalPago.nombre}</h3>
              <button onClick={() => setModalPago(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              {[
                { k: 'monto', l: 'Monto (L) *', type: 'number', ph: '300' },
                { k: 'fecha_pago', l: 'Fecha de pago', type: 'date' },
                { k: 'metodo_pago', l: 'Método', select: ['efectivo', 'transferencia', 'tarjeta', 'otro'] },
                { k: 'referencia', l: 'Referencia', ph: 'Número de comprobante' },
                { k: 'notas', l: 'Notas', ph: 'Observaciones...', full: true },
              ].map(f => (
                <div key={f.k} style={{ gridColumn: f.full ? 'span 2' : 'span 1' }}>
                  <label style={lbl}>{f.l}</label>
                  {f.select ? (
                    <select value={formPago[f.k]} onChange={e => setFormPago(p => ({ ...p, [f.k]: e.target.value }))} style={{ ...darkInput, cursor: 'pointer' }}>
                      {f.select.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input type={f.type || 'text'} value={formPago[f.k]} onChange={e => setFormPago(p => ({ ...p, [f.k]: e.target.value }))} placeholder={f.ph || ''} style={darkInput} />
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
              <button onClick={() => setModalPago(null)} style={{ ...btn.base, background: '#334155', color: '#94a3b8', border: 'none' }}>Cancelar</button>
              <button onClick={confirmarPago} disabled={guardando} style={{ ...btn.base, background: '#052e16', color: '#34d399', border: '1px solid #065f46', opacity: guardando ? 0.7 : 1 }}>
                <DollarSign size={14} /> {guardando ? 'Registrando...' : 'Confirmar pago'}
              </button>
            </div>

            {/* Historial de pagos */}
            <div style={{ borderTop: '1px solid #334155', paddingTop: '1rem' }}>
              <div style={{ fontSize: T.xs, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.625rem' }}>
                Historial de pagos
              </div>
              {loadingPagos ? (
                <div style={{ textAlign: 'center', color: '#64748b', padding: '1rem' }}>Cargando...</div>
              ) : historialPagos.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#64748b', fontSize: T.xs, padding: '1rem' }}>Sin pagos registrados</div>
              ) : historialPagos.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #1e293b' }}>
                  <div>
                    <div style={{ fontSize: T.xs, color: '#f1f5f9', fontWeight: 500 }}>L {parseFloat(p.monto).toFixed(2)}</div>
                    <div style={{ fontSize: '0.625rem', color: '#64748b' }}>
                      {new Date(p.created_at).toLocaleDateString('es-HN')} · {p.metodo_pago}
                      {p.referencia && ` · Ref: ${p.referencia}`}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.625rem', color: '#34d399', background: '#052e16', borderRadius: '9999px', padding: '0.125rem 0.5rem' }}>
                    ✓ Pagado
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal gestión usuarios */}
      {modalUsuario && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div style={{ background: '#1e293b', borderRadius: '0.75rem', width: '100%', maxWidth: '36rem', border: '1px solid #334155', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: T.base, fontWeight: 700, color: '#f1f5f9' }}>Usuarios — {modalUsuario.nombre}</div>
                <div style={{ fontSize: T.xs, color: '#64748b' }}>{usuariostienda.length} usuarios · límite {modalUsuario.max_usuarios || 3}</div>
              </div>
              <button onClick={() => { setModalUsuario(null); setVerAudit(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}><X size={18} /></button>
            </div>

            {/* Subheader con botón agregar */}
            <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: '#0f172a' }}>
              <div style={{ fontSize: T.xs, color: '#64748b' }}>{usuariostienda.length} de {modalUsuario.max_usuarios || 3}</div>
              <button onClick={abrirCrearUsuarioAdmin}
                disabled={usuariostienda.length >= (modalUsuario.max_usuarios || 3)}
                style={{ ...btn.base, background: '#052e16', color: '#34d399', border: '1px solid #065f46', fontSize: T.xs, padding: '0.375rem 0.75rem', opacity: usuariostienda.length >= (modalUsuario.max_usuarios || 3) ? 0.5 : 1 }}>
                <UserPlus size={13} /> Nuevo usuario
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {loadingUsuarios ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Cargando...</div>
              ) : (
                <>
                  {usuariostienda.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: T.sm }}>Sin usuarios</div>
                  ) : usuariostienda.map(u => (
                    <div key={u.user_id} style={{ background: '#0f172a', borderRadius: '0.625rem', padding: '0.875rem 1rem', opacity: u.activo ? 1 : 0.6 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <div style={{ width: '2.5rem', height: '2.5rem', background: u.activo ? '#1e3a5f' : '#1e293b', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: T.base, fontWeight: 700, color: u.activo ? '#60a5fa' : '#475569' }}>
                          {(u.nombre || u.email).charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: T.sm, fontWeight: 700, color: '#f1f5f9' }}>{u.nombre || '—'}</span>
                            {!u.activo && <span style={{ fontSize: T.xs, background: '#450a0a', color: '#f87171', borderRadius: '9999px', padding: '0.0625rem 0.5rem' }}>Deshabilitado</span>}
                          </div>
                          <div style={{ fontSize: T.xs, color: '#94a3b8' }}>{u.email}</div>
                          <div style={{ fontSize: T.xs, color: '#64748b' }}>Rol: {u.rol || '—'}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <button onClick={() => abrirEditarUsuario(u)} style={{ ...btn.base, background: '#1e3a5f', color: '#60a5fa', border: '1px solid #1e40af', padding: '0.375rem 0.5rem', fontSize: T.xs }}><Edit2 size={13} /></button>
                          {u.activo
                            ? <button onClick={() => toggleEstadoUsuario(u, false)} style={{ ...btn.base, background: '#422006', color: '#fbbf24', border: '1px solid #92400e', padding: '0.375rem 0.5rem', fontSize: T.xs }}><UserX size={13} /></button>
                            : <button onClick={() => toggleEstadoUsuario(u, true)} style={{ ...btn.base, background: '#052e16', color: '#34d399', border: '1px solid #065f46', padding: '0.375rem 0.5rem', fontSize: T.xs }}><UserCheck size={13} /></button>
                          }
                          <button onClick={() => eliminarUsuarioAdmin(u)} style={{ ...btn.base, background: '#450a0a', color: '#f87171', border: '1px solid #7f1d1d', padding: '0.375rem 0.5rem', fontSize: T.xs }}><Trash2 size={13} /></button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Historial auditoría */}
                  <div style={{ background: '#0f172a', borderRadius: '0.625rem', overflow: 'hidden' }}>
                    <button onClick={() => setVerAudit(v => !v)}
                      style={{ width: '100%', padding: '0.75rem 1rem', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Clock size={14} color="#60a5fa" />
                        <span style={{ fontSize: T.sm, fontWeight: 600, color: '#f1f5f9' }}>Historial</span>
                        <span style={{ fontSize: T.xs, background: '#1e293b', color: '#64748b', borderRadius: '9999px', padding: '0.0625rem 0.5rem' }}>{auditoriaTienda.length}</span>
                      </div>
                      {verAudit ? <ChevronUp size={14} color="#64748b" /> : <ChevronDown size={14} color="#64748b" />}
                    </button>
                    {verAudit && (
                      <div style={{ borderTop: '1px solid #1e293b' }}>
                        {auditoriaTienda.length === 0 ? (
                          <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b', fontSize: T.xs }}>Sin cambios</div>
                        ) : auditoriaTienda.map(a => (
                          <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', padding: '0.625rem 1rem', borderBottom: '1px solid #1e293b' }}>
                            <div style={{ width: '0.5rem', height: '0.5rem', background: accionColor(a.accion), borderRadius: '50%', marginTop: '0.3125rem', flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: T.xs, color: '#f1f5f9' }}>
                                {a.campo === 'nombre' && a.valor_antes && <span>Nombre: <strong>{a.valor_antes}</strong> → <strong>{a.valor_despues}</strong></span>}
                                {a.campo === 'rol' && <span>Rol: <strong>{a.valor_antes || '—'}</strong> → <strong>{a.valor_despues}</strong></span>}
                                {a.campo === 'activo' && <span>{a.accion === 'deshabilitar' ? 'Deshabilitado' : 'Habilitado'}</span>}
                                {a.campo === 'usuario' && a.accion === 'crear' && <span>Creado: <strong>{a.valor_despues}</strong></span>}
                                {a.campo === 'usuario' && a.accion === 'eliminar' && <span>Eliminado: <strong>{a.valor_antes}</strong></span>}
                                {a.campo === 'password' && <span>Contraseña actualizada</span>}
                              </div>
                              <div style={{ fontSize: '0.625rem', color: '#475569' }}>
                                {a.hecho_por_email} · {new Date(a.created_at).toLocaleString('es-HN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal editar/crear usuario */}
      {modalEditUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }}>
          <div style={{ background: '#1e293b', borderRadius: '0.75rem', padding: '1.5rem', width: '100%', maxWidth: '28rem', border: '1px solid #334155', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontSize: T.base, fontWeight: 700, color: '#f1f5f9' }}>{modalEditUser === 'crear' ? 'Nuevo usuario' : 'Editar usuario'}</div>
                <div style={{ fontSize: T.xs, color: '#64748b' }}>{modalEditUser === 'crear' ? modalUsuario?.nombre : usuarioEdit?.email}</div>
              </div>
              <button onClick={() => setModalEditUser(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}><X size={18} /></button>
            </div>

            {errorUser && (
              <div style={{ background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: '0.5rem', padding: '0.75rem', fontSize: T.sm, color: '#fca5a5', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={14} /> {errorUser}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div>
                <label style={lbl}>Nombre completo</label>
                <input value={formUser.nombre} onChange={e => setFormUser(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre" style={darkInput} />
              </div>

              {modalEditUser === 'crear' ? (
                <div>
                  <label style={lbl}>Email *</label>
                  <input type="email" value={formUser.email} onChange={e => setFormUser(p => ({ ...p, email: e.target.value }))} placeholder="usuario@email.com" style={darkInput} />
                </div>
              ) : (
                <div>
                  <label style={lbl}>Email (no editable)</label>
                  <div style={{ ...darkInput, color: '#475569', cursor: 'default' }}>{usuarioEdit?.email}</div>
                </div>
              )}

              <div>
                <label style={lbl}>Rol</label>
                <select value={formUser.rol_id} onChange={e => setFormUser(p => ({ ...p, rol_id: e.target.value }))} style={{ ...darkInput, cursor: 'pointer' }}>
                  <option value="">Sin rol</option>
                  {rolestienda.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                </select>
              </div>

              {modalEditUser === 'crear' ? (
                <div>
                  <label style={lbl}>Contraseña *</label>
                  <div style={{ position: 'relative' }}>
                    <input type={verPass ? 'text' : 'password'} value={formUser.password} onChange={e => setFormUser(p => ({ ...p, password: e.target.value }))} placeholder="Mínimo 6 caracteres" style={{ ...darkInput, paddingRight: '2.5rem' }} />
                    <button type="button" onClick={() => setVerPass(v => !v)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}>
                      {verPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <label style={{ ...lbl, marginBottom: 0 }}>Contraseña</label>
                    <button type="button" onClick={() => { setCambiarPass(v => !v); setFormUser(p => ({ ...p, password: '', confirmar: '' })) }}
                      style={{ ...btn.base, background: cambiarPass ? '#450a0a' : '#1e3a5f', color: cambiarPass ? '#f87171' : '#60a5fa', border: 'none', fontSize: T.xs, padding: '0.25rem 0.625rem' }}>
                      <Key size={12} /> {cambiarPass ? 'Cancelar' : 'Cambiar contraseña'}
                    </button>
                  </div>
                  {cambiarPass ? (
                    <div style={{ background: '#0f172a', borderRadius: '0.5rem', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                      {['password', 'confirmar'].map(k => (
                        <div key={k}>
                          <label style={lbl}>{k === 'password' ? 'Nueva contraseña' : 'Confirmar'}</label>
                          <div style={{ position: 'relative' }}>
                            <input type={verPass ? 'text' : 'password'} value={formUser[k]} onChange={e => setFormUser(p => ({ ...p, [k]: e.target.value }))} placeholder="Mínimo 6 caracteres" style={{ ...darkInput, paddingRight: '2.5rem' }} />
                            {k === 'password' && (
                              <button type="button" onClick={() => setVerPass(v => !v)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}>
                                {verPass ? <EyeOff size={15} /> : <Eye size={15} />}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ ...darkInput, color: '#475569', cursor: 'default' }}>••••••••</div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button onClick={() => setModalEditUser(false)} style={{ ...btn.base, background: '#334155', color: '#94a3b8', border: 'none' }}>Cancelar</button>
              <button onClick={guardarUsuario} disabled={guardandoUser} style={{ ...btn.base, ...btn.primary, opacity: guardandoUser ? 0.7 : 1 }}>
                <Save size={14} /> {guardandoUser ? 'Guardando...' : modalEditUser === 'crear' ? 'Crear usuario' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}