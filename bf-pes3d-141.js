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
  var cena, rend, cam, grupo, malha, unhasMesh, luzes, animando = false, alvo = null;
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

  /* A malha vem de bf-pe-malha.js, que não depende de nada e também é usada
     pelo gerador das imagens das vistas planas. */
  function malhaDados() { return window.bfPeMalha(); }

  window.bfPes3dCentros = function () { return malhaDados().centros; };

  /* ------------------------------------------------------------- cena */
  var EST = { az: 0.85, el: 0.48, dist: 420, arrasto: false, moveu: 0, lx: 0, ly: 0, espelho: false };

  var ANGULOS = {
    dorsal: { az: 0, el: 1.42 }, plantar: { az: 0, el: -1.42 },
    lateral: { az: 1.57, el: 0.12 }, medial: { az: -1.57, el: 0.12 },
    dedos: { az: 0, el: 0.06 }, calcanhar: { az: 3.14, el: 0.18 }
  };
  /* Mover o pé na tela, além de girar, como pede quem está olhando de perto. */
  var MODO = 'girar', PAN = { x: 0, y: 0 };
  window.bfPes3dModo = function (m) { MODO = (m === 'mover') ? 'mover' : 'girar'; };
  window.bfPes3dGrade = function () {
    if (!malha) return;
    malha.material.wireframe = !malha.material.wireframe;
  };
  window.bfPes3dGirar = function (passo) {
    EST.az += passo * (Math.PI / 2);
    posicionarCamera();
  };
  window.bfPes3dAngulo = function (nome) {
    var a = ANGULOS[nome]; if (!a) return;
    EST.az = a.az; EST.el = a.el; EST.dist = DIST_BASE; PAN.x = 0; PAN.y = 0;
    posicionarCamera();
  };
  window.bfPes3dReenquadrar = function () { EST.dist = DIST_BASE; PAN.x = 0; PAN.y = 0; posicionarCamera(); };

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
    var ax = ALVO.x + PAN.x, ay = ALVO.y + PAN.y;
    cam.position.set(
      ax + Math.sin(EST.az) * ce * EST.dist,
      ay + se * EST.dist,
      ALVO.z + Math.cos(EST.az) * ce * EST.dist
    );
    cam.up.set(0, 1, 0);
    if (Math.abs(EST.el) > 1.40) cam.up.set(0, 0, EST.el > 0 ? -1 : 1);
    cam.lookAt(ax, ay, ALVO.z);
  }

  /* -------------------------------------------------------- texturas */
  /* A pele é desenhada aqui, num quadro de 512 por 512: tom de base, variação
     em manchas e um granulado fino. Não é foto de ninguém, não pesa no
     carregamento e não tem licença de terceiro. */
  var TEX = {};
  /* chapa, e não quadro: já existe um quadro() que é o laço de desenho da
     cena, e dois nomes iguais fizeram a textura chamar o laço por engano. */
  function chapa(n) {
    var c = document.createElement('canvas'); c.width = n; c.height = n;
    return { c: c, g: c.getContext('2d') };
  }
  function texturaPele() {
    if (TEX.pele) return TEX.pele;
    var q = chapa(512), g = q.g;
    g.fillStyle = '#edc8ac'; g.fillRect(0, 0, 512, 512);
    var i, x, y, r;
    for (i = 0; i < 420; i++) {
      x = Math.random() * 512; y = Math.random() * 512; r = 30 + Math.random() * 90;
      var gr = g.createRadialGradient(x, y, 0, x, y, r);
      var q1 = Math.random();
      gr.addColorStop(0, q1 > 0.5 ? 'rgba(248,219,200,0.16)' : 'rgba(214,166,140,0.12)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill();
    }
    var img = g.getImageData(0, 0, 512, 512), dd = img.data;
    for (i = 0; i < dd.length; i += 4) {
      var n = (Math.random() - 0.5) * 9;
      dd[i] += n; dd[i + 1] += n * 0.9; dd[i + 2] += n * 0.8;
    }
    g.putImageData(img, 0, 0);
    var t = new THREE.CanvasTexture(q.c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6);
    TEX.pele = t; return t;
  }
  /* Relevo: linhas finas cruzadas, que é o desenho da pele vista de perto. */
  function texturaRelevo() {
    if (TEX.relevo) return TEX.relevo;
    var q = chapa(512), g = q.g;
    g.fillStyle = '#808080'; g.fillRect(0, 0, 512, 512);
    g.lineWidth = 1;
    for (var i = 0; i < 1400; i++) {
      var x = Math.random() * 512, y = Math.random() * 512;
      var a = Math.random() * Math.PI, c = 6 + Math.random() * 22;
      g.strokeStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.33)' : 'rgba(0,0,0,0.28)';
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * c, y + Math.sin(a) * c); g.stroke();
    }
    var t = new THREE.CanvasTexture(q.c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(7, 7);
    TEX.relevo = t; return t;
  }

  function pinoMesh(cor) {
    /* a cor vem do achado, igual à do desenho plano */
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
      /* Mapeamento cilíndrico simples: serve para pele, que não tem desenho
         com lugar certo, e evita costura visível. */
      var uv = [];
      for (var vi = 0; vi < d.pos.length; vi += 3) {
        var px = d.pos[vi], py = d.pos[vi + 1], pz = d.pos[vi + 2];
        uv.push((Math.atan2(px, py - 25) / (Math.PI * 2)) + 0.5, pz / 260);
      }
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      malha = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
        map: texturaPele(), bumpMap: texturaRelevo(), bumpScale: 0.5,
        color: 0xfff4ec, roughness: 0.74, metalness: 0.0, side: THREE.DoubleSide
      }));
      malha.userData.reg = d.reg;
      grupo.add(malha);
      enquadrar(geo);

      /* Unhas: geometria própria, mais clara e com brilho, e por isso
         separada do corpo. */
      var gu = new THREE.BufferGeometry();
      gu.setAttribute('position', new THREE.Float32BufferAttribute(d.unhas.pos, 3));
      gu.setIndex(d.unhas.idx);
      gu.computeVertexNormals();
      unhasMesh = new THREE.Mesh(gu, new THREE.MeshStandardMaterial({
        color: 0xfaf0e6, roughness: 0.18, metalness: 0.02, side: THREE.DoubleSide
      }));
      unhasMesh.userData.reg = d.unhas.reg;
      grupo.add(unhasMesh);

      /* Luz de três pontos, como em estúdio: principal alta à frente,
         preenchimento fraco do lado oposto e contraluz para destacar a
         silhueta do pé do fundo claro da tela. */
      cena.add(new THREE.HemisphereLight(0xfff4ea, 0xc8b5a8, 0.95));
      var dl = new THREE.DirectionalLight(0xfff1e4, 1.35); dl.position.set(-180, 300, 260); cena.add(dl);
      var dl2 = new THREE.DirectionalLight(0xdfe6ff, 0.42); dl2.position.set(240, 90, -140); cena.add(dl2);
      var dl3 = new THREE.DirectionalLight(0xffffff, 0.55); dl3.position.set(40, -140, -260); cena.add(dl3);

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
    if (unhasMesh) { unhasMesh.geometry.dispose(); unhasMesh.material.dispose(); unhasMesh = null; }
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
      if (MODO === 'mover' || e.shiftKey || e.buttons === 4) {
        PAN.x -= dx * (EST.dist * 0.0016);
        PAN.y += dy * (EST.dist * 0.0016);
      } else {
        EST.az -= dx * 0.009;
        EST.el = Math.max(-1.45, Math.min(1.45, EST.el + dy * 0.008));
      }
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
    var alvos2 = unhasMesh ? [malha, unhasMesh] : [malha];
    var hits = raios.intersectObjects(alvos2, false);
    if (!hits.length) return;
    var h = hits[0];
    var regs = (h.object.userData.reg) || [];
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
