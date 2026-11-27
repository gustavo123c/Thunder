# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

Thunder is a running app (Expo SDK 58 / React Native, Expo Router, NativeWind 4, TanStack Query, Zustand, Supabase + PostGIS). UI copy is pt-BR; code, comments and commits are English. Full architecture notes (in Portuguese): `docs/ARCHITECTURE.md`; build/EAS steps: `docs/BUILD.md`.

## Release workflow (owner rule)

"Ao terminar uma mudança que eu aprovar: 1) faça commit com uma mensagem clara; 2) publique no Expo rodando eas update --auto --platform android e eas update --auto --platform ios; 3) me diga o que foi publicado. Não publique sem eu aprovar a mudança antes."

- Only after the owner approves the change: commit with a clear message, then run `npx eas-cli@latest update --auto --platform android` and `npx eas-cli@latest update --auto --platform ios`, then report what was published (branch/channel, message, update group IDs).
- Never run `eas update` for a change the owner has not approved.

## Commands

```bash
npm run go                      # Expo Go dev server (add --tunnel for devices on another network)
npm run typecheck               # tsc --noEmit
npm run lint                    # expo lint (React Compiler rules: no setState in effects, no ref reads in render, no Date.now in render)
npm test                        # jest (jest-expo)
npx jest src/domain/training    # one folder / file
npx jest path/to/file.test.tsx -t "test name"   # one test
npm run format:check            # prettier (scripts/generate-anatomy.cjs is a known pre-existing warning)
npm run test:db                 # SQL/RLS tests, see below
EXPO_OFFLINE=1 npx expo export --platform ios --platform android --output-dir /tmp/exp   # bundle check
EXPO_OFFLINE=1 npx expo install <pkg>   # api.expo.dev is blocked in some sandboxes
```

`npm run test:db` needs a Postgres 16 with PostGIS reachable through the usual `PG*` env vars (e.g. `PGHOST=localhost PGPORT=54322 PGUSER=postgres PGPASSWORD=postgres` for `supabase start`). Each `supabase/tests/[1-9]*.sql` file runs in a fresh database: `00_supabase_stub.sql` (auth schema/roles) → all migrations → `00_helpers.sql` (`pg_temp.as_user`, `pg_temp.check`, `pg_temp.expect_error`) → the test file. Tests run as `authenticated` without default privileges, so missing grants fail.

## Architecture

**Layers** (enforced by convention, see `docs/ARCHITECTURE.md`): `src/app` = thin Expo Router screens that compose features · `src/features/<name>` = vertical modules (`components/`, `hooks/`, `api/`, optional `store/`/`services/`), exported through `index.ts`; features never import other features — screens in `src/app` (or `src/navigation`) compose them · `src/domain` = pure TS, unit-tested, SI units · `src/services` = Supabase/Mapbox/storage adapters · `src/components` = shared UI · `src/lib/format.ts` = the only place values are formatted for display. Tests must not live in `src/app` (every file there becomes a route); route-level tests go in `src/navigation/__tests__`.

**Navigation gate**: `src/navigation/useAppGate.ts` derives `signed_out | onboarding | ready | loading | error` from auth + profile; `src/app/_layout.tsx` uses `Stack.Protected` groups with it. New stack screens must be registered in the `ready` group there (header options included). Every file in `src/app/(tabs)` must be a `Tabs.Screen` (checked by `src/navigation/__tests__/tabs-layout.test.ts`).

**Run recording** (`features/run-tracking`): location task → `RunRecorder.ingest` (serial queue) → GPS filter → SQLite (`local_points`, survives app kills) → Zustand store → `useLiveMetrics`. Finish → `buildFinishRunPayload` → RPC `finish_run` (idempotent by `client_id`); offline runs stay pending and `useRunTrackingBootstrap` re-uploads. The background task is registered at module scope (imported at the top of the root layout). `RunRecorder` takes injected repository/tracker/clock so tests use in-memory fakes.

**Expo Go mode** (`lib/runtime.ts#isExpoGo`): `@rnmapbox/maps` throws on import without native code, so `components/map/RouteMap` only `require`s it outside Expo Go and falls back to the SVG `RouteSketch`; GPS uses a foreground tracker with keep-awake. Keep any new native-only module behind the same kind of guard.

**Supabase**:

