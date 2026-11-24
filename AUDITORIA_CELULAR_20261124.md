# Auditoria de aparência no celular
**Data:** 24/11/2026 · **Versão:** 1.39.2 · **Método:** medição automatizada, não leitura de código

## 1. O que foi medido, antes

Varredura de 84 combinações: 28 telas em 3 larguras de celular, 360, 390 e
430 pixels. Depois, 14 janelas do sistema nas mesmas larguras.

| Medida | Antes | Depois |
|---|---|---|
| Alturas diferentes de campo | 8 (22, 26, 36, 38, 40, 47, 66, 76) | 3 de uso (46 campo, 92 texto longo, 42 busca) |
| Alturas diferentes de botão | 6 (25, 26, 27, 32, 34, 41) | 2 (44 normal, 40 pequeno) |
| Campos com fonte abaixo de 16 pixels | 27 | 0 |
| Alvos de toque abaixo de 40 pixels | 418 | 0 |
| Telas com rolagem lateral | 0 | 0 |
| Erros de JavaScript | 0 | 0 |

A fonte de 16 pixels não é capricho: abaixo disso o iPhone dá zoom sozinho
quando o dedo toca no campo, e a tela inteira se desloca. Era o que
acontecia em 27 campos.

## 2. O que mudou na aparência

- Campo tem uma altura só, uma fonte só e um raio de canto só.
- Botão tem duas alturas, normal e pequeno, e nada entre elas.
- Nas janelas, o rótulo fica acima do valor, alinhado à esquerda. Antes o
  valor comprido empurrava o rótulo e deixava a linha torta.
- Os botões do rodapé das janelas ficam de largura igual, dois por linha, e
  abaixo de 430 pixels um por linha, inteiros, em vez de texto cortado.
- Janela com menos moldura e mais conteúdo, cantos de 14 pixels.
- O botão flutuante de ajuda some enquanto há janela aberta. Ele cobria o
  conteúdo da própria janela no celular.

## 3. O que não mudou, de propósito

No computador nada foi alterado: todas as regras valem só abaixo de 760
pixels. Conferido em 1024, 1280 e 1440 pixels, sem rolagem lateral e sem
erro.

**Ponto para a sua decisão.** No computador os botões ainda têm cinco
alturas diferentes, 25, 26, 27, 32 e 34 pixels. É o mesmo desalinho que
você apontou no celular, só que menos visível porque a tela é maior. Se
quiser, harmonizo o computador também, mas aí a mudança aparece em todas as
telas de todos os clientes de uma vez, e por isso não fiz sem você mandar.

## 4. Defeito grave encontrado fora do pedido

A pasta `/app/` é a segunda porta de entrada do sistema e tem service worker
e cache próprios, porque todos os caminhos são relativos. **Faltavam ali 13
arquivos.** Quem entrasse por `blackflow.app.br/app/` abria o sistema sem a
tela de assinante, sem a sincronização nova, sem a cobrança interna, sem a
nota fiscal, sem o módulo de navegação, sem os catálogos e sem o tutorial.

Nenhum erro aparecia na tela. Os módulos simplesmente não existiam, e o
sistema abria mancando, sem avisar ninguém.

Corrigido: `sincronizar-app.sh` copia tudo e confere antes de publicar.
Medido depois: zero arquivos faltando, as funções novas respondem.
