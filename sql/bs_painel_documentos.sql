-- ---------------------------------------------------------------------------
-- bs_painel_contas passa a devolver o documento e a razão social
--
-- A função foi escrita antes de existirem as colunas cpf_responsavel, cnpj e
-- razao_social na tabela clinicas. Sem isso, o painel coleta os documentos mas
-- não mostra nenhum deles.
--
-- O tipo de retorno muda, por isso a função precisa ser apagada antes.
-- ---------------------------------------------------------------------------

drop function if exists public.bs_painel_contas();

create or replace function public.bs_painel_contas()
returns table (
  sistema text, nome text, email text, papel text,
  plano text, valido_ate date, dias_restantes int, criado_em timestamptz,
  pedido_prazo timestamptz, id uuid,
  documento text, razao_social text
)
language sql
stable
security definer
set search_path = public
as $$
  select 'BlackFlow'::text, c.nome, coalesce(m.email,u.email,''), coalesce(m.papel,''),
         coalesce(nullif(c.plano,''),'teste'), c.valido_ate,
         (c.valido_ate - current_date)::int, u.created_at,
         (select max(p.pedido_em) from public.bs_prorrogacoes p
           where p.clinica_id = c.id and p.concedido_em is null),
         c.id,
         coalesce(nullif(c.cnpj,''), nullif(c.cpf_responsavel,'')),
         nullif(c.razao_social,'')
    from public.clinicas c
    left join public.membros m on m.clinica_id = c.id and m.papel = 'admin'
    left join auth.users u on u.id = m.user_id
   where public.lm_e_mestre()
  union all
  select 'Lex Calc'::text, e.nome, coalesce(m.email,u.email,''), coalesce(m.papel,''),
         ''::text, null::date, null::int, u.created_at, null::timestamptz, e.id,
         null::text, null::text
    from public.lm_escritorios e
    left join public.lm_membros m on m.escritorio_id = e.id and m.papel = 'dono'
    left join auth.users u on u.id = m.user_id
   where public.lm_e_mestre()
   order by 8 desc nulls last
$$;

grant execute on function public.bs_painel_contas() to authenticated;

-- Conferência no fim
select
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='bs_painel_contas') as quantas_funcoes,
  (select pg_get_function_result(p.oid) like '%documento text%razao_social text%'
     from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='bs_painel_contas') as tem_colunas_novas,
  (select count(*) from public.bs_painel_contas()) as linhas_devolvidas;
