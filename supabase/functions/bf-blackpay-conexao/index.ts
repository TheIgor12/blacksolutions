import "jsr:@supabase/functions-js/edge-runtime.d.ts";
/**
 * BlackPay: camada de conexao com os prestadores autorizados.
 *
 * Por que isto existe no servidor e nao no navegador
 * --------------------------------------------------
 * Chave de API de prestador de pagamento nao pode ficar no aplicativo. Quem
 * abre o console do navegador le tudo o que esta la. Entao o aplicativo fala
 * com esta funcao, e so esta funcao conhece as chaves, guardadas como
 * segredo do projeto. O cliente nunca ve credencial nenhuma.
 *
 * O que esta camada respeita, por norma
 * -------------------------------------
 * Resolucao Conjunta CMN/BCB no 16/2025, em vigor desde 28/11/2025, com
 * adequacao ate 31/12/2026, e IN BCB no 754/2026, alterada pela no 776/2026,
 * vigente desde 01/10/2026:
 *   1. a tomadora opera sob a licenca da prestadora, e nao se apresenta como
 *      instituicao financeira independente;
 *   2. a prestadora aparece em todo ponto de contato com o cliente final,
 *      entao toda resposta carrega o campo prestador;
 *   3. e vedada a conta-bolsao: cada cliente final tem conta propria, e esta
 *      funcao recusa qualquer chamada que nao traga o titular individualizado;
 *   4. a palavra banco nao e usada na comunicacao ao consumidor.
 *
 * Estado atual
 * ------------
 * Sem BLACKPAY_MODO igual a producao e sem as chaves do prestador, tudo
 * responde em simulacao, marcado como tal em cada resposta. Nada de dinheiro
 * real se move. No dia em que os contratos com Celcoin e Getnet existirem,
 * basta gravar os segredos e virar o modo: o codigo ja esta aqui.
 */

const h = {
  "Access-Control-Allow-Origin": "https://blackflow.app.br",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "authorization,apikey,content-type,x-client-info",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
const responde = (x: unknown, status = 200) =>
  new Response(JSON.stringify(x), { status, headers: h });

const digitos = (v: unknown) => String(v || "").replace(/\D/g, "");
const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "");

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
  const d1 = calc(v.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calc(v.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d1 === +v[12] && d2 === +v[13];
}

/* ------------------------------------------------------------------ */
/* Configuracao                                                        */
/* ------------------------------------------------------------------ */
const MODO = (Deno.env.get("BLACKPAY_MODO") || "simulacao").toLowerCase();
const PRODUCAO = MODO === "producao";

const PRESTADORES = {
  contas: {
    nome: Deno.env.get("BLACKPAY_CONTAS_NOME") || "Celcoin",
    base: Deno.env.get("BLACKPAY_CONTAS_BASE") || "",
    id: Deno.env.get("BLACKPAY_CONTAS_ID") || "",
    segredo: Deno.env.get("BLACKPAY_CONTAS_SEGREDO") || "",
  },
  cartao: {
    nome: Deno.env.get("BLACKPAY_CARTAO_NOME") || "Getnet",
    base: Deno.env.get("BLACKPAY_CARTAO_BASE") || "",
    id: Deno.env.get("BLACKPAY_CARTAO_ID") || "",
    segredo: Deno.env.get("BLACKPAY_CARTAO_SEGREDO") || "",
  },
} as const;

type Area = keyof typeof PRESTADORES;

function pronto(area: Area) {
  const p = PRESTADORES[area];
  return Boolean(PRODUCAO && p.base && p.id && p.segredo);
}

/* Token OAuth do prestador, guardado em memoria enquanto vale. */
const cacheToken: Record<string, { v: string; ate: number }> = {};
async function token(area: Area): Promise<string> {
  const c = cacheToken[area];
  if (c && c.ate > Date.now() + 30000) return c.v;
  const p = PRESTADORES[area];
  const r = await fetch(p.base.replace(/\/+$/, "") + "/v5/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + btoa(p.id + ":" + p.segredo),
    },
    body: "grant_type=client_credentials",
  });
  if (!r.ok) throw new Error("prestador recusou a autenticacao: " + r.status);
  const j = await r.json();
  const v = String(j.access_token || "");
  if (!v) throw new Error("prestador nao devolveu token");
  cacheToken[area] = { v, ate: Date.now() + Math.max(60, Number(j.expires_in || 300)) * 1000 };
  return v;
}

