import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Assinatura do BlackFlow, fechada dentro do proprio sistema.
 *
 * Por que no servidor
 * -------------------
 * A chave da conta do Asaas nao pode ficar no aplicativo: quem abre o console
 * do navegador le tudo o que esta la. Entao o aplicativo fala com esta funcao,
 * e so esta funcao conhece a chave, guardada como segredo do projeto.
 *
 * O que entra e o que nao fica
 * ----------------------------
 * Os dados do cartao atravessam esta funcao uma unica vez, no caminho para o
 * Asaas, e nao sao gravados em lugar nenhum, nem no banco, nem no registro de
 * execucao. O que volta e fica guardado e apenas o numero da assinatura, a
 * bandeira e os quatro ultimos digitos, que servem para a pessoa reconhecer o
 * cartao na tela. O Asaas e quem guarda o cartao, sob a responsabilidade dele.
 *
 * Direito de arrependimento
 * -------------------------
 * O artigo 49 do Codigo de Defesa do Consumidor da sete dias para desistir de
 * compra feita fora do estabelecimento. A funcao aceita o cancelamento pela
 * acao "cancelar", sem passar por atendimento, e a tela avisa o prazo antes da
 * confirmacao.
 *
 * Sem a chave do Asaas, toda resposta volta com configurado:false, e a tela
 * continua oferecendo o caminho antigo. Nada cobra ninguem por engano.
 */

const h = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "authorization,apikey,content-type,x-client-info",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
const responde = (x: unknown, status = 200) =>
  new Response(JSON.stringify(x), { status, headers: h });

const dig = (v: unknown) => String(v ?? "").replace(/\D/g, "");
const txt = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/* A chave pode vir de duas fontes: do segredo do projeto, ou da tabela
   bs_config_pagamento, gravada pelo painel da BlackSolutions. A segunda existe
   para a configuracao inteira caber dentro do sistema, sem ninguem precisar
   abrir o painel do Supabase. A tabela e fechada por RLS: ninguem le por fora,
   so o servidor, com a chave de servico. */
