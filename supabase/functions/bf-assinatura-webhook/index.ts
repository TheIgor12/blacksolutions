import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Aviso de pagamento vindo do Asaas.
 *
 * Sem isto, a liberacao dependeria de a pessoa estar com a tela aberta no
 * momento em que o Pix cai, ou da cobranca mensal seguinte. Com isto, o Asaas
 * avisa, e a validade da conta anda sozinha.
 *
 * Por que nao existe token combinado
 * ----------------------------------
 * O caminho comum seria combinar uma senha com o Asaas e conferir no cabecalho.
 * Isso obriga a pessoa a inventar um texto e grava-lo em dois lugares, e, pior,
 * faz a liberacao depender do que veio escrito na chamada. Aqui o corpo da
 * chamada nao e acreditado em nada: ele serve so de aviso de que algo mudou.
 * A funcao pega o numero da cobranca, pergunta ao proprio Asaas, com a chave
 * da conta, qual e a situacao de verdade, e so entao mexe na validade.
 *
 * Quem quiser forjar uma confirmacao nao consegue: a resposta que vale e a do
 * Asaas, nao a de quem chamou. Numero de cobranca que nao existe, ou que
 * existe e nao esta paga, nao libera nada.
 *
 * Se ainda assim for gravado o segredo ASAAS_WEBHOOK_TOKEN, a conferencia do
 * cabecalho volta a valer, somada a confirmacao na origem.
 *
 * Eventos tratados:
 *   pagamento confirmado ou recebido -> estende a validade em 31 dias
 *   pagamento vencido                -> marca atraso, sem cortar o acesso
 *   pagamento estornado ou apagado   -> marca devolucao
 *   assinatura removida              -> marca cancelamento
 *
 * O corte de acesso por falta de pagamento continua sendo a regra de validade
 * da conta, que ja existe. Aqui nada e apagado.
 */

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TOKEN = Deno.env.get("ASAAS_WEBHOOK_TOKEN") || "";
let CHAVE = Deno.env.get("ASAAS_CHAVE") || "";
let BASE = (Deno.env.get("ASAAS_BASE") || "https://api.asaas.com/v3").replace(/\/+$/, "");

const ok = (x: unknown, status = 200) =>
  new Response(JSON.stringify(x), { status, headers: { "Content-Type": "application/json" } });

async function asaas(caminho: string) {
  const r = await fetch(BASE + caminho, {
    headers: { "access_token": CHAVE, "User-Agent": "BlackFlow" },
  });
  if (!r.ok) return null;
  return await r.json().catch(() => null);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return ok({ erro: "método não permitido" }, 405);

  const adm0 = createClient(SB_URL, SB_SERVICE, { auth: { persistSession: false } });
  if (!CHAVE) {
    /* A chave pode estar gravada pelo painel, e não como segredo do projeto. */
    const { data } = await adm0.from("bs_config_pagamento").select("chave,base").eq("id", 1).maybeSingle();
    if (data?.chave) CHAVE = String(data.chave);
    if (data?.base) BASE = String(data.base).replace(/\/+$/, "");
  }
  if (!CHAVE) return ok({ erro: "recebedor sem a chave do prestador" }, 503);

  /* Conferência de cabeçalho, apenas se o segredo existir. */
  if (TOKEN && req.headers.get("asaas-access-token") !== TOKEN) {
    return ok({ erro: "não autorizado" }, 401);
  }

  let evento: Record<string, any>;
  try { evento = await req.json(); } catch { return ok({ erro: "corpo inválido" }, 400); }

  const tipo = String(evento.event || "");
  const avisado = evento.payment || evento.subscription || {};
  const adm = adm0;

  /* O corpo é só aviso. A verdade vem do Asaas. */
  let cobranca: Record<string, any> | null = null;
  if (avisado.id && String(avisado.id).startsWith("pay_")) {
    cobranca = await asaas("/payments/" + encodeURIComponent(String(avisado.id)));
  }
  const fonte = cobranca || avisado;
  const clinicaId = String(fonte.externalReference || avisado.externalReference || "");
  const situacao = String(fonte.status || "");

  await adm.from("bs_assinatura_eventos").insert({
    clinica_id: clinicaId || null,
    evento: tipo,
    cobranca: String(fonte.id || ""),
    valor: Number(fonte.value || 0),
    bruto: { aviso: evento, conferido: cobranca ? { id: fonte.id, status: situacao, value: fonte.value } : null },
  });

  if (!clinicaId) return ok({ recebido: true, aviso: "evento sem clínica identificada" });

  const pago = ["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"].includes(situacao);
  const anunciaPagamento = ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED", "PAYMENT_RECEIVED_IN_CASH"].includes(tipo);

  if (anunciaPagamento) {
    /* Só libera quando o próprio Asaas confirma a situação da cobrança. */
    if (!cobranca || !pago) {
      return ok({ recebido: true, liberado: false, motivo: "o prestador não confirmou o pagamento", situacao });
    }
    /* Cada cobranca estende a validade uma vez so. O Asaas reenvia aviso
       quando a resposta demora ou falha, e sem esta trava o mesmo pagamento
       daria dois meses de acesso. */
    const { data: jaLiberado } = await adm.from("bs_assinatura_eventos")
      .select("id").eq("cobranca", String(fonte.id)).eq("liberou", true).limit(1);
    if (jaLiberado && jaLiberado.length) {
      return ok({ recebido: true, liberado: false, motivo: "esta cobrança já havia sido liberada" });
    }
    const { data: c } = await adm.from("clinicas").select("valido_ate,plano").eq("id", clinicaId).maybeSingle();
    if (!c) return ok({ recebido: true, liberado: false, motivo: "clínica não encontrada" });
    const hoje = new Date();
    const atual = c.valido_ate ? new Date(c.valido_ate + "T00:00:00") : hoje;
    const partida = atual > hoje ? atual : hoje;
    const novo = new Date(partida.getTime() + 31 * 86400000).toISOString().slice(0, 10);
    const { data: a } = await adm.from("bs_assinaturas").select("plano").eq("clinica_id", clinicaId).maybeSingle();
    await adm.from("clinicas").update({
      valido_ate: novo, ativa: true,
      plano: a?.plano || (c.plano === "teste" ? "completo" : c.plano),
    }).eq("id", clinicaId);
    await adm.from("bs_assinaturas").update({
      status: "PAGA", proximo_vencimento: novo, atualizado_em: new Date().toISOString(),
    }).eq("clinica_id", clinicaId);
    await adm.from("bs_assinatura_eventos").update({ liberou: true })
      .eq("clinica_id", clinicaId).eq("cobranca", String(fonte.id)).eq("evento", tipo);
    return ok({ recebido: true, liberado: true, valido_ate: novo });
  }

  const marca: Record<string, string> = {
    PAYMENT_OVERDUE: "EM_ATRASO",
    PAYMENT_REFUNDED: "DEVOLVIDA",
    PAYMENT_DELETED: "CANCELADA",
    SUBSCRIPTION_DELETED: "CANCELADA",
  };
  if (marca[tipo]) {
    await adm.from("bs_assinaturas").update({
      status: marca[tipo], atualizado_em: new Date().toISOString(),
    }).eq("clinica_id", clinicaId);
  }
  return ok({ recebido: true, marcado: marca[tipo] || null });
});
