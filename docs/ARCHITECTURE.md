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

## Modo Expo Go (teste sem build)

`lib/runtime.ts#isExpoGo` detecta o app Expo Go. Nele:

- `@rnmapbox/maps` **nunca é importado** (ele lança erro no import sem código nativo):
  `components/map/RouteMap` carrega `MapboxRouteMap` com `require` só fora do Expo Go e usa
  `RouteSketch` (SVG) no Expo Go. `initMapbox()` vira no-op. Coberto por teste que simula o erro de import.
- GPS: `createForegroundLocationTracker` (`watchPositionAsync`) no lugar da task em segundo plano;
  a tela de corrida mantém o display ligado (`expo-keep-awake`) e mostra o aviso de modo de teste.

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
