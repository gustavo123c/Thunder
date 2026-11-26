/* global jest */
// Official in-memory AsyncStorage mock (native module is absent under Jest).
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// expo-crypto needs native code; Node's crypto gives real UUIDs in tests.
jest.mock('expo-crypto', () => ({
  ...jest.requireActual('expo-crypto'),
  randomUUID: () => require('node:crypto').randomUUID(),
}));
