import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

/**
 * Whether this binary has expo-gl's native code. Expo Go ships it; a development or
 * store build made before expo-gl was added doesn't (an OTA update can't add it), and
 * importing expo-gl there would throw.
 */
export function hasGL(): boolean {
  if (Platform.OS === 'web') return true;
  return requireOptionalNativeModule('ExpoGL') != null;
}
