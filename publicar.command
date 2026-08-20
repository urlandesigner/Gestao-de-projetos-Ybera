#!/bin/bash
# Duplo clique neste arquivo publica a Central: manda tudo pro GitHub, e a
# Vercel republica o site em ~1 minuto. Não precisa saber git.
cd "$(dirname "$0")" || exit 1

echo "════════════════════════════════════════════"
echo "  Publicando a Central de Projetos"
echo "════════════════════════════════════════════"
echo

if [ -n "$(git status --porcelain)" ]; then
  echo "Mudanças encontradas:"
  git status --short
  echo
  git add -A
  git commit -q -m "Atualização pela Central — $(date '+%d/%m/%Y às %H:%M')"
  echo "✓ Mudanças salvas."
else
  echo "Nada novo pra salvar."
fi
echo

# Publica o que ainda não está no GitHub (inclui commits de sessões anteriores)
if [ -n "$(git log origin/main..HEAD --oneline 2>/dev/null)" ]; then
  echo "Enviando pro GitHub:"
  git log origin/main..HEAD --oneline
  echo
  if git push origin main; then
    echo
    echo "✓ Publicado. A Vercel republica o site em cerca de 1 minuto."
  else
    echo
    echo "✗ O envio falhou (veja a mensagem acima)."
    echo "  Causa comum: sem internet, ou o GitHub pediu login de novo."
  fi
else
  echo "✓ O GitHub já está atualizado. Nada a enviar."
fi

echo
echo "Pode fechar esta janela."
read -n 1 -s -r
