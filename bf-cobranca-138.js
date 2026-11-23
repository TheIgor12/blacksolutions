/* BlackFlow 1.38.2 — o motor da cobrança.

   Este arquivo conversa com a função de servidor e executa as ações: gerar o
   Pix, enviar o cartão, conferir o pagamento e cancelar. O desenho da tela
   fica no módulo do assinante, para existir um desenho só, usado tanto na
   tela do menu quanto na janela que aparece quando o teste termina.

   O que este arquivo nunca faz
   ----------------------------
   Não guarda número de cartão, não grava nada deste aparelho e limpa os
   campos assim que a resposta chega. O que sobra na tela é a bandeira e os
   quatro últimos dígitos, devolvidos pelo prestador.

   Artigo 49 do Código de Defesa do Consumidor: sete dias de arrependimento,
   avisados antes da confirmação, com cancelamento por esta mesma tela. */
(function () {
  'use strict';
  if (window.__bfCobranca138) return;
  window.__bfCobranca138 = true;

  var T = { timer: null, tentativas: 0, plano: '' };

  function A() { return (typeof window.bfAssEstado === 'function') ? window.bfAssEstado() : {}; }
  function moeda(v) { return 'R$ ' + (Number(v) || 0).toFixed(2).replace('.', ','); }

  function planoAtual() {
    if (T.plano) return T.plano;
    try {
      var seg = (S.config && S.config.segmento) || NV.segmento || '';
      if (seg === 'barbearia') return 'barbearia';
      if (seg === 'biomedicina') return 'biomedicina';
      if (seg === 'odontologia') return 'odontologia';
      if (seg === 'podologia') return 'podologia';
      if (NV.plano === 'agenda') return 'agenda';
    } catch (e) { }
    return 'completo';
  }

  window.bfCobChamar = async function (corpo) {
    if (!NV.sb || !NV.sessao || !NV.clinicaId) throw new Error('Entre na sua conta para assinar.');
    var r = await NV.sb.functions.invoke('bf-assinatura', {
      body: Object.assign({ clinica: NV.clinicaId, plano: planoAtual() }, corpo)
    });
    if (r.error) {
      var det = '';
      try { det = (await r.error.context.json()).erro || ''; } catch (e) { }
      throw new Error(det || r.error.message || 'Não foi possível falar com a cobrança agora.');
    }
    if (r.data && r.data.erro) throw new Error(r.data.erro);
    return r.data;
  };

  /* ---------------- A janela, para quando não há tela ---------------- */
  window.bfCobrancaAbrir = function (plano) {
    if (plano) T.plano = plano;
    /* Dentro do sistema, com a tela disponível, a assinatura é uma tela, não
       uma janela: quem está logado vai para o menu Assinante. */
    if (!UI.auth && typeof go === 'function' && typeof vAssinante === 'function' && NV.ativa) {
      closeModal(); go('assinante'); return;
    }
    if (typeof window.bfAssPainelHTML !== 'function') { toast('Abrindo a assinatura...'); return; }
    openModal(window.bfAssPainelHTML({ modal: true }), true);
    if (typeof window.bfAssGarantirDados === 'function') window.bfAssGarantirDados();
  };

  /* ---------------- Pix ---------------- */
  window.bfCobPixVigiar = function () {
    T.tentativas = 0;
    clearInterval(T.timer);
    T.timer = setInterval(function () { window.bfCobrancaConferir(false); }, 7000);
  };
  window.bfCobrancaParar = function () { clearInterval(T.timer); T.timer = null; };

  window.bfCobrancaCopiar = function () {
    var t = document.getElementById('bfPixCodigo');
    if (!t) return;
    try {
      navigator.clipboard.writeText(t.value).then(
        function () { toast('Código copiado.'); },
        function () { t.select(); toast('Selecionado. Use copiar do seu aparelho.'); });
    } catch (e) { try { t.select(); } catch (_) { } }
  };

  window.bfCobrancaConferir = async function (manual) {
    T.tentativas++;
    if (T.tentativas > 90) { window.bfCobrancaParar(); return; }
    var sit = document.getElementById('bfPixSit');
    try {
      var r = await window.bfCobChamar({ acao: 'conferir' });
      if (r.pago) {
        window.bfCobrancaParar();
        toast('Pagamento confirmado. Assinatura ativa.');
        closeModal();
        if (typeof entrar === 'function' && NV.sessao) await entrar(NV.sessao);
        return;
      }
      if (sit) sit.textContent = manual ? 'Ainda não caiu. O banco pode levar alguns segundos.' : 'Aguardando o pagamento...';
    } catch (e) {
      if (sit && manual) sit.textContent = String(e && e.message || e);
    }
  };

  /* ---------------- Cartão ---------------- */
  function pegar(id) { var e = document.getElementById(id); return e ? String(e.value || '').trim() : ''; }
  function limpar() {
    ['bfCcNum', 'bfCcNome', 'bfCcVal', 'bfCcCvv'].forEach(function (id) {
      var e = document.getElementById(id); if (e) e.value = '';
    });
  }

  window.bfCobrancaCartaoEnviar = async function () {
    var val = pegar('bfCcVal').replace(/\D/g, '');
    var falta = function (t) {
      if (typeof window.bfAssMensagem === 'function') window.bfAssMensagem(t);
      if (typeof window.bfAssRedesenhar === 'function') window.bfAssRedesenhar();
      toast(t);
    };
    if (pegar('bfCcNum').replace(/\D/g, '').length < 13) { falta('Confira o número do cartão.'); return; }
    if (!pegar('bfCcNome')) { falta('Informe o nome impresso no cartão.'); return; }
    if (val.length < 4) { falta('Informe a validade no formato mês e ano.'); return; }
    if (pegar('bfCcCvv').replace(/\D/g, '').length < 3) { falta('Confira o código de segurança.'); return; }
    if (pegar('bfCcDoc').replace(/\D/g, '').length < 11) { falta('Informe o CPF ou CNPJ do titular.'); return; }
    if (pegar('bfCcCep').replace(/\D/g, '').length < 8) { falta('Informe o CEP do titular.'); return; }
    if (!pegar('bfCcNumEnd')) { falta('Informe o número do endereço do titular.'); return; }

    var bt = document.getElementById('bfAssBt');
    if (bt) { bt.disabled = true; bt.textContent = 'Enviando...'; }

    var corpo = {
      acao: 'cartao',
      documento: pegar('bfCcDoc').replace(/\D/g, ''),
      cep: pegar('bfCcCep').replace(/\D/g, ''),
      numero: pegar('bfCcNumEnd'),
      celular: pegar('bfCcTel').replace(/\D/g, ''),
      cartao: {
        numero: pegar('bfCcNum').replace(/\D/g, ''),
        titular: pegar('bfCcNome'),
        mes: val.slice(0, 2),
        ano: val.slice(2),
        ccv: pegar('bfCcCvv').replace(/\D/g, '')
      }
    };

    var r;
    try { r = await window.bfCobChamar(corpo); }
    catch (e) {
      limpar();
      if (bt) { bt.disabled = false; bt.textContent = '♛ Confirmar assinatura →'; }
      falta(String(e && e.message || e));
      return;
    }
    limpar();
    if (typeof window.bfAssMensagem === 'function') window.bfAssMensagem('');

    var texto = r.reaproveitada
      ? (r.aviso || 'Já existe uma assinatura ativa neste CPF ou CNPJ. Nenhuma cobrança nova foi criada.')
      : 'Cartão ' + (r.cartao || '') + '. ' +
        (r.pago ? 'O pagamento foi aprovado e o acesso está liberado.'
          : 'A cobrança foi criada e o prestador está processando. O acesso é liberado assim que o cartão aprovar.') +
        (r.proxima ? ' Próxima cobrança em ' + br(String(r.proxima).slice(0, 10)) + '.' : '');

    openModal('<div class="bfa bfa-modal" style="padding:26px">' +
      '<div class="bfa-hero" style="margin-bottom:14px"><div class="bfa-coroa">✓</div>' +
      '<div><h2>' + (r.reaproveitada ? 'Você já é <span>assinante</span>' : 'Assinatura <span>confirmada</span>') + '</h2>' +
      '<p class="bfa-sub">' + esc(texto) + '</p></div></div>' +
      '<div class="bfa-aviso">Você tem <b>sete dias</b> para desistir, contados da contratação, com devolução integral ' +
      'do que foi pago, conforme o artigo 49 do Código de Defesa do Consumidor. O cancelamento é feito pela tela ' +
      'Assinante, sem precisar falar com ninguém.</div>' +
      '<button type="button" class="bfa-bt" onclick="bfCobrancaFim()">Continuar</button></div>', true);
  };

  window.bfCobrancaFim = async function () {
    closeModal();
    if (typeof window.bfAssinanteRecarregar === 'function') window.bfAssinanteRecarregar();
    if (typeof entrar === 'function' && NV.sessao) await entrar(NV.sessao);
  };

  /* ---------------- Cancelamento ---------------- */
  window.bfCobrancaCancelar = function () {
    openModal('<div class="bfa bfa-modal" style="padding:26px">' +
      '<div class="bfa-hero" style="margin-bottom:14px"><div class="bfa-coroa">!</div>' +
      '<div><h2>Cancelar a <span>assinatura</span></h2>' +
      '<p class="bfa-sub">O acesso continua até o fim do período já pago e os seus dados ficam guardados.</p></div></div>' +
      '<div class="bfa-aviso">Dentro dos sete dias da contratação, o valor pago é devolvido integralmente, ' +
      'na forma do artigo 49 do Código de Defesa do Consumidor.</div>' +
      '<div class="bfa-botoes" style="margin:0"><button type="button" class="bfa-bt sec" onclick="bfCobrancaCancelarConfirmar()">Sim, cancelar</button>' +
      '<button type="button" class="bfa-bt" style="width:auto" onclick="closeModal()">Continuar assinante</button></div></div>', true);
  };
  window.bfCobrancaCancelarConfirmar = async function () {
    try {
      var r = await window.bfCobChamar({ acao: 'cancelar' });
      toast(r.aviso || 'Assinatura cancelada.');
      closeModal();
      if (typeof window.bfAssinanteRecarregar === 'function') window.bfAssinanteRecarregar();
    } catch (e) { toast(String(e && e.message || e)); }
  };

  /* ---------------- Os botões antigos passam a abrir isto ---------------- */
  function paraDentro(h) {
    return String(h).replace(
      /<a class="btn([^"]*)"([^>]*?)href="[^"]*"([^>]*?)>([^<]*)<\/a>/g,
      function (todo, classe, antes, depois, rotulo) {
        if (/falar com|d[úu]vidas|suporte|atendimento/i.test(rotulo)) return todo;
        var p = /s[óo] agenda/i.test(rotulo) ? 'agenda' : '';
        var estilo = (antes + ' ' + depois).match(/style="([^"]*)"/);
        return '<button type="button" class="btn' + classe + '"' +
          (estilo ? ' style="' + estilo[1] + '"' : '') +
          ' onclick="bfCobrancaAbrir(' + (p ? "'" + p + "'" : '') + ')">' + rotulo + '</button>';
      });
  }
  ['promoFaixa', 'promoBloco', 'blocoAssinatura'].forEach(function (nome) {
    if (typeof window[nome] !== 'function') return;
    var orig = window[nome];
    window[nome] = function () { return paraDentro(orig.apply(this, arguments)); };
  });
})();
