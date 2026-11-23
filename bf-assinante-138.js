/* BlackFlow 1.38.0 — a tela do assinante, dentro do sistema.

   Antes, saber a situação da assinatura exigia sair do sistema: olhar o painel
   da BlackSolutions, ou o painel do prestador de pagamento. Agora é uma tela
   como qualquer outra, no menu, com tudo em um lugar só:

     o número de assinante e a posição na ordem de contratação;
     a situação, com os dias que faltam quando é teste;
     o plano, o valor e a próxima cobrança;
     a forma de pagamento que está valendo;
     o histórico de cobranças, direto do prestador;
     assinar, trocar a forma de pagamento, usar voucher e cancelar.

   Nada aqui abre outra aba nem outro site. */
(function () {
  'use strict';
  if (window.__bfAssinante138) return;
  window.__bfAssinante138 = true;

  var A = { carregando: false, tentou: false, estado: null, historico: null, numero: null, erro: '' };

  function E(v) { return esc(v == null ? '' : String(v)); }
  function moeda(v) { return 'R$ ' + (Number(v) || 0).toFixed(2).replace('.', ','); }
  function data(v) { try { return v ? br(String(v).slice(0, 10)) : ''; } catch (e) { return String(v || ''); } }

  var SITUACAO = {
    PENDING: ['b-warn', 'Aguardando pagamento'],
    PENDENTE: ['b-warn', 'Aguardando pagamento'],
    ACTIVE: ['ok', 'Ativa'],
    ATIVA: ['ok', 'Ativa'],
    PAGA: ['ok', 'Em dia'],
    CONFIRMED: ['ok', 'Pagamento confirmado'],
    RECEIVED: ['ok', 'Pagamento recebido'],
    OVERDUE: ['b-bad', 'Em atraso'],
    EM_ATRASO: ['b-bad', 'Em atraso'],
    CANCELADA: ['b-bad', 'Cancelada'],
    DEVOLVIDA: ['b-warn', 'Valor devolvido']
  };

  async function carregar(forcar) {
    if (A.carregando) return;
    if (A.tentou && !forcar) return;
    A.carregando = true; A.tentou = true; A.erro = '';
    var chegou = false;
    try {
      if (NV.sb && NV.sessao && NV.clinicaId) {
        var n = await NV.sb.rpc('bs_assinante_meu');
        if (!n.error) { A.numero = n.data; chegou = true; }
        var r = await NV.sb.functions.invoke('bf-assinatura', {
          body: { acao: 'estado', clinica: NV.clinicaId }
        });
        if (!r.error && r.data) { A.estado = r.data; chegou = true; }
        if (A.estado && A.estado.configurado) {
          var h = await NV.sb.functions.invoke('bf-assinatura', {
            body: { acao: 'historico', clinica: NV.clinicaId }
          });
          if (!h.error && h.data && h.data.cobrancas) { A.historico = h.data.cobrancas; chegou = true; }
        }
      }
    } catch (e) { A.erro = String(e && e.message || e); }
    A.carregando = false;
    /* Só redesenha quando alguma coisa chegou. Sem esta trava, uma consulta
       que não devolve nada redesenha a tela, que pede de novo, sem fim. */
    if (chegou && UI.view === 'assinante' && typeof render === 'function') render();
  }
  window.bfAssinanteRecarregar = function () { A.tentou = false; carregar(true); };

  function diasDeTeste() {
    try { return diasTeste(); } catch (e) { return null; }
  }

  function cartaoSituacao() {
    var d = diasDeTeste();
    var cl = (A.estado && A.estado.clinica) || {};
    var ass = (A.estado && A.estado.assinatura) || null;

    var titulo, texto, selo;
    if (d != null) {
      selo = d <= 0 ? ['b-bad', 'Teste terminado'] : d <= 2 ? ['b-warn', 'Teste terminando'] : ['b-warn', 'Teste grátis'];
      titulo = d <= 0 ? 'O teste terminou' : d === 1 ? 'Falta 1 dia de teste' : 'Faltam ' + d + ' dias de teste';
      texto = 'Depois disso o acesso continua com a assinatura mensal. Seus dados ficam guardados de qualquer forma.';
    } else if (ass) {
      var s = SITUACAO[String(ass.status || '').toUpperCase()] || ['ok', String(ass.status || '')];
      selo = s;
      titulo = 'Assinatura ' + s[1].toLowerCase();
      texto = (ass.forma === 'cartao' ? 'No cartão' + (ass.cartao ? ' ' + ass.cartao : '') : 'Por Pix') +
        (ass.proxima ? ', próxima cobrança em ' + data(ass.proxima) : '') + '.';
    } else if (cl.valido_ate) {
      selo = ['ok', 'Ativa'];
      titulo = 'Acesso liberado até ' + data(cl.valido_ate);
      texto = 'Assine para a renovação acontecer sozinha, sem o acesso parar.';
    } else {
      selo = ['ok', 'Sem vencimento'];
      titulo = 'Esta conta não tem vencimento';
      texto = 'Cortesia da BlackSolutions.';
    }

    return '<div class="card" style="padding:16px;margin:0 0 14px">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">' +
      '<div><b style="font-size:18px">' + E(titulo) + '</b>' +
      '<p class="sub" style="margin:6px 0 0">' + E(texto) + '</p></div>' +
      '<span class="badge ' + E(selo[0]) + '">' + E(selo[1]) + '</span></div></div>';
  }

  function cartaoNumero() {
    if (!A.numero) return '';
    var n = Number(A.numero) || 0;
    return '<div class="kpi"><small>Número de assinante</small><b>nº ' +
      E(String(n).padStart(3, '0')) + '</b><span>' +
      (n <= 100 ? 'entre os 100 primeiros da BlackSolutions' : 'ordem de contratação') + '</span></div>';
  }

  function cartoesPlano() {
    var e = A.estado || {};
    var ass = e.assinatura || null;
    var planos = e.planos || {};
    var k = (ass && ass.plano) || (e.clinica && e.clinica.plano) || '';
    var p = planos[k] || null;
    var valor = ass ? ass.valor : (p ? p.valor : null);
    return '<div class="grid g3" style="margin:0 0 14px">' +
      cartaoNumero() +
      '<div class="kpi"><small>Plano</small><b>' + E(p ? p.nome : (k === 'teste' ? 'Teste grátis' : k || 'Não definido')) +
      '</b><span>' + (valor != null ? moeda(valor) + ' por mês' : 'sem cobrança no período de teste') + '</span></div>' +
      '<div class="kpi"><small>Forma de pagamento</small><b>' +
      E(ass ? (ass.forma === 'cartao' ? 'Cartão de crédito' : 'Pix') : 'Nenhuma') + '</b><span>' +
      E(ass && ass.cartao ? ass.cartao : (ass ? 'renovação mensal' : 'escolha ao assinar')) + '</span></div>' +
      '</div>';
  }

  function botoes() {
    var e = A.estado || {};
    var ass = e.assinatura || null;
    var ativa = ass && ['ATIVA', 'ACTIVE', 'PAGA'].indexOf(String(ass.status).toUpperCase()) >= 0;
    var b = [];
    if (!ativa) b.push('<button class="btn" onclick="bfCobrancaAbrir()">Assinar agora</button>');
    else b.push('<button class="btn ghost" onclick="bfCobrancaAbrir()">Trocar a forma de pagamento</button>');
    b.push('<button class="btn ghost" onclick="bfAssinanteRecarregar()">Atualizar</button>');
    if (ativa) b.push('<button class="btn ghost" onclick="bfCobrancaCancelar()">Cancelar assinatura</button>');
    return '<div style="display:flex;gap:8px;flex-wrap:wrap;margin:0 0 16px">' + b.join('') + '</div>';
  }

  function blocoVoucher() {
    return '<div class="card" style="padding:14px;margin:0 0 14px">' +
      '<b>Voucher de prazo</b>' +
      '<p class="sub" style="margin:6px 0 10px">Se a BlackSolutions liberou um voucher para você, digite o código aqui ' +
      'e o acesso é estendido na hora.</p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<input id="bfVoucherCodigo" placeholder="BF-XXXXXXXXXXXXXXXX" maxlength="40" autocomplete="off" style="max-width:280px;margin:0">' +
      '<button class="btn sm" onclick="bfUsarVoucher()">Ativar voucher</button></div></div>';
  }

  function blocoHistorico() {
    if (!A.historico || !A.historico.length) return '';
    var linhas = A.historico.slice(0, 24).map(function (c) {
      var s = SITUACAO[String(c.status || '').toUpperCase()] || ['', String(c.status || '')];
      return '<tr><td>' + E(data(c.vencimento)) + '</td>' +
        '<td>' + E(c.descricao || '') + '</td>' +
        '<td>' + E(c.forma === 'CREDIT_CARD' ? 'Cartão' : c.forma === 'PIX' ? 'Pix' : (c.forma || '')) + '</td>' +
        '<td><span class="badge ' + E(s[0]) + '">' + E(s[1]) + '</span></td>' +
        '<td class="num">' + E(moeda(c.valor)) + '</td>' +
        '<td>' + (c.pago ? E(data(c.pago)) : '') + '</td></tr>';
    }).join('');
    return '<div class="card" style="padding:0;overflow:hidden">' +
      '<table><thead><tr><th>Vencimento</th><th>Referente a</th><th>Forma</th><th>Situação</th>' +
      '<th class="num">Valor</th><th>Pago em</th></tr></thead><tbody>' + linhas + '</tbody></table></div>';
  }

  function avisoCobrancaDesligada() {
    var e = A.estado || {};
    if (e.configurado !== false) return '';
    return '<div class="note warn" style="margin:0 0 14px">A cobrança dentro do sistema ainda não foi ligada nesta ' +
      'instalação. Enquanto isso, a contratação continua pelo prestador, e esta tela mostra apenas a situação do acesso.</div>';
  }

  window.vAssinante = function () {
    if (!A.tentou && !A.carregando) carregar(false);
    var cab = '<div class="phead"><div><h1>Assinante</h1>' +
      '<p class="sub">Tudo sobre a sua assinatura do BlackFlow, sem sair do sistema.</p></div></div>';
    if ((A.carregando || !A.tentou) && !A.estado) {
      return '<div class="page">' + cab + '<div class="card" style="padding:18px">Carregando a sua assinatura...</div></div>';
    }
    return '<div class="page">' + cab +
      avisoCobrancaDesligada() +
      cartaoSituacao() +
      cartoesPlano() +
      botoes() +
      blocoVoucher() +
      blocoHistorico() +
      '</div>';
  };
})();
