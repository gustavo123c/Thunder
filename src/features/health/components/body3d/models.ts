import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import * as LegacyFS from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import type * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import type { BodySex } from '@/domain/types/profile';

/* eslint-disable @typescript-eslint/no-require-imports -- bundled binary assets */
const MODULES: Record<BodySex, number> = {
  male: require('../../../../../assets/models/body-male.glb'),
  female: require('../../../../../assets/models/body-female.glb'),
};
/* eslint-enable @typescript-eslint/no-require-imports */

async function readModel(sex: BodySex): Promise<ArrayBuffer> {
  const asset = Asset.fromModule(MODULES[sex]);
  if (Platform.OS === 'web') return (await fetch(asset.uri)).arrayBuffer();
  await asset.downloadAsync();
  let uri = asset.localUri ?? asset.uri;
  // Android release builds embed assets as raw resources (no scheme): copy to a file first.
  if (!uri.includes(':')) {
    const target = `${LegacyFS.cacheDirectory}body-${sex}-${asset.hash ?? 'model'}.glb`;
    await LegacyFS.copyAsync({ from: uri, to: target });
    uri = target;
  }
  return new File(uri).arrayBuffer();
}

const cache = new Map<BodySex, Promise<THREE.Group>>();

/**
 * Loads and parses the body model once per sex. Reads the bundled .glb straight from disk
 * (no network, no base64 round trip) and parses it with three's GLTFLoader.
 */
export function loadBodyModel(sex: BodySex): Promise<THREE.Group> {
  let pending = cache.get(sex);
  if (!pending) {
    pending = readModel(sex)
      .then((buffer) => new GLTFLoader().parseAsync(buffer, ''))
      .then((gltf) => gltf.scene);
    pending.catch(() => cache.delete(sex)); // allow a retry after a failure
    cache.set(sex, pending);
  }
  return pending;
}
