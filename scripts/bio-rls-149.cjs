/* Teste local de PostgreSQL, dados fictícios: BF_PGLITE=/caminho/do/pacote node scripts/bio-rls-149.cjs */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require(process.env.BF_PGLITE||'@electric-sql/pglite');
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const sql=fs.readFileSync(path.join(__dirname,'../sql/bf_estetmapa_registros_20261125.sql'),'utf8');
const imSql=fs.readFileSync(path.join(__dirname,'../sql/bf_estetmapa_intramuscular_20261125.sql'),'utf8');
const authorized=id(3),other=id(4),wrongSegment=id(5),unlinked=id(6);
const clinic=id(10),clinic2=id(11),chart=id(20),chart2=id(21),odonto=id(22),sess=id(31);
(async()=>{
 const db=new PGlite();
 try{
  await db.exec(`
   create role anon; create role authenticated;
   create schema auth;
   create function auth.uid() returns uuid language sql stable as $$
     select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
   $$;
   grant usage on schema auth to authenticated;
   create table public.membros (clinica_id uuid,user_id uuid);
   create table public.bf_profissionais (clinica_id uuid,user_id uuid,segmento text,ativo boolean);
   create table public.bf_prontuarios (id uuid primary key,clinica_id uuid,segmento text);
   grant select on bf_prontuarios,bf_profissionais to authenticated;
   create function public.bf_e_clinico(c uuid) returns boolean language sql stable security definer set search_path=public,pg_catalog as $$
     select exists(select 1 from public.membros m join public.bf_profissionais p using(clinica_id,user_id)
       where m.clinica_id=c and m.user_id=auth.uid() and p.ativo)
   $$;
   insert into membros values ('${clinic}','${authorized}'),('${clinic2}','${other}'),('${clinic}','${wrongSegment}');
   insert into bf_profissionais values ('${clinic}','${authorized}','biomedicina',true),('${clinic2}','${other}','biomedicina',true),
     ('${clinic}','${wrongSegment}','odontologia',true),('${clinic}','${unlinked}','biomedicina',true);
   insert into bf_prontuarios values ('${chart}','${clinic}','biomedicina'),('${chart2}','${clinic2}','biomedicina'),('${odonto}','${clinic}','odontologia');
  `);
  await db.exec(sql);
  async function user(u){await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${u}',false)`);}
  const insert=async(c,p,alter={})=>{
   const d={id, ...alter};
   return db.query(`insert into bf_estetmapa_registros (clinica_id,prontuario_id,sessao_id,sessao_data,vista,regiao,lado,produto,quantidade,unidade,lote,validade)
    values ($1,$2,$3,'2026-01-10',$4,$5,'central',$6,0.1,'ml',$7,$8) returning criado_por`,
    [c,p,sess,d.vista||'frontal',d.regiao||'fronte',d.produto||'Produto de ensaio',d.lote===undefined?'ABC':d.lote,d.validade===undefined?'2027-01-10':d.validade]);
  };
  await user(authorized);
  assert.equal((await insert(clinic,chart)).rows[0].criado_por,authorized);
  await assert.rejects(()=>insert(clinic2,chart2),/row.level security/i);
  await assert.rejects(()=>insert(clinic,chart2),/row.level security/i);
  await assert.rejects(()=>insert(clinic,odonto),/row.level security/i);
  await assert.rejects(()=>insert(clinic,chart,{produto:'P.M.M.A.'}),/check constraint/i);
  await assert.rejects(()=>insert(clinic,chart,{lote:''}),/check constraint/i);
  await assert.rejects(()=>insert(clinic,chart,{validade:null}),/not.null/i);
  await assert.rejects(()=>insert(clinic,chart,{vista:'corpo_frente',regiao:'fronte'}),/check constraint/i);
  await assert.rejects(()=>db.exec("update bf_estetmapa_registros set lote='MODIFICADO'"),/permission denied/i);
  await assert.rejects(()=>db.exec('delete from bf_estetmapa_registros'),/permission denied/i);
  for (const u of [other,wrongSegment,unlinked]) {
   await user(u);
   assert.equal((await db.query('select id from bf_estetmapa_registros')).rows.length,0);
   await assert.rejects(()=>insert(clinic,chart),/row.level security/i);
  }
  await db.exec('reset role');
  await db.exec(imSql);
  await db.exec(imSql); // Confirma reaplicação segura sobre instalação preexistente.
  await user(authorized);
  const legacy=await db.query('select tipo_registro,vista,regiao,quantidade from bf_estetmapa_registros');
  assert.equal(legacy.rows.length,1);
  assert.equal(legacy.rows[0].tipo_registro,'mapa_estetico');
  assert.equal(legacy.rows[0].vista,'frontal');
  const hist=(c,p,t='intramuscular_realizada',reg=null,produto='Produto fictício sem catálogo')=>db.query(`
    insert into bf_estetmapa_registros
    (clinica_id,prontuario_id,sessao_id,sessao_data,tipo_registro,regiao,produto,lote,validade)
    values ($1,$2,$3,'2026-01-10',$4,$5,$6,'L-TESTE','2027-01-10')
    returning tipo_registro,regiao,quantidade,produto`,[c,p,sess,t,reg,produto]);
  const registrado=(await hist(clinic,chart)).rows[0];
  assert.equal(registrado.tipo_registro,'intramuscular_realizada');
  assert.equal(registrado.regiao,null);
  assert.equal(registrado.quantidade,null);
  assert.equal(registrado.produto,'Produto fictício sem catálogo');
  await assert.rejects(()=>hist(clinic,chart,'intramuscular_realizada','fronte'),/check constraint/i);
  await assert.rejects(()=>hist(clinic,chart,'mapa_estetico'),/check constraint/i);
  await assert.rejects(()=>hist(clinic,chart,'modo_invalido'),/check constraint/i);
  await assert.rejects(()=>hist(clinic,chart,'intramuscular_realizada',null,'P.M.M.A.'),/check constraint/i);
  await assert.rejects(()=>hist(clinic2,chart2),/row.level security/i);
  await assert.rejects(()=>hist(clinic,odonto),/row.level security/i);
  assert.equal((await insert(clinic,chart)).rows[0].criado_por,authorized);
  for (const u of [other,wrongSegment,unlinked]) {
    await user(u);
    assert.equal((await db.query('select id from bf_estetmapa_registros')).rows.length,0);
    await assert.rejects(()=>hist(clinic,chart),/row.level security/i);
  }
  await db.exec('set role anon');
  await assert.rejects(()=>db.exec('select id from bf_estetmapa_registros'),/permission denied/i);
  console.log('SQL Biomedicina: perfil ativo e vínculo da clínica, outro segmento, outro prontuário e clínica, conta sem vínculo, acesso anônimo e registro imutável conferidos; lote, validade e PMMA também. Histórico intramuscular e reaplicação sem perda de registros antigos conferidos.');
 }finally{await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
