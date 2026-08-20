/* Mapeamento puro: work item do DevOps → item do Radar. Sem I/O, sem DOM.

   Todo nome que vem do processo do time — estado, área — é CONFIGURAÇÃO e
   entra por parâmetro. Os estados de vocês são customizados e em português
   ("Aguardando Início", "Em Andamento", "Em Teste"), então um mapa fixo aqui
   envelheceria na primeira mudança de processo, num arquivo que ninguém
   lembraria de abrir. */

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

/* Estado fora do mapa devolve null de propósito: quem chama registra no
   relatório. Cair em "next" por padrão esconderia mudança de processo
   justamente de quem precisa saber dela. */
export function statusDe(estado, mapaEstados){
  if(!estado) return null;
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

/* Casa por prefixo e prefere a chave mais específica, para
   "Ecommerce USA\Loja Clube\Checkout" poder ter produto próprio sem deixar
   de existir dentro de "Loja Clube". Área fora da tabela devolve null: o item
   aparece num grupo "sem produto" e é cobrado no relatório, em vez de
   desaparecer. */
export function trackDe(areaPath, tabelaAreas){
  if(!areaPath) return null;
  const chaves = Object.keys(tabelaAreas || {}).sort((a, b) => b.length - a.length);
  for(const k of chaves){
    if(areaPath === k || areaPath.startsWith(k + '\\')) return tabelaAreas[k];
  }
  return null;
}

/* Feature sem pai, ou com pai fora da lista de Epics, não é descartada em
   silêncio: volta em `orfas` para o relatório. */
export function agruparPorPai(features, idsDeEpics){
  const set = new Set(idsDeEpics);
  const porPai = new Map();
  const orfas = [];
  for(const w of (features || [])){
    const pai = (w.fields || {})['System.Parent'];
    if(pai && set.has(pai)){
      if(!porPai.has(pai)) porPai.set(pai, []);
      porPai.get(pai).push(w);
    } else {
      orfas.push(w);
    }
  }
  return { porPai, orfas };
}

function demandaDe(w, cfg){
  const g = w.fields || {};
  const estado = g['System.State'] || null;
  return {
    id: w.id,
    t: g['System.Title'] || '',
    status: statusDe(estado, cfg.estados),
    estadoCru: estado,
    due: diaDe(g['Microsoft.VSTS.Scheduling.TargetDate']),
    done: mesDe(g['Microsoft.VSTS.Common.ClosedDate'])
  };
}

/* `estadoCru` viaja junto do `status` porque o relatório precisa dizer QUAL
   estado não estava mapeado — sem ele a mensagem seria "3 itens sem status",
   que não ajuda ninguém. */
export function itemDe(epic, features, cfg){
  const f = epic.fields || {};
  const estado = f['System.State'] || null;
  const dono = f['System.AssignedTo'];
  return {
    id: epic.id,
    azureTitle: f['System.Title'] || '',
    track: trackDe(f['System.AreaPath'], cfg.areas),
    start: diaDe(f['Microsoft.VSTS.Scheduling.StartDate']),
    end: diaDe(f['Microsoft.VSTS.Scheduling.TargetDate']),
    status: statusDe(estado, cfg.estados),
    estadoCru: estado,
    health: healthDe(estado),
    shipped: mesDe(f['Microsoft.VSTS.Common.ClosedDate']),
    owner: (dono && dono.displayName) || null,
    demands: (features || []).map(w => demandaDe(w, cfg))
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
