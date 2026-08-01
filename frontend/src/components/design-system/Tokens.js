export const SPACING = {
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  7: '1.75rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  14: '3.5rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
};

export const RADII = {
  sm: '0.375rem',
  md: '0.5rem',
  DEFAULT: '0.75rem',
  lg: '1rem',
  xl: '1.25rem',
  '2xl': '1.5rem',
  '3xl': '1.75rem',
  '4xl': '2rem',
} as const;

export const SHADOWS = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
} as const;

export const ICON_SIZES = {
  xs: 'h-3 w-3',
  sm: 'h-3.5 w-3.5',
  DEFAULT: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  xl: 'h-7 w-7',
} as const;

export const BADGE_SIZES = {
  DEFAULT: 'text-xs px-2.5 py-0.5',
  sm: 'text-xs px-2 py-0.5',
  lg: 'text-xs px-3 py-1',
} as const;

export const BUTTON_SIZES = {
  sm: 'h-9 rounded-lg px-3 text-sm',
  DEFAULT: 'h-10 rounded-lg px-4 text-sm',
  lg: 'h-11 rounded-lg px-6 text-base',
  xl: 'h-12 rounded-xl px-6 text-base font-semibold',
} as const;

export const INPUT_SIZES = {
  DEFAULT: 'h-10 rounded-lg px-3 py-2 text-sm',
  lg: 'h-11 rounded-xl px-4 py-2.5 text-sm',
} as const;