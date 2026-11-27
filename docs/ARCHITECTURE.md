# Thunder — Arquitetura

Documento vivo: atualizado a cada etapa do MVP.

## Stack

| Camada                    | Escolha                                                            |
| ------------------------- | ------------------------------------------------------------------ |
| Mobile                    | React Native + Expo SDK 58 (development build) + TypeScript strict |
| Navegação                 | Expo Router (`src/app/`)                                           |
| Estilo                    | NativeWind 4 (Tailwind 3) — paleta em `src/theme/palette.js`       |
| Backend                   | Supabase: Postgres 17 + PostGIS, Auth, RLS, Storage                |
| Estado servidor           | TanStack Query                                                     |
| Estado da corrida ao vivo | Zustand                                                            |
| GPS                       | `expo-location` + `expo-task-manager` (background)                 |
| Persistência local        | `expo-sqlite` (pontos GPS durante a corrida)                       |
| Mapas                     | Mapbox (`@rnmapbox/maps`)                                          |
| Testes                    | Jest (`jest-expo`)                                                 |

## Camadas

```
src/app/         Rotas (Expo Router). Telas finas: só compõem features.
src/features/    Módulos verticais: auth, profile, run-tracking, run-history, social.
                 Cada um com components/, hooks/, api/ (e store/, services/ quando preciso).
src/domain/      TypeScript puro — sem React/RN. Geo, pace, splits, calorias, comparações.
src/navigation/  Composição entre features para navegação (ex.: useAppGate = auth + perfil).
src/services/    Adaptadores de infraestrutura: Supabase, Mapbox, SQLite.
src/components/  UI compartilhada (design system).
src/lib/         Utilitários transversais: env, formatadores, query client.
src/theme/       Tokens de design.
supabase/        Migrations SQL versionadas e config do stack local.
```

**Regras de dependência**

- `domain/` não importa nada de fora dele.
- `features/*` podem importar `domain`, `services`, `components`, `lib`, `theme` — mas **não** outras features (comunicação via rotas ou via `domain` / tipos compartilhados).
- `app/` importa de `features/`, `components/` e `navigation/`.
- `navigation/` é o único lugar que combina mais de uma feature.
- Unidades SI em todo lugar (m, s, s/km). Conversão para exibição só em `lib/format.ts`.

## Autenticação e onboarding (Etapa 1)

```
AuthProvider (sessão Supabase persistida em AsyncStorage)
  → useProfile (React Query, chave ['profile', userId])
  → resolveAppGate → loading | signed_out | onboarding | ready | error
  → Stack.Protected no layout raiz libera só o grupo permitido
```

| Gate         | Rotas acessíveis                                        |
| ------------ | ------------------------------------------------------- |
| `loading`    | nenhuma — splash screen permanece                       |
| `signed_out` | `(auth)/sign-in`, `(auth)/sign-up`                      |
| `onboarding` | `onboarding` (4 passos: identidade, nível, corpo, meta) |
| `ready`      | `(tabs)/*`, `profile/edit`                              |
| `error`      | tela de erro com "Tentar novamente" / "Sair"            |

- O perfil é criado vazio pelo trigger `handle_new_user`; `full_name` vem do cadastro.
- Onboarding concluído = `profiles.onboarded_at` preenchido (mesma escrita que salva os dados).
- Regras de validação ficam em `domain/profile/profile-rules.ts` (espelham os CHECKs do banco) e
  retornam códigos; as mensagens em pt-BR ficam em `features/profile/profile-form.ts`.
- Nome de usuário: checado antes de avançar do passo 1 e protegido pelo UNIQUE (`23505` → erro de campo).
- Logout limpa todo o cache do React Query.

**Pendente:** confirmação de e-mail por deep link (o stack local tem confirmação desligada; em produção,
o usuário confirma pelo link e entra com a senha), recuperação de senha e foto de perfil.

## Métricas (Etapa 2)

Tudo em `src/domain/` (TS puro, garantido por regra de ESLint). Limites ajustáveis em
`domain/metrics/config.ts`.

```
amostras GPS ─► applyGpsFilter ─► buildIntervals ─► distância · tempo em movimento · splits · calorias
                (geo/gps-filter)   (metrics/intervals)        └► elevationGainM (altitudes suavizadas)
```

