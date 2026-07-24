import { useState, useEffect, useRef } from 'react'
import { Search, Plus, Minus, Trash2, ShoppingCart, CheckCircle, X, Scan, Barcode, Keyboard, Edit2, User, Smartphone, AlertTriangle, ShieldX, TrendingUp, History, FileX, RotateCcw } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'
import { QRCodeSVG } from 'qrcode.react'
import { useInventario } from '../hooks/useInventario'
import { useVentas } from '../hooks/useVentas'
import { useClientes } from '../hooks/useClientes'
import { useScannerRemoto } from '../hooks/useScannerRemoto'
import { useScannerSession } from '../hooks/useScannerSession'
import { useCredito } from '../hooks/useCredito'
import { isElectron } from '../lib/electronBridge'
import { C, T, btn, card, input } from '../styles/responsive'
import { usePaginacion } from '../hooks/usePaginacion'
import Paginacion from '../components/Paginacion'

export default function Ventas() {
  const { productos, refetch, buscarPorSku } = useInventario()
  const { carrito, total, agregarAlCarrito, quitarDelCarrito, cambiarCantidad, cambiarPrecio, procesarVenta } = useVentas()
  const { clientes, crearCliente, nombreMostrar, buscarClientes } = useClientes()
  const { verificarCredito, verificando } = useCredito()

  const [width, setWidth] = useState(window.innerWidth)
  useEffect(() => {
    const h = () => setWidth(window.innerWidth)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  const isMobile = width < 768

  const [busqueda, setBusqueda]               = useState('')
  const [metodoPago, setMetodoPago]           = useState('efectivo')
  const [procesando, setProcesando]           = useState(false)
  const [ventaExitosa, setVentaExitosa]       = useState(null)
  const [carritoAbierto, setCarritoAbierto]   = useState(false)
  const [modo, setModo]                       = useState('buscar')
  const [editandoPrecio, setEditandoPrecio]   = useState(null)
  const [precioTemp, setPrecioTemp]           = useState('')
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
  const [busquedaCliente, setBusquedaCliente] = useState('')
  const [mostrarDropCliente, setMostrarDropCliente]   = useState(false)
  const [creandoCliente, setCreandoCliente]   = useState(false)
  const [nuevoCliente, setNuevoCliente]       = useState({ nombre: '', apellido: '', apodo: '', telefono: '' })
  const [mensajeCliente, setMensajeCliente]   = useState(null)
  const [scannerActivo, setScannerActivo]     = useState(false)
  const [scannerError, setScannerError]       = useState('')
  const [ultimoEscaneado, setUltimoEscaneado] = useState(null)
  const [scannerRemotoActivo, setScannerRemotoActivo] = useState(false)
  const [ipLocal, setIpLocal]                 = useState('')
  const [tunnelUrl, setTunnelUrl]             = useState('')
  const [estadoCredito, setEstadoCredito]     = useState(null)

  const scannerRef  = useRef(null)
  const cooldownRef = useRef(false)

  // ── Hook para sesión de escáner remoto ──
  const { sessionKey, scannerUrl, cargando, crearSesion, terminarSesion } = useScannerSession()

  const totalItems         = carrito.reduce((s, i) => s + i.cantidad, 0)
  const clientesFiltrados  = buscarClientes(clientes, busquedaCliente)
  const productosFiltrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (p.cod || p.sku || '').toLowerCase().includes(busqueda.toLowerCase())
  )

  // ── Paginación ──
  const pag = usePaginacion(productosFiltrados, 12)

  // ── IP local para escáner remoto (solo referencia) ──
  useEffect(() => {
    if (isElectron && window.electron?.getIPLocal) {
      window.electron.getIPLocal().then(ip => setIpLocal(ip))
    }
  }, [])

  // ── Obtener URL del túnel (solo referencia) ──
  useEffect(() => {
    if (!isElectron || !window.electron) return

    window.electron.getTunnelUrl().then(url => {
      if (url) setTunnelUrl(url)
    })

    const limpiar = window.electron.onTunnelUrl((url) => {
      setTunnelUrl(url)
    })

    return () => { if (limpiar) limpiar() }
  }, [])

  // ── Escáner remoto: recibe códigos del teléfono ──
  const manejarCodigoEscaneado = async (codigo) => {
    const producto = await buscarPorSku(codigo)
    if (producto) {
      if (producto.stock === 0) {
        setUltimoEscaneado({ nombre: producto.nombre, accion: 'agotado', color: C.danger })
      } else {
        agregarAlCarrito(producto)
        setUltimoEscaneado({ nombre: producto.nombre, accion: 'agregado', color: C.success })
      }
    } else {
      setUltimoEscaneado({ nombre: codigo, accion: 'no encontrado', color: C.warning })
    }
    setTimeout(() => setUltimoEscaneado(null), 1500)
  }

  // Pasar la sessionKey al hook de escáner remoto
  useScannerRemoto(manejarCodigoEscaneado, scannerRemotoActivo, sessionKey)

  // ── Efecto para verificar crédito cuando cambia el cliente en modo crédito ──
  useEffect(() => {
    if (metodoPago !== 'credito' || !clienteSeleccionado) {
      setEstadoCredito(null)
      return
    }
    verificarCredito(clienteSeleccionado.id, total).then(setEstadoCredito)
  }, [clienteSeleccionado?.id, metodoPago, total])

  // ── Scanner QR con cámara ──
  const manejarEscaneo = async (sku) => {
    if (cooldownRef.current) return
    cooldownRef.current = true
    await manejarCodigoEscaneado(sku)
    setTimeout(() => { cooldownRef.current = false }, 1500)
  }

  const iniciarScanner = async () => {
    setScannerError('')
    try {
      const scanner = new Html5Qrcode('qr-ventas')
      scannerRef.current = scanner

      const qrboxWidth  = Math.min(window.innerWidth - 48, 500)
      const qrboxHeight = Math.round(qrboxWidth * 0.35)

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 15,
          qrbox: { width: qrboxWidth, height: qrboxHeight },
          formatsToSupport: [
            0,  // QR_CODE
            4,  // CODE_128
            2,  // EAN_13
            3,  // EAN_8
            6,  // CODE_39
            8,  // ITF
            9,  // CODE_93
            10, // CODABAR
            15, // UPC_A
            16, // UPC_E
          ],
        },
        manejarEscaneo,
        () => {}
      )
      setScannerActivo(true)
    } catch {
      setScannerError('No se pudo acceder a la cámara.')
    }
  }

  const detenerScanner = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop() } catch {}
      scannerRef.current = null
    }
    setScannerActivo(false)
    setUltimoEscaneado(null)
  }

  useEffect(() => { if (modo !== 'escanear') detenerScanner() }, [modo])
  useEffect(() => () => { detenerScanner() }, [])

  const confirmarPrecio = (id) => {
    cambiarPrecio(id, precioTemp)
    setEditandoPrecio(null)
    setPrecioTemp('')
  }

  const handleGuardarCliente = async () => {
    if (!nuevoCliente.nombre.trim()) return
    try {
      const c = await crearCliente(nuevoCliente)
      setMensajeCliente({ tipo: 'ok', texto: '✓ Cliente creado correctamente' })
      setTimeout(() => {
        setClienteSeleccionado(c)
        setCreandoCliente(false)
        setNuevoCliente({ nombre: '', apellido: '', apodo: '', telefono: '' })
        setMensajeCliente(null)
        setMostrarDropCliente(false)
      }, 2000)
    } catch (e) {
      setMensajeCliente({ tipo: 'error', texto: `✗ Error: ${e.message}` })
      setTimeout(() => setMensajeCliente(null), 5000)
    }
  }

  const handleCancelarCliente = () => {
    setMensajeCliente({ tipo: 'info', texto: 'ℹ Creación cancelada' })
    setTimeout(() => {
      setCreandoCliente(false)
      setNuevoCliente({ nombre: '', apellido: '', apodo: '', telefono: '' })
      setMensajeCliente(null)
    }, 1500)
  }

  const cobrar = async () => {
    if (carrito.length === 0) return
    if (metodoPago === 'credito' && !clienteSeleccionado) {
      alert('Selecciona un cliente para anotar el crédito.')
      return
    }

    // ── Verificar crédito antes de procesar ──
    if (metodoPago === 'credito' && clienteSeleccionado) {
      const credito = await verificarCredito(clienteSeleccionado.id, total)
      if (credito && !credito.permite) {
        alert(`No se puede procesar el crédito:\n${credito.mensaje}`)
        return
      }
    }

    setProcesando(true)
    try {
      const venta = await procesarVenta(metodoPago, clienteSeleccionado?.id)
      await refetch()
      setVentaExitosa({ ...venta, clienteNombre: clienteSeleccionado ? nombreMostrar(clienteSeleccionado) : null })
      setCarritoAbierto(false)
      setClienteSeleccionado(null)
      setEstadoCredito(null)
      await detenerScanner()
      // Terminar sesión de escáner remoto si estaba activa
      if (sessionKey) {
        terminarSesion()
        setScannerRemotoActivo(false)
      }
    } catch (e) { alert('Error: ' + e.message) }
    setProcesando(false)
  }

  if (ventaExitosa) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '25rem', gap: '1rem', padding: '1.5rem' }}>
      <CheckCircle size={64} color={C.success} />
      <div style={{ fontSize: T.xl, fontWeight: 700, color: C.text }}>
        {ventaExitosa.es_credito ? '¡Crédito registrado!' : '¡Venta completada!'}
      </div>
      <div style={{ fontSize: T.base, color: C.textSecondary, textAlign: 'center' }}>
        #{ventaExitosa.numero_venta} · L {parseFloat(ventaExitosa.total).toFixed(2)}
        {ventaExitosa.clienteNombre && <><br />{ventaExitosa.clienteNombre}</>}
      </div>
      <button onClick={() => setVentaExitosa(null)}
        style={{ ...btn.base, ...btn.primary, marginTop: '0.5rem', padding: '0.625rem 1.5rem' }}>
        Nueva venta
      </button>
    </div>
  )

  const PanelCarrito = () => (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '0.875rem 1rem', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
        <ShoppingCart size={16} color={C.text} />
        <span style={{ fontWeight: 700, fontSize: T.base, flex: 1, color: C.text }}>Venta actual</span>
        {totalItems > 0 && (
          <span style={{ background: C.primary, color: '#fff', borderRadius: '9999px', padding: '0.125rem 0.5rem', fontSize: T.xs, fontWeight: 700 }}>
            {totalItems}
          </span>
        )}
        {carritoAbierto && (
          <button onClick={() => setCarritoAbierto(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, padding: '0.25rem', display: 'flex' }}>
            <X size={18} />
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0.375rem 0' }}>
        {carrito.length === 0 ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: C.textMuted }}>
            <ShoppingCart size={28} style={{ margin: '0 auto 0.5rem', opacity: 0.25 }} />
            <div style={{ fontSize: T.sm }}>Agrega productos</div>
          </div>
        ) : carrito.map(item => (
          <div key={item.id} style={{ padding: '0.625rem 0.875rem', borderBottom: `1px solid ${C.borderLight}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.375rem' }}>
              <div style={{ fontSize: T.xs, fontWeight: 600, lineHeight: 1.35, flex: 1, paddingRight: '0.5rem', color: C.text }}>
                {item.nombre}
              </div>
              <button onClick={() => quitarDelCarrito(item.id)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: C.danger, padding: '0.125rem', display: 'flex' }}>
                <Trash2 size={13} />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.375rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <button onClick={() => cambiarCantidad(item.id, item.cantidad - 1)}
                  style={{ border: `1px solid ${C.border}`, background: C.bgMuted, borderRadius: '0.25rem', width: '1.5rem', height: '1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text }}>
                  <Minus size={10} />
                </button>
                <span style={{ fontSize: T.sm, fontWeight: 700, minWidth: '1.125rem', textAlign: 'center', color: C.text }}>
                  {item.cantidad}
                </span>
                <button onClick={() => cambiarCantidad(item.id, item.cantidad + 1)}
                  disabled={item.cantidad >= item.stock}
                  style={{ border: `1px solid ${C.border}`, background: C.bgMuted, borderRadius: '0.25rem', width: '1.5rem', height: '1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text, opacity: item.cantidad >= item.stock ? 0.4 : 1 }}>
                  <Plus size={10} />
                </button>
              </div>
              {editandoPrecio === item.id ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ fontSize: T.xs, color: C.textMuted }}>L</span>
                  <input autoFocus type="number" value={precioTemp}
                    onChange={e => setPrecioTemp(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') confirmarPrecio(item.id); if (e.key === 'Escape') setEditandoPrecio(null) }}
                    style={{ ...input, width: '3.75rem', padding: '0.1875rem 0.375rem', fontSize: T.xs }} />
                  <button onClick={() => confirmarPrecio(item.id)}
                    style={{ ...btn.base, ...btn.primary, padding: '0.1875rem 0.4375rem', fontSize: T.xs }}>✓</button>
                  <button onClick={() => setEditandoPrecio(null)}
                    style={{ ...btn.base, ...btn.secondary, padding: '0.1875rem 0.4375rem', fontSize: T.xs }}>✗</button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: T.xs, fontWeight: 600, color: C.text, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      L {item.precioPersonalizado.toFixed(2)}
                      {item.precioPersonalizado !== parseFloat(item.precio) && (
                        <span style={{ fontSize: '0.625rem', color: '#f59e0b' }}>✎</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.625rem', color: C.textMuted }}>
                      = L {(item.precioPersonalizado * item.cantidad).toFixed(2)}
                    </div>
                  </div>
                  <button onClick={() => { setEditandoPrecio(item.id); setPrecioTemp(item.precioPersonalizado.toString()) }}
                    style={{ border: `1px solid ${C.border}`, background: C.bgWhite, borderRadius: '0.25rem', padding: '0.1875rem 0.3125rem', cursor: 'pointer', color: C.textMuted, display: 'flex' }}>
                    <Edit2 size={10} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '0.875rem', borderTop: `1px solid ${C.borderLight}`, display: 'flex', flexDirection: 'column', gap: '0.625rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: T.md, fontWeight: 700, color: C.text }}>Total</span>
          <span style={{ fontSize: T.lg, fontWeight: 700, color: C.primary }}>L {total.toFixed(2)}</span>
        </div>
        <div>
          <div style={{ fontSize: T.xs, fontWeight: 700, color: C.textMuted, marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Método de pago
          </div>
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            {[{ val: 'efectivo', label: 'Efectivo' }, { val: 'credito', label: 'Crédito', icon: User }].map(m => (
              <button key={m.val}
                onClick={() => { setMetodoPago(m.val); if (m.val !== 'credito') setClienteSeleccionado(null) }}
                style={{ flex: 1, padding: '0.4375rem 0.25rem', fontSize: T.xs, fontWeight: 600, border: `1px solid ${metodoPago === m.val ? C.primary : C.border}`, background: metodoPago === m.val ? C.primaryLight : C.bgWhite, color: metodoPago === m.val ? C.primary : C.textSecondary, borderRadius: '0.4375rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                {m.icon && <m.icon size={11} />}{m.label}
              </button>
            ))}
          </div>
        </div>

        {metodoPago === 'credito' && (
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: T.xs, fontWeight: 700, color: C.textMuted, marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Cliente *
            </div>
            {clienteSeleccionado ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: C.primaryLight, border: `1px solid ${C.primaryBorder}`, borderRadius: '0.5rem', padding: '0.5rem 0.625rem' }}>
                <User size={13} color={C.primary} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: T.xs, fontWeight: 600, color: '#1e40af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {nombreMostrar(clienteSeleccionado)}
                  </div>
                  {parseFloat(clienteSeleccionado.saldo_pendiente) > 0 && (
                    <div style={{ fontSize: '0.625rem', color: C.danger, fontWeight: 600 }}>
                      Debe: L {parseFloat(clienteSeleccionado.saldo_pendiente).toFixed(2)}
                    </div>
                  )}
                </div>
                <button onClick={() => setClienteSeleccionado(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, display: 'flex' }}>
                  <X size={13} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.375rem' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    value={busquedaCliente}
                    onChange={e => { setBusquedaCliente(e.target.value); setMostrarDropCliente(true) }}
                    onFocus={() => setMostrarDropCliente(true)}
                    placeholder="Buscar cliente..."
                    style={{ ...input, fontSize: T.xs, padding: '0.5rem 0.625rem' }}
                  />
                  {mostrarDropCliente && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: C.bgWhite, border: `1px solid ${C.border}`, borderRadius: '0.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 50, maxHeight: '10rem', overflowY: 'auto', marginTop: '0.25rem' }}>
                      {clientesFiltrados.length === 0
                        ? <div style={{ padding: '0.625rem 0.75rem', fontSize: T.xs, color: C.textMuted }}>Sin resultados</div>
                        : clientesFiltrados.map(c => (
                          <div key={c.id}
                            onClick={() => { setClienteSeleccionado(c); setBusquedaCliente(''); setMostrarDropCliente(false) }}
                            style={{ padding: '0.5625rem 0.75rem', cursor: 'pointer', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                            onMouseEnter={e => e.currentTarget.style.background = C.bgMuted}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <div>
                              <div style={{ fontSize: T.xs, fontWeight: 500, color: C.text }}>{nombreMostrar(c)}</div>
                              {c.telefono && <div style={{ fontSize: '0.625rem', color: C.textMuted }}>{c.telefono}</div>}
                            </div>
                            {parseFloat(c.saldo_pendiente) > 0 && (
                              <span style={{ fontSize: '0.625rem', color: C.danger, fontWeight: 600 }}>
                                L {parseFloat(c.saldo_pendiente).toFixed(2)}
                              </span>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
                <button onClick={() => setCreandoCliente(true)}
                  style={{ ...btn.base, background: C.successLight, color: C.success, border: '1px solid #bbf7d0', padding: '0.5rem 0.75rem', fontSize: T.lg }}>
                  +
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Alerta de crédito ── */}
        {metodoPago === 'credito' && clienteSeleccionado && estadoCredito && (
          <div style={{ marginBottom: '0.5rem' }}>

            {/* BLOQUEADO — no puede comprar */}
            {(!estadoCredito.permite || estadoCredito.razon === 'credito_bloqueado' || estadoCredito.razon === 'credito_desactivado') && (
              <div style={{ background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: '0.625rem', padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldX size={16} color="#f87171" />
                  <span style={{ fontSize: T.sm, fontWeight: 700, color: '#f87171' }}>
                    {estadoCredito.razon === 'credito_bloqueado'    && 'Crédito bloqueado'}
                    {estadoCredito.razon === 'credito_desactivado'  && 'Crédito desactivado'}
                    {estadoCredito.razon === 'limite_excedido'      && 'Límite de crédito excedido'}
                  </span>
                </div>
                <div style={{ fontSize: T.xs, color: '#fca5a5', lineHeight: 1.5 }}>
                  {estadoCredito.mensaje}
                </div>
                {estadoCredito.saldo > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: T.xs, color: '#fca5a5' }}>
                    <span>Deuda actual:</span>
                    <span style={{ fontWeight: 700 }}>L {parseFloat(estadoCredito.saldo).toFixed(2)}</span>
                  </div>
                )}
                {estadoCredito.limite > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: T.xs, color: '#fca5a5' }}>
                    <span>Límite:</span>
                    <span style={{ fontWeight: 700 }}>L {parseFloat(estadoCredito.limite).toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            {/* CUENTA ALTA — puede comprar pero con advertencia */}
            {estadoCredito.permite && estadoCredito.razon === 'cuenta_alta' && (
              <div style={{ background: '#422006', border: '1px solid #92400e', borderRadius: '0.625rem', padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={16} color="#fbbf24" />
                  <span style={{ fontSize: T.sm, fontWeight: 700, color: '#fbbf24' }}>
                    ⚠️ Cuenta alta
                  </span>
                </div>
                <div style={{ fontSize: T.xs, color: '#fbbf24', lineHeight: 1.5 }}>
                  {clienteSeleccionado.nombre} tiene el {Math.round(estadoCredito.porcentaje)}% de su crédito usado
                </div>
                {/* Barra de crédito usado */}
                <div>
                  <div style={{ background: '#92400e', borderRadius: '9999px', height: '0.375rem', overflow: 'hidden' }}>
                    <div style={{ background: estadoCredito.porcentaje >= 100 ? '#f87171' : '#fbbf24', height: '100%', width: `${Math.min(100, estadoCredito.porcentaje)}%`, borderRadius: '9999px', transition: 'width 0.3s' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', fontSize: '0.625rem', color: '#fbbf24' }}>
                    <span>Deuda: L {parseFloat(estadoCredito.saldo).toFixed(2)}</span>
                    <span>Límite: L {parseFloat(estadoCredito.limite).toFixed(2)}</span>
                  </div>
                </div>
                <div style={{ fontSize: T.xs, color: '#fbbf24' }}>
                  Crédito disponible: <strong>L {parseFloat(estadoCredito.disponible).toFixed(2)}</strong>
                </div>
              </div>
            )}

            {/* OK — mostrar resumen de crédito */}
            {estadoCredito.permite && estadoCredito.razon === 'ok' && estadoCredito.saldo > 0 && (
              <div style={{ background: C.successLight, border: '1px solid #bbf7d0', borderRadius: '0.625rem', padding: '0.625rem 0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: T.xs, color: C.success }}>
                  Crédito disponible
                </div>
                <div style={{ fontSize: T.xs, fontWeight: 700, color: C.success }}>
                  L {parseFloat(estadoCredito.disponible || 0).toFixed(2)} de L {parseFloat(estadoCredito.limite || 0).toFixed(2)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Botón cobrar */}
        <button
          onClick={cobrar}
          disabled={carrito.length === 0 || procesando || (metodoPago === 'credito' && !clienteSeleccionado)}
          style={{
            ...btn.base,
            width: '100%',
            padding: '0.6875rem',
            fontSize: T.base,
            fontWeight: 700,
            justifyContent: 'center',
            gap: '0.375rem',
            background: carrito.length === 0 || (metodoPago === 'credito' && !clienteSeleccionado)
              ? C.bgMuted : metodoPago === 'credito' ? '#7c3aed' : C.primary,
            color: carrito.length === 0 || (metodoPago === 'credito' && !clienteSeleccionado)
              ? C.textMuted : '#fff',
            cursor: carrito.length === 0 || (metodoPago === 'credito' && !clienteSeleccionado)
              ? 'not-allowed' : 'pointer',
          }}>
          {metodoPago === 'credito' && <User size={15} />}
          {procesando ? 'Procesando...' : metodoPago === 'credito'
            ? `Anotar crédito L ${total.toFixed(2)}`
            : `Cobrar L ${total.toFixed(2)}`}
        </button>
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        @keyframes fadeInUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideUp  { from { transform:translateY(100%); } to { transform:translateY(0); } }
        @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes scanLine {
          0%   { top: 0%; }
          50%  { top: calc(100% - 2px); }
          100% { top: 0%; }
        }
        .productos-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.625rem;
          overflow-y: auto;
          flex: 1;
          padding-bottom: 0.5rem;
          align-content: start;
        }
        @media (max-width: 1200px) { .productos-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 900px)  { .productos-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 767px)  { .productos-grid { grid-template-columns: repeat(2, 1fr); padding-bottom: 5rem; } }
        @media (max-width: 400px)  { .productos-grid { grid-template-columns: repeat(1, 1fr); } }
        .prod-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 0.625rem;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          cursor: pointer;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .prod-card:hover:not(.agotado) { border-color: #2563eb; box-shadow: 0 2px 10px rgba(37,99,235,0.12); }
        .prod-card.agotado { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 18rem', gap: '1rem', height: isMobile ? 'auto' : 'calc(100vh - 5rem)' }}>

        {/* Panel izquierdo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflow: 'hidden', minHeight: 0 }}>

          {/* Tabs */}
          <div style={{ display: 'flex', background: C.bgWhite, border: `1px solid ${C.border}`, borderRadius: '0.625rem', padding: '0.25rem', gap: '0.25rem', flexShrink: 0 }}>
            {[
              { val: 'buscar',   icon: Keyboard,   label: 'Buscar'       },
              { val: 'escanear', icon: Barcode,    label: 'Escanear cód. barras'  },
              { val: 'remoto',   icon: Smartphone, label: 'Escáner tel.' },
              { val: 'historial', icon: History,   label: 'Historial'    }, // <-- NUEVO TAB
            ].map(t => (
              <button key={t.val} onClick={() => setModo(t.val)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', padding: '0.5rem 0.75rem', borderRadius: '0.4375rem', border: 'none', cursor: 'pointer', fontSize: T.sm, fontWeight: 600, background: modo === t.val ? C.primary : 'transparent', color: modo === t.val ? '#fff' : C.textSecondary }}>
                <t.icon size={15} />{t.label}
              </button>
            ))}
          </div>

          {/* ── Modo buscar ── */}
          {modo === 'buscar' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: C.bgWhite, border: `1px solid ${C.border}`, borderRadius: '0.5rem', padding: '0.5rem 0.75rem', flexShrink: 0 }}>
                <Search size={14} color={C.textMuted} />
                <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                  placeholder="Buscar producto o COD..."
                  style={{ border: 'none', outline: 'none', fontSize: T.sm, width: '100%', background: 'transparent', color: C.text }} />
                {busqueda && (
                  <button onClick={() => setBusqueda('')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, padding: 0, display: 'flex' }}>
                    <X size={14} />
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                <div className="productos-grid">
                  {pag.itemsPagina.map(p => (
                    <div key={p.id}
                      onClick={() => p.stock > 0 && agregarAlCarrito(p)}
                      className={`prod-card${p.stock === 0 ? ' agotado' : ''}`}>
                      {p.foto_url ? (
                        <img src={p.foto_url} alt={p.nombre}
                          style={{ width: '100%', height: '7rem', objectFit: 'cover', display: 'block', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: '100%', height: '7rem', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: '2rem' }}>📦</span>
                        </div>
                      )}
                      <div style={{ padding: '0.625rem 0.75rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, lineHeight: 1.3, color: '#111827', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {p.nombre}
                        </div>
                        {p.marcas?.nombre && (
                          <div style={{ fontSize: '0.6875rem', color: C.textMuted }}>{p.marcas.nombre}</div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.125rem', flexWrap: 'wrap', gap: '0.25rem' }}>
                          <span style={{ fontSize: '0.75rem', color: p.stock === 0 ? C.danger : C.textMuted, fontWeight: p.stock === 0 ? 600 : 400 }}>
                            {p.stock === 0 ? 'Agotado' : `Stock: ${p.stock}`}
                          </span>
                          <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: C.primary }}>
                            L {parseFloat(p.precio).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ─── Paginación ─── */}
                {productosFiltrados.length > 0 && (
                  <Paginacion
                    pagina={pag.pagina}
                    totalPaginas={pag.totalPaginas}
                    total={pag.total}
                    porPagina={12}
                    irA={pag.irA}
                    anterior={pag.anterior}
                    siguiente={pag.siguiente}
                    hayAnterior={pag.hayAnterior}
                    haySiguiente={pag.haySiguiente}
                    label="productos"
                  />
                )}
              </div>
            </>
          )}

          {/* ── Modo escanear ── */}
          {modo === 'escanear' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, overflow: 'hidden' }}>
              <div style={card}>

                {/* Visor rectangular */}
                <div style={{
                  width:        '100%',
                  aspectRatio:  '16 / 6',
                  background:   '#000',
                  borderRadius: '0.625rem 0.625rem 0 0',
                  overflow:     'hidden',
                  position:     'relative',
                  minHeight:    scannerActivo ? '8rem' : 0,
                  transition:   'min-height 0.3s',
                }}>
                  <div id="qr-ventas" style={{ width: '100%', height: '100%' }} />

                  {/* Marco guía */}
                  {scannerActivo && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                      <div style={{ width: '70%', height: '60%', border: '2px solid #34d399', borderRadius: '0.375rem', boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)', position: 'relative' }}>
                        {[
                          { top: -2, left: -2,   borderTop:    '3px solid #34d399', borderLeft:  '3px solid #34d399' },
                          { top: -2, right: -2,  borderTop:    '3px solid #34d399', borderRight: '3px solid #34d399' },
                          { bottom: -2, left: -2,  borderBottom: '3px solid #34d399', borderLeft:  '3px solid #34d399' },
                          { bottom: -2, right: -2, borderBottom: '3px solid #34d399', borderRight: '3px solid #34d399' },
                        ].map((s, i) => (
                          <div key={i} style={{ position: 'absolute', width: '1rem', height: '1rem', ...s }} />
                        ))}
                        <div style={{ position: 'absolute', left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, #34d399, transparent)', boxShadow: '0 0 6px #34d399', animation: 'scanLine 1.5s ease-in-out infinite' }} />
                      </div>
                    </div>
                  )}

                  {/* Feedback último escaneo */}
                  {ultimoEscaneado && (
                    <div style={{ position: 'absolute', bottom: '0.75rem', left: '50%', transform: 'translateX(-50%)', background: ultimoEscaneado.color, color: '#fff', borderRadius: '0.5rem', padding: '0.5rem 1.125rem', fontSize: T.sm, fontWeight: 700, whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', animation: 'fadeInUp 0.15s ease' }}>
                      {ultimoEscaneado.accion === 'agregado'      && `✓ ${ultimoEscaneado.nombre} agregado`}
                      {ultimoEscaneado.accion === 'agotado'       && `✗ ${ultimoEscaneado.nombre} — agotado`}
                      {ultimoEscaneado.accion === 'no encontrado' && `✗ Código no encontrado`}
                    </div>
                  )}
                </div>

                {/* Controles */}
                {!scannerActivo ? (
                  <div style={{ padding: '1.75rem', textAlign: 'center' }}>
                    <Barcode size={36} color={C.textMuted} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
                    <div style={{ fontSize: T.sm, color: C.text, fontWeight: 500, marginBottom: '0.25rem' }}>
                      Escanea el código de barras para agregar al carrito
                    </div>
                    {scannerError && (
                      <div style={{ fontSize: T.xs, color: C.danger, marginBottom: '0.625rem' }}>{scannerError}</div>
                    )}
                    <button onClick={iniciarScanner} style={{ ...btn.base, ...btn.primary, margin: '0 auto' }}>
                      <Scan size={15} /> Activar cámara
                    </button>
                  </div>
                ) : (
                  <div style={{ padding: '0.625rem 0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: T.xs, color: C.success, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <span style={{ width: '0.5rem', height: '0.5rem', background: C.success, borderRadius: '50%', display: 'inline-block', animation: 'pulse 1s infinite' }} />
                      Cámara activa
                    </div>
                    <button onClick={detenerScanner} style={{ ...btn.base, ...btn.danger, padding: '0.3125rem 0.625rem', fontSize: T.xs }}>
                      Detener
                    </button>
                  </div>
                )}
              </div>

              {/* Lista escaneados */}
              {carrito.length > 0 && (
                <div style={{ ...card, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '0.625rem 0.875rem', borderBottom: `1px solid ${C.borderLight}`, fontSize: T.xs, fontWeight: 700, color: C.textSecondary }}>
                    Escaneados ({totalItems} items)
                  </div>
                  <div style={{ overflowY: 'auto', flex: 1 }}>
                    {[...carrito].reverse().map(item => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.875rem', borderBottom: `1px solid ${C.borderLight}` }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: T.xs, fontWeight: 500, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nombre}</div>
                          <div style={{ fontSize: '0.625rem', color: C.textMuted }}>L {item.precioPersonalizado.toFixed(2)} c/u</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <button onClick={() => cambiarCantidad(item.id, item.cantidad - 1)} style={{ border: `1px solid ${C.border}`, background: C.bgMuted, borderRadius: '0.25rem', width: '1.375rem', height: '1.375rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text }}><Minus size={10} /></button>
                          <span style={{ fontSize: T.xs, fontWeight: 700, minWidth: '1rem', textAlign: 'center', color: C.text }}>{item.cantidad}</span>
                          <button onClick={() => cambiarCantidad(item.id, item.cantidad + 1)} disabled={item.cantidad >= item.stock} style={{ border: `1px solid ${C.border}`, background: C.bgMuted, borderRadius: '0.25rem', width: '1.375rem', height: '1.375rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text, opacity: item.cantidad >= item.stock ? 0.4 : 1 }}><Plus size={10} /></button>
                          <span style={{ fontSize: T.xs, fontWeight: 600, minWidth: '3.5rem', textAlign: 'right', color: C.text }}>L {(item.precioPersonalizado * item.cantidad).toFixed(2)}</span>
                          <button onClick={() => quitarDelCarrito(item.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: C.danger, display: 'flex' }}><Trash2 size={12} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Modo escáner remoto ── */}
          {modo === 'remoto' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', flex: 1, overflow: 'hidden' }}>
              <div style={{ ...card, padding: '1.25rem', flexShrink: 0 }}>
                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.375rem' }}>📱</div>
                  <div style={{ fontSize: T.base, fontWeight: 700, color: C.text }}>
                    Escáner por teléfono
                  </div>
                  <div style={{ fontSize: T.xs, color: C.textMuted, marginTop: '0.25rem' }}>
                    Escanea el QR con el teléfono para abrir el escáner
                  </div>
                </div>

                {!sessionKey ? (
                  <button
                    onClick={async () => {
                      await crearSesion()
                      setScannerRemotoActivo(true)
                    }}
                    disabled={cargando}
                    style={{ ...btn.base, ...btn.primary, width: '100%', justifyContent: 'center', padding: '0.875rem', fontWeight: 700, opacity: cargando ? 0.7 : 1 }}>
                    {cargando ? 'Generando QR...' : '▶ Iniciar escáner remoto'}
                  </button>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
                      <div style={{ background: '#fff', padding: '0.75rem', borderRadius: '0.75rem' }}>
                        <QRCodeSVG
                          value={scannerUrl}
                          size={160}
                          bgColor="#ffffff"
                          fgColor="#0f172a"
                        />
                      </div>
                    </div>

                    <div style={{ background: C.bgMuted, borderRadius: '0.5rem', padding: '0.625rem', textAlign: 'center', marginBottom: '0.875rem' }}>
                      <div style={{ fontSize: T.xs, color: C.textMuted, marginBottom: '0.25rem' }}>
                        O abre esta URL en el teléfono:
                      </div>
                      <div style={{ fontFamily: 'monospace', fontSize: T.xs, color: C.primary, wordBreak: 'break-all' }}>
                        {scannerUrl}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: C.success, fontSize: T.sm, fontWeight: 600, marginBottom: '0.875rem' }}>
                      <span style={{ width: '0.5rem', height: '0.5rem', background: C.success, borderRadius: '50%', display: 'inline-block', animation: 'pulse 1s infinite' }} />
                      Esperando escaneos...
                    </div>

                    <button
                      onClick={() => { terminarSesion(); setScannerRemotoActivo(false) }}
                      style={{ ...btn.base, background: C.dangerLight, color: C.danger, border: `1px solid ${C.dangerBorder}`, width: '100%', justifyContent: 'center', padding: '0.625rem', fontWeight: 700 }}>
                      ⏹ Detener escáner remoto
                    </button>
                  </>
                )}
              </div>

              {ultimoEscaneado && (
                <div style={{ background: ultimoEscaneado.color, color: '#fff', borderRadius: '0.625rem', padding: '0.875rem', textAlign: 'center', fontWeight: 700, fontSize: T.base }}>
                  {ultimoEscaneado.accion === 'agregado'      && `✓ ${ultimoEscaneado.nombre} agregado al carrito`}
                  {ultimoEscaneado.accion === 'agotado'       && `✗ ${ultimoEscaneado.nombre} — agotado`}
                  {ultimoEscaneado.accion === 'no encontrado' && `✗ Código no encontrado`}
                </div>
              )}

              {carrito.length > 0 && (
                <div style={{ ...card, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '0.625rem 0.875rem', borderBottom: `1px solid ${C.borderLight}`, fontSize: T.xs, fontWeight: 700, color: C.textSecondary, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Carrito ({totalItems} items)</span>
                    <span style={{ color: C.primary }}>L {total.toFixed(2)}</span>
                  </div>
                  <div style={{ overflowY: 'auto', flex: 1 }}>
                    {[...carrito].reverse().map(item => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.625rem 0.875rem', borderBottom: `1px solid ${C.borderLight}` }}>
                        {item.foto_url && <img src={item.foto_url} alt={item.nombre} style={{ width: '2rem', height: '2rem', objectFit: 'cover', borderRadius: '0.25rem', flexShrink: 0 }} />}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: T.xs, fontWeight: 500, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nombre}</div>
                          <div style={{ fontSize: '0.625rem', color: C.textMuted }}>L {item.precioPersonalizado.toFixed(2)} × {item.cantidad}</div>
                        </div>
                        <span style={{ fontSize: T.xs, fontWeight: 700, color: C.text, flexShrink: 0 }}>
                          L {(item.precioPersonalizado * item.cantidad).toFixed(2)}
                        </span>
                        <button onClick={() => quitarDelCarrito(item.id)}
                          style={{ border: 'none', background: 'none', cursor: 'pointer', color: C.danger, display: 'flex' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Modo historial (NUEVO) ── */}
          {modo === 'historial' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', flex: 1, overflow: 'hidden' }}>
              <div style={{ ...card, padding: '1.5rem', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <History size={48} color={C.textMuted} style={{ marginBottom: '0.75rem', opacity: 0.3 }} />
                <div style={{ fontSize: T.lg, fontWeight: 700, color: C.text, marginBottom: '0.25rem' }}>
                  Historial de ventas
                </div>
                <div style={{ fontSize: T.sm, color: C.textMuted }}>
                  Esta sección mostrará el resumen de todas las ventas realizadas.
                  <br />
                  <span style={{ fontSize: T.xs, color: C.textMuted, opacity: 0.7 }}>Próximamente podrás filtrar por fechas, clientes y más.</span>
                </div>
                {/* Placeholder de ejemplo */}
                <div style={{ marginTop: '1.5rem', width: '100%', maxWidth: '30rem', background: C.bgMuted, borderRadius: '0.5rem', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${C.borderLight}`, paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: T.xs, fontWeight: 600, color: C.textMuted }}>#Venta</span>
                    <span style={{ fontSize: T.xs, fontWeight: 600, color: C.textMuted }}>Total</span>
                  </div>
                  <div style={{ color: C.textMuted, fontSize: T.xs, padding: '0.5rem 0' }}>
                    <FileX size={20} style={{ margin: '0 auto 0.25rem', opacity: 0.3 }} />
                    No hay ventas registradas aún.
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Carrito desktop */}
        {!isMobile && (
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <PanelCarrito />
          </div>
        )}
      </div>

      {/* FAB móvil */}
      {isMobile && (
        <button onClick={() => setCarritoAbierto(true)}
          style={{ position: 'fixed', bottom: '1.25rem', right: '1.25rem', zIndex: 30, background: C.primary, color: '#fff', border: 'none', borderRadius: '50%', width: '3.625rem', height: '3.625rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(37,99,235,0.4)', cursor: 'pointer' }}>
          <ShoppingCart size={22} />
          {totalItems > 0 && (
            <span style={{ position: 'absolute', top: '0.25rem', right: '0.25rem', background: C.danger, color: '#fff', borderRadius: '50%', width: '1.125rem', height: '1.125rem', fontSize: '0.625rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {totalItems}
            </span>
          )}
        </button>
      )}

      {/* Carrito móvil */}
      {isMobile && carritoAbierto && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setCarritoAbierto(false) }}>
          <div style={{ background: C.bgWhite, borderRadius: '1rem 1rem 0 0', width: '100%', maxWidth: '30rem', height: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'slideUp 0.25s ease' }}>
            <PanelCarrito />
          </div>
        </div>
      )}

      {/* Modal crear cliente */}
      {creandoCliente && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }}>
          <div style={{ background: C.bgWhite, borderRadius: '0.75rem', padding: isMobile ? '1rem' : '1.25rem', width: '100%', maxWidth: '25rem', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            {mensajeCliente && (
              <div style={{ marginBottom: '0.875rem', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', fontSize: T.sm, fontWeight: 600, background: mensajeCliente.tipo === 'ok' ? C.successLight : mensajeCliente.tipo === 'error' ? C.dangerLight : '#fefce8', color: mensajeCliente.tipo === 'ok' ? C.success : mensajeCliente.tipo === 'error' ? C.danger : '#92400e', border: `1px solid ${mensajeCliente.tipo === 'ok' ? '#bbf7d0' : mensajeCliente.tipo === 'error' ? C.dangerBorder : '#fde68a'}` }}>
                {mensajeCliente.texto}
              </div>
            )}
            <h3 style={{ fontSize: T.base, fontWeight: 700, marginBottom: '0.875rem', color: C.text }}>Nuevo cliente</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginBottom: '0.75rem' }}>
              {[
                { k: 'nombre',   label: 'Nombre *',  ph: 'Ej: María'  },
                { k: 'apellido', label: 'Apellido',   ph: 'Ej: García' },
                { k: 'apodo',    label: 'Apodo',      ph: '"La Chela"' },
                { k: 'telefono', label: 'Teléfono',   ph: '+504...'    },
              ].map(f => (
                <div key={f.k}>
                  <label style={{ fontSize: T.xs, color: C.textSecondary, display: 'block', marginBottom: '0.25rem' }}>{f.label}</label>
                  <input value={nuevoCliente[f.k]} onChange={e => setNuevoCliente(p => ({ ...p, [f.k]: e.target.value }))}
                    placeholder={f.ph} style={{ ...input, fontSize: T.xs, padding: '0.5rem 0.625rem' }} />
                </div>
              ))}
            </div>
            {nuevoCliente.nombre && (
              <div style={{ marginBottom: '0.875rem', padding: '0.4375rem 0.625rem', background: C.bgMuted, borderRadius: '0.4375rem', fontSize: T.xs, color: C.textMuted }}>
                Se mostrará como: <strong style={{ color: C.text }}>
                  {[nuevoCliente.nombre, nuevoCliente.apellido].filter(Boolean).join(' ')}
                  {nuevoCliente.apodo ? ` "${nuevoCliente.apodo}"` : ''}
                </strong>
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={handleGuardarCliente} disabled={!nuevoCliente.nombre.trim()}
                style={{ ...btn.base, ...btn.primary, flex: 1, justifyContent: 'center', opacity: !nuevoCliente.nombre.trim() ? 0.5 : 1 }}>
                Guardar cliente
              </button>
              <button onClick={handleCancelarCliente} style={{ ...btn.base, ...btn.secondary }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}