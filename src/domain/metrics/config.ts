/**
 * Tunable thresholds for GPS processing and metrics.
 * Centralized so they can be adjusted after field tests without hunting through code.
 */
export const METRICS_CONFIG = {
  gps: {
    /** Fixes with a worse horizontal accuracy are discarded. */
    maxAccuracyM: 30,
    /** Faster than any human runner (~43 km/h): treated as a GPS jump. */
    maxSpeedMps: 12,
    /**
     * Moves shorter than this are jitter while standing still. Kept below the distance
     * covered in 1 s at a slow running pace (2 m/s ≈ 8:20 /km) so 1 Hz tracks are not thinned.
     */
    minDistanceM: 2,
    /** Accept a fix after this long even without movement, to keep time accurate. */
    heartbeatS: 10,
    /** After this many consecutive "too fast" rejections, trust the new position. */
    maxConsecutiveJumpRejections: 5,
  },
  moving: {
    /** Below ~1.8 km/h the runner is considered stopped. */
    minSpeedMps: 0.5,
  },
  pace: {
    /** Rolling window used for the live "current pace". */
    currentWindowS: 30,
    /** Minimum distance in the window before showing a current pace. */
    currentMinDistanceM: 20,
    /** Minimum distance before showing an average pace. */
    averageMinDistanceM: 50,
  },
  splits: {
    distanceM: 1000,
    /** A trailing partial split shorter than this is dropped as noise. */
    minPartialDistanceM: 10,
  },
  elevation: {
    /** Hysteresis threshold applied after smoothing. */
    thresholdM: 3,
    /** Moving-average radius in samples (window of 2·radius + 1). */
    smoothingRadius: 5,
  },
} as const;
