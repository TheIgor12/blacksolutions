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

  /* Cada achado tem a sua cor, e a mesma cor vale no desenho plano, no pé em
     três dimensões e na legenda. Cor por família, e não uma por item: sete
     cores a profissional distingue de relance, dezessete não. */
  var FAMILIAS = [
    { k: 'unha', cor: '#e23b3b', nome: 'Unha encravada e alterações da unha', re: /onicocriptose|encravada|onicodistrofia|hematoma subungueal/i },
    { k: 'calo', cor: '#d99a0b', nome: 'Calosidade e hiperqueratose', re: /calosidade|^calo$|hiperqueratose|esporão/i },
    { k: 'fissura', cor: '#8b5cf6', nome: 'Fissura e rachadura', re: /fissura|rachadura|ressecamento/i },
    { k: 'verruga', cor: '#2f7fe0', nome: 'Verruga plantar', re: /verruga/i },
    { k: 'micose', cor: '#1f9d63', nome: 'Micose', re: /micose|onicomicose/i },
    { k: 'ferida', cor: '#d9399c', nome: 'Ferida, úlcera e bolha', re: /ferida|úlcera|ulcera|bolha/i },
    { k: 'dor', cor: '#ef7a1a', nome: 'Dor e sensibilidade', re: /dor|sensibilidade/i },
    { k: 'outro', cor: '#64748b', nome: 'Outro achado', re: /./ }
  ];
  function familiaDe(tipo) {
    var t = String(tipo || '');
    for (var i = 0; i < FAMILIAS.length; i++) if (FAMILIAS[i].re.test(t)) return FAMILIAS[i];
    return FAMILIAS[FAMILIAS.length - 1];
  }
  function corDe(tipo) { return familiaDe(tipo).cor; }
  window.bfPesCor = corDe;

  /* Zonas de referência do mapeamento podológico, numeradas, para a legenda e
     para a camada de grade anatômica. */
  var ZONAS = [
    { n: 1, nome: 'Pododáctilos (dedos)', cor: '#17b6a3', regs: ['d1', 'd2', 'd3', 'd4', 'd5', 'u1', 'u2', 'u3', 'u4', 'u5', 'f1', 'f2', 'f3', 'f4', 'f5', 'fu1', 'fu2', 'fu3', 'fu4', 'fu5', 'l5', 'm1'] },
    { n: 2, nome: 'Antepé (cabeças dos metatarsos)', cor: '#d99a0b', regs: ['dant', 'meta', 'fant', 'lant', 'mant'] },
    { n: 3, nome: 'Médio-pé (arco plantar)', cor: '#8b5cf6', regs: ['dmed', 'arco', 'marc', 'lmed'] },
    { n: 4, nome: 'Retropé (calcanhar)', cor: '#2f7fe0', regs: ['calc', 'lcal', 'mcal', 'cpos', 'cfis', 'torn', 'caq'] },
    { n: 5, nome: 'Bordas lateral e medial', cor: '#e23b3b', regs: ['bm', 'bl', 'lmal', 'mmal', 'cmm', 'cml'] },
    { n: 6, nome: 'Polpa digital', cor: '#d9399c', regs: ['p1', 'p2', 'p3', 'p4', 'p5'] },
    { n: 7, nome: 'Espaços interdigitais', cor: '#1f9d63', regs: ['i1', 'i2', 'i3', 'i4'] }
  ];
  var ZONA_DE = null;
  function zonaDe(reg) {
    if (!ZONA_DE) { ZONA_DE = {}; ZONAS.forEach(function (z) { z.regs.forEach(function (r) { ZONA_DE[r] = z; }); }); }
    return ZONA_DE[reg] || null;
  }

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
      (p.forma === 'area' ? ' (área pintada)' : '') +
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
  var P = { clinica: null, pid: '', pe: 'D', vista: 'dorsal', angulo: 'dorsal', modoManual: false, abrindo: null, grade: false, pintando: false, traco: [], pintandoAgora: false };
  window.__bfPesP = P;
  var contextoModal = null;
  function contexto() {
    return { pid: P.pid, pe: P.pe, vista: P.vista, clinica: NV.clinicaId || '', estado: S };
  }
  function contextoValido(c) {
    return !!(c && c.estado === S && c.clinica === (NV.clinicaId || '') &&
      c.pid === P.pid && c.pe === P.pe && c.vista === P.vista && UI.view === TELA &&
      cabe() && pacDe(c.pid));
  }
  function contextoObrigatorio() {
    var c = contextoModal; contextoModal = null;
    if (contextoValido(c)) return c;
    closeModal(); toast('A ficha mudou. Selecione o paciente e tente de novo.'); return null;
  }

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
    /* Ponto gravado na mesma vista e já na medida da figura. */
    if (p.vista === P.vista && p.v === 2) return { x: p.x, y: p.y, vindo3d: false };
    /* Ponto do modelo tridimensional, ou ponto antigo gravado quando as vistas
       eram desenho de traço: cai no centro da própria região, na vista onde
       aquela região se vê. */
    var dest = vistaDaRegiao(p.regiao);
    if (p.vista === '3d' && !dest) dest = (localDaRegiao(p.regiao) || {}).vista;
    if (!dest || dest !== P.vista) {
      if (p.vista !== P.vista) return null;
      dest = P.vista;
    }
    var c = centroRegiao(dest, p.regiao);
    if (!c) return null;
    return { x: c.x, y: c.y, vindo3d: p.vista === '3d' };
  }
  /* ----------------------------------------------- a figura do pé ----- */
  /* As vistas planas deixaram de ser desenho de traço e passaram a ser o
     próprio modelo tridimensional, fotografado de frente em seis ângulos pelo
     script de geração. A região de cada toque sai de um mapa de cores gerado
     no mesmo instante, com a mesma câmera, então o que ela toca na figura é
     exatamente a região anatômica que o sistema grava. */
  var VG = function () { return window.bfPeVistas || null; };
  function medida(k) { var v = VG(); return v ? v[k] : null; }
  function caixaDe(k) { var m = medida(k); return m ? m.vb : (VISTAS[k] || VISTAS.dorsal).vb; }
  function largVB(k) { return Number(String(caixaDe(k)).split(' ')[2]) || 100; }
  function centroRegiao(k, reg) {
    var m = medida(k); if (!m || !m.centros || !m.centros[reg]) return null;
    return { x: m.centros[reg][0], y: m.centros[reg][1] };
  }
  /* Em que vista mora cada região, segundo a geometria e não a mão. */
  var ONDE = null;
  function vistaDaRegiao(reg) {
    if (!ONDE) {
      ONDE = {};
      var v = VG(); if (!v) return null;
      /* A região fica na vista em que ela ocupa mais espaço, e o tamanho sai
         da contagem de pixels do mapa quando ele carrega; antes disso vale a
         ordem das vistas, que já põe cada região no lugar mais natural. */
      ['plantar', 'dorsal', 'lateral', 'medial', 'dedos', 'calcanhar'].forEach(function (k) {
        var m = v[k]; if (!m) return;
        Object.keys(m.centros || {}).forEach(function (r) { if (!ONDE[r]) ONDE[r] = k; });
      });
      /* Correções por anatomia: unha e dorso do dedo se veem de cima, polpa
         por baixo, maléolo de lado, tendão por trás. */
      ['u1','u2','u3','u4','u5','d1','d2','d3','d4','d5','i1','i2','i3','i4','dant','dmed','torn'].forEach(function (r) { ONDE[r] = 'dorsal'; });
      ['p1','p2','p3','p4','p5','meta','arco','calc','bm','bl'].forEach(function (r) { ONDE[r] = 'plantar'; });
      ['lcal','lmal','lmed','lant','l5','ldor'].forEach(function (r) { ONDE[r] = 'lateral'; });
      ['mcal','mmal','marc','mant','m1','mdor'].forEach(function (r) { ONDE[r] = 'medial'; });
      ['f1','f2','f3','f4','f5','fu1','fu2','fu3','fu4','fu5','fant'].forEach(function (r) { ONDE[r] = 'dedos'; });
      ['caq','cpos','cfis','cmm','cml'].forEach(function (r) { ONDE[r] = 'calcanhar'; });
    }
    return ONDE[reg] || null;
  }

  /* Mapa de regiões: a imagem de cores chapadas, lida pixel a pixel. */
  var MAPAS = {};
  function carregarMapa(k) {
    if (MAPAS[k]) return MAPAS[k];
    var reg = { pronto: false };
    MAPAS[k] = reg;
    var img = new Image();
    img.onload = function () {
      var c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      var g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0);
      reg.dados = g.getImageData(0, 0, c.width, c.height);
      reg.w = c.width; reg.h = c.height; reg.pronto = true;
    };
    img.onerror = function () { reg.erro = true; };
    img.src = 'pes/mapa-' + k + '.png';
    return reg;
  }
  /* A grade anatômica é pintada a partir do mapa de regiões: cada pixel vira
     a cor da zona a que a região pertence, e o fundo fica transparente. Assim
     a grade cola exatamente na figura, sem contorno desenhado à mão. */
  var GRADES = {};
  function gradeURL(k) {
    if (GRADES[k]) return GRADES[k];
    var mp = MAPAS[k], m = medida(k);
    if (!mp || !mp.pronto || !m) return '';
    var c = document.createElement('canvas');
    c.width = mp.w; c.height = mp.h;
    var g = c.getContext('2d');
    var saida = g.createImageData(mp.w, mp.h);
    var d = mp.dados.data, o = saida.data;
    var cache = {};
    for (var i = 0; i < d.length; i += 4) {
      if (d[i] + d[i + 1] + d[i + 2] <= 12) continue;
      var chave = d[i] + ',' + d[i + 1] + ',' + d[i + 2];
      var cor = cache[chave];
      if (cor === undefined) {
        var reg = m.tabela[chave];
        var z = reg ? zonaDe(reg) : null;
        cor = z ? [parseInt(z.cor.slice(1, 3), 16), parseInt(z.cor.slice(3, 5), 16), parseInt(z.cor.slice(5, 7), 16)] : null;
        cache[chave] = cor;
      }
      if (!cor) continue;
      o[i] = cor[0]; o[i + 1] = cor[1]; o[i + 2] = cor[2]; o[i + 3] = 255;
    }
    g.putImageData(saida, 0, 0);
    GRADES[k] = c.toDataURL('image/png');
    return GRADES[k];
  }

  /* Qual região está embaixo do ponto, na caixa de desenho da vista. */
  function regiaoNaFigura(k, x, y) {
    var m = medida(k), mp = carregarMapa(k);
    if (!m || !mp.pronto) return '';
    var lv = largVB(k), av = Number(String(caixaDe(k)).split(' ')[3]) || 100;
    var px = Math.round(x / lv * mp.w), py = Math.round(y / av * mp.h);
    var melhor = '', raio;
    /* Procura no ponto e, se cair no fundo, em volta: a borda do pé tem
       antisserrilhado, e o toque com o dedo nunca é no pixel exato. */
    for (raio = 0; raio <= 14; raio += 2) {
      for (var dx = -raio; dx <= raio; dx += (raio || 1)) {
        for (var dy = -raio; dy <= raio; dy += (raio || 1)) {
          var ax = px + dx, ay = py + dy;
          if (ax < 0 || ay < 0 || ax >= mp.w || ay >= mp.h) continue;
          var i = (ay * mp.w + ax) * 4;
          var d = mp.dados.data;
          var chave = d[i] + ',' + d[i + 1] + ',' + d[i + 2];
          var nome = m.tabela[chave];
          if (nome) return nome;
          /* cor quase igual, por causa do antisserrilhado */
          if (!melhor) {
            var tab = m.tabela;
            for (var ch in tab) {
              var p2 = ch.split(',');
              if (Math.abs(p2[0] - d[i]) < 10 && Math.abs(p2[1] - d[i + 1]) < 10 && Math.abs(p2[2] - d[i + 2]) < 10) { melhor = tab[ch]; break; }
            }
          }
        }
      }
      if (melhor) return melhor;
    }
    return '';
  }

  function desenho() {
    var k = P.vista, m = mapaDe(P.pid, false);
    carregarMapa(k);   /* começa a baixar o mapa de regiões junto com a figura */
    var vb = caixaDe(k), lv = largVB(k);
    var pts = (m ? m.pontos : []).filter(function (x) { return !!noPlano(x); });
    var esp = P.pe === 'E' ? ' transform="translate(' + lv + ',0) scale(-1,1)"' : '';

    var numeros = '';
    if (P.grade) {
      var zon = {};
      Object.keys((medida(k) || {}).centros || {}).forEach(function (r) {
        if (vistaDaRegiao(r) !== k) return;
        var z = zonaDe(r); if (!z) return;
        var c = centroRegiao(k, r); if (!c) return;
        if (!zon[z.n]) zon[z.n] = { z: z, x: 0, y: 0, n: 0 };
        zon[z.n].x += c.x; zon[z.n].y += c.y; zon[z.n].n++;
      });
      var rz = Math.max(3.2, lv * 0.045);
      numeros = Object.keys(zon).map(function (i) {
        var a = zon[i];
        return '<g class="bfp-znum"><circle cx="' + (a.x / a.n) + '" cy="' + (a.y / a.n) + '" r="' + rz +
          '" style="fill:' + a.z.cor + '"></circle><text x="' + (a.x / a.n) + '" y="' + (a.y / a.n + rz * 0.36) +
          '" font-size="' + (rz * 1.1) + '">' + a.z.n + '</text></g>';
      }).join('');
    }

    var areas = pts.filter(function (x) { return x.forma === 'area' && x.vista === k; }).map(function (p) {
      var c = corDe(p.tipo);
      return '<g class="bfp-pino bfp-area' + (P.abrindo === p.id ? ' sel' : '') + '" data-pino="' + p.id + '">' +
        '<path d="' + caminhoArea(p.pts) + '" style="fill:' + c + ';fill-opacity:.34;stroke:' + c + ';stroke-width:0.9"></path>' +
        '<title>' + E(textoPonto(p)) + '</title></g>';
    }).join('');

    var rp = Math.max(2.6, lv * 0.038);
    var pinos = pts.map(function (p) {
      var n = (m.pontos.indexOf(p) + 1), L = noPlano(p), c = corDe(p.tipo);
      var cen = p.forma === 'area' ? centroArea(p.pts) : L;
      return '<g class="bfp-pino' + (P.abrindo === p.id ? ' sel' : '') + (L.vindo3d ? ' de3d' : '') +
        '" data-pino="' + p.id + '">' +
        '<circle cx="' + cen.x + '" cy="' + cen.y + '" r="' + rp + '" style="fill:' + c + '"></circle>' +
        '<text x="' + cen.x + '" y="' + (cen.y + rp * 0.36) + '" font-size="' + (rp * 1.1) + '">' + n + '</text>' +
        '<title>' + E(textoPonto(p)) + (L.vindo3d ? ' (marcado no pé em três dimensões)' : '') + '</title></g>';
    }).join('');

    return '<figure class="bfp-fig' + (P.pe === 'E' ? ' esq' : '') + '">' +
      '<img class="bfp-img" src="pes/' + k + '.webp" alt="' + E(LADO[P.pe] + ', ' + (VISTAS[k] || {}).nome) + '" draggable="false">' +
      (P.grade && gradeURL(k) ? '<img class="bfp-img bfp-zonas" src="' + gradeURL(k) + '" alt="" draggable="false">' : '') +
      '<svg id="bfp-svg" class="bfp-over" viewBox="' + vb + '">' +
      '<g class="bfp-pinos"' + esp + '>' + numeros + areas + pinos +
      '<path id="bfp-preview" d="" fill="#5a4cfb" fill-opacity="0.22" stroke="#5a4cfb" stroke-width="0.9"></path>' +
      '</g></svg></figure>';
  }
  function caminhoArea(pts) {
    if (!pts || !pts.length) return '';
    return 'M' + pts.map(function (p) { return p[0] + ' ' + p[1]; }).join(' L') + ' Z';
  }
  function centroArea(pts) {
    if (!pts || !pts.length) return { x: 0, y: 0 };
    var sx = 0, sy = 0;
    pts.forEach(function (p) { sx += p[0]; sy += p[1]; });
    return { x: Math.round(sx / pts.length * 10) / 10, y: Math.round(sy / pts.length * 10) / 10 };
  }

  /* ------------------------------------------------- onde foi o toque */
  function pontoDoEvento(ev) {
    var svg = document.getElementById('bfp-svg'); if (!svg) return null;
    var ctm = svg.getScreenCTM(); if (!ctm) return null;
    var t = (ev.touches && ev.touches[0]) || (ev.changedTouches && ev.changedTouches[0]) || ev;
    var pt = svg.createSVGPoint(); pt.x = t.clientX; pt.y = t.clientY;
    var p = pt.matrixTransform(ctm.inverse());
    /* Desfaz o espelho do pé esquerdo para gravar na coordenada da figura. */
    if (P.pe === 'E') p.x = largVB(P.vista) - p.x;
    return { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 };
  }

  /* --------------------------------------------------- perguntar e salvar */
  /* ------------------------------------------------ pintar área ------- */
  window.bfPesPincel = function () {
    P.pintando = !P.pintando; P.traco = []; P.pintandoAgora = false; render();
  };
  function previewPintar() {
    var el = document.getElementById('bfp-preview');
    if (el) el.setAttribute('d', P.traco.length > 1 ? caminhoArea(P.traco) : '');
  }
  window.bfPesPintarInicio = function (ev) {
    if (!P.pintando || !P.pid) return;
    ev.preventDefault();
    var p = pontoDoEvento(ev); if (!p) return;
    P.pintandoAgora = true; P.traco = [[p.x, p.y]];
    previewPintar();
  };
  window.bfPesPintarMove = function (ev) {
    if (!P.pintandoAgora) return;
    ev.preventDefault();
    var p = pontoDoEvento(ev); if (!p) return;
    var u = P.traco[P.traco.length - 1];
    if (!u || Math.abs(p.x - u[0]) + Math.abs(p.y - u[1]) > 1.2) { P.traco.push([p.x, p.y]); previewPintar(); }
  };
  window.bfPesPintarFim = function () {
    if (!P.pintandoAgora) return;
    P.pintandoAgora = false;
    if (P.traco.length < 5) { P.traco = []; previewPintar(); return; }
    var c = centroArea(P.traco);
    var origem = contexto();
    comMapa(P.vista, function () { if (contextoValido(origem)) perguntarArea(regiaoNaFigura(origem.vista, c.x, c.y)); });
  };
  function perguntarArea(reg) {
    contextoModal = contexto();
    var onde = (LADO[P.pe] || P.pe) + (VISTAS[P.vista] ? ', ' + VISTAS[P.vista].nome.toLowerCase() : '') +
      (reg ? ', ' + nomeRegiao(P.vista, reg) : '');
    openModal('<h3 style="margin-top:0">Salvar esta área?</h3>' +
      '<p class="sub" style="margin:0 0 14px">Você pintou uma área em <b>' + E(onde) + '</b>.<br>' +
      'Quer salvar essa área como local do seu tratamento?</p>' +
      '<div class="fgrid"><label>O que foi encontrado<select id="bfp-tipo">' +
      ACHADOS.map(function (a) { return '<option>' + E(a) + '</option>'; }).join('') + '</select></label>' +
      '<label class="full">Anotação<textarea id="bfp-nota" rows="2" placeholder="O que viu, o que fez, o que orientou"></textarea></label></div>' +
      '<div class="mact"><button class="btn ghost" onclick="bfPesDescartarArea()">Não</button>' +
      '<button class="btn" onclick="bfPesSalvarArea(\'' + reg + '\')">Sim, salvar a área</button></div>');
  }
  window.bfPesDescartarArea = function () { P.traco = []; closeModal(); render(); };
  window.bfPesSalvarArea = function (reg) {
    var origem = contextoObrigatorio(); if (!origem) return;
    var m = mapaDe(origem.pid, true);
    m.pontos.push({
      id: uid(), pe: P.pe, vista: P.vista, v: 2, forma: 'area', pts: P.traco.slice(),
      x: centroArea(P.traco).x, y: centroArea(P.traco).y, regiao: reg || '',
      tipo: str((document.getElementById('bfp-tipo') || {}).value || ''),
      nota: str((document.getElementById('bfp-nota') || {}).value || '').slice(0, 400),
      em: todayISO(), prof: str(S.config.responsavel || nomeUsuario && nomeUsuario() || '')
    });
    m.em = todayISO(); P.traco = [];
    closeModal(); save(); render();
    toast('Área ' + m.pontos.length + ' salva no mapa do paciente.');
  };
  window.bfPesGrade = function () {
    P.grade = !P.grade;
    if (P.grade) comMapa(P.vista, render); else render();
  };

  window.bfPesClique = function (ev) {
    if (P.pintando) return;
    if (!P.pid) { toast('Escolha o paciente antes de marcar.'); return; }
    var alvo = ev.target && ev.target.closest ? ev.target.closest('.bfp-pino') : null;
    if (alvo) { window.bfPesAbrirPino(alvo.getAttribute('data-pino')); return; }
    var p = pontoDoEvento(ev); if (!p) return;
    var origem = contexto();
    comMapa(P.vista, function () { if (contextoValido(origem)) perguntar(regiaoNaFigura(origem.vista, p.x, p.y), p.x, p.y); });
  };
  /* O mapa de regiões é uma imagem e pode ainda estar chegando no primeiro
     toque. Em vez de gravar um ponto sem nome de lugar, espera por ele. */
  function comMapa(k, depois) {
    var mp = carregarMapa(k), n = 0;
    (function tenta() {
      if (mp.pronto || mp.erro || n++ > 16) { depois(); return; }
      setTimeout(tenta, 110);
    })();
  }

  window.bfPesSalvarPonto = function (x, y, reg, z) {
    var origem = contextoObrigatorio();
    if (!origem || !Number.isFinite(x) || !Number.isFinite(y)) return;
    var m = mapaDe(origem.pid, true);
    var tipo = (document.getElementById('bfp-tipo') || {}).value || '';
    var nota = (document.getElementById('bfp-nota') || {}).value || '';
    var ponto = {
      id: uid(), pe: P.pe, vista: P.vista, x: x, y: y, regiao: reg || '',
      tipo: str(tipo), nota: str(nota).slice(0, 400), em: todayISO(),
      prof: str(S.config.responsavel || nomeUsuario && nomeUsuario() || '')
    };
    ponto.v = 2;
    if (Number.isFinite(z)) { ponto.z = z; ponto.vista = '3d'; ponto.malha = window.bfPes3dMalha; }
    m.pontos.push(ponto);
    m.em = todayISO();
    closeModal(); save(); render();
    toast('Ponto ' + m.pontos.length + ' salvo no mapa do paciente.');
  };
  /* A mesma pergunta serve ao desenho plano e ao pé em três dimensões. */
  function perguntar(reg, x, y, z) {
    contextoModal = contexto();
    var paciente = pacDe(contextoModal.pid); if (!paciente) return;
    var onde = (LADO[P.pe] || P.pe) + (VISTAS[P.vista] ? ', ' + VISTAS[P.vista].nome.toLowerCase() : '') +
      (reg ? ', ' + nomeRegiao(P.vista, reg) : '');
    openModal('<h3 style="margin-top:0">Salvar este ponto?</h3>' +
      '<p class="sub" style="margin:0 0 14px">Você tocou em <b>' + E(onde) + '</b>.<br>' +
      'Salvar na ficha de <b>' + E(paciente.nome) + '</b>?</p>' +
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
    contextoModal = contexto();
    openModal('<h3 style="margin-top:0">Ponto '  + (m.pontos.indexOf(p) + 1) + '</h3>' +
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
    var origem = contextoObrigatorio(); if (!origem) return;
    var m = mapaDe(origem.pid, false); if (!m) return;
    var p = m.pontos.find(function (x) { return x.id === id; }); if (!p) return;
    p.tipo = str((document.getElementById('bfp-tipo') || {}).value || '');
    p.nota = str((document.getElementById('bfp-nota') || {}).value || '').slice(0, 400);
    m.em = todayISO(); closeModal(); save(); render(); toast('Ponto atualizado.');
  };
  window.bfPesApagarPonto = function (id) {
    var origem = contextoObrigatorio(); if (!origem) return;
    var m = mapaDe(origem.pid, false); if (!m) return;
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
    P.modoManual = true;
    P.vista = v; render();
  };
  window.bfPesAngulo = function (v) {
    if (!VISTAS[v]) return;
    if (P.vista !== '3d') { window.bfPesVista(v); return; }
    P.angulo = v;
    document.querySelectorAll('[data-bfp-angulo]').forEach(function (b) {
      var ativo = b.dataset.bfpAngulo === v;
      b.classList.toggle('ghost', !ativo); b.setAttribute('aria-pressed',String(ativo));
    });
    window.bfPes3dAngulo(v);
  };
  window.bfPesPe = function (l) {
    P.pe = (l === 'E' ? 'E' : 'D');
    if (P.vista === '3d' && window.bfPes3dDestruir) window.bfPes3dDestruir();
    render();
  };
  window.bfPesPaciente = function (id) {
    P.clinica = NV.clinicaId || '';
    P.pid = pacDe(String(id || '')) ? String(id) : ''; P.abrindo = null;
    P.pintandoAgora = false; P.traco = [];
    if (!P.modoManual) P.vista = tem3d() ? '3d' : 'dorsal';
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
    if (destino === '3d') {
      P.angulo = vistaDaRegiao(p.regiao) || (localDaRegiao(p.regiao) || {}).vista || 'dorsal';
    }
    P.pe = p.pe; P.vista = destino; P.abrindo = p.id; render();
  };
  window.bfPesObs = function (v) {
    if (!contextoValido(contexto())) return;
    var m = mapaDe(P.pid, true); m.obs = String(v || '').slice(0, 1200); m.em = todayISO();
    clearTimeout(window.__bfPesT); window.__bfPesT = setTimeout(save, 700);
  };
  window.bfPesLimpar = function () {
    var m = mapaDe(P.pid, false); if (!m || !m.pontos.length) return;
    var origem = contexto();
    confirmModal('Apagar os <b>' + m.pontos.length + '</b> pontos marcados deste paciente? A anotação geral continua.',
      function () { if (!contextoValido(origem)) return; m.pontos = []; m.em = todayISO(); save(); render(); toast('Mapa limpo.'); }, 'Apagar os pontos');
  };

  /* ---------------------------------------------- mandar para a evolução */
  window.bfPesParaEvolucao = function () {
    var m = mapaDe(P.pid, false), p = pacDe(P.pid);
    if (!m || !p || (!m.pontos.length && !str(m.obs))) { toast('Marque ao menos um ponto antes.'); return; }
    var origem = contexto();
    var texto = 'MAPA DOS PÉS\n' + m.pontos.map(function (x, i) { return (i + 1) + '. ' + textoPonto(x); }).join('\n') +
      (str(m.obs) ? '\n\nObservação: ' + str(m.obs) : '');
    confirmModal('Lançar o mapa de <b>' + E(p.nome) + '</b> na evolução clínica de hoje, com ' +
      m.pontos.length + ' ' + (m.pontos.length === 1 ? 'ponto' : 'pontos') + '?',
      function () {
        if (!contextoValido(origem)) { toast('A ficha mudou. Nenhuma evolução foi lançada.'); return; }
        S.evolucoes.push({
          id: uid(), pacienteId: origem.pid, data: todayISO(), texto: texto,
          profissional: str(S.config.responsavel || nomeUsuario()), origem: 'mapa-pes'
        });
        toast('Lançado na evolução clínica.');
      }, 'Lançar na evolução');
  };

  /* ------------------------------------------------------------- a tela */
  var tem3d = function () { return typeof window.bfPes3dCabe === 'function' && window.bfPes3dCabe(); };
  function barraVistas() {
    var tres = P.vista === '3d';
    var botoes = GIRO.concat(PONTAS).map(function (k) {
      var ativo = (tres ? P.angulo : P.vista) === k;
      return '<button class="btn ' + (ativo ? '' : 'ghost') + ' sm" data-bfp-angulo="' + k +
        '" aria-pressed="' + ativo + '" onclick="bfPesAngulo(\'' + k + '\')">' + E(VISTAS[k].nome) + '</button>';
    }).join('');
    if (tem3d()) botoes += '<button class="btn ghost sm bfp-b3d" onclick="bfPesVista(\'' +
      (tres ? P.angulo : '3d') + '\')">' + (tres ? 'Usar vistas 2D e pintar área' : 'Voltar ao modelo 3D') + '</button>';
    return '<div class="bfp-vistas' + (tem3d() ? ' com3d' : '') + '">' + botoes + '</div>';
  }

  function pontos3d() {
    var m = mapaDe(P.pid, false); if (!m) return [];
    return m.pontos.filter(function (p) { return p.pe === P.pe; }).map(function (p) {
      return { id:p.id, x:p.x, y:p.y, z:p.z, regiao:p.regiao, malha:p.malha, cor:parseInt(corDe(p.tipo).slice(1),16) };
    });
  }
  function montar3d() {
    var caixa = document.getElementById('bfp-3d'); if (!caixa) return;
    var origem = contexto();
    caixa.innerHTML = '<p class="bfp-carregando">Carregando modelo 3D...</p>';
    function falhar() {
      if (!caixa.isConnected || !contextoValido(origem)) return;
      P.modoManual = true; P.vista = P.angulo || 'dorsal';
      render(); toast('O 3D não abriu neste aparelho. As vistas 2D continuam disponíveis.');
    }
    window.bfPes3dMontar(caixa, {
      pe: P.pe, pontos: pontos3d(), angulo: P.angulo, foco: P.abrindo, aoFalhar:falhar,
      aoTocar: function (r) {
        if (!contextoValido(origem)) return;
        if (r.pino) { window.bfPesAbrirPino(r.pino); return; }
        perguntar(r.regiao, r.x, r.y, r.z);
      }
    }).catch(falhar);
  }

  function listaPontos(m) {
    if (!m || !m.pontos.length) return '<p class="bfp-vazio">Nenhum ponto marcado ainda. Toque no desenho, em cima do lugar que você está tratando, e o sistema pergunta se quer guardar aquele ponto.</p>';
    return '<ol class="bfp-lista">' + m.pontos.map(function (p, i) {
      return '<li' + (P.abrindo === p.id ? ' class="sel"' : '') + '><div class="bfp-li-t">' +
        '<b><i class="bfp-bola" style="background:' + corDe(p.tipo) + '"></i>' + (i + 1) + '. ' +
        E(p.tipo || 'Ponto marcado') + (p.forma === 'area' ? ' <i class="bfp-marca3d">área</i>' : '') + '</b>' +
        '<span>' + E(LADO[p.pe]) +
        (VISTAS[p.vista] ? ', ' + E(VISTAS[p.vista].nome.toLowerCase()) : '') +
        (p.regiao ? ', ' + E(nomeRegiao(p.vista, p.regiao)) : '') +
        (p.vista === '3d' ? ' <i class="bfp-marca3d">' +
          (p.malha === window.bfPes3dMalha ? 'marcado em 3D' : 'modelo anterior · posição aproximada no novo 3D') + '</i>' : '') + '</span>' +
        (p.nota ? '<small>' + E(p.nota) + '</small>' : '') +
        '<small class="bfp-data">' + E(br(p.em)) + (p.prof ? ' · ' + E(p.prof) : '') + '</small></div>' +
        '<div class="bfp-li-b"><button class="btn ghost sm" onclick="bfPesIr(\'' + p.id + '\')">ver no pé</button>' +
        '<button class="btn ghost sm" onclick="bfPesAbrirPino(\'' + p.id + '\')">editar</button></div></li>';
    }).join('') + '</ol>';
  }

  /* ----------------------------------------------------- painéis ------ */
  function painelTipos() {
    return '<div class="card bfp-painel"><b>Tipos de marcação</b>' +
      '<ul class="bfp-leg">' + FAMILIAS.map(function (f) {
        return '<li><i style="background:' + f.cor + '"></i>' + E(f.nome) + '</li>';
      }).join('') + '</ul>' +
      '<p class="bfp-nota-painel">A cor sai sozinha do que você escolher em "o que foi encontrado", no desenho e na lista.</p></div>';
  }
  function painelControles() {
    var tres = P.vista === '3d';
    return '<div class="card bfp-painel"><b>Controles</b>' +
      '<div class="bfp-ctl">' +
      (tres
        ? '<button class="btn ghost sm" onclick="bfPes3dModo(\'girar\')">Girar</button>' +
          '<button class="btn ghost sm" onclick="bfPes3dModo(\'mover\')">Mover</button>' +
          '<button class="btn ghost sm" onclick="bfPes3dReenquadrar()">Enquadrar de novo</button>' +
          '<button class="btn ghost sm" aria-label="Aproximar" onclick="bfPes3dZoom(true)">Zoom +</button>' +
          '<button class="btn ghost sm" aria-label="Afastar" onclick="bfPes3dZoom(false)">Zoom −</button>' +
          '<button class="btn ghost sm" aria-pressed="true" onclick="this.setAttribute(\'aria-pressed\',String(bfPes3dGrade()))">Números dos dedos</button>'
        : '<button class="btn ' + (P.pintando ? '' : 'ghost') + ' sm" onclick="bfPesPincel()">' +
          (P.pintando ? 'Pintando área' : 'Pintar área') + '</button>' +
          '<button class="btn ' + (P.grade ? '' : 'ghost') + ' sm" onclick="bfPesGrade()">Zonas em cor</button>') +
      '</div>' +
      '<p class="bfp-nota-painel">' +
      (tres ? 'Arraste para girar, role para aproximar e toque no pé para marcar o ponto.'
            : (P.pintando ? 'Arraste por cima do desenho para pintar a área tratada. Soltando, o sistema pergunta se quer guardar.'
                          : 'Toque no desenho para marcar um ponto, ou ligue Pintar área para contornar a região tratada.')) +
      '</p></div>';
  }
  function painelZonas() {
    return '<div class="card bfp-painel"><b>Zonas de referência</b>' +
      '<ul class="bfp-leg">' + ZONAS.map(function (z) {
        return '<li><i class="num" style="background:' + z.cor + '">' + z.n + '</i>' + E(z.nome) + '</li>';
      }).join('') + '</ul>' +
      '<p class="bfp-nota-painel">' + (P.vista === '3d'
        ? 'No modelo, 1 a 5 identificam os dedos, do hálux ao dedo mínimo. As cores desta legenda são usadas na vista 2D.'
        : 'Ligue "Zonas em cor" para ver as regiões anatômicas no desenho.') + '</p></div>';
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
          : '<div class="bfp-tela' + (P.pintando ? ' pintando' : '') + '" onclick="bfPesClique(event)"' +
            ' onpointerdown="bfPesPintarInicio(event)" onpointermove="bfPesPintarMove(event)"' +
            ' onpointerup="bfPesPintarFim(event)" onpointerleave="bfPesPintarFim(event)">' + desenho() + '</div>') +
        '<button class="bfp-girar dir" onclick="bfPesGirar(1)" aria-label="Girar para a direita" title="Girar um quarto de volta para a direita">&#8250;</button>' +
        '</div>' +
        (ehTres
          ? '<p class="bfp-legenda"><b>' + E(LADO[P.pe]) + ' · Pé em três dimensões</b><br>' +
            'Arraste para girar livremente. Role ou faça o gesto de pinça para aproximar. Toque para marcar.</p>'
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
        '</div>' +
        '<div class="bfp-lado">' + painelControles() + painelTipos() + painelZonas() + '</div>' +
        '</div>'));
  }

  /* --------------------------------------------------------- integração */
  var cabe = function () {
    /* Podologia, e só para quem tem permissão clínica: o mapa dos pés é
       prontuário, não é agenda. */
    if (soAgenda()) return false;
    if (String((S && S.config && S.config.segmento) || 'podologia') !== 'podologia') return false;
    return typeof podeTela !== 'function' || podeTela('pesmapa');
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
    if (UI.view !== TELA) {
      if (window.bfPes3dDestruir) window.bfPes3dDestruir();
      return renderAntes();
    }
    if (NV.ativa && UI.auth) {
      P.pid = '';
      if (window.bfPes3dDestruir) window.bfPes3dDestruir();
      return renderAntes();
    }
    if (!cabe()) {
      if (window.bfPes3dDestruir) window.bfPes3dDestruir();
      UI.view = 'agenda'; return renderAntes();
    }
    if (P.clinica !== (NV.clinicaId || '') || (P.pid && !pacDe(P.pid))) {
      P.pid = ''; P.abrindo = null; P.traco = []; P.pintandoAgora = false;
      P.clinica = NV.clinicaId || '';
    }
    if (P.vista === '3d' && !tem3d()) P.vista = 'dorsal';
    if (window.bfPes3dDestruir) window.bfPes3dDestruir();
    document.getElementById('app').innerHTML = shell(tela());
    try { fonteAplicar(); } catch (e) { }
    if (P.vista === '3d' && P.pid) setTimeout(montar3d, 0);
  };

  /* ---------------------------------------------------------------- CSS */
  var CSS = '<style>' +
