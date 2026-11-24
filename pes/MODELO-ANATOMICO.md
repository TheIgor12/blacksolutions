# Pés Interativos: malha anatômica v1

Base anatômica: **Foot realistic**, de Dan Ulrich, do pacote Human Base Meshes do Blender Studio. Fonte: [pacote original](https://www.blender.org/download/demo/asset-bundles/human-base-meshes/human-base-meshes-bundle-v1.2.0.zip), [ficha do STL, autores e licença](https://commons.wikimedia.org/wiki/File:Blender_Foot_realistic_by_Dan_Ulrich_(CC0).stl). Licença do modelo: [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).

Adaptado para navegador: 18 mil triângulos, normalização em milímetros, acabamento colorido na malha e unhas sobrepostas. A referência é ilustrativa, não é foto, exame ou modelo individual de um paciente. O pé esquerdo é espelhado, com posição canônica e lado gravados separadamente. A malha não é usada para medir nem diagnosticar.

## Integração e compatibilidade

- O mapa continua em `pesMapas`, com o `pacienteId` já usado pelo BlackFlow e pela anamnese. A ação opcional **Lançar na evolução clínica** mantém o caminho existente para o histórico e exportação de evoluções. Nenhuma migração, permissão ou tabela nova.
- Marcações novas em 3D registram o identificador da malha e as coordenadas locais. O 2D e suas áreas permanecem como estavam. Marcações antigas não são regravadas: no 3D novo, a posição antiga é representada de forma aproximada pela região anatômica conhecida.
- A malha genérica e a biblioteca vêm do mesmo domínio. Sem WebGL, ou se o 3D falhar, as seis vistas 2D continuam disponíveis. O 3D é carregado sob demanda.
- Versão de teste: validar os dois lados e a classificação anatômica com a profissional. A sincronização com uma conta de teste (não com prontuários reais) deve ser conferida antes da publicação.

## Teste

`node scripts/test-pes-anatomico.mjs` (Node 22+). A simulação é isolada; usa a geometria e os raios reais e um renderizador simulado. Não precisa de conta ou banco.
