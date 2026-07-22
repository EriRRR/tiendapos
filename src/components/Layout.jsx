import { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Package, ShoppingCart, QrCode, Scan,
  BarChart2, Settings, Menu, X, Users,
  BookOpen, UserCog, LogOut, AlertTriangle,
  Clock, Shield, Info, Barcode
} from 'lucide-react'
import { C, T } from '../styles/responsive'
import { useAuth } from '../contexts/AuthContext'
import IndicadorConexion from './IndicadorConexion'
import { poblarCacheLocal, syncQueue } from '../lib/offlineManager'
import { useSesionUnica } from '../hooks/useSesionUnica'
import AlertaSesionDuplicada from './AlertaSesionDuplicada'
import AlertaLogoutForzado from './AlertaLogoutForzado'
import AlertaTimeout from './AlertaTimeout'
import NotificacionesSolicitudes from './NotificacionesSolicitudes'
import { supabase } from '../lib/supabase'
import { useConfiguracion } from '../hooks/useConfiguracion'

const NAV = [
  { to: '/ventas',        icon: ShoppingCart, label: 'Ventas'       },
  { to: '/inventario',    icon: Package,      label: 'Inventario'   },
  { to: '/clientes',      icon: Users,        label: 'Clientes'     },
  { to: '/catalogo',      icon: BookOpen,     label: 'Catálogo'     },
  { to: '/etiquetas',     icon: Barcode,      label: 'Etiquetas de Barras' },
  { to: '/escaner',       icon: Scan,         label: 'Escanear'     },
  { to: '/reportes',      icon: BarChart2,    label: 'Reportes'     },
  { to: '/usuarios',      icon: UserCog,      label: 'Usuarios'     },
  { to: '/informacion',   icon: Info,         label: 'Información'  },
]

const TITLES = {
  '/inventario':    'Inventario',
  '/ventas':        'Punto de venta',
  '/clientes':      'Clientes y créditos',
  '/catalogo':      'Catálogo de productos',
  '/etiquetas':     'Etiquetas de Barras',
  '/escaner':       'Escanear producto',
  '/reportes':      'Reportes',
  '/configuracion': 'Configuración',
  '/usuarios':      'Usuarios',
  '/informacion':   'Información',
}

