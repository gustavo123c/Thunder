/**
 * Parses the JSON returned by the run RPCs (run_summary_json & friends) into domain
 * types. Server data is treated as untrusted: shapes are checked at runtime, so a
 * schema drift fails loudly here instead of rendering NaN in the UI.
 */
import type { Position } from '@/domain/geo/geojson';
import type { RunHistoryEntry, RunRecord, Split } from '@/domain/types/run';

export class RunJsonError extends Error {
  constructor(field: string) {
    super(`Invalid run JSON: ${field}`);
    this.name = 'RunJsonError';
  }
}

type JsonObject = Record<string, unknown>;

export function asObject(value: unknown, field = 'object'): JsonObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new RunJsonError(field);
  }
  return value as JsonObject;
}

export function asArray(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) throw new RunJsonError(field);
  return value;
}

export function str(obj: JsonObject, key: string): string {
  const value = obj[key];
  if (typeof value !== 'string') throw new RunJsonError(key);
  return value;
}

export function strOrNull(obj: JsonObject, key: string): string | null {
  const value = obj[key];
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') throw new RunJsonError(key);
  return value;
}

/** Numbers may arrive as strings for Postgres numeric; accept both. */
export function numOrNull(obj: JsonObject, key: string): number | null {
  const value = obj[key];
  if (value === null || value === undefined) return null;
  const parsed =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(parsed)) throw new RunJsonError(key);
  return parsed;
}

export function num(obj: JsonObject, key: string): number {
  const value = numOrNull(obj, key);
  if (value === null) throw new RunJsonError(key);
  return value;
}

const VISIBILITIES = ['public', 'followers', 'private'] as const;

function parseRoute(value: unknown): Position[] {
  if (value === null || value === undefined) return [];
  const geometry = asObject(value, 'route');
  if (geometry.type !== 'LineString') throw new RunJsonError('route.type');
  return asArray(geometry.coordinates, 'route.coordinates').map((position) => {
    const [lon, lat] = asArray(position, 'route.position');
    if (typeof lon !== 'number' || typeof lat !== 'number') {
      throw new RunJsonError('route.position');
    }
    return [lon, lat];
  });
}

export function parseRunRecord(value: unknown): RunRecord {
  const obj = asObject(value, 'run');
  const visibility = str(obj, 'visibility');
  if (!(VISIBILITIES as readonly string[]).includes(visibility)) {
    throw new RunJsonError('visibility');
  }
  return {
    id: str(obj, 'id'),
    userId: str(obj, 'user_id'),
    title: str(obj, 'title'),
    description: strOrNull(obj, 'description'),
    startedAt: str(obj, 'started_at'),
    endedAt: str(obj, 'ended_at'),
    elapsedTimeS: num(obj, 'elapsed_time_s'),
    movingTimeS: num(obj, 'moving_time_s'),
    distanceM: num(obj, 'distance_m'),
    avgPaceSPerKm: numOrNull(obj, 'avg_pace_s_per_km'),
    bestPaceSPerKm: numOrNull(obj, 'best_pace_s_per_km'),
    elevationGainM: numOrNull(obj, 'elevation_gain_m'),
    caloriesKcal: numOrNull(obj, 'calories_kcal'),
    visibility: visibility as RunRecord['visibility'],
    kudosCount: num(obj, 'kudos_count'),
    commentsCount: num(obj, 'comments_count'),
    route: parseRoute(obj.route),
  };
}

export type RunAuthor = {
  id: string;
  username: string | null;
  fullName: string | null;
  avatarUrl: string | null;
};

export function parseAuthor(value: unknown): RunAuthor {
  const obj = asObject(value, 'author');
  return {
    id: str(obj, 'id'),
    username: strOrNull(obj, 'username'),
    fullName: strOrNull(obj, 'full_name'),
    avatarUrl: strOrNull(obj, 'avatar_url'),
  };
}

export type RunDetail = RunRecord & {
  author: RunAuthor;
  hasKudo: boolean;
  splits: Split[];
  previousRuns: RunHistoryEntry[];
};

function parseSplit(value: unknown): Split {
  const obj = asObject(value, 'split');
  return {
    index: num(obj, 'index'),
    distanceM: num(obj, 'distance_m'),
    durationS: num(obj, 'duration_s'),
    paceSPerKm: num(obj, 'pace_s_per_km'),
    elevationDeltaM: numOrNull(obj, 'elevation_delta_m'),
  };
}

function parseHistoryEntry(value: unknown): RunHistoryEntry {
  const obj = asObject(value, 'previous_run');
  return {
    id: str(obj, 'id'),
    startedAt: str(obj, 'started_at'),
    distanceM: num(obj, 'distance_m'),
    movingTimeS: num(obj, 'moving_time_s'),
    avgPaceSPerKm: numOrNull(obj, 'avg_pace_s_per_km'),
    bestPaceSPerKm: numOrNull(obj, 'best_pace_s_per_km'),
  };
}

export function parseRunDetail(value: unknown): RunDetail {
  const obj = asObject(value, 'detail');
  return {
    ...parseRunRecord(obj),
    author: parseAuthor(obj.author),
    hasKudo: obj.has_kudo === true,
    splits: asArray(obj.splits ?? [], 'splits').map(parseSplit),
    previousRuns: asArray(obj.previous_runs ?? [], 'previous_runs').map(parseHistoryEntry),
  };
}

export function parseRunList(value: unknown): RunRecord[] {
  return asArray(value, 'runs').map(parseRunRecord);
}
