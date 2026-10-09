#!/bin/bash
# Publica os dados do relatório de acompanhamento: pega o .json que o botão
# "Publicar dados" baixou, põe no lugar e manda pro ar.
#
# Existe porque o navegador não escreve no repositório. O botão entrega o
# arquivo já com o nome certo em ~/Downloads; o resto do caminho — mover,
# conferir, sincronizar — era digitado à mão a cada publicação, e publicação
# que depende de memória é publicação que um dia sai errada ou não sai.
#
# O que ele NÃO faz: commitar e empurrar. Isso continua sendo decisão sua, com
# o git status na frente — é um site público, e a varredura de segredos roda
# antes (ver scripts/sincronizar-pages.sh).
#
# Uso:  ./scripts/publicar-dados.sh [caminho-do-json]
#       sem argumento, procura o arquivo esperado em ~/Downloads
set -euo pipefail
cd "$(dirname "$0")/.."

# Cada EDIÇÃO declara o endereço dos dados dela (arquivoDeDados, nos módulos de
# briefing) e o nome é lido daqui, nunca repetido: duas cópias divergem na
# primeira vez que uma edição virar outro mês.
DESTINOS=$(grep -ho "arquivoDeDados = '[^']*'\|ARQUIVO_DE_DADOS = '[^']*'" \
  assets/briefing-entregas.js assets/briefing-entregas-v2.js \
  | sed "s/.*'\(.*\)'/\1/")
[ -n "$DESTINOS" ] || { echo "nenhuma edição declara arquivoDeDados" >&2; exit 1; }

# Com um argumento, publica aquele arquivo na edição a que o NOME dele pertence.
# Sem argumento, pega o que estiver em Downloads — e se houver mais de um, para:
# publicar a edição errada sobrescreve um relatório já compartilhado.
ORIGEM=""
DESTINO=""
for d in $DESTINOS; do
  candidato="${1:-$HOME/Downloads/$(basename "$d")}"
  [ "$(basename "$candidato")" = "$(basename "$d")" ] || continue
  [ -f "$candidato" ] || continue
  [ -z "$ORIGEM" ] || { echo "achei mais de um arquivo pra publicar; passe um por vez:" >&2;
    echo "  $ORIGEM" >&2; echo "  $candidato" >&2; exit 1; }
  ORIGEM="$candidato"; DESTINO="$d"
done
[ -n "$ORIGEM" ] || {
  echo "não achei nenhum arquivo de dados pra publicar." >&2
  echo "abra o relatório com ?po=1 e clique em \"Publicar dados\". Os nomes esperados:" >&2
  for d in $DESTINOS; do echo "  ~/Downloads/$(basename "$d")" >&2; done
  exit 1
}
echo "edição: $DESTINO"

# Conferir ANTES de sobrescrever: um arquivo cortado pela metade substituindo um
# bom deixaria o documento no ar dizendo "ainda não foi publicado". O `em` é o
# instante da publicação — sem ele o pacote não é deste documento.
python3 - "$ORIGEM" <<'PY'
import json, sys
try:
    with open(sys.argv[1], encoding='utf-8') as f:
        p = json.load(f)
except Exception as e:
    sys.exit(f'o arquivo não é JSON válido: {e}')
if not isinstance(p, dict) or 'em' not in p:
    sys.exit('o JSON não parece um pacote deste relatório (falta "em")')

# O PORTÃO DO MATERIAL LOCAL, e o sublinhado é o contrato: chave que começa com
# `_` é material de trabalho do PO. Dentro dela vai descrição crua de PBI, que
# tem link interno, nome de fornecedor e observação escrita achando que era
# interna — e este arquivo vai pra um site PÚBLICO e indexável.
#
# Parar aqui, e não avisar, é o ponto: aviso num script depende de alguém ler.
#
# Por PREFIXO e não por lista de nomes: hoje são dois blocos (`_descricoes`, com
# as PBIs sem linha de resumo, e `_entregas`, com o material pra escrever os
# cartões), e a lista ficaria velha no dia em que alguém criasse o terceiro e
# esquecesse de atualizá-la aqui. Esse esquecimento sai publicado em silêncio.
locais = sorted(k for k in p if k.startswith('_'))
if locais:
    print('o pacote ainda traz material local, que NÃO pode ir pro ar: '
          + ', '.join(locais), file=sys.stderr)
    print('peça ao Claude Code: "gera os resumos" — ele lê o arquivo em Downloads,',
          file=sys.stderr)
    print('escreve o que tem que escrever e limpa os blocos. Depois rode isto de novo.',
          file=sys.stderr)
    sys.exit(1)

n = len(p.get('sprints') or [])
print(f'  pacote de {p["em"]}, {n} sprint(s)')
PY

mv "$ORIGEM" "$DESTINO"
echo "no lugar: $DESTINO"
echo

./scripts/sincronizar-pages.sh

echo
echo "agora, na pasta do Pages: conferir o git status, rodar a varredura de"
echo "segredos, commitar e empurrar. O endereço do documento não muda."
