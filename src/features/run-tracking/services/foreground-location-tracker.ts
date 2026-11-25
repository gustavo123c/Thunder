import * as Location from 'expo-location';

import type { LocationTracker, RawLocation } from '../types';

/**
 * Foreground-only tracker (watchPositionAsync) for Expo Go, where background
 * location is unavailable on iOS. Recording continues only while the app is open,
 * so the record screen keeps the display awake during a run.
 */
export function createForegroundLocationTracker(
  onLocations: (locations: RawLocation[]) => void,
): LocationTracker {
  let subscription: Location.LocationSubscription | null = null;

  const readPermission = async () => {
    const foreground = await Location.getForegroundPermissionsAsync();
    return foreground.granted ? ('granted' as const) : ('denied' as const);
  };

  return {
    getPermission: readPermission,

    async requestPermission() {
      const foreground = await Location.requestForegroundPermissionsAsync();
      return foreground.granted ? 'granted' : 'denied';
    },

    async start() {
      if (subscription) return;
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 0,
        },
        (location) => onLocations([location]),
      );
    },

    async stop() {
      subscription?.remove();
      subscription = null;
    },

    async isStarted() {
      return subscription !== null;
    },
  };
}
