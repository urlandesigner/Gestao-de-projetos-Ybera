# pdp-extra

As três imagens que a coluna da PDP usa nas seções de história e que a captura
das páginas **não** entrega como asset separado — elas chegam por outro caminho
na loja (bloco de app, srcset com hash próprio) e não sobram no `assets/` de
`home/` nem de `pdp-fashion-gold/`.

Elas moram aqui porque `montar-ds.py` apaga `nova-loja/` inteiro a cada geração.
Enquanto os arquivos existiam só no destino, sobreviviam por estarem commitados
— e no dia em que o gerador rodou, sumiram, deixando três `<img>` apontando para
o vazio com `alt=""`, invisíveis em qualquer teste. A checagem "imagem citada
que não existe" nasceu desse defeito; esta pasta é o outro lado do conserto.

Quem consome: `pdp_historia()` e `copiar_pdp_extra()` em `montar-ds.py`.
