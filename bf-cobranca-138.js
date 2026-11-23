/* BlackFlow 1.38.0 — a assinatura é fechada aqui dentro.

   Antes, o botão de assinar levava para um endereço do prestador, em outra
   aba. A pessoa saía do sistema no momento em que mais precisava de confiança,
   via outra marca na barra do navegador e, quando voltava, o sistema não sabia
   se ela tinha pago.

   Agora a tela de cobrança é do próprio sistema. O Pix aparece com o QR Code e
   o copia e cola na mesma janela, e o cartão é preenchido aqui e enviado uma
   única vez para o prestador pela função de servidor.

   O que este arquivo nunca faz
   ----------------------------
   Não guarda número de cartão, não grava em nenhum lugar deste aparelho e não
   repete o número na tela depois do envio. Os campos são limpos assim que a
   resposta chega. O que fica visível depois é a bandeira e os quatro últimos
   dígitos, devolvidos pelo prestador.

   Artigo 49 do Código de Defesa do Consumidor
   -------------------------------------------
   Contratação feita fora do estabelecimento dá sete dias de arrependimento. O
   aviso aparece antes da confirmação, e o cancelamento é feito por aqui mesmo,
   sem depender de atendimento. */
(function () {
  'use strict';
  if (window.__bfCobranca138) return;
  window.__bfCobranca138 = true;

  var CB = { plano: '', estado: null, timer: null, tentativas: 0 };

  function esc_(v) { return esc(v == null ? '' : String(v)); }
  function moeda(v) {
    return 'R$ ' + (Number(v) || 0).toFixed(2).replace('.', ',');
  }
  function planoAtual() {
    if (CB.plano) return CB.plano;
    var seg = (S.config && S.config.segmento) || NV.segmento || '';
    if (seg === 'barbearia') return 'barbearia';
    if (seg === 'biomedicina') return 'biomedicina';
    if (seg === 'odontologia') return 'odontologia';
    if (NV.plano === 'agenda') return 'agenda';
    return 'completo';
  }

  async function chamar(corpo) {
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
  }

  var AVISO_49 =
    '<div class="note" style="margin:10px 0">Você tem <b>sete dias</b> para desistir, contados da ' +
    'contratação, com devolução integral do que foi pago, conforme o artigo 49 do Código de Defesa ' +
    'do Consumidor. O cancelamento é feito por esta mesma tela, sem precisar falar com ninguém. ' +
    'Não há fidelidade e não há multa.</div>';

  /* ---------------- Tela principal ---------------- */
  window.bfCobrancaAbrir = async function (plano) {
    if (plano) CB.plano = plano;
    openModal('<h3>Assinatura</h3><p class="sub">Abrindo a cobrança...</p>');
    var e;
    try { e = await chamar({ acao: 'estado' }); } catch (err) { e = { configurado: false, erro: String(err.message || err) }; }
    CB.estado = e;
    if (!e.configurado) { telaDesligada(e); return; }
    telaEscolha();
  };

  function telaDesligada(e) {
    var a = (typeof ASSINATURA !== 'undefined' && ASSINATURA) || {};
    var link = (a.planos && a.planos[planoAtual()] && a.planos[planoAtual()].link) || a.link_pix || '';
    openModal('<h3>Assinatura</h3>' +
      '<p class="sub">A cobrança dentro do sistema ainda não foi ligada nesta instalação. ' +
      'Enquanto isso, a contratação segue pelo prestador.</p>' +
      (link ? '<a class="btn" style="width:100%" href="' + esc_(link) + '" target="_blank" rel="noopener">Abrir a contratação</a>' : '') +
      (a.contato ? '<p class="sub" style="margin-top:10px">Dúvidas: <a class="lnk" href="' + esc_(a.contato) + '" target="_blank" rel="noopener">falar com a BlackSolutions</a></p>' : '') +
      '<div class="mact"><button class="btn ghost" onclick="closeModal()">Fechar</button></div>', false);
  }

  function telaEscolha() {
    var e = CB.estado || {}, P = (e.planos || {})[planoAtual()] || {};
    var ass = e.assinatura;
    var cab = '<h3>Assinatura</h3>' +
      '<div class="card" style="margin:0 0 12px;padding:14px;background:var(--acc-soft)">' +
      '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px">' +
      '<b>BlackFlow ' + esc_(P.nome || '') + '</b>' +
      '<span style="font-size:22px;font-weight:800">' + esc_(moeda(P.valor)) + '</span></div>' +
      '<p class="sub" style="margin:6px 0 0">Mensal, sem fidelidade. Dá para cancelar por aqui a qualquer momento.</p></div>';

    if (ass && ['ATIVA', 'ACTIVE', 'PAGA'].indexOf(String(ass.status).toUpperCase()) >= 0) {
      openModal(cab +
        '<p class="sub">Assinatura ativa' + (ass.cartao ? ' no cartão ' + esc_(ass.cartao) : ' por Pix') +
        (ass.proxima ? ', próxima cobrança em ' + esc_(br(ass.proxima)) : '') + '.</p>' +
        AVISO_49 +
        '<div class="mact" style="flex-wrap:wrap">' +
        '<button class="btn ghost" onclick="bfCobrancaCancelar()">Cancelar assinatura</button>' +
        '<button class="btn" onclick="closeModal()">Fechar</button></div>', true);
      return;
    }

    openModal(cab +
      '<div class="ast">Como você prefere pagar?</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button type="button" class="btn" onclick="bfCobrancaPix()">Pix, agora</button>' +
      '<button type="button" class="btn ghost" onclick="bfCobrancaCartaoForm()">Cartão de crédito</button>' +
      '</div>' +
      '<p class="sub" style="margin-top:12px">No Pix, o acesso é liberado assim que o pagamento cai, ' +
      'sem você sair desta tela. No cartão, a renovação é automática todo mês e pode ser cancelada aqui.</p>' +
      AVISO_49 +
      '<div class="mact"><button class="btn ghost" onclick="closeModal()">Agora não</button></div>', true);
  }

  /* ---------------- Pix ---------------- */
  window.bfCobrancaPix = async function () {
    openModal('<h3>Pix</h3><p class="sub">Gerando a cobrança...</p>');
    var r;
    try { r = await chamar({ acao: 'pix' }); }
    catch (e) { erro(String(e.message || e), 'bfCobrancaAbrir()'); return; }

    var img = r.imagem ? '<img alt="QR Code do Pix" style="width:220px;height:220px;display:block;margin:0 auto;border-radius:10px;background:#fff;padding:8px" src="data:image/png;base64,' + esc_(r.imagem) + '">' : '';
    openModal('<h3>Pague ' + esc_(moeda(r.valor)) + ' por Pix</h3>' +
      '<p class="sub" style="margin-bottom:12px">' +
      (r.reaproveitada ? 'Esta é a cobrança em aberto da sua assinatura, nenhuma cobrança nova foi criada. ' : '') +
      'Aponte a câmera do aplicativo do seu banco para o código. ' +
      'Assim que o pagamento cair, esta tela avisa sozinha.</p>' + img +
      '<label style="margin-top:12px">Pix copia e cola' +
      '<textarea id="bfPixCodigo" readonly rows="3" style="font-family:ui-monospace,monospace;font-size:12px">' + esc_(r.copia_e_cola) + '</textarea></label>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button type="button" class="btn sm" onclick="bfCobrancaCopiar()">Copiar o código</button>' +
      '<button type="button" class="btn ghost sm" onclick="bfCobrancaConferir(true)">Já paguei, conferir</button></div>' +
      '<p class="sub" id="bfPixSit" style="margin-top:10px">Aguardando o pagamento...</p>' +
      '<div class="mact"><button class="btn ghost" onclick="bfCobrancaParar();closeModal()">Fechar</button></div>', true);

    CB.tentativas = 0;
    clearInterval(CB.timer);
    CB.timer = setInterval(function () { window.bfCobrancaConferir(false); }, 7000);
  };

  window.bfCobrancaCopiar = function () {
    var t = document.getElementById('bfPixCodigo');
    if (!t) return;
    try {
      navigator.clipboard.writeText(t.value).then(function () { toast('Código copiado.'); },
        function () { t.select(); toast('Selecionado. Use copiar do seu aparelho.'); });
    } catch (e) { t.select(); }
  };

  window.bfCobrancaParar = function () { clearInterval(CB.timer); CB.timer = null; };

  window.bfCobrancaConferir = async function (manual) {
    CB.tentativas++;
    if (CB.tentativas > 90) { window.bfCobrancaParar(); return; }
    var sit = document.getElementById('bfPixSit');
    try {
      var r = await chamar({ acao: 'conferir' });
      if (r.pago) {
        window.bfCobrancaParar();
        toast('Pagamento confirmado. Assinatura ativa.');
        closeModal();
        if (typeof entrar === 'function' && NV.sessao) await entrar(NV.sessao);
        return;
      }
      if (sit) sit.textContent = manual ? 'Ainda não caiu. O banco pode levar alguns segundos.' : 'Aguardando o pagamento...';
    } catch (e) {
      if (sit && manual) sit.textContent = String(e.message || e);
    }
  };

  /* ---------------- Cartão ---------------- */
  window.bfCobrancaCartaoForm = function () {
    var e = CB.estado || {}, P = (e.planos || {})[planoAtual()] || {};
    openModal('<h3>Cartão de crédito</h3>' +
      '<p class="sub" style="margin-bottom:10px">' + esc_(moeda(P.valor)) + ' por mês, com renovação automática. ' +
      'Os dados vão direto para o prestador de pagamento e não ficam guardados neste aparelho.</p>' +
      '<form onsubmit="bfCobrancaCartaoEnviar();return false" autocomplete="on">' +
      '<label>Número do cartão<input id="bfCcNum" inputmode="numeric" autocomplete="cc-number" maxlength="23" placeholder="0000 0000 0000 0000"></label>' +
      '<label>Nome impresso no cartão<input id="bfCcNome" autocomplete="cc-name" placeholder="Como está escrito no cartão"></label>' +
      '<div style="display:flex;gap:10px"><label style="flex:1">Validade<input id="bfCcVal" inputmode="numeric" autocomplete="cc-exp" maxlength="7" placeholder="MM/AAAA"></label>' +
      '<label style="flex:1">Código de segurança<input id="bfCcCvv" inputmode="numeric" autocomplete="cc-csc" maxlength="4" placeholder="000"></label></div>' +
      '<label>CPF ou CNPJ do titular<input id="bfCcDoc" inputmode="numeric" placeholder="000.000.000-00"></label>' +
      '<div style="display:flex;gap:10px"><label style="flex:1">CEP<input id="bfCcCep" inputmode="numeric" autocomplete="postal-code" maxlength="9" placeholder="00000-000"></label>' +
      '<label style="flex:1">Número<input id="bfCcNumEnd" placeholder="123"></label></div>' +
      '<label>Celular do titular<input id="bfCcTel" inputmode="numeric" autocomplete="tel" placeholder="(00) 00000-0000"></label>' +
      AVISO_49 +
      '<div id="bfCcMsg" class="authmsg err" style="display:none"></div>' +
      '<button class="btn" id="bfCcBt" style="width:100%">Confirmar assinatura de ' + esc_(moeda(P.valor)) + '</button>' +
      '</form>' +
      '<div class="mact"><button class="btn ghost" onclick="bfCobrancaAbrir()">Voltar</button></div>', true);
    var t = document.getElementById('bfCcTel');
    if (t && S.config && S.config.telefone) t.value = S.config.telefone;
  };

  function msgCartao(t) {
    var e = document.getElementById('bfCcMsg');
    if (!e) return;
    e.style.display = t ? 'block' : 'none';
    e.textContent = t || '';
  }

  window.bfCobrancaCartaoEnviar = async function () {
    var g = function (id) { var e = document.getElementById(id); return e ? e.value.trim() : ''; };
    var val = g('bfCcVal').replace(/\D/g, '');
    if (val.length < 4) { msgCartao('Informe a validade no formato mês e ano.'); return; }
    var mes = val.slice(0, 2), ano = val.slice(2);
    var bt = document.getElementById('bfCcBt');
    if (bt) { bt.disabled = true; bt.textContent = 'Enviando...'; }
    msgCartao('');
    var corpo = {
      acao: 'cartao',
      documento: g('bfCcDoc').replace(/\D/g, ''),
      cep: g('bfCcCep').replace(/\D/g, ''),
      numero: g('bfCcNumEnd'),
      celular: g('bfCcTel').replace(/\D/g, ''),
      cartao: {
        numero: g('bfCcNum').replace(/\D/g, ''),
        titular: g('bfCcNome'),
        mes: mes, ano: ano,
        ccv: g('bfCcCvv').replace(/\D/g, '')
      }
    };
    var r;
    try { r = await chamar(corpo); }
    catch (e) {
      limparCampos();
      if (bt) { bt.disabled = false; bt.textContent = 'Tentar de novo'; }
      msgCartao(String(e.message || e));
      return;
    }
    limparCampos();
    if (r.reaproveitada) {
      openModal('<h3>Você já é assinante</h3>' +
        '<p class="sub">' + esc_(r.aviso || 'Já existe uma assinatura ativa neste CPF ou CNPJ. Nenhuma cobrança nova foi criada.') + '</p>' +
        '<div class="mact"><button class="btn" onclick="bfCobrancaFim()">Continuar</button></div>', true);
      return;
    }
    openModal('<h3>Assinatura confirmada</h3>' +
      '<p class="sub">Cartão ' + esc_(r.cartao || '') + '. ' +
      (r.pago ? 'O pagamento já foi aprovado e o acesso está liberado.' :
        'A cobrança foi criada e o prestador está processando. Assim que o cartão aprovar, o acesso é liberado sozinho.') +
      (r.proxima ? ' Próxima cobrança em ' + esc_(br(r.proxima)) + '.' : '') + '</p>' +
      AVISO_49 +
      '<div class="mact"><button class="btn" onclick="bfCobrancaFim()">Continuar</button></div>', true);
  };

  function limparCampos() {
    ['bfCcNum', 'bfCcNome', 'bfCcVal', 'bfCcCvv'].forEach(function (id) {
      var e = document.getElementById(id);
      if (e) e.value = '';
    });
  }

  window.bfCobrancaFim = async function () {
    closeModal();
    if (typeof entrar === 'function' && NV.sessao) await entrar(NV.sessao);
  };

  window.bfCobrancaCancelar = async function () {
    openModal('<h3>Cancelar a assinatura</h3>' +
      '<p class="sub">O acesso continua até o fim do período já pago. Seus dados ficam guardados. ' +
      'Dentro dos sete dias da contratação, o valor pago é devolvido, na forma do artigo 49 do ' +
      'Código de Defesa do Consumidor.</p>' +
      '<div class="mact" style="flex-wrap:wrap">' +
      '<button class="btn ghost" onclick="bfCobrancaCancelarConfirmar()">Sim, cancelar</button>' +
      '<button class="btn" onclick="bfCobrancaAbrir()">Continuar assinante</button></div>', false);
  };
  window.bfCobrancaCancelarConfirmar = async function () {
    try {
      var r = await chamar({ acao: 'cancelar' });
      toast(r.aviso || 'Assinatura cancelada.');
      closeModal();
    } catch (e) { toast(String(e.message || e)); }
  };

  function erro(t, voltar) {
    openModal('<h3>Não deu para seguir</h3><p class="sub">' + esc_(t) + '</p>' +
      '<div class="mact"><button class="btn" onclick="' + voltar + '">Voltar</button>' +
      '<button class="btn ghost" onclick="closeModal()">Fechar</button></div>', false);
  }

  /* ---------------- Entra no lugar dos endereços externos ---------------- */
  function trocarBloco() {
    if (typeof window.blocoAssinatura !== 'function') return;
    var original = window.blocoAssinatura;
    window.blocoAssinatura = function () {
      var h = original.apply(this, arguments);
      /* Cada botão que levava para fora passa a abrir a cobrança aqui dentro. */
      h = h.replace(/<a class="btn([^"]*)" style="width:100%" href="[^"]*" target="_blank" rel="noopener">([^<]*)<\/a>/g,
        function (_t, classe, rotulo) {
          var p = /s[óo] agenda/i.test(rotulo) ? 'agenda' : '';
          return '<button type="button" class="btn' + classe + '" style="width:100%" ' +
            'onclick="bfCobrancaAbrir(' + (p ? "'" + p + "'" : '') + ')">' + rotulo + '</button>';
        });
      return h;
    };
  }
  trocarBloco();
})();
