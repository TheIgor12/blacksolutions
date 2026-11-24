/* BlackFlow 1.38.0 — a sincronização volta a se resolver sozinha.

   O que estava errado, na raiz
   ----------------------------
   O sistema tratava como disputa o que era eco do próprio aparelho. O envio
   grava o registro na nuvem, e a puxada seguinte traz esse mesmo registro de
   volta, porque o número de sequência subiu. Se a pessoa tivesse editado de
   novo nesse intervalo de poucos segundos, o sistema via alteração aqui e
   alteração lá, concluía disputa e congelava o registro. Em clínica de um
   operador só não existe o outro aparelho: era alarme falso, e voltava a cada
   edição rápida.

   Pior, a marca de disputa ficava gravada no aparelho e o envio passava a
   pular aquele registro em todas as rodadas seguintes. Por isso o alto da tela
   não voltava ao normal nem depois de tudo sincronizado.

   O que passa a valer
   -------------------
   A correção está no index: quando o registro que volta da nuvem é igual ao
   que este aparelho mandou, é eco, e a edição mais nova daqui continua valendo.
   Nenhum registro fica congelado: toda rodada tenta de novo.

   Para a disputa de verdade, que é a de dois aparelhos, este módulo resolve
   sozinho mantendo o que está neste aparelho, e antes de qualquer sobrescrita
   copia a versão da nuvem para um arquivo guardado aqui. Nada é descartado: a
   janela de sincronização lista essas cópias e permite voltar qualquer uma.

   Casos tratados antes de qualquer sobrescrita:
     as duas versões são iguais  -> a marca cai, não havia disputa de fato;
     configurações divergentes   -> junção campo a campo, o que foi mexido aqui
                                    prevalece, o que só mudou lá é adotado;
     demais registros            -> mantém o deste aparelho e arquiva o da nuvem. */
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
    Object.keys(S.config || {}).forEach(function (k) {
      if (JSON.stringify(S.config[k]) !== JSON.stringify(base[k])) junto[k] = S.config[k];
    });
    Object.keys(base).forEach(function (k) {
      if (!(k in (S.config || {})) && JSON.stringify(base[k]) === JSON.stringify((remotoCfg || {})[k])) delete junto[k];
    });
    return junto;
  }

  function iguais(a, b) {
    try { return bfRegMesmo(a, b); } catch (e) { return JSON.stringify(a) === JSON.stringify(b); }
  }

  /* Guarda a versão da nuvem antes de ela ser sobrescrita. Também é chamada
     pelo index, quando este aparelho reencontra um registro que não tinha mais
     na memória. */
  window.bfArquivarVersao = async function (k, at) {
    if (!at) return;
    var p = String(k).split(':');
    await carregarArquivo();
    arquivo.unshift({
      k: k, col: p[0], rid: p.slice(1).join(':'), em: new Date().toISOString(),
      excluido: !!at.excluido, dados: at.dados || null,
      motivo: ((NV.conflitos || {})[k] || {}).motivo || ''
    });
    if (arquivo.length > MAX_ARQUIVO) arquivo.length = MAX_ARQUIVO;
    await gravarArquivo();
  };

  async function resolverUm(k) {
    var p = String(k).split(':'), col = p[0], rid = p.slice(1).join(':');
    var at = await remoto(col, rid);
    var aqui = localDe(col, rid);

    if (!at && !aqui) { delete NV.conflitos[k]; return 'marca sem registro'; }

    if (at && !at.excluido && aqui && iguais(bfRegBase(k, at.dados), aqui)) {
      NV.hashes[k] = JSON.stringify(bfRegBase(k, at.dados));
      delete NV.conflitos[k];
      return 'versões iguais';
    }

    if (col === 'config') {
      await window.bfArquivarVersao(k, at);
      S.config = juntarConfig(bfRegBase(k, (at && at.dados) || {}));
      NV.hashes[k] = JSON.stringify(bfRegBase(k, (at && at.dados) || {}));
      delete NV.conflitos[k];
      try { save(); } catch (e) { }
      return 'configurações juntadas';
    }

    await window.bfArquivarVersao(k, at);
    if (at) NV.hashes[k] = JSON.stringify(bfRegBase(k, at.dados));
    else delete NV.hashes[k];
    delete NV.conflitos[k];
    return 'mantido o deste aparelho';
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
    if (lista().length) setTimeout(function () { resolverTudo(true); }, 400);
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
      combos: 'Combo', comandas: 'Comanda', vouchers: 'Voucher'
    };
    var d = a.dados || {};
    var nome = d.nome || d.descricao || d.procedimento || '';
    return (rotulos[a.col] || a.col) + (nome ? ': ' + nome : '');
  }

  window.bfConflitosAbrir = async function () {
    await carregarArquivo();
    if (lista().length) {
      toast('Resolvendo as divergências...');
      await resolverTudo(true);
    }
    var pend = lista().length;
    var html = '<h3>Sincronização</h3>' +
      '<p class="sub">' + (pend
        ? 'Faltam ' + pend + ' registros para acertar. O sistema tenta de novo sozinho a cada rodada.'
        : 'Não há nada parado. Tudo o que está neste aparelho já subiu para a nuvem.') + '</p>' +
      '<div class="card" style="margin:12px 0;padding:12px">' +
      '<b>Onde os seus dados ficam</b>' +
      '<p class="sub" style="margin:6px 0 0">Na nuvem, sempre. Este aparelho guarda uma cópia para você continuar ' +
      'trabalhando se a internet cair, e ela sobe assim que a conexão volta. Não existe mais escolha de pasta.</p></div>';
    if (arquivo.length) {
      html += '<div class="ast">Versões guardadas</div>' +
        '<p class="sub" style="margin:0 0 10px">Quando o mesmo cadastro foi alterado em dois lugares, o sistema ficou ' +
        'com o deste aparelho e guardou aqui o que estava na nuvem. Nada foi descartado.</p>';
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

  /* O indicador do alto abre esta janela. */
  document.addEventListener('click', function (ev) {
    var alvo = ev.target && ev.target.closest && ev.target.closest('#sync');
    if (!alvo) return;
    ev.preventDefault(); ev.stopPropagation();
    window.bfConflitosAbrir();
  }, true);
})();
