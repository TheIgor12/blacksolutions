# Ditado e revisão em português do Brasil

O microfone funciona apenas se o navegador oferecer reconhecimento **local** de pt-BR. Não há tentativa de serviço remoto. O pacote de idioma pode ser baixado pelo navegador mediante ação da pessoa. A aplicação não armazena áudio. O rascunho não sai do navegador enquanto a profissional não escolher **Usar texto**. Depois disso vale o salvamento que já existia naquele campo. Nos Pés Interativos, a anotação geral é salva automaticamente quando o texto é aceito; o diálogo informa isso. A ortografia é revisada no próprio aparelho, com sugestões explícitas. A ferramenta não corrige raciocínio clínico, termos técnicos ou doses.

## Dependências e licenças

- VERO, de Raimundo Santos Moura e colaboradores, na distribuição [dictionary-pt-br 2.0.1](https://registry.npmjs.org/dictionary-pt-br/-/dictionary-pt-br-2.0.1.tgz), MPL 2.0 (também oferecida sob LGPLv3), arquivos de dados sem alteração, distribuídos comprimidos. Para recuperar as origens: `gzip -dc pt-br.aff.gz > index.aff` e `cat pt-br.dic.gz.* | gzip -dc > index.dic`. A obra é independente do aplicativo.
- [hunspell-asm 4.0.2](https://registry.npmjs.org/hunspell-asm/-/hunspell-asm-4.0.2.tgz), MIT, empacota o motor [Hunspell, revisão fc6a952](https://github.com/hunspell/hunspell/tree/fc6a952), MPL 1.1 (há licenças alternativas, conforme aviso do fabricante). `worker-pt-br.js` embute seu binário WebAssembly, que roda fora da página. As licenças acompanham os arquivos e o fonte original pode ser obtido nos links acima.
- O fonte de integração está em `scripts/worker-pt-br-source.js`. Para reconstruir, instale `hunspell-asm@4.0.2` e `esbuild@0.25.12` numa pasta de build. Ajuste os imports CommonJS do pacote para `import runtime from ...` em `dist/esm/loadModule.js` e `import nanoid from 'nanoid'` em `dist/esm/hunspellLoader.js` e `emscripten-wasm-loader/dist/esm/path/mountBuffer.js`. Copie o fonte de integração para a pasta de build e rode `esbuild worker-pt-br-source.js --bundle --platform=browser --target=es2022 --minify --legal-comments=eof --outfile=worker-pt-br.js`.

## Validação

`node scripts/test-ditado.mjs` usa dados fictícios, API de voz simulada e o corretor compilado real. Antes de liberar a captação, verificar em navegador compatível e HTTPS: negar a permissão, autorizar e ditar "Sem dor no hálux direito. Fissura de 2,5 milímetros no calcâneo esquerdo."; desligar o microfone; conferir negação, medida e lateralidade; trocar de ficha com rascunho aberto. Navegador sem voz local: manter digitação e corretor, sem enviar áudio pela rede.
