#!/bin/bash
# Sobe o token de cache de TODOS os *.html do projeto.
#
# Existe porque a forma antiga — `sed 's/v=<antigo>/v=<novo>/'` digitado à mão —
# falha em silêncio quando o token atual não é o que se imaginava. Foi o que
# aconteceu em 29/09/2026: um `git revert` devolveu os arquivos a um token
# anterior, e as cinco trocas seguintes não casaram com nada. Os commits diziam
# que o token tinha subido e ele estava parado — dado novo servido com a
# promessa de cache errada.
#
# Aqui o token atual é LIDO do arquivo, não suposto, e o script falha se algum
# arquivo não for reescrito.
#
# Uso:  ./scripts/versionar.sh          # incrementa o sufixo de hoje
set -euo pipefail
cd "$(dirname "$0")/.."

atual=$(grep -ho 'v=[0-9]\{10\}' ./*.html | sort -u)
[ "$(echo "$atual" | wc -l)" -eq 1 ] || { echo "tokens divergentes entre os HTML:"; echo "$atual"; exit 1; }
atual=${atual#v=}

hoje=$(date +%Y%m%d)
if [ "${atual:0:8}" = "$hoje" ]; then
  novo=$(printf '%s%02d' "$hoje" $((10#${atual:8:2} + 1)))
else
  novo="${hoje}01"
fi

for f in ./*.html; do
  grep -q "v=$atual" "$f" || continue
  sed -i '' "s/v=$atual/v=$novo/g" "$f"
done

restou=$(grep -l "v=$atual" ./*.html || true)
[ -z "$restou" ] || { echo "não reescreveu: $restou" >&2; exit 1; }
echo "token: $atual -> $novo"
