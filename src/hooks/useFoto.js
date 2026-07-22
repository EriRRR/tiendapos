import { supabase } from '../lib/supabase'

export function useFoto() {

  // Comprime la imagen en el navegador antes de subir
  // Resultado: ~50-100KB independiente del tamaño original
  const comprimirImagen = (file, maxWidth = 800, calidad = 0.75) => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let w = img.width
        let h = img.height

        // Escalar si es muy grande
        if (w > maxWidth) {
          h = Math.round((h * maxWidth) / w)
          w = maxWidth
        }

        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url)
            if (!blob) { reject(new Error('Error al comprimir imagen')); return }
            resolve(blob)
          },
          'image/jpeg',
          calidad
        )
      }
      img.onerror = () => reject(new Error('Error al cargar imagen'))
      img.src = url
    })
  }

  // Sube foto y devuelve la URL pública
  const subirFoto = async (file, productoId) => {
    // 1. Comprimir
    const blob = await comprimirImagen(file)
    const kb = Math.round(blob.size / 1024)
    console.log(`Foto comprimida: ${kb}KB`)

    // 2. Nombre único por producto
    const ext = 'jpg'
    const path = `${productoId}.${ext}`

    // 3. Subir (upsert para reemplazar si ya existe)
    const { error } = await supabase.storage
      .from('productos-fotos')
      .upload(path, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      })

    if (error) throw new Error(error.message)

    // 4. Obtener URL pública
    const { data } = supabase.storage
      .from('productos-fotos')
      .getPublicUrl(path)

    // Agregar timestamp para invalidar caché del navegador
    return `${data.publicUrl}?t=${Date.now()}`
  }

  const eliminarFoto = async (productoId) => {
    const { error } = await supabase.storage
      .from('productos-fotos')
      .remove([`${productoId}.jpg`])
    if (error) console.warn('No se pudo eliminar foto:', error.message)
  }

  return { subirFoto, eliminarFoto, comprimirImagen }
}