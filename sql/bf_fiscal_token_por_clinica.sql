-- ---------------------------------------------------------------------------
-- Token fiscal por clínica.
--
-- Por que existe
-- --------------
-- Cada clínica emite a nota fiscal dela, com o CNPJ dela. Quem assina a nota é
-- o certificado digital daquela clínica, e na Focus NFe o token que emite é o
-- token da empresa, criado quando a empresa é cadastrada lá. Logo, um token só
-- para todo o sistema não serve: serviria apenas se todas as notas saíssem com
-- o mesmo CNPJ, que é exatamente o que não pode acontecer.
--
-- Antes desta migração o sistema guardava um token único, em bs_config_fiscal.
-- Aquele continua existindo, e passa a ser só o da própria BlackSolutions,
-- para as notas de assinatura dela. Para a nota da clínica, vale o token da
-- clínica.
--
-- Segurança
-- ---------
-- A tabela tem RLS ligada e nenhuma política de leitura, como a da chave de
-- cobrança. Ninguém lê o token pelo aplicativo: quem lê é a função de borda,
-- com a chave de serviço. O que volta para a tela é apenas se existe token e
-- os últimos seis caracteres, para a pessoa conferir que colou o certo.
--
-- Rodar no editor de SQL do projeto. Pode rodar mais de uma vez.
-- ---------------------------------------------------------------------------

create table if not exists public.bf_fiscal_token (
  clinica_id     uuid primary key references public.clinicas(id) on delete cascade,
  integrador     text not null default 'focusnfe',
  token          text,
  ambiente       text not null default 'homologacao',
  atualizado_em  timestamptz not null default now(),
  atualizado_por uuid
);

alter table public.bf_fiscal_token enable row level security;
revoke all on public.bf_fiscal_token from anon, authenticated;

-- Grava o token da clínica. Só o administrador daquela clínica.
create or replace function public.bf_fiscal_token_gravar(
  p_clinica uuid, p_token text, p_ambiente text default 'homologacao',
  p_integrador text default 'focusnfe')
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_papel text;
begin
  select m.papel into v_papel from public.membros m
   where m.clinica_id = p_clinica and m.user_id = auth.uid();
  if v_papel is distinct from 'admin' then
    raise exception 'Somente o administrador desta conta pode gravar o token fiscal.';
  end if;
  if coalesce(length(trim(p_token)), 0) < 16 then
    raise exception 'O token informado é curto demais.';
  end if;
  if p_ambiente not in ('homologacao','producao') then
    raise exception 'Ambiente inválido. Use homologacao ou producao.';
  end if;

  insert into public.bf_fiscal_token (clinica_id, integrador, token, ambiente, atualizado_em, atualizado_por)
  values (p_clinica, coalesce(nullif(trim(p_integrador),''),'focusnfe'), trim(p_token), p_ambiente, now(), auth.uid())
  on conflict (clinica_id) do update
    set integrador = excluded.integrador, token = excluded.token, ambiente = excluded.ambiente,
        atualizado_em = now(), atualizado_por = auth.uid();

  return jsonb_build_object('ok', true, 'final', right(trim(p_token), 6), 'ambiente', p_ambiente);
end
$function$;

-- Situação do token. Qualquer membro da clínica pode conferir, e o valor
-- inteiro nunca volta.
create or replace function public.bf_fiscal_token_situacao(p_clinica uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare r record; v_ok boolean;
begin
  select exists (select 1 from public.membros m
                  where m.clinica_id = p_clinica and m.user_id = auth.uid()) into v_ok;
  if not v_ok then
    raise exception 'Sem acesso a esta conta.';
  end if;
  select token, integrador, ambiente, atualizado_em into r
    from public.bf_fiscal_token where clinica_id = p_clinica;
  return jsonb_build_object(
    'tem', coalesce(length(r.token), 0) >= 16,
    'final', case when r.token is null then null else right(r.token, 6) end,
    'integrador', coalesce(r.integrador, 'focusnfe'),
    'ambiente', coalesce(r.ambiente, 'homologacao'),
    'em', r.atualizado_em);
end
$function$;

create or replace function public.bf_fiscal_token_apagar(p_clinica uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_papel text;
begin
  select m.papel into v_papel from public.membros m
   where m.clinica_id = p_clinica and m.user_id = auth.uid();
  if v_papel is distinct from 'admin' then
    raise exception 'Somente o administrador desta conta pode apagar o token fiscal.';
  end if;
  delete from public.bf_fiscal_token where clinica_id = p_clinica;
  return jsonb_build_object('ok', true);
end
$function$;

grant execute on function public.bf_fiscal_token_gravar(uuid, text, text, text) to authenticated;
grant execute on function public.bf_fiscal_token_situacao(uuid) to authenticated;
grant execute on function public.bf_fiscal_token_apagar(uuid) to authenticated;

select 'CONFERENCIA=' ||
       'tabela:' || (select count(*) from information_schema.tables
                      where table_schema='public' and table_name='bf_fiscal_token')::text ||
       ' politicas:' || (select count(*) from pg_policies
                          where schemaname='public' and tablename='bf_fiscal_token')::text ||
       ' funcoes:' || (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                        where n.nspname='public' and p.proname like 'bf_fiscal_token_%')::text as resultado;
