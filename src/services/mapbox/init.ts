import Mapbox from '@rnmapbox/maps';

import { env } from '@/lib/env';

let initialized = false;

/** Configures the Mapbox SDK once per app launch. Requires a development build. */
export function initMapbox(): void {
  if (initialized) return;
  void Mapbox.setAccessToken(env.mapboxAccessToken);
  initialized = true;
}