async function chamar(area: Area, caminho: string, corpo: unknown, metodo = "POST") {
  const p = PRESTADORES[area];
  const t = await token(area);
  const r = await fetch(p.base.replace(/\/+$/, "") + caminho, {
    method: metodo,
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + t },
    body: metodo === "GET" ? undefined : JSON.stringify(corpo),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    return { ok: false, erro: String(j.message || j.error || "o prestador recusou a operacao"), status: r.status };
  }
  return { ok: true, dados: j };
}

/* ------------------------------------------------------------------ */
/* Simulacao                                                           */
/* ------------------------------------------------------------------ */
function simulado(acao: string, entrada: Record<string, unknown>) {
  const id = crypto.randomUUID();
  const agora = new Date().toISOString();
  switch (acao) {
    case "conta.abrir":
      return { conta: { id, titular: entrada.titular, documento: entrada.documento, status: "em_analise", aberta_em: agora } };
    case "conta.saldo":
      return { saldo: { disponivel: 0, bloqueado: 0, moeda: "BRL", em: agora } };
    case "conta.extrato":
      return { extrato: [], em: agora };
    case "pix.cobrar":
      return { cobranca: { id, valor: entrada.valor, status: "simulada", copia_e_cola: "", expira_em: agora } };
    case "cartao.vincular":
      return { terminal: { id, status: "em_analise", vinculado_em: agora } };
    case "cartao.vendas":
      return { vendas: [], em: agora };
    default:
      return { aviso: "acao sem simulacao definida" };
  }
}

/* ------------------------------------------------------------------ */
/* Acoes                                                               */
/* ------------------------------------------------------------------ */
const AREA_DE: Record<string, Area> = {
  "conta.abrir": "contas",
  "conta.saldo": "contas",
  "conta.extrato": "contas",
  "pix.cobrar": "contas",
  "cartao.vincular": "cartao",
  "cartao.vendas": "cartao",
};

const CAMINHO_DE: Record<string, string> = {
  "conta.abrir": "/baas-accountmanager/v1/account/create",
  "conta.saldo": "/baas-walletmanager/v1/wallet/balance",
  "conta.extrato": "/baas-walletmanager/v1/wallet/movement",
  "pix.cobrar": "/pix/v1/collection",
  "cartao.vincular": "/v1/partner/terminal",
  "cartao.vendas": "/v1/payments/summary",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: h });
  if (req.method !== "POST") return responde({ erro: "metodo nao permitido" }, 405);

  let corpo: Record<string, unknown>;
  try {
    corpo = await req.json();
  } catch {
    return responde({ erro: "corpo invalido" }, 400);
  }

  const acao = texto(corpo.acao);
  const area = AREA_DE[acao];
  if (!area) return responde({ erro: "acao desconhecida" }, 400);

  /* Conta-bolsao e vedada: toda operacao de conta exige titular e documento
     individualizados, conferidos aqui antes de sair daqui. */
  if (acao === "conta.abrir") {
    const doc = digitos(corpo.documento);
    const titular = texto(corpo.titular);
    if (!titular || titular.length < 3) {
      return responde({ erro: "informe o titular da conta" }, 400);
    }
    if (!(cpfValido(doc) || cnpjValido(doc))) {
      return responde({ erro: "documento do titular invalido" }, 400);
    }
    if (texto(corpo.tipo) === "bolsao" || corpo.individualizada === false) {
      return responde({
        erro: "conta nao individualizada e vedada pela Resolucao Conjunta CMN/BCB no 16/2025",
      }, 422);
    }
  }

  const prestador = PRESTADORES[area].nome;
  const rodape = {
    prestador,
    aviso: "Serviço de pagamento prestado por " + prestador +
      ", instituição autorizada. A BlackSolutions é fornecedora de tecnologia e não é instituição financeira.",
    modo: PRODUCAO && pronto(area) ? "producao" : "simulacao",
  };

  if (!pronto(area)) {
    return responde({ ok: true, ...rodape, simulado: true, ...simulado(acao, corpo) });
  }

  try {
    const r = await chamar(area, CAMINHO_DE[acao], corpo, acao.endsWith(".saldo") || acao.endsWith(".extrato") || acao.endsWith(".vendas") ? "GET" : "POST");
    if (!r.ok) return responde({ ok: false, ...rodape, erro: r.erro }, 502);
    return responde({ ok: true, ...rodape, simulado: false, ...(r.dados as object) });
  } catch (e) {
    return responde({ ok: false, ...rodape, erro: String((e as Error).message || e) }, 502);
  }
});
