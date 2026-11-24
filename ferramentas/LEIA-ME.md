# ferramentas

Scripts que rodam no computador de quem programa, nunca no navegador da
clínica. Nada daqui é publicado para o cliente.

## gerar-figuras-do-pe.js

Gera as seis figuras do pé e os seis mapas de região, em `pes/`, a partir da
malha de `bf-pe-malha.js`. Roda com Playwright e o three.js de `vendor/`.

Como rodar, com o servidor local na raiz do repositório:

    python3 -m http.server 8099 --directory .
    node ferramentas/gerar-figuras-do-pe.js

Depois converta os PNG em WebP, que é o formato publicado:

    cd pes && for f in dorsal plantar lateral medial dedos calcanhar; do
      ffmpeg -y -i $f.png -c:v libwebp -quality 90 -compression_level 6 $f.webp
      rm -f $f.png
    done

E regenere `bf-pe-vistas.js` a partir de `pes/vistas.json`.

### Por que as figuras e os mapas nascem juntos

O mapa de regiões é renderizado pela mesma câmera, no mesmo instante, com cada
região pintada de uma cor chapada. É isso que faz o toque cair na região certa
sem ninguém desenhar contorno à mão. Mexeu na malha, gere os dois de novo: se
só um for atualizado, o sistema passa a gravar a região errada, e região errada
em prontuário é pior do que figura feia.

### Detalhe que custou tempo

O mapa de regiões é renderizado com `outputColorSpace = LinearSRGBColorSpace`.
Sem isso o three converte a cor para sRGB na saída e o byte gravado no arquivo
não bate com a tabela de cores. E os dois materiais precisam de
`side: DoubleSide`: a malha tem o enrolamento invertido, e sem isso a vista da
sola mostra o dorso por dentro.
