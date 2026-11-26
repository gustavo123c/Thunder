# ⚡ Thunder

**Thunder** é um app de corrida para quem quer **evoluir com constância e sem se machucar**.
Ele grava suas corridas com GPS, mostra a sua evolução com números claros, monta treinos de
corrida que se ajustam às dores que você sente e transforma o treino em algo para fazer junto
com os amigos.

> Feito para corredores brasileiros: interface em português, unidades métricas e ritmo no
> formato de pista (`5'16"` por km).

---

## A proposta

A maioria dos apps de corrida mede o que você fez. O Thunder também ajuda a decidir **o que
fazer a seguir**:

- **Medir com precisão** — distância, ritmo, parciais e voltas, mesmo sem internet.
- **Mostrar a evolução** — comparações com a semana, o mês e o ano anteriores, recordes e
  medalhas.
- **Treinar com segurança** — o check-up corporal reduz a carga do treino quando algo dói e
  lembra dores que se repetem.
- **Correr junto** — feed, grupos com ranking semanal e incentivo com "Raios".

## Funcionalidades

### 🏃 Correr

- Gravação por GPS com distância, tempo, ritmo atual e médio em tempo real.
- **Voltas** a cada quilômetro, com a diferença para a volta anterior.
- Grava com a tela bloqueada (no app instalado) e guarda tudo no aparelho: se faltar internet
  ou o app fechar, a corrida é enviada depois, sem perda.
- Pausar e retomar; corridas sem distância registrada são tratadas à parte.

### 📊 Histórico e evolução

- Histórico agrupado por mês, com miniatura do trajeto e selo de **recorde**.
- Detalhe da corrida com mapa, parciais por km, elevação, calorias, fotos e vídeos.
- **Retrospectiva**: desempenho por dia, semana, mês e ano comparado ao período anterior.
- **Win Streak**: semanas seguidas treinando.

### 🩺 Treino e check-up corporal

- **Mapa corporal** anatômico (frente/costas, masculino/feminino) para marcar dores leves,
  moderadas ou fortes.
- **Histórico de dores**: mostra as dores dos últimos 90 dias e avisa quando uma dor volta.
- **Treinos de corrida**: tiros, fartlek, limiar, subidas, progressivo, rodagem, longão e
  regenerativo, nos níveis iniciante, intermediário e avançado (com zonas de frequência
  cardíaca), ou a partir de um objetivo escrito ("10 km em 45 min", "foco em subida").
- A ficha de treino traz aquecimento, parte principal e desaquecimento com ritmos-alvo.
- **As dores reduzem a carga**: cada região tem os treinos que mais a sobrecarregam; dor leve
  diminui o volume, moderada limita a corridas leves e planas, forte suspende a corrida.
- **Check-in pós-treino** ("Como você se sentiu?") ajusta os próximos treinos.

### 🏅 Conquistas

- 12 medalhas desbloqueadas automaticamente (primeira corrida, 5 km, 10 km, meia maratona,
  7 dias seguidos, 12 treinos no mês, distância acumulada…).
- **Celebração** ao terminar a corrida, com as medalhas novas e o que mudou na sua evolução.
- Recordes pessoais: melhor ritmo, maior distância e melhor 5 km.

### 👥 Social

- Feed com as corridas de quem você segue, "Raios" ⚡ e comentários.
- **Grupos** com código de convite, ranking semanal de distância e feed do grupo.
- Privacidade por corrida: pública, seguidores e grupos, ou só você.

### ⚙️ E mais

- Modo claro, escuro ou automático.
- Central de ajuda com tutoriais e uma página de **base científica e fontes**.
- Funciona em **iPhone e Android**.

## Como os treinos são gerados

Os treinos são montados por **regras automáticas**, não por uma inteligência artificial de
conversa. Os ritmos partem da média das suas corridas recentes e as dores marcadas ajustam
volume, intensidade e tipo de treino. As regras seguem práticas comuns da corrida e as
referências gerais listadas no app, mas **não foram validadas por um profissional**.

> ⚠️ O Thunder não substitui a orientação de um profissional de Educação Física, médico ou
> fisioterapeuta. Pare se sentir dor forte, tontura ou falta de ar.

## Tecnologia

| Camada      | Escolha                                                               |
| ----------- | --------------------------------------------------------------------- |
| App         | React Native + Expo SDK 58, Expo Router, TypeScript estrito           |
| Interface   | NativeWind (Tailwind), tema claro/escuro, JetBrains Mono e Archivo    |
| Estado      | TanStack Query (servidor) e Zustand (corrida em andamento)            |
| Backend     | Supabase — Postgres + PostGIS, Auth, Storage e regras de acesso (RLS) |
| Mapas e GPS | Mapbox, expo-location (segundo plano) e SQLite local                  |
| Qualidade   | Jest + Testing Library, testes SQL de segurança, ESLint e Prettier    |

## Como rodar

### 1. Pré-requisitos

- Node 22+ e uma conta Expo.
- Um projeto no [Supabase](https://supabase.com) (ou Supabase local com Docker).
- Um token público do [Mapbox](https://account.mapbox.com/access-tokens/) (`pk.…`).

### 2. Configuração

```bash
npm ci
cp .env.example .env.local   # preencha a URL e a chave anon do Supabase e o token do Mapbox
```

Banco de dados — aplique as migrations de `supabase/migrations`:

```bash
npx supabase login
npx supabase link --project-ref <ref-do-projeto>
npx supabase db push
```

(ou cole cada arquivo, em ordem, no SQL Editor do Supabase — eles podem ser executados mais de
uma vez sem problema).

### 3. Testar no celular

**Expo Go (rápido e grátis)** — instale o Expo Go e rode:

```bash
npm run go                 # mesma rede Wi-Fi
npm run go -- --tunnel     # celular em outra rede
```

No Expo Go o app funciona em **modo de teste**: a rota aparece desenhada (sem o mapa do Mapbox)
e a corrida é gravada com o app aberto.

**App instalado (completo)** — mapa real e gravação com a tela bloqueada. O build é feito na
nuvem pelo EAS; no Android é gratuito, no iPhone exige a conta Apple Developer. Passo a passo em
[`docs/BUILD.md`](docs/BUILD.md).

> Teste a gravação **ao ar livre**: em ambientes fechados o GPS gera pontos imprecisos.

## Scripts

| Script              | O que faz                                        |
| ------------------- | ------------------------------------------------ |
| `npm start`         | Servidor de desenvolvimento                      |
| `npm run go`        | Servidor para o Expo Go                          |
| `npm run typecheck` | Verificação de tipos                             |
| `npm run lint`      | ESLint                                           |
| `npm test`          | Testes do app (Jest)                             |
| `npm run test:db`   | Testes SQL de segurança (RLS e funções do banco) |
| `npm run format`    | Prettier                                         |
| `npm run db:*`      | Supabase local (start, stop, reset, types)       |

## Estrutura

```
src/
├── app/          # telas e navegação (Expo Router)
├── features/     # módulos: corrida, histórico, treino, saúde, progresso, social, ajuda…
├── domain/       # regras puras e testadas: métricas, treinos, dores, medalhas
├── components/   # interface compartilhada (design system "Pista na Tempestade")
├── services/     # Supabase, Mapbox, armazenamento local
├── theme/        # cores, fontes e tema claro/escuro
└── lib/          # formatação, ambiente, cache
supabase/
├── migrations/   # banco de dados versionado (com RLS)
└── tests/        # testes SQL de segurança
```

## Documentação

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — arquitetura, banco de dados e design system.
- [`docs/BUILD.md`](docs/BUILD.md) — builds para Android e iPhone com o EAS.
