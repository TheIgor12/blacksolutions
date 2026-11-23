/* BlackFlow 1.35.0 — número do assinante e configuração por aba.

   Número do assinante
   -------------------
   A campanha promete condição aos cem primeiros. Até agora esse controle era
   feito na mão, o que é risco de publicidade enganosa pelo artigo 37,
   parágrafo primeiro, do Código de Defesa do Consumidor: anunciar posição
   sem contagem real não se sustenta. Agora o servidor atribui um número
   sequencial, uma única vez, quando a conta deixa de ser teste. O número
   aparece em Minha conta e na tela inicial de quem está entre os cem
   primeiros.

   Configuração por aba
   --------------------
   Cada tela ganha um botão de engrenagem no canto superior esquerdo, que
   abre só o que diz respeito àquela tela. Quem está na agenda ajusta a
   agenda ali mesmo, sem atravessar o sistema inteiro até Configurações. */
(function () {
  'use strict';
  if (window.__bfAssinante) return;
  window.__bfAssinante = true;

  /* ===================== Número do assinante ===================== */
  var ASS = null;

  window.bfAssinanteCarregar = async function () {
    try {
      if (!NV || !NV.sb || !NV.sessao || NV.offline) { ASS = null; return null; }
      var r = await NV.sb.rpc('bs_assinante_meu');
      ASS = (!r.error && r.data && r.data.tem) ? r.data : null;
      return ASS;
    } catch (e) { ASS = null; return null; }
  };
  window.bfAssinanteDado = function () { return ASS; };

  function selo() {
    if (!ASS || !ASS.numero) return '';
    var n = String(ASS.numero).padStart(3, '0');
    return '<span class="bf-selo" title="Sua posição na ordem de contratação">Assinante nº ' + n + '</span>';
  }
  window.bfAssinanteSelo = selo;

  window.bfAssinanteJanela = function () {
    if (!ASS || !ASS.numero) {
      openModal('<h3>Número do assinante</h3>' +
        '<p class="sub">O número é atribuído quando a conta deixa de ser teste e passa a ser assinatura. ' +
        'Enquanto o teste estiver valendo, não há número.</p>' +
        '<div class="mact"><button class="btn" onclick="closeModal()">Entendi</button></div>');
      return;
    }
    var n = String(ASS.numero).padStart(3, '0');
    openModal('<h3>Assinante nº ' + n + '</h3>' +
      '<p class="sub">Esta é a sua posição na ordem de contratação do BlackFlow. ' +
      'O número é seu, não muda e não é dado a mais ninguém.</p>' +
      '<div class="card" style="margin:14px 0;background:var(--acc-soft)">' +
      '<div class="row"><span>Sua posição</span><span><b>' + n + '</b></span></div>' +
      '<div class="row"><span>Assinantes até agora</span><span>' + esc(String(ASS.total || 0)) + '</span></div>' +
      (ASS.desde ? '<div class="row"><span>Assinante desde</span><span>' +
        esc(String(ASS.desde).slice(0, 10).split('-').reverse().join('/')) + '</span></div>' : '') +
      '</div>' +
      (ASS.cem_primeiros
        ? '<p class="sub">Você está entre os cem primeiros, então a condição anunciada na campanha vale para a sua assinatura.</p>'
        : '<p class="sub">A condição dos cem primeiros não se aplica a esta assinatura.</p>') +
      '<div class="mact"><button class="btn" onclick="closeModal()">Fechar</button></div>');
  };

  /* Entra em Minha conta, sem reescrever a tela. */
  var obsConta = new MutationObserver(function () {
    try {
      if (!ASS || !ASS.numero) return;
      var r = document.getElementById('modalRoot');
      if (!r || !r.innerHTML) return;
      var h = r.querySelector('h3');
      if (!h || !/minha conta/i.test(h.textContent || '')) return;
      if (r.querySelector('.bf-ass-linha')) return;
      var d = document.createElement('div');
      d.className = 'row bf-ass-linha';
      d.innerHTML = '<span>Número do assinante</span><span>' +
        '<a href="#" onclick="event.preventDefault();bfAssinanteJanela()"><b>nº ' +
        String(ASS.numero).padStart(3, '0') + '</b></a></span>';
      var alvo = h.parentNode.querySelector('.row');
      if (alvo && alvo.parentNode) alvo.parentNode.insertBefore(d, alvo.nextSibling);
    } catch (e) { }
  });
  obsConta.observe(document.body, { childList: true, subtree: true });

  /* ===================== Configuração por aba ===================== */
  /* Cada tela aponta para a aba de Configurações que lhe diz respeito.
     Tela que não tem configuração própria não ganha botão. */
  var DESTINO = {
    agenda:        { aba: 'agenda',    titulo: 'Configurações da agenda' },
    confirmacao:   { aba: 'agenda',    titulo: 'Confirmações e lembretes' },
    pacientes:     { aba: 'clinica',   titulo: 'Configurações de cadastro' },
    servicos:      { aba: 'clinica',   titulo: 'Procedimentos e preços' },
    profissionais: { aba: 'clinica',   titulo: 'Profissionais da equipe' },
    estoque:       { aba: 'clinica',   titulo: 'Produtos e estoque' },
    financeiro:    { aba: 'financeiro',titulo: 'Configurações do financeiro' },
    caixa:         { aba: 'financeiro',titulo: 'Configurações do caixa' },
    inadimplencia: { aba: 'financeiro',titulo: 'Régua de cobrança' },
    relatorios:    { aba: 'sistema',   titulo: 'Relatórios e indicadores' },
    dashboard:     { aba: 'sistema',   titulo: 'Painel e indicadores' },
    fiscal:        { aba: 'fiscal',    titulo: 'Configurações fiscais' },
    receituario:   { aba: 'clinica',   titulo: 'Receituário e documentos' },
    orcamentos:    { aba: 'clinica',   titulo: 'Modelos de orçamento' },
    anamnese:      { aba: 'clinica',   titulo: 'Modelos de anamnese' },
    importar:      { aba: 'sistema',   titulo: 'Backup e dados' },
    combos:        { aba: 'clinica',   titulo: 'Combos e pacotes' },
    chat:          { aba: 'sistema',   titulo: 'Chat da equipe' }
  };

  window.bfCfgDaTela = function () {
    var v = (typeof UI !== 'undefined' && UI.view) || '';
    var d = DESTINO[v];
    if (!d) { go('config'); return; }
    try { UI.cfgTab = d.aba; } catch (e) { }
    go('config');
    toast(d.titulo);
  };

  /* O sistema inteiro desenha dentro de #app e cada tela tem um desenho
     proprio, sem cabecalho comum. Entao a engrenagem vai no canto superior
     esquerdo da barra de cima, logo ao lado do menu: fica sempre no mesmo
     lugar, em todos os modulos, e muda de destino conforme a tela aberta. */
  function botaoCfg() {
    try {
      if (typeof UI === 'undefined') return;
      var barra = document.querySelector('header.top');
      if (!barra) return;
      var b = barra.querySelector('.bf-cfg-tela');
      var d = (UI.view && UI.view !== 'config' && UI.view !== 'blackpay') ? DESTINO[UI.view] : null;
      if (!d) { if (b) b.remove(); return; }
      if (!b) {
        b = document.createElement('button');
        b.type = 'button';
        b.className = 'bf-cfg-tela';
        b.innerHTML = '&#9881;';
        b.addEventListener('click', function (e) { e.preventDefault(); window.bfCfgDaTela(); });
        var menu = barra.querySelector('.ico');
        if (menu && menu.nextSibling) barra.insertBefore(b, menu.nextSibling);
        else barra.insertBefore(b, barra.firstChild);
      }
      b.title = d.titulo;
      b.setAttribute('aria-label', d.titulo);
    } catch (e) { }
  }
  var obsCfg = new MutationObserver(botaoCfg);
  obsCfg.observe(document.body, { childList: true, subtree: true });

  /* Carrega o número ao entrar e a cada troca de clínica. */
  var t = setInterval(function () {
    try {
      if (typeof NV === 'undefined' || !NV.sessao) return;
      clearInterval(t);
      window.bfAssinanteCarregar().then(function () {
        if (typeof render === 'function') render();
      });
    } catch (e) { }
  }, 2500);
  setTimeout(function () { clearInterval(t); }, 120000);
})();
