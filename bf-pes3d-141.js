/* BlackFlow 1.41.0 — pé em três dimensões, só no computador.

   Por que existe
   --------------
   As seis vistas planas registram tudo o que o prontuário precisa. Este
   módulo é para quem está olhando de perto: gira o pé com o mouse, em volta
   inteira, e marca o ponto exato onde está tratando.

   De onde vem o pé
   ----------------
   A malha é gerada aqui, por código, a partir de seções transversais ao longo
   do pé, como fatias. Não é modelo comprado nem baixado: é nosso, sem licença
   de terceiro e sem arquivo pesado para carregar.

   Isso traz a vantagem que decide tudo: na hora de gerar, cada vértice recebe
   o nome da região anatômica. Então o clique na malha devolve "calcâneo" ou
   "cabeça do 1º metatarso" com a mesma palavra da vista plana, em vez de uma
   coordenada solta que alguém teria de interpretar depois.

   O que ele não é
   ---------------
   Não é anatomia de atlas. É um pé reconhecível, com as regiões nos lugares
   certos, feito para marcar. Quem identifica e interpreta o achado continua
   sendo a profissional.

   Onde roda
   ---------
   Só com tela de 1024 pixels para cima, ponteiro fino, que é mouse ou caneta,
   e WebGL disponível. Faltando qualquer um dos três, o sistema fica no
   desenho plano, que funciona em tudo. */
