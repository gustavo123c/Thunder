/**
 * Reads the free-text goal typed under "Outro" (e.g. "Preparação para 10 km em 45 min",
 * "foco em subida", "regenerativo pós-prova") with simple keyword rules — no AI.
 */
import type { RunWorkoutType } from './pain-load';

export const CUSTOM_GOAL_MAX_LENGTH = 140;

export type CustomGoal = {
  /** Session that best matches the text (easy run when nothing matches). */
  type: RunWorkoutType;
  /** True when a keyword matched; false = fell back to an easy run. */
  recognized: boolean;
  /** Target race pace (s/km) when the text has "X km em Y min". */
  racePaceSPerKm: number | null;
  raceDistanceKm: number | null;
};

/** Lowercase without accents, so "Subida" and "súbida" match the same rule. */
function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// First match wins: specific sessions before generic words like "leve".
const RULES: readonly { type: RunWorkoutType; pattern: RegExp }[] = [
  { type: 'hills', pattern: /\b(subida|subidas|ladeira|morro|aclive|trail)\b/ },
  { type: 'fartlek', pattern: /\bfartlek\b/ },
  { type: 'progressive', pattern: /\bprogressiv/ },
  { type: 'recovery', pattern: /\b(regenera|recupera|pos[- ]?prova|soltar|descanso ativo)/ },
  { type: 'intervals', pattern: /\b(tiro|tiros|velocidade|vo2|sprint|intervalad|explos)/ },
  { type: 'tempo', pattern: /\b(limiar|tempo run|ritmo de prova|threshold)\b/ },
  { type: 'long', pattern: /\b(longao|longo|meia maratona|maratona|resistencia|endurance)\b/ },
  { type: 'easy', pattern: /\b(rodagem|leve|base aerobica|voltar a correr|iniciar)\b/ },
];

/** "<distance> km|k" followed (within a few words) by a time. */
const RACE =
  /(\d+(?:[.,]\d+)?)\s*(?:km|k)\b[^\d]{0,12}?(\d+)\s*(h|:|min|minutos|m\b)\s*(\d{1,2})?(?::(\d{2}))?/;

/**
 * "10 km em 45 min" · "5k em 25min" · "5 km em 25:30" (mm:ss) · "21 km em 1h50" ·
 * "10km em 1:05:00" / "21 km em 1:50" (h:mm when the first number is 1–2).
 */
function parseRace(text: string): { distanceKm: number; timeS: number } | null {
  const match = RACE.exec(text);
  if (!match) return null;
  const distanceKm = Number(match[1]!.replace(',', '.'));
  const first = Number(match[2]);
  const unit = match[3]!;
  const second = match[4] ? Number(match[4]) : 0;
  const third = match[5] ? Number(match[5]) : 0;

  let timeS: number;
  if (unit.startsWith('m')) timeS = first * 60;
  else if (unit === 'h' || match[5] !== undefined || first <= 2) {
    timeS = first * 3600 + second * 60 + third;
  } else timeS = first * 60 + second; // mm:ss
  return { distanceKm, timeS };
}

export function interpretCustomGoal(rawText: string): CustomGoal {
  const text = normalize(rawText.slice(0, CUSTOM_GOAL_MAX_LENGTH));
  const rule = RULES.find((r) => r.pattern.test(text));

  const race = parseRace(text);
  const pace = race && race.distanceKm >= 1 && race.timeS > 0 ? race.timeS / race.distanceKm : null;
  // Plausible running paces only (2:30–12:00 /km).
  const racePaceSPerKm = pace !== null && pace >= 150 && pace <= 720 ? Math.round(pace) : null;

  // A race goal without a session keyword → race-specific threshold work.
  const type = rule?.type ?? (racePaceSPerKm !== null ? 'tempo' : 'easy');

  return {
    type,
    recognized: rule !== undefined || racePaceSPerKm !== null,
    racePaceSPerKm,
    raceDistanceKm: racePaceSPerKm !== null ? race!.distanceKm : null,
  };
}