let CHAVE = Deno.env.get("ASAAS_CHAVE") || "";
let BASE = (Deno.env.get("ASAAS_BASE") || "https://api.asaas.com/v3").replace(/\/+$/, "");
let lidoDoBanco = false;

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function cpfValido(v: string) {
  if (!/^\d{11}$/.test(v) || /^(\d)\1{10}$/.test(v)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += +v[i] * (10 - i);
  let d = ((s * 10) % 11) % 10;
  if (d !== +v[9]) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += +v[i] * (11 - i);
  d = ((s * 10) % 11) % 10;
  return d === +v[10];
}
function cnpjValido(v: string) {
  if (!/^\d{14}$/.test(v) || /^(\d)\1{13}$/.test(v)) return false;
  const calc = (base: string, pesos: number[]) => {
    const s = base.split("").reduce((a, c, i) => a + +c * pesos[i], 0);
    const r = s % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(v.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === +v[12] &&
    calc(v.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === +v[13];
}

async function carregarChave(adm: any) {
  if (CHAVE || lidoDoBanco) return;
  lidoDoBanco = true;
  const { data } = await adm.from("bs_config_pagamento").select("chave,base").eq("id", 1).maybeSingle();
  if (data?.chave) CHAVE = String(data.chave);
  if (data?.base) BASE = String(data.base).replace(/\/+$/, "");
}
function configurado() { return CHAVE.length > 20; }

async function asaas(caminho: string, metodo = "GET", corpo?: unknown) {
  const r = await fetch(BASE + caminho, {
    method: metodo,
    headers: {
      "Content-Type": "application/json",
      "access_token": CHAVE,
      "User-Agent": "BlackFlow",
    },
    body: metodo === "GET" || metodo === "DELETE" ? undefined : JSON.stringify(corpo ?? {}),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = (j?.errors && j.errors[0] && j.errors[0].description) || j?.message || "o Asaas recusou a operação";
    throw new Error(String(e));
  }
  return j;
}

/* Preços por módulo. A tela mostra o valor, o servidor é quem decide. */
const PLANOS: Record<string, { nome: string; valor: number }> = {
  agenda: { nome: "Só agenda", valor: 29.9 },
  barbearia: { nome: "Barbearia", valor: 34.9 },
  completo: { nome: "Completo", valor: 79.9 },
  podologia: { nome: "Podologia", valor: 79.9 },
  biomedicina: { nome: "Biomedicina", valor: 104.9 },
  odontologia: { nome: "Odontologia", valor: 114.9 },
};

function amanha(dias = 0) {
  const d = new Date(Date.now() + dias * 86400000);
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: h });
  if (req.method !== "POST") return responde({ erro: "método não permitido" }, 405);

  let corpo: Record<string, unknown>;
  try { corpo = await req.json(); } catch { return responde({ erro: "corpo inválido" }, 400); }

  const acao = txt(corpo.acao);
  const autorizacao = req.headers.get("Authorization") || "";
  if (!autorizacao.startsWith("Bearer ")) return responde({ erro: "faça login primeiro" }, 401);

  /* Quem está chamando, e de qual clínica é administrador. */
  const comoUsuario = createClient(SB_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: autorizacao } },
  });
  const { data: u } = await comoUsuario.auth.getUser();
  if (!u?.user) return responde({ erro: "sessão expirada, entre de novo" }, 401);

  const adm = createClient(SB_URL, SB_SERVICE, { auth: { persistSession: false } });
  await carregarChave(adm);
  const clinicaId = txt(corpo.clinica);
  if (!clinicaId) return responde({ erro: "clínica não informada" }, 400);

  const { data: membro } = await adm.from("membros")
    .select("papel").eq("clinica_id", clinicaId).eq("user_id", u.user.id).maybeSingle();
  if (!membro || membro.papel !== "admin") {
    return responde({ erro: "só o administrador da conta pode tratar da assinatura" }, 403);
  }

  const { data: clinica } = await adm.from("clinicas")
    .select("nome,plano,valido_ate,cpf_responsavel,cnpj,celular_responsavel,razao_social")
    .eq("id", clinicaId).maybeSingle();
  if (!clinica) return responde({ erro: "clínica não encontrada" }, 404);

  const { data: assinatura } = await adm.from("bs_assinaturas")
    .select("*").eq("clinica_id", clinicaId).maybeSingle();

  if (acao === "estado") {
    return responde({
      ok: true, configurado: configurado(),
      planos: PLANOS,
      assinatura: assinatura
        ? {
          status: assinatura.status, plano: assinatura.plano, valor: assinatura.valor,
          forma: assinatura.forma, cartao: assinatura.cartao_mascara,
          proxima: assinatura.proximo_vencimento, criada_em: assinatura.criado_em,
        }
        : null,
      clinica: { nome: clinica.nome, plano: clinica.plano, valido_ate: clinica.valido_ate },
    });
  }

  if (!configurado()) {
    return responde({
      ok: false, configurado: false,
      erro: "A cobrança dentro do sistema ainda não foi ligada. Falta gravar a chave da conta do Asaas nos segredos do projeto.",
    }, 503);
  }

  /* ---------- Cliente no Asaas, um por clínica ---------- */
  async function clienteAsaas(dados: Record<string, unknown>) {
    if (assinatura?.asaas_cliente) return String(assinatura.asaas_cliente);
    const doc = dig(dados.documento) || dig(clinica.cnpj) || dig(clinica.cpf_responsavel);
    if (!(cpfValido(doc) || cnpjValido(doc))) {
      throw new Error("Informe um CPF ou CNPJ válido para emitir a cobrança.");
    }
    const achado = await asaas("/customers?cpfCnpj=" + doc);
    if (achado?.data?.length) return String(achado.data[0].id);
    const novo = await asaas("/customers", "POST", {
      name: txt(dados.nome) || clinica.razao_social || clinica.nome,
      cpfCnpj: doc,
      email: u!.user!.email,
      mobilePhone: dig(dados.celular) || dig(clinica.celular_responsavel) || undefined,
      postalCode: dig(dados.cep) || undefined,
      addressNumber: txt(dados.numero) || undefined,
      externalReference: clinicaId,
      notificationDisabled: false,
    });
    return String(novo.id);
  }

  /* Guarda contra cobranca dobrada.
     A conta do Asaas ja tem assinaturas criadas por link de pagamento, de
     antes desta tela existir. Se a pessoa clicar em assinar aqui, uma segunda
     assinatura nasceria para o mesmo cliente, e ela pagaria duas vezes todo
     mes sem perceber. Entao, antes de criar qualquer coisa, procuramos uma
     assinatura ativa do mesmo cliente. Havendo, ela e reaproveitada: no Pix,
     devolvemos a cobranca em aberto que ja existe; no cartao, avisamos em vez
     de criar outra. */
  async function assinaturaAtivaDe(cliente: string) {
    const r = await asaas("/subscriptions?customer=" + encodeURIComponent(cliente) + "&status=ACTIVE");
    const lista = (r?.data || []) as Record<string, unknown>[];
    if (!lista.length) return null;
    /* A da propria clinica vem primeiro; qualquer outra ativa tambem conta. */
    return lista.find((x) => String(x.externalReference || "") === clinicaId) || lista[0];
  }

  async function gravar(campos: Record<string, unknown>) {
    await adm.from("bs_assinaturas").upsert({
      clinica_id: clinicaId, atualizado_em: new Date().toISOString(), ...campos,
    }, { onConflict: "clinica_id" });
  }

  const plano = txt(corpo.plano) || txt(clinica.plano) || "completo";
  const P = PLANOS[plano] || PLANOS.completo;

  try {
    /* ---------- Pix ---------- */
    if (acao === "pix") {
      const cliente = await clienteAsaas(corpo);
      const jaTem = await assinaturaAtivaDe(cliente);
      const assin = jaTem || await asaas("/subscriptions", "POST", {
        customer: cliente,
        billingType: "PIX",
        value: P.valor,
        nextDueDate: amanha(0),
        cycle: "MONTHLY",
        description: "BlackFlow " + P.nome + " · " + clinica.nome,
        externalReference: clinicaId,
      });
      const pagamentos = await asaas("/subscriptions/" + assin.id + "/payments");
      const pg = pagamentos?.data?.[0];
      if (!pg) throw new Error("o Asaas não gerou a cobrança");
      const qr = await asaas("/payments/" + pg.id + "/pixQrCode");
      await gravar({
        asaas_cliente: cliente, asaas_assinatura: assin.id, asaas_cobranca: pg.id,
        plano, valor: P.valor, forma: "pix", status: pg.status || "PENDING",
        proximo_vencimento: pg.dueDate || amanha(0), criado_em: assinatura?.criado_em || new Date().toISOString(),
      });
      return responde({
        ok: true, configurado: true, forma: "pix", reaproveitada: !!jaTem,
        cobranca: pg.id, valor: Number(assin.value || P.valor), plano: P.nome,
        copia_e_cola: qr?.payload || "", imagem: qr?.encodedImage || "",
        expira_em: qr?.expirationDate || "",
      });
    }

    /* ---------- Cartão de crédito ---------- */
    if (acao === "cartao") {
      const c = (corpo.cartao || {}) as Record<string, unknown>;
      const numero = dig(c.numero);
      const mes = dig(c.mes).padStart(2, "0");
      const ano = dig(c.ano).length === 2 ? "20" + dig(c.ano) : dig(c.ano);
      const ccv = dig(c.ccv);
      const doc = dig(corpo.documento) || dig(clinica.cnpj) || dig(clinica.cpf_responsavel);

      if (numero.length < 13 || numero.length > 19) return responde({ erro: "Confira o número do cartão." }, 400);
      if (+mes < 1 || +mes > 12) return responde({ erro: "Confira o mês de validade." }, 400);
      if (ano.length !== 4) return responde({ erro: "Confira o ano de validade." }, 400);
      if (ccv.length < 3) return responde({ erro: "Confira o código de segurança." }, 400);
      if (!txt(c.titular)) return responde({ erro: "Informe o nome impresso no cartão." }, 400);
      if (!(cpfValido(doc) || cnpjValido(doc))) return responde({ erro: "Informe um CPF ou CNPJ válido do titular." }, 400);
      if (!dig(corpo.cep)) return responde({ erro: "Informe o CEP do titular." }, 400);
      if (!txt(corpo.numero)) return responde({ erro: "Informe o número do endereço do titular." }, 400);

      const cliente = await clienteAsaas(corpo);
      const jaTem = await assinaturaAtivaDe(cliente);
      if (jaTem && !corpo.forcar) {
        await gravar({
          asaas_cliente: cliente, asaas_assinatura: String(jaTem.id), plano,
          valor: Number(jaTem.value || P.valor), forma: "cartao", status: "ACTIVE",
          proximo_vencimento: String(jaTem.nextDueDate || ""),
          criado_em: assinatura?.criado_em || new Date().toISOString(),
        });
        return responde({
          ok: true, configurado: true, forma: "cartao", reaproveitada: true, pago: true,
          assinatura: String(jaTem.id), proxima: jaTem.nextDueDate || null,
          aviso: "Já existe uma assinatura ativa neste CPF ou CNPJ, no valor de R$ " +
            String(jaTem.value).replace(".", ",") + ", com próxima cobrança em " +
            String(jaTem.nextDueDate || "") + ". Nenhuma cobrança nova foi criada.",
        });
      }
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

      const assin = await asaas("/subscriptions", "POST", {
        customer: cliente,
        billingType: "CREDIT_CARD",
        value: P.valor,
        nextDueDate: txt(corpo.primeiro_vencimento) || amanha(0),
        cycle: "MONTHLY",
        description: "BlackFlow " + P.nome + " · " + clinica.nome,
        externalReference: clinicaId,
        creditCard: {
          holderName: txt(c.titular),
          number: numero,
          expiryMonth: mes,
          expiryYear: ano,
          ccv: ccv,
        },
        creditCardHolderInfo: {
          name: txt(c.titular),
          email: u!.user!.email,
          cpfCnpj: doc,
          postalCode: dig(corpo.cep),
          addressNumber: txt(corpo.numero),
          addressComplement: txt(corpo.complemento) || null,
          phone: dig(corpo.celular) || dig(clinica.celular_responsavel) || undefined,
          mobilePhone: dig(corpo.celular) || dig(clinica.celular_responsavel) || undefined,
        },
        remoteIp: ip,
      });

      const bandeira = txt(assin?.creditCard?.creditCardBrand);
      const ultimos = txt(assin?.creditCard?.creditCardNumber);
      await gravar({
        asaas_cliente: cliente, asaas_assinatura: assin.id,
        plano, valor: P.valor, forma: "cartao", status: assin.status || "ACTIVE",
        cartao_mascara: (bandeira ? bandeira + " " : "") + (ultimos ? "•••• " + ultimos : ""),
        proximo_vencimento: assin.nextDueDate || amanha(0),
        criado_em: assinatura?.criado_em || new Date().toISOString(),
      });

      /* A primeira cobrança do ciclo diz se o cartão passou. */
      const pagamentos = await asaas("/subscriptions/" + assin.id + "/payments");
      const pg = pagamentos?.data?.[0];
      const pago = pg && ["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"].includes(String(pg.status));
      if (pago) {
        await adm.from("clinicas").update({
          plano, ativa: true,
          valido_ate: new Date(Date.now() + 31 * 86400000).toISOString().slice(0, 10),
        }).eq("id", clinicaId);
      }
      return responde({
        ok: true, configurado: true, forma: "cartao",
        assinatura: assin.id, status: pg?.status || assin.status, pago: !!pago,
        cartao: (bandeira ? bandeira + " " : "") + (ultimos ? "•••• " + ultimos : ""),
        proxima: assin.nextDueDate || null,
      });
    }

    /* ---------- Conferir se o Pix caiu ---------- */
    if (acao === "conferir") {
      if (!assinatura?.asaas_cobranca) return responde({ ok: true, pago: false, status: "sem cobrança" });
      const pg = await asaas("/payments/" + assinatura.asaas_cobranca);
      const pago = ["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"].includes(String(pg.status));
      await gravar({ status: pg.status });
      if (pago) {
        await adm.from("clinicas").update({
          plano: assinatura.plano || plano, ativa: true,
          valido_ate: new Date(Date.now() + 31 * 86400000).toISOString().slice(0, 10),
        }).eq("id", clinicaId);
      }
      return responde({ ok: true, pago, status: pg.status });
    }

    /* ---------- Histórico de cobranças, para a tela do assinante ---------- */
    if (acao === "historico") {
      if (!assinatura?.asaas_assinatura) return responde({ ok: true, cobrancas: [] });
      const r = await asaas("/subscriptions/" + assinatura.asaas_assinatura + "/payments");
      const cobrancas = ((r?.data || []) as Record<string, unknown>[]).map((p) => ({
        id: p.id, valor: p.value, status: p.status, forma: p.billingType,
        vencimento: p.dueDate, pago: p.paymentDate || p.clientPaymentDate || null,
        descricao: p.description || "",
      }));
      return responde({ ok: true, cobrancas });
    }

    /* ---------- Cancelamento, inclusive o arrependimento de sete dias ---------- */
    if (acao === "cancelar") {
      if (!assinatura?.asaas_assinatura) return responde({ ok: true, cancelada: true });
      await asaas("/subscriptions/" + assinatura.asaas_assinatura, "DELETE");
      await gravar({ status: "CANCELADA", cancelado_em: new Date().toISOString() });
      return responde({
        ok: true, cancelada: true,
        aviso: "Assinatura cancelada. Dentro de sete dias da contratação, o valor já pago é devolvido na forma do artigo 49 do Código de Defesa do Consumidor.",
      });
    }

    return responde({ erro: "ação desconhecida" }, 400);
  } catch (e) {
    return responde({ ok: false, erro: String((e as Error).message || e) }, 502);
  }
});
