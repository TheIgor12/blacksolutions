#!/bin/sh
# ---------------------------------------------------------------------------
# /app/ e a segunda porta de entrada do BlackFlow. Quem instalou o sistema no
# celular por ela tem um aplicativo proprio, com service worker e cache
# proprios, porque todos os caminhos sao relativos.
#
# Por isso /app/ precisa de uma copia de tudo, e nao so do index.html. Em
# 24/11/2026 a medicao mostrou 13 arquivos faltando ali: o sistema abria em
# /app/ sem a tela de assinante, sem a sincronizacao nova, sem a cobranca
# interna, sem a nota fiscal, sem a navegacao e sem os catalogos. Nenhum erro
# aparecia na tela: os modulos simplesmente nao existiam.
#
# Este script copia tudo e confere. Roda antes de cada publicacao.
# ---------------------------------------------------------------------------
set -e
cd "$(dirname "$0")"
mkdir -p app
cp index.html app/index.html
cp sw.js app/sw.js
cp manifest.webmanifest app/manifest.webmanifest
for f in bf-*.js bf-*.css icone-*.png; do
  [ -f "$f" ] && cp "$f" "app/$f"
done
# Tira de app/ o que nao existe mais na raiz: modulo removido que continua la
# e carregado pelo navegador de quem entra por /app/, e volta a vida sozinho.
for f in app/bf-*.js app/bf-*.css; do
  [ -f "$f" ] || continue
  base=$(basename "$f")
  [ -f "$base" ] || { rm -f "$f"; echo "removido app/$base (nao existe mais na raiz)"; }
done

# Confere: todo arquivo que o index.html pede tem de existir em app/
falta=0
for f in $(grep -o 'src="\./[^"?]*"' index.html | sed 's/src="\.\///;s/"//' ; \
           grep -o 'href="\./[^"?]*"' index.html | sed 's/href="\.\///;s/"//'); do
  case "$f" in *.js|*.css) [ -f "app/$f" ] || { echo "FALTA app/$f"; falta=1; } ;; esac
done
cmp -s index.html app/index.html || { echo "index.html diferente de app/index.html"; falta=1; }
[ "$falta" = 0 ] && echo "app/ sincronizado: $(ls app | wc -l) arquivos"
exit $falta
