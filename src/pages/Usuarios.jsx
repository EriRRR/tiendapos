import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  UserPlus, Edit2, UserX, UserCheck, Shield,
  Clock, ChevronDown, ChevronUp, X, Eye, EyeOff,
  Key, Save, AlertTriangle, Trash2, Lock, CheckCircle  // <-- agregados Lock y CheckCircle
} from 'lucide-react'
import { C, T, btn, card, input } from '../styles/responsive'

const accionColor = (accion) => ({
  crear:        { bg: C.successLight, color: C.success,  label: 'Creado'        },
  editar:       { bg: C.primaryLight, color: C.primary,  label: 'Editado'       },
  deshabilitar: { bg: '#fef9c3',      color: '#92400e',  label: 'Deshabilitado' },
  habilitar:    { bg: C.successLight, color: C.success,  label: 'Habilitado'    },
  eliminar:     { bg: '#fef2f2',      color: C.danger,   label: 'Eliminado'     },
}[accion] || { bg: C.bgMuted, color: C.textMuted, label: accion })

export default function Usuarios() {
  const { session, tenantInfo } = useAuth()

  const [usuarios,   setUsuarios]   = useState([])
  const [roles,      setRoles]      = useState([])
  const [auditoria,  setAuditoria]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState(null) // 'crear' | 'editar' | null
  const [usuarioEdit,setUsuarioEdit]= useState(null)
  const [verAudit,   setVerAudit]   = useState(false)
  const [guardando,  setGuardando]  = useState(false)
  const [error,      setError]      = useState('')
  const [verPass,    setVerPass]    = useState(false)
  const [cambiarPass,setCambiarPass]= useState(false)
  const [form, setForm] = useState({
    nombre: '', email: '', password: '', confirmar: '', rol_id: ''
  })

  // ── Estado para cambiar mi propia contraseña ──
  const [modalMiPass,    setModalMiPass]    = useState(false)
  const [formMiPass,     setFormMiPass]     = useState({ actual: '', nueva: '', confirmar: '' })
  const [verMiPass,      setVerMiPass]      = useState(false)
  const [guardandoMiPass,setGuardandoMiPass]= useState(false)
  const [errorMiPass,    setErrorMiPass]    = useState('')
  const [okMiPass,       setOkMiPass]       = useState(false)

  // Dueño, Gerente y developer pueden gestionar usuarios
  const puedeGestionar = ['admin', 'Dueño', 'Gerente', 'developer'].includes(tenantInfo?.rol)
    || tenantInfo?.is_admin === true

  const cargar = async () => {
    if (!tenantInfo?.tenant_id) return
    setLoading(true)
    const [{ data: us }, { data: rs }, { data: au }] = await Promise.all([
      supabase.rpc('get_usuarios_tienda',    { p_tenant_id: tenantInfo.tenant_id }),
      supabase.from('tenant_roles').select('*').eq('tenant_id', tenantInfo.tenant_id).order('nombre'),
      supabase.rpc('get_auditoria_usuarios', { p_tenant_id: tenantInfo.tenant_id }),
    ])
    if (us) setUsuarios(Array.isArray(us) ? us : [])
    if (rs) setRoles(rs)
    if (au) setAuditoria(Array.isArray(au) ? au : [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [tenantInfo?.tenant_id])

  const abrirCrear = () => {
    setUsuarioEdit(null)
    setForm({ nombre: '', email: '', password: '', confirmar: '', rol_id: roles[0]?.id || '' })
    setCambiarPass(false)
    setVerPass(false)
    setError('')
    setModal('crear')
  }

  const abrirEditar = (u) => {
    setUsuarioEdit(u)
    setForm({ nombre: u.nombre || '', email: u.email, password: '', confirmar: '', rol_id: u.rol_id || '' })
    setCambiarPass(false)
    setVerPass(false)
    setError('')
    setModal('editar')
  }

  const cerrarModal = () => {
    setModal(null)
    setUsuarioEdit(null)
    setError('')
    setCambiarPass(false)
    setVerPass(false)
  }

  const guardar = async () => {
    if (!form.nombre)  { setError('El nombre es obligatorio'); return }
    if (!form.rol_id)  { setError('Selecciona un rol'); return }
    if (modal === 'crear') {
      if (!form.email)    { setError('El email es obligatorio'); return }
      if (!form.password) { setError('La contraseña es obligatoria'); return }
      if (form.password.length < 6) { setError('Mínimo 6 caracteres'); return }
    }
    if (cambiarPass) {
      if (!form.password)                       { setError('Ingresa la nueva contraseña'); return }
      if (form.password.length < 6)             { setError('Mínimo 6 caracteres'); return }
      if (form.password !== form.confirmar)     { setError('Las contraseñas no coinciden'); return }
    }

    setGuardando(true); setError('')
    try {
      if (modal === 'crear') {
        const { error } = await supabase.rpc('crear_usuario_tienda', {
          p_creador_user_id: session.user.id,
          p_tenant_id:       tenantInfo.tenant_id,
          p_email:           form.email,
          p_password:        form.password,
          p_nombre:          form.nombre,
          p_rol_id:          form.rol_id,
        })
        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase.rpc('editar_usuario_tienda', {
          p_editor_user_id:  session.user.id,
          p_tenant_id:       tenantInfo.tenant_id,
          p_target_user_id:  usuarioEdit.user_id,
          p_nombre:          form.nombre,
          p_rol_id:          form.rol_id,
          p_activo:          null,
        })
        if (error) throw new Error(error.message)

        if (cambiarPass && form.password) {
          const { error: errPass } = await supabase.rpc('admin_cambiar_password_usuario', {
            p_editor_user_id:  session.user.id,
            p_tenant_id:       tenantInfo.tenant_id,
            p_target_user_id:  usuarioEdit.user_id,
            p_new_password:    form.password,
          })
          if (errPass) throw new Error(errPass.message)
        }
      }
      cerrarModal()
      await cargar()
    } catch (e) { setError(e.message) }
    setGuardando(false)
  }

  const cambiarEstado = async (u, activo) => {
    if (!window.confirm(`¿${activo ? 'Habilitar' : 'Deshabilitar'} a ${u.nombre || u.email}?`)) return
    await supabase.rpc('editar_usuario_tienda', {
      p_editor_user_id: session.user.id,
      p_tenant_id:      tenantInfo.tenant_id,
      p_target_user_id: u.user_id,
      p_nombre:         null,
      p_rol_id:         null,
      p_activo:         activo,
    })
    await cargar()
  }

  // ── Cambiar mi propia contraseña ──
  const cambiarMiPassword = async () => {
    if (!formMiPass.nueva)                              { setErrorMiPass('Ingresa la nueva contraseña'); return }
    if (formMiPass.nueva.length < 6)                   { setErrorMiPass('Mínimo 6 caracteres'); return }
    if (formMiPass.nueva !== formMiPass.confirmar)      { setErrorMiPass('Las contraseñas no coinciden'); return }
    setGuardandoMiPass(true); setErrorMiPass('')
    const { error } = await supabase.auth.updateUser({ password: formMiPass.nueva })
    if (error) {
      setErrorMiPass(error.message)
    } else {
      setOkMiPass(true)
      setFormMiPass({ actual: '', nueva: '', confirmar: '' })
      setTimeout(() => { setModalMiPass(false); setOkMiPass(false) }, 2000)
    }
    setGuardandoMiPass(false)
  }

  const fmt = (iso) => new Date(iso).toLocaleString('es-HN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })

  const lbl = { fontSize: T.xs, color: C.textSecondary, display: 'block', marginBottom: '0.25rem' }

  if (loading) return (
    <div style={{ padding: '2.5rem', textAlign: 'center', color: C.textMuted }}>Cargando...</div>
  )

  return (
    <div style={{ maxWidth: '52rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.625rem' }}>
        <div style={{ fontSize: T.xs, color: C.textMuted }}>
          {usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''} registrados
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => { setModalMiPass(true); setErrorMiPass(''); setOkMiPass(false) }}
            style={{ ...btn.base, ...btn.ghost, fontSize: T.xs, padding: '0.4375rem 0.75rem' }}
          >
            <Lock size={14} /> Mi contraseña
          </button>
          {puedeGestionar && (
            <button onClick={abrirCrear} style={{ ...btn.base, ...btn.primary }}>
              <UserPlus size={15} /> Nuevo usuario
            </button>
          )}
        </div>
      </div>

      {/* Lista de usuarios */}
      <div style={card}>
        {usuarios.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: C.textMuted }}>
            <UserPlus size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.2 }} />
            <div style={{ fontSize: T.sm, marginBottom: '0.75rem' }}>No hay usuarios registrados</div>
            {puedeGestionar && (
              <button onClick={abrirCrear} style={{ ...btn.base, ...btn.primary, margin: '0 auto' }}>
                <UserPlus size={14} /> Crear primer usuario
              </button>
            )}
          </div>
        ) : usuarios.map((u, idx) => (
          <div key={u.user_id} style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.875rem 1rem',
            borderBottom: idx < usuarios.length - 1 ? `1px solid ${C.borderLight}` : 'none',
            opacity: u.activo ? 1 : 0.55,
          }}>
            {/* Avatar */}
            <div style={{ width: '2.5rem', height: '2.5rem', background: u.activo ? C.primaryLight : C.bgMuted, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: T.base, fontWeight: 700, color: u.activo ? C.primary : C.textMuted }}>
              {(u.nombre || u.email).charAt(0).toUpperCase()}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: T.sm, fontWeight: 600, color: C.text }}>{u.nombre || '—'}</span>
                {!u.activo && (
                  <span style={{ fontSize: T.xs, background: '#fef2f2', color: C.danger, borderRadius: '9999px', padding: '0.0625rem 0.5rem', fontWeight: 600 }}>
                    Deshabilitado
                  </span>
                )}
                {u.user_id === session.user.id && (
                  <span style={{ fontSize: T.xs, background: C.primaryLight, color: C.primary, borderRadius: '9999px', padding: '0.0625rem 0.5rem', fontWeight: 600 }}>
                    Tú
                  </span>
                )}
              </div>
              <div style={{ fontSize: T.xs, color: C.textMuted, marginTop: '0.125rem' }}>{u.email}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.25rem' }}>
                <Shield size={11} color={C.textMuted} />
                <span style={{ fontSize: T.xs, color: C.textSecondary }}>{u.rol || '—'}</span>
              </div>
            </div>

            {/* Acciones */}
            {puedeGestionar && u.user_id !== session.user.id && (
              <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
                <button onClick={() => abrirEditar(u)} title="Editar"
                  style={{ ...btn.base, ...btn.ghost, padding: '0.375rem 0.5rem' }}>
                  <Edit2 size={13} />
                </button>
                {u.activo ? (
                  <button onClick={() => cambiarEstado(u, false)} title="Deshabilitar"
                    style={{ ...btn.base, ...btn.danger, padding: '0.375rem 0.5rem' }}>
                    <UserX size={13} />
                  </button>
                ) : (
                  <button onClick={() => cambiarEstado(u, true)} title="Habilitar"
                    style={{ ...btn.base, background: C.successLight, color: C.success, border: '1px solid #bbf7d0', padding: '0.375rem 0.5rem' }}>
                    <UserCheck size={13} />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Roles disponibles */}
      <div style={card}>
        <div style={{ padding: '0.875rem 1rem', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Shield size={15} color={C.primary} />
          <span style={{ fontSize: T.base, fontWeight: 700, color: C.text }}>Roles disponibles</span>
        </div>
        <div style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {roles.length === 0 ? (
            <div style={{ fontSize: T.sm, color: C.textMuted, textAlign: 'center', padding: '1rem' }}>
              No hay roles configurados
            </div>
          ) : roles.map(r => (
            <div key={r.id} style={{ background: C.bgMuted, borderRadius: '0.5rem', padding: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: T.sm, fontWeight: 700, color: C.text }}>{r.nombre}</span>
                {r.es_base && (
                  <span style={{ fontSize: T.xs, background: C.primaryLight, color: C.primary, borderRadius: '9999px', padding: '0.0625rem 0.5rem' }}>
                    Base
                  </span>
                )}
              </div>
              {r.descripcion && <div style={{ fontSize: T.xs, color: C.textMuted }}>{r.descripcion}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Historial */}
      <div style={card}>
        <button onClick={() => setVerAudit(v => !v)}
          style={{ width: '100%', padding: '0.875rem 1rem', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={15} color={C.primary} />
            <span style={{ fontSize: T.base, fontWeight: 700, color: C.text }}>Historial de cambios</span>
            <span style={{ fontSize: T.xs, background: C.bgMuted, borderRadius: '9999px', padding: '0.0625rem 0.5rem', color: C.textMuted }}>
              {auditoria.length}
            </span>
          </div>
          {verAudit ? <ChevronUp size={16} color={C.textMuted} /> : <ChevronDown size={16} color={C.textMuted} />}
        </button>
        {verAudit && (
          <div style={{ borderTop: `1px solid ${C.borderLight}` }}>
            {auditoria.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: C.textMuted, fontSize: T.sm }}>
                Sin cambios registrados
              </div>
            ) : auditoria.map(a => {
              const { bg, color, label } = accionColor(a.accion)
              return (
                <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem 1rem', borderBottom: `1px solid ${C.borderLight}` }}>
                  <span style={{ background: bg, color, borderRadius: '9999px', padding: '0.125rem 0.5rem', fontSize: T.xs, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {label}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: T.xs, color: C.text }}>
                      {a.campo === 'nombre'   && a.valor_antes && <span>Nombre: <strong>{a.valor_antes}</strong> → <strong>{a.valor_despues}</strong></span>}
                      {a.campo === 'rol'      && <span>Rol: <strong>{a.valor_antes || '—'}</strong> → <strong>{a.valor_despues}</strong></span>}
                      {a.campo === 'activo'   && <span>{a.accion === 'deshabilitar' ? 'Deshabilitado' : 'Habilitado'}</span>}
                      {a.campo === 'usuario'  && a.accion === 'crear'    && <span>Creado: <strong>{a.valor_despues}</strong></span>}
                      {a.campo === 'usuario'  && a.accion === 'eliminar' && <span>Eliminado: <strong>{a.valor_antes}</strong></span>}
                      {a.campo === 'password' && <span>Contraseña actualizada</span>}
                    </div>
                    <div style={{ fontSize: '0.625rem', color: C.textMuted, marginTop: '0.125rem' }}>
                      Por {a.hecho_por_email} · {fmt(a.created_at)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ══ MODAL CREAR / EDITAR ══ */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div style={{ background: C.bgWhite, borderRadius: '0.75rem', padding: '1.25rem', width: '100%', maxWidth: '28rem', maxHeight: '90vh', overflowY: 'auto' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: T.base, fontWeight: 700, color: C.text }}>
                {modal === 'crear' ? 'Nuevo usuario' : `Editar: ${usuarioEdit?.nombre || usuarioEdit?.email}`}
              </h3>
              <button onClick={cerrarModal}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, display: 'flex' }}>
                <X size={18} />
              </button>
            </div>

            {error && (
              <div style={{ background: '#fef2f2', border: `1px solid ${C.dangerBorder}`, borderRadius: '0.5rem', padding: '0.75rem', fontSize: T.sm, color: C.danger, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={14} /> {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

              {/* Nombre */}
              <div>
                <label style={lbl}>Nombre completo *</label>
                <input value={form.nombre}
                  onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                  placeholder="Ej: María García" style={input} />
              </div>

              {/* Email */}
              {modal === 'crear' ? (
                <div>
                  <label style={lbl}>Email *</label>
                  <input type="email" value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="usuario@email.com" style={input} />
                </div>
              ) : (
                <div>
                  <label style={lbl}>Email (no editable)</label>
                  <div style={{ ...input, background: C.bgMuted, color: C.textMuted, cursor: 'default' }}>
                    {usuarioEdit?.email}
                  </div>
                </div>
              )}

              {/* Rol */}
              <div>
                <label style={lbl}>Rol *</label>
                <select value={form.rol_id}
                  onChange={e => setForm(p => ({ ...p, rol_id: e.target.value }))}
                  style={{ ...input, cursor: 'pointer' }}>
                  <option value="">Selecciona un rol...</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.nombre}{r.descripcion ? ` — ${r.descripcion}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Contraseña */}
              {modal === 'crear' ? (
                <div>
                  <label style={lbl}>Contraseña *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={verPass ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                      placeholder="Mínimo 6 caracteres"
                      style={{ ...input, paddingRight: '2.5rem' }}
                    />
                    <button type="button" onClick={() => setVerPass(v => !v)}
                      style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, display: 'flex' }}>
                      {verPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <label style={{ ...lbl, marginBottom: 0 }}>Contraseña</label>
                    <button type="button"
                      onClick={() => { setCambiarPass(v => !v); setForm(p => ({ ...p, password: '', confirmar: '' })) }}
                      style={{ ...btn.base, background: cambiarPass ? C.dangerLight : C.primaryLight, color: cambiarPass ? C.danger : C.primary, border: 'none', fontSize: T.xs, padding: '0.25rem 0.625rem' }}>
                      <Key size={12} /> {cambiarPass ? 'Cancelar' : 'Cambiar contraseña'}
                    </button>
                  </div>
                  {cambiarPass ? (
                    <div style={{ background: C.bgMuted, borderRadius: '0.5rem', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                      <div>
                        <label style={lbl}>Nueva contraseña</label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={verPass ? 'text' : 'password'}
                            value={form.password}
                            onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                            placeholder="Mínimo 6 caracteres"
                            style={{ ...input, paddingRight: '2.5rem' }}
                          />
                          <button type="button" onClick={() => setVerPass(v => !v)}
                            style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, display: 'flex' }}>
                            {verPass ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label style={lbl}>Confirmar contraseña</label>
                        <input
                          type={verPass ? 'text' : 'password'}
                          value={form.confirmar}
                          onChange={e => setForm(p => ({ ...p, confirmar: e.target.value }))}
                          placeholder="Repite la contraseña"
                          style={{ ...input, borderColor: form.confirmar && form.password !== form.confirmar ? C.danger : undefined }}
                        />
                        {form.confirmar && form.password !== form.confirmar && (
                          <div style={{ fontSize: T.xs, color: C.danger, marginTop: '0.25rem' }}>
                            Las contraseñas no coinciden
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ ...input, background: C.bgMuted, color: C.textMuted, cursor: 'default' }}>
                      ••••••••
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button onClick={cerrarModal}
                style={{ ...btn.base, ...btn.ghost }}>Cancelar</button>
              <button onClick={guardar} disabled={guardando}
                style={{ ...btn.base, ...btn.primary, opacity: guardando ? 0.7 : 1 }}>
                <Save size={14} />
                {guardando ? 'Guardando...' : modal === 'crear' ? 'Crear usuario' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL CAMBIAR MI CONTRASEÑA ══ */}
      {modalMiPass && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div style={{ background: C.bgWhite, borderRadius: '0.75rem', padding: '1.25rem', width: '100%', maxWidth: '24rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: T.base, fontWeight: 700, color: C.text }}>Cambiar mi contraseña</h3>
              <button onClick={() => setModalMiPass(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, display: 'flex' }}>
                <X size={18} />
              </button>
            </div>

            {okMiPass ? (
              <div style={{ textAlign: 'center', padding: '1rem' }}>
                <CheckCircle size={36} color={C.success} style={{ margin: '0 auto 0.5rem' }} />
                <div style={{ color: C.success, fontWeight: 600 }}>✓ Contraseña actualizada</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {errorMiPass && (
                  <div style={{ background: '#fef2f2', border: `1px solid ${C.dangerBorder}`, borderRadius: '0.5rem', padding: '0.75rem', fontSize: T.xs, color: C.danger }}>
                    {errorMiPass}
                  </div>
                )}
                {[
                  { k: 'nueva',     l: 'Nueva contraseña',    ph: 'Mínimo 6 caracteres' },
                  { k: 'confirmar', l: 'Confirmar contraseña', ph: 'Repite la contraseña' },
                ].map(f => (
                  <div key={f.k}>
                    <label style={{ fontSize: T.xs, color: C.textSecondary, display: 'block', marginBottom: '0.25rem' }}>{f.l}</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={verMiPass ? 'text' : 'password'}
                        value={formMiPass[f.k]}
                        onChange={e => setFormMiPass(p => ({ ...p, [f.k]: e.target.value }))}
                        placeholder={f.ph}
                        style={{ ...input, paddingRight: '2.5rem', borderColor: f.k === 'confirmar' && formMiPass.confirmar && formMiPass.nueva !== formMiPass.confirmar ? C.danger : undefined }}
                      />
                      {f.k === 'nueva' && (
                        <button type="button" onClick={() => setVerMiPass(v => !v)}
                          style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, display: 'flex' }}>
                          {verMiPass ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      )}
                    </div>
                    {f.k === 'confirmar' && formMiPass.confirmar && formMiPass.nueva !== formMiPass.confirmar && (
                      <div style={{ fontSize: T.xs, color: C.danger, marginTop: '0.25rem' }}>No coinciden</div>
                    )}
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                  <button onClick={() => setModalMiPass(false)} style={{ ...btn.base, ...btn.ghost }}>Cancelar</button>
                  <button onClick={cambiarMiPassword} disabled={guardandoMiPass}
                    style={{ ...btn.base, ...btn.primary, opacity: guardandoMiPass ? 0.7 : 1 }}>
                    <Lock size={14} /> {guardandoMiPass ? 'Guardando...' : 'Actualizar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}