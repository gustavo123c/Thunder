import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { useUserId } from '@/features/auth';
import { useRunTrackingBootstrap } from '@/features/run-tracking';
import { colors } from '@/theme/tokens';

type IconName = ComponentProps<typeof Ionicons>['name'];

type TabIconProps = { name: IconName; color: ColorValue; size: number };

function TabIcon({ name, color, size }: TabIconProps) {
  // Tab tint colors are always hex strings (see screenOptions below).
  return <Ionicons name={name} color={typeof color === 'string' ? color : undefined} size={size} />;
}

function tabIcon(name: IconName) {
  function Icon({ color, size }: { color: ColorValue; size: number }) {
    return <TabIcon name={name} color={color} size={size} />;
  }
  return Icon;
}

export default function TabsLayout() {
  const userId = useUserId();
  // Restores an interrupted run and uploads runs saved while offline.
  useRunTrackingBootstrap(userId);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.bolt[500],
        tabBarInactiveTintColor: colors.ink[400],
      }}
    >
      <Tabs.Screen name="feed" options={{ title: 'Feed', tabBarIcon: tabIcon('flash') }} />
      <Tabs.Screen
        name="record"
        options={{ title: 'Correr', tabBarIcon: tabIcon('play-circle') }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: 'Histórico', tabBarIcon: tabIcon('stats-chart') }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Perfil', tabBarIcon: tabIcon('person') }} />
    </Tabs>
  );
}
