/**
 * Display formatters. All inputs use SI units (meters, seconds, s/km),
 * matching how values are stored in the database and computed in `domain/`.
 */

const PLACEHOLDER = '--';

function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

/** 1834 → "30:34"; 3725 → "1:02:05". */
export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return PLACEHOLDER;

  const seconds = Math.floor(totalSeconds);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${pad2(m)}:${pad2(s)}`;
}

/** Pace in seconds per km → "5:30" (also used to prefill pace inputs). */
export function formatPaceValue(secondsPerKm: number | null | undefined): string {
  if (secondsPerKm == null || !Number.isFinite(secondsPerKm) || secondsPerKm <= 0) {
    return PLACEHOLDER;
  }

  const rounded = Math.round(secondsPerKm);
  const m = Math.floor(rounded / 60);
  const s = rounded % 60;
  return `${m}:${pad2(s)}`;
}

/** Pace in seconds per km → "5:30 /km". */
export function formatPace(secondsPerKm: number | null | undefined): string {
  return `${formatPaceValue(secondsPerKm)} /km`;
}

/** 72.5 → "72,5 kg". */
export function formatWeightKg(kg: number | null | undefined): string {
  if (kg == null || !Number.isFinite(kg)) return PLACEHOLDER;
  const rounded = Math.round(kg * 10) / 10;
  const text = Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1);
  return `${text.replace('.', ',')} kg`;
}

/** Meters → "5,23 km" (pt-BR decimal separator, two decimals). */
export function formatDistanceKm(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return `${PLACEHOLDER} km`;

  const km = Math.floor(meters / 10) / 100; // truncate: never show more than was run
  return `${km.toFixed(2).replace('.', ',')} km`;
}
