/* BlackFlow 1.49.0: mapa estético da Biomedicina.
   A profissional registra o que já foi feito, por região, lado e sessão.
   Prontuário identifica a ficha clínica existente. Lote e validade identificam
   o produto efetivamente usado. O mapa não diagnostica, não indica local de
   aplicação, não sugere produto, dose ou técnica e não prevê resultado.
   O histórico intramuscular registra procedimentos concluídos, sem mapa nem catálogo.
   O laboratório de simulação não faz parte desta entrega. */
(function () {
  'use strict';
  if (window.__bfEstetMapa149) return;
  window.__bfEstetMapa149 = true;

  const TELA = 'estetmapa';
  const TABELA = 'bf_estetmapa_registros';
  const IMAGENS = true;
  const IM = 'intramuscular_realizada';
  const CAMPO = 'id,tipo_registro,sessao_id,sessao_data,vista,regiao,lado,produto,quantidade,unidade,unidade_descricao,lote,validade,observacoes,criado_em';
  const REGIOES = {
    fronte: 'Fronte', glabela: 'Glabela', periorbital: 'Região periorbital', pes_galinha: 'Pés de galinha',
    dorso_nasal: 'Dorso nasal', ponta_nasal: 'Ponta nasal', sulco_nasogeniano: 'Sulco nasogeniano', malar: 'Malar',
    zigomatico: 'Zigomático', labio_superior: 'Lábio superior', labio_inferior: 'Lábio inferior', filtro: 'Filtro',
    sulco_mentolabial: 'Sulco mentolabial', mentao: 'Mentão', angulo_mandibular: 'Ângulo mandibular',
    submentoniana: 'Região submentoniana', pescoco: 'Pescoço', abdome: 'Abdome', flanco: 'Flanco', culote: 'Culote',
    face_interna_coxa: 'Face interna da coxa', gluteo: 'Glúteo', braco: 'Braço'
  };
  const CODIGOS = Object.keys(REGIOES);
  const FACES = CODIGOS.slice(0,17);
  const CORPO = ['pescoco','submentoniana','abdome','flanco','culote','face_interna_coxa','gluteo','braco'];
  const VISTAS = {
    frontal: 'Frente', obliqua_direita: 'Três quartos à direita', obliqua_esquerda: 'Três quartos à esquerda',
    perfil_direito: 'Perfil direito', perfil_esquerdo: 'Perfil esquerdo', corpo_frente: 'Frente', corpo_costas: 'Costas'
  };
  const LADOS = {direito:'Direito',esquerdo:'Esquerdo',central:'Central',bilateral:'Bilateral'};
  const UNIDADES = {ml:'Mililitros',unidade:'Unidades',ui:'Unidades internacionais',utr:'Unidades de redução de turbidez',g:'Gramas',mg:'Miligramas',outra:'Outra unidade'};
  const E = x => esc(String(x ?? ''));
  const own = (a,k) => Object.prototype.hasOwnProperty.call(a,k);
  const byId = k => document.getElementById('bf-em-'+k);
  const limpa = x => String(x ?? '').trim();
  const norm = x => limpa(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const numerico = Intl.NumberFormat('pt-BR',{maximumFractionDigits:6});
  const mapaCache = new Map();
  const modalidade = () => String(P.vista).startsWith('corpo_') ? 'corpo' : 'face';
  const regioes = k => String(k).startsWith('corpo_') ? CORPO : FACES;
  const dataLocal = () => { const d=new Date(); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,10); };
  const dataMenos = n => { const d=new Date(dataLocal()+'T12:00:00Z'); d.setUTCDate(d.getUTCDate()-n); return d.toISOString().slice(0,10); };
  const iso = x => {
    if (typeof x!=='string'||!/^(19\d\d|20\d\d|21\d\d)-\d\d-\d\d$/.test(x)) return false;
    const d = new Date(x+'T12:00:00Z');
    return Number.isFinite(+d)&&d.toISOString().slice(0,10)===x;
  };
  const dataPt = x => iso(x)?x.split('-').reverse().join('/'):'Data não informada';
  let P = novo(), rascunhoAberto=null;
  function novo() {
    return {escopo:null, fase:'inicio', auditadas:new Set(), fichas:[], ficha:'', modo:'mapa', vista:'frontal', registros:[], lidos:false, truncado:false, sessao:'',
      data:dataLocal(), inicio:dataMenos(90), fim:dataLocal(), regiao:'', confirmar:false, form:{}, evento:0, erro:'', aviso:'', salvando:false};
  }
  function cabe() { return !UI.auth && S.config.segmento==='biomedicina' && !soAgenda() && podeTela(TELA); }
  function conta() {
    if (!NV.ativa || !NV.sb || NV.offline || !NV.clinicaId || !NV.sessao?.user?.id) return null;
    return {clinica:String(NV.clinicaId), usuario:String(NV.sessao.user.id), sb:NV.sb};
  }
  function mesmo(a,b) { return !!a&&!!b&&a.clinica===b.clinica&&a.usuario===b.usuario&&a.sb===b.sb; }
  function contexto(estado, evento, ficha) {
    return P===estado&&cabe()&&UI.view===TELA&&mesmo(estado.escopo,conta())&&
      (evento===undefined||estado.evento===evento)&&(ficha===undefined||estado.ficha===ficha);
  }
  function catalogo() { return window.BF_CATALOGOS?.biomedicina || null; }
  function bloqueio(c, valor) {
    const n=norm(valor), junto=n.replace(/[^a-z0-9]/g,'');
    return (c?.bloqueados || []).find(b => {
      const aliases=String(b.n||'').split(',').map(norm).filter(Boolean);
      return aliases.some(a=>n.includes(a)||junto.includes(a.replace(/[^a-z0-9]/g,'')));
    }) || null;
  }
  function produtos(c) {
    const nomes=new Map();
    (c?.grupos||[]).forEach(g=>{
      // A lista intramuscular ainda não foi validada. Também não oferecemos itens orais ou tópicos no mapa de registro.
      if (/intramuscular|\boral\b|\btopica\b/.test(norm(g.via))) return;
      (g.itens||[]).forEach(p=>{ if (p?.n&&!bloqueio(c,p.n)) nomes.set(norm(p.n),p.n); });
    });
    return nomes;
  }
  function motivoProduto(valor) {
    const c=catalogo(); if(!c) return 'O catálogo está indisponível.';
    const bloqueado=bloqueio(c,valor);
    if(bloqueado) return bloqueado.motivo||'Esse produto não está disponível para registro.';
    const ver=typeof window.bfRxConferir==='function'?window.bfRxConferir(valor):null;
    if(ver?.ok===false) return ver.motivo||'Esse produto não está disponível para registro.';
    if (!produtos(c).has(norm(valor))) return 'Escolha um produto disponível no catálogo do mapa estético.';
    return '';
  }
  function microunidades(q) {
    const s=limpa(q).replace(',','.');
    if (!/^\d{1,6}(?:\.\d{1,6})?$/.test(s)) return null;
    const [a,b='']=s.split('.');
    const q6=+a*1000000+Number(b.padEnd(6,'0'));
    return Number.isSafeInteger(q6)&&q6>0?q6:null;
  }
  function sessoes(l) {
    const porId=new Map();
    l.forEach(r=>{
      if(!r.sessao_id||!iso(r.sessao_data)) return;
      if (!porId.has(r.sessao_id)) porId.set(r.sessao_id,{id:r.sessao_id,data:r.sessao_data,hora:r.criado_em||'',itens:[]});
      const x=porId.get(r.sessao_id);
      if (r.sessao_data===x.data) {
        x.itens.push(r);
        if (String(r.criado_em||'')<x.hora) x.hora=r.criado_em||'';
      }
    });
    return [...porId.values()].sort((a,b)=>b.data.localeCompare(a.data)||b.hora.localeCompare(a.hora)||b.id.localeCompare(a.id));
  }
  function totalizar(l, ini, fim) {
    if (!iso(ini)||!iso(fim)||ini>fim) return null;
    const t=new Map();
    l.forEach(r=>{
      if(!iso(r.sessao_data)||r.sessao_data<ini||r.sessao_data>fim||!own(REGIOES,r.regiao)||!own(UNIDADES,r.unidade)) return;
      const n=microunidades(r.quantidade); if(n===null) return;
      const outra=r.unidade==='outra'?limpa(r.unidade_descricao):'';
      const k=JSON.stringify([r.regiao,r.unidade,norm(outra)]);
      if(!t.has(k))t.set(k,{regiao:r.regiao,unidade:r.unidade,outra,total:0});
      const x=t.get(k);
      x.total+=n;
    });
    return [...t.values()].sort((a,b)=>REGIOES[a.regiao].localeCompare(REGIOES[b.regiao],'pt-BR')||a.unidade.localeCompare(b.unidade));
  }
  async function lerFichas() {
    const p=P,a=p.escopo;
    if (!contexto(p)||p.fase!=='inicio') return;
    p.fase='carregando';
    try {
      const h=await a.sb.from('bf_profissionais').select('id').eq('clinica_id',a.clinica).eq('user_id',a.usuario).eq('segmento','biomedicina').eq('ativo',true).limit(1);
      if(h.error) throw h.error;
      if(!contexto(p))return;
      if(!h.data?.length) {p.fase='sem-acesso';return pintar();}
      const fs=await a.sb.from('bf_prontuarios').select('id,paciente_ref').eq('clinica_id',a.clinica).eq('segmento','biomedicina');
      if(fs.error) throw fs.error;
      if(!contexto(p))return;
      p.fichas=fs.data||[];p.fase='pronto';pintar();
    } catch (_) { if(contexto(p)){p.fase='falha';p.erro='Não foi possível abrir os prontuários. Confira a conexão e a permissão.';pintar();} }
  }
  async function lerRegistros() {
    const p=P,ficha=p.ficha,a=p.escopo,e=++p.evento;
    if(!contexto(p,e,ficha)||!ficha||p.salvando) return;
    p.lidos=false;p.truncado=false;p.registros=[];p.erro='';pintar();
    const PAGINA=250;
    try {
      if(!p.auditadas.has(ficha)&&typeof window.bfAuditarAberturaProntuario==='function') {
        const auditado=await window.bfAuditarAberturaProntuario(ficha,TELA);
        if(!contexto(p,e,ficha))return;
        if(!auditado)throw new Error('Abertura de prontuário sem confirmação de auditoria');
        p.auditadas.add(ficha);
      }
      const acumulado=[];
      for (let pos=0;pos<5000;pos+=PAGINA) {
        const r=await a.sb.from(TABELA).select(CAMPO).eq('clinica_id',a.clinica).eq('prontuario_id',ficha)
          .order('sessao_data',{ascending:false}).order('criado_em',{ascending:false}).order('id',{ascending:false}).range(pos,pos+PAGINA-1);
        if(r.error) throw r.error;
        if(!contexto(p,e,ficha))return;
        acumulado.push(...(r.data||[]));
        if((r.data||[]).length<PAGINA) break;
        if(pos+PAGINA===5000)p.truncado=true;
      }
      p.registros=acumulado;p.lidos=true;pintar();
    } catch (_) { if(contexto(p,e,ficha)){p.erro='Não foi possível carregar os registros do mapa. Não grave até restabelecer o acesso.';pintar();} }
  }
  function trocarFicha(id) {
    if(P.salvando) return;
    P.ficha=P.fichas.some(p=>String(p.id)===id)?id:'';
    P.auditadas.clear();
    P.evento++;P.modo='mapa';P.registros=[];P.lidos=false;P.sessao='';P.data=dataLocal();P.regiao='';P.confirmar=false;P.form={};P.aviso='';P.erro='';
    if(P.ficha) lerRegistros();else pintar();
  }
  function trocarSessao(id) {
    if(P.salvando) return;
    const ss=sessoes(P.registros).find(s=>s.id===id);
    P.sessao=ss?.id||'';P.data=ss?.data||dataLocal();P.regiao='';P.confirmar=false;P.form={};P.aviso='';P.erro='';pintar();
  }
  function escolherRegiao(r) {
    if(!contexto(P)||!P.lidos||P.salvando||!regioes(P.vista).includes(r)) return;
    if(P.regiao!==r)P.form={};
    P.regiao=r;P.confirmar=false;P.aviso='';pintar();byId('sim')?.focus();
  }
  function mudarVista(k) {
    if(P.salvando||!own(VISTAS,k))return;
    P.modo='mapa'; P.vista=k; P.regiao=''; P.confirmar=false; P.form={}; pintar();
  }
  function corRegiao(d) {
    // Vermelho indexado no PNG, com verde e azul constantes; aceita só a cor exata.
    return d[3]===255&&d[1]===91&&d[2]===167? CODIGOS[d[0]-1]||'':'';
  }
  function mapa(k) {
    if(mapaCache.has(k)) return mapaCache.get(k);
    const pr=new Promise((res,rej)=>{
      const img=new Image();
      img.onload=()=>{
        try {
          const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
          const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(img,0,0);
          res({w:c.width,h:c.height,p:g.getImageData(0,0,c.width,c.height).data});
        }catch(e){rej(e);}
      };
      img.onerror=()=>rej(new Error('Mapa indisponível'));
      img.src='estetmapa/mapa-'+k+'.png';
    });
    mapaCache.set(k,pr);
    return pr;
  }
  async function tocar(ev) {
    const k=P.vista,p=P,ficha=p.ficha; if(!p.lidos||p.salvando)return;
    const item=ev.currentTarget, r=item.getBoundingClientRect();
    const x=(ev.clientX-r.left)/r.width,y=(ev.clientY-r.top)/r.height;
    if(x<0||x>=1||y<0||y>=1)return;
    try{
      const m=await mapa(k);
      if(!contexto(p,undefined,ficha)||p.vista!==k||!item.isConnected)return;
      const i=4*(Math.floor(y*m.h)*m.w+Math.floor(x*m.w));
      const reg=corRegiao(m.p.slice(i,i+4));
      if(reg)escolherRegiao(reg);
    }catch(_){if(contexto(p,undefined,ficha)){p.aviso='Use a lista de regiões. A imagem do mapa está indisponível.';pintar();}}
  }
  function validar(p) {
    const f=p.form, im=p.modo===IM, nome=limpa(f.produto);
    const lote=limpa(f.lote), observacoes=limpa(f.observacoes);
    if(!lote||lote.length>100)return {erro:'Informe o lote.'};
    if(!iso(f.validade))return {erro:'Informe a validade do produto.'};
    if(!iso(p.data)||p.data>dataLocal())return {erro:'Informe a data em que ocorreu o atendimento.'};
    if(observacoes.length>2000)return {erro:'Use, no máximo, 2.000 caracteres nas observações.'};
    const dados={lote,validade:f.validade,observacoes};
    if(im){
      if(f.realizada!==true)return {erro:'Confirme que a aplicação foi realizada.'};
      if(!nome||nome.length>180)return {erro:'Informe o nome do produto usado.'};
      if(bloqueio(catalogo(),nome)||/pmma|polimetilmetacrilato/.test(norm(nome).replace(/[^a-z0-9]/g,'')))
        return {erro:'Esse produto não está disponível para registro.'};
      return {reg:{...dados,tipo_registro:IM,produto:nome}};
    }
    const erro=motivoProduto(nome);
    if(erro)return {erro};
    const quantidade=microunidades(f.quantidade);
    if(quantidade===null)return {erro:'Informe a quantidade registrada, com até seis casas decimais.'};
    if(!own(UNIDADES,f.unidade)||!own(LADOS,f.lado))return {erro:'Informe a unidade e o lado.'};
    const outra=limpa(f.outra);
    if(f.unidade==='outra'&&(!outra||outra.length>24))return {erro:'Informe o nome da unidade, com até 24 caracteres.'};
    if(!regioes(p.vista).includes(p.regiao))return {erro:'Escolha uma região da vista atual.'};
    return {reg:{...dados,regiao:p.regiao,lado:f.lado,vista:p.vista,produto:produtos(catalogo()).get(norm(f.produto)),
      quantidade:quantidade/1000000,unidade:f.unidade,unidade_descricao:f.unidade==='outra'?outra:null}};
  }
  async function salvar(ev) {
    ev.preventDefault();
    const p=P,a=p.escopo,ficha=p.ficha,evento=p.evento;
    if(p.salvando||!p.lidos||(p.modo!==IM&&!p.confirmar)||!ficha||!contexto(p,evento,ficha))return;
    const v=validar(p);
    if(v.erro){p.aviso=v.erro;pintar();byId('aviso')?.focus();return;}
    const sessao=p.sessao||crypto.randomUUID();
    p.salvando=true; p.aviso=''; pintar();
    try {
      const r=await a.sb.from(TABELA).insert({...v.reg,clinica_id:a.clinica,prontuario_id:ficha,sessao_id:sessao,sessao_data:p.data}).select(CAMPO).single();
      if(r.error||!r.data?.id)throw r.error||new Error('Não confirmado');
      if(!contexto(p,evento,ficha))return;
      p.registros.unshift(r.data);p.sessao=sessao;p.regiao='';p.confirmar=false;p.form={};p.aviso='Registro confirmado no prontuário deste atendimento.';
    }catch(_){if(contexto(p,evento,ficha))p.aviso='Não foi possível confirmar a gravação. Reabra a ficha e confira o histórico antes de tentar de novo.'; }
    finally{if(contexto(p,evento,ficha)){p.salvando=false;pintar();byId('aviso')?.focus();}}
  }
  const B=(id,rotulo,extra='')=>'<button class="btn ghost" type="button" id="bf-em-'+id+'" '+extra+'>'+E(rotulo)+'</button>';
  const opts=(o,val)=>'<option value="">Escolher</option>'+Object.entries(o).map(([k,v])=>'<option value="'+E(k)+'"'+(val===k?' selected':'')+'>'+E(v)+'</option>').join('');
  const unidade=r=>r.unidade==='outra'?r.unidade_descricao:(UNIDADES[r.unidade]||'');
  const valor=r=>numerico.format(r.quantidade)+' '+String(unidade(r)||'').toLowerCase();
  function htmlForm() {
    const im=P.modo===IM;
    if(!im&&!P.regiao)return '';
    if(!im&&!P.confirmar)return '<section class="card bf-em-bloco"><h2>'+E(REGIOES[P.regiao])+'</h2><p>Deseja registrar uma aplicação já realizada nesta região?</p>'+
      '<div class="bf-em-par">'+B('sim','Sim')+B('nao','Não')+'</div></section>';
    const f=P.form,d=P.salvando?' disabled':'', campo=(k,t,resto='')=>'<label>'+E(t)+'<input id="bf-em-'+k+'" name="'+k+'" value="'+E(f[k]||'')+'" '+resto+d+'></label>';
    const extra=im?'<label class="bf-em-confirma"><input type="checkbox" name="realizada"'+(f.realizada?' checked':'')+d+'> Confirmo que a aplicação já foi realizada.</label>':'';
    const estetica='<label class="bf-em-amplo">Produto usado<input id="bf-em-produto" name="produto" list="bf-em-produtos" maxlength="180" autocomplete="off"'+d+' value="'+E(f.produto||'')+'" aria-describedby="bf-em-ajuda-produto">'+
        '<datalist id="bf-em-produtos">'+[...produtos(catalogo()).values()].map(n=>'<option value="'+E(n)+'"></option>').join('')+'</datalist>'+
        '<small id="bf-em-ajuda-produto">'+E(f.produto?motivoProduto(f.produto):'')+'</small></label>'+
      '<label>Lado<select id="bf-em-lado" name="lado"'+d+'>'+opts(LADOS,f.lado)+'</select></label>'+
      campo('quantidade','Quantidade','inputmode="decimal" maxlength="15"')+
      '<label>Unidade<select id="bf-em-unidade" name="unidade"'+d+'>'+opts(UNIDADES,f.unidade)+'</select></label>'+
      '<label id="bf-em-outra-caixa"'+(f.unidade==='outra'?'':' hidden')+'>Nome da unidade<input id="bf-em-outra" name="outra" maxlength="24" value="'+E(f.outra||'')+'"'+d+'></label>'+
      '';
    return '<form id="bf-em-form" class="card bf-em-bloco" novalidate><h2>'+E(im?'Registrar aplicação intramuscular já realizada':REGIOES[P.regiao])+'</h2>'+
      '<p>'+(im?'Digite o nome que consta no seu registro de atendimento. Não há lista de produtos nem orientações de aplicação.':'Informe o que já foi registrado no atendimento, sem estimativas do sistema.')+'</p>'+
      '<div class="bf-em-campos">'+(im?campo('produto','Nome do produto usado','maxlength="180" autocomplete="off"'):estetica)+
      campo('lote','Lote','maxlength="100"')+campo('validade','Validade','type="date"')+
      '<label class="bf-em-amplo">Observações<textarea id="bf-em-observacoes" name="observacoes" rows="3" maxlength="2000"'+d+'>'+E(f.observacoes||'')+'</textarea></label></div>'+extra+
      '<div class="bf-em-par"><button class="btn" type="submit"'+d+'>'+ (P.salvando?'Gravando…':'Guardar registro')+'</button>'+B('nao',im?'Limpar campos':'Cancelar',d)+'</div></form>';
  }
  function rascunhoIM(r){
    return 'Aplicação intramuscular já realizada em '+dataPt(r.sessao_data)+': '+limpa(r.produto)+'. Lote: '+limpa(r.lote)+
      '. Validade: '+dataPt(r.validade)+'.'+(limpa(r.observacoes)?' Observações: '+limpa(r.observacoes):'');
  }
  function podeRascunho(){return pode('clinico')&&podeTela('pacientes');}
  function rascunhoValido(x){
    return x.modal.isConnected&&contexto(x.p,x.e,x.ficha)&&podeRascunho()&&!!pac(x.pid);
  }
  function checarRascunho(){
    const x=rascunhoAberto;
    if(!x)return;
    if(!x.modal.isConnected){rascunhoAberto=null;return;}
    if(!rascunhoValido(x)){closeModal();rascunhoAberto=null;}
  }
  async function confirmarNota(x){
    if(rascunhoAberto!==x||x.tipo!=='evolucao'||x.enviando||!rascunhoValido(x)){checarRascunho();return;}
    const campo=x.modal.querySelector('#bf-em-nota-texto');
    const aviso=x.modal.querySelector('#bf-em-nota-status');
    const botao=x.modal.querySelector('#bf-em-nota-salvar');
    const concorda=x.modal.querySelector('#bf-em-nota-confirmar');
    const texto=limpa(campo?.value);
    if(!concorda?.checked||!texto||texto.length>2500){
      aviso.textContent='Revise o texto e confirme o registro antes de salvar.'; return;
    }
    if(x.textoEnviado&&x.textoEnviado!==texto){aviso.textContent='Confira a evolução antes de alterar um envio que ainda não foi confirmado.';return;}
    x.textoEnviado=texto;
    x.enviando=true;botao.disabled=true;campo.readOnly=true;
    try {
      const r=await x.p.escopo.sb.rpc('bf_registrar_nota_intramuscular',{
        p_clinica:x.p.escopo.clinica,p_prontuario:x.ficha,p_registro:x.registro,p_paciente_ref:String(x.pid),
        p_destino:'evolucao',p_texto:texto,p_requisicao:x.requisicao
      });
      if(r.error||r.data!==true)throw new Error('Não confirmado');
      if(rascunhoAberto!==x||!rascunhoValido(x)){checarRascunho();return;}
      rascunhoAberto=null;closeModal();x.p.aviso='Nota confirmada na evolução clínica deste paciente.';pintar();byId('aviso')?.focus();
    }catch(_){
      if(rascunhoAberto===x&&rascunhoValido(x))aviso.textContent='Não foi possível confirmar a gravação. Você pode tentar confirmar novamente sem duplicar esta nota.';
    }finally{
      x.enviando=false;
      if(rascunhoAberto===x&&rascunhoValido(x))botao.disabled=false;
    }
  }
  function historicoIM() {
    const l=P.registros.filter(r=>r.tipo_registro===IM);
    const opcoes=podeRascunho()&&!P.salvando;
    return '<section class="card bf-em-bloco"><h2>Histórico de aplicações intramusculares realizadas</h2>'+
      (l.length?'<ul class="bf-em-lista">'+l.map(r=>'<li><b>'+E(dataPt(r.sessao_data))+' | '+E(r.produto)+'</b>'+
      '<small>Lote '+E(r.lote)+' | Validade '+E(dataPt(r.validade))+'</small>'+(r.observacoes?'<p>'+E(r.observacoes)+'</p>':'')+
      (opcoes?'<div class="bf-em-par"><button type="button" class="btn ghost" data-nota="anamnese" data-registro="'+E(r.id)+'">Revisar nota de anamnese</button>'+
      '<button type="button" class="btn ghost" data-nota="evolucao" data-registro="'+E(r.id)+'">Preparar nota na evolução</button></div>':'')+'</li>').join('')+'</ul>':'<p>Nenhum registro intramuscular neste prontuário.</p>')+
      '<p>Se desejar, abra um rascunho para revisar. Nenhuma nota é salva automaticamente.</p></section>';
  }
  async function abrirRascunho(tipo,id){
    const p=P,a=p.escopo,ficha=p.ficha,e=p.evento;
    if(!contexto(p,e,ficha)||p.salvando||!p.lidos||p.modo!==IM||!podeRascunho()||!['anamnese','evolucao'].includes(tipo))return;
    const local=p.fichas.find(f=>String(f.id)===ficha);
    const paciente=(S.pacientes||[]).find(x=>String(x.id)===String(local?.paciente_ref));
    if(!paciente||!p.registros.some(r=>r.id===id&&r.tipo_registro===IM))return;
    p.salvando=true;p.aviso='';pintar();
    try {
      const [reg,chart]=await Promise.all([
        a.sb.from(TABELA).select(CAMPO).eq('clinica_id',a.clinica).eq('prontuario_id',ficha).eq('tipo_registro',IM).eq('id',id).single(),
        a.sb.from('bf_prontuarios').select('id,paciente_ref').eq('id',ficha).eq('clinica_id',a.clinica).eq('segmento','biomedicina').single()
      ]);
      if(!contexto(p,e,ficha))return;
      if(reg.error||chart.error||reg.data?.id!==id||reg.data?.tipo_registro!==IM||String(chart.data?.id)!==ficha||
        String(chart.data?.paciente_ref)!==String(paciente.id)||!pac(paciente.id)||!podeRascunho())throw new Error('Vínculo não confirmado');
      const nota=rascunhoIM(reg.data), evo=tipo==='evolucao';
      openModal('<h3>'+E(evo?'Confirmar nota na evolução clínica':'Revisar nota de anamnese')+'</h3>'+
        '<p class="note">Paciente: '+E(paciente.nome||'Paciente selecionado')+'. '+E(evo?'Revise e confirme para gravar no prontuário clínico.':'Esta nota é somente para revisão. Nada será salvo na anamnese.')+'</p>'+
        '<label for="bf-em-nota-texto">Texto da nota</label><textarea id="bf-em-nota-texto" class="inp" rows="8" style="display:block;width:100%;box-sizing:border-box;font-size:16px" maxlength="2500">'+E(nota)+'</textarea>'+
        (evo?'<label><input type="checkbox" id="bf-em-nota-confirmar"> Confirmo que revisei e quero registrar esta nota na evolução deste paciente.</label>':'')+
        '<p role="status" id="bf-em-nota-status"></p><div class="mact"><button class="btn ghost" type="button" id="bf-em-nota-fechar">Fechar</button>'+
        (evo?'<button class="btn" type="button" id="bf-em-nota-salvar">Confirmar na evolução</button>':'')+'</div>');
      const modal=document.querySelector('#modalRoot .modalw');
      if(!modal)throw new Error('Rascunho indisponível');
      const x={p,e,ficha,pid:paciente.id,tipo,modal,registro:id,requisicao:evo?crypto.randomUUID():null,enviando:false,textoEnviado:''};
      rascunhoAberto=x;
      modal.querySelector('#bf-em-nota-fechar')?.addEventListener('click',()=>{if(!x.enviando){rascunhoAberto=null;closeModal();}});
      modal.querySelector('#bf-em-nota-salvar')?.addEventListener('click',()=>confirmarNota(x));
      modal.querySelector('#bf-em-nota-texto')?.focus();
    }catch(_){if(contexto(p,e,ficha))p.aviso='Não foi possível abrir a nota no prontuário deste paciente.';}
    finally{if(contexto(p,e,ficha)){p.salvando=false;pintar();}}
  }
  function mapaHTML(vista) {
    if(!IMAGENS)return '<p class="note">As imagens do mapa não estão disponíveis. Use a lista de regiões.</p>';
    return '<figure class="bf-em-fig"><img alt="Modelo anatômico de referência: '+E(VISTAS[vista])+'" id="bf-em-figura" src="estetmapa/'+vista+'.webp"></figure>';
  }
  function listaHTML(l) {
    return l?.length?'<ul class="bf-em-lista">'+l.map(r=>'<li><b>'+E(REGIOES[r.regiao]||'Região')+' | '+E(LADOS[r.lado]||'')+'</b>'+
      '<span>'+E(r.produto)+' | '+E(valor(r))+'</span><small>Lote '+E(r.lote)+' | Validade '+E(dataPt(r.validade))+'</small>'+
      (r.observacoes?'<p>'+E(r.observacoes)+'</p>':'')+'</li>').join('')+'</ul>':'<p>Nenhum registro nesta sessão.</p>';
  }
  function figuraComparativa(l) {
    if(!IMAGENS||!l?.length)return '';
    const hoje=l.filter(r=>r.vista===P.vista);
    const reg=[...new Set(hoje.map(r=>r.regiao).filter(k=>regioes(P.vista).includes(k)))];
    return '<figure class="bf-em-fig bf-em-comparativa"><img loading="lazy" src="estetmapa/'+P.vista+'.webp" alt="Mapa de referência">'+
      '<canvas data-destaques="'+E(reg.join(','))+'" data-mapa="'+P.vista+'" aria-label="'+E(reg.map(r=>REGIOES[r]).join(', '))+'"></canvas></figure>';
  }
  async function sobrepor(c) {
    const vista=c.dataset.mapa;
    const areas=new Set(c.dataset.destaques.split(','));
    if(!areas.size)return;
    try {
      const m=await mapa(vista); if(!c.isConnected)return;
      c.width=m.w;c.height=m.h; const g=c.getContext('2d');const o=g.createImageData(m.w,m.h);
      for(let i=0;i<m.p.length;i+=4){
        if(m.p[i+3]!==255||m.p[i+1]!==91||m.p[i+2]!==167||!areas.has(CODIGOS[m.p[i]-1]))continue;
        o.data[i]=100;o.data[i+1]=54;o.data[i+2]=204;o.data[i+3]=115;
      }
      g.putImageData(o,0,0);
    }catch(_){}
  }
  function comparacao() {
    const Sx=sessoes(P.registros.filter(r=>r.tipo_registro!==IM)), atual=Sx.find(x=>x.id===P.sessao);
    const anterior=atual?Sx[Sx.indexOf(atual)+1]:Sx.find(x=>x.data<=P.data);
    const itens=l=>l?.filter(r=>r.vista===P.vista)||[];
    const ordena=totalizar(P.registros,P.inicio,P.fim);
    return '<section class="card bf-em-bloco"><h2>Comparar sessões</h2><p>Destaque por região. O lado efetivamente registrado aparece na lista. Vista: '+E(VISTAS[P.vista])+'.</p>'+
      '<div class="bf-em-par"><div class="bf-em-sess"><h3>Anterior'+(anterior?' | '+E(dataPt(anterior.data)):'')+'</h3>'+figuraComparativa(itens(anterior?.itens))+listaHTML(itens(anterior?.itens))+'</div>'+
      '<div class="bf-em-sess"><h3>Selecionada | '+E(dataPt(P.data))+'</h3>'+figuraComparativa(itens(atual?.itens))+listaHTML(itens(atual?.itens))+'</div></div>'+
      '<h3>Total registrado por região no período</h3><div class="bf-em-par">'+
      '<label>De<input type="date" id="bf-em-inicio" value="'+E(P.inicio)+'"></label>'+
      '<label>Até<input type="date" id="bf-em-fim" value="'+E(P.fim)+'"></label></div>'+
      (P.truncado?'<p class="note">O histórico retornou mais registros do que esta tela pode mostrar. Sem total para evitar um resultado incompleto.</p>':
       ordena===null?'<p>Escolha um período válido.</p>':ordena.length?
       '<ul class="bf-em-lista">'+ordena.map(r=>'<li><b>'+E(REGIOES[r.regiao])+'</b> '+E(numerico.format(r.total/1000000))+' '+E(String(r.outra||UNIDADES[r.unidade]).toLowerCase())+'</li>').join('')+'</ul>':'<p>Nenhum registro no período.</p>')+
      '<p>Os totais somam apenas unidades iguais. Não há conversão nem recomendação de dose.</p></section>';
  }
  function tela() {
    const online=conta(), a=P.fase, pronto=P.ficha&&P.lidos;
    const sit=!online?'Conecte-se à sua conta sincronizada para abrir o mapa.':a==='sem-acesso'?
      'A Biomedicina exige vínculo profissional ativo nesta clínica.':a==='inicio'||a==='carregando'?'Carregando prontuários da Biomedicina…':P.erro;
    const Sx=sessoes(P.registros), disabled=P.salvando?' disabled':'';
    const pessoas=new Map((S.pacientes||[]).map(x=>[String(x.id),x]));
    const fichas=P.fichas.filter(x=>pessoas.has(String(x.paciente_ref))).map(x=>({id:String(x.id),nome:pessoas.get(String(x.paciente_ref)).nome||'Paciente'})).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
    return '<div class="page bf-em-pagina"><div class="phead"><div><h1>Mapa estético</h1><p class="sub">Registre o que foi realizado e compare atendimentos do mesmo paciente.</p></div></div>'+
      '<div id="bf-em-main"><p class="note">O mapa não diagnostica, não indica local de aplicação, não sugere produto, dose ou técnica e não prevê resultado.</p>'+
      (sit?'<p class="note">'+E(sit)+'</p>':'')+
      (a==='falha'?B('reler','Tentar novamente'):'')+
      (a==='pronto'?'<section class="card bf-em-bloco"><label>Paciente<select id="bf-em-paciente"'+disabled+'><option value="">Escolha um prontuário</option>'+
        fichas.map(f=>'<option value="'+E(f.id)+'"'+(f.id===P.ficha?' selected':'')+'>'+E(f.nome)+'</option>').join('')+'</select></label>'+
        (!fichas.length?'<p>Não há prontuários de Biomedicina vinculados a pacientes da clínica.</p>':'')+
        (podeTela('bfclinico')?B('fichas','Abrir prontuários clínicos',disabled):'')+'</section>':'')+
      (pronto&&window.BFCienciaFacial149?window.BFCienciaFacial149.html():'')+
      (P.ficha&&!P.lidos?'<p class="note">'+(P.erro?'O histórico não foi carregado.':'Carregando o histórico…')+'</p>'+(P.erro?B('historico','Tentar novamente'):''):'')+
      (pronto?'<section class="card bf-em-bloco"><div class="bf-em-par"><label>Sessão<select id="bf-em-sessao"'+disabled+'><option value="">Nova sessão</option>'+
        Sx.map(x=>'<option value="'+E(x.id)+'"'+(P.sessao===x.id?' selected':'')+'>'+E(dataPt(x.data)+(x.hora?' às '+new Date(x.hora).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):''))+'</option>').join('')+
        '</select></label><label>Data da sessão<input type="date" id="bf-em-data" max="'+E(dataLocal())+'" value="'+E(P.data)+'"'+(P.sessao?' readonly':'')+disabled+'></label></div></section>'+
        '<div class="bf-em-grade"><section class="card bf-em-bloco"><h2>Mapa do atendimento</h2><div class="bf-em-par">'+
        B('face','Preenchimento e harmonização','aria-pressed="'+(P.modo!==IM&&modalidade()==='face')+'"'+disabled)+B('corpo','Mapa corporal','aria-pressed="'+(P.modo!==IM&&modalidade()==='corpo')+'"'+disabled)+
        B('im','Histórico intramuscular','aria-pressed="'+(P.modo===IM)+'"'+disabled)+'</div>'+
        (P.modo===IM?'<p class="note">Use este histórico somente para aplicações que já aconteceram.</p>':'<div class="bf-em-vistas">'+
        Object.entries(VISTAS).filter(([k])=>k.startsWith('corpo_')===(modalidade()==='corpo')).map(([k,t])=>B(k,t,'data-vista="'+k+'" aria-pressed="'+(P.vista===k)+'"'+disabled)).join('')+'</div>'+
        mapaHTML(P.vista)+'<label>Região<select id="bf-em-regiao"'+disabled+'>'+opts(Object.fromEntries(regioes(P.vista).map(k=>[k,REGIOES[k]])),P.regiao)+'</select></label>')+'</section>'+
        '<div>'+htmlForm()+ (P.aviso?'<p class="note" id="bf-em-aviso" tabindex="-1" role="status">'+E(P.aviso)+'</p>':'')+'</div></div>'+(P.modo===IM?historicoIM():comparacao()):'')+
      '</div></div>';
  }
  function pintar() {
    if(!cabe()||UI.view!==TELA)return;
    const app=document.getElementById('app');if(!app)return;
    app.innerHTML=shell(tela());
    try{fonteAplicar();}catch(_){}
    const acao=(id,fn)=>byId(id)?.addEventListener('click',fn);
    const troca=(id,fn)=>byId(id)?.addEventListener('change',e=>fn(e.currentTarget.value));
    acao('fichas',()=>go('bfclinico')); acao('reler',()=>{P.fase='inicio';P.erro='';pintar();lerFichas()});acao('historico',lerRegistros);
    troca('paciente',trocarFicha);troca('sessao',trocarSessao);
    troca('data',v=>{if(!P.sessao&&!P.salvando){P.data=v;pintar();}});
    troca('inicio',v=>{P.inicio=v;pintar();});troca('fim',v=>{P.fim=v;pintar();});
    acao('im',()=>{if(!P.salvando){P.modo=IM;P.regiao='';P.confirmar=false;P.form={};P.aviso='';pintar();byId('produto')?.focus();}});
    byId('main')?.querySelectorAll('[data-nota]').forEach(x=>x.addEventListener('click',()=>abrirRascunho(x.dataset.nota,x.dataset.registro)));
    acao('face',()=>mudarVista('frontal'));acao('corpo',()=>mudarVista('corpo_frente'));
    byId('main')?.querySelectorAll('[data-vista]').forEach(x=>x.addEventListener('click',()=>mudarVista(x.dataset.vista)));
    byId('main')?.querySelectorAll('[data-destaques]').forEach(sobrepor);
    const figura=byId('figura'); if(figura){figura.addEventListener('click',tocar);figura.addEventListener('error',()=>{figura.hidden=true;});}
    troca('regiao',v=>{if(v)escolherRegiao(v);else{P.regiao='';P.confirmar=false;P.form={};pintar()}});
    acao('sim',()=>{P.confirmar=true;pintar();byId('produto')?.focus()});
    acao('nao',()=>{if(!P.salvando){P.regiao='';P.confirmar=false;P.form={};pintar();}});
    const vista=P, ficha=P.ficha, evento=P.evento, escopo=P.escopo;
    if(escopo)window.BFCienciaFacial149?.mount(document.getElementById('bf-termo-facial'),{client:escopo.sb,clinic:escopo.clinica,chart:ficha,current:()=>contexto(vista,evento,ficha)&&vista.lidos});
    const f=byId('form');
    if(f){
      f.addEventListener('submit',salvar);
      f.addEventListener('input',e=>{
        const k=e.target.name;if(!k||P.salvando)return;
        P.form[k]=e.target.type==='checkbox'?e.target.checked:e.target.value;
        if(k==='unidade')byId('outra-caixa').hidden=e.target.value!=='outra';
        if(k==='produto'&&P.modo!==IM)byId('ajuda-produto').textContent=e.target.value?motivoProduto(e.target.value):'';
      });
    }
  }
  if(typeof window.__bfEstetMapaTestHook==='function')window.__bfEstetMapaTestHook(Object.freeze({
    produtos,bloqueio,corRegiao,microunidades,iso,totalizar,sessoes,cabe,validar,regioes,rascunhoIM
  }));
  const menuAntes=menuItens;
  menuItens=function(){
    const menu=menuAntes.apply(this,arguments);
    return Array.isArray(menu)&&cabe()&&!menu.some(x=>x[0]===TELA)?menuOrdem(menu.concat([[TELA,'Mapa estético','user']])):menu;
  };
  const renderAntes=render;
  render=function(){
    checarRascunho();
    if(UI.view!==TELA){if(P.escopo)P=novo();return renderAntes.apply(this,arguments);}
    if(!cabe()){P=novo();if(!UI.auth)UI.view='agenda';return renderAntes.apply(this,arguments);}
    const a=conta();
    if((a||P.escopo)&&!mesmo(a,P.escopo)){P=novo();P.escopo=a;}
    pintar();
    if(a&&P.fase==='inicio'){lerFichas();pintar();}
  };
  document.head.insertAdjacentHTML('beforeend','<style>'+
    '.bf-em-pagina{max-width:1180px}.bf-em-pagina h2{font-size:18px;margin:0}.bf-em-pagina h3{font-size:15px;margin:0}.bf-em-pagina p{margin:.4em 0}'+
    '.bf-em-pagina .btn{box-sizing:border-box;min-width:0;width:100%;height:44px;white-space:normal;justify-content:center}.bf-em-pagina button[aria-pressed=true]{box-shadow:inset 0 0 0 2px #5a4cfb}.bf-em-pagina .note{overflow-wrap:anywhere}'+
    '.bf-em-pagina label{display:flex;flex-direction:column;gap:4px;color:var(--mut);font-weight:650;min-width:0;font-size:13px}.bf-em-pagina input,.bf-em-pagina select,.bf-em-pagina textarea{width:100%;min-width:0;box-sizing:border-box;border:1px solid var(--line,#dedee9);border-radius:9px;padding:8px;color:var(--ink);background:var(--card,#fff);font-size:16px;height:46px}.bf-em-pagina textarea{height:auto;min-height:92px}.bf-em-pagina small{font-weight:400}'+
    '.bf-em-pagina .bf-em-confirma{flex-direction:row;align-items:center;min-height:44px}.bf-em-pagina .bf-em-confirma input{width:22px;height:22px}.bf-em-bloco{display:grid;gap:10px;margin:12px 0;min-width:0}.bf-em-par,.bf-em-campos{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.bf-em-campos .bf-em-amplo{grid-column:1/-1}.bf-em-vistas{display:grid;grid-template-columns:repeat(auto-fit,minmax(125px,1fr));gap:6px}.bf-em-grade{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;align-items:start}.bf-em-fig{margin:0;background:#eeedf7;border-radius:12px;overflow:hidden;text-align:center}.bf-em-fig img{display:block;max-width:100%;margin:auto;height:auto;cursor:crosshair}'+
    '.bf-em-comparativa{position:relative;max-width:340px;margin:8px auto}.bf-em-comparativa img{width:100%;cursor:default}.bf-em-comparativa canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.bf-em-lista{list-style:none;padding:0;margin:0;display:grid;gap:7px}.bf-em-lista li,.bf-em-sess{padding:8px;border:1px solid var(--line,#dedee9);border-radius:9px;overflow-wrap:anywhere}.bf-em-lista li>*{display:block}.bf-em-sess{min-width:0}.bf-em-bloco [hidden]{display:none}'+
    '@media(max-width:760px){.bf-em-grade{grid-template-columns:minmax(0,1fr);gap:0}.bf-em-vistas{grid-template-columns:repeat(2,minmax(0,1fr))}}'+
    '</style>');
})();
