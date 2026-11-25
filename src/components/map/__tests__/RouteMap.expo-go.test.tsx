import { render, screen } from '@testing-library/react-native';

import { isExpoGo } from '@/lib/runtime';
import { initMapbox } from '@/services/mapbox/init';

import { RouteMap } from '../RouteMap';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { executionEnvironment: 'storeClient' },
  ExecutionEnvironment: { Bare: 'bare', Standalone: 'standalone', StoreClient: 'storeClient' },
}));

// What @rnmapbox/maps really does without native code: throw on import.
jest.mock('@rnmapbox/maps', () => {
  throw new Error('@rnmapbox/maps native code not available');
});

jest.mock('@/lib/env', () => ({ env: { mapboxAccessToken: 'pk.test' } }));

describe('in Expo Go', () => {
  it('detects the Expo Go runtime', () => {
    expect(isExpoGo).toBe(true);
  });

  it('renders the SVG route sketch without loading Mapbox', async () => {
    await render(
      <RouteMap
        route={{
          type: 'LineString',
          coordinates: [
            [-46.63, -23.55],
            [-46.62, -23.54],
          ],
        }}
      />,
    );
    expect(screen.getByText(/Modo de teste \(Expo Go\)/)).toBeOnTheScreen();
  });

  it('shows a hint before the first GPS fix', async () => {
    await render(<RouteMap route={null} followUser />);
    expect(screen.getByText(/Sua rota aparecerá aqui/)).toBeOnTheScreen();
  });

  it('skips Mapbox initialization', async () => {
    expect(() => initMapbox()).not.toThrow();
  });
});