| Métrica            | Definição                                                                                                         |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Distância          | Soma haversine entre pontos aceitos **do mesmo segmento** (nunca atravessa uma pausa).                            |
| Tempo ativo        | Soma dos períodos iniciar/retomar → pausar/finalizar. É o cronômetro ao vivo.                                     |
| Tempo decorrido    | Do primeiro início ao fim, com pausas.                                                                            |
| Tempo em movimento | Intervalos com velocidade ≥ 0,5 m/s (parado no semáforo não conta).                                               |
| Pace médio         | Tempo em movimento ÷ distância (s/km); `null` abaixo de 50 m.                                                     |
| Pace atual         | Janela móvel dos últimos 30 s do segmento atual; `null` com menos de 20 m.                                        |
| Melhor pace        | Split completo (1 km) mais rápido.                                                                                |
| Splits             | A cada 1000 m, com a fronteira interpolada dentro do intervalo; último split parcial ≥ 10 m.                      |
| Elevação           | Média móvel (11 amostras) + histerese de 3 m.                                                                     |
| Calorias           | MET (Compendium 2011, interpolado pela velocidade) × peso × horas, por intervalo em movimento. Sem peso → `null`. |

**Filtro de GPS** (`applyGpsFilter`, função pura com estado explícito): descarta coordenadas inválidas,
pontos fora de ordem, precisão > 30 m, saltos > 12 m/s (com margem da precisão; após 5 saltos seguidos
reancora) e jitter < 2 m (mas aceita um ponto a cada 10 s parado). A distância é medida sempre a partir
do último ponto aceito, então descartar jitter não perde distância — no máximo os últimos < 2 m de um segmento.

`simplifyRoute` (Douglas–Peucker, tolerância 5 m) gera a polyline leve salva em `runs.route`.

## Rastreamento ao vivo (Etapa 3)

```
expo-location (TaskManager "thunder-run-location", 1 Hz, BestForNavigation, foreground service)
  → RunRecorder.ingest()          fila serial: nada intercala com pausar/finalizar
      → toGpsSample (normaliza -1 do iOS) → applyGpsFilter
      → SQLite local (local_points)  ← durável: sobrevive ao app ser morto
      → listeners → Zustand (useRunSessionStore) → useLiveMetrics (relógio de 1 s)
Finalizar:
  → finishRunSession + summarizeRun → local_runs.status = 'finished' (com resumo)
  → buildFinishRunPayload (rota simplificada, arredondamentos que respeitam os CHECKs)
  → RPC finish_run (idempotente por client_id) → apaga a cópia local só após sucesso
  → sem rede: fica pendente; useRunTrackingBootstrap reenvia ao abrir o app / voltar ao foreground
```

- `RunRecorder` recebe dependências (`RunRepository`, `LocationTracker`, relógio, gerador de id):
  os testes usam repositório em memória e GPS falso; o app usa SQLite + expo-location.
- O módulo `features/run-tracking/services/recorder.ts` define a task em escopo global
  (importado no topo de `src/app/_layout.tsx`): o SO pode iniciar o JS só para entregar localizações.
- Ao abrir o app, `restore()` recarrega uma corrida interrompida e religa o GPS se ela estava em andamento.
- Pausar desliga o GPS (bateria); retomar abre um novo segmento.
- Corridas com < 50 m oferecem "descartar".

### `finish_run(payload jsonb)`

`SECURITY INVOKER` — RLS e grants continuam valendo. Insere `runs`, `run_points` e `run_splits`
numa transação; se o `client_id` já existe para o usuário, devolve o id existente (inclusive em
corrida concorrente, tratando `unique_violation`).

## Histórico e análise (Etapa 4)

- RPCs de leitura (`SECURITY INVOKER`, RLS decide a visibilidade), em
  `20261125020000_run_queries.sql`:
  - `list_user_runs(user, before, before_id, limit)` — paginação keyset por `(started_at, id)`, máx. 50.
  - `get_run_detail(run_id)` — corrida + autor + `has_kudo` + splits + até 30 corridas anteriores
    do mesmo atleta, numa ida ao servidor; `null` se não for visível.
  - Rotas saem como GeoJSON (`ST_AsGeoJSON`, 6 casas decimais).
- `services/supabase/run-json.ts` valida o JSON em tempo de execução (dados do servidor não são
  confiáveis). O teste de contrato usa uma resposta real capturada do Postgres
  (`services/supabase/__tests__/fixtures/run-detail.json`).
