import { simplifyRoute } from '@/domain/geo/simplify';
import type { GpsSample, RunSummary } from '@/domain/types/run';

export type RunVisibility = 'public' | 'followers' | 'private';

/** JSON accepted by the `finish_run` database function (see supabase/migrations). */
export type FinishRunPayload = {
  client_id: string;
  title: string;
  visibility: RunVisibility;
  started_at: string;
  ended_at: string;
  elapsed_time_s: number;
  moving_time_s: number;
  distance_m: number;
  avg_pace_s_per_km: number | null;
  best_pace_s_per_km: number | null;
  elevation_gain_m: number | null;
  calories_kcal: number | null;
  /** Simplified polyline as [lon, lat] pairs (GeoJSON order). */
  route: [number, number][];
  points: {
    seq: number;
    segment: number;
    t: number; // epoch ms
    lat: number;
    lon: number;
    alt: number | null;
    acc: number | null;
    speed: number | null;
  }[];
  splits: {
    split_index: number;
    distance_m: number;
    duration_s: number;
    pace_s_per_km: number;
    elevation_delta_m: number | null;
  }[];
};

const round = (value: number, decimals: number) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const roundOrNull = (value: number | null, decimals: number) =>
  value === null ? null : round(value, decimals);

type PayloadInput = {
  clientId: string;
  title: string;
  visibility: RunVisibility;
  summary: RunSummary;
  samples: readonly GpsSample[];
};

/**
 * Builds the upload payload, rounding to the column precisions and keeping the
 * database CHECK constraints true (moving ≤ elapsed, split durations ≥ 1 s).
 */
export function buildFinishRunPayload({
  clientId,
  title,
  visibility,
  summary,
  samples,
}: PayloadInput): FinishRunPayload {
  const elapsed = Math.round(summary.elapsedTimeS);
  const moving = Math.min(Math.round(summary.movingTimeS), elapsed);

  return {
    client_id: clientId,
    title: title.trim().slice(0, 100) || 'Corrida',
    visibility,
    started_at: new Date(summary.startedAt).toISOString(),
    ended_at: new Date(summary.endedAt).toISOString(),
    elapsed_time_s: elapsed,
    moving_time_s: moving,
    distance_m: round(summary.distanceM, 2),
    avg_pace_s_per_km: roundOrNull(summary.avgPaceSPerKm, 2),
    best_pace_s_per_km: roundOrNull(summary.bestPaceSPerKm, 2),
    elevation_gain_m: roundOrNull(summary.elevationGainM, 2),
    calories_kcal: summary.caloriesKcal === null ? null : Math.round(summary.caloriesKcal),
    route: simplifyRoute(samples, 5).map((s) => [s.longitude, s.latitude]),
    points: samples.map((s, seq) => ({
      seq,
      segment: s.segment,
      t: s.timestamp,
      lat: s.latitude,
      lon: s.longitude,
      alt: s.altitudeM,
      acc: s.accuracyM,
      speed: s.speedMps,
    })),
    splits: summary.splits.map((split) => ({
      split_index: split.index,
      distance_m: round(split.distanceM, 2),
      duration_s: Math.max(1, Math.round(split.durationS)),
      pace_s_per_km: round(split.paceSPerKm, 2),
      elevation_delta_m: roundOrNull(split.elevationDeltaM, 2),
    })),
  };
}
