import type { GpsSample, LatLng } from '../types/run';

export type Position = [longitude: number, latitude: number];

export type LineStringGeometry = { type: 'LineString'; coordinates: Position[] };
export type MultiLineStringGeometry = { type: 'MultiLineString'; coordinates: Position[][] };

export type Bounds = { ne: Position; sw: Position };

/** One line per GPS segment, so the map shows a gap where the run was paused. */
export function samplesToMultiLineString(samples: readonly GpsSample[]): MultiLineStringGeometry {
  const lines: Position[][] = [];
  let current: Position[] = [];
  let segment: number | null = null;

  for (const sample of samples) {
    if (segment !== null && sample.segment !== segment) {
      if (current.length >= 2) lines.push(current);
      current = [];
    }
    segment = sample.segment;
    current.push([sample.longitude, sample.latitude]);
  }
  if (current.length >= 2) lines.push(current);

  return { type: 'MultiLineString', coordinates: lines };
}

export function toPositions(points: readonly LatLng[]): Position[] {
  return points.map((p) => [p.longitude, p.latitude]);
}

/** Bounding box of a set of [lon, lat] positions; null when empty. */
export function boundsOf(positions: readonly Position[]): Bounds | null {
  const first = positions[0];
  if (!first) return null;
  let [minLon, minLat] = first;
  let [maxLon, maxLat] = first;
  for (const [lon, lat] of positions) {
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  return { ne: [maxLon, maxLat], sw: [minLon, minLat] };
}

/**
 * Projects positions into a `width`×`height` box (y grows downwards), preserving the
 * aspect ratio with equirectangular scaling — used for lightweight SVG route thumbnails.
 */
export function projectToBox(
  positions: readonly Position[],
  width: number,
  height: number,
  padding = 0,
): [x: number, y: number][] {
  const bounds = boundsOf(positions);
  if (!bounds) return [];

  const midLat = ((bounds.ne[1] + bounds.sw[1]) / 2) * (Math.PI / 180);
  const kx = Math.cos(midLat);
  const spanX = (bounds.ne[0] - bounds.sw[0]) * kx;
  const spanY = bounds.ne[1] - bounds.sw[1];
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const scale = Math.min(
    spanX > 0 ? innerW / spanX : Infinity,
    spanY > 0 ? innerH / spanY : Infinity,
  );
  const s = Number.isFinite(scale) ? scale : 0;

  const offsetX = padding + (innerW - spanX * s) / 2;
  const offsetY = padding + (innerH - spanY * s) / 2;

  return positions.map(([lon, lat]) => [
    offsetX + (lon - bounds.sw[0]) * kx * s,
    offsetY + (bounds.ne[1] - lat) * s,
  ]);
}
