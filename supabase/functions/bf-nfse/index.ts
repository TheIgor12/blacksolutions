import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * BlackFlow: emissao de NFS-e de dentro do sistema.
 *
 * Por que por integrador
 * ----------------------
 * Emitir NFS-e exige certificado digital e-CNPJ, XML assinado em ICP-Brasil,
 * conexao mTLS com a SEFIN Nacional ou com o municipio, e credenciamento. Nada
 * disso se escreve em codigo: contrata-se de quem ja tem homologado. Esta
 * funcao fala com esse prestador, guarda a chave no servidor e devolve ao
 * aplicativo o numero da nota, o codigo de verificacao, o link, o PDF e o XML.
 *
 * Adaptador atual: Focus NFe.
 *   Ambiente Nacional, padrao DPS:  POST {base}/v2/nfsen?ref=...
 *   Municipio legado:               POST {base}/v2/nfse?ref=...
 *   Consulta:  GET {base}/v2/nfse(n)/{ref}
 *   Cancelamento: DELETE {base}/v2/nfse(n)/{ref}  com justificativa
 *   Autenticacao: HTTP Basic, token no usuario e senha vazia.
 *   Bases: https://api.focusnfe.com.br e https://homologacao.focusnfe.com.br
 *
 * O que esta funcao nunca faz
 * ---------------------------
 * Nunca diz que uma nota foi autorizada sem o retorno oficial do prestador.
 * Sem chave, sem cadastro fiscal completo ou sem certificado la na ponta, ela
 * recusa e diz exatamente o que falta. Nota fiscal inventada e crime, e quem
 * responderia seria a clinica que confiou na tela.
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
const num = (v: unknown) => {
  const n = Number(String(v ?? "").toString().replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function cpfValido(v: string) {
  if (!/^\d{11}$/.test(v) || /^(\d)\1{10}$/.test(v)) return false;
  const c = (n: number) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += +v[i] * (n + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return c(9) === +v[9] && c(10) === +v[10];
}
function cnpjValido(v: string) {
  if (!/^\d{14}$/.test(v) || /^(\d)\1{13}$/.test(v)) return false;
  const c = (len: number) => {
    let s = 0, p = len - 7;
    for (let i = 0; i < len; i++) { s += +v[i] * p--; if (p < 2) p = 9; }
    const r = s % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return c(12) === +v[12] && c(13) === +v[13];
}

/* ------------------------------------------------------------------ */
/* Configuracao do integrador                                          */
/* ------------------------------------------------------------------ */
type Conf = { integrador: string; token: string; ambiente: string };

async function configIntegrador(adm: any): Promise<Conf> {
  let token = Deno.env.get("NFSE_TOKEN") || "";
  let integrador = (Deno.env.get("NFSE_INTEGRADOR") || "focusnfe").toLowerCase();
  let ambiente = (Deno.env.get("NFSE_AMBIENTE") || "").toLowerCase();
  if (!token) {
    const { data } = await adm.from("bs_config_fiscal").select("token,integrador,ambiente").eq("id", 1).maybeSingle();
    if (data?.token) {
      token = String(data.token);
      integrador = String(data.integrador || "focusnfe").toLowerCase();
      ambiente = String(data.ambiente || "homologacao").toLowerCase();
    }
  }
  if (!ambiente) ambiente = "homologacao";
  return { integrador, token, ambiente };
}

function baseFocus(ambiente: string) {
  return ambiente === "producao"
    ? "https://api.focusnfe.com.br"
    : "https://homologacao.focusnfe.com.br";
}

async function focus(conf: Conf, caminho: string, metodo = "GET", corpo?: unknown) {
  const r = await fetch(baseFocus(conf.ambiente) + caminho, {
    method: metodo,
    headers: {
      "Authorization": "Basic " + btoa(conf.token + ":"),
      "Content-Type": "application/json",
      "User-Agent": "BlackFlow",
    },
    body: metodo === "GET" ? undefined : JSON.stringify(corpo ?? {}),
  });
  const bruto = await r.text();
  let j: any = null;
  try { j = bruto ? JSON.parse(bruto) : null; } catch { j = { bruto }; }
  return { status: r.status, ok: r.ok, dados: j };
}

/* ------------------------------------------------------------------ */
/* O que impede a emissao                                              */
/* ------------------------------------------------------------------ */
function impedimentos(cfg: any, conf: Conf, nota: any): string[] {
  const falta: string[] = [];
  if (!conf.token) falta.push("A chave do integrador fiscal não foi gravada no painel da BlackSolutions.");
  if (!cfg) { falta.push("Esta clínica ainda não tem cadastro fiscal."); return falta; }
  if (!cnpjValido(dig(cfg.cnpj))) falta.push("O CNPJ do cadastro fiscal está ausente ou inválido.");
  if (!/^\d{7}$/.test(String(cfg.municipio_ibge || ""))) falta.push("Falta o código IBGE do município no cadastro fiscal.");
  if (!txt(cfg.ctrib_nacional) && !txt(cfg.codigo_servico)) {
    falta.push("Falta o código de tributação nacional do serviço, ou o item da lista de serviços, no cadastro fiscal.");
  }
  if (nota) {
    if (!txt(nota.descricao_servico)) falta.push("A nota está sem a descrição do serviço.");
    if (num(nota.valor) <= 0) falta.push("A nota está sem valor.");
    const doc = dig(nota.tomador_documento);
    if (doc && !(cpfValido(doc) || cnpjValido(doc))) falta.push("O CPF ou CNPJ do tomador não é válido.");
    if (!txt(nota.tomador_nome)) falta.push("A nota está sem o nome do tomador.");
  }
  return falta;
}

/* ------------------------------------------------------------------ */
/* Montagem do pedido                                                  */
/* ------------------------------------------------------------------ */
function hojeISO() {
  return new Date().toISOString().slice(0, 19);
}

/* Ambiente Nacional, padrao DPS: campos num nivel so. */
function pedidoNacional(cfg: any, nota: any) {
  const doc = dig(nota.tomador_documento);
  const p: Record<string, unknown> = {
    data_emissao: hojeISO(),
    data_competencia: String(nota.competencia || new Date().toISOString().slice(0, 10)),
    cnpj_prestador: dig(cfg.cnpj),
    codigo_municipio_emissora: String(cfg.municipio_ibge),
    codigo_municipio_prestacao: String(nota.municipio_prestacao_ibge || cfg.municipio_incidencia_ibge || cfg.municipio_ibge),
    codigo_opcao_simples_nacional: cfg.simples_nacional ? 1 : 3,
    codigo_tributacao_nacional_iss: txt(nota.codigo_tributacao_nacional) || txt(cfg.ctrib_nacional),
    descricao_servico: txt(nota.descricao_servico),
    valor_servico: num(nota.valor),
    tributacao_iss: 1,
    tipo_retencao_iss: nota.retencao_iss ? 1 : 2,
  };
  if (txt(cfg.inscricao_municipal)) p.inscricao_municipal_prestador = txt(cfg.inscricao_municipal);
  if (txt(cfg.ctrib_municipal)) p.codigo_tributacao_municipal_iss = txt(cfg.ctrib_municipal);
  if (txt(cfg.codigo_nbs) || txt(nota.codigo_nbs)) p.codigo_nbs = txt(nota.codigo_nbs) || txt(cfg.codigo_nbs);
  if (txt(cfg.regime_especial)) p.regime_especial_tributacao = txt(cfg.regime_especial);

  if (doc.length === 14) p.cnpj_tomador = doc;
  else if (doc.length === 11) p.cpf_tomador = doc;
  if (txt(nota.tomador_nome)) p.razao_social_tomador = txt(nota.tomador_nome);
  if (txt(nota.tomador_email)) p.email_tomador = txt(nota.tomador_email);
  if (dig(nota.tomador_cep)) p.cep_tomador = dig(nota.tomador_cep);
  if (txt(nota.tomador_logradouro)) p.logradouro_tomador = txt(nota.tomador_logradouro);
  if (txt(nota.tomador_numero)) p.numero_tomador = txt(nota.tomador_numero);
  if (txt(nota.tomador_bairro)) p.bairro_tomador = txt(nota.tomador_bairro);
  if (/^\d{7}$/.test(String(nota.tomador_municipio_ibge || ""))) {
    p.codigo_municipio_tomador = Number(nota.tomador_municipio_ibge);
  }
  if (txt(nota.informacoes_adicionais)) p.informacoes_complementares = txt(nota.informacoes_adicionais);
  return p;
}

/* Municipio ainda no padrao antigo: objetos aninhados. */
function pedidoMunicipal(cfg: any, nota: any) {
  const doc = dig(nota.tomador_documento);
  const tomador: Record<string, unknown> = { razao_social: txt(nota.tomador_nome) };
  if (doc.length === 14) tomador.cnpj = doc;
  else if (doc.length === 11) tomador.cpf = doc;
  if (txt(nota.tomador_email)) tomador.email = txt(nota.tomador_email);
  if (txt(nota.tomador_logradouro)) {
    tomador.endereco = {
      logradouro: txt(nota.tomador_logradouro),
      numero: txt(nota.tomador_numero) || "S/N",
      bairro: txt(nota.tomador_bairro),
      codigo_municipio: String(nota.tomador_municipio_ibge || cfg.municipio_ibge),
      uf: txt(nota.tomador_uf),
      cep: dig(nota.tomador_cep),
    };
  }
  return {
    data_emissao: hojeISO(),
    natureza_operacao: "1",
    optante_simples_nacional: !!cfg.simples_nacional,
    prestador: {
      cnpj: dig(cfg.cnpj),
      inscricao_municipal: txt(cfg.inscricao_municipal),
      codigo_municipio: String(cfg.municipio_ibge),
    },
    tomador,
    servico: {
      discriminacao: txt(nota.descricao_servico),
      valor_servicos: num(nota.valor),
      iss_retido: !!nota.retencao_iss,
      item_lista_servico: txt(nota.codigo_servico) || txt(cfg.codigo_servico),
      codigo_tributario_municipio: txt(cfg.ctrib_municipal) || undefined,
      aliquota: cfg.aliquota != null ? num(cfg.aliquota) : undefined,
    },
  };
}

function rotaDe(cfg: any) {
  /* O modelo nacional e o padrao. O municipal entra quando o cadastro diz. */
  return String(cfg.modelo_integracao || cfg.integrador || "").toLowerCase() === "municipal"
    ? "/v2/nfse" : "/v2/nfsen";
}

/* ------------------------------------------------------------------ */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: h });
  if (req.method !== "POST") return responde({ erro: "método não permitido" }, 405);

  let corpo: Record<string, unknown>;
  try { corpo = await req.json(); } catch { return responde({ erro: "corpo inválido" }, 400); }

  const acao = txt(corpo.acao);
  const autorizacao = req.headers.get("Authorization") || "";
  if (!autorizacao.startsWith("Bearer ")) return responde({ erro: "faça login primeiro" }, 401);

  const comoUsuario = createClient(SB_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: autorizacao } },
  });
  const { data: u } = await comoUsuario.auth.getUser();
  if (!u?.user) return responde({ erro: "sessão expirada, entre de novo" }, 401);

  const adm = createClient(SB_URL, SB_SERVICE, { auth: { persistSession: false } });
  const clinicaId = txt(corpo.clinica);
  if (!clinicaId) return responde({ erro: "clínica não informada" }, 400);

  const { data: membro } = await adm.from("membros")
    .select("papel").eq("clinica_id", clinicaId).eq("user_id", u.user.id).maybeSingle();
  if (!membro || membro.papel !== "admin") {
    return responde({ erro: "só o administrador da clínica pode emitir nota fiscal" }, 403);
  }

  const conf = await configIntegrador(adm);
  const { data: cfg } = await adm.from("bf_fiscal_config").select("*").eq("clinica_id", clinicaId).maybeSingle();

  /* ---------------- Situação ---------------- */
  if (acao === "estado") {
    const falta = impedimentos(cfg, conf, null);
    return responde({
      ok: true,
      configurado: !!conf.token,
      integrador: conf.integrador,
      ambiente: conf.ambiente,
      pode_emitir: falta.length === 0,
      impedimentos: falta,
      rota: cfg ? rotaDe(cfg) : null,
    });
  }

  const notaId = txt(corpo.nota);
  if (!notaId) return responde({ erro: "nota não informada" }, 400);
  const { data: nota } = await adm.from("bf_fiscal_notas")
    .select("*").eq("id", notaId).eq("clinica_id", clinicaId).maybeSingle();
  if (!nota) return responde({ erro: "rascunho não encontrado" }, 404);

  /* ---------------- Emissão ---------------- */
  if (acao === "emitir") {
    const falta = impedimentos(cfg, conf, nota);
    if (falta.length) {
      await adm.from("bf_fiscal_notas").update({
        bloqueio_emissao_motivo: falta.join(" "), atualizado_em: new Date().toISOString(),
      }).eq("id", notaId);
      return responde({ ok: false, pode_emitir: false, impedimentos: falta }, 422);
    }
    if (["autorizada", "processando"].includes(String(nota.status))) {
      return responde({ ok: true, ja: true, status: nota.status, numero: nota.numero_nfse });
    }

    const ref = txt(nota.integracao_referencia) || ("bf-" + String(notaId).replace(/-/g, "").slice(0, 24));
    const rota = rotaDe(cfg);
    const pedido = rota === "/v2/nfse" ? pedidoMunicipal(cfg, nota) : pedidoNacional(cfg, nota);

    await adm.from("bf_fiscal_notas").update({
      integracao_referencia: ref, status: "processando", integrador: conf.integrador,
      bloqueio_emissao_motivo: null, modelo_integracao: rota === "/v2/nfse" ? "municipal" : "nacional",
      total_tentativas: (Number(nota.total_tentativas) || 0) + 1,
      atualizado_em: new Date().toISOString(), atualizado_por: u.user.id,
    }).eq("id", notaId);

    const envio = await focus(conf, rota + "?ref=" + encodeURIComponent(ref), "POST", pedido);

    /* O prestador responde 202 e processa. Conferimos algumas vezes. */
    let fim = envio.dados;
    if (envio.status === 202 || String(fim?.status || "").startsWith("processando")) {
      for (let i = 0; i < 6; i++) {
        await new Promise((r) => setTimeout(r, 2500));
        const c = await focus(conf, rota + "/" + encodeURIComponent(ref));
        fim = c.dados;
        if (fim && !String(fim.status || "").startsWith("processando")) break;
      }
    }

    const situacao = String(fim?.status || "");
    if (situacao === "autorizado") {
      const base = baseFocus(conf.ambiente);
      const pdf = fim.caminho_danfse ? base + fim.caminho_danfse : (fim.url_danfse || null);
      const xml = fim.caminho_xml_nota_fiscal ? base + fim.caminho_xml_nota_fiscal : (fim.url_xml || null);
      await adm.from("bf_fiscal_notas").update({
        status: "autorizada",
        numero_nfse: String(fim.numero || fim.numero_nfse || ""),
        codigo_verificacao: String(fim.codigo_verificacao || ""),
        chave_acesso: String(fim.chave_acesso || fim.chave || ""),
        link_nota: fim.url || null, pdf_url: pdf, xml_url: xml,
        emitida_em: new Date().toISOString(), autorizacao_fonte: conf.integrador,
        motivo_rejeicao: null, retorno: fim, atualizado_em: new Date().toISOString(),
      }).eq("id", notaId);
      return responde({
        ok: true, status: "autorizada", numero: fim.numero || null,
        codigo_verificacao: fim.codigo_verificacao || null, link: fim.url || null,
        pdf, xml, ambiente: conf.ambiente,
      });
    }

    const erros = Array.isArray(fim?.erros)
      ? fim.erros.map((e: any) => txt(e.mensagem) || txt(e.erro) || JSON.stringify(e)).filter(Boolean)
      : [txt(fim?.mensagem) || txt(fim?.erro) || "o prestador não autorizou a nota"];
    await adm.from("bf_fiscal_notas").update({
      status: situacao.startsWith("processando") ? "processando" : "rejeitada",
      motivo_rejeicao: erros.join(" | ").slice(0, 900),
      retorno: fim, atualizado_em: new Date().toISOString(),
    }).eq("id", notaId);
    return responde({
      ok: false, status: situacao || "rejeitada", erros,
      aviso: situacao.startsWith("processando")
        ? "O prestador ainda está processando. Use Conferir daqui a pouco."
        : undefined,
    }, situacao.startsWith("processando") ? 200 : 422);
  }

  /* ---------------- Conferir ---------------- */
  if (acao === "conferir") {
    if (!conf.token) return responde({ erro: "chave fiscal não configurada" }, 503);
    const ref = txt(nota.integracao_referencia);
    if (!ref) return responde({ ok: true, status: nota.status || "rascunho" });
    const rota = rotaDe(cfg);
    const c = await focus(conf, rota + "/" + encodeURIComponent(ref));
    const fim = c.dados, situacao = String(fim?.status || "");
    if (situacao === "autorizado") {
      const base = baseFocus(conf.ambiente);
      await adm.from("bf_fiscal_notas").update({
        status: "autorizada", numero_nfse: String(fim.numero || ""),
        codigo_verificacao: String(fim.codigo_verificacao || ""),
        link_nota: fim.url || null,
        pdf_url: fim.caminho_danfse ? base + fim.caminho_danfse : null,
        xml_url: fim.caminho_xml_nota_fiscal ? base + fim.caminho_xml_nota_fiscal : null,
        emitida_em: new Date().toISOString(), autorizacao_fonte: conf.integrador,
        retorno: fim, atualizado_em: new Date().toISOString(),
      }).eq("id", notaId);
    }
    return responde({ ok: true, status: situacao || nota.status, retorno: fim });
  }

  /* ---------------- Cancelamento ---------------- */
  if (acao === "cancelar") {
    if (!conf.token) return responde({ erro: "chave fiscal não configurada" }, 503);
    const justificativa = txt(corpo.justificativa);
    if (justificativa.length < 15) {
      return responde({ erro: "a justificativa do cancelamento precisa de pelo menos 15 caracteres" }, 400);
    }
    const ref = txt(nota.integracao_referencia);
    if (!ref) return responde({ erro: "esta nota não foi emitida por aqui" }, 400);
    const rota = rotaDe(cfg);
    const c = await focus(conf, rota + "/" + encodeURIComponent(ref), "DELETE", { justificativa });
    if (!c.ok) {
      const e = Array.isArray(c.dados?.erros)
        ? c.dados.erros.map((x: any) => txt(x.mensagem)).filter(Boolean).join(" | ")
        : (txt(c.dados?.mensagem) || "o prestador recusou o cancelamento");
      return responde({ ok: false, erro: e }, 422);
    }
    await adm.from("bf_fiscal_notas").update({
      status: "cancelada", motivo_rejeicao: justificativa,
      retorno: c.dados, atualizado_em: new Date().toISOString(),
    }).eq("id", notaId);
    return responde({ ok: true, status: "cancelada" });
  }

  return responde({ erro: "ação desconhecida" }, 400);
});
