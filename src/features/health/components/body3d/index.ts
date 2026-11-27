import { hasGL } from './availability';

type Body3DComponent = typeof import('./Body3D').Body3D;

type Loaded = { Body3D: Body3DComponent | null; error: unknown | null };

let cached: Loaded | null = null;

/**
 * The 3D body, or null with the reason: no expo-gl native code in this binary, or the 3D
 * libraries failed to load. Required lazily so neither case crashes the check-up.
 */
export function getBody3D(): Loaded {
  if (!cached) {
    if (!hasGL()) cached = { Body3D: null, error: null };
    else {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports -- guarded native import
        cached = { Body3D: (require('./Body3D') as typeof import('./Body3D')).Body3D, error: null };
      } catch (error) {
        console.warn('[Body3D] could not load the 3D viewer:', error);
        cached = { Body3D: null, error };
      }
    }
  }
  return cached;
}

/** Short pt-BR reason shown above the 2D map when the 3D body can't run. */
export function unavailableReason(error: unknown | null): string {
  if (error === null) {
    return 'Este app instalado não inclui o módulo 3D. Ele chega no próximo build; no Expo Go já funciona.';
  }
  const detail = error instanceof Error ? error.message : String(error);
  return `O corpo 3D não abriu neste aparelho (${detail.slice(0, 120)}). Mostrando o mapa 2D.`;
}
