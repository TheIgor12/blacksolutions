/* Ensaio de SQL com base ficcional. Não faz chamadas à produção. */
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {PGlite}=require(process.env.BF_PGLITE||'@electric-sql/pglite');
(async()=>{
 const db=new PGlite();
 const u1='10000000-0000-0000-0000-000000000001',u2='10000000-0000-0000-0000-000000000002',u3='10000000-0000-0000-0000-000000000003',u4='10000000-0000-0000-0000-000000000004';
 const c1='20000000-0000-0000-0000-000000000001',c2='20000000-0000-0000-0000-000000000002';
 const p1='30000000-0000-0000-0000-000000000001',p2='30000000-0000-0000-0000-000000000002';
 try{
 await db.exec(`
  create role anon; create role authenticated; create schema auth; grant usage on schema auth to authenticated,anon;
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
  create table public.membros(clinica_id uuid, user_id uuid,papel text);
  create table public.bf_profissionais(clinica_id uuid,user_id uuid,ativo boolean,segmento text);
  create table public.bf_prontuarios(id uuid, clinica_id uuid,paciente_ref text,segmento text);
  alter table membros enable row level security;
  create policy self_members on membros for select to authenticated using (user_id=auth.uid());
  grant select on membros to authenticated;
  create function public.bf_e_clinico(c uuid) returns boolean language sql stable security definer set search_path='' as $$
    select exists(select 1 from public.bf_profissionais p join public.membros m on m.clinica_id=p.clinica_id and m.user_id=p.user_id
    where p.clinica_id=c and p.user_id=auth.uid() and p.ativo)
  $$;
  insert into membros values ('${c1}','${u1}','admin'),('${c1}','${u2}','membro'),('${c1}','${u3}','membro'),('${c2}','${u4}','admin');
  insert into bf_profissionais values ('${c1}','${u1}',true,'odontologia'),('${c1}','${u2}',true,'odontologia'),('${c2}','${u4}',true,'biomedicina');
  insert into bf_prontuarios values ('${p1}','${c1}','PAC-001','odontologia'),('${p2}','${c2}','PAC-002','biomedicina');
 `);
 await db.exec(fs.readFileSync(path.join(__dirname,'../sql/bf_acessos_prontuario_20261125.sql'),'utf8'));
 const who=async(id,role='authenticated')=>db.exec(`reset role; select set_config('request.jwt.claim.sub','${id}',false);set role ${role};`);
 const abrir=(c,p,t)=>db.query('select public.bf_registrar_abertura_prontuario($1,$2,$3) as ok',[c,p,t]);
 const lista=()=>db.query('select clinica_id,usuario_id,paciente_ref,tela from bf_acessos_prontuario order by id');
 await who(u2);assert.equal((await abrir(c1,p1,'odontomapa')).rows[0].ok,true);assert.equal((await lista()).rows.length,0);
 await assert.rejects(()=>abrir(c1,p1,'estetmapa'),/não autorizada/);await assert.rejects(()=>abrir(c2,p2,'estetmapa'),/não autorizada/);
 await assert.rejects(()=>abrir(c1,p2,'odontomapa'),/não autorizada/);
 await assert.rejects(()=>db.exec('delete from bf_acessos_prontuario'),/permission denied/);
 await who(u3);await assert.rejects(()=>abrir(c1,p1,'bfclinico'),/não autorizada/);assert.equal((await lista()).rows.length,0);
 await who(u4);assert.equal((await abrir(c2,p2,'estetmapa')).rows[0].ok,true);assert.equal((await lista()).rows.length,1);assert.equal((await lista()).rows[0].paciente_ref,'PAC-002');
 await who(u1);const records=(await lista()).rows;assert.equal(records.length,1);assert.equal(records[0].usuario_id,u2);assert.equal(records[0].paciente_ref,'PAC-001');
 await who('','anon');await assert.rejects(()=>abrir(c1,p1,'bfclinico'),/permission denied/);
 console.log('Acessos: usuário e paciente derivados no servidor; clínicas e perfis separados; tela incompatível, acesso sem vínculo, exclusão e anônimo bloqueados.');
 }finally{await db.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
