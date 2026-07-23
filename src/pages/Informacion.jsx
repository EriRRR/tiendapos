import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  Info, Code2, Calendar, Clock, Phone, Mail,
  FileText, RefreshCw, ChevronRight, Shield,
  Star, Wrench, CheckCircle, ExternalLink
} from 'lucide-react'
import { C, T, btn, card } from '../styles/responsive'

const VERSION    = '1.0.0'
const LANZAMIENTO = '2026'

const CHANGELOG = [
  {
    version: '1.0.0',
    fecha:   'Julio 2026',
    tipo:    'lanzamiento',
    cambios: [
      'Lanzamiento oficial de Vendix',
      'Sistema multitenant completo',
      'Punto de venta con carrito y métodos de pago',
      'Gestión de inventario con fotos y atributos',
      'Control de clientes y creditos',
      'Reportes y estadísticas',
      'Panel de administrador',
      'Modo offline con sincronización automática',
      'Escáner QR desde teléfono',
      'Aplicación de escritorio (Electron)',
      'Etiquetas QR configurables',
      'Control de usuarios con roles y permisos',
    ],
  },
]

const MODULOS = [
  { icon: '🏪', nombre: 'Punto de venta',     desc: 'Carrito, métodos de pago, créditos' },
  { icon: '📦', nombre: 'Inventario',          desc: 'Productos, fotos, atributos, stock' },
  { icon: '👥', nombre: 'Clientes',            desc: 'Registro, créditos y abonos' },
  { icon: '📊', nombre: 'Reportes',            desc: 'Ventas, ingresos, estadísticas' },
  { icon: '🏷️', nombre: 'Etiquetas QR',        desc: 'Generación e impresión configurables' },
  { icon: '📱', nombre: 'Escáner remoto',      desc: 'Usa el teléfono como escáner' },
  { icon: '🌐', nombre: 'Catálogo público',    desc: 'Vitrina de productos en línea' },
  { icon: '⚙️', nombre: 'Configuración',       desc: 'Datos del negocio y personalización' },
  { icon: '👤', nombre: 'Usuarios y roles',    desc: 'Control de acceso por cargo' },
  { icon: '📶', nombre: 'Modo offline',        desc: 'Funciona sin internet, sincroniza al volver' },
]

