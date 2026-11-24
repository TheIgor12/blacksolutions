# vendor

Biblioteca de terceiros guardada aqui dentro, de propósito.

## three.module.min.js

three.js versão 0.169.0, licença MIT, cópia da licença em `three-LICENSE.txt`.
A MIT permite uso comercial, modificação e redistribuição, exigindo apenas que
o aviso de licença acompanhe o código. Por isso o arquivo da licença fica ao
lado, e não pode ser apagado.

Obtido com `npm pack three@0.169.0`, arquivo `package/build/three.module.min.js`.

### Por que aqui e não por CDN

Um CDN é um terceiro entre a clínica e o sistema. Se ele cair, mudar o arquivo
ou bloquear a região, a tela quebra na mão de quem está atendendo. Guardado
aqui, o arquivo é servido pelo mesmo domínio do resto.

### Quando é carregado

Só no computador, só quando a profissional abre o pé em três dimensões, por
importação dinâmica. Não entra na lista do service worker, então não é baixado
no celular de ninguém nem ocupa espaço em quem nunca abre essa tela.