- Migrations are idempotent (`create … if not exists`, `drop policy if exists`, `create or replace`) because the owner pastes them into the hosted SQL editor, which has no transaction. Every table has RLS + explicit grants (column-level for updates).
- RPCs are `SECURITY INVOKER` so RLS applies; the `SECURITY DEFINER` exceptions are small helpers (`can_view_run_row`, `is_group_member`, `owns_group`, `shares_group_with`, `owns_run`) and `join_group` (only ever adds the caller). Run visibility: own, `public`, or `followers` when you follow the author **or share a group**; `private` never appears in groups.
- `src/services/supabase/database.types.ts` is hand-written — update it with schema changes. RPC JSON is parsed defensively in `services/supabase/*-json.ts`.
- Query keys: run-related queries live under the `['runs']` prefix (feed, activity, details) so invalidating `['runs']` after upload/delete refreshes streaks, dashboard and feed; group queries under `['groups']`, pains under `['pains', userId]`.

**3D body (Check-up)**: `features/health/components/body3d/Body3D.tsx` renders `assets/models/body-{male,female}.glb` with React Three Fiber (`fiber.ts` → `@react-three/fiber/native` + expo-gl; `fiber.web.ts` → DOM build). Zones are glTF materials named `zone_<region>_<side>` (`domain/health/body-zones.ts`); touches use the plain responder props (drag = rotate around Y, tap = raycast pick) and any render failure falls back to the 2D `BodyMap`. Models are regenerated with `scripts/blender` (see `docs/BODY_MODEL.md`); keep them free of Draco/meshopt (no WebAssembly on Hermes). Jest replaces `Body3D` with a stub in `jest.setup.js`.

**Training generator** (`src/domain/training`): rule-based, no AI. `workout-generator.ts` builds running sessions (paces offset from the recent average pace), `pain-load.ts` maps body-map pains to load cuts/session swaps per region, `custom-goal.ts` reads the free-text "Outro" goal. Plans are stored as JSON in `generated_workouts` (shape changes must stay backward compatible with saved rows). Medals, records, goal progress and celebration highlights are pure functions in `src/domain/insights`.

## Design system ("Pista na Tempestade")

- Neutrals are themed through CSS variables set at the root (`theme/AppThemeProvider.tsx`, `theme/theme.ts`): class names keep their _role_ in both modes — `bg-ink-900` background, `bg-ink-800` card, `bg-ink-700` raised, `text-ink-50` primary, `text-ink-300/400` secondary/muted, `border-hairline`. Never add `dark:` variants. For colors in props (icons, SVG, navigation, Mapbox) use `useThemeColors()`.
- One brand amber `#FACC15` (`bg-bolt-500`, `colors.brand`) for primary actions, active states, records and medals. `text-accent`/`theme.accent` is amber in dark mode and primary text in light mode (amber is only a fill there; text on amber is `text-onbolt`).
- Fonts (loaded in `theme/fonts.ts` before the splash hides): `font-mono` / `font-mono-heavy` / `font-mono-medium` (JetBrains Mono) for numbers and uppercase labels, `font-display` (Archivo Expanded, bundled static instance in `assets/fonts`) for titles; don't combine a custom family with `font-bold`-style classes. Pace is shown as `5'16"` (`formatPaceTrack`).
- `Animated.View` doesn't take NativeWind `className` — put layout classes on a plain `View`. Content inside `<Modal>` must be wrapped in `ThemeScope` to get the theme variables.
- Flash/bolt animations go through `LightningFlash` / `useReduceMotion` (skipped when the OS asks for reduced motion). Copy is technical and calm, no hype or exclamation marks.

## Testing notes

- `@testing-library/react-native` v14: `render` is async (`await render(...)`); no `UNSAFE_*` queries — use `testID`.
- Wrap query-using components in a fresh `QueryClient` with `retry: false, gcTime: Infinity` and call `queryClient.clear()` in `afterEach` (otherwise GC timers hang Jest).
- `jest.setup.js` mocks AsyncStorage and `expo-crypto.randomUUID`. NativeWind classes are not applied under Jest; `src/theme/__tests__/theme.test.tsx` uses the `react-native-css-interop` test harness when real styles must be checked.
- Mock `@/services/supabase/client` (`{ supabase: {} }`) plus the feature's `api/*.api.ts` module; mock `expo-router` when components navigate.
