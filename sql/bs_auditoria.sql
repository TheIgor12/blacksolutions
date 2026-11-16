-- ---------------------------------------------------------------------------
-- BlackSolutions, auditoria das travas de teste grátis
-- Só lê. Não altera nada. Rode inteiro e me mande o resultado de cada bloco.
-- ---------------------------------------------------------------------------

-- 1. As funções de trava existem mesmo?
select 'funcoes' as bloco, p.proname as funcao,
       case when p.prosecdef then 'security definer' else 'invoker' end as modo
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.proname in ('criar_clinica','clinica_liberada','lexcalc_liberado',
                     'lm_e_mestre','bs_cpf_valido','bs_cnpj_valido','bs_teste_dias','bs_cfg')
 order by p.proname;

-- 2. Quais tabelas têm RLS ligada, e quantas políticas cada uma tem
select 'rls' as bloco, c.relname as tabela, c.relrowsecurity as rls_ligada,
       (select count(*) from pg_policies p
         where p.schemaname='public' and p.tablename=c.relname) as politicas
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relkind='r'
 order by c.relrowsecurity, c.relname;

-- 3. ESTE É O BLOCO MAIS IMPORTANTE.
--    Quais políticas de escrita chamam a trava de validade, e quais não chamam.
select 'travas' as bloco, tablename as tabela, policyname as politica, cmd as operacao,
       case when coalesce(qual,'') || coalesce(with_check,'')
                 like '%clinica_liberada%' then 'SIM'
            when coalesce(qual,'') || coalesce(with_check,'')
                 like '%lexcalc_liberado%' then 'SIM (lexcalc)'
            else 'NAO' end as verifica_validade
  from pg_policies
 where schemaname='public' and cmd in ('INSERT','UPDATE','ALL')
 order by verifica_validade, tablename, policyname;

-- 4. Políticas do Storage, onde ficam fotos e documentos
select 'storage' as bloco, policyname as politica, cmd as operacao,
       case when coalesce(qual,'') || coalesce(with_check,'')
                 like '%clinica_liberada%' then 'SIM' else 'NAO' end as verifica_validade
  from pg_policies where schemaname='storage' order by policyname;

-- 5. Configuração em vigor
select 'config' as bloco, chave, valor from public.bs_config order by chave;

-- 6. Quantos documentos já queimaram o teste grátis
select 'identidades' as bloco, tipo, count(*) as quantos,
       min(criado_em)::date as primeiro, max(criado_em)::date as ultimo
  from public.bs_identidades group by tipo;

-- 7. A tabela de identidades aceita exclusão por alguém?
select 'identidades_politicas' as bloco, policyname as politica, cmd as operacao
  from pg_policies where schemaname='public' and tablename='bs_identidades';

-- 8. Situação das contas: quantas em teste, quantas pagando, quantas vencidas
select 'clinicas' as bloco,
       coalesce(plano,'teste') as plano,
       count(*) as quantas,
       count(*) filter (where valido_ate is not null and valido_ate < current_date) as vencidas,
       count(*) filter (where cpf_responsavel is null) as sem_cpf,
       count(*) filter (where cnpj is null) as sem_cnpj
  from public.clinicas group by coalesce(plano,'teste') order by 2;

-- 9. O mesmo CPF aparece em mais de uma clínica?
select 'cpf_repetido' as bloco, cpf_responsavel, count(*) as clinicas
  from public.clinicas where cpf_responsavel is not null
 group by cpf_responsavel having count(*) > 1;

-- 10. Usuários com mais de uma clínica em teste
select 'usuario_multi_teste' as bloco, m.email, count(*) as testes
  from public.membros m join public.clinicas c on c.id = m.clinica_id
 where m.papel='admin' and coalesce(c.plano,'teste')='teste'
 group by m.email having count(*) > 1 order by 3 desc;

-- 11. Lex Calc: quantos usuários usam sem nunca ter assinado
select 'lexcalc' as bloco,
       (select count(*) from auth.users) as contas_totais,
       (select count(*) from public.lexcalc_assinantes
         where pago_ate is not null and pago_ate >= current_date) as assinantes_em_dia,
       (select count(distinct user_id) from public.lexcalc_calculos) as usuarios_que_calcularam;
