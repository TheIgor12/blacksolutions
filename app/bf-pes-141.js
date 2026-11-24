/* BlackFlow 1.41.0 — Pés interativos, módulo da podologia.

   O que é
   -------
   Um desenho do pé que a profissional gira e marca. Ela escolhe o pé, gira
   para ver o peito, o lado de fora, a sola, o lado de dentro, a ponta dos
   dedos e o calcanhar, toca onde está tratando e o sistema pergunta se quer
   guardar aquele toque como local do tratamento. Guardando, o ponto fica no
   desenho com número, com o nome anatômico do lugar, com o achado e com a
   anotação dela.

   Nomes usados
   ------------
   Pododáctilo é o dedo do pé, do 1º ao 5º, de dentro para fora. O 1º é o
   hálux. Espaço interdigital é o vão entre dois dedos. Polpa é a almofada
   embaixo do dedo. Cabeças dos metatarsos é a parte dianteira da sola, onde
   nasce calo. Calcâneo é o osso do talão. Bordo medial é a borda de dentro e
   bordo lateral a de fora. Maléolo é o osso saliente do tornozelo.

   Ligação com a anamnese
   ----------------------
   O mapa é gravado por paciente, não por anamnese, e a ficha de anamnese lê
   dele direto. Assim não há duas verdades: o que ela marca aqui é o que
   aparece lá, no mesmo instante, sem copiar nada.

   O que este módulo não faz
   -------------------------
   Não diagnostica e não sugere conduta. Ele registra o que a profissional
   marcou e escreveu. Quem identifica e interpreta é ela. */