- `domain/insights/comparison.ts` compara com o histórico:
  corrida anterior (Δ distância, Δ pace), média de corridas de distância parecida (±20%, até 10;
  diferença < 3 s/km = "mesmo pace") e recordes (mais longa, km mais rápido, melhor pace na distância).
  `features/run-history/comparison-copy.ts` transforma isso em frases curtas e encorajadoras.
- Lista: `RunCard` com miniatura SVG da rota (sem tiles de mapa por item), resumo "Esta semana",
  corridas pendentes de envio no topo, scroll infinito e pull-to-refresh.
- Detalhe: mapa Mapbox ajustado à rota, métricas, parciais com barra proporcional à velocidade
  (melhor km destacado), "Sua evolução" e, para o dono, visibilidade e exclusão.

## Feed social (Etapa 5)

- RPCs em `20261125030000_social.sql` (todas `SECURITY INVOKER`):
  - `get_feed(before, before_id, limit)` — suas corridas + as de quem você segue, já filtradas pelo RLS.
  - `list_comments(run_id)` — comentários não apagados, com autor.
  - `search_profiles(query)` — nome/@usuário, sem diferenciar maiúsculas, com `%`/`_` escapados,
    mínimo de 2 caracteres, só perfis com onboarding concluído, com `is_following`.
  - `get_profile_stats(user_id)` — perfil, seguidores, seguindo, corridas e km **visíveis para quem consulta**.
- Escritas diretas nas tabelas (o RLS protege): `kudos` (Raio), `comments` (soft delete), `follows`.
  Raio/seguir duplicado (`23505`) é tratado como sucesso.
- Raio otimista (`useToggleKudo`): atualiza o feed e o detalhe na hora e desfaz se o servidor recusar.
  Não é possível dar Raio na própria corrida.
- Telas: Feed (cards com autor e barra social), comentários (`run/[id]/comments`), busca de pessoas
  (`people`, modal), perfil de atleta (`user/[id]`) e contadores sociais na aba Perfil.

Para gerar builds instaláveis (Android e iOS) com o EAS, veja [BUILD.md](BUILD.md).

## Modo Expo Go (teste sem build)

`lib/runtime.ts#isExpoGo` detecta o app Expo Go. Nele:

- `@rnmapbox/maps` **nunca é importado** (ele lança erro no import sem código nativo):
  `components/map/RouteMap` carrega `MapboxRouteMap` com `require` só fora do Expo Go e usa
  `RouteSketch` (SVG) no Expo Go. `initMapbox()` vira no-op. Coberto por teste que simula o erro de import.
- GPS: `createForegroundLocationTracker` (`watchPositionAsync`) no lugar da task em segundo plano;
  a tela de corrida mantém o display ligado (`expo-keep-awake`) e mostra o aviso de modo de teste.

## v2: progresso, mídia, mapa corporal e treino personalizado

Migration `20261126010000_progress_media_health.sql` (testada em `supabase/tests/50_media_health.sql`).
`runs` continua sendo "treino/corrida" e `comments` os comentários — nada foi duplicado.

| Funcionalidade                             | Onde                                                                                                                                                                                                                                                        |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sequência (🔥) e painel Dia/Semana/Mês/Ano | `domain/insights/activity.ts` (calendário local, semanas de segunda) · `features/progress` · RPC `list_activity`                                                                                                                                            |
| Excluir corrida (lista e detalhe)          | `features/run-history` (`confirm-delete.ts`) — apaga a linha, depois os arquivos; todas as queries `['runs']` recarregam                                                                                                                                    |
| Foto de perfil                             | `features/media` (`AvatarEditor`) → bucket público `avatars`, pasta `{user_id}/`                                                                                                                                                                            |
| Fotos/vídeos na corrida                    | `domain/media/media-rules.ts` (formatos, 10 MB foto / 50 MB vídeo / 2 min / 10 por corrida) · `features/media` · bucket privado `workout-media/{user_id}/{run_id}/…` · tabela `run_media`                                                                   |
| Galeria e player                           | `components/media` (URLs assinadas, `expo-video`)                                                                                                                                                                                                           |
| Comentários no detalhe                     | `features/social/CommentsPreview` + botão de apagar o próprio comentário                                                                                                                                                                                    |
| Mapa corporal                              | `domain/health/body-regions.ts` · `features/health` (SVG masc./fem., frente/costas, lista acessível) · tabela `pain_logs` (somente o dono)                                                                                                                  |
| Corpo 3D (Check-up)                        | `domain/health/body-zones.ts` · `features/health/components/body3d` (React Three Fiber + expo-gl, gira no eixo vertical, toque por zona, volta ao mapa 2D se falhar) · modelos em `assets/models`, gerados por `scripts/blender` (ver `docs/BODY_MODEL.md`) |
| Treino personalizado                       | `domain/training` (treinos de corrida por regras + `pain-load.ts`: dor → carga) · `features/workouts` · tabela `generated_workouts`                                                                                                                         |
| Aviso de saúde                             | `components/ui/HealthDisclaimer` (aba Treino e após gerar o treino)                                                                                                                                                                                         |

