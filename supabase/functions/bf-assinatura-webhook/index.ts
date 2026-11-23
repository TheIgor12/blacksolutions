import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Aviso de pagamento vindo do Asaas.
 *
 * Sem isto, a liberacao dependeria de a pessoa estar com a tela aberta no
 * momento em que o Pix cai, ou da cobranca mensal seguinte. Com isto, o Asaas
 * avisa, e a validade da conta anda sozinha.
 *
 * Quem pode chamar: so quem apresentar o token combinado no cabecalho
 * asaas-access-token, que e gravado nos dois lados, aqui como segredo
 * ASAAS_WEBHOOK_TOKEN e la no painel do Asaas. Sem token igual, a chamada e
 * recusada e nada muda.
 *
 * Eventos tratados:
 *   PAYMENT_CONFIRMED, PAYMENT_RECEIVED  -> estende a validade em 31 dias
 *   PAYMENT_OVERDUE                      -> marca atraso, sem cortar o acesso
 *   PAYMENT_REFUNDED, PAYMENT_DELETED    -> marca devolucao
 *   SUBSCRIPTION_DELETED                 -> marca cancelamento
 *
 * O corte de acesso por falta de pagamento continua sendo a regra de validade
 * da conta, que ja existe. Aqui nada e apagado.
 */

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TOKEN = Deno.env.get("ASAAS_WEBHOOK_TOKEN") || "";

const ok = (x: unknown, status = 200) =>
  new Response(JSON.stringify(x), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return ok({ erro: "método não permitido" }, 405);
  if (!TOKEN) return ok({ erro: "recebedor não configurado" }, 503);
  if (req.headers.get("asaas-access-token") !== TOKEN) return ok({ erro: "não autorizado" }, 401);

  let evento: Record<string, any>;
  try { evento = await req.json(); } catch { return ok({ erro: "corpo inválido" }, 400); }

  const tipo = String(evento.event || "");
  const pg = evento.payment || evento.subscription || {};
  const clinicaId = String(pg.externalReference || "");
  const adm = createClient(SB_URL, SB_SERVICE, { auth: { persistSession: false } });

  await adm.from("bs_assinatura_eventos").insert({
    clinica_id: clinicaId || null, evento: tipo,
    cobranca: String(pg.id || ""), valor: Number(pg.value || 0),
    bruto: evento,
  });

  if (!clinicaId) return ok({ recebido: true, aviso: "evento sem clínica identificada" });

  const confirma = ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED", "PAYMENT_RECEIVED_IN_CASH"];
  if (confirma.includes(tipo)) {
    const { data: c } = await adm.from("clinicas").select("valido_ate,plano").eq("id", clinicaId).maybeSingle();
    const hoje = new Date();
    const atual = c?.valido_ate ? new Date(c.valido_ate + "T00:00:00") : hoje;
    const partida = atual > hoje ? atual : hoje;
    const novo = new Date(partida.getTime() + 31 * 86400000).toISOString().slice(0, 10);
    const { data: a } = await adm.from("bs_assinaturas").select("plano").eq("clinica_id", clinicaId).maybeSingle();
    await adm.from("clinicas").update({
      valido_ate: novo, ativa: true,
      plano: a?.plano || (c?.plano === "teste" ? "completo" : c?.plano),
    }).eq("id", clinicaId);
    await adm.from("bs_assinaturas").update({
      status: "PAGA", proximo_vencimento: novo, atualizado_em: new Date().toISOString(),
    }).eq("clinica_id", clinicaId);
    return ok({ recebido: true, valido_ate: novo });
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
  return ok({ recebido: true });
});
