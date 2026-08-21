/* "O essencial" — as três linhas fixas do topo do Panorama (Projetos,
   Entregas, Atenção). Até esta mudança eram três frases escritas à mão em
   prosa.js, reescritas a cada edição quinzenal; agora são calculadas dos
   itens que a própria rodada já buscou no Azure DevOps.

   Vive em tools/, não em app.js, por dois motivos que andam juntos: primeiro,
   decidir "qual é o mês mais recente com entrega" ou "1 travado" vs.
   "2 travados" é julgamento sobre dado, e julgamento pede teste — e teste
   pede um módulo Node, não um <script> de site sem build. Segundo, o
   resultado precisa aparecer em fatos.js para o site continuar só
   renderizando (a mesma divisão pura/impura do resto de tools/): calcular no
   navegador exigiria ou duplicar esta lógica lá (o oposto de "testado em
   tools/"), ou carregar mais um módulo no site, que hoje não usa nenhum.

   O rótulo de cada linha (`tag`) é fixo — "Projetos"/"Entregas"/"Atenção" —
   do mesmo jeito que o `tag` de `summary` em prosa.js sempre foi fixo: existe
   para o leitor achar a mesma pergunta no mesmo lugar toda vez, mesmo que o
   texto ao lado mude sozinho. */

/* "2026-08" → "agosto" (pt-BR) | "August" (en-US). Mesma técnica que
   fmtMonthLong usa em app.js (Intl.DateTimeFormat com month:"long") — não a
   mesma função, porque não dá para chamar código de app.js a partir daqui:
   app.js é um <script> comum, sem export, carregado só no navegador, e este
   módulo roda em Node durante o sync (não no navegador, ver o comentário
   acima). fmtMonthLong também capitaliza a primeira letra para servir de
   título de seção ("Agosto de 2026"); aqui o texto pede o mês embutido no
   meio da frase ("no mês de agosto"), então a capitalização própria do
   Intl para cada locale (minúscula em pt-BR, maiúscula em en-US) já é o
   resultado certo sem transformação nenhuma. */
function mesPorExtenso(ym, locale){
  const [y, m] = ym.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(y, m - 1, 1));
}

/* itens: a lista de Features já mapeadas por itemDe (mapa.mjs) — cada uma
   com `status`, `track`, `shipped` e `health` no formato que este módulo
   espera. Puro: nenhuma leitura de arquivo, nenhuma chamada de rede. */
export function calcularResumo(itens){
  const lista = itens || [];
  const total = lista.length;
  const emCurso = lista.filter(i => i.status === 'doing').length;
  const planejado = lista.filter(i => i.status === 'next').length;
  const concluido = lista.filter(i => i.status === 'done').length;
  /* Produtos distintos ENTRE OS ITENS, não o tamanho da lista de
     tools/config.json → produtos: a frase descreve como estes {total}
     projetos se distribuem, então um produto cadastrado sem nenhuma Feature
     hoje não deveria inflar a contagem. */
  const nProdutos = new Set(lista.filter(i => i.track != null).map(i => i.track)).size;

  const linhaProjetos = {
    tag: { pt: 'Projetos', en: 'Projects' },
    pt: `${total} projetos em ${nProdutos} produtos: ${emCurso} em curso, ${planejado} planejados, ${concluido} concluídos.`,
    en: `${total} projects across ${nProdutos} products: ${emCurso} in flight, ${planejado} planned, ${concluido} shipped.`
  };

  /* "Mais recente" só entre quem tem os dois: status done E shipped
     preenchido. Um item done sem shipped (ClosedDate vazio no DevOps) não
     tem mês para entrar na comparação — contá-lo aqui inventaria uma data
     que a base não tem. */
  const entregues = lista.filter(i => i.status === 'done' && i.shipped);
  let linhaEntregas;
  if(entregues.length){
    const mesRecente = entregues.map(i => i.shipped).sort().reverse()[0]; // "AAAA-MM" ordena como string
    const n = entregues.filter(i => i.shipped === mesRecente).length;
    linhaEntregas = {
      tag: { pt: 'Entregas', en: 'Shipped' },
      pt: `${n} ${n === 1 ? 'entrega' : 'entregas'} no mês de ${mesPorExtenso(mesRecente, 'pt-BR')}.`,
      en: `${n} shipped in ${mesPorExtenso(mesRecente, 'en-US')}.`
    };
  } else {
    linhaEntregas = {
      tag: { pt: 'Entregas', en: 'Shipped' },
      pt: 'Nenhuma entrega registrada com data de conclusão ainda.',
      en: 'No delivery with a recorded close date yet.'
    };
  }

  /* "watch" (em atenção) não entra aqui: é editorial, só existe em prosa.js,
     e este módulo roda no sync, antes de prosa.js sequer ser lido. "blocked"
     é o único sinal de saúde que o Azure DevOps de fato manda (ver healthDe,
     mapa.mjs), então é o único que esta linha pode honestamente contar. */
  const travados = lista.filter(i => i.health === 'blocked').length;
  const linhaAtencao = {
    tag: { pt: 'Atenção', en: 'Attention' },
    pt: travados === 0 ? 'Nada travado.' : `${travados} travado${travados === 1 ? '' : 's'} no Azure DevOps.`,
    en: travados === 0 ? 'Nothing blocked.' : `${travados} blocked in Azure DevOps.`
  };

  return [linhaProjetos, linhaEntregas, linhaAtencao];
}
