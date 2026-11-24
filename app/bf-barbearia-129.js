/* BlackFlow 1.29.0 — barbearia pronta para usar.

   O barbeiro não quer configurar nada. Ele quer abrir o sistema, ver a
   agenda e mandar o link para o cliente marcar sozinho. Até agora ele
   precisava cadastrar serviço por serviço, abrir Configurações, montar o
   horário de atendimento e só então publicar o link.

   Este módulo faz isso sozinho, uma única vez, assim que a conta de
   barbearia entra pela primeira vez sem nenhum serviço cadastrado:

     1. cria a tabela de serviços da barbearia, com preço e duração;
     2. publica o agendamento online, com o horário de funcionamento
        comum do ramo, de segunda a sábado;
     3. mostra o link pronto, com botão de copiar e de mandar no WhatsApp.

   Nada aqui é obrigatório: tudo o que foi criado pode ser mudado depois,
   serviço por serviço, preço por preço. E nada disto toca em conta que já
   tem serviço cadastrado, para não mexer no trabalho de ninguém. */
(function () {
  'use strict';
  if (window.__bfBarbearia) return;
  window.__bfBarbearia = true;

  var SERVICOS = [
    { nome: 'Corte masculino', preco: 45, duracao: 40 },
    { nome: 'Barba', preco: 35, duracao: 30 },
    { nome: 'Corte e barba', preco: 70, duracao: 60 },
    { nome: 'Pezinho', preco: 15, duracao: 15 },
    { nome: 'Sobrancelha', preco: 15, duracao: 15 },
    { nome: 'Corte infantil', preco: 40, duracao: 40 },
    { nome: 'Corte na máquina', preco: 35, duracao: 25 },
    { nome: 'Platinado', preco: 150, duracao: 120 },
    { nome: 'Luzes', preco: 120, duracao: 90 },
    { nome: 'Hidratação capilar', preco: 50, duracao: 30 },
    { nome: 'Relaxamento', preco: 60, duracao: 45 },
    { nome: 'Barboterapia', preco: 55, duracao: 45 }
  ];

  var PRODUTOS = [
    { nome: 'Pomada modeladora', quantidade: 0, minimo: 3, preco: 45 },
    { nome: 'Minoxidil', quantidade: 0, minimo: 2, preco: 70 },
    { nome: 'Shampoo antiqueda', quantidade: 0, minimo: 2, preco: 55 },
    { nome: 'Óleo para barba', quantidade: 0, minimo: 3, preco: 40 },
    { nome: 'Cerveja long neck', quantidade: 0, minimo: 12, preco: 10 },
    { nome: 'Energético lata', quantidade: 0, minimo: 12, preco: 12 },
    { nome: 'Refrigerante lata', quantidade: 0, minimo: 12, preco: 7 },
    { nome: 'Água mineral', quantidade: 0, minimo: 12, preco: 4 }
  ];

  /* Horário comum do ramo: segunda a sexta das nove às vinte, sábado das
     oito às dezoito. Domingo fechado. */
  var HORARIOS = {
    1: [['09:00', '12:00'], ['13:30', '20:00']],
    2: [['09:00', '12:00'], ['13:30', '20:00']],
    3: [['09:00', '12:00'], ['13:30', '20:00']],
    4: [['09:00', '12:00'], ['13:30', '20:00']],
    5: [['09:00', '12:00'], ['13:30', '20:00']],
    6: [['08:00', '18:00']]
  };

  function id() { return Math.random().toString(36).slice(2, 10); }
  function ehBarbearia() {
    try { return S && S.config && S.config.segmento === 'barbearia'; } catch (e) { return false; }
  }

  function criarServicos() {
    SERVICOS.forEach(function (x) {
      S.servicos.push({ id: id(), nome: x.nome, preco: x.preco, duracao: x.duracao, ativo: true });
    });
    if (Array.isArray(S.produtos)) {
      PRODUTOS.forEach(function (x) {
        S.produtos.push({ id: id(), nome: x.nome, quantidade: x.quantidade, minimo: x.minimo, preco: x.preco, ativo: true });
      });
    }
  }

  function prepararLink() {
    var c = S.config.agOnline || {};
    S.config.agOnline = {
      ativo: true,
      slug: c.slug || (typeof slugify === 'function' ? slugify(S.config.clinica || 'minha-barbearia') : 'minha-barbearia'),
      titulo: c.titulo || S.config.clinica || '',
      whatsapp: c.whatsapp || S.config.telefone || '',
      endereco: c.endereco || S.config.endereco || '',
      horarios: c.horarios || HORARIOS,
      intervalo: c.intervalo || 15,
      antecedenciaHoras: c.antecedenciaHoras == null ? 1 : c.antecedenciaHoras,
      diasMax: c.diasMax || 30,
      mostrarPreco: c.mostrarPreco == null ? true : !!c.mostrarPreco,
      escolherProfissional: c.escolherProfissional !== false,
      servicos: S.servicos.filter(function (x) { return x.ativo !== false; }).map(function (x) { return x.id; }),
      profissionais: S.profissionais.filter(function (x) { return x.ativo !== false; }).map(function (x) { return x.id; }),
      bloqueios: c.bloqueios || [],
      publicado: c.publicado || ''
    };
  }

  /* Publica no servidor a mesma estrutura que a tela de Configurações
     publica, para o link abrir igual, sem a pessoa passar por lá. */
  async function publicar() {
    try {
      if (!NV || !NV.ativa || !NV.sb || !NV.clinicaId || NV.offline) return false;
      var cfg = S.config.agOnline;
      var serv = S.servicos.filter(function (x) { return x.ativo !== false; });
      var profs = S.profissionais.filter(function (x) { return x.ativo !== false; });
      var pub = {
        titulo: cfg.titulo || S.config.clinica,
        whatsapp: typeof onlyDigits === 'function' ? onlyDigits(cfg.whatsapp) : String(cfg.whatsapp || ''),
        endereco: cfg.endereco,
        horarios: cfg.horarios,
        intervalo: cfg.intervalo,
        antecedenciaHoras: cfg.antecedenciaHoras,
        diasMax: cfg.diasMax,
        mostrarPreco: cfg.mostrarPreco,
        escolherProfissional: cfg.escolherProfissional,
        bloqueios: cfg.bloqueios || [],
        segmento: S.config.segmento || '',
        varios: typeof temPorProf === 'function' ? temPorProf() : true,
        servicos: serv.map(function (x) {
          return { nome: x.nome, duracao: +x.duracao || 30, preco: cfg.mostrarPreco ? (+x.preco || 0) : 0 };
        }),
        profissionais: profs.map(function (x) { return x.nome; }),
        ajustes: {}, combos: [], descontos: {}
      };
      var r = await NV.sb.from('agenda_online').upsert({
        clinica_id: NV.clinicaId, slug: cfg.slug, ativo: true,
        config: pub, atualizado_em: new Date().toISOString()
      }, { onConflict: 'clinica_id' });
      if (r.error) {
        /* Endereço já usado por outra barbearia: tenta com um sufixo, para
           a pessoa não ficar sem link no primeiro dia. */
        if (/duplicate|unique/i.test(r.error.message || '')) {
          cfg.slug = cfg.slug + '-' + Math.random().toString(36).slice(2, 5);
          var r2 = await NV.sb.from('agenda_online').upsert({
            clinica_id: NV.clinicaId, slug: cfg.slug, ativo: true,
            config: pub, atualizado_em: new Date().toISOString()
          }, { onConflict: 'clinica_id' });
          if (r2.error) return false;
        } else return false;
      }
      cfg.publicado = new Date().toISOString();
      S.config.agOnline = cfg;
      save();
      return true;
    } catch (e) { return false; }
  }

  function linkAtual() {
    var base = (typeof URL_AGENDAR === 'string' && URL_AGENDAR) || 'https://blackflow.app.br/a/';
    var slug = (S.config.agOnline && S.config.agOnline.slug) || '';
    /* Forma longa, que o servidor responde direto. A curta depende de
       desvio e o WhatsApp nem sempre monta a prévia dela. */
    return base.replace(/\/a\/?$/, '/a/') + '?c=' + encodeURIComponent(slug);
  }

  function janelaDoLink(novo) {
    var link = linkAtual();
    var texto = 'Agende seu horário na ' + (S.config.clinica || 'barbearia') + ': ' + link;
    openModal(
      '<h3>A sua barbearia já está pronta</h3>' +
      (novo
        ? '<p class="sub">Deixei cadastrados ' + SERVICOS.length + ' serviços, os produtos que a barbearia costuma vender e o horário de funcionamento de segunda a sábado, tudo pronto para usar hoje mesmo.</p>' +
          '<div class="card" style="margin:12px 0;border-left:4px solid var(--acc,#5a4cfb)">' +
          '<b>Os preços são apenas um ponto de partida</b>' +
          '<p class="sub" style="margin:6px 0 10px">Cada barbearia cobra o seu valor. Troque um por um, ou deixe todos em branco e preencha conforme for atendendo. Dá para ter preço diferente por barbeiro, em Serviços e preços.</p>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
          '<button type="button" class="btn sm" onclick="bfBarbPrecos()">Ajustar os preços agora</button>' +
          '<button type="button" class="btn ghost sm" onclick="bfBarbZerar()">Deixar todos em branco</button>' +
          '</div></div>'
        : '<p class="sub">O seu link de agendamento está publicado e funcionando.</p>') +
      '<div class="card" style="margin:14px 0;background:var(--acc-soft)">' +
      '<b>Link para o cliente marcar sozinho</b>' +
      '<p class="sub" style="margin:6px 0 10px;word-break:break-all">' + esc(link) + '</p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button type="button" class="btn sm" onclick="bfBarbCopiar()">Copiar link</button>' +
      '<a class="btn green sm" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(texto) + '">Mandar no WhatsApp</a>' +
      '<a class="btn ghost sm" target="_blank" rel="noopener" href="' + esc(link) + '">Abrir e conferir</a>' +
      '</div></div>' +
      '<p class="sub">Esse link fica guardado na Agenda, no botão Link de agendamento, e você pode mudar o endereço dele em Configurações, na aba Agenda e mensagens.</p>' +
      '<div class="mact"><button class="btn" onclick="closeModal()">Entendi</button></div>',
      true
    );
  }
  /* Os preços entram como sugestão. Cada barbearia cobra o seu valor, então
     a janela inicial oferece os dois caminhos: ajustar um por um ou apagar
     todos e preencher conforme for atendendo. */
  window.bfBarbPrecos = function () { closeModal(); if (typeof go === 'function') go('servicos'); };
  window.bfBarbZerar = function () {
    (S.servicos || []).forEach(function (x) { x.preco = ''; });
    (S.produtos || []).forEach(function (x) { x.preco = ''; });
    save();
    if (typeof render === 'function') render();
    closeModal();
    toast('Preços em branco. Preencha em Serviços e preços quando quiser.');
  };

  window.bfBarbAbrirLink = function () { janelaDoLink(false); };
  window.bfBarbCopiar = function () {
    var l = linkAtual();
    try {
      navigator.clipboard.writeText(l).then(function () { toast('Link copiado.'); },
        function () { toast('Copie da tela: ' + l); });
    } catch (e) { toast('Copie da tela: ' + l); }
  };

  /* Preparar uma vez só, na primeira entrada da barbearia sem serviço. */
  async function preparar() {
    if (!ehBarbearia()) return;
    if (S.config.barbeariaPronta) return;
    var semServico = !S.servicos || !S.servicos.filter(function (x) { return x.ativo !== false; }).length;
    if (!semServico) { S.config.barbeariaPronta = 'existente'; save(); return; }

    criarServicos();
    prepararLink();
    S.config.barbeariaPronta = new Date().toISOString().slice(0, 10);
    save();
    try { if (typeof render === 'function') render(); } catch (e) { }
    await publicar();
    janelaDoLink(true);
  }

  function tentar() {
    try {
      if (typeof S === 'undefined' || !S || !S.config) return;
      if (typeof UI !== 'undefined' && UI && UI.auth) return;   // ainda na tela de entrada
      if (!ehBarbearia()) return;
      if (document.getElementById('modalRoot') && document.getElementById('modalRoot').innerHTML) return;
      preparar();
    } catch (e) { }
  }

  var t = setInterval(function () {
    try {
      if (typeof S !== 'undefined' && S && S.config && S.config.barbeariaPronta) { clearInterval(t); return; }
    } catch (e) { }
    tentar();
  }, 1500);
  setTimeout(function () { clearInterval(t); }, 120000);
})();
