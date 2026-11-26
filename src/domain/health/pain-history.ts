/**
 * Pain history: every report on the body map is an episode (a pain_logs row, kept after
 * it is resolved). Counting episodes per region/side reveals recurring pains.
 */
import type { BodyRegion, BodySide, PainEntry } from './body-regions';

export type PainEpisode = PainEntry & {
  id: string;
  createdAt: string; // ISO
  resolvedAt: string | null; // ISO
};

export type Recurrence = {
  region: BodyRegion;
  side: BodySide;
  /** Episodes started within the window. */
  count: number;
  lastAt: string;
  /** Highest intensity reported within the window. */
  maxIntensity: number;
};

export const RECURRENCE_WINDOW_DAYS = 30;
/** Reported at least this many times in the window = recurring. */
export const RECURRENCE_MIN_EPISODES = 2;

const DAY_MS = 24 * 60 * 60 * 1000;

function withinWindow(iso: string, now: Date, days: number): boolean {
  const t = new Date(iso).getTime();
  return t <= now.getTime() && now.getTime() - t <= days * DAY_MS;
}

/** Episodes per region/side in the window, most frequent first. */
export function painRecurrences(
  episodes: readonly PainEpisode[],
  now: Date,
  windowDays = RECURRENCE_WINDOW_DAYS,
): Recurrence[] {
  const groups = new Map<string, Recurrence>();
  for (const episode of episodes) {
    if (!withinWindow(episode.createdAt, now, windowDays)) continue;
    const key = `${episode.region}:${episode.side}`;
    const current = groups.get(key);
    if (!current) {
      groups.set(key, {
        region: episode.region,
        side: episode.side,
        count: 1,
        lastAt: episode.createdAt,
        maxIntensity: episode.intensity,
      });
      continue;
    }
    current.count += 1;
    if (episode.createdAt > current.lastAt) current.lastAt = episode.createdAt;
    current.maxIntensity = Math.max(current.maxIntensity, episode.intensity);
  }
  return [...groups.values()].sort((a, b) => b.count - a.count || (a.lastAt < b.lastAt ? 1 : -1));
}

/** Only the regions reported at least `RECURRENCE_MIN_EPISODES` times. */
export function recurringPains(
  episodes: readonly PainEpisode[],
  now: Date,
  windowDays = RECURRENCE_WINDOW_DAYS,
): Recurrence[] {
  return painRecurrences(episodes, now, windowDays).filter(
    (r) => r.count >= RECURRENCE_MIN_EPISODES,
  );
}

/**
 * A pain that "came back": the region/side has no open episode but was reported
 * (and resolved) within the window. Returns how many past episodes there were.
 */
export function returningPainCount(
  episodes: readonly PainEpisode[],
  region: BodyRegion,
  side: BodySide,
  now: Date,
  windowDays = RECURRENCE_WINDOW_DAYS,
): number {
  const same = episodes.filter((e) => e.region === region && e.side === side);
  if (same.some((e) => e.resolvedAt === null)) return 0; // still open: not a return
  return same.filter((e) => withinWindow(e.createdAt, now, windowDays)).length;
}
