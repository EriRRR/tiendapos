import {
  Settings, User, Lock, Activity, TrendingUp,
  CheckCircle, AlertCircle, Pencil, Shield, ChevronDown,
  Eye, EyeOff, Save
} from 'lucide-react'
import { T, btn, input } from '../../../styles/responsive'

export default function TabAjustes({
  session, stats,
  formPerfil, setFormPerfil, guardarPerfil, guardandoPerfil, msgPerfil,
  formPassword, setFormPassword, guardarPassword, guardandoPassword, msgPassword,
  verPassNueva, setVerPassNueva,
  seccionAjustes, setSeccionAjustes,
}) {
  const sectionTitle = { fontSize: T.lg, fontWeight: 700, color: '#f1f5f9', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }
  const darkInput    = { ...input, background: '#0f172a', color: '#f1f5f9', border: '1px solid #475569' }
  const lbl          = { fontSize: T.xs, color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }

  return (
    <div style={{ maxWidth: '48rem', margin: '0 auto' }}>
      <div style={sectionTitle}><Settings size={18} /> Ajustes del sistema</div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {[
          { id: 'perfil',    icon: User,       label: 'Mi perfil'    },
          { id: 'seguridad', icon: Lock,       label: 'Seguridad'    },
          { id: 'cuenta',    icon: Activity,   label: 'Mi cuenta'    },
          { id: 'sistema',   icon: TrendingUp, label: 'Estadísticas' },
        ].map(s => (
          <button key={s.id} onClick={() => setSeccionAjustes(s.id)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 0.875rem', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontSize: T.xs, fontWeight: 600, background: seccionAjustes === s.id ? '#2563eb' : '#334155', color: seccionAjustes === s.id ? '#fff' : '#94a3b8', transition: 'all 0.15s' }}>
            <s.icon size={13} /> {s.label}
          </button>
        ))}
      </div>

      {/* PERFIL */}
      {seccionAjustes === 'perfil' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Card avatar */}
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '0.75rem', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            <div style={{ width: '4rem', height: '4rem', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {(formPerfil.nombre || 'E').charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: T.lg, fontWeight: 700, color: '#f1f5f9' }}>{formPerfil.nombre || 'Administrador'}</div>
              <div style={{ fontSize: T.xs, color: '#94a3b8', marginTop: '0.25rem' }}>{formPerfil.titulo || 'Desarrollador'}</div>
              <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.625rem', background: '#1e3a5f', color: '#60a5fa', borderRadius: '9999px', padding: '0.125rem 0.5rem', fontWeight: 700 }}>⚡ Admin Developer</span>
                <span style={{ fontSize: '0.625rem', background: '#052e16', color: '#34d399', borderRadius: '9999px', padding: '0.125rem 0.5rem', fontWeight: 700 }}>✓ Cuenta verificada</span>
              </div>
            </div>
            <div style={{ fontSize: T.xs, color: '#475569', textAlign: 'right' }}>
              <div>{session?.user?.email}</div>
              <div style={{ marginTop: '0.25rem' }}>Desde {new Date('2026-06-19').toLocaleDateString('es-HN', { month: 'long', year: 'numeric' })}</div>
            </div>
          </div>

          {/* Formulario */}
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '0.75rem', padding: '1.25rem' }}>
            <div style={{ fontSize: T.sm, fontWeight: 700, color: '#f1f5f9', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Pencil size={14} color="#60a5fa" /> Editar información
            </div>
            {msgPerfil && (
              <div style={{ background: msgPerfil.tipo === 'ok' ? '#052e16' : '#450a0a', border: `1px solid ${msgPerfil.tipo === 'ok' ? '#065f46' : '#7f1d1d'}`, borderRadius: '0.5rem', padding: '0.75rem', fontSize: T.xs, color: msgPerfil.tipo === 'ok' ? '#34d399' : '#f87171', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {msgPerfil.tipo === 'ok' ? <CheckCircle size={14} /> : <AlertCircle size={14} />} {msgPerfil.texto}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {[
                { key: 'nombre',    label: 'Nombre completo *', ph: 'Erick Raúl Ramírez Rodríguez',      full: true },
                { key: 'titulo',    label: 'Título / Cargo',    ph: 'Ing. en Ciencias de la Computación', full: true },
                { key: 'empresa',   label: 'Empresa',           ph: 'ErTech Solutions'                              },
                { key: 'telefono',  label: 'Teléfono',          ph: '+504 0000-0000'                                },
                { key: 'sitio_web', label: 'Sitio web',         ph: 'https://...'                                   },
              ].map(f => (
                <div key={f.key} style={{ gridColumn: f.full ? 'span 2' : 'span 1' }}>
                  <label style={lbl}>{f.label}</label>
                  <input value={formPerfil[f.key]}
                    onChange={e => setFormPerfil(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.ph} style={darkInput} />
                </div>
              ))}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={lbl}>Bio</label>
                <textarea value={formPerfil.bio}
                  onChange={e => setFormPerfil(p => ({ ...p, bio: e.target.value }))}
                  rows={3} style={{ ...darkInput, resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button onClick={guardarPerfil} disabled={guardandoPerfil}
                style={{ ...btn.base, ...btn.primary, opacity: guardandoPerfil ? 0.7 : 1 }}>
                <Save size={14} /> {guardandoPerfil ? 'Guardando...' : 'Guardar perfil'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEGURIDAD */}
      {seccionAjustes === 'seguridad' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '0.75rem', padding: '1.25rem' }}>
            <div style={{ fontSize: T.sm, fontWeight: 700, color: '#f1f5f9', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Lock size={14} color="#60a5fa" /> Cambiar contraseña
            </div>
            {msgPassword && (
              <div style={{ background: msgPassword.tipo === 'ok' ? '#052e16' : '#450a0a', border: `1px solid ${msgPassword.tipo === 'ok' ? '#065f46' : '#7f1d1d'}`, borderRadius: '0.5rem', padding: '0.75rem', fontSize: T.xs, color: msgPassword.tipo === 'ok' ? '#34d399' : '#f87171', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {msgPassword.tipo === 'ok' ? <CheckCircle size={14} /> : <AlertCircle size={14} />} {msgPassword.texto}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { key: 'nueva',     label: 'Nueva contraseña',    ph: 'Mínimo 8 caracteres' },
                { key: 'confirmar', label: 'Confirmar contraseña', ph: 'Repite la contraseña' },
              ].map(f => (
                <div key={f.key}>
                  <label style={lbl}>{f.label}</label>
                  <div style={{ position: 'relative' }}>
                    <input type={verPassNueva ? 'text' : 'password'} value={formPassword[f.key]}
                      onChange={e => setFormPassword(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.ph}
                      style={{ ...darkInput, paddingRight: '2.5rem', borderColor: f.key === 'confirmar' && formPassword.confirmar && formPassword.nueva !== formPassword.confirmar ? '#f87171' : '#475569' }} />
                    {f.key === 'nueva' && (
                      <button type="button" onClick={() => setVerPassNueva(v => !v)}
                        style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}>
                        {verPassNueva ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    )}
                  </div>
                  {f.key === 'confirmar' && formPassword.confirmar && formPassword.nueva !== formPassword.confirmar && (
                    <div style={{ fontSize: T.xs, color: '#f87171', marginTop: '0.25rem' }}>Las contraseñas no coinciden</div>
                  )}
                </div>
              ))}
              {formPassword.nueva && (
                <div>
                  <div style={{ fontSize: T.xs, color: '#64748b', marginBottom: '0.25rem' }}>Fortaleza</div>
                  <div style={{ background: '#334155', borderRadius: '9999px', height: '0.25rem', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: '9999px', transition: 'width 0.3s', background: formPassword.nueva.length < 8 ? '#f87171' : formPassword.nueva.length < 12 ? '#fbbf24' : '#34d399', width: formPassword.nueva.length < 6 ? '20%' : formPassword.nueva.length < 8 ? '40%' : formPassword.nueva.length < 12 ? '70%' : '100%' }} />
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button onClick={guardarPassword} disabled={guardandoPassword}
                style={{ ...btn.base, ...btn.primary, opacity: guardandoPassword ? 0.7 : 1 }}>
                <Lock size={14} /> {guardandoPassword ? 'Actualizando...' : 'Actualizar contraseña'}
              </button>
            </div>
          </div>

          {/* Info seguridad */}
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '0.75rem', padding: '1.25rem' }}>
            <div style={{ fontSize: T.sm, fontWeight: 700, color: '#f1f5f9', marginBottom: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={14} color="#60a5fa" /> Información de seguridad
            </div>
            {[
              { label: 'Email',         valor: session?.user?.email                                                                    },
              { label: 'Rol',           valor: '⚡ Admin Developer — acceso total'                                                    },
              { label: 'Último acceso', valor: new Date('2026-07-04T02:40:01Z').toLocaleString('es-HN')                              },
              { label: 'Creado',        valor: new Date('2026-06-19').toLocaleDateString('es-HN', { day:'2-digit', month:'long', year:'numeric' }) },
              { label: 'Estado',        valor: '✓ Activa y verificada'                                                                },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #1e293b' }}>
                <span style={{ fontSize: T.xs, color: '#64748b' }}>{item.label}</span>
                <span style={{ fontSize: T.xs, color: '#94a3b8', fontWeight: 500 }}>{item.valor}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CUENTA */}
      {seccionAjustes === 'cuenta' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '0.75rem', padding: '1.25rem' }}>
            <div style={{ fontSize: T.sm, fontWeight: 700, color: '#f1f5f9', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={14} color="#60a5fa" /> Resumen de cuenta
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
              {[
                { label: 'Nombre',   valor: formPerfil.nombre   || 'Erick Raúl Ramírez Rodríguez',      icon: '👤' },
                { label: 'Título',   valor: formPerfil.titulo   || 'Ing. en Ciencias de la Computación', icon: '🎓' },
                { label: 'Empresa',  valor: formPerfil.empresa  || 'ErTech Solutions',                   icon: '🏢' },
                { label: 'Teléfono', valor: formPerfil.telefono || 'No configurado',                     icon: '📱' },
                { label: 'Web',      valor: formPerfil.sitio_web|| 'No configurado',                     icon: '🌐' },
                { label: 'GitHub',   valor: 'github.com/EriRRR',                                         icon: '💻' },
              ].map(item => (
                <div key={item.label} style={{ background: '#0f172a', borderRadius: '0.5rem', padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.625rem', color: '#475569', textTransform: 'uppercase', marginBottom: '0.25rem' }}>{item.icon} {item.label}</div>
                  <div style={{ fontSize: T.xs, fontWeight: 600, color: item.valor === 'No configurado' ? '#334155' : '#94a3b8' }}>{item.valor}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '0.75rem', padding: '1.25rem' }}>
            <div style={{ fontSize: T.sm, fontWeight: 700, color: '#f1f5f9', marginBottom: '0.875rem' }}>Acciones rápidas</div>
            {[
              { label: 'Editar perfil',      desc: 'Actualiza tu información',     onClick: () => setSeccionAjustes('perfil'),    color: '#60a5fa' },
              { label: 'Cambiar contraseña', desc: 'Actualiza tu contraseña',      onClick: () => setSeccionAjustes('seguridad'), color: '#fbbf24' },
              { label: 'Ver estadísticas',   desc: 'Métricas del sistema',         onClick: () => setSeccionAjustes('sistema'),   color: '#34d399' },
            ].map(a => (
              <button key={a.label} onClick={a.onClick}
                style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '0.625rem', cursor: 'pointer', textAlign: 'left', width: '100%', marginBottom: '0.5rem', transition: 'border-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = a.color}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#1e293b'}>
                <div style={{ width: '0.375rem', height: '2rem', background: a.color, borderRadius: '9999px' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: T.xs, fontWeight: 700, color: '#f1f5f9' }}>{a.label}</div>
                  <div style={{ fontSize: '0.625rem', color: '#64748b' }}>{a.desc}</div>
                </div>
                <ChevronDown size={14} color="#334155" style={{ transform: 'rotate(-90deg)' }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SISTEMA */}
      {seccionAjustes === 'sistema' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '0.75rem', padding: '1.25rem' }}>
            <div style={{ fontSize: T.sm, fontWeight: 700, color: '#f1f5f9', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={14} color="#60a5fa" /> Estadísticas globales
            </div>
            {!stats ? (
              <div style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>Cargando...</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(9rem, 1fr))', gap: '0.625rem' }}>
                {[
                  { label: 'Total tiendas',     val: stats.total_tiendas,      color: '#60a5fa', icon: '🏪' },
                  { label: 'Tiendas activas',    val: stats.tiendas_activas,    color: '#34d399', icon: '✅' },
                  { label: 'Con retraso',        val: stats.tiendas_retrasadas, color: '#fbbf24', icon: '⚠️' },
                  { label: 'Usuarios totales',   val: stats.total_usuarios,     color: '#a78bfa', icon: '👥' },
                  { label: 'Productos',          val: stats.total_productos,    color: '#60a5fa', icon: '📦' },
                  { label: 'Ventas',             val: stats.total_ventas,       color: '#34d399', icon: '🛒' },
                  { label: 'Nuevas este mes',    val: stats.tiendas_este_mes,   color: '#fbbf24', icon: '📅' },
                  { label: 'Ingresos totales',   val: `L ${parseFloat(stats.ingresos_totales || 0).toLocaleString('es-HN', { minimumFractionDigits: 2 })}`, color: '#34d399', icon: '💰' },
                ].map(s => (
                  <div key={s.label} style={{ background: '#0f172a', borderRadius: '0.625rem', padding: '0.875rem' }}>
                    <div style={{ fontSize: '1.125rem', marginBottom: '0.25rem' }}>{s.icon}</div>
                    <div style={{ fontSize: T.xs, color: '#64748b', marginBottom: '0.25rem' }}>{s.label}</div>
                    <div style={{ fontSize: T.lg, fontWeight: 800, color: s.color }}>{s.val}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '0.75rem', padding: '1.25rem' }}>
            <div style={{ fontSize: T.sm, fontWeight: 700, color: '#f1f5f9', marginBottom: '0.875rem' }}>Información del sistema</div>
            {[
              { label: 'Producto',      valor: 'TiendaPos v1.0.0'              },
              { label: 'Frontend',      valor: 'React 19 + Vite 8'             },
              { label: 'Base de datos', valor: 'Supabase · PostgreSQL 15'      },
              { label: 'Hosting',       valor: 'Cloudflare Pages'              },
              { label: 'Desktop',       valor: 'Electron'                      },
              { label: 'Desarrollador', valor: 'Erick Raúl Ramírez Rodríguez' },
              { label: 'Empresa',       valor: 'ErTech Solutions'              },
              { label: 'Lanzamiento',   valor: 'Julio 2026'                   },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4375rem 0', borderBottom: '1px solid #1e293b' }}>
                <span style={{ fontSize: T.xs, color: '#64748b' }}>{item.label}</span>
                <span style={{ fontSize: T.xs, color: '#94a3b8', fontWeight: 500 }}>{item.valor}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}