(function () {
  'use strict';
  if (window.__bfPes141) return;
  window.__bfPes141 = true;

  var TELA = 'pesmapa';
  var E = function (v) { return esc(v == null ? '' : String(v)); };

  /* ---------------------------------------------------------------- vistas */
  var DORSAL_CONTORNO = 'M14 72 C10 92 18 112 24 130 C28 146 26 160 30 176 C24 196 34 220 53 220 ' +
    'C72 220 82 198 76 176 C80 158 80 144 84 130 C90 112 94 92 88 72 ' +
    'C80 58 62 54 46 56 C30 58 18 62 14 72 Z';
  /* Perfil do pé: coluna da perna no alto à esquerda, calcanhar arredondado
     embaixo, peito do pé descendo até os dedos, à direita. O perfil de dentro
     levanta a sola no meio, que é onde aparece o arco. */
  var PERFIL = 'M28 12 L66 12 C66 34 70 48 80 58 C100 72 140 82 182 86 ' +
    'C200 88 216 90 218 96 C220 102 212 106 198 106 L70 106 ' +
    'C44 106 26 94 24 72 C22 50 22 26 28 12 Z';
  var PERFIL_ARCO = 'M28 12 L66 12 C66 34 70 48 80 58 C100 72 140 82 182 86 ' +
    'C200 88 216 90 218 96 C220 102 212 106 198 106 L146 106 ' +
    'C116 106 92 100 76 90 C60 100 40 100 24 72 C22 50 22 26 28 12 Z';

  var VISTAS = {
    dorsal: {
      nome: 'Peito do pé', ajuda: 'o dorso, visto de cima', vb: '0 0 100 232', contorno: DORSAL_CONTORNO,
      regioes: [
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
      ]
    },
    lateral: {
      nome: 'Lado de fora', ajuda: 'bordo lateral, do lado do 5º dedo', vb: '0 0 230 120', contorno: PERFIL,
      regioes: [
        { c: 'lcal', t: 'calcâneo (talão), de lado', f: 'e', cx: 48, cy: 84, rx: 18, ry: 15 },
        { c: 'lmal', t: 'maléolo lateral (osso do tornozelo, por fora)', f: 'e', cx: 52, cy: 42, rx: 13, ry: 12 },
        { c: 'lmed', t: 'bordo lateral do médio-pé', f: 'p', d: 'M74 92 C102 99 132 102 158 103 L158 105 L74 105 Z' },
        { c: 'lant', t: 'antepé, por fora', f: 'e', cx: 178, cy: 97, rx: 20, ry: 7.5 },
        { c: 'l5', t: '5º pododáctilo, de lado', f: 'e', cx: 204, cy: 97, rx: 10, ry: 7 },
        { c: 'ldor', t: 'dorso do pé, de lado', f: 'p', d: 'M82 58 C104 72 142 82 180 86 L178 93 C138 89 100 78 78 64 Z' }
      ]
    },
    plantar: {
      nome: 'Sola do pé', ajuda: 'a planta, vista de baixo', vb: '0 0 100 232', contorno: DORSAL_CONTORNO,
      regioes: [
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
      ]
    },
    medial: {
      nome: 'Lado de dentro', ajuda: 'bordo medial, do lado do hálux, onde aparece o arco', vb: '0 0 230 120', contorno: PERFIL_ARCO,
      regioes: [
        { c: 'mcal', t: 'calcâneo (talão), por dentro', f: 'e', cx: 48, cy: 84, rx: 18, ry: 15 },
        { c: 'mmal', t: 'maléolo medial (osso do tornozelo, por dentro)', f: 'e', cx: 52, cy: 42, rx: 13, ry: 12 },
        { c: 'marc', t: 'arco medial', f: 'p', d: 'M76 90 C94 100 118 104 146 105 L146 99 C120 98 96 93 80 84 Z' },
        { c: 'mant', t: 'antepé, por dentro', f: 'e', cx: 178, cy: 97, rx: 20, ry: 7.5 },
        { c: 'm1', t: '1º pododáctilo (hálux), de lado', f: 'e', cx: 204, cy: 96, rx: 11, ry: 8 },
        { c: 'mdor', t: 'dorso do pé, por dentro', f: 'p', d: 'M82 58 C104 72 142 82 180 86 L178 93 C138 89 100 78 78 64 Z' }
      ]
    },
    dedos: {
      nome: 'Ponta dos dedos', ajuda: 'o pé visto de frente', vb: '0 0 220 130',
      contorno: 'M14 62 C14 46 30 38 56 38 L170 38 C196 38 208 48 208 64 L208 100 C208 114 196 120 178 120 L44 120 C24 120 14 112 14 98 Z',
      regioes: [
        { c: 'f1', t: 'ponta do 1º pododáctilo (hálux)', f: 'e', cx: 44, cy: 48, rx: 27, ry: 25 },
        { c: 'f2', t: 'ponta do 2º pododáctilo', f: 'e', cx: 94, cy: 42, rx: 20, ry: 19 },
        { c: 'f3', t: 'ponta do 3º pododáctilo', f: 'e', cx: 131, cy: 44, rx: 18, ry: 17 },
        { c: 'f4', t: 'ponta do 4º pododáctilo', f: 'e', cx: 163, cy: 48, rx: 16, ry: 15 },
        { c: 'f5', t: 'ponta do 5º pododáctilo', f: 'e', cx: 191, cy: 54, rx: 14, ry: 13 },
        { c: 'fu1', t: 'unha do 1º pododáctilo (hálux)', f: 'r', x: 32, y: 32, w: 25, h: 22, rr: 7 },
        { c: 'fu2', t: 'unha do 2º pododáctilo', f: 'r', x: 83, y: 28, w: 19, h: 17, rr: 5 },
        { c: 'fu3', t: 'unha do 3º pododáctilo', f: 'r', x: 122, y: 31, w: 17, h: 15, rr: 5 },
        { c: 'fu4', t: 'unha do 4º pododáctilo', f: 'r', x: 155, y: 36, w: 15, h: 13, rr: 4 },
        { c: 'fu5', t: 'unha do 5º pododáctilo', f: 'r', x: 184, y: 43, w: 13, h: 12, rr: 4 },
        { c: 'fant', t: 'antepé, visto de frente', f: 'p', d: 'M18 78 C70 70 150 70 204 78 L204 102 C150 110 70 110 18 102 Z' }
      ]
    },
    calcanhar: {
      nome: 'Calcanhar', ajuda: 'o pé visto por trás', vb: '0 0 160 210',
      contorno: 'M54 12 L106 12 C110 44 114 70 122 92 C136 122 136 160 110 180 C96 191 64 191 50 180 ' +
                'C24 160 24 122 38 92 C46 70 50 44 54 12 Z',
      regioes: [
        { c: 'caq', t: 'tendão de Aquiles', f: 'r', x: 66, y: 22, w: 28, h: 74, rr: 12 },
        { c: 'cpos', t: 'calcâneo posterior', f: 'e', cx: 80, cy: 132, rx: 38, ry: 34 },
        { c: 'cfis', t: 'borda do calcanhar, onde racha', f: 'p', d: 'M42 156 C56 182 104 182 118 156 C122 172 110 188 80 188 C50 188 38 172 42 156 Z' },
        { c: 'cmm', t: 'maléolo medial (por dentro)', f: 'e', cx: 44, cy: 100, rx: 14, ry: 13 },
        { c: 'cml', t: 'maléolo lateral (por fora)', f: 'e', cx: 116, cy: 100, rx: 14, ry: 13 }
      ]
    }
  };
  /* Giro em volta do pé: cada toque no botão anda um quarto de volta. */
  var GIRO = ['dorsal', 'lateral', 'plantar', 'medial'];
  var PONTAS = ['dedos', 'calcanhar'];
  var LADO = { D: 'Pé direito', E: 'Pé esquerdo' };

  var ACHADOS = ['Calosidade', 'Calo', 'Fissura', 'Onicocriptose (unha encravada)', 'Onicomicose (micose de unha)',
    'Micose interdigital', 'Onicodistrofia', 'Hematoma subungueal', 'Verruga plantar', 'Ferida ou úlcera',
    'Bolha', 'Rachadura', 'Dor ou sensibilidade', 'Ressecamento', 'Hiperqueratose', 'Esporão', 'Outro'];

  /* ------------------------------------------------------------ gravação */
  function temCol() { if (!Array.isArray(S.pesMapas)) S.pesMapas = []; return S.pesMapas; }
  function mapaDe(pid, criar) {
    var L = temCol();
    for (var i = 0; i < L.length; i++) if (L[i].pacienteId === pid) return L[i];
    if (!criar) return null;
    var novo = { id: uid(), pacienteId: pid, pontos: [], obs: '', em: todayISO() };
    L.push(novo); return novo;
  }
  window.bfPesMapaDe = function (pid) { return mapaDe(pid, false); };

  function nomeRegiao(vista, cod) {
    var R = (VISTAS[vista] || {}).regioes || [];
    for (var i = 0; i < R.length; i++) if (R[i].c === cod) return R[i].t;
    var L = localDaRegiao(cod);
    return L ? L.t : '';
  }
  /* Onde uma região mora no desenho plano: em que vista e em que ponto dela.
     É isso que faz um ponto marcado no pé em três dimensões aparecer também
     no celular, na vista certa, sem virar outro registro. */
  var CACHE_REG = null;
  function localDaRegiao(cod) {
    if (!CACHE_REG) {
      CACHE_REG = {};
      Object.keys(VISTAS).forEach(function (v) {
        (VISTAS[v].regioes || []).forEach(function (f) {
          var x, y;
          if (f.f === 'e') { x = f.cx; y = f.cy; }
          else if (f.f === 'r') { x = f.x + f.w / 2; y = f.y + f.h / 2; }
          else {
            var nums = String(f.d).match(/-?\d+(?:\.\d+)?/g) || [];
            var sx = 0, sy = 0, n = 0;
            for (var i = 0; i + 1 < nums.length; i += 2) { sx += +nums[i]; sy += +nums[i + 1]; n++; }
            x = n ? sx / n : 50; y = n ? sy / n : 50;
          }
          CACHE_REG[f.c] = { vista: v, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, t: f.t };
        });
      });
    }
    return CACHE_REG[cod] || null;
  }
  window.bfPesLocalRegiao = localDaRegiao;
  function textoPonto(p) {
    var v = VISTAS[p.vista];
    var onde = v ? (LADO[p.pe] || p.pe) + ', ' + v.nome.toLowerCase() : (LADO[p.pe] || p.pe);
    return onde + (p.regiao ? ', ' + nomeRegiao(p.vista, p.regiao) : '') +
      (p.tipo ? ' — ' + p.tipo : '') + (p.nota ? ': ' + p.nota : '');
  }
  window.bfPesTexto = function (pid) {
    var m = mapaDe(pid, false); if (!m || !m.pontos.length) return '';
    return m.pontos.map(textoPonto).join(' | ');
  };
  window.bfPesTextoPonto = function (p) { return textoPonto(p); };
  window.bfPesResumo = function (pid) {
    var m = mapaDe(pid, false);
    if (!m || (!m.pontos.length && !str(m.obs))) return null;
    return { pontos: m.pontos.slice(), obs: str(m.obs), em: m.em };
  };

  /* ----------------------------------------------------------- estado UI */
  var P = { pid: '', pe: 'D', vista: 'dorsal', abrindo: null };
  window.__bfPesP = P;

  function pacAtivos() {
    return (S.pacientes || []).filter(function (x) { return x.status !== 'Inativo'; })
      .sort(function (a, b) { return String(a.nome).localeCompare(String(b.nome), 'pt-BR'); });
  }
  function pacDe(id) { return (S.pacientes || []).find(function (x) { return x.id === id; }) || null; }

  /* --------------------------------------------------------- o desenho */
  function formaSVG(f, extra) {
    var com = ' data-reg="' + f.c + '"' + (extra || '');
    if (f.f === 'r') return '<rect x="' + f.x + '" y="' + f.y + '" width="' + f.w + '" height="' + f.h + '" rx="' + f.rr + '"' + com + '><title>' + E(f.t) + '</title></rect>';
    if (f.f === 'e') return '<ellipse cx="' + f.cx + '" cy="' + f.cy + '" rx="' + f.rx + '" ry="' + f.ry + '"' + com + '><title>' + E(f.t) + '</title></ellipse>';
    return '<path d="' + f.d + '"' + com + '><title>' + E(f.t) + '</title></path>';
  }

  /* Onde um ponto é desenhado na vista plana atual. O ponto marcado no pé em
     três dimensões não tem coordenada de desenho, então cai no centro da
     própria região, na vista a que aquela região pertence. */
  function noPlano(p) {
    if (p.pe !== P.pe) return null;
    if (p.vista === P.vista) return { x: p.x, y: p.y, vindo3d: false };
    if (p.vista !== '3d') return null;
    var L = localDaRegiao(p.regiao);
    if (!L || L.vista !== P.vista) return null;
    return { x: L.x, y: L.y, vindo3d: true };
  }
  function desenho() {
    var v = VISTAS[P.vista], m = mapaDe(P.pid, false);
    var pts = (m ? m.pontos : []).filter(function (x) { return !!noPlano(x); });
    var corpo = (v.regioes || []).map(function (f) { return formaSVG(f, ' class="bfp-reg"'); }).join('');
    /* O pé esquerdo é o direito espelhado. O espelho fica só no desenho: o
       ponto é gravado na coordenada do desenho, então volta no lugar certo. */
    var esp = P.pe === 'E' ? ' transform="translate(' + larguraVB(v) + ',0) scale(-1,1)"' : '';
    var pinos = pts.map(function (p) {
      var n = (m.pontos.indexOf(p) + 1), L = noPlano(p);
      return '<g class="bfp-pino' + (P.abrindo === p.id ? ' sel' : '') + (L.vindo3d ? ' de3d' : '') +
        '" data-pino="' + p.id + '">' +
        '<circle cx="' + L.x + '" cy="' + L.y + '" r="' + raioPino(v) + '"></circle>' +
        '<text x="' + L.x + '" y="' + (L.y + raioPino(v) * 0.36) + '" font-size="' + (raioPino(v) * 1.1) + '">' + n + '</text>' +
        '<title>' + E(textoPonto(p)) + (L.vindo3d ? ' (marcado no pé em três dimensões)' : '') + '</title></g>';
    }).join('');
    return '<svg id="bfp-svg" viewBox="' + v.vb + '" role="img" aria-label="' +
      E(LADO[P.pe] + ', ' + v.nome) + '"><g' + esp + '>' +
      '<path class="bfp-contorno" d="' + v.contorno + '"></path>' + corpo + '</g>' +
      '<g class="bfp-pinos"' + esp + '>' + pinos + '</g></svg>';
  }
  function larguraVB(v) { return Number(String(v.vb).split(' ')[2]) || 100; }
  function raioPino(v) { return Math.max(6, larguraVB(v) * 0.055); }

  /* ------------------------------------------------- onde foi o toque */
  function regiaoDoPonto(svg, x, y) {
    var pt = svg.createSVGPoint(); pt.x = x; pt.y = y;
    var alvos = svg.querySelectorAll('.bfp-reg');
    for (var i = alvos.length - 1; i >= 0; i--) {
      var el = alvos[i];
      try {
        /* isPointInFill trabalha na caixa do próprio desenho, que já é onde
           o ponto está, porque o espelho do pé esquerdo é aplicado no grupo. */
        if (el.isPointInFill && el.isPointInFill(pt)) return el.getAttribute('data-reg');
      } catch (e) { }
    }
    /* Fora de qualquer região: fica com a mais próxima, para o registro nunca
       sair sem nome de lugar. */
    var melhor = '', dist = Infinity;
    for (var j = 0; j < alvos.length; j++) {
      var b = alvos[j].getBBox(), cx = b.x + b.width / 2, cy = b.y + b.height / 2;
      var d = (cx - x) * (cx - x) + (cy - y) * (cy - y);
      if (d < dist) { dist = d; melhor = alvos[j].getAttribute('data-reg'); }
    }
    return melhor;
  }

  function pontoDoEvento(ev) {
    var svg = document.getElementById('bfp-svg'); if (!svg) return null;
    var ctm = svg.getScreenCTM(); if (!ctm) return null;
    var t = (ev.touches && ev.touches[0]) || (ev.changedTouches && ev.changedTouches[0]) || ev;
    var pt = svg.createSVGPoint(); pt.x = t.clientX; pt.y = t.clientY;
    var p = pt.matrixTransform(ctm.inverse());
    var v = VISTAS[P.vista];
    /* Desfaz o espelho do pé esquerdo para gravar na coordenada do desenho. */
    if (P.pe === 'E') p.x = larguraVB(v) - p.x;
    return { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 };
  }

  /* --------------------------------------------------- perguntar e salvar */
  window.bfPesClique = function (ev) {
    if (!P.pid) { toast('Escolha o paciente antes de marcar.'); return; }
    var alvo = ev.target && ev.target.closest ? ev.target.closest('.bfp-pino') : null;
    if (alvo) { window.bfPesAbrirPino(alvo.getAttribute('data-pino')); return; }
    var p = pontoDoEvento(ev); if (!p) return;
    var svg = document.getElementById('bfp-svg');
    perguntar(regiaoDoPonto(svg, p.x, p.y), p.x, p.y);
  };

  window.bfPesSalvarPonto = function (x, y, reg, z) {
    var m = mapaDe(P.pid, true);
    var tipo = (document.getElementById('bfp-tipo') || {}).value || '';
    var nota = (document.getElementById('bfp-nota') || {}).value || '';
    var ponto = {
      id: uid(), pe: P.pe, vista: P.vista, x: x, y: y, regiao: reg || '',
      tipo: str(tipo), nota: str(nota).slice(0, 400), em: todayISO(),
      prof: str(S.config.responsavel || nomeUsuario && nomeUsuario() || '')
    };
    if (z !== undefined && z !== null) ponto.z = z;
    m.pontos.push(ponto);
    m.em = todayISO();
    closeModal(); save(); render();
    toast('Ponto ' + m.pontos.length + ' salvo no mapa do paciente.');
  };
  /* A mesma pergunta serve ao desenho plano e ao pé em três dimensões. */
  function perguntar(reg, x, y, z) {
    var onde = (LADO[P.pe] || P.pe) + (VISTAS[P.vista] ? ', ' + VISTAS[P.vista].nome.toLowerCase() : '') +
      (reg ? ', ' + nomeRegiao(P.vista, reg) : '');
    openModal('<h3 style="margin-top:0">Salvar este ponto?</h3>' +
      '<p class="sub" style="margin:0 0 14px">Você tocou em <b>' + E(onde) + '</b>.<br>' +
      'Quer salvar este clique como local do seu tratamento?</p>' +
      '<div class="fgrid"><label>O que foi encontrado<select id="bfp-tipo">' +
      ACHADOS.map(function (a) { return '<option>' + E(a) + '</option>'; }).join('') + '</select></label>' +
      '<label class="full">Anotação<textarea id="bfp-nota" rows="2" placeholder="O que viu, o que fez, o que orientou"></textarea></label></div>' +
      '<div class="mact"><button class="btn ghost" onclick="closeModal()">Não</button>' +
      '<button class="btn" onclick="bfPesSalvarPonto(' + x + ',' + y + ',\'' + reg + '\'' +
      (z === undefined ? '' : ',' + z) + ')">Sim, salvar aqui</button></div>');
  }

  window.bfPesAbrirPino = function (id) {
    var m = mapaDe(P.pid, false); if (!m) return;
    var p = m.pontos.find(function (x) { return x.id === id; }); if (!p) return;
    openModal('<h3 style="margin-top:0">Ponto ' + (m.pontos.indexOf(p) + 1) + '</h3>' +
      '<p class="sub" style="margin:0 0 14px">' + E(LADO[p.pe]) +
      (VISTAS[p.vista] ? ', ' + E(VISTAS[p.vista].nome.toLowerCase()) : ', pé em três dimensões') +
      (p.regiao ? ', ' + E(nomeRegiao(p.vista, p.regiao)) : '') + ' · marcado em ' + E(br(p.em)) + '</p>' +
      '<div class="fgrid"><label>O que foi encontrado<select id="bfp-tipo">' +
      ACHADOS.map(function (a) { return '<option' + (a === p.tipo ? ' selected' : '') + '>' + E(a) + '</option>'; }).join('') +
      (ACHADOS.indexOf(p.tipo) < 0 && p.tipo ? '<option selected>' + E(p.tipo) + '</option>' : '') + '</select></label>' +
      '<label class="full">Anotação<textarea id="bfp-nota" rows="3">' + E(p.nota) + '</textarea></label></div>' +
      '<div class="mact"><button class="btn danger" style="margin-right:auto" onclick="bfPesApagarPonto(\'' + p.id + '\')">Apagar ponto</button>' +
      '<button class="btn ghost" onclick="closeModal()">Fechar</button>' +
      '<button class="btn" onclick="bfPesGravarPonto(\'' + p.id + '\')">Salvar</button></div>');
  };
  window.bfPesGravarPonto = function (id) {
    var m = mapaDe(P.pid, false); if (!m) return;
    var p = m.pontos.find(function (x) { return x.id === id; }); if (!p) return;
    p.tipo = str((document.getElementById('bfp-tipo') || {}).value || '');
    p.nota = str((document.getElementById('bfp-nota') || {}).value || '').slice(0, 400);
    m.em = todayISO(); closeModal(); save(); render(); toast('Ponto atualizado.');
  };
  window.bfPesApagarPonto = function (id) {
    var m = mapaDe(P.pid, false); if (!m) return;
    var i = m.pontos.findIndex(function (x) { return x.id === id; });
    if (i < 0) return;
    m.pontos.splice(i, 1); m.em = todayISO();
    closeModal(); save(); render(); toast('Ponto apagado.');
  };

  /* --------------------------------------------------------- comandos */
  window.bfPesGirar = function (passo) {
    if (P.vista === '3d') { if (window.bfPes3dGirar) window.bfPes3dGirar(passo); return; }
    var i = GIRO.indexOf(P.vista);
    if (i < 0) { P.vista = 'dorsal'; } else { P.vista = GIRO[(i + passo + GIRO.length) % GIRO.length]; }
    render();
  };
  window.bfPesPonta = function (qual) {
    P.vista = (P.vista === qual) ? 'dorsal' : qual; render();
  };
  window.bfPesVista = function (v) {
    if (v !== '3d' && !VISTAS[v]) return;
    if (P.vista === '3d' && v !== '3d' && window.bfPes3dDestruir) window.bfPes3dDestruir();
    P.vista = v; render();
  };
  window.bfPesPe = function (l) {
    P.pe = (l === 'E' ? 'E' : 'D');
    if (P.vista === '3d' && window.bfPes3dDestruir) window.bfPes3dDestruir();
    render();
  };
  window.bfPesPaciente = function (id) {
    P.pid = String(id || ''); P.abrindo = null;
    if (P.vista === '3d' && window.bfPes3dDestruir) window.bfPes3dDestruir();
    render();
  };
  window.bfPesIr = function (id) {
    var m = mapaDe(P.pid, false); if (!m) return;
    var p = m.pontos.find(function (x) { return x.id === id; }); if (!p) return;
    /* Ponto do modelo tridimensional num aparelho que não o suporta: abre na
       vista plana da região, que mostra a mesma coisa. */
    var destino = p.vista;
    if (destino === '3d' && !tem3d()) {
      var Lr = localDaRegiao(p.regiao);
      destino = Lr ? Lr.vista : 'dorsal';
    }
    if (P.vista === '3d' && destino !== '3d' && window.bfPes3dDestruir) window.bfPes3dDestruir();
    P.pe = p.pe; P.vista = destino; P.abrindo = p.id; render();
  };
  window.bfPesObs = function (v) {
    var m = mapaDe(P.pid, true); m.obs = String(v || '').slice(0, 1200); m.em = todayISO();
    clearTimeout(window.__bfPesT); window.__bfPesT = setTimeout(save, 700);
  };
  window.bfPesLimpar = function () {
    var m = mapaDe(P.pid, false); if (!m || !m.pontos.length) return;
    confirmModal('Apagar os <b>' + m.pontos.length + '</b> pontos marcados deste paciente? A anotação geral continua.',
      function () { m.pontos = []; m.em = todayISO(); save(); render(); toast('Mapa limpo.'); }, 'Apagar os pontos');
  };

  /* ---------------------------------------------- mandar para a evolução */
  window.bfPesParaEvolucao = function () {
    var m = mapaDe(P.pid, false), p = pacDe(P.pid);
    if (!m || !p || (!m.pontos.length && !str(m.obs))) { toast('Marque ao menos um ponto antes.'); return; }
    var texto = 'MAPA DOS PÉS\n' + m.pontos.map(function (x, i) { return (i + 1) + '. ' + textoPonto(x); }).join('\n') +
      (str(m.obs) ? '\n\nObservação: ' + str(m.obs) : '');
    confirmModal('Lançar o mapa de <b>' + E(p.nome) + '</b> na evolução clínica de hoje, com ' +
      m.pontos.length + ' ' + (m.pontos.length === 1 ? 'ponto' : 'pontos') + '?',
      function () {
        S.evolucoes.push({
          id: uid(), pacienteId: P.pid, data: todayISO(), texto: texto,
          profissional: str(S.config.responsavel || nomeUsuario()), origem: 'mapa-pes'
        });
        toast('Lançado na evolução clínica.');
      }, 'Lançar na evolução');
  };

  /* ------------------------------------------------------------- a tela */
  var tem3d = function () { return typeof window.bfPes3dCabe === 'function' && window.bfPes3dCabe(); };
  function barraVistas() {
    var botoes = GIRO.concat(PONTAS).map(function (k) {
      return '<button class="btn ' + (P.vista === k ? '' : 'ghost') + ' sm" onclick="bfPesVista(\'' + k + '\')">' +
        E(VISTAS[k].nome) + '</button>';
    }).join('');
    if (tem3d()) botoes += '<button class="btn ' + (P.vista === '3d' ? '' : 'ghost') +
      ' sm bfp-b3d" onclick="bfPesVista(\'3d\')">Pé em três dimensões</button>';
    return '<div class="bfp-vistas' + (tem3d() ? ' com3d' : '') + '">' + botoes + '</div>';
  }

  /* ------------------------------------------- o pé em três dimensões */
  /* Um ponto marcado no desenho plano não tem coordenada de profundidade.
     Para ele aparecer no modelo, cai no centro da própria região, que o
     gerador da malha calculou vértice a vértice. */
  function pontos3d() {
    var m = mapaDe(P.pid, false); if (!m) return [];
    var C = (typeof window.bfPes3dCentros === 'function') ? window.bfPes3dCentros() : {};
    var L = [];
    m.pontos.forEach(function (p) {
      if (p.pe !== P.pe) return;
      if (p.z !== undefined && p.z !== null) { L.push({ id: p.id, x: p.x, y: p.y, z: p.z, cor: P.abrindo === p.id ? 0xd93a3a : 0x5a4cfb }); return; }
      var c = C[p.regiao];
      if (c) L.push({ id: p.id, x: c[0], y: c[1], z: c[2], cor: P.abrindo === p.id ? 0xd93a3a : 0x7c71ff });
    });
    return L;
  }
  function montar3d() {
    var caixa = document.getElementById('bfp-3d'); if (!caixa) return;
    caixa.innerHTML = '<p class="bfp-carregando">Montando o pé...</p>';
    window.bfPes3dMontar(caixa, {
      pe: P.pe, pontos: pontos3d(),
      aoTocar: function (r) {
        if (r.pino) { window.bfPesAbrirPino(r.pino); return; }
        perguntar(r.regiao, r.x, r.y, r.z);
      }
    }).catch(function (e) {
      caixa.innerHTML = '<p class="bfp-carregando">Não foi possível abrir o pé em três dimensões neste computador. ' +
        'Use os desenhos acima, que registram a mesma coisa.</p>';
      console.error('BlackFlow 3D:', e);
    });
  }

  function listaPontos(m) {
    if (!m || !m.pontos.length) return '<p class="bfp-vazio">Nenhum ponto marcado ainda. Toque no desenho, em cima do lugar que você está tratando, e o sistema pergunta se quer guardar aquele ponto.</p>';
    return '<ol class="bfp-lista">' + m.pontos.map(function (p, i) {
      return '<li' + (P.abrindo === p.id ? ' class="sel"' : '') + '><div class="bfp-li-t">' +
        '<b>' + (i + 1) + '. ' + E(p.tipo || 'Ponto marcado') + '</b>' +
        '<span>' + E(LADO[p.pe]) +
        (VISTAS[p.vista] ? ', ' + E(VISTAS[p.vista].nome.toLowerCase()) : '') +
        (p.regiao ? ', ' + E(nomeRegiao(p.vista, p.regiao)) : '') +
        (p.vista === '3d' ? ' <i class="bfp-marca3d">marcado em três dimensões</i>' : '') + '</span>' +
        (p.nota ? '<small>' + E(p.nota) + '</small>' : '') +
        '<small class="bfp-data">' + E(br(p.em)) + (p.prof ? ' · ' + E(p.prof) : '') + '</small></div>' +
        '<div class="bfp-li-b"><button class="btn ghost sm" onclick="bfPesIr(\'' + p.id + '\')">ver no pé</button>' +
        '<button class="btn ghost sm" onclick="bfPesAbrirPino(\'' + p.id + '\')">editar</button></div></li>';
    }).join('') + '</ol>';
  }

  function tela() {
    var L = pacAtivos(), m = P.pid ? mapaDe(P.pid, false) : null, p = pacDe(P.pid);
    var ehTres = P.vista === '3d';
    var v = VISTAS[P.vista] || VISTAS.dorsal;
    return '<div class="page bfp-page"><div class="phead"><div>' +
      '<h1>Pés interativos</h1>' +
      '<p class="sub">Gire o pé, toque onde está tratando e guarde o ponto. O que você marcar aqui aparece na anamnese do paciente.</p>' +
      '</div></div>' +
      '<div class="card"><div class="fgrid"><label>Paciente<select onchange="bfPesPaciente(this.value)">' +
      '<option value="">Escolha o paciente</option>' +
      L.map(function (x) { return '<option value="' + E(x.id) + '"' + (x.id === P.pid ? ' selected' : '') + '>' + E(x.nome) + '</option>'; }).join('') +
      '</select></label>' +
      '</div>' +
      (p ? '<div class="bfp-ficha"><button class="btn ghost" onclick="go(\'paciente\',\'' + E(p.id) + '\')">Abrir a ficha de ' + E(firstName(p.nome)) + '</button></div>' : '') +
      '</div>' +
      (!P.pid ? '<div class="card mini-empty">Escolha o paciente para abrir o mapa dos pés dele.</div>' : (
        '<div class="bfp-grade">' +
        '<div class="card bfp-palco">' +
        '<div class="bfp-pes"><button class="btn ' + (P.pe === 'D' ? '' : 'ghost') + ' sm" onclick="bfPesPe(\'D\')">Pé direito</button>' +
        '<button class="btn ' + (P.pe === 'E' ? '' : 'ghost') + ' sm" onclick="bfPesPe(\'E\')">Pé esquerdo</button></div>' +
        barraVistas() +
        '<div class="bfp-palco-in">' +
        '<button class="bfp-girar esq" onclick="bfPesGirar(-1)" aria-label="Girar para a esquerda" title="Girar um quarto de volta para a esquerda">&#8249;</button>' +
        (ehTres
          ? '<div class="bfp-tela bfp-3d" id="bfp-3d"></div>'
          : '<div class="bfp-tela" onclick="bfPesClique(event)">' + desenho() + '</div>') +
        '<button class="bfp-girar dir" onclick="bfPesGirar(1)" aria-label="Girar para a direita" title="Girar um quarto de volta para a direita">&#8250;</button>' +
        '</div>' +
        (ehTres
          ? '<p class="bfp-legenda"><b>' + E(LADO[P.pe]) + ' · Pé em três dimensões</b><br>' +
            'Arraste com o mouse para girar em volta inteira, role para aproximar e toque no pé para marcar o ponto.</p>' +
            '<div class="bfp-pontas">' +
            '<button class="btn ghost sm" onclick="bfPes3dAngulo(\'dorsal\')">Ver por cima</button>' +
            '<button class="btn ghost sm" onclick="bfPes3dAngulo(\'plantar\')">Ver a sola</button>' +
            '<button class="btn ghost sm" onclick="bfPes3dAngulo(\'lateral\')">Ver de fora</button>' +
            '<button class="btn ghost sm" onclick="bfPes3dAngulo(\'medial\')">Ver de dentro</button></div>'
          : '<p class="bfp-legenda"><b>' + E(LADO[P.pe]) + ' · ' + E(v.nome) + '</b><br>' + E(v.ajuda) + '</p>' +
            '<div class="bfp-pontas"><button class="btn ghost sm" onclick="bfPesPonta(\'dedos\')">Virar para a ponta dos dedos</button>' +
            '<button class="btn ghost sm" onclick="bfPesPonta(\'calcanhar\')">Virar para o calcanhar</button></div>') +
        '</div>' +
        '<div class="card bfp-fichario">' +
        '<div class="bfp-cab"><b>Pontos marcados' + (m && m.pontos.length ? ' (' + m.pontos.length + ')' : '') + '</b>' +
        (m && m.pontos.length ? '<button class="lnk" onclick="bfPesLimpar()">apagar todos</button>' : '') + '</div>' +
        listaPontos(m) +
        '<label class="bfp-obs">Anotação geral deste paciente' +
        '<textarea rows="3" placeholder="O que vale para os dois pés, orientações, o que observar no retorno" ' +
        'oninput="bfPesObs(this.value)">' + E(m ? m.obs : '') + '</textarea></label>' +
        '<div class="bfp-acoes"><button class="btn ghost" onclick="bfPesParaEvolucao()">Lançar na evolução clínica</button>' +
        '<button class="btn" onclick="go(\'paciente\',\'' + E(P.pid) + '\')">Ver na anamnese</button></div>' +
        '</div></div>'));
  }

  /* --------------------------------------------------------- integração */
  var cabe = function () {
    return !soAgenda() && String((S && S.config && S.config.segmento) || 'podologia') === 'podologia';
  };
  var menuAntes = menuItens;
  menuItens = function () {
    var l = menuAntes();
    if (!Array.isArray(l) || UI.auth || !cabe()) return l;
    if (l.some(function (x) { return x[0] === TELA; })) return l;
    return menuOrdem(l.concat([[TELA, 'Pés interativos', 'user']]));
  };
  var renderAntes = render;
  render = function () {
    if (UI.view !== TELA) return renderAntes();
    if (NV.ativa && UI.auth) return renderAntes();
    if (!cabe()) { UI.view = 'agenda'; return renderAntes(); }
    document.getElementById('app').innerHTML = shell(tela());
    try { fonteAplicar(); } catch (e) { }
    if (P.vista === '3d' && P.pid) setTimeout(montar3d, 0);
  };

  /* ---------------------------------------------------------------- CSS */
  var CSS = '<style>' +
    '.bfp-grade{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;align-items:start}' +
    '.bfp-palco,.bfp-fichario{display:flex;flex-direction:column;gap:12px}' +
/* Grade, e nao flex, nos pares de botao: com grade as duas caixas saem com a
   mesma largura exata, sem a diferenca de um ou dois pixels que o flex deixa
   quando um rotulo e mais comprido que o outro. */
    '.bfp-pes,.bfp-pontas,.bfp-acoes{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}' +
    '.bfp-pes .btn,.bfp-pontas .btn,.bfp-acoes .btn{width:100%;min-width:0;justify-content:center;white-space:normal;text-align:center}' +
    '.bfp-vistas{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}' +
    '.bfp-vistas.com3d .bfp-b3d{grid-column:1/-1}' +
    '.bfp-3d{padding:0;overflow:hidden;cursor:grab;display:flex;align-items:center;justify-content:center;min-height:320px}' +
    '.bfp-carregando{margin:0;padding:24px;text-align:center;font-size:13px;color:var(--mut);line-height:1.6}' +
    '.bfp-vistas .btn{justify-content:center;white-space:normal;text-align:center;min-width:0}' +
    '.bfp-palco-in{display:flex;align-items:center;gap:6px;position:relative}' +
    '.bfp-ficha{margin-top:10px}.bfp-ficha .btn{width:100%;justify-content:center}' +
    '.bfp-tela{flex:1 1 auto;min-width:0;background:var(--bg2,#f7f7fb);border:1px solid var(--line,#e6e6ef);' +
    'border-radius:16px;padding:10px;touch-action:manipulation;cursor:crosshair}' +
    '.bfp-tela svg{width:100%;height:auto;max-height:50vh;display:block}' +
    '.bfp-girar{flex:0 0 44px;width:44px;height:64px;border:1px solid var(--line,#e6e6ef);background:#fff;' +
    'border-radius:14px;font-size:26px;line-height:1;color:var(--ink);cursor:pointer}' +
    '.bfp-girar:active{background:#eceaff}' +
    '.bfp-contorno{fill:#f2f2f7;stroke:#c3c3d2;stroke-width:1.6}' +
    '.bfp-reg{fill:#fff;stroke:#9a9aae;stroke-width:1;opacity:.95}' +
    '.bfp-reg:hover{fill:#e8e6ff}' +
    '.bfp-pinos circle{fill:#5a4cfb;stroke:#fff;stroke-width:1.6}' +
    '.bfp-pinos text{fill:#fff;font-weight:700;text-anchor:middle;pointer-events:none}' +
    '.bfp-pino.sel circle{fill:#d93a3a}' +
    '.bfp-legenda{margin:0;text-align:center;font-size:12.5px;color:var(--mut);line-height:1.5}' +
    '.bfp-cab{display:flex;justify-content:space-between;align-items:baseline;gap:10px}' +
    '.bfp-lista{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}' +
    '.bfp-lista li{border:1px solid var(--line,#e6e6ef);border-radius:12px;padding:10px 12px;' +
    'display:flex;gap:10px;justify-content:space-between;align-items:flex-start;flex-wrap:wrap}' +
    '.bfp-lista li.sel{border-color:#5a4cfb;box-shadow:inset 3px 0 0 #5a4cfb}' +
    '.bfp-li-t{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1 1 180px}' +
    '.bfp-li-t b{font-size:13.5px}.bfp-li-t span{font-size:12.5px;color:var(--mut)}' +
    '.bfp-marca3d{font-style:normal;font-size:11px;background:#eceaff;color:#4a3fd0;border-radius:999px;padding:1px 7px;white-space:nowrap}' +
    '.bfp-pino.de3d circle{stroke-dasharray:3 2}' +
    '.bfp-li-t small{font-size:12px}.bfp-data{color:var(--mut)}' +
    '.bfp-li-b{display:flex;gap:6px;flex-wrap:wrap}' +
    '.bfp-vazio{margin:0;font-size:13px;color:var(--mut);line-height:1.6}' +
    '.bfp-obs{display:flex;flex-direction:column;gap:4px;font-size:12.5px;font-weight:600;color:var(--mut)}' +
    '.bfp-obs textarea{width:100%;font:inherit;font-weight:400;color:var(--ink);border:1px solid var(--line,#e6e6ef);' +
    'border-radius:10px;padding:10px;background:#fff}' +

    '@media(max-width:900px){.bfp-grade{grid-template-columns:1fr}}' +
/* No celular o desenho ocupa a largura inteira e as setas vão para baixo dele.
   Flutuando por cima, elas cobriam justamente o 1º e o 5º dedo na vista de
   frente, que é onde a profissional mais precisa tocar. */
    '@media(max-width:760px){.bfp-vistas{grid-template-columns:repeat(2,minmax(0,1fr))}' +
    '.bfp-tela svg{max-height:none}' +
    '.bfp-palco-in{display:grid;grid-template-columns:1fr 1fr;gap:8px;' +
    'grid-template-areas:"tela tela" "esq dir"}' +
    '.bfp-palco-in>.bfp-tela{grid-area:tela;width:100%}' +
    '.bfp-girar{position:static;transform:none;width:100%;height:52px;flex:none}' +
    '.bfp-girar.esq{grid-area:esq}.bfp-girar.dir{grid-area:dir}' +
    '.bfp-obs textarea{font-size:16px;min-height:92px;padding:11px 12px}' +
    '.bfp-acoes,.bfp-pontas{grid-template-columns:1fr}}' +
    '</style>';
  document.head.insertAdjacentHTML('beforeend', CSS);
})();
