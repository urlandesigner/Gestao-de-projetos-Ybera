/* Central de Projetos — a BUSCA no DevOps e a MONTAGEM do pacote do relatório.

   Até 15/10/2026 isto morava dentro do report.js, que é código de navegador: lia
   o estado global (`st`), o localStorage e o DOM. Saiu daqui porque passou a ter
   dois usuários que precisam fazer EXATAMENTE a mesma coisa:

   - o navegador do PO (report.js), que mostra o relatório ao vivo e baixa o
     arquivo do "Publicar dados";
   - a função da Vercel (api/relatorio.js), que entrega o relatório ao vivo pra
     quem não tem token.

   Duas cópias desta montagem divergiriam na primeira correção, e o leitor veria
   um relatório diferente do que o PO vê. Por isso tudo aqui recebe o que precisa
   por parâmetro — nenhum estado global, nenhum DOM.

   UMD simples: window.CentralPacote no navegador, module.exports no Node. */
(function (root, factory) {
  const C = (typeof module !== 'undefined' && module.exports) ? require('./core.js') : root.CentralCore;
  const api = factory(C);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CentralPacote = api;
})(typeof self !== 'undefined' ? self : this, function (C) {
  'use strict';

  const CAMPOS = [
    'System.Title', 'System.State', 'System.WorkItemType', 'System.Parent',
    'System.AssignedTo', 'Microsoft.VSTS.Scheduling.StartDate', 'Microsoft.VSTS.Scheduling.TargetDate',
    'Microsoft.VSTS.Common.ClosedDate', 'System.ChangedDate', 'System.Description',
    // Entra pelo documento que mede ritmo de sprint: com a iteração junto, saber
    // quem está em qual sprint é filtro local sobre uma lista que já veio, e não
    // uma consulta por sprint. Não viaja no link — quem decide isso é o
    // `camposDoLink` do documento, e nenhum dos três declara este campo.
    'System.IterationPath',
  ];

  // A consulta é presa à área do time (areaClause). Épico e Feature costumam
  // morar em outra área — ou em outro projeto — e simplesmente não vêm. Sem eles
  // a cadeia do produto quebra no primeiro salto e tudo cai em "sem produto".
  // workitemsbatch busca POR ID e não olha área: então pedimos os pais que
  // faltam, um nível por volta, até a cadeia fechar.
  // Estado, prazo e descrição entram porque o produto virou cabeçalho de grupo no
  // report — mostra em que pé o épico está e o objetivo dele, não só o nome.
  const CAMPOS_PAI = ['System.WorkItemType', 'System.Title', 'System.Parent',
    'System.State', 'Microsoft.VSTS.Scheduling.TargetDate', 'System.Description'];
  const NIVEIS_ACIMA = 4; // PBI → Feature → Épico usa 2; 4 é folga pra hierarquia torta

  const avisoPadrao = (msg) => { if (typeof console !== 'undefined') console.warn(msg); };
  const motivo = (e) => (e && e.message) || String(e);

  /* ---------- Busca ---------- */

  /* Os itens dos times, presos à área de cada um. Devolve também os escopos
     (projeto + área), que a busca do ritmo usa depois, e se alguma área falhou —
     aí a consulta vale pro projeto inteiro e os números incham, e quem publica
     precisa saber. */
  async function buscarItens({ A, ctx, projetos, avisar = avisoPadrao, mensagem = motivo }) {
    const todos = [];
    const escopos = [];
    let areaIncerta = false;
    for (const p of projetos) {
      let areas = [];
      try {
        areas = await A.teamAreas(ctx, p.projectName, p.teamName);
      } catch (e) {
        areaIncerta = true;
        avisar('[Central] não deu pra ler as áreas de ' + p.teamName
          + ' — a consulta passa a valer pro PROJETO INTEIRO, e os números incham com itens de outros times.'
          + ' Motivo: ' + mensagem(e));
      }
      escopos.push({ p, areas });
      const ids = await A.runWiql(ctx, p.projectName, p.teamName, C.wiqlProdutos(areas));
      const crus = ids.length ? await A.getFields(ctx, ids, CAMPOS) : [];
      for (const it of crus) todos.push(Object.assign({ projeto: p.projectName }, it));
    }
    return { todos, escopos, areaIncerta };
  }

  async function buscarPais({ A, ctx, base }) {
    const porId = new Map(base.map((it) => [it.id, it]));
    const tentados = new Set();
    const extras = [];
    for (let volta = 0; volta < NIVEIS_ACIMA; volta++) {
      const faltando = [...new Set([...porId.values()]
        .map((it) => (it.fields || {})['System.Parent'])
        .filter((pai) => pai && !porId.has(pai) && !tentados.has(pai)))];
      if (!faltando.length) break;
      faltando.forEach((id) => tentados.add(id)); // pai sem permissão não volta: não insiste
      let crus = [];
      try { crus = await A.getFields(ctx, faltando, CAMPOS_PAI); } catch (e) { break; }
      if (!crus.length) break;
      for (const it of crus) { porId.set(it.id, it); extras.push(it); }
    }
    return extras;
  }

  /* A MATÉRIA-PRIMA do ritmo: só os ids que estavam em cada sprint hoje e no fim
     dela. Quem está em qual sprint HOJE sai da lista de itens, que já veio, por
     isso não há uma consulta por sprint pra isso. A linha é montada depois
     (`ritmoDe`), porque depende do recorte de responsável. */
  async function buscarRitmo({ A, ctx, escopos, periodo, agora, avisar = avisoPadrao, mensagem = motivo }) {
    if (!periodo || !periodo.length) return [];
    const linhas = [];
    for (const { p, areas } of escopos) {
      let iteracoes = [];
      try {
        iteracoes = await A.teamIterations(ctx, p.projectName, p.teamName);
      } catch (e) {
        /* Sem as iterações o documento perde a seção, não a página. Mas avisa,
           senão "o time não fechou sprint no período" e "a chamada falhou" ficam
           idênticos na tela. */
        avisar('[Central] não deu pra ler as sprints de ' + p.teamName
          + ' — a seção de ritmo sai do documento. Motivo: ' + mensagem(e));
        continue;
      }
      for (const sp of C.sprintsDoPeriodo(iteracoes, periodo)) {
        /* Transbordo só existe em sprint FECHADA, e por isso só ela custa
           consulta. Na corrente ninguém transbordou ainda; na futura nem começou. */
        if (C.estadoDaSprint(sp, agora) !== 'fechada') {
          linhas.push({ sprint: sp, idsAgora: null, idsNoFim: null });
          continue;
        }
        /* As duas pontas saem do MESMO construtor, variando só o instante. Foi o
           que fez o transbordo parar de misturar "saiu da sprint" com "as duas
           consultas perguntavam coisas diferentes" — medido, 141 contra 147. */
        const qAgora = C.wiqlIteracao(sp.path, areas);
        const qNoFim = C.wiqlIteracao(sp.path, areas, Date.parse(sp.finish) + C.FIM_DO_DIA);
        if (!qAgora || !qNoFim) continue;
        try {
          const [idsAgora, idsNoFim] = await Promise.all([
            A.runWiql(ctx, p.projectName, p.teamName, qAgora),
            A.runWiql(ctx, p.projectName, p.teamName, qNoFim),
          ]);
          linhas.push({ sprint: sp, idsAgora, idsNoFim });
        } catch (e) {
          avisar('[Central] não deu pra saber o que transbordou da ' + sp.name
            + ' — a linha dela fica sem essa parte. Motivo: ' + mensagem(e));
          linhas.push({ sprint: sp, idsAgora: null, idsNoFim: null });
        }
      }
    }
    // Ordem crescente mesmo com mais de um time: a seção é série temporal, e
    // concatenar por projeto deixaria setembro de um antes de agosto do outro.
    return linhas.sort((a, b) => Date.parse(a.sprint.finish) - Date.parse(b.sprint.finish));
  }

  /* TUDO o que o documento precisa do DevOps, na ordem certa: itens, pais,
     sustentação fora, e o ritmo das sprints quando o documento pede. É o que o
     report.js faz ao carregar e o que a função da Vercel faz a cada pedido.

     Itens e pais são UM par, devolvidos juntos: atribuir separado fazia o
     documento degradar no meio do refresh. A sustentação sai aqui, uma vez só:
     daqui descem o documento, o placar e o pacote, e filtrar num e esquecer de
     outro é como a capa e o corpo passam a discordar. Os pais entram na leitura
     da cadeia mas NÃO são filtrados. */
  async function buscarTudo({ A, ctx, projetos, comRitmo, periodo, agora, avisar = avisoPadrao, mensagem = motivo }) {
    const busca = await buscarItens({ A, ctx, projetos, avisar, mensagem });
    const pais = await buscarPais({ A, ctx, base: busca.todos });
    const itens = C.foraDaManutencao(busca.todos, busca.todos.concat(pais));
    const sprintsBrutas = comRitmo
      ? await buscarRitmo({ A, ctx, escopos: busca.escopos, periodo, agora, avisar, mensagem })
      : null;
    return { itens, pais, sprintsBrutas, areaIncerta: busca.areaIncerta };
  }

  /* ---------- Montagem ---------- */

  /* A linha pronta, no recorte que o leitor está vendo agora. O instante é o
     MESMO que o documento usa pra tudo; ele decide se a sprint está fechada.

     A linha editorial (resumos.json) entra AQUI, enquanto o item ainda tem `id`
     — o saneador tira o id logo depois, e do outro lado não haveria por onde
     casar. */
  function ritmoDe({ sprintsBrutas, itens, agora, resumos }) {
    const linhas = (sprintsBrutas || []).map((x) =>
      C.ritmoDaSprint(x.sprint, x.idsAgora, x.idsNoFim, itens, agora));
    const r = resumos || {};
    for (const linha of linhas) {
      for (const lista of [linha.itens, linha.transbordados]) {
        for (const it of (lista || [])) {
          const e = r[String(it.id)];
          if (e && e.resumo) it.resumo = e.resumo;
        }
      }
    }
    return linhas;
  }

  /* AS DESCRIÇÕES QUE AINDA PRECISAM DE RESUMO, pro bloco local do arquivo.

     Viajam num bloco com underscore porque ele é LOCAL: o publicar-dados.sh se
     recusa a publicar um arquivo que ainda o tenha. Só entra o que falta: item
     sem resumo, ou com resumo gerado de uma descrição que mudou desde então. */
  function descricoesPendentes({ linhas, todosItens, resumos }) {
    const porId = new Map((todosItens || []).map((it) => [it.id, it]));
    const r = resumos || {};
    const fora = [];
    for (const linha of linhas) {
      for (const lista of [linha.itens, linha.transbordados]) {
        for (const it of (lista || [])) {
          const bruto = porId.get(it.id);
          const texto = C.descricaoLimpa(((bruto || {}).fields || {})['System.Description']);
          if (!texto) continue; // nada pra resumir: o cartão fica com o título
          const e = r[String(it.id)];
          // Sem `de`, a linha foi escrita à mão: não se regera, mesmo se a
          // descrição mudar. Quem escreveu decide quando reescrever.
          if (e && e.resumo && (!e.de || e.de === C.digitalDoTexto(texto))) continue;
          fora.push({ id: it.id, sprint: linha.nome, titulo: it.titulo, descricao: texto });
        }
      }
    }
    return fora;
  }

  /* Vindo do link ou do arquivo, as linhas já estão contadas — e são forjáveis
     como todo o resto do pacote. Texto curto, número inteiro e não negativo.

     `tipo` NÃO viaja: o selo "PBI/Bug/Task" saiu da linha do item. No lugar
     viaja `familia`, o estado reduzido às quatro etapas, em vocabulário fechado
     — fora da lista vira '' e o selo sai sem cor, em vez de virar classe de CSS
     escrita por quem editou a URL. `resumo` é a linha editorial, embutida item
     a item na montagem, porque quem lê não tem como buscá-la. */
  function saneRitmo(lista) {
    const n = (v) => (Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
    const txt = (v, max) => String(v == null ? '' : v).trim().slice(0, max);
    const ESTADOS = ['fechada', 'corrente', 'futura'];
    const FAMILIAS = ['todo', 'andamento', 'atencao', 'feito'];
    const itensDe = (v) => (Array.isArray(v) ? v : []).slice(0, 300).map((y) => ({
      titulo: txt((y || {}).titulo, 200),
      resumo: txt((y || {}).resumo, 240),
      estado: txt((y || {}).estado, 40),
      familia: FAMILIAS.includes((y || {}).familia) ? y.familia : '',
      feito: !!(y || {}).feito,
    })).filter((y) => y.titulo);
    return (Array.isArray(lista) ? lista : []).slice(0, 60).map((x) => ({
      nome: txt((x || {}).nome, 80),
      start: txt((x || {}).start, 40) || null,
      finish: txt((x || {}).finish, 40) || null,
      estado: ESTADOS.includes((x || {}).estado) ? x.estado : '',
      entregues: n((x || {}).entregues),
      total: n((x || {}).total),
      transbordaram: n((x || {}).transbordaram),
      itens: itensDe((x || {}).itens),
      transbordados: itensDe((x || {}).transbordados),
    })).filter((x) => x.nome);
  }

  /* A JANELA DAS ENTREGAS desta edição. Uma função só, usada pelos DOIS
     caminhos (o pacote e a conta ao vivo da tela do PO): se cada um calculasse
     o seu, a tela dele e o documento publicado contariam períodos diferentes —
     exatamente o que o recorte por responsável já teve que consertar uma vez. */
  function recorteDoPeriodo(B, linhas) {
    return (typeof B.janelaPorSprint === 'function' && B.janelaPorSprint())
      ? C.recorteDasSprints(linhas) : null;
  }

  /* OS CARTÕES AUTOMÁTICOS: o mesmo material do bloco `_entregas`, reduzido ao
     que pode ir a público (C.automaticosDoMaterial). Só no documento que
     declara `precisaDeEntregas`.

     `linhas` são as linhas de ritmo que a tela já montou — é delas que sai a
     janela. Sem elas, cai no mês cheio. */
  function automaticos({ B, itens, todos, resumos, linhas }) {
    if (B.precisaDeEntregas !== true || typeof B.entregasConcluidas !== 'function') return [];
    const material = B.entregasConcluidas(itens, todos,
      typeof B.periodoDoDocumento === 'function' ? B.periodoDoDocumento() : [],
      recorteDoPeriodo(B, linhas));
    return C.automaticosDoMaterial(material, resumos || {});
  }

  /* O PACOTE DOS DOCUMENTOS QUE CONTAM (`B.contagensDoLink`) — hoje, o
     relatório de Entregas. É o que vai no arquivo do "Publicar dados", no link
     de leitura e na resposta da função da Vercel.

     `mostrados` são os itens do recorte (o responsável); `todos` inclui os pais,
     que o documento lê pra subir a cadeia; `todosItens` é a lista inteira sem os
     pais, de onde sai a descrição de cada PBI pro bloco de pendências.

     `paraArquivo` liga os blocos LOCAIS (`_descricoes`, `_entregas`): chave que
     começa com `_` é material de trabalho do PO — descrição crua de PBI, com
     link interno e observação escrita achando que era interna. Só vai no
     arquivo baixado, que passa pelo portão do publicar-dados.sh; nunca no link
     nem na resposta da função. */
  function montarEntregas({ B, mostrados, todos, todosItens, sprintsBrutas, resumos,
    roadmap, escopo, mes, agora, paraArquivo }) {
    const cabecalho = {
      v: 1,
      em: agora,
      escopo,
      mes, // quem abrir o link cai no mês que o PO estava vendo
      roadmap, // o recorte da PO viaja resolvido: quem abre não tem arquivo pra consultar
    };
    /* Uma passada só pelo ritmo: as linhas servem ao pacote (saneadas) e à lista
       de pendências (cruas, com id). Duas chamadas dariam duas fotos. */
    const ritmoLinhas = B.precisaDeSprints === true
      ? ritmoDe({ sprintsBrutas, itens: mostrados, agora, resumos }) : [];
    const pendentes = (paraArquivo && B.precisaDeSprints === true)
      ? descricoesPendentes({ linhas: ritmoLinhas, todosItens, resumos }) : [];
    /* O material das entregas do período, UMA vez: dele saem os cartões
       automáticos (sempre) e o bloco local `_entregas` (só na publicação). Só
       no documento que declara `precisaDeEntregas`. */
    /* A JANELA DAS ENTREGAS, quando a edição se alinha às sprints: do começo da
       primeira sprint que fecha no período até o fim da última. Sai das linhas
       de ritmo que acabaram de ser montadas — elas JÁ são as sprints desta
       edição, então não há segunda consulta nem risco de as duas divergirem.
       Sem sprint com data, `recorteDasSprints` devolve null e vale o mês cheio. */
    const recorte = recorteDoPeriodo(B, ritmoLinhas);
    const material = (B.precisaDeEntregas === true && typeof B.entregasConcluidas === 'function')
      ? B.entregasConcluidas(mostrados, todos,
        typeof B.periodoDoDocumento === 'function' ? B.periodoDoDocumento() : [], recorte)
      : null;
    return Object.assign(cabecalho, {
      contagens: B.contagensDoLink(mostrados, todos),
      /* As linhas de sprint viajam CONTADAS — e passam pelo MESMO saneador que
         lê o pacote do outro lado: sem a poda, o nome de cada pessoa do time
         entraria num arquivo publicado à toa. */
      sprints: B.precisaDeSprints === true ? saneRitmo(ritmoLinhas) : undefined,
      /* Os cartões automáticos viajam prontos, no arquivo, no link e na função:
         quem lê não tem os itens do board pra montá-los. Só título, data e
         linha de resumo. */
      automaticos: B.precisaDeEntregas === true
        ? C.automaticosDoMaterial(material, resumos || {}) : undefined,
      /* A JANELA VIAJA JUNTO, e não é recalculada do outro lado: ela descreve o
         recorte que gerou ESTES números. Um pacote montado no mês cheio (a
         edição congelada, ou a função antes deste deploy) chega sem ela, e o
         documento não afirma janela nenhuma — melhor calado que contradizendo
         a própria conta. */
      janela: recorte || undefined,
      _descricoes: (paraArquivo && pendentes && pendentes.length) ? pendentes : undefined,
      _entregas: (paraArquivo && material && material.itens.length) ? material : undefined,
    });
  }

  return {
    CAMPOS, CAMPOS_PAI, NIVEIS_ACIMA,
    buscarItens, buscarPais, buscarRitmo, buscarTudo, recorteDoPeriodo,
    ritmoDe, descricoesPendentes, saneRitmo, automaticos, montarEntregas,
  };
});
