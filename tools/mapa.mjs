/* Mapeamento puro: work item do DevOps → item do Radar. Sem I/O, sem DOM.

   Todo nome que vem do processo do time — estado, produto — é CONFIGURAÇÃO e
   entra por parâmetro. Os estados de vocês são customizados e em português
   ("Aguardando Início", "Em Andamento", "Em Teste"), então um mapa fixo aqui
   envelheceria na primeira mudança de processo, num arquivo que ninguém
   lembraria de abrir.

   O item do Radar é a Feature, não o Epic. Uma rodada de descoberta contra a
   org real (nivello/B2C, ver tools/descobrir.mjs --arvore) mostrou a
   hierarquia invertida em relação ao que o plano original assumiu: o Epic é
   o PRODUTO ("Loja Clube USA") e a Feature é o PROJETO que o Radar mostra
   ("[EUA] Nova Home"). Por isso o produto de um item agora vem do Epic pai
   (System.Parent), consultado em tools/config.json → produtos — nunca mais
   da Area Path. */

/* "2026-08-14T12:00:00Z" → "2026-08" */
export function mesDe(iso){
  if(!iso || typeof iso !== 'string') return null;
  const m = iso.match(/^(\d{4})-(0[1-9]|1[0-2])/);
  return m ? `${m[1]}-${m[2]}` : null;
}

/* "2026-08-14T12:00:00Z" → "2026-08-14" — o Radar só usa o dia. */
export function diaDe(iso){
  if(!iso || typeof iso !== 'string') return null;
  const m = iso.match(/^(\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01]))/);
  return m ? m[1] : null;
}

/* Três resultados possíveis, não dois: MAPEADO ('done'|'doing'|'next'),
   EXCLUÍDO ('excluido') e DESCONHECIDO (null). Antes desta mudança só havia
   "mapeado ou null", e null cobria dois casos bem diferentes — estado que
   falta cadastrar (alerta de configuração) e estado que representa descarte
   deliberado (Removed: 62 Features canceladas que não devem aparecer no
   Radar de forma nenhuma). Misturar os dois faria o relatório cobrar
   preenchimento de tools/config.json para uma coisa que já está correta —
   Removed não é lacuna, é decisão.

   O terceiro resultado sai como a mesma string sentinela que os outros dois
   ('excluido', comparável com "==="), não como um objeto {tipo, valor}: é o
   padrão que o resto deste arquivo já usa (healthDe também devolve uma
   string ou null), e um objeto obrigaria itemDe, coletarPendencias e todo
   teste existente a trocar comparação direta por acesso a campo, para um
   ganho que a string sentinela já entrega. A checagem de exclusão vem antes
   da checagem no mapa de propósito: um estado nunca deveria estar nas duas
   listas ao mesmo tempo, mas se algum dia estiver, exclusão deliberada tem
   de vencer. */
export function statusDe(estado, mapaEstados, estadosExcluidos){
  if(!estado) return null;
  if((estadosExcluidos || []).includes(estado)) return 'excluido';
  const v = (mapaEstados || {})[estado];
  return v === 'done' || v === 'doing' || v === 'next' ? v : null;
}

/* Impedimento é sinal de saúde, não etapa do fluxo. O "watch" ("em atenção")
   continua editorial: não há sinal equivalente no DevOps, e inferir atenção a
   partir de atraso de data deixaria o alerta aceso o tempo todo — que é
   exatamente o que o Radar evita. */
export function healthDe(estado){
  if(!estado) return null;
  return /impediment|impedimento/i.test(estado) ? 'blocked' : null;
}

/* Casa por id exato — troca o antigo casamento por prefixo de Area Path
   ("Ecommerce USA\Loja Clube\..."), que era frágil: bastava alguém
   reorganizar ou renomear um nó da árvore de áreas no DevOps (coisa que já
   aconteceu) para o produto de itens inteiros sumir em silêncio. Id de Epic
   não se reorganiza.

   As chaves de `produtos` em tools/config.json são strings — é assim que
   todo JSON grava chave de objeto — mas o System.Parent que a API do DevOps
   devolve é number. Sem o String() abaixo, `produtos['49290']` nunca bateria
   com `paiId === 49290`, e todo item perderia o produto silenciosamente por
   causa de um detalhe de tipo, não por Epic de fato não cadastrado. Pai
   ausente (Feature sem System.Parent) ou id sem entrada na tabela devolvem
   null; quem chama decide o que fazer com isso (ver epicsSemProduto e
   coletarPendencias, em guardas.mjs). */
