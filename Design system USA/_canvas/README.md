# Canvas do véu — superfície de decisão

Um canvas do Claude Design com as três peças que levam véu sobre foto
(hero, cartão de oferta, mosaico de coleção), cada uma com platô, queda,
raio e banda ajustáveis ao vivo.

**Não é produção.** O que se mexe aqui não volta para o sistema; a fonte
de verdade continua sendo `components/ybera-components.css`, com as
checagens. O canvas serve para decidir um valor olhando, e o valor
decidido é portado à mão.

| arquivo | o que é |
|---|---|
| `Main.dc.html` | hero, 1440×544 — 1:1 com produção |
| `CartaoOferta.dc.html` | cartão de oferta, 266×416 |
| `Colecao.dc.html` | quatro ladrilhos do mosaico |
| `canvas.json` | posições, títulos e os dois post-its |
| `hero.jpg` `oferta.jpg` `colecao.jpg` | as fotos reais, reduzidas para caber |

As fotos são recortes de `_captura/nova-loja/img/`, reduzidas para menos
de 68 KB cada porque o documento inteiro é republicado a cada gravação.

O `.html` montado não é versionado (2,7 MB, quase tudo editor embutido) —
ver `.gitignore`. Para remontar, o comando está no histórico da sessão que
o criou: o `seed-canvas.mjs` da skill `design`, apontando para estes
arquivos.
