/**
 * References shown in "Base científica e fontes". Every link was checked when added.
 * They are general references on physical activity, training intensity and load
 * management — the app's rules were NOT reviewed or validated by these authors.
 */
export type Source = {
  title: string;
  publisher: string;
  /** What it says that relates to the app, in plain words. */
  relevance: string;
  url: string;
};

export type SourceGroup = { title: string; sources: readonly Source[] };

export const SOURCE_GROUPS: readonly SourceGroup[] = [
  {
    title: 'Atividade física e saúde',
    sources: [
      {
        title: 'Diretrizes da OMS para atividade física e comportamento sedentário (2020)',
        publisher: 'Organização Mundial da Saúde',
        relevance:
          'Recomenda 150–300 min/semana de atividade moderada ou 75–150 min de vigorosa para adultos.',
        url: 'https://www.who.int/publications/i/item/9789240015128',
      },
      {
        title: 'Guia de Atividade Física para a População Brasileira (2021)',
        publisher: 'Ministério da Saúde',
        relevance: 'Recomendações oficiais brasileiras, baseadas nas diretrizes da OMS.',
        url: 'https://bvsms.saude.gov.br/bvs/publicacoes/guia_atividade_fisica_populacao_brasileira.pdf',
      },
      {
        title:
          'Quantity and quality of exercise for developing and maintaining fitness (Garber et al., 2011)',
        publisher: 'American College of Sports Medicine (ACSM) — Med Sci Sports Exerc',
        relevance:
          'Posicionamento do ACSM sobre volume, intensidade e progressão do exercício para adultos.',
        url: 'https://pubmed.ncbi.nlm.nih.gov/21694556/',
      },
    ],
  },
  {
    title: 'Intensidade e organização do treino',
    sources: [
      {
        title:
          'What is best practice for training intensity and duration distribution in endurance athletes? (Seiler, 2010)',
        publisher: 'Int J Sports Physiol Perform',
        relevance:
          'Atletas de resistência fazem a maior parte do treino em intensidade leve e uma parte menor intensa — base para alternar rodagens leves com tiros e limiar.',
        url: 'https://pubmed.ncbi.nlm.nih.gov/20861519/',
      },
    ],
  },
  {
    title: 'Carga de treino, dor e lesões',
    sources: [
      {
        title:
          'The training—injury prevention paradox: should athletes be training smarter and harder? (Gabbett, 2016)',
        publisher: 'British Journal of Sports Medicine',
        relevance:
          'Aumentos bruscos de carga elevam o risco de lesão; progressão gradual protege — base para reduzir volume quando há dor.',
        url: 'https://pubmed.ncbi.nlm.nih.gov/26758673/',
      },
      {
        title:
          'Continued sports activity, using a pain-monitoring model, during rehabilitation in patients with Achilles tendinopathy (Silbernagel et al., 2007)',
        publisher: 'American Journal of Sports Medicine',
        relevance:
          'Manter atividade guiada pelo nível de dor pode ser seguro em alguns casos — base para permitir treino leve com dor leve e suspender com dor forte.',
        url: 'https://pubmed.ncbi.nlm.nih.gov/17307888/',
      },
      {
        title: 'The most common running injuries plus how to treat them',
        publisher: 'Cleveland Clinic',
        relevance: 'Reduzir o treino guiado pela dor e procurar avaliação se ela persistir.',
        url: 'https://health.clevelandclinic.org/the-most-common-running-injuries-plus-how-to-treat-them',
      },
    ],
  },
];

export const SOURCES_DISCLAIMER =
  'Estas são referências gerais sobre atividade física, intensidade e carga de treino. As regras do Thunder foram escritas a partir de práticas comuns da corrida e não foram revisadas nem validadas pelos autores dessas publicações ou por um profissional. Os treinos não substituem a orientação de um profissional de Educação Física, médico ou fisioterapeuta.';