(function () {
  'use strict';
  if (window.__bfPes3d141) return;
  window.__bfPes3d141 = true;

  var THREE = null, carregando = null;
  var cena, rend, cam, grupo, malha, luzes, animando = false, alvo = null;
  var pinos = [], raios = null, aoTocar = null, destruidor = null;

  /* ------------------------------------------------------------ cabimento */
  window.bfPes3dCabe = function () {
    try {
      if (!window.matchMedia) return false;
      if (!matchMedia('(min-width:1024px)').matches) return false;
      if (!matchMedia('(pointer:fine)').matches) return false;
      var c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch (e) { return false; }
  };

  function carregarThree() {
    if (THREE) return Promise.resolve(THREE);
    if (carregando) return carregando;
    carregando = import('./vendor/three.module.min.js')
      .then(function (m) { THREE = m; return m; })
      .catch(function (e) { carregando = null; throw e; });
    return carregando;
  }

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
  var N = 32;                       /* pontos de cada seção */
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
    SECOES.forEach(function (s) {
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
    var s0 = SECOES[0], sF = SECOES[SECOES.length - 1];
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
    var topo = TORNOZELO[TORNOZELO.length - 1];
    var cTopo = põe(0, topo.y + 2, topo.z, 'torn');
    for (var tc = 0; tc < N; tc++) idx.push(cTopo, anéisT[anéisT.length - 1][tc], anéisT[anéisT.length - 1][(tc + 1) % N]);
    /* dedos */
    var M = 10, AN = 16;
    DEDOS.forEach(function (d) {
      var base = SECOES[SECOES.length - 1];
      var y0 = base.h * 0.52 + (base.base || 0);
      var anéisD = [];
      /* Os anéis vão até nove décimos do dedo e a ponta fecha num ponto só,
         com o raio caindo em cosseno: fica meia esfera, não bico de lápis. */
      for (var m = 0; m < M; m++) {
        var f = m / M;
        var r = d.r0 + (d.r1 - d.r0) * f;
        if (f > 0.70) r *= Math.cos(((f - 0.70) / 0.30) * (Math.PI / 2));
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

    var centros = {};
    Object.keys(somaReg).forEach(function (r) {
      centros[r] = [somaReg[r][0] / contaReg[r], somaReg[r][1] / contaReg[r], somaReg[r][2] / contaReg[r]];
    });
    return { pos: pos, idx: idx, reg: reg, centros: centros };
  }
  var MALHA = null;
  function malhaDados() { if (!MALHA) MALHA = gerarMalha(); return MALHA; }
  window.bfPes3dCentros = function () { return malhaDados().centros; };

  /* ------------------------------------------------------------- cena */
  var EST = { az: 0.85, el: 0.48, dist: 420, arrasto: false, moveu: 0, lx: 0, ly: 0, espelho: false };

  var ANGULOS = {
    dorsal: { az: 0, el: 1.42 }, plantar: { az: 0, el: -1.42 },
    lateral: { az: 1.57, el: 0.12 }, medial: { az: -1.57, el: 0.12 },
    dedos: { az: 0, el: 0.06 }, calcanhar: { az: 3.14, el: 0.18 }
  };
  window.bfPes3dGirar = function (passo) {
    EST.az += passo * (Math.PI / 2);
    posicionarCamera();
  };
  window.bfPes3dAngulo = function (nome) {
    var a = ANGULOS[nome]; if (!a) return;
    EST.az = a.az; EST.el = a.el; EST.dist = DIST_BASE;
    posicionarCamera();
  };
  window.bfPes3dReenquadrar = function () { EST.dist = DIST_BASE; posicionarCamera(); };

  /* O enquadramento sai da esfera que contém a malha inteira, e não de um
     número escolhido no olho: assim o pé cabe na tela em qualquer ângulo, de
     cima, de lado ou de trás, sem cortar os dedos. */
  var ALVO = { x: 0, y: 40, z: 95 }, DIST_BASE = 420;
  function enquadrar(geo) {
    geo.computeBoundingSphere();
    var b = geo.boundingSphere;
    if (!b) return;
    ALVO = { x: b.center.x, y: b.center.y, z: b.center.z };
    var meio = (cam.fov * Math.PI / 180) / 2;
    DIST_BASE = (b.radius / Math.sin(meio)) * 1.08;
    EST.dist = DIST_BASE;
  }
  function posicionarCamera() {
    if (!cam) return;
    var ce = Math.cos(EST.el), se = Math.sin(EST.el);
    cam.position.set(
      ALVO.x + Math.sin(EST.az) * ce * EST.dist,
      ALVO.y + se * EST.dist,
      ALVO.z + Math.cos(EST.az) * ce * EST.dist
    );
    cam.up.set(0, 1, 0);
    if (Math.abs(EST.el) > 1.40) cam.up.set(0, 0, EST.el > 0 ? -1 : 1);
    cam.lookAt(ALVO.x, ALVO.y, ALVO.z);
  }

  function pinoMesh(cor) {
    var g = new THREE.SphereGeometry(7, 16, 12);
    var m = new THREE.MeshStandardMaterial({ color: cor, roughness: .45, metalness: 0 });
    return new THREE.Mesh(g, m);
  }

  function desenharPinos(lista) {
    if (!grupo) return;
    pinos.forEach(function (p) { grupo.remove(p); p.geometry.dispose(); p.material.dispose(); });
    pinos = [];
    (lista || []).forEach(function (p) {
      var m = pinoMesh(p.cor || 0x5a4cfb);
      m.position.set(p.x, p.y, p.z);
      m.userData.id = p.id;
      grupo.add(m); pinos.push(m);
    });
  }
  window.bfPes3dPinos = desenharPinos;

  function quadro() {
    if (!animando || !rend) return;
    rend.render(cena, cam);
    requestAnimationFrame(quadro);
  }

  window.bfPes3dMontar = function (caixa, opts) {
    opts = opts || {};
    aoTocar = opts.aoTocar || null;
    return carregarThree().then(function () {
      window.bfPes3dDestruir();
      var L = caixa.clientWidth || 600, A = Math.max(320, Math.round(L * 0.78));
      cena = new THREE.Scene();
      cam = new THREE.PerspectiveCamera(32, L / A, 1, 3000);
      rend = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      rend.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      rend.setSize(L, A);
      rend.domElement.style.width = '100%';
      rend.domElement.style.height = 'auto';
      rend.domElement.style.display = 'block';
      rend.domElement.style.touchAction = 'none';
      rend.domElement.style.cursor = 'grab';
      caixa.innerHTML = '';
      caixa.appendChild(rend.domElement);

      grupo = new THREE.Group();
      /* O pé esquerdo é o direito espelhado no eixo de dentro para fora. */
      grupo.scale.x = opts.pe === 'E' ? -1 : 1;
      cena.add(grupo);

      var d = malhaDados();
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(d.pos, 3));
      geo.setIndex(d.idx);
      geo.computeVertexNormals();
      malha = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
        color: 0xf2d9c4, roughness: 0.82, metalness: 0.0, flatShading: false, side: THREE.DoubleSide
      }));
      malha.userData.reg = d.reg;
      grupo.add(malha);
      enquadrar(geo);

      cena.add(new THREE.HemisphereLight(0xffffff, 0x9aa0b4, 1.05));
      var dl = new THREE.DirectionalLight(0xffffff, 1.15); dl.position.set(-160, 260, 220); cena.add(dl);
      var dl2 = new THREE.DirectionalLight(0xffffff, 0.45); dl2.position.set(200, 60, -180); cena.add(dl2);

      raios = new THREE.Raycaster();
      posicionarCamera();
      animando = true; quadro();
      desenharPinos(opts.pontos || []);
      ligarMouse(caixa, rend.domElement);
      destruidor = function () { desligarMouse(rend.domElement); };
      return true;
    });
  };

  window.bfPes3dDestruir = function () {
    animando = false;
    if (destruidor) { try { destruidor(); } catch (e) { } destruidor = null; }
    if (rend) { try { rend.dispose(); } catch (e) { } }
    if (malha) { malha.geometry.dispose(); malha.material.dispose(); }
    pinos.forEach(function (p) { p.geometry.dispose(); p.material.dispose(); });
    pinos = []; cena = null; rend = null; cam = null; grupo = null; malha = null;
  };

  /* ------------------------------------------------------- mouse e toque */
  var fns = {};
  function ligarMouse(caixa, el) {
    fns.down = function (e) {
      EST.arrasto = true; EST.moveu = 0; EST.lx = e.clientX; EST.ly = e.clientY;
      el.style.cursor = 'grabbing';
      el.setPointerCapture && e.pointerId != null && el.setPointerCapture(e.pointerId);
    };
    fns.move = function (e) {
      if (!EST.arrasto) return;
      var dx = e.clientX - EST.lx, dy = e.clientY - EST.ly;
      EST.lx = e.clientX; EST.ly = e.clientY;
      EST.moveu += Math.abs(dx) + Math.abs(dy);
      EST.az -= dx * 0.009;
      EST.el = Math.max(-1.45, Math.min(1.45, EST.el + dy * 0.008));
      posicionarCamera();
    };
    fns.up = function (e) {
      var arrastou = EST.moveu > 6;
      EST.arrasto = false; el.style.cursor = 'grab';
      if (arrastou) return;
      tocar(e, el);
    };
    fns.wheel = function (e) {
      e.preventDefault();
      var passo = DIST_BASE * 0.07;
      EST.dist = Math.max(DIST_BASE * 0.45, Math.min(DIST_BASE * 2.2, EST.dist + (e.deltaY > 0 ? passo : -passo)));
      posicionarCamera();
    };
    el.addEventListener('pointerdown', fns.down);
    el.addEventListener('pointermove', fns.move);
    el.addEventListener('pointerup', fns.up);
    el.addEventListener('pointerleave', function () { EST.arrasto = false; });
    el.addEventListener('wheel', fns.wheel, { passive: false });
  }
  function desligarMouse(el) {
    if (!el) return;
    el.removeEventListener('pointerdown', fns.down);
    el.removeEventListener('pointermove', fns.move);
    el.removeEventListener('pointerup', fns.up);
    el.removeEventListener('wheel', fns.wheel);
  }

  function tocar(e, el) {
    if (!raios || !malha || !aoTocar) return;
    var r = el.getBoundingClientRect();
    var p = new THREE.Vector2(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      -((e.clientY - r.top) / r.height) * 2 + 1
    );
    raios.setFromCamera(p, cam);
    /* Primeiro os pinos: tocar num ponto já marcado abre aquele ponto. */
    var nosPinos = raios.intersectObjects(pinos, false);
    if (nosPinos.length) { aoTocar({ pino: nosPinos[0].object.userData.id }); return; }
    var hits = raios.intersectObject(malha, false);
    if (!hits.length) return;
    var h = hits[0];
    var regs = malha.userData.reg || [];
    var reg = regs[h.face.a] || regs[h.face.b] || regs[h.face.c] || '';
    /* A posição volta na coordenada da malha, sem o espelho do pé esquerdo,
       para o ponto do pé esquerdo não virar ponto do direito ao ser redesenhado. */
    var local = grupo.worldToLocal(h.point.clone());
    aoTocar({ regiao: reg, x: Math.round(local.x * 10) / 10, y: Math.round(local.y * 10) / 10, z: Math.round(local.z * 10) / 10 });
  }

  window.bfPes3dRedimensionar = function (caixa) {
    if (!rend || !cam || !caixa) return;
    var L = caixa.clientWidth || 600, A = Math.max(320, Math.round(L * 0.78));
    cam.aspect = L / A; cam.updateProjectionMatrix(); rend.setSize(L, A);
  };
})();
