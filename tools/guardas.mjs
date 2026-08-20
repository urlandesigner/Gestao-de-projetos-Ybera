/* As guardas que impedem uma rodada ruim de virar uma página ruim, e o
   relatório que diz o que precisa de decisão humana. Puro, sem I/O. */

const PISO = 0.8;

/* Um WIQL que não acha nada é indistinguível de uma área renomeada no DevOps.
   Sem esta guarda, uma rodada agendada apagaria os projetos da página no ar —
   e o erro só apareceria quando alguém abrisse o link.

   `forcavel` existe porque nem toda recusa é a mesma coisa: a queda abrupta
   pode ser real (projeto encerrou uma leva de Epics de verdade) e por isso
   aceita --forcar; zero é sempre indistinguível de área renomeada — não há
   "zero real" que alguém precise publicar — então --forcar nunca se aplica
   a este caso, e quem chama (sync.mjs) não deveria ter que redescobrir essa
   distinção sozinho. */
export function guardaEsvaziamento(qtdNova, qtdAntiga){
  if(!qtdNova) {
    return {
      ok:false,
      forcavel:false,
      motivo:'A consulta não devolveu nenhum Epic. Nada foi gravado.'
    };
  }
  if(qtdAntiga && qtdNova < qtdAntiga * PISO){
    return {
      ok:false,
      forcavel:true,
      motivo:`A consulta devolveu ${qtdNova} Epics, contra ${qtdAntiga} da rodada anterior ` +
             `(abaixo do piso de ${Math.round(PISO * 100)}%). Nada foi gravado — confira se uma área ` +
             `foi renomeada no DevOps ou rode com --forcar se a queda é real.`
    };
  }
  return { ok:true, forcavel:false, motivo:null };
}

/* JSON.stringify é o que garante escape correto: título do DevOps vem com
   aspas no texto e com "\" nas Area Paths. Montar a string à mão aqui já
   produziu arquivo inválido em outros projetos. */
export function serializarFatos(geradoEm, itens){
  const corpo = JSON.stringify({ geradoEm, epics: itens }, null, 2);
  return `/* GERADO POR tools/sync.mjs — NÃO EDITE À MÃO.
   Fatos vindos do Azure DevOps. Todo texto editorial (título legível, why,
   about, result, healthNote) vive em prosa.js, indexado pelo mesmo id.
   Para regerar:  ADO_PAT=xxx node tools/sync.mjs
   Gerado em: ${geradoEm} */
const RADAR_FATOS = ${corpo};
`;
}

const MARCADOR = 'const RADAR_FATOS = ';

/* Faz o caminho inverso de serializarFatos. Ancorado no marcador que ela
   emite, não no primeiro "{" do arquivo: o comentário de cabeçalho hoje não
   tem chaves, mas nada impede alguém de colar ali um exemplo de JSON amanhã
   — e cortar pelo primeiro "{" pegaria o trecho errado, JSON.parse
   estouraria, e o catch de quem chama faria toda rodada seguinte parecer a
   primeira, desligando a guarda de queda em silêncio. */
export function parsearFatos(texto){
  const i = texto.indexOf(MARCADOR);
  if(i === -1) throw new Error(`Marcador "${MARCADOR}" não encontrado no arquivo.`);
  const resto = texto.slice(i + MARCADOR.length);
  const fim = resto.lastIndexOf('}');
  return JSON.parse(resto.slice(0, fim + 1));
}

/* Separado do orquestrador para poder testar direto: é isto que faz um
   estado ou uma área fora do mapa aparecer no relatório em vez de virar
   "planned" (ou sumir) sem ninguém perceber. */
export function coletarPendencias(itens){
  const lista = itens || [];
  const semStatus = lista.filter(i => i.status === null)
    .concat(lista.flatMap(i => (i.demands || []).filter(d => d.status === null)));
  const semTrack = lista.filter(i => i.track === null);
  return { semStatus, semTrack };
}

function bloco(titulo, linhas){
  return linhas.length ? `\n${titulo}\n` + linhas.map(l => '  ' + l).join('\n') : '';
}

export function relatorio({ itens, orfas, semStatus, semTrack, mudancas }){
  const nDem = itens.reduce((s, i) => s + ((i.demands || []).length), 0);
  let txt = `${itens.length} ${itens.length === 1 ? 'Epic' : 'Epics'}, ${nDem} demandas.`;

  txt += bloco('Estados não mapeados (mapeie em tools/config.json):',
    [...new Set(semStatus.map(i => i.estadoCru))].map(e =>
      `"${e}" — ${semStatus.filter(i => i.estadoCru === e).length} itens`));

  txt += bloco('Sem produto (área fora da tabela de tools/config.json):',
    semTrack.map(i => `#${i.id} ${i.azureTitle}`));

  txt += bloco('Features órfãs (sem pai, ou com pai fora do filtro):',
    orfas.map(w => `#${w.id} ${(w.fields || {})['System.Title'] || ''}`));

  txt += bloco('Mudou desde a última rodada:', mudancas.map(m => {
    if(m.tipo === 'novo') return `+ #${m.id} ${m.titulo}`;
    if(m.tipo === 'saiu') return `- #${m.id} ${m.titulo}`;
    return `~ #${m.id} ${m.titulo}: ${m.tipo} ${m.de} → ${m.para}`;
  }));

  return txt;
}