/* Quadro de trabalho no computador: o pé grande à esquerda, a ficha no meio e
   as legendas e os controles numa coluna estreita à direita, sempre à vista.
   Em tela menor as três colunas viram duas, e no celular viram uma. */
    '.bfp-grade{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr) 252px;gap:14px;align-items:start}' +
    '@media(max-width:1340px){.bfp-grade{grid-template-columns:minmax(0,1.2fr) minmax(0,1fr)}' +
    '.bfp-lado{grid-column:1/-1;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}}' +
    '.bfp-lado{display:flex;flex-direction:column;gap:14px}' +
    '.bfp-painel{display:flex;flex-direction:column;gap:8px;padding:14px}' +
    '.bfp-painel>b{font-size:13.5px}' +
    '.bfp-leg{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:7px}' +
    '.bfp-leg li{display:flex;align-items:center;gap:9px;font-size:12.5px;line-height:1.35;color:var(--ink)}' +
    '.bfp-leg i{flex:0 0 16px;width:16px;height:16px;border-radius:5px;display:inline-block}' +
    '.bfp-leg i.num{border-radius:999px;color:#fff;font-style:normal;font-weight:700;font-size:10.5px;' +
    'display:flex;align-items:center;justify-content:center}' +
    '.bfp-nota-painel{margin:2px 0 0;font-size:11.5px;color:var(--mut);line-height:1.5}' +
    '.bfp-ctl{display:grid;grid-template-columns:1fr 1fr;gap:8px}' +
    '.bfp-ctl .btn{width:100%;justify-content:center;white-space:normal;text-align:center;min-width:0}' +
    '.bfp-tela.pintando{cursor:crosshair;touch-action:none;box-shadow:inset 0 0 0 2px #5a4cfb}' +
    '.bfp-area path{cursor:pointer}' +
    '.bfp-palco,.bfp-fichario{display:flex;flex-direction:column;gap:12px}' +
