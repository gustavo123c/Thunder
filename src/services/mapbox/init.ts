import { env } from '@/lib/env';
import { isExpoGo } from '@/lib/runtime';

let initialized = false;

/**
 * Configures the Mapbox SDK once per app launch. No-op in Expo Go, where the
 * native module does not exist (importing it would throw).
 */
export function initMapbox(): void {
  if (initialized || isExpoGo) return;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Mapbox = (require('@rnmapbox/maps') as typeof import('@rnmapbox/maps')).default;
  void Mapbox.setAccessToken(env.mapboxAccessToken);
  // The Terms of Use promise no location collection outside a run; Mapbox telemetry
  // would send location and usage events to Mapbox on its own.
  Mapbox.setTelemetryEnabled(false);
  initialized = true;
}
