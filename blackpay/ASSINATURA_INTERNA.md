# Assinatura dentro do sistema, o que falta ligar

**Data:** 23/11/2026 · **Versão do aplicativo:** 1.38.0

Está construído e publicado. Falta uma coisa só, que depende de você: a chave
da conta do Asaas. Enquanto ela não for gravada, a tela de cobrança continua
oferecendo o caminho antigo, e ninguém é cobrado por engano.

---

## 1. O que já está no ar

| Peça | Onde | Situação |
|---|---|---|
| Função `bf-assinatura` | Supabase, Edge Functions | publicada, com conferência de sessão ligada |
| Função `bf-assinatura-webhook` | Supabase, Edge Functions | publicada, sem conferência de sessão, com token próprio |
| Tabelas `bs_assinaturas` e `bs_assinatura_eventos` | banco | criadas, com acesso restrito ao administrador da conta |
| Tela de cobrança | aplicativo, módulo `bf-cobranca-138.js` | no ar, caindo no caminho antigo até a chave existir |

## 2. Os dois segredos que faltam

Em **Supabase → Edge Functions → Secrets**, acrescente:

| Nome | Valor |
|---|---|
| `ASAAS_CHAVE` | a chave de produção da sua conta do Asaas |
| `ASAAS_WEBHOOK_TOKEN` | um texto aleatório criado por você, de uns trinta caracteres |
| `ASAAS_BASE` | apenas se for testar no ambiente de testes: `https://api-sandbox.asaas.com/v3` |

Eu não gravo chave nem token: credencial é sua e não passa por mim.

Depois disso, no painel do Asaas, em **Integrações → Webhooks**, cadastre:

- endereço: `https://blszdbjpxgtloblxlusr.supabase.co/functions/v1/bf-assinatura-webhook`
- token de autenticação: o mesmo valor que você gravou em `ASAAS_WEBHOOK_TOKEN`
- eventos: pagamento confirmado, pagamento recebido, pagamento vencido,
  pagamento estornado, assinatura removida

Sem o token igual nos dois lados, a função recusa a chamada e nada muda no
banco. É de propósito: evita que qualquer um force uma liberação de acesso.

## 3. Como a tela passa a funcionar

**Pix.** A pessoa toca em assinar, o sistema cria a assinatura no Asaas, pede o
QR Code e mostra na mesma janela, com o copia e cola ao lado. A tela confere o
pagamento sozinha a cada sete segundos e libera o acesso quando cai, sem a
pessoa sair de lugar nenhum.

**Cartão.** O formulário é do próprio sistema. Os dados do cartão atravessam a
função de servidor uma única vez, a caminho do Asaas, e não são gravados em
lugar nenhum: nem no banco, nem no aparelho, nem no registro de execução. O que
fica guardado é o número da assinatura, a bandeira e os quatro últimos dígitos,
que servem para a pessoa reconhecer o cartão na tela.

**Cancelamento.** Está na mesma tela, sem precisar falar com atendimento. O
aviso do artigo 49 do Código de Defesa do Consumidor aparece antes da
confirmação e de novo depois dela: sete dias para desistir, com devolução
integral.

## 4. Cartão obrigatório no teste grátis

O interruptor existe e está desligado. Em `assinatura.json`, o campo
`cartao_no_teste`. Com ele em `true`, assim que a pessoa termina o cadastro do
negócio a tela de cartão abre sozinha, dentro do sistema.

Deixei desligado de propósito: ligar antes de a chave do Asaas existir
derrubaria todo cadastro novo na primeira tela. Depois de gravar a chave e
fazer um teste de ponta a ponta, troque para `true`.

Vale medir antes de decidir. Cartão obrigatório na entrada reduz cadastro, e o
artigo 49 continua valendo de qualquer jeito, então quem desistir no sétimo dia
é devolvido. A escolha é sua, o sistema faz os dois.

## 5. O que confere se deu certo

Depois de gravar a chave, entre em qualquer conta, abra a assinatura e escolha
Pix. Se o QR Code aparecer, a ligação está funcionando. Se aparecer a frase
sobre a cobrança não estar ligada, a chave não foi lida: confira o nome do
segredo, que diferencia maiúscula de minúscula.
