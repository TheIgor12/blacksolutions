# Vistas do Mapa Estético

Origem das malhas: [Human Base Meshes v1.2.0](https://download.blender.org/demo/asset-bundles/human-base-meshes/human-base-meshes-bundle-v1.2.0.zip), Blender Studio e colaboradores, CC0. Foram usados o busto Head - Realistic Animation e a malha Body Female - Realistic. Estes são modelos anatômicos fictícios, não fotos de pacientes. O render clínico genérico não reproduz uma identidade real.

O gerador usa uma única câmera por vista para escrever a figura WebP e a máscara PNG com a mesma projeção e a mesma dimensão, 340 × 390. Região identificada por pixel opaco com a cor exata RGB (índice da região, 91, 167), sem arredondar para a região mais próxima. O preenchimento usa emissão, gerenciamento de cor Raw e ajuste de filtro da máscara, de modo que a imagem de cores salve os valores lineares sem transformação do aspecto. As superfícies são visíveis em ambos os lados no render. Não representa precisão subpixel; a profissional confirma região e lado. A lista de regiões é alternativa para teclado e na falta das imagens.

A geometria-base e a orientação das câmeras devem ser preservadas em ambas as imagens. Alterar uma vista implica regenerar e auditar a máscara com ela. As fronteiras são classificações geométricas para registro, sujeitas à revisão anatômica antes da publicação; não devem ser usadas como indicação de procedimento.

Geração requer Blender 4.3+ e FFmpeg com codificador libwebp:
`blender -b human_base_meshes_bundle.blend -t 8 --python estetmapa/gerar-mapas.py -- estetmapa`
Apenas WebP e PNG são carregados no navegador. Nenhuma dependência própria de WebGL é transferida para o celular, e a simulação de fotos fica fora do candidato.
