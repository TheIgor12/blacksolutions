/* BlackSolutions: contagem de visitas e cliques
   Envia para o Google Ads (tag AW-16458923412) e para o painel próprio no Supabase (tabela site_cliques).
   Não envia nome, e-mail, telefone nem nenhum dado digitado nos formulários.
   Modo "site": conta a visita e os cliques nos botões e links importantes.
   Modo "app": conta só a primeira visita do dia e os botões marcados com data-clique. */
(function () {
  if (window.BSC) return;
  var AW = 'AW-16458923412';
  // Rótulo de cada conversão criada no Google Ads (o que vem depois da barra no send_to). Vazio = só conta no painel.
  var CONVERSOES = { cadastro: '', whatsapp: '', compra: '' };
  var RPC = 'https://blszdbjpxgtloblxlusr.supabase.co/rest/v1/rpc/registrar_clique';
  var CHAVE = 'sb_publishable_0Tns_mDN2N1iQmw_sEzFXw_SRMy1uXK';

  var host = location.hostname;
  var site = /lexcalc\.app\.br$/.test(host) ? 'lexcalc' : /blackflow\.app\.br$/.test(host) ? 'blackflow' : /blacksolutions\.net\.br$/.test(host) ? 'blacksolutions' : '';
  var eu = document.currentScript;
  var modo = (eu && eu.getAttribute('data-modo')) || 'site';
  var noop = function () {};
  window.BSC = { evento: noop };
  if (!site) return; // computador local, testes e programa instalado não contam

  function ler(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function gravar(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }

  // De onde a pessoa veio (guardado durante a visita para os cliques seguintes)
  var q = new URLSearchParams(location.search);
  var origem = ler('bsc_origem');
  if (!origem || q.get('gclid') || q.get('utm_source')) {
    if (q.get('gclid') || q.get('gbraid') || q.get('wbraid')) origem = 'google_ads';
    else if (q.get('utm_source')) origem = (q.get('utm_source') + (q.get('utm_medium') ? '/' + q.get('utm_medium') : '')).toLowerCase();
    else if (document.referrer) {
      var r = '';
      try { r = new URL(document.referrer).hostname.replace(/^www\./, ''); } catch (e) {}
      origem = !r || /blacksolutions\.net\.br|blackflow\.app\.br|lexcalc\.app\.br/.test(r) ? (origem || 'direto') : r;
    } else origem = origem || 'direto';
    gravar('bsc_origem', origem.slice(0, 60));
  }
  var aparelho = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'celular' : 'computador';

  // Tag do Google Ads
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { dataLayer.push(arguments); };
  gtag('js', new Date());
  gtag('config', AW, { allow_enhanced_conversions: false });
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + AW;
  document.head.appendChild(s);

  function enviar(evento, alvo) {
    try {
      fetch(RPC, {
        method: 'POST', keepalive: true,
        headers: { apikey: CHAVE, Authorization: 'Bearer ' + CHAVE, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_site: site, p_pagina: location.pathname.slice(0, 120), p_evento: evento, p_alvo: (alvo || '').slice(0, 60), p_origem: origem, p_aparelho: aparelho })
      }).catch(noop);
    } catch (e) {}
  }

  function evento(nome, alvo) {
    enviar(nome, alvo);
    try {
      gtag('event', nome, { alvo: alvo || '', site: site });
      if (CONVERSOES[nome]) gtag('event', 'conversion', { send_to: AW + '/' + CONVERSOES[nome] });
    } catch (e) {}
  }
  window.BSC = { evento: evento };

  // Visita
  if (modo === 'app') {
    var hoje = new Date().toISOString().slice(0, 10), k = 'bsc_visita_' + site;
    var ult = null;
    try { ult = localStorage.getItem(k); } catch (e) {}
    if (ult !== hoje) { try { localStorage.setItem(k, hoje); } catch (e) {} enviar('visita', ''); }
  } else enviar('visita', '');

  // Que tipo de clique é, pelo endereço do link
  function classificar(a) {
    var h = a.getAttribute('href') || '';
    if (/wa\.me|whatsapp\.com/i.test(h)) return ['whatsapp', 'whatsapp'];
    if (/\.exe(\?|$)/i.test(h)) return ['download', 'windows'];
    if (/\.dmg(\?|$)/i.test(h)) return ['download', 'mac'];
    if (/manual.*\.pdf/i.test(h)) return ['download', 'manual'];
    if (/asaas\.com|mercadopago|pagseguro/i.test(h)) return ['pagamento', 'link_pagamento'];
    if (/\/assinar/i.test(h)) return ['clique', 'assinar'];
    if (/lexcalc\.app\.br/i.test(h) && site !== 'lexcalc') return ['clique', 'abrir_lexcalc'];
    if (/blackflow\.app\.br|^\.\.\/app\/|^\/app\//i.test(h) && (site !== 'blackflow' || /app\//.test(h))) return ['clique', 'abrir_blackflow'];
    if (/^#?$/.test(h) && /baixar/i.test(a.textContent || '')) return ['download', 'botao_baixar'];
    return null;
  }

  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest('[data-clique],a[href]') : null;
    if (!el) return;
    var marcado = el.getAttribute('data-clique');
    if (marcado) {
      var p = marcado.split(':');
      evento(p.length > 1 ? p[0] : 'clique', p.length > 1 ? p[1] : p[0]);
      return;
    }
    if (modo === 'app') return;
    var c = classificar(el);
    if (c) evento(c[0], c[1]);
  }, true);
})();
