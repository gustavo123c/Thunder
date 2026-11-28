/*
 * RASCUNHO — pendente de revisão jurídica. Não publicar antes da revisão.
 *
 * Texto escrito pela equipe de desenvolvimento para servir de base à revisão por um
 * advogado. Trechos entre colchetes ([...]) precisam ser preenchidos. Os pontos de
 * atenção da autorrevisão estão em docs/legal/REVISAO_TERMOS.md.
 *
 * Ao mudar o texto de forma relevante, troque TERMS_VERSION: o app pede o aceite de novo.
 */

/** Bump to ask every user to accept again. */
export const TERMS_VERSION = '2026-11-28';

export type TermsSection = {
  title: string;
  paragraphs: readonly string[];
  /** Risks and limits: shown with emphasis (CDC, art. 54, §4º). */
  highlight?: boolean;
};

export const TERMS_TITLE = 'Termos de Uso e Política de Privacidade';

export const TERMS_INTRO =
  'Leia com atenção. Este texto explica o que o Thunder faz, o que ele não faz, os riscos de praticar corrida com base em sugestões automáticas e como tratamos os seus dados.';

export const TERMS_SECTIONS: readonly TermsSection[] = [
  {
    title: '1. Quem somos e o que é o Thunder',
    paragraphs: [
      'O Thunder é um aplicativo de corrida mantido por [nome completo ou razão social do responsável, CPF ou CNPJ e endereço] ("Thunder", "nós").',
      'O app registra suas corridas pelo GPS, mostra seu histórico e evolução, permite interagir com outros corredores e gera sugestões automáticas de treino de corrida.',
      'Ao aceitar estes termos, você passa a poder usar o app. Se não concordar, não use o Thunder; você pode sair da conta a qualquer momento.',
    ],
  },
  {
    title: '2. As sugestões de treino são automáticas',
    highlight: true,
    paragraphs: [
      'Os treinos do Thunder são gerados por regras e algoritmos, a partir das informações que você fornece (nível, objetivo, tempo disponível, ritmo das últimas corridas, dores marcadas no mapa do corpo, respostas do questionário de saúde e avaliações após o treino).',
      'Essas sugestões são gerais e automáticas. Elas não são uma prescrição individual de exercício e não substituem a avaliação e o acompanhamento de um profissional de Educação Física, de um médico ou de um fisioterapeuta.',
      'Nenhum profissional de saúde revisa os treinos sugeridos antes de você vê-los.',
    ],
  },
  {
    title: '3. Algoritmos têm limites',
    highlight: true,
    paragraphs: [
      'Algoritmos não são uma ciência exata. As sugestões podem não ser adequadas ao seu corpo, ao seu momento ou às condições do dia, e podem conter erros, inclusive de ritmo, duração ou intensidade.',
      'O app não sabe tudo sobre você: ele não examina seu corpo, não mede sua pressão nem seus batimentos e não conhece informações que você não informou. Uma dor marcada no mapa reduz a carga do treino, mas isso não é diagnóstico nem tratamento.',
      'Use as sugestões como ponto de partida e ajuste ao que você sente. Na dúvida, escolha a opção mais leve ou não treine.',
    ],
  },
  {
    title: '4. Procure profissionais antes de começar',
    highlight: true,
    paragraphs: [
      'Recomendamos procurar um profissional de Educação Física registrado no CREF e fazer uma avaliação médica antes de iniciar ou mudar sua rotina de treinos.',
      'Isso é ainda mais importante se você tem alguma condição de saúde (por exemplo, cardíaca, de pressão, diabetes ou asma), está grávida, usa medicamentos contínuos, tem ou teve lesão, sente dor, está voltando a treinar depois de muito tempo ou respondeu "sim" a alguma pergunta de prontidão do questionário de saúde.',
    ],
  },
  {
    title: '5. Seus limites e sinais de alerta',
    highlight: true,
    paragraphs: [
      'Você conhece o seu corpo melhor do que o app. Respeite seus limites, hidrate-se, escolha locais e horários seguros e preste atenção ao trânsito e ao ambiente enquanto corre. Não mexa no celular em situações de risco.',
      'Pare o treino imediatamente e procure ajuda médica se sentir dor ou aperto no peito, tontura, desmaio ou sensação de desmaio, falta de ar fora do normal, palpitações, confusão ou dor intensa. Em emergência, ligue 192 (SAMU).',
      'Se o app mostrar um aviso de segurança após um treino, siga a orientação de interromper os treinos e buscar avaliação médica.',
    ],
  },
  {
    title: '6. Informações de saúde que você fornece',
    highlight: true,
    paragraphs: [
      'Para adaptar as sugestões, você pode informar dados de saúde: dores e sua intensidade no mapa do corpo, respostas do questionário de saúde (anamnese), lesões, cirurgias, condições de saúde, medicamentos e como se sentiu após os treinos. Peso, altura, data de nascimento e sexo também ajudam nos cálculos.',
      'Pela Lei Geral de Proteção de Dados (LGPD), dados de saúde são dados pessoais sensíveis. Só os tratamos com o seu consentimento específico, dado na tela de aceite e, para o questionário de saúde, também dentro dele.',
      'A qualidade das sugestões depende do que você informa. Informações incompletas, desatualizadas ou incorretas podem gerar sugestões inadequadas. Mantenha-as atualizadas; a seção 9 explica como corrigir ou apagar cada uma.',
      'Seus dados de saúde não são exibidos para outros usuários e não são usados para publicidade.',
    ],
  },
  {
    title: '7. Localização (GPS)',
    paragraphs: [
      'Para registrar uma corrida, o app usa a localização do seu celular, com a sua permissão. Durante uma corrida em andamento, a localização continua sendo registrada mesmo com a tela apagada ou com o app em segundo plano, até você encerrar a corrida. Fora de uma corrida, o Thunder não registra sua localização.',
      'O trajeto, a distância, o ritmo e os horários ficam salvos no seu histórico. Um trajeto pode revelar onde você mora, trabalha ou costuma correr: escolha com cuidado a visibilidade de cada corrida.',
      'Você pode negar ou retirar a permissão de localização nas configurações do celular; nesse caso, o app não consegue registrar corridas pelo GPS.',
    ],
  },
  {
    title: '8. Comunidade e conteúdo publicado',
    paragraphs: [
      'Cada corrida tem uma visibilidade: pública (qualquer usuário vê), seguidores (quem segue você ou participa de um grupo com você) ou privada (só você vê). Seu nome, nome de usuário e foto de perfil são visíveis para outros usuários.',
      'Fotos, vídeos, comentários e curtidas que você publica são de sua responsabilidade. Não publique conteúdo ilegal, ofensivo, discriminatório, que viole direitos de outras pessoas ou que exponha terceiros sem autorização. Podemos remover conteúdo e suspender contas que descumpram estas regras, informando o motivo quando possível.',
    ],
  },
  {
    title: '9. Privacidade e proteção de dados (LGPD)',
    paragraphs: [
      'Dados que tratamos: e-mail e dados de acesso; perfil (nome, nome de usuário, foto, nível, objetivo, peso, altura, data de nascimento, sexo); corridas (trajeto GPS, distância, tempo, ritmo, parciais, fotos e vídeos); interações (seguidores, grupos, curtidas, comentários, medalhas); dados de saúde (descritos na seção 6); treinos gerados e avaliações; e o registro do seu aceite destes termos.',
      'Para que usamos: criar e manter sua conta; registrar e mostrar suas corridas; gerar e adaptar sugestões de treino; permitir a interação com outros corredores conforme a visibilidade que você escolher; manter a segurança do serviço; e cumprir obrigações legais. Não vendemos seus dados.',
      'Bases legais: execução do contrato de uso do app (LGPD, art. 7º, V), seu consentimento específico para dados de saúde (art. 11, I), cumprimento de obrigação legal (art. 7º, II) e exercício regular de direitos (art. 7º, VI).',
      'Com quem compartilhamos: com fornecedores que operam o serviço em nosso nome, apenas no necessário — Supabase (banco de dados, login e armazenamento de arquivos), Mapbox (exibição de mapas) e Expo (entrega de atualizações do app). Alguns desses fornecedores podem armazenar dados fora do Brasil [confirmar a região dos servidores], com as garantias exigidas pela LGPD. Também podemos compartilhar dados quando a lei ou uma autoridade competente exigir.',
      'Segurança e retenção: usamos controles de acesso para que cada pessoa veja apenas o que lhe é permitido. Mantemos seus dados enquanto sua conta existir. Dados que você apaga no app são removidos dos nossos sistemas ativos; o registro de aceite destes termos é mantido pelo prazo necessário para comprovar o aceite [definir prazo].',
      'Seus direitos: você pode confirmar se tratamos seus dados, acessá-los, corrigi-los, pedir anonimização, bloqueio ou eliminação, pedir a portabilidade, saber com quem compartilhamos, revogar o consentimento e pedir a revisão de decisões automatizadas (LGPD, art. 18 e art. 20).',
      'Como exercer: no app, você pode editar seu perfil, apagar corridas, fotos, vídeos, comentários, treinos salvos e o questionário de saúde, e marcar dores como resolvidas. Para os demais pedidos, como apagar o histórico de dores e as avaliações após os treinos, receber uma cópia dos seus dados ou excluir a conta, escreva para [e-mail de contato]. Responderemos dentro dos prazos legais. Se a revogação do consentimento para dados de saúde impedir as sugestões adaptadas, avisaremos você.',
      'Você também pode apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD).',
    ],
  },
  {
    title: '10. Crianças e adolescentes',
    paragraphs: [
      'O Thunder pode ser usado por pessoas de todas as idades, mas quem tem menos de 18 anos só deve usá-lo com o conhecimento e a concordância de pelo menos um dos pais ou responsável legal, que deve ler estes termos junto com a criança ou o adolescente.',
      'Para menores de 12 anos, o consentimento para o tratamento de dados deve ser dado por um dos pais ou pelo responsável legal (LGPD, art. 14). Recomendamos que treinos de crianças e adolescentes sejam sempre orientados por um profissional de Educação Física.',
      'Na tela de aceite, a pessoa declara ter 18 anos ou mais ou que o responsável legal leu e concordou com estes termos. Se soubermos que uma conta de menor foi criada sem essa concordância, poderemos suspendê-la e apagar os dados.',
    ],
  },
  {
    title: '11. Nossas responsabilidades',
    paragraphs: [
      'Nos comprometemos a manter o app funcionando com cuidado, corrigir erros que identificarmos, proteger seus dados e informar com clareza os limites das sugestões.',
      'O app pode ficar indisponível por manutenção, falhas de conexão ou de fornecedores, e o GPS pode registrar distâncias e ritmos imprecisos. Faremos o possível para restabelecer o serviço e corrigir problemas.',
      'Estes termos não afastam os direitos que a lei garante a você, inclusive os previstos no Código de Defesa do Consumidor.',
    ],
  },
  {
    title: '12. Mudanças nestes termos',
    paragraphs: [
      'Podemos atualizar estes termos para refletir mudanças no app ou na lei. Quando a mudança for relevante, o app pedirá que você leia e aceite a nova versão antes de continuar. Você sempre poderá consultar a versão em vigor em Perfil > Configurações > Termos de Uso.',
    ],
  },
  {
    title: '13. Encerramento',
    paragraphs: [
      'Você pode parar de usar o Thunder e pedir a exclusão da conta a qualquer momento pelo [e-mail de contato]. Com a exclusão, apagamos seus dados, exceto o que a lei nos obrigar a guardar.',
    ],
  },
  {
    title: '14. Lei aplicável e contato',
    paragraphs: [
      'Estes termos seguem as leis do Brasil. Eventuais disputas podem ser levadas ao foro do seu domicílio, conforme o Código de Defesa do Consumidor.',
      'Dúvidas, sugestões ou pedidos sobre seus dados: [e-mail de contato]. Encarregado pelo tratamento de dados pessoais (DPO): [nome e contato do encarregado].',
    ],
  },
];

/** Checkboxes on the acceptance screen; all are required to continue. */
export const TERMS_CHECKS = {
  terms: 'Li e concordo com os Termos de Uso e a Política de Privacidade.',
  health:
    'Autorizo o uso dos meus dados de saúde (dores, questionário de saúde e avaliações após os treinos) para adaptar as sugestões de treino, como descrito na seção 6.',
  age: 'Tenho 18 anos ou mais, ou meu pai, mãe ou responsável legal leu e concordou com estes termos.',
} as const;
