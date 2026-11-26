import { Linking, Platform, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';

import type { LocationPermission } from '../types';

type PermissionNoticeProps = {
  permission: LocationPermission | null;
  onRequest: () => void;
};

/** Explains why location is needed; links to Settings once the OS stops asking. */
export function PermissionNotice({ permission, onRequest }: PermissionNoticeProps) {
  if (permission === 'granted' || permission === null) return null;

  if (permission === 'foreground_only') {
    return (
      <View className="gap-2 rounded-[20px] border border-hairline bg-ink-800 p-4">
        <Text className="text-sm font-semibold text-ink-50">
          {Platform.OS === 'android'
            ? 'Permita a localização "o tempo todo"'
            : 'Permita a localização "sempre"'}
        </Text>
        <Text className="text-sm text-ink-300">
          Sem ela, a gravação pode parar quando a tela bloquear ou você trocar de app.
        </Text>
        <Button
          label="Abrir configurações"
          variant="secondary"
          onPress={() => void Linking.openSettings()}
        />
      </View>
    );
  }

  return (
    <View className="gap-3 rounded-[20px] border border-hairline bg-ink-800 p-4">
      <Text className="text-base font-semibold text-ink-50">Precisamos da sua localização</Text>
      <Text className="text-sm text-ink-300">
        O Thunder usa o GPS para medir seu trajeto, distância e pace. Sua localização só é
        registrada enquanto uma corrida está sendo gravada.
      </Text>
      <Button label="Permitir localização" onPress={onRequest} />
      <Button
        label="Abrir configurações"
        variant="ghost"
        onPress={() => void Linking.openSettings()}
      />
    </View>
  );
}
