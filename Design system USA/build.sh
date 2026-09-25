#!/usr/bin/env bash
# Gera os arquivos de dist/ prontos para upload como asset do Shopify.
# -e: qualquer cp/cat que falhe para o build em vez de imprimir "dist/ gerado".
set -euo pipefail
cd "$(dirname "$0")"
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
cp behavior/ybera-behavior.js dist/ybera-components.js
# A escada inteira num arquivo so, NA ORDEM DELA. O nome do bundle e contrato
# com o tema Shopify, que ja linka `ybera-components.css` como asset — por isso
# ele nao virou `ybera-escada.css` quando as pastas viraram atomic. Trocar o
# nome aqui e uma mudanca na loja, nao no design system.
{ echo "$HEAD"
  cat base/ybera-base.css; echo
  cat atoms/ybera-atoms.css; echo
  cat molecules/ybera-molecules.css; echo
  cat organisms/ybera-organisms.css; echo
  cat templates/ybera-templates.css; } > dist/ybera-components.css
# Os tokens tambem saem em W3C DTCG. O CSS continua sendo a fonte; o JSON e
# derivado, para quem nao le CSS — Figma Variables, Style Dictionary, tema
# nativo. Sem esta linha o JSON ficaria para tras do CSS sem ninguem ver.
node tools/tokens-to-json.mjs > /dev/null || exit 1
# A matriz de completude tambem e derivada. Escrita a mao ela vira o artefato
# que mais apodrece num design system: a tabela continua dizendo "documentado"
# depois que a doc parou de mostrar o componente.
node tools/inventario.mjs > /dev/null || exit 1
node tools/fichas.mjs || exit 1
# O cabecalho das paginas escritas a mao (capa, tokens, icones, preview,
# decisoes). As geradas ja saem com ele — o gerador importa a mesma funcao.
node tools/moldura.mjs || exit 1

# ---------------------------------------------------------------------------
# PAGES — o ultimo degrau da escada
# pages/ e a home e a PDP montadas so com o sistema, e e a unica
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
PROVA=pages
if [ -d "$PROVA/yb" ]; then
  cp tokens/00-primitives.css          "$PROVA/yb/00-primitives.css"
  cp tokens/01-semantic.css            "$PROVA/yb/01-semantic.css"
  cp base/ybera-base.css               "$PROVA/yb/base.css"
  cp atoms/ybera-atoms.css             "$PROVA/yb/atoms.css"
  cp molecules/ybera-molecules.css     "$PROVA/yb/molecules.css"
  cp organisms/ybera-organisms.css     "$PROVA/yb/organisms.css"
  cp templates/ybera-templates.css     "$PROVA/yb/templates.css"
  cp icons/ybera-icons.css             "$PROVA/yb/icons.css"
  cp icons/ybera-icons.svg             "$PROVA/yb/icons.svg"
  cp behavior/ybera-behavior.js        "$PROVA/yb/behavior.js"
  # shasum (perl) no macOS e na maioria das distros; sha1sum (coreutils) onde nao ha
  if command -v shasum >/dev/null 2>&1; then SHA1="shasum -a 1"; else SHA1="sha1sum"; fi
  V=$(cat tokens/00-primitives.css tokens/01-semantic.css \
          base/ybera-base.css atoms/ybera-atoms.css molecules/ybera-molecules.css \
          organisms/ybera-organisms.css templates/ybera-templates.css \
          icons/ybera-icons.css behavior/ybera-behavior.js \
      | $SHA1 | cut -c1-8)
  for f in "$PROVA"/*.html; do
    [ -e "$f" ] || continue
    # so o carimbo muda; a marcacao das telas e do gerador, nao daqui.
    # `-i.bak` funciona em BSD e GNU sed; `-i ''` so no BSD (no Linux virava
    # script vazio e o carimbo ficava velho sem erro).
    sed -E -i.bak "s/\?v=[0-9a-f]{8}/?v=$V/g" "$f" && rm -f "$f.bak"
  done
  echo "telas-prova sincronizadas · v=$V"
fi

echo "dist/ gerado:"
ls -lh dist/ | tail -n +2 | awk '{printf "  %-26s %s\n", $9, $5}'
