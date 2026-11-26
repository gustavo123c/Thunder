import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import {
  type AccessibilityState,
  type ColorValue,
  type GestureResponderEvent,
  Pressable,
  Text,
  View,
} from 'react-native';

import { useUserId } from '@/features/auth';
import { useRunTrackingBootstrap } from '@/features/run-tracking';
import { useThemeColors } from '@/theme/theme';
import { colors } from '@/theme/tokens';

type IconName = ComponentProps<typeof Ionicons>['name'];

function tabIcon(active: IconName, inactive: IconName) {
  function Icon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return (
      <Ionicons
        name={focused ? active : inactive}
        size={23}
        // Tab tint colors are always hex strings (see screenOptions below).
        color={typeof color === 'string' ? color : undefined}
      />
    );
  }
  return Icon;
}

type TabButtonProps = {
  onPress?: ((event: GestureResponderEvent) => void) | null;
  onLongPress?: ((event: GestureResponderEvent) => void) | null;
  accessibilityState?: AccessibilityState;
};

/** Elevated circular amber button for the central "Correr" tab. */
function RecordTabButton({ onPress, onLongPress, accessibilityState }: TabButtonProps) {
  const theme = useThemeColors();
  const selected = accessibilityState?.selected ?? false;
  return (
    <View className="flex-1 items-center">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Correr"
        accessibilityState={{ selected }}
        onPress={onPress ?? undefined}
        onLongPress={onLongPress ?? undefined}
        className="-mt-6 items-center gap-1"
      >
        <View
          className="h-16 w-16 items-center justify-center rounded-full border-4 border-ink-900 bg-bolt-500"
          style={{
            shadowColor: theme.accent,
            shadowOpacity: 0.35,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 8,
          }}
        >
          <Ionicons name="play" size={26} color={colors.onBolt} style={{ marginLeft: 3 }} />
        </View>
        <Text className={`text-[11px] font-bold ${selected ? 'text-accent' : 'text-ink-300'}`}>
          Correr
        </Text>
      </Pressable>
    </View>
  );
}

export default function TabsLayout() {
  const theme = useThemeColors();
  const userId = useUserId();
  // Restores an interrupted run and uploads runs saved while offline.
  useRunTrackingBootstrap(userId);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.ink[400],
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: theme.ink[900],
          borderTopColor: theme.hairline,
          borderTopWidth: 1,
          height: 84,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{ title: 'Feed', tabBarIcon: tabIcon('flash', 'flash-outline') }}
      />
      <Tabs.Screen
        name="training"
        options={{ title: 'Treino', tabBarIcon: tabIcon('barbell', 'barbell-outline') }}
      />
      <Tabs.Screen
        name="record"
        options={{
          title: 'Correr',
          tabBarButton: (props) => (
            <RecordTabButton
              onPress={props.onPress}
              onLongPress={props.onLongPress}
              accessibilityState={props.accessibilityState}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: 'Histórico', tabBarIcon: tabIcon('stats-chart', 'stats-chart-outline') }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Perfil', tabBarIcon: tabIcon('person', 'person-outline') }}
      />
    </Tabs>
  );
}