export default function Layout() {
  const location = useLocation()
  const navigate  = useNavigate()
  const { tenantInfo, session, signOut } = useAuth()

  const [open,  setOpen]  = useState(false)
  const [width, setWidth] = useState(window.innerWidth)
  const [mensajeLogout, setMensajeLogout] = useState(null)
  const [nombreNegocio, setNombreNegocio] = useState('')
  const [logoNegocio,   setLogoNegocio]   = useState(null)

  // ── Configuración (para timeout) ──
  const { config } = useConfiguracion()
  const timeoutActivo  = config?.session_timeout_activo  ?? true
  const timeoutMinutos = config?.session_timeout_minutos ?? 10

  const handleTimeout = async () => {
    await signOut()
  }

  // ── Hook de sesión única ──
  const { conflicto, expulsarSesionAnterior, cederSesion } = useSesionUnica(
    session,
    tenantInfo,
    (mensaje) => setMensajeLogout(mensaje)
  )

  const handleLogoutForzado = async () => {
    setMensajeLogout(null)
    await signOut()
  }

  useEffect(() => {
    const h = () => setWidth(window.innerWidth)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  useEffect(() => { setOpen(false) }, [location.pathname])

  // Poblar caché local y sincronizar al inicio, y refrescar cada 10 minutos
  useEffect(() => {
    if (!tenantInfo?.tenant_id) return

    poblarCacheLocal(tenantInfo.tenant_id)
    syncQueue()

    const interval = setInterval(() => {
      poblarCacheLocal(tenantInfo.tenant_id)
    }, 10 * 60 * 1000)

    return () => clearInterval(interval)
  }, [tenantInfo?.tenant_id])

  // ── Obtener nombre y logo del negocio (más confiable) ──
  // Agregamos mountedRef para evitar doble suscripción
  const configMountedRef = useRef(false)

  useEffect(() => {
    if (!tenantInfo?.tenant_id) return
    if (configMountedRef.current) return
    configMountedRef.current = true

    const tid = tenantInfo.tenant_id

    // Cargar config inicial
    const cargarConfig = async () => {
      const { data, error } = await supabase
        .from('configuracion')
        .select('nombre_tienda, logo_url')
        .eq('tenant_id', tid)
        .single()

      if (data) {
        setNombreNegocio(data.nombre_tienda || tenantInfo.nombre || 'Mi Tienda')
        setLogoNegocio(data.logo_url || null)
      } else if (error && error.code !== 'PGRST116') {
        console.error('Error cargando configuración:', error)
      }
    }

    cargarConfig()

    // Realtime — al detectar cambio, volver a cargar
    const channel = supabase
      .channel(`config-sidebar-${tid}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event:  '*',
          schema: 'public',
          table:  'configuracion',
          filter: `tenant_id=eq.${tid}`,
        },
        () => {
          cargarConfig()
        }
      )
      .subscribe()

    return () => {
      configMountedRef.current = false
      supabase.removeChannel(channel)
    }
  }, [tenantInfo?.tenant_id])

  const isMobile  = width < 768
  const isTablet  = width >= 768 && width < 992
  const collapsed = isTablet
  const title     = TITLES[location.pathname] || 'TiendaPos'
  const esDev     = tenantInfo?.is_admin === true

  const linkStyle = (active) => ({
    display: 'flex',
    alignItems: 'center',
    gap: collapsed ? 0 : '0.625rem',
    justifyContent: collapsed ? 'center' : 'flex-start',
    padding: collapsed ? '0.75rem 0' : '0.625rem 1rem',
    fontSize: T.sm,
    color: active ? C.primary : C.textSecondary,
    background: active ? C.primaryLight : 'transparent',
    fontWeight: active ? 600 : 400,
    borderRadius: '0.5rem',
    margin: '0.125rem 0.5rem',
    transition: 'background 0.15s, color 0.15s',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  })

  const Sidebar = () => (
    <aside style={{
      width: collapsed ? '3.75rem' : '13rem',
      minWidth: collapsed ? '3.75rem' : '13rem',
      height: '100vh',
      background: C.bgWhite,
      borderRight: `1px solid ${C.border}`,
      display: 'flex',
      flexDirection: 'column',
      position: isMobile ? 'fixed' : 'relative',
      top: 0, left: 0, zIndex: 50,
      transform: isMobile && !open ? 'translateX(-100%)' : 'translateX(0)',
      transition: 'transform 0.25s ease',
      overflowY: 'auto',
      overflowX: 'hidden',
    }}>
      {/* Logo y nombre del negocio en el sidebar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.625rem',
        padding: collapsed ? '0.5rem 0' : '0.875rem 1rem',
        borderBottom: `1px solid ${C.border}`,
        justifyContent: collapsed ? 'center' : 'flex-start',
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{
          width: collapsed ? '2rem' : '2.25rem',
          height: collapsed ? '2rem' : '2.25rem',
          borderRadius: '0.5rem',
          overflow: 'hidden',
          flexShrink: 0,
          background: C.primaryLight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {logoNegocio ? (
            <img
              src={logoNegocio}
              alt="Logo"
              key={logoNegocio}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ fontSize: collapsed ? '1rem' : '1.125rem' }}>🏪</span>
          )}
        </div>

        {/* Nombre - solo si no está colapsado */}
        {!collapsed && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: T.sm, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {nombreNegocio || tenantInfo?.nombre || 'Mi Tienda'}
            </div>
            <div style={{ fontSize: T.xs, color: C.textMuted }}>
              Sistema de ventas
            </div>
          </div>
        )}

        {/* Botón cerrar móvil - solo si isMobile */}
        {isMobile && (
          <button onClick={() => setOpen(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textSecondary, padding: '0.25rem', marginLeft: 'auto' }}>
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, paddingTop: '0.5rem' }}>
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} title={collapsed ? label : undefined}
            style={({ isActive }) => linkStyle(isActive)}>
            <Icon size={18} style={{ flexShrink: 0 }} />
            {!collapsed && label}
          </NavLink>
        ))}
      </nav>

      {/* Footer sidebar */}
      <div style={{ borderTop: `1px solid ${C.border}`, paddingBottom: '0.5rem', paddingTop: '0.5rem', flexShrink: 0 }}>
        {/* Configuración */}
        <NavLink to="/configuracion" title={collapsed ? 'Configuración' : undefined}
          style={({ isActive }) => linkStyle(isActive)}>
          <Settings size={18} style={{ flexShrink: 0 }} />
          {!collapsed && 'Configuración'}
        </NavLink>

        {/* Botón volver al panel admin — solo para el desarrollador */}
        {esDev && (
          <button
            onClick={() => navigate('/admin')}
            title={collapsed ? 'Panel Admin' : undefined}
            style={{
              ...linkStyle(false),
              width: '100%',
              background: C.primaryLight,
              color: C.primary,
              border: 'none',
              cursor: 'pointer',
              marginTop: '0.25rem',
              fontWeight: 600,
            }}>
            <Shield size={18} style={{ flexShrink: 0 }} />
            {!collapsed && 'Panel Admin'}
          </button>
        )}

        {/* Info del usuario — centrada */}
        {!collapsed && (
          <div style={{
            margin: '0.5rem 0.5rem 0.25rem',
            padding: '0.625rem 0.75rem',
            background: C.bgMuted,
            borderRadius: '0.5rem',
            textAlign: 'center',
          }}>
            {/* Avatar */}
            <div style={{
              width: '2.25rem',
              height: '2.25rem',
              background: esDev ? C.primary : C.bgWhite,
              border: `2px solid ${esDev ? C.primary : C.border}`,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.375rem',
              fontSize: T.base,
              fontWeight: 700,
              color: esDev ? '#fff' : C.primary,
            }}>
              {esDev
                ? <Shield size={14} />
                : (session?.user?.email?.charAt(0) || '?').toUpperCase()
              }
            </div>

            {/* Nombre */}
            <div style={{
              fontSize: T.xs,
              fontWeight: 700,
              color: C.text,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginBottom: '0.125rem',
            }}>
              {tenantInfo?.rol === 'developer' || esDev
                ? 'Desarrollador'
                : tenantInfo?.nombre_usuario || session?.user?.email?.split('@')[0] || 'Usuario'}
            </div>

            {/* Rol badge */}
            <div style={{
              display: 'inline-block',
              fontSize: '0.625rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              background: esDev ? C.primary : C.primaryLight,
              color: esDev ? '#fff' : C.primary,
              borderRadius: '9999px',
              padding: '0.125rem 0.5rem',
              marginBottom: '0.125rem',
            }}>
              {esDev ? '⚡ Maestro' : (tenantInfo?.rol || 'usuario')}
            </div>

            {/* Email */}
            <div style={{
              fontSize: '0.625rem',
              color: C.textMuted,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {session?.user?.email}
            </div>
          </div>
        )}

        {/* Cerrar sesión */}
        <button onClick={signOut} title={collapsed ? 'Cerrar sesión' : undefined}
          style={{
            ...linkStyle(false),
            color: C.danger,
            width: '100%',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}>
          <LogOut size={18} style={{ flexShrink: 0 }} />
          {!collapsed && 'Cerrar sesión'}
        </button>
      </div>
    </aside>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: C.bg }}>
      {isMobile && open && (
        <div onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 40 }} />
      )}

      <Sidebar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Topbar */}
        <header style={{
          background: C.bgWhite,
          borderBottom: `1px solid ${C.border}`,
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          flexShrink: 0,
        }}>
          <button onClick={() => setOpen(true)} className="show-mobile"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.text, padding: '0.25rem', display: 'none' }}>
            <Menu size={22} />
          </button>
          <span style={{ fontSize: T.md, fontWeight: 700, color: C.text, flex: 1 }}>{title}</span>

          {/* ── Notificaciones de solicitudes ── */}
          <NotificacionesSolicitudes />

          {/* Badge desarrollador en topbar móvil */}
          {esDev && (
            <button onClick={() => navigate('/admin')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', background: C.primaryLight, color: C.primary, border: `1px solid ${C.primaryBorder}`, borderRadius: '0.4375rem', padding: '0.3125rem 0.625rem', fontSize: T.xs, fontWeight: 700, cursor: 'pointer' }}>
              <Shield size={13} /> Admin
            </button>
          )}
        </header>

        {/* Indicador de conexión */}
        <IndicadorConexion />

        {/* Banner advertencia pago */}
        {tenantInfo?.estado === 'advertencia' && (
          <div style={{
            background: '#fef9c3',
            borderBottom: '1px solid #fde68a',
            padding: '0.4375rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.625rem',
            flexShrink: 0,
            flexWrap: 'wrap',
          }}>
            <AlertTriangle size={14} color="#92400e" />
            <span style={{ fontSize: T.xs, fontWeight: 600, color: '#92400e' }}>
              Pago de servicios retrasado —
            </span>
            <span style={{ fontSize: T.xs, color: '#92400e' }}>
              {tenantInfo.dias_restantes > 0
                ? `Tu acceso se deshabilitará en ${tenantInfo.dias_restantes} día${tenantInfo.dias_restantes !== 1 ? 's' : ''} si no realizas el pago.`
                : 'Último día — contacta a soporte hoy.'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: '#92400e', color: '#fff', borderRadius: '9999px', padding: '0.125rem 0.5rem', fontSize: '0.625rem', fontWeight: 700 }}>
              <Clock size={10} /> {tenantInfo.dias_retraso}d de retraso
            </div>
          </div>
        )}

        {/* Contenido principal con footer al final */}
        <main style={{
          flex: 1,
          overflowY: 'auto',
          padding: isMobile ? '0.75rem' : '1.25rem',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <Outlet />

          {/* Footer copyright */}
          <footer style={{
            marginTop: 'auto',
            paddingTop: '1.5rem',
            paddingBottom: '0.5rem',
            textAlign: 'center',
            borderTop: `1px solid ${C.borderLight}`,
          }}>
            <div style={{ fontSize: '0.625rem', color: C.textMuted, lineHeight: 1.7 }}>
              <div style={{ fontWeight: 600, color: C.textSecondary }}>
                TiendaPos v1.0.0
              </div>
              <div>
                © {new Date().getFullYear()} Desarrollado por{' '}
                <span style={{ color: C.primary, fontWeight: 600 }}>
                  Erick Raúl Ramírez Rodríguez
                </span>
                {' '}— Ing. en Ciencias de la Computación
              </div>
              <div style={{ color: C.textMuted }}>
                Todos los derechos reservados · ErTech Solutions
              </div>
            </div>
          </footer>
        </main>
      </div>

      {/* ── Alertas de sesión única ── */}
      <AlertaSesionDuplicada
        conflicto={conflicto}
        onExpulsar={expulsarSesionAnterior}
        onCeder={cederSesion}
      />

      <AlertaLogoutForzado
        mensaje={mensajeLogout}
        onAceptar={handleLogoutForzado}
      />

      {/* ── Alerta de timeout de sesión ── */}
      <AlertaTimeout
        onTimeout={handleTimeout}
        minutos={timeoutMinutos}
        activo={timeoutActivo && !!session}
      />

      <style>{`
        @media (max-width: 767px) { .show-mobile { display: flex !important; } }
      `}</style>
    </div>
  )
}