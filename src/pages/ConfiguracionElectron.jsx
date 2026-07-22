import { useState, useEffect } from 'react'
import { isElectron } from '../lib/electronBridge'
import { Save, Database, Cloud, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { C, T, btn, card, input } from '../styles/responsive'

export default function ConfiguracionElectron() {
  const [config,     setConfig]     = useState(null)
  const [guardando,  setGuardando]  = useState(false)
  const [testeando,  setTesteando]  = useState(false)
  const [estadoBD,   setEstadoBD]   = useState(null) // null | 'ok' | 'error'
  const [errorBD,    setErrorBD]    = useState('')
  const [ok,         setOk]         = useState(false)

  useEffect(() => {
    if (!isElectron) return
    window.electron.getConfig().then(setConfig)
  }, [])

  const testearConexion = async () => {
    setTesteando(true); setEstadoBD(null); setErrorBD('')
    try {
      const result = await window.electron.invoke('db-ping')
      if (result.ok) setEstadoBD('ok')
      else { setEstadoBD('error'); setErrorBD(result.error) }
    } catch (e) {
      setEstadoBD('error'); setErrorBD(e.message)
    }
    setTesteando(false)
  }

  const guardar = async () => {
    if (!isElectron) return
    setGuardando(true)
    await window.electron.setConfig(config)
    setOk(true)
    setTimeout(() => setOk(false), 2500)
    setGuardando(false)
  }

  if (!isElectron) return (
    <div style={{ padding: '2rem', textAlign: 'center', color: C.textMuted }}>
      Esta sección solo está disponible en la versión instalable de TiendaPos.
    </div>
  )

  if (!config) return (
    <div style={{ padding: '2rem', textAlign: 'center', color: C.textMuted }}>Cargando...</div>
  )

  const lbl = { fontSize: T.xs, color: C.textSecondary, display: 'block', marginBottom: '0.25rem' }

  return (
    <div style={{ maxWidth: '36rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Selector de modo */}
      <div style={card}>
        <div style={{ padding: '0.875rem 1rem', borderBottom: `1px solid ${C.borderLight}`, fontSize: T.base, fontWeight: 700, color: C.text }}>
          Modo de conexión
        </div>
        <div style={{ padding: '1rem', display: 'flex', gap: '0.75rem' }}>
          {[
            { val: 'nube',  label: 'Nube',  icon: Cloud,    desc: 'Datos en Supabase. Requiere internet.' },
            { val: 'local', label: 'Local', icon: Database, desc: 'Datos en esta PC. Funciona sin internet.' },
          ].map(m => (
            <div key={m.val}
              onClick={() => setConfig(p => ({ ...p, modo: m.val }))}
              style={{ flex: 1, padding: '0.875rem', border: `2px solid ${config.modo === m.val ? C.primary : C.border}`, borderRadius: '0.625rem', cursor: 'pointer', background: config.modo === m.val ? C.primaryLight : C.bgWhite }}>
              <m.icon size={20} color={config.modo === m.val ? C.primary : C.textMuted} style={{ marginBottom: '0.375rem' }} />
              <div style={{ fontSize: T.sm, fontWeight: 700, color: config.modo === m.val ? C.primary : C.text }}>{m.label}</div>
              <div style={{ fontSize: T.xs, color: C.textMuted, marginTop: '0.25rem' }}>{m.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Config modo nube */}
      {config.modo === 'nube' && (
        <div style={card}>
          <div style={{ padding: '0.875rem 1rem', borderBottom: `1px solid ${C.borderLight}`, fontSize: T.base, fontWeight: 700, color: C.text, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Cloud size={16} color={C.primary} /> Configuración Supabase
          </div>
          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={lbl}>URL del proyecto</label>
              <input value={config.supabase_url || ''}
                onChange={e => setConfig(p => ({ ...p, supabase_url: e.target.value }))}
                placeholder="https://xxx.supabase.co" style={input} />
            </div>
            <div>
              <label style={lbl}>Anon Key</label>
              <input value={config.supabase_key || ''}
                onChange={e => setConfig(p => ({ ...p, supabase_key: e.target.value }))}
                placeholder="eyJhbGci..." style={input} />
            </div>
          </div>
        </div>
      )}

      {/* Config modo local */}
      {config.modo === 'local' && (
        <div style={card}>
          <div style={{ padding: '0.875rem 1rem', borderBottom: `1px solid ${C.borderLight}`, fontSize: T.base, fontWeight: 700, color: C.text, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Database size={16} color={C.primary} /> Conexión PostgreSQL local
          </div>
          <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={lbl}>Host</label>
              <input value={config.db_host || 'localhost'}
                onChange={e => setConfig(p => ({ ...p, db_host: e.target.value }))}
                placeholder="localhost" style={input} />
            </div>
            <div>
              <label style={lbl}>Puerto</label>
              <input type="number" value={config.db_port || 5432}
                onChange={e => setConfig(p => ({ ...p, db_port: parseInt(e.target.value) }))}
                placeholder="5432" style={input} />
            </div>
            <div>
              <label style={lbl}>Base de datos</label>
              <input value={config.db_name || 'tiendapos'}
                onChange={e => setConfig(p => ({ ...p, db_name: e.target.value }))}
                placeholder="tiendapos" style={input} />
            </div>
            <div>
              <label style={lbl}>Usuario</label>
              <input value={config.db_user || 'postgres'}
                onChange={e => setConfig(p => ({ ...p, db_user: e.target.value }))}
                placeholder="postgres" style={input} />
            </div>
            <div>
              <label style={lbl}>Contraseña</label>
              <input type="password" value={config.db_password || ''}
                onChange={e => setConfig(p => ({ ...p, db_password: e.target.value }))}
                placeholder="••••••••" style={input} />
            </div>

            {/* Test de conexión */}
            <div style={{ gridColumn: 'span 2' }}>
              <button onClick={testearConexion} disabled={testeando}
                style={{ ...btn.base, ...btn.ghost, width: '100%', justifyContent: 'center' }}>
                {testeando
                  ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Probando...</>
                  : <><Database size={14} /> Probar conexión</>}
              </button>
              {estadoBD === 'ok' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.5rem', color: C.success, fontSize: T.xs, fontWeight: 600 }}>
                  <CheckCircle size={14} /> Conexión exitosa
                </div>
              )}
              {estadoBD === 'error' && (
                <div style={{ marginTop: '0.5rem', color: C.danger, fontSize: T.xs }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: 600 }}>
                    <XCircle size={14} /> Error de conexión
                  </div>
                  <div style={{ marginTop: '0.25rem', color: C.textMuted }}>{errorBD}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Guardar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem' }}>
        {ok && <span style={{ fontSize: T.xs, color: C.success, fontWeight: 600 }}>✓ Guardado</span>}
        <button onClick={guardar} disabled={guardando}
          style={{ ...btn.base, ...btn.primary, opacity: guardando ? 0.7 : 1 }}>
          <Save size={14} /> {guardando ? 'Guardando...' : 'Guardar configuración'}
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}