-- ============================================================================
-- BlackSolutions: prazo de degustação e painel de cadastros
--
-- 1. O prazo do teste grátis passa a ficar em um lugar só, na tabela bs_config.
--    Trocar o prazo é trocar uma linha, sem publicar versão nova do sistema.
-- 2. Quem está no fim do teste pode pedir mais alguns dias por um botão.
-- 3. Painel com quantas pessoas se cadastraram no BlackFlow e no Lex Calc.
--
-- Rode depois dos arquivos do LexMandato. Pode ser executado mais de uma vez.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Configuração em um lugar só
-- ---------------------------------------------------------------------------

create table if not exists public.bs_config (
  chave         text primary key,
  valor         text not null,
  atualizado_em timestamptz not null default now()
);

insert into public.bs_config (chave, valor) values
  ('teste_dias','7'),            -- dias de degustação do BlackFlow
  ('prorrogacao_dias','7'),      -- quantos dias o pedido de mais prazo concede
  ('prorrogacao_auto','1')       -- 1 concede sozinho na primeira vez, 0 espera você liberar
on conflict (chave) do nothing;

create or replace function public.bs_cfg(p_chave text, p_padrao int)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select nullif(trim(valor),'')::int from public.bs_config where chave = p_chave), p_padrao)
$$;

-- Qualquer pessoa logada pode ler o prazo, porque o sistema mostra isso na tela.
create or replace function public.bs_teste_dias()
returns int
language sql
stable
security definer
set search_path = public
as $$ select public.bs_cfg('teste_dias', 7) $$;

grant execute on function public.bs_teste_dias() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Toda clínica nova nasce com o prazo que estiver na configuração
--    Isso vale por cima do que a função criar_clinica gravar, sem alterá-la.
-- ---------------------------------------------------------------------------

create or replace function public.bs_nova_clinica()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.plano,'') in ('','teste') then
    new.plano := 'teste';
    new.valido_ate := current_date + public.bs_teste_dias();
  end if;
  return new;
end $$;

drop trigger if exists clinicas_prazo_teste on public.clinicas;
create trigger clinicas_prazo_teste
  before insert on public.clinicas
  for each row execute function public.bs_nova_clinica();

-- ---------------------------------------------------------------------------
-- 3. Pedido de mais alguns dias
-- ---------------------------------------------------------------------------

create table if not exists public.bs_prorrogacoes (
  id            bigserial primary key,
  clinica_id    uuid not null,
  user_id       uuid references auth.users(id) on delete set null,
  email         text not null default '',
  dias          int  not null default 0,
  pedido_em     timestamptz not null default now(),
  concedido_em  timestamptz,
  concedido_por text not null default ''
);
create index if not exists bs_prorrogacoes_cl on public.bs_prorrogacoes (clinica_id, pedido_em desc);

-- Chamada pelo próprio cliente, na tela de teste vencido.
create or replace function public.bs_pedir_prazo()
returns table (concedido boolean, dias int, valido_ate date, aviso text)
language plpgsql
security definer
set search_path = public
as $$
declare v_cl uuid; v_email text; v_ja int; v_dias int; v_auto int; v_ate date;
begin
  if auth.uid() is null then
    raise exception 'Entre na sua conta.';
  end if;

  select m.clinica_id, coalesce(m.email,'') into v_cl, v_email
    from public.membros m
   where m.user_id = auth.uid() and m.papel = 'admin'
   order by m.clinica_id
   limit 1;

  if v_cl is null then
    raise exception 'Somente quem administra o negócio pode pedir mais prazo.';
  end if;

  select count(*) into v_ja
    from public.bs_prorrogacoes
   where clinica_id = v_cl and concedido_em is not null;

  v_dias := public.bs_cfg('prorrogacao_dias', 7);
  v_auto := public.bs_cfg('prorrogacao_auto', 1);

  if v_auto = 1 and v_ja = 0 then
    update public.clinicas
       set valido_ate = greatest(current_date, coalesce(valido_ate, current_date)) + v_dias,
           ativa = true
     where id = v_cl
    returning valido_ate into v_ate;

    insert into public.bs_prorrogacoes (clinica_id, user_id, email, dias, concedido_em, concedido_por)
         values (v_cl, auth.uid(), v_email, v_dias, now(), 'automático');

    return query select true, v_dias, v_ate, ''::text;
  end if;

  insert into public.bs_prorrogacoes (clinica_id, user_id, email, dias)
       values (v_cl, auth.uid(), v_email, v_dias);

  return query select false, 0, null::date,
    'Seu pedido foi registrado. Vamos avaliar e avisar por WhatsApp.'::text;
end $$;

grant execute on function public.bs_pedir_prazo() to authenticated;

