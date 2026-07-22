import { useState, useMemo } from 'react'

export function usePaginacion(items = [], porPagina = 20) {
  const [pagina, setPagina] = useState(1)

  const totalPaginas = Math.max(1, Math.ceil(items.length / porPagina))

  // Si los items cambian y la página actual ya no existe, volver a la 1
  const paginaActual = Math.min(pagina, totalPaginas)

  const itemsPagina = useMemo(() => {
    const inicio = (paginaActual - 1) * porPagina
    return items.slice(inicio, inicio + porPagina)
  }, [items, paginaActual, porPagina])

  const irA         = (n) => setPagina(Math.max(1, Math.min(n, totalPaginas)))
  const siguiente   = ()  => irA(paginaActual + 1)
  const anterior    = ()  => irA(paginaActual - 1)
  const hayAnterior = paginaActual > 1
  const haySiguiente= paginaActual < totalPaginas

  return {
    itemsPagina,
    pagina: paginaActual,
    totalPaginas,
    total: items.length,
    porPagina,
    irA, siguiente, anterior,
    hayAnterior, haySiguiente,
    setPagina,
  }
}