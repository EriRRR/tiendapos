import { useState } from 'react'
import {
  CheckCircle, AlertTriangle, XCircle, ExternalLink,
  Settings, DollarSign, ChevronDown, ChevronUp,
  User, Shield, Trash2
} from 'lucide-react'
import { T, btn } from '../../../styles/responsive'

export function estadoInfo(t) {
  const des = t.estado === 'deshabilitado' || t.dias_retraso > t.dias_gracia
  const ret = t.dias_retraso > 0 && !des
  if (des) return { icon: <XCircle size={15} color="#f87171" />,      label: 'Deshabilitada',             bg: '#450a0a', border: '#7f1d1d', text: '#fca5a5' }
  if (ret) return { icon: <AlertTriangle size={15} color="#fbbf24" />, label: `${t.dias_retraso}d retraso`, bg: '#422006', border: '#92400e', text: '#fbbf24' }
  return          { icon: <CheckCircle size={15} color="#34d399" />,   label: 'Al día',                    bg: '#052e16', border: '#065f46', text: '#34d399' }
}

export function BarraUsuarios({ usados, maximo }) {
  const pct   = Math.min(100, Math.round((usados / maximo) * 100))
  const color = pct >= 100 ? '#f87171' : pct >= 75 ? '#fbbf24' : '#34d399'
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
        <span style={{ fontSize: '0.625rem', color: '#94a3b8' }}>Usuarios</span>
        <span style={{ fontSize: '0.625rem', fontWeight: 600, color }}>{usados}/{maximo}</span>
      </div>
      <div style={{ background: '#334155', borderRadius: '9999px', height: '0.25rem', overflow: 'hidden' }}>
        <div style={{ background: color, height: '100%', width: `${pct}%`, borderRadius: '9999px', transition: 'width 0.3s' }} />
      </div>
    </div>
  )
}

