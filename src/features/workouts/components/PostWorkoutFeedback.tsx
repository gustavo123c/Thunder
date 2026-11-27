import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { BodyRegion, BodySide, PainEntry } from '@/domain/health/body-regions';
import { PAIN_PRESETS } from '@/domain/health/body-regions';
import {
  FEEDBACK_LABELS,
  type FeedbackIssue,
  hasSafetyRisk,
  type NextPreference,
  type RunFeedbackDraft,
} from '@/domain/training/run-feedback';
import { generateWorkout, type WorkoutRequest } from '@/domain/training/workout-generator';
import { ThemeScope } from '@/theme/AppThemeProvider';
import { useThemeColors } from '@/theme/theme';
import { colors } from '@/theme/tokens';

import { saveRunFeedback } from '../api/run-feedback.api';
import { newWorkoutId, saveWorkout } from '../api/workouts.api';

const ISSUES: FeedbackIssue[] = [
  'breath',
  'pain',
  'pace_hard',
  'pace_easy',
  'short_time',
  'motivation',
  'nothing',
  'other',
];

type PainPickerProps = {
  painRegions: PainEntry[];
  onAdd: (entry: PainEntry) => void;
  onRemove: (region: BodyRegion, side: BodySide) => void;
};

function PainPicker({ painRegions, onAdd, onRemove }: PainPickerProps) {
  const [pickRegion, setPickRegion] = useState<{ region: BodyRegion; side: BodySide } | null>(
    null,
  );

  const regions: { region: BodyRegion; side: BodySide; label: string }[] = [
    { region: 'chest', side: 'center', label: 'Peito' },
    { region: 'knee', side: 'left', label: 'Joelho esquerdo' },
    { region: 'knee', side: 'right', label: 'Joelho direito' },
    { region: 'calf', side: 'left', label: 'Panturrilha esquerda' },
    { region: 'calf', side: 'right', label: 'Panturrilha direita' },
    { region: 'shin', side: 'left', label: 'Canela esquerda' },
    { region: 'shin', side: 'right', label: 'Canela direita' },
    { region: 'ankle', side: 'left', label: 'Tornozelo esquerdo' },
    { region: 'ankle', side: 'right', label: 'Tornozelo direito' },
    { region: 'foot', side: 'left', label: 'Pé esquerdo' },
    { region: 'foot', side: 'right', label: 'Pé direito' },
    { region: 'hip', side: 'left', label: 'Quadril esquerdo' },
    { region: 'hip', side: 'right', label: 'Quadril direito' },
    { region: 'lower_back', side: 'center', label: 'Lombar' },
    { region: 'it_band', side: 'left', label: 'Banda iliotibial esq.' },
    { region: 'it_band', side: 'right', label: 'Banda iliotibial dir.' },
  ];

  function isSelected(region: BodyRegion, side: BodySide) {
    return painRegions.some((p) => p.region === region && p.side === side);
  }

  function handlePress(region: BodyRegion, side: BodySide) {
    if (isSelected(region, side)) {
      onRemove(region, side);
    } else {
      setPickRegion({ region, side });
    }
  }

  return (
    <>
      <Text className="mb-2 text-sm text-ink-300">Marque onde dói:</Text>
      <View className="flex-row flex-wrap gap-2">
        {regions.map(({ region, side, label }) => {
          const sel = isSelected(region, side);
          return (
            <Pressable
              key={`${region}-${side}`}
              onPress={() => handlePress(region, side)}
              className={`rounded-full border px-3 py-1.5 ${sel ? 'border-bolt-500 bg-bolt-500/20' : 'border-hairline bg-ink-700'}`}
            >
              <Text className={`text-sm ${sel ? 'text-bolt-500' : 'text-ink-200'}`}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Intensity picker modal */}
      <Modal
        visible={pickRegion !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setPickRegion(null)}
      >
        <ThemeScope>
          <Pressable
            className="flex-1 bg-black/40"
            onPress={() => setPickRegion(null)}
            accessibilityLabel="Fechar"
          />
          <SafeAreaView
            edges={['bottom']}
            className="gap-4 rounded-t-[28px] border-t border-hairline bg-ink-800 px-5 pb-4 pt-5"
          >
            <Text className="font-display text-lg text-ink-50">Intensidade da dor</Text>
            {(['mild', 'moderate', 'severe'] as const).map((level) => (
              <Pressable
                key={level}
                accessibilityRole="button"
                onPress={() => {
                  if (pickRegion) {
                    onAdd({ region: pickRegion.region, side: pickRegion.side, intensity: PAIN_PRESETS[level].intensity });
                    setPickRegion(null);
                  }
                }}
                className="rounded-2xl border border-hairline bg-ink-900 p-3.5 active:opacity-80"
              >
                <Text className="text-base text-ink-50">{PAIN_PRESETS[level].label}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setPickRegion(null)} className="items-center py-2">
              <Text className="text-sm text-ink-400">Cancelar</Text>
            </Pressable>
          </SafeAreaView>
        </ThemeScope>
      </Modal>
    </>
  );
}

type PostWorkoutFeedbackProps = {
  visible: boolean;
  runId: string;
  userId: string;
  recentPaceSPerKm: number | null;
  onClose: () => void;
};

export function PostWorkoutFeedback({
  visible,
  runId,
  userId,
  recentPaceSPerKm,
  onClose,
}: PostWorkoutFeedbackProps) {
  const theme = useThemeColors();
  const [issues, setIssues] = useState<FeedbackIssue[]>([]);
  const [painRegions, setPainRegions] = useState<PainEntry[]>([]);
  const [otherText, setOtherText] = useState('');
  const [nextPreference, setNextPreference] = useState<NextPreference | null>(null);
  const [saving, setSaving] = useState(false);

  const draft: RunFeedbackDraft = { issues, painRegions, otherText, nextPreference };
  const safetyRisk = hasSafetyRisk(draft);

  function toggleIssue(issue: FeedbackIssue) {
    setIssues((prev) => {
      if (issue === 'nothing') return prev.includes('nothing') ? [] : ['nothing'];
      const without = prev.filter((i) => i !== 'nothing');
      return without.includes(issue) ? without.filter((i) => i !== issue) : [...without, issue];
    });
  }

  function addPainRegion(entry: PainEntry) {
    setPainRegions((prev) => {
      const without = prev.filter((p) => !(p.region === entry.region && p.side === entry.side));
      return [...without, entry];
    });
  }

  function removePainRegion(region: BodyRegion, side: BodySide) {
    setPainRegions((prev) => prev.filter((p) => !(p.region === region && p.side === side)));
  }

  async function handleSave() {
    setSaving(true);
    try {
      let generatedWorkoutId: string | undefined;

      if (nextPreference === 'lighter' && !safetyRisk) {
        // Determine adjusted pace and preferred type based on issues
        let paceDelta = 0;
        let preferType: WorkoutRequest['type'] = 'easy';

        if (issues.includes('breath') || issues.includes('pace_hard')) {
          paceDelta = 15;
          preferType = 'easy';
        } else if (issues.includes('pace_easy')) {
          paceDelta = -10;
          preferType = 'tempo';
        } else if (issues.includes('motivation')) {
          preferType = 'fartlek';
        }

        const adjustedPace = recentPaceSPerKm ? recentPaceSPerKm + paceDelta : null;

        const request: WorkoutRequest = {
          type: preferType,
          level: 'beginner',
          durationMin: 30,
          pains: painRegions,
          recentPaceSPerKm: adjustedPace,
        };

        const plan = generateWorkout(request);
        generatedWorkoutId = newWorkoutId();
        await saveWorkout(userId, request, plan, generatedWorkoutId);
      }

      await saveRunFeedback({
        runId,
        userId,
        issues,
        painRegions: painRegions.length > 0 ? painRegions : undefined,
        otherText: otherText || undefined,
        nextPreference: nextPreference ?? undefined,
        safetyAlert: safetyRisk,
        generatedWorkoutId,
      });

      onClose();
    } catch (err) {
      console.warn('[PostWorkoutFeedback] save error', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <ThemeScope>
        <Pressable
          className="flex-1 bg-black/40"
          onPress={onClose}
          accessibilityLabel="Fechar"
        />
        <SafeAreaView
          edges={['bottom']}
          className="max-h-[85%] rounded-t-[28px] border-t border-hairline bg-ink-900"
        >
          <View className="-mb-1 mt-3 h-1 w-10 self-center rounded-full bg-ink-600" />
          <ScrollView
            contentContainerClassName="gap-6 px-5 pb-6 pt-5"
            showsVerticalScrollIndicator={false}
          >
            <Text className="font-display text-xl text-ink-50">Como foi o treino?</Text>

            {/* Issue chips */}
            <View className="gap-3">
              <Text className="text-sm text-ink-300">
                O que você acha que faltou para o seu treino ser melhor?
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {ISSUES.map((issue) => {
                  const sel = issues.includes(issue);
                  return (
                    <Pressable
                      key={issue}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: sel }}
                      onPress={() => toggleIssue(issue)}
                      className={`rounded-full border px-3.5 py-2 active:opacity-70 ${sel ? 'border-bolt-500 bg-bolt-500/20' : 'border-hairline bg-ink-800'}`}
                    >
                      <Text className={`text-sm ${sel ? 'text-bolt-500' : 'text-ink-200'}`}>
                        {FEEDBACK_LABELS[issue]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Pain region picker */}
            {issues.includes('pain') ? (
              <View className="gap-2 rounded-2xl border border-hairline bg-ink-800 p-4">
                <PainPicker
                  painRegions={painRegions}
                  onAdd={addPainRegion}
                  onRemove={removePainRegion}
                />
              </View>
            ) : null}

            {/* Other text */}
            {issues.includes('other') ? (
              <TextInput
                placeholder="Descreva o que aconteceu..."
                placeholderTextColor={theme.ink[500]}
                value={otherText}
                onChangeText={setOtherText}
                multiline
                className="rounded-2xl border border-hairline bg-ink-800 p-4 text-base text-ink-50"
                style={{ minHeight: 72 }}
              />
            ) : null}

            {/* Safety alert */}
            {safetyRisk ? (
              <View className="flex-row gap-3 rounded-2xl border border-danger/40 bg-danger/10 p-4">
                <Ionicons name="warning-outline" size={20} color={colors.danger} />
                <Text className="flex-1 text-sm leading-5 text-ink-100">
                  Se você sentiu dor no peito, tontura, desmaio ou falta de ar intensa,
                  interrompa os treinos e procure avaliação médica antes de continuar.
                </Text>
              </View>
            ) : null}

            {/* Lighter / same question */}
            {issues.length > 0 && !safetyRisk && !issues.includes('nothing') ? (
              <View className="gap-3">
                <Text className="text-sm text-ink-300">
                  Quer um treino mais leve para se adaptar ou prefere continuar com o mesmo?
                </Text>
                {(['lighter', 'same'] as const).map((pref) => {
                  const sel = nextPreference === pref;
                  const label = pref === 'lighter' ? 'Treino mais leve' : 'Continuar igual';
                  return (
                    <Pressable
                      key={pref}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: sel }}
                      onPress={() => setNextPreference(pref)}
                      className={`flex-row items-center gap-3 rounded-2xl border p-3.5 active:opacity-80 ${sel ? 'border-bolt-500 bg-bolt-500/10' : 'border-hairline bg-ink-800'}`}
                    >
                      <View
                        className={`h-5 w-5 items-center justify-center rounded-full border-2 ${sel ? 'border-bolt-500' : 'border-ink-500'}`}
                      >
                        {sel ? (
                          <View className="h-2.5 w-2.5 rounded-full bg-bolt-500" />
                        ) : null}
                      </View>
                      <Text className="text-base text-ink-50">{label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {/* Save button */}
            <Pressable
              onPress={handleSave}
              disabled={saving || issues.length === 0}
              className={`items-center rounded-2xl py-4 active:opacity-80 ${issues.length === 0 ? 'bg-ink-700' : 'bg-bolt-500'}`}
            >
              {saving ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text className={`font-mono-medium text-sm uppercase tracking-wider ${issues.length === 0 ? 'text-ink-400' : 'text-onbolt'}`}>
                  Salvar
                </Text>
              )}
            </Pressable>

            <Pressable onPress={onClose} className="items-center py-2">
              <Text className="text-sm text-ink-400">Pular</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </ThemeScope>
    </Modal>
  );
}
