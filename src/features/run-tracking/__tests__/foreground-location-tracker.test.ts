import * as Location from 'expo-location';

import { createForegroundLocationTracker } from '../services/foreground-location-tracker';

jest.mock('expo-location', () => ({
  Accuracy: { BestForNavigation: 6 },
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
}));

const mocked = jest.mocked(Location);

it('streams fixes to the recorder while started, and stops cleanly', async () => {
  const remove = jest.fn();
  let emit: (location: Location.LocationObject) => void = () => {};
  mocked.watchPositionAsync.mockImplementation(async (_options, callback) => {
    emit = callback;
    return { remove };
  });

  const onLocations = jest.fn();
  const tracker = createForegroundLocationTracker(onLocations);

  await tracker.start();
  await tracker.start(); // idempotent
  expect(mocked.watchPositionAsync).toHaveBeenCalledTimes(1);
  expect(await tracker.isStarted()).toBe(true);

  const fix = { timestamp: 1, coords: { latitude: 1, longitude: 2 } } as Location.LocationObject;
  emit(fix);
  expect(onLocations).toHaveBeenCalledWith([fix]);

  await tracker.stop();
  expect(remove).toHaveBeenCalled();
  expect(await tracker.isStarted()).toBe(false);
});

it('only needs foreground permission', async () => {
  mocked.requestForegroundPermissionsAsync.mockResolvedValue({ granted: true } as never);
  const tracker = createForegroundLocationTracker(jest.fn());
  expect(await tracker.requestPermission()).toBe('granted');

  mocked.getForegroundPermissionsAsync.mockResolvedValue({ granted: false } as never);
  expect(await tracker.getPermission()).toBe('denied');
});
