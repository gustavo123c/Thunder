import { hasGL } from './availability';

type Body3DComponent = typeof import('./Body3D').Body3D;

let cached: { Body3D: Body3DComponent | null } | null = null;

/**
 * The 3D body, or null when this binary has no expo-gl native code. Required lazily so a
 * build without it shows the 2D map instead of crashing on import.
 */
export function getBody3D(): Body3DComponent | null {
  if (!cached) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- guarded native import
    cached = { Body3D: hasGL() ? (require('./Body3D') as typeof import('./Body3D')).Body3D : null };
  }
  return cached.Body3D;
}

/** Short pt-BR reason shown above the 2D map when the 3D body can't run. */
export function unavailableReason(error: unknown | null): string {
  if (error === null) {
    return 'Este app instalado não inclui o módulo 3D. Ele chega no próximo build; no Expo Go já funciona.';
  }
  const detail = error instanceof Error ? error.message : String(error);
  return `O corpo 3D não abriu neste aparelho (${detail.slice(0, 120)}). Mostrando o mapa 2D.`;
}
