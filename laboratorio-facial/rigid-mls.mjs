// Inverse rigid MLS for synthetic lab figures only. Coordinates are [x,y] in pixels.
// Querying a deformed location returns the corresponding original texture location.
export const ALPHA = 1.2, STEP = 8;
const EPS = 1e-10;
const squared=(x,y)=>x*x+y*y;
const validPoint=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite);
const same=(a,b)=>a[0]===b[0]&&a[1]===b[1];
export function makeInverseRigidMLS(controls=[]){
 const pairs=[], seen=new Map();
 for (const {original, deformed} of controls){
  if(!validPoint(original)||!validPoint(deformed))throw new TypeError('Control coordinates must be finite pairs');
  const key=deformed.join(',');
  if(seen.has(key)){
   if(!same(seen.get(key),original))throw new RangeError('Conflicting original locations for one deformed control');
   continue;
  }
  const p=deformed.slice(),q=original.slice();seen.set(key,q);pairs.push([p,q]);
 }
 if(pairs.every(([p,q])=>same(p,q)))return (x,y)=>[x,y];
 return (x,y)=>{
  let closest=Infinity;
  const ds=pairs.map(([p])=>{const d=squared(x-p[0],y-p[1]);closest=Math.min(closest,d);return d;});
  if(closest<EPS)return pairs[ds.indexOf(closest)][1].slice();
  let px=0,py=0,qx=0,qy=0,sum=0;
  // Divide each weight by the largest weight for numerical stability.
  const w=ds.map(d=>(closest/d)**ALPHA);
  pairs.forEach(([[a,b],[c,d]],i)=>{const t=w[i];sum+=t;px+=t*a;py+=t*b;qx+=t*c;qy+=t*d;});
  px/=sum;py/=sum;qx/=sum;qy/=sum;
  let cos=0,sin=0,energy=0;
  pairs.forEach(([[a,b],[c,d]],i)=>{
   a-=px;b-=py;c-=qx;d-=qy;
   cos+=w[i]*(a*c+b*d);sin+=w[i]*(a*d-b*c);
   energy+=w[i]*Math.hypot(a,b)*Math.hypot(c,d);
  });
  const norm=Math.hypot(cos,sin),u=x-px,v=y-py;
  if(!energy||norm<=EPS*energy)return [qx+u,qy+v]; // Indeterminate rotation; use centroid translation.
  return [qx+(cos*u-sin*v)/norm,qy+(sin*u+cos*v)/norm];
 };
}

export function sampleInverseGrid(width,height,controls=[],{fixedEdge=false}={}){
 // width/height give the extents of the continuous rectangle [0,width]×[0,height].
 if(!Number.isFinite(width)||width<=0||!Number.isFinite(height)||height<=0)
  throw new RangeError('Canvas extents must be positive');
 const axis=max=>Array.from({length:Math.ceil(max/STEP)+1},(_,i)=>Math.min(max,i*STEP));
 const xs=axis(width),ys=axis(height), edge=(x,y)=>x===0||y===0||x===width||y===height;
 const unique=[], map=new Map();
 if(fixedEdge){
  for(const {original,deformed} of controls){
   if(validPoint(deformed)&&edge(...deformed)&&(!validPoint(original)||!same(original,deformed)))
    throw new RangeError('A fixed-edge control cannot change location');
  }
  for(const x of xs)for(const y of [0,height])map.set(x+','+y,[x,y]);
  for(const y of ys)for(const x of [0,width])map.set(x+','+y,[x,y]);
  for(const p of map.values())unique.push({original:p,deformed:p});
 }
 const inverse=makeInverseRigidMLS([...controls,...unique]);
 const nodes=ys.map(y=>xs.map(x=>fixedEdge&&edge(x,y)?[x,y]:inverse(x,y)));
 // Off-grid locations are continuous approximations; use the exact evaluator for exact handles.
 return {
  xCoordinates:xs.slice(),yCoordinates:ys.slice(),
  map(x,y){
   if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>width||y>height)
    throw new RangeError('Query must lie inside the sampling rectangle');
   if(fixedEdge&&edge(x,y)) return [x,y];
   const i=Math.min(xs.length-2,Math.floor(x/STEP)),j=Math.min(ys.length-2,Math.floor(y/STEP));
   const u=(x-xs[i])/(xs[i+1]-xs[i]),v=(y-ys[j])/(ys[j+1]-ys[j]);
   const a=nodes[j][i],b=nodes[j][i+1],c=nodes[j+1][i],d=nodes[j+1][i+1];
   return [0,1].map(k=>(1-v)*((1-u)*a[k]+u*b[k])+v*((1-u)*c[k]+u*d[k]));
  }
 };
}
