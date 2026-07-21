export const breakpoints = {
  xs: 320,
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1440,
  '3xl': 1600,
  '4xl': 1920,
  '5xl': 2560,
} as const;

export const mediaQuery = {
  sm: `@media (min-width: ${breakpoints.sm}px)`,
  md: `@media (min-width: ${breakpoints.md}px)`,
  lg: `@media (min-width: ${breakpoints.lg}px)`,
  xl: `@media (min-width: ${breakpoints.xl}px)`,
  '2xl': `@media (min-width: ${breakpoints['2xl']}px)`,
  max: {
    sm: `@media (max-width: ${breakpoints.sm - 1}px)`,
    md: `@media (max-width: ${breakpoints.md - 1}px)`,
    lg: `@media (max-width: ${breakpoints.lg - 1}px)`,
    xl: `@media (max-width: ${breakpoints.xl - 1}px)`,
    '2xl': `@media (max-width: ${breakpoints['2xl'] - 1}px)`,
  },
} as const;
