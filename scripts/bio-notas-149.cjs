/* PostgreSQL local, dados fictícios. BF_PGLITE=/caminho node scripts/bio-notas-149.cjs */
const {PGlite}=require(process.env.BF_PGLITE||'@electric-sql/pglite');
const assert=require('node:assert/strict'), fs=require('node:fs'),path=require('node:path');
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const sql=fs.readFileSync(path.join(__dirname,'../sql/bf_estetmapa_notas_clinicas_20261125.sql'),'utf8');
const db=new PGlite();
(async()=>{try{
 await db.exec(`
 create role authenticated; create role anon; create schema auth;
 create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create table bf_prontuarios(id uuid primary key,clinica_id uuid,segmento text,paciente_ref text,anamnese jsonb default '{"historico":"Preservar"}',unique(id,clinica_id));
 create table bf_profissionais(clinica_id uuid,user_id uuid,segmento text,ativo boolean);
 create table membros(clinica_id uuid,user_id uuid);
 create table bf_estetmapa_registros(id uuid primary key,clinica_id uuid,prontuario_id uuid,tipo_registro text);
 create table bf_evolucoes(id uuid primary key,clinica_id uuid,prontuario_id uuid,conteudo text,profissional_id uuid,
   foreign key(prontuario_id,clinica_id) references bf_prontuarios(id,clinica_id));
 create function public.clinica_liberada(c uuid) returns boolean language sql stable as $$ select c <> '${id(99)}' $$;
 create function public.bf_e_clinico(c uuid) returns boolean language sql stable security definer set search_path=public,pg_catalog as $$
  select exists(select 1 from public.membros m join public.bf_profissionais p using(clinica_id,user_id)
    where m.clinica_id=c and m.user_id=auth.uid() and p.ativo)
 $$;
 insert into membros values ('${id(1)}','${id(4)}'),('${id(1)}','${id(5)}'),('${id(1)}','${id(6)}');
 insert into bf_profissionais values ('${id(1)}','${id(4)}','biomedicina',true),('${id(1)}','${id(5)}','odontologia',true),
 ('${id(1)}','${id(6)}','biomedicina',false),('${id(1)}','${id(7)}','biomedicina',true);
 insert into bf_prontuarios(id,clinica_id,segmento,paciente_ref) values
 ('${id(2)}','${id(1)}','biomedicina','P1'),('${id(3)}','${id(1)}','odontologia','P2');
 insert into bf_estetmapa_registros values
 ('${id(8)}','${id(1)}','${id(2)}','intramuscular_realizada'),('${id(9)}','${id(1)}','${id(2)}','mapa_estetico');
 `);
 await db.exec(sql);
 await db.exec(sql);
 const user=u=>db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${id(u)}',false)`);
 const pedir=(opt={})=>db.query('select bf_registrar_nota_intramuscular($1,$2,$3,$4,$5,$6,$7) as ok',[
    id(opt.clinica??1),id(opt.chart??2),id(opt.origem??8),opt.paciente??'P1',
    opt.destino??'evolucao',opt.texto??'Nota de revisão fictícia.',id(opt.requisicao??66)]);
 for(const u of [5,6,7,10]){
  await user(u);await assert.rejects(()=>pedir(),/acesso clínico/i);
 }
 await user(4);
 await assert.rejects(()=>pedir({paciente:'P2'}),/vínculo clínico/i);
 await assert.rejects(()=>pedir({chart:3,paciente:'P2'}),/vínculo clínico/i);
 await assert.rejects(()=>pedir({origem:88}),/vínculo clínico/i);
 await assert.rejects(()=>pedir({origem:9}),/vínculo clínico/i);
 await assert.rejects(()=>pedir({destino:'anamnese'}),/Revise/i);
 await assert.rejects(()=>pedir({clinica:99}),/acesso clínico/i);
 await assert.rejects(()=>pedir({texto:'a'.repeat(2501)}),/Revise/i);
 assert.equal((await pedir()).rows[0].ok,true);
 assert.equal((await pedir()).rows[0].ok,true);
 await assert.rejects(()=>pedir({texto:'Outra nota'}),/confirmar a nota/i);
 await db.exec('reset role');
 const notas=(await db.query('select * from bf_evolucoes')).rows;
 assert.equal(notas.length,1);
 assert.equal(notas[0].profissional_id,id(4));
 assert.equal(notas[0].prontuario_id,id(2));
 assert.ok(notas[0].conteudo.includes(id(8)));
 assert.equal((await db.query('select anamnese from bf_prontuarios where id=$1',[id(2)])).rows[0].anamnese.historico,'Preservar');
 await db.exec('set role anon');
 await assert.rejects(()=>pedir(),/permission denied/i);
 console.log('RPC de nota: função reaplicável, autor de sessão, repetição idempotente, vínculo/segmento/origem válidos, anamnese preservada, anônimo e perfis indevidos rejeitados.');
} finally {await db.close()}})().catch(e=>{console.error(e);process.exitCode=1});
