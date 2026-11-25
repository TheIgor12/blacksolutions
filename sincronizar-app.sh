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
# A pasta vendor guarda biblioteca de terceiros, hoje o three.js do pé em três
# dimensoes. Como os caminhos sao relativos, /app/ precisa da copia dela, senao
# o modulo tridimensional pede um arquivo que nao existe ali.
# As figuras do pé e os mapas de região, que o módulo pede por pes/...
if [ -d pes ]; then
  mkdir -p app/pes
  cp pes/* app/pes/ 2>/dev/null || true
fi
if [ -d ditado ]; then
  mkdir -p app/ditado
  for f in ditado/*; do [ -f "$f" ] && cp "$f" "app/$f"; done
fi
if [ -d vendor ]; then
  mkdir -p app/vendor
  cp vendor/* app/vendor/ 2>/dev/null || true
fi
if [ -d estetmapa ]; then
  mkdir -p app/estetmapa
  for f in estetmapa/*.webp estetmapa/*.png; do [ ! -f "$f" ] || cp "$f" "app/$f"; done
fi
# As imagens que o sistema pede pelo caminho img/... Copiadas só as usadas, e
# nao a pasta inteira, que tem material de divulgacao e pesa megabytes.
mkdir -p app/img
for f in $(grep -oh "img/[a-zA-Z0-9_.-]*" index.html bf-*.js 2>/dev/null | sort -u); do
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
[ -f vendor/three.module.min.js ] && [ ! -f app/vendor/three.module.min.js ] && { echo "FALTA app/vendor/three.module.min.js"; falta=1; }
for f in pes/*.webp pes/mapa-*.png; do
  [ -f "$f" ] && [ ! -f "app/$f" ] && { echo "FALTA app/$f"; falta=1; }
done
for f in $(grep -oh "img/[a-zA-Z0-9_.-]*" index.html bf-*.js 2>/dev/null | sort -u); do
  [ -f "$f" ] && [ ! -f "app/$f" ] && { echo "FALTA app/$f"; falta=1; }
done
[ "$falta" = 0 ] && echo "app/ sincronizado: $(ls app | wc -l) arquivos, mais $(ls app/vendor 2>/dev/null | wc -l) em vendor"
exit $falta
