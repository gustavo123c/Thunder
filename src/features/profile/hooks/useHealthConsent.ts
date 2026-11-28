import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';

import { grantHealthConsent, revokeHealthConsent } from '../api/health-consent.api';

export const HEALTH_CONSENT_TEXT =
  'Autorizo o Thunder a usar meus dados de saúde (dores marcadas no mapa do corpo, questionário de saúde e avaliações após os treinos) para adaptar as sugestões de treino, como descrito na seção 6 dos Termos de Uso. Posso revogar quando quiser em Configurações.';

const FAILED = () =>
  Alert.alert('Não foi possível salvar', 'Verifique sua conexão e tente de novo.');

/** Grant / revoke the optional health data consent, each behind a confirmation. */
export function useHealthConsent(userId: string) {
  const queryClient = useQueryClient();
  // Health data shows up in many queries (pains, questionnaire, workouts): refresh everything.
  const refresh = () => queryClient.invalidateQueries();

  const grant = useMutation({ mutationFn: () => grantHealthConsent(userId), onSettled: refresh });
  const revoke = useMutation({ mutationFn: revokeHealthConsent, onSettled: refresh });

  function askToGrant() {
    Alert.alert('Usar dados de saúde?', HEALTH_CONSENT_TEXT, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Autorizar', onPress: () => grant.mutate(undefined, { onError: FAILED }) },
    ]);
  }

  function askToRevoke() {
    Alert.alert(
      'Revogar o uso de dados de saúde?',
      'Vamos apagar suas dores, o questionário de saúde e as avaliações após os treinos. Os treinos deixam de se adaptar a dores. Suas corridas e treinos salvos continuam. Essa ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Revogar e apagar',
          style: 'destructive',
          onPress: () => revoke.mutate(undefined, { onError: FAILED }),
        },
      ],
    );
  }

  return { askToGrant, askToRevoke, pending: grant.isPending || revoke.isPending };
}
