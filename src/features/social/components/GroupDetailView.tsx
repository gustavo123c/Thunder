import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Share, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { hasRecordedDistance } from '@/domain/metrics/recorded-distance';
import { formatDecimal } from '@/lib/format';
import { useThemeColors } from '@/theme/theme';
import { colors } from '@/theme/tokens';

import type { LeaderboardRow, RunGroup } from '../api/groups.api';
import {
  useDeleteGroup,
  useGroup,
  useGroupFeed,
  useGroupLeaderboard,
  useLeaveGroup,
} from '../hooks/useGroups';
import { displayName } from './AuthorRow';
import { FeedRunCard } from './FeedRunCard';

type Tab = 'ranking' | 'feed';

const TABS = [
  { value: 'ranking', label: 'Ranking' },
  { value: 'feed', label: 'Feed do grupo' },
] as const satisfies readonly { value: Tab; label: string }[];

const PODIUM = ['#FACC15', '#C9D1DC', '#D97706'] as const; // gold, silver, bronze

export function inviteMessage(group: Pick<RunGroup, 'name' | 'inviteCode'>): string {
  return `Corre comigo no Thunder! Entre no grupo "${group.name}" com o código ${group.inviteCode} (Feed → Grupos → Entrar com código).`;
}

function GroupHeader({ group }: { group: RunGroup }) {
  const theme = useThemeColors();
  return (
    <Card variant="highlight" className="gap-4">
      <View className="flex-row items-center gap-3">
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-bolt-500">
          <Ionicons name="people" size={24} color={colors.onBolt} />
        </View>
        <View className="flex-1">
          <Text accessibilityRole="header" className="text-2xl font-bold text-ink-50">
            {group.name}
          </Text>
          <Text className="text-xs text-ink-400">
            {group.memberCount} {group.memberCount === 1 ? 'membro' : 'membros'}
          </Text>
        </View>
      </View>
      <View className="flex-row items-center gap-3 rounded-2xl border border-hairline bg-ink-900 p-3">
        <Ionicons name="key-outline" size={18} color={theme.ink[300]} />
        <View className="flex-1">
          <Text className="text-[11px] font-medium uppercase tracking-[1.5px] text-ink-400">
            Código de convite
          </Text>
          <Text
            selectable
            className="text-xl font-extrabold tracking-[3px] text-ink-50"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {group.inviteCode}
          </Text>
        </View>
        <Button
          label="Convidar"
          icon="share-social-outline"
          variant="secondary"
          onPress={() => void Share.share({ message: inviteMessage(group) })}
        />
      </View>
    </Card>
  );
}

function RankingRow({
  row,
  position,
  isViewer,
}: {
  row: LeaderboardRow;
  position: number;
  isViewer: boolean;
}) {
  const podium = PODIUM[position - 1];
  return (
    <View
      accessible
      accessibilityLabel={`${position}º lugar, ${displayName(row.author)}, ${formatDecimal(
        row.distanceM / 1000,
      )} quilômetros em ${row.runs} ${row.runs === 1 ? 'corrida' : 'corridas'}`}
      className={`flex-row items-center gap-3 rounded-[20px] border p-3 ${
        isViewer ? 'border-hairline bg-bolt-500/10' : 'border-hairline bg-ink-800'
      }`}
    >
      <View
        className="h-8 w-8 items-center justify-center rounded-full"
        style={{ backgroundColor: podium ?? 'transparent' }}
      >
        <Text
          className={`text-sm font-extrabold ${podium ? 'text-onbolt' : 'text-ink-300'}`}
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {position}
        </Text>
      </View>
      <Avatar name={displayName(row.author)} imageUrl={row.author.avatarUrl} size={36} />
      <View className="flex-1">
        <Text className="text-sm font-bold text-ink-50" numberOfLines={1}>
          {displayName(row.author)}
          {isViewer ? ' (você)' : ''}
        </Text>
        <Text className="text-xs text-ink-400">
          {row.runs} {row.runs === 1 ? 'corrida' : 'corridas'}
        </Text>
      </View>
      <View className="flex-row items-baseline gap-1">
        <Text
          className="text-[22px] font-extrabold text-ink-50"
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {formatDecimal(row.distanceM / 1000)}
        </Text>
        <Text className="text-xs font-semibold text-ink-400">km</Text>
      </View>
    </View>
  );
}

