import palette from './palette';

export const colors = palette;

/** Performance Dark surfaces (also available as ink-900 / ink-800 classes). */
export const surfaces = {
  background: palette.ink[900],
  card: palette.ink[800],
  raised: palette.ink[700],
  hairline: palette.hairline,
  radius: 20,
} as const;

/** Subtle dark gradient for highlight cards (streak, main goal). */
export const highlightGradient = ['#1D2535', '#121721', '#0E131B'] as const;

/** Profile cover: a faint amber glow fading into the background. */
export const bannerGradient = ['#3A3112', '#1A1F2B', '#090C10'] as const;

/** Route line colors used on maps (live tracking and post-run summary). */
export const mapColors = {
  route: palette.bolt[500],
  routeOutline: palette.ink[900],
  start: palette.success,
  finish: palette.danger,
} as const;
