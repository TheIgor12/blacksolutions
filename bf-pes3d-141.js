/* BlackFlow Pés Interativos. Malha anatômica CC0 (veja pes/MODELO-ANATOMICO.md).
   A malha é genérica; nenhum arquivo 3D contém dados de pacientes. */
(function () {
  'use strict';
  if (window.__bfPes3d141) return;
  window.__bfPes3d141 = true;
  var base = new URL('.', document.currentScript.src);
  var MALHA = 'anatomico-1', app = null, carregando = null, geracao = 0, suporta;
  var ANG = {
    dorsal: [0, Math.PI / 2], plantar: [0, -Math.PI / 2],
    lateral: [-Math.PI / 2, 0.12], medial: [Math.PI / 2, 0.12],
    dedos: [0, 0.12], calcanhar: [Math.PI, 0.12]
  };
  var DEDOS = [
    [-27, 207, 9, 8, 175, 217],
    [-4, 205, 6, 7, 183, 214],
    [10, 197, 5.7, 6.5, 177, 205],
    [22, 186, 5.0, 6, 168, 195],
    [33, 177, 4.9, 6, 159, 185]
  ];
  var refs = { fu1:'u1',fu2:'u2',fu3:'u3',fu4:'u4',fu5:'u5',
    l5:'d5',m1:'d1',ldor:'dmed',mdor:'dmed',fant:'dant',cmm:'mmal',cml:'lmal' };
  window.bfPes3dMalha = MALHA;
  function regiao(p, n) {
    var u = -p.x, lado = -n.x, z = p.z, y = p.y;
    var idx = 0, melhor = Infinity;
    DEDOS.forEach(function (d, i) {
      var dist = Math.abs(u - d[0]);
      if (dist < melhor) { melhor = dist; idx = i; }
    });
    var d = DEDOS[idx], i = idx + 1;
    if (z > d[4] - 5 && z < d[4] + 9 && Math.abs(lado) > .22) {
      for (var j = 0; j < 4; j++) {
        var gap = (DEDOS[j][0] + DEDOS[j + 1][0]) / 2;
        if (Math.abs(u - gap) < 2.5 && z > (DEDOS[j][4] + DEDOS[j+1][4]) / 2 - 3) return 'i' + (j + 1);
      }
    }
    if (z > d[4]) {
      if (n.y > .23 && Math.pow((u-d[0])/d[2],4) + Math.pow((z-d[1])/d[3],4) < 1.24) return 'u' + i;
      if (n.y < -.24) return 'p' + i;
      if (n.z > .55 && z > d[5]-9) return 'f' + i;
      return 'd' + i;
    }
    if (n.y < -.40) {
      if (z < 53) return 'calc';
      if (z > 121) return 'meta';
      return Math.abs(lado) > .5 ? (u < 0 ? 'bm' : 'bl') : 'arco';
    }
    if (z < 30 && n.z < -.45) return y > 57 ? 'caq' : (y < 11 ? 'cfis' : 'cpos');
    if (y > 43 && y < 85 && z < 65 && Math.abs(lado) > .65) return u < 0 ? 'mmal' : 'lmal';
    if (n.y > .32 || y > 72) return z < 59 ? 'torn' : (z > 125 ? 'dant' : 'dmed');
    if (z < 55) return u < 0 ? 'mcal' : 'lcal';
    if (z < 127) return u < 0 ? 'marc' : 'lmed';
    return u < 0 ? 'mant' : 'lant';
  }
  function bytes(s) { return Uint8Array.from(atob(s), function (x) { return x.charCodeAt(0); }); }
  function carregar() {
    if (!carregando) carregando = Promise.all([
      import(new URL('vendor/three.module.min.js', base).href),
      fetch(new URL('pes/modelo-anatomico-1.json', base)).then(function (r) {
        if (!r.ok) throw new Error('Modelo indisponível'); return r.json();
      })
    ]).then(function (pair) {
      var T = pair[0], d = pair[1], geo = new T.BufferGeometry();
      var p = bytes(d.p), i = bytes(d.i), c = bytes(d.c);
      var pi = new DataView(p.buffer), ii = new DataView(i.buffer);
      var pos = Float32Array.from({length:p.length/2}, function (_, n) { return pi.getInt16(n*2,true)/100; });
      var idx = Uint16Array.from({length:i.length/2}, function (_, n) { return ii.getUint16(n*2,true); });
      var color = new Float32Array(c.length);
      for (var n = 0; n < c.length; n++) {
        var t = c[n]/255;
        color[n] = t <= .04045 ? t / 12.92 : Math.pow((t+.055)/1.055,2.4);
      }
      geo.setAttribute('position',new T.BufferAttribute(pos,3));
      geo.setAttribute('color',new T.BufferAttribute(color,3));
      geo.setIndex(new T.BufferAttribute(idx,1));
      geo.computeVertexNormals();
      geo.computeBoundingSphere();
      var g = geo.attributes, points = {}, centers = {}, P = new T.Vector3(), N = new T.Vector3();
      for (var k = 0; k < g.position.count; k++) {
        P.fromBufferAttribute(g.position, k); N.fromBufferAttribute(g.normal,k);
        var r = regiao(P,N);
        (points[r] || (points[r] = [])).push({p:P.clone(), n:N.clone()});
        (centers[r] || (centers[r] = new T.Vector3())).add(P);
      }
      Object.keys(points).forEach(function (r) { centers[r].divideScalar(points[r].length); });
      return { T:T, geo:geo, unhas:desenharUnhas(T,geo), points:points, centers:centers };
    }).catch(function (e) { carregando = null; throw e; });
    return carregando;
  }
  // Lâminas das unhas conformadas sobre a superfície. A marcação continua
  // usando a mesma malha e os mesmos códigos anatômicos da ficha.
  function desenharUnhas(T,geo) {
    var skin = new T.Mesh(geo), ray = new T.Raycaster(), N = 24, M = 4;
    var ps=[], cs=[], is=[], valid=[], dir=new T.Vector3(0,-1,0);
    skin.updateMatrixWorld();
    DEDOS.forEach(function (d) {
      var start = ps.length/3;
      for (var ring=0;ring<=M;ring++) {
        for (var j=0;j<N;j++) {
          var theta=j*Math.PI*2/N, r=ring/M, C=Math.cos(theta), S=Math.sin(theta);
          var xx = -(d[0]+Math.sign(C)*Math.pow(Math.abs(C),.72)*r*d[2]*.82);
          var zz = d[1]+Math.sign(S)*Math.pow(Math.abs(S),.72)*r*d[3]*.88;
          ray.set(new T.Vector3(xx,130,zz),dir);
          var hit=ray.intersectObject(skin,false)[0];
          valid.push(!!hit && hit.normal.y>.12);
          ps.push(xx,hit ? hit.point.y+.20+.42*(1-r*r) : 0,zz);
          var ponta=Math.min(1,Math.max(0,(zz-d[1])/d[3]*1.85-.26));
          var sem=new T.Color(0xd49c8a).lerp(new T.Color(0xf3d6c1),ponta);
          cs.push(sem.r,sem.g,sem.b);
        }
      }
      function tri(a,b,c) { if (valid[a]&&valid[b]&&valid[c]) is.push(a,b,c); }
      for (var row=0; row<M; row++) {
        for (var col=0; col<N; col++) {
          var a=start+row*N+col,b=start+(row+1)*N+col;
          var c0=start+(row+1)*N+(col+1)%N,d0=start+row*N+(col+1)%N;
          tri(a,b,c0); if (row) tri(a,c0,d0);
        }
      }
    });
    skin.material.dispose();
    var nails=new T.BufferGeometry();
    nails.setAttribute('position',new T.Float32BufferAttribute(ps,3));
    nails.setAttribute('color',new T.Float32BufferAttribute(cs,3));
    nails.setIndex(is); nails.computeVertexNormals(); return nails;
  }
  function nearest(d, r, previous) {
    var key = refs[r] || r, arr = d.points[key];
    if (!arr) return null;
    var c = previous || d.centers[key], best, min = Infinity;
    arr.forEach(function (v) {
      var len = v.p.distanceToSquared(c);
      if (len < min) { min = len; best = v; }
    });
    return best;
  }
  /* O pé em três dimensões é só de computador, e a regra tem três partes ao
     mesmo tempo: tela de 1024 pixels para cima, ponteiro fino, que é mouse ou
     caneta, e WebGL. Existe notebook com tela sensível ao toque e tablet com
     caneta, então largura sozinha não decide.
     Sem as três, o botão nem aparece, e com isso o celular não baixa a
     biblioteca de 687 kilobytes nem o modelo de 252: quem atende no celular
     usa as seis vistas, que registram a mesma coisa. */
  window.bfPes3dCabe = function () {
    if (suporta !== undefined) return suporta;
    try {
      if (!window.matchMedia ||
          !matchMedia('(min-width:1024px)').matches ||
          !matchMedia('(pointer:fine)').matches) { suporta = false; return suporta; }
      var ctx = document.createElement('canvas').getContext('webgl2');
      suporta = !!ctx;
      var ext = ctx && ctx.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
    } catch (_) { suporta = false; }
    return suporta;
  };
  function quadro(st) {
    if (st.frame || !st.el.isConnected) return;
    st.frame = requestAnimationFrame(function () {
      st.frame = 0;
      if (st !== app || !st.el.isConnected) return;
      st.renderer.render(st.scene, st.cam);
      st.labels.forEach(function (l) {
        var pos = l.p.clone().applyMatrix4(st.group.matrixWorld);
        var direction = st.cam.position.clone().sub(pos);
        var front = l.n.clone().transformDirection(st.group.matrixWorld).dot(direction.normalize()) > .20;
        var ndc = pos.project(st.cam);
        l.el.hidden = !st.numeros || !front || ndc.x < -.92 || ndc.x > .92 || ndc.y < -.92 || ndc.y > .92;
        l.el.style.left = (50+ndc.x*50)+'%'; l.el.style.top = (50-ndc.y*50)+'%';
      });
    });
  }
  function camera(st) {
    var ce = Math.cos(st.elv), p = st.cam.position;
    p.set(Math.sin(st.az)*ce,Math.sin(st.elv),Math.cos(st.az)*ce).multiplyScalar(st.dist).add(st.target);
    // Estável nos polos; vistas da sola e do dorso exibem os dedos para cima.
    st.cam.up.set(-Math.sin(st.az)*Math.sin(st.elv),Math.cos(st.elv),-Math.cos(st.az)*Math.sin(st.elv));
    if (st.vista === 'dorsal') st.cam.up.set(0,0,1);
    if (st.vista === 'plantar') st.cam.up.set(0,0,1);
    st.cam.lookAt(st.target); st.cam.updateMatrixWorld();
    quadro(st);
  }
  function ajuste(st, nome, manter) {
    var a = ANG[nome] || ANG.dorsal;
    st.vista = nome;
    st.az = a[0] * (st.left ? -1 : 1); st.elv = a[1];
    // O polo dorsal usa azimute π para continuar sem inverter o desenho ao arrastar.
    if (nome === 'dorsal') st.az = Math.PI;
    if (!manter) { st.dist = st.fit; st.target.copy(st.home); }
    camera(st);
  }
  window.bfPes3dAngulo = function (nome) { if (app && ANG[nome]) ajuste(app,nome); };
  window.bfPes3dGirar = function (passo) {
    if (!app) return; app.vista = ''; app.az += passo*Math.PI/2; camera(app);
  };
  window.bfPes3dModo = function (m) { if (app) app.modo = m === 'mover' ? 'mover' : 'girar'; };
  window.bfPes3dGrade = function () {
    if (!app) return; app.numeros = !app.numeros; quadro(app); return app.numeros;
  };
  window.bfPes3dReenquadrar = function () {
    if (app) { app.dist = app.fit; app.target.copy(app.home); camera(app); }
  };
  function zoom(st, passo) {
    st.dist = Math.max(st.fit*.30,Math.min(st.fit*2,st.dist*passo));
    camera(st);
  }
  window.bfPes3dZoom = function (inward) { if (app) zoom(app,inward ? .82 : 1.22); };
  function tocar(st,e) {
    if (!st.cb) return;
    var r = st.el.getBoundingClientRect();
    st.ray.setFromCamera({x:(e.clientX-r.left)/r.width*2-1,y:1-(e.clientY-r.top)/r.height*2},st.cam);
    var hit = st.ray.intersectObject(st.mesh,false)[0];
    var pin = st.ray.intersectObjects(st.pins,false)[0];
    if (pin && (!hit || pin.distance < hit.distance+.8)) return st.cb({pino:pin.object.userData.id});
    if (!hit) return;
    var local = st.group.worldToLocal(hit.point.clone()), n = hit.normal || hit.face.normal;
    var reg = regiao(local,n);
    st.cb({regiao:reg,x:+local.x.toFixed(2),y:+local.y.toFixed(2),z:+local.z.toFixed(2)});
  }
  function eventos(st) {
    var el = st.el, ctrl = st.ctrl = new AbortController(), c = {signal:ctrl.signal};
    function dist(a,b) { return Math.hypot(a.x-b.x,a.y-b.y); }
    var pts = new Map(), moved = 0, varios = false;
    el.addEventListener('pointerdown',function (e) {
      if (e.button !== 0 && e.button !== 1) return;
      if (!pts.size) { moved = 0; varios = false; }
      pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if (pts.size > 1) varios = true;
      el.setPointerCapture(e.pointerId); el.style.cursor = 'grabbing';
    },c);
    el.addEventListener('pointermove',function (e) {
      var a = pts.get(e.pointerId); if (!a) return;
      var b = {x:e.clientX,y:e.clientY}, d = dist(a,b);
      pts.set(e.pointerId,b); moved += d;
      if (pts.size > 1) {
        var other = Array.from(pts.entries()).find(function (x) { return x[0] !== e.pointerId; })[1];
        if (dist(other,b) > 12 && dist(other,a) > 12) zoom(st,dist(other,a)/dist(other,b));
      } else if (moved > 6 && !varios) {
        var dx=b.x-a.x,dy=b.y-a.y;
        if (st.modo === 'mover' || e.shiftKey || e.buttons === 4) {
          var k = st.dist*.002, T = st.data.T;
          st.target.add(new T.Vector3(-dx*k,dy*k,0).applyQuaternion(st.cam.quaternion));
          st.target.clampLength(0,340);
        } else {
          st.az -= dx*.009; st.elv = Math.max(-Math.PI/2,Math.min(Math.PI/2,st.elv+dy*.009)); st.vista = '';
        }
        camera(st);
      }
    },c);
    function fim(e) {
      if (!pts.delete(e.pointerId)) return;
      if (!pts.size) {
        el.style.cursor = 'grab';
        if (e.type === 'pointerup' && !varios && moved <= 6 && e.button === 0) tocar(st,e);
      }
    }
    ['pointerup','pointercancel','lostpointercapture'].forEach(function (x) { el.addEventListener(x,fim,c); });
    el.addEventListener('wheel',function (e) { e.preventDefault(); zoom(st,e.deltaY < 0 ? .9 : 1.1); },{signal:ctrl.signal,passive:false});
    el.addEventListener('keydown',function (e) {
      if (e.key === '+' || e.key === '=') zoom(st,.85);
      else if (e.key === '-') zoom(st,1.18);
      else if (e.key === 'Home') ajuste(st,'dorsal');
      else if (/^Arrow/.test(e.key)) {
        st.vista = '';
        var step = Math.PI/12;
        if (e.key === 'ArrowLeft') st.az += step;
        if (e.key === 'ArrowRight') st.az -= step;
        if (e.key === 'ArrowUp') st.elv = Math.min(Math.PI/2,st.elv+step);
        if (e.key === 'ArrowDown') st.elv = Math.max(-Math.PI/2,st.elv-step);
        camera(st);
      } else return;
      e.preventDefault();
    },c);
    el.addEventListener('webglcontextlost',function (e) {
      e.preventDefault();
      var box = st.box, onError = st.onError;
      window.bfPes3dDestruir();
      if (box.isConnected && onError) onError();
    },c);
  }
  function resize(st) {
    var w = st.box.clientWidth || 320, h = Math.round(Math.max(280,Math.min(540,w*.99)));
    st.cam.aspect = w/h;
    st.cam.updateProjectionMatrix();
    var a = st.cam.fov*Math.PI/360;
    var b = Math.atan(Math.tan(a)*Math.min(1,w/h));
    var prev = st.fit;
    st.fit = st.data.geo.boundingSphere.radius/Math.sin(b)*1.03;
    st.dist = prev ? st.dist*st.fit/prev : st.fit;
    st.renderer.setSize(w,h,false); st.el.style.height = h+'px';
    camera(st);
  }
  window.bfPes3dMontar = function (box,opts) {
    window.bfPes3dDestruir();
    var seq = geracao;
    return carregar().then(function (d) {
      if (seq !== geracao || !box.isConnected) return false;
      var T=d.T, scene=new T.Scene(), cam=new T.PerspectiveCamera(36,1,3,2200);
      var renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
      renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
      renderer.outputColorSpace = T.SRGBColorSpace;
      var el=renderer.domElement; el.tabIndex=0;
      el.setAttribute('aria-label','Modelo 3D do pé. Gire com as setas, amplie com mais e reduza com menos.');
      el.style.cssText='width:100%;display:block;touch-action:none;cursor:grab';
      var group = new T.Group(), mesh = new T.Mesh(d.geo,new T.MeshStandardMaterial({
        color:0xffffff,vertexColors:true,roughness:.7,metalness:0
      }));
      // Microvariação do sombreado em coordenadas da própria superfície.
      mesh.material.onBeforeCompile = function (shader) {
        shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 bfSkin;')
          .replace('#include <begin_vertex>','#include <begin_vertex>\nbfSkin = position;');
        shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 bfSkin;')
          .replace('#include <color_fragment>','#include <color_fragment>\nfloat bfGrain = fract(sin(dot(floor(bfSkin * 3.4), vec3(12.9898,78.233,39.425))) * 43758.5453);\ndiffuseColor.rgb *= 0.98 + bfGrain * 0.04;');
      };
      var unhas=new T.Mesh(d.unhas,new T.MeshStandardMaterial({vertexColors:true,roughness:.36,metalness:0,side:T.DoubleSide}));
      group.scale.x=opts.pe==='E'?-1:1; group.add(mesh,unhas); scene.add(group);
      scene.add(new T.HemisphereLight(0xfff8f1,0xdbcee0,2.00));
      var key = new T.DirectionalLight(0xfff8f0,2.10); key.position.set(-100,220,180); scene.add(key);
      var fill=new T.DirectionalLight(0xf4f7ff,.92); fill.position.set(160,-100,-110); scene.add(fill);
      var home=d.geo.boundingSphere.center.clone(); home.x*=group.scale.x;
      var st=app={data:d,scene:scene,cam:cam,group:group,mesh:mesh,renderer:renderer,el:el,box:box,
        unhas:unhas,target:home.clone(),home:home,fit:0,dist:0,az:0,elv:0,modo:'girar',left:opts.pe==='E',ray:new T.Raycaster(),
        labels:[],pins:[],numeros:true,cb:opts.aoTocar,onError:opts.aoFalhar};
      box.replaceChildren(el);
      var layer=document.createElement('div'); layer.className='bfp-3d-labels'; layer.setAttribute('aria-hidden','true'); box.appendChild(layer);
      DEDOS.forEach(function(d0,i) {
        var node=document.createElement('span');
        node.textContent=String(i+1); layer.appendChild(node);
        var v=nearest(d,'u'+(i+1));
        if (v) st.labels.push({el:node,p:v.p.clone().addScaledVector(v.n,1),n:v.n});
        else node.hidden=true;
      });
      (opts.pontos||[]).forEach(function (p) {
        var exact=p.malha===MALHA && [p.x,p.y,p.z].every(Number.isFinite);
        // Coordenadas de outra malha nunca são tratadas como exatas no modelo novo.
        var v=exact ? {p:new T.Vector3(p.x,p.y,p.z),n:null} : nearest(d,p.regiao);
        if (!v) return;
        var peg=new T.Mesh(new T.SphereGeometry(exact?2.65:2.1,14,12),new T.MeshBasicMaterial({color:p.cor||0x5144ff}));
        peg.position.copy(v.p);
        if (v.n) peg.position.addScaledVector(v.n,.8);
        peg.userData.id=p.id; group.add(peg); st.pins.push(peg);
      });
      resize(st); ajuste(st,opts.angulo || 'dorsal');
      if (opts.foco) {
        var foco=st.pins.find(function (x) { return x.userData.id===opts.foco; });
        if (foco) {
          st.target.lerp(foco.position.clone().applyMatrix4(group.matrixWorld),.54);
          st.dist*=.73; camera(st);
        }
      }
      eventos(st);
      st.ro = new ResizeObserver(function () { if (app===st && box.isConnected) resize(st); });
      st.ro.observe(box);
      return true;
    });
  };
  window.bfPes3dDestruir = function () {
    geracao++;
    if (!app) return;
    var st=app; app=null;
    if (st.frame) cancelAnimationFrame(st.frame);
    if (st.ro) st.ro.disconnect();
    if (st.ctrl) st.ctrl.abort();
    st.pins.forEach(function (p) { p.geometry.dispose(); p.material.dispose(); });
    st.mesh.material.dispose(); st.unhas.material.dispose();
    st.renderer.dispose(); st.renderer.forceContextLoss();
  };
})();
