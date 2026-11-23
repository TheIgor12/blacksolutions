/* BlackFlow 1.34.0 — modo local: os dados ficam no aparelho.

   Por que existe
   --------------
   Cada clínica nova gravando prontuário, agenda e financeiro no Supabase faz
   o banco crescer sem parar, e o próximo degrau de plano é cobrado em dólar.
   A maior parte das contas não precisa de nuvem: uma pessoa, um aparelho,
   um consultório.

   O que o modo local faz
   ----------------------
   Conta nova nasce em modo local. Prontuário, agenda, financeiro, fotos e
   documentos ficam no próprio aparelho, no banco do navegador, que é onde
   eles já ficavam como cópia. A diferença é que agora não sobem.

   O que continua na nuvem, sempre
   ------------------------------
   Apenas a identidade da conta: quem é a clínica, qual o plano e até quando
   está paga. Sem isso não há como cobrar, nem bloquear quem não pagou, nem
   atender no suporte. São poucas linhas por clínica, que não crescem com o
   uso.

   O que o modo local custa, e precisa ser dito a quem assina
   ---------------------------------------------------------
   Sem nuvem não existe sincronização: a recepção no computador e a
   profissional no celular não enxergam a mesma agenda. O agendamento online
   pelo paciente também não funciona, porque o link lê do servidor. E se o
   aparelho for perdido, formatado, ou se o histórico do navegador for
   limpo, os dados vão junto. Por isso este módulo insiste na cópia de
   segurança, e insiste de novo quando ela está velha.

   Sobre "criar uma pasta sozinho"
   -------------------------------
   Nenhum site cria pasta no disco por conta própria, em nenhum navegador.
   O que existe é a pessoa escolher a pasta uma vez, e aí o sistema passa a
   gravar nela sem perguntar de novo. Isso funciona no Chrome e no Edge do
   computador. No iPhone, no iPad e no Firefox essa permissão não existe, e
   lá a cópia sai como arquivo baixado. Em todos os casos os dados do dia a
   dia continuam no aparelho: a pasta é a cópia de segurança, não o lugar
   onde o sistema trabalha. */
