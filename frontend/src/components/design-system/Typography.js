/**
 * Typography system — luxury fashion scale.
 * Base unit: 4px. Font: Vazirmatn (Persian).
 *
 * Hierarchy (large → small):
 *   display → h1 → h2 → h3 → h4 → body → caption → micro
 *
 * Weight discipline:
 *   black (900)  — reserved for hero display + numeric emphasis
 *   bold (700)   — all headings, prices, key numbers
 *   semibold (600) — buttons, badges, strong labels
 *   medium (500) — product titles, form labels, nav
 *   normal (400) — body text, captions, inputs
 */

export const TYPE = {
  /* Display — hero banners only */
  display:
    'text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.15] tracking-tight',
  displaySm:
    'text-3xl sm:text-4xl font-black leading-[1.15] tracking-tight',

  /* Headings */
  h1: 'text-3xl sm:text-4xl font-bold leading-[1.2] tracking-tight',
  h2: 'text-2xl font-bold leading-[1.3] tracking-tight',
  h3: 'text-xl font-bold leading-[1.35] tracking-tight',
  h4: 'text-base font-bold leading-[1.4] tracking-tight',
  h5: 'text-sm font-semibold leading-[1.4]',

  /* Body */
  body: 'text-sm leading-relaxed',
  bodyLg: 'text-base leading-relaxed',
  bodySm: 'text-xs leading-relaxed',

  /* Emphasis + captions */
  eyebrow: 'text-xs font-semibold tracking-widest',
  caption: 'text-xs leading-relaxed text-muted-foreground',
  micro: 'text-xs text-muted-foreground',

  /* Commerce */
  productTitle: 'text-sm font-medium leading-snug',
  productTitleLg: 'text-base font-medium leading-snug',
  productPrice: 'text-base font-bold tabular-nums leading-snug',
  productPriceLg: 'text-lg font-bold tabular-nums leading-snug',
  salePrice: 'text-sm font-semibold text-destructive tabular-nums',
  oldPrice: 'text-xs text-muted-foreground line-through tabular-nums',

  /* Section headers */
  sectionTitle: 'text-2xl sm:text-3xl font-bold leading-[1.3] tracking-tight',
  sectionTitleSm: 'text-xl sm:text-2xl font-bold leading-[1.3] tracking-tight',

  /* UI */
  button: 'text-sm font-semibold',
  buttonLg: 'text-base font-semibold',
  buttonSm: 'text-xs font-semibold',
  label: 'text-xs font-medium',
  labelLg: 'text-sm font-medium',
  input: 'text-sm',
  inputLg: 'text-base',
  badge: 'text-xs font-semibold',
  badgeSm: 'text-xs font-medium',
  nav: 'text-sm font-medium',
  link: 'text-sm font-medium',
};

/* Shared heading size mapping for quick reference */
export const HEADING_SIZES = {
  display: 'display',
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
};
