/* BlackFlow: a malha do pé, em um arquivo só.

   Este arquivo não depende do sistema nem do three.js. Ele devolve números:
   posições, triângulos e o nome da região anatômica de cada vértice.

   Está separado de propósito. Quem usa:
   1. o módulo do pé em três dimensões, no navegador da profissional;
   2. o script que gera as imagens das vistas planas, aqui no computador de
      quem programa.

   Assim as duas coisas saem da mesma anatomia. Se a malha mudar, as imagens
   são geradas de novo e tudo continua casando. */
(function (raiz) {
  'use strict';
  /* ---------------------------------------------------------- a malha */
  /* Eixos: x de dentro para fora, negativo do lado do hálux; y para cima; z do
     calcanhar para os dedos. Medidas em milímetros de um pé adulto médio. */
  /* Fatias do pé, do calcanhar para os dedos. As três primeiras fecham o
     calcanhar em abóbada, em vez de terminar em bico, e a altura cai depressa
     do meio para a frente, porque o antepé é chato e largo. */
  var SECOES = [
    { z: -16, w: 14, h: 28, arco: 0, base: 16 },
    { z: -9, w: 24, h: 42, arco: 0, base: 7 },
    { z: 0, w: 30, h: 52, arco: 0, base: 2 },
    { z: 14, w: 34, h: 55, arco: 0, base: 0 },
    { z: 34, w: 35, h: 54, arco: 1, base: 0 },
    { z: 56, w: 34, h: 48, arco: 5, base: 0 },
    { z: 80, w: 34, h: 42, arco: 11, base: 0 },
    { z: 104, w: 37, h: 36, arco: 12, base: 0 },
    { z: 128, w: 41, h: 31, arco: 8, base: 0 },
    { z: 152, w: 45, h: 27, arco: 3, base: 0 },
    { z: 174, w: 48, h: 24, arco: 0, base: 0 },
    { z: 190, w: 48, h: 22, arco: 0, base: 0 },
    { z: 200, w: 46, h: 20, arco: 0, base: 2 }
  ];
  /* Coluna do tornozelo, subindo de dentro do pé. Sem ela o desenho vira um
     tronco deitado: é o tornozelo que faz o olho reconhecer um pé. */
  var TORNOZELO = [
    { y: 36, z: 38, rx: 28, rz: 30 },
    { y: 54, z: 40, rx: 26, rz: 26 },
    { y: 72, z: 42, rx: 23, rz: 22 },
    { y: 90, z: 43, rx: 21, rz: 20 },
    { y: 104, z: 44, rx: 20, rz: 19 }
  ];
  var N = 52;                       /* pontos de cada seção */
  /* Entre duas fatias desenhadas à mão entram outras calculadas, para a
     silhueta sair lisa em vez de facetada. */
  function adensar(L, vezes) {
    var out = [];
    for (var i = 0; i < L.length - 1; i++) {
      var a = L[i], b = L[i + 1];
      for (var k = 0; k < vezes; k++) {
        var t = k / vezes, u = t * t * (3 - 2 * t);
        out.push({ z: a.z + (b.z - a.z) * t, w: a.w + (b.w - a.w) * u,
                   h: a.h + (b.h - a.h) * u, arco: a.arco + (b.arco - a.arco) * u,
                   base: (a.base || 0) + ((b.base || 0) - (a.base || 0)) * u });
      }
    }
    out.push(L[L.length - 1]);
    return out;
  }
  var DEDOS = [
    { nome: 1, x: -31, r0: 13.0, r1: 11.0, comp: 40, abre: -0.04, sobe: 0.00 },
    { nome: 2, x: -12, r0: 9.6, r1: 8.0, comp: 37, abre: 0.00, sobe: 0.01 },
    { nome: 3, x: 4, r0: 9.0, r1: 7.4, comp: 34, abre: 0.05, sobe: 0.01 },
    { nome: 4, x: 18, r0: 8.0, r1: 6.6, comp: 29, abre: 0.10, sobe: 0.02 },
    { nome: 5, x: 30, r0: 7.0, r1: 5.8, comp: 23, abre: 0.17, sobe: 0.03 }
  ];

  /* Contorno de uma seção: sola achatada embaixo, laterais arredondadas,
     dorso abaulado. O arco levanta a sola do lado de dentro. */
  function contornoSecao(s) {
    var pts = [], base = s.base || 0;
    for (var i = 0; i < N; i++) {
      var t = (i / N) * Math.PI * 2;
      var ct = Math.cos(t), st = Math.sin(t);
      var x = s.w * Math.sign(ct) * Math.pow(Math.abs(ct), 0.82);
      var y;
      if (st >= 0) y = s.h * 0.50 + (s.h * 0.50) * Math.pow(st, 1.05);
      else y = s.h * 0.50 - (s.h * 0.50) * Math.pow(-st, 1.9);
      y += base;
      /* O arco levanta a sola do lado de dentro, que é o x negativo. */
      if (st < -0.2 && x < 0) y += s.arco * (-x / s.w) * Math.min(1, (-st - 0.2) / 0.6);
      pts.push([x, y]);
    }
    return pts;
  }

  /* Nome da região de um ponto do corpo do pé. */
  function regiaoCorpo(x, y, z, s) {
    var baixo = y < s.h * 0.26, alto = y > s.h * 0.70;
    var fora = x > s.w * 0.55, dentro = x < -s.w * 0.55;
    if (baixo) {
      if (z < 58) return 'calc';
      if (z < 130) return dentro ? 'bm' : (fora ? 'bl' : 'arco');
      return 'meta';
    }
    if (alto) {
      if (z < 62) return 'torn';
      if (z < 145) return 'dmed';
      return 'dant';
    }
    if (z > 20 && z < 62 && y > s.h * 0.48) return dentro ? 'mmal' : (fora ? 'lmal' : 'torn');
    if (dentro) return z < 62 ? 'mcal' : (z < 145 ? 'marc' : 'mant');
    if (fora) return z < 62 ? 'lcal' : (z < 145 ? 'lmed' : 'lant');
    return z < 62 ? 'torn' : (z < 145 ? 'dmed' : 'dant');
  }
  /* Nome da região de um ponto de um dedo: unha e dorso em cima, polpa
     embaixo, ponta na frente. */
  function regiaoDedo(n, frac, ang) {
    if (frac > 0.86) return 'f' + n;
    var cima = Math.sin(ang) > 0.25;
    if (cima) return frac > 0.5 ? 'u' + n : 'd' + n;
    if (Math.sin(ang) < -0.25) return 'p' + n;
    return frac > 0.5 ? 'd' + n : 'd' + n;
  }

  function gerarMalha() {
    var pos = [], idx = [], reg = [], somaReg = {}, contaReg = {};
    function põe(x, y, z, r) {
      pos.push(x, y, z); reg.push(r);
      if (!somaReg[r]) { somaReg[r] = [0, 0, 0]; contaReg[r] = 0; }
      somaReg[r][0] += x; somaReg[r][1] += y; somaReg[r][2] += z; contaReg[r]++;
      return pos.length / 3 - 1;
    }
    /* corpo */
    var anéis = [];
    adensar(SECOES, 4).forEach(function (s) {
      var c = contornoSecao(s), anel = [];
      c.forEach(function (p) { anel.push(põe(p[0], p[1], s.z, regiaoCorpo(p[0], p[1], s.z, s))); });
      anéis.push(anel);
    });
    for (var a = 0; a < anéis.length - 1; a++) {
      for (var i = 0; i < N; i++) {
        var j = (i + 1) % N;
        idx.push(anéis[a][i], anéis[a + 1][i], anéis[a + 1][j]);
        idx.push(anéis[a][i], anéis[a + 1][j], anéis[a][j]);
      }
    }
    /* tampas das duas pontas */
    var FINAS = adensar(SECOES, 4);
    var s0 = FINAS[0], sF = FINAS[FINAS.length - 1];
    var cTras = põe(0, s0.h * 0.5 + (s0.base || 0), s0.z - 3, 'calc');
    var cFren = põe(0, sF.h * 0.5 + (sF.base || 0), sF.z + 3, 'meta');
    for (var k = 0; k < N; k++) {
      var k2 = (k + 1) % N;
      idx.push(cTras, anéis[0][k2], anéis[0][k]);
      idx.push(cFren, anéis[anéis.length - 1][k], anéis[anéis.length - 1][k2]);
    }
    /* coluna do tornozelo */
    var anéisT = [];
    TORNOZELO.forEach(function (t, ti) {
      var anel = [];
      for (var i3 = 0; i3 < N; i3++) {
        var a3 = (i3 / N) * Math.PI * 2;
        var px = t.rx * Math.cos(a3), pz = t.z + t.rz * Math.sin(a3);
        var r3 = ti === 0 ? 'torn' : (t.y < 70 ? (px < -t.rx * 0.5 ? 'mmal' : (px > t.rx * 0.5 ? 'lmal' : 'torn')) : 'torn');
        anel.push(põe(px, t.y, pz, r3));
      }
      anéisT.push(anel);
    });
    for (var tt = 0; tt < anéisT.length - 1; tt++) {
      for (var ii = 0; ii < N; ii++) {
        var jj = (ii + 1) % N;
        idx.push(anéisT[tt][ii], anéisT[tt + 1][ii], anéisT[tt + 1][jj]);
        idx.push(anéisT[tt][ii], anéisT[tt + 1][jj], anéisT[tt][jj]);
      }
    }
    /* O alto da perna fecha em abóbada, e não num disco: visto de cima, disco
       vira uma tampa de panela no meio do pé. */
    var topo = TORNOZELO[TORNOZELO.length - 1];
    var anterior = anéisT[anéisT.length - 1];
    [[0.78, 7], [0.46, 12], [0.20, 15]].forEach(function (passo) {
      var anel = [];
      for (var i4 = 0; i4 < N; i4++) {
        var a4 = (i4 / N) * Math.PI * 2;
        anel.push(põe(topo.rx * passo[0] * Math.cos(a4), topo.y + passo[1],
                      topo.z + topo.rz * passo[0] * Math.sin(a4), 'torn'));
      }
      for (var i5 = 0; i5 < N; i5++) {
        var j5 = (i5 + 1) % N;
        idx.push(anterior[i5], anel[i5], anel[j5]);
        idx.push(anterior[i5], anel[j5], anterior[j5]);
      }
      anterior = anel;
    });
    var cTopo = põe(0, topo.y + 17, topo.z, 'torn');
    for (var tc = 0; tc < N; tc++) idx.push(cTopo, anterior[tc], anterior[(tc + 1) % N]);
    /* dedos */
    var M = 14, AN = 24;
    DEDOS.forEach(function (d) {
      var base = FINAS[FINAS.length - 1];
      var y0 = base.h * 0.52 + (base.base || 0);
      var anéisD = [];
      /* Os anéis vão até nove décimos do dedo e a ponta fecha num ponto só,
         com o raio caindo em cosseno: fica meia esfera, não bico de lápis. */
      for (var m = 0; m < M; m++) {
        var f = m / M;
        var r = d.r0 + (d.r1 - d.r0) * f;
        if (f > 0.84) r *= Math.cos(((f - 0.84) / 0.16) * (Math.PI / 2) * 0.86);
        var cz = base.z - 8 + d.comp * f;
        var cx = d.x + d.abre * d.comp * f;
        var cy = y0 + d.sobe * d.comp * f;
        var anel = [];
        for (var i2 = 0; i2 < AN; i2++) {
          var t = (i2 / AN) * Math.PI * 2;
          var px = cx + r * Math.cos(t), py = cy + r * Math.sin(t) * 0.92;
          anel.push(põe(px, py, cz, regiaoDedo(d.nome, f, t)));
        }
        anéisD.push(anel);
      }
      for (var q = 0; q < anéisD.length - 1; q++) {
        for (var w = 0; w < AN; w++) {
          var w2 = (w + 1) % AN;
          idx.push(anéisD[q][w], anéisD[q + 1][w], anéisD[q + 1][w2]);
          idx.push(anéisD[q][w], anéisD[q + 1][w2], anéisD[q][w2]);
        }
      }
      var ult = anéisD[anéisD.length - 1];
      var pontaC = põe(d.x + d.abre * d.comp, y0 + d.sobe * d.comp, base.z - 8 + d.comp, 'f' + d.nome);
      for (var u = 0; u < AN; u++) idx.push(pontaC, ult[u], ult[(u + 1) % AN]);
    });

    /* As unhas são geometria à parte, com material próprio: é a unha que o
       olho procura primeiro num pé, e sem ela o desenho fica de manequim. */
    var unhas = { pos: [], idx: [], reg: [] };
    function põeU(x, y, z, r) { unhas.pos.push(x, y, z); unhas.reg.push(r); return unhas.pos.length / 3 - 1; }
    DEDOS.forEach(function (d) {
      var base = FINAS[FINAS.length - 1];
      var y0 = base.h * 0.52 + (base.base || 0);
      var fIni = 0.44, fFim = 0.78;
      var largura = d.r0 * 0.58, AU = 20, MU = 8;
      var linhas = [];
      for (var m = 0; m <= MU; m++) {
        var f = fIni + (fFim - fIni) * (m / MU);
        var cz = base.z - 8 + d.comp * f;
        var cx = d.x + d.abre * d.comp * f;
        var cy = y0 + d.sobe * d.comp * f;
        var rr = d.r0 + (d.r1 - d.r0) * f;
        var estreita = Math.sin(Math.PI * (m / MU)) * 0.25 + 0.80;
        var lin = [];
        for (var i = 0; i <= AU; i++) {
          var t = (i / AU - 0.5) * Math.PI * 0.62;
          var px = cx + Math.sin(t) * largura * estreita;
          var py = cy + Math.cos(t) * (rr + 0.12);
          lin.push(põeU(px, py, cz, 'u' + d.nome));
        }
        linhas.push(lin);
      }
      for (var q = 0; q < linhas.length - 1; q++) {
        for (var w = 0; w < AU; w++) {
          unhas.idx.push(linhas[q][w], linhas[q + 1][w], linhas[q + 1][w + 1]);
          unhas.idx.push(linhas[q][w], linhas[q + 1][w + 1], linhas[q][w + 1]);
        }
      }
    });

    var centros = {};
    Object.keys(somaReg).forEach(function (r) {
      centros[r] = [somaReg[r][0] / contaReg[r], somaReg[r][1] / contaReg[r], somaReg[r][2] / contaReg[r]];
    });
    return { pos: pos, idx: idx, reg: reg, centros: centros, unhas: unhas };
  }
  var MALHA = null;
  function malhaDados() { if (!MALHA) MALHA = gerarMalha(); return MALHA; }

  raiz.bfPeMalha = malhaDados;
  raiz.bfPeCentros = function () { return malhaDados().centros; };
})(typeof window !== 'undefined' ? window : globalThis);
