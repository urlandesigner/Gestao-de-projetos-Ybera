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

/* Todo item sem status mapeado não é queda de dado — é tools/config.json com
   "estados" ainda vazio (ferramenta desconfigurada, não realidade do
   DevOps). Gravar assim esvaziaria as três colunas do board na página no
   ar: cada item cai fora de "done"/"doing"/"next" ao mesmo tempo. Diferente
   da guarda de esvaziamento, esta nunca aceita --forcar — não existe um
   "config vazio real" que alguém precise publicar, só falta preencher o
   mapa. Alguns itens sem status (um estado novo, ainda não mapeado) seguem
   passando normalmente: é só o caso em que NENHUM item tem status que
   indica que o mapa inteiro está por preencher. */
export function guardaStatusVazio(itens){
  const lista = itens || [];
  if(lista.length && lista.every(i => i.status === null)){
    return {
      ok:false,
      motivo:`Nenhum dos ${lista.length} Epics tem status mapeado — tools/config.json ` +
             'provavelmente tem "estados" vazio. Rode "node tools/descobrir.mjs", preencha o mapa ' +
             'e rode de novo. Nada foi gravado.'
    };
  }
  return { ok:true, motivo:null };
}

/* Consome o que guardaEsvaziamento decidiu e diz a sync.mjs o que fazer com
   isso: gravar, avisar, recusar ou não gravar por causa de --dry-run. É
   exatamente a combinação de `guarda.ok`/`guarda.forcavel`/`--forcar`/
   `--dry-run` que já produziu um bug real (--forcar sobrescrevendo a recusa
   de zero Epics sobre a página publicada) — isolar a decisão aqui em vez de
   deixá-la espalhada no orquestrador permite testar as quatro saídas sem
   precisar simular I/O.

   Avisos vêm como {stream, texto} para que sync.mjs saiba se cada mensagem
   vai para stdout (informacional/confirmação) ou stderr (aviso/atenção). */
export function decidirGravacao(guarda, { forcar, seco }){
  const avisos = [];

  if(!guarda.ok){
    /* Mesma regra de sempre: zero Epics nunca é forçável, então --forcar só
       vence quando a recusa admite isso (forcavel) E o flag foi de fato
       passado. Qualquer outra combinação cai na recusa. */
    if(!forcar || !guarda.forcavel){
      const erro = '\n' + guarda.motivo + (forcar ? '\n--forcar não pode contornar isto.' : '');
      return { deveGravar:false, avisos, erro, saida:1 };
    }
    avisos.push(seco
      ? { stream:'out', texto:'\n--forcar contornaria a guarda, mas --dry-run não grava nada: ' + guarda.motivo }
      : { stream:'err', texto:'\n--forcar: gravando apesar de ' + guarda.motivo });
  }

  if(seco){
    avisos.push({ stream:'out', texto:'\n--dry-run: nada gravado.' });
    return { deveGravar:false, avisos, erro:null, saida:0 };
  }

  return { deveGravar:true, avisos, erro:null, saida:null };
}

/* Único lugar onde o literal "const RADAR_FATOS = " é escrito no código.
   serializarFatos o interpola no arquivo que grava; parsearFatos o usa para
   achar onde o JSON começa. Antes das duas funções concordarem por
   construção, esta string vivia duplicada (uma vez no template de
   serializarFatos, outra no MARCADOR de parsearFatos) — bastava uma mudar
   sem a outra para o parser parar de achar o arquivo que o próprio script
   acabou de gravar. */
const MARCADOR = 'const RADAR_FATOS = ';

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
${MARCADOR}${corpo};
`;
}

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

/* Um fatos.js anterior ILEGÍVEL não é a mesma coisa que AUSENTE. ENOENT é
   primeira rodada de verdade — não há o que comparar, e só a regra do zero
   vale. Qualquer outro erro (permissão, JSON inválido, marcador ausente, ou
   JSON válido mas sem `epics`) significa que EXISTE uma rodada anterior que
   a guarda de esvaziamento não conseguiu ler — e tratar isso como primeira
   rodada desligaria a guarda bem no momento em que ela mais importa: um
   fatos.js corrompido por edição manual deixaria 1 Epic novo sobrescrever
   os 14 publicados, sem nenhum aviso. Por isso este caso PARA a rodada em
   vez de silenciosamente virar `null`, como o `catch { return null }` de
   antes fazia para qualquer erro, ENOENT ou não. */
export function guardaLeituraAnterior(erro, dados){
  if(erro){
    if(erro.code === 'ENOENT') return { ok:true, ausente:true, motivo:null };
    return {
      ok:false,
      ausente:false,
      motivo:'Não foi possível ler nem interpretar o fatos.js anterior: ' + erro.message +
             '. A guarda de esvaziamento não tem contra o que comparar — corrija ou remova o ' +
             'arquivo antes de rodar de novo.'
    };
  }
  if(!dados || typeof dados !== 'object' || !Array.isArray(dados.epics)){
    return {
      ok:false,
      ausente:false,
      motivo:'O fatos.js anterior não tem a forma esperada ({geradoEm, epics:[...]}) — corrija ou ' +
             'remova o arquivo antes de rodar de novo.'
    };
  }
  return { ok:true, ausente:false, motivo:null };
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