export default function TarjetaTienda({
  t, expandida, setExpandida,
  onEntrar, onConfig, onPago,
  onCambiarEstado, onEliminarUsuario,
  mostrarAcciones = true,
}) {
  const info           = estadoInfo(t)
  const deshabilitada  = t.estado === 'deshabilitado' || t.dias_retraso > t.dias_gracia
  const abierta        = expandida === t.id
  const usuariosReales = t.total_usuarios || 0
  const maxUsuarios    = t.max_usuarios   || 3

  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '0.75rem', marginBottom: '0.625rem', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '0.875rem 1.25rem', gap: '0.875rem', flexWrap: 'wrap' }}>

        <div style={{ flexShrink: 0 }}>{info.icon}</div>

        <div style={{ flex: 1, minWidth: '10rem' }}>
          <div style={{ fontSize: T.base, fontWeight: 700, color: '#f1f5f9' }}>{t.nombre}</div>
          <div style={{ fontSize: T.xs, color: '#94a3b8', marginTop: '0.125rem' }}>
            {t.email_contacto || '—'}{t.telefono && ` · ${t.telefono}`}
          </div>
          <div style={{ maxWidth: '14rem', marginTop: '0.25rem' }}>
            <BarraUsuarios usados={usuariosReales} maximo={maxUsuarios} />
          </div>
          {t.slug && (
            <div style={{ fontSize: T.xs, color: '#64748b', fontFamily: 'monospace', marginTop: '0.125rem' }}>
              /catalogo/{t.slug}
            </div>
          )}
        </div>

        {/* Badge estado/pago */}
        <div style={{ background: info.bg, border: `1px solid ${info.border}`, borderRadius: '0.4375rem', padding: '0.3125rem 0.75rem', textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: T.xs, fontWeight: 700, color: info.text }}>{info.label}</div>
          <div style={{ fontSize: '0.625rem', color: info.text, marginTop: '0.0625rem' }}>
            L {parseFloat(t.precio_plan || 0).toFixed(2)} / {t.ciclo_pago || 'mes'}
          </div>
          {!deshabilitada && t.dias_retraso > 0 && (
            <div style={{ fontSize: '0.625rem', color: info.text }}>{t.dias_gracia - t.dias_retraso}d restantes</div>
          )}
        </div>

        {mostrarAcciones && (
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', flexShrink: 0 }}>
            <button onClick={() => onEntrar(t)}
              style={{ ...btn.base, background: '#1e3a5f', color: '#60a5fa', border: '1px solid #1e40af', fontSize: T.xs, padding: '0.375rem 0.625rem' }}>
              <ExternalLink size={13} /> Entrar
            </button>
            <button onClick={() => onConfig(t)} title="Configurar"
              style={{ ...btn.base, background: '#334155', color: '#94a3b8', border: 'none', fontSize: T.xs, padding: '0.375rem 0.5rem' }}>
              <Settings size={13} />
            </button>
            <button onClick={() => onPago(t)}
              style={{ ...btn.base, background: '#052e16', color: '#34d399', border: '1px solid #065f46', fontSize: T.xs, padding: '0.375rem 0.625rem' }}>
              <DollarSign size={13} /> Pago
            </button>
            {deshabilitada ? (
              <button onClick={() => onCambiarEstado(t.id, 'activo', new Date().toISOString().split('T')[0])}
                style={{ ...btn.base, background: '#1e3a5f', color: '#93c5fd', border: '1px solid #1e40af', fontSize: T.xs, padding: '0.375rem 0.5rem' }}>
                Habilitar
              </button>
            ) : (
              <button onClick={() => { if (window.confirm(`¿Deshabilitar "${t.nombre}"?`)) onCambiarEstado(t.id, 'deshabilitado') }}
                style={{ ...btn.base, background: '#450a0a', color: '#fca5a5', border: '1px solid #7f1d1d', fontSize: T.xs, padding: '0.375rem 0.5rem' }}>
                Deshabilitar
              </button>
            )}
            <button onClick={() => setExpandida(abierta ? null : t.id)}
              style={{ ...btn.base, background: '#334155', color: '#94a3b8', border: 'none', padding: '0.375rem 0.5rem' }}>
              {abierta ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        )}
      </div>

      {/* Panel expandido — usuarios */}
      {abierta && (
        <div style={{ borderTop: '1px solid #334155', padding: '0.75rem 1.25rem', background: '#0f172a' }}>
          <div style={{ fontSize: T.xs, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
            Usuarios ({usuariosReales}/{maxUsuarios})
          </div>
          {t.usuarios?.filter(u => !u.es_dev).map(u => (
            <div key={u.user_id} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.375rem 0', borderBottom: '1px solid #1e293b' }}>
              <div style={{ width: '1.75rem', height: '1.75rem', background: u.activo ? '#334155' : '#1e293b', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <User size={12} color={u.activo ? '#94a3b8' : '#475569'} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: T.xs, color: u.activo ? '#f1f5f9' : '#475569', fontWeight: 500 }}>
                  {u.nombre || u.email}
                  {!u.activo && <span style={{ marginLeft: '0.375rem', fontSize: '0.625rem', color: '#f87171' }}>(deshabilitado)</span>}
                </div>
                <div style={{ fontSize: '0.625rem', color: '#64748b' }}>{u.email} · {u.rol}</div>
              </div>
              <button onClick={() => onEliminarUsuario(u.user_id, t.id, u.nombre || u.email)}
                style={{ ...btn.base, background: '#450a0a', color: '#fca5a5', border: '1px solid #7f1d1d', padding: '0.25rem 0.4375rem' }}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          {t.usuarios?.filter(u => u.es_dev).map(u => (
            <div key={u.user_id} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.375rem 0', opacity: 0.5 }}>
              <div style={{ width: '1.75rem', height: '1.75rem', background: '#1e3a5f', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Shield size={12} color="#60a5fa" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: T.xs, color: '#60a5fa', fontWeight: 500 }}>{u.email}</div>
                <div style={{ fontSize: '0.625rem', color: '#475569' }}>Usuario maestro — no cuenta en el límite</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}