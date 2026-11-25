// Cópia de trabalho em memória. Não grava, não transmite e não modifica o arquivo de entrada.
const formats=new Set(['image/jpeg','image/png','image/webp']);
export async function preparePhoto(file){
 if(!file||!formats.has(file.type)||file.size<16||file.size>15*1048576)throw Error('Formato ou tamanho');
 const bytes=await file.arrayBuffer();
 const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
 const src=URL.createObjectURL(new Blob([bytes],{type:file.type}));
 let out;
 try{
  const image=new Image();image.src=src;await image.decode();
  if(!image.naturalWidth||!image.naturalHeight||image.naturalWidth*image.naturalHeight>30e6)throw Error('Dimensões');
  const ratio=Math.min(1,1600/Math.max(image.naturalWidth,image.naturalHeight));
  const c=document.createElement('canvas');c.width=Math.max(1,Math.round(ratio*image.naturalWidth));c.height=Math.max(1,Math.round(ratio*image.naturalHeight));
  const ctx=c.getContext('2d');ctx.drawImage(image,0,0,c.width,c.height);
  const clean=await new Promise(r=>c.toBlob(r,'image/png'));c.width=c.height=1;
  if(!clean)throw Error('Normalização');
  out=URL.createObjectURL(clean);const normalized=new Image();normalized.src=out;await normalized.decode();
  return {normalized,digest};
 }finally{URL.revokeObjectURL(src);if(out)URL.revokeObjectURL(out);}
}
