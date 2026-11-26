/**
 * Below this distance the GPS effectively recorded nothing (e.g. a run started indoors or
 * with location off). Such runs keep their time in the history but stay out of feeds,
 * groups, records and medals, and the finish dialog suggests discarding them.
 */
export const MIN_RECORDED_DISTANCE_M = 50;

export function hasRecordedDistance(distanceM: number): boolean {
  return Number.isFinite(distanceM) && distanceM >= MIN_RECORDED_DISTANCE_M;
}
