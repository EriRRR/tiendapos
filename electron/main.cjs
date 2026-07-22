const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path   = require('path')
const fs     = require('fs')
const { spawn } = require('child_process')
const http   = require('http')
const { WebSocketServer } = require('ws')
const os     = require('os')

// ── Store compartido ──────────────────────────────────────────────
const store = require('./store.cjs')

const isDev = !app.isPackaged

// Cargar el módulo de BD local (ya usa el store)
require('./db-local.cjs')

let mainWindow = null

// ─── Variables para el túnel ──────────────────────────────────────────
let tunnelProcess = null
let tunnelUrl     = null

// ─── Obtener IP local ──────────────────────────────────────────────────
function obtenerIPLocal() {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address
      }
    }
  }
  return '127.0.0.1'
}

// ─── Servidor WebSocket para el escáner del teléfono ─────────────────
let httpServer = null
let wss        = null
const SCANNER_PORT = 3001
const scannerClients = new Set()

function iniciarServidorEscaner() {
  httpServer = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(paginaEscaner())
  })

  wss = new WebSocketServer({ server: httpServer })

  wss.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress
    console.log(`[Scanner] Teléfono conectado: ${ip}`)
    scannerClients.add(ws)

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString())
        if (msg.tipo === 'scan' && msg.codigo) {
          console.log(`[Scanner] Código escaneado: ${msg.codigo}`)
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('scanner-codigo', msg.codigo)
          }
          ws.send(JSON.stringify({ tipo: 'ok', codigo: msg.codigo }))
        }
      } catch (e) {
        console.error('[Scanner] Error procesando mensaje:', e.message)
      }
    })

    ws.on('close', () => {
      console.log('[Scanner] Teléfono desconectado')
      scannerClients.delete(ws)
    })

    ws.on('error', () => {
      scannerClients.delete(ws)
    })

    ws.send(JSON.stringify({
      tipo:    'conectado',
      mensaje: 'Escáner conectado a TiendaPos',
    }))
  })

  httpServer.listen(SCANNER_PORT, '0.0.0.0', () => {
    console.log(`[Scanner] Servidor escucha en puerto ${SCANNER_PORT}`)
  })
}

function detenerServidorEscaner() {
  if (wss)        { wss.close();        wss = null }
  if (httpServer) { httpServer.close(); httpServer = null }
}

// ─── Túnel Cloudflare ──────────────────────────────────────────────────
function iniciarTunnel() {
  return new Promise((resolve) => {
    const cloudflaredPath = isDev
      ? path.join(__dirname, '../cloudflared.exe')
      : path.join(process.resourcesPath, 'cloudflared.exe')

    if (!fs.existsSync(cloudflaredPath)) {
      console.log('[Tunnel] cloudflared.exe no encontrado — sin túnel')
      resolve(null)
      return
    }

    tunnelProcess = spawn(cloudflaredPath, [
      'tunnel', '--url', `http://localhost:${SCANNER_PORT}`,
      '--no-autoupdate'
    ])

    tunnelProcess.stderr.on('data', (data) => {
      const texto = data.toString()
      const match = texto.match(/https:\/\/[a-z0-9\-]+\.trycloudflare\.com/)
      if (match && !tunnelUrl) {
        tunnelUrl = match[0]
        console.log(`[Tunnel] URL pública: ${tunnelUrl}`)
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('tunnel-url', tunnelUrl)
        }
        resolve(tunnelUrl)
      }
    })

    tunnelProcess.on('close', () => {
      console.log('[Tunnel] Proceso cerrado')
      tunnelProcess = null
      tunnelUrl     = null
    })

    setTimeout(() => resolve(null), 15000)
  })
}

function detenerTunnel() {
  if (tunnelProcess) {
    tunnelProcess.kill()
    tunnelProcess = null
    tunnelUrl     = null
  }
}

