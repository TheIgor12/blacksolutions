/* BlackFlow – ditado clínico e revisão local de português brasileiro. */
(function () {
  'use strict';
  if (window.bfDitado) return;
  const script = new URL('.', document.currentScript.src);
  const lang = 'pt-BR';
  const langs = Object.freeze([lang]);
  // Alguns navegadores oferecem pt-BR local sem o nível explícito de ditado.
  // Nenhuma variante consulta ou inicia reconhecimento remoto.
  const modos = ['dictation', null, 'command'].map(quality => Object.freeze({
    langs, processLocally:true, ...(quality ? {quality} : {})
  }));
  const selector = 'textarea[data-bf-ditado],input[data-bf-ditado]';
  const decorados = new WeakSet();
  let current = null, dicionario = null;
  const mensagens = {
    'not-allowed': 'Microfone não autorizado. Verifique a permissão do site no navegador.',
    'service-not-allowed': 'O navegador bloqueou o reconhecimento local. O microfone foi desligado.',
    'audio-capture': 'Não encontrei um microfone disponível. Confira o dispositivo nas configurações.',
    'no-speech': 'Nenhuma fala foi reconhecida. Toque em Iniciar para tentar de novo.',
    'language-not-supported': 'O pacote de português do Brasil não está pronto neste navegador.',
    network: 'O reconhecimento local não iniciou. Verifique se o pacote está instalado.',
  };
  function botao(rotulo, fn, classe) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = rotulo;
    b.className = 'btn sm ' + (classe || 'ghost'); b.addEventListener('click', fn); return b;
  }
  function el(tag, cls, texto) {
    const x = document.createElement(tag);
    if (cls) x.className = cls;
    if (texto) x.textContent = texto;
    return x;
  }
  function provedor() {
    for (const R of [window.SpeechRecognition, window.webkitSpeechRecognition]) {
      if (!R || typeof R.available !== 'function') continue;
      try {
        const r = new R();
        if (!('processLocally' in r)) continue;
        r.processLocally = true;
        if (r.processLocally === true) return R;
      } catch (_) { }
    }
    return null;
  }
  function escopo() {
    return [typeof NV === 'object' && NV ? NV.clinicaId : null, typeof UI === 'object' && UI ? UI.view : null,
      typeof UI === 'object' && UI ? UI.ana : null, typeof S === 'object' ? S : null];
  }
  function valida(s) {
    const campo = s.campo;
    const atual=escopo();
    return s === current && campo.isConnected && !campo.disabled && !campo.readOnly &&
      s.escopo.every((v,i) => atual[i] === v);
  }
  function falarStatus(s, texto) { if (valida(s)) s.status.textContent = texto; }
  function atualiza(s) {
    const capturando = !!s.rec;
    s.start.disabled = capturando || s.ocupado;
    s.teste.disabled = capturando || s.ocupado;
    s.stop.hidden = !capturando;
    s.stop.disabled = s.parando;
    s.revisar.disabled = capturando || s.revisando || !s.rascunho.value.trim();
    s.aplicar.disabled = capturando || !s.rascunho.value.trim();
    s.rascunho.readOnly = capturando;
  }
  function encerraCaptura(s) {
    if (!s.rec) return;
    const r = s.rec; s.rec = null; s.parando = false; s.espera = '';
    clearTimeout(s.timer);
    try { r.abort(); } catch (_) {}
  }
  function fechar(s, focar) {
    if (s !== current) return;
    current = null; encerraCaptura(s);
    s.dialog.close(); s.dialog.remove();
    if (focar && s.gatilho.isConnected) s.gatilho.focus({ preventScroll:true });
    s.rascunho.value = '';
  }
  function juntas(a,b) {
    if (!a || !b) return a+b;
    return a + (/\s$/.test(a) || /^\s|^[.,:;!?]/.test(b) ? '' : ' ') + b;
  }
  function finalizarLote(s, e) {
    let trecho = '', provis = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const item = e.results[i], fragmento = String(item[0]?.transcript || '').trim();
      if (item.isFinal && !s.finalizados.has(i)) {
        s.finalizados.add(i); trecho = juntas(trecho, fragmento);
      } else if (!item.isFinal) provis = juntas(provis, fragmento);
    }
    if (trecho) s.rascunho.value = juntas(s.rascunho.value,trecho);
    s.parcial.textContent = provis;
    if (s.rascunho.value.length > s.limite) {
      parar(s); falarStatus(s,'O ditado excedeu o limite do campo. Encurte o texto antes de usar.');
    }
    atualiza(s);
  }
  function parar(s) {
    if (!s.rec || s.parando) return;
    s.parando = true; atualiza(s);
    const recognition = s.rec;
    try { recognition.stop(); } catch (_) { encerraCaptura(s); atualiza(s); return; }
    // Alguns navegadores não encerram se o dispositivo sumir durante a captura.
    s.timer = setTimeout(() => {
      if (s.rec !== recognition) return;
      encerraCaptura(s); s.parcial.textContent = '';
      falarStatus(s,'Microfone desligado. Revise o que foi reconhecido.');
      atualiza(s);
    }, 3500);
  }
  function gravar(s,R,modo) {
    if (!valida(s) || s.rec || document.hidden) return;
    const r = new R();
    r.lang = lang; r.processLocally = true;
    if (modo.quality && 'quality' in r) r.quality = modo.quality;
    if (r.lang !== lang || r.processLocally !== true) {
      falarStatus(s,'Este navegador não garantiu o ditado em português do Brasil no aparelho.'); return;
    }
    r.continuous = true; r.interimResults = true; r.maxAlternatives = 1;
    s.finalizados = new Set(); s.espera = ''; s.parcial.textContent = ''; s.sugestoes.replaceChildren(); s.rec = r;
    r.onstart = () => { if (valida(s) && s.rec===r) falarStatus(s,'Ouvindo em português do Brasil…'); };
    r.onresult = (e) => { if (valida(s) && s.rec===r) finalizarLote(s,e); };
    r.onerror = (e) => {
      if (!valida(s) || s.rec!==r) return;
      if (['not-allowed','service-not-allowed','audio-capture','language-not-supported'].includes(e.error)) {
        s.teste.hidden = false;
      }
      s.espera = mensagens[e.error] || 'O reconhecimento foi interrompido. O texto confirmado virou rascunho.';
      falarStatus(s,s.espera);
      if (!s.parando) parar(s);
    };
    r.onend = () => {
      if (!valida(s) || s.rec!==r) return;
      s.rec = null; s.parando = false; clearTimeout(s.timer);
      s.parcial.textContent = '';
      falarStatus(s,s.espera || 'Microfone desligado. Revise o texto antes de usar.');
      atualiza(s);
    };
    try {
      falarStatus(s,'Aguardando o microfone…');
      r.start();
      s.timer = setTimeout(() => parar(s), 120000);
    } catch (_) {
      encerraCaptura(s); falarStatus(s,'Não foi possível abrir o microfone. Tente novamente.');
    }
    atualiza(s);
  }
  async function preparar(s) {
    if (!valida(s) || s.ocupado || s.rec) return;
    const R=provedor();
    s.instalar.hidden=true; s.teste.hidden=true; s.modoInstalar=null;
    if (!R || !window.isSecureContext) {
      s.teste.hidden=false;
      falarStatus(s,'O reconhecimento local não está disponível neste navegador. Você ainda pode testar a permissão do microfone.');
      return;
    }
    s.ocupado=true; atualiza(s);
    let paraInstalar=null, baixando=false, verificado=false;
    try {
      for (const modo of modos) {
        let estado;
        try { estado=await R.available(modo); } catch (_) { continue; }
        if (!valida(s)) return;
        verificado=true;
        if (estado==='available') {
          if (window.navigator?.userActivation?.isActive===false) {
            s.modoPronto={R,modo};
            falarStatus(s,'Português do Brasil está pronto. Toque em Iniciar para o navegador pedir o microfone.');
          } else gravar(s,R,modo);
          return;
        }
        if (estado==='downloadable' && !paraInstalar) paraInstalar=modo;
        if (estado==='downloading') baixando=true;
      }
      if (paraInstalar && typeof R.install==='function') {
        s.modoInstalar=paraInstalar; s.instalar.hidden=false;
        falarStatus(s,'Instale o pacote pt-BR para ditar sem enviar áudio à internet.');
      } else if (baixando) falarStatus(s,'O navegador está baixando o pacote pt-BR. Aguarde e toque em Iniciar.');
      else falarStatus(s,verificado
        ? 'Este navegador não disponibilizou o reconhecimento local em português do Brasil. Permitir o microfone não instala esse recurso.'
        : 'O navegador não permitiu verificar o pacote de reconhecimento local.');
      s.teste.hidden=false;
    } finally { s.ocupado=false; if (valida(s)) atualiza(s); }
  }
  async function testar(s) {
    if (!valida(s) || s.ocupado || s.rec) return;
    const dispositivos=window.navigator?.mediaDevices;
    if (!window.isSecureContext || typeof dispositivos?.getUserMedia!=='function') {
      falarStatus(s,'Este aplicativo não disponibiliza acesso ao microfone. Abra blackflow.app.br diretamente no Chrome.');
      return;
    }
    s.ocupado=true; atualiza(s);
    falarStatus(s,'Permita o microfone na janela do navegador. Este teste não grava nem transcreve.');
    let stream;
    try {
      stream=await dispositivos.getUserMedia({audio:true,video:false});
      stream.getTracks().forEach(t=>t.stop());
      if (!valida(s)) return;
      falarStatus(s,'Microfone autorizado e encontrado. O ditado ainda precisa do reconhecimento local em português do Brasil.');
      s.start.focus({preventScroll:true});
    } catch (e) {
      const erros={
        NotAllowedError:'Microfone bloqueado. Nas permissões do site, permita o microfone e tente de novo.',
        NotFoundError:'Nenhum microfone foi encontrado. Confira a entrada de áudio do Windows.',
        NotReadableError:'O microfone não abriu. Verifique se está disponível e se o Windows permite o acesso por este aplicativo.'
      };
      falarStatus(s,erros[e?.name]||'Não consegui testar o microfone neste aplicativo.');
    } finally {
      stream?.getTracks().forEach(t=>{if (t.readyState!=='ended') t.stop();});
      s.ocupado=false; if (valida(s)) atualiza(s);
    }
  }
  async function instalar(s) {
    const R = provedor();
    if (!R || !valida(s) || s.ocupado || !s.modoInstalar || typeof R.install !== 'function') return;
    s.instalar.hidden = true; s.ocupado = true; atualiza(s);
    falarStatus(s,'Baixando o pacote de português do Brasil. O microfone ainda está desligado.');
    try {
      const ok = await R.install(s.modoInstalar);
      if (!valida(s)) return;
      if (ok) falarStatus(s,'Pacote pt-BR pronto. Toque em Iniciar para autorizar o microfone.');
      else {
        s.instalar.hidden = false; falarStatus(s,'Não foi possível baixar o pacote. Você pode tentar de novo.');
      }
    } catch (_) {
      if (valida(s)) { s.instalar.hidden = false; falarStatus(s,'O navegador não autorizou a instalação do pacote.'); }
    } finally { s.ocupado = false; if (valida(s)) atualiza(s); }
  }
  function listaSugestoes(s, original, itens) {
    if (!valida(s) || s.rascunho.value !== original) return;
    s.sugestoes.replaceChildren();
    if (!itens.length) {
      falarStatus(s,'Nenhuma sugestão ortográfica nesta revisão. Confira nomes e termos clínicos antes de usar.');
      return;
    }
    falarStatus(s,'Escolha apenas as correções que quiser aplicar.');
    for (const item of itens) {
      const li = el('li','bfdf-sug'); li.append(el('b',null,item.word));
      for (const troca of item.options) li.append(botao(troca,() => {
        if (!valida(s) || s.rascunho.value !== original || s.rec) return;
        s.rascunho.setRangeText(troca,item.start,item.end,'end');
        s.sugestoes.replaceChildren(); s.rascunho.focus();
        falarStatus(s,'Sugestão aplicada. Revise outras palavras se necessário.');
      }));
      s.sugestoes.append(li);
    }
  }
  function carregarCorretor() {
    if (!dicionario) dicionario = import(new URL('ditado/ortografia-pt-br.js',script).href)
      .catch(e => { dicionario = null; throw e; });
    return dicionario;
  }
  async function revisar(s) {
    if (!valida(s) || s.rec || s.revisando) return;
    const original = s.rascunho.value;
    if (!original.trim()) return;
    s.revisando = true; atualiza(s); falarStatus(s,'Revisando em português do Brasil…');
    try {
      const mod = await carregarCorretor();
      if (!valida(s) || s.rascunho.value !== original) return;
      listaSugestoes(s,original,await mod.sugerir(original));
    } catch (_) { falarStatus(s,'Não consegui abrir o corretor local. Revise o texto manualmente.'); }
    finally { s.revisando = false; if (valida(s)) atualiza(s); }
  }
  function aplicar(s) {
    if (!valida(s) || s.rec) return;
    if (s.campo.value !== s.inicial) {
      falarStatus(s,'O registro mudou enquanto você ditava. Copie o rascunho antes de fechar.'); return;
    }
    let texto = s.rascunho.value.trim();
    if (!texto) return;
    if (s.campo.tagName === 'INPUT') texto = texto.replace(/\s*\n\s*/g,' ');
    const fim = juntas(s.inicial,texto);
    if (fim.length > s.limite) {
      falarStatus(s,'O campo comporta '+s.limite+' caracteres. Encurte o rascunho antes de usar.'); return;
    }
    const campo=s.campo;
    campo.value = fim;
    campo.dispatchEvent(new Event('input',{bubbles:true}));
    fechar(s,false);
    if (campo.isConnected) campo.focus({preventScroll:true});
  }
  function abrir(campo,gatilho) {
    if (!campo.isConnected || campo.readOnly || campo.disabled || current) return;
    const dialog = el('dialog','bfdf-dialog'); dialog.lang = lang; dialog.dataset.bfDitadoDialog = '';
    if (typeof dialog.showModal !== 'function') return;
    dialog.setAttribute('aria-labelledby','bfdf-titulo');
    const s = current = {
      campo,gatilho,dialog,escopo:escopo(),inicial:campo.value,
      limite:Number(campo.getAttribute('data-bf-ditado-limite')) || (campo.maxLength>0 ? campo.maxLength : 20000),
      rec:null,ocupado:false,revisando:false,parando:false,espera:'',
    };
    const titulo=el('h3','bfdf-titulo','Ditado em português do Brasil'); titulo.id='bfdf-titulo';
    const nota=el('p','bfdf-nota','O reconhecimento é feito no aparelho. O áudio não é gravado nem enviado pelo BlackFlow. Revise o rascunho antes de adicionar ao campo.');
    if (campo.dataset.bfDitado === 'auto') nota.append(' Nesta anotação, usar o texto aciona o salvamento automático já existente.');
    s.status=el('p','bfdf-status','Preparando o microfone…'); s.status.setAttribute('role','status');
    s.parcial = el('p','bfdf-parcial');
    s.rascunho=el('textarea','bfdf-texto'); s.rascunho.lang=lang; s.rascunho.spellcheck=false;
    desativarExtensoes(s.rascunho);
    s.rascunho.rows=5; s.rascunho.placeholder='O que você ditar aparece aqui'; s.rascunho.setAttribute('aria-label','Rascunho do ditado');
    s.rascunho.addEventListener('input',()=>{s.sugestoes.replaceChildren();atualiza(s);});
    s.sugestoes=el('ul','bfdf-sugestoes');
    s.start=botao('Iniciar',()=>{
      const pronto=s.modoPronto;
      if (pronto && !s.ocupado && valida(s)) {
        s.modoPronto=null; gravar(s,pronto.R,pronto.modo);
      } else preparar(s);
    });
    s.stop=botao('Parar microfone',()=>parar(s),'danger');
    s.instalar=botao('Instalar pacote pt-BR',()=>instalar(s)); s.instalar.hidden=true;
    s.teste=botao('Testar microfone',()=>testar(s)); s.teste.hidden=true;
    s.revisar=botao('Revisar ortografia',()=>revisar(s));
    s.aplicar=botao('Usar texto',()=>aplicar(s),'bfdf-usar');
    const acoes=el('div','bfdf-acoes');
    acoes.append(s.start,s.stop,s.instalar,s.teste,s.revisar,botao('Cancelar',()=>fechar(s,true)),s.aplicar);
    dialog.append(titulo,nota,s.status,s.parcial,s.rascunho,s.sugestoes,acoes);
    dialog.addEventListener('cancel',(e)=>{e.preventDefault();fechar(s,true);});
    dialog.addEventListener('close',()=>{if(current===s)fechar(s,false);});
    document.body.append(dialog);
    try { dialog.showModal(); } catch (_) { fechar(s,false); return; }
    atualiza(s); preparar(s);
  }
  function desativarExtensoes(c) {
    // Extensões que respeitam estes atributos não revisam campos clínicos.
    c.setAttribute('data-gramm','false');
    c.setAttribute('data-gramm_editor','false');
    c.setAttribute('data-enable-grammarly','false');
  }
  function instalarBotoes() {
    if (current && !valida(current)) fechar(current,false);
    document.querySelectorAll(selector).forEach(campo=>{
      if (decorados.has(campo) || campo.readOnly || campo.disabled) return;
      decorados.add(campo); campo.lang=lang; campo.spellcheck=false; desativarExtensoes(campo);
      const root = el('span','bfdf-ferramentas');
      const micro=el('span','bfdf-mic');
      micro.tabIndex=0; micro.dataset.bfDictToggle=''; micro.setAttribute('role','button');
      micro.setAttribute('aria-label','Ditar neste campo em português do Brasil'); micro.title='Ditar em português do Brasil';
      micro.setAttribute('aria-haspopup','dialog');
      micro.innerHTML='<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/></svg>';
      micro.append(document.createTextNode(' Ditar'));
      const abrirClique=(e)=>{e.preventDefault();e.stopPropagation();abrir(campo,micro);};
      micro.addEventListener('click',abrirClique);
      micro.addEventListener('keydown',(e)=>{if (e.key==='Enter' || e.key===' ') abrirClique(e);});
      root.append(micro); campo.after(root);
    });
  }
  document.head.insertAdjacentHTML('beforeend',`<style>
    .bfdf-ferramentas{display:flex;margin:4px 0 0}
    .bfdf-mic{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:36px;padding:3px 10px;border-radius:9px;border:1px solid var(--line,#d5dae5);font-size:13px;font-weight:600;color:var(--ink,#18233a);cursor:pointer}
    .bfdf-mic:focus-visible,.bfdf-acoes button:focus-visible{outline:2px solid #5265de;outline-offset:2px}
    .bfdf-dialog{width:min(620px,calc(100vw - 24px));max-height:min(85dvh,700px);border:1px solid var(--line,#d5dae5);border-radius:16px;background:var(--card,#fff);color:var(--ink,#18233a);padding:18px;overflow:auto;box-sizing:border-box}
    .bfdf-dialog::backdrop{background:#0c142d88}
    .bfdf-dialog [hidden]{display:none!important}
    .bfdf-titulo{margin:0 0 9px}.bfdf-nota,.bfdf-status,.bfdf-parcial{font-size:14px;line-height:1.4;margin:6px 0}
    .bfdf-parcial{color:var(--mut,#485773);overflow-wrap:anywhere}
    .bfdf-texto{width:100%;box-sizing:border-box;font-size:16px;padding:8px;margin:8px 0;color:inherit}
    .bfdf-acoes{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.bfdf-acoes button{min-height:42px}
    .bfdf-usar{margin-left:auto}.bfdf-sugestoes{padding:0;margin:0 0 9px;list-style:none}.bfdf-sug{display:flex;gap:6px;flex-wrap:wrap;align-items:center;padding:3px 0}
    @media(max-width:640px){.bfdf-mic,.bfdf-acoes button{min-height:44px}}
  </style>`);
  const observer = new MutationObserver(instalarBotoes);
  observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('visibilitychange',()=>{
    const s=current;
    if (!document.hidden || !s?.rec) return;
    encerraCaptura(s); s.parcial.textContent='';
    falarStatus(s,'Microfone desligado porque você saiu desta aba.'); atualiza(s);
  });
  window.addEventListener('pagehide',()=>{if(current)fechar(current,false);});
  window.bfDitado = Object.freeze({ lang });
  instalarBotoes();
})();