/** Group page: invite code, weekly ranking and the group's shared feed. */
export function GroupDetailView({ groupId, viewerId }: { groupId: string; viewerId: string }) {
  const theme = useThemeColors();
  const [tab, setTab] = useState<Tab>('ranking');
  const group = useGroup(groupId);
  const ranking = useGroupLeaderboard(groupId);
  const feed = useGroupFeed(groupId);
  const leave = useLeaveGroup(viewerId);
  const remove = useDeleteGroup();

  if (group.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-ink-900">
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }
  if (!group.data) {
    return (
      <View className="flex-1 bg-ink-900 px-4 pt-8">
        <EmptyState
          icon="people-outline"
          title="Grupo não encontrado"
          description="Você pode ter saído deste grupo."
        />
      </View>
    );
  }

  const current = group.data;
  const isOwner = current.ownerId === viewerId;

  function confirmExit() {
    Alert.alert(
      isOwner ? 'Apagar o grupo?' : 'Sair do grupo?',
      isOwner
        ? 'O grupo e o ranking serão apagados para todos os membros.'
        : 'Você pode voltar depois com o código de convite.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: isOwner ? 'Apagar' : 'Sair',
          style: 'destructive',
          onPress: () =>
            (isOwner ? remove : leave).mutate(groupId, { onSuccess: () => router.back() }),
        },
      ],
    );
  }

  const header = (
    <View className="gap-4 pb-1">
      <GroupHeader group={current} />
      <SegmentedControl
        role="tab"
        accessibilityLabel="Seções do grupo"
        options={TABS}
        value={tab}
        onChange={setTab}
      />
      {tab === 'ranking' ? (
        <Text className="px-1 text-xs text-ink-400">
          Distância desta semana (desde segunda). Corridas privadas não entram no ranking.
        </Text>
      ) : null}
    </View>
  );

  const footer = (
    <View className="pt-4">
      <Button
        label={isOwner ? 'Apagar grupo' : 'Sair do grupo'}
        icon={isOwner ? 'trash-outline' : 'exit-outline'}
        variant="ghost"
        onPress={confirmExit}
      />
    </View>
  );

  if (tab === 'ranking') {
    return (
      <FlatList
        className="flex-1 bg-ink-900"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-3 px-4 pb-10 pt-4"
        data={ranking.data ?? []}
        keyExtractor={(row) => row.author.id}
        ListHeaderComponent={header}
        ListEmptyComponent={
          ranking.isPending ? <ActivityIndicator color={theme.accent} /> : undefined
        }
        renderItem={({ item, index }) => (
          <RankingRow row={item} position={index + 1} isViewer={item.author.id === viewerId} />
        )}
        ListFooterComponent={footer}
      />
    );
  }

  return (
    <FlatList
      className="flex-1 bg-ink-900"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="gap-4 px-4 pb-10 pt-4"
      data={(feed.data?.pages.flat() ?? []).filter((item) => hasRecordedDistance(item.distanceM))}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={header}
      ListEmptyComponent={
        feed.isPending ? (
          <ActivityIndicator color={theme.accent} />
        ) : (
          <EmptyState
            compact
            icon="walk-outline"
            title="Nenhuma corrida ainda"
            description="As corridas dos membros (públicas ou para seguidores) aparecem aqui."
          />
        )
      }
      renderItem={({ item }) => <FeedRunCard item={item} viewerId={viewerId} />}
      onEndReachedThreshold={0.5}
      onEndReached={() => {
        if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage();
      }}
      ListFooterComponent={footer}
    />
  );
}
