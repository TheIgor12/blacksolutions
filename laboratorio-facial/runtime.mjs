// Detector fixado em 0.10.21. Os binários gzip são arquivos estáticos (não dependem
// de Content-Encoding). As imagens do ensaio não saem do navegador.
import {FaceLandmarker,FilesetResolver} from './vendor/vision_bundle.mjs';
async function readPacked(path,limit,digest){
 const res=await fetch(new URL(path,import.meta.url),{cache:'no-store'});
 if(!res.ok||!res.body)throw Error('Recurso indisponível.');
 const reader=res.body.pipeThrough(new DecompressionStream('gzip')).getReader();
 const bytes=new Uint8Array(limit);let offset=0;
 try{
  while(true){const {value,done}=await reader.read();if(done)break;
   if(offset+value.length>limit)throw Error('Recurso maior que o esperado.');
   bytes.set(value,offset);offset+=value.length;}
 }finally{await reader.cancel();}
 if(offset!==limit)throw Error('Recurso incompleto.');
 const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
 if([...hash].map(x=>x.toString(16).padStart(2,'0')).join('')!==digest)throw Error('Recurso alterado.');
 return bytes;
}
export async function openDetector(){
 const prefix=new URL('./vendor/wasm',import.meta.url).href;
 const files=await FilesetResolver.forVisionTasks(prefix);
 const simd=files.wasmBinaryPath.endsWith('/vision_wasm_internal.wasm');
 const known=simd?['vision_wasm_internal.wasm',9574032,'f00ec4731faa23b3e714d00e88d4d10e2df5c0a427d3a2b4ae6e3526fdd14ef7']:['vision_wasm_nosimd_internal.wasm',9448638,'3821ea9b1f7fb8c549ef2a064ef5c85750bf375c545a49fd6eea0df44a95f1f4'];
 if(!files.wasmBinaryPath.endsWith('/'+known[0]))throw Error('Compilador não reconhecido.');
 const [wasm,model]=await Promise.all([
  readPacked('./vendor/wasm/'+known[0]+'.gz',known[1],known[2]),
  readPacked('./vendor/face_landmarker.task.gz',3758596,'64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff')
 ]);
 const url=URL.createObjectURL(new Blob([wasm],{type:'application/wasm'}));
 try{return await FaceLandmarker.createFromOptions({...files,wasmBinaryPath:url},{
  baseOptions:{modelAssetBuffer:model,delegate:'CPU'},runningMode:'IMAGE',
  numFaces:2,minFaceDetectionConfidence:.5,minFacePresenceConfidence:.5});
 }finally{URL.revokeObjectURL(url);}
}
