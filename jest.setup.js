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

// The 3D body needs a GL context (expo-gl); tests get a stand-in with the same props.
jest.mock('@/features/health/components/body3d/Body3D', () => {
  const { Pressable, Text } = require('react-native');
  return {
    Body3D: ({ onSelect }) => (
      <Pressable testID="body-3d" onPress={() => onSelect({ region: 'knee', side: 'left' })}>
        <Text>Corpo 3D</Text>
      </Pressable>
    ),
  };
});
