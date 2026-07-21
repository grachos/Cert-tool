export const typography = {
  fontFamily: {
    sans: "'Inter', system-ui, -apple-system, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', monospace",
  },
  fontSize: {
    xs: 'clamp(0.7rem, 0.75rem, 0.75rem)',
    sm: 'clamp(0.8rem, 0.875rem, 0.875rem)',
    base: 'clamp(0.9rem, 1rem, 1rem)',
    lg: 'clamp(1rem, 1.125rem, 1.125rem)',
    xl: 'clamp(1.1rem, 1.25rem, 1.25rem)',
    '2xl': 'clamp(1.25rem, 1.5rem, 1.5rem)',
    '3xl': 'clamp(1.5rem, 1.875rem, 1.875rem)',
    '4xl': 'clamp(1.8rem, 2.25rem, 2.25rem)',
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: '1.2',
    normal: '1.5',
    relaxed: '1.75',
  },
} as const;
