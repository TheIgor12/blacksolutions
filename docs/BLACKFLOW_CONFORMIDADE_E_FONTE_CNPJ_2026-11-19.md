# BlackFlow — conclusão da revisão de conformidade fiscal e receituários (19/11/2026)

## Escopo efetivamente implementado
- **Supabase**: função `bf-modulos-fiscal` versão 3, autenticada, com `GET /configuracao?clinica_id=...` que retorna diagnóstico por campo e orientações sobre emissor municipal/nacional, mantendo `/emitir` bloqueada.
- **Supabase**: função `bf-fiscal-autoteste` versão 2, autenticada, respeitando RLS de administrador, sem gravações e sem envio fiscal; alerta do município corrigido e avisos fiscais ampliados.
- **Interface**: painel fiscal consultando diagnóstico autenticado e oferecendo caminhos oficiais para CNPJ, Simples e documentação técnica; fontes disponíveis de Taboão da Serra com alerta de regime.
- **Receituários**: acesso ao ITI/VALIDAR e à documentação do SNCR/Anvisa dentro do módulo, sem afirmar que simples QR/hashes provam assinatura ou validade jurídica; mesmo conteúdo atualizado em raiz e em `/app`.
- **Publicação**: arquivos da aplicação sincronizados e versões de cache incrementadas.

## CNPJ consultado
**34.160.123/0001-01 — 34.160.123 TATIANA WINHESKI MARTINEZ**.

Situação **ATIVA** consta no resultado de consulta externa ReceitaWS persistido pelo BlackFlow em 19/11/2026, que não deve ser confundido com certidão oficial da RFB. CNAE cadastrado **9602-5/01**. Cadastro fiscal aponta município IBGE **3552809 (Taboão da Serra/SP)**. Referências públicas de listagens empresariais também associam esta inscrição a Taboão da Serra/SP, mas não substituem comprovante atual da RFB. **Não alterado** o município.

`Lucro Presumido` é regime **declarado no cadastro do aplicativo**, não comprovado por certidão oficial. Campo de opção Simples está vazio; código tributário nacional, código serviço e inscrição municipal também estão ausentes. Integrador `nao_configurado`, `habilitado=false`. **Não inserir ou adivinhar código de serviço**: há distinções entre manicure/pedicure, podologia e outros serviços da clínica.

## Qual emissor fiscal?
Desde 01/11/2026 os optantes do Simples Nacional emitem NFS-e via Emissor Nacional, conforme orientação oficial. Para outros regimes, o emissor pode ser próprio do município. Taboão da Serra/SP possui referências públicas ao eTransparência. A decisão depende de **comprovante de opção tributária atual** e habilitação do contribuinte:
- [Situação cadastral Receita](https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/Cnpjreva_S.aspx)
- [Simples Nacional — opção](https://www8.receita.fazenda.gov.br/SimplesNacional/)
- [Portal NFS-e Nacional, documentação atual](https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual)
- [APIs governamentais e ambientes](https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/apis-prod-restrita-e-producao/apis-prod-restrita-e-producao)
- [Portal eTransparência Taboão da Serra](https://nfe.etransparencia.com.br/sp.taboaodaserra/nfe/principal.aspx)

## Por que não é legítimo marcar emissão como concluída?
Emitir exige **credenciais e habilitação do titular perante o emissor competente**, dados tributários verdadeiros, integração homologada no ambiente correto e retorno de autorização real — ações que não derivam de informação pública do CNPJ. Para rotas via API nacional, assinatura/credencial e proteção de chave se aplicam de acordo com o emissor; portal municipal pode ter autenticação diferente. Não se deve falsificar emissão, habilitação, recibos, assinaturas ou declarar homologação inexistente.

## Receituários
QR e hashes de arquivo são verificação de registro/integridade. Não são assinatura qualificada nem aprovação de Conselho, ITI ou Anvisa. É necessária assinatura e validação criptográfica efetiva, comprovação profissional e, quando cabível, integração SNCR com numeração oficial. O módulo continua **sem habilitar receituários controlados**.
- [Validador do ITI](https://validar.iti.gov.br/)
- [Documentação SNCR/Anvisa](https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/controlados/sncr/documentos-do-sncr)
- [RDC 1046/2026](https://anvisalegis.datalegis.net/action/ActionDatalegis.php?acao=abrirTextoAto&cod_menu=9428&cod_modulo=310&link=S&numeroAto=00001046&orgao=RDC%2FDC%2FANVISA%2FMS&seqAto=000&tipo=RDC&valorAno=2026)

## Verificações executadas e limites
- Código JS do painel fiscal e receituário compilado sintaticamente com `new Function`, sem problemas.
- `bf-modulos-fiscal` e `bf-fiscal-autoteste` implantadas em Supabase com `status=ACTIVE`, `verify_jwt=true`.
- Banco consultado: 0 NFS-e, 0 tentativas fiscais e 0 receitas clínicas no momento da conferência.
- Interface raiz e `/app` sincronizadas.
- **Não foi executado** teste E2E em navegador com sessão de administrador, emissão na SEFIN, certificado ICP-Brasil, resposta do prestador fiscal, credenciamento municipal, registro SNCR ou conferência de assinatura qualificada externa. Sem essas evidências seria incorreto declarar qualquer uma dessas etapas pronta.

**Conclusão:** melhorias de software e diagnóstico publicadas; homologação governamental, emissão efetiva e validação jurídica automatizada **não concluídas** por dependerem de autorização/credenciais e validações externas.
