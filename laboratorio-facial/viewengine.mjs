// Ensaio visual em rostos fictícios. Não diagnostica, não indica aplicação,
// dose, técnica ou resultado. Nenhum armazenamento, câmera ou envio.
import {makeInverseRigidMLS, STEP} from './rigid-mls.mjs';
const VS=`#version 300 es
precision highp float;
layout(location=0) in vec2 xy;
layout(location=1) in vec2 sampled;
out vec2 uv;
out vec2 dst;
void main(){dst=xy;uv=sampled;gl_Position=vec4(xy.x*2.-1.,1.-xy.y*2.,0.,1.);}`;
const FS=`#version 300 es
precision highp float;
in vec2 uv;in vec2 dst;
out vec4 color;
uniform sampler2D baseTex,lowTex,wideTex;
uniform vec2 sz, center, radius, sulco, wrad;
uniform vec2 e1,e2, lip;
uniform vec2 browRad,lipRad;
uniform float vol, atten;
float ellipse(vec2 p,vec2 origin,vec2 r){
 return length((p-origin)/max(r,vec2(1.)));
}
vec3 softlight(vec3 a,vec3 b){
 vec3 dark=a-(1.-2.*b)*a*(1.-a);
 vec3 curve=mix(((16.*a-12.)*a+4.)*a,sqrt(max(a,0.)),step(vec3(.25),a));
 vec3 light=a+(2.*b-1.)*(curve-a);
 return mix(dark,light,step(vec3(.5),b));
}
void main(){
 vec3 I=texture(baseTex,uv).rgb;vec3 B=texture(lowTex,uv).rgb;vec3 wide=texture(wideTex,uv).rgb;
 vec2 p=dst*sz;
 float u=ellipse(p,sulco,wrad);
 float safe=1.;
 safe*=smoothstep(.91,1.12,ellipse(p,e1,browRad));
 safe*=smoothstep(.91,1.12,ellipse(p,e2,browRad));
 safe*=smoothstep(.91,1.12,ellipse(p,lip,lipRad));
 float m=(1.-smoothstep(.72,1.,u))*safe;
 float k=min(.8,atten)*m;
 // H encodes original high frequencies. Keep source exactly outside the mask.
 vec3 outColor=clamp(mix(B,wide,k*.5)+(I-B)*(1.-k),0.,1.);
 float hi=max(0.,1.-ellipse(p,center,radius*.25));
 vec2 shadowC=center+vec2(0.,radius.y*.62);
 float shadow=max(0.,1.-ellipse(p,shadowC,vec2(radius.x*.77,radius.y*.15)));
 vec3 tone=outColor;
 vec3 brighter=clamp(tone*1.12,vec3(.004),vec3(.996));
 vec3 darker=clamp(tone*.88,vec3(.004),vec3(.996));
 outColor=mix(outColor,softlight(outColor,brighter),min(.12,hi*vol*.12));
 outColor=mix(outColor,softlight(outColor,darker),min(.10,shadow*vol*.10));
 color=vec4(outColor,1.);
}`;
const clamp=(x,min,max)=>Math.min(max,Math.max(min,x));
const norm=(x)=>clamp(Number(x)||0,0,100)/100;
function compile(g,kind,src){const a=g.createShader(kind);g.shaderSource(a,src);g.compileShader(a);if(!g.getShaderParameter(a,g.COMPILE_STATUS))throw Error('Não foi possível preparar o shader de ensaio');return a;}
function controlsFor(w,h,region,intensity){
 const vals=[]; const step=80;
 for(let i=0;i<=w;i+=step)for(const y of [0,h])vals.push({original:[i,y],deformed:[i,y]});
 for(let j=step;j<h;j+=step)for(const x of [0,w])vals.push({original:[x,j],deformed:[x,j]});
 vals.push({original:[w,0],deformed:[w,0]},{original:[w,h],deformed:[w,h]});
 const {center,radius,iris}=region;
 for(let i=0;i<8;i++){
  const a=i*Math.PI/4,c=Math.cos(a),s=Math.sin(a);
  const q=[center[0]+c*radius[0]*.55,center[1]+s*radius[1]*.55];
  const deformed=[q[0]+c*iris*.028*intensity,q[1]+s*iris*.028*intensity];
  vals.push({original:q,deformed});
  const p=[center[0]+c*radius[0],center[1]+s*radius[1]];
  vals.push({original:p,deformed:p});
 }
 return vals;
}
export function regions(pts,w,h){
 if(pts.length!==478)throw Error('A bancada requer 478 pontos');
 const P=i=>[pts[i].x*w,pts[i].y*h];
 const avg=(...a)=>a[0].map((_,i)=>a.reduce((n,p)=>n+p[i],0)/a.length);
 const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
 const eyes=[P(468),P(473)],iris=dist(...eyes),mouth=avg(P(13),P(14)),faceW=dist(P(234),P(454));
 if(iris<10||faceW<iris||!Number.isFinite(faceW))throw Error('Escala do retrato insuficiente');
 const e1=avg(P(468),P(105)),e2=avg(P(473),P(334));
 return {center:avg(P(50),P(101)),radius:[iris*.38,iris*.34],sulco:avg(P(10),P(151),P(9)),wrad:[iris*.45,iris*.15],e1,e2,
  browRad:[iris*.26,iris*.20],lip:mouth,lipRad:[dist(P(61),P(291))*.58,iris*.15],iris,faceW};
}
export function renderFixture(source, visible, initPts){
 const vw=source.naturalWidth,vh=source.naturalHeight;
 const canvas=document.createElement('canvas');canvas.width=vw;canvas.height=vh;
 const g=canvas.getContext('webgl2',{alpha:false,antialias:false,preserveDrawingBuffer:false});
 if(!g)throw Error('WebGL indisponível');
 visible.width=vw;visible.height=vh;
 const ctx=visible.getContext('2d',{alpha:false});
 const p=g.createProgram();g.attachShader(p,compile(g,g.VERTEX_SHADER,VS));g.attachShader(p,compile(g,g.FRAGMENT_SHADER,FS));g.linkProgram(p);
 if(!g.getProgramParameter(p,g.LINK_STATUS))throw Error('Malha de ensaio indisponível');g.useProgram(p);
 const U=x=>g.getUniformLocation(p,x);
 const un=Object.fromEntries(['baseTex','lowTex','wideTex','sz','center','radius','sulco','wrad','e1','e2','lip','browRad','lipRad','vol','atten'].map(k=>[k,U(k)]));
 const config0=regions(initPts,vw,vh),temp=document.createElement('canvas');temp.width=vw;temp.height=vh;
 const c=temp.getContext('2d',{alpha:false});
 const addTex=(index,element)=>{
  const t=g.createTexture();g.activeTexture(g.TEXTURE0+index);g.bindTexture(g.TEXTURE_2D,t);
  g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);
  g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);
  g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,element);
  return t;
 };
 const blur=(input,sigma)=>{c.filter='none';c.fillStyle='#727272';c.fillRect(0,0,vw,vh);c.filter='blur('+sigma.toFixed(2)+'px)';c.drawImage(input,0,0);c.filter='none';};
 const r=config0.faceW*.02;
 const tx0=addTex(0,source);
 blur(source,r);
 const tx1=addTex(1,temp);
 const clone=document.createElement('canvas');clone.width=vw;clone.height=vh;clone.getContext('2d').drawImage(temp,0,0);
 blur(clone,3*r);
 const tx2=addTex(2,temp);
 g.uniform1i(un.baseTex,0);g.uniform1i(un.lowTex,1);g.uniform1i(un.wideTex,2);g.uniform2f(un.sz,vw,vh);
 const nX=Math.ceil(vw/STEP)+1,nY=Math.ceil(vh/STEP)+1;
 const v=new Float32Array(nX*nY*4),index=new Uint32Array((nX-1)*(nY-1)*6);
 for(let y=0,i=0;y<nY;y++)for(let x=0;x<nX;x++,i+=4){v[i]=Math.min(vw,x*STEP)/vw;v[i+1]=Math.min(vh,y*STEP)/vh;}
 for(let y=0,i=0;y<nY-1;y++)for(let x=0;x<nX-1;x++,i+=6){const j=y*nX+x;index.set([j,j+1,j+nX,j+1,j+nX+1,j+nX],i);}
 const vao=g.createVertexArray();g.bindVertexArray(vao);
 const vb=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,vb);
 g.vertexAttribPointer(0,2,g.FLOAT,false,16,0);g.enableVertexAttribArray(0);
 g.vertexAttribPointer(1,2,g.FLOAT,false,16,8);g.enableVertexAttribArray(1);
 const ib=g.createBuffer();g.bindBuffer(g.ELEMENT_ARRAY_BUFFER,ib);g.bufferData(g.ELEMENT_ARRAY_BUFFER,index,g.STATIC_DRAW);
 let config=config0,lastV=-1;
 function draw(volume, attenuation){
  if(g.isContextLost())throw Error('WebGL indisponível');
  const mark=performance.now(),a=norm(volume),k=norm(attenuation)*.8;
  if(lastV!==a){
   const map=makeInverseRigidMLS(controlsFor(vw,vh,config,a));
   for(let i=0;i<v.length;i+=4){
    const x=v[i]*vw,y=v[i+1]*vh;
    const near=a!==0&&x>1e-4&&y>1e-4&&x<vw-1e-4&&y<vh-1e-4&&Math.hypot((x-config.center[0])/config.radius[0],(y-config.center[1])/config.radius[1])<1.35;
    const s=near?map(x,y):[x,y];
    v[i+2]=clamp(s[0]/vw,0,1);v[i+3]=clamp(s[1]/vh,0,1);
   }
   g.bindBuffer(g.ARRAY_BUFFER,vb);g.bufferData(g.ARRAY_BUFFER,v,g.DYNAMIC_DRAW);lastV=a;
  }
  for(const tag of ['center','radius','sulco','wrad','e1','e2','lip','browRad','lipRad'])g.uniform2f(un[tag],...config[tag]);
  g.uniform1f(un.vol,a);g.uniform1f(un.atten,k);g.viewport(0,0,vw,vh);g.drawElements(g.TRIANGLES,index.length,g.UNSIGNED_INT,0);
  ctx.drawImage(canvas,0,0);
  ctx.save();ctx.translate(vw/2,vh/2);ctx.rotate(-.43);ctx.textAlign='center';ctx.fillStyle='rgba(51,23,86,.13)';ctx.fillRect(-vw,-13,vw*2,26);
  ctx.fillStyle='rgba(60,30,90,.7)';ctx.font='bold 16px sans-serif';ctx.fillText('ENSAIO ILUSTRATIVO',0,6);ctx.restore();
  ctx.fillStyle='#2e2149';ctx.fillRect(0,vh-27,vw,27);
  ctx.fillStyle='white';ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillText('Simulação ilustrativa. Não é promessa de resultado.',vw/2,vh-9);
  return performance.now()-mark;
 }
 return {draw,update(pts){config=regions(pts,vw,vh);lastV=-1;},dispose(){g.deleteBuffer(vb);g.deleteBuffer(ib);g.deleteVertexArray(vao);for(const t of [tx0,tx1,tx2])g.deleteTexture(t);g.deleteProgram(p);g.getExtension('WEBGL_lose_context')?.loseContext();}};
}
