/* BlackFlow 1.40.0 — Mapa dos pododáctilos na anamnese podológica.

   Para que serve
   --------------
   A podóloga marca no desenho qual dedo e qual parte do pé está tratando, em
   vez de escrever por extenso a cada atendimento. São dois desenhos de cada
   pé: o peito do pé, que é o dorso, visto de cima, e a sola, que é a planta,
   vista de baixo.

   Nomes usados
   ------------
   Pododáctilo é o nome do dedo do pé. São cinco em cada pé, numerados do
   primeiro ao quinto, do lado de dentro para o lado de fora. O primeiro é o
   hálux, o dedão. O espaço entre dois dedos é o espaço interdigital, onde
   aparece a micose interdigital. A polpa é a almofada embaixo de cada dedo. As
   cabeças dos metatarsos ficam na parte dianteira da sola, onde nasce calo. O
   calcâneo é o osso do talão. Bordo medial é a borda de dentro, do lado do
   hálux; bordo lateral é a borda de fora, do lado do quinto dedo.

   Orientação dos desenhos
   -----------------------
   Nos dois desenhos o pé direito fica à direita e o esquerdo à esquerda, com
   o hálux voltado para o centro. Na vista da sola a convenção anatômica
   inverteria os lados, mas aqui cada pé é escrito com o nome dele embaixo,
   porque quem usa isso está atendendo, não estudando anatomia, e um lado
   trocado na ficha vale um tratamento no pé errado.

   Nada aqui é diagnóstico. É registro do que a profissional marcou. */
