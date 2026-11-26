import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { useThemeColors } from '@/theme/theme';

import { type HelpArticle, searchHelp } from '../help-content';

function Article({
  article,
  open,
  onToggle,
}: {
  article: HelpArticle;
  open: boolean;
  onToggle: () => void;
}) {
  const theme = useThemeColors();
  return (
    <View className="border-t border-hairline">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={article.title}
        onPress={onToggle}
        className="flex-row items-center gap-3 py-3.5 active:opacity-70"
      >
        <Text className="flex-1 text-[15px] font-bold text-ink-50">{article.title}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={theme.ink[400]} />
      </Pressable>
      {open ? (
        <View className="gap-3 pb-4">
          <Text className="text-sm leading-5 text-ink-200">{article.summary}</Text>
          {article.steps.map((step, index) => (
            <View key={step} className="flex-row gap-3">
              <View className="h-6 w-6 items-center justify-center rounded-full bg-bolt-500/15">
                <Text className="text-xs font-semibold text-accent">{index + 1}</Text>
              </View>
              <Text className="flex-1 text-sm leading-5 text-ink-300">{step}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** "Ajuda / Como usar": quick search + categories with step-by-step mini tutorials. */
export function HelpCenter() {
  const theme = useThemeColors();
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const categories = useMemo(() => searchHelp(query), [query]);
  const searching = query.trim().length > 0;

  return (
    <ScrollView
      className="flex-1 bg-ink-900"
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerClassName="gap-5 px-4 pb-12 pt-4"
    >
      <View className="h-12 flex-row items-center gap-2 rounded-2xl border border-hairline bg-ink-800 px-4">
        <Ionicons name="search" size={18} color={theme.ink[400]} />
        <TextInput
          accessibilityLabel="Buscar na ajuda"
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar: GPS, dor, grupos, medalhas…"
          placeholderTextColor={theme.ink[400]}
          autoCorrect={false}
          returnKeyType="search"
          className="flex-1 text-base text-ink-50"
        />
        {searching ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Limpar busca"
            hitSlop={8}
            onPress={() => setQuery('')}
          >
            <Ionicons name="close-circle" size={18} color={theme.ink[400]} />
          </Pressable>
        ) : null}
      </View>

      {categories.length === 0 ? (
        <EmptyState
          compact
          icon="help-buoy-outline"
          title="Nada encontrado"
          description="Tente outra palavra, como corrida, dor, treino ou grupo."
        />
      ) : (
        categories.map((category) => (
          <View
            key={category.id}
            className="rounded-[20px] border border-hairline bg-ink-800 px-4 pt-4"
          >
            <View className="flex-row items-center gap-3 pb-3">
              <View className="h-10 w-10 items-center justify-center rounded-2xl bg-bolt-500/15">
                <Ionicons name={category.icon} size={20} color={theme.accent} />
              </View>
              <Text
                accessibilityRole="header"
                className="flex-1 text-base font-semibold text-ink-50"
              >
                {category.title}
              </Text>
            </View>
            {category.articles.map((article) => (
              <Article
                key={article.id}
                article={article}
                // While searching, matching articles open by themselves.
                open={searching || openId === article.id}
                onToggle={() =>
                  setOpenId((current) => (current === article.id ? null : article.id))
                }
              />
            ))}
          </View>
        ))
      )}

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/sources')}
        className="flex-row items-center gap-3 rounded-[20px] border border-hairline bg-ink-800 p-4 active:opacity-80"
      >
        <Ionicons name="library-outline" size={20} color={theme.accent} />
        <View className="flex-1">
          <Text className="text-[15px] font-bold text-ink-50">Base científica e fontes</Text>
          <Text className="text-xs text-ink-400">
            Referências gerais por trás dos treinos e dos alertas de dor
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.ink[400]} />
      </Pressable>
    </ScrollView>
  );
}
