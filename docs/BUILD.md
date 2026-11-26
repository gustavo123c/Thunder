# Build e instalação (Android e iOS)

O Thunder é um único código React Native/Expo para Android e iOS. Para testar rápido, use o
**Expo Go** (`npm run go`) nos dois sistemas. Para gravar corridas com a tela bloqueada e ver o
mapa real, instale um **build** gerado pelo EAS (nuvem da Expo — não precisa de Android Studio
nem de Mac).

## 1. Uma vez: conta Expo e variáveis públicas

O EAS compila na nuvem e **não lê o seu `.env.local`**. Cadastre as mesmas chaves públicas
(nunca a `service_role`) nos ambientes do EAS:

```bash
npx eas-cli@latest login
npx eas-cli@latest init          # liga o projeto à sua conta Expo (grava o projectId no app.json)

# repita para development, preview e production
npx eas-cli@latest env:create --environment preview --visibility plaintext \
  --name EXPO_PUBLIC_SUPABASE_URL --value "https://SEU-PROJETO.supabase.co"
npx eas-cli@latest env:create --environment preview --visibility plaintext \
  --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "SUA_CHAVE_ANON"
npx eas-cli@latest env:create --environment preview --visibility plaintext \
  --name EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN --value "pk...."
```

Cada perfil do `eas.json` usa o ambiente de mesmo nome (`development`, `preview`, `production`).

## 2. Android

| Objetivo                        | Comando                                                             | Resultado                            |
| ------------------------------- | ------------------------------------------------------------------- | ------------------------------------ |
| Desenvolver com o app instalado | `npx eas-cli@latest build --profile development --platform android` | APK com o cliente de desenvolvimento |
| Mandar para amigos testarem     | `npx eas-cli@latest build --profile preview --platform android`     | APK instalável por link              |
| Publicar na Google Play         | `npx eas-cli@latest build --profile production --platform android`  | AAB para a Play Console              |

- Ao terminar, o EAS mostra um link/QR code. No celular, abra o link e instale o APK
  (o Android pede para permitir "instalar apps desconhecidos" do navegador).
- Com o build **development**, rode `npx expo start` no computador e abra o app Thunder (não o
  Expo Go).
- **GPS em segundo plano:** na primeira corrida, permita a localização e depois escolha
  **"Permitir o tempo todo"** (o Android abre as configurações para isso). Durante a corrida
  aparece a notificação "Thunder · gravando sua corrida" — é ela que mantém o GPS ativo.
- Alguns fabricantes (Xiaomi, Samsung, Motorola…) fecham apps em segundo plano para economizar
  bateria. Se a gravação parar com a tela bloqueada: Configurações → Apps → Thunder → Bateria →
  **Sem restrições**.

## 3. iOS

Instalar um build próprio no iPhone exige a conta **Apple Developer** (US$ 99/ano):

```bash
npx eas-cli@latest device:create                                   # cadastra o iPhone
npx eas-cli@latest build --profile development --platform ios      # build de desenvolvimento
npx eas-cli@latest build --profile production --platform ios       # para TestFlight / App Store
npx eas-cli@latest submit --platform ios                           # envia ao TestFlight
```

## Verificações já feitas no código

- Permissões Android geradas: localização (inclusive em segundo plano), serviço em primeiro plano
  de localização e notificações. Câmera e microfone ficam bloqueados (o app só escolhe fotos e
  vídeos da galeria).
- Tema claro/escuro no Android via `expo-system-ui`.
- Barra de abas respeita a barra de navegação do Android; o botão voltar na aba Treino retorna da
  etapa 2 para o check-up.
