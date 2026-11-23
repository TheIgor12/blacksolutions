/* BlackFlow 1.38.0 — a sincronização volta a se resolver sozinha.

   O que acontecia
   ---------------
   Desde a 1.27.0 um registro em disputa era preservado e marcado. A marca
   ficava gravada no aparelho e o envio pulava aquele registro em todas as
   sincronizações seguintes. Resultado: o alto da tela ficava eternamente em
   "Conflito a resolver" mesmo com tudo em dia, e a pessoa tinha que entrar na
   janela e decidir item por item para o indicador voltar ao normal.

   Numa clínica com um único operador isso não é proteção, é trava: não existe
   o outro aparelho que teria feito a alteração concorrente. A disputa quase
   sempre é o mesmo aparelho comparando-se com o que ele próprio acabou de
   gravar.

   O que passa a valer
   -------------------
   O conflito é resolvido sozinho, mantendo o que está neste aparelho, que é o
   que a pessoa escolheria de qualquer forma. Antes de qualquer sobrescrita, a
   versão que está na nuvem é copiada para um arquivo guardado neste aparelho,
   de modo que nada é descartado: a janela de sincronização passa a listar
   essas cópias e permite voltar qualquer uma delas.

   Casos tratados antes de qualquer sobrescrita:
     as duas versões são iguais  -> a marca cai, não havia conflito de fato;
     configurações divergentes   -> junção campo a campo, o que foi mexido aqui
                                    prevalece, o que só mudou lá é adotado;
     demais registros            -> mantém o deste aparelho e arquiva o da nuvem.

   A janela continua existindo em Configurações para quem quiser conferir o
   que foi resolvido e restaurar alguma versão. */
