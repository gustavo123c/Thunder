import type Ionicons from '@expo/vector-icons/Ionicons';

type IconName = keyof typeof Ionicons.glyphMap;

export type HelpArticle = {
  id: string;
  title: string;
  /** Short answer shown first. */
  summary: string;
  /** Step-by-step mini tutorial. */
  steps: readonly string[];
  /** Extra words that should match the search (synonyms). */
  keywords?: string;
};

export type HelpCategory = {
  id: string;
  title: string;
  icon: IconName;
  articles: readonly HelpArticle[];
};

export const HELP_CATEGORIES: readonly HelpCategory[] = [
  {
    id: 'run',
    title: 'Registrar uma corrida e usar o GPS',
    icon: 'navigate',
    articles: [
      {
        id: 'record',
        title: 'Como gravar uma corrida',
        summary: 'Toque no botão amarelo "Correr" no centro da barra de abas.',
        steps: [
          'Abra a aba Correr e permita o acesso à localização.',
          'Espere alguns segundos ao ar livre para o GPS ficar preciso.',
          'Toque em Iniciar. Tempo, distância e pace aparecem na hora.',
          'Use Pausar quando parar (semáforo, água) e Retomar para continuar.',
          'Toque em Finalizar: a corrida é salva e você vê sua celebração e o resumo.',
        ],
        keywords: 'gravar iniciar pausar finalizar correr start',
      },
      {
        id: 'background',
        title: 'Gravar com a tela bloqueada',
        summary:
          'No app instalado, permita a localização "Sempre" (iPhone) ou "O tempo todo" (Android).',
        steps: [
          'Na primeira corrida, aceite a localização e depois escolha "Sempre" / "O tempo todo".',
          'Durante a corrida, o Android mostra a notificação "Thunder · gravando sua corrida".',
          'Se a gravação parar com a tela bloqueada, desative a economia de bateria para o Thunder.',
          'No Expo Go (modo de teste), mantenha o app aberto: a tela fica acesa durante a corrida.',
        ],
        keywords: 'segundo plano bloqueada bateria permissão sempre',
      },
      {
        id: 'offline',
        title: 'Corri sem internet. Perdi a corrida?',
        summary: 'Não. A corrida fica salva no celular e é enviada assim que houver conexão.',
        steps: [
          'Finalize normalmente, mesmo sem sinal.',
          'Um aviso no Histórico mostra corridas aguardando envio.',
          'Ao voltar a ter internet, o envio acontece sozinho.',
        ],
        keywords: 'offline sem sinal internet envio pendente',
      },
    ],
  },
  {
    id: 'body',
    title: 'Mapa corporal e dores',
    icon: 'body',
    articles: [
      {
        id: 'mark-pain',
        title: 'Como marcar uma dor',
        summary: 'Na aba Treino, toque na região do corpo e escolha Leve, Moderada ou Forte.',
        steps: [
          'Abra a aba Treino (etapa 1, Check-up).',
          'Escolha Frente ou Costas e o modelo Masculino ou Feminino.',
          'Toque no músculo que dói. Para regiões pequenas, use "Escolher pela lista".',
          'Na gaveta, escolha a intensidade. A dor aparece como etiqueta abaixo do mapa.',
          'Toque no "×" da etiqueta quando a dor passar.',
        ],
        keywords: 'dor lesão músculo mapa corpo marcar',
      },
      {
        id: 'pain-history',
        title: 'Histórico e dores recorrentes',
        summary:
          'O botão "Histórico" mostra suas dores dos últimos 90 dias e avisa quando uma dor se repete.',
        steps: [
          'Cada dor marcada fica registrada com data, região e intensidade.',
          'Se você relatar a mesma região 2 vezes ou mais em 30 dias, ela aparece como recorrente.',
          'Ao marcar de novo uma dor que já passou, o app avisa que ela voltou.',
          'No treino, você pode repetir o treino de recuperação anterior ou gerar um novo.',
        ],
        keywords: 'histórico recorrente voltou repetida',
      },
    ],
  },
  {
    id: 'workouts',
    title: 'Treinos personalizados',
    icon: 'stopwatch',
    articles: [
      {
        id: 'generate',
        title: 'Como gerar um treino',
        summary:
          'Escolha o tipo (tiros, fartlek, limiar…), o nível e o tempo, e toque em Gerar treino.',
        steps: [
          'Na etapa 2 da aba Treino, escolha o tipo de treino.',
          'Selecione o nível: Iniciante, Intermediário ou Avançado.',
          'Escolha o tempo disponível (20 a 90 min).',
          'Toque em Gerar treino para ver a ficha com aquecimento, parte principal e desaquecimento.',
          'Toque em Iniciar este treino para ir direto para a gravação.',
        ],
        keywords: 'ia gerar ficha planilha tiro fartlek limiar longão',
      },
      {
        id: 'how-it-works',
        title: 'Como o treino é calculado',
        summary:
          'Por regras automáticas — não é uma IA de conversa. Os ritmos vêm das suas corridas recentes.',
        steps: [
          'O pace de referência é a média das suas últimas corridas.',
          'Cada tipo de treino tem ritmos relativos a ele (ex.: tiros mais rápidos, regenerativo mais lento).',
          'Dores marcadas reduzem volume e intensidade e trocam treinos que sobrecarregam a região.',
          'Dor forte nas pernas suspende a corrida; dor no peito suspende qualquer treino.',
          'Veja "Base científica e fontes" para as referências gerais.',
        ],
        keywords: 'ia inteligência artificial regras como funciona cálculo',
      },
      {
        id: 'custom',
        title: 'Objetivo "Outro"',
        summary: 'Descreva o que você busca e o app escolhe o treino a partir das palavras.',
        steps: [
          'Selecione o cartão Outro e escreva seu objetivo.',
          'Palavras reconhecidas: tiros, fartlek, limiar, subida, longão, regenerativo, progressivo.',
          'Metas como "10 km em 45 min" definem seu pace de prova.',
          'A ficha mostra como seu texto foi interpretado.',
        ],
        keywords: 'outro personalizado objetivo meta prova',
      },
      {
        id: 'checkin',
        title: 'Check-in depois do treino',
        summary:
          'Depois de um treino adaptado a dores, responda como se sentiu. Isso ajusta os próximos.',
        steps: [
          'Gere um treino com dores marcadas e toque em Iniciar este treino.',
          'Ao finalizar a corrida, responda: Ajudou muito, Neutro ou Ainda sinto desconforto.',
          'Com "Ainda sinto desconforto", o próximo treino para essa região tem carga menor.',
        ],
        keywords: 'feedback check-in sentiu desconforto',
      },
    ],
  },
  {
    id: 'progress',
    title: 'Win Streak, Retrospectiva, medalhas e grupos',
    icon: 'trophy',
    articles: [
      {
        id: 'streak',
        title: 'Win Streak',
        summary: 'Conta as semanas seguidas com pelo menos uma corrida.',
        steps: [
          'Cada semana (de segunda a domingo) com uma corrida soma 1.',
          'A sequência só zera se uma semana inteira passar sem corrida.',
          'Veja no Perfil (Resumo) e na Retrospectiva.',
        ],
        keywords: 'sequência semanas streak constância',
      },
      {
        id: 'retrospective',
        title: 'Retrospectiva',
        summary: 'No Histórico, toque em "Retrospectiva" para comparar seus períodos.',
        steps: [
          'Escolha Dia, Semana, Mês ou Ano.',
          'Veja pace, distância e treinos comparados com o período anterior.',
        ],
        keywords: 'desempenho evolução comparação dashboard',
      },
      {
        id: 'medals',
        title: 'Medalhas',
        summary:
          'São desbloqueadas automaticamente: primeira corrida, 5 km, 10 km, meia maratona e mais.',
        steps: [
          'Veja todas no Perfil → Conquistas.',
          'As bloqueadas aparecem em cinza com a porcentagem que falta.',
          'Ao finalizar uma corrida, as novas medalhas aparecem na celebração.',
        ],
        keywords: 'conquistas medalhas badges troféu',
      },
      {
        id: 'groups',
        title: 'Grupos com amigos',
        summary: 'No Feed, toque em Grupos para criar um grupo ou entrar com um código.',
        steps: [
          'Crie um grupo e toque em Convidar para mandar o código aos amigos.',
          'Seus amigos entram em Feed → Grupos → Entrar com código.',
          'O ranking soma a distância da semana; o feed do grupo mostra as corridas dos membros.',
          'Corridas "Só eu" nunca aparecem no grupo nem contam no ranking.',
        ],
        keywords: 'grupo clube amigos ranking convite código',
      },
    ],
  },
];

/** Lowercase without accents. */
function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Categories filtered to the articles matching every word of the query. */
export function searchHelp(query: string): HelpCategory[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [...HELP_CATEGORIES];
  return HELP_CATEGORIES.map((category) => ({
    ...category,
    articles: category.articles.filter((article) => {
      const haystack = normalize(
        [
          category.title,
          article.title,
          article.summary,
          ...article.steps,
          article.keywords ?? '',
        ].join(' '),
      );
      return words.every((word) => haystack.includes(word));
    }),
  })).filter((category) => category.articles.length > 0);
}