**Treinos de corrida:** tiros (200 m / 400 m / 1 km), fartlek, limiar (600 m ou blocos),
subidas, progressivo, rodagem, longão e regenerativo, com aquecimento (trote, educativos,
acelerações) e desaquecimento. Ritmos a partir do pace médio recente (P): regenerativo P+75,
rodagem P+40, longão P+50, limiar P−15, tiros de 1 km P−30, 400 m P−45, 200 m P−55; sem
corridas recentes, por esforço percebido (0–10).

**Dores reduzem a carga (`domain/training/pain-load.ts`):** cada região tem sessões que a
sobrecarregam (ex.: panturrilha/Aquiles/pé → subidas e tiros; joelho → subidas e longão;
posterior da coxa → velocidade máxima). Dor leve → volume −15% e troca da sessão contraindicada
por uma mais segura; moderada → só corrida leve, plana e −40%; forte em pernas/quadril/lombar →
sem corrida (caminhada leve se não doer); dor no peito → sem treino. Dor em membros superiores
mantém a sessão (forte limita a intensidade a moderada).
O formato `WorkoutPlan` é o mesmo que uma IA deverá devolver no futuro (`generator: 'ai'`).

## Próximos passos sugeridos

1. Confirmação de e-mail por deep link e recuperação de senha.
2. Foto de perfil (Supabase Storage).
3. Notificações push (novo Raio/comentário/seguidor).
4. Planos de treino por nível e meta (`features/training-plans`), usando `domain/insights`.
5. Zonas de pace/frequência cardíaca e integração com relógios.

## Banco de dados

Migration: `supabase/migrations/20261125000000_initial_schema.sql`.

| Tabela       | Papel                                                                                                                                                                               |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `profiles`   | 1:1 com `auth.users`; criada por trigger no signup. Nível, peso, altura, meta. `onboarded_at` marca onboarding concluído.                                                           |
| `runs`       | Resumo da corrida + `route` (LineString simplificada) + `start_point`. `client_id` único para uploads idempotentes. Contadores `kudos_count`/`comments_count` mantidos por trigger. |
| `run_points` | Amostras GPS brutas; `segment` incrementa a cada pausa.                                                                                                                             |
| `run_splits` | Parciais por km (a última pode ser parcial).                                                                                                                                        |
| `follows`    | Grafo social (seguidor → seguido).                                                                                                                                                  |
| `kudos`      | "Raio" ⚡ — PK `(run_id, user_id)`.                                                                                                                                                 |
| `comments`   | Até 500 caracteres; soft delete por `deleted_at`.                                                                                                                                   |

**Privilégios explícitos** — `20261126000000_explicit_grants.sql` concede SELECT/INSERT/DELETE ao
`authenticated` (projetos Supabase novos podem não expor tabelas automaticamente). Os testes SQL rodam
sem privilégios padrão, para pegar qualquer permissão faltando.

**Segurança (RLS)** — coberta por `supabase/tests/*.sql` (`npm run test:db`)

- `anon` não acessa nada; todas as políticas são `to authenticated`.
- Corrida visível se: é sua, `public`, ou `followers` e você segue o autor (`can_view_run_row`,
  avaliada na própria linha — funciona com `INSERT … RETURNING`).
- Pontos, splits, kudos e comentários herdam a visibilidade da corrida.
- Grants por coluna: usuários não conseguem alterar contadores, `user_id` ou timestamps.

## Decisões registradas

