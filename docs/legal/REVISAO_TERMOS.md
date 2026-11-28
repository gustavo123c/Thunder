# Autorrevisão dos Termos de Uso — versão 2026-12-01

> RASCUNHO — pendente de revisão jurídica. Este documento não é parecer jurídico. É uma
> revisão crítica feita durante o desenvolvimento, com o objetivo de adiantar o trabalho
> do advogado e apontar onde o texto ou o app ainda têm risco.

Texto revisado: `src/features/legal/terms-content.ts` (é exatamente o que o app mostra).
Aceite registrado em: tabela `terms_acceptances` (usuário, versão, data e hora do servidor,
consentimento de dados de saúde e declaração de idade). Sem edição nem exclusão pelo usuário.

## Resumo

O texto cumpre o objetivo pedido: informa de forma clara que as sugestões são automáticas,
que algoritmos falham, que não substituem profissionais, quais são os sinais de alerta e
como os dados são tratados. Não contém cláusula de isenção total de responsabilidade e
preserva expressamente os direitos do Código de Defesa do Consumidor.

Os riscos que sobram estão menos no texto e mais em **lacunas de produto e de dados
cadastrais**: identidade do controlador, consentimento de dados de saúde condicionado ao
uso, verificação de idade para menores de 12 anos, ausência de exclusão de conta dentro do
app e transferência internacional não especificada.

## Pontos críticos (resolver antes de publicar)

1. **Identificação do controlador (LGPD, art. 9º, II e III; CDC, art. 6º, III).**
   O texto tem `[nome completo ou razão social, CPF ou CNPJ e endereço]` e
   `[nome e contato do encarregado]`. Sem isso, a informação ao titular é incompleta.
   Agentes de pequeno porte podem ser dispensados de indicar encarregado
   (Resolução CD/ANPD nº 2/2022), mas precisam manter um canal de comunicação — o
   `[e-mail de contato]` cumpre esse papel se for preenchido.

2. **Consentimento para dados de saúde condicionado ao uso do app (LGPD, art. 8º, §3º e
   art. 9º, §3º; art. 11, I).** Hoje, a caixa "Autorizo o uso dos meus dados de saúde" é
   obrigatória para usar qualquer parte do app, inclusive só registrar corridas. Consentimento
   precisa ser livre; quando é condição para o serviço, a lei exige destaque (o que foi feito),
   mas o vínculo é discutível porque o registro de corridas não depende de dados de saúde.
   **Recomendação:** tornar essa caixa opcional e, sem ela, desativar mapa de dores,
   questionário de saúde e feedback pós-treino (o restante do app continua funcionando).
   Mudança de produto — depende da decisão do dono.

3. **Menores de 12 anos (LGPD, art. 14, §1º e §5º; ECA). — Resolvido (versão 2026-12-01).**
   Decisão do dono: idade mínima de 12 anos. A tela de aceite pede a data de nascimento;
   abaixo de 12 não é possível aceitar, e o banco também recusa (regra na tabela). Entre 12
   e 17, são obrigatórios nome e e-mail do responsável e a declaração de que ele concordou;
   ficam gravados com o aceite. **Para o advogado:** a declaração não é verificada; avaliar
   se basta para adolescentes ou se convém confirmar por e-mail com o responsável. A data
   de nascimento é informada pela própria pessoa (sem checagem de documento).

4. **Exclusão de conta.** Só existe por e-mail. A LGPD aceita (art. 18, VI), mas a App Store
   (diretriz 5.1.1(v)) e o Google Play exigem exclusão de conta **dentro do app** para apps
   com cadastro. Sem isso, o app pode ser recusado nas lojas.

## Pontos importantes

5. **Transferência internacional (LGPD, art. 33; Resolução CD/ANPD nº 19/2024).** O texto
   diz que dados podem ficar fora do Brasil `[confirmar a região dos servidores]`. É preciso
   confirmar a região do projeto Supabase (há opção em São Paulo) e indicar o mecanismo
   (cláusulas-padrão contratuais dos fornecedores). Se tudo ficar no Brasil, simplificar.

6. **Prazo de guarda do registro de aceite.** Está como `[definir prazo]`. Sugestão para o
   advogado avaliar: enquanto a conta existir e por 5 anos após o encerramento (prazo do
   CDC, art. 27), apenas para defesa em processo.

7. **Dados que não podem ser apagados no app.** Histórico de dores e avaliações pós-treino
   só saem por e-mail. O texto foi ajustado para não prometer o contrário, mas o ideal é ter
   a opção no app, junto com o questionário de saúde.

8. **Prova do texto aceito.** O banco guarda a versão, não o texto. É preciso arquivar cada
   versão publicada (por exemplo, em `docs/legal/versoes/`) para provar o que foi aceito.
   O histórico do Git ajuda, mas não substitui um arquivo datado.

9. **Moderação de conteúdo (Marco Civil da Internet, art. 19; CDC).** O texto prevê remoção
   de conteúdo e suspensão de conta "informando o motivo quando possível". Recomenda-se
   prever um canal de contestação.

## Pontos menores

10. **Destaque das cláusulas de risco (CDC, art. 54, §4º).** Feito: as seções 2 a 6
    aparecem destacadas na tela. O advogado pode querer destacar também a seção 10.
11. **Decisões automatizadas (LGPD, art. 20).** Citado. Como as sugestões não restringem
    direitos, o risco é baixo; o canal de revisão é o e-mail.
12. **Mapbox.** O SDK de mapas envia dados de uso e localização ao Mapbox por padrão. Isso
    foi desligado no código (`setTelemetryEnabled(false)`), para que a frase "fora de uma
    corrida, o Thunder não registra sua localização" continue verdadeira.
13. **Precisão do GPS e indisponibilidade.** Informadas como limites, sem afastar
    responsabilidade — está correto.
14. **Linguagem.** Frases curtas, segunda pessoa, sem jargão. Bom para um contrato de adesão.

## O que foi verificado no código antes de afirmar no texto

| Afirmação nos termos                                                    | Verificação                                                                                               |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Dados de saúde não aparecem para outros usuários                        | Regras de acesso (RLS) de `pain_logs`, `health_anamnese` e `run_feedback` só deixam o próprio usuário ler |
| Localização só durante a corrida                                        | O rastreamento em segundo plano só liga ao iniciar uma corrida; telemetria do Mapbox desligada            |
| Pode apagar corridas, mídia, comentários, treinos e questionário no app | Existem as funções e telas de exclusão                                                                    |
| Dores só podem ser marcadas como resolvidas                             | Correto — o texto não promete exclusão no app                                                             |
| Não há serviços de análise ou publicidade                               | Nenhum SDK de analytics ou anúncios no projeto                                                            |
| Fornecedores: Supabase, Mapbox, Expo                                    | São os únicos serviços externos usados pelo app                                                           |