(function () {
  'use strict';
  if (window.__bfLocal) return;
  window.__bfLocal = true;

  var CHAVE_PASTA = 'bf-pasta-backup';
  var LEMBRAR_DIAS = 3;

  function cfg() { try { return S.config || {}; } catch (e) { return {}; } }
  function modo() {
    var m = texto(cfg().modoDados);
    if (m === 'local' || m === 'nuvem') return m;
    /* Conta que já vinha sincronizando continua na nuvem. Conta nova, não. */
    return (cfg().nuvemJaUsada || (typeof NV !== 'undefined' && NV.cursor > 0)) ? 'nuvem' : 'local';
  }
  function texto(v) { return v == null ? '' : String(v).trim(); }
  window.bfModoDados = modo;
  window.bfEhLocal = function () { return modo() === 'local'; };

  /* ---------- Trava da sincronização ---------- */
  var puxarOriginal = window.puxar;
  var enviarOriginal = window.enviar;
  var filaOriginal = window.filaEnviar;
  var nuvemFotosOriginal = window.nuvemFotos;

  window.puxar = async function () { return modo() === 'local' ? 0 : puxarOriginal.apply(this, arguments); };
  window.enviar = async function () {
    if (modo() === 'local') { try { setSync('local'); } catch (e) { } return; }
    return enviarOriginal.apply(this, arguments);
  };
  window.filaEnviar = async function () { if (modo() === 'local') return; return filaOriginal.apply(this, arguments); };
  window.nuvemFotos = function () { return modo() === 'local' ? false : nuvemFotosOriginal.apply(this, arguments); };

  var txtSync = window.syncTxt;
  window.syncTxt = function () {
    if (modo() === 'local') {
      var q = idadeCopia();
      var cor = (q === null || q > LEMBRAR_DIAS) ? '#f5c542' : '#3ad37a';
      return '<i style="background:' + cor + '"></i>Neste aparelho';
    }
    return txtSync.apply(this, arguments);
  };

  /* ---------- Cópia de segurança ---------- */
  function temPastaNativa() {
    return typeof window.showDirectoryPicker === 'function';
  }
  function idadeCopia() {
    var d = texto(cfg().copiaEm);
    if (!d) return null;
    var ms = Date.now() - new Date(d).getTime();
    return Math.floor(ms / 86400000);
  }

  var pastaMem = null;
  async function guardarPasta(h) {
    pastaMem = h;
    try {
      var db = await abrirDB();
      await new Promise(function (ok, erro) {
        var t = db.transaction('h', 'readwrite');
        t.objectStore('h').put(h, CHAVE_PASTA);
        t.oncomplete = ok; t.onerror = function () { erro(t.error); };
      });
    } catch (e) { }
  }
  async function lerPasta() {
    if (pastaMem) return pastaMem;
    try {
      var db = await abrirDB();
      var h = await new Promise(function (ok, erro) {
        var t = db.transaction('h', 'readonly');
        var r = t.objectStore('h').get(CHAVE_PASTA);
        r.onsuccess = function () { ok(r.result || null); };
        r.onerror = function () { erro(r.error); };
      });
      if (!h) return null;
      var p = await h.queryPermission({ mode: 'readwrite' });
      if (p === 'granted') { pastaMem = h; return h; }
      return h; // precisa de novo toque da pessoa
    } catch (e) { return null; }
  }
  function abrirDB() {
    return new Promise(function (ok, erro) {
      var r = indexedDB.open('bf-pasta', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('h'); };
      r.onsuccess = function () { ok(r.result); };
      r.onerror = function () { erro(r.error); };
    });
  }

  function conteudo() {
    var d = {
      sistema: 'BlackFlow',
      versao: (typeof VERSAO_APP !== 'undefined') ? VERSAO_APP : '',
      clinica: cfg().clinica || '',
      geradoEm: new Date().toISOString(),
      dados: {}
    };
    ['pacientes', 'agendamentos', 'lancamentos', 'servicos', 'profissionais', 'evolucoes',
     'tratamentos', 'anamneses', 'produtos', 'contasPagar', 'combos', 'comandas',
     'movEstoque', 'exames', 'documentos', 'fotos', 'config'].forEach(function (k) {
      if (S[k] !== undefined) d.dados[k] = S[k];
    });
    return JSON.stringify(d);
  }
  function nomeArquivo() {
    var n = (cfg().clinica || 'blackflow').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    var d = new Date();
    var p = function (x) { return String(x).padStart(2, '0'); };
    return 'backup-' + n + '-' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + '.json';
  }

  async function gravarNaPasta(silencioso) {
    var h = await lerPasta();
    if (!h) return false;
    try {
      var p = await h.queryPermission({ mode: 'readwrite' });
      if (p !== 'granted') {
        if (silencioso) return false;
        p = await h.requestPermission({ mode: 'readwrite' });
        if (p !== 'granted') return false;
      }
      var arq = await h.getFileHandle(nomeArquivo(), { create: true });
      var w = await arq.createWritable();
      await w.write(conteudo());
      await w.close();
      S.config.copiaEm = new Date().toISOString();
      save();
      if (!silencioso) toast('Cópia de segurança gravada na pasta.');
      return true;
    } catch (e) { return false; }
  }

  window.bfEscolherPasta = async function () {
    if (!temPastaNativa()) { bfBaixarCopia(); return; }
    try {
      var h = await window.showDirectoryPicker({ id: 'blackflow', mode: 'readwrite', startIn: 'documents' });
      await guardarPasta(h);
      await gravarNaPasta(false);
      if (typeof render === 'function') render();
    } catch (e) { /* a pessoa fechou a janela */ }
  };

  window.bfBaixarCopia = function () {
    var b = new Blob([conteudo()], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = nomeArquivo();
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    S.config.copiaEm = new Date().toISOString();
    save();
    toast('Cópia de segurança salva nos seus downloads.');
    if (typeof render === 'function') render();
  };

  window.bfRestaurarCopia = function () {
    var i = document.createElement('input');
    i.type = 'file'; i.accept = '.json,application/json';
    i.onchange = async function () {
      var f = i.files && i.files[0];
      if (!f) return;
      try {
        var j = JSON.parse(await f.text());
        if (!j || !j.dados) { toast('Esse arquivo não é uma cópia do BlackFlow.'); return; }
        confirmModal('Trazer de volta a cópia de <b>' + esc(j.clinica || 'clínica') + '</b>, gerada em ' +
          esc(String(j.geradoEm || '').slice(0, 10).split('-').reverse().join('/')) +
          '? Tudo o que está neste aparelho agora será substituído.', function () {
            Object.keys(j.dados).forEach(function (k) { S[k] = j.dados[k]; });
            save();
            toast('Cópia restaurada.');
            if (typeof render === 'function') render();
          }, 'Substituir pelos dados da cópia');
      } catch (e) { toast('Não foi possível ler o arquivo.'); }
    };
    i.click();
  };

  /* Grava sozinho quando houver pasta escolhida: ao sair e de hora em hora. */
  async function auto() { if (modo() === 'local') await gravarNaPasta(true); }
  setInterval(auto, 3600000);
  window.addEventListener('beforeunload', function () { if (modo() === 'local') gravarNaPasta(true); });

  /* ---------- Troca de modo ---------- */
  window.bfModoTrocar = function (novo) {
    if (novo === 'nuvem') {
      confirmModal('Ligar a nuvem envia para o servidor os pacientes, a agenda, o financeiro e as fotos ' +
        'desta clínica, e passa a manter tudo sincronizado entre os aparelhos. Também libera o agendamento ' +
        'online pelo paciente. Pode levar alguns minutos na primeira vez.', function () {
          S.config.modoDados = 'nuvem';
          S.config.nuvemJaUsada = true;
          save();
          toast('Nuvem ligada. Enviando...');
          try { sincronizar(); } catch (e) { }
          if (typeof render === 'function') render();
        }, 'Ligar a nuvem');
      return;
    }
    confirmModal('Desligar a nuvem faz os dados pararem de subir. Eles continuam neste aparelho, mas ' +
      '<b>os outros aparelhos deixam de receber as novidades</b> e o agendamento online pelo paciente para de ' +
      'funcionar. O que já está no servidor continua lá.', function () {
        S.config.modoDados = 'local';
        save();
        toast('Agora os dados ficam só neste aparelho.');
        if (typeof render === 'function') render();
      }, 'Deixar só neste aparelho');
  };

  /* ---------- Cartão em Configurações ---------- */
  window.bfCardLocal = function () {
    var local = modo() === 'local';
    var dias = idadeCopia();
    var quando = texto(cfg().copiaEm);
    var atraso = (dias === null || dias > LEMBRAR_DIAS);
    return '<div class="card"><h2>Onde os seus dados ficam</h2>' +
      '<div class="row"><span>Modo</span><span><b>' + (local ? 'Somente neste aparelho' : 'Sincronizado com a nuvem') + '</b></span></div>' +
      '<p class="sub" style="margin:8px 0 12px">' + (local
        ? 'Prontuário, agenda, financeiro e fotos ficam guardados neste aparelho e não sobem para o servidor. ' +
          'Isso deixa o sistema mais leve e mais barato de manter. Em troca, os outros aparelhos não enxergam ' +
          'estes dados e o agendamento online pelo paciente não funciona.'
        : 'Tudo o que você registra sobe para o servidor e aparece nos outros aparelhos da clínica. ' +
          'O agendamento online pelo paciente funciona.') + '</p>' +
      (local ? '<div class="card" style="margin:0 0 12px;background:var(--acc-soft);' +
        (atraso ? 'border-left:4px solid var(--bad,#e11d48)' : '') + '">' +
        '<b>Cópia de segurança</b>' +
        '<p class="sub" style="margin:6px 0 10px">' +
        (quando ? 'Última cópia em ' + esc(quando.slice(0, 10).split('-').reverse().join('/')) +
          (atraso ? '. Já faz ' + dias + ' dias. Faça uma agora.' : '.')
          : 'Nenhuma cópia foi feita ainda. Sem cópia, perder ou formatar este aparelho perde os dados da clínica.') +
        '</p>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
        (temPastaNativa()
          ? '<button type="button" class="btn sm" onclick="bfEscolherPasta()">Escolher a pasta e gravar</button>'
          : '<button type="button" class="btn sm" onclick="bfBaixarCopia()">Salvar a cópia agora</button>') +
        '<button type="button" class="btn ghost sm" onclick="bfBaixarCopia()">Baixar o arquivo</button>' +
        '<button type="button" class="btn ghost sm" onclick="bfRestaurarCopia()">Restaurar de um arquivo</button>' +
        '</div>' +
        (temPastaNativa()
          ? '<p class="sub" style="margin:10px 0 0">Escolhendo a pasta uma vez, o sistema grava sozinho nela a cada hora e ao fechar.</p>'
          : '<p class="sub" style="margin:10px 0 0">Neste aparelho o navegador não permite gravar direto numa pasta, então a cópia sai como arquivo para você guardar.</p>') +
        '</div>' : '') +
      '<div class="mact" style="justify-content:flex-start">' +
      (local
        ? '<button class="btn" onclick="bfModoTrocar(\'nuvem\')">Ligar a nuvem desta clínica</button>'
        : '<button class="btn ghost" onclick="bfModoTrocar(\'local\')">Deixar só neste aparelho</button>') +
      '</div></div>';
  };

  /* Entra na aba Backup e dados das Configurações. */
  var obs = new MutationObserver(function () {
    try {
      if (typeof UI === 'undefined' || UI.view !== 'config' || UI.cfgTab !== 'sistema') return;
      var p = document.querySelector('.page');
      if (!p || p.querySelector('#bfCardLocal')) return;
      var d = document.createElement('div');
      d.id = 'bfCardLocal';
      d.innerHTML = window.bfCardLocal();
      var h = p.querySelector('.phead');
      if (h && h.nextSibling) p.insertBefore(d, h.nextSibling); else p.appendChild(d);
    } catch (e) { }
  });
  obs.observe(document.body, { childList: true, subtree: true });

  /* Conta nova: deixa registrado que nasceu local, para não migrar sozinha. */
  var t = setInterval(function () {
    try {
      if (typeof S === 'undefined' || !S || !S.config) return;
      if (typeof UI !== 'undefined' && UI && UI.auth) return;
      if (texto(S.config.modoDados)) { clearInterval(t); return; }
      S.config.modoDados = (NV && NV.cursor > 0) ? 'nuvem' : 'local';
      if (S.config.modoDados === 'nuvem') S.config.nuvemJaUsada = true;
      save();
      clearInterval(t);
    } catch (e) { }
  }, 2500);
})();
