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
#
# Duas formas de declarar, as duas lidas: `arquivoDeDados = '...'` (o documento
# de uma edição só) e `arquivoDeDados: '...'` (cada edição dentro de EDICOES,
# no relatório único). `sort -u` porque a mesma edição pode estar declarada nos
# dois — agosto/setembro está no relatório único e na página dos links antigos
# —, e o mesmo destino listado duas vezes faria o script parar achando que
# havia dois arquivos pra publicar.
DESTINOS=$(grep -ho "arquivoDeDados = '[^']*'\|arquivoDeDados: '[^']*'" \
  assets/briefing-entregas.js assets/briefing-entregas-v2.js \
  | sed "s/.*'\(.*\)'/\1/" | sort -u)
[ -n "$DESTINOS" ] || { echo "nenhuma edição declara arquivoDeDados" >&2; exit 1; }

# Com um argumento, publica aquele arquivo na edição a que o NOME dele pertence.
# Sem argumento, pega o que estiver em Downloads — e se houver mais de um, para:
# publicar a edição errada sobrescreve um relatório já compartilhado.
# CADA PO TEM O SEU ARQUIVO: `dados-outubro.json` é o do dono histórico, e os
# das outras saem com sufixo — `dados-outubro-isadora.json`. Desde que o pacote
# passou a levar o recorte da pessoa (14/10/2026), publicar o arquivo de uma no
# lugar do da outra apaga um documento que já está no ar.
ORIGEM=""
DESTINO=""
for d in $DESTINOS; do
  base=$(basename "$d" .json)
  dir=$(dirname "$d")
  # com argumento, só o nome dele; sem, varre o do dono e os com sufixo
  if [ -n "${1:-}" ]; then candidatos="$1"; else
    candidatos="$HOME/Downloads/$base.json"
    for extra in "$HOME/Downloads/$base"-*.json; do [ -f "$extra" ] && candidatos="$candidatos
$extra"; done
  fi
  while IFS= read -r candidato; do
    [ -n "$candidato" ] || continue
    nome=$(basename "$candidato" .json)
    case "$nome" in "$base"|"$base"-*) ;; *) continue ;; esac
    [ -f "$candidato" ] || continue
    [ -z "$ORIGEM" ] || { echo "achei mais de um arquivo pra publicar; passe um por vez:" >&2;
      echo "  $ORIGEM" >&2; echo "  $candidato" >&2; exit 1; }
    ORIGEM="$candidato"; DESTINO="$dir/$nome.json"
  done <<EOF
$candidatos
EOF
done
# OS MESES NOVOS, PELO PADRÃO. Desde 14/10/2026 a lista de edições se monta
# pela data (briefing-entregas-v2.js), e o nome do arquivo de cada mês segue
# `dados-AAAA-MM.json` (e `dados-AAAA-MM-<po>.json` para as outras POs) — ele
# não está escrito em lugar nenhum pra o grep acima achar. Os nomes antigos
# (outubro, ago-set) continuam vindo de lá.
PADRAO='^dados-20[0-9]{2}-(0[1-9]|1[0-2])(-[a-z]+)?$'
if [ -n "${1:-}" ]; then candidatos="$1"; else
  candidatos=$(ls "$HOME"/Downloads/dados-20*.json 2>/dev/null || true)
fi
while IFS= read -r candidato; do
  [ -n "$candidato" ] || continue
  nome=$(basename "$candidato" .json)
  echo "$nome" | grep -Eq "$PADRAO" || continue
  [ -f "$candidato" ] || continue
  [ -z "$ORIGEM" ] || { echo "achei mais de um arquivo pra publicar; passe um por vez:" >&2;
    echo "  $ORIGEM" >&2; echo "  $candidato" >&2; exit 1; }
  ORIGEM="$candidato"; DESTINO="assets/$nome.json"
done <<LISTA
$candidatos
LISTA

[ -n "$ORIGEM" ] || {
  echo "não achei nenhum arquivo de dados pra publicar." >&2
  echo "abra o relatório com ?po=1 e clique em \"Publicar dados\". Os nomes esperados:" >&2
  for d in $DESTINOS; do echo "  ~/Downloads/$(basename "$d")" >&2; done
  echo "  ~/Downloads/dados-AAAA-MM.json  (meses a partir de novembro de 2026)" >&2
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
