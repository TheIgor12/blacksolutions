/* BlackFlow 1.38.2 — a área do assinante e a contratação, na mesma tela.

   Esta é a vitrine do produto: quem chega aqui está decidindo se paga. Por
   isso o painel tem peso visual próprio, escuro, com o plano em destaque, o
   selo de Black Friday quando a pessoa está na promoção, o número de
   assinante, a forma de pagamento escolhida ao lado do resumo, e o botão de
   confirmar sempre visível.

   O mesmo painel serve nos dois lugares: como tela do sistema, no menu, e
   dentro da janela que aparece quando o teste termina. Um desenho só, para
   não existir uma versão bonita e outra improvisada.

   Nada aqui abre outra aba nem outro site. */
(function () {
  'use strict';
  if (window.__bfAssinante138) return;
  window.__bfAssinante138 = true;

  var A = {
    carregando: false, tentou: false, estado: null, historico: null,
    numero: null, erro: '', forma: 'cartao', pix: null, gerandoPix: false, msg: ''
  };
  window.__bfA = A;

  function E(v) { return esc(v == null ? '' : String(v)); }
  function moeda(v) { return 'R$ ' + (Number(v) || 0).toFixed(2).replace('.', ','); }
  function data(v) { try { return v ? br(String(v).slice(0, 10)) : ''; } catch (e) { return String(v || ''); } }

  var SIT = {
    PENDING: ['esperando', 'Aguardando pagamento'], PENDENTE: ['esperando', 'Aguardando pagamento'],
    ACTIVE: ['ok', 'Ativa'], ATIVA: ['ok', 'Ativa'], PAGA: ['ok', 'Em dia'],
    CONFIRMED: ['ok', 'Confirmado'], RECEIVED: ['ok', 'Recebido'], RECEIVED_IN_CASH: ['ok', 'Recebido'],
    OVERDUE: ['ruim', 'Em atraso'], EM_ATRASO: ['ruim', 'Em atraso'],
    CANCELADA: ['ruim', 'Cancelada'], DEVOLVIDA: ['esperando', 'Devolvida']
  };

  /* ------------------------------------------------------------------ */
  /* Dados                                                               */
  /* ------------------------------------------------------------------ */
  async function carregar(forcar) {
    if (A.carregando) return;
    if (A.tentou && !forcar) return;
    A.carregando = true; A.tentou = true; A.erro = '';
    var chegou = false;
    try {
      if (NV.sb && NV.sessao && NV.clinicaId) {
        var n = await NV.sb.rpc('bs_assinante_meu');
        if (!n.error && n.data != null) { A.numero = n.data; chegou = true; }
        var r = await NV.sb.functions.invoke('bf-assinatura', { body: { acao: 'estado', clinica: NV.clinicaId } });
        if (!r.error && r.data) { A.estado = r.data; chegou = true; }
        if (A.estado && A.estado.configurado && A.estado.assinatura) {
          var h = await NV.sb.functions.invoke('bf-assinatura', { body: { acao: 'historico', clinica: NV.clinicaId } });
          if (!h.error && h.data && h.data.cobrancas) { A.historico = h.data.cobrancas; chegou = true; }
        }
      }
    } catch (e) { A.erro = String(e && e.message || e); }
    A.carregando = false;
    if (chegou && UI.view === 'assinante' && typeof render === 'function') render();
  }
  window.bfAssinanteRecarregar = function () { A.tentou = false; A.pix = null; carregar(true); };

  function planoK() {
    var e = A.estado || {};
    if (e.assinatura && e.assinatura.plano) return e.assinatura.plano;
    try {
      var seg = (S.config && S.config.segmento) || NV.segmento || '';
      if (seg === 'barbearia') return 'barbearia';
      if (seg === 'biomedicina') return 'biomedicina';
      if (seg === 'odontologia') return 'odontologia';
      if (seg === 'podologia') return 'podologia';
    } catch (_) { }
    return 'completo';
  }
  function plano() {
    var p = ((A.estado || {}).planos || {})[planoK()];
    if (p) return p;
    try { var i = planoInfo(planoK() === 'agenda' ? 'agenda' : 'completo'); return { nome: i.nome, valor: i.valor }; }
    catch (e) { return { nome: 'Completo', valor: 79.9 }; }
  }
  function promo() { try { return (typeof PROMO !== 'undefined' && PROMO) ? PROMO : null; } catch (e) { return null; } }
  function valorHoje() {
    var p = promo();
    if (p && Number(p.valor) > 0 && (p.dias == null || p.dias >= 0)) return Number(p.valor);
    var a = (A.estado || {}).assinatura;
    if (a && a.valor) return Number(a.valor);
    return Number(plano().valor) || 0;
  }
  function diasDeTeste() { try { return diasTeste(); } catch (e) { return null; } }
  function assinaturaAtiva() {
    var a = (A.estado || {}).assinatura;
    return !!(a && ['ATIVA', 'ACTIVE', 'PAGA'].indexOf(String(a.status).toUpperCase()) >= 0);
  }

  /* ------------------------------------------------------------------ */
  /* Pedaços do painel                                                   */
  /* ------------------------------------------------------------------ */
  function selos() {
    var h = '';
    var p = promo();
    if (p) {
      var nome = p.codigo === 'BF2026' ? 'Black Friday' : String(p.codigo || 'Promoção');
      h += '<span class="bfa-selo bf">★ <b>' + E(nome) + '</b>' +
        (p.fim ? ' até ' + E(data(p.fim)) : '') + '</span>';
    }
    if (A.numero) {
      var n = Number(A.numero) || 0;
      h += '<span class="bfa-selo num">Assinante <b>nº ' + E(String(n).padStart(3, '0')) + '</b>' +
        (n <= 100 ? ' · 100 primeiros' : '') + '</span>';
    }
    return h ? '<div class="bfa-selos">' + h + '</div>' : '';
  }

  function cartaoPlano() {
    var p = plano(), pr = promo();
    var cheio = Number(p.valor) || 0, hoje = valorHoje();
    var d = diasDeTeste();
    return '<div class="bfa-plano">' +
      '<div class="bfa-coroa">♛</div>' +
      '<div class="bfa-plano-tx"><b>Plano ' + E(p.nome || 'Completo') + '</b>' +
      '<p>' + (pr
        ? 'Preço de ' + E(pr.codigo === 'BF2026' ? 'Black Friday' : String(pr.codigo || 'promoção')) +
          (pr.fim ? ', garantido até ' + E(data(pr.fim)) : '') +
          (pr.depois ? '. Depois disso a mensalidade passa a ser de ' + E(moeda(pr.depois)) + '.' : '.')
        : 'A solução completa para quem busca controle, organização e escala.') + '</p>' +
      (d != null && d > 0
        ? '<span class="bfa-pill">⚡ ' + (d === 1 ? 'Falta 1 dia de teste grátis' : 'Faltam ' + d + ' dias de teste grátis') + '</span>'
        : d != null
          ? '<span class="bfa-pill">⚡ O teste grátis terminou</span>'
          : '<span class="bfa-pill">⚡ Sem fidelidade, cancele quando quiser</span>') +
      '</div>' +
      '<div class="bfa-plano-vlr">' +
      (pr && hoje < cheio ? '<span class="bfa-risco">' + E(moeda(cheio)) + '</span>' : '') +
      '<i>R$ </i><b>' + E(hoje.toFixed(2).replace('.', ',')) + '</b><small>/mês</small></div>' +
      '</div>';
  }

  function escolhaForma() {
    var c = A.forma === 'cartao', x = A.forma === 'pix';
    return '<div class="bfa-bloco">' +
      '<div class="bfa-bloco-tit"><span class="ic">▭</span><div><b>Forma de pagamento</b>' +
      '<span>Escolha como deseja pagar a sua assinatura.</span></div></div>' +
      '<div class="bfa-formas">' +
      '<button type="button" class="bfa-forma' + (c ? ' on' : '') + '" onclick="bfAssForma(\'cartao\')">' +
      '▭ Cartão de crédito<span class="bola">✓</span></button>' +
      '<button type="button" class="bfa-forma' + (x ? ' on' : '') + '" onclick="bfAssForma(\'pix\')">' +
      '◈ Pix<span class="bola">✓</span></button>' +
      '</div></div>';
  }

  function painelCartao() {
    var tel = '';
    try { tel = (S.config && (S.config.telefone || S.config.celular)) || ''; } catch (e) { }
    var doc = '';
    try { doc = (A.estado && A.estado.clinica && A.estado.clinica.documento) || ''; } catch (e) { }
    return '<div class="bfa-painel">' +
      '<h4>Dados do cartão</h4>' +
      '<p class="bfa-sub">Os dados vão direto para o prestador de pagamento. Não ficam guardados neste aparelho ' +
      'nem no sistema: do cartão, só ficam a bandeira e os quatro últimos dígitos.</p>' +
      '<div class="bfa-campos">' +
      campo('bfCcNum', 'Número do cartão', '0000 0000 0000 0000', 'full', 'inputmode="numeric" autocomplete="cc-number" maxlength="23"') +
      '<div class="bfa-campo full"><div class="bfa-bandeiras"><i>VISA</i><i>MASTER</i><i>ELO</i><i>AMEX</i><i>HIPER</i></div></div>' +
      campo('bfCcNome', 'Nome impresso no cartão', 'Como está escrito no cartão', 'full', 'autocomplete="cc-name"') +
      campo('bfCcVal', 'Validade', 'MM/AAAA', '', 'inputmode="numeric" autocomplete="cc-exp" maxlength="7"') +
      campo('bfCcCvv', 'Código de segurança', '000', '', 'inputmode="numeric" autocomplete="cc-csc" maxlength="4"') +
      campo('bfCcDoc', 'CPF ou CNPJ do titular', '000.000.000-00', '', 'inputmode="numeric"', doc) +
      campo('bfCcTel', 'Celular do titular', '(00) 00000-0000', '', 'inputmode="numeric" autocomplete="tel"', tel) +
      campo('bfCcCep', 'CEP do titular', '00000-000', '', 'inputmode="numeric" autocomplete="postal-code" maxlength="9"') +
      campo('bfCcNumEnd', 'Número do endereço', '123', '', '') +
      '</div>' +
      (A.msg ? '<div class="bfa-aviso ruim" style="margin:14px 0 0">' + E(A.msg) + '</div>' : '') +
      '</div>';
  }
  function campo(id, rot, ph, cls, extra, valor) {
    return '<div class="bfa-campo ' + (cls || '') + '"><label for="' + id + '">' + E(rot) + '</label>' +
      '<input id="' + id + '" placeholder="' + E(ph) + '" ' + (extra || '') +
      (valor ? ' value="' + E(valor) + '"' : '') + '></div>';
  }

  function painelPix() {
    if (A.gerandoPix) {
      return '<div class="bfa-painel bfa-pix"><h4>Pague com Pix</h4>' +
        '<p class="bfa-sub">Gerando o código, um instante...</p></div>';
    }
    if (!A.pix) {
      return '<div class="bfa-painel bfa-pix"><h4>Pague com Pix</h4>' +
        '<p class="bfa-sub">O acesso é liberado assim que o pagamento cair, nesta mesma tela, ' +
        'sem você sair de lugar nenhum.</p>' +
        '<button type="button" class="bfa-bt" style="max-width:320px;margin:4px auto 0" onclick="bfAssGerarPix()">' +
        '◈ Gerar o código Pix</button></div>';
    }
    return '<div class="bfa-painel bfa-pix"><h4>Pague ' + E(moeda(A.pix.valor)) + ' com Pix</h4>' +
      '<p class="bfa-sub">' + (A.pix.reaproveitada ? 'Esta é a cobrança em aberto da sua assinatura. Nenhuma cobrança nova foi criada. ' : '') +
      'Aponte a câmera do aplicativo do seu banco para o código. Esta tela avisa sozinha quando o pagamento cair.</p>' +
      (A.pix.imagem ? '<div class="bfa-qr"><img alt="Código Pix" src="data:image/png;base64,' + E(A.pix.imagem) + '"></div>' : '') +
      '<textarea class="bfa-copia" id="bfPixCodigo" rows="3" readonly>' + E(A.pix.copia_e_cola || '') + '</textarea>' +
      '<div class="bfa-botoes" style="justify-content:center;margin:12px 0 0">' +
      '<button type="button" class="bfa-bt sec" onclick="bfCobrancaCopiar()">Copiar o código</button>' +
      '<button type="button" class="bfa-bt sec" onclick="bfCobrancaConferir(true)">Já paguei, conferir</button></div>' +
      '<p class="bfa-sub" id="bfPixSit" style="margin-top:10px">Aguardando o pagamento...</p></div>';
  }

  function resumo(ctx) {
    var p = plano(), pr = promo(), hoje = valorHoje();
    var d = diasDeTeste();
    var ativa = assinaturaAtiva();
    var ass = (A.estado || {}).assinatura;
    var bt = ativa
      ? '<button type="button" class="bfa-bt" onclick="bfAssinanteRecarregar()">Atualizar a situação</button>'
      : '<button type="button" class="bfa-bt" id="bfAssBt" onclick="bfAssConfirmar()">♛ Confirmar assinatura →</button>';
    return '<aside class="bfa-resumo">' +
      '<div class="bfa-bloco-tit" style="margin-bottom:6px"><span class="ic">▤</span><div><b>Resumo da assinatura</b></div></div>' +
      '<div class="bfa-linha"><span>Plano</span><b>' + E(p.nome || '') + '</b></div>' +
      '<div class="bfa-linha"><span>Periodicidade</span><b>Mensal</b></div>' +
      (pr ? '<div class="bfa-linha"><span>Promoção</span><b>' + E(pr.codigo === 'BF2026' ? 'Black Friday' : String(pr.codigo)) + '</b></div>' : '') +
      (A.numero ? '<div class="bfa-linha"><span>Assinante</span><b>nº ' + E(String(A.numero).padStart(3, '0')) + '</b></div>' : '') +
      (ativa && ass && ass.proxima ? '<div class="bfa-linha"><span>Próxima cobrança</span><b>' + E(data(ass.proxima)) + '</b></div>' : '') +
      (ativa && ass ? '<div class="bfa-linha"><span>Pagamento</span><b>' + E(ass.forma === 'cartao' ? (ass.cartao || 'Cartão') : 'Pix') + '</b></div>' : '') +
      '<div class="bfa-linha total"><span>Total</span><b>' + E(moeda(hoje)) + '/mês</b></div>' +
      bt +
      '<ul class="bfa-checks">' +
      (d != null && d > 0 ? '<li><i>✓</i>' + (d === 1 ? 'Ainda falta 1 dia de teste grátis' : 'Ainda faltam ' + d + ' dias de teste grátis') + '</li>' : '') +
      '<li><i>✓</i>Cancelamento a qualquer momento, por esta tela</li>' +
      '<li><i>✓</i>Cobrança mensal, sem fidelidade e sem multa</li>' +
      '<li><i>✓</i>Sete dias para desistir, com devolução integral, pelo artigo 49 do Código de Defesa do Consumidor</li>' +
      '</ul>' +
      '<div class="bfa-seguro"><span class="ic">🔒</span><div><b>Ambiente seguro</b>' +
      '<p>Os dados de pagamento vão cifrados direto para o prestador autorizado. O sistema não guarda número de cartão.</p></div></div>' +
      (ativa ? '<div class="bfa-botoes" style="margin:14px 0 0"><button type="button" class="bfa-bt sec" onclick="bfCobrancaAbrir()">Trocar a forma de pagamento</button>' +
        '<button type="button" class="bfa-bt sec" onclick="bfCobrancaCancelar()">Cancelar assinatura</button></div>' : '') +
      '</aside>';
  }

  function rodape() {
    return '<div class="bfa-rodape">' +
      '<div class="tx"><b>🔒 Pagamento seguro</b>A cobrança é processada por instituição de pagamento autorizada pelo Banco Central. ' +
      'A BlackSolutions é fornecedora de tecnologia e não é instituição financeira.</div>' +
      '<div class="bfa-marcas">' +
      '<span class="bfa-marca"><b>SSL</b>Criptografia</span>' +
      '<span class="bfa-marca"><b>PCI</b>Dados do cartão</span>' +
      '<span class="bfa-marca"><b>LGPD</b>Lei 13.709/2018</span>' +
      '</div></div>';
  }

  function blocoVoucher() {
    return '<div class="bfa-painel"><h4>Voucher de prazo</h4>' +
      '<p class="bfa-sub">Se a BlackSolutions liberou um voucher para você, digite o código e o acesso é estendido na hora.</p>' +
      '<div class="bfa-campos"><div class="bfa-campo full" style="flex-direction:row;gap:10px;flex-wrap:wrap;align-items:center">' +
      '<input id="bfVoucherCodigo" placeholder="BF-XXXXXXXXXXXXXXXX" maxlength="40" autocomplete="off" style="flex:1 1 220px">' +
      '<button type="button" class="bfa-bt sec" onclick="bfUsarVoucher()">Ativar voucher</button>' +
      '</div></div></div>';
  }

  function blocoHistorico() {
    if (!A.historico || !A.historico.length) return '';
    var linhas = A.historico.slice(0, 24).map(function (c) {
      var s = SIT[String(c.status || '').toUpperCase()] || ['', String(c.status || '')];
      return '<tr><td>' + E(data(c.vencimento)) + '</td>' +
        '<td>' + E(c.forma === 'CREDIT_CARD' ? 'Cartão' : c.forma === 'PIX' ? 'Pix' : (c.forma || '')) + '</td>' +
        '<td><span class="bfa-tag ' + E(s[0]) + '">' + E(s[1]) + '</span></td>' +
        '<td>' + (c.pago ? E(data(c.pago)) : '<span style="opacity:.5">-</span>') + '</td>' +
        '<td class="num">' + E(moeda(c.valor)) + '</td></tr>';
    }).join('');
    return '<div class="bfa-painel" style="padding:6px 8px"><table class="bfa-hist">' +
      '<thead><tr><th>Vencimento</th><th>Forma</th><th>Situação</th><th>Pago em</th><th class="num">Valor</th></tr></thead>' +
      '<tbody>' + linhas + '</tbody></table></div>';
  }

  function avisoSituacao() {
    var e = A.estado || {};
    if (e.configurado === false) {
      return '<div class="bfa-aviso">A cobrança dentro do sistema ainda não foi ligada nesta instalação. ' +
        'Esta tela mostra a situação do acesso, e a contratação segue pelo atendimento.</div>';
    }
    if (A.erro) return '<div class="bfa-aviso ruim">' + E(A.erro) + '</div>';
    if (assinaturaAtiva()) {
      var a = e.assinatura;
      return '<div class="bfa-aviso bom">Assinatura ativa' +
        (a.forma === 'cartao' ? ' no cartão' + (a.cartao ? ' ' + E(a.cartao) : '') : ' por Pix') +
        (a.proxima ? ', próxima cobrança em ' + E(data(a.proxima)) : '') + '.</div>';
    }
    var d = diasDeTeste();
    if (d != null && d <= 0) return '<div class="bfa-aviso ruim">O teste grátis terminou. Assine para voltar a usar o sistema.</div>';
    if (d != null && d <= 2) return '<div class="bfa-aviso">' + (d === 1 ? 'Falta 1 dia' : 'Faltam ' + d + ' dias') + ' de teste. Assine agora para não parar no meio do atendimento.</div>';
    return '';
  }

  /* ------------------------------------------------------------------ */
  /* O painel inteiro, usado na tela e dentro da janela                  */
  /* ------------------------------------------------------------------ */
  window.bfAssPainelHTML = function (opts) {
    opts = opts || {};
    var ativa = assinaturaAtiva();
    var esquerda = ativa
      ? (blocoHistorico() || '<div class="bfa-painel"><h4>Sem cobranças registradas ainda</h4>' +
        '<p class="bfa-sub">Assim que a primeira cobrança for gerada, ela aparece aqui.</p></div>') + blocoVoucher()
      : escolhaForma() + (A.forma === 'cartao' ? painelCartao() : painelPix()) + blocoVoucher();

    return '<div class="bfa' + (opts.modal ? ' bfa-modal' : '') + '">' +
      (opts.voltar ? '<button type="button" class="bfa-voltar" onclick="' + opts.voltar + '">← Voltar</button>' : '') +
      '<div class="bfa-hero"><div class="bfa-coroa">♛</div>' +
      '<div><h2>' + (ativa ? 'Sua assinatura <span>BlackFlow</span>' : 'Assinar o <span>BlackFlow</span>') + '</h2>' +
      '<p class="bfa-sub">' + (ativa
        ? 'Acompanhe a sua assinatura, as cobranças e a forma de pagamento.'
        : 'Libere o sistema inteiro e leve a sua operação para outro nível.') + '</p></div>' +
      selos() + '</div>' +
      avisoSituacao() +
      cartaoPlano() +
      '<div class="bfa-grid"><div>' + esquerda + '</div>' + resumo(opts) + '</div>' +
      rodape() +
      '</div>';
  };

  /* ------------------------------------------------------------------ */
  /* Ações                                                               */
  /* ------------------------------------------------------------------ */
  function redesenhar() {
    if (UI.view === 'assinante' && !UI.auth) { render(); return; }
    var raiz = document.getElementById('modalRoot');
    if (raiz && raiz.querySelector('.bfa')) { window.bfCobrancaAbrir(); return; }
    if (typeof render === 'function') render();
  }
  window.bfAssRedesenhar = redesenhar;

  window.bfAssForma = function (f) {
    A.forma = f; A.msg = '';
    redesenhar();
  };

  window.bfAssGerarPix = async function () {
    A.gerandoPix = true; A.msg = ''; redesenhar();
    try {
      var r = await window.bfCobChamar({ acao: 'pix' });
      A.pix = r;
      A.gerandoPix = false;
      redesenhar();
      window.bfCobPixVigiar();
    } catch (e) {
      A.gerandoPix = false; A.msg = String(e && e.message || e); A.forma = 'pix';
      redesenhar();
      toast(A.msg);
    }
  };

  window.bfAssConfirmar = function () {
    if (A.forma === 'pix') {
      if (!A.pix) { window.bfAssGerarPix(); return; }
      window.bfCobrancaConferir(true);
      return;
    }
    window.bfCobrancaCartaoEnviar();
  };

  /* A janela do fim do teste abre sem ter passado pela tela, entao os dados
     podem nao ter sido buscados ainda. */
  window.bfAssGarantirDados = function () {
    if (A.tentou || A.carregando) return;
    carregar(false).then(function () {
      var raiz = document.getElementById('modalRoot');
      if (raiz && raiz.querySelector('.bfa') && typeof window.bfCobrancaAbrir === 'function') {
        openModal(window.bfAssPainelHTML({ modal: true }), true);
      }
    });
  };

  window.bfAssMensagem = function (t) { A.msg = t || ''; };
  window.bfAssEstado = function () { return A; };

  /* ------------------------------------------------------------------ */
  /* A tela do menu                                                      */
  /* ------------------------------------------------------------------ */
  window.vAssinante = function () {
    if (!A.tentou && !A.carregando) carregar(false);
    var cab = '<div class="phead"><div><h1>Assinante</h1>' +
      '<p class="sub">Sua assinatura do BlackFlow, do começo ao fim, dentro do sistema.</p></div></div>';
    if ((A.carregando || !A.tentou) && !A.estado) {
      return '<div class="page">' + cab +
        '<div class="card" style="padding:22px">Carregando a sua assinatura...</div></div>';
    }
    return '<div class="page" style="max-width:1180px">' + cab + window.bfAssPainelHTML({}) + '</div>';
  };
})();