export function trackDoPai(paiId, produtos){
  if(paiId === undefined || paiId === null) return null;
  const v = (produtos || {})[String(paiId)];
  return typeof v === 'string' ? v : null;
}

/* Agrupa Features por Epic pai (System.Parent), sem julgar se aquele pai é
   um produto cadastrado — essa decisão saiu desta função porque agora
   depende de tools/config.json (produtos), um dado de configuração que esta
   função não recebe mais (antes recebia `idsDeEpics`, vindo de uma consulta
   à API que deixou de existir: a rodada agora consulta só Feature, nunca
   Epic). Quem chama (sync.mjs) decide o destino de cada grupo: os que caem
   em `produtos` viram itens do Radar; os que não caem alimentam a guarda de
   "Epic sem produto cadastrado" (guardas.mjs) — ali dá para cobrar o
   cadastro com id, título e quantidade, coisa que esta função não tem como
   fazer sozinha, pois não sabe título de Epic (não busca nada, é pura).
   Feature sem pai nenhum vai para `semPai`: não há id de Epic para cobrar,
   então essa lista só serve para o relatório contar quantas ficaram assim. */
export function agruparPorPai(features){
  const porPai = new Map();
  const semPai = [];
  for(const w of (features || [])){
    const pai = (w.fields || {})['System.Parent'];
    if(pai === undefined || pai === null){ semPai.push(w); continue; }
    if(!porPai.has(pai)) porPai.set(pai, []);
    porPai.get(pai).push(w);
  }
  return { porPai, semPai };
}

/* `estadoCru` viaja junto do `status` porque o relatório precisa dizer QUAL
   estado não estava mapeado — sem ele a mensagem seria "3 itens sem status",
   que não ajuda ninguém.

   `feature` aqui é sempre uma Feature do DevOps, não um Epic — é ela que o
   Radar mostra como projeto. Quem chama só deve invocar esta função para
   Features cujo pai já bateu contra `cfg.produtos`; itemDe não filtra nada
   disso sozinha, ela só monta o item a partir do work item que recebeu. */
export function itemDe(feature, cfg){
  const f = feature.fields || {};
  const estado = f['System.State'] || null;
  const dono = f['System.AssignedTo'];
  const pai = f['System.Parent'];
  return {
    id: feature.id,
    azureTitle: f['System.Title'] || '',
    track: trackDoPai(pai, cfg.produtos),
    start: diaDe(f['Microsoft.VSTS.Scheduling.StartDate']),
    end: diaDe(f['Microsoft.VSTS.Scheduling.TargetDate']),
    status: statusDe(estado, cfg.estados, cfg.estadosExcluidos),
    estadoCru: estado,
    health: healthDe(estado),
    shipped: mesDe(f['Microsoft.VSTS.Common.ClosedDate']),
    owner: (dono && dono.displayName) || null,
    /* Sempre vazio, de propósito: o data.js original (antes desta ferramenta
       existir) nunca teve um terceiro nível de hierarquia, e descer da
       Feature para buscar as filhas dela seria escopo que ninguém pediu
       nesta mudança — que já é, sozinha, uma inversão de nível. Não é
       esquecimento: se demandas voltarem a fazer sentido, é decisão nova, com
       consulta e mapeamento próprios. */
    demands: []
  };
}

/* O que mudou entre duas rodadas. É isto que substitui o olhar humano no
   `git diff` quando a rodada passar a ser agendada. */
export function diffRodadas(antes, depois){
  const idx = new Map((antes || []).map(i => [i.id, i]));
  const mudou = [];
  for(const d of (depois || [])){
    const a = idx.get(d.id);
    if(!a){ mudou.push({ id: d.id, tipo: 'novo', titulo: d.azureTitle }); continue; }
    if(a.status !== d.status) mudou.push({ id: d.id, tipo: 'status', de: a.status, para: d.status, titulo: d.azureTitle });
    if(a.end !== d.end) mudou.push({ id: d.id, tipo: 'janela', de: a.end, para: d.end, titulo: d.azureTitle });
    if(a.shipped !== d.shipped) mudou.push({ id: d.id, tipo: 'entrega', de: a.shipped, para: d.shipped, titulo: d.azureTitle });
  }
  const idsDepois = new Set((depois || []).map(i => i.id));
  for(const a of (antes || [])){
    if(!idsDepois.has(a.id)) mudou.push({ id: a.id, tipo: 'saiu', titulo: a.azureTitle });
  }
  return mudou;
}
