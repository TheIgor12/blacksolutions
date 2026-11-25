/* BlackFlow 1.49.0. Emite o termo separado da simulação ilustrativa de Biomedicina.
   Só autoriza o visualizador local para o prontuário ativo; não consulta fotos nem propõe tratamento. */
(function(){
  'use strict';
  if(window.__bfCienciaFacial149)return;
  window.__bfCienciaFacial149=true;
  // Enquanto o laboratório está aberto, Ctrl+P da aba não imprime o prontuário por trás.
  const bloqueioImpressao=document.createElement('style');
  bloqueioImpressao.textContent='@media print{body:has(#bf-lab-dialog[open])>*{display:none!important}body:has(#bf-lab-dialog[open])::before{content:"Para imprimir a prévia, use o botão Imprimir prévia ilustrativa no laboratório.";display:block;color:#111}}';
  document.head.append(bloqueioImpressao);
  const uuid=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
  const hash=/^[0-9a-f]{64}$/i;
  const html=()=>'<section class="card bf-em-bloco" id="bf-termo-facial">'+
    '<h2>Termo de ciência da simulação facial</h2><p>Confira a identidade do paciente presencialmente. Peça que ele abra a página do termo e mostre o código da própria conta.</p>'+
    '<p><a href="/ciencia-facial/" target="_blank" rel="noopener noreferrer">Página do termo para o paciente</a></p>'+
    '<form><label>Código da conta do paciente<input name="conta" required maxlength="36" autocomplete="off" spellcheck="false"></label>'+
    '<label><input type="checkbox" name="conferida" required> Conferi presencialmente a identidade e a conta do paciente deste prontuário.</label>'+
    '<button class="btn" type="submit">Emitir código de assinatura</button></form>'+
    '<p role="status" aria-live="polite"></p><div hidden><p>Mostre este código apenas ao paciente presente. Ele vence em 15 minutos.</p>'+
    '<label>Código de uso único<input type="text" readonly autocomplete="off"></label></div>'+
    '<div class="bf-lab-area"><p>O laboratório requer computador. A prévia nunca entra no prontuário.</p>'+
    '<button type="button" class="btn" data-lab>Abrir laboratório</button></div></section>';
  function mount(box,{client,clinic,chart,current}){
    if(!box||!client||!uuid.test(clinic)||!uuid.test(chart)||!current())return;
    useLab(box,{client,clinic,chart,current});
    const form=box.querySelector('form'),message=box.querySelector('[role=status]'),output=box.querySelector('div[hidden]'),code=output.querySelector('input'),send=form.querySelector('button');
    const clear=()=>{code.value='';output.hidden=true;};
    form.addEventListener('input',clear);
    form.addEventListener('submit',async event=>{
      event.preventDefault();
      if(send.disabled||!box.isConnected||!current())return;
      clear();const target=form.elements.conta.value.trim();
      if(!uuid.test(target)||!form.elements.conferida.checked){message.textContent='Confira o código da conta e confirme a identidade.';return;}
      const disabled=[...form.elements];disabled.forEach(el=>{el.disabled=true;});
      message.textContent='Emitindo o termo…';
      try{
        const {data,error}=await client.rpc('bf_ciencia_emitir',{p_clinica:clinic,p_prontuario:chart,p_conta:target,p_identidade_conferida:true});
        if(!box.isConnected||!current())return;
        if(error||!hash.test(data?.codigo??'')){
          message.textContent=error?.code==='22023'?'Já existe um termo vigente. Não emita outro antes da revogação.':'Não foi possível emitir. Confira o vínculo, a ficha e a conta do paciente.';
          return;
        }
        form.reset();code.value=data.codigo;output.hidden=false;message.textContent='Código emitido. O paciente ainda precisa ler e assinar o termo.';
      }catch(_){if(box.isConnected&&current())message.textContent='Não foi possível emitir o termo. Confira a conexão.';}
      finally{disabled.forEach(el=>{el.disabled=false;});}
    });
  }
  function useLab(box,{client,clinic,chart,current}){
    const button=box.querySelector('[data-lab]');
    const desktop=matchMedia('(min-width:1024px) and (pointer:fine)');
    if(!desktop.matches){button.hidden=true;return;}
    const gl=document.createElement('canvas').getContext('webgl2');
    if(!gl){button.hidden=true;return;}gl.getExtension('WEBGL_lose_context')?.loseContext();
    button.addEventListener('click',()=>{
      if(!desktop.matches||!box.isConnected||!current()||document.getElementById('bf-lab-dialog'))return;
      const panel=document.createElement('dialog');
      panel.id='bf-lab-dialog';panel.setAttribute('aria-label','Laboratório de simulação facial');
      panel.style.cssText='width:min(1120px,calc(100vw - 36px));height:min(920px,calc(100dvh - 30px));padding:14px;box-sizing:border-box;border:1px solid #d5cbed;border-radius:14px;background:#fff';
      const close=document.createElement('button');close.type='button';close.className='btn';close.textContent='Fechar laboratório';close.style.minHeight='44px';
      const notice=document.createElement('p');notice.setAttribute('role','status');
      const frame=document.createElement('iframe');
      frame.title='Laboratório de simulação facial';
      frame.style.cssText='width:100%;height:calc(100% - 75px);border:0;display:block';frame.referrerPolicy='no-referrer';
      const alive=()=>desktop.matches&&current()&&panel.open&&frame.isConnected;
      let waiting=false;
      const stop=()=>{window.removeEventListener('message',handle);observer.disconnect();desktop.removeEventListener('change',resize);window.removeEventListener('pagehide',stop);panel.remove();};
      const resize=()=>{if(!desktop.matches&&!matchMedia('print').matches)stop();};
      const handle=async e=>{
        if(e.source!==frame.contentWindow||e.origin!==location.origin||e.data?.type!=='blackflow-lab-autorizar-v1'||e.ports.length!==1)return;
        const p=e.ports[0];
        if(!alive()||waiting){p.postMessage(false);p.close();return;}
        waiting=true;
        const id=crypto.randomUUID();
        try{
          const {data,error}=await client.rpc('bf_autorizar_geracao_simulacao',{p_clinica:clinic,p_prontuario:chart,p_requisicao:id});
          const approved=!error&&data===id&&alive();
          if(alive())notice.textContent=approved?'Geração ilustrativa autorizada.':'Sem termo vigente ou permissão. A prévia não foi gerada.';
          p.postMessage(approved);
        }catch(_){if(alive())notice.textContent='Não foi possível verificar o termo. A prévia não foi gerada.';p.postMessage(false);}
        finally{waiting=false;p.close();}
      };
      const observer=new MutationObserver(()=>{if(!current())stop();});
      observer.observe(box.closest('#app')||document.body,{childList:true,subtree:true});
      window.addEventListener('message',handle);window.addEventListener('pagehide',stop,{once:true});desktop.addEventListener('change',resize);
      frame.src='/laboratorio-facial/';
      close.addEventListener('click',stop,{once:true});panel.addEventListener('close',stop,{once:true});
      panel.append(close,notice,frame);document.body.append(panel);panel.showModal();
    });
  }
  window.BFCienciaFacial149=Object.freeze({html,mount});
})();
