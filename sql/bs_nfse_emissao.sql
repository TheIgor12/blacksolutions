-- ---------------------------------------------------------------------------
-- BlackSolutions: emissão de NFS-e pelo integrador homologado
--
-- O que muda
-- ----------
-- Até aqui o sistema preparava rascunho, conferia e parava. A emissão de
-- verdade exige certificado digital, XML assinado em ICP-Brasil, conexão mTLS
-- e credenciamento. Nada disso se resolve escrevendo código: resolve-se
-- contratando quem já tem tudo homologado, que é o integrador.
--
-- Este arquivo cria:
--   1. a configuração do integrador, fechada a todos menos ao servidor;
--   2. as colunas que faltavam em bf_fiscal_notas para guardar o retorno
--      oficial: código de verificação, link da nota, PDF e XML.
--
-- A chave do integrador segue a mesma regra da chave de cobrança: tabela com
-- RLS ligada e nenhuma política de leitura. Quem lê é o servidor, com a chave
-- de serviço, dentro da função de borda.
--
-- Rodar no editor de SQL do projeto. Pode rodar mais de uma vez.
-- ---------------------------------------------------------------------------

create table if not exists public.bs_config_fiscal (
  id             smallint primary key default 1 check (id = 1),
  integrador     text not null default 'focusnfe',
  token          text,
  ambiente       text not null default 'homologacao',
  atualizado_em  timestamptz not null default now(),
  atualizado_por uuid
);

alter table public.bs_config_fiscal enable row level security;
revoke all on public.bs_config_fiscal from anon, authenticated;

-- Colunas do retorno oficial da nota.
alter table public.bf_fiscal_notas add column if not exists codigo_verificacao text;
alter table public.bf_fiscal_notas add column if not exists link_nota text;
alter table public.bf_fiscal_notas add column if not exists pdf_url text;
alter table public.bf_fiscal_notas add column if not exists xml_url text;
alter table public.bf_fiscal_notas add column if not exists integrador text;
alter table public.bf_fiscal_notas add column if not exists retorno jsonb;

create index if not exists bf_fiscal_notas_ref on public.bf_fiscal_notas(integracao_referencia);

-- Grava a chave do integrador. Só o acesso mestre, e a chave nunca volta.
create or replace function public.bs_fiscal_gravar(
  p_token text, p_integrador text default 'focusnfe', p_ambiente text default 'homologacao')
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.lm_e_mestre() then
    raise exception 'Somente o acesso mestre da BlackSolutions pode gravar a chave fiscal.';
  end if;
  if coalesce(length(trim(p_token)), 0) < 16 then
    raise exception 'O token informado é curto demais.';
  end if;
  if p_ambiente not in ('homologacao','producao') then
    raise exception 'Ambiente inválido. Use homologacao ou producao.';
  end if;

  insert into public.bs_config_fiscal (id, integrador, token, ambiente, atualizado_em, atualizado_por)
  values (1, coalesce(nullif(trim(p_integrador),''),'focusnfe'), trim(p_token), p_ambiente, now(), auth.uid())
  on conflict (id) do update
    set integrador = excluded.integrador, token = excluded.token, ambiente = excluded.ambiente,
        atualizado_em = now(), atualizado_por = auth.uid();

  return jsonb_build_object('ok', true, 'final', right(trim(p_token), 6), 'ambiente', p_ambiente);
end
$function$;

create or replace function public.bs_fiscal_situacao()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare r record;
begin
  if not public.lm_e_mestre() then
    raise exception 'Somente o acesso mestre da BlackSolutions pode consultar a configuração fiscal.';
  end if;
  select token, integrador, ambiente, atualizado_em into r from public.bs_config_fiscal where id = 1;
  return jsonb_build_object(
    'tem', coalesce(length(r.token), 0) >= 16,
    'final', case when r.token is null then null else right(r.token, 6) end,
    'integrador', coalesce(r.integrador, 'focusnfe'),
    'ambiente', coalesce(r.ambiente, 'homologacao'),
    'em', r.atualizado_em);
end
$function$;

create or replace function public.bs_fiscal_apagar()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.lm_e_mestre() then
    raise exception 'Somente o acesso mestre da BlackSolutions pode apagar a chave fiscal.';
  end if;
  delete from public.bs_config_fiscal where id = 1;
  return jsonb_build_object('ok', true);
end
$function$;

grant execute on function public.bs_fiscal_gravar(text, text, text) to authenticated;
grant execute on function public.bs_fiscal_situacao() to authenticated;
grant execute on function public.bs_fiscal_apagar() to authenticated;

select 'CONFERENCIA=' ||
       'tabela:' || (select count(*) from information_schema.tables
                      where table_schema='public' and table_name='bs_config_fiscal')::text ||
       ' colunas_nota:' || (select count(*) from information_schema.columns
                             where table_schema='public' and table_name='bf_fiscal_notas'
                               and column_name in ('codigo_verificacao','link_nota','pdf_url','xml_url','integrador','retorno'))::text ||
       ' funcoes:' || (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                        where n.nspname='public' and p.proname like 'bs_fiscal_%')::text as resultado;
