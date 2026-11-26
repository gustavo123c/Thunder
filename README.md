# ⚡ Thunder

App de corrida focado em **performance e evolução**: rastreamento GPS, análise pós-treino com splits e comparações, e um feed social com "Raios" e comentários.

Arquitetura completa: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Status do MVP

| Etapa | Módulo                                                                           | Status |
| ----- | -------------------------------------------------------------------------------- | ------ |
| 0     | Setup do projeto, tooling, schema do banco                                       | ✅     |
| 1     | Autenticação e perfil (onboarding)                                               | ✅     |
| 2     | Domínio de métricas (distância, pace, splits, calorias)                          | ✅     |
| 3     | Rastreamento GPS ao vivo                                                         | ✅     |
| 4     | Histórico e análise pós-treino                                                   | ✅     |
| 5     | Feed social                                                                      | ✅     |
| v2    | Sequência, painel de evolução, fotos/vídeos, mapa corporal, treino personalizado | ✅     |

## Pré-requisitos

- Node 22+
- Conta **Expo/EAS** (para development builds) — o app usa módulos nativos (Mapbox, GPS em background) e **não roda no Expo Go**.
- Conta **Mapbox** → token público (`pk.…`).
- **Supabase**: local via Docker (`npm run db:start`) ou um projeto hospedado.

## Configuração (primeira vez)

### 1. Dependências e variáveis

```bash
npm install
cp .env.example .env.local
```

Preencha `.env.local` com:

| Variável                                                     | Onde obter                                                                                             |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API (ou a saída de `npm run db:start`)                                   |
| `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`                            | [account.mapbox.com/access-tokens](https://account.mapbox.com/access-tokens/) → token público (`pk.…`) |

### 2. Banco de dados

**Projeto hospedado (mais simples):** crie um projeto em [supabase.com](https://supabase.com), depois:

```bash
npx supabase login
npx supabase link --project-ref <ref-do-projeto>
npx supabase db push          # aplica supabase/migrations
```

Em Authentication → Providers → Email, defina o mínimo de senha em 8 caracteres (igual ao app).

**Local (Docker):**

```bash
npm run db:start   # Postgres + Auth + Studio, aplica as migrations
npm run db:types   # (opcional) regenera src/services/supabase/database.types.ts
```

### 3a. Testar rápido no iPhone/Android com o Expo Go (grátis)

Instale o **Expo Go** (App Store / Play Store) e entre nele com sua conta Expo. No computador:

```bash
npx expo login   # mesma conta do Expo Go (uma vez só)
npm run go       # = expo start --go
```

e escaneie o QR code com a câmera do iPhone (ou pelo Expo Go no Android).
No Expo Go o app roda em **modo de teste**: a rota aparece desenhada (sem o mapa do Mapbox) e o
GPS grava só com o app aberto — a tela fica ligada durante a corrida.

### 3b. App completo no celular (development build)

O app usa módulos nativos (Mapbox, GPS em segundo plano) e **não roda no Expo Go**.

```bash
npx eas-cli@latest login
npx eas-cli@latest build --profile development --platform android   # ou ios
# instale o build no aparelho e então:
npm start
```

Com Android Studio/Xcode locais: `npm run android` / `npm run ios`.

> Teste a gravação **ao ar livre**: GPS em ambiente fechado gera pontos imprecisos que o filtro descarta.

## Scripts

| Script              | O que faz                                         |
| ------------------- | ------------------------------------------------- |
| `npm start`         | Dev server do Expo                                |
| `npm run typecheck` | `tsc --noEmit`                                    |
| `npm run lint`      | ESLint (config Expo + Prettier)                   |
| `npm test`          | Jest                                              |
| `npm run test:db`   | Testes SQL (RLS, RPCs) — ver `scripts/test-db.sh` |
| `npm run format`    | Prettier (com ordenação de classes Tailwind)      |
| `npm run db:*`      | Supabase local (start/stop/reset/types)           |

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