| Data    | Decisão                                          | Motivo                                                                                                      |
| ------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| 2026-11 | Supabase em vez de API Node própria              | Auth + PostGIS + RLS prontos; Edge Functions/API dedicada entram quando houver lógica de coaching complexa. |
| 2026-11 | Mapbox desde o MVP                               | Estilo de mapa customizável e consistente entre iOS/Android.                                                |
| 2026-11 | Tabelas de interação separadas (kudos, comments) | Integridade referencial e índices melhores que uma tabela polimórfica.                                      |
| 2026-11 | Rotas em `src/app/`                              | Convenção do Expo Router; mantém código não-rota fora da pasta de rotas.                                    |
| 2026-11 | UI em pt-BR, código em inglês                    | Público brasileiro; código legível para qualquer contribuidor.                                              |

## Design system — "Pista na Tempestade" + light mode

Track ("Pista") structure with storm ("Tempestade") colors and effects:

- **Type:** numbers in **JetBrains Mono** (`font-mono`, `font-mono-heavy` for hero values;
  pace as `5'16"` via `formatPaceTrack`); uppercase labels in `font-mono-medium`; screen titles
  in **Archivo Expanded** (`font-display`, a static wdth-125 instance bundled in
  `assets/fonts`, SIL OFL). Body text stays in the system font. With a custom family, don't add
  `font-bold`-style weight classes. Fonts load in `src/theme/fonts.ts` before the splash hides.
- **Shapes:** runs are race bibs (`Card variant="bib"`, `BibNotch`, `BibTag` stamps like
  "DOM 22 NOV · 06:45"); dividers and progress are track lanes (`Lanes`, `LaneProgress`);
  live laps are "voltas".
