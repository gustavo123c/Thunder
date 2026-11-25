import type { ComponentType } from 'react';

import { isExpoGo } from '@/lib/runtime';

import type { RouteMapProps } from './MapboxRouteMap';
import { RouteSketch } from './RouteSketch';

export type { RouteMapProps };

/**
 * @rnmapbox/maps throws as soon as it is imported when its native code is missing
 * (Expo Go). So it is required lazily, only outside Expo Go.
 */
const NativeRouteMap: ComponentType<RouteMapProps> = isExpoGo
  ? RouteSketch
  : // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('./MapboxRouteMap') as typeof import('./MapboxRouteMap')).MapboxRouteMap;

export function RouteMap(props: RouteMapProps) {
  return <NativeRouteMap {...props} />;
}
