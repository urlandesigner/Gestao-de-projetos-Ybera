#!/bin/bash
# Copia este projeto para a pasta que o GitHub Pages serve, em
# Nivello-Sistemas/ideias-e-inovacao/Central de Projetos/.
#
# Existe porque a lista de exclusões vinha sendo digitada à mão a cada
# publicação, e uma delas não pode falhar nunca: diagnostico.html lê o PAT do
# localStorage. Num site PÚBLICO ele não expõe o token de ninguém — o token
# mora no navegador de cada um — mas é ferramenta interna e não tem o que fazer
# lá. Regra que depende de memória é regra que um dia falha.
#
# NÃO commita nem empurra: só espelha os arquivos. Conferir com `git status` na
# pasta de destino antes de publicar, e rodar a varredura de segredos:
#   python3 scripts/novo-projeto.py segredos "Central de Projetos"
#
# Uso:  ./scripts/sincronizar-pages.sh [--conferir] [--com-estudos]
#       --conferir mostra o que mudaria, sem escrever nada.
#       --com-estudos publica também as páginas de estudo (ver ESTUDOS).
set -euo pipefail

ORIGEM="$(cd "$(dirname "$0")/.." && pwd)"
DESTINO="${DESTINO_PAGES:-$HOME/ProjetosYbera/ideias-e-inovacao/Central de Projetos}"

[ -d "$DESTINO" ] || { echo "destino não existe: $DESTINO" >&2; exit 1; }

# String e não array de propósito: o bash do macOS é o 3.2, onde expandir um
# array VAZIO sob `set -u` aborta o script ("SECO[@]: unbound variable"). O
# --dry-run não tem espaço, então o word-splitting de $SECO sem aspas dá
# exatamente zero ou um argumento. Foi um defeito real: a conferência passava
# (array com um item) e a publicação de verdade morria na linha do rsync.
SECO=""
COM_ESTUDOS=""
for arg in "$@"; do
  case "$arg" in
    --conferir) SECO="--dry-run" ;;
    --com-estudos) COM_ESTUDOS="sim" ;;
    *) echo "argumento desconhecido: $arg" >&2; exit 1 ;;
  esac
done

# ESTUDOS: páginas que existem pra experimentar e NÃO vão pra produção, a não
# ser que o Urlan peça (`--com-estudos`). O Report v2 é o primeiro: estudo de
# outra forma do report, decisão dele em 14/10/2026. Vão junto os arquivos que
# só ele usa — publicar a página sem eles, ou eles sem a página, deixaria peça
# solta no ar.
#
# Excluir do rsync NÃO basta: com --delete, o rsync protege o que está excluído
# e nunca o apaga do destino. Então, sem a opção, o estudo é removido de lá
# explicitamente logo depois — é isso que faz "só sobe quando eu pedir" valer
# também para o que já tinha subido antes.
ESTUDOS="report-v2.html assets/briefing-v2.js assets/report-v2.css"
EXCLUI_ESTUDOS=""
if [ -z "$COM_ESTUDOS" ]; then
  for e in $ESTUDOS; do EXCLUI_ESTUDOS="$EXCLUI_ESTUDOS --exclude=/$e"; done
fi

# api/ é a função da Vercel (relatório ao vivo): no Pages ela não roda — o
# Pages só serve arquivo —, e o relatório de lá chama a da Vercel.
# README.md é do repositório de destino, não daqui — nunca sobrescrever.
# publicar.command e scripts/ são ferramenta de quem mantém, não do site.
# As caixas de entrada de captura (mês/) já são git-ignored, e ficam fora aqui
# também porque o rsync não lê .gitignore.
rsync -a --delete --itemize-changes $SECO \
  --exclude='.git/' \
  --exclude='.claude/' \
  --exclude='.superpowers/' \
  --exclude='.DS_Store' \
  --exclude='/setembro/' --exclude='/outubro/' \
  --exclude='/novembro/' --exclude='/dezembro/' \
  --exclude='/.gitignore' \
  --exclude='/publicar.command' \
  --exclude='/scripts/' \
  --exclude='/diagnostico.html' \
  --exclude='/api/' \
  --exclude='/README.md' \
  $EXCLUI_ESTUDOS \
  "$ORIGEM/" "$DESTINO/"

if [ -z "$COM_ESTUDOS" ]; then
  for e in $ESTUDOS; do
    [ -e "$DESTINO/$e" ] || continue
    if [ -n "$SECO" ]; then echo "*deleting   $e  (estudo: fica só no local)"
    else rm -f "$DESTINO/$e" && echo "*deleting   $e  (estudo: fica só no local)"; fi
  done
fi

echo
if [ -n "$SECO" ]; then
  echo "(conferência: nada foi escrito)"
else
  echo "espelhado em: $DESTINO"
  echo "agora: conferir o git status lá, rodar a varredura de segredos, commitar e empurrar."
fi
