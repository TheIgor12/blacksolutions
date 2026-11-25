const MAGIC=[137,80,78,71,13,10,26,10];
const MAX=12*1024*1024;
const crcTable=Uint32Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=(c&1?0xedb88320:0)^(c>>>1);return c>>>0;});
const crc=(b,start,end)=>{let c=0xffffffff;for(let i=start;i<end;i++)c=crcTable[(c^b[i])&255]^(c>>>8);return (c^0xffffffff)>>>0;};
export const maxPngBytes=MAX;
export function parsePng(b,{removeAux=false}={}){
 if(!(b instanceof Uint8Array)||b.byteLength<57||b.byteLength>MAX||!MAGIC.every((x,i)=>x===b[i]))throw Error('PNG inválido');
 const d=new DataView(b.buffer,b.byteOffset,b.byteLength), chunks=[], idat=[];
 let i=8,w=0,h=0,channels=0,end=false,afterData=false;
 while(i+12<=b.length){
  const n=d.getUint32(i),start=i+8,last=start+n, type=String.fromCharCode(...b.subarray(i+4,i+8));
  if(last+4>b.length||crc(b,i+4,last)!==d.getUint32(last))throw Error('PNG alterado');
  if(i===8){
   if(type!=='IHDR'||n!==13)throw Error('Cabeçalho PNG inválido');
   w=d.getUint32(start);h=d.getUint32(start+4);
   channels={2:3,6:4}[b[start+9]]||0;
   if(!w||w>1600||!h||h>1600||b[start+8]!==8||!channels||b[start+10]||b[start+11]||b[start+12])throw Error('Formato PNG não normalizado');
   chunks.push(b.subarray(i,last+4));
  }else if(type==='IDAT'&&!afterData){
    if(n)idat.push(b.subarray(start,last));
    chunks.push(b.subarray(i,last+4));
  }else if(type==='IEND'&&n===0&&idat.length&&last+4===b.length){
    chunks.push(b.subarray(i,last+4));end=true;break;
  }else if(removeAux&&/^[a-z][A-Za-z]{3}$/.test(type)){
    if(idat.length)afterData=true;
  }else throw Error('PNG contém dados extras');
  i=last+4;
 }
 if(!end)throw Error('PNG incompleto');
 return {w,h,channels,chunks,idat};
}
export function cleanPng(b){
 const {chunks}=parsePng(b,{removeAux:true});
 const out=new Uint8Array(8+chunks.reduce((a,c)=>a+c.length,0));out.set(MAGIC);let i=8;
 for(const c of chunks){out.set(c,i);i+=c.length;}return out;
}
export async function verifyPng(b){
 const p=parsePng(b), row=1+p.w*p.channels, expected=row*p.h;
 const z=new Blob(p.idat).stream().pipeThrough(new DecompressionStream('deflate')).getReader();
 let m=0;
 try{
  while(true){
   const {done,value:v}=await z.read();if(done)break;
   if(m+v.length>expected)throw Error('Bitmap fora do limite');
   for(let j=(row-m%row)%row;j<v.length;j+=row)if(v[j]>4)throw Error('Linha PNG inválida');
   m+=v.length;
  }
  if(m!==expected)throw Error('Bitmap incompleto');
 }finally{await z.cancel().catch(()=>{});}
 return {w:p.w,h:p.h};
}
export const sha256=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),n=>n.toString(16).padStart(2,'0')).join('');
