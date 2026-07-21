export const spacing = {
  '0': '0',
  'xs': '0.25rem',
  'sm': '0.5rem',
  'md': '0.75rem',
  'lg': '1rem',
  'xl': '1.25rem',
  '2xl': '1.5rem',
  '3xl': '2rem',
  '4xl': '2.5rem',
  '5xl': '3rem',
} as const;

export type SpacingKey = keyof typeof spacing;
