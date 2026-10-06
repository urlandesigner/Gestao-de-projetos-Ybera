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

# O nome é declarado pelo DOCUMENTO (arquivoDeDados, em
# assets/briefing-entregas-v2.js) e lido daqui, não repetido: duas cópias do
# mesmo nome divergem na primeira vez que a edição virar outro mês.
DESTINO=$(grep -o "ARQUIVO_DE_DADOS = '[^']*'" assets/briefing-entregas-v2.js \
  | head -1 | sed "s/.*'\(.*\)'/\1/")
[ -n "$DESTINO" ] || { echo "não achei ARQUIVO_DE_DADOS em assets/briefing-entregas-v2.js" >&2; exit 1; }
NOME=$(basename "$DESTINO")

ORIGEM="${1:-$HOME/Downloads/$NOME}"
[ -f "$ORIGEM" ] || {
  echo "não achei $ORIGEM" >&2
  echo "abra o relatório com ?po=1 e clique em \"Publicar dados\" — ele baixa $NOME" >&2
  exit 1
}

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
