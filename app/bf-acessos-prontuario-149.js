/*
  BlackFlow | Abertura de prontuário.
  Registra acesso no servidor e mostra a consulta restrita à clínica.
  Não lê ou registra conteúdo clínico, não amplia permissões e não faz diagnóstico.
*/
(function(){
  'use strict';
  if(window.__bfAcessosProntuario)return;
  if(typeof NV==='undefined'||typeof UI==='undefined')return;
  window.__bfAcessosProntuario=true;
  const valid=new Set(['bfclinico','odontomapa','estetmapa']);
  const who=()=>NV.sessao?.user?.id;
  const active=(c,u)=>NV.clinicaId===c&&who()===u&&!NV.offline&&!UI.auth;
  window.bfAuditarAberturaProntuario=async (id,tela)=>{
    if(!NV.sb||!NV.clinicaId||!who()||NV.offline||UI.auth||!valid.has(tela))return false;
    const c=NV.clinicaId,u=who();
    const {data,error}=await NV.sb.rpc('bf_registrar_abertura_prontuario',{p_clinica:c,p_prontuario:id,p_tela:tela});
    if(error||data!==true||!active(c,u))return false;
    return true;
  };
  if(typeof window.bfShowPatient==='function'){
    const previous=window.bfShowPatient;
    window.bfShowPatient=async function(id){
      const c=NV.clinicaId,u=who(),ctx=UI.view;
      try{
        if(!await window.bfAuditarAberturaProntuario(id,'bfclinico')){
          toast('Não foi possível confirmar o registro de acesso. O prontuário não foi aberto.');return;
        }
      }catch(_){toast('Não foi possível registrar a abertura do prontuário.');return}
      if(active(c,u)&&UI.view===ctx)return previous.call(this,id);
    };
  }
  const telaConsulta='acessosprontuario';
  const podeConsultar=()=>NV.papel==='admin'&&NV.ativa&&NV.sb&&NV.clinicaId&&who()&&!NV.offline&&!UI.auth
    &&podeTela('bfclinico')&&['odontologia','biomedicina'].includes(S.config?.segmento);
  if(typeof menuItens==='function'&&typeof render==='function'){
    const menuAntes=menuItens, renderAntes=render;
    menuItens=function(){
      const menu=menuAntes();
      return podeConsultar()?menuOrdem(menu.concat([[telaConsulta,'Acessos a prontuários','file']])):menu;
    };
    render=function(){
      if(UI.view!==telaConsulta)return renderAntes();
      if(!podeConsultar()){UI.view='agenda';return renderAntes()}
      document.getElementById('app').innerHTML=shell('<div class="card"><h2>Acessos a prontuários</h2>'+
        '<p>Consulte as aberturas registradas nesta clínica. O conteúdo das fichas não aparece aqui.</p>'+
        '<button class="btn" type="button" onclick="bfConsultarAcessosProntuario()">Ver acessos recentes</button></div>');
      if(typeof fonteAplicar==='function')fonteAplicar();
    };
  }
  window.bfConsultarAcessosProntuario=async function(){
    if(NV.papel!=='admin'||!NV.sb||!NV.clinicaId||!who()||NV.offline||UI.auth)return;
    const c=NV.clinicaId,u=who(),ctx=UI.view;
    const h=x=>esc(String(x??''));
    const labels={bfclinico:'Prontuário clínico',odontomapa:'Odontograma',estetmapa:'Mapa estético'};
    try{
      const {data,error}=await NV.sb.from('bf_acessos_prontuario')
        .select('paciente_ref,prontuario_id,usuario_id,tela,aberto_em').eq('clinica_id',c)
        .order('aberto_em',{ascending:false}).limit(50);
      if(!active(c,u)||NV.papel!=='admin'||UI.view!==ctx)return;
      if(error){toast('Não foi possível consultar os acessos.');return}
      openModal('<h3>Aberturas recentes de prontuário</h3><p>Somente identificadores e horários. O conteúdo clínico não faz parte deste registro.</p>'+
        ((data||[]).length?'<ul>'+data.map(x=>'<li><b>'+h(labels[x.tela]||'Prontuário')+'</b><br>'+
          h(new Date(x.aberto_em).toLocaleString('pt-BR'))+'<br>Usuário: '+h(x.usuario_id)+'<br>Paciente: '+h(x.paciente_ref)+'</li>').join('')+'</ul>':
          '<p>Nenhum acesso disponível para este perfil.</p>')+
        '<button type="button" class="btn" onclick="closeModal()">Fechar</button>');
    }catch(_){if(active(c,u)&&UI.view===ctx)toast('Não foi possível consultar os acessos.')}
  };
})();
