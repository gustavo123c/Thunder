import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  type AnamneseDraft,
  computeParQRisk,
  emptyDraft,
  HEALTH_CONDITIONS,
  type ParQKey,
  PAR_Q_KEYS,
  PAR_Q_QUESTIONS,
  RUNNING_EXPERIENCE_LABELS,
  type RunningExperience,
} from '@/domain/health/anamnese';
import { BODY_REGIONS, REGION_INFO } from '@/domain/health/body-regions';
import { useThemeColors } from '@/theme/theme';
import { colors } from '@/theme/tokens';

type AnamneseFormProps = {
  initial?: AnamneseDraft;
  onSave: (draft: AnamneseDraft) => Promise<void>;
  onDelete?: () => Promise<void>;
  onSkip?: () => void;
};

const EXPERIENCE_OPTIONS: RunningExperience[] = ['none', 'beginner', 'intermediate', 'advanced'];
const FREQUENCY_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7];

const REGION_LABELS = BODY_REGIONS.map((r) => ({
  id: r,
  label: REGION_INFO[r].label,
}));

function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="font-mono-medium text-[11px] uppercase tracking-[1.5px] text-ink-400">
      {children}
    </Text>
  );
}

function ChipRow({
  options,
  selected,
  onToggle,
  multi = true,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (val: string) => void;
  multi?: boolean;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map(({ value, label }) => {
        const sel = selected.includes(value);
        return (
          <Pressable
            key={value}
            accessibilityRole={multi ? 'checkbox' : 'radio'}
            accessibilityState={{ checked: sel }}
            onPress={() => onToggle(value)}
            className={`rounded-full border px-3.5 py-2 active:opacity-70 ${sel ? 'border-bolt-500 bg-bolt-500/20' : 'border-hairline bg-ink-800'}`}
          >
            <Text className={`text-sm ${sel ? 'text-bolt-500' : 'text-ink-200'}`}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function YesNoRow({
  question,
  value,
  onChange,
}: {
  question: string;
  value: boolean | undefined;
  onChange: (val: boolean) => void;
}) {
  return (
    <View className="gap-2 rounded-2xl border border-hairline bg-ink-800 p-4">
      <Text className="text-sm leading-5 text-ink-100">{question}</Text>
      <View className="flex-row gap-3">
        {[true, false].map((opt) => {
          const sel = value === opt;
          return (
            <Pressable
              key={String(opt)}
              accessibilityRole="radio"
              accessibilityState={{ checked: sel }}
              onPress={() => onChange(opt)}
              className={`flex-1 items-center rounded-xl border py-2.5 active:opacity-80 ${sel ? 'border-bolt-500 bg-bolt-500/10' : 'border-hairline bg-ink-900'}`}
            >
              <Text className={`text-sm font-bold ${sel ? 'text-bolt-500' : 'text-ink-300'}`}>
                {opt ? 'Sim' : 'Não'}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function AnamneseForm({ initial, onSave, onDelete, onSkip }: AnamneseFormProps) {
  const theme = useThemeColors();
  const [draft, setDraft] = useState<AnamneseDraft>(initial ?? emptyDraft());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parQRisk = computeParQRisk(draft.parQ);
  const canSave = draft.consented;

  function set<K extends keyof AnamneseDraft>(key: K, value: AnamneseDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function toggleStringArray(key: 'currentInjuries' | 'pastInjuries' | 'healthConditions', val: string) {
    setDraft((prev) => {
      const arr = prev[key];
      return {
        ...prev,
        [key]: arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val],
      };
    });
  }

  function setParQ(key: ParQKey, val: boolean) {
    setDraft((prev) => ({ ...prev, parQ: { ...prev.parQ, [key]: val } }));
  }

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(draft);
    } catch {
      setError('Não foi possível salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <ScrollView
      contentContainerClassName="gap-6 px-4 pb-12 pt-4"
      showsVerticalScrollIndicator={false}
    >
      <View className="gap-1">
        <Text className="font-display text-2xl text-ink-50">Questionário de saúde</Text>
        <Text className="text-sm leading-5 text-ink-300">
          Suas respostas ajudam a personalizar os treinos. Dados de saúde são sensíveis e ficam
          protegidos com acesso exclusivo seu (LGPD).
        </Text>
      </View>

      {/* Running experience */}
      <View className="gap-3">
        <SectionTitle>Experiência com corrida</SectionTitle>
        <ChipRow
          options={EXPERIENCE_OPTIONS.map((e) => ({ value: e, label: RUNNING_EXPERIENCE_LABELS[e] }))}
          selected={draft.runningExperience ? [draft.runningExperience] : []}
          onToggle={(val) => set('runningExperience', val as RunningExperience)}
          multi={false}
        />
      </View>

      {/* Weekly frequency */}
      <View className="gap-3">
        <SectionTitle>Dias de corrida por semana</SectionTitle>
        <View className="flex-row flex-wrap gap-2">
          {FREQUENCY_OPTIONS.map((n) => {
            const sel = draft.weeklyFrequency === n;
            return (
              <Pressable
                key={n}
                onPress={() => set('weeklyFrequency', n)}
                className={`h-11 w-11 items-center justify-center rounded-full border active:opacity-70 ${sel ? 'border-bolt-500 bg-bolt-500/20' : 'border-hairline bg-ink-800'}`}
              >
                <Text className={`font-mono text-base ${sel ? 'text-bolt-500' : 'text-ink-200'}`}>
                  {n}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Current injuries */}
      <View className="gap-3">
        <SectionTitle>Lesões atuais</SectionTitle>
        <ChipRow
          options={REGION_LABELS.map((r) => ({ value: r.id, label: r.label }))}
          selected={draft.currentInjuries}
          onToggle={(val) => toggleStringArray('currentInjuries', val)}
        />
      </View>

      {/* Past injuries */}
      <View className="gap-3">
        <SectionTitle>Lesões passadas</SectionTitle>
        <ChipRow
          options={REGION_LABELS.map((r) => ({ value: r.id, label: r.label }))}
          selected={draft.pastInjuries}
          onToggle={(val) => toggleStringArray('pastInjuries', val)}
        />
      </View>

      {/* Surgeries */}
      <View className="gap-3">
        <SectionTitle>Cirurgias relevantes (opcional)</SectionTitle>
        <TextInput
          placeholder="Ex: joelho, coluna..."
          placeholderTextColor={theme.ink[500]}
          value={draft.surgeries}
          onChangeText={(val) => set('surgeries', val)}
          className="rounded-2xl border border-hairline bg-ink-800 p-4 text-base text-ink-50"
        />
      </View>

      {/* Health conditions */}
      <View className="gap-3">
        <SectionTitle>Condições de saúde</SectionTitle>
        <ChipRow
          options={HEALTH_CONDITIONS.map((c) => ({ value: c, label: c }))}
          selected={draft.healthConditions}
          onToggle={(val) => toggleStringArray('healthConditions', val)}
        />
      </View>

      {/* Medications */}
      <View className="gap-3">
        <SectionTitle>Medicamentos de uso contínuo (opcional)</SectionTitle>
        <TextInput
          placeholder="Ex: metformina, losartana..."
          placeholderTextColor={theme.ink[500]}
          value={draft.medications}
          onChangeText={(val) => set('medications', val)}
          className="rounded-2xl border border-hairline bg-ink-800 p-4 text-base text-ink-50"
        />
      </View>

      {/* PAR-Q */}
      <View className="gap-3">
        <SectionTitle>Prontidão para atividade física (PAR-Q)</SectionTitle>
        {PAR_Q_KEYS.map((key) => (
          <YesNoRow
            key={key}
            question={PAR_Q_QUESTIONS[key]}
            value={draft.parQ[key]}
            onChange={(val) => setParQ(key, val)}
          />
        ))}
        {parQRisk ? (
          <View className="flex-row gap-3 rounded-2xl border border-danger/40 bg-danger/10 p-4">
            <Ionicons name="warning-outline" size={20} color={colors.danger} />
            <Text className="flex-1 text-sm leading-5 text-ink-100">
              Recomendamos avaliação médica antes de iniciar ou intensificar os treinos.
            </Text>
          </View>
        ) : null}
      </View>

      {/* LGPD consent */}
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: draft.consented }}
        onPress={() => set('consented', !draft.consented)}
        className="flex-row items-start gap-3 rounded-2xl border border-hairline bg-ink-800 p-4"
      >
        <View
          className={`mt-0.5 h-5 w-5 items-center justify-center rounded border-2 ${draft.consented ? 'border-bolt-500 bg-bolt-500' : 'border-ink-500'}`}
        >
          {draft.consented ? <Ionicons name="checkmark" size={12} color="#000" /> : null}
        </View>
        <Text className="flex-1 text-sm leading-5 text-ink-200">
          Consinto que o Thunder armazene minhas informações de saúde para personalizar meus
          treinos. Posso apagar esses dados a qualquer momento em Configurações.
        </Text>
      </Pressable>

      {error ? (
        <Text className="text-sm text-danger">{error}</Text>
      ) : null}

      {/* Save */}
      <Pressable
        onPress={handleSave}
        disabled={saving || !canSave}
        className={`items-center rounded-2xl py-4 active:opacity-80 ${canSave ? 'bg-bolt-500' : 'bg-ink-700'}`}
      >
        {saving ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text className={`font-mono-medium text-sm uppercase tracking-wider ${canSave ? 'text-onbolt' : 'text-ink-400'}`}>
            Salvar
          </Text>
        )}
      </Pressable>

      {onSkip ? (
        <Pressable onPress={onSkip} className="items-center py-2">
          <Text className="text-sm text-ink-400">Preencher depois</Text>
        </Pressable>
      ) : null}

      {onDelete ? (
        <Pressable
          onPress={handleDelete}
          disabled={deleting}
          className="items-center py-2"
        >
          {deleting ? (
            <ActivityIndicator size="small" color={colors.danger} />
          ) : (
            <Text className="text-sm text-danger">Apagar dados de saúde</Text>
          )}
        </Pressable>
      ) : null}
    </ScrollView>
  );
}
