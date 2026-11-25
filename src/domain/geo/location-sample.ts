import type { GpsSample } from '../types/run';

/** Structural subset of a platform location fix (expo-location's LocationObject). */
export type RawLocation = {
  timestamp: number;
  coords: {
    latitude: number;
    longitude: number;
    altitude: number | null;
    accuracy: number | null;
    speed: number | null;
  };
};

/** iOS reports -1 for unknown speed/accuracy; normalize those to null. */
function nonNegativeOrNull(value: number | null | undefined): number | null {
  return value === null || value === undefined || !Number.isFinite(value) || value < 0
    ? null
    : value;
}

export function toGpsSample(location: RawLocation, segment: number): GpsSample {
  const { coords } = location;
  return {
    timestamp: location.timestamp,
    latitude: coords.latitude,
    longitude: coords.longitude,
    altitudeM:
      coords.altitude === null || !Number.isFinite(coords.altitude) ? null : coords.altitude,
    accuracyM: nonNegativeOrNull(coords.accuracy),
    speedMps: nonNegativeOrNull(coords.speed),
    segment,
  };
}