(function () {
  'use strict';
  if (window.__bfPodoMapa140) return;
  window.__bfPodoMapa140 = true;

  var ORD = ['1º', '2º', '3º', '4º', '5º'];

  /* Formas de cada região, no desenho de um pé direito, caixa 100 por 220.
     O pé esquerdo é o mesmo desenho espelhado. */
  var PEITO = [
    { c: 'd1', t: 'dorso do 1º pododáctilo (hálux)', f: 'e', cx: 24, cy: 42, rx: 13, ry: 18 },
    { c: 'd2', t: 'dorso do 2º pododáctilo', f: 'e', cx: 46, cy: 44, rx: 8.5, ry: 15 },
    { c: 'd3', t: 'dorso do 3º pododáctilo', f: 'e', cx: 62, cy: 45, rx: 8, ry: 14 },
    { c: 'd4', t: 'dorso do 4º pododáctilo', f: 'e', cx: 76, cy: 47, rx: 7.5, ry: 12.5 },
    { c: 'd5', t: 'dorso do 5º pododáctilo', f: 'e', cx: 87, cy: 49, rx: 7, ry: 11 },
    { c: 'u1', t: 'unha do 1º pododáctilo (hálux)', f: 'r', x: 17, y: 30, w: 14, h: 13, rr: 4.5 },
    { c: 'u2', t: 'unha do 2º pododáctilo', f: 'r', x: 41, y: 34, w: 10, h: 10, rr: 3.2 },
    { c: 'u3', t: 'unha do 3º pododáctilo', f: 'r', x: 57.3, y: 36, w: 9.5, h: 9.5, rr: 3 },
    { c: 'u4', t: 'unha do 4º pododáctilo', f: 'r', x: 71.8, y: 39, w: 9, h: 8.5, rr: 3 },
    { c: 'u5', t: 'unha do 5º pododáctilo', f: 'r', x: 83, y: 42, w: 8, h: 7.5, rr: 2.8 },
    { c: 'i1', t: '1º espaço interdigital (entre o hálux e o 2º dedo)', f: 'e', cx: 36, cy: 58, rx: 4.6, ry: 4.2 },
    { c: 'i2', t: '2º espaço interdigital', f: 'e', cx: 54, cy: 57, rx: 4.1, ry: 3.8 },
    { c: 'i3', t: '3º espaço interdigital', f: 'e', cx: 69, cy: 58, rx: 4, ry: 3.7 },
    { c: 'i4', t: '4º espaço interdigital', f: 'e', cx: 81.5, cy: 60, rx: 3.8, ry: 3.5 },
    { c: 'dant', t: 'dorso do antepé', f: 'p', d: 'M16 70 C40 62 64 62 87 70 C85 90 84 98 84 104 C60 96 38 96 18 104 C18 96 17 88 16 70 Z' },
    { c: 'dmed', t: 'dorso do médio-pé', f: 'p', d: 'M19 110 C42 102 62 102 84 110 C82 126 80 136 79 148 C58 140 42 140 29 148 C28 136 22 126 19 110 Z' },
    { c: 'torn', t: 'tornozelo e retropé', f: 'p', d: 'M30 154 C48 146 62 146 77 154 C82 184 72 213 53 214 C34 213 25 184 30 154 Z' }
  ];
  var SOLA = [
    { c: 'p1', t: 'polpa do 1º pododáctilo (hálux)', f: 'e', cx: 24, cy: 42, rx: 13, ry: 18 },
    { c: 'p2', t: 'polpa do 2º pododáctilo', f: 'e', cx: 46, cy: 44, rx: 8.5, ry: 15 },
    { c: 'p3', t: 'polpa do 3º pododáctilo', f: 'e', cx: 62, cy: 45, rx: 8, ry: 14 },
    { c: 'p4', t: 'polpa do 4º pododáctilo', f: 'e', cx: 76, cy: 47, rx: 7.5, ry: 12.5 },
    { c: 'p5', t: 'polpa do 5º pododáctilo', f: 'e', cx: 87, cy: 49, rx: 7, ry: 11 },
    { c: 'meta', t: 'cabeças dos metatarsos (antepé)', f: 'p', d: 'M16 70 C40 62 64 62 87 70 C85 94 64 104 50 104 C36 104 18 94 16 70 Z' },
    { c: 'bm', t: 'bordo medial (borda de dentro)', f: 'p', d: 'M17 86 C14 106 21 126 28 144 L34 142 C28 124 22 106 24 88 Z' },
    { c: 'bl', t: 'bordo lateral (borda de fora)', f: 'p', d: 'M86 86 C89 106 82 126 75 144 L69 142 C75 124 80 106 79 88 Z' },
    { c: 'arco', t: 'arco plantar (médio-pé)', f: 'p', d: 'M30 110 C48 104 62 104 74 110 C73 126 72 136 71 148 C54 142 45 142 34 148 C33 136 31 126 30 110 Z' },
    { c: 'calc', t: 'calcâneo (talão)', f: 'p', d: 'M31 158 C48 150 62 150 77 158 C82 186 72 214 53 215 C34 214 26 186 31 158 Z' }
  ];
  /* Contorno do pe direito: antepe largo, cintura estreita no arco e calcanhar
     arredondado. O halux fica a esquerda do desenho, que e o lado de dentro. */
  var CONTORNO = 'M14 72 C10 92 18 112 24 130 C28 146 26 160 30 176 C24 196 34 220 53 220 ' +
                 'C72 220 82 198 76 176 C80 158 80 144 84 130 C90 112 94 92 88 72 ' +
                 'C80 58 62 54 46 56 C30 58 18 62 14 72 Z';

  var LADO = { D: 'Pé direito', E: 'Pé esquerdo' };
  var VISTA = { P: 'peito do pé', S: 'sola do pé' };

  function porCodigo(vista, reg) {
    var L = vista === 'S' ? SOLA : PEITO;
    for (var i = 0; i < L.length; i++) if (L[i].c === reg) return L[i];
    return null;
  }
  /* Código de uma marca: lado, vista e região, separados por ponto. */
  function texto(cod) {
    var p = String(cod || '').split('.');
    if (p.length !== 3) return String(cod || '');
    var f = porCodigo(p[1], p[2]);
    return (LADO[p[0]] || p[0]) + ', ' + (VISTA[p[1]] || p[1]) + ', ' + (f ? f.t : p[2]);
  }
  window.bfPodoTexto = function (mapa) {
    var L = (mapa && Array.isArray(mapa.pontos)) ? mapa.pontos : [];
    if (!L.length) return '';
    return L.map(texto).join('; ');
  };

  function estado() {
    if (!UI.ana) return null;
    if (!UI.ana.mapa || typeof UI.ana.mapa !== 'object') UI.ana.mapa = { pontos: [], obs: '' };
    if (!Array.isArray(UI.ana.mapa.pontos)) UI.ana.mapa.pontos = [];
    return UI.ana.mapa;
  }

  function forma(f, cod, marcado) {
    var cl = 'bfpm-z' + (marcado ? ' on' : '');
    var com = ' class="' + cl + '" data-cod="' + cod + '" tabindex="0" role="button"' +
      ' aria-pressed="' + (marcado ? 'true' : 'false') + '"><title>' + esc(texto(cod)) + '</title>';
    if (f.f === 'r') return '<rect x="' + f.x + '" y="' + f.y + '" width="' + f.w + '" height="' + f.h + '" rx="' + f.rr + '"' + com + '</rect>';
    if (f.f === 'e') return '<ellipse cx="' + f.cx + '" cy="' + f.cy + '" rx="' + f.rx + '" ry="' + f.ry + '"' + com + '</ellipse>';
    return '<path d="' + f.d + '"' + com + '</path>';
  }

  function pe(lado, vista, pontos) {
    var L = vista === 'S' ? SOLA : PEITO;
    var corpo = L.map(function (f) {
      var cod = lado + '.' + vista + '.' + f.c;
      return forma(f, cod, pontos.indexOf(cod) >= 0);
    }).join('');
    /* O pé esquerdo é o direito espelhado, e o espelho fica só no desenho: os
       códigos e os nomes continuam os do lado certo. */
    var g = lado === 'E' ? '<g transform="translate(100,0) scale(-1,1)">' : '<g>';
    return '<figure class="bfpm-pe"><svg viewBox="0 0 100 232" role="img" aria-label="' +
      esc(LADO[lado] + ', ' + VISTA[vista]) + '">' + g +
      '<path class="bfpm-contorno" d="' + CONTORNO + '"></path>' + corpo + '</g></svg>' +
      '<figcaption>' + esc(LADO[lado]) + '</figcaption></figure>';
  }

  function bloco(vista, pontos) {
    return '<div class="bfpm-bloco"><h4>' + (vista === 'P' ? 'Peito do pé, o dorso, visto de cima'
      : 'Sola do pé, a planta, vista de baixo') + '</h4>' +
      '<div class="bfpm-par">' + pe('E', vista, pontos) + pe('D', vista, pontos) + '</div></div>';
  }

  function listaHTML(m) {
    if (!m.pontos.length) return '<p class="bfpm-vazio">Nenhum ponto marcado. Toque no desenho para marcar o dedo ou a parte do pé que está sendo tratada.</p>';
    return '<ul class="bfpm-lista">' + m.pontos.map(function (c) {
      return '<li><span>' + esc(texto(c)) + '</span><button type="button" class="lnk" onclick="bfPodoToggle(\'' + c + '\')">tirar</button></li>';
    }).join('') + '</ul>';
  }

  window.bfPodoMapaHTML = function () {
    var m = estado(); if (!m) return '';
    return '<div class="bfpm" id="bfpm">' +
      '<div class="bfpm-cab"><b>Mapa dos pododáctilos</b>' +
      '<button type="button" class="lnk" onclick="bfPodoLimpar()">limpar as marcas</button></div>' +
      '<p class="bfpm-sub">Pododáctilo é o dedo do pé, numerado do 1º ao 5º, de dentro para fora. O 1º é o hálux. ' +
      'Toque na unha, no dedo, no espaço entre os dedos ou na parte do pé. Nos dois desenhos o pé direito está à direita.</p>' +
      '<div class="bfpm-mapas">' + bloco('P', m.pontos) + bloco('S', m.pontos) + '</div>' +
      '<div id="bfpm-lista">' + listaHTML(m) + '</div>' +
      '<label class="bfpm-obs">Observação do mapa' +
      '<textarea rows="2" placeholder="O que foi visto ou feito nos pontos marcados" ' +
      'oninput="bfPodoObs(this.value)">' + esc(m.obs || '') + '</textarea></label></div>';
  };

  function repintar() {
    var m = estado(); if (!m) return;
    var raiz = document.getElementById('bfpm'); if (!raiz) return;
    raiz.querySelectorAll('.bfpm-z').forEach(function (el) {
      var on = m.pontos.indexOf(el.getAttribute('data-cod')) >= 0;
      el.classList.toggle('on', on);
      el.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    var l = document.getElementById('bfpm-lista');
    if (l) l.innerHTML = listaHTML(m);
  }

  window.bfPodoToggle = function (cod) {
    var m = estado(); if (!m) return;
    var i = m.pontos.indexOf(cod);
    if (i >= 0) m.pontos.splice(i, 1); else m.pontos.push(cod);
    repintar();
  };
  window.bfPodoObs = function (v) { var m = estado(); if (m) m.obs = String(v || '').slice(0, 600); };
  window.bfPodoLimpar = function () {
    var m = estado(); if (!m || !m.pontos.length) return;
    m.pontos = []; repintar();
  };

  /* Um ouvinte no documento, para o desenho redesenhado continuar respondendo. */
  document.addEventListener('click', function (e) {
    var z = e.target && e.target.closest ? e.target.closest('.bfpm-z') : null;
    if (!z) return;
    e.preventDefault();
    window.bfPodoToggle(z.getAttribute('data-cod'));
  }, true);
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var z = e.target && e.target.classList && e.target.classList.contains('bfpm-z') ? e.target : null;
    if (!z) return;
    e.preventDefault();
    window.bfPodoToggle(z.getAttribute('data-cod'));
  }, true);

  var CSS = '<style>' +
    '.bfpm{border:1px solid var(--line,#e6e6ef);border-radius:14px;padding:14px;margin:0 0 14px}' +
    '.bfpm-cab{display:flex;justify-content:space-between;align-items:baseline;gap:10px}' +
    '.bfpm-cab b{font-size:14px}' +
    '.bfpm-sub{margin:6px 0 12px;font-size:12px;color:var(--mut);line-height:1.5}' +
    '.bfpm-mapas{display:grid;grid-template-columns:1fr 1fr;gap:14px}' +
    '.bfpm-bloco{border:1px solid var(--line,#e6e6ef);border-radius:12px;padding:10px}' +
    '.bfpm-bloco h4{margin:0 0 8px;font-size:12.5px;font-weight:700}' +
    '.bfpm-par{display:flex;gap:8px}' +
    '.bfpm-pe{margin:0;flex:1 1 0;min-width:0;text-align:center}' +
    '.bfpm-pe svg{width:100%;height:auto;max-height:300px;display:block}' +
    '.bfpm-pe figcaption{font-size:11px;color:var(--mut);margin-top:4px}' +
    '.bfpm-contorno{fill:#f4f4f8;stroke:#c9c9d6;stroke-width:1.4}' +
    '.bfpm-z{fill:#fff;stroke:#9a9aae;stroke-width:1;cursor:pointer}' +
    '.bfpm-z:hover{fill:#e6e4ff}' +
    '.bfpm-z:focus{outline:none;stroke:#5a4cfb;stroke-width:2}' +
    '.bfpm-z.on{fill:#5a4cfb;stroke:#3d31d6;stroke-width:1.2}' +
    '.bfpm-lista{list-style:none;margin:12px 0 0;padding:0;display:flex;flex-direction:column;gap:6px}' +
    '.bfpm-lista li{display:flex;justify-content:space-between;gap:10px;align-items:baseline;' +
    'border:1px solid var(--line,#e6e6ef);border-radius:10px;padding:8px 10px;font-size:12.5px}' +
    '.bfpm-vazio{margin:12px 0 0;font-size:12.5px;color:var(--mut)}' +
    '.bfpm-obs{display:flex;flex-direction:column;gap:4px;margin-top:12px;font-size:12.5px;font-weight:600;color:var(--mut)}' +
    '.bfpm-obs textarea{width:100%;font:inherit;font-weight:400;color:var(--ink);border:1px solid var(--line,#e6e6ef);' +
    'border-radius:10px;padding:9px 10px;background:#fff}' +
    '@media(max-width:760px){.bfpm-mapas{grid-template-columns:1fr}.bfpm{padding:12px 11px}' +
    '.bfpm-pe svg{max-height:none}.bfpm-obs textarea{font-size:16px;min-height:76px;padding:11px 12px}}' +
    '</style>';
  document.head.insertAdjacentHTML('beforeend', CSS);
})();
