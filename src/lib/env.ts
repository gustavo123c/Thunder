/**
 * Typed access to public runtime configuration.
 *
 * Expo inlines `process.env.EXPO_PUBLIC_*` at build time, so each variable must
 * be referenced statically (no dynamic `process.env[name]`).
 * Never put secrets here: EXPO_PUBLIC_* values ship inside the app bundle.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `[env] Missing ${name}. Copy .env.example to .env.local and fill it in (see README).`,
    );
  }
  return value;
}

export const env = {
  supabaseUrl: required('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: required(
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  ),
  mapboxAccessToken: required(
    'EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN',
    process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN,
  ),
} as const;
