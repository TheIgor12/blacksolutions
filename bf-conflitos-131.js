/* BlackFlow 1.31.0 — resolver conflito de sincronização.

   A versão 1.27.0 passou a impedir que um aparelho sobrescreva o que outro
   gravou, o que está certo: prontuário e financeiro não podem ser perdidos
   por disputa de versão. O que faltou foi a saída.

   Quando um registro entrava em conflito, ele ficava marcado para sempre.
   O envio pulava esse registro em toda sincronização seguinte, o conflito
   nunca era apagado, e o indicador no alto da tela ficava em "Erro ao
   sincronizar" mesmo com tudo em dia. Era o caso da conta da HappyFEET:
   tudo atualizado embaixo e erro vermelho em cima.

   Agora o indicador vira "Conflito a resolver", é clicável, e abre uma
   janela que mostra quais cadastros estão parados, o motivo e as duas
   saídas, uma de cada vez ou todas de uma vez:

     manter o que está neste aparelho, que reenvia para a nuvem;
     usar o que está na nuvem, que traz a versão de lá para cá.

   Nenhuma das duas apaga nada sem a pessoa mandar. */
(function () {
  'use strict';
  if (window.__bfConflitos) return;
  window.__bfConflitos = true;

  function lista() {
    try { return Object.keys(NV.conflitos || {}); } catch (e) { return []; }
  }
  function nomeDoRegistro(k) {
    var p = String(k).split(':'), col = p[0], rid = p.slice(1).join(':');
    var rotulos = {
      pacientes: 'Cadastro', agendamentos: 'Agendamento', lancamentos: 'Lançamento',
      servicos: 'Serviço', profissionais: 'Profissional', evolucoes: 'Evolução',
      tratamentos: 'Tratamento', produtos: 'Produto', contasPagar: 'Conta a pagar',
      config: 'Configurações da clínica', fotos: 'Foto', anamneses: 'Anamnese',
      combos: 'Combo', comandas: 'Comanda'
    };
    var rot = rotulos[col] || col;
    if (col === 'config') return { rot: rot, desc: 'Nome, cores, horários e preferências' };
    var arr = S[col];
    var reg = Array.isArray(arr) ? arr.find(function (x) { return String(x.id) === String(rid); }) : null;
    var desc = '';
    if (reg) {
      desc = reg.nome || reg.descricao || reg.procedimento || '';
      if (!desc && reg.pacienteId) {
        var pa = (S.pacientes || []).find(function (x) { return String(x.id) === String(reg.pacienteId); });
        desc = pa ? pa.nome : '';
      }
      if (reg.data) desc = (desc ? desc + ', ' : '') + (typeof br === 'function' ? br(reg.data) : reg.data);
    } else desc = 'registro não encontrado neste aparelho';
    return { rot: rot, desc: desc, col: col, rid: rid, reg: reg };
  }
  var MOTIVOS = {
    'configuracao divergente': 'As configurações foram mudadas aqui e em outro aparelho.',
    'registro alterado em outro aparelho': 'Alguém alterou este cadastro em outro aparelho depois que você o abriu aqui.',
    'registro excluido em outro aparelho': 'Este cadastro foi excluído em outro aparelho.',
    'registro ausente na nuvem': 'Este cadastro não está mais na nuvem.',
    'id existente no servidor': 'Já existe na nuvem um cadastro com este mesmo código.',
    'insercao concorrente': 'Dois aparelhos criaram este cadastro ao mesmo tempo.',
    'insercao sem confirmacao': 'A nuvem não confirmou a gravação.',
    'cache anterior invalido': 'A cópia guardada neste aparelho não pôde ser lida.',
    'versao alterada durante gravacao': 'O cadastro mudou na nuvem durante a gravação.'
  };

  async function remoto(col, rid) {
    var r = await NV.sb.from('registros').select('dados,excluido,seq')
      .eq('clinica_id', NV.clinicaId).eq('colecao', col).eq('id', rid).maybeSingle();
    return r.error ? null : r.data;
  }

  /* Manter o daqui: alinha a base de comparação com o que está na nuvem,
     para o próximo envio passar, e tira a marca de conflito. */
  window.bfConfManterLocal = async function (k) {
    try {
      var n = nomeDoRegistro(k);
      if (n.col === 'config') {
        NV.hashes[k] = JSON.stringify(bfRegBase(k, (await remoto('config', n.rid) || {}).dados || {}));
      } else {
        var at = await remoto(n.col, n.rid);
        NV.hashes[k] = at ? JSON.stringify(bfRegBase(k, at.dados)) : undefined;
        if (!at) delete NV.hashes[k];
      }
      delete NV.conflitos[k];
      persistirNuvem();
      toast('Mantendo o que está neste aparelho. Enviando...');
      await enviar();
      abrir();
    } catch (e) { toast('Não foi possível resolver agora: ' + ((e && e.message) || e)); }
  };

  /* Usar o da nuvem: traz a versão de lá e descarta a daqui. */
  window.bfConfUsarNuvem = async function (k) {
    try {
      var n = nomeDoRegistro(k);
      var at = await remoto(n.col, n.rid);
      if (!at) {
        if (n.col !== 'config' && Array.isArray(S[n.col])) {
          var i = S[n.col].findIndex(function (x) { return String(x.id) === String(n.rid); });
          if (i >= 0) S[n.col].splice(i, 1);
        }
        delete NV.hashes[k];
      } else if (n.col === 'config') {
        S.config = bfRegBase(k, at.dados);
        NV.hashes[k] = JSON.stringify(S.config);
      } else {
        var novo = bfRegBase(k, at.dados);
        var arr = S[n.col];
        var j = arr.findIndex(function (x) { return String(x.id) === String(n.rid); });
        if (at.excluido) { if (j >= 0) arr.splice(j, 1); }
        else if (j >= 0) arr[j] = novo; else arr.push(novo);
        NV.hashes[k] = JSON.stringify(novo);
      }
      delete NV.conflitos[k];
      save(); persistirNuvem();
      toast('Trouxe a versão da nuvem.');
      if (typeof render === 'function') render();
      abrir();
    } catch (e) { toast('Não foi possível resolver agora: ' + ((e && e.message) || e)); }
  };

  window.bfConfTodosLocal = async function () {
    var L = lista();
    for (var i = 0; i < L.length; i++) await window.bfConfManterLocal(L[i]);
  };
  window.bfConfTodosNuvem = async function () {
    var L = lista();
    for (var i = 0; i < L.length; i++) await window.bfConfUsarNuvem(L[i]);
  };

  function abrir() {
    var L = lista();
    if (!L.length) {
      try { setSync('ok'); } catch (e) { }
      openModal('<h3>Está tudo sincronizado</h3>' +
        '<p class="sub">Não há nenhum cadastro parado. O indicador no alto da tela já voltou para Sincronizado.</p>' +
        '<div class="mact"><button class="btn" onclick="closeModal()">Fechar</button></div>');
      return;
    }
    var html = '<h3>Cadastros parados na sincronização</h3>' +
      '<p class="sub">O sistema não sobrescreve sozinho quando o mesmo cadastro foi mudado em dois lugares. ' +
      'Estes ' + L.length + ' estão esperando você decidir. Nada foi perdido: as duas versões existem.</p>';
    L.forEach(function (k) {
      var n = nomeDoRegistro(k);
      var c = NV.conflitos[k] || {};
      var quando = c.detectadoEm ? String(c.detectadoEm).slice(0, 10).split('-').reverse().join('/') : '';
      html += '<div class="card" style="margin-bottom:10px">' +
        '<b>' + esc(n.rot) + (n.desc ? ': ' + esc(n.desc) : '') + '</b>' +
        '<p class="sub" style="margin:4px 0 10px">' + esc(MOTIVOS[c.motivo] || c.motivo || 'Divergência entre aparelhos.') +
        (quando ? ' Detectado em ' + quando + '.' : '') + '</p>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
        '<button type="button" class="btn sm" onclick="bfConfManterLocal(' + JSON.stringify(k).replace(/"/g, '&quot;') + ')">Manter o deste aparelho</button>' +
        '<button type="button" class="btn ghost sm" onclick="bfConfUsarNuvem(' + JSON.stringify(k).replace(/"/g, '&quot;') + ')">Usar o da nuvem</button>' +
        '</div></div>';
    });
    html += '<div class="mact" style="flex-wrap:wrap">' +
      '<button class="btn" onclick="bfConfTodosLocal()">Manter todos os deste aparelho</button>' +
      '<button class="btn ghost" onclick="bfConfTodosNuvem()">Usar todos os da nuvem</button>' +
      '<button class="btn ghost" onclick="closeModal()">Depois</button></div>';
    openModal(html, true);
  }
  window.bfConflitosAbrir = abrir;

  /* Rótulo honesto e indicador clicável. */
  var txtOriginal = window.syncTxt;
  window.syncTxt = function () {
    var h = txtOriginal.apply(this, arguments);
    if (lista().length) {
      h = h.replace('Erro ao sincronizar', 'Conflito a resolver')
        .replace('Sincronizado', 'Conflito a resolver');
    }
    return h;
  };
  document.addEventListener('click', function (e) {
    var s = e.target.closest && e.target.closest('#sync');
    if (!s) return;
    e.preventDefault(); e.stopPropagation();
    abrir();
  }, true);

  function marcar() {
    var s = document.getElementById('sync');
    if (!s) return;
    s.style.cursor = 'pointer';
    s.title = lista().length
      ? 'Há cadastros esperando decisão. Toque para resolver.'
      : 'Sincronização com a nuvem. Toque para conferir.';
  }
  setInterval(marcar, 2000);
})();