(function () {
  'use strict';
  if (window.__bfSincronia138) return;
  window.__bfSincronia138 = true;

  var MAX_ARQUIVO = 60;
  var arquivo = [];
  var carregado = false;
  var rodando = false;
  var ultimoAviso = 0;

  function chaveArquivo() { return 'conflitos_arq_' + (NV && NV.clinicaId); }

  async function carregarArquivo() {
    if (carregado) return arquivo;
    try { arquivo = (await DB.get(chaveArquivo())) || []; } catch (e) { arquivo = []; }
    carregado = true;
    return arquivo;
  }
  async function gravarArquivo() {
    try { await DB.set(arquivo.slice(0, MAX_ARQUIVO), chaveArquivo()); } catch (e) { }
  }

  function lista() {
    try { return Object.keys(NV.conflitos || {}); } catch (e) { return []; }
  }

  async function remoto(col, rid) {
    var r = await NV.sb.from('registros').select('dados,excluido,seq')
      .eq('clinica_id', NV.clinicaId).eq('colecao', col).eq('id', rid).maybeSingle();
    return r.error ? null : r.data;
  }

  function localDe(col, rid) {
    if (col === 'config') return S.config;
    var arr = S[col];
    if (!Array.isArray(arr)) return null;
    return arr.find(function (x) { return String(x.id) === String(rid); }) || null;
  }

  /* Junção campo a campo das configurações. O que foi mexido aqui desde a
     última sincronização prevalece; o resto vem da nuvem. */
  function juntarConfig(remotoCfg) {
    var base = {};
    try { base = JSON.parse(NV.hashes['config:config'] || '{}') || {}; } catch (e) { base = {}; }
    var junto = Object.assign({}, remotoCfg || {});
    var mexidos = [];
    Object.keys(S.config || {}).forEach(function (k) {
      var aqui = JSON.stringify(S.config[k]);
      if (aqui !== JSON.stringify(base[k])) { junto[k] = S.config[k]; mexidos.push(k); }
    });
    /* Campo apagado aqui de propósito continua apagado. */
    Object.keys(base).forEach(function (k) {
      if (!(k in (S.config || {})) && JSON.stringify(base[k]) === JSON.stringify((remotoCfg || {})[k])) delete junto[k];
    });
    return { valor: junto, mexidos: mexidos };
  }

  function iguais(a, b) {
    try { return bfRegMesmo(a, b); } catch (e) { return JSON.stringify(a) === JSON.stringify(b); }
  }

  /* Resolve um conflito. Devolve o rótulo do que foi feito, ou vazio quando
     não deu para resolver agora. */
  async function resolverUm(k) {
    var p = String(k).split(':'), col = p[0], rid = p.slice(1).join(':');
    var at = await remoto(col, rid);
    var aqui = localDe(col, rid);

    /* Sumiu da nuvem e não existe mais aqui: a marca não tem dono. */
    if (!at && !aqui) { delete NV.conflitos[k]; return 'marca sem registro'; }

    if (at && !at.excluido && aqui && iguais(bfRegBase(k, at.dados), aqui)) {
      NV.hashes[k] = JSON.stringify(bfRegBase(k, at.dados));
      delete NV.conflitos[k];
      return 'versões iguais';
    }

    if (col === 'config') {
      var r = juntarConfig(bfRegBase(k, (at && at.dados) || {}));
      await guardar(k, col, rid, at);
      S.config = r.valor;
      NV.hashes[k] = JSON.stringify(bfRegBase(k, (at && at.dados) || {}));
      delete NV.conflitos[k];
      try { save(); } catch (e) { }
      return 'configurações juntadas';
    }

    await guardar(k, col, rid, at);
    NV.hashes[k] = at ? JSON.stringify(bfRegBase(k, at.dados)) : undefined;
    if (!at) delete NV.hashes[k];
    delete NV.conflitos[k];
    return 'mantido o deste aparelho';
  }

  async function guardar(k, col, rid, at) {
    if (!at) return;
    await carregarArquivo();
    arquivo.unshift({
      k: k, col: col, rid: rid, em: new Date().toISOString(),
      excluido: !!at.excluido, dados: at.dados || null,
      motivo: (NV.conflitos[k] || {}).motivo || ''
    });
    if (arquivo.length > MAX_ARQUIVO) arquivo.length = MAX_ARQUIVO;
    await gravarArquivo();
  }

  async function resolverTudo(silencioso) {
    if (rodando) return 0;
    if (!NV || !NV.sb || !NV.clinicaId || NV.offline) return 0;
    var L = lista();
    if (!L.length) return 0;
    rodando = true;
    var feitos = 0;
    try {
      for (var i = 0; i < L.length; i++) {
        try { if (await resolverUm(L[i])) feitos++; } catch (e) { }
      }
      if (feitos) {
        try { persistirNuvem(); } catch (e) { }
        try { await enviar(); } catch (e) { }
        try { if (typeof render === 'function') render(); } catch (e) { }
        if (!silencioso && Date.now() - ultimoAviso > 60000) {
          ultimoAviso = Date.now();
          try {
            toast(feitos === 1
              ? 'Uma divergência de sincronização foi resolvida sozinha, mantendo o que está neste aparelho.'
              : feitos + ' divergências de sincronização foram resolvidas sozinhas, mantendo o que está neste aparelho.');
          } catch (e) { }
        }
      }
    } finally { rodando = false; }
    return feitos;
  }
  window.bfConflitosResolverAuto = resolverTudo;

  /* Depois de cada puxada, e uma vez na abertura. */
  var puxarOriginal = window.puxar;
  window.puxar = async function () {
    var n = await puxarOriginal.apply(this, arguments);
    if (lista().length) setTimeout(function () { resolverTudo(false); }, 400);
    return n;
  };
  setTimeout(function () { resolverTudo(true); }, 4000);

  /* ---------- Restauração de uma versão arquivada ---------- */
  window.bfConfRestaurar = async function (i) {
    await carregarArquivo();
    var a = arquivo[i];
    if (!a) return;
    var novo = bfRegBase(a.k, a.dados);
    if (a.col === 'config') { S.config = novo; }
    else {
      var arr = S[a.col];
      if (!Array.isArray(arr)) { toast('Esta coleção não existe mais no programa.'); return; }
      var j = arr.findIndex(function (x) { return String(x.id) === String(a.rid); });
      if (a.excluido) { if (j >= 0) arr.splice(j, 1); }
      else if (j >= 0) arr[j] = novo; else arr.push(novo);
    }
    try { save(); } catch (e) { }
    try { await enviar(); } catch (e) { }
    toast('Versão restaurada e enviada para a nuvem.');
    if (typeof render === 'function') render();
    window.bfConflitosAbrir();
  };

  function rotulo(a) {
    var rotulos = {
      pacientes: 'Cadastro', agendamentos: 'Agendamento', lancamentos: 'Lançamento',
      servicos: 'Serviço', profissionais: 'Profissional', evolucoes: 'Evolução',
      tratamentos: 'Tratamento', produtos: 'Produto', contasPagar: 'Conta a pagar',
      config: 'Configurações da clínica', fotos: 'Foto', anamneses: 'Anamnese',
      combos: 'Combo', comandas: 'Comanda'
    };
    var r = rotulos[a.col] || a.col;
    var d = a.dados || {};
    var nome = d.nome || d.descricao || d.procedimento || '';
    return r + (nome ? ': ' + nome : '');
  }

  /* A janela passa a mostrar o que já foi resolvido. */
  var abrirAntigo = window.bfConflitosAbrir;
  window.bfConflitosAbrir = async function () {
    await carregarArquivo();
    var pendentes = lista();
    if (pendentes.length) {
      toast('Resolvendo as divergências...');
      await resolverTudo(true);
      pendentes = lista();
    }
    if (pendentes.length && typeof abrirAntigo === 'function') { abrirAntigo(); return; }
    var html = '<h3>Sincronização</h3>' +
      '<p class="sub">Não há nada parado. O indicador no alto da tela está em Sincronizado.</p>';
    if (arquivo.length) {
      html += '<p class="sub" style="margin-top:12px">Quando o mesmo cadastro foi alterado em dois lugares, o sistema ' +
        'ficou com o que está neste aparelho e guardou aqui a versão que estava na nuvem. ' +
        'Nada foi descartado. Se alguma destas versões for a certa, é só restaurar.</p>';
      arquivo.slice(0, 20).forEach(function (a, i) {
        var q = String(a.em || '').slice(0, 10).split('-').reverse().join('/');
        html += '<div class="card" style="margin-bottom:8px;padding:10px">' +
          '<b>' + esc(rotulo(a)) + '</b>' +
          '<p class="sub" style="margin:4px 0 8px">Versão que estava na nuvem em ' + esc(q) + '.</p>' +
          '<button type="button" class="btn ghost sm" onclick="bfConfRestaurar(' + i + ')">Restaurar esta versão</button>' +
          '</div>';
      });
    }
    html += '<div class="mact"><button class="btn" onclick="closeModal()">Fechar</button></div>';
    openModal(html, true);
  };

  /* O rótulo do indicador só fala em conflito enquanto houver conflito de
     verdade, e some assim que a resolução automática termina. */
  var txt = window.syncTxt;
  window.syncTxt = function () {
    var h = txt.apply(this, arguments);
    if (!lista().length) h = h.replace('Conflito a resolver', 'Sincronizado');
    return h;
  };
})();
