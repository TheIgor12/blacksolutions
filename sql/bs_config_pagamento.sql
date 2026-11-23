-- ---------------------------------------------------------------------------
-- BlackSolutions: a chave do prestador de pagamento guardada pelo painel
--
-- A chave podia ficar só como segredo do projeto, o que obrigava a abrir o
-- painel do Supabase para configurar. Agora ela também pode ser gravada pelo
-- painel da BlackSolutions, por quem tem o acesso mestre.
--
-- Como fica fechada
-- -----------------
-- A tabela tem RLS ligada e nenhuma política de leitura. Ninguém lê por fora:
-- nem o administrador de uma clínica, nem o acesso mestre, nem o aplicativo.
-- Quem lê é o servidor, com a chave de serviço, dentro das funções de borda.
-- A gravação passa por uma função que só aceita o acesso mestre e devolve
-- apenas os últimos caracteres, para conferência, nunca a chave inteira.
--
-- O segredo de ambiente continua tendo preferência: havendo ASAAS_CHAVE
-- gravada no projeto, é ela que vale, e esta tabela nem é consultada.
--
-- Rodar no editor de SQL do projeto. Pode rodar mais de uma vez.
-- ---------------------------------------------------------------------------

create table if not exists public.bs_config_pagamento (
  id            smallint primary key default 1 check (id = 1),
  chave         text,
  base          text,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid
);

alter table public.bs_config_pagamento enable row level security;
revoke all on public.bs_config_pagamento from anon, authenticated;

-- Grava a chave. Só o acesso mestre, e a chave nunca volta inteira.
create or replace function public.bs_pagamento_gravar(p_chave text, p_base text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_fim text;
begin
  if not public.lm_e_mestre() then
    raise exception 'Somente o acesso mestre da BlackSolutions pode gravar a chave de cobrança.';
  end if;
  if coalesce(length(trim(p_chave)), 0) < 20 then
    raise exception 'A chave informada é curta demais para ser uma chave de produção.';
  end if;

  insert into public.bs_config_pagamento (id, chave, base, atualizado_em, atualizado_por)
  values (1, trim(p_chave), nullif(trim(coalesce(p_base, '')), ''), now(), auth.uid())
  on conflict (id) do update
    set chave = excluded.chave,
        base = excluded.base,
        atualizado_em = now(),
        atualizado_por = auth.uid();

  v_fim := right(trim(p_chave), 6);
  return jsonb_build_object('ok', true, 'final', v_fim, 'em', now());
end
$function$;

-- Diz se existe chave gravada, e só isso. Nunca devolve a chave.
create or replace function public.bs_pagamento_situacao()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare r record;
begin
  if not public.lm_e_mestre() then
    raise exception 'Somente o acesso mestre da BlackSolutions pode consultar a configuração de cobrança.';
  end if;
  select chave, base, atualizado_em into r from public.bs_config_pagamento where id = 1;
  return jsonb_build_object(
    'tem', coalesce(length(r.chave), 0) >= 20,
    'final', case when r.chave is null then null else right(r.chave, 6) end,
    'base', coalesce(r.base, 'https://api.asaas.com/v3'),
    'em', r.atualizado_em);
end
$function$;

-- Apaga a chave gravada, voltando a depender do segredo de ambiente.
create or replace function public.bs_pagamento_apagar()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.lm_e_mestre() then
    raise exception 'Somente o acesso mestre da BlackSolutions pode apagar a chave de cobrança.';
  end if;
  delete from public.bs_config_pagamento where id = 1;
  return jsonb_build_object('ok', true);
end
$function$;

grant execute on function public.bs_pagamento_gravar(text, text) to authenticated;
grant execute on function public.bs_pagamento_situacao() to authenticated;
grant execute on function public.bs_pagamento_apagar() to authenticated;

select 'CONFERENCIA=' ||
       'tabela:' || (select count(*) from information_schema.tables
                      where table_schema='public' and table_name='bs_config_pagamento')::text ||
       ' funcoes:' || (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                        where n.nspname='public' and p.proname like 'bs_pagamento_%')::text ||
       ' politicas:' || (select count(*) from pg_policies
                          where schemaname='public' and tablename='bs_config_pagamento')::text as resultado;