/* Grade, e nao flex, nos pares de botao: com grade as duas caixas saem com a
   mesma largura exata, sem a diferenca de um ou dois pixels que o flex deixa
   quando um rotulo e mais comprido que o outro. */
    '.bfp-pes,.bfp-pontas,.bfp-acoes{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}' +
    '.bfp-pes .btn,.bfp-pontas .btn,.bfp-acoes .btn{width:100%;min-width:0;justify-content:center;white-space:normal;text-align:center}' +
    '.bfp-vistas{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}' +
    '.bfp-vistas.com3d .bfp-b3d{grid-column:1/-1}' +
     '.bfp-3d{position:relative;padding:0;overflow:hidden;cursor:grab;display:flex;align-items:center;justify-content:center;min-height:280px}' +
    '.bfp-3d-labels{position:absolute;inset:0;pointer-events:none}' +
    '.bfp-3d-labels span{position:absolute;transform:translate(-50%,-50%);border:1px solid #fff;background:#242341;color:#fff;' +
    'border-radius:50%;width:19px;height:19px;text-align:center;font-size:11px;line-height:17px;font-weight:700}'  +
    '.bfp-carregando{margin:0;padding:24px;text-align:center;font-size:13px;color:var(--mut);line-height:1.6}' +
    '.bfp-vistas .btn{justify-content:center;white-space:normal;text-align:center;min-width:0}' +
    '.bfp-palco-in{display:flex;align-items:center;gap:6px;position:relative}' +
    '.bfp-ficha{margin-top:10px}.bfp-ficha .btn{width:100%;justify-content:center}' +
    '.bfp-tela{flex:1 1 auto;min-width:0;background:linear-gradient(180deg,#fbfbfe,#f2f2f8);' +
    'border:1px solid var(--line,#e6e6ef);border-radius:16px;padding:10px;touch-action:manipulation;cursor:crosshair}' +
    '.bfp-fig{margin:0;position:relative;display:block;width:100%}' +
    '.bfp-img{display:block;width:100%;height:auto;max-height:52vh;object-fit:contain;' +
    '-webkit-user-select:none;user-select:none;pointer-events:none;' +
    'filter:drop-shadow(0 10px 22px rgba(20,16,40,.18))}' +
    '.bfp-fig.esq .bfp-img{transform:scaleX(-1)}' +
    '.bfp-zonas{position:absolute;inset:0;opacity:.52;filter:none}' +
    '.bfp-over{position:absolute;inset:0;width:100%;height:100%;display:block}' +
    '.bfp-tela svg{width:100%;height:auto;max-height:52vh;display:block}' +
    '.bfp-girar{flex:0 0 44px;width:44px;height:64px;border:1px solid var(--line,#e6e6ef);background:#fff;' +
    'border-radius:14px;font-size:26px;line-height:1;color:var(--ink);cursor:pointer}' +
    '.bfp-girar:active{background:#eceaff}' +
    '.bfp-contorno{fill:#f2f2f7;stroke:#c3c3d2;stroke-width:1.6}' +
    '.bfp-reg{fill:#fff;stroke:#9a9aae;stroke-width:1;opacity:.95}' +
    '.bfp-reg:hover{fill:#e8e6ff}' +
    '.bfp-pinos circle{fill:#5a4cfb;stroke:#fff;stroke-width:1.6}' +
    '.bfp-pinos text{fill:#fff;font-weight:700;text-anchor:middle;pointer-events:none}' +
    '.bfp-znum circle{opacity:.92;stroke:#fff;stroke-width:1.2}.bfp-znum{pointer-events:none}' +
    '.bfp-pino.sel circle{fill:#d93a3a}' +
    '.bfp-legenda{margin:0;text-align:center;font-size:12.5px;color:var(--mut);line-height:1.5}' +
    '.bfp-cab{display:flex;justify-content:space-between;align-items:baseline;gap:10px}' +
    '.bfp-lista{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}' +
    '.bfp-lista li{border:1px solid var(--line,#e6e6ef);border-radius:12px;padding:10px 12px;' +
    'display:flex;gap:10px;justify-content:space-between;align-items:flex-start;flex-wrap:wrap}' +
    '.bfp-lista li.sel{border-color:#5a4cfb;box-shadow:inset 3px 0 0 #5a4cfb}' +
    '.bfp-li-t{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1 1 180px}' +
    '.bfp-li-t b{font-size:13.5px}.bfp-li-t span{font-size:12.5px;color:var(--mut)}' +
    '.bfp-bola{display:inline-block;width:10px;height:10px;border-radius:999px;margin-right:6px;vertical-align:baseline}' +
    '.bfp-marca3d{font-style:normal;font-size:11px;background:#eceaff;color:#4a3fd0;border-radius:999px;padding:1px 7px;white-space:nowrap}' +
    '.bfp-pino.de3d circle{stroke-dasharray:3 2}' +
    '.bfp-li-t small{font-size:12px}.bfp-data{color:var(--mut)}' +
    '.bfp-li-b{display:flex;gap:6px;flex-wrap:wrap}' +
    '.bfp-vazio{margin:0;font-size:13px;color:var(--mut);line-height:1.6}' +
    '.bfp-obs{display:flex;flex-direction:column;gap:4px;font-size:12.5px;font-weight:600;color:var(--mut)}' +
    '.bfp-obs textarea{width:100%;font:inherit;font-weight:400;color:var(--ink);border:1px solid var(--line,#e6e6ef);' +
    'border-radius:10px;padding:10px;background:#fff}' +

    '@media(max-width:900px){.bfp-grade{grid-template-columns:1fr}' +
    '.bfp-lado{grid-column:auto;display:flex;flex-direction:column}}' +
/* No celular o desenho ocupa a largura inteira e as setas vão para baixo dele.
   Flutuando por cima, elas cobriam justamente o 1º e o 5º dedo na vista de
   frente, que é onde a profissional mais precisa tocar. */
    '@media(max-width:760px){.bfp-vistas{grid-template-columns:repeat(2,minmax(0,1fr))}' +
    '.bfp-tela svg,.bfp-img{max-height:none}' +
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
