// Breakpoints
export const BP = {
  xs: 480,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
}

// Detectores de tamaño (para usar en componentes)
export const isMobile = () => window.innerWidth < BP.md
export const isTablet = () => window.innerWidth >= BP.md && window.innerWidth < BP.lg
export const isDesktop = () => window.innerWidth >= BP.lg

// Paleta de colores
export const C = {
  primary: '#2563eb',
  primaryLight: '#eff6ff',
  primaryBorder: '#bfdbfe',
  success: '#16a34a',
  successLight: '#f0fdf4',
  warning: '#b45309',
  warningLight: '#fef9c3',
  danger: '#dc2626',
  dangerLight: '#fef2f2',
  dangerBorder: '#fecaca',
  text: '#111827',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  border: '#e5e7eb',
  borderLight: '#f3f4f6',
  bg: '#f9fafb',
  bgWhite: '#ffffff',
  bgMuted: '#f3f4f6',
}

// Tipografía base (rem sobre 16px base)
export const T = {
  xs: '0.75rem',    // 12px
  sm: '0.8125rem',  // 13px
  base: '0.875rem', // 14px
  md: '1rem',       // 16px
  lg: '1.125rem',   // 18px
  xl: '1.25rem',    // 20px
  xxl: '1.5rem',    // 24px
}

// Espaciado
export const S = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '0.75rem',   // 12px
  lg: '1rem',      // 16px
  xl: '1.25rem',   // 20px
  xxl: '1.5rem',   // 24px
}

// Estilos reutilizables
export const input = {
  width: '100%',
  border: `1px solid ${C.border}`,
  borderRadius: '0.5rem',
  padding: '0.5625rem 0.75rem',
  fontSize: T.sm,
  outline: 'none',
  boxSizing: 'border-box',
  color: C.text,
  background: C.bgWhite,
  fontFamily: 'inherit',
}

export const btn = {
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.375rem',
    border: 'none',
    borderRadius: '0.5rem',
    padding: '0.5625rem 1rem',
    fontSize: T.sm,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    fontFamily: 'inherit',
    transition: 'opacity 0.15s',
  },
  primary: { background: C.primary, color: '#fff' },
  secondary: { background: C.bgMuted, color: C.text, border: `1px solid ${C.border}` },
  danger: { background: C.bgWhite, color: C.danger, border: `1px solid ${C.dangerBorder}` },
  ghost: { background: 'transparent', color: C.textSecondary, border: `1px solid ${C.border}` },
}

export const card = {
  background: C.bgWhite,
  border: `1px solid ${C.border}`,
  borderRadius: '0.75rem',
  overflow: 'hidden',
}

export const badge = (type) => {
  const map = {
    ok:      { bg: '#bbf7d0', color: '#14532d' },
    low:     { bg: '#fde68a', color: '#92400e' },
    out:     { bg: '#fecaca', color: '#991b1b' },
    blue:    { bg: C.primaryLight, color: C.primary },
    purple:  { bg: '#f5f3ff', color: '#6d28d9' },
  }
  const s = map[type] || map.blue
  return {
    display: 'inline-block',
    background: s.bg,
    color: s.color,
    borderRadius: '9999px',
    padding: '0.1875rem 0.5rem',
    fontSize: T.xs,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  }
}