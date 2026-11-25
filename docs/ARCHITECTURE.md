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
src/services/    Adaptadores de infraestrutura: Supabase, Mapbox, SQLite.
src/components/  UI compartilhada (design system).
src/lib/         Utilitários transversais: env, formatadores, query client.
src/theme/       Tokens de design.
supabase/        Migrations SQL versionadas e config do stack local.
```

**Regras de dependência**

- `domain/` não importa nada de fora dele.
- `features/*` podem importar `domain`, `services`, `components`, `lib`, `theme` — mas **não** outras features (comunicação via rotas ou via `domain` / tipos compartilhados).
- `app/` só importa de `features/` e `components/`.
- Unidades SI em todo lugar (m, s, s/km). Conversão para exibição só em `lib/format.ts`.

## Fluxo de uma corrida

```
expo-location (TaskManager, background)
  → domain/geo/gps-filter (descarta baixa precisão e saltos)
  → SQLite local (durável)  +  store Zustand (UI ao vivo)
  → domain/metrics → distância, pace atual/médio, calorias
Finalizar:
  → resumo + splits calculados no device
  → upload único e idempotente (client_id) — RPC finish_run (Etapa 3)
  → SQLite limpo só após confirmação do servidor
```

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

**Segurança (RLS)**

- `anon` não acessa nada; todas as políticas são `to authenticated`.
- Corrida visível se: é sua, `public`, ou `followers` e você segue o autor (`can_view_run`).
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
