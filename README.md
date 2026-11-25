# ⚡ Thunder

App de corrida focado em **performance e evolução**: rastreamento GPS, análise pós-treino com splits e comparações, e um feed social com "Raios" e comentários.

Arquitetura completa: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Status do MVP

| Etapa | Módulo                                                  | Status |
| ----- | ------------------------------------------------------- | ------ |
| 0     | Setup do projeto, tooling, schema do banco              | ✅     |
| 1     | Autenticação e perfil (onboarding)                      | ✅     |
| 2     | Domínio de métricas (distância, pace, splits, calorias) | ✅     |
| 3     | Rastreamento GPS ao vivo                                | ✅     |
| 4     | Histórico e análise pós-treino                          | ⏳     |
| 5     | Feed social                                             | ⏳     |

## Pré-requisitos

- Node 22+
- Conta **Expo/EAS** (para development builds) — o app usa módulos nativos (Mapbox, GPS em background) e **não roda no Expo Go**.
- Conta **Mapbox** → token público (`pk.…`).
- **Supabase**: local via Docker (`npm run db:start`) ou um projeto hospedado.

## Configuração

```bash
npm install
cp .env.example .env.local   # preencha as chaves
```

### Banco local (Supabase CLI + Docker)

```bash
npm run db:start   # sobe Postgres/Auth/Studio e aplica supabase/migrations
npm run db:types   # gera src/services/supabase/database.types.ts
npm run db:reset   # recria o banco do zero
```

Para um projeto hospedado: `npx supabase link --project-ref <ref>` e `npx supabase db push`.

### Rodando o app

```bash
npx eas-cli@latest build --profile development --platform android   # ou ios
npm start                                                             # dev server
```

Com Android Studio/Xcode locais: `npm run android` / `npm run ios`.

## Scripts

| Script              | O que faz                                    |
| ------------------- | -------------------------------------------- |
| `npm start`         | Dev server do Expo                           |
| `npm run typecheck` | `tsc --noEmit`                               |
| `npm run lint`      | ESLint (config Expo + Prettier)              |
| `npm test`          | Jest                                         |
| `npm run test:db`   | Testes SQL (RLS, RPCs) num Postgres+PostGIS  |
| `npm run format`    | Prettier (com ordenação de classes Tailwind) |
| `npm run db:*`      | Supabase local (start/stop/reset/types)      |

## Estrutura

```
src/
├── app/          # rotas (Expo Router)
├── features/     # auth, profile, run-tracking, run-history, social
├── domain/       # cálculos puros (geo, pace, splits, calorias)
├── navigation/   # guard de navegação (auth + onboarding)
├── services/     # supabase, mapbox, sqlite
├── components/   # UI compartilhada
├── lib/          # env, formatadores, query client
└── theme/        # paleta e tokens
supabase/
└── migrations/   # schema SQL versionado
```
