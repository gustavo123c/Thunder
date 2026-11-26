import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { BrandHeader } from '@/components/ui/BrandHeader';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useUserId } from '@/features/auth';
import { FeedList, GroupsPanel } from '@/features/social';
import { useThemeColors } from '@/theme/theme';

type FeedTab = 'feed' | 'groups';

const TABS = [
  { value: 'feed', label: 'Feed' },
  { value: 'groups', label: 'Grupos' },
] as const satisfies readonly { value: FeedTab; label: string }[];

export default function FeedScreen() {
  const viewerId = useUserId();
  const theme = useThemeColors();
  const [tab, setTab] = useState<FeedTab>('feed');

  // Brand on top; the Feed | Grupos switch is the screen title (no duplicated "Feed").
  const header = (
    <View className="gap-4 pb-1">
      <BrandHeader />
      <View className="flex-row items-center gap-3">
        <View className="flex-1">
          <SegmentedControl
            role="tab"
            accessibilityLabel="Feed ou grupos"
            options={TABS}
            value={tab}
            onChange={setTab}
          />
        </View>
        {tab === 'feed' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Encontrar corredores"
            hitSlop={8}
            onPress={() => router.push('/people')}
            className="h-12 w-12 items-center justify-center rounded-2xl border border-hairline bg-ink-800 active:bg-ink-700"
          >
            <Ionicons name="person-add-outline" size={20} color={theme.ink[100]} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  return (
    <Screen className="px-0">
      {tab === 'feed' ? (
        <FeedList viewerId={viewerId} header={header} />
      ) : (
        <GroupsPanel header={header} />
      )}
    </Screen>
  );
}
