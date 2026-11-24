/* BlackFlow 1.39.0 — emitir NFS-e de dentro do sistema.

   A emissão acontece pela função de servidor bf-nfse, que fala com o
   integrador homologado. Daqui saem só o comando e a conferência: a chave do
   integrador nunca passa pelo navegador.

   O que esta tela promete e cumpre
   --------------------------------
   Antes de emitir, diz exatamente o que falta. Depois de emitir, mostra o
   número da nota, o código de verificação e os links do PDF e do XML
   devolvidos pela prefeitura ou pelo Ambiente Nacional. Se a nota for
   recusada, mostra o motivo que veio de lá, em vez de uma mensagem genérica.

   O que ela nunca faz
   -------------------
   Nunca escreve autorizada sem o retorno oficial. Nota fiscal inventada é
   crime, e quem responderia seria a clínica. */
(function () {
  'use strict';
  if (window.__bfNfse139) return;
  window.__bfNfse139 = true;

  function E(v) { return esc(v == null ? '' : String(v)); }

  async function chamar(corpo) {
    if (!NV.sb || !NV.sessao || !NV.clinicaId) throw new Error('Entre na conta da clínica.');
    var r = await NV.sb.functions.invoke('bf-nfse', {
      body: Object.assign({ clinica: NV.clinicaId }, corpo)
    });
    if (r.error) {
      var det = null;
      try { det = await r.error.context.json(); } catch (e) { }
      if (det && (det.impedimentos || det.erros)) return det;
      throw new Error((det && det.erro) || r.error.message || 'Não foi possível falar com o serviço fiscal.');
    }
    return r.data;
  }

  /* ---------------- Faixa de situação no alto da tela ---------------- */
  async function situacao() {
    var el = document.getElementById('bf-nfse-situacao');
    if (!el) return;
    var e;
    try { e = await chamar({ acao: 'estado' }); }
    catch (err) {
      el.innerHTML = '<b>Não foi possível conferir a situação fiscal agora.</b> ' + E(err.message || err);
      return;
    }
    if (!e.configurado) {
      el.innerHTML = '<b>Emissão ainda não ligada.</b> Falta gravar a chave do integrador fiscal no painel da ' +
        'BlackSolutions, em Fiscal. Enquanto isso, o rascunho e a conferência funcionam, e a emissão fica bloqueada.' +
        '<br><a href="https://www.nfse.gov.br/EmissorNacional" target="_blank" rel="noopener">Abrir o Emissor Nacional de NFS-e</a>';
      return;
    }
    if (!e.pode_emitir) {
      el.innerHTML = '<b>Falta pouco para emitir.</b><ul style="margin:8px 0 0 18px">' +
        (e.impedimentos || []).map(function (x) { return '<li>' + E(x) + '</li>'; }).join('') + '</ul>';
      return;
    }
    el.innerHTML = '<b>Emissão habilitada.</b> Integrador ' + E(e.integrador) +
      ', ambiente ' + E(e.ambiente === 'producao' ? 'produção' : 'homologação, sem validade fiscal') +
      ', modelo ' + E(e.rota === '/v2/nfse' ? 'municipal' : 'Ambiente Nacional') + '.' +
      (e.ambiente !== 'producao'
        ? ' <b>Atenção:</b> notas emitidas em homologação servem só para teste e não valem como documento fiscal.'
        : '');
  }
  window.bfNfseSituacao = situacao;

  /* ---------------- Emitir ---------------- */
  window.bfNfseEmitir = async function (id) {
    openModal('<h3>Emitir NFS-e</h3><p class="sub">Conferindo o cadastro fiscal e o rascunho...</p>');
    var e;
    try { e = await chamar({ acao: 'estado' }); }
    catch (err) { janelaErro(err.message || err); return; }

    if (!e.configurado) {
      openModal('<h3>Emissão não ligada</h3>' +
        '<p class="sub">A chave do integrador fiscal ainda não foi gravada. Sem ela, nenhuma nota pode ser ' +
        'transmitida. Isso é configuração da BlackSolutions, não da sua clínica.</p>' +
        '<div class="mact"><button class="btn" onclick="closeModal()">Entendi</button></div>');
      return;
    }
    if (!e.pode_emitir) { janelaFalta(e.impedimentos || []); return; }

    openModal('<h3>Confirmar a emissão</h3>' +
      '<p class="sub">A nota será transmitida ' +
      (e.ambiente === 'producao' ? 'em <b>produção</b>, com validade fiscal' : 'em <b>homologação</b>, apenas para teste') +
      ', pelo modelo ' + E(e.rota === '/v2/nfse' ? 'municipal' : 'Ambiente Nacional') + '.</p>' +
      (e.ambiente === 'producao'
        ? '<div class="note warn">Depois de autorizada, a nota só sai por cancelamento, com justificativa, dentro do prazo que o município permite.</div>'
        : '<div class="note">Em homologação, o documento não tem validade fiscal nem tributária.</div>') +
      '<div class="mact"><button class="btn ghost" onclick="closeModal()">Agora não</button>' +
      '<button class="btn" id="bfNfseOk">Emitir agora</button></div>');
    var bt = document.getElementById('bfNfseOk');
    if (!bt) return;
    bt.onclick = async function () {
      bt.disabled = true; bt.textContent = 'Transmitindo...';
      var r;
      try { r = await chamar({ acao: 'emitir', nota: id }); }
      catch (err) { janelaErro(err.message || err); return; }
      if (r && r.impedimentos) { janelaFalta(r.impedimentos); return; }
      if (r && r.status === 'autorizada') { janelaAutorizada(r); return; }
      if (r && String(r.status || '').indexOf('processando') === 0) {
        openModal('<h3>Em processamento</h3>' +
          '<p class="sub">A nota foi transmitida e a prefeitura ainda está processando. Use <b>Conferir emissão</b> ' +
          'na lista, daqui a pouco, para buscar o retorno.</p>' +
          '<div class="mact"><button class="btn" onclick="closeModal();render()">Fechar</button></div>');
        return;
      }
      janelaRecusa((r && r.erros) || ['O prestador não autorizou a nota.']);
    };
  };

  window.bfNfseConferir = async function (id) {
    toast('Conferindo com a prefeitura...');
    try {
      var r = await chamar({ acao: 'conferir', nota: id });
      if (r && r.status === 'autorizado') { janelaAutorizada(r.retorno || {}); return; }
      toast('Situação: ' + ((r && r.status) || 'sem retorno') + '.');
      render();
    } catch (e) { toast(String(e.message || e)); }
  };

  window.bfNfseCancelar = function (id) {
    openModal('<h3>Cancelar a NFS-e</h3>' +
      '<p class="sub">O cancelamento vai para a prefeitura com a sua justificativa, e só é aceito dentro do prazo ' +
      'que o município permite. Depois disso, o caminho é a carta de correção ou a substituição.</p>' +
      '<label>Justificativa, com pelo menos 15 caracteres' +
      '<textarea id="bfNfseJust" rows="3" placeholder="Ex.: Serviço não executado, cobrança duplicada."></textarea></label>' +
      '<div class="mact"><button class="btn ghost" onclick="closeModal()">Voltar</button>' +
      '<button class="btn danger" onclick="bfNfseCancelarOk(\'' + id + '\')">Cancelar a nota</button></div>');
  };
  window.bfNfseCancelarOk = async function (id) {
    var j = document.getElementById('bfNfseJust');
    var t = j ? String(j.value || '').trim() : '';
    if (t.length < 15) { toast('A justificativa precisa de pelo menos 15 caracteres.'); return; }
    try {
      var r = await chamar({ acao: 'cancelar', nota: id, justificativa: t });
      if (r && r.ok) { toast('Nota cancelada na prefeitura.'); closeModal(); render(); return; }
      janelaErro((r && r.erro) || 'O prestador recusou o cancelamento.');
    } catch (e) { janelaErro(String(e.message || e)); }
  };

  /* ---------------- Janelas ---------------- */
  function janelaAutorizada(r) {
    openModal('<h3>NFS-e autorizada</h3>' +
      '<div class="note" style="background:var(--ok-soft,#dcfce7)">' +
      (r.numero ? '<b>Número ' + E(r.numero) + '</b>' : '<b>Nota autorizada</b>') +
      (r.codigo_verificacao ? '<br>Código de verificação: ' + E(r.codigo_verificacao) : '') +
      (r.ambiente && r.ambiente !== 'producao' ? '<br><b>Homologação:</b> este documento não tem validade fiscal.' : '') +
      '</div>' +
      '<div class="mact" style="flex-wrap:wrap">' +
      (r.pdf ? '<a class="btn" href="' + E(r.pdf) + '" target="_blank" rel="noopener">Abrir o PDF da nota</a>' : '') +
      (r.xml ? '<a class="btn ghost" href="' + E(r.xml) + '" target="_blank" rel="noopener">Baixar o XML</a>' : '') +
      (r.link ? '<a class="btn ghost" href="' + E(r.link) + '" target="_blank" rel="noopener">Ver no portal</a>' : '') +
      '<button class="btn ghost" onclick="closeModal();render()">Fechar</button></div>');
  }
  function janelaFalta(lista) {
    openModal('<h3>Ainda não dá para emitir</h3>' +
      '<p class="sub">Corrija o que está abaixo e tente de novo. Nada foi transmitido.</p>' +
      '<ul style="margin:0 0 14px 18px">' + lista.map(function (x) { return '<li>' + E(x) + '</li>'; }).join('') + '</ul>' +
      '<div class="mact"><button class="btn ghost" onclick="closeModal();go(\'config\')">Abrir o cadastro fiscal</button>' +
      '<button class="btn" onclick="closeModal()">Fechar</button></div>');
  }
  function janelaRecusa(erros) {
    openModal('<h3>A nota não foi autorizada</h3>' +
      '<p class="sub">Este é o motivo informado pela prefeitura ou pelo Ambiente Nacional, sem alteração:</p>' +
      '<ul style="margin:0 0 14px 18px">' + erros.map(function (x) { return '<li>' + E(x) + '</li>'; }).join('') + '</ul>' +
      '<div class="note">O rascunho continua guardado. Corrija e emita de novo.</div>' +
      '<div class="mact"><button class="btn" onclick="closeModal();render()">Fechar</button></div>');
  }
  function janelaErro(t) {
    openModal('<h3>Não deu para seguir</h3><p class="sub">' + E(t) + '</p>' +
      '<div class="mact"><button class="btn" onclick="closeModal()">Fechar</button></div>');
  }

  /* A faixa de situação se atualiza sempre que a tela fiscal é desenhada. */
  var vezes = 0;
  setInterval(function () {
    if (UI.view !== 'bffiscal' || UI.auth) { vezes = 0; return; }
    var el = document.getElementById('bf-nfse-situacao');
    if (!el || el.dataset.pronto === '1') return;
    if (vezes++ > 30) return;
    el.dataset.pronto = '1';
    situacao();
  }, 900);
})();
