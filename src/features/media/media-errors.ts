import { MEDIA_LIMITS } from '@/domain/media/media-rules';

import { MediaValidationError } from './api/media.api';

const MB = 1024 * 1024;

export function describeMediaError(error: unknown): string {
  if (error instanceof MediaValidationError) {
    switch (error.code) {
      case 'unsupported_format':
        return 'Formato não suportado. Use fotos JPG, PNG, HEIC ou WEBP e vídeos MP4 ou MOV.';
      case 'too_large':
        return `Arquivo muito grande. Fotos até ${MEDIA_LIMITS.imageMaxBytes / MB} MB e vídeos até ${MEDIA_LIMITS.videoMaxBytes / MB} MB.`;
      case 'too_long':
        return `Vídeos podem ter no máximo ${MEDIA_LIMITS.videoMaxDurationS / 60} minutos.`;
      case 'too_many':
        return `Cada corrida pode ter até ${MEDIA_LIMITS.maxItemsPerRun} fotos e vídeos.`;
    }
  }
  return 'Não foi possível enviar. Verifique sua conexão e tente novamente.';
}