- **Storm:** blue-tinted dark neutrals (`#070A10` background, `#0F141D` cards); the amber only
  "discharges" on actions, records and medals; `Zigzag` dividers and `LightningFlash`
  (~300 ms, run start and the celebration's bolt strike) only in highlight moments — skipped
  with the OS "reduce motion" setting. Modals wrap content in `ThemeScope`.
- **Copy:** technical and calm ("Pace 8% abaixo da sua média da semana."), no hype.

Appearance is a per-device choice in Settings → Aparência (Automático / Claro / Escuro),
stored in AsyncStorage by `src/theme/AppThemeProvider.tsx`, which also calls NativeWind's
`colorScheme.set()` and defines the themed CSS variables at the root.

- **Themed tokens:** `ink-*`, `accent` and `hairline` resolve through CSS variables
  (`rgb(var(--ink-800) / <alpha-value>)`). Class names keep their _role_ in both modes — write
  `bg-ink-900` (background), `bg-ink-800` (card), `bg-ink-700` (raised), `text-ink-50` (primary
  text), `text-ink-300/400` (secondary/muted). Never add `dark:` variants.
- **One brand amber, `#FACC15` (`colors.brand` / `bg-bolt-500`).** Only for primary buttons,
  active/selected states, key numbers and the bolt. No other amber shades; pressed states use
  opacity. Decorative borders use `border-hairline`. In light mode amber is only a fill (with
  dark text on it): `text-accent` / `theme.accent` falls back to primary text there.
- **Type scale (`components/ui/Typography`, `StatBlock`):** numbers 56 / 32 / 22 px ExtraBold
  (800, tabular) — the only use of 800; screen titles 28 px bold; card/section titles 16 px
  semibold; body 400; labels 11 px medium uppercase.
- **Top-right corner stays free** on tab screens (Expo Go draws its tools button there);
  screen actions go under the title.
- **Runs without recorded distance** (< 50 m, `domain/metrics/recorded-distance.ts`) keep their
  time in the owner's history but stay out of feeds, groups, medals and celebrations.
- **Fixed colors:** `bolt-*` (amber backgrounds), `onbolt` (text/icons on amber), success,
  danger, info. Amber _text/icons_ on surfaces use `text-accent` / `theme.accent`, which is a
  darker amber in light mode for contrast.
- **JS colors** (icons, SVG, navigation, Mapbox style): `useThemeColors()` from `@/theme/theme`.
- `src/theme/__tests__/theme.test.tsx` runs the real NativeWind runtime to check both themes.

- **Surfaces:** background `ink-900` (#090C10); cards `ink-800` (#121721) with
  `border-hairline` (rgba(255,255,255,0.08)) and 20px radius. Use `components/ui/Card`;
  `variant="highlight"` adds the subtle gradient (Win Streak, main goal).
- **Accent:** `bolt-500` (#FACC15) only for CTAs, active states and positive highlights.
- **Icons:** Ionicons (`@expo/vector-icons`), never emojis in UI copy.
- **Metrics:** `components/ui/StatBlock` — 28–56px, weight 800, `tabular-nums`; labels 11px uppercase.
- **Empty states:** `components/ui/EmptyState` (icon in a dashed, glowing ring).
- **Map fallback:** `components/map/GridBackdrop` draws the dark grid used by `RouteSketch` in Expo Go.
- Third-party credits (e.g. react-native-body-highlighter, MIT) live in Settings → Sobre.

### Tab structure (v3)

- **Histórico:** only the run list, grouped by month (`features/run-history/group-by-month.ts`).
  The "Retrospectiva" pill opens `app/retrospective.tsx` (win streak + period dashboard).
- **Treino:** two steps (`TrainingStepper`): 1) body check-up (map, bottom sheet, removable pain
  chips); 2) workout settings (goal cards, `SegmentedControl` for level/time) → structured workout
  sheet with "Iniciar este treino" (opens the record tab).
- **Perfil:** `ProfileHeader` (cover, ringed avatar, edit/settings) + tabs Resumo | Recordes |
  Conquistas. Records, achievements and goal progress are pure functions in
  `domain/insights/records.ts` over the `list_activity` window (since Jan 1 of last year);
  achievement totals use the all-time `get_profile_stats`. "Melhor 5K" is projected from the
  average pace of runs ≥ 5 km.

## v4 — Ajuda, histórico de dores, treino avançado, medalhas e grupos

Migração `20261127000000_groups_medals_feedback.sql` (idempotente; colar no SQL Editor).

| Funcionalidade                       | Onde                                                                                                                                                                                                                                                                          |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Central de ajuda (busca + tutoriais) | `features/help` (`help-content.ts`) · rota `/help` (Perfil → `?`, Configurações)                                                                                                                                                                                              |
| Base científica e fontes             | `features/help/sources.ts` (links verificados; aviso de que as regras não foram validadas pelos autores) · rota `/sources`                                                                                                                                                    |
| Histórico de dores e recorrência     | `domain/health/pain-history.ts` (episódios por região em 30 dias) · `features/health/PainHistoryView` · rota `/pain-history` · aviso "essa dor voltou" no `PainSheet`                                                                                                         |
| Repetir treino de dor recorrente     | `features/workouts/feedback.ts` (`findReturningPain`)                                                                                                                                                                                                                         |
| Check-in pós-treino                  | `generated_workouts.feedback/feedback_at/run_id` · `WorkoutCheckIn` (na celebração) · "Ainda sinto desconforto" sobe um nível a dor da região no próximo treino (`adjustForPain(..., discomfortRegions)`)                                                                     |
| Treino ativo                         | `features/workouts/active-workout.store.ts` (zustand + AsyncStorage; ID do treino gerado no app)                                                                                                                                                                              |
| Nível Avançado                       | `TRAINING_LEVELS` em `domain/training/workout-generator.ts`: tiros de VO2máx, tempo run, longão com final forte, zonas Z1–Z5                                                                                                                                                  |
| Objetivo "Outro"                     | `domain/training/custom-goal.ts`: palavras-chave → tipo de treino; "10 km em 45 min" → pace de prova (vira o alvo do limiar). Sem IA.                                                                                                                                         |
| Medalhas                             | `domain/insights/records.ts` (12 medalhas, incl. meia maratona, 7 dias seguidos, 12 treinos no mês) · tabela `user_achievements` · grade no Perfil (bloqueadas em cinza)                                                                                                      |
| Celebração                           | `domain/insights/celebration.ts` (medalhas novas, pace vs. semana, recordes, "faltam X km") · `features/progress/RunCelebration` · `/run/[id]?celebrate=1`                                                                                                                    |
| Grupos                               | tabelas `groups`, `group_members`; RPCs `create_group`, `join_group` (SECURITY DEFINER, só adiciona o próprio usuário, máx. 50), `list_my_groups`, `group_leaderboard`, `get_group_feed` · `features/social` (`GroupsPanel`, `GroupDetailView`, `GroupForms`) · Feed → Grupos |

**Privacidade nos grupos:** corridas "Só eu" nunca entram no ranking nem no feed do grupo.
Corridas "Seguidores" passam a ser visíveis também para quem compartilha um grupo
(`can_view_run_row` usa `shares_group_with`), para que detalhe, Raio e comentários funcionem
entre membros.