-- Chamada por você, para conceder um pedido que ficou parado.
create or replace function public.bs_conceder_prazo(p_clinica uuid, p_dias int default null)
returns date
language plpgsql
security definer
set search_path = public
as $$
declare v_dias int; v_ate date;
begin
  if not public.lm_e_mestre() then
    raise exception 'Somente o login mestre.';
  end if;
  v_dias := coalesce(p_dias, public.bs_cfg('prorrogacao_dias', 7));

  update public.clinicas
     set valido_ate = greatest(current_date, coalesce(valido_ate, current_date)) + v_dias,
         ativa = true
   where id = p_clinica
  returning valido_ate into v_ate;

  update public.bs_prorrogacoes
     set concedido_em = now(), concedido_por = coalesce((select email from auth.users where id = auth.uid()),'mestre'), dias = v_dias
   where clinica_id = p_clinica and concedido_em is null;

  return v_ate;
end $$;

grant execute on function public.bs_conceder_prazo(uuid,int) to authenticated;

alter table public.bs_prorrogacoes enable row level security;
drop policy if exists bs_prorrogacoes_ler on public.bs_prorrogacoes;
create policy bs_prorrogacoes_ler on public.bs_prorrogacoes
  for select to authenticated
  using (public.lm_e_mestre() or user_id = auth.uid());

alter table public.bs_config enable row level security;
drop policy if exists bs_config_ler on public.bs_config;
create policy bs_config_ler on public.bs_config
  for select to authenticated using (public.lm_e_mestre());
drop policy if exists bs_config_alterar on public.bs_config;
create policy bs_config_alterar on public.bs_config
  for update to authenticated using (public.lm_e_mestre()) with check (public.lm_e_mestre());
revoke all on public.bs_config from anon;
grant select, update on public.bs_config to authenticated;
grant select on public.bs_prorrogacoes to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Painel: quantas pessoas se cadastraram em cada sistema
--    Só o login mestre enxerga.
-- ---------------------------------------------------------------------------

create or replace function public.bs_painel()
returns table (
  sistema text, contas bigint, negocios bigint,
  hoje bigint, sete_dias bigint, trinta_dias bigint,
  em_teste bigint, pagantes bigint, vencidos bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with bf as (
    select distinct m.user_id, u.created_at
      from public.membros m join auth.users u on u.id = m.user_id
  ), lx as (
    select distinct m.user_id, u.created_at
      from public.lm_membros m join auth.users u on u.id = m.user_id
  )
  select 'BlackFlow'::text,
         (select count(*) from bf),
         (select count(*) from public.clinicas),
         (select count(*) from bf where created_at::date = current_date),
         (select count(*) from bf where created_at > now() - interval '7 days'),
         (select count(*) from bf where created_at > now() - interval '30 days'),
         (select count(*) from public.clinicas where coalesce(plano,'teste') = 'teste' and coalesce(valido_ate, current_date) >= current_date),
         (select count(*) from public.clinicas where coalesce(plano,'teste') <> 'teste' and coalesce(valido_ate, current_date) >= current_date),
         (select count(*) from public.clinicas where valido_ate < current_date)
   where public.lm_e_mestre()
  union all
  select 'Lex Calc'::text,
         (select count(*) from lx),
         (select count(*) from public.lm_escritorios),
         (select count(*) from lx where created_at::date = current_date),
         (select count(*) from lx where created_at > now() - interval '7 days'),
         (select count(*) from lx where created_at > now() - interval '30 days'),
         0::bigint, 0::bigint, 0::bigint
   where public.lm_e_mestre()
$$;

grant execute on function public.bs_painel() to authenticated;

-- Lista linha a linha, para você ver quem é quem.
create or replace function public.bs_painel_contas()
returns table (
  sistema text, nome text, email text, papel text,
  plano text, valido_ate date, dias_restantes int, criado_em timestamptz,
  pedido_prazo timestamptz, id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select 'BlackFlow'::text, c.nome, coalesce(m.email,u.email,''), coalesce(m.papel,''),
         coalesce(nullif(c.plano,''),'teste'), c.valido_ate,
         (c.valido_ate - current_date)::int, u.created_at,
         (select max(p.pedido_em) from public.bs_prorrogacoes p where p.clinica_id = c.id and p.concedido_em is null),
         c.id
    from public.clinicas c
    left join public.membros m on m.clinica_id = c.id and m.papel = 'admin'
    left join auth.users u on u.id = m.user_id
   where public.lm_e_mestre()
  union all
  select 'Lex Calc'::text, e.nome, coalesce(m.email,u.email,''), coalesce(m.papel,''),
         ''::text, null::date, null::int, u.created_at, null::timestamptz, e.id
    from public.lm_escritorios e
    left join public.lm_membros m on m.escritorio_id = e.id and m.papel = 'dono'
    left join auth.users u on u.id = m.user_id
   where public.lm_e_mestre()
   order by 8 desc nulls last
$$;

grant execute on function public.bs_painel_contas() to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Conferência
-- ---------------------------------------------------------------------------
-- select * from public.bs_painel();
-- select * from public.bs_painel_contas();
-- select * from public.bs_config;
--
-- Para mudar o prazo da degustação, sem publicar versão nova:
--   update public.bs_config set valor = '10', atualizado_em = now() where chave = 'teste_dias';
-- Para exigir que você libere cada pedido de prazo, em vez de conceder sozinho:
--   update public.bs_config set valor = '0', atualizado_em = now() where chave = 'prorrogacao_auto';
