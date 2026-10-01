#!/usr/bin/env bash
# Gera assets/og-entregas.png — a imagem de preview (og:image) que WhatsApp,
# Slack, LinkedIn e Teams mostram quando o link do entregas.html é colado.
#
# Fotografa scripts/og/cartao-entregas.html com o Chrome headless em 1200×630.
# O molde é HTML pra herdar os tokens e a tipografia da capa; o que vai pro ar
# é só o PNG (scripts/ não é publicado).
#
# QUANDO RODAR: sempre que o topo do relatório mudar de número ou de período.
# A imagem é estática — o link de leitura é um retrato e ela também é. Se os
# números divergirem, quem vê o preview lê um e abre outro.
#
#   ./scripts/og-entregas.sh                       # usa os valores atuais
#   ./scripts/og-entregas.sh 5 31                  # projetos, itens
#   ./scripts/og-entregas.sh 5 31 "Outubro de 2026"
#
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
MOLDE="$RAIZ/scripts/og/cartao-entregas.html"
SAIDA="$RAIZ/assets/og-entregas.png"

PROJETOS="${1:-5}"
ITENS="${2:-31}"
PERIODO="${3:-Agosto e Setembro de 2026}"

[ -x "$CHROME" ] || { echo "erro: Google Chrome não encontrado em $CHROME" >&2; exit 1; }
[ -f "$MOLDE" ] || { echo "erro: molde não encontrado em $MOLDE" >&2; exit 1; }

# A query string vai por URL: o molde lê os valores com URLSearchParams.
codifica() { python3 -c 'import sys,urllib.parse; print(urllib.parse.quote(sys.argv[1]))' "$1"; }
URL="file://$(codifica "$MOLDE" | sed 's|%2F|/|g')?projetos=$(codifica "$PROJETOS")&itens=$(codifica "$ITENS")&periodo=$(codifica "$PERIODO")"

PERFIL="$(mktemp -d)"
trap 'rm -rf "$PERFIL"' EXIT

# --virtual-time-budget dá tempo da Plus Jakarta Sans chegar do Google Fonts
# antes do clique. Sem ela a imagem sai com a fonte de sistema — e isso não
# levanta erro nenhum, só uma imagem com a tipografia errada.
#
# O Chrome é posto no FUNDO e morto depois. Medido nas duas versões do modo
# headless (old e new), ele escreve o PNG e fica rodando — esperar o processo
# encerrar trava o script pra sempre. Então quem decide que terminou é o
# arquivo: assim que ele aparece e para de crescer, a foto está pronta.
rm -f "$SAIDA"
"$CHROME" \
  --headless=old \
  --disable-gpu \
  --hide-scrollbars \
  --force-device-scale-factor=1 \
  --window-size=1200,630 \
  --virtual-time-budget=8000 \
  --user-data-dir="$PERFIL" \
  --screenshot="$SAIDA" \
  "$URL" >/dev/null 2>&1 &
CHROME_PID=$!
trap 'kill "$CHROME_PID" 2>/dev/null || true; rm -rf "$PERFIL"' EXIT

anterior=-1
for _ in $(seq 1 60); do
  sleep 0.5
  atual=$( { wc -c < "$SAIDA"; } 2>/dev/null || echo 0)
  [ "$atual" -gt 0 ] && [ "$atual" = "$anterior" ] && break
  anterior=$atual
done
kill "$CHROME_PID" 2>/dev/null || true

[ -s "$SAIDA" ] || { echo "erro: o Chrome não escreveu $SAIDA" >&2; exit 1; }

# Confere o que foi gerado: dimensão exata e peso. Acima de ~300 KB o WhatsApp
# passa a engasgar com o preview em conexão ruim.
python3 - "$SAIDA" <<'PY'
import os, struct, sys
caminho = sys.argv[1]
with open(caminho, 'rb') as f:
    cab = f.read(24)
largura, altura = struct.unpack('>II', cab[16:24])
peso = os.path.getsize(caminho)
print(f"{os.path.basename(caminho)}: {largura}x{altura}, {peso/1024:.0f} KB")
if (largura, altura) != (1200, 630):
    sys.exit(f"erro: esperado 1200x630, saiu {largura}x{altura}")
if peso > 300 * 1024:
    print("aviso: acima de 300 KB — considere comprimir", file=sys.stderr)
PY
