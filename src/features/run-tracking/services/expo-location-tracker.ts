import * as Location from 'expo-location';

import { colors } from '@/theme/tokens';

import type { LocationPermission, LocationTracker } from '../types';

export const LOCATION_TASK_NAME = 'thunder-run-location';

async function readPermission(): Promise<LocationPermission> {
  const foreground = await Location.getForegroundPermissionsAsync();
  if (!foreground.granted) return 'denied';
  const background = await Location.getBackgroundPermissionsAsync();
  return background.granted ? 'granted' : 'foreground_only';
}

/** expo-location implementation: high-accuracy updates delivered to the background task. */
export const expoLocationTracker: LocationTracker = {
  getPermission: readPermission,

  async requestPermission() {
    const foreground = await Location.requestForegroundPermissionsAsync();
    if (!foreground.granted) return 'denied';
    // Must be requested after foreground ("Allow all the time" / "Always").
    const background = await Location.requestBackgroundPermissionsAsync();
    return background.granted ? 'granted' : 'foreground_only';
  },

  async start() {
    if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)) return;
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.BestForNavigation,
      activityType: Location.ActivityType.Fitness,
      timeInterval: 1000,
      distanceInterval: 0,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Thunder · gravando sua corrida',
        notificationBody: 'Distância e pace estão sendo registrados.',
        notificationColor: colors.bolt[500],
        killServiceOnDestroy: false,
      },
    });
  },

  async stop() {
    if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
  },

  isStarted: () => Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME),
};
