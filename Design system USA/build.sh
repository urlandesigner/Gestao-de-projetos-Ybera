#!/usr/bin/env bash
# Gera os arquivos de dist/ prontos para upload como asset do Shopify.
cd "$(dirname "$0")" || exit 1
mkdir -p dist
HEAD='/* =========================================================================
   YBERA DESIGN SYSTEM · BUNDLE PARA O TEMA SHOPIFY
   Gerado a partir de tokens/. Não edite este arquivo — edite a fonte e
   regenere com ./build.sh
   ========================================================================= */
'
{ echo "$HEAD"; cat tokens/00-primitives.css; echo; cat tokens/01-semantic.css; } > dist/ybera-tokens.css
cp bridge/ybera-bridge.css dist/ybera-bridge.css
# O comportamento tambem e asset. Sem esta linha o CSS do bundle ganhava
# seletores novos ([data-playing]) e o JS ficava para tras — o video subia
# para o Shopify sem quem o fizesse tocar.
cp components/ybera-components.js dist/ybera-components.js
{ echo "$HEAD"; cat components/ybera-components.css; echo; cat patterns/ybera-patterns.css; } > dist/ybera-components.css
# Os tokens tambem saem em W3C DTCG. O CSS continua sendo a fonte; o JSON e
# derivado, para quem nao le CSS — Figma Variables, Style Dictionary, tema
# nativo. Sem esta linha o JSON ficaria para tras do CSS sem ninguem ver.
node tools/tokens-to-json.mjs > /dev/null || exit 1
# A matriz de completude tambem e derivada. Escrita a mao ela vira o artefato
# que mais apodrece num design system: a tabela continua dizendo "documentado"
# depois que a doc parou de mostrar o componente.
node tools/inventario.mjs > /dev/null || exit 1
node tools/fichas.mjs || exit 1

# ---------------------------------------------------------------------------
# TELAS-PROVA
# _captura/nova-loja/ e a home e a PDP montadas so com o sistema, e e a unica
# evidencia de que os componentes sobrevivem a conteudo e imagem de verdade —
# a coluna "Tela real" do INVENTARIO.md le exatamente estes arquivos.
#
# Elas carregam COPIAS do CSS (a pasta e autocontida de proposito: fonte local,
# nada de rede). Copia que ninguem sincroniza deriva: quando isto foi escrito,
# o corte global de `prefers-reduced-motion` — regra de acessibilidade do
# sistema inteiro — nao estava na copia. As telas provavam um sistema que ja
# nao existia.
#
# O gerador completo e `python3 _captura/montar-ds.py`, e ele baixa a fonte do
# Google. Aqui so o que nao precisa de rede: os seis arquivos e o carimbo de
# versao. O calculo do carimbo espelha `versao()` do gerador — se um dos dois
# mudar, os dois mudam.
# ---------------------------------------------------------------------------
PROVA=_captura/nova-loja
if [ -d "$PROVA/yb" ]; then
  cp tokens/00-primitives.css        "$PROVA/yb/00-primitives.css"
  cp tokens/01-semantic.css          "$PROVA/yb/01-semantic.css"
  cp components/ybera-components.css "$PROVA/yb/components.css"
  cp patterns/ybera-patterns.css     "$PROVA/yb/patterns.css"
  cp icons/ybera-icons.css           "$PROVA/yb/icons.css"
  cp icons/ybera-icons.svg           "$PROVA/yb/icons.svg"
  cp components/ybera-components.js  "$PROVA/yb/components.js"
  V=$(cat tokens/00-primitives.css tokens/01-semantic.css \
          components/ybera-components.css patterns/ybera-patterns.css \
          icons/ybera-icons.css components/ybera-components.js \
      | shasum -a 1 | cut -c1-8)
  for f in "$PROVA"/*.html; do
    [ -e "$f" ] || continue
    # so o carimbo muda; a marcacao das telas e do gerador, nao daqui
    sed -i '' -E "s/\?v=[0-9a-f]{8}/?v=$V/g" "$f"
  done
  echo "telas-prova sincronizadas · v=$V"
fi

echo "dist/ gerado:"
ls -lh dist/ | tail -n +2 | awk '{printf "  %-26s %s\n", $9, $5}'
