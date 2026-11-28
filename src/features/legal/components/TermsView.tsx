import { Text, View } from 'react-native';

import { TERMS_INTRO, TERMS_SECTIONS, TERMS_TITLE, TERMS_VERSION } from '../terms-content';

/** The full Terms of Use, split in sections. The caller provides the scroll view. */
export function TermsView() {
  return (
    <View className="gap-6">
      <View className="gap-2">
        <Text accessibilityRole="header" className="font-display text-[22px] text-ink-50">
          {TERMS_TITLE}
        </Text>
        <Text className="font-mono text-xs text-ink-400">Versão {TERMS_VERSION}</Text>
        <Text className="text-sm leading-5 text-ink-300">{TERMS_INTRO}</Text>
      </View>
      {TERMS_SECTIONS.map((section) => (
        <View
          key={section.title}
          className={
            section.highlight
              ? 'gap-2 rounded-r-xl border-l-4 border-bolt-500 bg-ink-800 p-4'
              : 'gap-2'
          }
        >
          <Text accessibilityRole="header" className="text-base font-bold text-ink-50">
            {section.title}
          </Text>
          {section.paragraphs.map((paragraph) => (
            <Text key={paragraph} className="text-sm leading-6 text-ink-200">
              {paragraph}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}
