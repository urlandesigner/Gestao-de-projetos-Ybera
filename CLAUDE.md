# Central de Projetos — regras do projeto

## A regra que vale pra todo mundo: cada PO só altera o que é dela

Várias POs testam este sistema. Qualquer mudança que uma PO fizer — no relatório,
nos cartões, no roadmap, no desenho — **vale só para ela**. O que as outras POs
veem não pode mudar por causa dela.

**Antes de mexer em qualquer arquivo, descubra quem é a PO** (pergunte, se a
conversa não disser): a chave é o primeiro nome, minúsculo e sem acento
(`carla`, `isadora`, `daniele`, `tazshida`). O Urlan (`urlan`) é o dono do
projeto e pode tudo.

### O que uma PO pode alterar

- `assets/conteudo/<po>/**` — os cartões (`edicoes/AAAA-MM.json`), o roadmap, as
  fontes e as imagens dela
- `entregas-<po>-*.html` — páginas só dela, para variações de desenho
- `scripts/gerar-entregas-<po>.js` — o gerador dessas páginas
- `assets/dados-*-<po>.json` — os dados publicados dela

### Tudo o resto é compartilhado e só o Urlan altera

Código (`assets/*.js`), estilos (`assets/*.css`), páginas do sistema
(`central.html`, `entregas-v2.html`, `index.html`…), a função da Vercel (`api/`),
os testes, os scripts, o `resumos.json`, o `report-nomes.json` e este arquivo.

Se a PO pedir algo que exige mexer em arquivo compartilhado — um estilo novo, um
campo novo no cartão, um botão —, **não altere**. Diga em uma frase que isso é do
Urlan, e deixe escrito o que ela quer, para ele decidir. Se a mudança pode ser
feita só para ela (uma página própria `entregas-<po>-*.html`, por exemplo), faça
assim.

### Conferir antes de publicar

```bash
node scripts/regra-por-po.js <po>
```

Lista o que mudou em relação ao `origin/main` e **falha** se qualquer arquivo
estiver fora do que é dela. Rode sempre antes de enviar. Quem for publicar a
mudança de uma PO roda o mesmo comando antes.

## Publicar

"Sobe para prod" publica nos dois lugares (site oficial da Nivello e a Vercel);
veja `docs/` e a memória do projeto. Roda os testes (`npm test`) antes.
