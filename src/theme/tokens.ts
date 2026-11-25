import palette from './palette';

export const colors = palette;

/** Route line colors used on maps (live tracking and post-run summary). */
export const mapColors = {
  route: palette.bolt[500],
  routeOutline: palette.ink[900],
  start: palette.success,
  finish: palette.danger,
} as const;
