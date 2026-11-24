// Fonte para gerar ditado/worker-pt-br.js. O Worker nunca transmite texto.
import {loadModule} from 'hunspell-asm';
let pronto;
const glossario = new Set(['podologia','podóloga','podólogo','onicocriptose','onicomicose','onicodistrofia','hiperqueratose',
  'pododáctilo','pododáctilos','onicofose','podoprofilaxia','subungueal','periungueal','hiperqueratótica']);
const acentos = new Map([['evolussão','evolução'],['tratamneto','tratamento'],['halux','hálux'],['calcaneo','calcâneo'],['pododactilo','pododáctilo']]);
const ignorar = new Set(['sim','sem','não','nega','nenhum','nenhuma','direito','direita','esquerdo','esquerda','milímetro','milímetros']);
async function bytes(nome) {
  const r=await fetch(new URL(nome,self.location.href),{credentials:'omit',referrerPolicy:'no-referrer'});
  if(!r.ok) throw new Error('Arquivo do dicionário indisponível');
  return new Uint8Array(await r.arrayBuffer());
}
async function descompactar(partes) {
  // Sequência gzip original, dividida para versionamento; nenhuma parte é derivada de prontuários.
  const fluxo=new Blob(partes).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(fluxo).arrayBuffer());
}
function carregar() {
  if (!pronto) pronto=(async()=>{
    const [f, a, d0, d1, d2]=await Promise.all([loadModule(),...[
      'pt-br.aff.gz','pt-br.dic.gz.00','pt-br.dic.gz.01','pt-br.dic.gz.02'].map(bytes)]);
    const [aff,dic]=await Promise.all([descompactar([a]),descompactar([d0,d1,d2])]);
    const pathA=f.mountBuffer(aff,'pt-br.aff'), pathD=f.mountBuffer(dic,'pt-br.dic');
    const engine=f.create(pathA,pathD);
    // Algumas entradas-base válidas do VERO não são aceitas pela API
    // spell() sem uma flexão. Não sugerir trocar uma entrada-base válida.
    const proibida = new TextDecoder().decode(aff).match(/^FORBIDDENWORD (.+)$/m)?.[1].trim();
    const lemas=new Set();
    for(const ln of new TextDecoder().decode(dic).split(/\r?\n/)){
      const m=ln.match(/^([\p{L}\p{M}-]+)(?:\/([^\s]+))?(?:\s|$)/u);
      if(m && (!proibida || !m[2]?.includes(proibida))) lemas.add(m[1].normalize('NFC'));
    }
    const result={spell:word=>lemas.has(word)||engine.spell(word),suggest:word=>engine.suggest(word)};
    f.unmount(pathA); f.unmount(pathD);
    if(!result.spell('fissura')) throw new Error('Dicionário indisponível');
    return result;
  })().catch(e=>{pronto=null;throw e});
  return pronto;
}
self.onmessage=async({data})=>{
  const {id,texto}=data||{};
  if (!Number.isSafeInteger(id) || typeof texto!=='string') return;
  try {
    const dic=await carregar(), itens=[], cache=new Map();
    let tentativas=0;
    for(const m of texto.matchAll(/(?<![\p{L}\p{M}\p{N}_])[\p{L}\p{M}]+(?:-[\p{L}\p{M}]+)*(?![\p{L}\p{M}\p{N}_])/gu)){
      const word=m[0], token=word.normalize('NFC'), chave=token.toLocaleLowerCase('pt-BR');
      if(token.length<3||token.length>35||glossario.has(chave)||ignorar.has(chave)||token===token.toLocaleUpperCase('pt-BR')) continue;
      const expressao = acentos.get(chave);
      // Evita sugerir trocas no que pode ser nome, sigla, dose ou anotação clínica.
      if(token!==chave && !(expressao && token[0]===token[0].toLocaleUpperCase('pt-BR'))) continue;
      let options=cache.get(token);
      if(!options){
        if(dic.spell(token) && !expressao) {cache.set(token,[]);continue;}
        if(++tentativas>16) break;
        options=(expressao ? [token===chave ? expressao : expressao[0].toLocaleUpperCase('pt-BR')+expressao.slice(1)] : dic.suggest(token))
          .filter(x=>x!==token && /^\p{L}[\p{L}\p{M}\-]*$/u.test(x) && !ignorar.has(x.toLocaleLowerCase('pt-BR'))).slice(0,3);
        cache.set(token,options);
      }
      if(options.length) itens.push({word,start:m.index,end:m.index+word.length,options});
      if(itens.length>=10) break;
    }
    self.postMessage({id,itens});
  } catch (_) { self.postMessage({id,erro:true}); }
};
