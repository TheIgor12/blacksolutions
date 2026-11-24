const {chromium}=require('playwright');
const fs=require('fs');
const VIEWS=[
 {k:'dorsal',  dir:[0,1,0],   up:[0,0,1],  w:620, h:1240},
 {k:'plantar', dir:[0,-1,0],  up:[0,0,1],  w:620, h:1240},
 {k:'lateral', dir:[1,0,0],   up:[0,1,0],  w:1240,h:620},
 {k:'medial',  dir:[-1,0,0],  up:[0,1,0],  w:1240,h:620},
 {k:'dedos',   dir:[0,0,1],   up:[0,1,0],  w:900, h:760},
 {k:'calcanhar',dir:[0,0,-1], up:[0,1,0],  w:760, h:900}
];
(async()=>{
const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const pg=await b.newPage({viewport:{width:1400,height:1400},deviceScaleFactor:1});
pg.on('pageerror',e=>console.log('ERRO:',e.message));
await pg.goto('http://127.0.0.1:8099/_gerar.html',{waitUntil:'load'});
await pg.waitForFunction(()=>window.pronto&&window.bfPeMalha,{timeout:30000});
const saida={};
for(const v of VIEWS){
 const r=await pg.evaluate(async (v)=>{
  const T=window.THREE, d=window.bfPeMalha();
  const cena=new T.Scene();
  // geometria do corpo
  const geo=new T.BufferGeometry();
  geo.setAttribute('position',new T.Float32BufferAttribute(d.pos,3));
  geo.setIndex(d.idx); geo.computeVertexNormals();
  const uv=[];
  for(let i=0;i<d.pos.length;i+=3)uv.push((Math.atan2(d.pos[i],d.pos[i+1]-25)/(Math.PI*2))+0.5,d.pos[i+2]/260);
  geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  // texturas
  const chapa=n=>{const c=document.createElement('canvas');c.width=c.height=n;return {c,g:c.getContext('2d')}};
  const q=chapa(1024),g=q.g;
  g.fillStyle='#eecaae';g.fillRect(0,0,1024,1024);
  for(let i=0;i<900;i++){const x=Math.random()*1024,y=Math.random()*1024,rr=40+Math.random()*160;
   const gr=g.createRadialGradient(x,y,0,x,y,rr);
   gr.addColorStop(0,Math.random()>0.5?'rgba(250,222,203,0.14)':'rgba(214,166,140,0.11)');
   gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.beginPath();g.arc(x,y,rr,0,6.283);g.fill();}
  const im=g.getImageData(0,0,1024,1024),dd=im.data;
  for(let i=0;i<dd.length;i+=4){const n=(Math.random()-0.5)*8;dd[i]+=n;dd[i+1]+=n*0.9;dd[i+2]+=n*0.8;}
  g.putImageData(im,0,0);
  const tp=new T.CanvasTexture(q.c);tp.wrapS=tp.wrapT=T.RepeatWrapping;tp.repeat.set(6,6);
  const q2=chapa(1024),g2=q2.g;
  g2.fillStyle='#808080';g2.fillRect(0,0,1024,1024);g2.lineWidth=1.2;
  for(let i=0;i<5200;i++){const x=Math.random()*1024,y=Math.random()*1024,a=Math.random()*Math.PI,c=8+Math.random()*30;
   g2.strokeStyle=Math.random()>0.5?'rgba(255,255,255,0.30)':'rgba(0,0,0,0.26)';
   g2.beginPath();g2.moveTo(x,y);g2.lineTo(x+Math.cos(a)*c,y+Math.sin(a)*c);g2.stroke();}
  const tb=new T.CanvasTexture(q2.c);tb.wrapS=tb.wrapT=T.RepeatWrapping;tb.repeat.set(8,8);
  // sem textura chapada: de frente ela vira mancha e denuncia a malha.
  const pele=new T.MeshStandardMaterial({color:0xe7bda1,roughness:0.88,metalness:0,flatShading:false,side:T.DoubleSide});
  const corpo=new T.Mesh(geo,pele); cena.add(corpo);
  // unhas
  const gu=new T.BufferGeometry();
  gu.setAttribute('position',new T.Float32BufferAttribute(d.unhas.pos,3));
  gu.setIndex(d.unhas.idx); gu.computeVertexNormals();
  const unha=new T.Mesh(gu,new T.MeshStandardMaterial({color:0xf7e9dd,roughness:0.22,metalness:0.02,side:T.DoubleSide}));
  cena.add(unha);
  // luz
  // Luz presa à direção da câmera, com uma lateral forte: de frente, luz
  // chapada apaga o relevo e o pé vira silhueta.
  const dv=new T.Vector3(v.dir[0],v.dir[1],v.dir[2]).normalize();
  const upv=new T.Vector3(v.up[0],v.up[1],v.up[2]).normalize();
  const lado=new T.Vector3().crossVectors(dv,upv).normalize();
  cena.add(new T.HemisphereLight(0xfff6ef,0x9f8c80,0.72));
  const key=new T.DirectionalLight(0xfff2e6,1.25);
  key.position.copy(dv.clone().multiplyScalar(300).add(lado.clone().multiplyScalar(-260)).add(upv.clone().multiplyScalar(220)));
  cena.add(key);
  const fill=new T.DirectionalLight(0xe8eeff,0.55);
  fill.position.copy(dv.clone().multiplyScalar(260).add(lado.clone().multiplyScalar(300)).add(upv.clone().multiplyScalar(-120)));
  cena.add(fill);
  const rim=new T.DirectionalLight(0xffffff,0.75);
  rim.position.copy(dv.clone().multiplyScalar(-220).add(upv.clone().multiplyScalar(180)));
  cena.add(rim);
  // camera ortografica, enquadrando a malha
  geo.computeBoundingBox();
  const bb=geo.boundingBox.clone(); bb.expandByPoint(new T.Vector3(bb.min.x,bb.min.y,bb.min.z));
  const centro=new T.Vector3(); bb.getCenter(centro);
  const tam=new T.Vector3(); bb.getSize(tam);
  const dir=new T.Vector3(v.dir[0],v.dir[1],v.dir[2]).normalize();
  const up=new T.Vector3(v.up[0],v.up[1],v.up[2]);
  const raio=Math.max(tam.x,tam.y,tam.z);
  const cam=new T.OrthographicCamera(-1,1,1,-1,0.1,4000);
  cam.up.copy(up);
  cam.position.copy(centro.clone().add(dir.clone().multiplyScalar(raio*3)));
  cam.lookAt(centro);
  cam.updateMatrixWorld(true);
  // mede a projecao de todos os vertices para enquadrar justo
  let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
  const tmp=new T.Vector3();
  const todos=[d.pos,d.unhas.pos];
  cam.left=-raio;cam.right=raio;cam.top=raio;cam.bottom=-raio;cam.updateProjectionMatrix();cam.updateMatrixWorld(true);
  for(const arr of todos)for(let i=0;i<arr.length;i+=3){
   tmp.set(arr[i],arr[i+1],arr[i+2]).project(cam);
   if(tmp.x<x0)x0=tmp.x; if(tmp.x>x1)x1=tmp.x; if(tmp.y<y0)y0=tmp.y; if(tmp.y>y1)y1=tmp.y;}
  const cx=(x0+x1)/2, cy=(y0+y1)/2;
  const meiaL=(x1-x0)/2*1.10, meiaA=(y1-y0)/2*1.10;
  const aspecto=v.w/v.h;
  let L=meiaL, A=meiaA;
  if(L/A<aspecto)L=A*aspecto; else A=L/aspecto;
  cam.left=(cx-L)*raio; cam.right=(cx+L)*raio; cam.top=(cy+A)*raio; cam.bottom=(cy-A)*raio;
  cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);
  // render bonito
  const rend=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
  rend.setPixelRatio(1); rend.setSize(v.w,v.h);
  rend.render(cena,cam);
  const beleza=rend.domElement.toDataURL('image/png');
  // mapa de regioes: cor chapada por regiao, sem luz
  const paleta={}, nomes=[];
  const cores=[];
  const regs=d.reg, cor=new Float32Array(d.pos.length);
  function corDe(nome){
   if(paleta[nome]===undefined){const i=nomes.length;nomes.push(nome);paleta[nome]=i;}
   const i=paleta[nome]+1; // 0 fica para o fundo
   return [((i*37)%250+5)/255, ((i*91)%250+5)/255, ((i*151)%250+5)/255];
  }
  for(let i=0;i<regs.length;i++){const c=corDe(regs[i]);cor[i*3]=c[0];cor[i*3+1]=c[1];cor[i*3+2]=c[2];}
  const geoM=geo.clone(); geoM.setAttribute('color',new T.Float32BufferAttribute(cor,3));
  const corpoM=new T.Mesh(geoM,new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide}));
  const corU=new Float32Array(d.unhas.pos.length);
  for(let i=0;i<d.unhas.reg.length;i++){const c=corDe(d.unhas.reg[i]);corU[i*3]=c[0];corU[i*3+1]=c[1];corU[i*3+2]=c[2];}
  const geoU=gu.clone(); geoU.setAttribute('color',new T.Float32BufferAttribute(corU,3));
  const unhaM=new T.Mesh(geoU,new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide}));
  const cenaM=new T.Scene(); cenaM.background=new T.Color(0x000000);
  cenaM.add(corpoM); cenaM.add(unhaM);
  const rendM=new T.WebGLRenderer({antialias:false,preserveDrawingBuffer:true});
  // Sem conversao de cor na saida: o byte que entra e o byte que sai, senao a
  // tabela de cor por regiao nao bate com o pixel gravado no arquivo.
  rendM.outputColorSpace=T.LinearSRGBColorSpace;
  rendM.setPixelRatio(1); rendM.setSize(Math.round(v.w/3),Math.round(v.h/3));
  rendM.render(cenaM,cam);
  const mapa=rendM.domElement.toDataURL('image/png');
  // centroides projetados, na escala do viewBox (w/10 x h/10)
  const soma={};
  function acumula(arr,regs2){
   for(let i=0;i<arr.length;i+=3){
    tmp.set(arr[i],arr[i+1],arr[i+2]).project(cam);
    const px=(tmp.x+1)/2*v.w/10, py=(1-(tmp.y+1)/2)*v.h/10;
    const r=regs2[i/3]; if(!r)continue;
    if(!soma[r])soma[r]={x:0,y:0,n:0};
    soma[r].x+=px; soma[r].y+=py; soma[r].n++;
   }}
  acumula(d.pos,regs); acumula(d.unhas.pos,d.unhas.reg);
  const centros={};
  Object.keys(soma).forEach(k=>{centros[k]=[Math.round(soma[k].x*10)/10,Math.round(soma[k].y*10)/10]});
  // A tabela sai dos pixels que o renderizador realmente escreveu, e nao da
  // formula: o three converte cor para sRGB na saida, e a conta nao bate.
  const ctxM=rendM.domElement.getContext('webgl2')||rendM.domElement.getContext('webgl');
  const cnv=document.createElement('canvas');
  cnv.width=rendM.domElement.width; cnv.height=rendM.domElement.height;
  const g3=cnv.getContext('2d'); g3.drawImage(rendM.domElement,0,0);
  const pix=g3.getImageData(0,0,cnv.width,cnv.height);
  const tabela={};
  function leCor(px,py){
   for(let raio=0;raio<=6;raio++){
    for(let dx=-raio;dx<=raio;dx++)for(let dy=-raio;dy<=raio;dy++){
     const ax=px+dx, ay=py+dy;
     if(ax<0||ay<0||ax>=cnv.width||ay>=cnv.height)continue;
     const i=(ay*cnv.width+ax)*4, d=pix.data;
     if(d[i]+d[i+1]+d[i+2]>12)return d[i]+','+d[i+1]+','+d[i+2];
    }}
   return null;
  }
  // A cor de cada regiao e a que foi alimentada, agora que a saida e linear.
  nomes.forEach((n,i)=>{const j=i+1;tabela[((j*37)%250+5)+','+((j*91)%250+5)+','+((j*151)%250+5)]=n});
  // Confere contra o arquivo: quantas dessas cores existem mesmo na imagem.
  const vistas2={};
  for(let i=0;i<pix.data.length;i+=4){const d=pix.data;
   if(d[i]+d[i+1]+d[i+2]<=12)continue;
   vistas2[d[i]+','+d[i+1]+','+d[i+2]]=1;}
  const batem=Object.keys(tabela).filter(c=>vistas2[c]).length;
  window.__conf=(window.__conf||[]).concat([v.k+': '+batem+' de '+Object.keys(tabela).length+' cores conferidas no arquivo']);
  rend.dispose(); rendM.dispose();
  return {beleza,mapa,centros,tabela,conf:(window.__conf||[]).slice(-1)[0],vb:'0 0 '+(v.w/10)+' '+(v.h/10)};
 },v);
 const b64=s=>Buffer.from(s.split(',')[1],'base64');
 fs.writeFileSync('/home/claude/blacksolutions/pes/'+v.k+'.png',b64(r.beleza));
 fs.writeFileSync('/home/claude/blacksolutions/pes/mapa-'+v.k+'.png',b64(r.mapa));
 saida[v.k]={vb:r.vb,centros:r.centros,tabela:r.tabela,w:v.w,h:v.h};
 console.log(v.k,'| centroides:',Object.keys(r.centros).length,'|',r.conf);
}
fs.writeFileSync('/home/claude/blacksolutions/pes/vistas.json',JSON.stringify(saida));
await b.close();
})();