export default function Informacion() {
  const { tenantInfo } = useAuth()
  const navigate = useNavigate()
  const [seccion, setSeccion] = useState('acerca')
  const [diasRestantes, setDiasRestantes] = useState(null)
  const [fechaVence, setFechaVence] = useState(null)

  useEffect(() => {
    // Calcular días hasta el próximo pago basado en tenantInfo
    if (tenantInfo?.dias_restantes !== undefined) {
      setDiasRestantes(tenantInfo.dias_restantes)
    }
  }, [tenantInfo])

  const secciones = [
    { id: 'acerca',        icon: Info,      label: 'Acerca de'         },
    { id: 'modulos',       icon: Star,      label: 'Contenido'         },
    { id: 'pago',          icon: Calendar,  label: 'Mi suscripción'    },
    { id: 'actualizaciones',icon: RefreshCw,label: 'Actualizaciones'   },
    { id: 'terminos',      icon: FileText,  label: 'Términos de uso'   },
    { id: 'ayuda',         icon: Phone,     label: 'Ayuda y contacto'  },
  ]

  const chip = (texto, color = C.primary) => (
    <span style={{ background: color + '22', color, border: `1px solid ${color}44`, borderRadius: '9999px', padding: '0.125rem 0.625rem', fontSize: T.xs, fontWeight: 600 }}>
      {texto}
    </span>
  )

  return (
    <div style={{ maxWidth: '52rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Header de la página */}
      <div style={{ ...card, padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ width: '3.5rem', height: '3.5rem', background: C.primary, borderRadius: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '1.75rem' }}>🏪</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: T.xl, fontWeight: 700, color: C.text }}>Vendix</span>
            {chip(`v${VERSION}`, C.primary)}
            {chip('Activo', C.success)}
          </div>
          <div style={{ fontSize: T.xs, color: C.textMuted, marginTop: '0.25rem' }}>
            Sistema de Punto de Venta para Honduras · {LANZAMIENTO}
          </div>
        </div>
      </div>

      {/* Navegación de secciones */}
      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
        {secciones.map(s => (
          <button key={s.id} onClick={() => setSeccion(s.id)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 0.875rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontSize: T.xs, fontWeight: 600, background: seccion === s.id ? C.primary : C.bgMuted, color: seccion === s.id ? '#fff' : C.textSecondary, transition: 'all 0.15s' }}>
            <s.icon size={13} /> {s.label}
          </button>
        ))}
      </div>

      {/* ── ACERCA DE ── */}
      {seccion === 'acerca' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div style={card}>
            <div style={{ padding: '0.875rem 1rem', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Code2 size={15} color={C.primary} />
              <span style={{ fontSize: T.base, fontWeight: 700, color: C.text }}>Desarrollador y propietario</span>
            </div>
            <div style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ width: '3.5rem', height: '3.5rem', background: C.primaryLight, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1.5rem', fontWeight: 700, color: C.primary }}>
                  E
                </div>
                <div>
                  <div style={{ fontSize: T.base, fontWeight: 700, color: C.text }}>
                    Erick Raúl Ramírez Rodríguez
                  </div>
                  <div style={{ fontSize: T.xs, color: C.textSecondary, marginTop: '0.125rem' }}>
                    Ing. en Ciencias de la Computación
                  </div>
                  <div style={{ fontSize: T.xs, color: C.textMuted }}>
                    UNICAH — Universidad Católica de Honduras · 2026
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[
                  { icon: Mail,  label: 'Correo',  valor: 'erickraulrodriguez1104@gmail.com' },
                  { icon: Shield,label: 'GitHub',  valor: 'github.com/EriRRR' },
                  { icon: Code2, label: 'Empresa', valor: 'ErTech Solutions' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', background: C.bgMuted, borderRadius: '0.5rem', padding: '0.625rem 0.875rem' }}>
                    <item.icon size={14} color={C.primary} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: T.xs, color: C.textSecondary, flexShrink: 0, fontWeight: 600, minWidth: '3.5rem' }}>{item.label}</span>
                    <span style={{ fontSize: T.xs, color: C.text }}>{item.valor}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={card}>
            <div style={{ padding: '0.875rem 1rem', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Info size={15} color={C.primary} />
              <span style={{ fontSize: T.base, fontWeight: 700, color: C.text }}>Sobre Vendix</span>
            </div>
            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              <p style={{ fontSize: T.sm, color: C.textSecondary, lineHeight: 1.7 }}>
                Vendix es un sistema de punto de venta SaaS diseñado específicamente para el mercado hondureño.
                Permite gestionar ventas, inventario, clientes y reportes desde cualquier dispositivo,
                con soporte para trabajar sin conexión a internet.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.25rem' }}>
                {[
                  { label: 'Versión',       valor: VERSION },
                  { label: 'Lanzamiento',   valor: LANZAMIENTO },
                  { label: 'Plataforma',    valor: 'Web + Escritorio' },
                  { label: 'Base de datos', valor: 'Supabase / PostgreSQL' },
                  { label: 'Frontend',      valor: 'React + Vite' },
                  { label: 'Moneda',        valor: 'Lempiras (L)' },
                ].map(item => (
                  <div key={item.label} style={{ background: C.bgMuted, borderRadius: '0.375rem', padding: '0.5rem 0.75rem' }}>
                    <div style={{ fontSize: '0.625rem', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.label}</div>
                    <div style={{ fontSize: T.xs, fontWeight: 600, color: C.text, marginTop: '0.125rem' }}>{item.valor}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MÓDULOS / CONTENIDO ── */}
      {seccion === 'modulos' && (
        <div style={card}>
          <div style={{ padding: '0.875rem 1rem', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Star size={15} color={C.primary} />
            <span style={{ fontSize: T.base, fontWeight: 700, color: C.text }}>Módulos incluidos</span>
          </div>
          <div style={{ padding: '0.5rem' }}>
            {MODULOS.map((m, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 0.875rem', borderBottom: idx < MODULOS.length - 1 ? `1px solid ${C.borderLight}` : 'none' }}>
                <span style={{ fontSize: '1.375rem', flexShrink: 0 }}>{m.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: T.sm, fontWeight: 600, color: C.text }}>{m.nombre}</div>
                  <div style={{ fontSize: T.xs, color: C.textMuted, marginTop: '0.125rem' }}>{m.desc}</div>
                </div>
                <CheckCircle size={15} color={C.success} style={{ flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MI SUSCRIPCIÓN / PAGO ── */}
      {seccion === 'pago' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

          {/* Estado del pago */}
          <div style={{ ...card, overflow: 'hidden' }}>
            <div style={{ padding: '0.875rem 1rem', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={15} color={C.primary} />
              <span style={{ fontSize: T.base, fontWeight: 700, color: C.text }}>Estado de la suscripción</span>
            </div>
            <div style={{ padding: '1.25rem' }}>

              {/* Contador visual */}
              {tenantInfo?.estado === 'activo' && (
                <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.75rem', color: C.textMuted, marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Próximo pago en
                  </div>
                  <div style={{ fontSize: '3rem', fontWeight: 800, color: C.success, lineHeight: 1 }}>
                    {tenantInfo?.dias_restantes ?? '—'}
                  </div>
                  <div style={{ fontSize: T.sm, color: C.textMuted, marginTop: '0.25rem' }}>
                    día{(tenantInfo?.dias_restantes ?? 0) !== 1 ? 's' : ''}
                  </div>

                  {/* Barra de progreso */}
                  {tenantInfo?.dias_restantes !== undefined && (
                    <div style={{ marginTop: '1rem', maxWidth: '20rem', margin: '1rem auto 0' }}>
                      <div style={{ background: C.borderLight, borderRadius: '9999px', height: '0.5rem', overflow: 'hidden' }}>
                        <div style={{
                          background: tenantInfo.dias_restantes <= 5 ? C.danger : tenantInfo.dias_restantes <= 10 ? '#f59e0b' : C.success,
                          height: '100%',
                          width: `${Math.min(100, (tenantInfo.dias_restantes / 30) * 100)}%`,
                          borderRadius: '9999px',
                          transition: 'width 0.5s',
                        }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                        <span style={{ fontSize: '0.625rem', color: C.textMuted }}>Vence pronto</span>
                        <span style={{ fontSize: '0.625rem', color: C.textMuted }}>30 días</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tenantInfo?.estado === 'advertencia' && (
                <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: '0.625rem', padding: '1rem', textAlign: 'center', marginBottom: '1rem' }}>
                  <div style={{ fontSize: T.lg, fontWeight: 700, color: '#92400e' }}>
                    ⚠️ Pago retrasado
                  </div>
                  <div style={{ fontSize: T.sm, color: '#92400e', marginTop: '0.375rem' }}>
                    {tenantInfo.dias_retraso} día{tenantInfo.dias_retraso !== 1 ? 's' : ''} de retraso
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[
                  { label: 'Estado',           valor: tenantInfo?.estado === 'activo' ? '✓ Al día' : tenantInfo?.estado === 'advertencia' ? '⚠ Con retraso' : '✗ Deshabilitado', color: tenantInfo?.estado === 'activo' ? C.success : tenantInfo?.estado === 'advertencia' ? '#92400e' : C.danger },
                  { label: 'Plan',             valor: tenantInfo?.plan || 'Mensual' },
                  { label: 'Días de gracia',   valor: `${tenantInfo?.dias_gracia || 7} días` },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: `1px solid ${C.borderLight}` }}>
                    <span style={{ fontSize: T.xs, color: C.textMuted }}>{item.label}</span>
                    <span style={{ fontSize: T.xs, fontWeight: 600, color: item.color || C.text }}>{item.valor}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Info de contacto para pago */}
          <div style={{ ...card, padding: '1rem' }}>
            <div style={{ fontSize: T.sm, fontWeight: 700, color: C.text, marginBottom: '0.625rem' }}>
              ¿Cómo realizar el pago?
            </div>
            <p style={{ fontSize: T.xs, color: C.textSecondary, lineHeight: 1.7, marginBottom: '0.75rem' }}>
              Para renovar tu suscripción o consultar métodos de pago, contáctame directamente:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <a href="tel:+50400000000"
                style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', background: C.successLight, border: '1px solid #bbf7d0', borderRadius: '0.5rem', padding: '0.625rem 0.875rem', textDecoration: 'none', color: C.success }}>
                <Phone size={14} /> <span style={{ fontSize: T.xs, fontWeight: 600 }}>Llamar o WhatsApp</span>
              </a>
              <a href="mailto:erickraulrodriguez1104@gmail.com"
                style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', background: C.primaryLight, border: `1px solid ${C.primaryBorder}`, borderRadius: '0.5rem', padding: '0.625rem 0.875rem', textDecoration: 'none', color: C.primary }}>
                <Mail size={14} /> <span style={{ fontSize: T.xs, fontWeight: 600 }}>erickraulrodriguez1104@gmail.com</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── ACTUALIZACIONES ── */}
      {seccion === 'actualizaciones' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div style={{ ...card, padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: C.successLight, border: `1px solid #bbf7d0` }}>
            <CheckCircle size={20} color={C.success} style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: T.sm, fontWeight: 700, color: C.success }}>Sistema actualizado</div>
              <div style={{ fontSize: T.xs, color: C.success }}>Estás usando la versión más reciente — v{VERSION}</div>
            </div>
          </div>

          {CHANGELOG.map((entry, idx) => (
            <div key={idx} style={card}>
              <div style={{ padding: '0.875rem 1rem', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <RefreshCw size={15} color={C.primary} />
                  <span style={{ fontSize: T.base, fontWeight: 700, color: C.text }}>v{entry.version}</span>
                  {entry.tipo === 'lanzamiento' && chip('Lanzamiento', C.primary)}
                </div>
                <span style={{ fontSize: T.xs, color: C.textMuted }}>{entry.fecha}</span>
              </div>
              <div style={{ padding: '0.875rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {entry.cambios.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <CheckCircle size={12} color={C.success} style={{ flexShrink: 0, marginTop: '0.125rem' }} />
                    <span style={{ fontSize: T.xs, color: C.textSecondary }}>{c}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── TÉRMINOS DE USO ── */}
      {seccion === 'terminos' && (
        <div style={card}>
          <div style={{ padding: '0.875rem 1rem', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={15} color={C.primary} />
            <span style={{ fontSize: T.base, fontWeight: 700, color: C.text }}>Términos de uso</span>
          </div>
          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              {
                titulo: '1. Licencia de uso',
                texto: 'Vendix es un software desarrollado y propiedad de Erick Raúl Ramírez Rodríguez. El acceso al sistema se otorga mediante una suscripción mensual. La licencia es personal, intransferible y válida únicamente para el negocio registrado.',
              },
              {
                titulo: '2. Propiedad intelectual',
                texto: 'Todo el código fuente, diseño, logotipos y contenido de Vendix son propiedad exclusiva del desarrollador. Queda prohibida la copia, distribución, modificación o uso comercial del software sin autorización expresa por escrito.',
              },
              {
                titulo: '3. Datos del negocio',
                texto: 'Los datos ingresados al sistema (productos, ventas, clientes) son propiedad del cliente. El desarrollador no accede a estos datos salvo para soporte técnico autorizado. Los datos son almacenados de forma segura en servidores de Supabase.',
              },
              {
                titulo: '4. Disponibilidad del servicio',
                texto: 'Se garantiza la disponibilidad del servicio en condiciones normales de operación. El desarrollador no es responsable por interrupciones causadas por terceros (proveedor de hosting, internet del cliente, etc.).',
              },
              {
                titulo: '5. Suspensión del servicio',
                texto: 'El servicio puede suspenderse si el pago mensual no se realiza dentro del período de gracia acordado. El cliente recibirá avisos en el sistema antes de la suspensión.',
              },
              {
                titulo: '6. Soporte técnico',
                texto: 'El soporte técnico se brinda vía WhatsApp y correo electrónico en horario de lunes a viernes. No se garantiza soporte inmediato en días festivos o fines de semana.',
              },
              {
                titulo: '7. Modificaciones',
                texto: 'El desarrollador se reserva el derecho de modificar estos términos con previo aviso de 15 días al cliente. El uso continuo del sistema implica aceptación de los nuevos términos.',
              },
            ].map((s, i) => (
              <div key={i}>
                <div style={{ fontSize: T.sm, fontWeight: 700, color: C.text, marginBottom: '0.375rem' }}>{s.titulo}</div>
                <p style={{ fontSize: T.xs, color: C.textSecondary, lineHeight: 1.7 }}>{s.texto}</p>
              </div>
            ))}

            <div style={{ background: C.bgMuted, borderRadius: '0.5rem', padding: '0.75rem', marginTop: '0.5rem' }}>
              <div style={{ fontSize: T.xs, color: C.textMuted, textAlign: 'center', lineHeight: 1.6 }}>
                Última actualización: Julio 2026<br />
                © {new Date().getFullYear()} Erick Raúl Ramírez Rodríguez — Todos los derechos reservados
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── AYUDA Y CONTACTO ── */}
      {seccion === 'ayuda' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

          <div style={{ ...card, padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
              <Phone size={15} color={C.primary} />
              <span style={{ fontSize: T.base, fontWeight: 700, color: C.text }}>Contacto de soporte</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              <a href="https://wa.me/50400000000"
                target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.625rem', padding: '0.875rem', textDecoration: 'none' }}>
                <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>💬</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: T.sm, fontWeight: 700, color: '#065f46' }}>WhatsApp</div>
                  <div style={{ fontSize: T.xs, color: '#047857' }}>+504 0000-0000</div>
                  <div style={{ fontSize: '0.625rem', color: '#6ee7b7', marginTop: '0.125rem' }}>Respuesta más rápida</div>
                </div>
                <ExternalLink size={14} color="#34d399" />
              </a>

              <a href="mailto:erickraulrodriguez1104@gmail.com"
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: C.primaryLight, border: `1px solid ${C.primaryBorder}`, borderRadius: '0.625rem', padding: '0.875rem', textDecoration: 'none' }}>
                <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>📧</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: T.sm, fontWeight: 700, color: C.primary }}>Correo electrónico</div>
                  <div style={{ fontSize: T.xs, color: C.primary, wordBreak: 'break-all' }}>erickraulrodriguez1104@gmail.com</div>
                  <div style={{ fontSize: '0.625rem', color: C.textMuted, marginTop: '0.125rem' }}>Lunes a viernes</div>
                </div>
                <ExternalLink size={14} color={C.primary} />
              </a>
            </div>
          </div>

          <div style={card}>
            <div style={{ padding: '0.875rem 1rem', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Wrench size={15} color={C.primary} />
              <span style={{ fontSize: T.base, fontWeight: 700, color: C.text }}>Preguntas frecuentes</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {[
                { p: '¿Cómo agrego productos al inventario?', r: 'Ve a Inventario → botón "Nuevo producto". Completa nombre, precio, stock y opcionalmente foto y atributos.' },
                { p: '¿Cómo funciona el modo offline?',       r: 'El sistema guarda los cambios localmente cuando no hay internet y los sincroniza automáticamente al reconectarse.' },
                { p: '¿Puedo usar el sistema en el teléfono?', r: 'Sí. Abre vendix.pages.dev en el navegador del teléfono. También puedes usar el teléfono como escáner QR desde Ventas → Escáner tel.' },
                { p: '¿Cómo imprimo etiquetas?',              r: 'Ve a Etiquetas QR, selecciona los productos, configura el tamaño y presiona Imprimir.' },
                { p: '¿Cómo creo usuarios para mis empleados?', r: 'Ve a Usuarios → Nuevo usuario. Asigna un rol según el acceso que necesitan (Vendedor, Supervisor, etc.).' },
                { p: '¿Qué pasa si no pago a tiempo?',        r: 'Tendrás un período de gracia configurado. Pasado ese tiempo, el acceso se suspende. Contáctame para regularizar.' },
              ].map((faq, i, arr) => (
                <div key={i} style={{ padding: '0.875rem 1rem', borderBottom: i < arr.length - 1 ? `1px solid ${C.borderLight}` : 'none' }}>
                  <div style={{ fontSize: T.xs, fontWeight: 700, color: C.text, marginBottom: '0.25rem' }}>
                    {faq.p}
                  </div>
                  <div style={{ fontSize: T.xs, color: C.textSecondary, lineHeight: 1.6 }}>
                    {faq.r}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...card, padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: T.xs, color: C.textMuted, lineHeight: 1.8 }}>
              <div style={{ fontWeight: 700, color: C.text, marginBottom: '0.25rem' }}>Vendix</div>
              Desarrollado por <strong>Erick Raúl Ramírez Rodríguez</strong><br />
              Ing. en Ciencias de la Computación · UNICAH 2026<br />
              © {new Date().getFullYear()} ErTech Solutions · Todos los derechos reservados
            </div>
          </div>
        </div>
      )}
    </div>
  )
}