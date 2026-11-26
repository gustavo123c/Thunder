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

const MONTHS_SHORT = [
  'jan.',
  'fev.',
  'mar.',
  'abr.',
  'mai.',
  'jun.',
  'jul.',
  'ago.',
  'set.',
  'out.',
  'nov.',
  'dez.',
];

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** "Hoje às 09:05", "Ontem às 18:30", "25 de nov. às 07:00", "3 de jan. de 2025". Local time. */
export function formatRunDate(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return PLACEHOLDER;

  const time = `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (isSameDay(date, now)) return `Hoje às ${time}`;
  if (isSameDay(date, yesterday)) return `Ontem às ${time}`;

  const day = `${date.getDate()} de ${MONTHS_SHORT[date.getMonth()]}`;
  return date.getFullYear() === now.getFullYear()
    ? `${day} às ${time}`
    : `${day} de ${date.getFullYear()}`;
}

/** Signed pace difference: -15 → "15 s/km mais rápido"; 72 → "1:12 /km mais lento". */
export function formatPaceDelta(deltaSPerKm: number): string {
  const magnitude = Math.round(Math.abs(deltaSPerKm));
  const amount = magnitude >= 60 ? `${formatPaceValue(magnitude)} /km` : `${magnitude} s/km`;
  return `${amount} ${deltaSPerKm < 0 ? 'mais rápido' : 'mais lento'}`;
}

/** Meters → "850 m" below 1 km, otherwise "5,23 km". */
export function formatShortDistance(meters: number): string {
  if (!Number.isFinite(meters)) return PLACEHOLDER;
  return Math.abs(meters) < 1000 ? `${Math.round(meters)} m` : formatDistanceKm(meters);
}

/** Running-watch style pace: 330 → `5'30"`; unknown → `--'--`. */
export function formatPaceTrack(secondsPerKm: number | null | undefined): string {
  if (secondsPerKm == null || !Number.isFinite(secondsPerKm) || secondsPerKm <= 0) return "--'--";
  const rounded = Math.round(secondsPerKm);
  return `${Math.floor(rounded / 60)}'${pad2(rounded % 60)}"`;
}

const MONTHS_LONG = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

/** "Novembro de 2026" (local time). */
export function formatMonthYear(date: Date): string {
  return `${MONTHS_LONG[date.getMonth()]} de ${date.getFullYear()}`;
}

/** 22.94 → "22,9" (pt-BR, fixed decimals); unknown → "--". */
export function formatDecimal(value: number | null | undefined, decimals = 1): string {
  if (value == null || !Number.isFinite(value)) return PLACEHOLDER;
  return value.toFixed(decimals).replace('.', ',');
}

/** Rest between reps: 45 → "45 s", 90 → "1:30", 120 → "2:00". */
export function formatRest(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return PLACEHOLDER;
  const s = Math.round(seconds);
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)}:${pad2(s % 60)}`;
}

const WEEKDAYS_SHORT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

/** Bib-style stamp: "HOJE · 07:02", "ONTEM · 18:30", "DOM 22 NOV · 06:45", "3 JAN 2025". */
export function formatRunStamp(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return PLACEHOLDER;
  const time = `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, now)) return `HOJE · ${time}`;
  if (isSameDay(date, yesterday)) return `ONTEM · ${time}`;
  const month = MONTHS_SHORT[date.getMonth()]!.replace('.', '').toUpperCase();
  return date.getFullYear() === now.getFullYear()
    ? `${WEEKDAYS_SHORT[date.getDay()]} ${date.getDate()} ${month} · ${time}`
    : `${date.getDate()} ${month} ${date.getFullYear()}`;
}

/** Signed lap difference in track format: -8 → `−0'08"`, 0 → `±0'00"`. */
export function formatPaceDiffTrack(deltaS: number): string {
  const rounded = Math.round(deltaS);
  const sign = rounded < 0 ? '−' : rounded > 0 ? '+' : '±';
  const abs = Math.abs(rounded);
  return `${sign}${Math.floor(abs / 60)}'${pad2(abs % 60)}"`;
}
