/** A raw location fix as delivered by the device (SI units, epoch ms). */
export type GpsSample = {
  timestamp: number; // ms since epoch
  latitude: number;
  longitude: number;
  altitudeM: number | null;
  accuracyM: number | null; // horizontal accuracy radius
  speedMps: number | null; // device-reported speed (may be absent)
  /** Increments on every pause/resume; distance is never measured across segments. */
  segment: number;
};

export type LatLng = { latitude: number; longitude: number };

/** The step between two consecutive accepted samples in the same segment. */
export type TrackInterval = {
  from: GpsSample;
  to: GpsSample;
  distanceM: number;
  durationS: number;
  /** False when standing still (e.g. traffic light) — excluded from moving time. */
  moving: boolean;
};

/** Wall-clock span during which the run was active (between start/resume and pause/finish). */
export type ActivePeriod = {
  startedAt: number; // ms since epoch
  endedAt: number | null; // null while still running
};

export type Split = {
  index: number; // 0-based
  distanceM: number; // 1000 except possibly the last one
  durationS: number; // moving time spent in this split
  paceSPerKm: number;
  elevationDeltaM: number | null;
};

export type RunSummary = {
  startedAt: number;
  endedAt: number;
  distanceM: number;
  elapsedTimeS: number; // wall clock, including pauses
  activeTimeS: number; // excluding manual pauses
  movingTimeS: number; // excluding manual pauses and standing still
  avgPaceSPerKm: number | null;
  bestPaceSPerKm: number | null;
  elevationGainM: number | null;
  caloriesKcal: number | null;
  splits: Split[];
};
