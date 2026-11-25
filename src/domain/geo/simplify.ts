import type { LatLng } from '../types/run';
import { EARTH_RADIUS_M } from './haversine';

type Point = { x: number; y: number };

/** Local equirectangular projection (meters) — accurate enough at the scale of a run. */
function project(points: readonly LatLng[]): Point[] {
  const first = points[0];
  if (!first) return [];
  const refLat = (first.latitude * Math.PI) / 180;
  const k = (Math.PI / 180) * EARTH_RADIUS_M;
  return points.map((p) => ({
    x: (p.longitude - first.longitude) * k * Math.cos(refLat),
    y: (p.latitude - first.latitude) * k,
  }));
}

function perpendicularDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/**
 * Douglas–Peucker simplification with a tolerance in meters. Used to store a light
 * route polyline for maps and the feed (raw points are kept separately).
 * Iterative to avoid deep recursion on long runs.
 */
export function simplifyRoute<T extends LatLng>(points: readonly T[], toleranceM = 5): T[] {
  if (points.length <= 2) return [...points];

  const projected = project(points);
  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;

  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [start, end] = stack.pop() as [number, number];
    let maxDistance = 0;
    let index = -1;

    for (let i = start + 1; i < end; i += 1) {
      const distance = perpendicularDistance(
        projected[i] as Point,
        projected[start] as Point,
        projected[end] as Point,
      );
      if (distance > maxDistance) {
        maxDistance = distance;
        index = i;
      }
    }

    if (index !== -1 && maxDistance > toleranceM) {
      keep[index] = true;
      stack.push([start, index], [index, end]);
    }
  }

  return points.filter((_, i) => keep[i]);
}
