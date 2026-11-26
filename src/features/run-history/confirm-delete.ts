import { Alert } from 'react-native';

/** Confirmation dialog shared by the history list and the run detail. */
export function confirmDeleteRun(onConfirm: () => void): void {
  Alert.alert(
    'Apagar corrida?',
    'Tem certeza que deseja apagar esta corrida? Essa ação não pode ser desfeita. Fotos, vídeos, comentários e raios também serão apagados.',
    [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: onConfirm },
    ],
  );
}
