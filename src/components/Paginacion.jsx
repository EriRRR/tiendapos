import { ChevronLeft, ChevronRight } from 'lucide-react'
import { C, T, btn } from '../styles/responsive'

export default function Paginacion({
  pagina, totalPaginas, total, porPagina,
  irA, anterior, siguiente,
  hayAnterior, haySiguiente,
  label = 'registros',
}) {
  if (totalPaginas <= 1) return null

  const inicio = (pagina - 1) * porPagina + 1
  const fin    = Math.min(pagina * porPagina, total)

  // Generar páginas visibles (máx 5)
  const paginas = []
  if (totalPaginas <= 5) {
    for (let i = 1; i <= totalPaginas; i++) paginas.push(i)
  } else {
    if (pagina <= 3) {
      paginas.push(1, 2, 3, 4, '...', totalPaginas)
    } else if (pagina >= totalPaginas - 2) {
      paginas.push(1, '...', totalPaginas - 3, totalPaginas - 2, totalPaginas - 1, totalPaginas)
    } else {
      paginas.push(1, '...', pagina - 1, pagina, pagina + 1, '...', totalPaginas)
    }
  }

  const btnPag = (activo) => ({
    ...btn.base,
    minWidth:   '2rem',
    height:     '2rem',
    padding:    '0 0.375rem',
    justifyContent: 'center',
    background: activo ? C.primary : C.bgMuted,
    color:      activo ? '#fff'    : C.textSecondary,
    border:     activo ? 'none'    : `1px solid ${C.border}`,
    fontSize:   T.xs,
    fontWeight: activo ? 700 : 400,
    cursor:     'pointer',
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.625rem', padding: '0.75rem 0' }}>
      {/* Info */}
      <div style={{ fontSize: T.xs, color: C.textMuted }}>
        Mostrando <strong style={{ color: C.text }}>{inicio}–{fin}</strong> de <strong style={{ color: C.text }}>{total}</strong> {label}
      </div>

      {/* Controles */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <button onClick={anterior} disabled={!hayAnterior}
          style={{ ...btnPag(false), opacity: hayAnterior ? 1 : 0.4 }}>
          <ChevronLeft size={14} />
        </button>

        {paginas.map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} style={{ fontSize: T.xs, color: C.textMuted, padding: '0 0.25rem' }}>…</span>
          ) : (
            <button key={p} onClick={() => irA(p)}
              style={btnPag(p === pagina)}>
              {p}
            </button>
          )
        )}

        <button onClick={siguiente} disabled={!haySiguiente}
          style={{ ...btnPag(false), opacity: haySiguiente ? 1 : 0.4 }}>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}