// ¿Estamos dentro de Electron?
export const isElectron = typeof window !== 'undefined' && !!window.electron

// Obtener configuración
export async function getElectronConfig() {
  if (!isElectron) return null
  return window.electron.getConfig()
}

// Determinar modo de conexión
export async function getModo() {
  if (!isElectron) return 'nube'
  const config = await getElectronConfig()
  return config?.modo || 'nube'
}