// ─── Página HTML del escáner (completa, igual a la que ya tenías) ──
function paginaEscaner() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>TiendaPos Escáner</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{
      font-family:-apple-system,BlinkMacSystemFont,sans-serif;
      background:#0f172a;color:#f1f5f9;
      min-height:100vh;display:flex;flex-direction:column;
      align-items:center;justify-content:center;
      padding:1rem;gap:.875rem;
    }
    h1{font-size:1.25rem;font-weight:700;color:#60a5fa;text-align:center}
    .badge{
      padding:.5rem 1.5rem;border-radius:9999px;
      font-size:.875rem;font-weight:600;
      background:#1e293b;color:#94a3b8;
      transition:all .25s;text-align:center;
      width:100%;max-width:340px;
    }
    .badge.ok   {background:#052e16;color:#34d399}
    .badge.err  {background:#450a0a;color:#f87171}
    .badge.scan {background:#1e3a5f;color:#60a5fa}
    /* Visor cámara */
    #visor{
      width:100%;max-width:340px;
      border-radius:1rem;overflow:hidden;
      background:#000;position:relative;
      border:3px solid #334155;
      display:none;
    }
    video{width:100%;display:block;max-height:340px;object-fit:cover}
    /* Línea de escaneo animada */
    .scan-line{
      position:absolute;top:0;left:0;right:0;
      height:3px;background:#34d399;
      box-shadow:0 0 8px #34d399;
      animation:scanAnim 2s ease-in-out infinite;
    }
    @keyframes scanAnim{
      0%{top:10%}50%{top:85%}100%{top:10%}
    }
    /* Marco de guía */
    .guide{
      position:absolute;top:50%;left:50%;
      transform:translate(-50%,-50%);
      width:65%;aspect-ratio:1;
      border:2px solid rgba(52,211,153,.6);
      border-radius:.5rem;
    }
    /* Botón grande */
    .btn-main{
      background:#2563eb;color:#fff;border:none;
      border-radius:1rem;padding:1.25rem;
      font-size:1.0625rem;font-weight:700;
      cursor:pointer;width:100%;max-width:340px;
      display:flex;align-items:center;justify-content:center;
      gap:.625rem;transition:transform .15s,background .15s;
    }
    .btn-main:active{transform:scale(.97)}
    .btn-main.danger{background:#7f1d1d;color:#fca5a5}
    .btn-main .icon{font-size:1.375rem}
    /* Feedback */
    .fb{
      width:100%;max-width:340px;
      border-radius:.75rem;padding:.875rem;
      font-size:.9375rem;font-weight:700;
      text-align:center;display:none;
    }
    /* Historial */
    .hist{
      width:100%;max-width:340px;
      display:flex;flex-direction:column;gap:.25rem;
      max-height:9rem;overflow-y:auto;
    }
    .item{
      background:#1e293b;border-radius:.5rem;
      padding:.4rem .75rem;display:flex;
      align-items:center;gap:.5rem;
    }
    .cod{color:#60a5fa;font-family:monospace;font-size:.8125rem;flex:1;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .hora{color:#475569;font-size:.6875rem;flex-shrink:0}
    .nota{
      font-size:.75rem;color:#475569;
      text-align:center;max-width:340px;
      line-height:1.5;
    }
  </style>
</head>
<body>
  <h1>📦 TiendaPos</h1>
  <div class="badge" id="badge">Conectando con la PC...</div>

  <!-- Visor cámara continua -->
  <div id="visor">
    <video id="vid" autoplay playsinline muted></video>
    <div class="scan-line"></div>
    <div class="guide"></div>
  </div>

  <!-- Botón principal -->
  <button class="btn-main" id="btnPrincipal" onclick="toggleCamara()">
    <span class="icon">📷</span> Activar escáner
  </button>

  <!-- Feedback -->
  <div class="fb" id="fb"></div>

  <!-- Historial de escaneos -->
  <div class="hist" id="hist"></div>

  <p class="nota" id="nota"></p>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js"></script>
  <script>
    // ── WebSocket ────────────────────────────────────────────────────
    const WS_URL = 'ws://' + location.host
    let ws = null, hist = [], scanning = false, stream = null
    const $badge = document.getElementById('badge')
    const $visor = document.getElementById('visor')
    const $vid   = document.getElementById('vid')
    const $btn   = document.getElementById('btnPrincipal')
    const $fb    = document.getElementById('fb')
    const $nota  = document.getElementById('nota')

    function badge(t, c) { $badge.textContent = t; $badge.className = 'badge ' + (c||'') }

    function conectar() {
      ws = new WebSocket(WS_URL)
      ws.onopen    = () => badge('✓ Conectado a la PC', 'ok')
      ws.onclose   = () => { badge('Sin conexión — reintentando...', ''); setTimeout(conectar, 2000) }
      ws.onerror   = () => {}
      ws.onmessage = (e) => {
        try {
          const m = JSON.parse(e.data)
          if (m.tipo === 'ok') {
            badge('✓ Conectado', 'ok')
            mostrarFb('✓ ' + m.codigo + ' — agregado al carrito', '#052e16', '#34d399')
            if (navigator.vibrate) navigator.vibrate([60, 30, 60])
          }
        } catch {}
      }
    }

    function enviar(codigo) {
      if (!ws || ws.readyState !== 1) return
      const u = hist[hist.length - 1]
      if (u && u.c === codigo && Date.now() - u.t < 2000) return
      ws.send(JSON.stringify({ tipo: 'scan', codigo }))
      badge('Enviando...', 'scan')
      hist.push({ c: codigo, t: Date.now() })
      if (hist.length > 15) hist.shift()
      renderHist()
    }

    function renderHist() {
      document.getElementById('hist').innerHTML = [...hist].reverse().map(h => {
        const hora = new Date(h.t).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        return '<div class="item"><span class="cod">' + h.c + '</span><span class="hora">' + hora + '</span></div>'
      }).join('')
    }

    // ── Cámara ───────────────────────────────────────────────────────
    async function toggleCamara() {
      if (scanning) {
        detener()
      } else {
        await iniciar()
      }
    }

    async function iniciar() {
      badge('Solicitando cámara...', 'scan')
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        mostrarFb('⚠️ Tu navegador no expone la cámara en HTTP. Prueba: chrome://flags/#unsafely-treat-insecure-origin-as-secure', '#450a0a', '#f87171')
        badge('Cámara bloqueada por HTTP', 'err')
        return
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        })
        $vid.srcObject = stream
        $visor.style.display = 'block'
        $btn.innerHTML = '<span class="icon">⏹</span> Detener escáner'
        $btn.className = 'btn-main danger'
        scanning = true
        $nota.textContent = ''

        if ('BarcodeDetector' in window) {
          badge('✓ Escáner activo', 'ok')
          loopBarcodeDetector()
        } else {
          badge('✓ Escáner activo', 'ok')
          loopJsQR()
        }
      } catch (e) {
        badge('Error: ' + e.name, 'err')
        mostrarFb('Error de cámara: ' + e.message, '#450a0a', '#f87171')
        console.error('getUserMedia error:', e)
      }
    }

    function crearInputFoto() {
      const inp = document.createElement('input')
      inp.type = 'file'
      inp.accept = 'image/*'
      inp.capture = 'environment'
      inp.id = 'inputFoto'
      inp.style.display = 'none'
      inp.onchange = procesarFoto
      document.body.appendChild(inp)
      return inp
    }

    async function procesarFoto(e) {
      const file = e.target.files[0]
      if (!file) return
      badge('Procesando...', 'scan')
      const img = new Image()
      img.onload = () => {
        const c = document.createElement('canvas')
        c.width = img.width; c.height = img.height
        const ctx = c.getContext('2d')
        ctx.drawImage(img, 0, 0)
        const data = ctx.getImageData(0, 0, c.width, c.height)
        const qr   = jsQR(data.data, data.width, data.height, { inversionAttempts: 'attemptBoth' })
        if (qr?.data) {
          enviar(qr.data)
        } else {
          mostrarFb('QR no detectado — acércate más', '#450a0a', '#f87171')
          badge('✓ Conectado', 'ok')
        }
        e.target.value = ''
      }
      img.src = URL.createObjectURL(file)
    }

    function detener() {
      scanning = false
      if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null }
      $vid.srcObject = null
      $visor.style.display = 'none'
      $btn.innerHTML = '<span class="icon">📷</span> Activar escáner'
      $btn.className = 'btn-main'
      $btn.onclick = toggleCamara
      badge('✓ Conectado', 'ok')
    }

    // ── Loop con BarcodeDetector ─────────────────────────────────────
    async function loopBarcodeDetector() {
      const detector = new BarcodeDetector({ formats: ['qr_code', 'code_128', 'ean_13', 'ean_8', 'code_39', 'upc_a', 'upc_e'] })
      while (scanning) {
        try {
          if ($vid.readyState === $vid.HAVE_ENOUGH_DATA) {
            const codes = await detector.detect($vid)
            if (codes.length > 0) enviar(codes[0].rawValue)
          }
        } catch {}
        await new Promise(r => setTimeout(r, 200))
      }
    }

    // ── Loop con jsQR ────────────────────────────────────────────────
    function loopJsQR() {
      if (!scanning) return
      requestAnimationFrame(() => {
        if ($vid.readyState === $vid.HAVE_ENOUGH_DATA) {
          const c = document.createElement('canvas')
          c.width = $vid.videoWidth; c.height = $vid.videoHeight
          const ctx = c.getContext('2d')
          ctx.drawImage($vid, 0, 0)
          const d  = ctx.getImageData(0, 0, c.width, c.height)
          const qr = jsQR(d.data, d.width, d.height, { inversionAttempts: 'dontInvert' })
          if (qr?.data) enviar(qr.data)
        }
        if (scanning) setTimeout(loopJsQR, 150)
      })
    }

    // ── Feedback ──────────────────────────────────────────────────────
    function mostrarFb(texto, bg, color) {
      $fb.textContent      = texto
      $fb.style.background = bg
      $fb.style.color      = color
      $fb.style.display    = 'block'
      setTimeout(() => $fb.style.display = 'none', 2500)
    }

    conectar()
  </script>
</body>
</html>`
}

// ─── Creación de la ventana ────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width:    1280,
    height:   800,
    minWidth:  900,
    minHeight: 600,
    webPreferences: {
      preload:          path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration:  false,
      webSecurity:      false,
    },
    icon: isDev
      ? path.join(__dirname, '../public/icon.ico')
      : path.join(process.resourcesPath, 'app/public/icon.ico'),
    show: false,
    titleBarStyle: 'default',
    title: 'TiendaPos',
  })

  const devUrl    = 'http://localhost:5173'
  const indexPath = path.join(__dirname, '../dist/index.html')

  if (isDev) {
    mainWindow.loadURL(devUrl).catch(() => {
      console.warn('[Main] No se pudo conectar a Vite, cargando dist/index.html')
      mainWindow.loadFile(indexPath).catch(err => {
        console.error('[Main] Error cargando index.html:', err)
        mostrarError(mainWindow, 'No se pudo cargar la aplicación.')
      })
    })
  } else {
    mainWindow.loadFile(indexPath).catch(err => {
      console.error('[Main] Error cargando index.html:', err)
      mostrarError(mainWindow, 'Error al cargar la aplicación. Reinstala o contacta soporte.')
    })
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    mainWindow.maximize()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('[Main] did-fail-load:', errorCode, errorDescription)
    if (!isDev) {
      mostrarError(mainWindow, `Error al cargar: ${errorDescription} (código ${errorCode})`)
    }
  })
}

function mostrarError(win, mensaje) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><title>Error</title>
    <style>
      body { font-family: sans-serif; background: #f8f9fa; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
      .card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); max-width: 500px; text-align: center; }
      h1 { color: #dc3545; }
      p { color: #6c757d; }
    </style>
    </head>
    <body>
      <div class="card">
        <h1>⚠️ Error</h1>
        <p>${mensaje}</p>
        <p style="font-size:0.9rem; margin-top:1rem;">Reinicia la aplicación o contacta al soporte.</p>
      </div>
    </body>
    </html>
  `
  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
}

// ─── Eventos de la aplicación ──────────────────────────────────────
app.whenReady().then(async () => {
  iniciarServidorEscaner()
  iniciarTunnel()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  detenerTunnel()
  detenerServidorEscaner()
  if (process.platform !== 'darwin') app.quit()
})

// ─── IPC handlers ────────────────────────────────────────────────────
ipcMain.handle('get-config', () => ({
  modo:         store.get('modo',         'nube'),
  db_host:      store.get('db_host',      'localhost'),
  db_port:      store.get('db_port',      5432),
  db_name:      store.get('db_name',      'tiendapos'),
  db_user:      store.get('db_user',      'postgres'),
  db_password:  store.get('db_password',  ''),
  supabase_url: store.get('supabase_url', ''),
  supabase_key: store.get('supabase_key', ''),
}))

ipcMain.handle('set-config', (_, config) => {
  Object.entries(config).forEach(([k, v]) => store.set(k, v))
  return { ok: true }
})

ipcMain.handle('get-app-info', () => ({
  version:    app.getVersion(),
  platform:   process.platform,
  isElectron: true,
}))

ipcMain.handle('get-ip-local', () => obtenerIPLocal())
ipcMain.handle('get-tunnel-url', () => tunnelUrl)