/* BlackFlow 1.28.0 — navegação entre janelas.

   Dois problemas resolvidos aqui, sem tocar na regra de negócio:

   1. Voltar. Quem estava no atendimento, abriu o WhatsApp e de lá abriu o Pix
      ficava sem caminho de volta: só existia Fechar, que derrubava tudo e
      devolvia a pessoa para a agenda. Agora cada janela nova guarda a anterior
      e aparece uma seta no canto superior esquerdo, que desfaz um passo por
      vez. O que a pessoa já tinha digitado volta preenchido.

   2. Sair sem querer. Fechar no X, clicar fora da janela ou apertar Esc
      fechava na hora, e o que estava digitado se perdia sem aviso. Agora,
      quando existe algo digitado e ainda não salvo, aparece uma caixa no meio
      da tela perguntando se é para sair mesmo. Quando não há nada digitado,
      nada muda: fecha direto, sem incomodar.

   Nada disto altera dado, nem sincronização, nem permissão. */
(function () {
  'use strict';
  if (window.__bfNavegacao) return;
  window.__bfNavegacao = true;

  var PILHA = [];
  var ABERTURA = null; // valores da janela no momento em que ela apareceu
  var ULTIMA = null;   // janela fechada agora há pouco pelo próprio código
  var SAIU_A_PEDIDO = false; // quem fechou foi a pessoa, no X, fora da janela ou no Esc

  function raiz() { return document.getElementById('modalRoot'); }
  function painel() { var r = raiz(); return r ? r.querySelector('.modalw > .modal') : null; }

  function campos(el) {
    if (!el) return [];
    return Array.prototype.slice.call(el.querySelectorAll('input,select,textarea'));
  }
  function valores(el) {
    return campos(el).map(function (c) {
      if (c.type === 'checkbox' || c.type === 'radio') return c.checked ? '1' : '';
      if (c.type === 'file') return '';
      return String(c.value == null ? '' : c.value);
    });
  }
  function titulo(html) {
    var m = /<h3[^>]*>([\s\S]*?)<\/h3>/i.exec(String(html || ''));
    return m ? m[1].replace(/<[^>]*>/g, '').trim() : '';
  }

  /* Guarda a janela que está na tela, com o que já foi digitado nela. */
  function fotografar() {
    var r = raiz();
    if (!r || !r.innerHTML) return null;
    /* A seta e o X são postos na janela depois, com o clique ligado por
       código. Guardados como texto, voltariam mortos, sem fazer nada. Então
       saem da foto e são postos de novo na volta. */
    var copia = r.cloneNode(true);
    Array.prototype.forEach.call(
      copia.querySelectorAll('.bf-modal-voltar,.bf-modal-close'),
      function (b) { b.remove(); }
    );
    return { html: copia.innerHTML, vals: valores(r), titulo: titulo(copia.innerHTML) };
  }

  function restaurar(foto) {
    var r = raiz();
    if (!r || !foto) return;
    r.innerHTML = foto.html;
    var cs = campos(r);
    foto.vals.forEach(function (v, i) {
      var c = cs[i];
      if (!c) return;
      if (c.type === 'checkbox' || c.type === 'radio') c.checked = !!v;
      else if (c.type !== 'file') c.value = v;
    });
  }

  var abrirOriginal = window.openModal;
  var fecharOriginal = window.closeModal;

  window.openModal = function (html, wide) {
    var atual = fotografar();
    /* Vários botões fecham a janela e abrem outra na mesma linha, como o Pix
       dentro do atendimento. Para a pessoa isso é um passo adiante, não um
       fim, então a janela recém fechada entra na pilha. Só quando foi ela
       quem mandou fechar é que o caminho de volta termina ali. */
    if (!atual && ULTIMA && !SAIU_A_PEDIDO && Date.now() - ULTIMA.t < 60) {
      atual = ULTIMA.foto;
      PILHA.length = 0;
      Array.prototype.push.apply(PILHA, ULTIMA.pilha);
    }
    ULTIMA = null;
    SAIU_A_PEDIDO = false;
    // Redesenhar a mesma janela não é um passo novo: substitui, não empilha.
    if (atual && titulo(html) && atual.titulo === titulo(html)) atual = null;
    if (atual) PILHA.push(atual);
    if (PILHA.length > 12) PILHA.shift();
    abrirOriginal.call(this, html, wide);
    ABERTURA = valores(raiz());
    marcar();
  };

  window.closeModal = function () {
    var foto = fotografar();
    ULTIMA = foto ? { foto: foto, pilha: PILHA.slice(), t: Date.now() } : null;
    PILHA.length = 0;
    ABERTURA = null;
    fecharOriginal.call(this);
  };

  /* Desfaz um passo. Sem passo anterior, fecha. */
  window.voltarModal = function () {
    if (typeof window.fecha2 === 'function') window.fecha2();
    var foto = PILHA.pop();
    if (!foto) { window.closeModal(); return; }
    restaurar(foto);
    ABERTURA = valores(raiz());
    marcar();
  };

  /* ---------- Caixa de confirmação, no meio da tela ---------- */
  function caixa() {
    var d = document.getElementById('bfSairRoot');
    if (!d) {
      d = document.createElement('div');
      d.id = 'bfSairRoot';
      document.body.appendChild(d);
    }
    return d;
  }
  function fecharCaixa() { caixa().innerHTML = ''; }
  window.bfSairCancelar = fecharCaixa;
  window.bfSairConfirmar = function () { fecharCaixa(); window.closeModal(); SAIU_A_PEDIDO = true; };

  function perguntarSaida() {
    caixa().innerHTML =
      '<div class="bf-sair-fundo" onclick="if(event.target===this)bfSairCancelar()">' +
      '<div class="bf-sair-cx" role="dialog" aria-modal="true" aria-labelledby="bfSairTit">' +
      '<h3 id="bfSairTit">Deseja mesmo sair?</h3>' +
      '<p>O que você digitou nesta janela ainda não foi salvo e será perdido.</p>' +
      '<div class="bf-sair-bt">' +
      '<button type="button" class="bf-sair-ghost" onclick="bfSairCancelar()">Continuar aqui</button>' +
      '<button type="button" class="bf-sair-ok" onclick="bfSairConfirmar()">Sair sem salvar</button>' +
      '</div></div></div>';
    var b = caixa().querySelector('.bf-sair-ghost');
    if (b) b.focus();
  }

  function mudou() {
    if (!ABERTURA) return false;
    var agora = valores(raiz());
    if (agora.length !== ABERTURA.length) return true;
    for (var i = 0; i < agora.length; i++) if (agora[i] !== ABERTURA[i]) return true;
    return false;
  }

  /* Saída pedida pela pessoa: X, clique fora ou Esc. */
  window.bfSairDaJanela = function () {
    if (!raiz() || !raiz().innerHTML) return;
    if (document.getElementById('bfSairRoot') && caixa().innerHTML) return;
    if (mudou()) { perguntarSaida(); return; }
    window.closeModal();
    SAIU_A_PEDIDO = true;
  };

  /* Intercepta antes dos manipuladores próprios da página. */
  document.addEventListener('click', function (e) {
    if (caixa().contains(e.target)) return;
    var r = raiz();
    if (!r || !r.innerHTML) return;
    var x = e.target.closest && e.target.closest('.bf-modal-close');
    var foraDaJanela = e.target.classList && e.target.classList.contains('modalw') && r.contains(e.target);
    if (!x && !foraDaJanela) return;
    if (x && !r.contains(x)) return; // X da janela de cima segue como era
    e.preventDefault();
    e.stopPropagation();
    window.bfSairDaJanela();
  }, true);

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (caixa().innerHTML) { e.preventDefault(); e.stopPropagation(); fecharCaixa(); return; }
    var r = raiz();
    if (!r || !r.innerHTML) return;
    var r2 = document.getElementById('modalRoot2');
    if (r2 && r2.innerHTML) return; // Esc fecha primeiro a janela de cima
    if (!mudou()) return;           // sem nada digitado, segue o comportamento antigo
    e.preventDefault();
    e.stopPropagation();
    perguntarSaida();
  }, true);

  /* ---------- Seta de voltar ---------- */
  function marcar() {
    var p = painel();
    if (!p) return;
    var antigo = p.querySelector(':scope > .bf-modal-voltar');
    if (!PILHA.length) { if (antigo) antigo.remove(); return; }
    if (antigo) return;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'bf-modal-voltar';
    b.setAttribute('aria-label', 'Voltar para a janela anterior');
    b.setAttribute('title', 'Voltar para a janela anterior');
    b.innerHTML = '&#8592;';
    b.addEventListener('click', function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      window.voltarModal();
    });
    p.insertBefore(b, p.firstChild);
  }

  var obs = new MutationObserver(function () { marcar(); });
  function ligar() {
    var r = raiz();
    if (!r) { setTimeout(ligar, 300); return; }
    obs.observe(r, { childList: true, subtree: true });
    marcar();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ligar);
  else ligar();
})();
