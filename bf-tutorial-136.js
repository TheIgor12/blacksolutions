/* BlackFlow 1.36.0 — Tati: tutorial por tela e atendimento.

   Tutorial
   --------
   Na primeira vez que a pessoa abre uma tela, a Tati aparece e pergunta se
   quer ser guiada. Quem aceita recebe os passos daquela tela, um por vez,
   com voltar e avançar. Quem pula não é perguntado de novo naquela tela, e
   pode retomar quando quiser pelo botão da Tati, do ponto onde parou.

   Atendimento
   -----------
   O botão da Tati fica sempre disponível. Ele abre os assuntos da tela em
   que a pessoa está, mais um campo para escrever a dúvida com as próprias
   palavras. A resposta sai do material da tela aberta e, não havendo,
   da base de perguntas que já existe no sistema.

   O conteúdo é só dos módulos que o plano da pessoa tem. Quem está no plano
   da barbearia não recebe tutorial de prontuário. */
(function () {
  'use strict';
  if (window.__bfTutorial) return;
  window.__bfTutorial = true;

  var AVATAR = 'img/tati.webp';

  var PASSOS = {
    agenda: { nome: 'Agenda', passos: [
      { t: 'Escolha o dia', d: 'Use as setas ou toque na data para trocar de dia. Dá para ver por dia, por semana ou por profissional, nos botões acima do quadro.' },
      { t: 'Marque um atendimento', d: 'Toque num horário vazio. Digite o nome: se a pessoa já tem ficha, ela aparece na lista; se for nova, o sistema abre só os campos que faltam e já cria o cadastro.' },
      { t: 'Horário ocupado avisa', d: 'Se aquele profissional já tiver alguém no horário, aparece o aviso embaixo do campo e, ao salvar, uma janela com os horários livres do dia. Ninguém marca dois em cima do outro por engano.' },
      { t: 'Situação de cada um', d: 'Toque no atendimento para mudar entre Agendado, Confirmado, Atendido, Faltou e Desmarcado. A cor muda junto, então dá para ver o dia inteiro de relance.' },
      { t: 'Link para o cliente marcar', d: 'Em Configurações, na aba Agenda e mensagens, existe o link que você manda no WhatsApp. O cliente escolhe o horário sozinho e cai direto aqui.' }
    ]},
    pacientes: { nome: 'Cadastros', passos: [
      { t: 'Procure antes de cadastrar', d: 'Digite o nome ou o final do telefone no campo de busca. Isso evita criar a mesma pessoa duas vezes.' },
      { t: 'A ficha tem abas', d: 'Dentro da ficha ficam os dados, o histórico de atendimentos, a evolução, as fotos de antes e depois, os documentos e o financeiro daquela pessoa.' },
      { t: 'Mande mensagem daqui', d: 'O botão do WhatsApp abre a conversa com a pessoa já com o texto pronto, sem você digitar o número.' }
    ]},
    servicos: { nome: 'Serviços e preços', passos: [
      { t: 'Cadastre com tempo', d: 'Além do preço, preencha a duração em minutos. É ela que monta os horários na agenda e no link do cliente.' },
      { t: 'Preço por profissional', d: 'O mesmo serviço pode custar e demorar diferente conforme quem atende. Abra o serviço e preencha por profissional.' },
      { t: 'Combos', d: 'Junte dois ou mais serviços num preço só, como corte e barba. O tempo soma sozinho.' }
    ]},
    estoque: { nome: 'Produtos e estoque', passos: [
      { t: 'Cadastre o que você vende', d: 'Produto de revenda e material de uso ficam aqui. Preencha o preço de venda para ele aparecer no caixa.' },
      { t: 'Quantidade mínima', d: 'Informe o mínimo que você aceita ter em mãos. Quando chegar nele, o sistema avisa.' },
      { t: 'Controle opcional', d: 'Se você não quer controlar quantidade, deixe o controle desligado em Configurações. A tela continua servindo para o cadastro e o preço.' }
    ]},
    financeiro: { nome: 'Financeiro', passos: [
      { t: 'Entradas e saídas', d: 'A conta corrente mostra o que entrou e o que saiu. O que falta receber aparece separado, por pessoa.' },
      { t: 'Receber por Pix', d: 'Cadastre a chave da clínica uma vez. Depois o QR Code sai na hora, com o valor preenchido, em qualquer tela.' },
      { t: 'Cobrar quem está devendo', d: 'A tela de inadimplência mostra quem deve, quanto e há quantos dias, com a mensagem pronta para mandar no WhatsApp.' }
    ]},
    importar: { nome: 'Importar e backup', passos: [
      { t: 'Traga as suas planilhas', d: 'Selecione os arquivos de uma vez. O sistema reconhece sozinho o que é cadastro, agenda, financeiro e tratamento.' },
      { t: 'Não duplica', d: 'Quem já existe é reconhecido pelo telefone e pelo nome. O mesmo arquivo importado duas vezes não cria pessoa repetida.' },
      { t: 'Cópia de segurança', d: 'No cartão Onde os seus dados ficam, escolha a pasta uma vez e o sistema grava nela sozinho. É o que protege a clínica se o aparelho se perder.' }
    ]},
    receituario: { nome: 'Receituário e documentos', passos: [
      { t: 'Catálogo pronto', d: 'O botão Escolher do catálogo traz o que o seu conselho autoriza, já com apresentação, via e posologia, sem digitar nome de medicamento.' },
      { t: 'Papel timbrado', d: 'O documento sai com o nome, o logotipo e os dados da clínica. Dá para imprimir ou mandar em PDF.' },
      { t: 'Conferência', d: 'Cada documento sai com um código de conferência, para quem recebe confirmar que é verdadeiro.' }
    ]},
    fiscal: { nome: 'Nota fiscal', passos: [
      { t: 'Cadastro fiscal', d: 'Informe o CNPJ e o sistema busca os dados da empresa. Confira o município e a atividade antes de emitir qualquer coisa.' },
      { t: 'O que impede emitir', d: 'Falta de inscrição no município, certidão de dívida ativa e pendência na Receita impedem a emissão. O sistema mostra o motivo em vez de falhar calado.' },
      { t: 'Da cobrança para a nota', d: 'Recebeu, a nota pode sair do mesmo lugar, com o valor e a pessoa já preenchidos.' }
    ]},
    config: { nome: 'Configurações', passos: [
      { t: 'A cara da clínica', d: 'Nome, logotipo, cores e letra ficam na aba Dados da clínica. As mensagens de WhatsApp também são suas, do jeito que você fala.' },
      { t: 'Agenda e mensagens', d: 'Horário de atendimento, link do cliente, lembretes e confirmações ficam nesta aba.' },
      { t: 'Backup e dados', d: 'Importar, exportar, cópia de segurança e onde os seus dados ficam guardados.' }
    ]},
    inicio: { nome: 'Tela de início', passos: [
      { t: 'O resumo do dia', d: 'Aniversariantes da semana, atalhos das telas mais usadas e quanto está em atraso para cobrar.' },
      { t: 'Busca de tudo', d: 'O campo lá em cima encontra pessoa e também função do sistema. Digite o que você quer fazer.' }
    ]}
  };

  function estado() {
    S.config.tati = S.config.tati || {};
    return S.config.tati;
  }
  function telaAtual() {
    var v = (typeof UI !== 'undefined' && UI.view) || 'inicio';
    return PASSOS[v] ? v : (PASSOS[v === 'paciente' ? 'pacientes' : v] ? 'pacientes' : '');
  }
  function disponivel(v) {
    try { return !!PASSOS[v] && (typeof podeTela !== 'function' || v === 'inicio' || v === 'config' || podeTela(v)); }
    catch (e) { return !!PASSOS[v]; }
  }

  function cabeca(titulo, sub) {
    return '<div style="display:flex;gap:14px;align-items:flex-start;margin-bottom:6px">' +
      '<img src="' + AVATAR + '" alt="Tati" style="width:56px;height:56px;border-radius:50%;object-fit:cover;flex:0 0 auto">' +
      '<div><h3 style="margin:0">' + esc(titulo) + '</h3>' +
      (sub ? '<p class="sub" style="margin:4px 0 0">' + esc(sub) + '</p>' : '') + '</div></div>';
  }

  /* ---------------- Tutorial ---------------- */
  window.bfTutIniciar = function (tela, i) {
    tela = tela || telaAtual();
    if (!PASSOS[tela]) { closeModal(); return; }
    var e = estado();
    e.feito = e.feito || {};
    var passos = PASSOS[tela].passos;
    i = Math.max(0, Math.min(i == null ? (e.passo && e.passo[tela] || 0) : i, passos.length - 1));
    e.passo = e.passo || {}; e.passo[tela] = i; save();
    var p = passos[i];
    openModal(
      cabeca(PASSOS[tela].nome + ', passo ' + (i + 1) + ' de ' + passos.length, p.t) +
      '<p style="margin:14px 0 4px;line-height:1.55">' + esc(p.d) + '</p>' +
      '<div style="height:6px;border-radius:999px;background:var(--bd,#e6e9f2);margin:16px 0 4px">' +
      '<div style="height:6px;border-radius:999px;background:var(--acc,#5a4cfb);width:' +
      Math.round((i + 1) / passos.length * 100) + '%"></div></div>' +
      '<div class="mact" style="flex-wrap:wrap">' +
      (i > 0 ? '<button class="btn ghost" onclick="bfTutIniciar(\'' + tela + '\',' + (i - 1) + ')">Voltar</button>' : '') +
      (i < passos.length - 1
        ? '<button class="btn" onclick="bfTutIniciar(\'' + tela + '\',' + (i + 1) + ')">Avançar</button>'
        : '<button class="btn" onclick="bfTutConcluir(\'' + tela + '\')">Terminei</button>') +
      '<button class="btn ghost" onclick="bfTutPular(\'' + tela + '\')">Pular por enquanto</button>' +
      '</div>', true);
  };
  window.bfTutConcluir = function (tela) {
    var e = estado(); e.feito = e.feito || {}; e.feito[tela] = 'concluido';
    if (e.passo) delete e.passo[tela];
    save(); closeModal(); toast('Quando precisar, a Tati está no canto da tela.');
  };
  window.bfTutPular = function (tela) {
    var e = estado(); e.feito = e.feito || {};
    if (e.feito[tela] !== 'concluido') e.feito[tela] = 'pulado';
    save(); closeModal();
  };

  function convite(tela) {
    var e = estado(); e.feito = e.feito || {};
    if (e.feito[tela]) return;
    e.feito[tela] = 'oferecido'; save();
    openModal(
      cabeca('Quer que eu te mostre esta tela?', 'Sou a Tati. Em ' + PASSOS[tela].passos.length +
        ' passos rápidos eu explico o que dá para fazer aqui.') +
      '<div class="mact" style="flex-wrap:wrap">' +
      '<button class="btn" onclick="bfTutIniciar(\'' + tela + '\',0)">Seguir tutorial</button>' +
      '<button class="btn ghost" onclick="bfTutPular(\'' + tela + '\')">Pular tutorial</button>' +
      '</div>', true);
  }

  /* ---------------- Atendimento ---------------- */
  window.bfTatiAbrir = function () {
    var tela = telaAtual();
    var e = estado();
    var retomar = (e.passo && tela && e.passo[tela] > 0 && e.feito[tela] !== 'concluido');
    var h = cabeca('Em que eu ajudo?', tela ? 'Você está em ' + PASSOS[tela].nome + '.' : '');
    if (tela) {
      h += '<div class="card" style="margin:12px 0"><b>Assuntos desta tela</b><div style="margin-top:8px">';
      PASSOS[tela].passos.forEach(function (p, i) {
        h += '<div class="row"><span>' + esc(p.t) + '</span>' +
          '<span><button type="button" class="btn sm ghost" onclick="bfTutIniciar(\'' + tela + '\',' + i + ')">Ver</button></span></div>';
      });
      h += '</div></div>';
    }
    h += '<label>Ou escreva a sua dúvida<input id="bfTatiQ" placeholder="Exemplo: como mando o link para o cliente" ' +
      'onkeydown="if(event.key===\'Enter\'){event.preventDefault();bfTatiPerguntar()}"></label>' +
      '<div id="bfTatiR" style="margin-top:12px"></div>' +
      '<div class="mact" style="flex-wrap:wrap">' +
      '<button class="btn" onclick="bfTatiPerguntar()">Perguntar</button>' +
      (retomar ? '<button class="btn ghost" onclick="bfTutIniciar(\'' + tela + '\')">Continuar o tutorial</button>' : '') +
      (tela ? '<button class="btn ghost" onclick="bfTutIniciar(\'' + tela + '\',0)">Ver do começo</button>' : '') +
      '<button class="btn ghost" onclick="closeModal()">Fechar</button></div>';
    openModal(h, true);
    setTimeout(function () { var i = document.getElementById('bfTatiQ'); if (i) i.focus(); }, 60);
  };

  function norm(s) {
    return String(s || '').toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  window.bfTatiPerguntar = function () {
    var i = document.getElementById('bfTatiQ');
    var r = document.getElementById('bfTatiR');
    if (!i || !r) return;
    var q = norm(i.value).trim();
    if (!q) { r.innerHTML = '<p class="sub">Escreva a sua dúvida que eu procuro.</p>'; return; }
    var achados = [];
    Object.keys(PASSOS).forEach(function (k) {
      if (!disponivel(k)) return;
      PASSOS[k].passos.forEach(function (p, n) {
        var alvo = norm(p.t + ' ' + p.d + ' ' + PASSOS[k].nome);
        var pontos = 0;
        q.split(/\s+/).forEach(function (w) { if (w.length > 2 && alvo.indexOf(w) >= 0) pontos++; });
        if (pontos) achados.push({ k: k, n: n, p: p, pontos: pontos });
      });
    });
    achados.sort(function (a, b) { return b.pontos - a.pontos; });
    if (!achados.length) {
      /* Cai para a base de perguntas que ja existe no sistema. */
      if (typeof window.tatiResponder === 'function') {
        try { var resp = window.tatiResponder(i.value); if (resp) { r.innerHTML = resp; return; } } catch (e) { }
      }
      r.innerHTML = '<div class="card"><b>Não achei essa aqui.</b>' +
        '<p class="sub" style="margin:6px 0 0">Me chame no WhatsApp (47) 98843-2859 que eu respondo com calma.</p></div>';
      return;
    }
    var h = '';
    achados.slice(0, 3).forEach(function (a) {
      h += '<div class="card" style="margin-bottom:8px"><b>' + esc(a.p.t) + '</b>' +
        '<p class="sub" style="margin:6px 0 8px">' + esc(a.p.d) + '</p>' +
        '<button type="button" class="btn sm ghost" onclick="bfTutIniciar(\'' + a.k + '\',' + a.n + ')">Ver em ' +
        esc(PASSOS[a.k].nome) + '</button></div>';
    });
    r.innerHTML = h;
  };

  /* ---------------- Botão flutuante ---------------- */
  function botao() {
    try {
      if (typeof UI !== 'undefined' && UI.auth) {
        var velho = document.getElementById('bfTatiBt');
        if (velho) velho.remove();
        return;
      }
      if (document.getElementById('bfTatiBt')) return;
      var b = document.createElement('button');
      b.id = 'bfTatiBt';
      b.type = 'button';
      b.className = 'bf-tati-bt';
      b.title = 'Tati, ajuda do sistema';
      b.setAttribute('aria-label', 'Abrir a ajuda da Tati');
      b.innerHTML = '<img src="' + AVATAR + '" alt="">';
      b.addEventListener('click', function (e) { e.preventDefault(); window.bfTatiAbrir(); });
      document.body.appendChild(b);
    } catch (e) { }
  }

  var ultima = '';
  setInterval(function () {
    try {
      if (typeof S === 'undefined' || !S || !S.config) return;
      if (typeof UI !== 'undefined' && UI.auth) { botao(); return; }
      botao();
      var v = telaAtual();
      if (!v || v === ultima) return;
      /* Janela de outro modulo ocupando a tela, como a de catalogo pronto ou
         a de primeiro acesso: espera a proxima volta em vez de desistir, para
         o convite nao se perder. */
      var raiz = document.getElementById('modalRoot');
      if (raiz && raiz.innerHTML) return;
      ultima = v;
      if (!disponivel(v)) return;
      convite(v);
    } catch (e) { }
  }, 2000);
})();
