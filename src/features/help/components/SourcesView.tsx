import Ionicons from '@expo/vector-icons/Ionicons';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';

import { useThemeColors } from '@/theme/theme';

import { SOURCE_GROUPS, SOURCES_DISCLAIMER } from '../sources';

/** "Base científica e fontes": references with external links, plus an honest disclaimer. */
export function SourcesView() {
  const theme = useThemeColors();
  return (
    <ScrollView
      className="flex-1 bg-ink-900"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="gap-6 px-4 pb-12 pt-4"
    >
      <View className="flex-row gap-3 rounded-[20px] border border-hairline bg-ink-800 p-4">
        <Ionicons name="information-circle" size={20} color={theme.accent} />
        <Text className="flex-1 text-sm leading-5 text-ink-100">{SOURCES_DISCLAIMER}</Text>
      </View>

      {SOURCE_GROUPS.map((group) => (
        <View key={group.title} className="gap-3">
          <Text
            accessibilityRole="header"
            className="px-1 text-[11px] font-medium uppercase tracking-[1.5px] text-ink-400"
          >
            {group.title}
          </Text>
          {group.sources.map((source) => (
            <Pressable
              key={source.url}
              accessibilityRole="link"
              accessibilityLabel={`${source.title}. ${source.publisher}. Abre no navegador.`}
              onPress={() => void Linking.openURL(source.url)}
              className="gap-2 rounded-[20px] border border-hairline bg-ink-800 p-4 active:opacity-80"
            >
              <View className="flex-row items-start gap-3">
                <Text className="flex-1 text-[15px] font-bold leading-5 text-ink-50">
                  {source.title}
                </Text>
                <Ionicons name="open-outline" size={16} color={theme.accent} />
              </View>
              <Text className="text-xs font-semibold text-accent">{source.publisher}</Text>
              <Text className="text-sm leading-5 text-ink-300">{source.relevance}</Text>
            </Pressable>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}
