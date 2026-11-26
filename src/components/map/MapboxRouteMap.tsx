import Mapbox, { Camera, LineLayer, LocationPuck, MapView, ShapeSource } from '@rnmapbox/maps';
import type { StyleProp, ViewStyle } from 'react-native';

import type { Bounds, LineStringGeometry, MultiLineStringGeometry } from '@/domain/geo/geojson';
import { mapColors } from '@/theme/tokens';

export type RouteMapProps = {
  route: LineStringGeometry | MultiLineStringGeometry | null;
  /** Live mode: camera follows the runner and shows the location puck. */
  followUser?: boolean;
  /** Static mode: fit the camera to the route. */
  bounds?: Bounds | null;
  interactive?: boolean;
  /** Third-party native view: styled with `style`, not NativeWind's className. */
  style?: StyleProp<ViewStyle>;
};

const EDGE_PADDING = 40;

/** Full Mapbox map. Only loaded in development/production builds (see RouteMap). */
export function MapboxRouteMap({
  route,
  followUser = false,
  bounds = null,
  interactive = true,
  style = { flex: 1 },
}: RouteMapProps) {
  const hasRoute = route !== null && route.coordinates.length > 0;

  return (
    <MapView
      style={style}
      styleURL={Mapbox.StyleURL.Dark}
      scaleBarEnabled={false}
      logoPosition={{ bottom: 8, left: 8 }}
      attributionPosition={{ bottom: 8, right: 8 }}
      scrollEnabled={interactive}
      zoomEnabled={interactive}
      pitchEnabled={false}
      rotateEnabled={interactive}
    >
      {followUser ? (
        <Camera followUserLocation followZoomLevel={16} animationDuration={600} />
      ) : bounds ? (
        <Camera
          bounds={{
            ...bounds,
            paddingTop: EDGE_PADDING,
            paddingBottom: EDGE_PADDING,
            paddingLeft: EDGE_PADDING,
            paddingRight: EDGE_PADDING,
          }}
          animationDuration={0}
        />
      ) : null}

      {followUser ? (
        <LocationPuck puckBearingEnabled puckBearing="course" pulsing={{ isEnabled: true }} />
      ) : null}

      {hasRoute ? (
        <ShapeSource id="route" shape={route}>
          <LineLayer
            id="route-outline"
            style={{
              lineColor: mapColors.routeOutline,
              lineWidth: 8,
              lineOpacity: 0.35,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
          <LineLayer
            id="route-line"
            aboveLayerID="route-outline"
            style={{
              lineColor: mapColors.route,
              lineWidth: 5,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        </ShapeSource>
      ) : null}
    </MapView>
  );
}
