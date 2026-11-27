import { Asset } from 'expo-asset';
import { Platform } from 'react-native';

import type { BodySex } from '@/domain/types/profile';

/* eslint-disable @typescript-eslint/no-require-imports -- bundled binary assets */
const MODULES: Record<BodySex, number> = {
  male: require('../../../../../assets/models/body-male.glb'),
  female: require('../../../../../assets/models/body-female.glb'),
};
/* eslint-enable @typescript-eslint/no-require-imports */

/**
 * What three's loaders get: the bundler module on native (R3F's polyfills resolve it with
 * expo-asset), a URL on web.
 */
export function modelSource(sex: BodySex): string | number {
  const module = MODULES[sex];
  return Platform.OS === 'web' ? Asset.fromModule(module).uri : module;
}
