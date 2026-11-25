import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * True inside the Expo Go app (App Store / Play Store client). Expo Go has no
 * Mapbox native code and no background location on iOS, so the app falls back to
 * an SVG route sketch and foreground-only GPS there. Development and production
 * builds get the full experience.
 */
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
