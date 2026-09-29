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
# Uso:  ./scripts/sincronizar-pages.sh [--conferir]
#       --conferir mostra o que mudaria, sem escrever nada.
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
[ "${1:-}" = "--conferir" ] && SECO="--dry-run"

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
  --exclude='/README.md' \
  "$ORIGEM/" "$DESTINO/"

echo
if [ -n "$SECO" ]; then
  echo "(conferência: nada foi escrito)"
else
  echo "espelhado em: $DESTINO"
  echo "agora: conferir o git status lá, rodar a varredura de segredos, commitar e empurrar."
fi
